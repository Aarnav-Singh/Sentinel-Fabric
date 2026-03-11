"""Narrative generation engine.

Template-based human-readable event descriptions from ML scores,
Sigma matches, IOC hits, and event context.

Includes both a deterministic ``NarrativeEngine`` (template-based) and
an ``LLMNarrativeEngine`` (Claude primary, OpenAI fallback, template offline
fallback) for richer analyst-facing summaries.
"""
from __future__ import annotations

import asyncio
from typing import Any

import structlog

from app.schemas.canonical_event import CanonicalEvent

logger = structlog.get_logger(__name__)

# ─── Narrative Templates ─────────────────────────────────────────

SEVERITY_DESCRIPTIONS = {
    "critical": "CRITICAL THREAT",
    "high": "High-severity threat",
    "medium": "Moderate suspicious activity",
    "low": "Low-priority anomaly",
    "info": "Informational event",
}

ATTACK_NARRATIVES = {
    "dos": "Denial of Service attack pattern detected — high volume traffic from {src} targeting {dst}.",
    "ddos": "Distributed Denial of Service indicators — coordinated flood traffic targeting {dst}.",
    "brute_force": "Brute force credential attack from {src} — repeated authentication failures against {dst}.",
    "web_attack": "Web application attack from {src} against {dst}:{port} — possible injection or exploitation attempt.",
    "infiltration": "Network infiltration pattern — {src} exhibiting lateral movement behaviors toward {dst}.",
    "botnet": "Botnet communication indicators — {src} showing automated C2 callback patterns.",
    "port_scan": "Network reconnaissance — {src} scanning ports on {dst}, service enumeration detected.",
    "sql_injection": "SQL injection attempt from {src} against {dst}:{port} — malicious query patterns in payload.",
    "fuzzers": "Fuzzing activity from {src} — automated input testing detected against {dst}.",
    "backdoors": "Backdoor indicators — persistent unauthorized access channel detected between {src} and {dst}.",
    "exploits": "Exploitation attempt from {src} targeting {dst} — known vulnerability exploitation pattern.",
    "reconnaissance": "Active reconnaissance — {src} performing network discovery and enumeration.",
    "benign": "Normal network activity from {src} to {dst} — no threat indicators detected.",
}


class NarrativeEngine:
    """Template-based narrative generation for events."""

    def __init__(self) -> None:
        logger.info("narrative_engine_initialized")

    def generate(
        self,
        event: CanonicalEvent,
        sigma_matches: list[dict] | None = None,
        ioc_matches: list[dict] | None = None,
        rag_context: dict | None = None,
    ) -> str:
        """Generate a human-readable narrative for the event.

        Combines ML scores, Sigma matches, IOC hits, and event context.
        """
        parts = []

        # Header based on severity
        severity = event.severity.value if event.severity else "info"
        severity_desc = SEVERITY_DESCRIPTIONS.get(severity, "Event")

        # Source/destination context
        src = self._get_entity_label(event, "source")
        dst = self._get_entity_label(event, "destination")
        port = ""
        if event.network and event.network.dst_port:
            port = str(event.network.dst_port)

        # ML-based narrative
        label = event.ml_scores.ensemble_label or "benign"
        meta_score = event.ml_scores.meta_score

        if meta_score >= 0.8:
            parts.append(f"🔴 {severity_desc}: ")
        elif meta_score >= 0.5:
            parts.append(f"🟡 {severity_desc}: ")
        elif meta_score >= 0.3:
            parts.append(f"🟢 {severity_desc}: ")
        else:
            parts.append(f"ℹ️ {severity_desc}: ")

        # Attack-specific narrative
        template = ATTACK_NARRATIVES.get(label, ATTACK_NARRATIVES["benign"])
        parts.append(template.format(src=src, dst=dst, port=port))

        # ML confidence
        parts.append(f" [Confidence: {meta_score:.0%}]")

        # Sigma rule matches
        if sigma_matches:
            rule_names = [m["rule_name"] for m in sigma_matches[:3]]
            parts.append(f" | Sigma: {', '.join(rule_names)}")

            # MITRE references
            mitre_refs = set()
            for m in sigma_matches:
                mitre_refs.add(f"{m['mitre_technique_id']} ({m['mitre_tactic']})")
            if mitre_refs:
                parts.append(f" | MITRE: {', '.join(sorted(mitre_refs)[:3])}")

        # IOC matches
        if ioc_matches:
            ioc_names = [m["threat_name"] for m in ioc_matches[:2]]
            parts.append(f" | IOC Hit: {', '.join(ioc_names)}")

        # Network context
        if event.network:
            net = event.network
            if net.bytes_out > 100000:
                parts.append(f" | {net.bytes_out:,} bytes outbound (potential exfil)")

        narrative = "".join(parts)

        logger.info(
            "narrative_generated",
            event_id=event.event_id,
            narrative_length=len(narrative),
        )

        return narrative

    def _get_entity_label(self, event: CanonicalEvent, role: str) -> str:
        """Get a human-readable label for the source or destination entity."""
        entity = event.source_entity if role == "source" else event.destination_entity

        if entity:
            if entity.hostname:
                return f"{entity.hostname} ({entity.identifier})"
            return entity.identifier

        # Fallback to network IPs
        if event.network:
            if role == "source" and event.network.src_ip:
                return event.network.src_ip
            elif role == "destination" and event.network.dst_ip:
                return event.network.dst_ip

        return "unknown"


