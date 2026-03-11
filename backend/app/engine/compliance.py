"""Compliance Framework Mapper Engine.

Maps telemetry and detected threats to regulatory frameworks (SOC 2, HIPAA, ISO27001).
"""
import structlog
from app.schemas.canonical_event import CanonicalEvent

logger = structlog.get_logger(__name__)


class ComplianceMapper:
    """Maps events to compliance violations based on behavior and signatures."""

    # Static predefined mapping matrix
    _SIGMA_TO_FRAMEWORK = {
        # e.g., Execution of unauthorized admin tools
        "susp_powershell_encoded": ["SOC2:CC6.1", "ISO27001:A.12.2.1"],
        # e.g., Network exfiltration
        "recon_port_scan": ["SOC2:CC6.6", "HIPAA:164.312(b)"],
        "susp_lateral_movement_wmi": ["SOC2:CC6.1", "ISO27001:A.13.1.2"],
        "malware_cobaltstrike": ["SOC2:CC6.8", "HIPAA:164.308(a)(5)(ii)(B)"],
        "susp_failed_logins": ["SOC2:CC6.1", "HIPAA:164.312(a)(1)"]
    }

    _BEHAVIOR_TO_FRAMEWORK = {
        # E.g., High temporal anomalies (off-hours bulk actions)
        "high_temporal_anomaly": ["SOC2:CC6.1"],
        "high_data_exfil": ["SOC2:CC6.6", "HIPAA:164.312(e)(1)"],
    }

    def map_event(self, event: CanonicalEvent, sigma_matches: list[dict]) -> list[str]:
        """Evaluate the event and return a list of compliance violation tags."""
        tags = set()

        # 1. Map based on explicit Sigma rule hits
        for match in sigma_matches:
            rule_id = match.get("rule_id", "").lower()
            if rule_id in self._SIGMA_TO_FRAMEWORK:
                tags.update(self._SIGMA_TO_FRAMEWORK[rule_id])
                
            # Generic fallback based on alert title/name if specific rule ID isn't mapped
            rule_name = match.get("rule_name", "").lower()
            if "malware" in rule_name or "ransomware" in rule_name:
                tags.update(["SOC2:CC6.8", "ISO27001:A.12.2.1"])
            if "login" in rule_name or "brute" in rule_name:
                tags.update(["SOC2:CC6.1", "HIPAA:164.312(a)(1)"])

        # 2. Map based on ML Behavioral DNA / Volumes
        if event.ml_scores.temporal_score > 0.8:
            tags.update(self._BEHAVIOR_TO_FRAMEWORK["high_temporal_anomaly"])

        if event.network and event.network.bytes_out > 50_000_000: # 50MB outbound in single event
            tags.update(self._BEHAVIOR_TO_FRAMEWORK["high_data_exfil"])

        result = sorted(list(tags))
        if result:
            logger.debug("compliance_mapping_hit", event_id=event.event_id, tags=result)
            
        return result
