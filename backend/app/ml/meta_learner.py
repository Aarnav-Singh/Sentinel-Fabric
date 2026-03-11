"""Meta-Learner: LightGBM fusion of 5 ML stream scores.

Takes all five stream scores + 9 contextual features and produces
a single composite detection score. Weights update continuously
via analyst TP/FP verdicts (reinforcement learning feedback).

Phase 2: Enhanced weighted average fallback that utilizes context
features (time-of-day, severity encoding) for more nuanced scoring.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

import numpy as np

import structlog

logger = structlog.get_logger(__name__)


class MetaLearner:
    """LightGBM meta-learner for stream score fusion."""

    def __init__(self) -> None:
        self._model = None
        self._loaded = False
        # Initial weights (before analyst feedback tunes them)
        self._weights = [0.25, 0.20, 0.15, 0.20, 0.20]

    def load_model(self, path: Optional[str] = None) -> None:
        if path:
            try:
                import lightgbm as lgb
                self._model = lgb.Booster(model_file=path)
                self._loaded = True
                logger.info("meta_learner_loaded", path=path)
            except Exception as exc:
                logger.warning("meta_learner_load_failed", error=str(exc))
        else:
            logger.info("meta_learner_weighted_average_mode")

    async def score(
        self,
        stream_scores: list[float],
        context_features: Optional[list[float]] = None,
    ) -> float:
        """Fuse 5 stream scores into a single composite score.

        Args:
            stream_scores: [ensemble, vae, hst, temporal, adversarial]
            context_features: [hour, asset_crit, campaign_stage, ...]
        """
        assert len(stream_scores) == 5, f"Expected 5 stream scores, got {len(stream_scores)}"

        if self._loaded and self._model:
            features = stream_scores + (context_features or [0.0] * 9)
            arr = np.array([features])
            return float(self._model.predict(arr)[0])

        # Weighted average with context adjustment
        base_score = sum(s * w for s, w in zip(stream_scores, self._weights))
        
        # Apply context multiplier if available
        if context_features and len(context_features) >= 2:
            hour = context_features[0] if context_features[0] >= 0 else datetime.utcnow().hour
            asset_crit = context_features[1] if len(context_features) > 1 else 0.5

            # Off-hours events are more suspicious (22:00–06:00)
            hour_boost = 0.05 if (hour >= 22 or hour <= 6) else 0.0

            # High-value assets get a score boost
            asset_boost = 0.03 * (asset_crit - 0.5) if asset_crit > 0.5 else 0.0

            base_score = min(base_score + hour_boost + asset_boost, 1.0)

        # Apply non-linear amplification for signals above threshold
        if base_score > 0.3:
            base_score = base_score ** 0.85  # Slight amplification

        return float(np.clip(base_score, 0.0, 1.0))

    def update_weights(self, verdict: str, stream_scores: list[float]) -> None:
        """Adjust weights based on analyst feedback.

        True positive: increase weight of streams that scored high.
        False positive: decrease weight of streams that scored high.
        """
        learning_rate = 0.01

        if verdict == "true_positive":
            for i, score in enumerate(stream_scores):
                if score > 0.5:
                    self._weights[i] = min(self._weights[i] + learning_rate, 0.5)
        elif verdict == "false_positive":
            for i, score in enumerate(stream_scores):
                if score > 0.5:
                    self._weights[i] = max(self._weights[i] - learning_rate, 0.05)

        # Re-normalize to sum to 1
        total = sum(self._weights)
        self._weights = [w / total for w in self._weights]

        logger.info(
            "meta_learner_weights_updated",
            verdict=verdict,
            weights=self._weights,
        )

    @property
    def current_weights(self) -> list[float]:
        return self._weights.copy()
