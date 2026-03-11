"""Suricata EVE JSON parser → CanonicalEvent.

Parses Suricata's EVE JSON format (alert, flow, dns event types)
into the universal CanonicalEvent schema.
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


_SEVERITY_MAP = {
    1: SeverityLevel.CRITICAL,
    2: SeverityLevel.HIGH,
    3: SeverityLevel.MEDIUM,
    4: SeverityLevel.LOW,
}


class SuricataParser(BaseParser):
    """Converts Suricata EVE JSON logs into CanonicalEvents."""

    @property
    def source_type(self) -> str:
        return "suricata"

    def parse(self, raw_log: str) -> CanonicalEvent:
        try:
            data = json.loads(raw_log)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in Suricata log: {exc}") from exc

        event_type = data.get("event_type", "unknown")
        timestamp = datetime.fromisoformat(
            data.get("timestamp", datetime.utcnow().isoformat())
        )

        alert = data.get("alert", {})
        severity_int = alert.get("severity", 4)
        severity = _SEVERITY_MAP.get(severity_int, SeverityLevel.INFO)

        action = ActionType.ALERT
        if alert.get("action") == "blocked":
            action = ActionType.BLOCK

        return CanonicalEvent(
            timestamp=timestamp,
            source_type="suricata",
            event_category=event_type,
            event_type=alert.get("category"),
            action=action,
            outcome=OutcomeType.SUCCESS if action == ActionType.BLOCK else OutcomeType.UNKNOWN,
            severity=severity,
            message=alert.get("signature", data.get("event_type")),
            signature_id=str(alert.get("signature_id", "")),
            signature_name=alert.get("signature"),
            source_entity=Entity(
                entity_type=EntityType.IP,
                identifier=data.get("src_ip", "0.0.0.0"),
            ),
            destination_entity=Entity(
                entity_type=EntityType.IP,
                identifier=data.get("dest_ip", "0.0.0.0"),
            ),
            network=NetworkInfo(
                src_ip=data.get("src_ip"),
                src_port=data.get("src_port"),
                dst_ip=data.get("dest_ip"),
                dst_port=data.get("dest_port"),
                protocol=data.get("proto"),
            ),
            metadata=EventMetadata(
                raw_log=raw_log,
                parser_name="suricata",
                connector_id=data.get("in_iface"),
            ),
        )
