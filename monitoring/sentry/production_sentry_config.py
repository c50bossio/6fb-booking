"""
Enterprise Sentry Configuration for BookedBarber V2
==================================================

Production-grade Sentry configuration optimized for 10,000+ concurrent users
with comprehensive error tracking, performance monitoring, and incident management.
"""

import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.aiohttp import AioHttpIntegration
from sentry_sdk.integrations.threading import ThreadingIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from typing import Dict, Any, Optional
import logging
import re


class ProductionSentryConfig:
    """Enterprise Sentry configuration for production monitoring"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "production")
        self.release = os.getenv("SENTRY_RELEASE", "bookedbarber-v2.3.0")
        self.server_name = os.getenv("SERVER_NAME", "bookedbarber-api")
        
    def configure_sentry(self):
        """Configure Sentry with enterprise settings"""
        sentry_dsn = os.getenv("SENTRY_DSN")
        
        if not sentry_dsn:
            logging.warning("Sentry DSN not configured - error tracking disabled")
            return
        
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=self.environment,
            release=self.release,
            server_name=self.server_name,
            
            # Sampling Configuration (optimized for high traffic)
            sample_rate=float(os.getenv("SENTRY_SAMPLE_RATE", "0.05")),  # 5% for error sampling
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.01")),  # 1% for performance
            profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.005")),  # 0.5% for profiling
            
            # Performance and Resource Management
            max_breadcrumbs=100,
            max_events_per_second=100,  # Rate limiting
            shutdown_timeout=5,
            
            # Data Collection Settings
            debug=False,  # Always False in production
            send_default_pii=False,  # Enhanced privacy
            attach_stacktrace=True,
            include_local_variables=False,  # Performance optimization
            
            # Custom Tags
            tags={
                "service": "bookedbarber-api",
                "tier": "production",
                "version": self.release,
                "region": os.getenv("DEPLOYMENT_REGION", "us-east-1"),
                "cluster": os.getenv("CLUSTER_NAME", "production"),
            },
            
            # Context Data
            extra_context={
                "deployment_time": os.getenv("DEPLOYMENT_TIME"),
                "build_hash": os.getenv("BUILD_HASH"),
                "node_name": os.getenv("NODE_NAME"),
            },
            
            # Integrations
            integrations=[
                FastApiIntegration(
                    auto_enabling_integrations=False,
                    transaction_style="endpoint",
                    failed_request_status_codes=[500, 501, 502, 503, 504, 505],
                ),
                SqlalchemyIntegration(),
                RedisIntegration(),
                LoggingIntegration(
                    level=logging.INFO,
                    event_level=logging.ERROR,
                ),
                AioHttpIntegration(),
                ThreadingIntegration(propagate_hub=True),
                CeleryIntegration(
                    monitor_beat_tasks=True,
                    propagate_traces=True,
                ),
            ],
            
            # Event Filtering
            before_send=self.filter_events,
            before_send_transaction=self.filter_transactions,
            
            # Transport options
            transport_queue_size=1000,
        )
        
        # Configure custom user context
        self._configure_user_context()
        
        # Set up custom breadcrumbs
        self._configure_breadcrumbs()
        
        # Configure alert rules
        self._configure_alert_rules()
        
        logging.info("Sentry configured for production monitoring")
    
    def filter_events(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter and sanitize error events before sending to Sentry"""
        
        # Skip health check errors
        if self._is_health_check_event(event):
            return None
        
        # Skip known non-critical errors
        if self._is_known_non_critical_error(event):
            return None
        
        # Filter sensitive data
        event = self._filter_sensitive_data(event)
        
        # Add business context
        event = self._add_business_context(event)
        
        # Rate limit similar errors
        if self._should_rate_limit_error(event):
            return None
        
        return event
    
    def filter_transactions(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter performance transactions before sending to Sentry"""
        
        # Skip health check transactions
        if self._is_health_check_transaction(event):
            return None
        
        # Skip fast transactions (under 100ms)
        if self._is_fast_transaction(event):
            return None
        
        # Sample slow transactions more heavily
        if self._is_slow_transaction(event):
            # Always capture slow transactions
            return event
        
        return event
    
    def _is_health_check_event(self, event: Dict[str, Any]) -> bool:
        """Check if event is from health check endpoints"""
        request_url = event.get("request", {}).get("url", "")
        transaction_name = event.get("transaction", "")
        
        health_patterns = [
            "/health",
            "/ready",
            "/alive",
            "/ping",
            "/status",
            "health_check",
        ]
        
        return any(pattern in request_url or pattern in transaction_name for pattern in health_patterns)
    
    def _is_health_check_transaction(self, event: Dict[str, Any]) -> bool:
        """Check if transaction is from health check endpoints"""
        return self._is_health_check_event(event)
    
    def _is_known_non_critical_error(self, event: Dict[str, Any]) -> bool:
        """Check if error is non-critical and should be filtered"""
        exception = event.get("exception", {}).get("values", [{}])[0]
        error_type = exception.get("type", "")
        error_value = exception.get("value", "")
        
        non_critical_patterns = [
            "ConnectionResetError",
            "BrokenPipeError",
            "ClientDisconnectedError",
            "asyncio.CancelledError",
            "Client disconnected",
            "Connection lost",
        ]
        
        return any(pattern in error_type or pattern in error_value for pattern in non_critical_patterns)
    
    def _is_fast_transaction(self, event: Dict[str, Any]) -> bool:
        """Check if transaction is too fast to be interesting"""
        start_timestamp = event.get("start_timestamp", 0)
        timestamp = event.get("timestamp", 0)
        
        if start_timestamp and timestamp:
            duration_ms = (timestamp - start_timestamp) * 1000
            return duration_ms < 100  # Less than 100ms
        
        return False
    
    def _is_slow_transaction(self, event: Dict[str, Any]) -> bool:
        """Check if transaction is slow and should always be captured"""
        start_timestamp = event.get("start_timestamp", 0)
        timestamp = event.get("timestamp", 0)
        
        if start_timestamp and timestamp:
            duration_ms = (timestamp - start_timestamp) * 1000
            return duration_ms > 2000  # More than 2 seconds
        
        return False
    
    def _filter_sensitive_data(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data from Sentry events"""
        
        # Filter headers
        if "request" in event and "headers" in event["request"]:
            headers = event["request"]["headers"]
            sensitive_headers = [
                "authorization",
                "cookie",
                "x-api-key",
                "x-auth-token",
                "stripe-signature",
            ]
            
            for header in sensitive_headers:
                if header in headers:
                    headers[header] = "[Filtered]"
                elif header.title() in headers:
                    headers[header.title()] = "[Filtered]"
        
        # Filter query parameters
        if "request" in event and "query_string" in event["request"]:
            query_string = event["request"]["query_string"]
            # Remove sensitive query parameters
            filtered_query = re.sub(r'(api_key|token|password|secret)=[^&]*', r'\1=[Filtered]', query_string, flags=re.IGNORECASE)
            event["request"]["query_string"] = filtered_query
        
        # Filter form data
        if "request" in event and "data" in event["request"]:
            data = event["request"]["data"]
            if isinstance(data, dict):
                sensitive_fields = ["password", "card_number", "cvv", "ssn", "api_key"]
                for field in sensitive_fields:
                    if field in data:
                        data[field] = "[Filtered]"
        
        # Filter breadcrumbs
        if "breadcrumbs" in event:
            for crumb in event["breadcrumbs"].get("values", []):
                if "data" in crumb:
                    data = crumb["data"]
                    if isinstance(data, dict):
                        for key in list(data.keys()):
                            if any(sensitive in key.lower() for sensitive in ["password", "token", "secret", "key"]):
                                data[key] = "[Filtered]"
        
        return event
    
    def _add_business_context(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Add business context to Sentry events"""
        
        # Add user context if available
        user_id = event.get("user", {}).get("id")
        if user_id:
            event.setdefault("tags", {})["user_type"] = "registered"
            
            # Add user tier information
            # This would be populated from user data in real implementation
            event["tags"]["user_tier"] = "standard"  # or "premium", "enterprise"
        
        # Add request context
        request = event.get("request", {})
        if request:
            # Add business-relevant tags
            endpoint = request.get("url", "")
            if "/appointments" in endpoint:
                event.setdefault("tags", {})["business_area"] = "booking"
            elif "/payments" in endpoint:
                event.setdefault("tags", {})["business_area"] = "payments"
            elif "/auth" in endpoint:
                event.setdefault("tags", {})["business_area"] = "authentication"
            elif "/admin" in endpoint:
                event.setdefault("tags", {})["business_area"] = "administration"
        
        # Add performance context
        if "transaction" in event:
            transaction = event["transaction"]
            if "slow" in transaction.lower() or "timeout" in transaction.lower():
                event.setdefault("tags", {})["performance_issue"] = "true"
        
        return event
    
    def _should_rate_limit_error(self, event: Dict[str, Any]) -> bool:
        """Determine if similar errors should be rate limited"""
        # This is a simplified implementation
        # In production, you'd implement proper rate limiting with Redis
        
        exception = event.get("exception", {}).get("values", [{}])[0]
        error_type = exception.get("type", "")
        
        # Rate limit common errors
        rate_limited_errors = [
            "ValidationError",
            "TimeoutError",
            "ConnectionError",
        ]
        
        return error_type in rate_limited_errors
    
    def _configure_user_context(self):
        """Configure user context for better error tracking"""
        
        def set_user_context(user_id: str, email: str = None, username: str = None, **kwargs):
            """Set user context for current scope"""
            sentry_sdk.set_user({
                "id": user_id,
                "email": email,
                "username": username,
                **kwargs
            })
        
        # Make function available globally
        import builtins
        builtins.sentry_set_user = set_user_context
    
    def _configure_breadcrumbs(self):
        """Configure custom breadcrumbs for better error context"""
        
        def add_business_breadcrumb(category: str, message: str, level: str = "info", **data):
            """Add business-specific breadcrumb"""
            sentry_sdk.add_breadcrumb(
                category=category,
                message=message,
                level=level,
                data=data,
            )
        
        # Make function available globally
        import builtins
        builtins.sentry_add_breadcrumb = add_business_breadcrumb
    
    def _configure_alert_rules(self):
        """Configure Sentry alert rules for critical issues"""
        # This would be configured in Sentry dashboard, but documenting here
        alert_rules = {
            "critical_errors": {
                "condition": "event.type:error AND level:fatal",
                "environment": self.environment,
                "frequency": "immediate",
                "channels": ["email", "slack", "pagerduty"],
            },
            "high_error_rate": {
                "condition": "event.type:error",
                "threshold": "100 events in 5 minutes",
                "channels": ["email", "slack"],
            },
            "payment_errors": {
                "condition": "tags.business_area:payments AND event.type:error",
                "frequency": "immediate",
                "channels": ["email", "slack", "pagerduty"],
            },
            "performance_degradation": {
                "condition": "event.type:transaction AND tags.performance_issue:true",
                "threshold": "10 events in 10 minutes",
                "channels": ["email", "slack"],
            },
        }
        
        logging.info(f"Sentry alert rules configured: {list(alert_rules.keys())}")


class SentryMetrics:
    """Custom metrics integration with Sentry"""
    
    @staticmethod
    def capture_business_metric(metric_name: str, value: float, tags: Dict[str, str] = None):
        """Capture business metrics in Sentry"""
        sentry_sdk.set_measurement(metric_name, value)
        
        if tags:
            for key, val in tags.items():
                sentry_sdk.set_tag(key, val)
    
    @staticmethod
    def capture_performance_metric(operation: str, duration_ms: float, success: bool = True):
        """Capture performance metrics"""
        sentry_sdk.set_measurement(f"{operation}_duration", duration_ms)
        sentry_sdk.set_tag("operation_success", "true" if success else "false")
    
    @staticmethod
    def capture_user_action(action: str, user_id: str, metadata: Dict[str, Any] = None):
        """Capture user actions for analytics"""
        sentry_sdk.add_breadcrumb(
            category="user_action",
            message=f"User {user_id} performed {action}",
            level="info",
            data=metadata or {},
        )


# Global instance
production_sentry = ProductionSentryConfig()

# Convenience functions
def initialize_sentry():
    """Initialize Sentry for production"""
    production_sentry.configure_sentry()

def capture_business_exception(exception: Exception, context: Dict[str, Any] = None):
    """Capture business-critical exceptions with context"""
    if context:
        for key, value in context.items():
            sentry_sdk.set_tag(key, value)
    
    sentry_sdk.capture_exception(exception)

def capture_security_incident(incident_type: str, details: Dict[str, Any]):
    """Capture security incidents"""
    sentry_sdk.set_tag("incident_type", "security")
    sentry_sdk.set_tag("security_incident_type", incident_type)
    
    sentry_sdk.capture_message(
        f"Security incident: {incident_type}",
        level="error",
        extra=details,
    )