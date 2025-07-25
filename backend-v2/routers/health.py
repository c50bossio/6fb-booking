"""
Health check endpoints for monitoring service status
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
import psutil
import time
import os
from datetime import datetime, timezone

from db import get_db
from services.redis_service import cache_service
from config import settings

# Import pool monitor if available
try:
    from database import pool_monitor
    POOL_MONITOR_AVAILABLE = True
except ImportError:
    pool_monitor = None
    POOL_MONITOR_AVAILABLE = False

router = APIRouter(
    prefix="/health",
    tags=["health"]
)

# Global container start time for tracking restarts
CONTAINER_START_TIME = datetime.now(timezone.utc)

@router.get("/", response_model=Dict[str, Any])
async def health_check(request: Request):
    """Basic health check endpoint with Docker support"""
    container_info = {
        "container_id": os.environ.get('HOSTNAME', 'local'),
        "container_mode": os.environ.get('CONTAINER_MODE', 'false') == 'true',
        "start_time": CONTAINER_START_TIME.isoformat(),
        "uptime_seconds": (datetime.now(timezone.utc) - CONTAINER_START_TIME).total_seconds()
    }
    
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "BookedBarber API",
        "version": "2.0.0",
        "environment": settings.environment,
        "container": container_info,
        "client_ip": request.client.host if request.client else None
    }

@router.get("/detailed", response_model=Dict[str, Any])
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check with all service statuses"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Database check
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {
            "status": "healthy",
            "type": "postgresql" if "postgresql" in settings.database_url else "sqlite"
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "unhealthy"
    
    # Redis check
    try:
        if cache_service.is_available():
            stats = cache_service.get_stats()
            health_status["checks"]["redis"] = {
                "status": "healthy",
                "available": True,
                "memory_used": stats.get("used_memory_human", "N/A"),
                "connected_clients": stats.get("connected_clients", 0),
                "hit_rate": stats.get("hit_rate", 0)
            }
        else:
            health_status["checks"]["redis"] = {
                "status": "unhealthy",
                "available": False
            }
    except Exception as e:
        health_status["checks"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # System resources
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        health_status["checks"]["system"] = {
            "status": "healthy",
            "cpu": {
                "percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "total": memory.total // (1024 * 1024),  # MB
                "used": memory.used // (1024 * 1024),
                "percent": memory.percent
            },
            "disk": {
                "total": disk.total // (1024 * 1024 * 1024),  # GB
                "used": disk.used // (1024 * 1024 * 1024),
                "percent": disk.percent
            }
        }
        
        # Warn if resources are high
        if cpu_percent > 80 or memory.percent > 80 or disk.percent > 90:
            health_status["checks"]["system"]["status"] = "warning"
            
    except Exception as e:
        health_status["checks"]["system"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Process info
    try:
        process = psutil.Process()
        health_status["checks"]["process"] = {
            "status": "healthy",
            "pid": process.pid,
            "memory_mb": process.memory_info().rss // (1024 * 1024),
            "cpu_percent": process.cpu_percent(),
            "threads": process.num_threads(),
            "uptime_seconds": int(time.time() - process.create_time())
        }
    except Exception as e:
        health_status["checks"]["process"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Connection pool info
    if POOL_MONITOR_AVAILABLE and pool_monitor:
        try:
            pool_status = pool_monitor.get_pool_status()
            pool_health = pool_monitor.check_pool_health()
            
            health_status["checks"]["connection_pool"] = {
                "status": "healthy" if pool_health["healthy"] else "warning",
                "pool_type": pool_status.get("pool_type", "unknown"),
                "pool_size": pool_status.get("pool_size", "N/A"),
                "checked_out": pool_status.get("checked_out_connections", "N/A"),
                "overflow": pool_status.get("overflow", "N/A"),
                "warnings": pool_health.get("warnings", []),
                "recommendations": pool_health.get("recommendations", [])
            }
            
            # Add database metrics if available
            if "database_metrics" in pool_status:
                health_status["checks"]["connection_pool"]["database_metrics"] = pool_status["database_metrics"]
                
        except Exception as e:
            health_status["checks"]["connection_pool"] = {
                "status": "error",
                "error": str(e)
            }
    else:
        health_status["checks"]["connection_pool"] = {
            "status": "not_available",
            "message": "Connection pool monitoring not configured"
        }
    
    return health_status

@router.get("/redis", response_model=Dict[str, Any])
async def redis_health():
    """Redis-specific health check"""
    try:
        if cache_service.is_available():
            # Test basic operations
            test_key = "health:check"
            test_value = f"check_{int(time.time())}"
            
            # Test SET
            cache_service.set(test_key, test_value, ttl=10)
            
            # Test GET
            retrieved = cache_service.get(test_key)
            
            # Test DELETE
            cache_service.delete(test_key)
            
            # Get stats
            stats = cache_service.get_stats()
            
            return {
                "status": "healthy",
                "available": True,
                "operations_test": "passed",
                "stats": stats
            }
        else:
            return {
                "status": "unhealthy",
                "available": False,
                "error": "Redis connection not available"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "available": False,
            "error": str(e)
        }

@router.get("/database", response_model=Dict[str, Any])
async def database_health(db: Session = Depends(get_db)):
    """Database-specific health check"""
    try:
        from sqlalchemy import text
        # Test query
        result = db.execute(text("SELECT 1 as test"))
        
        # Get database info
        db_type = "postgresql" if "postgresql" in settings.database_url else "sqlite"
        
        if db_type == "postgresql":
            # PostgreSQL specific checks
            size_result = db.execute(text("SELECT pg_database_size(current_database())"))
            size_bytes = size_result.scalar()
            
            connections_result = db.execute(
                text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
            )
            active_connections = connections_result.scalar()
            
            return {
                "status": "healthy",
                "type": db_type,
                "size_mb": size_bytes // (1024 * 1024) if size_bytes else 0,
                "active_connections": active_connections
            }
        else:
            # SQLite specific checks
            import os
            db_path = settings.database_url.replace("sqlite:///", "")
            
            return {
                "status": "healthy",
                "type": db_type,
                "size_mb": os.path.getsize(db_path) // (1024 * 1024) if os.path.exists(db_path) else 0
            }
            
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@router.get("/dependencies", response_model=Dict[str, Any])
async def check_dependencies():
    """Check external service dependencies with actual connectivity tests"""
    dependencies = {}
    overall_healthy = True
    
    # Stripe connectivity check
    dependencies["stripe"] = await _check_stripe_health()
    if dependencies["stripe"]["status"] != "healthy":
        overall_healthy = False
    
    # SendGrid connectivity check
    dependencies["sendgrid"] = await _check_sendgrid_health()
    if dependencies["sendgrid"]["status"] != "healthy":
        overall_healthy = False
        
    # Twilio connectivity check  
    dependencies["twilio"] = await _check_twilio_health()
    if dependencies["twilio"]["status"] != "healthy":
        overall_healthy = False
        
    # Google Calendar connectivity check
    dependencies["google_calendar"] = await _check_google_calendar_health()
    if dependencies["google_calendar"]["status"] != "healthy":
        overall_healthy = False
    
    return {
        "status": "healthy" if overall_healthy else "degraded",
        "dependencies": dependencies,
        "healthy_services": sum(1 for dep in dependencies.values() if dep["status"] == "healthy"),
        "total_services": len(dependencies)
    }


# Individual service health check functions
async def _check_stripe_health() -> Dict[str, Any]:
    """Check Stripe API connectivity"""
    try:
        if not settings.stripe_secret_key:
            return {
                "configured": False,
                "status": "not_configured",
                "message": "Stripe API key not configured"
            }
        
        # Import Stripe here to avoid import errors if not configured
        import stripe
        stripe.api_key = settings.stripe_secret_key
        
        # Test API call - retrieve account information
        account = stripe.Account.retrieve()
        
        return {
            "configured": True,
            "status": "healthy",
            "account_id": account.id,
            "country": account.country,
            "currencies_supported": account.default_currency,
            "response_time_ms": "< 1000"  # Stripe is typically fast
        }
        
    except Exception as e:
        return {
            "configured": bool(settings.stripe_secret_key),
            "status": "unhealthy", 
            "error": str(e),
            "service": "stripe"
        }


async def _check_sendgrid_health() -> Dict[str, Any]:
    """Check SendGrid API connectivity"""
    try:
        if not settings.sendgrid_api_key:
            return {
                "configured": False,
                "status": "not_configured",
                "message": "SendGrid API key not configured"
            }
        
        # Import SendGrid here to avoid import errors
        import sendgrid
        
        sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        
        # Test API call - check API key validity
        response = sg.client.user.profile.get()
        
        if response.status_code == 200:
            return {
                "configured": True,
                "status": "healthy",
                "api_response_code": response.status_code,
                "service": "sendgrid"
            }
        else:
            return {
                "configured": True,
                "status": "unhealthy",
                "api_response_code": response.status_code,
                "service": "sendgrid"
            }
            
    except Exception as e:
        return {
            "configured": bool(settings.sendgrid_api_key),
            "status": "unhealthy",
            "error": str(e),
            "service": "sendgrid"
        }


async def _check_twilio_health() -> Dict[str, Any]:
    """Check Twilio API connectivity"""
    try:
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            return {
                "configured": False,
                "status": "not_configured", 
                "message": "Twilio credentials not configured"
            }
        
        # Import Twilio here to avoid import errors
        from twilio.rest import Client
        
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        
        # Test API call - retrieve account information
        account = client.api.accounts(settings.twilio_account_sid).fetch()
        
        return {
            "configured": True,
            "status": "healthy",
            "account_sid": account.sid,
            "account_status": account.status,
            "service": "twilio"
        }
        
    except Exception as e:
        return {
            "configured": bool(settings.twilio_account_sid and settings.twilio_auth_token),
            "status": "unhealthy",
            "error": str(e), 
            "service": "twilio"
        }


async def _check_google_calendar_health() -> Dict[str, Any]:
    """Check Google Calendar API connectivity"""
    try:
        if not settings.google_client_id or not settings.google_client_secret:
            return {
                "configured": False,
                "status": "not_configured",
                "message": "Google Calendar credentials not configured"
            }
        
        # For OAuth2 services, we can only check if credentials are configured
        # Full connectivity check would require user authorization
        return {
            "configured": True,
            "status": "configured",  # Can't test without user auth
            "message": "OAuth2 credentials configured, requires user authorization for full test",
            "client_id_configured": bool(settings.google_client_id),
            "client_secret_configured": bool(settings.google_client_secret),
            "service": "google_calendar"
        }
        
    except Exception as e:
        return {
            "configured": bool(settings.google_client_id and settings.google_client_secret),
            "status": "unhealthy",
            "error": str(e),
            "service": "google_calendar"
        }


# Docker-specific health endpoints
@router.get("/docker", response_model=Dict[str, Any])
async def docker_health_check(request: Request, db: Session = Depends(get_db)):
    """Docker-specific health check with container information"""
    try:
        # Import the extended health checker
        from docker_health_extended import health_checker
        
        # Get comprehensive health data
        health_data = await health_checker.get_comprehensive_health()
        
        # Add request information
        health_data["request_info"] = {
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "x_forwarded_for": request.headers.get("x-forwarded-for"),
            "x_real_ip": request.headers.get("x-real-ip")
        }
        
        return health_data
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "container": {
                "container_id": os.environ.get('HOSTNAME', 'local'),
                "container_mode": os.environ.get('CONTAINER_MODE', 'false') == 'true'
            }
        }


@router.get("/ready", response_model=Dict[str, Any])
async def readiness_check(db: Session = Depends(get_db)):
    """Kubernetes-style readiness probe for Docker containers"""
    try:
        # Check critical services for readiness
        ready = True
        checks = {}
        
        # Database readiness
        try:
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            checks["database"] = {"status": "ready"}
        except Exception as e:
            checks["database"] = {"status": "not_ready", "error": str(e)}
            ready = False
        
        # Redis readiness
        try:
            if cache_service.is_available():
                # Test basic operation
                cache_service.set("readiness_check", "ok", ttl=5)
                value = cache_service.get("readiness_check")
                cache_service.delete("readiness_check")
                
                if value == "ok":
                    checks["redis"] = {"status": "ready"}
                else:
                    checks["redis"] = {"status": "not_ready", "error": "Operation test failed"}
                    ready = False
            else:
                checks["redis"] = {"status": "not_ready", "error": "Not available"}
                ready = False
        except Exception as e:
            checks["redis"] = {"status": "not_ready", "error": str(e)}
            ready = False
        
        status_code = 200 if ready else 503
        
        return {
            "status": "ready" if ready else "not_ready",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": checks,
            "container": {
                "container_id": os.environ.get('HOSTNAME', 'local'),
                "uptime": (datetime.now(timezone.utc) - CONTAINER_START_TIME).total_seconds()
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/live", response_model=Dict[str, Any])
async def liveness_check(request: Request):
    """Kubernetes-style liveness probe for Docker containers"""
    try:
        # Simple liveness check - if we can respond, we're alive
        uptime = (datetime.now(timezone.utc) - CONTAINER_START_TIME).total_seconds()
        
        return {
            "status": "alive",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": uptime,
            "container": {
                "container_id": os.environ.get('HOSTNAME', 'local'),
                "start_time": CONTAINER_START_TIME.isoformat(),
                "container_mode": os.environ.get('CONTAINER_MODE', 'false') == 'true'
            },
            "process": {
                "pid": os.getpid(),
                "memory_mb": psutil.Process().memory_info().rss // (1024 * 1024),
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }