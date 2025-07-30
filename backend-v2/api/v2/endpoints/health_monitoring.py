"""
Health Monitoring and Diagnostics Endpoints
Comprehensive system health checks, diagnostics, and monitoring endpoints
for production error monitoring and system observability
"""

import asyncio
import time
import psutil
import redis
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import httpx
import logging

from db import get_db
from services.error_monitoring_service import error_monitoring_service
from services.enhanced_sentry_monitoring import enhanced_sentry
from middleware.security import require_admin
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health Monitoring"])


@dataclass
class SystemHealth:
    """System health status"""
    status: str  # healthy, degraded, unhealthy
    timestamp: str
    version: str
    environment: str
    uptime_seconds: float
    checks: Dict[str, Any]
    metrics: Dict[str, Any]
    alerts: List[Dict[str, Any]]


@dataclass
class ComponentHealth:
    """Individual component health"""
    name: str
    status: str  # healthy, degraded, unhealthy, unknown
    response_time_ms: float
    last_check: str
    details: Dict[str, Any]
    dependencies: List[str] = None


class HealthMonitor:
    """System health monitoring"""
    
    def __init__(self):
        self.start_time = time.time()
        self.last_health_check = {}
        self.health_history = []
        self.component_statuses = {}
        
    async def check_database_health(self, db: Session) -> ComponentHealth:
        """Check database connectivity and performance"""
        start_time = time.time()
        
        try:
            # Test basic connectivity
            result = db.execute(text("SELECT 1")).fetchone()
            
            if not result:
                raise Exception("Database query returned no results")
            
            # Test write capability
            db.execute(text("CREATE TEMP TABLE health_check (id INT)"))
            db.execute(text("INSERT INTO health_check VALUES (1)"))
            db.execute(text("DROP TABLE health_check"))
            db.commit()
            
            response_time = (time.time() - start_time) * 1000
            
            # Check connection pool status
            pool_status = self._get_db_pool_status(db)
            
            return ComponentHealth(
                name="database",
                status="healthy" if response_time < 100 else "degraded",
                response_time_ms=response_time,
                last_check=datetime.utcnow().isoformat(),
                details={
                    "connection_pool": pool_status,
                    "query_response_time_ms": response_time,
                    "can_read": True,
                    "can_write": True
                },
                dependencies=["postgresql"]
            )
            
        except Exception as e:
            return ComponentHealth(
                name="database",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow().isoformat(),
                details={
                    "error": str(e),
                    "can_read": False,
                    "can_write": False
                },
                dependencies=["postgresql"]
            )
    
    async def check_redis_health(self) -> ComponentHealth:
        """Check Redis connectivity and performance"""
        start_time = time.time()
        
        try:
            if not hasattr(settings, 'REDIS_URL') or not settings.REDIS_URL:
                return ComponentHealth(
                    name="redis",
                    status="unknown",
                    response_time_ms=0,
                    last_check=datetime.utcnow().isoformat(),
                    details={"message": "Redis not configured"},
                    dependencies=[]
                )
            
            # Connect to Redis
            redis_client = redis.from_url(settings.REDIS_URL)
            
            # Test connectivity
            ping_result = redis_client.ping()
            
            # Test read/write
            test_key = f"health_check_{int(time.time())}"
            redis_client.set(test_key, "test_value", ex=60)
            test_value = redis_client.get(test_key)
            redis_client.delete(test_key)
            
            response_time = (time.time() - start_time) * 1000
            
            # Get Redis info
            info = redis_client.info()
            
            return ComponentHealth(
                name="redis",
                status="healthy" if response_time < 50 else "degraded",
                response_time_ms=response_time,
                last_check=datetime.utcnow().isoformat(),
                details={
                    "ping": ping_result,
                    "can_read": test_value is not None,
                    "can_write": True,
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "unknown"),
                    "redis_version": info.get("redis_version", "unknown")
                },
                dependencies=["redis-server"]
            )
            
        except Exception as e:
            return ComponentHealth(
                name="redis",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow().isoformat(),
                details={
                    "error": str(e),
                    "can_read": False,
                    "can_write": False
                },
                dependencies=["redis-server"]
            )
    
    async def check_external_services_health(self) -> List[ComponentHealth]:
        """Check external service dependencies"""
        services = []
        
        # Check Stripe API
        stripe_health = await self._check_stripe_health()
        services.append(stripe_health)
        
        # Check SendGrid API
        sendgrid_health = await self._check_sendgrid_health()
        services.append(sendgrid_health)
        
        # Check Google Calendar API
        google_health = await self._check_google_calendar_health()
        services.append(google_health)
        
        return services
    
    async def _check_stripe_health(self) -> ComponentHealth:
        """Check Stripe API health"""
        start_time = time.time()
        
        try:
            if not hasattr(settings, 'STRIPE_SECRET_KEY') or not settings.STRIPE_SECRET_KEY:
                return ComponentHealth(
                    name="stripe",
                    status="unknown",
                    response_time_ms=0,
                    last_check=datetime.utcnow().isoformat(),
                    details={"message": "Stripe not configured"},
                    dependencies=["stripe.com"]
                )
            
            # Test Stripe API with a simple call
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.stripe.com/v1/account",
                    headers={
                        "Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}",
                        "Stripe-Version": "2020-08-27"
                    },
                    timeout=5.0
                )
                
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    account_data = response.json()
                    return ComponentHealth(
                        name="stripe",
                        status="healthy",
                        response_time_ms=response_time,
                        last_check=datetime.utcnow().isoformat(),
                        details={
                            "account_id": account_data.get("id", "unknown"),
                            "country": account_data.get("country", "unknown"),
                            "business_profile": account_data.get("business_profile", {}).get("name", "unknown"),
                            "charges_enabled": account_data.get("charges_enabled", False),
                            "payouts_enabled": account_data.get("payouts_enabled", False)
                        },
                        dependencies=["stripe.com"]
                    )
                else:
                    return ComponentHealth(
                        name="stripe",
                        status="degraded",
                        response_time_ms=response_time,
                        last_check=datetime.utcnow().isoformat(),
                        details={
                            "error": f"HTTP {response.status_code}",
                            "message": response.text[:200]
                        },
                        dependencies=["stripe.com"]
                    )
                    
        except Exception as e:
            return ComponentHealth(
                name="stripe",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow().isoformat(),
                details={"error": str(e)},
                dependencies=["stripe.com"]
            )
    
    async def _check_sendgrid_health(self) -> ComponentHealth:
        """Check SendGrid API health"""
        start_time = time.time()
        
        try:
            if not hasattr(settings, 'SENDGRID_API_KEY') or not settings.SENDGRID_API_KEY:
                return ComponentHealth(
                    name="sendgrid",
                    status="unknown",
                    response_time_ms=0,
                    last_check=datetime.utcnow().isoformat(),
                    details={"message": "SendGrid not configured"},
                    dependencies=["api.sendgrid.com"]
                )
            
            # Test SendGrid API
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.sendgrid.com/v3/user/account",
                    headers={
                        "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                    },
                    timeout=5.0
                )
                
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    account_data = response.json()
                    return ComponentHealth(
                        name="sendgrid",
                        status="healthy",
                        response_time_ms=response_time,
                        last_check=datetime.utcnow().isoformat(),
                        details={
                            "account_type": account_data.get("type", "unknown"),
                            "reputation": account_data.get("reputation", 0)
                        },
                        dependencies=["api.sendgrid.com"]
                    )
                else:
                    return ComponentHealth(
                        name="sendgrid",
                        status="degraded",
                        response_time_ms=response_time,
                        last_check=datetime.utcnow().isoformat(),
                        details={
                            "error": f"HTTP {response.status_code}",
                            "message": response.text[:200]
                        },
                        dependencies=["api.sendgrid.com"]
                    )
                    
        except Exception as e:
            return ComponentHealth(
                name="sendgrid",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow().isoformat(),
                details={"error": str(e)},
                dependencies=["api.sendgrid.com"]
            )
    
    async def _check_google_calendar_health(self) -> ComponentHealth:
        """Check Google Calendar API health"""
        start_time = time.time()
        
        try:
            # Simple check - just verify we can reach Google's API
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
                    timeout=5.0
                )
                
                response_time = (time.time() - start_time) * 1000
                
                # We expect 401 without proper auth, which means the API is reachable
                if response.status_code in [200, 401]:
                    return ComponentHealth(
                        name="google_calendar",
                        status="healthy",
                        response_time_ms=response_time,
                        last_check=datetime.utcnow().isoformat(),
                        details={
                            "api_reachable": True,
                            "status_code": response.status_code
                        },
                        dependencies=["googleapis.com"]
                    )
                else:
                    return ComponentHealth(
                        name="google_calendar",
                        status="degraded",
                        response_time_ms=response_time,
                        last_check=datetime.utcnow().isoformat(),
                        details={
                            "error": f"Unexpected HTTP {response.status_code}",
                            "message": response.text[:200]
                        },
                        dependencies=["googleapis.com"]
                    )
                    
        except Exception as e:
            return ComponentHealth(
                name="google_calendar",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow().isoformat(),
                details={"error": str(e)},
                dependencies=["googleapis.com"]
            )
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            
            # Network metrics (if available)
            try:
                network = psutil.net_io_counters()
                network_stats = {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv
                }
            except:
                network_stats = {"error": "Network stats not available"}
            
            return {
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count,
                    "load_average": list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else None
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used,
                    "free": memory.free
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": disk.percent
                },
                "network": network_stats,
                "uptime_seconds": time.time() - self.start_time
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {"error": str(e)}
    
    def _get_db_pool_status(self, db: Session) -> Dict[str, Any]:
        """Get database connection pool status"""
        try:
            # This would need to be adapted based on the actual connection pool implementation
            return {
                "status": "unknown",
                "message": "Pool status not implemented"
            }
        except Exception as e:
            return {"error": str(e)}


