"""
Health check endpoints for monitoring service status
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import redis
import psutil
import time
from datetime import datetime

from database import get_db
from services.redis_service import cache_service
from config import settings

router = APIRouter(
    prefix="/health",
    tags=["health"]
)

@router.get("/", response_model=Dict[str, Any])
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "BookedBarber API",
        "version": "2.0.0",
        "environment": settings.environment
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
            
            connections_result = db.execute(text(
                "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
            ))
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
    """Check external service dependencies"""
    dependencies = {
        "stripe": {
            "configured": bool(settings.stripe_secret_key),
            "status": "not_checked"
        },
        "sendgrid": {
            "configured": bool(settings.sendgrid_api_key),
            "status": "not_checked"
        },
        "twilio": {
            "configured": bool(settings.twilio_account_sid),
            "status": "not_checked"
        },
        "google_calendar": {
            "configured": bool(settings.google_client_id),
            "status": "not_checked"
        }
    }
    
    # TODO: Add actual health checks for each service
    # For now, just return configuration status
    
    return {
        "status": "healthy",
        "dependencies": dependencies
    }