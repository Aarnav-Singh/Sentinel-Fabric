"""Palo Alto Networks parser → CanonicalEvent."""
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


_SEVERITY_MAP = {
    "critical": SeverityLevel.CRITICAL,
    "high": SeverityLevel.HIGH,
    "medium": SeverityLevel.MEDIUM,
    "low": SeverityLevel.LOW,
    "informational": SeverityLevel.INFO,
}

_ACTION_MAP = {
    "allow": ActionType.ALLOW,
    "deny": ActionType.DENY,
    "drop": ActionType.DROP,
    "reset-client": ActionType.BLOCK,
    "reset-server": ActionType.BLOCK,
    "reset-both": ActionType.BLOCK,
}


class PaloAltoParser(BaseParser):
    """Converts Palo Alto Networks JSON logs into CanonicalEvents."""

    @property
    def source_type(self) -> str:
        return "palo_alto"

    def parse(self, raw_log: str) -> CanonicalEvent:
        try:
            data = json.loads(raw_log)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in Palo Alto log: {exc}") from exc

        log_type = data.get("type", "traffic").lower()
        
        timestamp_str = data.get("time_generated") or data.get("receive_time") or datetime.utcnow().isoformat()
        try:
            # Handle possible Z suffix for UTC
            timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            # Strip timezone info to make it naive (backend assumes naive UTC mostly)
            timestamp = timestamp.replace(tzinfo=None)
        except ValueError:
            timestamp = datetime.utcnow()

        severity_str = data.get("severity", "informational").lower()
        severity = _SEVERITY_MAP.get(severity_str, SeverityLevel.INFO)
        
        action_str = data.get("action", "allow").lower()
        action = _ACTION_MAP.get(action_str, ActionType.UNKNOWN)
        outcome = OutcomeType.SUCCESS if action == ActionType.ALLOW else OutcomeType.FAILURE

        src_ip = data.get("src") or data.get("source_ip") or "0.0.0.0"
        dst_ip = data.get("dst") or data.get("destination_ip") or "0.0.0.0"

        return CanonicalEvent(
            timestamp=timestamp,
            source_type="palo_alto",
            event_category=log_type,
            event_type=data.get("subtype", log_type),
            action=action,
            outcome=outcome,
            severity=severity,
            message=data.get("threat_name") or data.get("app") or log_type,
            signature_id=str(data.get("threat_id", "")),
            signature_name=data.get("threat_name"),
            source_entity=Entity(
                entity_type=EntityType.IP,
                identifier=src_ip,
            ),
            destination_entity=Entity(
                entity_type=EntityType.IP,
                identifier=dst_ip,
            ),
            network=NetworkInfo(
                src_ip=src_ip,
                src_port=int(data.get("sport", 0)) if data.get("sport") else None,
                dst_ip=dst_ip,
                dst_port=int(data.get("dport", 0)) if data.get("dport") else None,
                protocol=data.get("proto", "tcp"),
                bytes_in=int(data.get("bytes_received", 0)),
                bytes_out=int(data.get("bytes_sent", 0)),
                packets_in=int(data.get("packets_received", 0)),
                packets_out=int(data.get("packets_sent", 0)),
            ),
            metadata=EventMetadata(
                raw_log=raw_log,
                parser_name="palo_alto",
                connector_id=data.get("serial_number"),
            ),
        )
