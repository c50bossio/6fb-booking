"""
Redis Configuration for Production Deployment
Provides environment-specific Redis settings and connection parameters
"""

import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from config.settings import settings


class RedisConfig(BaseModel):
    """Redis configuration model"""

    # Connection settings
    url: str = Field(description="Redis connection URL")
    password: Optional[str] = Field(default=None, description="Redis password")
    db: int = Field(default=0, description="Redis database number")

    # Connection pool settings
    max_connections: int = Field(default=50, description="Maximum connections in pool")
    socket_timeout: int = Field(default=10, description="Socket timeout in seconds")
    socket_connect_timeout: int = Field(default=5, description="Socket connect timeout")
    health_check_interval: int = Field(default=30, description="Health check interval")

    # Retry settings
    retry_on_timeout: bool = Field(default=True, description="Retry on timeout")
    max_retries: int = Field(default=3, description="Maximum retry attempts")

    # Cache settings
    default_ttl: int = Field(default=3600, description="Default TTL in seconds")
    key_prefix: str = Field(default="6fb", description="Cache key prefix")

    # Performance settings
    decode_responses: bool = Field(
        default=True, description="Decode responses to strings"
    )
    socket_keepalive: bool = Field(default=True, description="Enable socket keepalive")

    # Cluster settings (for Redis Cluster)
    cluster_enabled: bool = Field(
        default=False, description="Enable Redis Cluster mode"
    )
    startup_nodes: Optional[list] = Field(
        default=None, description="Cluster startup nodes"
    )


def get_redis_config() -> RedisConfig:
    """Get Redis configuration based on environment"""

    # Development configuration
    if settings.ENVIRONMENT == "development":
        return RedisConfig(
            url=getattr(settings, "REDIS_URL", "redis://localhost:6379"),
            password=getattr(settings, "REDIS_PASSWORD", None),
            db=getattr(settings, "REDIS_DB", 0),
            max_connections=10,
            default_ttl=1800,  # 30 minutes for development
            key_prefix="6fb_dev",
        )

    # Staging configuration
    elif settings.ENVIRONMENT == "staging":
        return RedisConfig(
            url=getattr(settings, "REDIS_URL", "redis://localhost:6379"),
            password=getattr(settings, "REDIS_PASSWORD", None),
            db=getattr(settings, "REDIS_DB", 1),  # Different DB for staging
            max_connections=25,
            default_ttl=3600,  # 1 hour for staging
            key_prefix="6fb_staging",
            health_check_interval=60,
        )

    # Production configuration
    else:  # production
        return RedisConfig(
            url=getattr(settings, "REDIS_URL", "redis://localhost:6379"),
            password=getattr(settings, "REDIS_PASSWORD", None),
            db=getattr(settings, "REDIS_DB", 0),
            max_connections=50,
            socket_timeout=15,
            socket_connect_timeout=10,
            default_ttl=3600,  # 1 hour for production
            key_prefix="6fb_prod",
            health_check_interval=30,
            max_retries=5,
        )


def get_redis_url_components() -> Dict[str, Any]:
    """Parse Redis URL into components for debugging"""
    from urllib.parse import urlparse

    redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379")
    parsed = urlparse(redis_url)

    return {
        "scheme": parsed.scheme,
        "hostname": parsed.hostname,
        "port": parsed.port or 6379,
        "username": parsed.username,
        "password": parsed.password or getattr(settings, "REDIS_PASSWORD", None),
        "path": parsed.path,
    }


def validate_redis_config() -> Dict[str, Any]:
    """Validate Redis configuration and return status"""
    config = get_redis_config()
    components = get_redis_url_components()

    issues = []
    warnings = []

    # Check required settings
    if not components["hostname"]:
        issues.append("Redis hostname not configured")

    # Check production-specific requirements
    if settings.ENVIRONMENT == "production":
        if not components["password"] and components["hostname"] != "localhost":
            warnings.append("Redis password not set for production deployment")

        if config.max_connections < 20:
            warnings.append("Low connection pool size for production")

        if config.default_ttl < 3600:
            warnings.append("Short default TTL for production cache")

    # Check Redis URL format
    if not components["scheme"].startswith("redis"):
        issues.append(f"Invalid Redis URL scheme: {components['scheme']}")

    return {
        "valid": len(issues) == 0,
        "config": config.dict(),
        "components": components,
        "issues": issues,
        "warnings": warnings,
        "environment": settings.ENVIRONMENT,
    }


