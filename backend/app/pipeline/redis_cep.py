"""Redis-based Complex Event Processing (CEP) Engine — Phase 1.

Pure-Python stateful sequence detection using Redis sorted sets as sliding
windows.  Zero new infrastructure — Redis is already in the stack.

Architecture
------------
Each incoming ``CanonicalEvent`` is checked against a set of CEP patterns.
A pattern is a sequence of *stages*, where each stage matches one event.
Stage matching uses ``stage.matches(event)`` predicate.

State is stored in Redis sorted sets keyed by pattern + entity::

    cep:{pattern_id}:{entity_key}  => sorted set of (stage_index, timestamp)

When all stages of a pattern have been observed within ``max_span_seconds``
for the same entity, the pattern *fires* and a ``SequenceAlert`` is emitted.

Patterns are designed around top-5 MITRE ATT&CK lateral movement kill chains.
The CEP consumer (``cep_consumer.py``) calls ``check_event()`` and publishes
any emitted sequence alerts to the ``sentinel.sequences`` Kafka topic for
downstream ML scoring and LangGraph narrative generation.
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

import structlog

from app.schemas.canonical_event import CanonicalEvent

logger = structlog.get_logger(__name__)

# ── Type aliases ─────────────────────────────────────────────────────────────

StagePredicate = Callable[[CanonicalEvent], bool]


# ── Pattern definition ───────────────────────────────────────────────────────

@dataclass
class PatternStage:
    """A single stage in a CEP pattern."""
    name: str
    tactic: str | None = None
    technique_prefix: str | None = None  # e.g. "T1046" matches T1046.*
    min_ml_score: float = 0.0
    custom_predicate: StagePredicate | None = None

    def matches(self, event: CanonicalEvent) -> bool:
        """Return True if the event satisfies this stage's criteria."""
        ms = event.ml_scores
        if ms is None:
            return False

        # ML score gate
        if ms.meta_score < self.min_ml_score:
            return False

        # Tactic matching from MITRE predictions
        if self.tactic:
            mitre_preds = ms.mitre_predictions or []
            event_tactics = {p.get("tactic", "").lower() for p in mitre_preds}
            if self.tactic.lower() not in event_tactics:
                return False

        # Technique prefix matching
        if self.technique_prefix:
            mitre_preds = ms.mitre_predictions or []
            event_techniques = {p.get("technique_id", "") for p in mitre_preds}
            if not any(t.startswith(self.technique_prefix) for t in event_techniques):
                return False

        if self.custom_predicate:
            return self.custom_predicate(event)

        return True


@dataclass
class CEPPattern:
    """A multi-stage attack sequence pattern."""
    id: str
    name: str
    description: str
    stages: list[PatternStage]
    max_span_seconds: int  # window within which all stages must be observed
    severity: str = "HIGH"
    mitre_tactic: str = ""

    @property
    def stage_count(self) -> int:
        return len(self.stages)


# ── MITRE ATT&CK pattern library ─────────────────────────────────────────────

