"""Entity Details API — Investigation Console (F-01).

Provides a unified endpoint for the EntityPanel to fetch details about any
observed entity (IP, user, hostname, domain) by aggregating data from:

  1. ClickHouse — event frequency, first/last seen, recent events, risk scores
  2. Qdrant     — similar entities via behavioral DNA vector search
  3. PostgreSQL — associated findings (analyst verdicts tagged to this entity)

Route
-----
    GET /api/v1/entities/{entity_type}/{entity_value}

Path Params
-----------
    entity_type   str  One of: ip, user, host, domain
    entity_value  str  The entity identifier (e.g. "10.0.1.45", "admin")
"""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_app_clickhouse, get_app_qdrant, get_app_postgres
from app.middleware.auth import require_analyst

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/entities", tags=["investigation"])

# Map entity type → which ClickHouse column to filter on
_TYPE_COLUMN_MAP = {
    "ip": "src_ip",
    "user": "message",
    "host": "message",
    "domain": "dst_ip",
}


@router.get("/{entity_type}/{entity_value}")
async def get_entity_details(
    entity_type: str,
    entity_value: str,
    claims: dict = Depends(require_analyst),
    hours: int = Query(default=168, ge=1, le=720, description="Lookback window in hours"),
    limit: int = Query(default=10, ge=1, le=50, description="Recent events limit"),
) -> dict[str, Any]:
    """Return aggregated details for a single entity.

    Runs three data-source queries in parallel for minimal latency.
    Each source is wrapped in a try/except so partial failures degrade
    gracefully rather than failing the entire response.
    """
    tenant_id = claims.get("tenant_id", "default")

    # Run all lookups concurrently
    ch_task = asyncio.create_task(_fetch_clickhouse(tenant_id, entity_type, entity_value, hours, limit))
    qdrant_task = asyncio.create_task(_fetch_similar_entities(tenant_id, entity_type, entity_value))
    pg_task = asyncio.create_task(_fetch_associated_findings(tenant_id, entity_value))

    ch_data, qdrant_data, pg_data = await asyncio.gather(
        ch_task, qdrant_task, pg_task, return_exceptions=True
    )

    # Unwrap any exceptions into empty dicts
    if isinstance(ch_data, Exception):
        logger.warning("entity_ch_failed", entity=entity_value, error=str(ch_data))
        ch_data = {}
    if isinstance(qdrant_data, Exception):
        logger.warning("entity_qdrant_failed", entity=entity_value, error=str(qdrant_data))
        qdrant_data = []
    if isinstance(pg_data, Exception):
        logger.warning("entity_pg_failed", entity=entity_value, error=str(pg_data))
        pg_data = []

    return {
        "type": entity_type,
        "value": entity_value,
        **ch_data,
        "qdrantSimilar": qdrant_data,
        "findings": pg_data,
    }


# ── ClickHouse: frequency, first/last seen, recent events ─────────────────────

