"""ChatOps API for Bi-Directional Bot Integrations (Slack/Teams).

Receives interactive webhook callbacks (e.g., when an analyst clicks "Approve" 
on a Slack Actionable Message) and triggers SOAR execution resumption.
"""
from __future__ import annotations

import hmac
import hashlib
import time
from fastapi import APIRouter, HTTPException, Request

import structlog
from app.config import settings

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/chatops", tags=["chatops"])


def verify_slack_signature(request: Request, raw_body: bytes) -> bool:
    """Verify Slack incoming webhook signature for security."""
    slack_signing_secret = getattr(settings, "slack_signing_secret", None)
    if not slack_signing_secret:
        # If not configured, bypass for local dev, but warn
        logger.warning("slack_signing_secret_missing_bypassing_auth")
        return True
        
    slack_signature = request.headers.get("X-Slack-Signature", "")
    slack_request_timestamp = request.headers.get("X-Slack-Request-Timestamp", "0")
    
    # Check for replay attacks (5 minute tolerance)
    if abs(time.time() - int(slack_request_timestamp)) > 60 * 5:
        return False
        
    sig_basestring = f"v0:{slack_request_timestamp}:{raw_body.decode('utf-8')}"
    my_signature = "v0=" + hmac.new(
        slack_signing_secret.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(my_signature, slack_signature)


@router.post("/webhook/slack")
async def slack_interactive_webhook(request: Request):
    """Receive Slack block kit interactions (e.g., Button Clicks)."""
    raw_body = await request.body()
    
    if not verify_slack_signature(request, raw_body):
        raise HTTPException(status_code=401, detail="Invalid Slack signature")
        
    form_data = await request.form()
    payload_str = form_data.get("payload")
    if not payload_str:
        return {"status": "ignored", "reason": "No payload"}
        
    import json
    try:
        payload = json.loads(payload_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Only process block_actions (button clicks)
    if payload.get("type") != "block_actions":
        return {"status": "ignored", "reason": "Not a block action"}

    actions = payload.get("actions", [])
    if not actions:
        return {"status": "ignored", "reason": "No actions found"}

    action = actions[0]
    action_id = action.get("action_id")
    value = action.get("value", "")  # Expected format: "playbook_id:approval_id:decision"

    parts = value.split(":")
    if len(parts) == 3 and action_id in ("soar_approve", "soar_reject"):
        playbook_id, approval_id, decision = parts
        logger.info(
            "chatops_soar_decision_received", 
            platform="slack",
            playbook=playbook_id,
            approval=approval_id,
            decision=decision,
            user=payload.get("user", {}).get("username")
        )
        
        # In a real system, we'd trigger app.services.soar.resume_execution here
        # For now, we simulate the internal state flip.
        
        return {"status": "success", "message": f"Recorded SOAR decision from Slack: {decision}"}
        
    return {"status": "ignored", "reason": "Unknown action"}


@router.post("/webhook/teams")
async def teams_interactive_webhook(request: Request):
    """Receive Microsoft Teams actionable message responses."""
    # Note: Teams uses a different auth mechanism (Bearer token matching a known bot ID)
    # This is a simplified stub.
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Extract decision from Adaptive Card Submit Action
    decision = payload.get("action", "unknown")
    context = payload.get("context", {})
    playbook_id = context.get("playbook_id")
    approval_id = context.get("approval_id")

    if playbook_id and approval_id:
        logger.info(
            "chatops_soar_decision_received", 
            platform="teams",
            playbook=playbook_id,
            approval=approval_id,
            decision=decision
        )
        return {"status": "success", "message": f"Recorded SOAR decision from Teams: {decision}"}

    return {"status": "ignored", "reason": "Missing SOAR context"}
