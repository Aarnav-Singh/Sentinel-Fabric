"""Kafka Consumer Worker for UMBRIX Pipeline.

This process decouples API ingestion from ML processing.
The API Gateway drops raw events onto a Kafka topic.
This worker consumes the topic, creates batches, and
feeds them into the PipelineService for processing.
"""
import asyncio
import json
import logging
from uuid import uuid4

from app.config import settings
from app.dependencies import (
    get_app_clickhouse,
    get_app_redis,
    get_app_qdrant,
    get_app_postgres,
    get_app_broadcaster,
    init_dependencies,
    get_app_pipeline,
)

from app.repositories.clickhouse import ClickHouseRepository
from app.repositories.redis_store import RedisStore
from app.repositories.postgres import PostgresRepository
from app.repositories.qdrant_store import QdrantRepository
from app.services.sse_broadcaster import broadcaster

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

async def main():
    logger.info("Starting UMBRIX Kafka Worker...")
    
    # Initialize dependencies
    ch = ClickHouseRepository()
    redis = RedisStore()
    postgres = PostgresRepository()
    qdrant = QdrantRepository()
    
    init_dependencies(ch, redis, postgres, qdrant, broadcaster)
    pipeline = get_app_pipeline()
    
    try:
        from aiokafka import AIOKafkaConsumer
    except ImportError:
        logger.warning("aiokafka not installed. Running in mock polling mode...")
        await mock_polling(pipeline)
        return

    # To run this, KAFKA_BOOTSTRAP_SERVERS must be defined in settings
    kafka_servers = getattr(settings, 'kafka_bootstrap_servers', 'localhost:9092')
    
    consumer = AIOKafkaConsumer(
        'raw_events_topic',
        bootstrap_servers=kafka_servers,
        group_id="sentinel_pipeline_group",
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    
    await consumer.start()
    try:
        logger.info("Kafka consumer started. Listening for events...")
        async for msg in consumer:
            event_data = msg.value
            logger.info(f"Consumed event {event_data.get('event_id', 'unknown')} from Kafka.")
            
            from app.schemas.canonical_event import CanonicalEvent
            from datetime import datetime
            
            try:
                ce = CanonicalEvent(
                    event_id=event_data.get("event_id", str(uuid4())),
                    tenant_id=event_data.get("tenant_id", "default"),
                    timestamp=datetime.fromisoformat(event_data.get("timestamp", datetime.utcnow().isoformat())),
                    source_type=event_data.get("source_type", "unknown"),
                    raw_data=event_data.get("raw_data", "{}")
                )
                
                # Execute pipeline step
                await pipeline.run(ce)
                
            except Exception as e:
                logger.error(f"Failed to process event: {e}")
                
    finally:
        await consumer.stop()

async def mock_polling(pipeline):
    """Fallback if Kafka is not available. Generates synthetic events."""
    from app.schemas.canonical_event import CanonicalEvent
    from datetime import datetime
    
    while True:
        await asyncio.sleep(5)
        logger.info("Mock Poll: Generated synthetic event from worker.")
        ce = CanonicalEvent(
            event_id=str(uuid4()),
            tenant_id="enterprise_a",
            timestamp=datetime.utcnow(),
            source_type="syslog",
            raw_data='{"msg": "Mock worker event"}'
        )
        try:
            await pipeline.run(ce)
        except Exception as e:
            logger.error(f"Pipeline error (mock): {e}")

if __name__ == "__main__":
    asyncio.run(main())
