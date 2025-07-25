#!/usr/bin/env python3
"""
Enhanced Docker Health Checks for BookedBarber V2
Provides comprehensive health monitoring for containerized environments
"""

import asyncio
import json
import logging
import os
import psutil
import redis
import time
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import settings
from utils.session_manager import session_manager

logger = logging.getLogger(__name__)

class DockerHealthChecker:
    def __init__(self):
        self.start_time = datetime.now(timezone.utc)
        self.container_id = os.environ.get('HOSTNAME', 'unknown')
        self.health_cache = {}
        self.cache_ttl = 10  # seconds
        
    def get_container_info(self) -> dict:
        """Get container information"""
        return {
            "container_id": self.container_id,
            "start_time": self.start_time.isoformat(),
            "uptime_seconds": (datetime.now(timezone.utc) - self.start_time).total_seconds(),
            "environment": settings.environment,
            "container_mode": os.environ.get('CONTAINER_MODE', 'false') == 'true',
        }
    
    async def check_database_health(self) -> dict:
        """Check database connectivity and performance"""
        health = {
            "status": "unknown",
            "response_time_ms": None,
            "connection_pool": {},
            "error": None
        }
        
        start_time = time.time()
        
        try:
            # Create a test engine for health check
            engine = create_engine(
                settings.database_url,
                pool_pre_ping=True,
                pool_recycle=300,
                echo=False
            )
            
            # Test connection
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1 as health_check"))
                row = result.fetchone()
                
                if row and row[0] == 1:
                    health["status"] = "healthy"
                else:
                    health["status"] = "unhealthy"
                    health["error"] = "Unexpected query result"
            
            # Get connection pool info
            pool = engine.pool
            health["connection_pool"] = {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "total_connections": pool.size() + pool.overflow()
            }
            
            engine.dispose()
            
        except Exception as e:
            health["status"] = "unhealthy"
            health["error"] = str(e)
            logger.error(f"Database health check failed: {e}")
        
        health["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
        return health
    
    async def check_redis_health(self) -> dict:
        """Check Redis connectivity and performance"""
        health = {
            "status": "unknown",
            "response_time_ms": None,
            "memory_usage": {},
            "sessions": {},
            "error": None
        }
        
        start_time = time.time()
        
        try:
            # Connect to Redis
            redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_timeout=5
            )
            
            # Test basic connectivity
            ping_result = redis_client.ping()
            
            if ping_result:
                health["status"] = "healthy"
                
                # Get Redis info
                redis_info = redis_client.info()
                health["memory_usage"] = {
                    "used_memory": redis_info.get('used_memory', 0),
                    "used_memory_human": redis_info.get('used_memory_human', '0B'),
                    "used_memory_peak": redis_info.get('used_memory_peak', 0),
                    "memory_fragmentation_ratio": redis_info.get('memory_fragmentation_ratio', 0)
                }
                
                # Get session information
                session_keys = redis_client.keys('session:*')
                health["sessions"] = {
                    "total_sessions": len(session_keys),
                    "session_sample": session_keys[:5] if session_keys else []
                }
                
            else:
                health["status"] = "unhealthy"
                health["error"] = "Redis ping failed"
                
        except Exception as e:
            health["status"] = "unhealthy"
            health["error"] = str(e)
            logger.error(f"Redis health check failed: {e}")
        
        health["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
        return health
    
    async def check_session_manager_health(self) -> dict:
        """Check session manager health"""
        health = {
            "status": "unknown",
            "session_counts": {},
            "test_session": {},
            "error": None
        }
        
        try:
            # Get session counts
            health["session_counts"] = await session_manager.get_session_count()
            
            # Test session creation and retrieval
            test_session_id = f"health_check_{int(time.time())}"
            
            # Create test session
            create_success = await session_manager.create_session(
                session_id=test_session_id,
                user_id=999999,  # Test user ID
                email="healthcheck@test.com",
                role="test",
                ip_address="127.0.0.1",
                user_agent="HealthCheck/1.0"
            )
            
            if create_success:
                # Try to retrieve test session
                session_data = await session_manager.get_session(test_session_id)
                
                if session_data:
                    health["status"] = "healthy"
                    health["test_session"] = {
                        "created": True,
                        "retrieved": True,
                        "user_id": session_data.user_id,
                        "email": session_data.email
                    }
                    
                    # Clean up test session
                    await session_manager.delete_session(test_session_id)
                else:
                    health["status"] = "unhealthy"
                    health["error"] = "Could not retrieve test session"
            else:
                health["status"] = "unhealthy"
                health["error"] = "Could not create test session"
                
        except Exception as e:
            health["status"] = "unhealthy"
            health["error"] = str(e)
            logger.error(f"Session manager health check failed: {e}")
        
        return health
    
    def get_system_resources(self) -> dict:
        """Get system resource usage"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            return {
                "cpu": {
                    "usage_percent": cpu_percent,
                    "count": psutil.cpu_count()
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "usage_percent": memory.percent
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "usage_percent": (disk.used / disk.total) * 100
                }
            }
        except Exception as e:
            logger.error(f"Failed to get system resources: {e}")
            return {"error": str(e)}
    
    async def get_comprehensive_health(self) -> dict:
        """Get comprehensive health status"""
        # Check cache first
        cache_key = "comprehensive_health"
        now = time.time()
        
        if cache_key in self.health_cache:
            cached_data, cache_time = self.health_cache[cache_key]
            if now - cache_time < self.cache_ttl:
                return cached_data
        
        # Perform health checks
        start_time = time.time()
        
        health_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "container": self.get_container_info(),
            "overall_status": "healthy",
            "checks": {},
            "system": self.get_system_resources(),
            "response_time_ms": 0
        }
        
        # Run all health checks concurrently
        checks = await asyncio.gather(
            self.check_database_health(),
            self.check_redis_health(),
            self.check_session_manager_health(),
            return_exceptions=True
        )
        
        # Process check results
        check_names = ["database", "redis", "session_manager"]
        failed_checks = []
        
        for i, check_result in enumerate(checks):
            check_name = check_names[i]
            
            if isinstance(check_result, Exception):
                health_data["checks"][check_name] = {
                    "status": "error",
                    "error": str(check_result)
                }
                failed_checks.append(check_name)
            else:
                health_data["checks"][check_name] = check_result
                if check_result.get("status") != "healthy":
                    failed_checks.append(check_name)
        
        # Determine overall status
        if failed_checks:
            if len(failed_checks) == len(check_names):
                health_data["overall_status"] = "unhealthy"
            else:
                health_data["overall_status"] = "degraded"
            
            health_data["failed_checks"] = failed_checks
        
        health_data["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        # Cache the result
        self.health_cache[cache_key] = (health_data, now)
        
        return health_data

# Global health checker instance
health_checker = DockerHealthChecker()

# FastAPI routes
async def health_endpoint(request: Request):
    """Basic health endpoint"""
    try:
        health_data = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "container": health_checker.get_container_info(),
            "uptime": (datetime.now(timezone.utc) - health_checker.start_time).total_seconds()
        }
        
        return JSONResponse(content=health_data, status_code=200)
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            status_code=503
        )

async def health_detailed_endpoint(request: Request):
    """Detailed health endpoint"""
    try:
        health_data = await health_checker.get_comprehensive_health()
        
        status_code = 200
        if health_data["overall_status"] == "unhealthy":
            status_code = 503
        elif health_data["overall_status"] == "degraded":
            status_code = 206
        
        return JSONResponse(content=health_data, status_code=status_code)
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        return JSONResponse(
            content={
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            status_code=500
        )

async def health_ready_endpoint(request: Request):
    """Kubernetes-style readiness probe"""
    try:
        # Check critical services only
        db_health = await health_checker.check_database_health()
        redis_health = await health_checker.check_redis_health()
        
        if db_health["status"] == "healthy" and redis_health["status"] == "healthy":
            return JSONResponse(content={"status": "ready"}, status_code=200)
        else:
            return JSONResponse(
                content={
                    "status": "not_ready",
                    "database": db_health["status"],
                    "redis": redis_health["status"]
                },
                status_code=503
            )
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            content={"status": "error", "error": str(e)},
            status_code=503
        )

async def health_live_endpoint(request: Request):
    """Kubernetes-style liveness probe"""
    try:
        # Simple liveness check
        uptime = (datetime.now(timezone.utc) - health_checker.start_time).total_seconds()
        
        return JSONResponse(
            content={
                "status": "alive",
                "uptime": uptime,
                "container_id": health_checker.container_id
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        return JSONResponse(
            content={"status": "error", "error": str(e)},
            status_code=503
        )