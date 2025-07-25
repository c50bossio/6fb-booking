"""
Marketing Analytics Error Monitoring
====================================

Enhanced error monitoring and alerting for marketing integrations
with Sentry integration and custom error tracking.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from functools import wraps
from sentry_sdk import capture_exception, capture_message, set_context, set_tag


logger = logging.getLogger(__name__)


class MarketingErrorMonitor:
    """
    Enhanced error monitoring for marketing analytics operations.
    
    Provides:
    - Detailed error context capture
    - Performance monitoring
    - Custom alerts for critical failures
    - Integration health tracking
    """
    
    def __init__(self):
        self.error_thresholds = {
            "oauth_failure": 3,      # Alert after 3 OAuth failures
            "api_timeout": 5,        # Alert after 5 API timeouts
            "data_corruption": 1,    # Alert immediately on data issues
            "rate_limit": 10,        # Alert after 10 rate limit hits
        }
        self.error_counts = {}
    
    def track_oauth_error(
        self,
        provider: str,
        user_id: int,
        error_type: str,
        error_details: Dict[str, Any]
    ):
        """Track OAuth authentication errors"""
        error_key = f"oauth_{provider}_{error_type}"
        
        # Set Sentry context
        set_context("oauth_error", {
            "provider": provider,
            "user_id": user_id,
            "error_type": error_type,
            "details": error_details,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Capture to Sentry
        capture_message(
            f"OAuth Error: {provider} - {error_type}",
            level="error",
            tags={
                "integration.provider": provider,
                "error.type": error_type,
                "user.id": user_id
            }
        )
        
        # Check threshold
        self._check_error_threshold(error_key, "oauth_failure", {
            "provider": provider,
            "error_type": error_type
        })
        
        logger.error(
            f"OAuth error for {provider}: {error_type}",
            extra={"user_id": user_id, "details": error_details}
        )
    
    def track_api_error(
        self,
        endpoint: str,
        status_code: int,
        error_message: str,
        request_data: Optional[Dict[str, Any]] = None
    ):
        """Track marketing API errors"""
        error_key = f"api_{endpoint}_{status_code}"
        
        # Set Sentry context
        set_context("api_error", {
            "endpoint": endpoint,
            "status_code": status_code,
            "error_message": error_message,
            "request_data": request_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Determine severity
        if status_code >= 500:
            level = "error"
        elif status_code >= 400:
            level = "warning"
        else:
            level = "info"
        
        # Capture to Sentry
        capture_message(
            f"Marketing API Error: {endpoint} returned {status_code}",
            level=level,
            tags={
                "api.endpoint": endpoint,
                "http.status_code": str(status_code),
                "api.category": "marketing"
            }
        )
        
        # Check for timeout errors
        if status_code == 504 or "timeout" in error_message.lower():
            self._check_error_threshold(error_key, "api_timeout", {
                "endpoint": endpoint
            })
    
    def track_data_quality_issue(
        self,
        issue_type: str,
        affected_entity: str,
        details: Dict[str, Any]
    ):
        """Track data quality and integrity issues"""
        # Critical - alert immediately
        set_context("data_quality", {
            "issue_type": issue_type,
            "affected_entity": affected_entity,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        capture_message(
            f"Data Quality Issue: {issue_type} in {affected_entity}",
            level="error",
            tags={
                "data.issue_type": issue_type,
                "data.entity": affected_entity,
                "alert.priority": "high"
            }
        )
        
        # Send immediate alert
        self._send_critical_alert(
            title=f"Data Quality Issue: {issue_type}",
            details={
                "entity": affected_entity,
                "issue": details
            }
        )
    
    def track_performance_issue(
        self,
        operation: str,
        duration_ms: float,
        threshold_ms: float = 1000
    ):
        """Track performance issues in marketing operations"""
        if duration_ms > threshold_ms:
            set_context("performance", {
                "operation": operation,
                "duration_ms": duration_ms,
                "threshold_ms": threshold_ms,
                "exceeded_by_ms": duration_ms - threshold_ms
            })
            
            severity = "warning" if duration_ms < threshold_ms * 2 else "error"
            
            capture_message(
                f"Performance Issue: {operation} took {duration_ms:.0f}ms",
                level=severity,
                tags={
                    "performance.operation": operation,
                    "performance.slow": "true"
                }
            )
    
    def track_integration_health(
        self,
        provider: str,
        status: str,
        error_count: int,
        last_sync: Optional[datetime]
    ):
        """Track integration health status"""
        health_data = {
            "provider": provider,
            "status": status,
            "error_count": error_count,
            "last_sync": last_sync.isoformat() if last_sync else None,
            "checked_at": datetime.utcnow().isoformat()
        }
        
        set_context("integration_health", health_data)
        
        # Alert on unhealthy integrations
        if status in ["error", "expired", "disconnected"]:
            capture_message(
                f"Integration Unhealthy: {provider} - {status}",
                level="warning",
                tags={
                    "integration.provider": provider,
                    "integration.status": status,
                    "integration.errors": str(error_count)
                }
            )
    
    def _check_error_threshold(
        self,
        error_key: str,
        error_type: str,
        context: Dict[str, Any]
    ):
        """Check if error count exceeds threshold"""
        if error_key not in self.error_counts:
            self.error_counts[error_key] = 0
        
        self.error_counts[error_key] += 1
        
        threshold = self.error_thresholds.get(error_type, 10)
        if self.error_counts[error_key] >= threshold:
            self._send_critical_alert(
                title=f"Error Threshold Exceeded: {error_type}",
                details={
                    "error_key": error_key,
                    "count": self.error_counts[error_key],
                    "threshold": threshold,
                    "context": context
                }
            )
            # Reset counter after alert
            self.error_counts[error_key] = 0
    
    def _send_critical_alert(self, title: str, details: Dict[str, Any]):
        """Send critical alert through Sentry"""
        capture_message(
            title,
            level="fatal",
            tags={
                "alert.critical": "true",
                "alert.category": "marketing",
                "alert.timestamp": datetime.utcnow().isoformat()
            },
            extra=details
        )
        
        logger.critical(f"CRITICAL ALERT: {title}", extra=details)


# Decorator for automatic error tracking
def track_marketing_errors(operation: str):
    """Decorator to automatically track marketing operation errors"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            monitor = MarketingErrorMonitor()
            start_time = datetime.utcnow()
            
            try:
                # Set operation context
                set_tag("marketing.operation", operation)
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Track performance
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                monitor.track_performance_issue(operation, duration_ms)
                
                return result
                
            except Exception as e:
                # Capture exception with context
                set_context("marketing_operation", {
                    "operation": operation,
                    "args": str(args)[:200],  # Truncate for safety
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                capture_exception(e)
                logger.error(f"Error in {operation}: {str(e)}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            monitor = MarketingErrorMonitor()
            start_time = datetime.utcnow()
            
            try:
                # Set operation context
                set_tag("marketing.operation", operation)
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Track performance
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                monitor.track_performance_issue(operation, duration_ms)
                
                return result
                
            except Exception as e:
                # Capture exception with context
                set_context("marketing_operation", {
                    "operation": operation,
                    "args": str(args)[:200],  # Truncate for safety
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                capture_exception(e)
                logger.error(f"Error in {operation}: {str(e)}")
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
            
    return decorator


# Create singleton instance
marketing_error_monitor = MarketingErrorMonitor()