# Global health monitor instance
health_monitor = HealthMonitor()


@router.get("/", response_model=None)
async def basic_health_check():
    """Basic health check endpoint - always returns quickly"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "BookedBarber V2",
            "version": getattr(settings, 'VERSION', '1.0.0')
        }
    )


@router.get("/detailed", response_model=None)
async def detailed_health_check(
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Detailed health check with all system components"""
    
    start_time = time.time()
    
    try:
        # Run health checks in parallel
        db_check_task = health_monitor.check_database_health(db)
        redis_check_task = health_monitor.check_redis_health()
        external_services_task = health_monitor.check_external_services_health()
        
        # Wait for all checks to complete
        db_health, redis_health, external_services = await asyncio.gather(
            db_check_task,
            redis_check_task,
            external_services_task,
            return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(db_health, Exception):
            db_health = ComponentHealth(
                name="database",
                status="unhealthy",
                response_time_ms=0,
                last_check=datetime.utcnow().isoformat(),
                details={"error": str(db_health)}
            )
        
        if isinstance(redis_health, Exception):
            redis_health = ComponentHealth(
                name="redis",
                status="unhealthy",
                response_time_ms=0,
                last_check=datetime.utcnow().isoformat(),
                details={"error": str(redis_health)}
            )
        
        if isinstance(external_services, Exception):
            external_services = []
        
        # Collect all component statuses
        components = [db_health, redis_health] + external_services
        
        # Determine overall system health
        unhealthy_components = [c for c in components if c.status == "unhealthy"]
        degraded_components = [c for c in components if c.status == "degraded"]
        
        if unhealthy_components:
            overall_status = "unhealthy"
            status_code = 503  # Service Unavailable
        elif degraded_components:
            overall_status = "degraded"
            status_code = 200  # OK but with warnings
        else:
            overall_status = "healthy"
            status_code = 200
        
        # Get system metrics
        system_metrics = health_monitor.get_system_metrics()
        
        # Get error monitoring summary
        error_summary = await error_monitoring_service.get_business_impact_summary()
        
        # Create response
        health_response = SystemHealth(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            version=getattr(settings, 'VERSION', '1.0.0'),
            environment=getattr(settings, 'ENVIRONMENT', 'development'),
            uptime_seconds=time.time() - health_monitor.start_time,
            checks={c.name: asdict(c) for c in components},
            metrics={
                "system": system_metrics,
                "health_check_duration_ms": (time.time() - start_time) * 1000,
                "error_monitoring": error_summary
            },
            alerts=[]  # Would be populated with active alerts
        )
        
        # Log health check if there are issues
        if overall_status != "healthy":
            logger.warning(f"System health check: {overall_status}")
            if background_tasks:
                background_tasks.add_task(
                    enhanced_sentry.capture_business_event,
                    "system_health_degraded",
                    f"System health is {overall_status}",
                    {"components": [c.name for c in unhealthy_components + degraded_components]}
                )
        
        return JSONResponse(
            status_code=status_code,
            content=asdict(health_response)
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        
        # Report to error monitoring
        if background_tasks:
            background_tasks.add_task(
                enhanced_sentry.capture_business_error,
                e,
                {"endpoint": "/health/detailed"},
                severity=enhanced_sentry.AlertSeverity.HIGH
            )
        
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e),
                "health_check_duration_ms": (time.time() - start_time) * 1000
            }
        )


