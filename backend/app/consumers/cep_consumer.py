"""CEP Consumer — Phase 1.

Subscribes to the ``sentinel.sequences`` Kafka topic where the Redis CEP engine
publishes SequenceAlert payloads.  Each alert is converted into a synthetic
CanonicalEvent and passed through the standard ``PipelineService.process()``
so it gets ML-scored, narrative-generated, Qdrant-similar-matched, and
broadcast via SSE — just like any other high-confidence event.

The CEP engine itself (``RedisCEPEngine``) is integrated directly into
``PipelineService.process()`` so it sees every event in real-time.
This consumer handles the *output* side: turning fired sequence alerts
into first-class incidents.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def _sequence_alert_to_event_dict(alert: dict[str, Any]) -> dict[str, Any]:
    """Convert a SequenceAlert payload into a synthetic CanonicalEvent dict.

    The synthetic event carries a boosted ml_score so sequence alerts always
    surface above individual-event detections.
    """
    severity = "critical" if alert.get("severity") == "CRITICAL" else "high"

    return {
        "event_id": str(uuid.uuid4()),
        "source_type": "cep_sequence",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": severity,
        "message": (
            f"[CEP SEQUENCE] {alert.get('pattern_name', 'Unknown Pattern')} — "
            f"{alert.get('description', '')} "
            f"(span: {alert.get('span_seconds', 0):.0f}s, "
            f"entity: {alert.get('entity_key', 'unknown')})"
        ),
        "metadata": {
            "tenant_id": alert.get("tenant_id", "default"),
            "cep_pattern_id": alert.get("pattern_id"),
            "cep_stage_count": alert.get("stage_count"),
            "triggering_event_id": alert.get("triggering_event_id"),
        },
        "network": {
            "src_ip": alert.get("source_ip"),
        } if alert.get("source_ip") else None,
        # Pre-set a high meta_score so the decision engine flags this immediately
        "ml_scores": {
            "ensemble_score": 0.92,
            "meta_score": 0.95,
            "mitre_predictions": [
                {
                    "tactic": alert.get("mitre_tactic", ""),
                    "technique_id": "",
                    "confidence": 0.95,
                }
            ],
        },
    }


class CEPConsumer:
    """Kafka consumer for CEP sequence alerts.

    Reads from ``sentinel.sequences`` and injects synthetic CanonicalEvents
    into the pipeline for full processing (scoring, narrative, SSE broadcast).
    """

    def __init__(self, pipeline: Any, kafka_bootstrap: str = "localhost:9092") -> None:
        self._pipeline = pipeline
        self._kafka_bootstrap = kafka_bootstrap
        self._running = False
        self._consumer: Any = None

    async def start(self) -> None:
        try:
            from aiokafka import AIOKafkaConsumer
            self._consumer = AIOKafkaConsumer(
                "sentinel.sequences",
                bootstrap_servers=self._kafka_bootstrap,
                group_id="cep-alert-processor",
                auto_offset_reset="latest",
                enable_auto_commit=True,
                value_deserializer=lambda v: v.decode("utf-8"),
            )
            await self._consumer.start()
            self._running = True
            logger.info("cep_consumer_started", topic="sentinel.sequences")
        except Exception as exc:
            logger.warning("cep_consumer_start_failed", error=str(exc))

    async def stop(self) -> None:
        self._running = False
        if self._consumer:
            await self._consumer.stop()
        logger.info("cep_consumer_stopped")

    async def run(self) -> None:
        """Main consumer loop — process sequence alert messages."""
        if not self._consumer:
            logger.warning("cep_consumer_not_started")
            return

        from app.schemas.canonical_event import CanonicalEvent

        async for message in self._consumer:
            if not self._running:
                break
            try:
                alert = json.loads(message.value)
                event_dict = _sequence_alert_to_event_dict(alert)
                # Build a CanonicalEvent from the dict — use model_validate for Pydantic v2
                event = CanonicalEvent.model_validate(event_dict)
                await self._pipeline.process(event)
                logger.info(
                    "cep_alert_processed",
                    pattern_id=alert.get("pattern_id"),
                    entity=alert.get("entity_key"),
                )
            except Exception as exc:
                logger.exception("cep_alert_processing_failed", error=str(exc))
