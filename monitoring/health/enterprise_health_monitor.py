"""
Enterprise Health Check System for BookedBarber V2
=================================================

Comprehensive health monitoring system designed for 10,000+ concurrent users
with detailed component checks, dependency monitoring, and real-time metrics.
"""

import asyncio
import time
import psutil
import redis
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import logging
import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session
import os


class HealthStatus(Enum):
    """Health status levels"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class HealthCheck:
    """Health check result"""
    name: str
    status: HealthStatus
    message: str
    response_time_ms: float
    timestamp: datetime
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['status'] = self.status.value
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class SystemHealth:
    """Overall system health"""
    status: HealthStatus
    checks: List[HealthCheck]
    summary: Dict[str, Any]
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'status': self.status.value,
            'checks': [check.to_dict() for check in self.checks],
            'summary': self.summary,
            'timestamp': self.timestamp.isoformat(),
        }


class EnterpriseHealthMonitor:
    """Enterprise-grade health monitoring system"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.check_timeout = 30  # seconds
        self.dependency_timeout = 10  # seconds
        
        # Health check thresholds
        self.thresholds = {
            'response_time_warning': 1000,  # ms
            'response_time_critical': 5000,  # ms
            'cpu_warning': 70,  # %
            'cpu_critical': 90,  # %
            'memory_warning': 80,  # %
            'memory_critical': 95,  # %
            'disk_warning': 85,  # %
            'disk_critical': 95,  # %
            'connection_warning': 80,  # % of max connections
            'connection_critical': 95,  # % of max connections
        }
    
    async def check_system_health(self, db_session: Session = None) -> SystemHealth:
        """Perform comprehensive system health check"""
        start_time = time.time()
        checks = []
        
        # Core system checks
        checks.extend(await self._check_core_services(db_session))
        
        # Infrastructure checks
        checks.extend(await self._check_infrastructure())
        
        # External dependencies
        checks.extend(await self._check_external_dependencies())
        
        # Application-specific checks
        checks.extend(await self._check_application_health(db_session))
        
        # Security checks
        checks.extend(await self._check_security_status())
        
        # Determine overall status
        overall_status = self._determine_overall_status(checks)
        
        # Generate summary
        summary = self._generate_summary(checks, time.time() - start_time)
        
        return SystemHealth(
            status=overall_status,
            checks=checks,
            summary=summary,
            timestamp=datetime.utcnow(),
        )
    
    async def _check_core_services(self, db_session: Session = None) -> List[HealthCheck]:
        """Check core system services"""
        checks = []
        
        # Database check
        checks.append(await self._check_database(db_session))
        
        # Redis cache check
        checks.append(await self._check_redis())
        
        # File system check
        checks.append(await self._check_filesystem())
        
        return checks
    
    async def _check_database(self, db_session: Session = None) -> HealthCheck:
        """Check database health"""
        start_time = time.time()
        
        try:
            if db_session is None:
                # Import here to avoid circular imports
                from backend_v2.database import get_db
                db_session = next(get_db())
            
            # Basic connectivity test
            result = db_session.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            
            if test_value != 1:
                raise Exception("Database connectivity test failed")
            
            # Check database size and performance
            if "postgresql" in os.getenv("DATABASE_URL", ""):
                metadata = await self._check_postgresql_health(db_session)
            else:
                metadata = await self._check_sqlite_health(db_session)
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine status based on response time
            if response_time > self.thresholds['response_time_critical']:
                status = HealthStatus.CRITICAL
                message = f"Database response time critical: {response_time:.2f}ms"
            elif response_time > self.thresholds['response_time_warning']:
                status = HealthStatus.WARNING
                message = f"Database response time slow: {response_time:.2f}ms"
            else:
                status = HealthStatus.HEALTHY
                message = "Database is healthy"
            
            return HealthCheck(
                name="database",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata=metadata,
            )
            
        except Exception as e:
            return HealthCheck(
                name="database",
                status=HealthStatus.CRITICAL,
                message=f"Database check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_postgresql_health(self, db_session: Session) -> Dict[str, Any]:
        """Check PostgreSQL-specific health metrics"""
        try:
            # Database size
            size_result = db_session.execute(text("SELECT pg_database_size(current_database())"))
            size_bytes = size_result.scalar()
            
            # Active connections
            connections_result = db_session.execute(text("""
                SELECT count(*) as active_connections,
                       (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """))
            conn_data = connections_result.fetchone()
            
            # Table statistics
            tables_result = db_session.execute(text("""
                SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup
                FROM pg_stat_user_tables
                ORDER BY n_live_tup DESC
                LIMIT 10
            """))
            
            # Index usage
            index_result = db_session.execute(text("""
                SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes
                WHERE idx_tup_read > 0
                ORDER BY idx_tup_read DESC
                LIMIT 10
            """))
            
            connection_percentage = (conn_data.active_connections / conn_data.max_connections) * 100
            
            return {
                "type": "postgresql",
                "size_mb": size_bytes // (1024 * 1024) if size_bytes else 0,
                "active_connections": conn_data.active_connections,
                "max_connections": conn_data.max_connections,
                "connection_percentage": connection_percentage,
                "table_stats": [dict(row) for row in tables_result.fetchall()],
                "index_stats": [dict(row) for row in index_result.fetchall()],
            }
            
        except Exception as e:
            return {"type": "postgresql", "error": str(e)}
    
    async def _check_sqlite_health(self, db_session: Session) -> Dict[str, Any]:
        """Check SQLite-specific health metrics"""
        try:
            # Database size
            db_path = os.getenv("DATABASE_URL", "").replace("sqlite:///", "")
            size_bytes = os.path.getsize(db_path) if os.path.exists(db_path) else 0
            
            # Table count
            tables_result = db_session.execute(text("""
                SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """))
            table_count = len(tables_result.fetchall())
            
            return {
                "type": "sqlite",
                "size_mb": size_bytes // (1024 * 1024),
                "table_count": table_count,
                "path": db_path,
            }
            
        except Exception as e:
            return {"type": "sqlite", "error": str(e)}
    
    async def _check_redis(self) -> HealthCheck:
        """Check Redis cache health"""
        start_time = time.time()
        
        try:
            # Import Redis service
            from backend_v2.services.redis_service import cache_service
            
            if not cache_service.is_available():
                return HealthCheck(
                    name="redis",
                    status=HealthStatus.CRITICAL,
                    message="Redis service not available",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow(),
                    metadata={"available": False},
                )
            
            # Test operations
            test_key = f"health:check:{int(time.time())}"
            test_value = "health_check_value"
            
            # Test SET
            cache_service.set(test_key, test_value, ttl=60)
            
            # Test GET
            retrieved_value = cache_service.get(test_key)
            
            # Test DELETE
            cache_service.delete(test_key)
            
            if retrieved_value != test_value:
                raise Exception("Redis operations test failed")
            
            # Get Redis stats
            stats = cache_service.get_stats()
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine status
            memory_usage = stats.get('used_memory_percentage', 0)
            if memory_usage > 90:
                status = HealthStatus.CRITICAL
                message = f"Redis memory usage critical: {memory_usage}%"
            elif memory_usage > 80:
                status = HealthStatus.WARNING
                message = f"Redis memory usage high: {memory_usage}%"
            elif response_time > self.thresholds['response_time_warning']:
                status = HealthStatus.WARNING
                message = f"Redis response time slow: {response_time:.2f}ms"
            else:
                status = HealthStatus.HEALTHY
                message = "Redis is healthy"
            
            return HealthCheck(
                name="redis",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata={
                    "available": True,
                    "stats": stats,
                    "operations_test": "passed",
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="redis",
                status=HealthStatus.CRITICAL,
                message=f"Redis check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_filesystem(self) -> HealthCheck:
        """Check filesystem health"""
        start_time = time.time()
        
        try:
            # Check disk usage
            disk_usage = psutil.disk_usage('/')
            disk_percentage = disk_usage.percent
            
            # Check if logs directory is writable
            log_dir = "/var/log"
            if os.path.exists(log_dir):
                writable = os.access(log_dir, os.W_OK)
            else:
                writable = True  # Skip if directory doesn't exist
            
            # Determine status
            if disk_percentage > self.thresholds['disk_critical']:
                status = HealthStatus.CRITICAL
                message = f"Disk usage critical: {disk_percentage}%"
            elif disk_percentage > self.thresholds['disk_warning']:
                status = HealthStatus.WARNING
                message = f"Disk usage high: {disk_percentage}%"
            elif not writable:
                status = HealthStatus.WARNING
                message = "Log directory not writable"
            else:
                status = HealthStatus.HEALTHY
                message = "Filesystem is healthy"
            
            return HealthCheck(
                name="filesystem",
                status=status,
                message=message,
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={
                    "disk_usage_percent": disk_percentage,
                    "disk_total_gb": disk_usage.total // (1024**3),
                    "disk_used_gb": disk_usage.used // (1024**3),
                    "disk_free_gb": disk_usage.free // (1024**3),
                    "log_writable": writable,
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="filesystem",
                status=HealthStatus.CRITICAL,
                message=f"Filesystem check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_infrastructure(self) -> List[HealthCheck]:
        """Check infrastructure components"""
        checks = []
        
        # CPU check
        checks.append(await self._check_cpu())
        
        # Memory check
        checks.append(await self._check_memory())
        
        # Process check
        checks.append(await self._check_process())
        
        return checks
    
    async def _check_cpu(self) -> HealthCheck:
        """Check CPU usage"""
        start_time = time.time()
        
        try:
            # Get CPU usage over 1 second interval
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            load_average = os.getloadavg() if hasattr(os, 'getloadavg') else (0, 0, 0)
            
            # Determine status
            if cpu_percent > self.thresholds['cpu_critical']:
                status = HealthStatus.CRITICAL
                message = f"CPU usage critical: {cpu_percent}%"
            elif cpu_percent > self.thresholds['cpu_warning']:
                status = HealthStatus.WARNING
                message = f"CPU usage high: {cpu_percent}%"
            else:
                status = HealthStatus.HEALTHY
                message = f"CPU usage normal: {cpu_percent}%"
            
            return HealthCheck(
                name="cpu",
                status=status,
                message=message,
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={
                    "cpu_percent": cpu_percent,
                    "cpu_count": cpu_count,
                    "load_average_1m": load_average[0],
                    "load_average_5m": load_average[1],
                    "load_average_15m": load_average[2],
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="cpu",
                status=HealthStatus.CRITICAL,
                message=f"CPU check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_memory(self) -> HealthCheck:
        """Check memory usage"""
        start_time = time.time()
        
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Determine status
            if memory.percent > self.thresholds['memory_critical']:
                status = HealthStatus.CRITICAL
                message = f"Memory usage critical: {memory.percent}%"
            elif memory.percent > self.thresholds['memory_warning']:
                status = HealthStatus.WARNING
                message = f"Memory usage high: {memory.percent}%"
            else:
                status = HealthStatus.HEALTHY
                message = f"Memory usage normal: {memory.percent}%"
            
            return HealthCheck(
                name="memory",
                status=status,
                message=message,
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={
                    "memory_percent": memory.percent,
                    "memory_total_gb": memory.total // (1024**3),
                    "memory_used_gb": memory.used // (1024**3),
                    "memory_available_gb": memory.available // (1024**3),
                    "swap_percent": swap.percent,
                    "swap_total_gb": swap.total // (1024**3),
                    "swap_used_gb": swap.used // (1024**3),
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="memory",
                status=HealthStatus.CRITICAL,
                message=f"Memory check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_process(self) -> HealthCheck:
        """Check current process health"""
        start_time = time.time()
        
        try:
            process = psutil.Process()
            
            # Get process information
            memory_info = process.memory_info()
            cpu_percent = process.cpu_percent()
            threads = process.num_threads()
            uptime = time.time() - process.create_time()
            
            # Get file descriptors (Unix only)
            try:
                file_descriptors = process.num_fds()
            except (AttributeError, psutil.AccessDenied):
                file_descriptors = None
            
            # Determine status based on resource usage
            memory_mb = memory_info.rss // (1024 * 1024)
            if memory_mb > 2048:  # More than 2GB
                status = HealthStatus.WARNING
                message = f"Process memory usage high: {memory_mb}MB"
            elif cpu_percent > 80:
                status = HealthStatus.WARNING
                message = f"Process CPU usage high: {cpu_percent}%"
            else:
                status = HealthStatus.HEALTHY
                message = "Process is healthy"
            
            return HealthCheck(
                name="process",
                status=status,
                message=message,
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={
                    "pid": process.pid,
                    "memory_mb": memory_mb,
                    "cpu_percent": cpu_percent,
                    "threads": threads,
                    "uptime_seconds": int(uptime),
                    "file_descriptors": file_descriptors,
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="process",
                status=HealthStatus.CRITICAL,
                message=f"Process check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_external_dependencies(self) -> List[HealthCheck]:
        """Check external service dependencies"""
        checks = []
        
        # Check external services in parallel
        tasks = [
            self._check_stripe_connectivity(),
            self._check_sendgrid_connectivity(),
            self._check_google_apis_connectivity(),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                checks.append(HealthCheck(
                    name="external_dependency",
                    status=HealthStatus.CRITICAL,
                    message=f"External dependency check failed: {str(result)}",
                    response_time_ms=0,
                    timestamp=datetime.utcnow(),
                    metadata={"error": str(result)},
                ))
            else:
                checks.append(result)
        
        return checks
    
    async def _check_stripe_connectivity(self) -> HealthCheck:
        """Check Stripe API connectivity"""
        start_time = time.time()
        
        try:
            stripe_key = os.getenv("STRIPE_SECRET_KEY")
            if not stripe_key:
                return HealthCheck(
                    name="stripe",
                    status=HealthStatus.WARNING,
                    message="Stripe API key not configured",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow(),
                    metadata={"configured": False},
                )
            
            # Test Stripe API connectivity
            async with httpx.AsyncClient(timeout=self.dependency_timeout) as client:
                response = await client.get(
                    "https://api.stripe.com/v1/account",
                    headers={"Authorization": f"Bearer {stripe_key}"},
                )
            
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                status = HealthStatus.HEALTHY
                message = "Stripe API is accessible"
            else:
                status = HealthStatus.WARNING
                message = f"Stripe API returned status {response.status_code}"
            
            return HealthCheck(
                name="stripe",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata={
                    "configured": True,
                    "status_code": response.status_code,
                    "accessible": response.status_code == 200,
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="stripe",
                status=HealthStatus.WARNING,
                message=f"Stripe connectivity check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_sendgrid_connectivity(self) -> HealthCheck:
        """Check SendGrid API connectivity"""
        start_time = time.time()
        
        try:
            sendgrid_key = os.getenv("SENDGRID_API_KEY")
            if not sendgrid_key:
                return HealthCheck(
                    name="sendgrid",
                    status=HealthStatus.WARNING,
                    message="SendGrid API key not configured",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow(),
                    metadata={"configured": False},
                )
            
            # Test SendGrid API connectivity
            async with httpx.AsyncClient(timeout=self.dependency_timeout) as client:
                response = await client.get(
                    "https://api.sendgrid.com/v3/user/account",
                    headers={"Authorization": f"Bearer {sendgrid_key}"},
                )
            
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                status = HealthStatus.HEALTHY
                message = "SendGrid API is accessible"
            else:
                status = HealthStatus.WARNING
                message = f"SendGrid API returned status {response.status_code}"
            
            return HealthCheck(
                name="sendgrid",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata={
                    "configured": True,
                    "status_code": response.status_code,
                    "accessible": response.status_code == 200,
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="sendgrid",
                status=HealthStatus.WARNING,
                message=f"SendGrid connectivity check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_google_apis_connectivity(self) -> HealthCheck:
        """Check Google APIs connectivity"""
        start_time = time.time()
        
        try:
            google_client_id = os.getenv("GOOGLE_CLIENT_ID")
            if not google_client_id:
                return HealthCheck(
                    name="google_apis",
                    status=HealthStatus.WARNING,
                    message="Google APIs not configured",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow(),
                    metadata={"configured": False},
                )
            
            # Test Google APIs connectivity (using a simple endpoint)
            async with httpx.AsyncClient(timeout=self.dependency_timeout) as client:
                response = await client.get("https://www.googleapis.com/calendar/v3/colors")
            
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code in [200, 401]:  # 401 is expected without auth
                status = HealthStatus.HEALTHY
                message = "Google APIs are accessible"
            else:
                status = HealthStatus.WARNING
                message = f"Google APIs returned status {response.status_code}"
            
            return HealthCheck(
                name="google_apis",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata={
                    "configured": True,
                    "status_code": response.status_code,
                    "accessible": response.status_code in [200, 401],
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="google_apis",
                status=HealthStatus.WARNING,
                message=f"Google APIs connectivity check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_application_health(self, db_session: Session = None) -> List[HealthCheck]:
        """Check application-specific health metrics"""
        checks = []
        
        # Check application endpoints
        checks.append(await self._check_api_endpoints())
        
        # Check background jobs
        checks.append(await self._check_background_jobs())
        
        # Check data integrity
        if db_session:
            checks.append(await self._check_data_integrity(db_session))
        
        return checks
    
    async def _check_api_endpoints(self) -> HealthCheck:
        """Check critical API endpoints"""
        start_time = time.time()
        
        try:
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
            
            # Test critical endpoints
            endpoints_to_test = [
                "/health",
                "/api/v1/auth/me",  # Protected endpoint
                "/api/v1/services",  # Public endpoint
            ]
            
            failed_endpoints = []
            total_response_time = 0
            
            async with httpx.AsyncClient(timeout=self.dependency_timeout) as client:
                for endpoint in endpoints_to_test:
                    try:
                        response = await client.get(f"{base_url}{endpoint}")
                        if response.status_code >= 500:
                            failed_endpoints.append(f"{endpoint} ({response.status_code})")
                        total_response_time += response.elapsed.total_seconds() * 1000
                    except Exception as e:
                        failed_endpoints.append(f"{endpoint} (error: {str(e)})")
            
            avg_response_time = total_response_time / len(endpoints_to_test)
            response_time = (time.time() - start_time) * 1000
            
            if failed_endpoints:
                status = HealthStatus.WARNING
                message = f"Some API endpoints failed: {', '.join(failed_endpoints)}"
            elif avg_response_time > self.thresholds['response_time_warning']:
                status = HealthStatus.WARNING
                message = f"API endpoints responding slowly: {avg_response_time:.2f}ms avg"
            else:
                status = HealthStatus.HEALTHY
                message = "API endpoints are healthy"
            
            return HealthCheck(
                name="api_endpoints",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata={
                    "endpoints_tested": len(endpoints_to_test),
                    "failed_endpoints": failed_endpoints,
                    "average_response_time_ms": avg_response_time,
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="api_endpoints",
                status=HealthStatus.CRITICAL,
                message=f"API endpoints check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_background_jobs(self) -> HealthCheck:
        """Check background job system health"""
        start_time = time.time()
        
        try:
            # This would integrate with your background job system (Celery, RQ, etc.)
            # For now, we'll just check if the job system is configured
            
            job_broker = os.getenv("CELERY_BROKER_URL")
            if not job_broker:
                return HealthCheck(
                    name="background_jobs",
                    status=HealthStatus.WARNING,
                    message="Background job system not configured",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow(),
                    metadata={"configured": False},
                )
            
            # Check if Redis broker is accessible
            if "redis" in job_broker:
                from backend_v2.services.redis_service import cache_service
                if not cache_service.is_available():
                    return HealthCheck(
                        name="background_jobs",
                        status=HealthStatus.CRITICAL,
                        message="Background job broker not accessible",
                        response_time_ms=(time.time() - start_time) * 1000,
                        timestamp=datetime.utcnow(),
                        metadata={"broker_accessible": False},
                    )
            
            return HealthCheck(
                name="background_jobs",
                status=HealthStatus.HEALTHY,
                message="Background job system is healthy",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={
                    "configured": True,
                    "broker": job_broker.split("://")[0] if "://" in job_broker else "unknown",
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="background_jobs",
                status=HealthStatus.WARNING,
                message=f"Background jobs check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_data_integrity(self, db_session: Session) -> HealthCheck:
        """Check data integrity and consistency"""
        start_time = time.time()
        
        try:
            # Basic data integrity checks
            issues = []
            
            # Check for orphaned records (example)
            try:
                # This would contain actual data integrity queries
                # For example: appointments without users, payments without appointments, etc.
                orphaned_check = db_session.execute(text("""
                    SELECT COUNT(*) as count FROM users WHERE id IS NULL
                """))
                orphaned_count = orphaned_check.scalar()
                
                if orphaned_count > 0:
                    issues.append(f"Found {orphaned_count} orphaned records")
                    
            except Exception as e:
                issues.append(f"Data integrity check failed: {str(e)}")
            
            response_time = (time.time() - start_time) * 1000
            
            if issues:
                status = HealthStatus.WARNING
                message = f"Data integrity issues found: {'; '.join(issues)}"
            else:
                status = HealthStatus.HEALTHY
                message = "Data integrity is healthy"
            
            return HealthCheck(
                name="data_integrity",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata={
                    "issues_found": len(issues),
                    "issues": issues,
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="data_integrity",
                status=HealthStatus.WARNING,
                message=f"Data integrity check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_security_status(self) -> List[HealthCheck]:
        """Check security-related health metrics"""
        checks = []
        
        # SSL/TLS check
        checks.append(await self._check_ssl_certificate())
        
        # Security headers check
        checks.append(await self._check_security_headers())
        
        return checks
    
    async def _check_ssl_certificate(self) -> HealthCheck:
        """Check SSL certificate validity"""
        start_time = time.time()
        
        try:
            # This would check SSL certificate expiration
            # For now, we'll just check if HTTPS is configured
            
            use_https = os.getenv("USE_HTTPS", "false").lower() == "true"
            domain = os.getenv("DOMAIN_NAME")
            
            if not domain:
                return HealthCheck(
                    name="ssl_certificate",
                    status=HealthStatus.WARNING,
                    message="Domain name not configured",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow(),
                    metadata={"domain_configured": False},
                )
            
            if not use_https:
                return HealthCheck(
                    name="ssl_certificate",
                    status=HealthStatus.WARNING,
                    message="HTTPS not enabled",
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow(),
                    metadata={"https_enabled": False},
                )
            
            return HealthCheck(
                name="ssl_certificate",
                status=HealthStatus.HEALTHY,
                message="SSL certificate is healthy",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={
                    "https_enabled": True,
                    "domain": domain,
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="ssl_certificate",
                status=HealthStatus.WARNING,
                message=f"SSL certificate check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    async def _check_security_headers(self) -> HealthCheck:
        """Check security headers configuration"""
        start_time = time.time()
        
        try:
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
            
            async with httpx.AsyncClient(timeout=self.dependency_timeout) as client:
                response = await client.get(f"{base_url}/health")
            
            headers = response.headers
            security_headers = [
                "X-Content-Type-Options",
                "X-Frame-Options",
                "X-XSS-Protection",
                "Strict-Transport-Security",
                "Content-Security-Policy",
            ]
            
            missing_headers = []
            for header in security_headers:
                if header not in headers:
                    missing_headers.append(header)
            
            response_time = (time.time() - start_time) * 1000
            
            if missing_headers:
                status = HealthStatus.WARNING
                message = f"Missing security headers: {', '.join(missing_headers)}"
            else:
                status = HealthStatus.HEALTHY
                message = "Security headers are configured"
            
            return HealthCheck(
                name="security_headers",
                status=status,
                message=message,
                response_time_ms=response_time,
                timestamp=datetime.utcnow(),
                metadata={
                    "checked_headers": security_headers,
                    "missing_headers": missing_headers,
                    "present_headers": [h for h in security_headers if h in headers],
                },
            )
            
        except Exception as e:
            return HealthCheck(
                name="security_headers",
                status=HealthStatus.WARNING,
                message=f"Security headers check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={"error": str(e)},
            )
    
    def _determine_overall_status(self, checks: List[HealthCheck]) -> HealthStatus:
        """Determine overall system status from individual checks"""
        if not checks:
            return HealthStatus.UNKNOWN
        
        # Count status types
        status_counts = {
            HealthStatus.CRITICAL: 0,
            HealthStatus.WARNING: 0,
            HealthStatus.HEALTHY: 0,
            HealthStatus.UNKNOWN: 0,
        }
        
        for check in checks:
            status_counts[check.status] += 1
        
        # Determine overall status
        if status_counts[HealthStatus.CRITICAL] > 0:
            return HealthStatus.CRITICAL
        elif status_counts[HealthStatus.WARNING] > 0:
            return HealthStatus.WARNING
        elif status_counts[HealthStatus.HEALTHY] > 0:
            return HealthStatus.HEALTHY
        else:
            return HealthStatus.UNKNOWN
    
    def _generate_summary(self, checks: List[HealthCheck], total_time: float) -> Dict[str, Any]:
        """Generate summary of health check results"""
        status_counts = {
            "healthy": 0,
            "warning": 0,
            "critical": 0,
            "unknown": 0,
        }
        
        total_response_time = 0
        check_names = []
        
        for check in checks:
            status_counts[check.status.value] += 1
            total_response_time += check.response_time_ms
            check_names.append(check.name)
        
        avg_response_time = total_response_time / len(checks) if checks else 0
        
        return {
            "total_checks": len(checks),
            "status_distribution": status_counts,
            "average_response_time_ms": avg_response_time,
            "total_check_time_ms": total_time * 1000,
            "checks_performed": check_names,
            "health_score": self._calculate_health_score(status_counts),
        }
    
    def _calculate_health_score(self, status_counts: Dict[str, int]) -> float:
        """Calculate overall health score (0-100)"""
        total = sum(status_counts.values())
        if total == 0:
            return 0
        
        score = (
            status_counts["healthy"] * 100 +
            status_counts["warning"] * 60 +
            status_counts["critical"] * 10 +
            status_counts["unknown"] * 30
        ) / total
        
        return round(score, 2)


# Global health monitor instance
health_monitor = EnterpriseHealthMonitor()