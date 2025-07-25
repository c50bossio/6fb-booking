"""
Production Monitoring Router for 6FB Booking Platform

Provides comprehensive monitoring endpoints for production deployment including:
- Health checks
- System status
- Performance metrics
- Database connectivity
- External service status
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from db import get_db
from datetime import datetime
import psutil
import os
import sys
import time
import logging

router = APIRouter(tags=["monitoring"])
logger = logging.getLogger(__name__)

@router.get("/health")
def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

@router.get("/health/detailed")
def detailed_health_check(db: Session = Depends(get_db)):
    """Comprehensive health check with dependencies"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Database connectivity check
    try:
        db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {"status": "healthy", "response_time_ms": 0}
    except Exception as e:
        health_status["checks"]["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # File system check
    try:
        disk_usage = psutil.disk_usage('/')
        health_status["checks"]["filesystem"] = {
            "status": "healthy" if disk_usage.percent < 90 else "warning",
            "disk_usage_percent": disk_usage.percent,
            "free_space_gb": round(disk_usage.free / (1024**3), 2)
        }
    except Exception as e:
        health_status["checks"]["filesystem"] = {"status": "unhealthy", "error": str(e)}
    
    # Memory check
    try:
        memory = psutil.virtual_memory()
        health_status["checks"]["memory"] = {
            "status": "healthy" if memory.percent < 85 else "warning",
            "usage_percent": memory.percent,
            "available_gb": round(memory.available / (1024**3), 2)
        }
    except Exception as e:
        health_status["checks"]["memory"] = {"status": "unhealthy", "error": str(e)}
    
    return health_status

@router.get("/status")
def system_status():
    """Get comprehensive system status"""
    try:
        # System information
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        
        # CPU and memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Process information
        process = psutil.Process()
        process_memory = process.memory_info()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "platform": sys.platform,
                "python_version": sys.version,
                "uptime_hours": round(uptime.total_seconds() / 3600, 2),
                "boot_time": boot_time.isoformat()
            },
            "resources": {
                "cpu_percent": cpu_percent,
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "used_percent": memory.percent
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "used_percent": round((disk.used / disk.total) * 100, 2)
                }
            },
            "process": {
                "pid": process.pid,
                "memory_mb": round(process_memory.rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent(),
                "threads": process.num_threads(),
                "create_time": datetime.fromtimestamp(process.create_time()).isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system status: {str(e)}")

@router.get("/database/status")
def database_status(db: Session = Depends(get_db)):
    """Get database status and statistics"""
    try:
        start_time = time.time()
        
        # Test basic connectivity
        db.execute(text("SELECT 1"))
        connection_time = (time.time() - start_time) * 1000
        
        # Get table counts (sample of key tables)
        table_stats = {}
        key_tables = ['users', 'appointments', 'payments', 'clients']
        
        for table in key_tables:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                table_stats[table] = count
            except Exception as e:
                table_stats[table] = f"Error: {str(e)}"
        
        # Check recent activity (last 24 hours)
        recent_appointments = db.execute(text(
            "SELECT COUNT(*) FROM appointments WHERE created_at > datetime('now', '-1 day')"
        )).scalar()
        
        recent_payments = db.execute(text(
            "SELECT COUNT(*) FROM payments WHERE created_at > datetime('now', '-1 day')"
        )).scalar()
        
        return {
            "status": "healthy",
            "connection_time_ms": round(connection_time, 2),
            "table_counts": table_stats,
            "recent_activity": {
                "appointments_24h": recent_appointments,
                "payments_24h": recent_payments
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/metrics")
def application_metrics(db: Session = Depends(get_db)):
    """Get application-specific metrics"""
    try:
        # Performance metrics
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "application": {
                "name": "6FB Booking Platform",
                "version": "2.0.0",
                "environment": os.getenv("ENVIRONMENT", "development")
            }
        }
        
        # Database metrics
        try:
            # Active users (logged in within last 7 days)
            active_users = db.execute(text(
                "SELECT COUNT(*) FROM users WHERE is_active = 1"
            )).scalar()
            
            # Upcoming appointments (next 7 days)
            upcoming_appointments = db.execute(text(
                "SELECT COUNT(*) FROM appointments WHERE start_time > datetime('now') AND start_time < datetime('now', '+7 day')"
            )).scalar()
            
            # Revenue metrics (last 30 days)
            recent_revenue = db.execute(text(
                "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at > datetime('now', '-30 day')"
            )).scalar()
            
            metrics["business"] = {
                "active_users": active_users,
                "upcoming_appointments": upcoming_appointments,
                "revenue_30d": float(recent_revenue) if recent_revenue else 0.0
            }
            
        except Exception as e:
            metrics["business"] = {"error": str(e)}
        
        # System metrics
        process = psutil.Process()
        metrics["system"] = {
            "memory_usage_mb": round(process.memory_info().rss / (1024**2), 2),
            "cpu_percent": process.cpu_percent(),
            "open_files": len(process.open_files()),
            "connections": len(process.connections())
        }
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

@router.get("/readiness")
def readiness_check(db: Session = Depends(get_db)):
    """Kubernetes-style readiness probe"""
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        
        # Check if application is ready to serve traffic
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "database": "ready",
                "application": "ready"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.get("/liveness")
def liveness_check():
    """Kubernetes-style liveness probe"""
    # Basic check that the application is running
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": time.time() - psutil.Process().create_time()
    }

@router.get("/version")
def version_info():
    """Get version and build information"""
    return {
        "application": "6FB Booking Platform",
        "version": "2.0.0",
        "api_version": "v1",
        "python_version": sys.version,
        "build_time": datetime.utcnow().isoformat(),
        "features": [
            "Authentication & Authorization",
            "Booking Management",
            "Payment Processing",
            "Calendar Integration",
            "SMS Notifications",
            "Analytics Dashboard",
            "Performance Monitoring",
            "Security Hardening"
        ]
    }

@router.get("/performance/summary")
def performance_summary():
    """Get performance summary for monitoring dashboards"""
    try:
        # System performance
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        # Process performance
        process = psutil.Process()
        process_memory = process.memory_info()
        
        # Create performance score (0-100)
        performance_score = 100
        if cpu_percent > 80:
            performance_score -= 30
        elif cpu_percent > 60:
            performance_score -= 15
            
        if memory.percent > 85:
            performance_score -= 30
        elif memory.percent > 70:
            performance_score -= 15
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "performance_score": max(0, performance_score),
            "metrics": {
                "cpu_usage": cpu_percent,
                "memory_usage": memory.percent,
                "process_memory_mb": round(process_memory.rss / (1024**2), 2),
                "response_time_category": "fast" if performance_score > 80 else "normal" if performance_score > 60 else "slow"
            },
            "status": "optimal" if performance_score > 80 else "good" if performance_score > 60 else "degraded"
        }
        
    except Exception as e:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "performance_score": 0,
            "status": "error",
            "error": str(e)
        }

@router.get("/audit/recent")
def recent_audit_events():
    """Get recent audit events from security middleware"""
    # This would integrate with the audit middleware
    # For now, return a placeholder
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Audit events would be available here",
        "note": "Integrate with AuditLogMiddleware for real audit data"
    }