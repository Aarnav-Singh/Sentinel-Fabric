"""Qdrant Vector Search — Behavioral DNA Similarity.

Three collection types:
  1. behavioral_dna — entity behavioral fingerprint similarity
  2. ioc_enrichment — IOC semantic similarity for enrichment
  3. campaign_narrative — attack narrative similarity for analysts
"""
from __future__ import annotations

from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

from app.config import settings

import structlog

logger = structlog.get_logger(__name__)

COLLECTIONS = {
    "behavioral_dna": {"size": 128, "distance": Distance.COSINE},
    "ioc_enrichment": {"size": 384, "distance": Distance.COSINE},
    "campaign_narrative": {"size": 384, "distance": Distance.COSINE},
}


class QdrantRepository:
    """Vector similarity search for behavioral analysis."""

    def __init__(self) -> None:
        self._client: Optional[QdrantClient] = None

    async def connect(self) -> None:
        try:
            self._client = QdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port,
            )
            for name, config in COLLECTIONS.items():
                if not self._client.collection_exists(name):
                    self._client.create_collection(
                        collection_name=name,
                        vectors_config=VectorParams(
                            size=config["size"],
                            distance=config["distance"],
                        ),
                    )
                    logger.info("qdrant_collection_created", name=name)
            logger.info("qdrant_connected")
        except Exception as exc:
            logger.warning("qdrant_connection_failed", error=str(exc))

    async def close(self) -> None:
        if self._client:
            self._client.close()

    @property
    def client(self) -> QdrantClient:
        if not self._client:
            raise RuntimeError("Qdrant not initialized")
        return self._client

    # ── Behavioral DNA ───────────────────────────────────

    async def upsert_behavioral_dna(
        self,
        entity_id: str,
        vector: list[float],
        metadata: dict,
    ) -> None:
        self.client.upsert(
            collection_name="behavioral_dna",
            points=[PointStruct(
                id=hash(entity_id) & 0xFFFFFFFF,
                vector=vector,
                payload={"entity_id": entity_id, **metadata},
            )],
        )

    async def search_similar_entities(
        self,
        vector: list[float],
        limit: int = 10,
        score_threshold: float = 0.85,
        tenant_id: str | None = None,
    ) -> list[dict]:
        query_filter = None
        if tenant_id:
            query_filter = Filter(must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))])
            
        results = self.client.search(
            collection_name="behavioral_dna",
            query_vector=vector,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=query_filter,
        )
        return [
            {"entity_id": r.payload.get("entity_id"), "score": r.score, **(r.payload or {})}
            for r in results
        ]

    # ── IOC Enrichment ───────────────────────────────────

    async def upsert_ioc(
        self,
        ioc_id: str,
        vector: list[float],
        metadata: dict,
    ) -> None:
        self.client.upsert(
            collection_name="ioc_enrichment",
            points=[PointStruct(
                id=hash(ioc_id) & 0xFFFFFFFF,
                vector=vector,
                payload={"ioc_id": ioc_id, **metadata},
            )],
        )

    async def search_similar_iocs(
        self,
        vector: list[float],
        limit: int = 5,
        tenant_id: str | None = None,
    ) -> list[dict]:
        query_filter = None
        if tenant_id:
            query_filter = Filter(must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))])
            
        results = self.client.search(
            collection_name="ioc_enrichment",
            query_vector=vector,
            limit=limit,
            query_filter=query_filter,
        )
        return [
            {"ioc_id": r.payload.get("ioc_id"), "score": r.score, **(r.payload or {})}
            for r in results
        ]

    # ── Campaign Narrative ───────────────────────────────

    async def upsert_campaign(
        self,
        campaign_id: str,
        vector: list[float],
        metadata: dict,
    ) -> None:
        self.client.upsert(
            collection_name="campaign_narrative",
            points=[PointStruct(
                id=hash(campaign_id) & 0xFFFFFFFF,
                vector=vector,
                payload={"campaign_id": campaign_id, **metadata},
            )],
        )

    async def search_similar_campaigns(
        self,
        vector: list[float],
        limit: int = 5,
        tenant_id: str | None = None,
    ) -> list[dict]:
        query_filter = None
        if tenant_id:
            query_filter = Filter(must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))])
            
        results = self.client.search(
            collection_name="campaign_narrative",
            query_vector=vector,
            limit=limit,
            query_filter=query_filter,
        )
        return [
            {"campaign_id": r.payload.get("campaign_id"), "score": r.score, **(r.payload or {})}
            for r in results
        ]
