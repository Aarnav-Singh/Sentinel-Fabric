import json
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ValidationError
from .ocsf_mapper import OCSFMapper

class CloudTrailUserIdentity(BaseModel):
    type: str = Field(default="Unknown")
    principalId: str = Field(default="Unknown")
    arn: str = Field(default="Unknown")
    accountId: str = Field(default="Unknown")
    userName: str = Field(default="Unknown")

class CloudTrailRecord(BaseModel):
    eventVersion: str = Field(default="1.08")
    userIdentity: CloudTrailUserIdentity = Field(default_factory=CloudTrailUserIdentity)
    eventTime: str
    eventSource: str
    eventName: str
    awsRegion: str = Field(default="Unknown")
    sourceIPAddress: str = Field(default="Unknown")
    userAgent: str = Field(default="Unknown")
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None
    recipientAccountId: Optional[str] = None

class AWSCloudTrailParser:
    """Parses AWS CloudTrail logs and maps them to OCSF API Activity with strict Pydantic validation."""

    @staticmethod
    def parse(log_data: Dict[str, Any]) -> Optional[Dict[Any, Any]]:
        """Parses an AWS CloudTrail record dictionary and maps it to OCSF."""
        raw_log = json.dumps(log_data)
        try:
            record = CloudTrailRecord(**log_data)
        except ValidationError as e:
            # Handle invalid payload schema gracefully
            print(f"CloudTrail parsing failed: {e}")
            return None

        # Determine if it's an API Activity
        data: Dict[str, Any] = {
            "timestamp": record.eventTime,
            "event_name": record.eventName,
            "service": record.eventSource,
            "source_ip": record.sourceIPAddress,
            "error_code": record.errorCode,
            "error_message": record.errorMessage,
            "user": record.userIdentity.arn if record.userIdentity.arn != "Unknown" else record.userIdentity.userName,
            "account_id": record.recipientAccountId,
        }

        # Status translation
        if data["error_code"]:
            data["status"] = "Failure"
            data["severity"] = 3 # Warning/Error depending on contexts
        else:
            data["status"] = "Success"
            data["severity"] = 1 # Informational

        return OCSFMapper.map_to_ocsf_api_activity(data, raw_log)
