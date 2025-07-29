"""
CDN configuration for production deployment.
Handles static asset delivery, tracking pixel scripts, and caching policies.
"""

import os
from typing import Dict, Any, Optional, List
try:
    from pydantic_settings import BaseSettings
    from pydantic import field_validator as validator, ConfigDict
except ImportError:
    from pydantic import BaseSettings, field_validator, ConfigDict
from urllib.parse import urljoin


class CDNConfig(BaseSettings):
    """CDN configuration for production."""
    
    # CDN provider settings
    cdn_enabled: bool = True
    cdn_provider: str = "cloudflare"  # cloudflare, cloudfront, fastly, custom
    cdn_url: Optional[str] = None
    cdn_api_key: Optional[str] = None
    cdn_zone_id: Optional[str] = None
    
    # Asset URLs
    static_asset_url: Optional[str] = None
    tracking_script_url: Optional[str] = None
    
    # Cache settings
    cache_control_static: str = "public, max-age=31536000, immutable"  # 1 year
    cache_control_dynamic: str = "public, max-age=300, s-maxage=600"  # 5/10 min
    cache_control_tracking: str = "public, max-age=3600, s-maxage=7200"  # 1/2 hours
    cache_control_api: str = "no-cache, no-store, must-revalidate"
    
    # CloudFlare specific settings
    cloudflare_email: Optional[str] = None
    cloudflare_api_key: Optional[str] = None
    cloudflare_zone_id: Optional[str] = None
    cloudflare_account_id: Optional[str] = None
    
    # CloudFront specific settings
    cloudfront_distribution_id: Optional[str] = None
    cloudfront_origin_domain: Optional[str] = None
    
    # Fastly specific settings
    fastly_api_key: Optional[str] = None
    fastly_service_id: Optional[str] = None
    
    # Asset optimization
    image_optimization: bool = True
    image_formats: List[str] = ["webp", "avif", "jpg", "png"]
    image_quality: int = 85
    image_max_width: int = 2048
    
    # Security settings
    cors_enabled: bool = True
    cors_origins: List[str] = ["https://app.bookedbarber.com"]
    hotlink_protection: bool = True
    allowed_referrers: List[str] = ["bookedbarber.com", "*.bookedbarber.com"]
    
    # Tracking pixel settings
    pixel_cache_duration: int = 3600  # 1 hour
    pixel_versioning: bool = True
    pixel_minification: bool = True
    
    model_config = ConfigDict(
        env_prefix="CDN_",
        case_sensitive=False
    )
    
    @field_validator('cdn_url')
    def validate_cdn_url(cls, v, values):
        """Generate CDN URL based on provider."""
        if v:
            return v
        
        provider = values.get('cdn_provider', '').lower()
        
        if provider == 'cloudflare':
            # CloudFlare uses your domain with their proxy
            return "https://cdn.bookedbarber.com"
        elif provider == 'cloudfront':
            # CloudFront provides a distribution domain
            dist_id = values.get('cloudfront_distribution_id')
            if dist_id:
                return f"https://{dist_id}.cloudfront.net"
        elif provider == 'fastly':
            # Fastly custom domain
            return "https://assets.bookedbarber.com"
        
        # Default to main domain
        return "https://bookedbarber.com"
    
    def get_asset_url(self, path: str, asset_type: str = "static") -> str:
        """Get full CDN URL for an asset."""
        if not self.cdn_enabled:
            return path
        
        base_url = self.cdn_url or ""
        
        # Add versioning for cache busting
        if self.pixel_versioning and asset_type == "tracking":
            version = os.getenv('APP_VERSION', 'v1')
            if '?' in path:
                path = f"{path}&v={version}"
            else:
                path = f"{path}?v={version}"
        
        return urljoin(base_url, path)
    
    def get_cache_headers(self, asset_type: str = "static") -> Dict[str, str]:
        """Get cache headers for different asset types."""
        cache_control_map = {
            "static": self.cache_control_static,
            "dynamic": self.cache_control_dynamic,
            "tracking": self.cache_control_tracking,
            "api": self.cache_control_api,
        }
        
        headers = {
            "Cache-Control": cache_control_map.get(asset_type, self.cache_control_dynamic)
        }
        
        # Add CORS headers if enabled
        if self.cors_enabled:
            headers["Access-Control-Allow-Origin"] = ", ".join(self.cors_origins)
            headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            headers["Access-Control-Max-Age"] = "86400"
        
        # Add security headers
        headers["X-Content-Type-Options"] = "nosniff"
        
        return headers
    
    def get_cloudflare_config(self) -> Dict[str, Any]:
        """Get CloudFlare specific configuration."""
        return {
            "email": self.cloudflare_email,
            "api_key": self.cloudflare_api_key,
            "zone_id": self.cloudflare_zone_id,
            "account_id": self.cloudflare_account_id,
            "page_rules": [
                {
                    "target": "*/tracking/*",
                    "actions": {
                        "cache_level": "cache_everything",
                        "edge_cache_ttl": self.pixel_cache_duration,
                        "browser_cache_ttl": self.pixel_cache_duration,
                    }
                },
                {
                    "target": "*/static/*",
                    "actions": {
                        "cache_level": "cache_everything",
                        "edge_cache_ttl": 2678400,  # 31 days
                        "browser_cache_ttl": 31536000,  # 1 year
                    }
                },
                {
                    "target": "*/api/*",
                    "actions": {
                        "cache_level": "bypass",
                    }
                }
            ],
            "workers": {
                "image_resizing": self.image_optimization,
                "minification": {
                    "javascript": True,
                    "css": True,
                    "html": False,
                }
            }
        }
    
    def get_cloudfront_config(self) -> Dict[str, Any]:
        """Get CloudFront specific configuration."""
        return {
            "distribution_id": self.cloudfront_distribution_id,
            "origin_domain": self.cloudfront_origin_domain,
            "behaviors": [
                {
                    "path_pattern": "/tracking/*",
                    "target_origin_id": "tracking-origin",
                    "viewer_protocol_policy": "redirect-to-https",
                    "cache_policy": {
                        "default_ttl": self.pixel_cache_duration,
                        "max_ttl": self.pixel_cache_duration * 2,
                    }
                },
                {
                    "path_pattern": "/static/*",
                    "target_origin_id": "static-origin",
                    "viewer_protocol_policy": "redirect-to-https",
                    "compress": True,
                    "cache_policy": {
                        "default_ttl": 86400,
                        "max_ttl": 31536000,
                    }
                }
            ]
        }
    
    def get_nginx_cdn_config(self) -> str:
        """Generate Nginx configuration for CDN integration."""
        return f"""
# CDN Configuration
location /static {{
    expires 1y;
    add_header Cache-Control "{self.cache_control_static}";
    add_header X-Content-Type-Options "nosniff";
    
    # Enable gzip compression
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_vary on;
    
    # Serve pre-compressed files if available
    gzip_static on;
}}

location /tracking {{
    expires 1h;
    add_header Cache-Control "{self.cache_control_tracking}";
    add_header Access-Control-Allow-Origin "{', '.join(self.cors_origins)}";
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    
    # Hotlink protection
    valid_referers none blocked server_names {' '.join(self.allowed_referrers)};
    if ($invalid_referer) {{
        return 403;
    }}
}}

location /api {{
    add_header Cache-Control "{self.cache_control_api}";
    add_header X-Content-Type-Options "nosniff";
    
    # Disable caching for API responses
    expires -1;
}}
"""


