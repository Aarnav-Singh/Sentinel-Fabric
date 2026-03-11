import json
from typing import Dict, Any
from datetime import datetime, timezone

class OCSFMapper:
    """Core mapper to convert specific log schemas into OCSF (Open Cybersecurity Schema Framework)."""

    @staticmethod
    def map_to_ocsf_authentication(data: Dict[Any, Any], raw_log: str) -> Dict[Any, Any]:
        """Maps an authentication event to OCSF Authentication (class_uid: 3002)."""
        return {
            "metadata": {
                "version": "1.0.0",
            },
            "class_uid": 3002,
            "class_name": "Authentication",
            "category_uid": 3,
            "category_name": "Identity & Access Management",
            "time": data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "message": data.get("message", ""),
            "raw_data": raw_log,
            "user": {
                "name": data.get("user", "Unknown"),
                "domain": data.get("domain"),
            },
            "src_endpoint": {
                "ip": data.get("source_ip"),
            },
            "activity_id": data.get("activity_id", 0),  # 1=Logon, 2=Logoff
            "status": data.get("status", "Unknown"), # Success, Failure
            "severity_id": data.get("severity", 1),
        }

    @staticmethod
    def map_to_ocsf_network_activity(data: Dict[Any, Any], raw_log: str) -> Dict[Any, Any]:
        """Maps network traffic to OCSF Network Activity (class_uid: 4001)."""
        return {
            "metadata": {
                "version": "1.0.0",
            },
            "class_uid": 4001,
            "class_name": "Network Activity",
            "category_uid": 4,
            "category_name": "Network Activity",
            "time": data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "message": data.get("message", ""),
            "raw_data": raw_log,
            "src_endpoint": {
                "ip": data.get("source_ip"),
                "port": data.get("source_port"),
            },
            "dst_endpoint": {
                "ip": data.get("destination_ip"),
                "port": data.get("destination_port"),
            },
            "connection_info": {
                "protocol_name": data.get("protocol"),
            },
            "severity_id": data.get("severity", 1),
        }

    @staticmethod
    def map_to_ocsf_api_activity(data: Dict[Any, Any], raw_log: str) -> Dict[Any, Any]:
        """Maps cloud API calls to OCSF API Activity (class_uid: 6003)."""
        return {
            "metadata": {
                "version": "1.0.0",
            },
            "class_uid": 6003,
            "class_name": "API Activity",
            "category_uid": 6,
            "category_name": "Cloud Activity",
            "time": data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "message": data.get("event_name", ""),
            "raw_data": raw_log,
            "api": {
                "operation": data.get("event_name"),
                "service": data.get("service"),
                "response": {
                    "code": data.get("error_code") or 200,
                    "message": data.get("error_message", "Success"),
                }
            },
            "user": {
                "name": data.get("user"),
                "account": {
                    "uid": data.get("account_id")
                }
            },
            "src_endpoint": {
                "ip": data.get("source_ip"),
            },
            "status": data.get("status", "Success"),
            "severity_id": data.get("severity", 1),
        }
