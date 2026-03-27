import json
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ValidationError
from .ocsf_mapper import OCSFMapper

class SentinelAlert(BaseModel):
    id: str = Field(default="Unknown")
    name: str = Field(default="Unknown Alert")
    description: str = Field(default="")
    severity: str = Field(default="Low")
    status: str = Field(default="New")
    timeGenerated: str = Field(default="")
    providerAlertId: str = Field(default="")
    vendorName: str = Field(default="Microsoft")
    productName: str = Field(default="Azure Sentinel")

class MicrosoftSentinelParser:
    """Parses Microsoft Sentinel alerts/incidents and maps them to OCSF Security Finding."""

    @staticmethod
    def parse(log_data: Dict[str, Any]) -> Optional[Dict[Any, Any]]:
        raw_log = json.dumps(log_data)
        
        # Depending on API wrapper, the data might be under 'properties'
        alert_data = log_data.get("properties", log_data)
        
        # Extract timeGenerated which might be missing from log_data root
        if "timeGenerated" not in alert_data:
            alert_data["timeGenerated"] = log_data.get("timeGenerated", "")

        try:
            alert = SentinelAlert(**alert_data)
        except ValidationError as e:
            print(f"Microsoft Sentinel parsing failed: {e}")
            return None

        # Severity mapping
        sev_map = {"Informational": 1, "Low": 2, "Medium": 3, "High": 4, "Critical": 5}
        # First letter capitalized mapping just in case
        severity_key = alert.severity.capitalize() if alert.severity else "Low"
        sev_val = sev_map.get(severity_key, 1)

        data: Dict[str, Any] = {
            "timestamp": alert.timeGenerated,
            "message": alert.name,
            "rule_name": alert.name,
            "rule_id": alert.providerAlertId or alert.id,
            "description": alert.description,
            "severity": sev_val,
        }

        # Attempt to map extracted entities (hosts/users/IPs) if present
        entities = alert_data.get("entities", [])
        for entity in entities:
            if isinstance(entity, dict):
                etype = entity.get("kind", entity.get("Type", "")).lower()
                if etype in ("host", "hostname") and "hostname" not in data:
                    data["hostname"] = entity.get("hostName", entity.get("HostName", ""))
                elif etype in ("account", "user") and "user" not in data:
                    data["user"] = entity.get("name", entity.get("Name", ""))
                elif etype == "ip" and "ip" not in data:
                    data["ip"] = entity.get("address", entity.get("Address", ""))

        return OCSFMapper.map_to_ocsf_security_finding(data, raw_log)
