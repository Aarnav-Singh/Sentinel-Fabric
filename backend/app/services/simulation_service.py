import asyncio
import logging
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import random
import uuid

from app.schemas.canonical_event import CanonicalEvent, Entity, EntityType, NetworkInfo, OutcomeType, SeverityLevel, ActionType, EventMetadata
from app.dependencies import get_app_pipeline

logger = logging.getLogger(__name__)


class SimulationStep(BaseModel):
    delay_ms: int = 0
    message: str = "Test Event"
    severity: SeverityLevel = SeverityLevel.MEDIUM
    action: ActionType = ActionType.ALERT
    category: str = "simulation"
    source_type: str = "simulator"


class SimulationScenario(BaseModel):
    id: str
    name: str
    steps: List[SimulationStep]


class SimulationEngine:
    def __init__(self):
        self._running_scenarios = set()

    async def run_scenario(self, scenario: SimulationScenario) -> None:
        """Run a discrete set of steps representing an attack lifecycle."""
        pipeline = get_app_pipeline()
        
        scenario_run_id = str(uuid.uuid4())
        self._running_scenarios.add(scenario_run_id)
        logger.info(f"Starting simulation scenario: {scenario.name} ({scenario_run_id})")

        src_ip = f"10.0.{random.randint(1, 200)}.{random.randint(1, 254)}"
        dst_ip = f"198.51.100.{random.randint(1, 254)}"

        for i, step in enumerate(scenario.steps):
            if scenario_run_id not in self._running_scenarios:
                logger.info(f"Scenario {scenario_run_id} was stopped prematurely.")
                break

            if step.delay_ms > 0:
                await asyncio.sleep(step.delay_ms / 1000.0)

            event = CanonicalEvent(
                timestamp=datetime.now(timezone.utc),
                source_type=step.source_type,
                event_category=step.category,
                event_type=step.category,
                action=step.action,
                outcome=OutcomeType.SUCCESS,
                severity=step.severity,
                message=step.message,
                signature_id=None,
                source_entity=Entity(entity_type=EntityType.IP, identifier=src_ip),
                destination_entity=Entity(entity_type=EntityType.IP, identifier=dst_ip),
                network=NetworkInfo(
                    src_ip=src_ip,
                    src_port=random.randint(30000, 65000),
                    dst_ip=dst_ip,
                    dst_port=443,
                    protocol="TCP",
                    bytes_in=1000,
                    bytes_out=1000,
                    packets_in=10,
                    packets_out=10,
                ),
                metadata=EventMetadata(parser_name="simulation_engine"),
            )
            
            try:
                await pipeline.process(event)
                logger.debug(f"Simulation {scenario_run_id} step {i}: emitted {step.message}")
            except Exception as e:
                logger.error(f"Error emitting simulation event: {e}")

        if scenario_run_id in self._running_scenarios:
            self._running_scenarios.remove(scenario_run_id)
            logger.info(f"Finished simulation scenario: {scenario.name} ({scenario_run_id})")
