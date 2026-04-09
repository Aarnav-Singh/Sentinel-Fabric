"""Admin API — User and role management CRUD.

All endpoints require the ``admin`` role.
"""
from __future__ import annotations

import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.dependencies import get_app_postgres
from app.middleware.auth import require_admin, AuditLogger

import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Request / Response Models ─────────────────────────
class UserCreateRequest(BaseModel):
    email: str
    password: str
    role: str = "viewer"
    display_name: str = ""
    tenant_id: str = "default"


class UserUpdateRoleRequest(BaseModel):
    role: str  # viewer | analyst | admin


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    display_name: str | None
    tenant_id: str
    is_active: bool
    mfa_enabled: bool


class ConnectorCreateRequest(BaseModel):
    name: str
    source_type: str
    connection_pattern: str  # "push" or "pull"
    config_json: str = "{}"
    tenant_id: str = "default"


class ConnectorResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    source_type: str
    connection_pattern: str
    config_json: str
    is_active: bool
    created_at: str | None


# ── Tenants (Phase 3) ─────────────────────────────────

class TenantCreateRequest(BaseModel):
    id: str  # e.g. "acme-corp"
    name: str # e.g. "Acme Corporation"
    admin_email: str
    admin_password: str

class TenantResponse(BaseModel):
    id: str
    name: str
    status: str
    created_at: str | None
    user_count: int = 0
    admin_count: int = 0


@router.get("/tenants", response_model=list[TenantResponse])
async def list_tenants(
    request: Request,
    claims: dict = Depends(require_admin),
):
    """List all tenants on the platform (admin-only)."""
    AuditLogger.log("admin_list_tenants", request=request, claims=claims)
    postgres = get_app_postgres()

    # Get real tenants from DB
    tenants = await postgres.list_tenants_from_db()
    
    # Pull all users and compute per-tenant stats
    all_users = await postgres.list_users(tenant_id=None)
    stats: dict[str, dict] = {}
    for u in all_users:
        tid = getattr(u, "tenant_id", "default")
        if tid not in stats:
            stats[tid] = {"user_count": 0, "admin_count": 0}
        stats[tid]["user_count"] += 1
        if u.role == "admin":
            stats[tid]["admin_count"] += 1

    result = []
    for t in tenants:
        tid = t.id
        s = stats.get(tid, {"user_count": 0, "admin_count": 0})
        result.append(
            TenantResponse(
                id=t.id,
                name=t.name,
                status=t.status,
                created_at=str(t.created_at) if t.created_at else None,
                user_count=s["user_count"],
                admin_count=s["admin_count"],
            )
        )
    return result


@router.post("/tenants", response_model=TenantResponse, status_code=201)
async def create_tenant(
    body: TenantCreateRequest,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Provision a new tenant and create its root admin user."""
    # Only super admins should create tenants. In this system 'admin' role on 'default' implies super_admin.
    if claims.get("tenant_id") != "default":
        raise HTTPException(status_code=403, detail="Only global admins can provision tenants.")

    postgres = get_app_postgres()
    
    existing = await postgres.get_tenant(body.id)
    if existing:
        raise HTTPException(status_code=409, detail="Tenant ID already in use.")

    # 1. Create Tenant
    from app.repositories.postgres import TenantRecord, UserRecord, ConnectorRecord
    from datetime import datetime
    import json

    tenant = TenantRecord(
        id=body.id,
        name=body.name,
        status="active",
        created_at=datetime.utcnow(),
    )
    await postgres.create_tenant(tenant)

    # 2. Create Root Admin User
    existing_user = await postgres.get_user_by_email(body.admin_email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Admin email already in use.")

    hashed = bcrypt.hashpw(body.admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    admin_user = UserRecord(
        id=str(uuid.uuid4()),
        tenant_id=body.id,
        email=body.admin_email,
        password_hash=hashed,
        role="admin",
        display_name=f"{body.name} Admin",
    )
    await postgres.create_user(admin_user)

    AuditLogger.log("admin_tenant_provisioned", request=request, claims=claims, target=body.id)
    logger.info("tenant_provisioned", tenant_id=body.id, admin=body.admin_email)

    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        status=tenant.status,
        created_at=str(tenant.created_at),
        user_count=1,
        admin_count=1,
    )



# ── Endpoints ─────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    request: Request,
    claims: dict = Depends(require_admin),
):
    """List all platform users (admin-only)."""
    AuditLogger.log("admin_list_users", request=request, claims=claims)
    postgres = get_app_postgres()
    tenant_id = claims.get("tenant_id", "default")

    users = await postgres.list_users(tenant_id)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            role=u.role,
            display_name=getattr(u, "display_name", None),
            tenant_id=u.tenant_id,
            is_active=u.is_active,
            mfa_enabled=getattr(u, "mfa_enabled", False),
        )
        for u in users
    ]


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreateRequest,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Create a new user account (admin-only)."""
    postgres = get_app_postgres()

    existing = await postgres.get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="User already exists.")

    if body.role not in ("viewer", "analyst", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be viewer, analyst, or admin.")

    from app.repositories.postgres import UserRecord

    hashed = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = UserRecord(
        id=str(uuid.uuid4()),
        tenant_id=body.tenant_id,
        email=body.email,
        password_hash=hashed,
        role=body.role,
        display_name=body.display_name or body.email,
    )
    await postgres.create_user(user)

    AuditLogger.log("admin_user_created", request=request, claims=claims, target=body.email)
    logger.info("admin_user_created", email=body.email, role=body.role)

    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        display_name=user.display_name,
        tenant_id=user.tenant_id,
        is_active=True,
        mfa_enabled=False,
    )


