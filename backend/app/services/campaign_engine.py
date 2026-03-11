"""Campaign Correlation Engine — attack campaign formation.

Clusters related anomalous events into campaigns using
entity graph adjacency, temporal proximity, and MITRE ATT&CK
kill chain stage progression.
"""
from __future__ import annotations

import uuid
from typing import Optional

from app.schemas.canonical_event import CanonicalEvent
from app.repositories.redis_store import RedisStore

import structlog

logger = structlog.get_logger(__name__)


class CampaignEngine:
    """Stateful campaign correlation coordinator."""

    def __init__(self, redis: RedisStore) -> None:
        self._redis = redis

    async def correlate(self, event: CanonicalEvent) -> Optional[str]:
        """Determine if this event belongs to an existing campaign
        or should seed a new one.

        Returns campaign_id if event was assigned to a campaign.
        """
        if event.ml_scores.meta_score < 0.3:
            return None  # Below campaign threshold

        tenant_id = event.metadata.tenant_id
        entity_id = self._get_primary_entity(event)
        if not entity_id:
            return None

        # Check if entity already belongs to an active campaign
        existing_campaign = await self._find_entity_campaign(tenant_id, entity_id)
        if existing_campaign:
            await self._redis.add_entity_to_campaign(tenant_id, existing_campaign, entity_id)
            logger.info(
                "event_joined_campaign",
                campaign_id=existing_campaign,
                entity_id=entity_id,
            )
            return existing_campaign

        # Check if destination entity is in a campaign (lateral movement)
        dst_id = self._get_dst_entity(event)
        if dst_id:
            dst_campaign = await self._find_entity_campaign(tenant_id, dst_id)
            if dst_campaign:
                await self._redis.add_entity_to_campaign(tenant_id, dst_campaign, entity_id)
                logger.info(
                    "lateral_movement_detected",
                    campaign_id=dst_campaign,
                    src=entity_id,
                    dst=dst_id,
                )
                return dst_campaign

        # Score is high enough: seed a new campaign
        logger.debug("evaluating_new_campaign", score=event.ml_scores.meta_score, threshold=0.6)
        if event.ml_scores.meta_score >= 0.6:
            campaign_id = f"campaign-{uuid.uuid4().hex[:12]}"
            logger.info("seeding_new_campaign", campaign_id=campaign_id, score=event.ml_scores.meta_score)
            await self._redis.add_entity_to_campaign(tenant_id, campaign_id, entity_id)
            # Store campaign metadata
            await self._redis.cache_set(
                f"campaign_meta:{tenant_id}:{campaign_id}",
                str({
                    "created_at": event.timestamp.isoformat(),
                    "seed_event": event.event_id,
                    "severity": event.severity.value,
                    "stage": "initial_access",
                    "meta_score": event.ml_scores.meta_score,
                    "active": True,
                }),
                ttl=86400 * 7,  # 7 days
            )
            logger.info(
                "new_campaign_seeded",
                campaign_id=campaign_id,
                entity_id=entity_id,
                meta_score=event.ml_scores.meta_score,
            )
            return campaign_id
        
        logger.debug("no_campaign_formed", score=event.ml_scores.meta_score)
        return None

    async def _find_entity_campaign(self, tenant_id: str, entity_id: str) -> Optional[str]:
        """Check Redis for entity → campaign membership."""
        state = await self._redis.get_entity_state(tenant_id, entity_id)
        if state and state.get("campaign_id"):
            return state["campaign_id"]
        return None

    def _get_primary_entity(self, event: CanonicalEvent) -> Optional[str]:
        if event.source_entity:
            return event.source_entity.identifier
        return None

    def _get_dst_entity(self, event: CanonicalEvent) -> Optional[str]:
        if event.destination_entity:
            return event.destination_entity.identifier
        return None
