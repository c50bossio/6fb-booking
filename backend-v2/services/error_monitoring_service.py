"""
Comprehensive Error Monitoring and Resolution Service
Provides enterprise-grade error detection, classification, and automated resolution
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import httpx
import psutil
import traceback
from collections import defaultdict, deque
import hashlib

# Sentry integration for error tracking
try:
    import sentry_sdk
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False


class ErrorSeverity(Enum):
    """Error severity levels"""
    CRITICAL = "critical"  # Revenue impacting, system down
    HIGH = "high"         # Major functionality broken
    MEDIUM = "medium"     # Minor functionality affected
    LOW = "low"          # Non-critical issues
    INFO = "info"        # Informational events


class ErrorCategory(Enum):
    """Error classification categories"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    PAYMENT = "payment"
    BOOKING = "booking"
    DATABASE = "database"
    EXTERNAL_API = "external_api"
    VALIDATION = "validation"
    PERFORMANCE = "performance"
    SECURITY = "security"
    INFRASTRUCTURE = "infrastructure"
    USER_EXPERIENCE = "user_experience"
    BUSINESS_LOGIC = "business_logic"


class BusinessImpact(Enum):
    """Business impact assessment"""
    REVENUE_BLOCKING = "revenue_blocking"        # Prevents payments/bookings
    USER_BLOCKING = "user_blocking"              # Prevents user actions
    EXPERIENCE_DEGRADING = "experience_degrading" # Poor UX but functional
    OPERATIONAL = "operational"                  # Internal processes affected
    MONITORING = "monitoring"                    # Observability issues


@dataclass
class ErrorEvent:
    """Comprehensive error event structure"""
    id: str
    timestamp: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    business_impact: BusinessImpact
    message: str
    stack_trace: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    http_status: Optional[int] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    error_code: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    resolved: bool = False
    resolution_time: Optional[datetime] = None
    auto_resolved: bool = False
    resolution_method: Optional[str] = None
    retry_count: int = 0
    similar_errors_count: int = 1
    
    def __post_init__(self):
        if isinstance(self.severity, str):
            self.severity = ErrorSeverity(self.severity)
        if isinstance(self.category, str):
            self.category = ErrorCategory(self.category)
        if isinstance(self.business_impact, str):
            self.business_impact = BusinessImpact(self.business_impact)


@dataclass
class ErrorPattern:
    """Error pattern for intelligent detection"""
    pattern_id: str
    error_signature: str
    occurrence_count: int
    first_seen: datetime
    last_seen: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    business_impact: BusinessImpact
    auto_resolution_strategy: Optional[str] = None
    resolution_success_rate: float = 0.0


