"""Authentication API — login endpoint and auth re-exports.

Per @cc-skill-security-review: authorization checks before sensitive ops.
Per @auth-implementation-patterns: centralized auth module for re-export.
"""
from __future__ import annotations
import bcrypt
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from app.middleware.auth import (
    create_access_token,
    require_auth,
    require_role,
    require_admin,
    require_analyst,
    require_viewer,
    Role,
    AuditLogger,
)
from app.dependencies import get_app_postgres, get_app_ratelimiter
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ── Bridge dependency for existing route imports ──────────
# settings.py, sigma_rules.py, soar.py import `get_current_user`
# from this module. This bridges to the middleware's `require_auth`.

async def get_current_user(claims: dict = Depends(require_auth)) -> dict:
    """FastAPI dependency — validates JWT and returns claims dict.

    Acts as the public interface that API routes import.
    Returns the decoded JWT claims (sub, tenant_id, role, etc.).
    """
    return claims


class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str

@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    request: Request,
    limiter = Depends(get_app_ratelimiter)
):
    await limiter.check_rate_limit(request, limit=5, window_seconds=60)
    postgres = get_app_postgres()
    user = await postgres.get_user_by_email(req.username)

    if not user or not bcrypt.checkpw(req.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        AuditLogger.log("login_failed", request=request, detail=f"user={req.username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        AuditLogger.log("login_disabled", request=request, detail=f"user={req.username}")
        raise HTTPException(status_code=401, detail="User account is disabled")

    token = create_access_token(
        subject=user.email,
        tenant_id=user.tenant_id,
        role=user.role,
    )
    AuditLogger.log(
        "login_success",
        request=request,
        claims={"sub": user.email, "tenant_id": user.tenant_id, "role": user.role},
    )
    return LoginResponse(access_token=token, tenant_id=user.tenant_id)

