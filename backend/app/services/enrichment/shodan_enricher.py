"""Shodan Exposure Enrichment Layer — Phase 34B.

Enriches security events with public Internet exposure data (open ports, CVEs) from Shodan API.
Uses Redis caching to minimize expensive Shodan API calls.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

CACHE_TTL = 86400  # 24 hours
SHODAN_API_URL = "https://api.shodan.io/shodan/host"


@dataclass
class ShodanContext:
    """Structured Shodan exposure data attached to events."""
    ip: str
    is_exposed: bool
    open_ports: list[int] | None = None
    hostnames: list[str] | None = None
    vulns: list[str] | None = None
    os: str | None = None
    org: str | None = None


class ShodanEnricher:
    """Enriches events with public exposure data from Shodan.

    Checks Redis cache first, then queries Shodan API.
    Only enriches public loopback-excluded IPs attached to events.
    """

    def __init__(self, redis_store: Any) -> None:
        self._redis = redis_store
        self._http = httpx.AsyncClient(timeout=10.0)

    async def enrich(self, event: Any) -> Any:
        """Extract IP and attach Shodan context to the event."""
        if not settings.shodan_api_key:
            return event

        ip_addr = getattr(event, "source_ip", None) or getattr(event, "dest_ip", None)
        if not ip_addr:
            return event

        # Basic private IP filter (crude but fast)
        if ip_addr.startswith(("10.", "192.168.", "127.", "172.16.", "172.17.", "172.18.", "172.19.", "172.2", "172.30.", "172.31.")):
            return event

        ctx = await self._lookup_ip(ip_addr)
        
        if ctx:
            if not hasattr(event, "enrichment") or event.enrichment is None:
                try:
                    event.enrichment = {}
                except (AttributeError, TypeError):
                    pass
            try:
                if isinstance(event.enrichment, dict):
                    event.enrichment["shodan_context"] = {
                        "ip": ctx.ip,
                        "is_exposed": ctx.is_exposed,
                        "open_ports": ctx.open_ports,
                        "hostnames": ctx.hostnames,
                        "vulns": ctx.vulns,
                        "os": ctx.os,
                        "org": ctx.org,
                    }
            except (AttributeError, TypeError) as exc:
                logger.debug("shodan_enrichment_attach_failed", error=str(exc))

        return event

    async def _lookup_ip(self, ip: str) -> ShodanContext | None:
        """Look up a single IP — cache first, then Shodan API."""
        cache_key = f"shodan:{ip}"

        cached = await self._redis.cache_get(cache_key)
        if cached:
            try:
                data = json.loads(cached)
                return ShodanContext(**data)
            except (json.JSONDecodeError, TypeError):
                pass

        try:
            resp = await self._http.get(
                f"{SHODAN_API_URL}/{ip}",
                params={"key": settings.shodan_api_key},
            )

            if resp.status_code == 200:
                data = resp.json()
                ctx = ShodanContext(
                    ip=ip,
                    is_exposed=True,
                    open_ports=data.get("ports", []),
                    hostnames=data.get("hostnames", []),
                    vulns=data.get("vulns", []),
                    os=data.get("os"),
                    org=data.get("org")
                )
                
                cache_data = json.dumps({
                    "ip": ctx.ip,
                    "is_exposed": ctx.is_exposed,
                    "open_ports": ctx.open_ports,
                    "hostnames": ctx.hostnames,
                    "vulns": ctx.vulns,
                    "os": ctx.os,
                    "org": ctx.org,
                })
                await self._redis.cache_set(cache_key, cache_data, ttl=CACHE_TTL)
                return ctx
            elif resp.status_code == 404:
                # IP not found in Shodan - cache negative result
                ctx = ShodanContext(ip=ip, is_exposed=False)
                cache_data = json.dumps({"ip": ip, "is_exposed": False})
                await self._redis.cache_set(cache_key, cache_data, ttl=CACHE_TTL)
                return ctx
            else:
                logger.warning("shodan_api_error", status=resp.status_code, ip=ip)
        except httpx.HTTPError as exc:
            logger.warning("shodan_api_request_failed", error=str(exc))
        except Exception as exc:
            logger.error("shodan_enrichment_error", error=str(exc))

        return None
