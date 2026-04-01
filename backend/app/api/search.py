"""Search API — powers the frontend omnibar / universal search.

Searches across findings, events, campaigns, and sigma rules
to provide a unified search experience.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_app_clickhouse, get_app_postgres, get_app_redis
from app.middleware.auth import require_viewer

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
async def omnibar_search(
    q: str = Query(..., min_length=1, max_length=256, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    claims: dict = Depends(require_viewer),
):
    """Universal search across events, findings, campaigns, and rules.

    Returns categorised results for the frontend omnibar.
    """
    tenant_id = claims.get("tenant_id", "default")
    results: list[dict] = []

    # 1. Search events in ClickHouse
    try:
        ch = get_app_clickhouse()
        events = await ch.search_events(tenant_id=tenant_id, query=q, limit=limit)
        for ev in events:
            results.append({
                "type": "event",
                "id": str(ev.get("event_id", "")),
                "title": str(ev.get("message", ""))[:120],
                "severity": str(ev.get("severity", "")),
                "timestamp": str(ev.get("timestamp", "")),
            })
    except Exception as exc:
        logger.debug("search_events_error", error=str(exc))

    # 2. Search findings in Postgres
    try:
        pg = get_app_postgres()
        findings = await pg.search_findings(tenant_id=tenant_id, query=q, limit=limit)
        for f in findings:
            results.append({
                "type": "finding",
                "id": str(f.id),
                "title": f.title,
                "severity": f.severity,
                "timestamp": f.created_at.isoformat() if f.created_at else None,
            })
    except Exception as exc:
        logger.debug("search_findings_error", error=str(exc))

    # 3. Search campaigns in Redis
    try:
        redis = get_app_redis()
        campaigns = await redis.get_all_campaigns(tenant_id)
        q_lower = q.lower()
        for c in campaigns:
            name = c.get("name", "") or ""
            if q_lower in name.lower() or q_lower in str(c.get("techniques", [])).lower():
                results.append({
                    "type": "campaign",
                    "id": c.get("id", ""),
                    "title": name,
                    "severity": c.get("severity", "medium"),
                    "timestamp": c.get("created_at"),
                })
    except Exception as exc:
        logger.debug("search_campaigns_error", error=str(exc))

    # 4. Search sigma rules in Postgres
    try:
        pg = get_app_postgres()
        rules = await pg.search_sigma_rules(tenant_id=tenant_id, query=q, limit=limit)
        for r in rules:
            results.append({
                "type": "sigma_rule",
                "id": str(r.id),
                "title": r.title,
                "severity": r.level,
                "timestamp": None,
            })
    except Exception as exc:
        logger.debug("search_rules_error", error=str(exc))

    return {
        "query": q,
        "total": len(results),
        "results": results[:limit],
    }
