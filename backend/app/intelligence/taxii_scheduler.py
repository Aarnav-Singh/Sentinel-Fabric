"""TAXII feed ingestion scheduler."""
import asyncio
import logging
from typing import List, Dict, Any

import httpx

from app.config import settings
from app.dependencies import get_app_stix

logger = logging.getLogger(__name__)

async def fetch_taxii_feed(feed_url: str) -> None:
    """Fetch STIX bundles from a TAXII 2.1 collection."""
    stix = get_app_stix()
    if not stix:
        logger.warning(f"Skipping TAXII pull from {feed_url}: STIX graph not initialized.")
        return

    headers = {
        "Accept": "application/taxii+json;version=2.1",
        "Authorization": f"Bearer {settings.taxii_token}" if settings.taxii_token else ""
    }

    try:
        # Mocking or actually calling a TAXII server
        async with httpx.AsyncClient() as client:
            # We add a dummy timeout and exception handling since in most real test environments we don't have a TAXII server standing by
            response = await client.get(feed_url, headers=headers, timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                objects = data.get("objects", [])
                logger.info(f"Fetched {len(objects)} STIX objects from TAXII feed {feed_url}")
                
                # Basic parsing to insert into Memgraph STIX Graph
                for obj in objects:
                    obj_type = obj.get("type")
                    obj_id = obj.get("id")
                    if not obj_type or not obj_id:
                        continue
                        
                    # Handle node insertion based on type
                    node_label = obj_type.title().replace("-", "") # indicator -> Indicator
                    properties = {
                        "created": obj.get("created"),
                        "modified": obj.get("modified"),
                        "name": obj.get("name", ""),
                        "description": obj.get("description", "")
                    }
                    
                    # Pattern for Indicators
                    if obj_type == "indicator":
                        properties["pattern"] = obj.get("pattern", "")
                        
                    await stix.upsert_node(node_label, obj_id, properties)

            else:
                logger.warning(f"TAXII feed {feed_url} returned status {response.status_code}")
                
    except httpx.RequestError as e:
        logger.warning(f"Failed to fetch TAXII feed {feed_url}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error fetching TAXII feed {feed_url}: {e}")

async def run_taxii_sync() -> None:
    """Run synchronization for all configured TAXII feeds."""
    logger.info("taxii_sync_started")
    feeds = settings.stix2_taxii_feeds
    if not feeds:
        logger.debug("taxii_sync_skipped", reason="no feeds configured")
        return
        
    tasks = [fetch_taxii_feed(feed) for feed in feeds]
    await asyncio.gather(*tasks)
    logger.info("taxii_sync_completed")
