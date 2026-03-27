from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any

from app.middleware.auth import require_analyst, AuditLogger

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/triage")
async def extract_and_triage(
    finding: Dict[str, Any],
    request: Request,
    claims: dict = Depends(require_analyst),
):
    """Run the Claude triage agent on a security finding.

    Requires analyst role. The agent uses platform tools (threat intel,
    campaign context, asset criticality, etc.) to gather evidence before
    making a severity assessment and optionally submitting a verdict to
    close the Agent Lightning feedback loop.
    """
    tenant_id = claims.get("tenant_id", "default")

    AuditLogger.log(
        "agent_triage_invoked",
        request=request,
        claims=claims,
        detail=f"finding_keys={list(finding.keys())} tenant={tenant_id}",
    )
    try:
        from app.services.agents.triage import run_triage
        result = await run_triage(finding, tenant_id)
        return result
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Agent dependencies not installed: {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