@router.get("/metrics", response_model=None)
async def get_system_metrics():
    """Get detailed system performance metrics"""
    
    metrics = health_monitor.get_system_metrics()
    
    # Add error monitoring metrics
    error_summary = await error_monitoring_service.get_business_impact_summary()
    
    # Add custom application metrics
    metrics["application"] = {
        "error_monitoring": error_summary,
        "uptime_seconds": time.time() - health_monitor.start_time,
        "environment": getattr(settings, 'ENVIRONMENT', 'development'),
        "version": getattr(settings, 'VERSION', '1.0.0')
    }
    
    return JSONResponse(content=metrics)


@router.get("/dependencies", response_model=None)
async def check_dependencies():
    """Check all external dependencies"""
    
    external_services = await health_monitor.check_external_services_health()
    
    return JSONResponse(
        content={
            "timestamp": datetime.utcnow().isoformat(),
            "dependencies": {service.name: asdict(service) for service in external_services}
        }
    )


@router.get("/error-patterns", response_model=None)
async def get_error_patterns(admin_user = Depends(require_admin)):
    """Get error patterns and analytics (admin only)"""
    
    dashboard_data = await error_monitoring_service.get_dashboard_data()
    
    return JSONResponse(content=dashboard_data)


@router.post("/error-test", response_model=None)
async def test_error_monitoring(admin_user = Depends(require_admin)):
    """Test error monitoring system (admin only)"""
    
    try:
        # Trigger a test error
        test_error = Exception("Test error for monitoring system validation")
        
        # Capture with business context
        event_id = await enhanced_sentry.capture_business_error(
            test_error,
            context={"test": True, "endpoint": "/health/error-test"},
            business_context={
                "workflow": "testing",
                "feature": "error_monitoring"
            },
            severity=enhanced_sentry.AlertSeverity.LOW
        )
        
        return JSONResponse(
            content={
                "message": "Test error captured successfully",
                "event_id": event_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test error monitoring: {str(e)}")


@router.get("/alerts", response_model=None)
async def get_active_alerts(admin_user = Depends(require_admin)):
    """Get active system alerts (admin only)"""
    
    # This would return active alerts from the monitoring system
    # For now, return a placeholder
    
    return JSONResponse(
        content={
            "timestamp": datetime.utcnow().isoformat(),
            "active_alerts": [],
            "alert_history": [],
            "alert_rules": [asdict(rule) for rule in enhanced_sentry.alert_rules]
        }
    )


# Add router to main application
# This would be done in main.py with: app.include_router(health_monitoring.router, prefix="/api/v2")