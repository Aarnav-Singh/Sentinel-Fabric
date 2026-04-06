"""MITRE ATT&CK Coverage Service — Addendum A2.

Computes what percentage of MITRE ATT&CK techniques are covered by
active Sigma rules in the engine.  This closes audit issue M-07
(blank MITRE section in Compliance page) and mirrors the capability
that Elastic Security surfaces in its coverage matrix view.

Coverage is computed by:
  1. Scanning all .yml Sigma rules in the engine sigma_rules directory.
  2. Extracting attack.* tags from each rule's `tags` field.
  3. Aggregating by tactic and technique.
  4. Comparing against the canonical MITRE ATT&CK v14 technique list.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml
import structlog

logger = structlog.get_logger(__name__)

# ── Canonical MITRE ATT&CK v14 tactic mapping ───────────────────────────────
# Tactic ID → display name.  Each technique ID maps to exactly one tactic.
TACTIC_MAP: dict[str, str] = {
    "TA0001": "Initial Access",
    "TA0002": "Execution",
    "TA0003": "Persistence",
    "TA0004": "Privilege Escalation",
    "TA0005": "Defense Evasion",
    "TA0006": "Credential Access",
    "TA0007": "Discovery",
    "TA0008": "Lateral Movement",
    "TA0009": "Collection",
    "TA0010": "Exfiltration",
    "TA0011": "Command and Control",
    "TA0040": "Impact",
    "TA0042": "Resource Development",
    "TA0043": "Reconnaissance",
}

# Tactic slug → TA ID (parsed from Sigma rule tags like attack.initial_access)
TACTIC_SLUG_TO_ID: dict[str, str] = {
    "initial_access": "TA0001",
    "execution": "TA0002",
    "persistence": "TA0003",
    "privilege_escalation": "TA0004",
    "defense_evasion": "TA0005",
    "credential_access": "TA0006",
    "discovery": "TA0007",
    "lateral_movement": "TA0008",
    "collection": "TA0009",
    "exfiltration": "TA0010",
    "command_and_control": "TA0011",
    "impact": "TA0040",
    "resource_development": "TA0042",
    "reconnaissance": "TA0043",
}

# Regex for technique IDs: T1059, T1059.001, etc.
_TECHNIQUE_RE = re.compile(r"^[Tt](\d{4})(?:\.(\d{3}))?$")

RULES_DIR = Path(__file__).parent.parent / "engine" / "sigma_rules"


def _load_all_rules() -> list[dict[str, Any]]:
    """Load all YAML Sigma rules from the engine sigma_rules directory."""
    if not RULES_DIR.exists():
        logger.warning("sigma_rules_dir_missing", path=str(RULES_DIR))
        return []

    rules: list[dict[str, Any]] = []
    for yml_file in RULES_DIR.glob("*.yml"):
        try:
            with open(yml_file, "r", encoding="utf-8") as f:
                content = yaml.safe_load(f)
            if content and isinstance(content, dict):
                rules.append(content)
        except Exception as exc:
            logger.warning("sigma_rule_load_failed", file=str(yml_file), error=str(exc))
    return rules


def compute_coverage() -> dict[str, Any]:
    """Compute MITRE ATT&CK coverage from active Sigma rules.

    Returns a dict structured as::

        {
          "summary": {
            "total_techniques": int,
            "covered_techniques": int,
            "coverage_pct": float,
            "total_tactics": int,
            "covered_tactics": int
          },
          "by_tactic": {
            "TA0001": {
              "name": "Initial Access",
              "techniques": {
                "T1078": {
                  "covered": true,
                  "sub_techniques_covered": ["T1078.003"],
                  "rules": ["rule-id-1"]
                }
              }
            }
          }
        }
    """
    rules = _load_all_rules()

    # Map: technique_id → set of rule IDs covering it
    technique_to_rules: dict[str, set[str]] = {}
    # Map: tactic_slug → set of technique IDs detected in that tactic
    tactic_to_techniques: dict[str, set[str]] = {}

    for rule in rules:
        rule_id = rule.get("id", "unknown")
        tags: list[str] = rule.get("tags", []) or []

        techniques_in_rule: list[str] = []
        tactic_slugs_in_rule: list[str] = []

        for tag in tags:
            tag_lower = str(tag).lower()

            # Match technique tags: attack.t1059, attack.t1059.001
            if tag_lower.startswith("attack.t"):
                suffix = tag[len("attack."):]  # e.g. "T1059" or "T1059.001"
                m = _TECHNIQUE_RE.match(suffix)
                if m:
                    base = f"T{m.group(1)}"
                    sub = f".{m.group(2)}" if m.group(2) else ""
                    normalized = f"{base}{sub}"
                    techniques_in_rule.append(normalized)
                    if normalized not in technique_to_rules:
                        technique_to_rules[normalized] = set()
                    technique_to_rules[normalized].add(rule_id)

            # Match tactic tags: attack.initial_access, attack.discovery
            elif tag_lower.startswith("attack.") and not tag_lower.startswith("attack.t"):
                slug = tag_lower[len("attack."):]
                if slug in TACTIC_SLUG_TO_ID:
                    tactic_slugs_in_rule.append(slug)

        # Associate techniques with their discovered tactics
        for slug in tactic_slugs_in_rule:
            if slug not in tactic_to_techniques:
                tactic_to_techniques[slug] = set()
            for tech in techniques_in_rule:
                tactic_to_techniques[slug].add(tech)

    # Build per-tactic output
    by_tactic: dict[str, Any] = {}
    covered_tactic_ids: set[str] = set()

    for slug, ta_id in TACTIC_SLUG_TO_ID.items():
        tactic_name = TACTIC_MAP[ta_id]
        techniques_in_tactic = tactic_to_techniques.get(slug, set())

        technique_details: dict[str, Any] = {}
        for tech_id in sorted(techniques_in_tactic):
            # Separate sub-techniques
            base_id = tech_id.split(".")[0]
            covering_rules = list(technique_to_rules.get(tech_id, set()))

            if "." not in tech_id:
                # Base technique
                if base_id not in technique_details:
                    technique_details[base_id] = {
                        "covered": True,
                        "sub_techniques_covered": [],
                        "rules": [],
                    }
                technique_details[base_id]["rules"] = list(
                    set(technique_details[base_id]["rules"]) | set(covering_rules)
                )
            else:
                # Sub-technique — ensure base exists
                if base_id not in technique_details:
                    technique_details[base_id] = {
                        "covered": False,  # base itself may not be covered
                        "sub_techniques_covered": [],
                        "rules": [],
                    }
                technique_details[base_id]["sub_techniques_covered"].append(tech_id)
                technique_details[base_id]["rules"] = list(
                    set(technique_details[base_id]["rules"]) | set(covering_rules)
                )
                # If a sub-technique is covered, mark base as covered too
                technique_details[base_id]["covered"] = True

        if technique_details:
            covered_tactic_ids.add(ta_id)

        by_tactic[ta_id] = {
            "name": tactic_name,
            "slug": slug,
            "techniques": technique_details,
        }

    # Summary statistics
    all_covered_techniques = {k for k, v in technique_to_rules.items() if v}
    # Only count base techniques (no sub-technique de-duplication for the pct)
    base_covered = {t.split(".")[0] for t in all_covered_techniques}

    # MITRE ATT&CK v14 has 196 base techniques (enterprise matrix)
    TOTAL_ATT_AND_CK_TECHNIQUES = 196

    coverage_pct = round(len(base_covered) / TOTAL_ATT_AND_CK_TECHNIQUES * 100, 1)

    return {
        "summary": {
            "total_techniques": TOTAL_ATT_AND_CK_TECHNIQUES,
            "covered_techniques": len(base_covered),
            "coverage_pct": coverage_pct,
            "total_sigma_rules": len(rules),
            "total_tactics": len(TACTIC_MAP),
            "covered_tactics": len(covered_tactic_ids),
        },
        "by_tactic": by_tactic,
    }
