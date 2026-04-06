"""SOAR Action Manifest Schema.

Defines the declarative format for containerized SOAR actions.
Each action manifest describes a container image, its entrypoint,
resource limits, input/output schema, and metadata.

Format (YAML or JSON):
  name: isolate-crowdstrike
  image: umbrix/soar-crowdstrike:latest
  command: ["python", "isolate.py"]
  env_passthrough: ["CROWDSTRIKE_CLIENT_ID", "CROWDSTRIKE_CLIENT_SECRET"]
  timeout_seconds: 30
  memory_mb: 256
  cpu_shares: 512
  capabilities: ["isolate_host", "lift_containment"]
  input_schema:
    hostname: str
    device_id: str | None
  output_schema:
    status: "success" | "failed" | "error"
    message: str | None
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import yaml
import json
from pathlib import Path


class ActionManifest(BaseModel):
    """Declarative manifest for a containerized SOAR action."""
    name: str = Field(..., description="Unique slug for this action e.g. 'isolate-crowdstrike'")
    image: str = Field(..., description="Docker image reference e.g. 'umbrix/soar-crowdstrike:latest'")
    command: List[str] = Field(default_factory=list, description="Override container entrypoint command")
    env_passthrough: List[str] = Field(
        default_factory=list,
        description="Env var names from the host that should be surfaced into the container"
    )
    env_static: Dict[str, str] = Field(
        default_factory=dict,
        description="Static env vars always injected into the container"
    )
    timeout_seconds: int = Field(default=60, ge=1, le=3600)
    memory_mb: int = Field(default=512, ge=64, le=8192)
    cpu_shares: int = Field(default=512, ge=64, le=4096)
    capabilities: List[str] = Field(
        default_factory=list,
        description="Action types this manifest can handle e.g. ['isolate_host']"
    )
    network_mode: str = Field(default="none", description="Docker network mode: 'none', 'bridge', or named network")
    read_only_rootfs: bool = Field(default=True, description="Mount the container root filesystem as read-only")
    drop_all_caps: bool = Field(default=True, description="Drop all Linux capabilities for hardening")
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list, description="Free-form labels e.g. ['network', 'identity']")
    description: str = ""


class ManifestRegistry:
    """In-process registry for loaded action manifests."""
    _manifests: Dict[str, ActionManifest] = {}

    @classmethod
    def register(cls, manifest: ActionManifest) -> None:
        cls._manifests[manifest.name] = manifest

    @classmethod
    def get_by_name(cls, name: str) -> Optional[ActionManifest]:
        return cls._manifests.get(name)

    @classmethod
    def get_by_capability(cls, capability: str) -> Optional[ActionManifest]:
        """Find the first manifest that can handle the given capability."""
        for manifest in cls._manifests.values():
            if capability in manifest.capabilities:
                return manifest
        return None

    @classmethod
    def all(cls) -> List[ActionManifest]:
        return list(cls._manifests.values())

    @classmethod
    def load_from_file(cls, path: str | Path) -> ActionManifest:
        """Load a manifest from a YAML or JSON file and register it."""
        p = Path(path)
        raw = p.read_text(encoding="utf-8")
        if p.suffix in (".yaml", ".yml"):
            data = yaml.safe_load(raw)
        else:
            data = json.loads(raw)
        manifest = ActionManifest(**data)
        cls.register(manifest)
        return manifest

    @classmethod
    def load_from_dir(cls, directory: str | Path) -> List[ActionManifest]:
        """Scan a directory for *.yaml / *.json manifests and register all."""
        d = Path(directory)
        loaded = []
        for f in d.glob("*.yaml"):
            loaded.append(cls.load_from_file(f))
        for f in d.glob("*.yml"):
            loaded.append(cls.load_from_file(f))
        for f in d.glob("*.json"):
            loaded.append(cls.load_from_file(f))
        return loaded


# ---------------------------------------------------------------------------
# Built-in manifests (no external files needed for initial run)
# ---------------------------------------------------------------------------
def _register_builtin_manifests() -> None:
    """Pre-register a set of illustrative manifests for the bundled actions."""
    _builtins = [
        ActionManifest(
            name="crowdstrike-isolate",
            image="umbrix/soar-crowdstrike:latest",
            command=["python", "actions/isolate.py"],
            env_passthrough=["CROWDSTRIKE_CLIENT_ID", "CROWDSTRIKE_CLIENT_SECRET"],
            timeout_seconds=30,
            memory_mb=256,
            cpu_shares=256,
            capabilities=["isolate_host", "lift_containment"],
            tags=["endpoint", "crowdstrike"],
            description="Isolate or un-isolate a CrowdStrike-managed endpoint."
        ),
        ActionManifest(
            name="paloalto-block-ip",
            image="umbrix/soar-paloalto:latest",
            command=["python", "actions/block_ip.py"],
            env_passthrough=["PANOS_HOST", "PANOS_USERNAME", "PANOS_PASSWORD"],
            timeout_seconds=30,
            memory_mb=256,
            cpu_shares=256,
            capabilities=["block_ip", "unblock_ip"],
            tags=["network", "paloalto"],
            description="Block or unblock an IP address in a PAN-OS security policy."
        ),
        ActionManifest(
            name="okta-suspend-user",
            image="umbrix/soar-okta:latest",
            command=["python", "actions/suspend_user.py"],
            env_passthrough=["OKTA_DOMAIN", "OKTA_API_TOKEN"],
            timeout_seconds=20,
            memory_mb=128,
            cpu_shares=128,
            capabilities=["suspend_user", "reset_password"],
            tags=["identity", "okta"],
            description="Suspend or reset credentials for an Okta-managed identity."
        ),
        ActionManifest(
            name="aws-isolate",
            image="umbrix/soar-aws:latest",
            command=["python", "actions/isolate_ec2.py"],
            env_passthrough=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_DEFAULT_REGION"],
            timeout_seconds=45,
            memory_mb=256,
            cpu_shares=256,
            capabilities=["aws_isolate_instance"],
            tags=["cloud", "aws"],
            description="Apply isolation security group to an EC2 instance."
        ),
    ]
    for m in _builtins:
        ManifestRegistry.register(m)


_register_builtin_manifests()
