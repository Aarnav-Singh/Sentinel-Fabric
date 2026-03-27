from fastapi import APIRouter
from app.services.vault_service import vault_service

router = APIRouter(prefix="/vault", tags=["Vault"])

@router.get("/status")
async def get_vault_status() -> dict:
    """Return HashiCorp Vault integration status."""
    configured = vault_service.is_configured()
    status = "connected" if configured else "unconfigured"
    
    # Optional: check if token is valid by doing a lightweight test call
    # if configured and vault_service._client:
    #     try:
    #         vault_service._client.is_authenticated()
    #     except Exception:
    #         status = "disconnected"
            
    return {
        "configured": configured,
        "status": status,
        "url": vault_service.url if configured else None,
        "mount_point": vault_service.mount_point,
    }