async def _fetch_clickhouse(
    tenant_id: str,
    entity_type: str,
    entity_value: str,
    hours: int,
    limit: int,
) -> dict[str, Any]:
    ch = get_app_clickhouse()
    if not ch or not ch._client:
        return {
            "frequency": 0, "firstSeen": None, "lastSeen": None,
            "recentEvents": [], "riskScore": 0, "riskTrend": [],
            "sigmaMatches": [], "relatedEvents": 0,
        }

    # Build WHERE clause
    if entity_type == "ip":
        entity_filter = "(src_ip = {val:String} OR dst_ip = {val:String})"
    elif entity_type in ("user", "host"):
        entity_filter = (
            "(positionCaseInsensitive(coalesce(message, ''), {val:String}) > 0"
            " OR positionCaseInsensitive(coalesce(raw_log, ''), {val:String}) > 0)"
        )
    else:
        entity_filter = "positionCaseInsensitive(coalesce(message, ''), {val:String}) > 0"

    base_where = f"tenant_id = {{tid:String}} AND {entity_filter}"
    params = {"tid": tenant_id, "val": entity_value}

    # 1. Aggregate stats
    stats_q = f"""
        SELECT
            count()        AS frequency,
            min(timestamp) AS first_seen,
            max(timestamp) AS last_seen,
            avg(meta_score) AS avg_risk
        FROM events
        WHERE {base_where}
          AND timestamp >= now() - INTERVAL {{hours:Int32}} HOUR
    """
    stats_result = await asyncio.to_thread(
        ch.client.query, stats_q, parameters={**params, "hours": hours},
    )
    stats_row = stats_result.result_rows[0] if stats_result.result_rows else (0, None, None, 0)

    # 2. Recent events
    recent_q = f"""
        SELECT event_id, timestamp, severity, message, action, meta_score, source_type
        FROM events
        WHERE {base_where}
        ORDER BY timestamp DESC
        LIMIT {{lim:UInt32}}
    """
    recent_result = await asyncio.to_thread(
        ch.client.query, recent_q, parameters={**params, "lim": limit},
    )
    recent_events = [
        dict(zip(recent_result.column_names, row))
        for row in recent_result.result_rows
    ]
    for evt in recent_events:
        if evt.get("timestamp"):
            evt["timestamp"] = str(evt["timestamp"])
        evt.setdefault("time", evt.get("timestamp"))

    # 3. Daily risk trend (last 7 days)
    trend_q = f"""
        SELECT toDate(timestamp) AS day, avg(meta_score) * 100 AS score
        FROM events
        WHERE {base_where} AND timestamp >= now() - INTERVAL 7 DAY
        GROUP BY day ORDER BY day ASC
    """
    trend_result = await asyncio.to_thread(ch.client.query, trend_q, parameters=params)
    risk_trend = [
        {"day": str(row[0]), "score": round(row[1], 2)}
        for row in trend_result.result_rows
    ]

    # 4. Sigma rule matches
    sigma_q = f"""
        SELECT signature_id, any(signature_name) AS name, any(severity) AS severity, count() AS hits
        FROM events
        WHERE {base_where} AND signature_id IS NOT NULL AND signature_id != ''
        GROUP BY signature_id ORDER BY hits DESC LIMIT 10
    """
    sigma_result = await asyncio.to_thread(ch.client.query, sigma_q, parameters=params)
    sigma_matches = [
        {"ruleId": row[0], "name": row[1], "severity": row[2], "hits": row[3]}
        for row in sigma_result.result_rows
    ]

    return {
        "frequency": stats_row[0],
        "firstSeen": str(stats_row[1]) if stats_row[1] else None,
        "lastSeen": str(stats_row[2]) if stats_row[2] else None,
        "riskScore": round(float(stats_row[3] or 0), 4),
        "recentEvents": recent_events,
        "riskTrend": risk_trend,
        "sigmaMatches": sigma_matches,
        "relatedEvents": stats_row[0],
    }


# ── Qdrant: similar entities via behavioral DNA ──────────────────────────────

async def _fetch_similar_entities(
    tenant_id: str,
    entity_type: str,
    entity_value: str,
) -> list[dict]:
    qdrant = get_app_qdrant()
    if not qdrant or not qdrant._client:
        return []

    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        results = qdrant.client.scroll(
            collection_name="behavioral_dna",
            scroll_filter=Filter(must=[
                FieldCondition(key="entity_id", match=MatchValue(value=entity_value)),
            ]),
            limit=1,
        )
        points, _ = results
        if not points:
            return []

        target_vector = points[0].vector
        similar = await qdrant.search_similar_entities(
            vector=target_vector,
            limit=5,
            score_threshold=0.75,
            tenant_id=tenant_id,
        )
        return [
            {"id": s.get("entity_id", ""), "value": s.get("entity_id", ""), "score": round(s.get("score", 0), 3)}
            for s in similar
            if s.get("entity_id") != entity_value
        ]
    except Exception as exc:
        logger.debug("entity_qdrant_search_failed", error=str(exc))
        return []


# ── PostgreSQL: associated findings (verdicts) ───────────────────────────────

async def _fetch_associated_findings(
    tenant_id: str,
    entity_value: str,
) -> list[dict]:
    pg = get_app_postgres()
    if not pg:
        return []

    try:
        verdicts = await pg.search_verdicts_by_note(
            tenant_id=tenant_id,
            query=entity_value,
            limit=10,
        )
        return verdicts
    except Exception as exc:
        logger.debug("entity_pg_findings_failed", error=str(exc))
        return []
