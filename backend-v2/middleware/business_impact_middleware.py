"""
Business Impact Middleware for BookedBarber
Automatically correlates technical incidents with business impact in real-time.
Integrates with existing SRE monitoring to provide business-aware incident response.
"""

import asyncio
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from services.business_impact_monitoring_service import business_impact_monitor
from services.performance_monitoring import performance_tracker
from services.redis_cache import cache_service

logger = logging.getLogger(__name__)


class BusinessImpactCorrelationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that automatically analyzes business impact of technical incidents
    and correlates performance degradation with revenue implications.
    """
    
    def __init__(self, app, config: Optional[Dict[str, Any]] = None):
        super().__init__(app)
        self.config = config or {}
        self.enabled = self.config.get("enabled", True)
        self.performance_threshold = self.config.get("performance_threshold", 2000)  # 2 seconds
        self.error_rate_threshold = self.config.get("error_rate_threshold", 0.05)   # 5%
        self.business_impact_cache_ttl = self.config.get("cache_ttl", 300)  # 5 minutes
        
        # Track request patterns for business impact analysis
        self.request_tracker = {
            "total_requests": 0,
            "error_requests": 0,
            "slow_requests": 0,
            "business_critical_requests": 0,
            "last_reset": time.time()
        }
        
        # Business-critical endpoints that directly impact revenue
        self.business_critical_endpoints = {
            "/api/v2/bookings": "booking_system",
            "/api/v2/payments": "payment_system", 
            "/api/v2/auth/login": "authentication_system",
            "/api/v2/auth/register": "registration_system",
            "/api/v2/notifications": "notification_system",
            "/api/v2/calendar": "scheduling_system",
            "/api/v2/services": "service_catalog",
            "/api/v2/availability": "availability_system"
        }
        
        # Track business impact triggers
        self.impact_triggers = {
            "high_error_rate": False,
            "performance_degradation": False,
            "critical_system_failure": False,
            "peak_hours_impact": False
        }
        
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with business impact correlation"""
        
        if not self.enabled:
            return await call_next(request)
        
        start_time = time.time()
        business_context = await self._get_business_context(request)
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate request metrics
            response_time = (time.time() - start_time) * 1000  # milliseconds
            is_error = response.status_code >= 400
            is_slow = response_time > self.performance_threshold
            is_business_critical = self._is_business_critical_endpoint(request.url.path)
            
            # Update request tracking
            await self._update_request_tracking(is_error, is_slow, is_business_critical)
            
            # Analyze business impact if needed
            if self._should_trigger_business_impact_analysis(
                response, response_time, business_context
            ):
                asyncio.create_task(
                    self._analyze_request_business_impact(
                        request, response, response_time, business_context
                    )
                )
            
            # Add business impact headers to response
            if is_business_critical or is_error or is_slow:
                response.headers["X-Business-Impact-Tracked"] = "true"
                response.headers["X-Business-Context"] = business_context.get("context_type", "normal")
                
                if business_context.get("peak_hours", False):
                    response.headers["X-Peak-Hours-Impact"] = "true"
                
                if business_context.get("high_value_period", False):
                    response.headers["X-High-Value-Period-Impact"] = "true"
            
            return response
            
        except Exception as e:
            # Handle exceptions with business impact analysis
            response_time = (time.time() - start_time) * 1000
            
            # Create error response
            error_response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "business_impact_tracked": True}
            )
            
            # Analyze business impact of the exception
            asyncio.create_task(
                self._analyze_exception_business_impact(
                    request, e, response_time, business_context
                )
            )
            
            return error_response
    
    async def _get_business_context(self, request: Request) -> Dict[str, Any]:
        """Get current business context for impact analysis"""
        try:
            # Get cached business context
            context = await cache_service.get("current_business_context")
            if context:
                return context
            
            # Generate fresh business context
            current_hour = datetime.now().hour
            current_day = datetime.now().weekday()
            
            context = {
                "timestamp": datetime.now().isoformat(),
                "peak_hours": 10 <= current_hour <= 17 and 1 <= current_day <= 5,
                "high_value_period": await self._is_high_value_period(),
                "context_type": "normal",
                "business_multiplier": 1.0
            }
            
            # Determine context type and multiplier
            if context["peak_hours"] and context["high_value_period"]:
                context["context_type"] = "critical"
                context["business_multiplier"] = 2.5
            elif context["peak_hours"]:
                context["context_type"] = "peak"
                context["business_multiplier"] = 1.8
            elif context["high_value_period"]:
                context["context_type"] = "high_value"
                context["business_multiplier"] = 2.0
            
            # Cache context for 5 minutes
            await cache_service.set("current_business_context", context, ttl=300)
            return context
            
        except Exception as e:
            logger.error(f"Error getting business context: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "peak_hours": False,
                "high_value_period": False,
                "context_type": "normal",
                "business_multiplier": 1.0
            }
    
    async def _is_high_value_period(self) -> bool:
        """Check if current time is during a high-value business period"""
        current_date = datetime.now().date()
        current_day = datetime.now().weekday()
        
        # Weekend periods (Friday-Sunday)
        if current_day >= 4:
            return True
        
        # Holiday periods (simplified - would integrate with business calendar)
        holiday_periods = [
            (datetime(2024, 12, 20).date(), datetime(2024, 12, 31).date()),
            (datetime(2024, 7, 1).date(), datetime(2024, 7, 7).date()),
        ]
        
        for start_date, end_date in holiday_periods:
            if start_date <= current_date <= end_date:
                return True
        
        return False
    
    def _is_business_critical_endpoint(self, path: str) -> bool:
        """Check if the endpoint is business-critical"""
        for critical_path in self.business_critical_endpoints.keys():
            if path.startswith(critical_path):
                return True
        return False
    
    def _get_affected_system(self, path: str) -> Optional[str]:
        """Get the affected business system for the endpoint"""
        for critical_path, system in self.business_critical_endpoints.items():
            if path.startswith(critical_path):
                return system
        return None
    
    async def _update_request_tracking(
        self, 
        is_error: bool, 
        is_slow: bool, 
        is_business_critical: bool
    ):
        """Update request tracking metrics"""
        self.request_tracker["total_requests"] += 1
        
        if is_error:
            self.request_tracker["error_requests"] += 1
        
        if is_slow:
            self.request_tracker["slow_requests"] += 1
        
        if is_business_critical:
            self.request_tracker["business_critical_requests"] += 1
        
        # Reset tracking every hour
        current_time = time.time()
        if current_time - self.request_tracker["last_reset"] > 3600:  # 1 hour
            await self._reset_request_tracking()
    
    async def _reset_request_tracking(self):
        """Reset request tracking metrics"""
        # Store current metrics before reset
        await cache_service.set(
            f"request_metrics:{int(time.time())}",
            self.request_tracker.copy(),
            ttl=86400  # Keep for 24 hours
        )
        
        # Reset counters
        self.request_tracker = {
            "total_requests": 0,
            "error_requests": 0,
            "slow_requests": 0,
            "business_critical_requests": 0,
            "last_reset": time.time()
        }
    
    def _should_trigger_business_impact_analysis(
        self, 
        response: Response, 
        response_time: float, 
        business_context: Dict[str, Any]
    ) -> bool:
        """Determine if business impact analysis should be triggered"""
        
        # Always analyze business-critical endpoint errors
        if response.status_code >= 500:
            return True
        
        # Analyze during peak hours/high-value periods
        if (business_context.get("peak_hours") or business_context.get("high_value_period")):
            if response.status_code >= 400 or response_time > self.performance_threshold:
                return True
        
        # Check for error rate threshold breach
        if self.request_tracker["total_requests"] > 10:  # Minimum sample size
            error_rate = self.request_tracker["error_requests"] / self.request_tracker["total_requests"]
            if error_rate > self.error_rate_threshold:
                self.impact_triggers["high_error_rate"] = True
                return True
        
        # Check for performance degradation
        if self.request_tracker["total_requests"] > 10:
            slow_rate = self.request_tracker["slow_requests"] / self.request_tracker["total_requests"]
            if slow_rate > 0.3:  # 30% of requests are slow
                self.impact_triggers["performance_degradation"] = True
                return True
        
        return False
    
    async def _analyze_request_business_impact(
        self,
        request: Request,
        response: Response,
        response_time: float,
        business_context: Dict[str, Any]
    ):
        """Analyze business impact of a request/response"""
        try:
            # Determine incident type
            incident_type = self._classify_incident(response.status_code, response_time)
            
            # Get affected systems
            affected_systems = []
            affected_system = self._get_affected_system(request.url.path)
            if affected_system:
                affected_systems.append(affected_system)
            
            # Create technical metrics
            technical_metrics = {
                "status_code": response.status_code,
                "response_time_ms": response_time,
                "error_rate": self.request_tracker["error_requests"] / max(1, self.request_tracker["total_requests"]),
                "endpoint": str(request.url.path),
                "method": request.method,
                "severity": self._determine_technical_severity(response.status_code, response_time)
            }
            
            # Analyze business impact
            impact_calculation = await business_impact_monitor.analyze_business_impact(
                incident_type=incident_type,
                technical_metrics=technical_metrics,
                affected_systems=affected_systems,
                duration_minutes=1  # Assume 1-minute impact for single request analysis
            )
            
            # Store impact data for aggregation
            await self._store_request_impact(request, impact_calculation, business_context)
            
            # Log high-impact requests
            if impact_calculation.business_severity.value in ["high", "critical"]:
                logger.warning(
                    f"High business impact request detected: "
                    f"{request.method} {request.url.path} - "
                    f"Status: {response.status_code}, "
                    f"Response time: {response_time:.1f}ms, "
                    f"Business severity: {impact_calculation.business_severity.value}, "
                    f"Estimated revenue loss: ${impact_calculation.estimated_revenue_loss}"
                )
            
        except Exception as e:
            logger.error(f"Error analyzing request business impact: {e}")
    
    async def _analyze_exception_business_impact(
        self,
        request: Request,
        exception: Exception,
        response_time: float,
        business_context: Dict[str, Any]
    ):
        """Analyze business impact of an unhandled exception"""
        try:
            # Classify the exception
            incident_type = "unhandled_exception"
            
            # Get affected systems
            affected_systems = []
            affected_system = self._get_affected_system(request.url.path)
            if affected_system:
                affected_systems.append(affected_system)
            
            # Create technical metrics for exception
            technical_metrics = {
                "status_code": 500,
                "response_time_ms": response_time,
                "error_rate": 1.0,  # 100% error for this request
                "endpoint": str(request.url.path),
                "method": request.method,
                "exception_type": type(exception).__name__,
                "severity": "critical"  # Unhandled exceptions are always critical
            }
            
            # Analyze business impact
            impact_calculation = await business_impact_monitor.analyze_business_impact(
                incident_type=incident_type,
                technical_metrics=technical_metrics,
                affected_systems=affected_systems,
                duration_minutes=None  # Unknown duration for exceptions
            )
            
            # Store exception impact
            await self._store_exception_impact(request, exception, impact_calculation)
            
            # Always log exceptions with business context
            logger.error(
                f"Exception with business impact: "
                f"{request.method} {request.url.path} - "
                f"Exception: {type(exception).__name__}: {str(exception)}, "
                f"Business severity: {impact_calculation.business_severity.value}, "
                f"Peak hours: {business_context.get('peak_hours', False)}, "
                f"High value period: {business_context.get('high_value_period', False)}"
            )
            
        except Exception as e:
            logger.error(f"Error analyzing exception business impact: {e}")
    
    def _classify_incident(self, status_code: int, response_time: float) -> str:
        """Classify the type of incident based on response characteristics"""
        if status_code >= 500:
            return "server_error"
        elif status_code >= 400:
            return "client_error"
        elif response_time > self.performance_threshold * 2:  # Very slow
            return "critical_performance_degradation"
        elif response_time > self.performance_threshold:
            return "performance_degradation"
        else:
            return "normal_operation"
    
    def _determine_technical_severity(self, status_code: int, response_time: float) -> str:
        """Determine technical severity of the incident"""
        if status_code >= 500:
            return "critical"
        elif status_code >= 400:
            return "high"
        elif response_time > self.performance_threshold * 2:
            return "high"
        elif response_time > self.performance_threshold:
            return "medium"
        else:
            return "low"
    
    async def _store_request_impact(
        self, 
        request: Request, 
        impact_calculation, 
        business_context: Dict[str, Any]
    ):
        """Store request impact data for aggregation and analysis"""
        try:
            impact_data = {
                "timestamp": datetime.now().isoformat(),
                "request_method": request.method,
                "request_path": str(request.url.path),
                "business_severity": impact_calculation.business_severity.value,
                "estimated_revenue_loss": float(impact_calculation.estimated_revenue_loss),
                "affected_bookings": impact_calculation.affected_bookings,
                "recovery_urgency_score": impact_calculation.recovery_urgency_score,
                "business_context": business_context,
                "sixfb_principles_affected": [p.value for p in impact_calculation.sixfb_principle_impact]
            }
            
            # Store individual impact
            await cache_service.set(
                f"request_impact:{int(time.time() * 1000)}",  # Unique timestamp key
                impact_data,
                ttl=self.business_impact_cache_ttl
            )
            
            # Update aggregated impact metrics
            await self._update_aggregated_impact_metrics(impact_data)
            
        except Exception as e:
            logger.error(f"Error storing request impact: {e}")
    
    async def _store_exception_impact(
        self, 
        request: Request, 
        exception: Exception, 
        impact_calculation
    ):
        """Store exception impact data"""
        try:
            exception_data = {
                "timestamp": datetime.now().isoformat(),
                "request_method": request.method,
                "request_path": str(request.url.path),
                "exception_type": type(exception).__name__,
                "exception_message": str(exception),
                "business_severity": impact_calculation.business_severity.value,
                "estimated_revenue_loss": float(impact_calculation.estimated_revenue_loss),
                "recovery_urgency_score": impact_calculation.recovery_urgency_score,
                "mitigation_priorities": impact_calculation.mitigation_priorities
            }
            
            # Store exception with extended TTL for debugging
            await cache_service.set(
                f"exception_impact:{int(time.time() * 1000)}",
                exception_data,
                ttl=3600  # Keep exceptions for 1 hour
            )
            
        except Exception as e:
            logger.error(f"Error storing exception impact: {e}")
    
    async def _update_aggregated_impact_metrics(self, impact_data: Dict[str, Any]):
        """Update aggregated impact metrics for dashboard and alerting"""
        try:
            # Get current aggregated metrics
            current_metrics = await cache_service.get("aggregated_impact_metrics") or {
                "total_revenue_impact": 0.0,
                "total_incidents": 0,
                "severity_distribution": {"minimal": 0, "low": 0, "medium": 0, "high": 0, "critical": 0},
                "principle_impacts": {},
                "last_updated": datetime.now().isoformat()
            }
            
            # Update metrics
            current_metrics["total_revenue_impact"] += impact_data["estimated_revenue_loss"]
            current_metrics["total_incidents"] += 1
            
            # Update severity distribution
            severity = impact_data["business_severity"]
            current_metrics["severity_distribution"][severity] += 1
            
            # Update principle impacts
            for principle in impact_data["sixfb_principles_affected"]:
                current_metrics["principle_impacts"][principle] = current_metrics["principle_impacts"].get(principle, 0) + 1
            
            current_metrics["last_updated"] = datetime.now().isoformat()
            
            # Store updated metrics
            await cache_service.set(
                "aggregated_impact_metrics",
                current_metrics,
                ttl=3600  # 1 hour TTL
            )
            
        except Exception as e:
            logger.error(f"Error updating aggregated impact metrics: {e}")
    
    async def get_middleware_metrics(self) -> Dict[str, Any]:
        """Get middleware performance and business impact metrics"""
        try:
            # Get aggregated metrics
            aggregated_metrics = await cache_service.get("aggregated_impact_metrics") or {}
            
            return {
                "middleware_status": "enabled" if self.enabled else "disabled",
                "request_tracking": self.request_tracker.copy(),
                "impact_triggers": self.impact_triggers.copy(),
                "business_critical_endpoints": len(self.business_critical_endpoints),
                "aggregated_impact": aggregated_metrics,
                "configuration": {
                    "performance_threshold_ms": self.performance_threshold,
                    "error_rate_threshold": self.error_rate_threshold,
                    "cache_ttl_seconds": self.business_impact_cache_ttl
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting middleware metrics: {e}")
            return {"error": str(e)}


# Utility function to add middleware to FastAPI app
def add_business_impact_middleware(app, config: Optional[Dict[str, Any]] = None):
    """Add business impact correlation middleware to FastAPI app"""
    app.add_middleware(BusinessImpactCorrelationMiddleware, config=config)
    logger.info("Business impact correlation middleware added to application")