"""Automated decision/response recommendation engine.

Produces structured recommendations based on meta_score thresholds,
Sigma rule matches, IOC hits, and campaign correlation.
"""
from __future__ import annotations

from typing import Optional

import structlog

from app.schemas.canonical_event import CanonicalEvent

logger = structlog.get_logger(__name__)

# ─── Response Actions ────────────────────────────────────────────

ACTIONS = {
    "ISOLATE": {
        "urgency": "immediate",
        "description": "Isolate host from network — active threat confirmed",
        "auto_applicable": True,
    },
    "BLOCK": {
        "urgency": "immediate",
        "description": "Block source IP/domain at firewall",
        "auto_applicable": True,
    },
    "INVESTIGATE": {
        "urgency": "high",
        "description": "Assign to analyst for investigation — suspicious activity requires human review",
        "auto_applicable": False,
    },
    "MONITOR": {
        "urgency": "medium",
        "description": "Add entity to watchlist — escalate if pattern continues",
        "auto_applicable": False,
    },
    "LOG": {
        "urgency": "low",
        "description": "Log for baseline analysis — no immediate action required",
        "auto_applicable": False,
    },
}


class DecisionEngine:
    """Automated response recommendation engine."""

    def __init__(self) -> None:
        # Score thresholds for action determination
        self._thresholds = {
            "isolate": 0.85,
            "block": 0.70,
            "investigate": 0.50,
            "monitor": 0.30,
        }
        logger.info("decision_engine_initialized")

    def recommend(
        self,
        event: CanonicalEvent,
        sigma_matches: list[dict] | None = None,
        ioc_matches: list[dict] | None = None,
    ) -> dict:
        """Generate a response recommendation.

        Returns:
            dict with keys: action, urgency, reasoning, confidence, auto_applicable
        """
        meta_score = event.ml_scores.meta_score
        sigma_matches = sigma_matches or []
        ioc_matches = ioc_matches or []

        # Start with score-based action
        action = self._score_to_action(meta_score)

        # Escalate based on IOC hits
        if ioc_matches:
            max_ioc_confidence = max(m["confidence"] for m in ioc_matches)
            if max_ioc_confidence >= 0.9:
                action = max(action, 4)  # At least BLOCK
            elif max_ioc_confidence >= 0.7:
                action = max(action, 3)  # At least INVESTIGATE

        # Escalate based on Sigma rule matches
        if sigma_matches:
            high_confidence_rules = [m for m in sigma_matches if m["confidence"] >= 0.85]
            if len(high_confidence_rules) >= 2:
                action = max(action, 4)  # Multiple high-confidence rules → BLOCK
            elif high_confidence_rules:
                action = max(action, 3)  # Single high-confidence rule → INVESTIGATE

        # Escalate based on campaign correlation
        if event.campaign_id:
            action = max(action, 3)  # Campaign-correlated events → at least INVESTIGATE

        # Map numeric level to action name
        action_map = {5: "ISOLATE", 4: "BLOCK", 3: "INVESTIGATE", 2: "MONITOR", 1: "LOG"}
        action_name = action_map.get(action, "LOG")
        action_info = ACTIONS[action_name]

        # Build reasoning
        reasoning = self._build_reasoning(
            meta_score, sigma_matches, ioc_matches, event.campaign_id,
        )

        recommendation = {
            "action": action_name,
            "urgency": action_info["urgency"],
            "description": action_info["description"],
            "reasoning": reasoning,
            "confidence": meta_score,
            "auto_applicable": action_info["auto_applicable"],
        }

        logger.info(
            "decision_recommendation",
            event_id=event.event_id,
            action=action_name,
            urgency=action_info["urgency"],
            meta_score=round(meta_score, 4),
        )

        return recommendation

    def _score_to_action(self, meta_score: float) -> int:
        """Convert meta_score to numeric action level (1-5)."""
        if meta_score >= self._thresholds["isolate"]:
            return 5  # ISOLATE
        elif meta_score >= self._thresholds["block"]:
            return 4  # BLOCK
        elif meta_score >= self._thresholds["investigate"]:
            return 3  # INVESTIGATE
        elif meta_score >= self._thresholds["monitor"]:
            return 2  # MONITOR
        return 1  # LOG

    def _build_reasoning(
        self,
        meta_score: float,
        sigma_matches: list[dict],
        ioc_matches: list[dict],
        campaign_id: Optional[str],
    ) -> str:
        """Build human-readable reasoning for the recommendation."""
        reasons = []

        reasons.append(f"ML composite score: {meta_score:.2%}")

        if sigma_matches:
            rule_names = [m["rule_name"] for m in sigma_matches[:3]]
            reasons.append(f"Sigma rule matches: {', '.join(rule_names)}")

        if ioc_matches:
            threats = [m["threat_name"] for m in ioc_matches[:2]]
            reasons.append(f"IOC matches: {', '.join(threats)}")

        if campaign_id:
            reasons.append(f"Part of active campaign: {campaign_id}")

        return " | ".join(reasons)
