"""
AI Business Calendar - Production Configuration Class
====================================================
Comprehensive configuration management for AI Business Calendar features
with production-grade security, performance, and observability settings.
"""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator, Field, SecretStr
from typing import List, Dict, Any, Optional, Literal
import os
import logging
from pathlib import Path
from functools import cached_property
import json

logger = logging.getLogger(__name__)

class AIBusinessCalendarConfig(BaseSettings):
    """
    Production-ready configuration for AI Business Calendar system.
    
    Features:
    - AI provider management with fallback strategies
    - Database connection pooling and read replicas
    - Redis clustering and caching configuration
    - Security settings with encryption and compliance
    - Monitoring and observability settings
    - Rate limiting and performance optimization
    - Feature flags and environment-specific overrides
    """
    
    model_config = ConfigDict(
        env_file=".env.ai-business-calendar.production",
        env_prefix="",
        extra="ignore",
        validate_assignment=True,
        case_sensitive=False
    )
    
    # ================================================================================
    # ENVIRONMENT & APPLICATION SETTINGS  
    # ================================================================================
    environment: Literal["development", "staging", "production"] = "production"
    debug: bool = False
    app_name: str = "AI Business Calendar"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    node_env: str = "production"
    port: int = 8000
    host: str = "0.0.0.0"
    
    # ================================================================================
    # SECURITY & AUTHENTICATION
    # ================================================================================
    secret_key: SecretStr = Field(..., description="Application secret key")
    jwt_secret_key: SecretStr = Field(..., description="JWT signing key")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    bcrypt_rounds: int = 12
    
    # Password Security
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_special_chars: bool = True
    password_max_login_attempts: int = 5
    password_lockout_duration_minutes: int = 30
    
    # Session Security
    session_secure_cookies: bool = True
    session_same_site: Literal["strict", "lax", "none"] = "strict"
    session_http_only: bool = True
    session_max_age: int = 86400
    
    # ================================================================================
    # DATABASE CONFIGURATION
    # ================================================================================
    # Primary Database
    database_url: str = Field(..., description="Primary database connection string")
    database_pool_size: int = Field(20, ge=1, le=100)
    database_max_overflow: int = Field(30, ge=0, le=200)
    database_pool_timeout: int = Field(30, ge=1, le=300)
    database_pool_recycle: int = Field(3600, ge=300, le=86400)
    database_pool_pre_ping: bool = True
    database_echo: bool = False
    
    # Read Replica Configuration
    database_read_replica_url: Optional[str] = None
    database_read_replica_enabled: bool = False
    database_read_replica_weight: float = Field(0.3, ge=0.0, le=1.0)
    
    # Database Performance
    database_statement_timeout: int = Field(30000, ge=1000, le=300000)
    database_lock_timeout: int = Field(10000, ge=1000, le=60000)
    database_idle_in_transaction_session_timeout: int = Field(60000, ge=10000, le=3600000)
    database_log_statement: Literal["none", "ddl", "mod", "all"] = "none"
    database_log_duration: bool = False
    database_log_lock_waits: bool = True
    database_log_checkpoints: bool = True
    database_log_connections: bool = False
    database_log_disconnections: bool = False
    
    # Database Backup & Recovery
    database_backup_enabled: bool = True
    database_backup_schedule: str = "0 2 * * *"
    database_backup_retention_days: int = Field(30, ge=1, le=365)
    database_point_in_time_recovery: bool = True
    
    # ================================================================================
    # REDIS CACHE & SESSION STORE
    # ================================================================================
    redis_url: str = Field("redis://localhost:6379/0", description="Redis connection URL")
    redis_host: str = "localhost"
    redis_port: int = Field(6379, ge=1, le=65535)
    redis_password: Optional[SecretStr] = None
    redis_ssl: bool = False
    redis_ssl_cert_reqs: Literal["none", "optional", "required"] = "required"
    redis_max_connections: int = Field(50, ge=1, le=1000)
    redis_socket_timeout: int = Field(5, ge=1, le=60)
    redis_socket_connect_timeout: int = Field(5, ge=1, le=60)
    redis_retry_on_timeout: bool = True
    redis_health_check_interval: int = Field(30, ge=5, le=300)
    
    # Cache Configuration
    enable_caching: bool = True
    cache_default_ttl: int = Field(300, ge=60, le=3600)
    cache_user_profile_ttl: int = Field(1800, ge=300, le=7200)
    cache_appointments_ttl: int = Field(300, ge=60, le=1800)
    cache_services_ttl: int = Field(3600, ge=600, le=86400)
    cache_analytics_ttl: int = Field(900, ge=300, le=3600)
    cache_ai_responses_ttl: int = Field(1800, ge=600, le=7200)
    cache_calendar_events_ttl: int = Field(600, ge=120, le=1800)
    cache_business_intelligence_ttl: int = Field(1800, ge=600, le=7200)
    cache_max_memory_mb: int = Field(512, ge=64, le=4096)
    cache_eviction_policy: Literal["allkeys-lru", "allkeys-lfu", "volatile-lru", "volatile-lfu"] = "allkeys-lru"
    cache_warmup_on_startup: bool = True
    
    # ================================================================================
    # AI AGENT SYSTEM CONFIGURATION
    # ================================================================================
    # AI Provider API Keys
    anthropic_api_key: Optional[SecretStr] = None
    openai_api_key: Optional[SecretStr] = None
    google_ai_api_key: Optional[SecretStr] = None
    voyage_ai_api_key: Optional[SecretStr] = None
    cohere_api_key: Optional[SecretStr] = None
    
    # AI Provider Settings
    default_ai_provider: Literal["anthropic", "openai", "google", "cohere"] = "anthropic"
    ai_temperature: float = Field(0.7, ge=0.0, le=1.0)
    ai_max_tokens: int = Field(1000, ge=100, le=4000)
    ai_retry_attempts: int = Field(3, ge=1, le=10)
    ai_timeout_seconds: int = Field(30, ge=5, le=300)
    ai_fallback_enabled: bool = True
    ai_rate_limit_per_minute: int = Field(60, ge=1, le=1000)
    ai_rate_limit_per_hour: int = Field(1000, ge=60, le=10000)
    
    # AI Model Configuration
    ai_anthropic_model: str = "claude-3-sonnet-20240229"
    ai_openai_model: str = "gpt-4-turbo-preview"
    ai_google_model: str = "gemini-pro"
    ai_voyage_embedding_model: str = "voyage-3-large"
    ai_cohere_model: str = "command-r-plus"
    
    # AI Business Intelligence Features
    ai_business_intelligence_enabled: bool = True
    ai_predictive_analytics_enabled: bool = True
    ai_sentiment_analysis_enabled: bool = True
    ai_recommendation_engine_enabled: bool = True
    ai_anomaly_detection_enabled: bool = True
    ai_forecasting_enabled: bool = True
    
    # AI Calendar Intelligence
    ai_calendar_optimization_enabled: bool = True
    ai_smart_scheduling_enabled: bool = True
    ai_conflict_resolution_enabled: bool = True
    ai_availability_prediction_enabled: bool = True
    ai_workload_balancing_enabled: bool = True
    
    # AI Agent Orchestration
    ai_agent_orchestrator_enabled: bool = True
    ai_agent_max_concurrent: int = Field(10, ge=1, le=100)
    ai_agent_queue_size: int = Field(100, ge=10, le=1000)
    ai_agent_timeout_seconds: int = Field(60, ge=10, le=600)
    ai_agent_retry_attempts: int = Field(2, ge=1, le=5)
    ai_agent_health_check_interval: int = Field(30, ge=10, le=300)
    
    # ================================================================================
    # GOOGLE CALENDAR INTEGRATION
    # ================================================================================
    google_client_id: Optional[str] = None
    google_client_secret: Optional[SecretStr] = None
    google_redirect_uri: str = "https://your-domain.com/api/calendar/callback"
    google_calendar_scopes: List[str] = Field(default=[
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ])
    google_calendar_webhook_secret: Optional[SecretStr] = None
    google_calendar_sync_enabled: bool = True
    google_calendar_sync_interval_minutes: int = Field(5, ge=1, le=60)
    google_calendar_two_way_sync: bool = True
    google_calendar_conflict_resolution: Literal["ai", "manual", "overwrite"] = "ai"
    google_calendar_batch_size: int = Field(50, ge=1, le=1000)
    
    # Google Calendar AI Features
    google_calendar_ai_scheduling: bool = True
    google_calendar_ai_optimization: bool = True
    google_calendar_ai_insights: bool = True
    google_calendar_smart_notifications: bool = True
    
    # ================================================================================
    # BUSINESS INTELLIGENCE & ANALYTICS
    # ================================================================================
    # Google Analytics 4
    ga4_measurement_id: Optional[str] = None
    ga4_api_secret: Optional[SecretStr] = None
    ga4_enhanced_measurement: bool = True
    ga4_conversion_tracking: bool = True
    ga4_ecommerce_tracking: bool = True
    ga4_custom_dimensions: Dict[str, Any] = Field(default_factory=dict)
    ga4_debug_mode: bool = False
    
    # Google Tag Manager
    gtm_container_id: Optional[str] = None
    gtm_server_container_url: Optional[str] = None
    gtm_server_container_api_key: Optional[SecretStr] = None
    gtm_consent_mode: bool = True
    gtm_enhanced_ecommerce: bool = True
    
    # Business Intelligence APIs
    tableau_server_url: Optional[str] = None
    tableau_username: Optional[str] = None
    tableau_password: Optional[SecretStr] = None
    tableau_site_id: Optional[str] = None
    
    power_bi_tenant_id: Optional[str] = None
    power_bi_client_id: Optional[str] = None
    power_bi_client_secret: Optional[SecretStr] = None
    power_bi_workspace_id: Optional[str] = None
    
    looker_api_url: Optional[str] = None
    looker_client_id: Optional[str] = None
    looker_client_secret: Optional[SecretStr] = None
    
    # Analytics Data Warehouse
    snowflake_account: Optional[str] = None
    snowflake_username: Optional[str] = None
    snowflake_password: Optional[SecretStr] = None
    snowflake_database: str = "AI_BUSINESS_CALENDAR"
    snowflake_schema: str = "ANALYTICS"
    snowflake_warehouse: str = "COMPUTE_WH"
    
    bigquery_project_id: Optional[str] = None
    bigquery_dataset_id: str = "ai_business_calendar"
    bigquery_credentials_path: Optional[str] = None
    
    # ================================================================================
    # API RATE LIMITING & SECURITY
    # ================================================================================
    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = Field(60, ge=1, le=1000)
    rate_limit_per_hour: int = Field(1000, ge=60, le=100000)
    rate_limit_per_day: int = Field(10000, ge=1000, le=1000000)
    rate_limit_burst_size: int = Field(10, ge=1, le=100)
    rate_limit_storage: Literal["redis", "memory"] = "redis"
    
    # API Security
    api_key_required: bool = True
    api_key_header_name: str = "X-API-Key"
    api_cors_enabled: bool = True
    api_cors_origins: List[str] = Field(default=["https://your-domain.com"])
    api_cors_credentials: bool = True
    api_cors_max_age: int = Field(86400, ge=3600, le=86400)
    
    # Request Validation
    request_max_size_mb: int = Field(10, ge=1, le=100)
    request_timeout_seconds: int = Field(30, ge=5, le=300)
    request_body_validation: Literal["strict", "relaxed", "disabled"] = "strict"
    request_query_param_limit: int = Field(100, ge=10, le=1000)
    request_header_size_limit: int = Field(8192, ge=1024, le=32768)
    
    # Security Headers
    security_headers_enabled: bool = True
    hsts_enabled: bool = True
    hsts_max_age: int = Field(31536000, ge=300, le=31536000)
    hsts_include_subdomains: bool = True
    csp_enabled: bool = True
    csp_policy: str = "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'"
    x_frame_options: Literal["DENY", "SAMEORIGIN"] = "DENY"
    x_content_type_options: str = "nosniff"
    referrer_policy: str = "strict-origin-when-cross-origin"
    
    # ================================================================================
    # EXTERNAL SERVICES & INTEGRATIONS
    # ================================================================================
    # Stripe Payments
    stripe_secret_key: Optional[SecretStr] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[SecretStr] = None
    stripe_connect_client_id: Optional[str] = None
    stripe_webhook_endpoint_secret: Optional[SecretStr] = None
    
    # Email Services (SendGrid)
    sendgrid_api_key: Optional[SecretStr] = None
    sendgrid_from_email: str = "noreply@your-domain.com"
    sendgrid_from_name: str = "AI Business Calendar"
    sendgrid_template_id_welcome: Optional[str] = None
    sendgrid_template_id_appointment_reminder: Optional[str] = None
    sendgrid_template_id_appointment_confirmation: Optional[str] = None
    
    # SMS Services (Twilio)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[SecretStr] = None
    twilio_phone_number: Optional[str] = None
    twilio_messaging_service_sid: Optional[str] = None
    
    # Push Notifications (Firebase)
    firebase_project_id: Optional[str] = None
    firebase_private_key_id: Optional[str] = None
    firebase_private_key: Optional[SecretStr] = None
    firebase_client_email: Optional[str] = None
    firebase_client_id: Optional[str] = None
    
    # File Storage (AWS S3)
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[SecretStr] = None
    aws_default_region: str = "us-east-1"
    aws_s3_bucket_name: Optional[str] = None
    aws_s3_custom_domain: Optional[str] = None
    aws_cloudfront_distribution_id: Optional[str] = None
    
    # CDN Configuration
    cdn_enabled: bool = True
    cdn_base_url: Optional[str] = None
    cdn_cache_control: str = "public, max-age=31536000"
    cdn_gzip_enabled: bool = True
    cdn_brotli_enabled: bool = True
    
    # ================================================================================
    # MONITORING & OBSERVABILITY
    # ================================================================================
    # Sentry Error Monitoring
    sentry_dsn: Optional[str] = None
    sentry_environment: str = "production"
    sentry_release: Optional[str] = None
    sentry_traces_sample_rate: float = Field(0.1, ge=0.0, le=1.0)
    sentry_profiles_sample_rate: float = Field(0.1, ge=0.0, le=1.0)
    sentry_debug: bool = False
    sentry_send_default_pii: bool = False
    sentry_attach_stacktrace: bool = True
    sentry_max_breadcrumbs: int = Field(50, ge=10, le=100)
    
    # Application Performance Monitoring (New Relic)
    new_relic_license_key: Optional[SecretStr] = None
    new_relic_app_name: str = "AI Business Calendar Production"
    new_relic_distributed_tracing_enabled: bool = True
    new_relic_log_level: Literal["debug", "info", "warning", "error", "critical"] = "info"
    
    # DataDog Monitoring
    datadog_api_key: Optional[SecretStr] = None
    datadog_app_key: Optional[SecretStr] = None
    datadog_service_name: str = "ai-business-calendar"
    datadog_env: str = "production"
    datadog_version: Optional[str] = None
    datadog_trace_enabled: bool = True
    datadog_profiling_enabled: bool = True
    
    # Prometheus Metrics
    prometheus_enabled: bool = True
    prometheus_port: int = Field(9090, ge=1000, le=65535)
    prometheus_metrics_path: str = "/metrics"
    prometheus_registry_default: bool = True
    
    # Health Checks
    health_check_enabled: bool = True
    health_check_path: str = "/health"
    health_check_detailed_path: str = "/health/detailed"
    health_check_database: bool = True
    health_check_redis: bool = True
    health_check_external_services: bool = True
    
    # ================================================================================
    # LOGGING CONFIGURATION
    # ================================================================================
    # Log Levels and Formats
    log_format: Literal["json", "text"] = "json"
    log_date_format: str = "%Y-%m-%d %H:%M:%S UTC"
    log_rotation_size_mb: int = Field(100, ge=10, le=1000)
    log_retention_days: int = Field(30, ge=1, le=365)
    log_backup_count: int = Field(10, ge=1, le=100)
    
    # Log Destinations
    log_to_file: bool = True
    log_file_path: str = "/var/log/ai-business-calendar/app.log"
    log_to_stdout: bool = True
    log_to_syslog: bool = False
    log_syslog_host: str = "localhost"
    log_syslog_port: int = Field(514, ge=1, le=65535)
    
    # Structured Logging
    structured_logging_enabled: bool = True
    log_correlation_id_enabled: bool = True
    log_trace_id_enabled: bool = True
    log_user_id_logging: bool = True
    log_performance_metrics: bool = True
    log_security_events: bool = True
    
    # Log Aggregation (ELK Stack)
    elasticsearch_url: Optional[str] = None
    elasticsearch_index: str = "ai-business-calendar-logs"
    elasticsearch_username: Optional[str] = None
    elasticsearch_password: Optional[SecretStr] = None
    
    kibana_url: Optional[str] = None
    logstash_host: Optional[str] = None
    logstash_port: int = Field(5044, ge=1, le=65535)
    
    # ================================================================================
    # FEATURE FLAGS & TOGGLES
    # ================================================================================
    # Core Features
    feature_ai_calendar_enabled: bool = True
    feature_business_intelligence_enabled: bool = True
    feature_predictive_analytics_enabled: bool = True
    feature_smart_notifications_enabled: bool = True
    feature_real_time_collaboration_enabled: bool = True
    feature_advanced_scheduling_enabled: bool = True
    
    # AI Features
    feature_ai_agent_orchestration_enabled: bool = True
    feature_ai_sentiment_analysis_enabled: bool = True
    feature_ai_recommendation_engine_enabled: bool = True
    feature_ai_anomaly_detection_enabled: bool = True
    feature_ai_natural_language_processing_enabled: bool = True
    
    # Integration Features
    feature_google_calendar_sync_enabled: bool = True
    feature_outlook_calendar_sync_enabled: bool = True
    feature_zapier_integration_enabled: bool = True
    feature_webhooks_enabled: bool = True
    feature_api_versioning_enabled: bool = True
    
    # Security Features
    feature_two_factor_auth_enabled: bool = True
    feature_single_sign_on_enabled: bool = True
    feature_audit_logging_enabled: bool = True
    feature_data_encryption_enabled: bool = True
    feature_gdpr_compliance_enabled: bool = True
    
    # Performance Features
    feature_caching_enabled: bool = True
    feature_cdn_enabled: bool = True
    feature_database_read_replicas_enabled: bool = True
    feature_horizontal_scaling_enabled: bool = True
    
    # ================================================================================
    # CUSTOM BUSINESS LOGIC
    # ================================================================================
    # Business Rules
    business_hours_start: str = "09:00"
    business_hours_end: str = "17:00"
    business_timezone: str = "America/New_York"
    business_working_days: List[int] = Field(default=[1, 2, 3, 4, 5])
    business_holidays_enabled: bool = True
    business_blackout_dates_enabled: bool = True
    
    # Calendar Settings
    calendar_default_duration_minutes: int = Field(30, ge=15, le=480)
    calendar_buffer_time_minutes: int = Field(15, ge=0, le=60)
    calendar_max_advance_booking_days: int = Field(90, ge=1, le=365)
    calendar_min_advance_booking_hours: int = Field(2, ge=0, le=48)
    calendar_overbooking_allowed: bool = False
    calendar_double_booking_prevention: bool = True
    
    # AI Business Rules
    ai_learning_enabled: bool = True
    ai_feedback_collection_enabled: bool = True
    ai_model_retraining_enabled: bool = True
    ai_explainable_ai_enabled: bool = True
    ai_bias_detection_enabled: bool = True
    ai_fairness_constraints_enabled: bool = True
    
    # ================================================================================
    # VALIDATION METHODS
    # ================================================================================
    
    @field_validator('secret_key', 'jwt_secret_key')
    @classmethod
    def validate_secret_keys(cls, v: SecretStr) -> SecretStr:
        """Validate secret keys are secure enough for production"""
        if not v:
            raise ValueError("Secret key cannot be empty")
        
        secret_value = v.get_secret_value()
        if len(secret_value) < 32:
            raise ValueError("Secret key must be at least 32 characters long")
        
        # Check for common insecure patterns
        insecure_patterns = [
            "your_secret_key", "test_key", "development_key", "changeme",
            "password", "secret", "key123", "admin", "root", "default"
        ]
        
        if any(pattern in secret_value.lower() for pattern in insecure_patterns):
            raise ValueError("Secret key contains insecure patterns")
        
        return v
    
    @field_validator('database_url')
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format and security"""
        if not v:
            raise ValueError("Database URL is required")
        
        if v.startswith("sqlite") and cls.model_fields.get('environment', 'development') == 'production':
            logger.warning("SQLite is not recommended for production use")
        
        if "localhost" in v and cls.model_fields.get('environment', 'development') == 'production':
            logger.warning("localhost in database URL for production environment")
        
        return v
    
    @field_validator('api_cors_origins')
    @classmethod
    def validate_cors_origins(cls, v: List[str]) -> List[str]:
        """Validate CORS origins for production security"""
        if "*" in v:
            environment = cls.model_fields.get('environment', 'development')
            if environment == 'production':
                raise ValueError("Wildcard CORS origins not allowed in production")
            logger.warning("Wildcard CORS origins detected - not secure for production")
        
        return v
    
    @field_validator('ai_temperature')
    @classmethod
    def validate_ai_temperature(cls, v: float) -> float:
        """Validate AI temperature is within reasonable bounds"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("AI temperature must be between 0.0 and 1.0")
        return v
    
    # ================================================================================
    # COMPUTED PROPERTIES
    # ================================================================================
    
    @cached_property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == 'production'
    
    @cached_property
    def is_staging(self) -> bool:
        """Check if running in staging environment"""
        return self.environment.lower() == 'staging'
    
    @cached_property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment.lower() == 'development'
    
    @cached_property
    def ai_providers_configured(self) -> List[str]:
        """Get list of configured AI providers"""
        providers = []
        if self.anthropic_api_key:
            providers.append("anthropic")
        if self.openai_api_key:
            providers.append("openai")
        if self.google_ai_api_key:
            providers.append("google")
        if self.cohere_api_key:
            providers.append("cohere")
        return providers
    
    @cached_property
    def business_intelligence_configured(self) -> bool:
        """Check if business intelligence services are configured"""
        return bool(
            self.ga4_measurement_id or 
            self.tableau_server_url or 
            self.power_bi_tenant_id or 
            self.looker_api_url or
            self.snowflake_account or
            self.bigquery_project_id
        )
    
    @cached_property
    def monitoring_configured(self) -> bool:
        """Check if monitoring services are configured"""
        return bool(
            self.sentry_dsn or 
            self.new_relic_license_key or 
            self.datadog_api_key or
            self.prometheus_enabled
        )
    
    # ================================================================================
    # CONFIGURATION METHODS
    # ================================================================================
    
    def get_database_config(self) -> Dict[str, Any]:
        """Get database configuration dictionary"""
        config = {
            "url": self.database_url,
            "pool_size": self.database_pool_size,
            "max_overflow": self.database_max_overflow,
            "pool_timeout": self.database_pool_timeout,
            "pool_recycle": self.database_pool_recycle,
            "pool_pre_ping": self.database_pool_pre_ping,
            "echo": self.database_echo,
        }
        
        if self.database_read_replica_enabled and self.database_read_replica_url:
            config["read_replica"] = {
                "url": self.database_read_replica_url,
                "weight": self.database_read_replica_weight
            }
        
        return config
    
    def get_redis_config(self) -> Dict[str, Any]:
        """Get Redis configuration dictionary"""
        return {
            "url": self.redis_url,
            "host": self.redis_host,
            "port": self.redis_port,
            "password": self.redis_password.get_secret_value() if self.redis_password else None,
            "ssl": self.redis_ssl,
            "ssl_cert_reqs": self.redis_ssl_cert_reqs,
            "max_connections": self.redis_max_connections,
            "socket_timeout": self.redis_socket_timeout,
            "socket_connect_timeout": self.redis_socket_connect_timeout,
            "retry_on_timeout": self.redis_retry_on_timeout,
            "health_check_interval": self.redis_health_check_interval,
        }
    
    def get_ai_config(self) -> Dict[str, Any]:
        """Get AI configuration dictionary"""
        return {
            "providers": {
                "anthropic": {
                    "api_key": self.anthropic_api_key.get_secret_value() if self.anthropic_api_key else None,
                    "model": self.ai_anthropic_model,
                },
                "openai": {
                    "api_key": self.openai_api_key.get_secret_value() if self.openai_api_key else None,
                    "model": self.ai_openai_model,
                },
                "google": {
                    "api_key": self.google_ai_api_key.get_secret_value() if self.google_ai_api_key else None,
                    "model": self.ai_google_model,
                },
                "cohere": {
                    "api_key": self.cohere_api_key.get_secret_value() if self.cohere_api_key else None,
                    "model": self.ai_cohere_model,
                },
            },
            "default_provider": self.default_ai_provider,
            "temperature": self.ai_temperature,
            "max_tokens": self.ai_max_tokens,
            "retry_attempts": self.ai_retry_attempts,
            "timeout_seconds": self.ai_timeout_seconds,
            "fallback_enabled": self.ai_fallback_enabled,
            "rate_limits": {
                "per_minute": self.ai_rate_limit_per_minute,
                "per_hour": self.ai_rate_limit_per_hour,
            },
        }
    
    def get_feature_flags(self) -> Dict[str, bool]:
        """Get all feature flags as dictionary"""
        feature_fields = {
            field_name: getattr(self, field_name)
            for field_name in self.model_fields.keys()
            if field_name.startswith('feature_') or field_name.startswith('ai_') and field_name.endswith('_enabled')
        }
        return feature_fields
    
    def validate_production_readiness(self) -> List[str]:
        """Validate configuration for production readiness"""
        issues = []
        
        if self.is_production:
            # Security checks
            if self.debug:
                issues.append("CRITICAL: Debug mode enabled in production")
            
            # Database checks
            if "sqlite" in self.database_url.lower():
                issues.append("WARNING: SQLite detected in production - consider PostgreSQL")
            
            # AI provider checks
            if not self.ai_providers_configured:
                issues.append("WARNING: No AI providers configured")
            
            # Monitoring checks
            if not self.monitoring_configured:
                issues.append("WARNING: No monitoring services configured")
            
            # Security headers
            if not self.security_headers_enabled:
                issues.append("WARNING: Security headers disabled")
            
            # HTTPS checks
            if not self.session_secure_cookies:
                issues.append("WARNING: Secure cookies disabled")
        
        return issues
    
    def load_from_file(self, config_path: Path) -> None:
        """Load configuration from external file"""
        if config_path.exists():
            with open(config_path, 'r') as f:
                config_data = json.load(f)
                for key, value in config_data.items():
                    if hasattr(self, key):
                        setattr(self, key, value)
                        
    def export_config(self, export_path: Path, include_secrets: bool = False) -> None:
        """Export configuration to file"""
        config_dict = self.model_dump(exclude_none=True)
        
        if not include_secrets:
            # Remove sensitive fields
            sensitive_fields = [
                field_name for field_name in config_dict.keys()
                if any(sensitive in field_name.lower() for sensitive in [
                    'password', 'secret', 'key', 'token', 'dsn'
                ])
            ]
            for field in sensitive_fields:
                config_dict.pop(field, None)
        
        with open(export_path, 'w') as f:
            json.dump(config_dict, f, indent=2, default=str)


# Singleton instance
ai_calendar_config = AIBusinessCalendarConfig()

# Validate production readiness on startup
if ai_calendar_config.is_production:
    issues = ai_calendar_config.validate_production_readiness()
    if issues:
        critical_issues = [issue for issue in issues if issue.startswith("CRITICAL")]
        if critical_issues:
            error_msg = f"Production startup failed: {'; '.join(critical_issues)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        else:
            logger.warning(f"Production warnings: {'; '.join(issues)}")
    else:
        logger.info("✅ Production configuration validation passed")