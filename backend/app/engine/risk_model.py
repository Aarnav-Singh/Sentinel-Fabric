"""Risk Model — Real-Time Posture Scoring.

Computes a composite risk score from:
  - ML stream outputs
  - Asset criticality weighting
  - Entity behavioral trajectory
  - Active campaign severity
"""
from __future__ import annotations

import math


def compute_risk_score(
    meta_score: float,
    asset_criticality: float = 0.5,
    campaign_stage_weight: float = 0.0,
    entity_event_count: int = 0,
) -> float:
    """Compute weighted risk score for a single event.

    Returns a float in [0.0, 100.0] representing the risk contribution.
    """
    # Base: meta_score weighted by asset criticality
    base = meta_score * (0.5 + asset_criticality * 0.5)

    # Campaign amplifier: events in active campaigns score higher
    campaign_boost = campaign_stage_weight * 0.3

    # Frequency dampener: very high-frequency entities get slight damping
    # to avoid false-positive amplification
    frequency_factor = 1.0 - (1.0 / (1.0 + math.exp(-0.01 * (entity_event_count - 500))))

    score = (base + campaign_boost) * frequency_factor * 100.0
    return max(0.0, min(100.0, score))


def compute_posture_delta(
    current_score: float,
    previous_posture: float = 85.0,
) -> float:
    """Compute the impact of this event on the overall security posture.

    Posture is 0–100 where 100 is perfect. High-risk events push it down.
    """
    if current_score < 10.0:
        return 0.0  # No meaningful impact

    impact = -(current_score / 100.0) * 2.0
    return max(-5.0, impact)
