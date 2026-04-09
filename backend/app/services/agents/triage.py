"""Triage Agent — Anthropic Claude with platform tool use.

Replaces the stateless OpenAI/LangGraph triage with a tool-capable Claude
agent that queries platform services, gathers evidence, and submits verdicts
to close the Agent Lightning feedback loop.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

import anthropic

from app.config import settings
from app.services.agents.tools import TOOL_DEFINITIONS, dispatch_tool

logger = logging.getLogger(__name__)

# ───────────────────────── Data Classes ──────────────────────────────────────

@dataclass
class TriageResult:
    """Structured output from the triage agent."""
    severity: str = "Unknown"
    reasoning: str = ""
    recommended_actions: list[str] = field(default_factory=list)
    playbook_id: str | None = None
    verdict: str | None = None  # "true_positive" / "false_positive" if agent submitted
    confidence: float = 0.0     # 0.0 to 1.0 assessment
    tool_calls_made: list[str] = field(default_factory=list)

    raw_response: str = ""


# ───────────────────────── System Prompt ─────────────────────────────────────

SYSTEM_PROMPT = """You are the primary triage analyst for an enterprise security operations center (SOC) powered by the UMBRIX platform.

Your role:
- Analyze security findings presented to you with full context from platform tools.
- ALWAYS use tools before concluding. Never guess or assume — gather evidence first.
- Cite specific evidence from tool results in your reasoning.
- When a campaign_id is present, call get_campaign_context first.
- Look up threat intel for any IPs, domains, or hashes in the finding.
- Check asset criticality for affected hosts.
- Review similar past findings to understand historical patterns.
- After gathering context, submit a verdict via submit_verdict to close the feedback loop.

Output your final assessment as a JSON object with these fields:
- "severity": one of "Critical", "High", "Medium", "Low", "Informational"
- "reasoning": 2-4 sentences citing tool evidence
- "confidence": float between 0.0 and 1.0
- "recommended_actions": list of concrete next steps

- "playbook_id": SOAR playbook ID to trigger (null if none)

