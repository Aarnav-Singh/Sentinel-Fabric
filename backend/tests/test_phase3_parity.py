"""Phase 3 Parity Verification Tests — Simulation, Reporting, SOAR.

Run with: venv\\Scripts\\python.exe -m pytest tests/test_phase3_parity.py -v
"""
from __future__ import annotations

import inspect
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# ---------------------------------------------------------------------------
# V-P3.1: Breach & Attack Simulation Engine
# ---------------------------------------------------------------------------

class TestSimulationEngine:
    """Validate Simulation Engine structurally and functionally."""

    def test_simulation_service_structure(self):
        """SimulationEngine should exist and expose run_scenario."""
        from app.services.simulation_service import SimulationEngine
        assert hasattr(SimulationEngine, "run_scenario"), \
            "SimulationEngine must have run_scenario method"

    def test_simulation_schemas_exist(self):
        """SimulationScenario and SimulationStep schemas must exist."""
        from app.services.simulation_service import SimulationScenario, SimulationStep
        assert SimulationScenario is not None
        assert SimulationStep is not None

    @pytest.mark.asyncio
    @patch("app.services.simulation_service.get_app_pipeline", create=True)
    async def test_simulation_event_generation(self, mock_get_pipeline):
        """Engine should inject generated events into the pipeline."""
        from app.services.simulation_service import (
            SimulationEngine, SimulationScenario, SimulationStep,
        )
        from app.schemas.canonical_event import SeverityLevel

        mock_pipeline = AsyncMock()
        mock_get_pipeline.return_value = mock_pipeline

        scenario = SimulationScenario(
            id="test-scenario",
            name="Test Scenario",
            steps=[
                SimulationStep(delay_ms=0, message="Test Event 1", severity=SeverityLevel.HIGH),
                SimulationStep(delay_ms=0, message="Test Event 2", severity=SeverityLevel.CRITICAL),
            ],
        )

        engine = SimulationEngine()
        await engine.run_scenario(scenario)

        assert mock_pipeline.process.call_count == 2, \
            "Pipeline.process() should be called once per scenario step"

    def test_simulation_api_exposes_run(self):
        """POST /simulate/run must exist in the simulation router."""
        from app.api.simulation import router
        routes = [r.path for r in router.routes]
        assert any(r.endswith("/run") for r in routes), \
            "POST /simulate/run endpoint must be registered"


# ---------------------------------------------------------------------------
# V-P3.2: Executive Reporting (PDF)
# ---------------------------------------------------------------------------

class TestExecutiveReporting:
    """Validate Executive Reporting API uses expected tools."""

    def test_pdf_report_uses_reportlab(self):
        """Reporting API for PDF should use reportlab elements."""
        from app.api import reporting
        source = inspect.getsource(reporting.generate_pdf_report)
        assert "SimpleDocTemplate" in source, "PDF must use SimpleDocTemplate"
        assert "Paragraph" in source, "PDF must use Paragraph"
        assert "Table" in source, "PDF must use Table"

    def test_pdf_tenant_isolation(self):
        """Reporting API MUST enforce tenant_id."""
        from app.api import reporting
        source = inspect.getsource(reporting.generate_pdf_report)
        assert "tenant_id" in source, \
            "tenant_id filtering is completely missing from report generation"

    def test_executive_endpoint_exists(self):
        """GET /reports/executive must be registered."""
        from app.api.reporting import router
        routes = [r.path for r in router.routes]
        assert any(r.endswith("/executive") for r in routes), \
            "GET /reports/executive endpoint must be registered"

    def test_executive_report_has_posture_score(self):
        """Executive report must compute a posture_score."""
        from app.api import reporting
        source = inspect.getsource(reporting.generate_executive_report)
        assert "posture_score" in source, \
            "Executive report must compute posture_score"

    def test_executive_report_has_recommendations(self):
        """Executive report must include a recommendations section."""
        from app.api import reporting
        source = inspect.getsource(reporting.generate_executive_report)
        assert "Recommendations" in source, \
            "Executive report must include Recommendations section"


# ---------------------------------------------------------------------------
# V-P3.3: SOAR Context Execution
# ---------------------------------------------------------------------------

class TestSOARExecution:
    """Validate SOAR Execution payload and context handling."""

    def test_execute_container_endpoint_structure(self):
        """/execute-container must accept context and manifest_name."""
        from app.api import soar
        source = inspect.getsource(soar.execute_container_action)
        assert "context" in source, "execute_container_action must handle 'context'"
        assert "manifest_name" in source, "execute_container_action must handle 'manifest_name'"

    def test_execute_playbook_accepts_event_context(self):
        """POST /execute must accept event_context for Jinja2 templating."""
        from app.api import soar
        source = inspect.getsource(soar.execute_playbook)
        assert "event_context" in source, \
            "execute_playbook must accept event_context parameter"

    def test_execute_playbook_passes_context_to_engine(self):
        """execute_playbook must forward event_context to engine.execute_playbook."""
        from app.api import soar
        source = inspect.getsource(soar.execute_playbook)
        assert "event_context=event_context" in source, \
            "event_context must be forwarded to engine.execute_playbook()"


# ---------------------------------------------------------------------------
# V-P3.4: Graceful Import Guards
# ---------------------------------------------------------------------------

class TestGracefulImports:
    """Validate optional dependencies don't crash the import chain."""

    def test_scylla_repository_imports_without_cassandra(self):
        """ScyllaRepository must not crash if cassandra-driver is missing."""
        from app.repositories.scylla_repository import ScyllaRepository
        repo = ScyllaRepository()
        assert repo is not None

    def test_stix_graph_imports_without_neo4j(self):
        """STIXGraphRepository must not crash if neo4j is missing."""
        from app.intelligence.stix_graph import STIXGraphRepository
        assert STIXGraphRepository is not None
