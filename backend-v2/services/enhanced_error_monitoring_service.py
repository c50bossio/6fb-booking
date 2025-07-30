"""
Enhanced Error Monitoring Service
Comprehensive error tracking, analysis, and alerting system for BookedBarber V2
"""

import asyncio
import json
import logging
import statistics
from collections import defaultdict, deque
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import hashlib
import uuid
from pathlib import Path

import aioredis
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db_session
from config.sentry import (
    add_business_context, add_user_context, 
    capture_booking_error, capture_payment_error, 
    capture_integration_error, add_performance_breadcrumb
)
from utils.cache import get_redis_client
from services.notification_service import notification_service

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    DATABASE = "database"
    PAYMENT = "payment"
    BOOKING = "booking"
    EXTERNAL_API = "external_api"
    PERFORMANCE = "performance"
    SECURITY = "security"
    INFRASTRUCTURE = "infrastructure"
    BUSINESS_LOGIC = "business_logic"
    UI_UX = "ui_ux"


class BusinessImpact(Enum):
    MONITORING = "monitoring"
    OPERATIONAL = "operational"
    EXPERIENCE_DEGRADING = "experience_degrading"
    USER_BLOCKING = "user_blocking"
    REVENUE_BLOCKING = "revenue_blocking"


@dataclass
class ErrorEvent:
    """Represents a single error event with full context"""
    id: str
    timestamp: datetime
    message: str
    severity: ErrorSeverity
    category: ErrorCategory
    business_impact: BusinessImpact
    
    # Technical context
    exception_type: Optional[str] = None
    stack_trace: Optional[str] = None
    error_code: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    http_status: Optional[int] = None
    
    # Request context
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    # Business context
    booking_id: Optional[str] = None
    payment_id: Optional[str] = None
    barber_id: Optional[str] = None
    client_id: Optional[str] = None
    organization_id: Optional[str] = None
    
    # Performance metrics
    response_time_ms: Optional[float] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    
    # Additional context
    context: Dict[str, Any] = None
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if self.context is None:
            self.context = {}
        if self.tags is None:
            self.tags = {}
    
    @property
    def fingerprint(self) -> str:
        """Generate a unique fingerprint for error grouping"""
        key_parts = [
            self.exception_type or "unknown",
            self.endpoint or "unknown",
            self.error_code or "",
            self.message or ""
        ]
        return hashlib.md5("|".join(key_parts).encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/transmission"""
        data = asdict(self)
        # Convert enums to strings
        data['severity'] = self.severity.value
        data['category'] = self.category.value
        data['business_impact'] = self.business_impact.value
        # Convert datetime to ISO string
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class ErrorPattern:
    """Represents an error pattern with frequency and impact analysis"""
    fingerprint: str
    first_seen: datetime
    last_seen: datetime
    count: int
    rate_per_hour: float
    affected_users: int
    severity: ErrorSeverity
    category: ErrorCategory
    business_impact: BusinessImpact
    sample_message: str
    sample_stack_trace: Optional[str] = None
    trending: str = "stable"  # "increasing", "decreasing", "stable"
    resolution_suggestions: List[str] = None
    
    def __post_init__(self):
        if self.resolution_suggestions is None:
            self.resolution_suggestions = []


class EnhancedErrorMonitoringService:
    """Enhanced error monitoring with pattern analysis and intelligent alerting"""
    
    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
        self.error_buffer = deque(maxlen=1000)  # Recent errors buffer
        self.pattern_cache: Dict[str, ErrorPattern] = {}
        self.alert_suppression: Dict[str, datetime] = {}
        self.performance_baselines: Dict[str, float] = {}
        
        # Configuration
        self.alert_thresholds = {
            ErrorSeverity.CRITICAL: {"count": 1, "time_window": 60},  # 1 error in 1 min
            ErrorSeverity.HIGH: {"count": 5, "time_window": 300},     # 5 errors in 5 min
            ErrorSeverity.MEDIUM: {"count": 20, "time_window": 900},  # 20 errors in 15 min
            ErrorSeverity.LOW: {"count": 50, "time_window": 3600}     # 50 errors in 1 hour
        }
        
        self.business_impact_weights = {
            BusinessImpact.REVENUE_BLOCKING: 5.0,
            BusinessImpact.USER_BLOCKING: 3.0,
            BusinessImpact.EXPERIENCE_DEGRADING: 2.0,
            BusinessImpact.OPERATIONAL: 1.5,
            BusinessImpact.MONITORING: 1.0
        }
        
        # Start background tasks
        asyncio.create_task(self._initialize())
        asyncio.create_task(self._pattern_analysis_loop())
        asyncio.create_task(self._performance_correlation_loop())
    
    async def _initialize(self):
        """Initialize Redis connection and load configuration"""
        try:
            self.redis_client = await get_redis_client()
            logger.info("✅ Enhanced error monitoring service initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize error monitoring: {e}")
    
    async def capture_error(
        self,
        message: str,
        severity: ErrorSeverity,
        category: ErrorCategory,
        business_impact: BusinessImpact,
        exception: Optional[Exception] = None,
        **context
    ) -> str:
        """Capture and process an error event"""
        
        # Create error event
        error_event = ErrorEvent(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            message=message,
            severity=severity,
            category=category,
            business_impact=business_impact,
            exception_type=type(exception).__name__ if exception else None,
            stack_trace=str(exception) if exception else None,
            **context
        )
        
        # Add to buffer for real-time analysis
        self.error_buffer.append(error_event)
        
        # Store in Redis for fast access
        await self._store_error_event(error_event)
        
        # Update pattern analysis
        await self._update_error_pattern(error_event)
        
        # Send to Sentry with enhanced context
        await self._send_to_sentry(error_event, exception)
        
        # Check alert conditions
        await self._check_alert_conditions(error_event)
        
        # Store in database for long-term analysis
        asyncio.create_task(self._store_error_in_db(error_event))
        
        logger.info(f"📊 Error captured: {error_event.fingerprint} | {severity.value} | {category.value}")
        
        return error_event.id
    
    async def _store_error_event(self, error_event: ErrorEvent):
        """Store error event in Redis with TTL"""
        if not self.redis_client:
            return
        
        try:
            # Store individual error
            key = f"error_event:{error_event.id}"
            await self.redis_client.setex(
                key, 
                7 * 24 * 3600,  # 7 days TTL
                json.dumps(error_event.to_dict())
            )
            
            # Add to time-series for trending
            ts_key = f"error_timeseries:{error_event.fingerprint}"
            await self.redis_client.zadd(
                ts_key,
                {error_event.id: error_event.timestamp.timestamp()}
            )
            await self.redis_client.expire(ts_key, 30 * 24 * 3600)  # 30 days
            
            # Update counters
            await self._update_error_counters(error_event)
            
        except Exception as e:
            logger.error(f"Failed to store error event in Redis: {e}")
    
    async def _update_error_counters(self, error_event: ErrorEvent):
        """Update various error counters and metrics"""
        if not self.redis_client:
            return
        
        now = datetime.utcnow()
        hour_key = now.strftime("%Y-%m-%d-%H")
        
        # Increment counters
        counters = [
            f"error_count:total:{hour_key}",
            f"error_count:severity:{error_event.severity.value}:{hour_key}",
            f"error_count:category:{error_event.category.value}:{hour_key}",
            f"error_count:impact:{error_event.business_impact.value}:{hour_key}",
            f"error_count:fingerprint:{error_event.fingerprint}:{hour_key}"
        ]
        
        if error_event.endpoint:
            counters.append(f"error_count:endpoint:{error_event.endpoint}:{hour_key}")
        
        if error_event.user_id:
            counters.append(f"error_count:user:{error_event.user_id}:{hour_key}")
        
        for counter in counters:
            await self.redis_client.incr(counter)
            await self.redis_client.expire(counter, 7 * 24 * 3600)  # 7 days
    
    async def _update_error_pattern(self, error_event: ErrorEvent):
        """Update error pattern analysis"""
        fingerprint = error_event.fingerprint
        
        if fingerprint in self.pattern_cache:
            pattern = self.pattern_cache[fingerprint]
            pattern.count += 1
            pattern.last_seen = error_event.timestamp
            
            # Calculate rate
            time_diff = (pattern.last_seen - pattern.first_seen).total_seconds() / 3600
            pattern.rate_per_hour = pattern.count / max(time_diff, 0.1)
            
        else:
            pattern = ErrorPattern(
                fingerprint=fingerprint,
                first_seen=error_event.timestamp,
                last_seen=error_event.timestamp,
                count=1,
                rate_per_hour=0.0,
                affected_users=1 if error_event.user_id else 0,
                severity=error_event.severity,
                category=error_event.category,
                business_impact=error_event.business_impact,
                sample_message=error_event.message,
                sample_stack_trace=error_event.stack_trace
            )
            
            self.pattern_cache[fingerprint] = pattern
        
        # Store pattern in Redis
        if self.redis_client:
            pattern_key = f"error_pattern:{fingerprint}"
            pattern_data = asdict(pattern)
            pattern_data['first_seen'] = pattern.first_seen.isoformat()
            pattern_data['last_seen'] = pattern.last_seen.isoformat()
            pattern_data['severity'] = pattern.severity.value
            pattern_data['category'] = pattern.category.value
            pattern_data['business_impact'] = pattern.business_impact.value
            
            await self.redis_client.setex(
                pattern_key,
                24 * 3600,  # 24 hours
                json.dumps(pattern_data)
            )
    
    async def _send_to_sentry(self, error_event: ErrorEvent, exception: Optional[Exception]):
        """Send error to Sentry with enhanced context"""
        try:
            # Set user context
            if error_event.user_id:
                add_user_context({
                    "id": error_event.user_id,
                    "session_id": error_event.session_id,
                })
            
            # Set business context
            business_context = {
                "operation_type": "error_monitoring",
                "resource_type": error_event.category.value,
                "resource_id": error_event.request_id,
            }
            
            if error_event.booking_id:
                business_context["booking_id"] = error_event.booking_id
            if error_event.payment_id:
                business_context["payment_id"] = error_event.payment_id
            if error_event.barber_id:
                business_context["barber_id"] = error_event.barber_id
            if error_event.client_id:
                business_context["client_id"] = error_event.client_id
            
            add_business_context(business_context)
            
            # Add performance breadcrumb if available
            if error_event.response_time_ms:
                add_performance_breadcrumb(
                    f"{error_event.http_method} {error_event.endpoint}",
                    int(error_event.response_time_ms),
                    severity=error_event.severity.value,
                    category=error_event.category.value
                )
            
            # Use specific capture functions based on category
            if error_event.category == ErrorCategory.BOOKING and error_event.booking_id:
                capture_booking_error(exception or Exception(error_event.message), {
                    "appointment_id": error_event.booking_id,
                    "client_id": error_event.client_id,
                    "barber_id": error_event.barber_id,
                    "error_stage": error_event.context.get("stage", "unknown")
                })
            elif error_event.category == ErrorCategory.PAYMENT and error_event.payment_id:
                capture_payment_error(exception or Exception(error_event.message), {
                    "payment_intent_id": error_event.payment_id,
                    "client_id": error_event.client_id,
                    "barber_id": error_event.barber_id,
                    "error_stage": error_event.context.get("stage", "unknown")
                })
            elif error_event.category == ErrorCategory.EXTERNAL_API:
                capture_integration_error(exception or Exception(error_event.message), {
                    "service_name": error_event.context.get("service", "unknown"),
                    "operation": error_event.context.get("operation", "unknown"),
                    "endpoint": error_event.endpoint
                })
            
        except Exception as e:
            logger.error(f"Failed to send error to Sentry: {e}")
    
    async def _check_alert_conditions(self, error_event: ErrorEvent):
        """Check if error should trigger alerts"""
        fingerprint = error_event.fingerprint
        severity = error_event.severity
        
        # Check if alert is suppressed
        suppression_key = f"{fingerprint}:{severity.value}"
        if suppression_key in self.alert_suppression:
            last_alert = self.alert_suppression[suppression_key]
            if datetime.utcnow() - last_alert < timedelta(minutes=30):
                return  # Alert suppressed
        
        # Get threshold configuration
        threshold_config = self.alert_thresholds.get(severity)
        if not threshold_config:
            return
        
        # Count recent errors of same pattern
        recent_count = await self._count_recent_errors(fingerprint, threshold_config["time_window"])
        
        if recent_count >= threshold_config["count"]:
            await self._send_alert(error_event, recent_count)
            self.alert_suppression[suppression_key] = datetime.utcnow()
    
    async def _count_recent_errors(self, fingerprint: str, time_window_seconds: int) -> int:
        """Count recent errors for a specific pattern"""
        if not self.redis_client:
            return 0
        
        try:
            cutoff_time = datetime.utcnow() - timedelta(seconds=time_window_seconds)
            ts_key = f"error_timeseries:{fingerprint}"
            
            count = await self.redis_client.zcount(
                ts_key,
                cutoff_time.timestamp(),
                datetime.utcnow().timestamp()
            )
            
            return count
        except Exception as e:
            logger.error(f"Failed to count recent errors: {e}")
            return 0
    
    async def _send_alert(self, error_event: ErrorEvent, count: int):
        """Send alert for critical error patterns"""
        try:
            # Calculate priority based on severity and business impact
            impact_weight = self.business_impact_weights.get(error_event.business_impact, 1.0)
            priority_score = impact_weight * count
            
            alert_data = {
                "type": "error_alert",
                "severity": error_event.severity.value,
                "category": error_event.category.value,
                "business_impact": error_event.business_impact.value,
                "message": error_event.message,
                "count": count,
                "priority_score": priority_score,
                "fingerprint": error_event.fingerprint,
                "first_occurrence": error_event.timestamp.isoformat(),
                "endpoint": error_event.endpoint,
                "affected_users": self.pattern_cache.get(error_event.fingerprint, ErrorPattern).affected_users if error_event.fingerprint in self.pattern_cache else 1,
                "context": error_event.context
            }
            
            # Send to notification service
            await notification_service.send_alert(
                title=f"🚨 {error_event.severity.value.upper()} Error Alert",
                message=f"{count} occurrences of {error_event.category.value} error",
                data=alert_data,
                priority="high" if error_event.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL] else "medium"
            )
            
            logger.warning(f"🚨 Alert sent for error pattern {error_event.fingerprint}: {count} occurrences")
            
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
    
    async def _pattern_analysis_loop(self):
        """Background task for pattern analysis and trending"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self._analyze_error_trends()
                await self._generate_resolution_suggestions()
                await self._cleanup_old_patterns()
            except Exception as e:
                logger.error(f"Error in pattern analysis loop: {e}")
    
    async def _analyze_error_trends(self):
        """Analyze error trends and detect anomalies"""
        if not self.redis_client:
            return
        
        for fingerprint, pattern in self.pattern_cache.items():
            try:
                # Get hourly counts for the last 24 hours
                hourly_counts = []
                now = datetime.utcnow()
                
                for i in range(24):
                    hour_time = now - timedelta(hours=i)
                    hour_key = hour_time.strftime("%Y-%m-%d-%H")
                    count_key = f"error_count:fingerprint:{fingerprint}:{hour_key}"
                    count = await self.redis_client.get(count_key)
                    hourly_counts.append(int(count) if count else 0)
                
                if len(hourly_counts) < 3:
                    continue
                
                # Analyze trend
                recent_avg = statistics.mean(hourly_counts[:6])  # Last 6 hours
                historical_avg = statistics.mean(hourly_counts[6:])  # Previous 18 hours
                
                if recent_avg > historical_avg * 2:
                    pattern.trending = "increasing"
                elif recent_avg < historical_avg * 0.5:
                    pattern.trending = "decreasing"
                else:
                    pattern.trending = "stable"
                
                # Update pattern in cache and Redis
                await self._update_error_pattern_trending(pattern)
                
            except Exception as e:
                logger.error(f"Failed to analyze trend for pattern {fingerprint}: {e}")
    
    async def _update_error_pattern_trending(self, pattern: ErrorPattern):
        """Update pattern trending information"""
        if not self.redis_client:
            return
        
        try:
            pattern_key = f"error_pattern:{pattern.fingerprint}"
            pattern_data = asdict(pattern)
            pattern_data['first_seen'] = pattern.first_seen.isoformat()
            pattern_data['last_seen'] = pattern.last_seen.isoformat()
            pattern_data['severity'] = pattern.severity.value
            pattern_data['category'] = pattern.category.value
            pattern_data['business_impact'] = pattern.business_impact.value
            
            await self.redis_client.setex(
                pattern_key,
                24 * 3600,
                json.dumps(pattern_data)
            )
        except Exception as e:
            logger.error(f"Failed to update pattern trending: {e}")
    
    async def _generate_resolution_suggestions(self):
        """Generate AI-powered resolution suggestions for error patterns"""
        for pattern in self.pattern_cache.values():
            if pattern.resolution_suggestions:
                continue  # Already has suggestions
            
            suggestions = self._get_resolution_suggestions(pattern)
            pattern.resolution_suggestions = suggestions
    
    def _get_resolution_suggestions(self, pattern: ErrorPattern) -> List[str]:
        """Get resolution suggestions based on error pattern"""
        suggestions = []
        
        # Category-specific suggestions
        if pattern.category == ErrorCategory.DATABASE:
            suggestions.extend([
                "Check database connection health and connection pool settings",
                "Review recent database schema changes or migrations",
                "Monitor database CPU and memory usage",
                "Check for long-running queries or deadlocks"
            ])
        elif pattern.category == ErrorCategory.PAYMENT:
            suggestions.extend([
                "Verify Stripe API key configuration and network connectivity",
                "Check payment method validation logic",
                "Review payment processing workflow for edge cases",
                "Monitor Stripe webhook delivery status"
            ])
        elif pattern.category == ErrorCategory.AUTHENTICATION:
            suggestions.extend([
                "Verify JWT token configuration and expiration settings",
                "Check authentication middleware configuration",
                "Review user session management logic",
                "Monitor authentication service dependencies"
            ])
        elif pattern.category == ErrorCategory.EXTERNAL_API:
            suggestions.extend([
                "Check third-party service status and rate limits",
                "Verify API credentials and endpoint configurations",
                "Review retry logic and timeout settings",
                "Monitor network connectivity to external services"
            ])
        
        # Severity-specific suggestions
        if pattern.severity == ErrorSeverity.CRITICAL:
            suggestions.extend([
                "Implement immediate circuit breaker pattern",
                "Set up automated failover mechanisms",
                "Consider rolling back recent deployments",
                "Escalate to on-call engineer immediately"
            ])
        elif pattern.severity == ErrorSeverity.HIGH:
            suggestions.extend([
                "Review and increase monitoring alerts",
                "Implement graceful degradation",
                "Scale affected services if resource-related",
                "Review recent code changes for root cause"
            ])
        
        # Trending-specific suggestions
        if pattern.trending == "increasing":
            suggestions.extend([
                "Investigate recent system changes or deployments",
                "Check for increased load or traffic patterns",
                "Monitor system resource utilization",
                "Consider implementing rate limiting or caching"
            ])
        
        return suggestions[:5]  # Limit to top 5 suggestions
    
    async def _performance_correlation_loop(self):
        """Background task to correlate errors with performance metrics"""
        while True:
            try:
                await asyncio.sleep(600)  # Run every 10 minutes
                await self._correlate_errors_with_performance()
            except Exception as e:
                logger.error(f"Error in performance correlation loop: {e}")
    
    async def _correlate_errors_with_performance(self):
        """Correlate error patterns with performance degradation"""
        # This would integrate with your performance monitoring system
        # For now, we'll implement basic correlation with response times
        
        if not self.redis_client:
            return
        
        for pattern in self.pattern_cache.values():
            try:
                # Get average response time for errors with this pattern
                avg_response_time = await self._get_average_response_time(pattern.fingerprint)
                
                if avg_response_time is None:
                    continue
                
                # Compare with baseline
                baseline_key = f"baseline_response_time:{pattern.category.value}"
                baseline = self.performance_baselines.get(baseline_key)
                
                if baseline and avg_response_time > baseline * 2:
                    # Performance degradation detected
                    pattern.resolution_suggestions.insert(0, 
                        f"Performance issue detected: {avg_response_time:.0f}ms avg response time "
                        f"(baseline: {baseline:.0f}ms). Check system resources and optimize queries."
                    )
                
            except Exception as e:
                logger.error(f"Failed to correlate performance for pattern {pattern.fingerprint}: {e}")
    
    async def _get_average_response_time(self, fingerprint: str) -> Optional[float]:
        """Get average response time for errors with specific fingerprint"""
        if not self.redis_client:
            return None
        
        try:
            # Get recent error events for this fingerprint
            ts_key = f"error_timeseries:{fingerprint}"
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            error_ids = await self.redis_client.zrangebyscore(
                ts_key,
                cutoff_time.timestamp(),
                datetime.utcnow().timestamp()
            )
            
            response_times = []
            for error_id in error_ids:
                error_key = f"error_event:{error_id}"
                error_data = await self.redis_client.get(error_key)
                if error_data:
                    error_event = json.loads(error_data)
                    if error_event.get('response_time_ms'):
                        response_times.append(float(error_event['response_time_ms']))
            
            return statistics.mean(response_times) if response_times else None
            
        except Exception as e:
            logger.error(f"Failed to get average response time: {e}")
            return None
    
    async def _cleanup_old_patterns(self):
        """Cleanup old error patterns to prevent memory leaks"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        patterns_to_remove = []
        for fingerprint, pattern in self.pattern_cache.items():
            if pattern.last_seen < cutoff_time:
                patterns_to_remove.append(fingerprint)
        
        for fingerprint in patterns_to_remove:
            del self.pattern_cache[fingerprint]
            logger.debug(f"Cleaned up old error pattern: {fingerprint}")
    
    async def _store_error_in_db(self, error_event: ErrorEvent):
        """Store error event in database for long-term analysis"""
        try:
            async with get_db_session() as session:
                # This would integrate with your database models
                # For now, we'll just log that we would store it
                logger.debug(f"Would store error in DB: {error_event.id}")
        except Exception as e:
            logger.error(f"Failed to store error in database: {e}")
    
    async def get_error_patterns(
        self, 
        limit: int = 50,
        category: Optional[ErrorCategory] = None,
        severity: Optional[ErrorSeverity] = None,
        business_impact: Optional[BusinessImpact] = None
    ) -> List[ErrorPattern]:
        """Get error patterns with optional filtering"""
        patterns = list(self.pattern_cache.values())
        
        # Apply filters
        if category:
            patterns = [p for p in patterns if p.category == category]
        if severity:
            patterns = [p for p in patterns if p.severity == severity]
        if business_impact:
            patterns = [p for p in patterns if p.business_impact == business_impact]
        
        # Sort by impact score (count * business impact weight)
        patterns.sort(
            key=lambda p: p.count * self.business_impact_weights.get(p.business_impact, 1.0),
            reverse=True
        )
        
        return patterns[:limit]
    
    async def get_error_statistics(self) -> Dict[str, Any]:
        """Get comprehensive error statistics"""
        if not self.redis_client:
            return {}
        
        try:
            now = datetime.utcnow()
            hour_key = now.strftime("%Y-%m-%d-%H")
            
            stats = {
                "current_hour": {
                    "total_errors": await self._get_count(f"error_count:total:{hour_key}"),
                    "by_severity": {},
                    "by_category": {},
                    "by_business_impact": {}
                },
                "patterns": {
                    "total_active_patterns": len(self.pattern_cache),
                    "trending_up": len([p for p in self.pattern_cache.values() if p.trending == "increasing"]),
                    "critical_patterns": len([p for p in self.pattern_cache.values() if p.severity == ErrorSeverity.CRITICAL])
                }
            }
            
            # Get severity breakdown
            for severity in ErrorSeverity:
                count = await self._get_count(f"error_count:severity:{severity.value}:{hour_key}")
                stats["current_hour"]["by_severity"][severity.value] = count
            
            # Get category breakdown
            for category in ErrorCategory:
                count = await self._get_count(f"error_count:category:{category.value}:{hour_key}")
                stats["current_hour"]["by_category"][category.value] = count
            
            # Get business impact breakdown
            for impact in BusinessImpact:
                count = await self._get_count(f"error_count:impact:{impact.value}:{hour_key}")
                stats["current_hour"]["by_business_impact"][impact.value] = count
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get error statistics: {e}")
            return {}
    
    async def _get_count(self, key: str) -> int:
        """Helper to get count from Redis"""
        if not self.redis_client:
            return 0
        
        try:
            count = await self.redis_client.get(key)
            return int(count) if count else 0
        except:
            return 0
    
    async def health_check(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            "status": "healthy" if self.redis_client else "degraded",
            "redis_connected": self.redis_client is not None,
            "active_patterns": len(self.pattern_cache),
            "buffer_size": len(self.error_buffer),
            "suppressed_alerts": len(self.alert_suppression)
        }


# Global service instance
enhanced_error_monitoring_service = EnhancedErrorMonitoringService()