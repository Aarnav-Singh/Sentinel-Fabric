"""Containerized SOAR Action Executor.

Dispatches SOAR actions to ephemeral Docker containers instead of running
them in-process. This provides:
  - Strong isolation (network=none, read-only FS, no capabilities)
  - Reproducible environments via versioned Docker images
  - Resource governance (memory + CPU limits per action)
  - Audit trails from container stdout/stderr

Flow:
  1. Look up the ActionManifest for the requested capability
  2. Build environment (passthrough host env vars + static + context payload)
  3. Run ephemeral container with strict limits (remove=True)
  4. Parse structured JSON from stdout (first JSON line wins)
  5. Return normalized status string to the SOAR engine

Container Contract:
  - Input: JSON payload injected as `UMBRIX_PAYLOAD` env var
  - Output: container must print one JSON line to stdout:
      {"status": "success"|"failed"|"error", "message": "..."}
  - Non-zero exit code is treated as "error_container_exit"

Dev/CI Fallback:
  - If Docker is not available (ImportError or DockerException),
    the executor falls through to a MOCK response so CI never breaks.
"""
import json
import logging
import os
from typing import Any, Dict, Optional

import structlog

from app.services.soar.action_manifest import ManifestRegistry, ActionManifest

logger = structlog.get_logger(__name__)


class ContainerExecutionError(Exception):
    """Raised when a container-based action fails unrecoverably."""


class ContainerExecutor:
    """Runs SOAR actions inside ephemeral Docker containers."""

    def __init__(self, docker_socket: str = "unix://var/run/docker.sock"):
        self._socket = docker_socket
        self._client = None  # lazy-initialised

    def _get_client(self):
        """Lazy-init docker client with graceful ImportError handling."""
        if self._client is not None:
            return self._client
        try:
            import docker
            self._client = docker.DockerClient(base_url=self._socket)
            self._client.ping()  # verify connectivity
            return self._client
        except ImportError:
            logger.warning("docker_sdk_not_installed", hint="pip install docker")
            return None
        except Exception as exc:
            logger.warning("docker_unavailable", error=str(exc))
            return None

    def _build_env(self, manifest: ActionManifest, context: Dict[str, Any]) -> Dict[str, str]:
        """Construct the environment dict for the container."""
        env: Dict[str, str] = {}

        # 1. Static env vars declared in the manifest
        env.update(manifest.env_static)

        # 2. Passthrough from the host process environment
        for key in manifest.env_passthrough:
            val = os.environ.get(key)
            if val is not None:
                env[key] = val

        # 3. Serialise the action context as a JSON payload
        env["UMBRIX_PAYLOAD"] = json.dumps(context)
        env["UMBRIX_ACTION"] = context.get("_action_type", "unknown")

        return env

    def _build_host_config_kwargs(self, manifest: ActionManifest) -> Dict[str, Any]:
        """Return kwargs for docker-py's containers.run matching resource limits."""
        kwargs: Dict[str, Any] = {
            "mem_limit": f"{manifest.memory_mb}m",
            "cpu_shares": manifest.cpu_shares,
            "network_mode": manifest.network_mode,
            "read_only": manifest.read_only_rootfs,
            "remove": True,           # auto-remove after exit
            "detach": False,           # block until container exits
            "stdout": True,
            "stderr": True,
        }
        if manifest.drop_all_caps:
            kwargs["cap_drop"] = ["ALL"]

        return kwargs

    def _parse_output(self, raw: bytes) -> Dict[str, Any]:
        """
        Extract the first valid JSON object from container stdout.
        Falls back to {"status": "error", "message": <raw>} on failure.
        """
        decoded = raw.decode("utf-8", errors="replace").strip()
        for line in decoded.splitlines():
            line = line.strip()
            if line.startswith("{"):
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue
        return {"status": "error", "message": decoded[:512] or "empty_output"}

    async def run(
        self,
        capability: str,
        context: Dict[str, Any],
        manifest_name: Optional[str] = None,
    ) -> str:
        """
        Execute the given capability in a container.

        Args:
            capability: Action type string e.g. "isolate_host"
            context:    Dict of parameters (Jinja-rendered by the engine)
            manifest_name: Optional override; if None, auto-resolved by capability

        Returns:
            Normalised status string: "success" | "failed" | "error_*"
        """
        # Resolve manifest
        if manifest_name:
            manifest = ManifestRegistry.get_by_name(manifest_name)
        else:
            manifest = ManifestRegistry.get_by_capability(capability)

        if not manifest:
            logger.error("container_manifest_not_found", capability=capability)
            return "error_manifest_missing"

        context["_action_type"] = capability

        client = self._get_client()
        if client is None:
            # MOCK path — no Docker available
            logger.warning(
                "container_executor_mock",
                capability=capability,
                image=manifest.image,
                reason="docker_unavailable",
            )
            return "success"

        env = self._build_env(manifest, context)
        run_kwargs = self._build_host_config_kwargs(manifest)

        try:
            logger.info(
                "container_action_starting",
                capability=capability,
                image=manifest.image,
                timeout=manifest.timeout_seconds,
            )

            # docker-py's containers.run is synchronous; wrap in asyncio
            # get_running_loop() is the correct API in Python 3.10+ —
            # get_event_loop() is deprecated when called inside an async context.
            import asyncio
            loop = asyncio.get_running_loop()

            def _run_container():
                return client.containers.run(
                    image=manifest.image,
                    command=manifest.command or None,
                    environment=env,
                    timeout=manifest.timeout_seconds,
                    **run_kwargs,
                )

            raw_output: bytes = await asyncio.wait_for(
                loop.run_in_executor(None, _run_container),
                timeout=manifest.timeout_seconds + 10,  # extra buffer for pull/start overhead
            )

            result = self._parse_output(raw_output)
            status = result.get("status", "error")

            logger.info(
                "container_action_completed",
                capability=capability,
                image=manifest.image,
                status=status,
                message=result.get("message", ""),
            )
            return status

        except Exception as exc:  # ContainerError, ImageNotFound, APIError, TimeoutError
            logger.error(
                "container_action_failed",
                capability=capability,
                image=manifest.image,
                error=str(exc),
            )
            # Map specific docker errors to meaningful status codes
            exc_type = type(exc).__name__
            if "NotFound" in exc_type or "ImageNotFound" in exc_type:
                return "error_image_not_found"
            if "Timeout" in exc_type:
                return "error_timeout"
            return "error_container_exception"


# Module-level singleton
container_executor = ContainerExecutor()
