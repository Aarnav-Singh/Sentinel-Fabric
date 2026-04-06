from fastapi import APIRouter, Depends, Query, Request, HTTPException
from typing import List, Dict, Any
from app.dependencies import get_app_scylla
from app.middleware.auth import require_analyst
import logging

router = APIRouter(prefix="/api/v1/cases", tags=["cases"])
logger = logging.getLogger(__name__)


@router.get("")
async def list_cases(
    limit: int = Query(50, ge=1, le=1000),
    claims: dict = Depends(require_analyst),
):
    scylla = get_app_scylla()
    if not scylla:
        raise HTTPException(status_code=503, detail="ScyllaDB is not configured or unavailable.")

    tenant_id = claims.get("tenant_id", "default")
    return scylla.get_cases(tenant_id, limit=limit)


@router.post("")
async def create_case(
    case_data: Dict[str, Any],
    claims: dict = Depends(require_analyst),
):
    scylla = get_app_scylla()
    if not scylla:
        raise HTTPException(status_code=503, detail="ScyllaDB is not configured or unavailable.")

    tenant_id = claims.get("tenant_id", "default")
    case_id = scylla.write_case(tenant_id, case_data)
    return {"status": "success", "case_id": str(case_id)}


@router.get("/alerts")
async def list_alerts(
    limit: int = Query(100, ge=1, le=1000),
    claims: dict = Depends(require_analyst),
):
    scylla = get_app_scylla()
    if not scylla:
        raise HTTPException(status_code=503, detail="ScyllaDB is not configured or unavailable.")

    tenant_id = claims.get("tenant_id", "default")
    return scylla.get_alerts(tenant_id, limit=limit)


@router.post("/alerts")
async def create_alert(
    alert_data: Dict[str, Any],
    claims: dict = Depends(require_analyst),
):
    scylla = get_app_scylla()
    if not scylla:
        raise HTTPException(status_code=503, detail="ScyllaDB is not configured or unavailable.")

    tenant_id = claims.get("tenant_id", "default")
    alert_id = scylla.write_alert(tenant_id, alert_data)
    return {"status": "success", "alert_id": str(alert_id)}
