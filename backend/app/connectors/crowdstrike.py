"""CrowdStrike Falcon parser → CanonicalEvent."""
from __future__ import annotations

import json
from datetime import datetime

from app.connectors.base import BaseParser
from app.schemas.canonical_event import (
    ActionType,
    CanonicalEvent,
    Entity,
    EntityType,
    EventMetadata,
    OutcomeType,
    SeverityLevel,
)


_SEVERITY_MAP = {
    "Critical": SeverityLevel.CRITICAL,
    "High": SeverityLevel.HIGH,
    "Medium": SeverityLevel.MEDIUM,
    "Low": SeverityLevel.LOW,
    "Informational": SeverityLevel.INFO,
}


class CrowdStrikeParser(BaseParser):
    """Converts CrowdStrike JSON logs into CanonicalEvents."""

    @property
    def source_type(self) -> str:
        return "crowdstrike"

    def parse(self, raw_log: str) -> CanonicalEvent:
        try:
            data = json.loads(raw_log)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in CrowdStrike log: {exc}") from exc

        event_type = data.get("event_simpleName") or data.get("EventType") or "DetectionSummaryEvent"
        
        timestamp_str = data.get("timestamp") or data.get("ProcessStartTime") or datetime.utcnow().isoformat()
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            timestamp = timestamp.replace(tzinfo=None)
        except ValueError:
            timestamp = datetime.utcnow()

        severity_name = data.get("SeverityName", "Informational")
        severity = _SEVERITY_MAP.get(severity_name, SeverityLevel.INFO)
        
        action_name = data.get("ActionTaken", "").lower()
        if "block" in action_name or "kill" in action_name or "quarantine" in action_name:
            action = ActionType.BLOCK
            outcome = OutcomeType.SUCCESS
        else:
            action = ActionType.ALERT
            outcome = OutcomeType.UNKNOWN

        hostname = data.get("ComputerName") or data.get("hostname")
        sensor_id = data.get("SensorId") or data.get("aid")
        
        source_entity = None
        if sensor_id or hostname:
            source_entity = Entity(
                entity_type=EntityType.HOST,
                identifier=sensor_id or hostname,
                hostname=hostname,
            )

        return CanonicalEvent(
            timestamp=timestamp,
            source_type="crowdstrike",
            event_category="edr",
            event_type=event_type,
            action=action,
            outcome=outcome,
            severity=severity,
            message=data.get("DetectDescription") or data.get("Objective") or event_type,
            signature_id=data.get("TacticId") or data.get("TechniqueId"),
            signature_name=data.get("Tactic"),
            source_entity=source_entity,
            metadata=EventMetadata(
                raw_log=raw_log,
                parser_name="crowdstrike",
                connector_id=sensor_id,
            ),
        )
