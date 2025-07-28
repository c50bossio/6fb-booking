"""
Redis configuration for production deployment.
Handles connection pooling, rate limiting, caching, and session management.
"""

from typing import Dict, Any, Optional
import os
try:
    from pydantic_settings import BaseSettings
    from pydantic import ConfigDict
except ImportError:
    from pydantic import BaseSettings, ConfigDict


class RedisConfig(BaseSettings):
    """Redis configuration settings for production."""
    
    # Redis connection settings
    redis_url: str = "redis://localhost:6379/0"
    redis_ssl: bool = False
    redis_password: Optional[str] = None
    
    # AWS ElastiCache specific settings
    aws_elasticache_enabled: bool = False
    aws_elasticache_cluster_id: Optional[str] = None
    aws_elasticache_primary_endpoint: Optional[str] = None
    aws_elasticache_reader_endpoint: Optional[str] = None
    aws_elasticache_port: int = 6379
    aws_elasticache_ssl_cert_reqs: str = "required"
    aws_elasticache_ssl_ca_certs: str = "/etc/ssl/certs/ca-certificates.crt"
    aws_elasticache_auth_token: Optional[str] = None
    
    # Connection pool settings
    redis_max_connections: int = 50
    redis_min_idle_connections: int = 10
    redis_connection_timeout: int = 20
    redis_socket_timeout: int = 5
    redis_socket_keepalive: bool = True
    redis_retry_on_timeout: bool = True
    redis_health_check_interval: int = 30
    redis_connection_pool_blocking: bool = True
    redis_connection_pool_timeout: int = 20
    redis_decode_responses: bool = True
    redis_encoding: str = "utf-8"
    
    # Rate limiting settings
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    rate_limit_per_day: int = 10000
    
    # Cache settings
    cache_ttl_default: int = 300  # 5 minutes
    cache_ttl_appointments: int = 60  # 1 minute for real-time data
    cache_ttl_user_data: int = 600  # 10 minutes
    cache_ttl_analytics: int = 1800  # 30 minutes
    cache_ttl_static: int = 3600  # 1 hour for static content
    
    # Session settings
    session_ttl: int = 86400  # 24 hours
    session_prefix: str = "session:"
    
    # Key prefixes for different data types
    prefix_rate_limit: str = "rate:"
    prefix_cache: str = "cache:"
    prefix_session: str = "session:"
    prefix_analytics: str = "analytics:"
    prefix_tracking: str = "tracking:"
    prefix_queue: str = "queue:"
    
    model_config = ConfigDict(
        env_prefix="",
        case_sensitive=False
    )
    def get_connection_pool_params(self) -> Dict[str, Any]:
        """Get Redis connection pool parameters."""
        return {
            'max_connections': self.redis_max_connections,
            'retry_on_timeout': self.redis_retry_on_timeout,
            'health_check_interval': self.redis_health_check_interval,
            'socket_connect_timeout': self.redis_connection_timeout,
            'socket_timeout': self.redis_socket_timeout,
            'socket_keepalive': self.redis_socket_keepalive,
            'socket_keepalive_options': {}
        }
    
    def get_ssl_params(self) -> Dict[str, Any]:
        """Get SSL parameters for Redis connection."""
        if not self.redis_ssl:
            return {}
        
        # AWS ElastiCache specific SSL configuration
        if self.aws_elasticache_enabled:
            return {
                'ssl': True,
                'ssl_cert_reqs': self.aws_elasticache_ssl_cert_reqs,
                'ssl_ca_certs': self.aws_elasticache_ssl_ca_certs,
                'ssl_check_hostname': True,
                'ssl_ciphers': None  # Use default ciphers for ElastiCache
            }
        
        # Standard SSL configuration
        return {
            'ssl': True,
            'ssl_cert_reqs': 'required',
            'ssl_ca_certs': '/etc/ssl/certs/ca-certificates.crt',  # Default CA bundle
            'ssl_check_hostname': True
        }
    
    def get_elasticache_url(self) -> Optional[str]:
        """Generate Redis URL from ElastiCache configuration."""
        if not self.aws_elasticache_enabled or not self.aws_elasticache_primary_endpoint:
            return None
        
        # Build ElastiCache URL
        scheme = "rediss" if self.redis_ssl else "redis"
        auth_part = f":{self.aws_elasticache_auth_token}@" if self.aws_elasticache_auth_token else ""
        
        return f"{scheme}://{auth_part}{self.aws_elasticache_primary_endpoint}:{self.aws_elasticache_port}/0"
    
    def detect_aws_environment(self) -> bool:
        """Detect if running in AWS environment."""
        try:
            # Check for AWS metadata service
            import requests
            response = requests.get(
                'http://169.254.169.254/latest/meta-data/instance-id',
                timeout=2
            )
            return response.status_code == 200
        except:
            return False
    
    def auto_configure_for_aws(self) -> None:
        """Auto-configure Redis settings for AWS ElastiCache."""
        if self.detect_aws_environment() and self.aws_elasticache_enabled:
            # Auto-generate Redis URL from ElastiCache settings
            elasticache_url = self.get_elasticache_url()
            if elasticache_url:
                self.redis_url = elasticache_url
                self.redis_ssl = True
                self.redis_password = self.aws_elasticache_auth_token
            
            # Optimize connection settings for AWS
            self.redis_max_connections = min(100, self.redis_max_connections)
            self.redis_connection_timeout = max(30, self.redis_connection_timeout)
            self.redis_health_check_interval = 15  # More frequent health checks
    
    def get_elasticache_connection_params(self) -> Dict[str, Any]:
        """Get optimized connection parameters for ElastiCache."""
        base_params = self.get_connection_pool_params()
        
        if self.aws_elasticache_enabled:
            # ElastiCache optimizations
            base_params.update({
                'connection_pool_class_kwargs': {
                    'ssl_cert_reqs': self.aws_elasticache_ssl_cert_reqs,
                    'ssl_ca_certs': self.aws_elasticache_ssl_ca_certs,
                },
                'decode_responses': self.redis_decode_responses,
                'encoding': self.redis_encoding,
                'socket_keepalive': True,
                'socket_keepalive_options': {
                    'TCP_KEEPIDLE': 60,
                    'TCP_KEEPINTVL': 30,
                    'TCP_KEEPCNT': 3
                }
            })
        
        return base_params
    
    def get_cache_ttl(self, cache_type: str = 'default') -> int:
        """Get TTL for different cache types."""
        ttl_map = {
            'default': self.cache_ttl_default,
            'appointments': self.cache_ttl_appointments,
            'user': self.cache_ttl_user_data,
            'analytics': self.cache_ttl_analytics,
            'static': self.cache_ttl_static,
        }
        return ttl_map.get(cache_type, self.cache_ttl_default)
    
    def get_rate_limit_key(self, identifier: str, window: str = 'minute') -> str:
        """Generate rate limit key with proper prefix."""
        return f"{self.prefix_rate_limit}{window}:{identifier}"
    
    def get_cache_key(self, key: str) -> str:
        """Generate cache key with proper prefix."""
        return f"{self.prefix_cache}{key}"
    
    def get_session_key(self, session_id: str) -> str:
        """Generate session key with proper prefix."""
        return f"{self.prefix_session}{session_id}"

