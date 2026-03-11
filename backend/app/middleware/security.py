"""Security middleware for adding standard security headers."""
from __future__ import annotations

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to every response."""
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        
        # 1. HSTS (HTTP Strict Transport Security) - 1 year
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # 2. X-Content-Type-Options: nosniff
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # 3. X-Frame-Options: DENY (prevents clickjacking)
        response.headers["X-Frame-Options"] = "DENY"
        
        # 4. X-XSS-Protection: 1; mode=block
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # 5. Content-Security-Policy (CSP) - strict restrictive defaults
        # Note: In production, this should be tuned for the specific frontend needs.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        
        # 6. Referrer-Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
