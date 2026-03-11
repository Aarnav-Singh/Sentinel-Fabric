"""Windows Event Log parser → CanonicalEvent.

Parses Windows Event Log JSON (as forwarded via NXLog/WinLogBeat).
Covers security-relevant Event IDs (4624, 4625, 4688, 4720, etc.).
"""
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
    NetworkInfo,
    OutcomeType,
    SeverityLevel,
)

# Security-relevant Windows Event IDs
_EVENT_ID_MAP = {
    4624: ("auth_success", ActionType.AUTHENTICATE, OutcomeType.SUCCESS, SeverityLevel.INFO),
    4625: ("auth_failure", ActionType.AUTHENTICATE, OutcomeType.FAILURE, SeverityLevel.MEDIUM),
    4634: ("logoff", ActionType.UNKNOWN, OutcomeType.SUCCESS, SeverityLevel.INFO),
    4648: ("explicit_cred", ActionType.AUTHENTICATE, OutcomeType.SUCCESS, SeverityLevel.MEDIUM),
    4688: ("process_create", ActionType.EXECUTE, OutcomeType.SUCCESS, SeverityLevel.LOW),
    4689: ("process_exit", ActionType.EXECUTE, OutcomeType.SUCCESS, SeverityLevel.INFO),
    4720: ("user_created", ActionType.MODIFY, OutcomeType.SUCCESS, SeverityLevel.HIGH),
    4722: ("user_enabled", ActionType.MODIFY, OutcomeType.SUCCESS, SeverityLevel.MEDIUM),
    4732: ("group_member_added", ActionType.MODIFY, OutcomeType.SUCCESS, SeverityLevel.HIGH),
    7045: ("service_installed", ActionType.EXECUTE, OutcomeType.SUCCESS, SeverityLevel.HIGH),
    1102: ("audit_cleared", ActionType.MODIFY, OutcomeType.SUCCESS, SeverityLevel.CRITICAL),
}


class WindowsEventParser(BaseParser):
    """Converts Windows Event Log JSON into CanonicalEvents."""

    @property
    def source_type(self) -> str:
        return "windows"

    def parse(self, raw_log: str) -> CanonicalEvent:
        try:
            data = json.loads(raw_log)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in Windows Event: {exc}") from exc

        event_id = data.get("EventID", 0)
        event_data = data.get("EventData", {})
        system = data.get("System", {})

        category, action, outcome, severity = _EVENT_ID_MAP.get(
            event_id,
            ("unknown", ActionType.UNKNOWN, OutcomeType.UNKNOWN, SeverityLevel.INFO),
        )

        timestamp_str = system.get("TimeCreated", {}).get("SystemTime")
        timestamp = (
            datetime.fromisoformat(timestamp_str.rstrip("Z"))
            if timestamp_str
            else datetime.utcnow()
        )

        username = event_data.get("TargetUserName") or event_data.get("SubjectUserName", "SYSTEM")
        hostname = system.get("Computer", "unknown")
        src_ip = event_data.get("IpAddress")

        return CanonicalEvent(
            timestamp=timestamp,
            source_type="windows",
            event_category="security",
            event_type=category,
            action=action,
            outcome=outcome,
            severity=severity,
            message=f"Event {event_id}: {category} by {username} on {hostname}",
            signature_id=str(event_id),
            source_entity=Entity(
                entity_type=EntityType.USER,
                identifier=username,
                hostname=hostname,
            ),
            destination_entity=Entity(
                entity_type=EntityType.HOST,
                identifier=hostname,
            ),
            network=NetworkInfo(src_ip=src_ip) if src_ip else None,
            metadata=EventMetadata(
                raw_log=raw_log,
                parser_name="windows_event",
            ),
        )
