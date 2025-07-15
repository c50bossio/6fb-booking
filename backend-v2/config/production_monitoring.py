"""
Production Monitoring Configuration for BookedBarber V2
======================================================

This module provides comprehensive monitoring and observability configurations for production deployment.
Includes error tracking, performance monitoring, logging, and alerting.

Key features:
- Sentry error tracking and performance monitoring
- Structured logging with correlation IDs
- Application Performance Monitoring (APM)
- Business metrics and KPI tracking
- Health checks and uptime monitoring
- Alert configurations for critical issues
"""

import os
import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
import json


class ProductionMonitoringConfig:
    """Production monitoring configuration class"""

    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.is_production = self.environment == "production"

    @property
    def sentry_config(self) -> Dict[str, Any]:
        """Sentry configuration for error tracking and performance monitoring"""
        return {
            # Basic configuration
            "dsn": os.getenv("SENTRY_DSN"),
            "environment": self.environment,
            "release": os.getenv("SENTRY_RELEASE", "bookedbarber-v2.2.0"),
            
            # Sampling rates (optimized for production)
            "sample_rate": float(os.getenv("SENTRY_SAMPLE_RATE", "0.1")),  # 10% error sampling
            "traces_sample_rate": float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.02")),  # 2% performance
            "profiles_sample_rate": float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.01")),  # 1% profiling
            
            # Advanced settings
            "debug": os.getenv("SENTRY_DEBUG", "false").lower() == "true",
            "send_default_pii": os.getenv("SENTRY_SEND_DEFAULT_PII", "false").lower() == "true",
            "attach_stacktrace": os.getenv("SENTRY_ATTACH_STACKTRACE", "true").lower() == "true",
            "include_local_variables": os.getenv("SENTRY_INCLUDE_LOCAL_VARIABLES", "false").lower() == "true",
            "max_breadcrumbs": int(os.getenv("SENTRY_MAX_BREADCRUMBS", "50")),
            
            # Performance monitoring
            "enable_performance": os.getenv("SENTRY_ENABLE_PERFORMANCE", "true").lower() == "true",
            "enable_profiling": os.getenv("SENTRY_ENABLE_PROFILING", "true").lower() == "true",
            "max_span_description_length": int(os.getenv("SENTRY_MAX_SPAN_DESCRIPTION_LENGTH", "100")),
            
            # Custom tags for better organization
            "tags": {
                "service": "bookedbarber-api",
                "version": "v2.2.0",
                "environment": self.environment,
                "deployment_region": os.getenv("DEPLOYMENT_REGION", "us-east-1"),
            },
            
            # Integration settings
            "integrations": [
                "fastapi",
                "sqlalchemy",
                "redis",
                "httpx",
                "logging",
            ],
            
            # Before send hooks for data filtering
            "before_send_transaction": True,
            "before_send": True,
        }

    @property
    def logging_config(self) -> Dict[str, Any]:
        """Structured logging configuration for production"""
        return {
            # Log format and structure
            "format": os.getenv("LOG_FORMAT", "json"),  # json or text
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "correlation_id": os.getenv("LOG_CORRELATION_ID", "true").lower() == "true",
            "request_response": os.getenv("LOG_REQUEST_RESPONSE", "false").lower() == "true",
            "sensitive_data": os.getenv("LOG_SENSITIVE_DATA", "false").lower() == "true",
            
            # Log rotation and retention
            "rotation_size": os.getenv("LOG_ROTATION_SIZE", "100MB"),
            "retention_days": int(os.getenv("LOG_RETENTION_DAYS", "365")),
            "compression": os.getenv("LOG_COMPRESSION", "true").lower() == "true",
            
            # Log shipping and aggregation
            "shipper": os.getenv("LOG_SHIPPER", "fluentd"),
            "aggregation_endpoint": os.getenv("LOG_AGGREGATION_ENDPOINT"),
            "encryption_in_transit": os.getenv("LOG_ENCRYPTION_IN_TRANSIT", "true").lower() == "true",
            
            # Structured fields
            "include_fields": [
                "timestamp",
                "level",
                "message",
                "correlation_id",
                "user_id",
                "request_id",
                "endpoint",
                "method",
                "status_code",
                "response_time",
                "error_code",
                "stack_trace",
            ],
        }

    @property
    def audit_logging_config(self) -> Dict[str, Any]:
        """Audit logging configuration for compliance"""
        return {
            "enabled": os.getenv("AUDIT_LOG_ENABLED", "true").lower() == "true",
            "level": os.getenv("AUDIT_LOG_LEVEL", "INFO"),
            "sensitive_operations": os.getenv("AUDIT_LOG_SENSITIVE_OPERATIONS", "true").lower() == "true",
            "user_actions": os.getenv("AUDIT_LOG_USER_ACTIONS", "true").lower() == "true",
            "retention_days": int(os.getenv("AUDIT_LOG_RETENTION_DAYS", "2555")),  # 7 years
            
            # Events to audit
            "audit_events": [
                "user_login",
                "user_logout",
                "password_change",
                "permission_change",
                "payment_processed",
                "data_export",
                "data_deletion",
                "configuration_change",
                "security_incident",
            ],
            
            # Audit log format
            "format": {
                "timestamp": "ISO8601",
                "event_type": "string",
                "user_id": "string",
                "session_id": "string",
                "ip_address": "string",
                "user_agent": "string",
                "resource": "string",
                "action": "string",
                "result": "string",
                "details": "object",
            },
        }

    @property
    def health_check_config(self) -> Dict[str, Any]:
        """Health check configuration for uptime monitoring"""
        return {
            "enabled": os.getenv("HEALTH_CHECK_ENABLED", "true").lower() == "true",
            "interval": int(os.getenv("HEALTH_CHECK_INTERVAL", "30")),  # seconds
            "timeout": int(os.getenv("HEALTH_CHECK_TIMEOUT", "10")),
            "endpoints": os.getenv("HEALTH_CHECK_ENDPOINTS", "/health,/api/v1/health,/ready").split(","),
            
            # Health check components
            "checks": [
                {
                    "name": "database",
                    "endpoint": "/health/database",
                    "timeout": 5,
                    "critical": True,
                },
                {
                    "name": "redis",
                    "endpoint": "/health/redis",
                    "timeout": 3,
                    "critical": True,
                },
                {
                    "name": "external_services",
                    "endpoint": "/health/external",
                    "timeout": 10,
                    "critical": False,
                },
                {
                    "name": "disk_space",
                    "endpoint": "/health/disk",
                    "timeout": 2,
                    "critical": True,
                },
                {
                    "name": "memory",
                    "endpoint": "/health/memory",
                    "timeout": 2,
                    "critical": True,
                },
            ],
        }

    @property
    def metrics_config(self) -> Dict[str, Any]:
        """Application metrics configuration"""
        return {
            "enabled": os.getenv("METRICS_ENABLED", "true").lower() == "true",
            "endpoint": "/metrics",
            "format": "prometheus",
            
            # Business metrics
            "business_metrics": [
                "appointments_created_total",
                "appointments_cancelled_total",
                "payments_processed_total",
                "payments_failed_total",
                "revenue_total",
                "active_users_total",
                "new_registrations_total",
                "email_notifications_sent_total",
                "sms_notifications_sent_total",
            ],
            
            # Technical metrics
            "technical_metrics": [
                "http_requests_total",
                "http_request_duration_seconds",
                "database_connections_active",
                "database_query_duration_seconds",
                "redis_operations_total",
                "cache_hits_total",
                "cache_misses_total",
                "background_tasks_total",
                "error_rate",
            ],
            
            # Custom metrics
            "custom_metrics": {
                "booking_conversion_rate": {
                    "type": "gauge",
                    "description": "Rate of bookings completed vs started",
                },
                "average_booking_value": {
                    "type": "gauge",
                    "description": "Average value of completed bookings",
                },
                "user_session_duration": {
                    "type": "histogram",
                    "description": "Duration of user sessions",
                },
                "api_response_time_p95": {
                    "type": "gauge",
                    "description": "95th percentile API response time",
                },
            },
        }

    @property
    def alerting_config(self) -> Dict[str, Any]:
        """Alerting configuration for critical issues"""
        return {
            # Alert channels
            "channels": {
                "email": {
                    "enabled": True,
                    "recipients": ["ops@bookedbarber.com", "security@bookedbarber.com"],
                },
                "slack": {
                    "enabled": True,
                    "webhook_url": os.getenv("SLACK_WEBHOOK_URL"),
                    "channel": "#alerts-production",
                },
                "pagerduty": {
                    "enabled": self.is_production,
                    "service_key": os.getenv("PAGERDUTY_SERVICE_KEY"),
                },
                "sms": {
                    "enabled": self.is_production,
                    "numbers": [os.getenv("ONCALL_PHONE")],
                },
            },
            
            # Alert rules
            "rules": [
                {
                    "name": "High Error Rate",
                    "condition": "error_rate > 5%",
                    "severity": "critical",
                    "channels": ["email", "slack", "pagerduty"],
                },
                {
                    "name": "Database Connection Pool Exhausted",
                    "condition": "database_connections_active > 90%",
                    "severity": "critical",
                    "channels": ["email", "slack", "pagerduty"],
                },
                {
                    "name": "High Response Time",
                    "condition": "api_response_time_p95 > 2000ms",
                    "severity": "warning",
                    "channels": ["email", "slack"],
                },
                {
                    "name": "Payment Processing Failure",
                    "condition": "payment_failure_rate > 2%",
                    "severity": "critical",
                    "channels": ["email", "slack", "pagerduty", "sms"],
                },
                {
                    "name": "Memory Usage High",
                    "condition": "memory_usage > 85%",
                    "severity": "warning",
                    "channels": ["email", "slack"],
                },
                {
                    "name": "Disk Space Low",
                    "condition": "disk_usage > 85%",
                    "severity": "warning",
                    "channels": ["email", "slack"],
                },
                {
                    "name": "Service Unavailable",
                    "condition": "health_check_failed",
                    "severity": "critical",
                    "channels": ["email", "slack", "pagerduty", "sms"],
                },
            ],
            
            # Alert suppression
            "suppression": {
                "enable_maintenance_mode": True,
                "maintenance_window": {
                    "start": os.getenv("MAINTENANCE_WINDOW_START", "02:00"),
                    "end": os.getenv("MAINTENANCE_WINDOW_END", "04:00"),
                    "timezone": "UTC",
                },
                "suppress_during_deployment": True,
                "cooldown_period": 300,  # 5 minutes
            },
        }

    @property
    def performance_monitoring_config(self) -> Dict[str, Any]:
        """Performance monitoring configuration"""
        return {
            # APM settings
            "apm_enabled": True,
            "transaction_sample_rate": 0.1,  # 10% of transactions
            "slow_transaction_threshold": 1000,  # ms
            
            # Real User Monitoring (RUM)
            "rum_enabled": True,
            "rum_sample_rate": 0.05,  # 5% of page views
            
            # Database monitoring
            "database_monitoring": {
                "slow_query_threshold": 1000,  # ms
                "track_connection_pool": True,
                "monitor_replica_lag": True,
            },
            
            # Cache monitoring
            "cache_monitoring": {
                "track_hit_ratio": True,
                "monitor_memory_usage": True,
                "alert_on_high_miss_rate": True,
            },
            
            # External service monitoring
            "external_service_monitoring": {
                "stripe": {"timeout": 5000, "alert_threshold": 2000},
                "sendgrid": {"timeout": 10000, "alert_threshold": 5000},
                "twilio": {"timeout": 5000, "alert_threshold": 3000},
                "google_calendar": {"timeout": 10000, "alert_threshold": 5000},
            },
        }

    def get_logger_config(self) -> Dict[str, Any]:
        """Get complete logger configuration"""
        config = self.logging_config
        
        logger_config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "format": json.dumps({
                        "timestamp": "%(asctime)s",
                        "level": "%(levelname)s",
                        "logger": "%(name)s",
                        "message": "%(message)s",
                        "correlation_id": "%(correlation_id)s",
                        "request_id": "%(request_id)s",
                    }),
                },
                "text": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": config["level"],
                    "formatter": config["format"],
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": "logs/app.log",
                    "maxBytes": 100 * 1024 * 1024,  # 100MB
                    "backupCount": 10,
                    "level": config["level"],
                    "formatter": config["format"],
                },
            },
            "loggers": {
                "": {
                    "handlers": ["console", "file"],
                    "level": config["level"],
                    "propagate": False,
                },
                "uvicorn": {
                    "handlers": ["console", "file"],
                    "level": "INFO",
                    "propagate": False,
                },
                "sqlalchemy.engine": {
                    "handlers": ["file"],
                    "level": "WARNING",
                    "propagate": False,
                },
            },
        }
        
        return logger_config

    def validate_monitoring_config(self) -> List[str]:
        """Validate monitoring configuration"""
        issues = []
        
        if not self.is_production:
            return issues
        
        # Check Sentry configuration
        sentry_config = self.sentry_config
        if not sentry_config["dsn"]:
            issues.append("Sentry DSN not configured")
        
        if sentry_config["sample_rate"] > 0.2:
            issues.append("Sentry sample rate too high for production")
        
        # Check alerting configuration
        alert_config = self.alerting_config
        if not any(channel["enabled"] for channel in alert_config["channels"].values()):
            issues.append("No alert channels configured")
        
        # Check health checks
        health_config = self.health_check_config
        if not health_config["enabled"]:
            issues.append("Health checks are disabled")
        
        return issues


