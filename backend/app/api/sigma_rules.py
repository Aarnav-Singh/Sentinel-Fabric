"""Sigma Rule Management APIs."""

import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml
from app.api.auth import require_admin, require_analyst, AuditLogger
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/sigma-rules", tags=["Sigma Rules"])

# Define the rules directory
RULES_DIR = Path(__file__).parent.parent / "engine" / "sigma_rules"

class MitreConfig(BaseModel):
    technique_id: str
    technique_name: str
    tactic: str

class SigmaRuleRequest(BaseModel):
    id: str
    name: str
    mitre: MitreConfig
    conditions: Dict[str, Any]
    confidence: float

def ensure_rules_dir():
    if not RULES_DIR.exists():
        RULES_DIR.mkdir(parents=True, exist_ok=True)

def find_rule_file(rule_id: str) -> Optional[Path]:
    """Helper to find a rule file by checking its contents or filename."""
    ensure_rules_dir()
    
    # Fast path: check if file named rule_id.yml exists
    fast_path = RULES_DIR / f"{rule_id}.yml"
    if fast_path.is_file():
        try:
            with open(fast_path, "r", encoding="utf-8") as f:
                content = yaml.safe_load(f)
            if content and content.get("id") == rule_id:
                return fast_path
        except Exception:
            pass

    # Slow path: iterate over all files
    for yml_file in RULES_DIR.glob("*.yml"):
        try:
            with open(yml_file, "r", encoding="utf-8") as f:
                content = yaml.safe_load(f)
            if content and content.get("id") == rule_id:
                return yml_file
        except Exception:
            continue
            
    return None

@router.get("/")
async def list_sigma_rules(claims: dict = Depends(require_analyst)):
    """List all custom Sigma rules. Requires analyst role."""
    ensure_rules_dir()
    rules = []
    for yml_file in RULES_DIR.glob("*.yml"):
        try:
            with open(yml_file, "r", encoding="utf-8") as f:
                content = yaml.safe_load(f)
            if content:
                rules.append(content)
        except Exception as e:
            logger.warning("failed_to_read_rule_file", file=str(yml_file), error=str(e))
    return rules

@router.get("/{rule_id}")
async def get_sigma_rule(rule_id: str, claims: dict = Depends(require_analyst)):
    """Get a specific Sigma rule by ID. Requires analyst role."""
    rule_file = find_rule_file(rule_id)
    if not rule_file:
        raise HTTPException(status_code=404, detail="Sigma rule not found")
        
    try:
        with open(rule_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_sigma_rule(rule: SigmaRuleRequest, request: Request, claims: dict = Depends(require_admin)):
    """Create a new Sigma rule. Admin only."""
    AuditLogger.log("sigma_rule_created", request=request, claims=claims, target=rule.id)
    if find_rule_file(rule.id):
        raise HTTPException(status_code=400, detail="Sigma rule with this ID already exists")
        
    ensure_rules_dir()
    # Save as rule_id.yml
    # Only alphanumeric and hyphens for filename to be safe
    safe_name = "".join([c if c.isalnum() or c == "-" else "_" for c in rule.id])
    file_path = RULES_DIR / f"{safe_name}.yml"
    
    data = rule.model_dump()
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False)
        logger.info("sigma_rule_created", rule_id=rule.id, file=str(file_path))
        return {"status": "success", "message": "Sigma rule created successfully", "rule": data}
    except Exception as e:
        logger.error("failed_to_create_rule", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to write rule file: {e}")

@router.put("/{rule_id}")
async def update_sigma_rule(rule_id: str, rule: SigmaRuleRequest, request: Request, claims: dict = Depends(require_admin)):
    """Update an existing Sigma rule. Admin only."""
    AuditLogger.log("sigma_rule_updated", request=request, claims=claims, target=rule_id)
    if rule_id != rule.id:
        raise HTTPException(status_code=400, detail="Path rule_id must match body rule.id")
        
    rule_file = find_rule_file(rule_id)
    if not rule_file:
        raise HTTPException(status_code=404, detail="Sigma rule not found")
        
    data = rule.model_dump()
    try:
        with open(rule_file, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False)
        logger.info("sigma_rule_updated", rule_id=rule.id, file=str(rule_file))
        return {"status": "success", "message": "Sigma rule updated successfully", "rule": data}
    except Exception as e:
        logger.error("failed_to_update_rule", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to write rule file: {e}")

@router.delete("/{rule_id}")
async def delete_sigma_rule(rule_id: str, request: Request, claims: dict = Depends(require_admin)):
    """Delete a Sigma rule. Admin only."""
    AuditLogger.log("sigma_rule_deleted", request=request, claims=claims, target=rule_id)
    rule_file = find_rule_file(rule_id)
    if not rule_file:
        raise HTTPException(status_code=404, detail="Sigma rule not found")
        
    try:
        os.remove(rule_file)
        logger.info("sigma_rule_deleted", rule_id=rule_id, file=str(rule_file))
        return {"status": "success", "message": "Sigma rule deleted successfully"}
    except Exception as e:
        logger.error("failed_to_delete_rule", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete rule file: {e}")
