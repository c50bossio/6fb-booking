"""
Secure CORS Configuration Module
Simplifies and secures CORS configuration with strict validation
Replaces complex environment-dependent CORS logic with secure defaults
"""

import os
import logging
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class SecureCORSManager:
    """
    Secure CORS configuration manager with strict validation and allowlisting.
    """
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development").lower()
        self.enable_development_mode = os.getenv("ENABLE_DEVELOPMENT_MODE", "true").lower() == "true"
        
    def get_allowed_origins(self) -> List[str]:
        """
        Get validated allowed origins based on environment.
        Uses strict allowlisting approach for maximum security.
        """
        if self.environment == "production":
            return self._get_production_origins()
        elif self.environment == "staging":
            return self._get_staging_origins()
        else:
            return self._get_development_origins()
    
    def _get_production_origins(self) -> List[str]:
        """Get production origins with strict validation."""
        production_origins_env = os.getenv("PRODUCTION_ORIGINS", "")
        
        if not production_origins_env:
            logger.error("PRODUCTION_ORIGINS not set - using secure defaults")
            return [
                "https://bookedbarber.com",
                "https://app.bookedbarber.com",
                "https://www.bookedbarber.com"
            ]
        
        origins = []
        for origin in production_origins_env.split(","):
            origin = origin.strip()
            if self._validate_production_origin(origin):
                origins.append(origin)
            else:
                logger.error(f"Invalid production origin rejected: {origin}")
        
        if not origins:
            raise ValueError("No valid production origins configured")
        
        logger.info(f"Configured {len(origins)} production origins")
        return origins
    
    def _get_staging_origins(self) -> List[str]:
        """Get staging origins with validation."""
        staging_origins_env = os.getenv("STAGING_ORIGINS", "")
        
        if not staging_origins_env:
            logger.warning("STAGING_ORIGINS not set - using defaults")
            return [
                "https://staging.bookedbarber.com",
                "https://staging-app.bookedbarber.com"
            ]
        
        origins = []
        for origin in staging_origins_env.split(","):
            origin = origin.strip()
            if self._validate_staging_origin(origin):
                origins.append(origin)
            else:
                logger.warning(f"Invalid staging origin rejected: {origin}")
        
        # Add deployment platform URLs if they exist
        origins.extend(self._get_deployment_urls())
        
        return list(set(origins))  # Remove duplicates
    
    def _get_development_origins(self) -> List[str]:
        """Get development origins with basic validation."""
        if not self.enable_development_mode:
            logger.warning("Development mode disabled - using minimal origins")
            return ["http://localhost:3000"]
        
        dev_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
        origins = []
        
        for origin in dev_origins_env.split(","):
            origin = origin.strip()
            if self._validate_development_origin(origin):
                origins.append(origin)
            else:
                logger.warning(f"Invalid development origin rejected: {origin}")
        
        # Add deployment platform URLs for development testing
        origins.extend(self._get_deployment_urls())
        
        return list(set(origins))  # Remove duplicates
    
    def _validate_production_origin(self, origin: str) -> bool:
        """Validate production origin with strict rules."""
        try:
            parsed = urlparse(origin)
            
            # Must use HTTPS
            if parsed.scheme != "https":
                return False
            
            # Must have valid hostname
            if not parsed.hostname:
                return False
            
            # No localhost in production
            if "localhost" in parsed.hostname or "127.0.0.1" in parsed.hostname:
                return False
            
            # Must be a valid domain format
            if not self._is_valid_domain(parsed.hostname):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Origin validation error: {e}")
            return False
    
    def _validate_staging_origin(self, origin: str) -> bool:
        """Validate staging origin with moderate rules."""
        try:
            parsed = urlparse(origin)
            
            # Prefer HTTPS but allow HTTP for staging
            if parsed.scheme not in ["https", "http"]:
                return False
            
            # Must have valid hostname
            if not parsed.hostname:
                return False
            
            # Allow localhost for staging testing
            if "localhost" in parsed.hostname or "127.0.0.1" in parsed.hostname:
                return parsed.scheme == "http"  # Only HTTP for localhost
            
            # Must be a valid domain format
            if not self._is_valid_domain(parsed.hostname):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Staging origin validation error: {e}")
            return False
    
    def _validate_development_origin(self, origin: str) -> bool:
        """Validate development origin with relaxed rules."""
        try:
            parsed = urlparse(origin)
            
            # Allow HTTP and HTTPS
            if parsed.scheme not in ["http", "https"]:
                return False
            
            # Must have hostname
            if not parsed.hostname:
                return False
            
            # Allow localhost and valid domains
            if "localhost" in parsed.hostname or "127.0.0.1" in parsed.hostname:
                return True
            
            if self._is_valid_domain(parsed.hostname):
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Development origin validation error: {e}")
            return False
    
    def _is_valid_domain(self, hostname: str) -> bool:
        """Validate domain name format."""
        if not hostname:
            return False
        
        # Basic domain validation
        if len(hostname) > 253:
            return False
        
        # Must contain at least one dot for domain
        if "." not in hostname:
            return False
        
        # Basic character validation
        import re
        pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9-]{1,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{1,61}[a-zA-Z0-9])?)*$'
        return re.match(pattern, hostname) is not None
    
    def _get_deployment_urls(self) -> List[str]:
        """Get deployment platform URLs with validation."""
        urls = []
        
        # Railway
        railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN")
        if railway_url and self.environment != "production":
            url = f"https://{railway_url}"
            if self._validate_deployment_url(url):
                urls.append(url)
        
        # Vercel
        vercel_url = os.getenv("VERCEL_URL")
        if vercel_url and self.environment != "production":
            url = f"https://{vercel_url}"
            if self._validate_deployment_url(url):
                urls.append(url)
        
        # Render
        render_url = os.getenv("RENDER_EXTERNAL_URL")
        if render_url and self.environment != "production":
            if self._validate_deployment_url(render_url):
                urls.append(render_url)
        
        return urls
    
    def _validate_deployment_url(self, url: str) -> bool:
        """Validate deployment platform URL."""
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in ["https", "http"] and
                parsed.hostname and
                self._is_valid_domain(parsed.hostname)
            )
        except:
            return False
    
    def get_cors_config(self) -> Dict[str, Any]:
        """
        Get complete CORS configuration with security headers.
        """
        allowed_origins = self.get_allowed_origins()
        
        # Security headers for CORS
        allowed_headers = [
            "Accept",
            "Accept-Language", 
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRFToken",
            "Cache-Control"
        ]
        
        # Add MFA headers only in secure environments
        if self.environment in ["staging", "production"]:
            allowed_headers.extend([
                "X-Device-Fingerprint",
                "X-Trust-Token",
                "X-MFA-Token"
            ])
        
        # Production-specific security
        if self.environment == "production":
            allowed_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
            max_age = 3600  # 1 hour for production
        else:
            allowed_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
            max_age = 86400  # 24 hours for development/staging
        
        config = {
            "allow_origins": allowed_origins,
            "allow_credentials": True,
            "allow_methods": allowed_methods,
            "allow_headers": allowed_headers,
            "expose_headers": [
                "Content-Length", 
                "Content-Range", 
                "X-MFA-Required", 
                "X-User-ID",
                "X-Security-Alert"
            ],
            "max_age": max_age
        }
        
        logger.info(f"CORS configured for {self.environment} with {len(allowed_origins)} origins")
        return config

