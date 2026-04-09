"""CEP Rule Authoring API — Phase 3.

Allows analysts to define custom multi-stage sequence detection rules
and hot-reloads the Redis CEP engine in real-time via pub/sub invalidation.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import structlog

from app.dependencies import get_app_postgres, get_app_redis
from app.middleware.auth import require_analyst, require_admin, AuditLogger

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/cep-rules", tags=["cep_rules"])


class CEPRuleCreateRequest(BaseModel):
    name: str
    description: str
    stages: list[dict[str, Any]]
    max_span_seconds: int
    severity: str = "HIGH"
    mitre_tactic: str = ""


class CEPRuleResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: str
    stages: list[dict[str, Any]]
    max_span_seconds: int
    severity: str
    mitre_tactic: str
    is_active: bool
    created_at: str | None


@router.get("", response_model=list[CEPRuleResponse])
async def list_cep_rules(
    request: Request,
    claims: dict = Depends(require_analyst),
):
    """List all CEP rules for the current tenant."""
    postgres = get_app_postgres()
    tenant_id = claims.get("tenant_id", "default")
    
    rules = await postgres.list_cep_rules(tenant_id)
    return [
        CEPRuleResponse(
            id=r.id,
            tenant_id=r.tenant_id,
            name=r.name,
            description=r.description,
            stages=json.loads(r.stages_json),
            max_span_seconds=r.max_span_seconds,
            severity=r.severity,
            mitre_tactic=r.mitre_tactic,
            is_active=r.is_active,
            created_at=str(r.created_at) if r.created_at else None,
        )
        for r in rules
    ]


@router.post("", response_model=CEPRuleResponse, status_code=201)
async def create_cep_rule(
    body: CEPRuleCreateRequest,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Create a new custom CEP sequence rule."""
    postgres = get_app_postgres()
    redis = get_app_redis()
    tenant_id = claims.get("tenant_id", "default")
    
    from app.repositories.postgres import CEPRuleRecord
    from datetime import datetime

    stages_json = json.dumps(body.stages)
    rule = CEPRuleRecord(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        name=body.name,
        description=body.description,
        stages_json=stages_json,
        max_span_seconds=body.max_span_seconds,
        severity=body.severity,
        mitre_tactic=body.mitre_tactic,
        created_at=datetime.utcnow(),
    )
    
    await postgres.save_cep_rule(rule)
    
    # Cache Invalidaton: Publish update event for sliding window hot-reload
    if redis and hasattr(redis, "_client"):
        await redis._client.publish("cep_rules_updated", tenant_id)

    AuditLogger.log("cep_rule_created", request=request, claims=claims, target=rule.id)
    
    return CEPRuleResponse(
        id=rule.id,
        tenant_id=rule.tenant_id,
        name=rule.name,
        description=rule.description,
        stages=body.stages,
        max_span_seconds=rule.max_span_seconds,
        severity=rule.severity,
        mitre_tactic=rule.mitre_tactic,
        is_active=rule.is_active,
        created_at=str(rule.created_at),
    )


@router.delete("/{rule_id}")
async def delete_cep_rule(
    rule_id: str,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Delete a CEP rule and hot-reload."""
    postgres = get_app_postgres()
    redis = get_app_redis()
    tenant_id = claims.get("tenant_id", "default")
    
    deleted = await postgres.delete_cep_rule(rule_id, tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    # Cache Invalidation
    if redis and hasattr(redis, "_client"):
        await redis._client.publish("cep_rules_updated", tenant_id)

    AuditLogger.log("cep_rule_deleted", request=request, claims=claims, target=rule_id)
    return {"status": "deleted", "id": rule_id}