# Production Redis configuration presets
REDIS_CONFIGS = {
    'development': {
        'redis_url': 'redis://localhost:6379/0',
        'redis_max_connections': 20,
        'rate_limit_per_minute': 100,
        'cache_ttl_default': 60,
    },
    'staging': {
        'redis_url': 'redis://localhost:6379/1',  # Different DB for staging
        'redis_max_connections': 30,
        'rate_limit_per_minute': 80,
        'cache_ttl_default': 180,
    },
    'production': {
        'redis_max_connections': 50,
        'redis_min_idle_connections': 10,
        'redis_ssl': True,
        'rate_limit_enabled': True,
        'rate_limit_per_minute': 60,
        'rate_limit_per_hour': 1000,
        'cache_ttl_default': 300,
    },
    'production_aws': {
        # AWS ElastiCache specific settings
        'redis_max_connections': 100,
        'redis_socket_keepalive': True,
        'redis_health_check_interval': 15,
        'redis_ssl': True,
    },
    'production_azure': {
        # Azure Cache for Redis specific settings
        'redis_max_connections': 80,
        'redis_connection_timeout': 30,
        'redis_ssl': True,
    },
    'production_gcp': {
        # Google Cloud Memorystore specific settings
        'redis_max_connections': 90,
        'redis_retry_on_timeout': True,
        'redis_ssl': True,
    }
}


def get_redis_config(environment: Optional[str] = None) -> RedisConfig:
    """Get Redis configuration for specific environment."""
    env = environment or os.getenv('ENVIRONMENT', 'development')
    
    # Get base configuration
    base_config = REDIS_CONFIGS.get(env, {})
    
    # Check for cloud-specific configuration
    if env == 'production':
        # Check for AWS ElastiCache first
        if os.getenv('AWS_ELASTICACHE_ENABLED', '').lower() == 'true':
            base_config.update(REDIS_CONFIGS.get('production_aws', {}))
            base_config['aws_elasticache_enabled'] = True
        else:
            # Detect cloud provider from Redis URL
            redis_url = os.getenv('REDIS_URL', '')
            if 'amazonaws.com' in redis_url or 'cache.amazonaws.com' in redis_url:
                base_config.update(REDIS_CONFIGS.get('production_aws', {}))
            elif 'azure.cache.windows.net' in redis_url:
                base_config.update(REDIS_CONFIGS.get('production_azure', {}))
            elif 'redislabs.com' in redis_url or 'redis.io' in redis_url:
                base_config.update(REDIS_CONFIGS.get('production_gcp', {}))
    
    # Override with environment variables
    for key in base_config:
        env_key = key.upper()
        if os.getenv(env_key):
            base_config[key] = os.getenv(env_key)
    
    # Create config instance
    config = RedisConfig(**base_config)
    
    # Auto-configure for AWS if enabled
    if config.aws_elasticache_enabled:
        config.auto_configure_for_aws()
    
    return config


# Usage example in production
"""
# In your main application:
from config.redis_config import get_redis_config

redis_config = get_redis_config()

# Use with existing Redis service
from services.redis_service import RedisConnectionManager

redis_manager = RedisConnectionManager()
# The manager will automatically use settings from config.py
"""