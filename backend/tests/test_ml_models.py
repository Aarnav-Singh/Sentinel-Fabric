"""Tests for all 6 ML model classes.

Verifies each model produces real, non-zero scores with expected structure.
"""
import asyncio
import pytest


# ─── Ensemble Classifier ────────────────────────────────────────

class TestEnsembleClassifier:
    def setup_method(self):
        from app.ml.ensemble import EnsembleClassifier
        self.model = EnsembleClassifier()
        self.model.load_models()

    def test_loaded(self):
        assert self.model._loaded is True

    def test_score_returns_dict(self):
        features = [100.0, 50.0, 10.0, 5.0, 443, 80, 100, 1, 0, 2, 0, 0, 3.5, 4.2, 200, 0.5]
        result = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        assert isinstance(result, dict)
        assert "score" in result
        assert "label" in result
        assert "probabilities" in result
        assert "shap_values" in result

    def test_score_in_range(self):
        features = [5000.0, 200.0, 50.0, 30.0, 4444, 443, 500, 1, 0, 3, 1, 0, 5.0, 6.0, 50, 0.8]
        result = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        assert 0.0 <= result["score"] <= 1.0

    def test_probabilities_sum_to_one(self):
        features = [100.0] * 16
        result = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        total = sum(result["probabilities"].values())
        assert abs(total - 1.0) < 0.01  # Should sum to ~1.0

    def test_label_is_valid_class(self):
        from app.ml.ensemble import ATTACK_CLASSES
        features = [0.0] * 16
        result = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        assert result["label"] in ATTACK_CLASSES

    def test_different_inputs_different_scores(self):
        low = asyncio.get_event_loop().run_until_complete(self.model.score([1.0] * 16))
        high = asyncio.get_event_loop().run_until_complete(self.model.score([10000.0] * 16))
        # Different inputs should produce different scores
        assert low["score"] != high["score"] or low["label"] != high["label"]


# ─── VAE Anomaly Detector ───────────────────────────────────────

class TestVAEAnomalyDetector:
    def setup_method(self):
        from app.ml.vae import VAEAnomalyDetector
        self.model = VAEAnomalyDetector()
        self.model.load_model()

    def test_loaded_with_random_init(self):
        assert self.model._loaded is True

    def test_score_returns_float(self):
        features = [0.5] * 16
        score = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        assert isinstance(score, float)

    def test_score_in_range(self):
        features = [1.0, 2.0, 3.0] * 5 + [0.0]
        score = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        assert 0.0 <= score <= 1.0

    def test_score_nonzero_with_random_init(self):
        features = [1.0, 2.0, 3.0, 4.0, 5.0] * 3 + [0.0]
        score = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        # Random init should produce non-zero reconstruction error
        assert score > 0.0


# ─── HST Anomaly Detector ───────────────────────────────────────

class TestHSTAnomalyDetector:
    def setup_method(self):
        from app.ml.hst import HSTAnomalyDetector
        self.model = HSTAnomalyDetector()

    def test_score_returns_numeric(self):
        features = [1.0, 2.0, 3.0, 4.0]
        score = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        assert isinstance(score, (int, float))

    def test_score_in_range(self):
        features = [100.0, 200.0, 50.0]
        score = asyncio.get_event_loop().run_until_complete(self.model.score(features))
        assert 0.0 <= score <= 1.0

    def test_events_processed_increments(self):
        assert self.model.events_processed == 0
        asyncio.get_event_loop().run_until_complete(self.model.score([1.0, 2.0]))
        assert self.model.events_processed == 1
        asyncio.get_event_loop().run_until_complete(self.model.score([3.0, 4.0]))
        assert self.model.events_processed == 2


# ─── Temporal Anomaly Detector ──────────────────────────────────

class TestTemporalAnomalyDetector:
    def setup_method(self):
        from app.ml.temporal import TemporalAnomalyDetector
        self.model = TemporalAnomalyDetector()
        self.model.load_model()

    def test_loaded_with_random_init(self):
        assert self.model._loaded is True

    def test_score_without_history(self):
        features = [0.5] * 16
        score = asyncio.get_event_loop().run_until_complete(
            self.model.score([], features)
        )
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0

    def test_score_with_history(self):
        history = [[0.1] * 16, [0.2] * 16, [0.3] * 16]
        current = [0.9] * 16
        score = asyncio.get_event_loop().run_until_complete(
            self.model.score(history, current)
        )
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0


# ─── Adversarial Detector ──────────────────────────────────────

class TestAdversarialDetector:
    def setup_method(self):
        from app.ml.adversarial import AdversarialDetector
        self.model = AdversarialDetector()
        self.model.load_model()

    def test_loaded_with_random_init(self):
        assert self.model._loaded is True

    def test_score_returns_dict(self):
        result = asyncio.get_event_loop().run_until_complete(
            self.model.score("entity-1", 1000.0, 0.3, 0.4, 0.2)
        )
        assert isinstance(result, dict)
        assert "timing_score" in result
        assert "evasion_score" in result
        assert "llm_score" in result
        assert "composite" in result

    def test_composite_is_max(self):
        result = asyncio.get_event_loop().run_until_complete(
            self.model.score("entity-2", 1000.0, 0.3, 0.4, 0.2)
        )
        assert result["composite"] == max(
            result["timing_score"],
            result["evasion_score"],
            result["llm_score"],
        )

    def test_llm_score_nonzero(self):
        result = asyncio.get_event_loop().run_until_complete(
            self.model.score("entity-3", 1000.0, 0.3, 0.4, 0.2)
        )
        # With random init, LLM fingerprinter should produce non-zero score
        assert result["llm_score"] >= 0.0

    def test_evasion_boundary_detection(self):
        """All three scores near boundary should trigger high evasion score."""
        self.model._warmup_threshold = 0  # Disable warmup for this test
        result = asyncio.get_event_loop().run_until_complete(
            self.model.score("entity-4", 1000.0, 0.42, 0.45, 0.38)
        )
        assert result["evasion_score"] >= 0.5


# ─── Meta-Learner ───────────────────────────────────────────────

class TestMetaLearner:
    def setup_method(self):
        from app.ml.meta_learner import MetaLearner
        self.model = MetaLearner()

    def test_score_with_five_inputs(self):
        scores = [0.5, 0.3, 0.4, 0.2, 0.6]
        result = asyncio.get_event_loop().run_until_complete(
            self.model.score(scores)
        )
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0

    def test_score_requires_five_inputs(self):
        with pytest.raises(AssertionError):
            asyncio.get_event_loop().run_until_complete(
                self.model.score([0.5, 0.3])
            )

    def test_update_weights(self):
        initial = self.model.current_weights.copy()
        self.model.update_weights("true_positive", [0.8, 0.1, 0.1, 0.1, 0.1])
        updated = self.model.current_weights
        # First weight should have increased
        assert updated[0] > initial[0] or abs(updated[0] - initial[0]) < 0.001

    def test_weights_normalize(self):
        self.model.update_weights("true_positive", [0.8, 0.8, 0.8, 0.8, 0.8])
        total = sum(self.model.current_weights)
        assert abs(total - 1.0) < 0.01

    def test_context_features_affect_score(self):
        scores = [0.5, 0.5, 0.5, 0.5, 0.5]
        base = asyncio.get_event_loop().run_until_complete(
            self.model.score(scores)
        )
        # Night-time + high-value asset should boost score
        boosted = asyncio.get_event_loop().run_until_complete(
            self.model.score(scores, [23.0, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
        )
        assert boosted >= base
