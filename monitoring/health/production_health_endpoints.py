"""
Production Health Check Endpoints for BookedBarber V2
==================================================

Comprehensive health monitoring endpoints designed for 10,000+ concurrent users
with detailed system health reporting and automated incident detection.
"""

import asyncio
import time
import psutil
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
import redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health check status levels"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"


@dataclass
class HealthCheckResult:
    """Individual health check result"""
    name: str
    status: HealthStatus
    response_time_ms: float
    message: str
    details: Dict[str, Any]
    timestamp: datetime


@dataclass
class SystemHealthReport:
    """Complete system health report"""
    overall_status: HealthStatus
    timestamp: datetime
    checks: List[HealthCheckResult]
    summary: Dict[str, Any]
    alerts: List[Dict[str, Any]]


class ProductionHealthMonitor:
    """Enterprise-grade health monitoring for production systems"""
    
    def __init__(self):
        self.checks = {}
        self.thresholds = self._load_thresholds()
        self.alert_rules = self._load_alert_rules()
        
    def _load_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Load performance thresholds for health checks"""
        return {
            "database": {
                "response_time_warning": 100.0,  # ms
                "response_time_critical": 500.0,  # ms
                "connection_pool_warning": 0.8,  # 80% utilization
                "connection_pool_critical": 0.95,  # 95% utilization
            },
            "redis": {
                "response_time_warning": 50.0,  # ms
                "response_time_critical": 200.0,  # ms
                "memory_warning": 0.8,  # 80% memory usage
                "memory_critical": 0.95,  # 95% memory usage
            },
            "api": {
                "response_time_warning": 200.0,  # ms
                "response_time_critical": 1000.0,  # ms
                "error_rate_warning": 0.01,  # 1% error rate
                "error_rate_critical": 0.05,  # 5% error rate
            },
            "system": {
                "cpu_warning": 0.8,  # 80% CPU usage
                "cpu_critical": 0.95,  # 95% CPU usage
                "memory_warning": 0.8,  # 80% memory usage
                "memory_critical": 0.95,  # 95% memory usage
                "disk_warning": 0.8,  # 80% disk usage
                "disk_critical": 0.95,  # 95% disk usage
            },
            "business": {
                "booking_success_rate_warning": 0.95,  # 95% success rate
                "booking_success_rate_critical": 0.90,  # 90% success rate
                "payment_success_rate_warning": 0.98,  # 98% success rate
                "payment_success_rate_critical": 0.95,  # 95% success rate
            }
        }
    
    def _load_alert_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load alerting rules for different health check failures"""
        return {
            "database_critical": {
                "channels": ["pagerduty", "slack", "email"],
                "severity": "critical",
                "escalation_time": 300,  # 5 minutes
                "message": "Database is unhealthy - immediate attention required"
            },
            "redis_critical": {
                "channels": ["pagerduty", "slack", "email"],
                "severity": "critical",
                "escalation_time": 300,  # 5 minutes
                "message": "Redis cache is unhealthy - performance impact expected"
            },
            "api_critical": {
                "channels": ["pagerduty", "slack", "email"],
                "severity": "critical",
                "escalation_time": 180,  # 3 minutes
                "message": "API is unhealthy - customer impact expected"
            },
            "payment_critical": {
                "channels": ["pagerduty", "slack", "email"],
                "severity": "critical",
                "escalation_time": 60,  # 1 minute
                "message": "Payment system is unhealthy - revenue impact"
            },
            "system_critical": {
                "channels": ["slack", "email"],
                "severity": "warning",
                "escalation_time": 600,  # 10 minutes
                "message": "System resources are critically low"
            }
        }
    
    async def check_database_health(self, db_session: AsyncSession) -> HealthCheckResult:
        """Check database health and performance"""
        start_time = time.time()
        
        try:
            # Test basic connectivity
            await db_session.execute(text("SELECT 1"))
            
            # Test write performance
            await db_session.execute(text("CREATE TEMP TABLE health_check_temp (id INTEGER)"))
            await db_session.execute(text("INSERT INTO health_check_temp VALUES (1)"))
            await db_session.execute(text("DROP TABLE health_check_temp"))
            
            # Get connection pool status
            pool_info = self._get_connection_pool_info(db_session)
            
            # Get database performance metrics
            performance_metrics = await self._get_database_performance_metrics(db_session)
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine status based on thresholds
            if response_time > self.thresholds["database"]["response_time_critical"]:
                status = HealthStatus.CRITICAL
                message = f"Database response time critical: {response_time:.2f}ms"
            elif response_time > self.thresholds["database"]["response_time_warning"]:
                status = HealthStatus.DEGRADED
                message = f"Database response time elevated: {response_time:.2f}ms"
            elif pool_info["utilization"] > self.thresholds["database"]["connection_pool_critical"]:
                status = HealthStatus.CRITICAL
                message = f"Database connection pool critical: {pool_info['utilization']:.1%}"
            elif pool_info["utilization"] > self.thresholds["database"]["connection_pool_warning"]:
                status = HealthStatus.DEGRADED
                message = f"Database connection pool high: {pool_info['utilization']:.1%}"
            else:
                status = HealthStatus.HEALTHY
                message = "Database is healthy"
            
            return HealthCheckResult(
                name="database",
                status=status,
                response_time_ms=response_time,
                message=message,
                details={
                    "connection_pool": pool_info,
                    "performance_metrics": performance_metrics,
                    "response_time_ms": response_time
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="database",
                status=HealthStatus.CRITICAL,
                response_time_ms=(time.time() - start_time) * 1000,
                message=f"Database connection failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def check_redis_health(self, redis_client) -> HealthCheckResult:
        """Check Redis cache health and performance"""
        start_time = time.time()
        
        try:
            # Test basic connectivity
            await redis_client.ping()
            
            # Test read/write performance
            test_key = f"health_check_{int(time.time())}"
            await redis_client.set(test_key, "test_value", ex=60)
            retrieved_value = await redis_client.get(test_key)
            await redis_client.delete(test_key)
            
            if retrieved_value != b"test_value":
                raise Exception("Redis read/write test failed")
            
            # Get Redis info
            redis_info = await redis_client.info()
            
            response_time = (time.time() - start_time) * 1000
            memory_usage = redis_info.get("used_memory", 0) / redis_info.get("maxmemory", 1)
            
            # Determine status based on thresholds
            if response_time > self.thresholds["redis"]["response_time_critical"]:
                status = HealthStatus.CRITICAL
                message = f"Redis response time critical: {response_time:.2f}ms"
            elif memory_usage > self.thresholds["redis"]["memory_critical"]:
                status = HealthStatus.CRITICAL
                message = f"Redis memory usage critical: {memory_usage:.1%}"
            elif response_time > self.thresholds["redis"]["response_time_warning"]:
                status = HealthStatus.DEGRADED
                message = f"Redis response time elevated: {response_time:.2f}ms"
            elif memory_usage > self.thresholds["redis"]["memory_warning"]:
                status = HealthStatus.DEGRADED
                message = f"Redis memory usage high: {memory_usage:.1%}"
            else:
                status = HealthStatus.HEALTHY
                message = "Redis is healthy"
            
            return HealthCheckResult(
                name="redis",
                status=status,
                response_time_ms=response_time,
                message=message,
                details={
                    "memory_usage_percent": memory_usage * 100,
                    "connected_clients": redis_info.get("connected_clients", 0),
                    "total_commands_processed": redis_info.get("total_commands_processed", 0),
                    "keyspace_hits": redis_info.get("keyspace_hits", 0),
                    "keyspace_misses": redis_info.get("keyspace_misses", 0),
                    "response_time_ms": response_time
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="redis",
                status=HealthStatus.CRITICAL,
                response_time_ms=(time.time() - start_time) * 1000,
                message=f"Redis connection failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def check_external_services_health(self) -> HealthCheckResult:
        """Check external service dependencies"""
        start_time = time.time()
        
        services = {
            "stripe": "https://status.stripe.com/api/v2/status.json",
            "sendgrid": "https://status.sendgrid.com/api/v2/status.json",
            "google_calendar": "https://www.google.com/appsstatus/json/en",
        }
        
        service_statuses = {}
        overall_status = HealthStatus.HEALTHY
        issues = []
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for service_name, status_url in services.items():
                try:
                    response = await client.get(status_url)
                    if response.status_code == 200:
                        service_statuses[service_name] = {
                            "status": "healthy",
                            "response_time_ms": response.elapsed.total_seconds() * 1000
                        }
                    else:
                        service_statuses[service_name] = {
                            "status": "unhealthy",
                            "error": f"HTTP {response.status_code}"
                        }
                        overall_status = HealthStatus.DEGRADED
                        issues.append(f"{service_name}: HTTP {response.status_code}")
                
                except Exception as e:
                    service_statuses[service_name] = {
                        "status": "unreachable",
                        "error": str(e)
                    }
                    overall_status = HealthStatus.DEGRADED
                    issues.append(f"{service_name}: {str(e)}")
        
        response_time = (time.time() - start_time) * 1000
        
        if len(issues) >= len(services) / 2:  # More than half the services are down
            overall_status = HealthStatus.CRITICAL
        
        message = "External services healthy" if overall_status == HealthStatus.HEALTHY else f"Issues: {', '.join(issues)}"
        
        return HealthCheckResult(
            name="external_services",
            status=overall_status,
            response_time_ms=response_time,
            message=message,
            details={
                "services": service_statuses,
                "total_check_time_ms": response_time
            },
            timestamp=datetime.utcnow()
        )
    
    def check_system_resources(self) -> HealthCheckResult:
        """Check system resource utilization"""
        start_time = time.time()
        
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent / 100
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent / 100
            
            # Load average (Unix systems)
            try:
                load_avg = psutil.getloadavg()
                load_avg_1min = load_avg[0] / psutil.cpu_count()
            except (AttributeError, OSError):
                load_avg_1min = 0
            
            # Network stats
            network = psutil.net_io_counters()
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine overall status
            issues = []
            status = HealthStatus.HEALTHY
            
            if cpu_percent / 100 > self.thresholds["system"]["cpu_critical"]:
                status = HealthStatus.CRITICAL
                issues.append(f"CPU usage critical: {cpu_percent:.1f}%")
            elif memory_percent > self.thresholds["system"]["memory_critical"]:
                status = HealthStatus.CRITICAL
                issues.append(f"Memory usage critical: {memory_percent:.1%}")
            elif disk_percent > self.thresholds["system"]["disk_critical"]:
                status = HealthStatus.CRITICAL
                issues.append(f"Disk usage critical: {disk_percent:.1%}")
            elif cpu_percent / 100 > self.thresholds["system"]["cpu_warning"]:
                status = HealthStatus.DEGRADED
                issues.append(f"CPU usage high: {cpu_percent:.1f}%")
            elif memory_percent > self.thresholds["system"]["memory_warning"]:
                status = HealthStatus.DEGRADED
                issues.append(f"Memory usage high: {memory_percent:.1%}")
            elif disk_percent > self.thresholds["system"]["disk_warning"]:
                status = HealthStatus.DEGRADED
                issues.append(f"Disk usage high: {disk_percent:.1%}")
            
            message = "System resources healthy" if status == HealthStatus.HEALTHY else "; ".join(issues)
            
            return HealthCheckResult(
                name="system_resources",
                status=status,
                response_time_ms=response_time,
                message=message,
                details={
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory_percent * 100,
                    "memory_available_gb": memory.available / (1024**3),
                    "disk_percent": disk_percent * 100,
                    "disk_free_gb": disk.free / (1024**3),
                    "load_average_1min": load_avg_1min,
                    "network_bytes_sent": network.bytes_sent,
                    "network_bytes_recv": network.bytes_recv,
                    "response_time_ms": response_time
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="system_resources",
                status=HealthStatus.CRITICAL,
                response_time_ms=(time.time() - start_time) * 1000,
                message=f"System resource check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def check_business_metrics_health(self, db_session: AsyncSession) -> HealthCheckResult:
        """Check business-critical metrics and KPIs"""
        start_time = time.time()
        
        try:
            # Get recent business metrics
            now = datetime.utcnow()
            hour_ago = now - timedelta(hours=1)
            
            # Booking success rate in the last hour
            booking_stats = await self._get_booking_stats(db_session, hour_ago, now)
            
            # Payment success rate in the last hour
            payment_stats = await self._get_payment_stats(db_session, hour_ago, now)
            
            # Active user count
            active_users = await self._get_active_user_count(db_session, hour_ago, now)
            
            response_time = (time.time() - start_time) * 1000
            
            # Calculate success rates
            booking_success_rate = booking_stats.get("success_rate", 1.0)
            payment_success_rate = payment_stats.get("success_rate", 1.0)
            
            # Determine status based on business thresholds
            issues = []
            status = HealthStatus.HEALTHY
            
            if booking_success_rate < self.thresholds["business"]["booking_success_rate_critical"]:
                status = HealthStatus.CRITICAL
                issues.append(f"Booking success rate critical: {booking_success_rate:.1%}")
            elif payment_success_rate < self.thresholds["business"]["payment_success_rate_critical"]:
                status = HealthStatus.CRITICAL
                issues.append(f"Payment success rate critical: {payment_success_rate:.1%}")
            elif booking_success_rate < self.thresholds["business"]["booking_success_rate_warning"]:
                status = HealthStatus.DEGRADED
                issues.append(f"Booking success rate low: {booking_success_rate:.1%}")
            elif payment_success_rate < self.thresholds["business"]["payment_success_rate_warning"]:
                status = HealthStatus.DEGRADED
                issues.append(f"Payment success rate low: {payment_success_rate:.1%}")
            
            message = "Business metrics healthy" if status == HealthStatus.HEALTHY else "; ".join(issues)
            
            return HealthCheckResult(
                name="business_metrics",
                status=status,
                response_time_ms=response_time,
                message=message,
                details={
                    "booking_stats": booking_stats,
                    "payment_stats": payment_stats,
                    "active_users_last_hour": active_users,
                    "time_period": {
                        "start": hour_ago.isoformat(),
                        "end": now.isoformat()
                    },
                    "response_time_ms": response_time
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthCheckResult(
                name="business_metrics",
                status=HealthStatus.CRITICAL,
                response_time_ms=(time.time() - start_time) * 1000,
                message=f"Business metrics check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def perform_comprehensive_health_check(
        self, 
        db_session: AsyncSession, 
        redis_client
    ) -> SystemHealthReport:
        """Perform comprehensive health check of all system components"""
        
        start_time = time.time()
        
        # Run all health checks concurrently
        checks = await asyncio.gather(
            self.check_database_health(db_session),
            self.check_redis_health(redis_client),
            self.check_external_services_health(),
            asyncio.to_thread(self.check_system_resources),
            self.check_business_metrics_health(db_session),
            return_exceptions=True
        )
        
        # Filter out any exceptions and convert to proper results
        valid_checks = []
        for check in checks:
            if isinstance(check, Exception):
                valid_checks.append(HealthCheckResult(
                    name="unknown",
                    status=HealthStatus.CRITICAL,
                    response_time_ms=0,
                    message=f"Health check failed: {str(check)}",
                    details={"error": str(check)},
                    timestamp=datetime.utcnow()
                ))
            else:
                valid_checks.append(check)
        
        # Determine overall system status
        overall_status = self._determine_overall_status(valid_checks)
        
        # Generate alerts for critical issues
        alerts = self._generate_alerts(valid_checks)
        
        # Create summary statistics
        summary = {
            "total_checks": len(valid_checks),
            "healthy_checks": len([c for c in valid_checks if c.status == HealthStatus.HEALTHY]),
            "degraded_checks": len([c for c in valid_checks if c.status == HealthStatus.DEGRADED]),
            "unhealthy_checks": len([c for c in valid_checks if c.status == HealthStatus.UNHEALTHY]),
            "critical_checks": len([c for c in valid_checks if c.status == HealthStatus.CRITICAL]),
            "average_response_time_ms": sum(c.response_time_ms for c in valid_checks) / len(valid_checks),
            "total_check_time_ms": (time.time() - start_time) * 1000,
        }
        
        return SystemHealthReport(
            overall_status=overall_status,
            timestamp=datetime.utcnow(),
            checks=valid_checks,
            summary=summary,
            alerts=alerts
        )
    
    def _determine_overall_status(self, checks: List[HealthCheckResult]) -> HealthStatus:
        """Determine overall system status from individual checks"""
        if any(check.status == HealthStatus.CRITICAL for check in checks):
            return HealthStatus.CRITICAL
        elif any(check.status == HealthStatus.UNHEALTHY for check in checks):
            return HealthStatus.UNHEALTHY
        elif any(check.status == HealthStatus.DEGRADED for check in checks):
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.HEALTHY
    
    def _generate_alerts(self, checks: List[HealthCheckResult]) -> List[Dict[str, Any]]:
        """Generate alerts for critical and unhealthy checks"""
        alerts = []
        
        for check in checks:
            if check.status in [HealthStatus.CRITICAL, HealthStatus.UNHEALTHY]:
                alert_key = f"{check.name}_critical"
                if alert_key in self.alert_rules:
                    alert_config = self.alert_rules[alert_key]
                    alerts.append({
                        "check_name": check.name,
                        "status": check.status.value,
                        "message": check.message,
                        "severity": alert_config["severity"],
                        "channels": alert_config["channels"],
                        "escalation_time": alert_config["escalation_time"],
                        "timestamp": check.timestamp.isoformat(),
                        "details": check.details
                    })
        
        return alerts
    
    def _get_connection_pool_info(self, db_session: AsyncSession) -> Dict[str, Any]:
        """Get database connection pool information"""
        try:
            engine = db_session.get_bind()
            pool = engine.pool
            
            return {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid(),
                "utilization": pool.checkedout() / pool.size() if pool.size() > 0 else 0
            }
        except Exception as e:
            logger.error(f"Failed to get connection pool info: {e}")
            return {"error": str(e)}
    
    async def _get_database_performance_metrics(self, db_session: AsyncSession) -> Dict[str, Any]:
        """Get database performance metrics"""
        try:
            # Get table sizes and statistics
            stats_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins,
                    n_tup_upd,
                    n_tup_del,
                    n_live_tup,
                    n_dead_tup
                FROM pg_stat_user_tables 
                ORDER BY n_live_tup DESC 
                LIMIT 10
            """)
            
            result = await db_session.execute(stats_query)
            table_stats = [dict(row._mapping) for row in result]
            
            # Get active connections
            connections_query = text("""
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity
            """)
            
            connections_result = await db_session.execute(connections_query)
            connections_data = dict(connections_result.first()._mapping)
            
            return {
                "table_statistics": table_stats,
                "connections": connections_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get database performance metrics: {e}")
            return {"error": str(e)}
    
    async def _get_booking_stats(self, db_session: AsyncSession, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get booking statistics for the given time period"""
        try:
            stats_query = text("""
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(*) FILTER (WHERE status = 'confirmed') as successful_bookings,
                    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_bookings
                FROM appointments 
                WHERE created_at BETWEEN :start_time AND :end_time
            """)
            
            result = await db_session.execute(
                stats_query, 
                {"start_time": start_time, "end_time": end_time}
            )
            stats = dict(result.first()._mapping)
            
            total = stats.get("total_bookings", 0)
            successful = stats.get("successful_bookings", 0)
            
            stats["success_rate"] = successful / total if total > 0 else 1.0
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get booking stats: {e}")
            return {"error": str(e), "success_rate": 0.0}
    
    async def _get_payment_stats(self, db_session: AsyncSession, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get payment statistics for the given time period"""
        try:
            stats_query = text("""
                SELECT 
                    COUNT(*) as total_payments,
                    COUNT(*) FILTER (WHERE status = 'succeeded') as successful_payments,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
                    SUM(amount) FILTER (WHERE status = 'succeeded') as total_revenue
                FROM payments 
                WHERE created_at BETWEEN :start_time AND :end_time
            """)
            
            result = await db_session.execute(
                stats_query, 
                {"start_time": start_time, "end_time": end_time}
            )
            stats = dict(result.first()._mapping)
            
            total = stats.get("total_payments", 0)
            successful = stats.get("successful_payments", 0)
            
            stats["success_rate"] = successful / total if total > 0 else 1.0
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get payment stats: {e}")
            return {"error": str(e), "success_rate": 0.0}
    
    async def _get_active_user_count(self, db_session: AsyncSession, start_time: datetime, end_time: datetime) -> int:
        """Get active user count for the given time period"""
        try:
            count_query = text("""
                SELECT COUNT(DISTINCT user_id) as active_users
                FROM user_sessions 
                WHERE last_activity BETWEEN :start_time AND :end_time
            """)
            
            result = await db_session.execute(
                count_query, 
                {"start_time": start_time, "end_time": end_time}
            )
            
            return result.scalar() or 0
            
        except Exception as e:
            logger.error(f"Failed to get active user count: {e}")
            return 0


# Global health monitor instance
health_monitor = ProductionHealthMonitor()

# Convenience functions
async def get_system_health(db_session: AsyncSession, redis_client) -> SystemHealthReport:
    """Get comprehensive system health report"""
    return await health_monitor.perform_comprehensive_health_check(db_session, redis_client)

async def get_database_health(db_session: AsyncSession) -> HealthCheckResult:
    """Get database health status"""
    return await health_monitor.check_database_health(db_session)

async def get_redis_health(redis_client) -> HealthCheckResult:
    """Get Redis health status"""
    return await health_monitor.check_redis_health(redis_client)

def get_system_resources_health() -> HealthCheckResult:
    """Get system resource health status"""
    return health_monitor.check_system_resources()