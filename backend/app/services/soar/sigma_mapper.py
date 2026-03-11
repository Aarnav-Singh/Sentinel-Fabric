"""Maps incoming security events to predefined SOAR execution actions.

This acts as the bridge between Sigma rules/generic alerts
and actionable responses from the execution engine.
"""
from typing import Dict, Any, List

from app.schemas.canonical_event import CanonicalEvent
from app.services.soar.engine import execution_engine as soar_engine

import logging

logger = logging.getLogger(__name__)

# Basic dictionary to map signatures/rules to actions
# In a full production system, this would refer a database table or dedicated rule engine
SIGMA_ACTION_MAP = {
    # If this signature_id or signature_name matches, trigger these actions
    "Suspicious PowerShell Download": ["isolate_host"],
    "Ransomware File Extension Observed": ["isolate_host"],
    "Known Malicious IP Connection": ["block_ip"]
}

async def map_and_execute_soar_actions(event: CanonicalEvent) -> bool:
    """Evaluates an event for SOAR actions and executes them if necessary."""
    # Look for matching signatures
    actions: List[str] = []
    
    if event.signature_name in SIGMA_ACTION_MAP:
        actions.extend(SIGMA_ACTION_MAP[event.signature_name])
    elif event.signature_id in SIGMA_ACTION_MAP:
        actions.extend(SIGMA_ACTION_MAP[event.signature_id])

    # Default action heuristics based on event severity and action
    if event.severity == "critical" and "malware" in (event.message or "").lower():
        if "isolate_host" not in actions:
            actions.append("isolate_host")

    if not actions:
        return False

    success = True
    for act in set(actions):
        context: Dict[str, Any] = {}
        if act == "block_ip":
            # Determine which IP to block
            if event.network and event.network.src_ip:
                context["ip"] = event.network.src_ip
            elif event.source_entity and event.source_entity.identifier:
                context["ip"] = event.source_entity.identifier
            else:
                 logger.warning(f"Could not find IP for block_ip action in event {event.event_id}")
                 continue
        elif act == "isolate_host":
            # Determine which host to isolate
            if event.source_entity and event.source_entity.entity_type == "host":
                context["hostname"] = event.source_entity.identifier
            elif event.destination_entity and event.destination_entity.entity_type == "host":
                context["hostname"] = event.destination_entity.identifier
            else:
                logger.warning(f"Could not find hostname for isolate_host action in event {event.event_id}")
                continue

        logger.info(f"[SOAR MAPPER] Forwarding action {act} for event {event.event_id} to engine.")
        # Execute the action via engine
        res = await soar_engine.execute_action(act, context)
        if not res:
            success = False
            
    return success
