"""Stream 3: Half-Space Trees — Adaptive Real-Time Anomaly.

Uses the River library's incremental HST implementation.
Updates its internal model on every single event in real time
without retraining, downtime, or deployment.
"""
from __future__ import annotations

from river import anomaly

import structlog

logger = structlog.get_logger(__name__)


class HSTAnomalyDetector:
    """Online Half-Space Trees anomaly detector."""

    def __init__(self, n_trees: int = 25, height: int = 8, window_size: int = 1000) -> None:
        self._model = anomaly.HalfSpaceTrees(
            n_trees=n_trees,
            height=height,
            window_size=window_size,
            seed=42,
        )
        self._event_count = 0

    async def score(self, features: list[float]) -> float:
        """Score and update the model in one pass.

        River's HST returns a score in [0, 1] where 1 = most anomalous.
        The model updates incrementally on every call.
        """
        feature_dict = {f"f{i}": v for i, v in enumerate(features)}

        # Score THEN learn (evaluate before adapting)
        raw_score = self._model.score_one(feature_dict)
        self._model.learn_one(feature_dict)
        self._event_count += 1

        if self._event_count % 10000 == 0:
            logger.info("hst_checkpoint", events_processed=self._event_count)

        return raw_score

    @property
    def events_processed(self) -> int:
        return self._event_count
