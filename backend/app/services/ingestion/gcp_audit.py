import json
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ValidationError
from .ocsf_mapper import OCSFMapper

class GCPAuthenticationInfo(BaseModel):
    principalEmail: str = Field(default="Unknown")
    authoritySelector: str = Field(default="")

class GCPRequestMetadata(BaseModel):
    callerIp: str = Field(default="Unknown")
    callerSuppliedUserAgent: str = Field(default="")

class GCPStatus(BaseModel):
    code: Optional[int] = None
    message: Optional[str] = None

class GCPProtoPayload(BaseModel):
    methodName: str = Field(default="Unknown")
    serviceName: str = Field(default="Unknown")
    authenticationInfo: GCPAuthenticationInfo = Field(default_factory=GCPAuthenticationInfo)
    requestMetadata: GCPRequestMetadata = Field(default_factory=GCPRequestMetadata)
    status: GCPStatus = Field(default_factory=GCPStatus)

class GCPAuditLog(BaseModel):
    insertId: str = Field(default="")
    logName: str = Field(default="")
    protoPayload: GCPProtoPayload = Field(default_factory=GCPProtoPayload)
    receiveTimestamp: Optional[str] = None
    timestamp: Optional[str] = None
    severity: str = Field(default="DEFAULT")
    resource: Dict[str, Any] = Field(default_factory=dict)

class GCPAuditParser:
    """Parses Google Cloud (GCP) Audit logs and maps them to OCSF API Activity with strict Pydantic validation."""

    @staticmethod
    def parse(log_data: Dict[str, Any]) -> Optional[Dict[Any, Any]]:
        raw_log = json.dumps(log_data)

        try:
            record = GCPAuditLog(**log_data)
        except ValidationError as e:
            print(f"GCP Audit Log parsing failed: {e}")
            return None

        data: Dict[str, Any] = {
            "timestamp": record.timestamp or record.receiveTimestamp,
            "event_name": record.protoPayload.methodName,
            "service": record.protoPayload.serviceName,
            "user": record.protoPayload.authenticationInfo.principalEmail,
            "source_ip": record.protoPayload.requestMetadata.callerIp,
            "error_code": record.severity if record.severity in ("ERROR", "CRITICAL") else record.protoPayload.status.code,
            "error_message": record.protoPayload.status.message,
            "account_id": record.resource.get("labels", {}).get("project_id"),
        }

        has_error = bool(data["error_code"] or data["error_message"] or record.severity in ("ERROR", "CRITICAL"))
        data["status"] = "Failure" if has_error else "Success"
        data["severity"] = 3 if has_error else 1

        return OCSFMapper.map_to_ocsf_api_activity(data, raw_log)
