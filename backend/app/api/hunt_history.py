"""Hunt History API — Phase 3 (Bug 5 fix).

Provides per-analyst query history for the UQL editor's history dropdown.
Storage: PostgreSQL hunt_queries table (never ClickHouse — this is relational
per-user config data, not event data).

Endpoints:
  GET  /hunt/history        — last 20 hunt queries for current analyst
  DELETE /hunt/history/{id} — remove a specific query from history
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_app_postgres
from app.middleware.auth import require_analyst

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/hunt/history", tags=["threat-hunt"])


@router.get("/")
async def get_hunt_history(
    limit: int = 20,
    claims: dict = Depends(require_analyst),
) -> list[dict]:
    """Return the last N hunt queries executed by the calling analyst.

    History is tenant-isolated and user-isolated — analysts only see their own queries.
    """
    tenant_id = claims.get("tenant_id", "default")
    user_id = claims.get("sub", "unknown")
    limit = max(1, min(limit, 100))

    pg = get_app_postgres()
    history = await pg.get_hunt_history(
        tenant_id=tenant_id,
        user_id=user_id,
        limit=limit,
    )

    logger.debug("hunt_history_fetched", user_id=user_id, count=len(history))
    return history


@router.delete("/{query_id}", status_code=204)
async def delete_hunt_query(
    query_id: str,
    claims: dict = Depends(require_analyst),
) -> None:
    """Delete a specific hunt query from history.

    Silently succeeds if the query does not exist (idempotent).
    Only the owning analyst can delete their own queries.
    """
    tenant_id = claims.get("tenant_id", "default")
    user_id = claims.get("sub", "unknown")

    pg = get_app_postgres()
    try:
        from sqlalchemy import select, delete as sql_delete
        from app.repositories.postgres import HuntQuery

        async with pg._session() as session:
            # Verify ownership before deleting
            result = await session.execute(
                select(HuntQuery).where(
                    HuntQuery.id == query_id,
                    HuntQuery.tenant_id == tenant_id,
                    HuntQuery.user_id == user_id,
                )
            )
            row = result.scalar_one_or_none()
            if row:
                await session.delete(row)
                await session.commit()
    except Exception as exc:
        logger.warning("hunt_history_delete_failed", query_id=query_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to delete hunt query")
