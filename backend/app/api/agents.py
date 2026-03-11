from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any

from app.middleware.auth import require_admin, AuditLogger

router = APIRouter(prefix="/agents", tags=["agents"])

@router.post("/triage")
async def extract_and_triage(
    finding: Dict[str, Any],
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Run the LangGraph triage agent on a security finding. Admin only."""
    AuditLogger.log("agent_triage_invoked", request=request, claims=claims, detail=f"finding_keys={list(finding.keys())}")
    try:
        from app.services.agents.triage import run_triage
        result = await run_triage(finding)
        return result
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Agent dependencies not installed: {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