ATTACK_PATTERNS: list[CEPPattern] = [
    CEPPattern(
        id="lateral-movement-classic",
        name="Classic Lateral Movement Kill Chain",
        description=(
            "Discovery → Credential Access → Lateral Movement within 10 minutes "
            "on the same source entity. Maps to APT lateral movement playbook."
        ),
        stages=[
            PatternStage("discovery", tactic="discovery", min_ml_score=0.5),
            PatternStage("credential_dump", tactic="credential-access", min_ml_score=0.6),
            PatternStage("lateral_move", tactic="lateral-movement", min_ml_score=0.65),
        ],
        max_span_seconds=600,
        severity="CRITICAL",
        mitre_tactic="TA0008",
    ),
    CEPPattern(
        id="initial-access-to-persistence",
        name="Initial Access → Execution → Persistence",
        description=(
            "Classic malware installation chain: phishing/exploit delivers payload "
            "which executes and establishes persistence within 30 minutes."
        ),
        stages=[
            PatternStage("initial_access", tactic="initial-access", min_ml_score=0.55),
            PatternStage("execution", tactic="execution", min_ml_score=0.6),
            PatternStage("persistence", tactic="persistence", min_ml_score=0.55),
        ],
        max_span_seconds=1800,
        severity="HIGH",
        mitre_tactic="TA0003",
    ),
    CEPPattern(
        id="scan-exploit-c2",
        name="Scan → Exploit → Command & Control",
        description=(
            "Network scanning followed by exploitation and C2 beacon — indicative "
            "of automated exploit frameworks (Metasploit, Cobalt Strike) within 15 minutes."
        ),
        stages=[
            PatternStage("network_scan", tactic="discovery", technique_prefix="T1046", min_ml_score=0.4),
            PatternStage("exploit", tactic="initial-access", min_ml_score=0.65),
            PatternStage("c2_beacon", tactic="command-and-control", min_ml_score=0.6),
        ],
        max_span_seconds=900,
        severity="CRITICAL",
        mitre_tactic="TA0011",
    ),
    CEPPattern(
        id="defense-evasion-to-exfil",
        name="Privilege Escalation → Defense Evasion → Exfiltration",
        description=(
            "High-value data theft pattern: attacker escalates privileges, clears logs "
            "to evade detection, then exfiltrates data within 1 hour."
        ),
        stages=[
            PatternStage("priv_esc", tactic="privilege-escalation", min_ml_score=0.6),
            PatternStage("defense_evasion", tactic="defense-evasion", min_ml_score=0.55),
            PatternStage("exfiltration", tactic="exfiltration", min_ml_score=0.65),
        ],
        max_span_seconds=3600,
        severity="CRITICAL",
        mitre_tactic="TA0010",
    ),
    CEPPattern(
        id="recon-to-impact",
        name="Reconnaissance → Resource Development → Impact",
        description=(
            "Pre-attack reconnaissance followed by infrastructure staging and "
            "destructive impact (ransomware, wiper) — observed in nation-state attacks."
        ),
        stages=[
            PatternStage("recon", tactic="reconnaissance", min_ml_score=0.45),
            PatternStage("resource_dev", tactic="resource-development", min_ml_score=0.5),
            PatternStage("impact", tactic="impact", min_ml_score=0.7),
        ],
        max_span_seconds=86400,  # 24 hours — this chain can be slow
        severity="HIGH",
        mitre_tactic="TA0040",
    ),
]


# ── Redis state helpers ───────────────────────────────────────────────────────

def _redis_key(pattern_id: str, entity_key: str) -> str:
    """Build deterministic Redis key for CEP sliding window state."""
    return f"cep:{pattern_id}:{entity_key}"


# ── Core CEP Engine ───────────────────────────────────────────────────────────

