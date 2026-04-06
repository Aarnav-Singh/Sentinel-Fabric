"""UQL Natural Language Translator — Phase 3.

Translates analyst natural-language queries into valid UQL using the Anthropic API.
The LLM is given a precise grammar description and 7 few-shot examples.

Usage::

    from app.engine.uql.nl_translator import translate_nl_to_uql

    uql = await translate_nl_to_uql(
        "find lateral movement after credential access within 10 minutes",
        api_key="sk-ant-..."
    )
    # -> 'sequence on src_ip [tactic = "credential-access", tactic = "lateral-movement"] maxspan=10m'
"""
from __future__ import annotations

import re
import structlog

logger = structlog.get_logger(__name__)

# ── Few-shot examples for the LLM prompt ─────────────────────────────────────
_EXAMPLES = [
    (
        "high confidence alerts with lateral movement tactics",
        'ml_score > 0.7 and tactic = "lateral-movement"',
    ),
    (
        "find PowerShell download activity followed by network connections within 5 minutes",
        'sequence on src_ip [tactic = "execution", tactic = "command-and-control"] maxspan=5m',
    ),
    (
        "events similar to cobalt strike beacon with high ml score",
        'similar("cobalt strike beacon", threshold=0.82) and ml_score > 0.65',
    ),
    (
        "critical crowdstrike alerts from the last hour",
        'source_type = "crowdstrike" and severity = "critical" and ml_score > 0.8',
    ),
    (
        "reconnaissance followed by credential access and lateral movement within 15 minutes",
        'sequence on src_ip [tactic = "discovery", tactic = "credential-access", tactic = "lateral-movement"] maxspan=15m',
    ),
    (
        "find events that look like ransomware deployment",
        'similar("ransomware file encryption", threshold=0.80) and tactic = "impact"',
    ),
    (
        "show me all exfiltration events with confidence above 70 percent",
        'tactic = "exfiltration" and ml_score > 0.7',
    ),
]

_SYSTEM_PROMPT = """\
You are a UQL (UMBRIX Query Language) translator. Convert analyst natural-language queries
into valid UQL. Return ONLY the UQL string — no explanation, no backticks, no markdown.

## UQL Grammar Reference (simplified)
- ML score filter: `ml_score COMPARATOR NUMBER`  (COMPARATOR: >, <, >=, <=, =, !=)
- Tactic filter: `tactic = "TACTIC_NAME"` (MITRE ATT&CK: discovery, credential-access,
  lateral-movement, execution, persistence, privilege-escalation, defense-evasion,
  command-and-control, exfiltration, impact, collection, reconnaissance, initial-access)
- Source type filter: `source_type = "NAME"` (e.g. crowdstrike, okta, wazuh)
- Severity filter: `severity = "critical|high|medium|low"`
- Semantic similarity: `similar("query text", threshold=0.85)` (0.0–1.0)
- Sequence: `sequence on FIELD [filter1, filter2, ...] maxspan=TIME`
  where TIME is like 5m, 15m, 1h, 24h
- Combine with `and` operator

## Examples
"""

def _build_prompt(examples: list[tuple[str, str]], nl_query: str) -> str:
    ex_text = "\n".join(
        f'Natural language: "{nl}"\nUQL: {uql}\n'
        for nl, uql in examples
    )
    return f"{_SYSTEM_PROMPT}{ex_text}\nNatural language: \"{nl_query}\"\nUQL:"


async def translate_nl_to_uql(nl_query: str, api_key: str) -> str:
    """Translate a natural-language security query into UQL.

    Args:
        nl_query: Free-text analyst query.
        api_key: Anthropic API key.

    Returns:
        UQL string ready for ``UQLCompiler().compile()``.
        On failure, returns a safe fallback UQL string.
    """
    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)
        prompt = _build_prompt(_EXAMPLES, nl_query)

        message = await client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        uql_raw = message.content[0].text.strip()

        # Strip backticks / markdown code fences if LLM wraps output
        uql_clean = re.sub(r"^```[a-z]*\n?", "", uql_raw, flags=re.MULTILINE)
        uql_clean = re.sub(r"\n?```$", "", uql_clean, flags=re.MULTILINE)
        uql_clean = uql_clean.strip()

        logger.info("nl_to_uql_translated", nl=nl_query, uql=uql_clean)
        return uql_clean

    except Exception as exc:
        logger.warning("nl_to_uql_failed", nl=nl_query, error=str(exc))
        # Safe fallback: return a high-confidence catch-all
        return "ml_score > 0.7"
