"""Grouped Events API — CEP Sequence Aggregation.

Returns security events aggregated by ``cep_sequence_id``, which is populated
by the Redis CEP engine when it detects a multi-stage attack pattern.

Each group represents a complete attack chain detected by the CEP engine, with:
  - The MITRE tactic that triggered the sequence
  - Event count and time range
  - Maximum severity across all events in the sequence

This endpoint powers the ``AttackPatternCard`` UI component.

Route
-----
    GET /api/v1/events/grouped

Query Params
------------
    limit   int  Max groups to return (default 20, max 100)
    hours   int  Lookback window in hours (default 24)
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse

from app.dependencies import get_app_clickhouse
from app.middleware.auth import require_analyst

logger = logging.getLogger(__name__)

router = APIRouter(tags=["events"])

# MITRE severity rank for ordering
_SEV_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}


@router.get("/events/grouped")
async def get_grouped_events(
    claims: dict = Depends(require_analyst),
    limit: int = Query(default=20, ge=1, le=100),
    hours: int = Query(default=24, ge=1, le=168),
) -> JSONResponse:
    """Return security events grouped by CEP sequence ID.

    Falls back to an empty list if ClickHouse is unavailable so the frontend
    renders gracefully during infra-only mode.
    """
    ch = get_app_clickhouse()
    if not ch or not ch.client:
        return JSONResponse({"groups": [], "source": "unavailable"})

    tenant_id = claims.get("tenant_id", "default")
    if not re.match(r'^[\w\-]+$', tenant_id):
        tenant_id = "default"

    query = f"""
        SELECT
            cep_sequence_id,
            any(tactic)           AS tactic,
            any(technique)        AS technique,
            count()               AS event_count,
            min(timestamp)        AS first_seen,
            max(timestamp)        AS last_seen,
            argMax(severity, timestamp) AS peak_severity,
            groupArray(id)        AS event_ids
        FROM sentinel.events
        WHERE
            tenant_id = '{tenant_id}'
            AND cep_sequence_id IS NOT NULL
            AND cep_sequence_id != ''
            AND timestamp >= now() - INTERVAL {hours} HOUR
        GROUP BY cep_sequence_id
        ORDER BY event_count DESC
        LIMIT {limit}
    """

    try:
        rows: List[Dict[str, Any]] = await ch.client.fetch(query)
    except Exception as exc:
        logger.warning("events_grouped_query_failed", error=str(exc))
        return JSONResponse({"groups": [], "source": "error", "detail": str(exc)})

    groups = []
    for row in rows:
        groups.append({
            "cep_sequence_id": row.get("cep_sequence_id", ""),
            "tactic": row.get("tactic", "Unknown"),
            "technique": row.get("technique", ""),
            "event_count": row.get("event_count", 0),
            "first_seen": str(row.get("first_seen", "")),
            "last_seen": str(row.get("last_seen", "")),
            "peak_severity": row.get("peak_severity", "low"),
            "event_ids": list(row.get("event_ids", [])),
        })

    # Sort by severity rank desc, then event count desc
    groups.sort(
        key=lambda g: (_SEV_RANK.get(g["peak_severity"], 0), g["event_count"]),
        reverse=True,
    )

    return JSONResponse({"groups": groups, "source": "clickhouse"})
