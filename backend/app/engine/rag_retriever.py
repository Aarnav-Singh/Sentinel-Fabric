"""RAG Retrieval Engine for Incident Context."""
from app.repositories.clickhouse import ClickHouseRepository
from app.repositories.postgres import PostgresRepository

class RagRetriever:
    def __init__(self, ch_repo: ClickHouseRepository, pg_repo: PostgresRepository):
        self.ch_repo = ch_repo
        self.pg_repo = pg_repo

    async def get_historical_context(self, tenant_id: str, query: str, limit: int = 5) -> list[dict]:
        """Fetch historically similar events via Native RAG (ClickHouse)."""
        return await self.ch_repo.search_similar_events(tenant_id, query, limit)

    async def get_graph_context(self, tenant_id: str, start_entity: str, max_depth: int = 3) -> list[dict]:
        """Fetch correlation graph via Graph RAG (PostgreSQL)."""
        return await self.pg_repo.get_entity_paths(tenant_id, start_entity, max_depth)
        
    async def get_analyst_notes_context(self, tenant_id: str, query: str, limit: int = 3) -> list[dict]:
        """Fetch historical analyst verdicts and notes related to the query."""
        return await self.pg_repo.search_verdicts_by_note(tenant_id, query, limit)
