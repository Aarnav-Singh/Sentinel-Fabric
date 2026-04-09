"""Triage Queue — Redis-backed durable queue for LLM auto-triage.

Replaces the direct semaphore-gated LLM call in the pipeline with
a push-to-queue strategy. Events that need triage are enqueued
instantly (non-blocking), and a background worker drains the queue
at a controlled rate.

Dead-letter handling: events that fail triage 3 times are moved
to a dead-letter list for manual review rather than being lost.
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Optional

import structlog

from app.config import settings
from app.repositories.redis_store import RedisStore

logger = structlog.get_logger(__name__)

# Redis key conventions
_QUEUE_KEY = "triage_queue:{tenant_id}"
_PROCESSING_KEY = "triage_processing:{tenant_id}"
_DLQ_KEY = "triage_dlq:{tenant_id}"
_RETRY_COUNT_KEY = "triage_retries:{event_id}"

MAX_RETRIES = 3
VISIBILITY_TIMEOUT_SECONDS = 120  # if worker crashes, re-enqueue after 2 min


class TriageQueue:
    """Redis-backed triage queue with at-least-once delivery."""

    def __init__(self, redis: RedisStore) -> None:
        self._redis = redis
        self._running = False

    async def enqueue(self, tenant_id: str, event_data: dict) -> None:
        """Push an event to the triage queue. Non-blocking, O(1).

        Called from the pipeline hot path instead of run_triage().
        """
        payload = json.dumps({
            "tenant_id": tenant_id,
            "event_id": event_data.get("event_id", "unknown"),
            "enqueued_at": time.time(),
            "event_data": event_data,
        }, default=str)

        queue_key = _QUEUE_KEY.format(tenant_id=tenant_id)
        await self._redis.client.lpush(queue_key, payload)
        logger.debug("triage_enqueued", event_id=event_data.get("event_id"), queue=queue_key)

    async def start_worker(self, tenant_id: str = "default") -> None:
        """Background worker that drains the triage queue.

        Uses BRPOPLPUSH for at-least-once delivery:
        1. BRPOPLPUSH from queue → processing list
        2. Execute triage
        3. On success: remove from processing list
        4. On failure: increment retry counter
           - If retries < MAX_RETRIES: re-enqueue
           - If retries >= MAX_RETRIES: move to DLQ
        """
        from app.services.agents.triage import run_triage

        self._running = True
        queue_key = _QUEUE_KEY.format(tenant_id=tenant_id)
        processing_key = _PROCESSING_KEY.format(tenant_id=tenant_id)
        dlq_key = _DLQ_KEY.format(tenant_id=tenant_id)

        logger.info("triage_worker_started", queue=queue_key)

        while self._running:
            try:
                # Block for up to 5 seconds waiting for work
                raw = await self._redis.client.brpoplpush(
                    queue_key, processing_key, timeout=5
                )
                if raw is None:
                    continue  # timeout, loop and check self._running

                payload = json.loads(raw)
                event_id = payload.get("event_id", "unknown")
                event_data = payload.get("event_data", {})
                enqueued_at = payload.get("enqueued_at", 0)

                wait_ms = (time.time() - enqueued_at) * 1000
                logger.info(
                    "triage_dequeued",
                    event_id=event_id,
                    wait_ms=round(wait_ms, 1),
                )

                try:
                    triage_res = await asyncio.wait_for(
                        run_triage(event_data, tenant_id),
                        timeout=settings.anthropic_timeout_seconds,
                    )

                    # Success: persist result to ClickHouse via event update
                    await self._persist_triage_result(tenant_id, event_id, triage_res)

                    # Remove from processing list
                    await self._redis.client.lrem(processing_key, 1, raw)

                    # Clear retry counter
                    retry_key = _RETRY_COUNT_KEY.format(event_id=event_id)
                    await self._redis.client.delete(retry_key)

                    logger.info(
                        "triage_worker_complete",
                        event_id=event_id,
                        verdict=triage_res.get("verdict"),
                    )

                except (asyncio.TimeoutError, Exception) as exc:
                    # Remove from processing list (we'll re-enqueue or DLQ)
                    await self._redis.client.lrem(processing_key, 1, raw)

                    retry_key = _RETRY_COUNT_KEY.format(event_id=event_id)
                    retries = await self._redis.client.incr(retry_key)
                    await self._redis.client.expire(retry_key, 3600)  # TTL 1 hour

                    if retries >= MAX_RETRIES:
                        # Dead-letter: too many failures
                        dlq_payload = json.dumps({
                            **payload,
                            "error": str(exc),
                            "retries": retries,
                            "dlq_at": time.time(),
                        }, default=str)
                        await self._redis.client.lpush(dlq_key, dlq_payload)
                        await self._redis.client.delete(retry_key)
                        logger.error(
                            "triage_moved_to_dlq",
                            event_id=event_id,
                            retries=retries,
                            error=str(exc),
                        )
                    else:
                        # Re-enqueue for retry
                        await self._redis.client.lpush(queue_key, raw)
                        logger.warning(
                            "triage_retry_enqueued",
                            event_id=event_id,
                            attempt=retries,
                            max_retries=MAX_RETRIES,
                            error=str(exc),
                        )

            except Exception as loop_exc:
                logger.error("triage_worker_loop_error", error=str(loop_exc))
                await asyncio.sleep(1)  # back off on unexpected errors

        logger.info("triage_worker_stopped")

    async def stop(self) -> None:
        """Signal the worker to stop gracefully."""
        self._running = False

    async def recover_stale_processing(self, tenant_id: str = "default") -> int:
        """On startup, move any items stuck in the processing list back to the queue.

        This handles the case where the worker crashed mid-triage.
        Items in the processing list that have been there longer than
        VISIBILITY_TIMEOUT_SECONDS are re-enqueued.
        """
        processing_key = _PROCESSING_KEY.format(tenant_id=tenant_id)
        queue_key = _QUEUE_KEY.format(tenant_id=tenant_id)

        items = await self._redis.client.lrange(processing_key, 0, -1)
        recovered = 0

        for raw in items:
            try:
                payload = json.loads(raw)
                enqueued_at = payload.get("enqueued_at", 0)
                age = time.time() - enqueued_at

                if age > VISIBILITY_TIMEOUT_SECONDS:
                    await self._redis.client.lrem(processing_key, 1, raw)
                    await self._redis.client.lpush(queue_key, raw)
                    recovered += 1
                    logger.info(
                        "triage_recovered_stale",
                        event_id=payload.get("event_id"),
                        age_seconds=round(age),
                    )
            except Exception:
                pass

        if recovered:
            logger.info("triage_recovery_complete", recovered=recovered)
        return recovered

    async def get_queue_depth(self, tenant_id: str = "default") -> dict:
        """Return queue metrics for monitoring."""
        queue_key = _QUEUE_KEY.format(tenant_id=tenant_id)
        processing_key = _PROCESSING_KEY.format(tenant_id=tenant_id)
        dlq_key = _DLQ_KEY.format(tenant_id=tenant_id)

        return {
            "pending": await self._redis.client.llen(queue_key),
            "processing": await self._redis.client.llen(processing_key),
            "dead_letter": await self._redis.client.llen(dlq_key),
        }

    async def _persist_triage_result(
        self, tenant_id: str, event_id: str, triage_res: dict
    ) -> None:
        """Write triage result back to ClickHouse event record."""
        try:
            from app.dependencies import get_app_clickhouse
            ch = get_app_clickhouse()
            await ch.update_triage_result(event_id, tenant_id, json.dumps(triage_res))
        except Exception as exc:
            # Non-fatal: the triage result is logged even if persistence fails
            logger.warning(
                "triage_result_persist_failed",
                event_id=event_id,
                error=str(exc),
            )
