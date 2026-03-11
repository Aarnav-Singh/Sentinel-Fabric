"""Generic Syslog parser → CanonicalEvent.

RFC 5424 fallback parser for any syslog source that doesn't
have a dedicated connector. Extracts what it can from structured
and unstructured syslog messages.
"""
from __future__ import annotations

import json
import re
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

_SYSLOG_SEVERITY = {
    0: SeverityLevel.CRITICAL,   # Emergency
    1: SeverityLevel.CRITICAL,   # Alert
    2: SeverityLevel.CRITICAL,   # Critical
    3: SeverityLevel.HIGH,       # Error
    4: SeverityLevel.MEDIUM,     # Warning
    5: SeverityLevel.LOW,        # Notice
    6: SeverityLevel.INFO,       # Info
    7: SeverityLevel.INFO,       # Debug
}

_IP_PATTERN = re.compile(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b")


class GenericSyslogParser(BaseParser):
    """RFC 5424 fallback parser for unrecognized syslog sources."""

    @property
    def source_type(self) -> str:
        return "syslog"

    def parse(self, raw_log: str) -> CanonicalEvent:
        # Attempt JSON first (some syslog is structured)
        try:
            data = json.loads(raw_log)
            return self._parse_structured(data, raw_log)
        except (json.JSONDecodeError, KeyError):
            pass

        return self._parse_unstructured(raw_log)

    def _parse_structured(self, data: dict, raw_log: str) -> CanonicalEvent:
        severity_int = data.get("severity", data.get("level", 6))
        severity = _SYSLOG_SEVERITY.get(int(severity_int), SeverityLevel.INFO)

        ips = _IP_PATTERN.findall(data.get("message", ""))
        src_ip = ips[0] if len(ips) >= 1 else None
        dst_ip = ips[1] if len(ips) >= 2 else None

        return CanonicalEvent(
            timestamp=datetime.utcnow(),
            source_type="syslog",
            event_category=data.get("facility", "generic"),
            event_type=data.get("program"),
            action=ActionType.UNKNOWN,
            outcome=OutcomeType.UNKNOWN,
            severity=severity,
            message=data.get("message", raw_log[:500]),
            source_entity=Entity(
                entity_type=EntityType.IP,
                identifier=src_ip or data.get("hostname", "unknown"),
            ) if src_ip else None,
            network=NetworkInfo(src_ip=src_ip, dst_ip=dst_ip) if src_ip else None,
            metadata=EventMetadata(raw_log=raw_log, parser_name="generic_syslog"),
        )

    def _parse_unstructured(self, raw_log: str) -> CanonicalEvent:
        ips = _IP_PATTERN.findall(raw_log)

        return CanonicalEvent(
            timestamp=datetime.utcnow(),
            source_type="syslog",
            event_category="generic",
            action=ActionType.UNKNOWN,
            outcome=OutcomeType.UNKNOWN,
            severity=SeverityLevel.INFO,
            message=raw_log[:500],
            source_entity=Entity(
                entity_type=EntityType.IP,
                identifier=ips[0] if ips else "unknown",
            ) if ips else None,
            network=NetworkInfo(src_ip=ips[0] if ips else None, dst_ip=ips[1] if len(ips) >= 2 else None),
            metadata=EventMetadata(raw_log=raw_log, parser_name="generic_syslog"),
        )
