"""STIX2 Graph Layer powered by Memgraph.

Integration notes
 -----------------
 - Graph DB: Memgraph (Bolt protocol via neo4j async driver)
 - Vector DB: optional Qdrant injection for semantic entity search
   Pass ``qdrant=<QdrantRepository instance>`` to the constructor to
   enable automatic embedding of STIX2 entities on upsert.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Dict, List, Optional

try:
    from neo4j import AsyncGraphDatabase, AsyncDriver
    HAS_NEO4J = True
except ImportError:
    HAS_NEO4J = False
    AsyncGraphDatabase = None  # type: ignore
    AsyncDriver = None  # type: ignore

from app.config import settings

if TYPE_CHECKING:
    from app.repositories.qdrant_store import QdrantRepository

logger = logging.getLogger(__name__)


class STIXGraphRepository:
    """Manages the STIX2 graph data model in Memgraph."""

    def __init__(
        self,
        uri: str,
        user: str = "",
        password: str = "",
        *,
        qdrant: Optional["QdrantRepository"] = None,
    ):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver: Optional[AsyncDriver] = None
        self._qdrant = qdrant   # Optional — enables semantic entity search

    async def connect(self):
        """Connect to Memgraph via Bolt."""
        try:
            self.driver = AsyncGraphDatabase.driver(
                self.uri, 
                auth=(self.user, self.password) if self.user else None
            )
            # Verify connectivity
            async with self.driver.session() as session:
                await session.run("RETURN 1 AS x")
            logger.info("Connected to Memgraph STIX2 Graph")
        except Exception as e:
            logger.error(f"Failed to connect to Memgraph: {e}")
            raise

    async def close(self):
        if self.driver:
            await self.driver.close()
            logger.info("Closed Memgraph connection")

    async def initialize_schema(self):
        """Create constraints/indexes for STIX2 nodes."""
        if not self.driver:
            return

        async with self.driver.session() as session:
            # Upsert unique constraint on STIX ID for core node types
            node_types = ["Indicator", "Malware", "AttackPattern", "ThreatActor", "Campaign", "Vulnerability"]
            for nt in node_types:
                try:
                    await session.run(f"CREATE INDEX ON :{nt}(id)")
                except Exception as e:
                    # Index might already exist
                    logger.debug(f"Index creation skipped for {nt}: {e}")

    async def upsert_node(self, label: str, node_id: str, properties: Dict[str, Any]) -> None:
        """Upsert a STIX2 entity as a graph node.

        If a QdrantRepository was injected at construction time, the entity
        name / description is also embedded into the ``stix_entities`` Qdrant
        collection to enable semantic similarity search across threat actors,
        campaigns, malware families, etc.
        """
        if not self.driver:
            return

        prop_str = ", ".join([f"n.{k} = ${k}" for k in properties.keys()])
        query = f"""
            MERGE (n:{label} {{id: $id}})
            SET {prop_str}
            RETURN n
        """
        params = {"id": node_id, **properties}

        async with self.driver.session() as session:
            await session.run(query, parameters=params)

        # ── Qdrant semantic embedding (optional) ──────────────────────────
        if self._qdrant:
            try:
                # Build a text blob from the most descriptive fields
                text_parts = [label, node_id]
                for key in ("name", "description", "aliases", "labels"):
                    val = properties.get(key)
                    if val:
                        text_parts.append(str(val) if not isinstance(val, list) else " ".join(val))
                embed_text = " | ".join(filter(None, text_parts))

                await self._qdrant.upsert_text(
                    collection="stix_entities",
                    doc_id=node_id,
                    text=embed_text,
                    payload={"label": label, "node_id": node_id, **{k: str(v) for k, v in properties.items() if isinstance(v, (str, int, float, bool))}},
                )
            except Exception as _emb_err:
                logger.warning("stix_qdrant_embed_failed", node_id=node_id, error=str(_emb_err))

    async def connect_nodes(self, from_id: str, to_id: str, relationship_type: str, properties: Dict[str, Any] = None) -> None:
        """Create a relationship between two STIX2 nodes."""
        if not self.driver:
            return

        properties = properties or {}
        prop_str = ", ".join([f"r.{k} = ${k}" for k in properties.keys()])
        set_clause = f"SET {prop_str}" if properties else ""

        query = f"""
            MATCH (a {{id: $from_id}})
            MATCH (b {{id: $to_id}})
            MERGE (a)-[r:{relationship_type}]->(b)
            {set_clause}
            RETURN r
        """
        params = {"from_id": from_id, "to_id": to_id, **properties}
        
        async with self.driver.session() as session:
            await session.run(query, parameters=params)

    async def get_entity_context(self, entity_id: str, depth: int = 2) -> Dict[str, Any]:
        """Fetch surrounding STIX2 graph context for an entity."""
        if not self.driver:
            return {"nodes": [], "edges": []}

        # Query to get all paths up to `depth` distance
        query = """
            MATCH p=(n {id: $id})-[*1..""" + str(depth) + """]-(m)
            RETURN nodes(p) AS nodes, relationships(p) AS rels
        """
        nodes_dict = {}
        edges_list = []
        
        async with self.driver.session() as session:
            result = await session.run(query, parameters={"id": entity_id})
            async for record in result:
                for node in record["nodes"]:
                    nodes_dict[node["id"]] = dict(node)
                for rel in record["rels"]:
                    # neo4j 5.x async driver exposes start_node / end_node on
                    # Relationship objects — NOT rel.nodes[0] / rel.nodes[1]
                    edges_list.append({
                        "source": rel.start_node["id"],
                        "target": rel.end_node["id"],
                        "type": rel.type,
                        "properties": dict(rel)
                    })

        # Deduplicate edges
        unique_edges = [dict(t) for t in {tuple(d.items()) for d in edges_list}]
        
        return {
            "nodes": list(nodes_dict.values()),
            "edges": unique_edges
        }

    async def run_cypher(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Run arbitrary Cypher query in the STIX graph."""
        if not self.driver:
            return []
            
        async with self.driver.session() as session:
            result = await session.run(query, parameters=parameters or {})
            return [dict(record) async for record in result]
