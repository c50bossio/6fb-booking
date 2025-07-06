"""
SSL/HTTPS configuration for production deployment.
Handles certificate management, HTTPS redirection, and TLS settings.
"""

import os
from typing import Dict, Any, Optional, List
from pathlib import Path
try:
    from pydantic_settings import BaseSettings
    from pydantic import field_validator as validator
except ImportError:
    from pydantic import BaseSettings, validator
import ssl


class SSLConfig(BaseSettings):
    """SSL/HTTPS configuration for production."""
    
    # SSL/HTTPS settings
    ssl_enabled: bool = True
    ssl_redirect: bool = True
    ssl_host: Optional[str] = None
    ssl_port: int = 443
    
    # Certificate paths
    ssl_certfile: Optional[str] = None
    ssl_keyfile: Optional[str] = None
    ssl_ca_bundle: Optional[str] = None
    ssl_password: Optional[str] = None
    
    # TLS configuration
    ssl_version: str = "TLSv1.2"  # Minimum TLS version
    ssl_ciphers: str = "TLSv1.2:!aNULL:!eNULL:!EXPORT:!DES:!MD5:!PSK:!RC4"
    
    # HSTS (HTTP Strict Transport Security)
    hsts_enabled: bool = True
    hsts_max_age: int = 31536000  # 1 year
    hsts_include_subdomains: bool = True
    hsts_preload: bool = True
    
    # Certificate validation
    ssl_verify_mode: str = "CERT_REQUIRED"
    ssl_check_hostname: bool = True
    
    # Let's Encrypt / ACME settings
    letsencrypt_enabled: bool = False
    letsencrypt_email: Optional[str] = None
    letsencrypt_domains: List[str] = []
    letsencrypt_staging: bool = False
    
    # Certificate paths for different environments
    cert_base_path: str = "/etc/ssl/certs"
    key_base_path: str = "/etc/ssl/private"
    
    class Config:
        env_prefix = "SSL_"
        case_sensitive = False
    
    @validator('ssl_enabled')
    def validate_ssl_enabled(cls, v):
        """Enable SSL in production environment."""
        if os.getenv('ENVIRONMENT') == 'production':
            return True
        return v
    
    @validator('ssl_certfile')
    def validate_ssl_certfile(cls, v, values):
        """Validate SSL certificate file path."""
        if not v and values.get('ssl_enabled'):
            # Try common certificate locations
            common_paths = [
                "/etc/letsencrypt/live/bookedbarber.com/fullchain.pem",
                "/etc/ssl/certs/bookedbarber.com.crt",
                "./certs/server.crt",
            ]
            
            for path in common_paths:
                if Path(path).exists():
                    return path
            
            # Check environment variable
            env_cert = os.getenv('SSL_CERTFILE')
            if env_cert and Path(env_cert).exists():
                return env_cert
        
        return v
    
    @validator('ssl_keyfile')
    def validate_ssl_keyfile(cls, v, values):
        """Validate SSL key file path."""
        if not v and values.get('ssl_enabled'):
            # Try common key locations
            common_paths = [
                "/etc/letsencrypt/live/bookedbarber.com/privkey.pem",
                "/etc/ssl/private/bookedbarber.com.key",
                "./certs/server.key",
            ]
            
            for path in common_paths:
                if Path(path).exists():
                    return path
            
            # Check environment variable
            env_key = os.getenv('SSL_KEYFILE')
            if env_key and Path(env_key).exists():
                return env_key
        
        return v
    
    def get_ssl_context(self) -> Optional[ssl.SSLContext]:
        """Create SSL context with proper security settings."""
        if not self.ssl_enabled or not self.ssl_certfile or not self.ssl_keyfile:
            return None
        
        # Create SSL context
        context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        
        # Set minimum TLS version
        if self.ssl_version == "TLSv1.3":
            context.minimum_version = ssl.TLSVersion.TLSv1_3
        else:
            context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        # Load certificate and key
        context.load_cert_chain(
            certfile=self.ssl_certfile,
            keyfile=self.ssl_keyfile,
            password=self.ssl_password
        )
        
        # Set ciphers
        if self.ssl_ciphers:
            context.set_ciphers(self.ssl_ciphers)
        
        # Set verification mode
        if self.ssl_verify_mode == "CERT_REQUIRED":
            context.verify_mode = ssl.CERT_REQUIRED
        elif self.ssl_verify_mode == "CERT_OPTIONAL":
            context.verify_mode = ssl.CERT_OPTIONAL
        else:
            context.verify_mode = ssl.CERT_NONE
        
        context.check_hostname = self.ssl_check_hostname
        
        # Load CA bundle if provided
        if self.ssl_ca_bundle:
            context.load_verify_locations(cafile=self.ssl_ca_bundle)
        
        return context
    
    def get_hsts_header(self) -> Optional[str]:
        """Generate HSTS header value."""
        if not self.hsts_enabled:
            return None
        
        parts = [f"max-age={self.hsts_max_age}"]
        
        if self.hsts_include_subdomains:
            parts.append("includeSubDomains")
        
        if self.hsts_preload:
            parts.append("preload")
        
        return "; ".join(parts)
    
    def get_uvicorn_ssl_config(self) -> Dict[str, Any]:
        """Get SSL configuration for Uvicorn server."""
        if not self.ssl_enabled:
            return {}
        
        config = {
            "ssl_keyfile": self.ssl_keyfile,
            "ssl_certfile": self.ssl_certfile,
            "ssl_version": ssl.PROTOCOL_TLS_SERVER,
            "ssl_cert_reqs": ssl.CERT_NONE,
            "ssl_ciphers": self.ssl_ciphers,
        }
        
        if self.ssl_ca_bundle:
            config["ssl_ca_certs"] = self.ssl_ca_bundle
        
        if self.ssl_password:
            config["ssl_keyfile_password"] = self.ssl_password
        
        return config
    
    def get_nginx_ssl_config(self) -> str:
        """Generate Nginx SSL configuration."""
        return f"""
# SSL Configuration
ssl_certificate {self.ssl_certfile or '/etc/nginx/ssl/cert.pem'};
ssl_certificate_key {self.ssl_keyfile or '/etc/nginx/ssl/key.pem'};

# SSL Protocol and Ciphers
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# SSL Session Configuration
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate {self.ssl_ca_bundle or self.ssl_certfile or '/etc/nginx/ssl/ca.pem'};

# Security Headers
add_header Strict-Transport-Security "{self.get_hsts_header()}" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
"""
    
    def get_letsencrypt_config(self) -> Dict[str, Any]:
        """Get Let's Encrypt configuration."""
        return {
            "email": self.letsencrypt_email,
            "domains": self.letsencrypt_domains,
            "staging": self.letsencrypt_staging,
            "key_type": "rsa4096",
            "must_staple": True,
            "challenge_type": "http-01",
        }