def get_secure_cors_middleware() -> tuple:
    """
    Get secure CORS middleware configuration.
    
    Returns:
        Tuple of (CORSMiddleware, config_dict) for use with FastAPI
    """
    cors_manager = SecureCORSManager()
    config = cors_manager.get_cors_config()
    
    return CORSMiddleware, config

def validate_cors_origin(origin: str, environment: str = None) -> bool:
    """
    Validate if an origin is allowed for the current environment.
    
    Args:
        origin: Origin URL to validate
        environment: Override environment (defaults to current)
        
    Returns:
        True if origin is allowed, False otherwise
    """
    if environment:
        # Temporarily override environment for validation
        original_env = os.environ.get("ENVIRONMENT")
        os.environ["ENVIRONMENT"] = environment
        
        try:
            cors_manager = SecureCORSManager()
            allowed_origins = cors_manager.get_allowed_origins()
            return origin in allowed_origins
        finally:
            if original_env:
                os.environ["ENVIRONMENT"] = original_env
            else:
                os.environ.pop("ENVIRONMENT", None)
    else:
        cors_manager = SecureCORSManager()
        allowed_origins = cors_manager.get_allowed_origins()
        return origin in allowed_origins

# Example usage and testing
if __name__ == "__main__":
    # Test CORS configuration
    cors_manager = SecureCORSManager()
    config = cors_manager.get_cors_config()
    print(f"CORS Config: {config}")
    
    # Test origin validation
    test_origins = [
        "https://bookedbarber.com",
        "http://localhost:3000",
        "https://evil-site.com",
        "javascript:alert('xss')"
    ]
    
    for origin in test_origins:
        valid = validate_cors_origin(origin)
        print(f"Origin {origin}: {'✅ ALLOWED' if valid else '❌ BLOCKED'}")