# Environment-specific Redis configurations
REDIS_CONFIGS = {
    "development": {
        "host": "localhost",
        "port": 6379,
        "db": 0,
        "max_connections": 10,
        "socket_timeout": 5,
        "decode_responses": True,
        "retry_on_timeout": True,
        "health_check_interval": 60,
    },
    "staging": {
        "host": os.getenv("REDIS_HOST", "localhost"),
        "port": int(os.getenv("REDIS_PORT", "6379")),
        "db": int(os.getenv("REDIS_DB", "1")),
        "password": os.getenv("REDIS_PASSWORD"),
        "max_connections": 25,
        "socket_timeout": 10,
        "socket_connect_timeout": 5,
        "decode_responses": True,
        "retry_on_timeout": True,
        "health_check_interval": 30,
    },
    "production": {
        "host": os.getenv("REDIS_HOST", "localhost"),
        "port": int(os.getenv("REDIS_PORT", "6379")),
        "db": int(os.getenv("REDIS_DB", "0")),
        "password": os.getenv("REDIS_PASSWORD"),
        "max_connections": 50,
        "socket_timeout": 15,
        "socket_connect_timeout": 10,
        "socket_keepalive": True,
        "socket_keepalive_options": {},
        "decode_responses": True,
        "retry_on_timeout": True,
        "health_check_interval": 30,
        # Production-specific settings
        "connection_pool_kwargs": {
            "max_connections": 50,
            "retry_on_timeout": True,
            "socket_keepalive": True,
            "socket_keepalive_options": {
                1: 1,  # TCP_KEEPIDLE
                2: 3,  # TCP_KEEPINTVL
                3: 5,  # TCP_KEEPCNT
            },
        },
    },
}


def get_environment_redis_config() -> Dict[str, Any]:
    """Get Redis configuration for current environment"""
    env = settings.ENVIRONMENT
    return REDIS_CONFIGS.get(env, REDIS_CONFIGS["development"])


# Redis deployment configurations for different platforms
DEPLOYMENT_CONFIGS = {
    "render": {
        "description": "Render.com Redis deployment",
        "redis_url": "redis://red-xxxxx:6379",
        "environment_variables": [
            "REDIS_URL=redis://red-xxxxx:6379",
            "REDIS_PASSWORD=your_redis_password",
            "CACHE_ENABLED=true",
            "CACHE_DEFAULT_TTL=3600",
        ],
        "notes": [
            "Use Render's Redis service for managed Redis",
            "Set REDIS_URL in environment variables",
            "Enable Redis auth for security",
        ],
    },
    "heroku": {
        "description": "Heroku Redis deployment",
        "redis_url": "redis://h:password@hostname:port",
        "environment_variables": [
            "REDIS_URL=redis://h:password@hostname:port",
            "CACHE_ENABLED=true",
            "CACHE_DEFAULT_TTL=3600",
        ],
        "notes": [
            "Use Heroku Redis add-on",
            "REDIS_URL is automatically set by add-on",
            "Consider Redis Premium for production",
        ],
    },
    "aws": {
        "description": "AWS ElastiCache Redis",
        "redis_url": "redis://cluster-endpoint:6379",
        "environment_variables": [
            "REDIS_URL=redis://cluster-endpoint:6379",
            "REDIS_PASSWORD=auth_token",
            "CACHE_ENABLED=true",
            "CACHE_DEFAULT_TTL=3600",
        ],
        "notes": [
            "Use ElastiCache for Redis",
            "Enable cluster mode for high availability",
            "Configure security groups properly",
            "Consider Redis AUTH for security",
        ],
    },
    "docker": {
        "description": "Docker Compose Redis",
        "redis_url": "redis://redis:6379",
        "environment_variables": [
            "REDIS_URL=redis://redis:6379",
            "REDIS_PASSWORD=your_password",
            "CACHE_ENABLED=true",
        ],
        "docker_compose": {
            "redis": {
                "image": "redis:7-alpine",
                "command": "redis-server --requirepass your_password",
                "ports": ["6379:6379"],
                "volumes": ["redis_data:/data"],
                "restart": "unless-stopped",
            }
        },
        "notes": [
            "Use Redis Alpine image for smaller size",
            "Enable password authentication",
            "Mount volume for data persistence",
        ],
    },
}


def get_deployment_config(platform: str) -> Dict[str, Any]:
    """Get deployment configuration for specific platform"""
    return DEPLOYMENT_CONFIGS.get(
        platform,
        {
            "error": f"Unknown deployment platform: {platform}",
            "available_platforms": list(DEPLOYMENT_CONFIGS.keys()),
        },
    )


# Cache warming configuration
CACHE_WARMING_CONFIG = {
    "enabled": True,
    "on_startup": True,
    "schedule": "0 */6 * * *",  # Every 6 hours
    "entities": [
        "dashboard_metrics",
        "barber_availability",
        "location_data",
        "service_pricing",
    ],
    "parallel_jobs": 5,
    "timeout_seconds": 300,
}


def get_cache_warming_config() -> Dict[str, Any]:
    """Get cache warming configuration"""
    return CACHE_WARMING_CONFIG.copy()


# Export configuration getter
redis_config = get_redis_config()
