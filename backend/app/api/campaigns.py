"""Campaigns API — CRUD and investigation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_app_redis, get_app_postgres
from app.middleware.auth import require_viewer

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/")
async def list_campaigns(claims: dict = Depends(require_viewer)) -> list[dict]:
    """Return active campaigns. Postgres is the system of record; Redis is the fallback."""
    tenant_id = claims.get("tenant_id", "default")

    # Primary: durable Postgres store
    postgres = get_app_postgres()
    try:
        pg_campaigns = await postgres.get_active_campaigns(tenant_id)
        if pg_campaigns:
            return pg_campaigns
    except Exception as exc:
        logger.warning("campaigns_postgres_read_failed", error=str(exc))

    # Fallback: Redis hot cache (legacy path)
    redis = get_app_redis()
    return await redis.get_all_campaigns(tenant_id)


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, claims: dict = Depends(require_viewer)) -> dict:
    """Get campaign details. Redis first, Postgres fallback."""
    tenant_id = claims.get("tenant_id", "default")

    # Hot path: Redis cache
    redis = get_app_redis()
    meta = await redis.cache_get(f"campaign_meta:{tenant_id}:{campaign_id}")
    if meta:
        return {"id": campaign_id, "meta": meta}

    # Durable fallback: Postgres
    postgres = get_app_postgres()
    try:
        from sqlalchemy import select
        from app.repositories.postgres import CampaignState
        async with postgres._session() as session:
            result = await session.execute(
                select(CampaignState).where(CampaignState.campaign_id == campaign_id)
            )
            row = result.scalar_one_or_none()
            if row:
                return {
                    "id": campaign_id,
                    "meta": {
                        "severity": row.severity,
                        "stage": row.stage,
                        "active": row.active,
                        "affected_assets": row.affected_assets,
                        "meta_score": row.meta_score,
                        "created_at": str(row.created_at) if row.created_at else None,
                    },
                }
    except Exception as exc:
        logger.warning("campaign_detail_postgres_fallback_failed", error=str(exc))

    return {"id": campaign_id, "status": "not_found"}

