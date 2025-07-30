"""
Enhanced Sentry Monitoring Service
Provides advanced error tracking, performance monitoring, and alerting
with business context awareness and automated issue management
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import json
import os

try:
    import sentry_sdk
    from sentry_sdk import set_user, set_tag, set_context, set_level
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.httpx import HttpxIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False


class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BusinessImpact(Enum):
    """Business impact levels"""
    NONE = "none"
    MINOR = "minor"
    MAJOR = "major"
    REVENUE_BLOCKING = "revenue_blocking"


@dataclass
class ErrorMetrics:
    """Error metrics for monitoring"""
    total_errors: int = 0
    errors_by_severity: Dict[str, int] = None
    errors_by_category: Dict[str, int] = None
    errors_by_endpoint: Dict[str, int] = None
    revenue_blocking_errors: int = 0
    user_blocking_errors: int = 0
    average_resolution_time: float = 0.0
    error_rate_per_minute: float = 0.0
    
    def __post_init__(self):
        if self.errors_by_severity is None:
            self.errors_by_severity = {}
        if self.errors_by_category is None:
            self.errors_by_category = {}
        if self.errors_by_endpoint is None:
            self.errors_by_endpoint = {}


@dataclass
class AlertRule:
    """Configuration for automated alerts"""
    name: str
    condition: str  # Python expression to evaluate
    severity: AlertSeverity
    cooldown_minutes: int = 30
    channels: List[str] = None  # slack, email, webhook
    business_impact: BusinessImpact = BusinessImpact.MINOR
    
    def __post_init__(self):
        if self.channels is None:
            self.channels = ['email']


class EnhancedSentryMonitoring:
    """Enhanced Sentry monitoring with business intelligence"""
    
    def __init__(self, dsn: Optional[str] = None, environment: str = "development"):
        self.logger = logging.getLogger(__name__)
        self.environment = environment
        self.dsn = dsn or os.getenv('SENTRY_DSN')
        self.initialized = False
        
        # Error tracking
        self.error_metrics = ErrorMetrics()
        self.error_patterns = {}
        self.alert_history = {}
        
        # Alert rules for different business scenarios
        self.alert_rules = self._create_default_alert_rules()
        
        # Performance tracking
        self.performance_metrics = {
            'api_response_times': {},
            'database_query_times': {},
            'external_service_times': {},
            'memory_usage': [],
            'error_rates': []
        }
        
        if SENTRY_AVAILABLE and self.dsn:
            self._initialize_sentry()
    
    def _initialize_sentry(self):
        """Initialize Sentry with enhanced configuration"""
        try:
            sentry_sdk.init(
                dsn=self.dsn,
                environment=self.environment,
                release=os.getenv('BUILD_VERSION', '1.0.0'),
                
                # Performance monitoring
                traces_sample_rate=0.1 if self.environment == 'production' else 1.0,
                profiles_sample_rate=0.05 if self.environment == 'production' else 0.5,
                
                # Error sampling
                sample_rate=1.0,
                
                # Integrations
                integrations=[
                    FastApiIntegration(auto_enabling_integrations=False),
                    SqlalchemyIntegration(),
                    RedisIntegration(),
                    HttpxIntegration(),
                ],
                
                # Enhanced filtering
                before_send=self._filter_errors,
                before_send_transaction=self._filter_transactions,
                
                # Business context
                attach_stacktrace=True,
                max_breadcrumbs=100,
                
                # Advanced options
                shutdown_timeout=2,
                in_app_include=['services', 'api', 'models'],
                in_app_exclude=['venv', 'lib', 'dist-packages'],
            )
            
            # Set default context
            set_context("application", {
                "name": "BookedBarber V2",
                "version": os.getenv('BUILD_VERSION', '1.0.0'),
                "environment": self.environment
            })
            
            self.initialized = True
            self.logger.info(f"Enhanced Sentry monitoring initialized for {self.environment}")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Sentry: {e}")
    
    def _filter_errors(self, event, hint):
        """Filter and enhance errors before sending to Sentry"""
        
        # Skip certain error types in production
        if self.environment == 'production':
            # Skip client disconnect errors
            if 'ConnectionResetError' in str(event.get('exception', {}).get('values', [{}])[0].get('type', '')):
                return None
            
            # Skip rate limiting errors (these are expected)
            if event.get('tags', {}).get('http.status_code') == '429':
                return None
        
        # Add business context
        self._add_business_context(event)
        
        # Add error fingerprinting for better grouping
        self._add_error_fingerprint(event)
        
        return event
    
    def _filter_transactions(self, event, hint):
        """Filter performance transactions"""
        
        # Skip health check endpoints in production
        if self.environment == 'production':
            transaction_name = event.get('transaction', '')
            if '/health' in transaction_name or '/metrics' in transaction_name:
                return None
            
            # Skip very fast transactions (likely not performance issues)
            duration = event.get('timestamp', 0) - event.get('start_timestamp', 0)
            if duration < 0.05:  # Less than 50ms
                return None
        
        return event
    
    def _add_business_context(self, event):
        """Add business-specific context to errors"""
        
        # Analyze the error for business impact
        business_impact = self._assess_business_impact(event)
        
        set_context("business_impact", {
            "level": business_impact.value,
            "revenue_blocking": business_impact == BusinessImpact.REVENUE_BLOCKING,
            "user_blocking": business_impact in [BusinessImpact.MAJOR, BusinessImpact.REVENUE_BLOCKING],
            "six_figure_methodology_impact": self._assess_six_figure_impact(event)
        })
        
        # Add workflow context
        workflow = self._detect_workflow(event)
        if workflow:
            set_tag("workflow", workflow)
            set_context("workflow_context", {
                "type": workflow,
                "critical_path": workflow in ['booking', 'payment'],
                "user_facing": workflow not in ['analytics', 'admin']
            })
        
        # Add performance context
        set_context("performance_context", {
            "endpoint_avg_response_time": self._get_endpoint_avg_response_time(event),
            "error_rate_last_hour": self._get_error_rate_last_hour(),
            "system_load": self._get_system_load_indicator()
        })
    
    def _add_error_fingerprint(self, event):
        """Add custom fingerprinting for better error grouping"""
        
        exception = event.get('exception', {}).get('values', [{}])[0]
        error_type = exception.get('type', '')
        error_message = exception.get('value', '')
        
        # Create fingerprint based on error pattern
        if 'ValidationError' in error_type:
            # Group validation errors by field name
            field_name = self._extract_field_name(error_message)
            fingerprint = f"validation-{field_name}"
        elif 'HTTPException' in error_type:
            # Group HTTP errors by status code and endpoint
            status_code = event.get('tags', {}).get('http.status_code', 'unknown')
            endpoint = self._extract_endpoint_pattern(event)
            fingerprint = f"http-{status_code}-{endpoint}"
        elif 'DatabaseError' in error_type:
            # Group database errors by operation type
            operation = self._extract_db_operation(error_message)
            fingerprint = f"database-{operation}"
        else:
            # Default fingerprinting
            fingerprint = f"{error_type}-{hash(error_message[:100]) % 10000}"
        
        event['fingerprint'] = [fingerprint]
    
    def _assess_business_impact(self, event) -> BusinessImpact:
        """Assess the business impact of an error"""
        
        # Check if it's a payment-related error
        if self._is_payment_related(event):
            return BusinessImpact.REVENUE_BLOCKING
        
        # Check if it's a booking-related error
        if self._is_booking_related(event):
            return BusinessImpact.MAJOR
        
        # Check if it's an authentication error
        if self._is_auth_related(event):
            return BusinessImpact.MAJOR
            
        # Check error severity
        status_code = event.get('tags', {}).get('http.status_code')
        if status_code and int(status_code) >= 500:
            return BusinessImpact.MINOR
        
        return BusinessImpact.NONE
    
    def _assess_six_figure_impact(self, event) -> Dict[str, Any]:
        """Assess impact on Six Figure Barber methodology workflows"""
        
        workflows = {
            'revenue_optimization': False,
            'client_value_creation': False,
            'business_efficiency': False,
            'professional_growth': False,
            'scalability': False
        }
        
        # Revenue optimization impact
        if self._is_payment_related(event) or self._is_pricing_related(event):
            workflows['revenue_optimization'] = True
        
        # Client value creation impact
        if self._is_booking_related(event) or self._is_communication_related(event):
            workflows['client_value_creation'] = True
        
        # Business efficiency impact
        if self._is_analytics_related(event) or self._is_automation_related(event):
            workflows['business_efficiency'] = True
        
        # Professional growth impact
        if self._is_coaching_related(event) or self._is_education_related(event):
            workflows['professional_growth'] = True
        
        # Scalability impact
        if self._is_enterprise_related(event) or self._is_integration_related(event):
            workflows['scalability'] = True
        
        return workflows
    
    def capture_business_error(
        self,
        error: Exception,
        context: Dict[str, Any] = None,
        user_id: str = None,
        business_context: Dict[str, Any] = None,
        severity: AlertSeverity = AlertSeverity.MEDIUM
    ) -> Optional[str]:
        """Capture error with business context"""
        
        if not self.initialized:
            return None
        
        try:
            with sentry_sdk.push_scope() as scope:
                # Set user context
                if user_id:
                    set_user({"id": user_id})
                
                # Set business context
                if business_context:
                    for key, value in business_context.items():
                        set_tag(f"business.{key}", value)
                    
                    set_context("business", business_context)
                
                # Set application context
                if context:
                    set_context("application_context", context)
                
                # Set severity
                set_level(self._severity_to_sentry_level(severity))
                
                # Add breadcrumb
                sentry_sdk.add_breadcrumb(
                    category='business_error',
                    message=f'Business error: {str(error)}',
                    level='error',
                    data={
                        'severity': severity.value,
                        'business_context': business_context or {},
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )
                
                # Capture exception
                event_id = sentry_sdk.capture_exception(error)
                
                # Update metrics
                self._update_error_metrics(error, severity, business_context)
                
                # Check alert conditions
                self._check_alert_conditions()
                
                return event_id
                
        except Exception as e:
            self.logger.error(f"Failed to capture business error: {e}")
            return None
    
    def capture_performance_issue(
        self,
        operation: str,
        duration: float,
        context: Dict[str, Any] = None,
        threshold: float = 1.0
    ):
        """Capture performance issues"""
        
        if not self.initialized or duration < threshold:
            return
        
        try:
            with sentry_sdk.push_scope() as scope:
                set_tag("performance_issue", True)
                set_tag("operation", operation)
                set_tag("duration", f"{duration:.2f}s")
                
                set_context("performance", {
                    "operation": operation,
                    "duration": duration,
                    "threshold": threshold,
                    "context": context or {}
                })
                
                # Create a custom message
                message = f"Performance issue: {operation} took {duration:.2f}s (threshold: {threshold}s)"
                
                sentry_sdk.capture_message(
                    message,
                    level='warning' if duration < threshold * 2 else 'error'
                )
                
                # Update performance metrics
                self._update_performance_metrics(operation, duration)
                
        except Exception as e:
            self.logger.error(f"Failed to capture performance issue: {e}")
    
    def capture_business_event(
        self,
        event_type: str,
        message: str,
        data: Dict[str, Any] = None,
        user_id: str = None
    ):
        """Capture important business events"""
        
        if not self.initialized:
            return
        
        try:
            with sentry_sdk.push_scope() as scope:
                set_tag("event_type", event_type)
                
                if user_id:
                    set_user({"id": user_id})
                
                if data:
                    set_context("event_data", data)
                
                sentry_sdk.add_breadcrumb(
                    category='business_event',
                    message=message,
                    level='info',
                    data={
                        'event_type': event_type,
                        'data': data or {},
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )
                
                # Only capture high-value business events
                if event_type in ['payment_completed', 'appointment_booked', 'user_registered']:
                    sentry_sdk.capture_message(message, level='info')
                
        except Exception as e:
            self.logger.error(f"Failed to capture business event: {e}")
    
    async def _check_alert_conditions(self):
        """Check if any alert conditions are met"""
        
        for rule in self.alert_rules:
            try:
                # Check cooldown
                last_alert = self.alert_history.get(rule.name, datetime.min)
                if datetime.utcnow() - last_alert < timedelta(minutes=rule.cooldown_minutes):
                    continue
                
                # Evaluate condition
                if self._evaluate_alert_condition(rule.condition):
                    await self._trigger_alert(rule)
                    self.alert_history[rule.name] = datetime.utcnow()
                    
            except Exception as e:
                self.logger.error(f"Failed to check alert condition {rule.name}: {e}")
    
    def _evaluate_alert_condition(self, condition: str) -> bool:
        """Evaluate alert condition expression"""
        
        # Create safe evaluation context
        context = {
            'error_rate': self.error_metrics.error_rate_per_minute,
            'revenue_blocking_errors': self.error_metrics.revenue_blocking_errors,
            'user_blocking_errors': self.error_metrics.user_blocking_errors,
            'total_errors': self.error_metrics.total_errors,
            'avg_resolution_time': self.error_metrics.average_resolution_time
        }
        
        try:
            return eval(condition, {"__builtins__": {}}, context)
        except Exception as e:
            self.logger.error(f"Failed to evaluate alert condition: {condition}, error: {e}")
            return False
    
    async def _trigger_alert(self, rule: AlertRule):
        """Trigger an alert"""
        
        self.logger.warning(f"Alert triggered: {rule.name}")
        
        # Create alert payload
        alert_data = {
            'rule_name': rule.name,
            'severity': rule.severity.value,
            'business_impact': rule.business_impact.value,
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': asdict(self.error_metrics),
            'environment': self.environment
        }
        
        # Send to configured channels
        for channel in rule.channels:
            try:
                if channel == 'slack':
                    await self._send_slack_alert(alert_data)
                elif channel == 'email':
                    await self._send_email_alert(alert_data)
                elif channel == 'webhook':
                    await self._send_webhook_alert(alert_data)
            except Exception as e:
                self.logger.error(f"Failed to send alert to {channel}: {e}")
    
    def _create_default_alert_rules(self) -> List[AlertRule]:
        """Create default alert rules for business scenarios"""
        
        return [
            AlertRule(
                name="Revenue Blocking Errors",
                condition="revenue_blocking_errors > 0",
                severity=AlertSeverity.CRITICAL,
                cooldown_minutes=15,
                channels=['slack', 'email'],
                business_impact=BusinessImpact.REVENUE_BLOCKING
            ),
            AlertRule(
                name="High Error Rate",
                condition="error_rate > 10",
                severity=AlertSeverity.HIGH,
                cooldown_minutes=30,
                channels=['slack'],
                business_impact=BusinessImpact.MAJOR
            ),
            AlertRule(
                name="User Blocking Errors Spike",
                condition="user_blocking_errors > 5",
                severity=AlertSeverity.HIGH,
                cooldown_minutes=20,
                channels=['slack', 'email'],
                business_impact=BusinessImpact.MAJOR
            ),
            AlertRule(
                name="Slow Resolution Time",
                condition="avg_resolution_time > 300",  # 5 minutes
                severity=AlertSeverity.MEDIUM,
                cooldown_minutes=60,
                channels=['email'],
                business_impact=BusinessImpact.MINOR
            )
        ]
    
    def _update_error_metrics(self, error: Exception, severity: AlertSeverity, context: Dict[str, Any]):
        """Update error metrics"""
        
        self.error_metrics.total_errors += 1
        
        # Update severity breakdown
        if severity.value not in self.error_metrics.errors_by_severity:
            self.error_metrics.errors_by_severity[severity.value] = 0
        self.error_metrics.errors_by_severity[severity.value] += 1
        
        # Update business impact counters
        if context and context.get('workflow') == 'payment':
            self.error_metrics.revenue_blocking_errors += 1
        elif severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL]:
            self.error_metrics.user_blocking_errors += 1
    
    def _update_performance_metrics(self, operation: str, duration: float):
        """Update performance metrics"""
        
        if operation not in self.performance_metrics['api_response_times']:
            self.performance_metrics['api_response_times'][operation] = []
        
        self.performance_metrics['api_response_times'][operation].append(duration)
        
        # Keep only last 100 measurements
        if len(self.performance_metrics['api_response_times'][operation]) > 100:
            self.performance_metrics['api_response_times'][operation] = \
                self.performance_metrics['api_response_times'][operation][-100:]
    
    # Helper methods for context detection
    def _is_payment_related(self, event) -> bool:
        """Check if error is payment-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'payment', 'stripe', 'billing', 'invoice', 'charge', 'refund'
        ])
    
    def _is_booking_related(self, event) -> bool:
        """Check if error is booking-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'booking', 'appointment', 'reservation', 'schedule'
        ])
    
    def _is_auth_related(self, event) -> bool:
        """Check if error is auth-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'auth', 'login', 'token', 'permission', 'unauthorized'
        ])
    
    def _is_pricing_related(self, event) -> bool:
        """Check if error is pricing-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'price', 'pricing', 'cost', 'rate', 'fee'
        ])
    
    def _is_communication_related(self, event) -> bool:
        """Check if error is communication-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'email', 'sms', 'notification', 'message'
        ])
    
    def _is_analytics_related(self, event) -> bool:
        """Check if error is analytics-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'analytics', 'report', 'metric', 'dashboard'
        ])
    
    def _is_automation_related(self, event) -> bool:
        """Check if error is automation-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'automation', 'workflow', 'trigger', 'webhook'
        ])
    
    def _is_coaching_related(self, event) -> bool:
        """Check if error is coaching-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'coaching', 'training', 'education', 'course'
        ])
    
    def _is_education_related(self, event) -> bool:
        """Check if error is education-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'education', 'learning', 'tutorial', 'guide'
        ])
    
    def _is_enterprise_related(self, event) -> bool:
        """Check if error is enterprise-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'enterprise', 'franchise', 'multi-location', 'organization'
        ])
    
    def _is_integration_related(self, event) -> bool:
        """Check if error is integration-related"""
        event_str = json.dumps(event).lower()
        return any(keyword in event_str for keyword in [
            'integration', 'api', 'webhook', 'sync', 'third-party'
        ])
    
    def _detect_workflow(self, event) -> Optional[str]:
        """Detect the workflow type from the event"""
        
        if self._is_payment_related(event):
            return 'payment'
        elif self._is_booking_related(event):
            return 'booking'
        elif self._is_auth_related(event):
            return 'auth'
        elif self._is_analytics_related(event):
            return 'analytics'
        
        return None
    
    def _severity_to_sentry_level(self, severity: AlertSeverity) -> str:
        """Convert alert severity to Sentry level"""
        
        mapping = {
            AlertSeverity.LOW: 'info',
            AlertSeverity.MEDIUM: 'warning',
            AlertSeverity.HIGH: 'error',
            AlertSeverity.CRITICAL: 'fatal'
        }
        
        return mapping.get(severity, 'warning')
    
    # Placeholder methods for alert sending (to be implemented based on requirements)
    async def _send_slack_alert(self, alert_data: Dict[str, Any]):
        """Send alert to Slack"""
        # Implementation would depend on Slack webhook configuration
        pass
    
    async def _send_email_alert(self, alert_data: Dict[str, Any]):
        """Send alert via email"""
        # Implementation would depend on email service configuration
        pass
    
    async def _send_webhook_alert(self, alert_data: Dict[str, Any]):
        """Send alert to webhook"""
        # Implementation would depend on webhook configuration
        pass
    
    # Placeholder methods for metrics (to be implemented with actual data sources)
    def _get_endpoint_avg_response_time(self, event) -> float:
        """Get average response time for endpoint"""
        return 0.0
    
    def _get_error_rate_last_hour(self) -> float:
        """Get error rate for last hour"""
        return 0.0
    
    def _get_system_load_indicator(self) -> str:
        """Get system load indicator"""
        return "normal"
    
    def _extract_field_name(self, error_message: str) -> str:
        """Extract field name from validation error"""
        # Simple extraction logic - would be more sophisticated in practice
        return "unknown"
    
    def _extract_endpoint_pattern(self, event) -> str:
        """Extract endpoint pattern from event"""
        # Simple extraction logic - would be more sophisticated in practice
        return "unknown"
    
    def _extract_db_operation(self, error_message: str) -> str:
        """Extract database operation from error message"""
        # Simple extraction logic - would be more sophisticated in practice
        return "unknown"


# Global instance
enhanced_sentry = EnhancedSentryMonitoring(
    environment=os.getenv('ENVIRONMENT', 'development')
)