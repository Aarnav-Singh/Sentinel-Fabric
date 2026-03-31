"""Microsoft Sentinel connector parser.

Converts Microsoft Sentinel incidents/alerts into CanonicalEvent format.
Expected input relates to Azure Monitor / Sentinel SecurityAlert schema.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
import uuid
import structlog

from app.connectors.base import BaseParser
from app.schemas.canonical_event import (
    CanonicalEvent,
    EntityRef,
    EventSeverity,
    NetworkContext,
)

logger = structlog.get_logger(__name__)

class MSSentinelParser(BaseParser):
    """Parses Microsoft Sentinel SecurityAlert JSON into CanonicalEvent."""
    
    @property
    def source_type(self) -> str:
        return "ms_sentinel"

    def parse(self, raw_log: str) -> CanonicalEvent:
        try:
            data = json.loads(raw_log)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON: {exc}")

        # Sentinel alerts typically have SystemAlertId or AlertDisplayName
        alert_id = data.get("SystemAlertId", data.get("id", str(uuid.uuid4())))
        title = data.get("AlertDisplayName", data.get("title", "Microsoft Sentinel Alert"))
        
        # Time parse
        time_str = data.get("TimeGenerated", data.get("timeGenerated"))
        timestamp = datetime.now(timezone.utc)
        if time_str:
            try:
                timestamp = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
            except ValueError:
                pass

        # Entities wrapper in Sentinel
        entities = data.get("Entities", [])
        src_ip = None
        dst_ip = None
        hostname = None
        user_name = None
        for entity in entities:
            e_type = entity.get("Type", "").lower()
            if e_type == "ip":
                ip = entity.get("Address")
                if not src_ip:
                    src_ip = ip
                else:
                    dst_ip = ip
            elif e_type == "host":
                hostname = entity.get("HostName")
            elif e_type == "account":
                user_name = entity.get("Name")

        # Fallback if top-level fields exist
        if not src_ip:
            src_ip = data.get("CallerIpAddress")
        if not user_name:
            user_name = data.get("UserPrincipalName")

        # Network context
        network = None
        if src_ip or dst_ip:
            network = NetworkContext(
                src_ip=src_ip,
                dst_ip=dst_ip,
                protocol=data.get("NetworkProtocol", "tcp").lower(),
            )

        # Build Canonical
        return CanonicalEvent(
            event_id=str(alert_id),
            timestamp=timestamp,
            source_type=self.source_type,
            severity=self._map_severity(data.get("Severity", "Medium")),
            message=title,
            raw_log=raw_log,
            source_entity=EntityRef(
                identifier=hostname or src_ip or user_name or "unknown",
                entity_type="host" if hostname else "user" if user_name else "network",
                name=hostname,
                ip_address=src_ip,
                user=user_name,
            ),
            network=network,
        )

    def _map_severity(self, st: str) -> EventSeverity:
        st_lower = str(st).lower()
        if st_lower == "high":
            return EventSeverity.HIGH
        elif st_lower in ("medium", "informational"):
            return EventSeverity.MEDIUM
        elif st_lower == "low":
            return EventSeverity.LOW
        return EventSeverity.MEDIUM