NEVER hallucinate indicator data. If a tool returns no results, say so explicitly."""


# ───────────────────────── Model Selection ───────────────────────────────────

def _select_model(finding: dict[str, Any]) -> str:
    """Two-tier model selection based on finding severity signals."""
    meta_score = finding.get("meta_score", 0)
    kill_chain = finding.get("kill_chain_stage", "").lower()

    # High-stakes findings get the deep model
    deep_stages = {"execution", "lateral_movement", "exfiltration", "impact", "command_and_control"}
    threshold = settings.anthropic_deep_threshold_score

    if meta_score > threshold or kill_chain in deep_stages:
        return settings.anthropic_model_deep

    return settings.anthropic_model_triage


# ───────────────────────── Core Triage Loop ──────────────────────────────────

async def run_triage(finding: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    """Run the Claude triage agent on a security finding.

    Implements the full tool-use loop:
    1. Send finding + system prompt to Claude
    2. While Claude requests tools → dispatch → feed results back
    3. Parse final structured output
    4. Return TriageResult as dict

    Args:
        finding: The security finding dict (from pipeline or analyst).
        tenant_id: Tenant scope for all tool calls.

    Returns:
        Dict with severity, reasoning, recommended_actions, and metadata.
    """
    if getattr(settings, "llm_backend", "anthropic") == "llama_cpp":
        return await _run_triage_llama_cpp(finding, tenant_id)

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = _select_model(finding)

    # Build initial messages
    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": (
                f"Triage the following security finding. Gather context using "
                f"your available tools before making a determination.\n\n"
                f"```json\n{json.dumps(finding, indent=2, default=str)}\n```"
            ),
        }
    ]

    result = TriageResult()
    max_tool_rounds = 10  # Safety cap to prevent infinite loops

    for round_num in range(max_tool_rounds):
        try:
            response = await client.messages.create(
                model=model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                tools=TOOL_DEFINITIONS,
                messages=messages,
            )
        except anthropic.APIError as exc:
            logger.error("anthropic_api_error", error=str(exc), model=model)
            result.reasoning = f"Triage API unavailable: {exc}"
            return _to_dict(result)

        # Process response content blocks
        if response.stop_reason == "tool_use":
            # Claude wants to call tools
            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            assistant_content = response.content

            # Add assistant message
            messages.append({"role": "assistant", "content": assistant_content})

            # Dispatch each tool and collect results
            tool_results = []
            for block in tool_use_blocks:
                result.tool_calls_made.append(block.name)
                logger.info(
                    "triage_tool_call",
                    tool=block.name,
                    finding_id=finding.get("id", "unknown"),
                )
                output = await dispatch_tool(block.name, block.input, tenant_id)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })

            messages.append({"role": "user", "content": tool_results})

        elif response.stop_reason == "end_turn":
            # Claude is done — extract final text
            text_blocks = [b for b in response.content if b.type == "text"]
            raw_text = "\n".join(b.text for b in text_blocks)
            result.raw_response = raw_text
            _parse_final_response(raw_text, result)
            break
        else:
            # Unexpected stop reason
            logger.warning("unexpected_stop_reason", reason=response.stop_reason)
            text_blocks = [b for b in response.content if b.type == "text"]
            if text_blocks:
                result.raw_response = text_blocks[0].text
                _parse_final_response(text_blocks[0].text, result)
            break
    else:
        result.reasoning = "Triage agent exceeded maximum tool rounds."

    logger.info(
        "triage_complete",
        severity=result.severity,
        tools_used=len(result.tool_calls_made),
        model=model,
        finding_id=finding.get("id", "unknown"),
    )

    return _to_dict(result)


async def _run_triage_llama_cpp(finding: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    """Run the Triage Agent loop using Llama.cpp with OpenAI-compatible endpoint."""
    import httpx
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.replace("Claude", "the system")},
        {"role": "user", "content": f"Triage the following security finding. Gather context using your available tools before making a determination.\n\n```json\n{json.dumps(finding, indent=2, default=str)}\n```"}
    ]
    
    result = TriageResult()
    max_tool_rounds = 10
    
    # Map Anthropic schemas to OpenAI tool schemas
    openai_tools = []
    for t in TOOL_DEFINITIONS:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": t.get("input_schema", {})
            }
        })

    for round_num in range(max_tool_rounds):
        try:
            async with httpx.AsyncClient() as http_client:
                resp = await http_client.post(
                    f"{settings.llama_cpp_base_url.rstrip('/')}/chat/completions",
                    json={
                        "model": settings.llama_cpp_model,
                        "messages": messages,
                        "temperature": settings.llama_cpp_temperature,
                        "max_tokens": settings.llama_cpp_max_tokens,
                        "tools": openai_tools,
                        "tool_choice": "auto"
                    },
                    timeout=60.0,
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.error("llama_cpp_api_error", error=str(exc))
            result.reasoning = f"Llama.cpp API unavailable: {exc}"
            return _to_dict(result)

        choice = data["choices"][0]
        message = choice["message"]
        messages.append(message)
        
        if message.get("tool_calls"):
            for tc in message["tool_calls"]:
                func = tc["function"]
                name = func["name"]
                args_str = func["arguments"]
                
                try:
                    args = json.loads(args_str)
                except Exception:
                    args = {}
                    
                result.tool_calls_made.append(name)
                logger.info("triage_tool_call", tool=name, finding_id=finding.get("id"))
                
                output = await dispatch_tool(name, args, tenant_id)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": output
                })
        else:
            # End of turn
            raw_text = message.get("content", "")
            if raw_text:
                result.raw_response = raw_text
                _parse_final_response(raw_text, result)
            break
    else:
        result.reasoning = "Triage agent exceeded maximum tool rounds."

    logger.info("triage_complete", severity=result.severity, tools_used=len(result.tool_calls_made), model=settings.llama_cpp_model)
    return _to_dict(result)

# ───────────────────────── Helpers ───────────────────────────────────────────

def _parse_final_response(text: str, result: TriageResult) -> None:
    """Extract structured JSON from Claude's final text response."""
    # Try to find JSON in the response
    try:
        # Look for JSON block
        if "```json" in text:
            json_str = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            json_str = text.split("```")[1].split("```")[0].strip()
        elif "{" in text:
            # Find the outermost JSON object
            start = text.index("{")
            depth = 0
            end = start
            for i, ch in enumerate(text[start:], start):
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            json_str = text[start:end]
        else:
            result.reasoning = text[:500]
            return

        parsed = json.loads(json_str)
        result.severity = parsed.get("severity", result.severity)
        result.confidence = float(parsed.get("confidence", result.confidence))
        result.reasoning = parsed.get("reasoning", text[:500])

        result.recommended_actions = parsed.get("recommended_actions", [])
        result.playbook_id = parsed.get("playbook_id")
    except (json.JSONDecodeError, ValueError, IndexError):
        # Fallback: use raw text as reasoning
        result.reasoning = text[:500]


def _to_dict(result: TriageResult) -> dict[str, Any]:
    """Convert TriageResult to API response dict."""
    return {
        "severity": result.severity,
        "confidence": result.confidence,
        "reasoning": result.reasoning,

        "recommended_actions": result.recommended_actions,
        "playbook_id": result.playbook_id,
        "verdict": result.verdict,
        "tool_calls_made": result.tool_calls_made,
        "model_used": "claude",
    }
