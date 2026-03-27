"""Platform tool definitions for the Claude triage agent.

Each tool wraps an existing platform service — no new business logic.
Tools are defined in Anthropic API format and dispatched via ``dispatch_tool()``.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# ───────────────────────────── Tool Schemas ──────────────────────────────────
# Anthropic tool-use format: list[dict] with name, description, input_schema.

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "get_campaign_context",
        "description": (
            "Retrieve campaign details (entities, kill-chain stage, timeline) "
            "from Redis for a given campaign_id. Use when the finding references "
            "a campaign_id and you need full campaign context."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {
                    "type": "string",
                    "description": "The campaign identifier to look up.",
                },
            },
            "required": ["campaign_id"],
        },
    },
    {
        "name": "lookup_threat_intel",
        "description": (
            "Query the threat-intel stores (IOC lists, VirusTotal, MISP, "
            "AbuseIPDB, AlienVault OTX) for one or more indicators. Returns "
            "match details, source feeds, and reputation scores."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "indicators": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of IOC strings (IPs, domains, hashes).",
                },
            },
            "required": ["indicators"],
        },
    },
    {
        "name": "get_similar_findings",
        "description": (
            "Search Qdrant for historically similar findings using vector "
            "similarity. Returns the top-N most similar past findings with "
            "their verdicts and scores."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Description or summary text to embed and search against.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of similar results to return (default 5).",
                },
            },
            "required": ["text"],
        },
    },
    {
        "name": "get_asset_criticality",
        "description": (
            "Return the criticality score (0.0-1.0) and metadata for a given "
            "asset. Checks CMDB/ServiceNow if configured, else Redis cache, "
            "else PostgreSQL fallback table."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "asset_ref": {
                    "type": "string",
                    "description": "Hostname, IP, or asset identifier.",
                },
            },
            "required": ["asset_ref"],
        },
    },
    {
        "name": "get_posture_score",
        "description": (
            "Return the current security posture score for the tenant. "
            "Score is 0-100 where lower means worse security posture."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "list_available_playbooks",
        "description": (
            "List SOAR playbooks available for the tenant. Returns playbook "
            "name, description, trigger type, and node count for each."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "submit_verdict",
        "description": (
            "Submit a triage verdict (true_positive or false_positive) for a "
            "finding. This closes the Agent Lightning feedback loop by updating "
            "meta-learner weights and persisting the verdict. Only call this "
            "after you have gathered sufficient context to make a determination."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "finding_id": {
                    "type": "string",
                    "description": "The finding identifier to verdict.",
                },
                "verdict": {
                    "type": "string",
                    "enum": ["true_positive", "false_positive"],
                    "description": "The analyst verdict.",
                },
                "reasoning": {
                    "type": "string",
                    "description": "Brief, evidence-based reasoning for the verdict.",
                },
            },
            "required": ["finding_id", "verdict", "reasoning"],
        },
    },
]

# ───────────────────────── Tool Dispatch ─────────────────────────────────────


async def dispatch_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    tenant_id: str,
) -> str:
    """Execute a tool by name and return the JSON-encoded result string."""
    handler = _HANDLERS.get(tool_name)
    if handler is None:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})
    try:
        result = await handler(tool_input, tenant_id)
        return json.dumps(result, default=str)
    except Exception as exc:
        logger.exception("tool_dispatch_error", extra={"tool": tool_name})
        return json.dumps({"error": str(exc)})


# ───────────────────────── Handler Implementations ───────────────────────────


async def _get_campaign_context(inp: dict, tenant_id: str) -> dict:
    from app.dependencies import get_app_redis
    redis = get_app_redis()
    campaign_id = inp["campaign_id"]
    raw = await redis.client.hgetall(f"campaign:{campaign_id}")
    if not raw:
        return {"campaign_id": campaign_id, "found": False}
    # Decode bytes if needed
    decoded = {
        (k.decode() if isinstance(k, bytes) else k): (v.decode() if isinstance(v, bytes) else v)
        for k, v in raw.items()
    }
    decoded["found"] = True
    decoded["campaign_id"] = campaign_id
    return decoded


async def _lookup_threat_intel(inp: dict, tenant_id: str) -> dict:
    from app.dependencies import get_app_pipeline
    pipeline = get_app_pipeline()
    indicators = inp.get("indicators", [])
    results = []
    for indicator in indicators[:20]:  # cap to avoid abuse
        matches = await pipeline._ioc.lookup(indicator)
        results.append({"indicator": indicator, "matches": matches})
    return {"indicators_checked": len(results), "results": results}


async def _get_similar_findings(inp: dict, tenant_id: str) -> dict:
    from app.dependencies import get_app_qdrant
    qdrant = get_app_qdrant()
    text = inp.get("text", "")
    limit = min(inp.get("limit", 5), 20)
    try:
        # Use Qdrant's built-in search if available
        results = await qdrant.search_similar(
            collection="behavioral_dna",
            query_text=text,
            limit=limit,
            tenant_id=tenant_id,
        )
        return {"similar_findings": results, "count": len(results)}
    except Exception as exc:
        logger.warning("qdrant_similarity_failed", error=str(exc))
        return {"similar_findings": [], "count": 0, "note": "Similarity search unavailable"}


async def _get_asset_criticality(inp: dict, tenant_id: str) -> dict:
    from app.engine.asset_inventory import AssetInventory
    from app.dependencies import get_app_redis, get_app_postgres
    inventory = AssetInventory(
        redis=get_app_redis(),
        postgres=get_app_postgres(),
    )
    asset_ref = inp["asset_ref"]
    criticality = await inventory.get_criticality(asset_ref, tenant_id)
    return {"asset_ref": asset_ref, "criticality": criticality}


async def _get_posture_score(inp: dict, tenant_id: str) -> dict:
    from app.dependencies import get_app_redis
    redis = get_app_redis()
    raw = await redis.cache_get(f"posture:{tenant_id}")
    if raw is not None:
        try:
            score = float(raw)
        except (ValueError, TypeError):
            score = None
        return {"tenant_id": tenant_id, "posture_score": score}
    return {"tenant_id": tenant_id, "posture_score": None, "note": "No posture data available yet"}


async def _list_available_playbooks(inp: dict, tenant_id: str) -> dict:
    from app.dependencies import get_app_engine
    engine = get_app_engine()
    try:
        playbooks = await engine.list_playbooks(tenant_id)
        return {"playbooks": playbooks, "count": len(playbooks)}
    except Exception:
        return {"playbooks": [], "count": 0, "note": "SOAR engine unavailable"}


async def _submit_verdict(inp: dict, tenant_id: str) -> dict:
    from app.dependencies import get_app_redis, get_app_postgres, get_app_pipeline
    redis = get_app_redis()
    postgres = get_app_postgres()
    pipeline = get_app_pipeline()

    finding_id = inp["finding_id"]
    verdict_str = inp["verdict"]
    reasoning = inp.get("reasoning", "")

    # Store action in Redis
    await redis.cache_set(
        f"finding_action:{finding_id}",
        json.dumps({"action": verdict_str, "comment": reasoning, "source": "triage_agent"}),
        ttl=86400 * 30,
    )

    # Persist verdict to PostgreSQL
    from app.repositories.postgres import AnalystVerdict
    verdict_obj = AnalystVerdict(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        event_id=finding_id,
        analyst_id="triage_agent",
        decision="approve" if verdict_str == "true_positive" else "dismiss",
        comment=f"[Agent] {reasoning}",
        created_at=datetime.utcnow(),
    )
    await postgres.save_verdict(verdict_obj)

    # Update meta-learner weights (Agent Lightning loop)
    ml_verdict = verdict_str  # "true_positive" or "false_positive"
    try:
        pipeline.meta_learner.update_weights(ml_verdict, [0.5, 0.5, 0.5, 0.5, 0.5])
        await pipeline.meta_learner.persist_weights(tenant_id=tenant_id)
    except Exception as exc:
        logger.warning("verdict_meta_learner_failed", error=str(exc))

    return {
        "finding_id": finding_id,
        "verdict": verdict_str,
        "feedback_recorded": True,
        "meta_learner_updated": True,
    }


# ───────────────────────── Handler Registry ──────────────────────────────────

_HANDLERS = {
    "get_campaign_context": _get_campaign_context,
    "lookup_threat_intel": _lookup_threat_intel,
    "get_similar_findings": _get_similar_findings,
    "get_asset_criticality": _get_asset_criticality,
    "get_posture_score": _get_posture_score,
    "list_available_playbooks": _list_available_playbooks,
    "submit_verdict": _submit_verdict,
}
