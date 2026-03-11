"""External Threat Intelligence Integrations (MISP / TAXII)."""
import asyncio
import structlog
import httpx
from datetime import datetime
from app.dependencies import get_app_redis, get_app_postgres

logger = structlog.get_logger(__name__)

class ThreatIntelFetcher:
    """Asynchronously fetches IOCs from external MISP/TAXII feeds."""
    
    def __init__(self, redis_client, pg_client):
        self.redis = redis_client
        self.pg = pg_client
        self.http_client = httpx.AsyncClient(timeout=10.0)
        
    async def fetch_misp_feed(self, url: str, api_key: str):
        """Fetch latest indicators from a MISP instance."""
        headers = {
            "Authorization": api_key,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        # Example MISP REST search payload for recent IOCs
        payload = {
            "returnFormat": "json",
            "type": ["ip-dst", "ip-src", "domain", "md5", "sha256"],
            "last": "1d",
            "enforceWarninglist": True
        }
        
        try:
            # Circuit breaker/timeout handled by httpx timeout config
            response = await self.http_client.post(f"{url}/attributes/restSearch", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            attributes = data.get("response", {}).get("Attribute", [])
            logger.info("misp_feed_fetched", count=len(attributes), source=url)
            
            # Cache hot IOCs in Redis for the pipeline to use
            for attr in attributes:
                ioc_value = attr.get("value")
                ioc_type = attr.get("type")
                
                # Store in Redis: key="ioc:misp:{type}:{value}", value="tags/context"
                cache_key = f"ioc:misp:{ioc_type}:{ioc_value}"
                await self.redis.cache_set(cache_key, str({"source": url, "timestamp": datetime.utcnow().isoformat()}), ttl=86400 * 7)
                
            return len(attributes)
                
        except httpx.HTTPError as exc:
            logger.error("misp_fetch_failed", error=str(exc), url=url)
            return 0
            
    async def fetch_taxii_collection(self, url: str, collection_id: str, token: str):
        """Fetch STIX bundles from a TAXII 2.1 Server."""
        headers = {
            "Accept": "application/taxii+json;version=2.1",
            "Authorization": f"Bearer {token}"
        }
        
        try:
            # TAXII Get Objects
            response = await self.http_client.get(f"{url}/collections/{collection_id}/objects", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            objects = data.get("objects", [])
            indicators = [obj for obj in objects if obj.get("type") == "indicator"]
            
            logger.info("taxii_feed_fetched", count=len(indicators), source=url)
            
            for ind in indicators:
                # Naive pattern parsing for example purposes (e.g. [ipv4-addr:value = '1.1.1.1'])
                pattern = ind.get("pattern", "")
                
                cache_key = f"ioc:taxii:{collection_id}:{ind.get('id')}"
                await self.redis.cache_set(cache_key, pattern, ttl=86400 * 7)
                
            return len(indicators)
            
        except httpx.HTTPError as exc:
            logger.error("taxii_fetch_failed", error=str(exc), url=url)
            return 0

    async def run_all_feeds(self):
        """Execute all configured feeds concurrently."""
        logger.info("intel_sync_started")
        
        # Note: In a real system, URLs and keys would come from Postgres or environment configs
        misp_url = "https://misp.example.internal"
        misp_key = "dummy-key"
        
        taxii_url = "https://taxii.example.internal/api1"
        taxii_col = "91a7b528-80eb-42ed-a74d-c6fbd5a26116"
        taxii_key = "dummy-token"
        
        # Run fetches in parallel
        await asyncio.gather(
            self.fetch_misp_feed(misp_url, misp_key),
            self.fetch_taxii_collection(taxii_url, taxii_col, taxii_key),
            return_exceptions=True
        )
        
        logger.info("intel_sync_completed")

async def scheduled_intel_sync():
    """APScheduler Job to invoke the ThreatIntelFetcher."""
    redis = get_app_redis()
    pg = get_app_postgres()
    
    fetcher = ThreatIntelFetcher(redis, pg)
    await fetcher.run_all_feeds()