# SSL configuration presets for different environments
SSL_CONFIGS = {
    'development': {
        'ssl_enabled': False,
        'ssl_redirect': False,
    },
    'staging': {
        'ssl_enabled': True,
        'ssl_redirect': True,
        'letsencrypt_staging': True,
    },
    'production': {
        'ssl_enabled': True,
        'ssl_redirect': True,
        'hsts_enabled': True,
        'hsts_preload': True,
        'ssl_version': 'TLSv1.2',
        'letsencrypt_enabled': True,
        'letsencrypt_staging': False,
    },
    'production_cloudflare': {
        # When using Cloudflare SSL
        'ssl_enabled': False,  # Cloudflare handles SSL
        'ssl_redirect': False,  # Cloudflare handles redirect
        'hsts_enabled': True,
        'hsts_max_age': 15780000,  # 6 months for Cloudflare
    },
    'production_aws': {
        # When using AWS Certificate Manager
        'ssl_enabled': False,  # ALB handles SSL
        'ssl_redirect': False,  # ALB handles redirect
        'hsts_enabled': True,
    }
}


def get_ssl_config(environment: Optional[str] = None) -> SSLConfig:
    """Get SSL configuration for specific environment."""
    env = environment or os.getenv('ENVIRONMENT', 'development')
    
    # Get base configuration
    base_config = SSL_CONFIGS.get(env, {})
    
    # Check for CDN/proxy configuration
    if env == 'production':
        # Detect if behind proxy/CDN
        if os.getenv('BEHIND_PROXY', '').lower() == 'true':
            if 'cloudflare' in os.getenv('CDN_PROVIDER', '').lower():
                base_config.update(SSL_CONFIGS.get('production_cloudflare', {}))
            elif 'aws' in os.getenv('CLOUD_PROVIDER', '').lower():
                base_config.update(SSL_CONFIGS.get('production_aws', {}))
    
    # Override with environment variables
    for key in base_config:
        env_key = f"SSL_{key.upper()}"
        if os.getenv(env_key):
            base_config[key] = os.getenv(env_key)
    
    return SSLConfig(**base_config)


# Certificate generation helper script
"""
#!/bin/bash
# generate_ssl_cert.sh - Generate self-signed certificate for development

# Create directory
mkdir -p ./certs

# Generate private key
openssl genrsa -out ./certs/server.key 2048

# Generate certificate signing request
openssl req -new -key ./certs/server.key -out ./certs/server.csr \
    -subj "/C=US/ST=State/L=City/O=BookedBarber/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in ./certs/server.csr \
    -signkey ./certs/server.key -out ./certs/server.crt

# Set permissions
chmod 600 ./certs/server.key
chmod 644 ./certs/server.crt

echo "Self-signed certificate generated in ./certs/"
"""