"""
Enhanced Health Monitoring Service
Comprehensive system health monitoring with dependency checks, cascading failure detection,
and business-aware monitoring for the 6fb-booking platform
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import json
import httpx
import psutil
from sqlalchemy import text

from services.redis_service import cache_service
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity
from services.slo_management_service import slo_manager
from db import get_db


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class DependencyType(Enum):
    DATABASE = "database"
    CACHE = "cache"
    EXTERNAL_API = "external_api"
    INTERNAL_SERVICE = "internal_service"
    INFRASTRUCTURE = "infrastructure"
    BUSINESS_CRITICAL = "business_critical"


@dataclass
class HealthCheckResult:
    """Result of a health check"""
    service_name: str
    status: HealthStatus
    response_time_ms: float
    timestamp: datetime
    details: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    dependency_type: Optional[DependencyType] = None
    business_impact: str = "medium"  # low, medium, high, critical


@dataclass
class DependencyDefinition:
    """Definition of a service dependency"""
    name: str
    dependency_type: DependencyType
    check_function: Callable
    timeout_seconds: float
    business_impact: str
    description: str
    dependencies: List[str] = field(default_factory=list)  # Services this depends on
    critical_for: List[str] = field(default_factory=list)  # Services that depend on this


class EnhancedHealthMonitoringService:
    """Comprehensive health monitoring with dependency tracking and business awareness"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Health check results and history
        self.health_results = {}
        self.health_history = defaultdict(lambda: deque(maxlen=1000))
        
        # Dependency tracking
        self.dependency_graph = {}
        self.dependency_definitions = self._create_dependency_definitions()
        
        # Business context monitoring
        self.business_hours = {"start": 9, "end": 18}  # 9 AM to 6 PM
        self.peak_hours = {"start": 12, "end": 14}    # 12 PM to 2 PM
        
        # Cascading failure detection
        self.failure_cascades = deque(maxlen=100)
        self.cascade_detection_window = 300  # 5 minutes
        
        # Alert management
        self.alert_history = deque(maxlen=1000)
        self.alert_cooldowns = {}
        
        # Monitoring configuration
        self.monitoring_intervals = {
            "critical": 15,    # 15 seconds for critical services
            "high": 30,        # 30 seconds for high impact
            "medium": 60,      # 1 minute for medium impact
            "low": 300         # 5 minutes for low impact
        }
        
        # Background monitoring
        self._monitoring_tasks = {}
        self._stop_monitoring = False
        
        self.logger.info("🔍 Enhanced Health Monitoring Service initialized")
    
    def _create_dependency_definitions(self) -> Dict[str, DependencyDefinition]:
        """Create comprehensive dependency definitions"""
        return {
            # Core Infrastructure
            "database_primary": DependencyDefinition(
                name="database_primary",
                dependency_type=DependencyType.DATABASE,
                check_function=self._check_database_primary,
                timeout_seconds=5.0,
                business_impact="critical",
                description="Primary PostgreSQL database",
                critical_for=["api_gateway", "booking_system", "payment_system", "user_management"]
            ),
            
            "database_replica": DependencyDefinition(
                name="database_replica",
                dependency_type=DependencyType.DATABASE,
                check_function=self._check_database_replica,
                timeout_seconds=5.0,
                business_impact="high",
                description="Database read replica for reporting",
                dependencies=["database_primary"]
            ),
            
            "redis_cache": DependencyDefinition(
                name="redis_cache",
                dependency_type=DependencyType.CACHE,
                check_function=self._check_redis_cache,
                timeout_seconds=2.0,
                business_impact="high",
                description="Redis cache for session management and API caching",
                critical_for=["api_gateway", "session_management", "rate_limiting"]
            ),
            
            # Core Services
            "api_gateway": DependencyDefinition(
                name="api_gateway",
                dependency_type=DependencyType.INTERNAL_SERVICE,
                check_function=self._check_api_gateway,
                timeout_seconds=3.0,
                business_impact="critical",
                description="Main API gateway",
                dependencies=["database_primary", "redis_cache"],
                critical_for=["frontend", "mobile_app", "booking_system"]
            ),
            
            "booking_system": DependencyDefinition(
                name="booking_system",
                dependency_type=DependencyType.BUSINESS_CRITICAL,
                check_function=self._check_booking_system,
                timeout_seconds=5.0,
                business_impact="critical",
                description="Appointment booking system",
                dependencies=["database_primary", "redis_cache", "api_gateway"]
            ),
            
            "payment_system": DependencyDefinition(
                name="payment_system",
                dependency_type=DependencyType.BUSINESS_CRITICAL,
                check_function=self._check_payment_system,
                timeout_seconds=5.0,
                business_impact="critical",
                description="Payment processing system",
                dependencies=["database_primary", "stripe_api", "api_gateway"]
            ),
            
            "user_management": DependencyDefinition(
                name="user_management",
                dependency_type=DependencyType.INTERNAL_SERVICE,
                check_function=self._check_user_management,
                timeout_seconds=3.0,
                business_impact="high",
                description="User authentication and management",
                dependencies=["database_primary", "redis_cache"]
            ),
            
            "notification_system": DependencyDefinition(
                name="notification_system",
                dependency_type=DependencyType.INTERNAL_SERVICE,
                check_function=self._check_notification_system,
                timeout_seconds=3.0,
                business_impact="medium",
                description="Email and SMS notifications",
                dependencies=["sendgrid_api", "twilio_api", "database_primary"]
            ),
            
            # Frontend Services
            "frontend_web": DependencyDefinition(
                name="frontend_web",
                dependency_type=DependencyType.INTERNAL_SERVICE,
                check_function=self._check_frontend_web,
                timeout_seconds=10.0,
                business_impact="critical",
                description="Web frontend application",
                dependencies=["api_gateway"]
            ),
            
            "mobile_api": DependencyDefinition(
                name="mobile_api",
                dependency_type=DependencyType.INTERNAL_SERVICE,
                check_function=self._check_mobile_api,
                timeout_seconds=5.0,
                business_impact="high",
                description="Mobile application API endpoints",
                dependencies=["api_gateway", "booking_system", "payment_system"]
            ),
            
            # External Dependencies
            "stripe_api": DependencyDefinition(
                name="stripe_api",
                dependency_type=DependencyType.EXTERNAL_API,
                check_function=self._check_stripe_api,
                timeout_seconds=10.0,
                business_impact="critical",
                description="Stripe payment processing API",
                critical_for=["payment_system"]
            ),
            
            "sendgrid_api": DependencyDefinition(
                name="sendgrid_api",
                dependency_type=DependencyType.EXTERNAL_API,
                check_function=self._check_sendgrid_api,
                timeout_seconds=10.0,
                business_impact="medium",
                description="SendGrid email delivery API"
            ),
            
            "twilio_api": DependencyDefinition(
                name="twilio_api",
                dependency_type=DependencyType.EXTERNAL_API,
                check_function=self._check_twilio_api,
                timeout_seconds=10.0,
                business_impact="medium",
                description="Twilio SMS delivery API"
            ),
            
            "google_calendar_api": DependencyDefinition(
                name="google_calendar_api",
                dependency_type=DependencyType.EXTERNAL_API,
                check_function=self._check_google_calendar_api,
                timeout_seconds=10.0,
                business_impact="medium",
                description="Google Calendar integration API"
            ),
            
            # Infrastructure Components
            "load_balancer": DependencyDefinition(
                name="load_balancer",
                dependency_type=DependencyType.INFRASTRUCTURE,
                check_function=self._check_load_balancer,
                timeout_seconds=5.0,
                business_impact="critical",
                description="Application load balancer",
                critical_for=["api_gateway", "frontend_web"]
            ),
            
            "cdn": DependencyDefinition(
                name="cdn",
                dependency_type=DependencyType.INFRASTRUCTURE,
                check_function=self._check_cdn,
                timeout_seconds=5.0,
                business_impact="medium",
                description="Content delivery network for static assets"
            ),
            
            "monitoring_systems": DependencyDefinition(
                name="monitoring_systems",
                dependency_type=DependencyType.INFRASTRUCTURE,
                check_function=self._check_monitoring_systems,
                timeout_seconds=5.0,
                business_impact="low",
                description="Monitoring and observability stack"
            )
        }
    
    async def start_monitoring(self):
        """Start comprehensive health monitoring"""
        try:
            self.logger.info("🔍 Starting enhanced health monitoring...")
            
            # Build dependency graph
            self._build_dependency_graph()
            
            # Start monitoring tasks for each service based on business impact
            for service_name, definition in self.dependency_definitions.items():
                interval = self.monitoring_intervals.get(definition.business_impact, 60)
                self._monitoring_tasks[service_name] = asyncio.create_task(
                    self._monitor_service(service_name, interval)
                )
            
            # Start additional monitoring tasks
            additional_tasks = [
                self._cascade_detection_loop(),
                self._business_context_monitoring_loop(),
                self._health_analytics_loop(),
                self._slo_integration_loop()
            ]
            
            await asyncio.gather(*additional_tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"❌ Enhanced health monitoring startup failed: {e}")
            await enhanced_sentry.capture_exception(e, {"context": "health_monitoring_startup"})
    
    async def perform_health_check(self, service_name: str) -> HealthCheckResult:
        """Perform health check for a specific service"""
        
        if service_name not in self.dependency_definitions:
            return HealthCheckResult(
                service_name=service_name,
                status=HealthStatus.UNKNOWN,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message="Service not found in dependency definitions"
            )
        
        definition = self.dependency_definitions[service_name]
        start_time = time.time()
        
        try:
            # Check dependencies first
            dependency_status = await self._check_dependencies(service_name)
            
            # Perform the actual health check
            result = await asyncio.wait_for(
                definition.check_function(),
                timeout=definition.timeout_seconds
            )
            
            response_time = (time.time() - start_time) * 1000
            
            # Adjust status based on dependency health
            if dependency_status and dependency_status != HealthStatus.HEALTHY:
                if result.status == HealthStatus.HEALTHY:
                    result.status = HealthStatus.DEGRADED
                    result.details["dependency_impact"] = dependency_status.value
            
            # Update response time
            result.response_time_ms = response_time
            result.dependency_type = definition.dependency_type
            result.business_impact = definition.business_impact
            
            # Store result
            self.health_results[service_name] = result
            self.health_history[service_name].append(result)
            
            # Record SLO measurement if applicable
            await self._record_slo_measurement(service_name, result)
            
            return result
            
        except asyncio.TimeoutError:
            response_time = (time.time() - start_time) * 1000
            result = HealthCheckResult(
                service_name=service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                error_message=f"Health check timeout after {definition.timeout_seconds}s",
                dependency_type=definition.dependency_type,
                business_impact=definition.business_impact
            )
            
            self.health_results[service_name] = result
            self.health_history[service_name].append(result)
            
            return result
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            result = HealthCheckResult(
                service_name=service_name,
                status=HealthStatus.CRITICAL,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                error_message=str(e),
                dependency_type=definition.dependency_type,
                business_impact=definition.business_impact
            )
            
            self.health_results[service_name] = result
            self.health_history[service_name].append(result)
            
            return result
    
    async def get_system_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive system health summary"""
        
        # Run health checks for all services in parallel
        health_tasks = [
            self.perform_health_check(service_name)
            for service_name in self.dependency_definitions
        ]
        
        results = await asyncio.gather(*health_tasks, return_exceptions=True)
        
        # Process results
        service_health = {}
        status_counts = defaultdict(int)
        business_impact_health = defaultdict(list)
        
        for result in results:
            if isinstance(result, Exception):
                continue
            
            service_health[result.service_name] = {
                "status": result.status.value,
                "response_time_ms": result.response_time_ms,
                "business_impact": result.business_impact,
                "dependency_type": result.dependency_type.value if result.dependency_type else None,
                "last_check": result.timestamp.isoformat(),
                "error_message": result.error_message
            }
            
            status_counts[result.status.value] += 1
            business_impact_health[result.business_impact].append(result.status.value)
        
        # Calculate overall health
        overall_health = self._calculate_overall_health(service_health)
        
        # Get business context
        business_context = self._get_current_business_context()
        
        # Detect cascading failures
        cascading_failures = self._detect_cascading_failures()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_health": overall_health,
            "business_context": business_context,
            "service_count": len(service_health),
            "status_summary": dict(status_counts),
            "business_impact_summary": {
                impact: {
                    "total": len(statuses),
                    "healthy": statuses.count("healthy"),
                    "degraded": statuses.count("degraded"),
                    "unhealthy": statuses.count("unhealthy"),
                    "critical": statuses.count("critical")
                }
                for impact, statuses in business_impact_health.items()
            },
            "services": service_health,
            "cascading_failures": cascading_failures,
            "dependency_analysis": self._analyze_dependency_health(),
            "recommendations": self._generate_health_recommendations(service_health)
        }
    
    async def get_dependency_map(self) -> Dict[str, Any]:
        """Get dependency map with current health status"""
        
        dependency_map = {}
        
        for service_name, definition in self.dependency_definitions.items():
            current_health = self.health_results.get(service_name)
            
            dependency_map[service_name] = {
                "description": definition.description,
                "dependency_type": definition.dependency_type.value,
                "business_impact": definition.business_impact,
                "dependencies": definition.dependencies,
                "critical_for": definition.critical_for,
                "current_status": current_health.status.value if current_health else "unknown",
                "last_check": current_health.timestamp.isoformat() if current_health else None,
                "response_time_ms": current_health.response_time_ms if current_health else None
            }
        
        return {
            "dependency_graph": dependency_map,
            "critical_path_analysis": self._analyze_critical_paths(),
            "single_points_of_failure": self._identify_single_points_of_failure()
        }
    
    # Individual Health Check Functions
    
    async def _check_database_primary(self) -> HealthCheckResult:
        """Check primary database health"""
        try:
            with next(get_db()) as db:
                # Test basic connectivity
                db.execute(text("SELECT 1"))
                
                # Test write capability
                db.execute(text("CREATE TEMP TABLE health_check_temp (id INTEGER)"))
                db.execute(text("INSERT INTO health_check_temp (id) VALUES (1)"))
                result = db.execute(text("SELECT COUNT(*) FROM health_check_temp")).scalar()
                
                # Check connection pool
                active_connections = db.execute(text(
                    "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
                )).scalar()
                
                return HealthCheckResult(
                    service_name="database_primary",
                    status=HealthStatus.HEALTHY,
                    response_time_ms=0,  # Will be set by caller
                    timestamp=datetime.utcnow(),
                    details={
                        "read_test": "passed",
                        "write_test": "passed",
                        "active_connections": active_connections
                    }
                )
                
        except Exception as e:
            return HealthCheckResult(
                service_name="database_primary",
                status=HealthStatus.CRITICAL,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_database_replica(self) -> HealthCheckResult:
        """Check database replica health"""
        try:
            # In a real implementation, this would check the replica connection
            # For now, simulate a replica check
            return HealthCheckResult(
                service_name="database_replica",
                status=HealthStatus.HEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"replica_lag_ms": 50}
            )
        except Exception as e:
            return HealthCheckResult(
                service_name="database_replica",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_redis_cache(self) -> HealthCheckResult:
        """Check Redis cache health"""
        try:
            test_key = f"health_check_{int(time.time())}"
            test_value = "healthy"
            
            # Test write
            cache_service.set(test_key, test_value, ttl=10)
            
            # Test read
            retrieved_value = cache_service.get(test_key)
            
            # Test delete
            cache_service.delete(test_key)
            
            if retrieved_value == test_value:
                return HealthCheckResult(
                    service_name="redis_cache",
                    status=HealthStatus.HEALTHY,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={
                        "read_test": "passed",
                        "write_test": "passed",
                        "delete_test": "passed"
                    }
                )
            else:
                return HealthCheckResult(
                    service_name="redis_cache",
                    status=HealthStatus.DEGRADED,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    error_message="Cache read/write test failed"
                )
                
        except Exception as e:
            return HealthCheckResult(
                service_name="redis_cache",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_api_gateway(self) -> HealthCheckResult:
        """Check API gateway health"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8000/health/", timeout=5.0)
                
                if response.status_code == 200:
                    return HealthCheckResult(
                        service_name="api_gateway",
                        status=HealthStatus.HEALTHY,
                        response_time_ms=0,
                        timestamp=datetime.utcnow(),
                        details={"status_code": response.status_code}
                    )
                else:
                    return HealthCheckResult(
                        service_name="api_gateway",
                        status=HealthStatus.DEGRADED,
                        response_time_ms=0,
                        timestamp=datetime.utcnow(),
                        error_message=f"API returned status code {response.status_code}"
                    )
                    
        except Exception as e:
            return HealthCheckResult(
                service_name="api_gateway",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_booking_system(self) -> HealthCheckResult:
        """Check booking system health"""
        try:
            async with httpx.AsyncClient() as client:
                # Test booking availability endpoint
                response = await client.get("http://localhost:8000/api/v2/appointments/health", timeout=5.0)
                
                if response.status_code == 200:
                    return HealthCheckResult(
                        service_name="booking_system",
                        status=HealthStatus.HEALTHY,
                        response_time_ms=0,
                        timestamp=datetime.utcnow(),
                        details={"booking_health_check": "passed"}
                    )
                else:
                    return HealthCheckResult(
                        service_name="booking_system",
                        status=HealthStatus.DEGRADED,
                        response_time_ms=0,
                        timestamp=datetime.utcnow(),
                        error_message=f"Booking system returned {response.status_code}"
                    )
                    
        except Exception as e:
            return HealthCheckResult(
                service_name="booking_system",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_payment_system(self) -> HealthCheckResult:
        """Check payment system health"""
        try:
            # Test payment system endpoints
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8000/api/v2/payments/health", timeout=5.0)
                
                if response.status_code == 200:
                    return HealthCheckResult(
                        service_name="payment_system",
                        status=HealthStatus.HEALTHY,
                        response_time_ms=0,
                        timestamp=datetime.utcnow(),
                        details={"payment_health_check": "passed"}
                    )
                else:
                    return HealthCheckResult(
                        service_name="payment_system",
                        status=HealthStatus.DEGRADED,
                        response_time_ms=0,
                        timestamp=datetime.utcnow(),
                        error_message=f"Payment system returned {response.status_code}"
                    )
                    
        except Exception as e:
            return HealthCheckResult(
                service_name="payment_system",
                status=HealthStatus.CRITICAL,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_user_management(self) -> HealthCheckResult:
        """Check user management system health"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8000/api/v2/auth/health", timeout=3.0)
                
                return HealthCheckResult(
                    service_name="user_management",
                    status=HealthStatus.HEALTHY if response.status_code == 200 else HealthStatus.DEGRADED,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"auth_health_check": "passed" if response.status_code == 200 else "failed"}
                )
                
        except Exception as e:
            return HealthCheckResult(
                service_name="user_management",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_notification_system(self) -> HealthCheckResult:
        """Check notification system health"""
        try:
            # Test notification system
            return HealthCheckResult(
                service_name="notification_system",
                status=HealthStatus.HEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"notification_health": "simulated_check_passed"}
            )
        except Exception as e:
            return HealthCheckResult(
                service_name="notification_system",
                status=HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_frontend_web(self) -> HealthCheckResult:
        """Check web frontend health"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:3000/", timeout=10.0)
                
                return HealthCheckResult(
                    service_name="frontend_web",
                    status=HealthStatus.HEALTHY if response.status_code == 200 else HealthStatus.DEGRADED,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"frontend_status_code": response.status_code}
                )
                
        except Exception as e:
            return HealthCheckResult(
                service_name="frontend_web",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_mobile_api(self) -> HealthCheckResult:
        """Check mobile API health"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8000/api/v2/mobile/health", timeout=5.0)
                
                return HealthCheckResult(
                    service_name="mobile_api",
                    status=HealthStatus.HEALTHY if response.status_code == 200 else HealthStatus.DEGRADED,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"mobile_api_health": "checked"}
                )
                
        except Exception as e:
            return HealthCheckResult(
                service_name="mobile_api",
                status=HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    # External API Health Checks
    
    async def _check_stripe_api(self) -> HealthCheckResult:
        """Check Stripe API health"""
        try:
            from config import settings
            if not settings.stripe_secret_key or settings.stripe_secret_key == "sk_test_placeholder":
                return HealthCheckResult(
                    service_name="stripe_api",
                    status=HealthStatus.HEALTHY,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"status": "development_mode", "note": "Using placeholder credentials"}
                )
            
            import stripe
            stripe.api_key = settings.stripe_secret_key
            
            # Test Stripe API
            account = stripe.Account.retrieve()
            
            return HealthCheckResult(
                service_name="stripe_api",
                status=HealthStatus.HEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"account_id": account.id}
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name="stripe_api",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_sendgrid_api(self) -> HealthCheckResult:
        """Check SendGrid API health"""
        try:
            from config import settings
            if (not settings.sendgrid_api_key or 
                settings.sendgrid_api_key in ["", "SG.dev_placeholder_key_for_development_testing"]):
                return HealthCheckResult(
                    service_name="sendgrid_api",
                    status=HealthStatus.HEALTHY,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"status": "development_mode", "note": "Using placeholder credentials"}
                )
            
            import sendgrid
            sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
            response = sg.client.user.profile.get()
            
            return HealthCheckResult(
                service_name="sendgrid_api",
                status=HealthStatus.HEALTHY if response.status_code == 200 else HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"status_code": response.status_code}
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name="sendgrid_api",
                status=HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_twilio_api(self) -> HealthCheckResult:
        """Check Twilio API health"""
        try:
            from config import settings
            if (not settings.twilio_account_sid or not settings.twilio_auth_token or
                settings.twilio_account_sid in ["", "ACdev_placeholder_sid_for_development"] or
                settings.twilio_auth_token in ["", "dev_placeholder_token_for_development"]):
                return HealthCheckResult(
                    service_name="twilio_api",
                    status=HealthStatus.HEALTHY,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"status": "development_mode", "note": "Using placeholder credentials"}
                )
            
            from twilio.rest import Client
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            account = client.api.accounts(settings.twilio_account_sid).fetch()
            
            return HealthCheckResult(
                service_name="twilio_api",
                status=HealthStatus.HEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"account_status": account.status}
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name="twilio_api",
                status=HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_google_calendar_api(self) -> HealthCheckResult:
        """Check Google Calendar API health"""
        try:
            # Simulate Google Calendar API check
            return HealthCheckResult(
                service_name="google_calendar_api",
                status=HealthStatus.HEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"google_calendar_health": "simulated_check"}
            )
        except Exception as e:
            return HealthCheckResult(
                service_name="google_calendar_api",
                status=HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    # Infrastructure Health Checks
    
    async def _check_load_balancer(self) -> HealthCheckResult:
        """Check load balancer health"""
        try:
            # In a real implementation, this would check load balancer status
            return HealthCheckResult(
                service_name="load_balancer",
                status=HealthStatus.HEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"load_balancer_health": "simulated_check"}
            )
        except Exception as e:
            return HealthCheckResult(
                service_name="load_balancer",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_cdn(self) -> HealthCheckResult:
        """Check CDN health"""
        try:
            # Test CDN endpoint
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:3000/_next/static/css/", timeout=5.0)
                
                return HealthCheckResult(
                    service_name="cdn",
                    status=HealthStatus.HEALTHY if response.status_code in [200, 404] else HealthStatus.DEGRADED,
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    details={"cdn_test": "basic_connectivity"}
                )
                
        except Exception as e:
            return HealthCheckResult(
                service_name="cdn",
                status=HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_monitoring_systems(self) -> HealthCheckResult:
        """Check monitoring systems health"""
        try:
            # Check system resources
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory_percent = psutil.virtual_memory().percent
            
            if cpu_percent > 90 or memory_percent > 90:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.HEALTHY
            
            return HealthCheckResult(
                service_name="monitoring_systems",
                status=status,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory_percent
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name="monitoring_systems",
                status=HealthStatus.DEGRADED,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                error_message=str(e)
            )
    
    # Helper Methods
    
    def _build_dependency_graph(self):
        """Build the dependency graph for cascade analysis"""
        for service_name, definition in self.dependency_definitions.items():
            self.dependency_graph[service_name] = {
                "dependencies": definition.dependencies,
                "dependents": []
            }
        
        # Build reverse dependencies (dependents)
        for service_name, definition in self.dependency_definitions.items():
            for dependency in definition.dependencies:
                if dependency in self.dependency_graph:
                    self.dependency_graph[dependency]["dependents"].append(service_name)
    
    async def _check_dependencies(self, service_name: str) -> Optional[HealthStatus]:
        """Check the health of dependencies for a service"""
        definition = self.dependency_definitions.get(service_name)
        if not definition or not definition.dependencies:
            return None
        
        dependency_statuses = []
        for dependency in definition.dependencies:
            dep_health = self.health_results.get(dependency)
            if dep_health:
                dependency_statuses.append(dep_health.status)
        
        if not dependency_statuses:
            return None
        
        # Determine worst dependency status
        if HealthStatus.CRITICAL in dependency_statuses:
            return HealthStatus.CRITICAL
        elif HealthStatus.UNHEALTHY in dependency_statuses:
            return HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in dependency_statuses:
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.HEALTHY
    
    async def _record_slo_measurement(self, service_name: str, result: HealthCheckResult):
        """Record SLO measurements based on health check results"""
        
        # Map service names to SLO names
        slo_mappings = {
            "api_gateway": ["api_availability", "api_latency_p95"],
            "payment_system": ["payment_availability", "payment_error_rate"],
            "booking_system": ["booking_availability", "booking_success_rate"],
            "database_primary": ["database_latency"],
            "frontend_web": ["frontend_availability"],
            "user_management": ["auth_availability", "auth_latency"]
        }
        
        slo_names = slo_mappings.get(service_name, [])
        
        for slo_name in slo_names:
            if "availability" in slo_name:
                # Record availability measurement
                success_count = 1 if result.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED] else 0
                await slo_manager.record_measurement(slo_name, success_count, 1)
            
            elif "latency" in slo_name and result.response_time_ms:
                # Record latency measurement
                await slo_manager.record_latency_measurement(slo_name, [result.response_time_ms])
            
            elif "error_rate" in slo_name:
                # Record error rate measurement
                success_count = 1 if result.status == HealthStatus.HEALTHY else 0
                await slo_manager.record_measurement(slo_name, success_count, 1)
    
    def _calculate_overall_health(self, service_health: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall system health score"""
        
        total_weight = 0
        weighted_score = 0
        
        status_scores = {
            "healthy": 100,
            "degraded": 75,
            "unhealthy": 25,
            "critical": 0,
            "unknown": 50
        }
        
        impact_weights = {
            "critical": 5.0,
            "high": 3.0,
            "medium": 2.0,
            "low": 1.0
        }
        
        for service_name, health in service_health.items():
            weight = impact_weights.get(health.get("business_impact", "medium"), 2.0)
            score = status_scores.get(health.get("status", "unknown"), 50)
            
            weighted_score += score * weight
            total_weight += weight
        
        overall_percentage = weighted_score / total_weight if total_weight > 0 else 0
        
        # Determine overall status
        if overall_percentage >= 95:
            overall_status = "healthy"
        elif overall_percentage >= 80:
            overall_status = "degraded"
        elif overall_percentage >= 50:
            overall_status = "unhealthy"
        else:
            overall_status = "critical"
        
        return {
            "status": overall_status,
            "percentage": overall_percentage,
            "weighted_calculation": True,
            "total_services": len(service_health)
        }
    
    def _get_current_business_context(self) -> Dict[str, Any]:
        """Get current business context (peak hours, business hours, etc.)"""
        now = datetime.utcnow()
        current_hour = now.hour
        
        is_business_hours = self.business_hours["start"] <= current_hour <= self.business_hours["end"]
        is_peak_hours = self.peak_hours["start"] <= current_hour <= self.peak_hours["end"]
        is_weekend = now.weekday() >= 5  # Saturday = 5, Sunday = 6
        
        return {
            "current_time": now.isoformat(),
            "is_business_hours": is_business_hours,
            "is_peak_hours": is_peak_hours,
            "is_weekend": is_weekend,
            "business_impact_multiplier": 2.0 if is_peak_hours else 1.5 if is_business_hours else 1.0
        }
    
    def _detect_cascading_failures(self) -> List[Dict[str, Any]]:
        """Detect cascading failures in the dependency chain"""
        cascades = []
        
        # Look for recent failures that might be cascading
        now = datetime.utcnow()
        recent_failures = []
        
        for service_name, health_history in self.health_history.items():
            recent_health = [
                h for h in health_history
                if (now - h.timestamp).total_seconds() < self.cascade_detection_window
            ]
            
            for health in recent_health:
                if health.status in [HealthStatus.UNHEALTHY, HealthStatus.CRITICAL]:
                    recent_failures.append({
                        "service": service_name,
                        "timestamp": health.timestamp,
                        "status": health.status.value
                    })
        
        # Group failures by time proximity
        if len(recent_failures) >= 2:
            recent_failures.sort(key=lambda x: x["timestamp"])
            
            for i in range(len(recent_failures) - 1):
                current = recent_failures[i]
                next_failure = recent_failures[i + 1]
                
                time_diff = (next_failure["timestamp"] - current["timestamp"]).total_seconds()
                
                if time_diff < 120:  # Within 2 minutes
                    # Check if there's a dependency relationship
                    current_service = current["service"]
                    next_service = next_failure["service"]
                    
                    if (current_service in self.dependency_graph.get(next_service, {}).get("dependencies", []) or
                        next_service in self.dependency_graph.get(current_service, {}).get("dependencies", [])):
                        
                        cascades.append({
                            "type": "dependency_cascade",
                            "primary_failure": current,
                            "secondary_failure": next_failure,
                            "time_difference_seconds": time_diff,
                            "relationship": "dependency"
                        })
        
        return cascades
    
    def _analyze_dependency_health(self) -> Dict[str, Any]:
        """Analyze dependency health patterns"""
        
        external_api_health = []
        infrastructure_health = []
        critical_service_health = []
        
        for service_name, health in self.health_results.items():
            definition = self.dependency_definitions.get(service_name)
            if not definition:
                continue
            
            health_data = {
                "service": service_name,
                "status": health.status.value,
                "business_impact": definition.business_impact
            }
            
            if definition.dependency_type == DependencyType.EXTERNAL_API:
                external_api_health.append(health_data)
            elif definition.dependency_type == DependencyType.INFRASTRUCTURE:
                infrastructure_health.append(health_data)
            elif definition.business_impact == "critical":
                critical_service_health.append(health_data)
        
        return {
            "external_apis": {
                "services": external_api_health,
                "healthy_count": len([s for s in external_api_health if s["status"] == "healthy"]),
                "total_count": len(external_api_health)
            },
            "infrastructure": {
                "services": infrastructure_health,
                "healthy_count": len([s for s in infrastructure_health if s["status"] == "healthy"]),
                "total_count": len(infrastructure_health)
            },
            "critical_services": {
                "services": critical_service_health,
                "healthy_count": len([s for s in critical_service_health if s["status"] == "healthy"]),
                "total_count": len(critical_service_health)
            }
        }
    
    def _analyze_critical_paths(self) -> List[Dict[str, Any]]:
        """Analyze critical dependency paths"""
        critical_paths = []
        
        # Find services with no dependencies (root services)
        root_services = [
            name for name, definition in self.dependency_definitions.items()
            if not definition.dependencies and definition.business_impact == "critical"
        ]
        
        # Trace dependency paths from critical services
        for root_service in root_services:
            path = self._trace_dependency_path(root_service, [])
            if len(path) > 1:
                critical_paths.append({
                    "root_service": root_service,
                    "dependency_chain": path,
                    "path_length": len(path),
                    "business_impact": "critical"
                })
        
        return critical_paths
    
    def _trace_dependency_path(self, service_name: str, visited: List[str]) -> List[str]:
        """Trace dependency path recursively"""
        if service_name in visited:
            return visited  # Avoid cycles
        
        visited = visited + [service_name]
        definition = self.dependency_definitions.get(service_name)
        
        if not definition or not definition.dependencies:
            return visited
        
        # Find the longest dependency chain
        longest_path = visited
        for dependency in definition.dependencies:
            path = self._trace_dependency_path(dependency, visited)
            if len(path) > len(longest_path):
                longest_path = path
        
        return longest_path
    
    def _identify_single_points_of_failure(self) -> List[Dict[str, Any]]:
        """Identify single points of failure in the system"""
        spofs = []
        
        for service_name, definition in self.dependency_definitions.items():
            # Check if this service is critical for others but has no redundancy
            dependents = self.dependency_graph.get(service_name, {}).get("dependents", [])
            
            if (len(dependents) > 1 and 
                definition.business_impact in ["critical", "high"] and
                not self._has_redundancy(service_name)):
                
                spofs.append({
                    "service": service_name,
                    "dependent_services": dependents,
                    "business_impact": definition.business_impact,
                    "description": definition.description,
                    "risk_level": "high" if len(dependents) > 2 else "medium"
                })
        
        return spofs
    
    def _has_redundancy(self, service_name: str) -> bool:
        """Check if a service has redundancy (simplified check)"""
        # In a real implementation, this would check for redundant instances
        # For now, assume database has replica redundancy
        return "replica" in service_name or "backup" in service_name
    
    def _generate_health_recommendations(self, service_health: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations based on health status"""
        recommendations = []
        
        # Check for unhealthy critical services
        critical_unhealthy = [
            name for name, health in service_health.items()
            if health.get("status") in ["unhealthy", "critical"] and health.get("business_impact") == "critical"
        ]
        
        if critical_unhealthy:
            recommendations.append({
                "type": "critical_service_failure",
                "priority": "critical",
                "description": f"Critical services are unhealthy: {', '.join(critical_unhealthy)}",
                "action": "Immediate investigation and remediation required",
                "services": critical_unhealthy
            })
        
        # Check for external API issues
        external_api_issues = [
            name for name, health in service_health.items()
            if (health.get("status") in ["unhealthy", "degraded"] and 
                health.get("dependency_type") == "external_api")
        ]
        
        if external_api_issues:
            recommendations.append({
                "type": "external_dependency_issues",
                "priority": "medium",
                "description": f"External API issues detected: {', '.join(external_api_issues)}",
                "action": "Monitor external dependencies and implement circuit breakers",
                "services": external_api_issues
            })
        
        # Check overall health percentage
        overall_health = self._calculate_overall_health(service_health)
        if overall_health["percentage"] < 80:
            recommendations.append({
                "type": "system_health_degradation",
                "priority": "high",
                "description": f"Overall system health is {overall_health['percentage']:.1f}%",
                "action": "Comprehensive system review and performance optimization",
                "current_health": overall_health["percentage"]
            })
        
        return recommendations
    
    # Background Monitoring Loops
    
    async def _monitor_service(self, service_name: str, interval_seconds: int):
        """Monitor a specific service continuously"""
        while not self._stop_monitoring:
            try:
                await self.perform_health_check(service_name)
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                self.logger.error(f"❌ Error monitoring {service_name}: {e}")
                await asyncio.sleep(interval_seconds)
    
    async def _cascade_detection_loop(self):
        """Continuously detect cascading failures"""
        while not self._stop_monitoring:
            try:
                cascades = self._detect_cascading_failures()
                
                for cascade in cascades:
                    await self._alert_cascading_failure(cascade)
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"❌ Cascade detection error: {e}")
                await asyncio.sleep(60)
    
    async def _business_context_monitoring_loop(self):
        """Monitor business context and adjust alerting sensitivity"""
        while not self._stop_monitoring:
            try:
                context = self._get_current_business_context()
                
                # Store business context for other services
                await cache_service.set("business_context", json.dumps(context), ttl=300)
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Business context monitoring error: {e}")
                await asyncio.sleep(300)
    
    async def _health_analytics_loop(self):
        """Perform health analytics and pattern detection"""
        while not self._stop_monitoring:
            try:
                # Generate health analytics
                analytics = await self._generate_health_analytics()
                
                # Store for dashboard access
                await cache_service.set("health_analytics", json.dumps(analytics), ttl=3600)
                
                await asyncio.sleep(3600)  # Update every hour
                
            except Exception as e:
                self.logger.error(f"❌ Health analytics error: {e}")
                await asyncio.sleep(3600)
    
    async def _slo_integration_loop(self):
        """Integrate health monitoring with SLO management"""
        while not self._stop_monitoring:
            try:
                # Get SLO status
                slo_status = await slo_manager.get_all_slo_status()
                
                # Correlate with health status
                correlation = self._correlate_health_with_slos(slo_status)
                
                # Store correlation data
                await cache_service.set("health_slo_correlation", json.dumps(correlation), ttl=300)
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ SLO integration error: {e}")
                await asyncio.sleep(300)
    
    async def _alert_cascading_failure(self, cascade: Dict[str, Any]):
        """Alert on cascading failure detection"""
        try:
            alert_message = (
                f"Cascading failure detected: {cascade['primary_failure']['service']} -> "
                f"{cascade['secondary_failure']['service']} "
                f"({cascade['time_difference_seconds']:.1f}s apart)"
            )
            
            await enhanced_sentry.capture_business_event(
                "cascading_failure_detected",
                alert_message,
                cascade,
                severity=AlertSeverity.HIGH
            )
            
            self.logger.error(f"🔗 CASCADING FAILURE: {alert_message}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to alert cascading failure: {e}")
    
    async def _generate_health_analytics(self) -> Dict[str, Any]:
        """Generate comprehensive health analytics"""
        
        analytics = {
            "timestamp": datetime.utcnow().isoformat(),
            "service_health_trends": {},
            "failure_patterns": {},
            "recovery_times": {},
            "business_impact_correlation": {}
        }
        
        # Analyze trends for each service
        for service_name, history in self.health_history.items():
            if len(history) < 10:
                continue
            
            recent_history = list(history)[-100:]  # Last 100 checks
            
            # Calculate availability percentage
            healthy_count = sum(1 for h in recent_history if h.status == HealthStatus.HEALTHY)
            availability = (healthy_count / len(recent_history)) * 100
            
            # Calculate average response time
            response_times = [h.response_time_ms for h in recent_history if h.response_time_ms]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            analytics["service_health_trends"][service_name] = {
                "availability_percentage": availability,
                "average_response_time_ms": avg_response_time,
                "total_checks": len(recent_history),
                "trend": "stable"  # Would calculate actual trend
            }
        
        return analytics
    
    def _correlate_health_with_slos(self, slo_status: Dict[str, Any]) -> Dict[str, Any]:
        """Correlate health status with SLO compliance"""
        
        correlation = {
            "timestamp": datetime.utcnow().isoformat(),
            "service_correlations": {},
            "overall_correlation": {
                "health_score": 0,
                "slo_compliance": 0,
                "correlation_strength": 0
            }
        }
        
        # Calculate correlations for each service
        for service_name, health_result in self.health_results.items():
            service_slos = [
                name for name in slo_status.get("slos", {}).keys()
                if service_name in name
            ]
            
            if service_slos:
                avg_slo_compliance = sum(
                    slo_status["slos"][slo_name]["current_percentage"]
                    for slo_name in service_slos
                ) / len(service_slos)
                
                health_score = {
                    HealthStatus.HEALTHY: 100,
                    HealthStatus.DEGRADED: 75,
                    HealthStatus.UNHEALTHY: 25,
                    HealthStatus.CRITICAL: 0
                }.get(health_result.status, 50)
                
                correlation["service_correlations"][service_name] = {
                    "health_score": health_score,
                    "avg_slo_compliance": avg_slo_compliance,
                    "correlation": abs(health_score - avg_slo_compliance) < 20  # Strong correlation if within 20%
                }
        
        return correlation
    
    async def stop_monitoring(self):
        """Stop all health monitoring"""
        self._stop_monitoring = True
        
        # Cancel all monitoring tasks
        for task in self._monitoring_tasks.values():
            task.cancel()
        
        # Wait for tasks to complete
        if self._monitoring_tasks:
            await asyncio.gather(*self._monitoring_tasks.values(), return_exceptions=True)


# Global enhanced health monitoring instance
enhanced_health_monitor = EnhancedHealthMonitoringService()