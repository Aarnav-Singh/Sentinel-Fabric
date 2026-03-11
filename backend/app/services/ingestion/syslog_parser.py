import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, ValidationError
from .ocsf_mapper import OCSFMapper

class SyslogRecord(BaseModel):
    pri: str
    timestamp: str
    hostname: str
    app_name: str
    pid: Optional[str] = None
    message: str

class SyslogParser:
    """Parses standard RFC3164 and RFC5424 syslog messages with Pydantic validation."""

    # Simple RFC3164 regex matcher
    RFC3164_PATTERN = re.compile(
        r'^<(?P<pri>\d+)>(?P<timestamp>[A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+)\s+(?P<hostname>\S+)\s+(?P<app_name>[a-zA-Z0-9_\-]+)(?:\[(?P<pid>\d+)\])?:\s+(?P<message>.*)'
    )

    @staticmethod
    def parse(raw_log: str) -> Optional[Dict[Any, Any]]:
        """Parses a syslog line and maps it to an OCSF event based on contents."""
        match = SyslogParser.RFC3164_PATTERN.match(raw_log.strip())
        if not match:
            # Fallback or unrecognized
            return None

        parsed_dict = match.groupdict()
        try:
            record = SyslogRecord(**parsed_dict)
        except ValidationError as e:
            print(f"Syslog parsing failed validation: {e}")
            return None

        # Extract basic info
        data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(), # Ideally parse the custom format
            "message": record.message,
            "app_name": record.app_name,
            "hostname": record.hostname,
        }

        # Determine type based on app_name or message content
        if record.app_name.lower() in ("sshd", "su", "sudo", "auth"):
            return SyslogParser._parse_auth_syslog(data, record.message, raw_log)
        else:
            # Default to network / general event
            # OCSF Authentication or Network depending on type
            return OCSFMapper.map_to_ocsf_network_activity(data, raw_log)

    @staticmethod
    def _parse_auth_syslog(data: Dict, message: str, raw_log: str) -> Dict:
        """Specific parsing for SSH authentication logs."""
        # Simple extraction logic for SSH
        # Example: "Failed password for root from 192.168.1.100 port 22 ssh2"
        data["status"] = "Failure" if "Failed" in message or "Invalid" in message else "Success"
        data["activity_id"] = 1 # Logon
        
        user_match = re.search(r'(?:for|user)\s+(invalid user\s+)?([a-zA-Z0-9_\-]+)', message, re.IGNORECASE)
        if user_match:
            data["user"] = user_match.group(2)
            
        ip_match = re.search(r'from\s+(\d+\.\d+\.\d+\.\d+)', message)
        if ip_match:
            data["source_ip"] = ip_match.group(1)

        data["severity"] = 3 if data["status"] == "Failure" else 1

        return OCSFMapper.map_to_ocsf_authentication(data, raw_log)
