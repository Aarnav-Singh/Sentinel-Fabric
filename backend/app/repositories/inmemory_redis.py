"""In-Memory Redis fallback — used when real Redis is unavailable.

Dict-based replacement for RedisStore. Same interface.
"""
from __future__ import annotations

import json
import time
from typing import Optional

import structlog

logger = structlog.get_logger(__name__)


class InMemoryRedis:
    """Dict-based Redis replacement with TTL support."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, float]] = {}  # key -> (value, expire_at)

    async def connect(self) -> None:
        logger.info("inmemory_redis_started")

    async def close(self) -> None:
        self._store.clear()

    def _is_alive(self, key: str) -> bool:
        if key not in self._store:
            return False
        _, expire_at = self._store[key]
        if expire_at and time.time() > expire_at:
            del self._store[key]
            return False
        return True

    # ── Entity State ─────────────────────────────────────

    async def get_entity_state(self, tenant_id: str, entity_id: str) -> Optional[dict]:
        key = f"entity:{tenant_id}:{entity_id}"
        if self._is_alive(key):
            return json.loads(self._store[key][0])
        return None

    async def set_entity_state(
        self, tenant_id: str, entity_id: str, state: dict, ttl_seconds: int = 86400
    ) -> None:
        key = f"entity:{tenant_id}:{entity_id}"
        self._store[key] = (json.dumps(state), time.time() + ttl_seconds)

    # ── Campaign Index ───────────────────────────────────

    async def add_entity_to_campaign(
        self, tenant_id: str, campaign_id: str, entity_id: str
    ) -> None:
        key = f"campaign:{tenant_id}:{campaign_id}:entities"
        existing = set()
        if key in self._store:
            existing = set(json.loads(self._store[key][0]))
        existing.add(entity_id)
        self._store[key] = (json.dumps(list(existing)), time.time() + 86400)

    async def get_campaign_entities(self, tenant_id: str, campaign_id: str) -> set[str]:
        key = f"campaign:{tenant_id}:{campaign_id}:entities"
        if self._is_alive(key):
            return set(json.loads(self._store[key][0]))
        return set()

    # ── Connector Heartbeat ──────────────────────────────

    async def record_heartbeat(self, connector_id: str) -> None:
        key = f"heartbeat:{connector_id}"
        self._store[key] = ("alive", time.time() + 120)

    async def is_connector_alive(self, connector_id: str) -> bool:
        key = f"heartbeat:{connector_id}"
        return self._is_alive(key)

    # ── Generic Cache ────────────────────────────────────

    async def cache_get(self, key: str) -> Optional[str]:
        if self._is_alive(key):
            return self._store[key][0]
        return None

    async def cache_set(self, key: str, value: str, ttl: int = 300) -> None:
        self._store[key] = (value, time.time() + ttl)
