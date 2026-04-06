"""Compliance API — SOC 2 Type II audit trail and status endpoints.

Provides:
  GET /api/v1/compliance/status          — SOC 2 compliance health report
  GET /api/v1/compliance/audit-trail     — Query immutable audit logs (admin-only)
  POST /api/v1/compliance/retention      — Trigger retention purge (admin-only)
  GET /api/v1/compliance/mitre-coverage  — MITRE ATT&CK coverage matrix (Addendum A2)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.middleware.auth import require_auth, require_admin
from app.dependencies import get_app_postgres
from app.services.compliance import ComplianceService

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/compliance", tags=["compliance"])


def _get_compliance_service():
    """Build ComplianceService from the running Postgres session factory."""
    postgres = get_app_postgres()
    if not postgres or not postgres._session_factory:
        raise HTTPException(status_code=503, detail="Compliance service unavailable — database not connected")
    return ComplianceService(session_factory=postgres._session_factory)


@router.get("/status")
async def compliance_status(
    claims: dict = Depends(require_auth),
):
    """SOC 2 compliance health report for the current tenant."""
    service = _get_compliance_service()
    tenant_id = claims.get("tenant_id", "default")
    return await service.get_compliance_status(tenant_id)


class AuditTrailQuery(BaseModel):
    category: Optional[str] = None
    since_hours: Optional[int] = None
    limit: int = 100


@router.get("/audit-trail")
async def audit_trail(
    category: Optional[str] = Query(None),
    since_hours: Optional[int] = Query(None),
    q: Optional[str] = Query(None, description="Filter by action or user"),
    limit: int = Query(25, ge=1, le=500),
    offset: int = Query(0, ge=0),
    claims: dict = Depends(require_admin),
):
    """Query the immutable compliance audit trail with pagination. Admin-only."""
    service = _get_compliance_service()
    tenant_id = claims.get("tenant_id", "default")

    since = None
    if since_hours:
        from datetime import timedelta
        since = datetime.now(timezone.utc) - timedelta(hours=since_hours)

    result = await service.query_audit_trail(
        tenant_id=tenant_id,
        category=category,
        since=since,
        limit=limit,
        offset=offset,
        search_query=q,
    )
    return result


@router.post("/retention")
async def trigger_retention(
    retention_days: int = Query(90, ge=30, le=365),
    claims: dict = Depends(require_admin),
):
    """Trigger data retention enforcement. Admin-only."""
    service = _get_compliance_service()
    purged = await service.enforce_retention(retention_days=retention_days)
    return {"status": "completed", "purged_rows": purged, "retention_days": retention_days}


@router.get("/mitre-coverage")
async def mitre_coverage(
    claims: dict = Depends(require_auth),
):
    """MITRE ATT&CK coverage matrix derived from active Sigma rules.

    Returns per-tactic coverage breakdown and summary statistics suitable
    for rendering a heat-map on the Compliance page (fixes audit issue M-07).

    Example summary response::

        {
          "summary": {
            "total_techniques": 196,
            "covered_techniques": 47,
            "coverage_pct": 24.0,
            "total_sigma_rules": 38,
            "total_tactics": 14,
            "covered_tactics": 6
          },
          "by_tactic": { ... }
        }
    """
    import asyncio
    from app.services.mitre_coverage import compute_coverage

    # compute_coverage is CPU-bound (YAML parsing) — run in thread pool
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, compute_coverage)
    return result
