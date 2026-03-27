"""HashiCorp Vault Service.

Provides secure credential fetching for SOAR integrations, replacing
hardcoded environment variables with dynamic / cached Vault reads.
"""
import time
import logging
from typing import Optional, Dict

import hvac
from app.config import settings

logger = logging.getLogger(__name__)

class VaultService:
    """Manages secure access to HashiCorp Vault.
    
    Implements an in-memory cache with TTL (rotation_interval)
    to minimize API calls to Vault for high-frequency SOAR actions.
    """
    
    def __init__(self) -> None:
        self.url = settings.vault_url
        self.token = settings.vault_token
        self.mount_point = settings.vault_mount_point
        self.path = settings.vault_path
        self._client: Optional[hvac.Client] = None
        
        # Secret cache: { "secret_key": (value, expiration_time_ms) }
        self._cache: Dict[str, tuple[str, float]] = {}
        
        if self.is_configured():
            self._client = hvac.Client(url=self.url, token=self.token)
            logger.info(f"VaultService initialized for {self.url} at path {self.mount_point}/{self.path}")

    def is_configured(self) -> bool:
        """Return True if Vault URL and Token are provided."""
        return bool(self.url and self.token)

    def get_secret(self, key: str) -> Optional[str]:
        """Fetch a secret by its key from the configured Vault path.
        
        Reads from cache if valid. If not, fetches from Vault and caches it.
        """
        if not self.is_configured() or not self._client:
            return None
            
        now = time.time()
        
        # 1. Check cache
        if key in self._cache:
            val, exp = self._cache[key]
            if now < exp:
                return val
                
        # 2. Fetch from Vault
        try:
            # kv v2 read
            read_response = self._client.secrets.kv.v2.read_secret_version(
                path=self.path,
                mount_point=self.mount_point,
            )
            
            secret_data = read_response.get("data", {}).get("data", {})
            value = secret_data.get(key)
            
            if value:
                # Cache it
                ttl = settings.vault_rotation_interval
                self._cache[key] = (value, now + ttl)
                return value
                
            logger.warning(f"Secret key '{key}' not found in Vault path {self.path}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to fetch secret '{key}' from Vault: {e}")
            return None

# Global instance
vault_service = VaultService()
