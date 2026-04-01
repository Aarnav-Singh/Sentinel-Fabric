"""Compliance Framework Mapper Engine.

Maps telemetry and detected threats to regulatory frameworks
(SOC 2, HIPAA, ISO27001, GDPR, PCI-DSS v4.0, NIST CSF 2.0).
"""
import structlog
from app.schemas.canonical_event import CanonicalEvent

logger = structlog.get_logger(__name__)


class ComplianceMapper:
    """Maps events to compliance violations based on behavior and signatures."""

    # Static predefined mapping matrix — multi-framework
    _SIGMA_TO_FRAMEWORK = {
        # Execution of unauthorized admin tools
        "susp_powershell_encoded": [
            "SOC2:CC6.1", "ISO27001:A.12.2.1",
            "PCI-DSS:6.3.2", "NIST-CSF:DE.CM-4",
        ],
        # Network exfiltration / scanning
        "recon_port_scan": [
            "SOC2:CC6.6", "HIPAA:164.312(b)",
            "GDPR:Art.32", "PCI-DSS:11.4", "NIST-CSF:DE.CM-1",
        ],
        "susp_lateral_movement_wmi": [
            "SOC2:CC6.1", "ISO27001:A.13.1.2",
            "PCI-DSS:10.6.1", "NIST-CSF:DE.CM-7",
        ],
        "malware_cobaltstrike": [
            "SOC2:CC6.8", "HIPAA:164.308(a)(5)(ii)(B)",
            "PCI-DSS:5.2", "NIST-CSF:DE.CM-4", "GDPR:Art.33",
        ],
        "susp_failed_logins": [
            "SOC2:CC6.1", "HIPAA:164.312(a)(1)",
            "GDPR:Art.32", "PCI-DSS:8.3.4", "NIST-CSF:PR.AC-7",
        ],
        # Data access / exfiltration
        "data_access_bulk_download": [
            "GDPR:Art.5(1)(f)", "GDPR:Art.32",
            "PCI-DSS:10.2.1", "NIST-CSF:PR.DS-5",
        ],
        # Privilege escalation
        "priv_escalation": [
            "SOC2:CC6.1", "PCI-DSS:7.1", "NIST-CSF:PR.AC-4",
            "GDPR:Art.32",
        ],
        # Account manipulation
        "account_manipulation": [
            "SOC2:CC6.2", "PCI-DSS:8.1.4", "NIST-CSF:PR.AC-1",
        ],
    }

    _BEHAVIOR_TO_FRAMEWORK = {
        # E.g., High temporal anomalies (off-hours bulk actions)
        "high_temporal_anomaly": [
            "SOC2:CC6.1", "NIST-CSF:DE.AE-1", "PCI-DSS:10.6",
        ],
        "high_data_exfil": [
            "SOC2:CC6.6", "HIPAA:164.312(e)(1)",
            "GDPR:Art.33", "GDPR:Art.34", "PCI-DSS:12.10",
            "NIST-CSF:RS.AN-1",
        ],
    }

    # Framework metadata for reporting
    SUPPORTED_FRAMEWORKS = {
        "SOC2": "SOC 2 Type II",
        "HIPAA": "HIPAA Security Rule",
        "ISO27001": "ISO/IEC 27001:2022",
        "GDPR": "EU General Data Protection Regulation",
        "PCI-DSS": "PCI DSS v4.0",
        "NIST-CSF": "NIST Cybersecurity Framework 2.0",
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
                tags.update(["SOC2:CC6.8", "ISO27001:A.12.2.1", "NIST-CSF:DE.CM-4"])
            if "login" in rule_name or "brute" in rule_name:
                tags.update(["SOC2:CC6.1", "HIPAA:164.312(a)(1)", "PCI-DSS:8.3.4"])
            if "exfil" in rule_name or "data_leak" in rule_name:
                tags.update(["GDPR:Art.33", "PCI-DSS:12.10", "NIST-CSF:RS.AN-1"])

        # 2. Map based on ML Behavioral DNA / Volumes
        if event.ml_scores.temporal_score > 0.8:
            tags.update(self._BEHAVIOR_TO_FRAMEWORK["high_temporal_anomaly"])

        if event.network and event.network.bytes_out > 50_000_000: # 50MB outbound in single event
            tags.update(self._BEHAVIOR_TO_FRAMEWORK["high_data_exfil"])

        result = sorted(list(tags))
        if result:
            logger.debug("compliance_mapping_hit", event_id=event.event_id, tags=result)
            
        return result