class RedisCEPEngine:
    """Stateful CEP engine backed by Redis sorted sets.

    Usage::

        engine = RedisCEPEngine(redis_client)
        alerts = await engine.check_event(canonical_event)
        for alert in alerts:
            await kafka_producer.send("sentinel.sequences", alert)
    """

    def __init__(self, redis_client: Any, postgres: Any = None) -> None:
        """
        Args:
            redis_client: An async Redis client
            postgres: Postgres repository for loading active CEP rules.
        """
        self._redis = redis_client
        self._postgres = postgres
        
        self._tenant_patterns: dict[str, list[CEPPattern]] = {}
        # We start with ATTACK_PATTERNS as global defaults, but tenant-specific overrides 
        # from Postgres will take precedence.
        self._default_patterns = ATTACK_PATTERNS

    def invalidate_tenant(self, tenant_id: str) -> None:
        """Called via Redis pub/sub when a tenant updates their CEP rules."""
        if tenant_id in self._tenant_patterns:
            del self._tenant_patterns[tenant_id]

    async def _get_patterns(self, tenant_id: str) -> list[CEPPattern]:
        """Lazy load patterns from Postgres with tenant caching."""
        if tenant_id in self._tenant_patterns:
            return self._tenant_patterns[tenant_id]
            
        if not self._postgres:
            return self._default_patterns
            
        try:
            records = await self._postgres.list_cep_rules(tenant_id)
            if not records:
                self._tenant_patterns[tenant_id] = self._default_patterns
                return self._default_patterns
                
            patterns = []
            for r in records:
                if not r.is_active:
                    continue
                stages_data = json.loads(r.stages_json)
                stages = [
                    PatternStage(
                        name=s.get("name"),
                        tactic=s.get("tactic"),
                        technique_prefix=s.get("technique_prefix"),
                        min_ml_score=s.get("min_ml_score", 0.0),
                    )
                    for s in stages_data
                ]
                patterns.append(
                    CEPPattern(
                        id=r.id,
                        name=r.name,
                        description=r.description,
                        stages=stages,
                        max_span_seconds=r.max_span_seconds,
                        severity=r.severity,
                        mitre_tactic=r.mitre_tactic,
                    )
                )
            
            # If they deleted all rules but not the rows? Wait, if they have active rules, use them.
            if not patterns:
                patterns = self._default_patterns

            self._tenant_patterns[tenant_id] = patterns
            return patterns
            
        except Exception as e:
            logger.error("failed_to_load_cep_rules", tenant=tenant_id, error=str(e))
            return self._default_patterns


    async def check_event(self, event: CanonicalEvent) -> list[dict[str, Any]]:
        """Check a single event against all registered patterns.

        Returns a list of SequenceAlert dicts (may be empty).
        Each alert is ready to JSON-serialize and publish to ``sentinel.sequences``.
        """
        if event.ml_scores is None:
            return []

        tenant_id = event.metadata.tenant_id
        entity_key = (
            event.source_entity.identifier
            if event.source_entity
            else tenant_id
        )
        now_ts = time.time()
        fired_alerts: list[dict[str, Any]] = []

        patterns = await self._get_patterns(tenant_id)

        for pattern in patterns:
            alert = await self._evaluate_pattern(pattern, event, entity_key, now_ts)
            if alert:
                fired_alerts.append(alert)

        return fired_alerts

    async def _evaluate_pattern(
        self,
        pattern: CEPPattern,
        event: CanonicalEvent,
        entity_key: str,
        now_ts: float,
    ) -> dict[str, Any] | None:
        """Evaluate a single pattern against the incoming event.

        Uses a per-stage Redis key. The *next expected stage* is determined
        by counting how many prior stages already have entries in the window.

        Returns a SequenceAlert dict if the pattern fires, else None.
        """
        try:
            window_start = now_ts - pattern.max_span_seconds

            # Determine which stage we expect next
            stage_timestamps: list[float | None] = []
            for i, stage in enumerate(pattern.stages[:-1]):  # all but last
                key = _redis_key(f"{pattern.id}:s{i}", entity_key)
                entries = await self._redis.zrangebyscore(key, window_start, "+inf", withscores=True)
                stage_timestamps.append(entries[0][1] if entries else None)

            # Find the index of the next stage to fill
            next_stage_idx = 0
            for i, ts in enumerate(stage_timestamps):
                if ts is not None:
                    next_stage_idx = i + 1
                else:
                    break

            # Check if this event matches the next expected stage
            if next_stage_idx >= pattern.stage_count:
                return None  # Pattern already complete or no more stages

            current_stage = pattern.stages[next_stage_idx]
            if not current_stage.matches(event):
                return None

            # Record this stage's timestamp in Redis
            stage_key = _redis_key(f"{pattern.id}:s{next_stage_idx}", entity_key)
            await self._redis.zadd(stage_key, {str(event.event_id): now_ts})
            # Expire state after 2× the max window to prevent Redis bloat
            await self._redis.expire(stage_key, pattern.max_span_seconds * 2)
            # Prune old entries outside the window
            await self._redis.zremrangebyscore(stage_key, "-inf", window_start)

            # If we just filled the last stage — pattern fires!
            if next_stage_idx == pattern.stage_count - 1:
                # Collect evidence timestamps from all stages
                stage_times: list[float] = []
                for i in range(pattern.stage_count):
                    k = _redis_key(f"{pattern.id}:s{i}", entity_key)
                    entries = await self._redis.zrangebyscore(k, window_start, "+inf", withscores=True)
                    if entries:
                        stage_times.append(entries[0][1])

                # Clean up fired pattern state
                for i in range(pattern.stage_count):
                    k = _redis_key(f"{pattern.id}:s{i}", entity_key)
                    await self._redis.delete(k)

                alert = self._build_sequence_alert(pattern, event, entity_key, stage_times)
                logger.warning(
                    "cep_pattern_fired",
                    pattern_id=pattern.id,
                    pattern_name=pattern.name,
                    entity=entity_key,
                    severity=pattern.severity,
                    span_seconds=max(stage_times) - min(stage_times) if len(stage_times) > 1 else 0,
                )
                return alert

        except Exception as exc:
            logger.warning("cep_evaluate_error", pattern_id=pattern.id, error=str(exc))

        return None

    def _build_sequence_alert(
        self,
        pattern: CEPPattern,
        triggering_event: CanonicalEvent,
        entity_key: str,
        stage_times: list[float],
    ) -> dict[str, Any]:
        """Build a SequenceAlert payload ready for ``sentinel.sequences`` topic."""
        span_seconds = (
            round(max(stage_times) - min(stage_times), 1)
            if len(stage_times) > 1
            else 0.0
        )
        return {
            "alert_id": str(uuid.uuid4()),
            "alert_type": "sequence_alert",
            "pattern_id": pattern.id,
            "pattern_name": pattern.name,
            "description": pattern.description,
            "severity": pattern.severity,
            "mitre_tactic": pattern.mitre_tactic,
            "entity_key": entity_key,
            "tenant_id": triggering_event.metadata.tenant_id,
            "fired_at": time.time(),
            "span_seconds": span_seconds,
            "stage_count": pattern.stage_count,
            "triggering_event_id": triggering_event.event_id,
            "triggering_ml_score": (
                triggering_event.ml_scores.meta_score
                if triggering_event.ml_scores
                else 0.0
            ),
            # Source info for narrative generation
            "source_ip": (
                triggering_event.network.src_ip
                if triggering_event.network
                else None
            ),
            "source_entity": (
                triggering_event.source_entity.identifier
                if triggering_event.source_entity
                else None
            ),
        }

    async def get_active_patterns(self, entity_key: str, tenant_id: str) -> list[dict[str, Any]]:
        """Return which patterns are currently in-progress for an entity.

        Useful for the investigation panel: 'This host is 2/3 through
        the lateral movement pattern — stages completed: Discovery, Credential Access.'
        """
        active: list[dict[str, Any]] = []
        now_ts = time.time()

        patterns = await self._get_patterns(tenant_id)

        for pattern in patterns:
            completed_stages: list[str] = []
            for i, stage in enumerate(pattern.stages):
                key = _redis_key(f"{pattern.id}:s{i}", entity_key)
                window_start = now_ts - pattern.max_span_seconds
                entries = await self._redis.zrangebyscore(key, window_start, "+inf")
                if entries:
                    completed_stages.append(stage.name)
                else:
                    break

            if completed_stages and len(completed_stages) < pattern.stage_count:
                active.append({
                    "pattern_id": pattern.id,
                    "pattern_name": pattern.name,
                    "severity": pattern.severity,
                    "completed_stages": completed_stages,
                    "total_stages": pattern.stage_count,
                    "progress_pct": round(len(completed_stages) / pattern.stage_count * 100),
                })

        return active
