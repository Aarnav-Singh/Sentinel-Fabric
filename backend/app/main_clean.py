"""Sentinel Fabric V2 — FastAPI Application.

Lifespan hooks initialize all database connections and services.
"""
from __future__ import annotations

import asyncio
import uuid
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.dependencies import init_dependencies, get_app_pipeline
from app.services.sse_broadcaster import SSEBroadcaster
from app.middleware.error_handler import DomainError, domain_error_handler, unhandled_error_handler

from app.api import ingest, health, campaigns, posture, simulation

import structlog

_log_level_map = {"DEBUG": logging.DEBUG, "INFO": logging.INFO, "WARNING": logging.WARNING, "ERROR": logging.ERROR}

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        _log_level_map.get(settings.log_level.upper(), logging.INFO)
    ),
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook for startup and shutdown."""
    logger.info("application_startup_begins", version=settings.version)

    # 1. Initialize core infrastructure dependencies
    from app.repositories.clickhouse import ClickHouseRepository
    from app.repositories.redis_store import RedisStore

    ch = ClickHouseRepository()
    redis = RedisStore()

    # Fast port probe to detect if Docker is actually there
    async def _port_open(host, port):
        try:
            _, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=1)
            writer.close()
            await writer.wait_closed()
            return True
        except:
            return False

    async def _connect_or_fallback(repo, name, host, port):
        if await _port_open(host, port):
            try:
                # Add a timeout to the actual connection attempt
                await asyncio.wait_for(repo.connect(), timeout=3.0)
                logger.info(f"{name}_connected", host=host, port=port)
                return True
            except Exception as e:
                logger.warning(f"{name}_connection_failed", error=str(e))
        else:
            logger.warning(f"{name}_port_closed", host=host, port=port)
        return False

    # Try connecting to Docker infra
    ch_ok = await _connect_or_fallback(ch, "clickhouse", "localhost", 8123)
    redis_ok = await _connect_or_fallback(redis, "redis", "localhost", 6379)

    # 2. Initialize orchestration services
    broadcaster = SSEBroadcaster()
    init_dependencies(ch, redis, broadcaster)

    # 3. Start background consumers (if infra is healthy)
    if ch_ok and redis_ok:
        logger.info("starting_infrastructure_consumers")
        from app.consumers.event_consumer import KafkaEventConsumer
        
        # Check Kafka port (9092) first
        if await _port_open("localhost", 9092):
            try:
                consumer = KafkaEventConsumer(init_dependencies.get_pipeline())
                asyncio.create_task(consumer.start())
                logger.info("kafka_consumer_started")
            except Exception as e:
                logger.error("kafka_consumer_failed", error=str(e))
        else:
            logger.warning("kafka_port_closed_skipping_consumer")
    else:
        logger.warning("using_in_memory_fallbacks_some_features_disabled")

    yield

    # Shutdown
    await redis.close()
    logger.info("application_shutdown_complete")


def create_app() -> FastAPI:
    """FastAPI Application Factory."""
    app = FastAPI(
        title="Sentinel Fabric V2",
        description="Security Posture Intelligence & ML Pipeline",
        version=settings.version,
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Error Handlers
    app.add_exception_handler(DomainError, domain_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    # Register API Routers
    app.include_router(ingest.router, prefix="/api/v1")
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(campaigns.router, prefix="/api/v1")
    app.include_router(posture.router, prefix="/api/v1")
    app.include_router(simulation.router, prefix="/api/v1")

    # Tenant-scoped SSE stream
    @app.get("/api/v1/events/stream")
    async def sse_events(request: Request):
        subscriber_id = str(uuid.uuid4())
        from sse_starlette.sse import EventSourceResponse
        from app.dependencies import get_app_broadcaster
        
        broadcaster = get_app_broadcaster()
        
        return EventSourceResponse(
            broadcaster.event_stream(subscriber_id),
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )

    return app

app = create_app()