@router.patch("/users/{user_email}/role")
async def update_user_role(
    user_email: str,
    body: UserUpdateRoleRequest,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Change a user's role (admin-only)."""
    if body.role not in ("viewer", "analyst", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role.")

    postgres = get_app_postgres()
    user = await postgres.get_user_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    await postgres.update_user_role(email=user_email, role=body.role)

    AuditLogger.log(
        "admin_user_role_updated",
        request=request,
        claims=claims,
        target=user_email,
        detail=f"new_role={body.role}",
    )
    return {"status": "updated", "email": user_email, "role": body.role}


@router.patch("/users/{user_email}/deactivate")
async def deactivate_user(
    user_email: str,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Deactivate a user account (admin-only). Prevents future logins."""
    postgres = get_app_postgres()
    user = await postgres.get_user_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Prevent self-deactivation
    if user_email == claims.get("sub"):
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")

    await postgres.deactivate_user(email=user_email)

    AuditLogger.log("admin_user_deactivated", request=request, claims=claims, target=user_email)
    return {"status": "deactivated", "email": user_email}


@router.patch("/users/{user_email}/activate")
async def activate_user(
    user_email: str,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Re-activate a deactivated user account."""
    postgres = get_app_postgres()
    user = await postgres.get_user_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    await postgres.activate_user(email=user_email)

    AuditLogger.log("admin_user_activated", request=request, claims=claims, target=user_email)
    return {"status": "activated", "email": user_email}


# ── Connectors (Phase 3) ──────────────────────────────

@router.get("/connectors", response_model=list[ConnectorResponse])
async def list_connectors(
    request: Request,
    claims: dict = Depends(require_admin),
):
    """List all configured connectors for the tenant."""
    postgres = get_app_postgres()
    tenant_id = claims.get("tenant_id", "default")
    
    connectors = await postgres.list_connectors(tenant_id)
    return [
        ConnectorResponse(
            id=c.id,
            tenant_id=c.tenant_id,
            name=c.name,
            source_type=c.source_type,
            connection_pattern=c.connection_pattern,
            config_json=c.config_json,
            is_active=c.is_active,
            created_at=str(c.created_at) if c.created_at else None,
        )
        for c in connectors
    ]


@router.post("/connectors", response_model=ConnectorResponse, status_code=201)
async def create_connector(
    body: ConnectorCreateRequest,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Register a new data source connector."""
    postgres = get_app_postgres()
    
    # In a real multi-tenant scenario, restrict tenant_id to the user's tenant unless super_admin
    tenant_id = claims.get("tenant_id", "default")
    if claims.get("role") != "admin" and body.tenant_id != tenant_id:
        body.tenant_id = tenant_id

    from app.repositories.postgres import ConnectorRecord
    from datetime import datetime
    import json

    # Validate JSON
    try:
        json.loads(body.config_json)
    except ValueError:
        raise HTTPException(status_code=400, detail="config_json must be valid JSON.")

    connector = ConnectorRecord(
        id=str(uuid.uuid4()),
        tenant_id=body.tenant_id,
        name=body.name,
        source_type=body.source_type,
        connection_pattern=body.connection_pattern,
        config_json=body.config_json,
        created_at=datetime.utcnow(),
    )
    
    await postgres.save_connector(connector)
    AuditLogger.log("admin_connector_created", request=request, claims=claims, target=connector.id)
    logger.info("connector_created", id=connector.id, name=connector.name)
    
    return ConnectorResponse(
        id=connector.id,
        tenant_id=connector.tenant_id,
        name=connector.name,
        source_type=connector.source_type,
        connection_pattern=connector.connection_pattern,
        config_json=connector.config_json,
        is_active=connector.is_active,
        created_at=str(connector.created_at),
    )


@router.delete("/connectors/{connector_id}")
async def delete_connector(
    connector_id: str,
    request: Request,
    claims: dict = Depends(require_admin),
):
    """Delete a connector configuration."""
    postgres = get_app_postgres()
    tenant_id = claims.get("tenant_id", "default")
    
    # Needs a delete method in postgres.py
    # Fallback to direct sqlalchemy execution if not present
    from sqlalchemy import delete
    from app.repositories.postgres import ConnectorRecord
    
    async with postgres._AsyncSessionLocal() as session:
        stmt = delete(ConnectorRecord).where(
            ConnectorRecord.id == connector_id,
        )
        # If not global admin, restrict to tenant
        if claims.get("role") != "super_admin":
             stmt = stmt.where(ConnectorRecord.tenant_id == tenant_id)
        
        result = await session.execute(stmt)
        await session.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Connector not found or not owned by tenant.")
            
    AuditLogger.log("admin_connector_deleted", request=request, claims=claims, target=connector_id)
    logger.info("connector_deleted", id=connector_id)
    return {"status": "deleted", "id": connector_id}
