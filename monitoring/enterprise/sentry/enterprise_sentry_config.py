"""
Enterprise Sentry Configuration for BookedBarber V2 Production Monitoring
=========================================================================

This module provides enterprise-grade Sentry configuration for production monitoring
of 10,000+ concurrent users with advanced error tracking, performance monitoring,
and business metrics integration.

Features:
- Multi-environment Sentry configuration
- Advanced error filtering and sampling
- Business context enrichment
- Real-time alert integration
- Performance profiling for scale
- Security-focused data handling
"""

import os
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
import json
import asyncio
from contextlib import contextmanager
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.celery import CeleryIntegration


class EnterpriseSentryConfig:
    """Enterprise-grade Sentry configuration for production monitoring"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.is_production = self.environment == "production"
        self.service_name = "bookedbarber-v2"
        self.version = os.getenv("APP_VERSION", "2.2.0")
        
        # Performance settings for 10k+ concurrent users
        self.high_volume_config = {
            "production": {
                "sample_rate": 0.05,  # 5% error sampling for high volume
                "traces_sample_rate": 0.001,  # 0.1% transaction sampling
                "profiles_sample_rate": 0.0005,  # 0.05% profiling sampling
            },
            "staging": {
                "sample_rate": 0.2,  # 20% error sampling
                "traces_sample_rate": 0.1,  # 10% transaction sampling
                "profiles_sample_rate": 0.05,  # 5% profiling sampling
            },
            "development": {
                "sample_rate": 1.0,  # 100% error sampling
                "traces_sample_rate": 1.0,  # 100% transaction sampling
                "profiles_sample_rate": 0.5,  # 50% profiling sampling
            }
        }
    
    def get_sentry_config(self) -> Dict[str, Any]:
        """Get Sentry configuration optimized for enterprise production"""
        volume_config = self.high_volume_config.get(self.environment, self.high_volume_config["development"])
        
        return {
            # Core configuration
            "dsn": os.getenv("SENTRY_DSN"),
            "environment": self.environment,
            "release": f"{self.service_name}@{self.version}",
            "server_name": os.getenv("SERVER_NAME", f"{self.service_name}-{self.environment}"),
            
            # Sampling configuration optimized for scale
            "sample_rate": float(os.getenv("SENTRY_SAMPLE_RATE", str(volume_config["sample_rate"]))),
            "traces_sample_rate": float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", str(volume_config["traces_sample_rate"]))),
            "profiles_sample_rate": float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", str(volume_config["profiles_sample_rate"]))),
            
            # Performance settings
            "debug": False if self.is_production else True,
            "send_default_pii": False,  # Never send PII in production
            "attach_stacktrace": True,
            "include_local_variables": False if self.is_production else True,
            "max_breadcrumbs": 50 if self.is_production else 100,
            "max_value_length": 1024,
            "max_tag_value_length": 200,
            
            # Enterprise tags for better organization
            "tags": self._get_enterprise_tags(),
            
            # Advanced integrations
            "integrations": self._get_integrations(),
            
            # Custom hooks for enterprise monitoring
            "before_send": self._before_send_hook,
            "before_send_transaction": self._before_send_transaction_hook,
            "transport": self._get_transport_config(),
            
            # Performance monitoring
            "enable_tracing": True,
            "enable_profiling": True,
            "instrumenter": "sentry",
            
            # Error filtering
            "ignore_errors": self._get_ignored_errors(),
            "in_app_include": ["bookedbarber", "api", "services", "models"],
            "in_app_exclude": ["sentry_sdk", "celery", "redis"],
        }
    
    def _get_enterprise_tags(self) -> Dict[str, str]:
        """Get enterprise-specific tags for better monitoring organization"""
        return {
            "service": self.service_name,
            "version": self.version,
            "environment": self.environment,
            "region": os.getenv("AWS_REGION", "us-east-1"),
            "availability_zone": os.getenv("AWS_AVAILABILITY_ZONE", "us-east-1a"),
            "instance_type": os.getenv("INSTANCE_TYPE", "unknown"),
            "deployment_id": os.getenv("DEPLOYMENT_ID", "unknown"),
            "build_id": os.getenv("BUILD_ID", "unknown"),
            "git_commit": os.getenv("GIT_COMMIT", "unknown")[:8],
            "container_id": os.getenv("HOSTNAME", "unknown"),
            "cluster": os.getenv("CLUSTER_NAME", "default"),
            "namespace": os.getenv("KUBERNETES_NAMESPACE", "default"),
        }
    
    def _get_integrations(self) -> List[Any]:
        """Get enterprise-grade integrations"""
        integrations = [
            # FastAPI integration with performance monitoring
            FastApiIntegration(
                auto_enabling_integrations=False,
                transaction_style="endpoint",
                failed_request_status_codes=[400, 401, 403, 404, 413, 429, 500, 502, 503, 504]
            ),
            
            # Database monitoring
            SqlalchemyIntegration(),
            
            # Redis monitoring
            RedisIntegration(),
            
            # HTTP client monitoring
            HttpxIntegration(),
            
            # Logging integration
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            ),
            
            # Background job monitoring
            CeleryIntegration(),
        ]
        
        return integrations
    
    def _get_transport_config(self) -> Optional[Any]:
        """Get transport configuration for high-volume production"""
        if self.is_production:
            # Use async transport for better performance
            from sentry_sdk.transport import HttpTransport
            return HttpTransport
        return None
    
    def _get_ignored_errors(self) -> List[str]:
        """Get list of errors to ignore for noise reduction"""
        return [
            # Client-side errors
            "ChunkedEncodingError",
            "ConnectionResetError",
            "BrokenPipeError",
            
            # Expected HTTP errors
            "HTTPException",
            "ValidationError",
            
            # Rate limiting
            "TooManyRequests",
            
            # Health check noise
            "HealthCheckError",
            
            # Third-party service temporary failures
            "StripeTemporaryError",
            "SendGridTemporaryError",
            "TwilioTemporaryError",
            
            # Database connection pool exhaustion (handled gracefully)
            "PoolExhausted",
        ]
    
    def _before_send_hook(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Advanced error filtering and enrichment for enterprise monitoring"""
        
        # Skip if in maintenance mode
        if os.getenv("MAINTENANCE_MODE", "false").lower() == "true":
            return None
        
        # Add business context
        self._add_business_context(event)
        
        # Add performance context
        self._add_performance_context(event)
        
        # Filter sensitive data
        self._filter_sensitive_data(event)
        
        # Add enterprise metadata
        self._add_enterprise_metadata(event)
        
        # Apply rate limiting for specific error types
        if self._should_rate_limit_error(event):
            return None
        
        return event
    
    def _before_send_transaction_hook(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Performance monitoring filter for enterprise scale"""
        
        # Skip health check transactions to reduce noise
        transaction_name = event.get("transaction", "")
        if any(health_path in transaction_name for health_path in ["/health", "/metrics", "/ready", "/live"]):
            return None
        
        # Skip internal monitoring endpoints
        if transaction_name.startswith("/internal/"):
            return None
        
        # Add business performance context
        self._add_business_performance_context(event)
        
        # Filter high-frequency, low-value transactions in production
        if self.is_production and self._is_low_value_transaction(event):
            return None
        
        return event
    
    def _add_business_context(self, event: Dict[str, Any]) -> None:
        """Add business-specific context to errors"""
        if "contexts" not in event:
            event["contexts"] = {}
        
        event["contexts"]["business"] = {
            "service_type": "booking_platform",
            "business_model": "saas",
            "target_market": "barbershops",
            "revenue_model": "subscription_commission",
        }
        
        # Add request-specific business context if available
        request = event.get("request", {})
        if request:
            self._extract_business_context_from_request(event, request)
    
    def _add_performance_context(self, event: Dict[str, Any]) -> None:
        """Add performance context for enterprise monitoring"""
        if "contexts" not in event:
            event["contexts"] = {}
        
        event["contexts"]["performance"] = {
            "environment_type": self.environment,
            "expected_load": "10000_concurrent_users",
            "performance_tier": "enterprise",
            "monitoring_level": "comprehensive",
        }
    
    def _add_enterprise_metadata(self, event: Dict[str, Any]) -> None:
        """Add enterprise-specific metadata"""
        if "extra" not in event:
            event["extra"] = {}
        
        event["extra"]["enterprise"] = {
            "monitoring_tier": "enterprise",
            "support_level": "enterprise",
            "sla_tier": "99_9_percent",
            "alert_priority": self._get_alert_priority(event),
            "escalation_level": self._get_escalation_level(event),
        }
    
    def _filter_sensitive_data(self, event: Dict[str, Any]) -> None:
        """Enterprise-grade sensitive data filtering"""
        
        # Remove PII from request data
        if "request" in event:
            request = event["request"]
            
            # Filter headers
            if "headers" in request:
                sensitive_headers = {
                    "authorization", "cookie", "x-api-key", "x-stripe-signature",
                    "x-twilio-signature", "user-agent", "x-forwarded-for"
                }
                request["headers"] = {
                    k: "[Filtered]" if k.lower() in sensitive_headers else v
                    for k, v in request["headers"].items()
                }
            
            # Filter query parameters
            if "query_string" in request:
                sensitive_params = {"token", "key", "password", "secret", "api_key"}
                if any(param in request["query_string"].lower() for param in sensitive_params):
                    request["query_string"] = "[Filtered]"
            
            # Filter request body
            if "data" in request:
                self._filter_sensitive_request_data(request["data"])
        
        # Remove sensitive data from extra context
        if "extra" in event:
            self._filter_sensitive_extra_data(event["extra"])
    
    def _filter_sensitive_request_data(self, data: Any) -> None:
        """Filter sensitive data from request payload"""
        if isinstance(data, dict):
            sensitive_fields = {
                "password", "credit_card", "ssn", "social_security_number",
                "bank_account", "routing_number", "cvv", "cvc", "pin",
                "secret", "private_key", "api_key", "token"
            }
            
            for field in list(data.keys()):
                if field.lower() in sensitive_fields:
                    data[field] = "[Filtered]"
                elif isinstance(data[field], dict):
                    self._filter_sensitive_request_data(data[field])
    
    def _filter_sensitive_extra_data(self, extra: Dict[str, Any]) -> None:
        """Filter sensitive data from extra context"""
        sensitive_keys = {
            "database_url", "redis_url", "secret_key", "private_key",
            "stripe_secret", "twilio_auth_token", "sendgrid_api_key"
        }
        
        for key in list(extra.keys()):
            if key.lower() in sensitive_keys:
                extra[key] = "[Filtered]"
            elif isinstance(extra[key], dict):
                self._filter_sensitive_extra_data(extra[key])
    
    def _extract_business_context_from_request(self, event: Dict[str, Any], request: Dict[str, Any]) -> None:
        """Extract business context from request"""
        url = request.get("url", "")
        
        # Extract business entities from URL
        if "/appointments/" in url:
            event["contexts"]["business"]["entity_type"] = "appointment"
        elif "/payments/" in url:
            event["contexts"]["business"]["entity_type"] = "payment"
        elif "/users/" in url:
            event["contexts"]["business"]["entity_type"] = "user"
        elif "/barbers/" in url:
            event["contexts"]["business"]["entity_type"] = "barber"
        elif "/locations/" in url:
            event["contexts"]["business"]["entity_type"] = "location"
    
    def _should_rate_limit_error(self, event: Dict[str, Any]) -> bool:
        """Determine if error should be rate limited"""
        
        # Rate limit validation errors in production
        if self.is_production:
            exception_type = event.get("exception", {}).get("values", [{}])[-1].get("type", "")
            
            # Rate limit common validation errors
            if exception_type in ["ValidationError", "RequestValidationError"]:
                # Implement simple in-memory rate limiting
                return self._check_rate_limit(f"validation_error_{exception_type}")
            
            # Rate limit third-party service errors
            if "stripe" in exception_type.lower() or "sendgrid" in exception_type.lower():
                return self._check_rate_limit(f"third_party_error_{exception_type}")
        
        return False
    
    def _check_rate_limit(self, error_key: str, limit: int = 10, window: int = 60) -> bool:
        """Simple in-memory rate limiting for errors"""
        # This would be replaced with Redis-based rate limiting in production
        current_time = datetime.now()
        
        # For now, just implement basic logic
        # In production, use Redis with sliding window
        return False
    
    def _is_low_value_transaction(self, event: Dict[str, Any]) -> bool:
        """Determine if transaction is low value for monitoring"""
        transaction_name = event.get("transaction", "")
        
        # Skip very fast transactions that don't need monitoring
        duration = event.get("spans", [{}])[-1].get("timestamp", 0) - event.get("start_timestamp", 0)
        if duration < 0.001:  # Less than 1ms
            return True
        
        # Skip static asset requests
        if any(ext in transaction_name for ext in [".css", ".js", ".ico", ".png", ".jpg"]):
            return True
        
        return False
    
    def _add_business_performance_context(self, event: Dict[str, Any]) -> None:
        """Add business performance context to transactions"""
        if "contexts" not in event:
            event["contexts"] = {}
        
        transaction_name = event.get("transaction", "")
        
        # Add business-critical transaction flags
        business_critical = any(endpoint in transaction_name for endpoint in [
            "/api/v1/appointments", "/api/v1/payments", "/api/v1/auth"
        ])
        
        event["contexts"]["business_performance"] = {
            "is_business_critical": business_critical,
            "affects_revenue": business_critical,
            "user_facing": not transaction_name.startswith("/internal/"),
            "performance_tier": "critical" if business_critical else "standard",
        }
    
    def _get_alert_priority(self, event: Dict[str, Any]) -> str:
        """Determine alert priority based on error context"""
        
        # High priority for payment and booking errors
        if any(keyword in str(event).lower() for keyword in ["payment", "stripe", "booking", "appointment"]):
            return "high"
        
        # Medium priority for user-facing errors
        if "user" in str(event).lower():
            return "medium"
        
        return "low"
    
    def _get_escalation_level(self, event: Dict[str, Any]) -> str:
        """Determine escalation level for enterprise support"""
        
        # Critical escalation for revenue-affecting errors
        if any(keyword in str(event).lower() for keyword in ["payment", "stripe", "revenue"]):
            return "critical"
        
        # High escalation for user-facing errors
        if any(keyword in str(event).lower() for keyword in ["booking", "appointment", "auth"]):
            return "high"
        
        return "standard"


class SentryBusinessMetrics:
    """Business metrics integration with Sentry"""
    
    def __init__(self):
        self.metrics_enabled = os.getenv("SENTRY_METRICS_ENABLED", "true").lower() == "true"
    
    @contextmanager
    def track_business_transaction(self, operation: str, description: str):
        """Track business-critical transactions"""
        if not self.metrics_enabled:
            yield
            return
        
        with sentry_sdk.start_transaction(op=operation, name=description) as transaction:
            transaction.set_tag("business_critical", True)
            transaction.set_tag("affects_revenue", operation in ["payment", "booking"])
            yield transaction
    
    def track_business_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Track custom business metrics"""
        if not self.metrics_enabled:
            return
        
        sentry_sdk.set_measurement(metric_name, value, "custom")
        
        if tags:
            for key, value in tags.items():
                sentry_sdk.set_tag(f"metric_{key}", value)
    
    def track_booking_conversion(self, step: str, success: bool, user_id: Optional[str] = None):
        """Track booking conversion funnel"""
        if not self.metrics_enabled:
            return
        
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("conversion_step", step)
            scope.set_tag("conversion_success", success)
            if user_id:
                scope.set_user({"id": user_id})
            
            sentry_sdk.add_breadcrumb(
                message=f"Booking conversion: {step}",
                data={"success": success, "step": step},
                level="info"
            )
    
    def track_payment_transaction(self, amount: float, currency: str, success: bool, payment_method: str):
        """Track payment transactions for business metrics"""
        if not self.metrics_enabled:
            return
        
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("payment_method", payment_method)
            scope.set_tag("currency", currency)
            scope.set_tag("payment_success", success)
            
            sentry_sdk.set_measurement("payment_amount", amount, currency.lower())
            
            if success:
                sentry_sdk.add_breadcrumb(
                    message="Payment processed successfully",
                    data={"amount": amount, "currency": currency, "method": payment_method},
                    level="info"
                )


class SentryAlertManager:
    """Enterprise alert management for Sentry"""
    
    def __init__(self):
        self.alert_enabled = os.getenv("SENTRY_ALERTS_ENABLED", "true").lower() == "true"
        self.webhook_url = os.getenv("SENTRY_ALERT_WEBHOOK_URL")
        self.escalation_enabled = os.getenv("SENTRY_ESCALATION_ENABLED", "true").lower() == "true"
    
    async def process_alert(self, event: Dict[str, Any], severity: str = "medium"):
        """Process and route Sentry alerts"""
        if not self.alert_enabled:
            return
        
        alert_data = {
            "timestamp": datetime.now().isoformat(),
            "service": "bookedbarber-v2",
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "severity": severity,
            "event_id": event.get("event_id"),
            "error_type": self._extract_error_type(event),
            "message": event.get("message", {}).get("formatted", "Unknown error"),
            "user_count": self._estimate_affected_users(event),
            "business_impact": self._assess_business_impact(event),
        }
        
        # Route alert based on severity and business impact
        await self._route_alert(alert_data)
    
    def _extract_error_type(self, event: Dict[str, Any]) -> str:
        """Extract error type from Sentry event"""
        exceptions = event.get("exception", {}).get("values", [])
        if exceptions:
            return exceptions[-1].get("type", "UnknownError")
        return "UnknownError"
    
    def _estimate_affected_users(self, event: Dict[str, Any]) -> int:
        """Estimate number of affected users"""
        # This would integrate with user session tracking
        # For now, return a conservative estimate
        return 1
    
    def _assess_business_impact(self, event: Dict[str, Any]) -> str:
        """Assess business impact of the error"""
        error_str = str(event).lower()
        
        if any(keyword in error_str for keyword in ["payment", "stripe", "revenue"]):
            return "high"
        elif any(keyword in error_str for keyword in ["booking", "appointment"]):
            return "medium"
        else:
            return "low"
    
    async def _route_alert(self, alert_data: Dict[str, Any]):
        """Route alert to appropriate channels"""
        
        # High business impact alerts go to multiple channels
        if alert_data["business_impact"] == "high":
            await self._send_to_pagerduty(alert_data)
            await self._send_to_slack(alert_data)
            await self._send_email_alert(alert_data)
        
        # Medium impact to Slack and email
        elif alert_data["business_impact"] == "medium":
            await self._send_to_slack(alert_data)
            await self._send_email_alert(alert_data)
        
        # Low impact to Slack only
        else:
            await self._send_to_slack(alert_data)
    
    async def _send_to_pagerduty(self, alert_data: Dict[str, Any]):
        """Send alert to PagerDuty for immediate response"""
        # Implementation would integrate with PagerDuty API
        pass
    
    async def _send_to_slack(self, alert_data: Dict[str, Any]):
        """Send alert to Slack channel"""
        # Implementation would integrate with Slack API
        pass
    
    async def _send_email_alert(self, alert_data: Dict[str, Any]):
        """Send email alert to operations team"""
        # Implementation would integrate with email service
        pass


# Global instances
enterprise_sentry = EnterpriseSentryConfig()
business_metrics = SentryBusinessMetrics()
alert_manager = SentryAlertManager()


def initialize_enterprise_sentry():
    """Initialize enterprise Sentry configuration"""
    config = enterprise_sentry.get_sentry_config()
    
    if config["dsn"]:
        sentry_sdk.init(**config)
        logging.info("Enterprise Sentry initialized successfully")
        return True
    else:
        logging.warning("Sentry DSN not configured - monitoring disabled")
        return False


def capture_business_error(error: Exception, context: Dict[str, Any]):
    """Capture business-specific errors with enhanced context"""
    with sentry_sdk.push_scope() as scope:
        scope.set_context("business", context)
        scope.set_tag("error_category", "business")
        sentry_sdk.capture_exception(error)


def capture_performance_issue(operation: str, duration: float, threshold: float):
    """Capture performance issues for enterprise monitoring"""
    if duration > threshold:
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("performance_issue", True)
            scope.set_extra("operation", operation)
            scope.set_extra("duration_ms", duration * 1000)
            scope.set_extra("threshold_ms", threshold * 1000)
            
            sentry_sdk.capture_message(
                f"Performance threshold exceeded: {operation}",
                level="warning"
            )


# Export key components
__all__ = [
    "EnterpriseSentryConfig",
    "SentryBusinessMetrics", 
    "SentryAlertManager",
    "enterprise_sentry",
    "business_metrics",
    "alert_manager",
    "initialize_enterprise_sentry",
    "capture_business_error",
    "capture_performance_issue",
]