class ErrorResolutionStrategy:
    """Base class for error resolution strategies"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.success_count = 0
        self.failure_count = 0
    
    async def can_resolve(self, error: ErrorEvent) -> bool:
        """Check if this strategy can resolve the error"""
        raise NotImplementedError
    
    async def resolve(self, error: ErrorEvent) -> bool:
        """Attempt to resolve the error"""
        raise NotImplementedError
    
    @property
    def success_rate(self) -> float:
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 0.0


class DatabaseRetryStrategy(ErrorResolutionStrategy):
    """Retry strategy for database connection errors"""
    
    def __init__(self):
        super().__init__(
            "database_retry", 
            "Retry database operations with exponential backoff"
        )
    
    async def can_resolve(self, error: ErrorEvent) -> bool:
        return (
            error.category == ErrorCategory.DATABASE and
            error.retry_count < 3 and
            "connection" in error.message.lower()
        )
    
    async def resolve(self, error: ErrorEvent) -> bool:
        try:
            # Wait with exponential backoff
            wait_time = min(2 ** error.retry_count, 30)
            await asyncio.sleep(wait_time)
            
            # Test database connection
            from db import get_db
            next(get_db()).execute("SELECT 1")
            
            self.success_count += 1
            return True
        except Exception:
            self.failure_count += 1
            return False


class CircuitBreakerResetStrategy(ErrorResolutionStrategy):
    """Reset circuit breakers for external service errors"""
    
    def __init__(self):
        super().__init__(
            "circuit_breaker_reset",
            "Reset circuit breakers for external services"
        )
    
    async def can_resolve(self, error: ErrorEvent) -> bool:
        return (
            error.category == ErrorCategory.EXTERNAL_API and
            error.http_status in [503, 504, 429]
        )
    
    async def resolve(self, error: ErrorEvent) -> bool:
        try:
            # Import circuit breaker service
            from services.circuit_breaker_service import circuit_breaker_service
            
            # Determine service from endpoint
            if error.endpoint:
                if "stripe" in error.endpoint.lower():
                    service_name = "stripe"
                elif "google" in error.endpoint.lower():
                    service_name = "google_calendar"
                elif "twilio" in error.endpoint.lower():
                    service_name = "twilio"
                else:
                    service_name = "external_api"
                
                # Reset circuit breaker
                circuit_breaker_service.force_close(
                    service_name, 
                    "Auto-reset by error monitoring"
                )
                
                self.success_count += 1
                return True
        except Exception:
            self.failure_count += 1
            return False


class ErrorMonitoringService:
    """Comprehensive error monitoring and resolution service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_errors: Dict[str, ErrorEvent] = {}
        self.error_patterns: Dict[str, ErrorPattern] = {}
        self.resolution_strategies: List[ErrorResolutionStrategy] = [
            DatabaseRetryStrategy(),
            CircuitBreakerResetStrategy(),
        ]
        
        # Error rate tracking
        self.error_rate_window = deque(maxlen=1000)  # Last 1000 errors
        self.error_counts_by_minute = defaultdict(int)
        
        # Business impact tracking
        self.revenue_impacting_errors = deque(maxlen=100)
        self.user_impacting_errors = deque(maxlen=500)
        
        # Performance metrics
        self.resolution_times = deque(maxlen=1000)
        self.auto_resolution_success_rate = 0.0
        
        # Background monitoring task
        self._monitoring_task = None
        self._monitoring_enabled = False
    
    async def start_monitoring(self):
        """Start background monitoring tasks"""
        if self._monitoring_task is None and not self._monitoring_enabled:
            self._monitoring_enabled = True
            self._monitoring_task = asyncio.create_task(self._background_monitor())
    
    async def _background_monitor(self):
        """Background monitoring and cleanup"""
        while True:
            try:
                # Cleanup old errors
                await self._cleanup_resolved_errors()
                
                # Analyze error patterns
                await self._analyze_error_patterns()
                
                # Check for error rate spikes
                await self._check_error_rate_anomalies()
                
                # Attempt auto-resolution
                await self._attempt_auto_resolution()
                
                # Update metrics
                await self._update_metrics()
                
                await asyncio.sleep(30)  # Run every 30 seconds
                
            except Exception as e:
                self.logger.error(f"Background monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def capture_error(
        self,
        message: str,
        severity: Union[ErrorSeverity, str] = ErrorSeverity.MEDIUM,
        category: Union[ErrorCategory, str] = ErrorCategory.BUSINESS_LOGIC,
        business_impact: Union[BusinessImpact, str] = BusinessImpact.OPERATIONAL,
        exception: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        http_method: Optional[str] = None,
        http_status: Optional[int] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        error_code: Optional[str] = None
    ) -> ErrorEvent:
        """Capture and process an error event"""
        
        # Convert string enums to enum objects
        if isinstance(severity, str):
            severity = ErrorSeverity(severity)
        if isinstance(category, str):
            category = ErrorCategory(category)
        if isinstance(business_impact, str):
            business_impact = BusinessImpact(business_impact)
        
        # Generate error signature for pattern detection
        error_signature = self._generate_error_signature(message, endpoint, exception)
        
        # Check for existing pattern
        pattern = self.error_patterns.get(error_signature)
        if pattern:
            pattern.occurrence_count += 1
            pattern.last_seen = datetime.utcnow()
        else:
            pattern = ErrorPattern(
                pattern_id=str(uuid.uuid4()),
                error_signature=error_signature,
                occurrence_count=1,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                severity=severity,
                category=category,
                business_impact=business_impact
            )
            self.error_patterns[error_signature] = pattern
        
        # Create error event
        error_event = ErrorEvent(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            severity=severity,
            category=category,
            business_impact=business_impact,
            message=message,
            stack_trace=traceback.format_exc() if exception else None,
            user_id=user_id,
            session_id=session_id,
            request_id=request_id,
            endpoint=endpoint,
            http_method=http_method,
            http_status=http_status,
            user_agent=user_agent,
            ip_address=ip_address,
            error_code=error_code,
            context=context or {},
            similar_errors_count=pattern.occurrence_count
        )
        
        # Store active error
        self.active_errors[error_event.id] = error_event
        
        # Track for rate monitoring
        self.error_rate_window.append(datetime.utcnow())
        minute_key = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        self.error_counts_by_minute[minute_key] += 1
        
        # Track business impact
        if business_impact == BusinessImpact.REVENUE_BLOCKING:
            self.revenue_impacting_errors.append(error_event)
        elif business_impact == BusinessImpact.USER_BLOCKING:
            self.user_impacting_errors.append(error_event)
        
        # Log error
        self.logger.error(
            f"Error captured: {severity.value} | {category.value} | {message}",
            extra={
                "error_id": error_event.id,
                "error_signature": error_signature,
                "business_impact": business_impact.value,
                "context": context
            }
        )
        
        # Send to external monitoring if available
        await self._send_to_external_monitoring(error_event)
        
        # Immediate auto-resolution attempt for critical errors
        if severity == ErrorSeverity.CRITICAL:
            asyncio.create_task(self._attempt_immediate_resolution(error_event))
        
        return error_event
    
    def _generate_error_signature(
        self, 
        message: str, 
        endpoint: Optional[str], 
        exception: Optional[Exception]
    ) -> str:
        """Generate a unique signature for error pattern detection"""
        signature_components = [
            message[:100],  # First 100 chars of message
            endpoint or "unknown",
            type(exception).__name__ if exception else "unknown"
        ]
        
        signature_string = "|".join(signature_components)
        return hashlib.md5(signature_string.encode()).hexdigest()
    
    async def _attempt_immediate_resolution(self, error: ErrorEvent):
        """Attempt immediate resolution for critical errors"""
        for strategy in self.resolution_strategies:
            if await strategy.can_resolve(error):
                self.logger.info(f"Attempting immediate resolution with {strategy.name}")
                
                if await strategy.resolve(error):
                    await self.resolve_error(
                        error.id, 
                        f"Auto-resolved using {strategy.name}",
                        auto_resolved=True
                    )
                    break
    
    async def resolve_error(
        self, 
        error_id: str, 
        resolution_method: str,
        auto_resolved: bool = False
    ) -> bool:
        """Mark an error as resolved"""
        if error_id not in self.active_errors:
            return False
        
        error = self.active_errors[error_id]
        error.resolved = True
        error.resolution_time = datetime.utcnow()
        error.auto_resolved = auto_resolved
        error.resolution_method = resolution_method
        
        # Calculate resolution time
        resolution_duration = (error.resolution_time - error.timestamp).total_seconds()
        self.resolution_times.append(resolution_duration)
        
        self.logger.info(
            f"Error resolved: {error_id} | Method: {resolution_method} | "
            f"Duration: {resolution_duration:.2f}s | Auto: {auto_resolved}"
        )
        
        return True
    
    async def get_error_rate(self, time_window_minutes: int = 5) -> float:
        """Calculate current error rate (errors per minute)"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=time_window_minutes)
        recent_errors = [
            ts for ts in self.error_rate_window 
            if ts > cutoff_time
        ]
        return len(recent_errors) / time_window_minutes
    
    async def get_business_impact_summary(self) -> Dict[str, Any]:
        """Get summary of business impact from errors"""
        current_time = datetime.utcnow()
        last_hour = current_time - timedelta(hours=1)
        
        # Revenue impact (last hour)
        recent_revenue_errors = [
            err for err in self.revenue_impacting_errors
            if err.timestamp > last_hour
        ]
        
        # User impact (last hour)
        recent_user_errors = [
            err for err in self.user_impacting_errors
            if err.timestamp > last_hour
        ]
        
        # Critical unresolved errors
        critical_unresolved = [
            err for err in self.active_errors.values()
            if err.severity == ErrorSeverity.CRITICAL and not err.resolved
        ]
        
        return {
            "revenue_impacting_errors_1h": len(recent_revenue_errors),
            "user_impacting_errors_1h": len(recent_user_errors),
            "critical_unresolved": len(critical_unresolved),
            "total_active_errors": len(self.active_errors),
            "auto_resolution_rate": self._calculate_auto_resolution_rate(),
            "mean_resolution_time_seconds": self._calculate_mean_resolution_time(),
            "error_rate_5min": await self.get_error_rate(5),
            "six_figure_workflow_impacted": self._check_six_figure_workflow_impact()
        }
    
    def _calculate_auto_resolution_rate(self) -> float:
        """Calculate auto-resolution success rate"""
        resolved_errors = [
            err for err in self.active_errors.values()
            if err.resolved
        ]
        
        if not resolved_errors:
            return 0.0
        
        auto_resolved = [err for err in resolved_errors if err.auto_resolved]
        return len(auto_resolved) / len(resolved_errors)
    
    def _calculate_mean_resolution_time(self) -> float:
        """Calculate mean time to resolution"""
        if not self.resolution_times:
            return 0.0
        
        return sum(self.resolution_times) / len(self.resolution_times)
    
    def _check_six_figure_workflow_impact(self) -> Dict[str, Any]:
        """Check impact on Six Figure Barber methodology workflows"""
        workflow_categories = {
            "booking_flow": ErrorCategory.BOOKING,
            "payment_processing": ErrorCategory.PAYMENT,
            "client_management": ErrorCategory.BUSINESS_LOGIC,
            "analytics_tracking": ErrorCategory.PERFORMANCE
        }
        
        impacted_workflows = {}
        
        for workflow, category in workflow_categories.items():
            workflow_errors = [
                err for err in self.active_errors.values()
                if err.category == category and not err.resolved
            ]
            
            impacted_workflows[workflow] = {
                "active_errors": len(workflow_errors),
                "severity_breakdown": {
                    severity.value: len([
                        err for err in workflow_errors 
                        if err.severity == severity
                    ])
                    for severity in ErrorSeverity
                }
            }
        
        return impacted_workflows
    
    async def _cleanup_resolved_errors(self):
        """Clean up old resolved errors"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        errors_to_remove = [
            error_id for error_id, error in self.active_errors.items()
            if error.resolved and error.resolution_time and error.resolution_time < cutoff_time
        ]
        
        for error_id in errors_to_remove:
            del self.active_errors[error_id]
    
    async def _analyze_error_patterns(self):
        """Analyze error patterns for insights"""
        for pattern in self.error_patterns.values():
            if pattern.occurrence_count >= 5 and not pattern.auto_resolution_strategy:
                # Look for suitable resolution strategy
                for strategy in self.resolution_strategies:
                    dummy_error = ErrorEvent(
                        id="pattern_test",
                        timestamp=datetime.utcnow(),
                        severity=pattern.severity,
                        category=pattern.category,
                        business_impact=pattern.business_impact,
                        message="Pattern analysis",
                    )
                    
                    if await strategy.can_resolve(dummy_error):
                        pattern.auto_resolution_strategy = strategy.name
                        pattern.resolution_success_rate = strategy.success_rate
                        break
    
    async def _check_error_rate_anomalies(self):
        """Check for error rate anomalies"""
        current_rate = await self.get_error_rate(5)
        
        # Alert on high error rate (>0.1% overall target)
        if current_rate > 10:  # More than 10 errors per minute
            await self.capture_error(
                f"High error rate detected: {current_rate:.2f} errors/min",
                severity=ErrorSeverity.HIGH,
                category=ErrorCategory.PERFORMANCE,
                business_impact=BusinessImpact.EXPERIENCE_DEGRADING,
                context={"error_rate": current_rate, "threshold": 10}
            )
    
    async def _attempt_auto_resolution(self):
        """Attempt auto-resolution for unresolved errors"""
        unresolved_errors = [
            err for err in self.active_errors.values()
            if not err.resolved and err.retry_count < 3
        ]
        
        for error in unresolved_errors:
            for strategy in self.resolution_strategies:
                if await strategy.can_resolve(error):
                    error.retry_count += 1
                    
                    if await strategy.resolve(error):
                        await self.resolve_error(
                            error.id,
                            f"Auto-resolved using {strategy.name} (retry {error.retry_count})",
                            auto_resolved=True
                        )
                        break
    
    async def _update_metrics(self):
        """Update internal metrics"""
        self.auto_resolution_success_rate = self._calculate_auto_resolution_rate()
    
    async def _send_to_external_monitoring(self, error: ErrorEvent):
        """Send error to external monitoring services"""
        if SENTRY_AVAILABLE:
            try:
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("error_id", error.id)
                    scope.set_tag("category", error.category.value)
                    scope.set_tag("business_impact", error.business_impact.value)
                    scope.set_context("error_context", error.context or {})
                    
                    if error.user_id:
                        scope.set_user({"id": error.user_id})
                    
                    sentry_sdk.capture_message(
                        error.message, 
                        level=error.severity.value
                    )
            except Exception as e:
                self.logger.warning(f"Failed to send to Sentry: {e}")
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive dashboard data"""
        current_time = datetime.utcnow()
        
        # Active errors summary
        active_by_severity = defaultdict(int)
        active_by_category = defaultdict(int)
        active_by_impact = defaultdict(int)
        
        for error in self.active_errors.values():
            if not error.resolved:
                active_by_severity[error.severity.value] += 1
                active_by_category[error.category.value] += 1
                active_by_impact[error.business_impact.value] += 1
        
        # Recent error trends (last 24 hours)
        last_24h = current_time - timedelta(hours=24)
        recent_errors = [
            err for err in self.active_errors.values()
            if err.timestamp > last_24h
        ]
        
        # Top error patterns
        top_patterns = sorted(
            self.error_patterns.values(),
            key=lambda p: p.occurrence_count,
            reverse=True
        )[:10]
        
        return {
            "summary": {
                "total_active_errors": len([e for e in self.active_errors.values() if not e.resolved]),
                "error_rate_5min": await self.get_error_rate(5),
                "auto_resolution_rate": self.auto_resolution_success_rate,
                "mean_resolution_time": self._calculate_mean_resolution_time(),
                "sla_compliance": {
                    "error_rate_target": 0.1,  # <0.1% target
                    "current_rate": await self.get_error_rate(60) / 60 * 100,  # Convert to percentage
                    "mttr_target": 300,  # 5 minutes target
                    "current_mttr": self._calculate_mean_resolution_time()
                }
            },
            "breakdown": {
                "by_severity": dict(active_by_severity),
                "by_category": dict(active_by_category),
                "by_business_impact": dict(active_by_impact)
            },
            "trends": {
                "errors_24h": len(recent_errors),
                "critical_errors_24h": len([e for e in recent_errors if e.severity == ErrorSeverity.CRITICAL]),
                "revenue_impact_24h": len([e for e in recent_errors if e.business_impact == BusinessImpact.REVENUE_BLOCKING])
            },
            "top_patterns": [
                {
                    "signature": pattern.error_signature[:50],
                    "count": pattern.occurrence_count,
                    "severity": pattern.severity.value,
                    "category": pattern.category.value,
                    "auto_resolvable": pattern.auto_resolution_strategy is not None
                }
                for pattern in top_patterns
            ],
            "business_impact": await self.get_business_impact_summary(),
            "resolution_strategies": [
                {
                    "name": strategy.name,
                    "description": strategy.description,
                    "success_rate": strategy.success_rate,
                    "total_attempts": strategy.success_count + strategy.failure_count
                }
                for strategy in self.resolution_strategies
            ],
            "timestamp": current_time.isoformat()
        }


# Global error monitoring service instance
error_monitoring_service = ErrorMonitoringService()