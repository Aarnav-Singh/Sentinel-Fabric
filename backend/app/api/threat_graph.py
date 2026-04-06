from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List
from app.dependencies import get_app_stix
from app.middleware.auth import require_analyst
import logging

router = APIRouter(prefix="/api/v1/threat-graph", tags=["Threat Intel Graph"])
logger = logging.getLogger(__name__)

@router.get("/entity/{entity_id}/context")
async def get_entity_context(
    entity_id: str,
    depth: int = Query(2, ge=1, le=5),
    claims: dict = Depends(require_analyst),
):
    """Get the surrounding context for a STIX2 entity from the graph DB."""
    stix = get_app_stix()
    if not stix:
        raise HTTPException(status_code=503, detail="Memgraph STIX2 layer is temporarily unavailable.")
    
    try:
        context = await stix.get_entity_context(entity_id, depth)
        return context
    except Exception as e:
        logger.error(f"Failed to fetch STIX context for {entity_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error executing graph traversal.")


@router.post("/query")
async def run_custom_query(
    query_str: str,
    claims: dict = Depends(require_analyst),
):
    """Execute generic Cypher against STIX2 Graph (Analyst advanced feature)."""
    stix = get_app_stix()
    if not stix:
        raise HTTPException(status_code=503, detail="Memgraph STIX2 layer is temporarily unavailable.")
    
    try:
        # Simplified arbitrary query
        results = await stix.run_cypher(query=query_str, parameters={})
        return {"results": results}
    except Exception as e:
        logger.error(f"Failed to execute Cypher: {e}")
        raise HTTPException(status_code=400, detail=str(e))
