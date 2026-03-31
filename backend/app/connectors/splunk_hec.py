"""Splunk HEC (HTTP Event Collector) connector parser.

Receives arbitrary Splunk HEC JSON envelopes and attempts to extract
useful security entities into CanonicalEvent format.
"""
from __future__ import annotations

import json
import uuid
import structlog
from datetime import datetime, timezone

from app.connectors.base import BaseParser
from app.schemas.canonical_event import (
    CanonicalEvent,
    EntityRef,
    EventSeverity,
    NetworkContext,
)

logger = structlog.get_logger(__name__)

class SplunkHecParser(BaseParser):
    """Parses Splunk HEC JSON payload into CanonicalEvent."""
    
    @property
    def source_type(self) -> str:
        return "splunk_hec"

    def parse(self, raw_log: str) -> CanonicalEvent:
        try:
            payload = json.loads(raw_log)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON: {exc}")

        # Splunk HEC usually wraps data in {"event": {...}}
        event_data = payload.get("event", payload)
        
        # Time from Splunk
        time_val = payload.get("time")
        if time_val:
            try:
                timestamp = datetime.fromtimestamp(float(time_val), tz=timezone.utc)
            except ValueError:
                timestamp = datetime.now(timezone.utc)
        else:
            timestamp = datetime.now(timezone.utc)

        # Extraction
        src_ip = None
        dst_ip = None
        if isinstance(event_data, dict):
            src_ip = event_data.get("src_ip", event_data.get("src"))
            dst_ip = event_data.get("dest_ip", event_data.get("dest"))
            hostname = event_data.get("host", payload.get("host", "unknown"))
            message = event_data.get("message", event_data.get("msg", "Splunk HEC Event"))
        else:
            hostname = payload.get("host", "unknown")
            message = str(event_data)

        network = None
        if src_ip or dst_ip:
            network = NetworkContext(
                src_ip=src_ip,
                dst_ip=dst_ip,
            )

        return CanonicalEvent(
            event_id=str(uuid.uuid4()),
            timestamp=timestamp,
            source_type=payload.get("sourcetype", self.source_type),
            severity=EventSeverity.LOW,  # Splunk generic payload typically needs further ML inference
            message=message[:1000],
            raw_log=raw_log,
            source_entity=EntityRef(
                identifier=hostname,
                entity_type="host",
                ip_address=src_ip,
            ),
            network=network
        )