# CDN configuration presets
CDN_CONFIGS = {
    'development': {
        'cdn_enabled': False,
        'cache_control_static': 'no-cache',
        'cache_control_dynamic': 'no-cache',
    },
    'staging': {
        'cdn_enabled': True,
        'cache_control_static': 'public, max-age=3600',
        'cache_control_dynamic': 'public, max-age=60',
    },
    'production_cloudflare': {
        'cdn_enabled': True,
        'cdn_provider': 'cloudflare',
        'image_optimization': True,
        'pixel_minification': True,
        'hotlink_protection': True,
    },
    'production_cloudfront': {
        'cdn_enabled': True,
        'cdn_provider': 'cloudfront',
        'image_optimization': True,
        'pixel_minification': True,
    },
    'production_fastly': {
        'cdn_enabled': True,
        'cdn_provider': 'fastly',
        'image_optimization': True,
        'pixel_versioning': True,
    }
}


def get_cdn_config(environment: Optional[str] = None) -> CDNConfig:
    """Get CDN configuration for specific environment."""
    env = environment or os.getenv('ENVIRONMENT', 'development')
    
    # Get base configuration
    base_config = CDN_CONFIGS.get(env, {})
    
    # Check for specific CDN provider
    if env == 'production':
        cdn_provider = os.getenv('CDN_PROVIDER', 'cloudflare').lower()
        if cdn_provider == 'cloudflare':
            base_config.update(CDN_CONFIGS.get('production_cloudflare', {}))
        elif cdn_provider == 'cloudfront':
            base_config.update(CDN_CONFIGS.get('production_cloudfront', {}))
        elif cdn_provider == 'fastly':
            base_config.update(CDN_CONFIGS.get('production_fastly', {}))
    
    # Override with environment variables
    for key in base_config:
        env_key = f"CDN_{key.upper()}"
        if os.getenv(env_key):
            base_config[key] = os.getenv(env_key)
    
    return CDNConfig(**base_config)


# Usage example:
"""
from config.cdn_config import get_cdn_config

cdn_config = get_cdn_config()

# Get CDN URL for tracking pixel
pixel_url = cdn_config.get_asset_url('/tracking/pixel.js', 'tracking')

# Get cache headers for response
cache_headers = cdn_config.get_cache_headers('static')
"""