# ─── LLM-Powered Narrative Engine ────────────────────────────────


class LLMNarrativeEngine:
    """LLM-powered narrative generation with llama.cpp primary, Claude/OpenAI fallback, template offline fallback."""

    def __init__(
        self,
        anthropic_key: str = "",
        openai_key: str = "",
        llama_cpp_model: str = "",
        llama_cpp_base_url: str = "http://localhost:8080/v1",
        llama_cpp_temperature: float = 0.2,
        llama_cpp_max_tokens: int = 200,
        redis_client: Any | None = None,
    ) -> None:
        self._anthropic_key = anthropic_key
        self._openai_key = openai_key
        self._llama_cpp_model = llama_cpp_model
        self._llama_cpp_base_url = llama_cpp_base_url
        self._llama_cpp_temperature = llama_cpp_temperature
        self._llama_cpp_max_tokens = llama_cpp_max_tokens
        self._redis = redis_client
        self._template_fallback = NarrativeEngine()
        self._anthropic_client: Any | None = None
        self._openai_client: Any | None = None
        self._llama_cpp_client: Any | None = None

        if anthropic_key:
            try:
                import anthropic  # type: ignore[import-untyped]

                self._anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
            except ImportError:
                logger.warning("anthropic_sdk_not_installed")

        if openai_key:
            try:
                import openai  # type: ignore[import-untyped]

                self._openai_client = openai.OpenAI(api_key=openai_key)
            except ImportError:
                logger.warning("openai_sdk_not_installed")

        if llama_cpp_model:
            try:
                import openai  # type: ignore[import-untyped]

                # llama.cpp exposes an OpenAI-compatible API
                self._llama_cpp_client = openai.OpenAI(
                    api_key="llama.cpp",  # API key is required by SDK but ignored by server
                    base_url=llama_cpp_base_url,
                )
            except ImportError:
                logger.warning("openai_sdk_not_installed_for_llama_cpp")

        logger.info(
            "llm_narrative_engine_initialized",
            has_llama_cpp=bool(self._llama_cpp_client),
            has_claude=bool(self._anthropic_client),
            has_openai=bool(self._openai_client),
        )

    async def generate(
        self,
        event: CanonicalEvent,
        sigma_matches: list[dict] | None = None,
        ioc_matches: list[dict] | None = None,
        rag_context: dict | None = None,
    ) -> str:
        """Generate a narrative using LLM with multi-tier fallback.

        Priority: Redis cache -> llama.cpp -> Claude -> OpenAI -> template engine.
        """
        # Check Redis cache first
        if self._redis:
            try:
                cached = await self._redis.get(f"narrative:{event.event_id}")
                if cached:
                    return cached if isinstance(cached, str) else cached.decode()
            except Exception:
                pass

        # Build prompt
        prompt = self._build_prompt(event, sigma_matches, ioc_matches, rag_context)

        # Try Dedicated Security LLM (llama.cpp) first
        if self._llama_cpp_client:
            try:
                narrative = await asyncio.to_thread(self._call_llama_cpp, prompt)
                if narrative:
                    await self._cache_narrative(event.event_id, narrative)
                    return narrative
            except Exception as exc:
                logger.warning("llama_cpp_narrative_failed", error=str(exc))

        # Try Claude next
        if self._anthropic_client:
            try:
                narrative = await asyncio.to_thread(self._call_claude, prompt)
                if narrative:
                    await self._cache_narrative(event.event_id, narrative)
                    return narrative
            except Exception as exc:
                logger.warning("claude_narrative_failed", error=str(exc))

        # Try OpenAI fallback
        if self._openai_client:
            try:
                narrative = await asyncio.to_thread(self._call_openai, prompt)
                if narrative:
                    await self._cache_narrative(event.event_id, narrative)
                    return narrative
            except Exception as exc:
                logger.warning("openai_narrative_failed", error=str(exc))

        # Template fallback (always available, fully offline)
        return self._template_fallback.generate(event, sigma_matches, ioc_matches, rag_context)

    def _build_prompt(
        self,
        event: CanonicalEvent,
        sigma_matches: list[dict] | None,
        ioc_matches: list[dict] | None,
        rag_context: dict | None = None,
    ) -> str:
        """Build a concise LLM prompt from event context and optional RAG data."""
        src_ip = event.network.src_ip if event.network else "unknown"
        dst_ip = event.network.dst_ip if event.network else "unknown"
        dst_port = event.network.dst_port if event.network else "unknown"
        sigma_str = (
            ", ".join(m["rule_name"] for m in (sigma_matches or [])[:3]) or "none"
        )
        ioc_str = (
            ", ".join(m["threat_name"] for m in (ioc_matches or [])[:3]) or "none"
        )

        rag_str = ""
        if rag_context:
            hist_ev = len(rag_context.get("historical_events", []))
            graph_paths = len(rag_context.get("graph_paths", []))
            notes = len(rag_context.get("analyst_notes", []))
            if hist_ev or graph_paths or notes:
                rag_str = f"Context: Found {hist_ev} similar past events, {graph_paths} graph correlation paths, and {notes} related analyst notes.\n"

        return (
            "You are a Tier-3 SOC AI Analyst. Your job is to output a strictly clinical, actionable "
            "security narrative based on the provided telemetry. Do NOT be conversational. "
            "Do NOT include preambles like 'Here is the summary'.\n\n"
            "Format your response EXACTLY like this:\n"
            "[SEVERITY] - [Primary Event Classification]\n"
            "- Source: [Entity/IP]\n"
            "- Target: [Entity/IP]\n"
            "- Assessment: [1-sentence clinical determination using ML score and Context if available.]\n\n"
            "---\n"
            f"Event Type: {event.source_type}\n"
            f"Source: {src_ip}\n"
            f"Destination: {dst_ip}:{dst_port}\n"
            f"ML Score: {event.ml_scores.meta_score:.2f} "
            f"({event.ml_scores.ensemble_label or 'unknown'})\n"
            f"Sigma Rules: {sigma_str}\n"
            f"IOC Hits: {ioc_str}\n"
            f"Severity mapping: {event.severity.value if event.severity else 'unknown'}\n"
            f"{rag_str}\n"
            "Generate narrative now:"
        )

    def _call_llama_cpp(self, prompt: str) -> str | None:
        """Synchronous llama.cpp API call (run via asyncio.to_thread)."""
        response = self._llama_cpp_client.chat.completions.create(
            model=self._llama_cpp_model,
            temperature=self._llama_cpp_temperature,
            max_tokens=self._llama_cpp_max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return (
            response.choices[0].message.content.strip() if response.choices else None
        )

    def _call_claude(self, prompt: str) -> str | None:
        """Synchronous Claude API call (run via asyncio.to_thread)."""
        response = self._anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip() if response.content else None

    def _call_openai(self, prompt: str) -> str | None:
        """Synchronous OpenAI API call (run via asyncio.to_thread)."""
        response = self._openai_client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return (
            response.choices[0].message.content.strip() if response.choices else None
        )

    async def _cache_narrative(self, event_id: str, narrative: str) -> None:
        """Cache the generated narrative in Redis with a 1-hour TTL."""
        if self._redis:
            try:
                await self._redis.set(
                    f"narrative:{event_id}", narrative, ex=3600
                )
            except Exception:
                pass
