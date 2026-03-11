"""Zeek connection log parser → CanonicalEvent.

Parses Zeek's conn.log TSV/JSON format into CanonicalEvents.
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

# Zeek conn_state → action/outcome mapping
_CONN_STATE_MAP = {
    "SF": (ActionType.ALLOW, OutcomeType.SUCCESS),    # Normal established
    "S0": (ActionType.CONNECT, OutcomeType.FAILURE),   # SYN no reply
    "REJ": (ActionType.DENY, OutcomeType.FAILURE),     # Rejected
    "RSTO": (ActionType.BLOCK, OutcomeType.FAILURE),   # Reset by originator
    "RSTR": (ActionType.BLOCK, OutcomeType.FAILURE),   # Reset by responder
    "OTH": (ActionType.UNKNOWN, OutcomeType.UNKNOWN),
}


class ZeekParser(BaseParser):
    """Converts Zeek conn.log entries into CanonicalEvents."""

    @property
    def source_type(self) -> str:
        return "zeek"

    def parse(self, raw_log: str) -> CanonicalEvent:
        try:
            data = json.loads(raw_log)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in Zeek log: {exc}") from exc

        ts = data.get("ts", 0)
        timestamp = datetime.utcfromtimestamp(float(ts)) if ts else datetime.utcnow()

        conn_state = data.get("conn_state", "OTH")
        action, outcome = _CONN_STATE_MAP.get(conn_state, (ActionType.UNKNOWN, OutcomeType.UNKNOWN))

        return CanonicalEvent(
            timestamp=timestamp,
            source_type="zeek",
            event_category="conn",
            event_type=data.get("service"),
            action=action,
            outcome=outcome,
            severity=SeverityLevel.INFO,
            message=f"Zeek conn: {data.get('id.orig_h', '?')} → {data.get('id.resp_h', '?')}:{data.get('id.resp_p', '?')}",
            source_entity=Entity(
                entity_type=EntityType.IP,
                identifier=data.get("id.orig_h", "0.0.0.0"),
            ),
            destination_entity=Entity(
                entity_type=EntityType.IP,
                identifier=data.get("id.resp_h", "0.0.0.0"),
            ),
            network=NetworkInfo(
                src_ip=data.get("id.orig_h"),
                src_port=data.get("id.orig_p"),
                dst_ip=data.get("id.resp_h"),
                dst_port=data.get("id.resp_p"),
                protocol=data.get("proto"),
                bytes_in=int(data.get("resp_bytes", 0) or 0),
                bytes_out=int(data.get("orig_bytes", 0) or 0),
                packets_in=int(data.get("resp_pkts", 0) or 0),
                packets_out=int(data.get("orig_pkts", 0) or 0),
            ),
            metadata=EventMetadata(
                raw_log=raw_log,
                parser_name="zeek",
            ),
        )
