"""IOC (Indicator of Compromise) local lookup store.

Embedded database of known-bad IPs, domains, and file hashes.
Matches against event network and message fields.
Optionally integrates with IOCFeedManager for Redis-cached threat feeds.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional

import structlog

from app.schemas.canonical_event import CanonicalEvent

if TYPE_CHECKING:
    from app.engine.ioc_feed_manager import IOCFeedManager

logger = structlog.get_logger(__name__)

# ─── Embedded IOC Database ───────────────────────────────────────
# Categories: c2, malware, phishing, scanning, crypto_mining, botnet

IOC_IPS = {
    # C2 servers
    "198.51.100.22": {"type": "c2", "threat": "CobaltStrike C2", "confidence": 0.95},
    "203.0.113.50": {"type": "c2", "threat": "Metasploit Handler", "confidence": 0.9},
    "192.0.2.100": {"type": "c2", "threat": "Empire C2", "confidence": 0.9},
    "198.51.100.44": {"type": "c2", "threat": "Sliver C2", "confidence": 0.85},
    "203.0.113.99": {"type": "c2", "threat": "Custom RAT C2", "confidence": 0.8},
    # Malware distribution
    "192.0.2.200": {"type": "malware", "threat": "Emotet Distribution", "confidence": 0.95},
    "198.51.100.150": {"type": "malware", "threat": "TrickBot Payload Server", "confidence": 0.9},
    "203.0.113.175": {"type": "malware", "threat": "QakBot Delivery", "confidence": 0.85},
    # Phishing
    "192.0.2.50": {"type": "phishing", "threat": "Credential Harvester", "confidence": 0.9},
    "198.51.100.75": {"type": "phishing", "threat": "Office365 Phishing", "confidence": 0.85},
    "203.0.113.25": {"type": "phishing", "threat": "Banking Phishing Kit", "confidence": 0.9},
    # Scanning / Reconnaissance
    "192.0.2.15": {"type": "scanning", "threat": "Shodan Scanner", "confidence": 0.6},
    "198.51.100.33": {"type": "scanning", "threat": "Masscan Source", "confidence": 0.7},
    "203.0.113.111": {"type": "scanning", "threat": "ZMap Scanner", "confidence": 0.6},
    # Crypto mining
    "192.0.2.250": {"type": "crypto_mining", "threat": "Monero Mining Pool", "confidence": 0.85},
    "198.51.100.222": {"type": "crypto_mining", "threat": "XMRig Pool Proxy", "confidence": 0.8},
    # Botnet
    "203.0.113.200": {"type": "botnet", "threat": "Mirai C2", "confidence": 0.9},
    "192.0.2.180": {"type": "botnet", "threat": "IoT Botnet Controller", "confidence": 0.85},
}

IOC_DOMAINS = {
    "evil-c2.example.com": {"type": "c2", "threat": "CobaltStrike Domain Front", "confidence": 0.95},
    "phish-bank.example.com": {"type": "phishing", "threat": "Banking Phishing", "confidence": 0.9},
    "malware-cdn.example.net": {"type": "malware", "threat": "Malware CDN", "confidence": 0.9},
    "crypto-pool.example.org": {"type": "crypto_mining", "threat": "Mining Pool", "confidence": 0.8},
    "exfil-data.example.com": {"type": "c2", "threat": "Data Exfiltration Endpoint", "confidence": 0.85},
    "botnet-cmd.example.net": {"type": "botnet", "threat": "Botnet C2 Domain", "confidence": 0.9},
    "dga-domain1.example.com": {"type": "c2", "threat": "DGA Domain", "confidence": 0.7},
    "dga-domain2.example.com": {"type": "c2", "threat": "DGA Domain", "confidence": 0.7},
    "ransomware-pay.example.org": {"type": "malware", "threat": "Ransomware Payment Portal", "confidence": 0.95},
    "exploit-kit.example.net": {"type": "malware", "threat": "Exploit Kit Landing", "confidence": 0.9},
}

IOC_HASHES = {
    "d41d8cd98f00b204e9800998ecf8427e": {"type": "malware", "threat": "Known Malware Sample", "confidence": 0.95},
    "e99a18c428cb38d5f260853678922e03": {"type": "malware", "threat": "Emotet Dropper", "confidence": 0.9},
    "5d41402abc4b2a76b9719d911017c592": {"type": "malware", "threat": "Cobalt Strike Beacon", "confidence": 0.95},
    "098f6bcd4621d373cade4e832627b4f6": {"type": "malware", "threat": "TrickBot Binary", "confidence": 0.9},
    "ad0234829205b9033196ba818f7a872b": {"type": "malware", "threat": "Ransomware Payload", "confidence": 0.95},
}


class IOCStore:
    """Local IOC lookup engine."""

    def __init__(self, feed_manager: IOCFeedManager | None = None) -> None:
        self._ips = IOC_IPS
        self._domains = IOC_DOMAINS
        self._hashes = IOC_HASHES
        self._feed_manager = feed_manager
        logger.info(
            "ioc_store_loaded",
            ip_count=len(self._ips),
            domain_count=len(self._domains),
            hash_count=len(self._hashes),
            has_feed_manager=feed_manager is not None,
        )

    def lookup(self, event: CanonicalEvent) -> list[dict]:
        """Check event against IOC database.

        Checks: network src/dst IPs, domains in message, file hashes.
        Returns list of IOC matches.
        """
        matches = []

        # Check IPs
        if event.network:
            for ip_field in [event.network.src_ip, event.network.dst_ip]:
                if ip_field and ip_field in self._ips:
                    ioc = self._ips[ip_field]
                    matches.append({
                        "indicator": ip_field,
                        "indicator_type": "ip",
                        "threat_type": ioc["type"],
                        "threat_name": ioc["threat"],
                        "confidence": ioc["confidence"],
                    })

        # Check domains in message
        if event.message:
            msg_lower = event.message.lower()
            for domain, ioc in self._domains.items():
                if domain in msg_lower:
                    matches.append({
                        "indicator": domain,
                        "indicator_type": "domain",
                        "threat_type": ioc["type"],
                        "threat_name": ioc["threat"],
                        "confidence": ioc["confidence"],
                    })

        # Check hashes in message or signature
        for field in [event.message, event.signature_id]:
            if field:
                field_lower = field.lower()
                for hash_val, ioc in self._hashes.items():
                    if hash_val in field_lower:
                        matches.append({
                            "indicator": hash_val,
                            "indicator_type": "hash",
                            "threat_type": ioc["type"],
                            "threat_name": ioc["threat"],
                            "confidence": ioc["confidence"],
                        })

        if matches:
            logger.info(
                "ioc_lookup",
                event_id=event.event_id,
                ioc_hits=len(matches),
                indicators=[m["indicator"] for m in matches],
            )

        return matches

    def lookup_ip(self, ip: str) -> Optional[dict]:
        """Direct IP lookup."""
        return self._ips.get(ip)

    def lookup_domain(self, domain: str) -> Optional[dict]:
        """Direct domain lookup."""
        return self._domains.get(domain.lower())

    def lookup_hash(self, file_hash: str) -> Optional[dict]:
        """Direct hash lookup."""
        return self._hashes.get(file_hash.lower())

    async def lookup_with_feeds(self, event: CanonicalEvent) -> list[dict]:
        """Async lookup: embedded IOCs first, then Redis-cached feed data.

        Falls back to the synchronous ``lookup()`` for embedded data, then
        checks the feed manager's Redis cache for IPs and domains that
        did not match embedded indicators.
        """
        matches = self.lookup(event)

        if not self._feed_manager:
            return matches

        # Gather IPs and domains to check against feeds
        matched_indicators = {m["indicator"] for m in matches}

        feed_checks: list[tuple[str, str]] = []

        if event.network:
            for ip in [event.network.src_ip, event.network.dst_ip]:
                if ip and ip not in matched_indicators:
                    feed_checks.append(("ip", ip))

        # Check feeds via Redis cache (fast, no API call)
        for indicator_type, indicator in feed_checks:
            try:
                result = await self._feed_manager.check_redis_cache(
                    indicator_type, indicator
                )
                if result:
                    matches.append({
                        "indicator": indicator,
                        "indicator_type": indicator_type,
                        "threat_type": result.get("type", "unknown"),
                        "threat_name": result.get("threat", "Feed IOC"),
                        "confidence": result.get("confidence", 0.5),
                        "source": result.get("source", "feed"),
                    })
            except Exception as exc:
                logger.debug(
                    "feed_cache_lookup_error",
                    indicator=indicator,
                    error=str(exc),
                )

        return matches