# Global instance
production_monitoring = ProductionMonitoringConfig()


# Utility functions
def setup_correlation_id_logging():
    """Set up correlation ID logging for request tracing"""
    import logging
    import uuid
    from contextvars import ContextVar
    
    correlation_id_var = ContextVar('correlation_id', default=None)
    
    class CorrelationIdFilter(logging.Filter):
        def filter(self, record):
            record.correlation_id = correlation_id_var.get() or str(uuid.uuid4())
            return True
    
    # Add filter to all handlers
    logger = logging.getLogger()
    for handler in logger.handlers:
        handler.addFilter(CorrelationIdFilter())


def create_custom_metrics():
    """Create custom metrics for business monitoring"""
    # This would integrate with Prometheus or other metrics systems
    pass


def configure_sentry():
    """Configure Sentry for error tracking"""
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    
    config = production_monitoring.sentry_config
    
    if config["dsn"]:
        sentry_sdk.init(
            dsn=config["dsn"],
            environment=config["environment"],
            release=config["release"],
            sample_rate=config["sample_rate"],
            traces_sample_rate=config["traces_sample_rate"],
            profiles_sample_rate=config["profiles_sample_rate"],
            debug=config["debug"],
            send_default_pii=config["send_default_pii"],
            attach_stacktrace=config["attach_stacktrace"],
            max_breadcrumbs=config["max_breadcrumbs"],
            integrations=[
                FastApiIntegration(auto_enabling_integrations=False),
                SqlalchemyIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            before_send=filter_sensitive_data,
            before_send_transaction=filter_performance_data,
        )


def filter_sensitive_data(event, hint):
    """Filter sensitive data from Sentry events"""
    # Remove sensitive information
    if 'request' in event:
        if 'headers' in event['request']:
            # Remove authorization headers
            event['request']['headers'] = {
                k: v for k, v in event['request']['headers'].items()
                if k.lower() not in ['authorization', 'cookie', 'x-api-key']
            }
    
    return event


def filter_performance_data(event, hint):
    """Filter performance data for Sentry"""
    # Skip health check transactions
    if event.get('transaction', '').startswith('/health'):
        return None
    
    return event


# Export key configurations
__all__ = [
    "ProductionMonitoringConfig",
    "production_monitoring",
    "setup_correlation_id_logging",
    "configure_sentry",
]