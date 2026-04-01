from fastapi import APIRouter, Depends
from app.services.vault_service import vault_service
from app.middleware.auth import require_viewer

router = APIRouter(prefix="/vault", tags=["Vault"])

@router.get("/status")
async def get_vault_status(claims: dict = Depends(require_viewer)) -> dict:
    """Return HashiCorp Vault integration status.
    
    Requires at minimum ``viewer`` role — prevents leaking infrastructure
    details to unauthenticated callers.
    """
    configured = vault_service.is_configured()
    status = "connected" if configured else "unconfigured"
    
    return {
        "configured": configured,
        "status": status,
        "url": vault_service.url if configured else None,
        "mount_point": vault_service.mount_point,
    }
