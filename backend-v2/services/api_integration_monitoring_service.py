"""
API Integration Monitoring and Observability Service

This service provides comprehensive monitoring and observability for all API integrations:
- Real-time performance metrics and dashboards
- Health checks and status monitoring
- Error tracking and alerting
- SLA monitoring and reporting
- Integration performance analytics
- Automated incident response
"""

import asyncio
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import text

from config import settings
from models import Integration, IntegrationType
from services.redis_service import RedisService
from services.enhanced_circuit_breaker_service import circuit_breaker_manager
from utils.email_sender import send_alert_email

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class IntegrationStatus(Enum):
    """Integration health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class IntegrationHealth:
    """Health status for an integration"""
    service_name: str
    status: IntegrationStatus
    last_check: datetime
    response_time_ms: float
    error_rate: float
    success_rate: float
    total_requests: int
    failed_requests: int
    circuit_breaker_state: str
    issues: List[str]
    uptime_percentage: float


@dataclass
class PerformanceMetrics:
    """Performance metrics for an integration"""
    service_name: str
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    requests_per_minute: float
    error_rate: float
    success_rate: float
    throughput: float
    availability: float
    total_requests: int
    period_start: datetime
    period_end: datetime


@dataclass
class Alert:
    """Alert information"""
    id: str
    service_name: str
    severity: AlertSeverity
    title: str
    description: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class APIIntegrationMonitoringService:
    """
    Comprehensive monitoring service for all API integrations
    """
    
    def __init__(self, db: Session, redis_service: RedisService = None):
        self.db = db
        self.redis = redis_service or RedisService()
        
        # Monitoring configuration
        self.health_check_interval = 60  # 1 minute
        self.metrics_collection_interval = 300  # 5 minutes
        self.alert_check_interval = 30  # 30 seconds
        
        # SLA thresholds
        self.sla_thresholds = {
            "stripe": {
                "availability": 99.9,
                "response_time_ms": 2000,
                "error_rate": 0.01
            },
            "google_calendar": {
                "availability": 99.5,
                "response_time_ms": 3000,
                "error_rate": 0.05
            },
            "sendgrid": {
                "availability": 99.0,
                "response_time_ms": 5000,
                "error_rate": 0.05
            },
            "twilio": {
                "availability": 99.5,
                "response_time_ms": 3000,
                "error_rate": 0.02
            },
            "google_my_business": {
                "availability": 99.0,
                "response_time_ms": 5000,
                "error_rate": 0.1
            }
        }
        
        # Alert configuration
        self.alert_thresholds = {
            "error_rate_critical": 0.1,  # 10% error rate
            "error_rate_warning": 0.05,   # 5% error rate
            "response_time_critical": 10000,  # 10 seconds
            "response_time_warning": 5000,    # 5 seconds
            "availability_critical": 95.0,     # 95% availability
            "availability_warning": 98.0       # 98% availability
        }
        
        # Active alerts
        self.active_alerts: Dict[str, Alert] = {}
        
        # Monitoring tasks
        self._monitoring_tasks = []
        
    async def start_monitoring(self) -> Dict[str, Any]:
        """Start all monitoring tasks"""
        try:
            # Start health check monitoring
            health_task = asyncio.create_task(self._health_check_loop())
            self._monitoring_tasks.append(health_task)
            
            # Start metrics collection
            metrics_task = asyncio.create_task(self._metrics_collection_loop())
            self._monitoring_tasks.append(metrics_task)
            
            # Start alert processing
            alert_task = asyncio.create_task(self._alert_processing_loop())
            self._monitoring_tasks.append(alert_task)
            
            # Start SLA monitoring
            sla_task = asyncio.create_task(self._sla_monitoring_loop())
            self._monitoring_tasks.append(sla_task)
            
            # Store monitoring start time
            await self.redis.set(
                "api_monitoring_started",
                datetime.utcnow().isoformat()
            )
            
            logger.info("API integration monitoring started successfully")
            
            return {
                "success": True,
                "monitoring_tasks_started": len(self._monitoring_tasks),
                "health_check_interval": self.health_check_interval,
                "metrics_interval": self.metrics_collection_interval,
                "services_monitored": list(self.sla_thresholds.keys())
            }
            
        except Exception as e:
            logger.error(f"Failed to start API integration monitoring: {str(e)}")
            raise
    
    async def _health_check_loop(self):
        """Continuous health check monitoring loop"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Perform health checks for all services
                for service in self.sla_thresholds.keys():
                    try:
                        health_status = await self._perform_health_check(service)
                        await self._store_health_status(service, health_status)
                        
                        # Check for alert conditions
                        await self._check_health_alerts(service, health_status)
                        
                    except Exception as e:
                        logger.error(f"Health check failed for {service}: {str(e)}")
                        
            except Exception as e:
                logger.error(f"Error in health check loop: {str(e)}")
    
    async def _metrics_collection_loop(self):
        """Continuous metrics collection loop"""
        while True:
            try:
                await asyncio.sleep(self.metrics_collection_interval)
                
                # Collect performance metrics for all services
                for service in self.sla_thresholds.keys():
                    try:
                        metrics = await self._collect_performance_metrics(service)
                        await self._store_performance_metrics(service, metrics)
                        
                    except Exception as e:
                        logger.error(f"Metrics collection failed for {service}: {str(e)}")
                        
            except Exception as e:
                logger.error(f"Error in metrics collection loop: {str(e)}")
    
    async def _alert_processing_loop(self):
        """Continuous alert processing loop"""
        while True:
            try:
                await asyncio.sleep(self.alert_check_interval)
                
                # Process alerts for all services
                await self._process_alerts()
                
                # Clean up resolved alerts
                await self._cleanup_resolved_alerts()
                
            except Exception as e:
                logger.error(f"Error in alert processing loop: {str(e)}")
    
    async def _sla_monitoring_loop(self):
        """Continuous SLA monitoring loop"""
        while True:
            try:
                await asyncio.sleep(3600)  # Check SLA compliance every hour
                
                # Generate SLA reports for all services
                for service in self.sla_thresholds.keys():
                    try:
                        sla_report = await self._generate_sla_report(service)
                        await self._store_sla_report(service, sla_report)
                        
                        # Check for SLA violations
                        await self._check_sla_violations(service, sla_report)
                        
                    except Exception as e:
                        logger.error(f"SLA monitoring failed for {service}: {str(e)}")
                        
            except Exception as e:
                logger.error(f"Error in SLA monitoring loop: {str(e)}")
    
    async def _perform_health_check(self, service: str) -> IntegrationHealth:
        """Perform comprehensive health check for a service"""
        start_time = time.time()
        issues = []
        
        try:
            # Get circuit breaker status
            circuit_breaker = circuit_breaker_manager.get_circuit_breaker(service)
            cb_state = circuit_breaker.state.value if circuit_breaker else "unknown"
            cb_metrics = circuit_breaker.get_metrics() if circuit_breaker else {}
            
            # Get recent metrics from Redis
            metrics_key = f"api_metrics_{service}"
            recent_metrics = await self.redis.get(metrics_key)
            
            if recent_metrics:
                metrics_data = json.loads(recent_metrics)
                
                total_requests = metrics_data.get("total_requests", 0)
                success_count = metrics_data.get("success_count", 0)
                error_count = metrics_data.get("error_count", 0)
                avg_response_time = metrics_data.get("avg_response_time_ms", 0)
                
                error_rate = error_count / max(total_requests, 1)
                success_rate = success_count / max(total_requests, 1)
                
                # Determine status based on thresholds
                thresholds = self.sla_thresholds.get(service, {})
                
                status = IntegrationStatus.HEALTHY
                
                if cb_state == "open":
                    status = IntegrationStatus.CRITICAL
                    issues.append("Circuit breaker is open")
                
                if error_rate > self.alert_thresholds["error_rate_critical"]:
                    status = IntegrationStatus.CRITICAL
                    issues.append(f"High error rate: {error_rate:.2%}")
                elif error_rate > self.alert_thresholds["error_rate_warning"]:
                    if status != IntegrationStatus.CRITICAL:
                        status = IntegrationStatus.DEGRADED
                    issues.append(f"Elevated error rate: {error_rate:.2%}")
                
                if avg_response_time > self.alert_thresholds["response_time_critical"]:
                    status = IntegrationStatus.CRITICAL
                    issues.append(f"Very slow response time: {avg_response_time:.0f}ms")
                elif avg_response_time > self.alert_thresholds["response_time_warning"]:
                    if status != IntegrationStatus.CRITICAL:
                        status = IntegrationStatus.DEGRADED
                    issues.append(f"Slow response time: {avg_response_time:.0f}ms")
                
                # Calculate uptime percentage (simplified)
                uptime_percentage = success_rate * 100
                
            else:
                # No recent metrics available
                status = IntegrationStatus.UNKNOWN
                total_requests = 0
                error_count = 0
                error_rate = 0.0
                success_rate = 0.0
                avg_response_time = 0.0
                uptime_percentage = 0.0
                issues.append("No recent metrics available")
            
            health_check_time = (time.time() - start_time) * 1000
            
            return IntegrationHealth(
                service_name=service,
                status=status,
                last_check=datetime.utcnow(),
                response_time_ms=health_check_time,
                error_rate=error_rate,
                success_rate=success_rate,
                total_requests=total_requests,
                failed_requests=error_count,
                circuit_breaker_state=cb_state,
                issues=issues,
                uptime_percentage=uptime_percentage
            )
            
        except Exception as e:
            logger.error(f"Health check failed for {service}: {str(e)}")
            return IntegrationHealth(
                service_name=service,
                status=IntegrationStatus.CRITICAL,
                last_check=datetime.utcnow(),
                response_time_ms=0.0,
                error_rate=1.0,
                success_rate=0.0,
                total_requests=0,
                failed_requests=0,
                circuit_breaker_state="unknown",
                issues=[f"Health check failed: {str(e)}"],
                uptime_percentage=0.0
            )
    
    async def _store_health_status(self, service: str, health: IntegrationHealth):
        """Store health status in Redis"""
        health_key = f"api_health_{service}"
        health_data = asdict(health)
        health_data["last_check"] = health.last_check.isoformat()
        health_data["status"] = health.status.value
        
        await self.redis.setex(
            health_key,
            300,  # 5 minutes TTL
            json.dumps(health_data)
        )
    
    async def _collect_performance_metrics(self, service: str) -> PerformanceMetrics:
        """Collect comprehensive performance metrics for a service"""
        try:
            # Get metrics from circuit breaker
            circuit_breaker = circuit_breaker_manager.get_circuit_breaker(service)
            cb_metrics = circuit_breaker.get_metrics() if circuit_breaker else {}
            
            # Get historical data from Redis (simplified - in production, use time series DB)
            metrics_key = f"api_metrics_{service}"
            current_metrics = await self.redis.get(metrics_key)
            
            if current_metrics:
                metrics_data = json.loads(current_metrics)
                
                total_requests = metrics_data.get("total_requests", 0)
                successful_requests = metrics_data.get("successful_requests", 0)
                avg_response_time = metrics_data.get("avg_response_time_ms", 0)
                
                # Calculate derived metrics
                error_rate = 1 - (successful_requests / max(total_requests, 1))
                success_rate = successful_requests / max(total_requests, 1)
                
                # Simplified percentile calculations (in production, use proper histograms)
                p95_response_time = avg_response_time * 1.5
                p99_response_time = avg_response_time * 2.0
                
                # Calculate requests per minute (simplified)
                requests_per_minute = total_requests / 60  # Assuming 1-minute window
                
                return PerformanceMetrics(
                    service_name=service,
                    avg_response_time_ms=avg_response_time,
                    p95_response_time_ms=p95_response_time,
                    p99_response_time_ms=p99_response_time,
                    requests_per_minute=requests_per_minute,
                    error_rate=error_rate,
                    success_rate=success_rate,
                    throughput=requests_per_minute,
                    availability=success_rate * 100,
                    total_requests=total_requests,
                    period_start=datetime.utcnow() - timedelta(minutes=5),
                    period_end=datetime.utcnow()
                )
            else:
                # Return empty metrics
                return PerformanceMetrics(
                    service_name=service,
                    avg_response_time_ms=0.0,
                    p95_response_time_ms=0.0,
                    p99_response_time_ms=0.0,
                    requests_per_minute=0.0,
                    error_rate=0.0,
                    success_rate=0.0,
                    throughput=0.0,
                    availability=0.0,
                    total_requests=0,
                    period_start=datetime.utcnow() - timedelta(minutes=5),
                    period_end=datetime.utcnow()
                )
                
        except Exception as e:
            logger.error(f"Failed to collect performance metrics for {service}: {str(e)}")
            raise
    
    async def _store_performance_metrics(self, service: str, metrics: PerformanceMetrics):
        """Store performance metrics in Redis"""
        metrics_key = f"api_performance_{service}_{int(time.time())}"
        metrics_data = asdict(metrics)
        metrics_data["period_start"] = metrics.period_start.isoformat()
        metrics_data["period_end"] = metrics.period_end.isoformat()
        
        # Store with TTL of 7 days
        await self.redis.setex(
            metrics_key,
            604800,  # 7 days
            json.dumps(metrics_data)
        )
        
        # Also store latest metrics for quick access
        latest_key = f"api_performance_latest_{service}"
        await self.redis.setex(
            latest_key,
            3600,  # 1 hour
            json.dumps(metrics_data)
        )
    
    async def _check_health_alerts(self, service: str, health: IntegrationHealth):
        """Check for alert conditions based on health status"""
        try:
            # Critical alerts
            if health.status == IntegrationStatus.CRITICAL:
                await self._create_alert(
                    service=service,
                    severity=AlertSeverity.CRITICAL,
                    title=f"{service} Service Critical",
                    description=f"Service is in critical state. Issues: {', '.join(health.issues)}",
                    metadata={"health_status": asdict(health)}
                )
            
            # Warning alerts
            elif health.status == IntegrationStatus.DEGRADED:
                await self._create_alert(
                    service=service,
                    severity=AlertSeverity.WARNING,
                    title=f"{service} Service Degraded",
                    description=f"Service performance is degraded. Issues: {', '.join(health.issues)}",
                    metadata={"health_status": asdict(health)}
                )
            
            # Resolution alerts
            elif health.status == IntegrationStatus.HEALTHY:
                await self._resolve_alerts(service)
                
        except Exception as e:
            logger.error(f"Failed to check health alerts for {service}: {str(e)}")
    
    async def _create_alert(
        self,
        service: str,
        severity: AlertSeverity,
        title: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create or update an alert"""
        alert_id = f"{service}_{severity.value}_{int(time.time())}"
        
        # Check if similar alert already exists
        existing_alert_key = f"alert_{service}_{severity.value}"
        existing_alert = await self.redis.get(existing_alert_key)
        
        if existing_alert:
            # Update existing alert
            alert_data = json.loads(existing_alert)
            alert_data["description"] = description
            alert_data["metadata"] = metadata
        else:
            # Create new alert
            alert = Alert(
                id=alert_id,
                service_name=service,
                severity=severity,
                title=title,
                description=description,
                created_at=datetime.utcnow(),
                metadata=metadata
            )
            
            alert_data = asdict(alert)
            alert_data["created_at"] = alert.created_at.isoformat()
            
            # Store alert
            await self.redis.setex(
                existing_alert_key,
                3600,  # 1 hour TTL
                json.dumps(alert_data)
            )
            
            # Send notification for critical alerts
            if severity == AlertSeverity.CRITICAL:
                await self._send_alert_notification(alert)
            
            logger.warning(f"Alert created: {title} - {description}")
    
    async def _resolve_alerts(self, service: str):
        """Resolve all alerts for a service"""
        try:
            # Find and resolve alerts for the service
            for severity in AlertSeverity:
                alert_key = f"alert_{service}_{severity.value}"
                existing_alert = await self.redis.get(alert_key)
                
                if existing_alert:
                    alert_data = json.loads(existing_alert)
                    alert_data["resolved_at"] = datetime.utcnow().isoformat()
                    
                    # Store resolved alert
                    resolved_key = f"alert_resolved_{service}_{severity.value}_{int(time.time())}"
                    await self.redis.setex(
                        resolved_key,
                        86400,  # 24 hours
                        json.dumps(alert_data)
                    )
                    
                    # Remove active alert
                    await self.redis.delete(alert_key)
                    
                    logger.info(f"Alert resolved for {service}: {alert_data.get('title')}")
                    
        except Exception as e:
            logger.error(f"Failed to resolve alerts for {service}: {str(e)}")
    
    async def _send_alert_notification(self, alert: Alert):
        """Send alert notification"""
        try:
            # Send email notification (if configured)
            if hasattr(settings, 'ALERT_EMAIL_RECIPIENTS') and settings.ALERT_EMAIL_RECIPIENTS:
                await send_alert_email(
                    recipients=settings.ALERT_EMAIL_RECIPIENTS,
                    subject=f"[{alert.severity.value.upper()}] {alert.title}",
                    message=alert.description,
                    alert_data=alert.metadata
                )
            
            # Additional notification channels can be added here
            # (Slack, PagerDuty, etc.)
            
        except Exception as e:
            logger.error(f"Failed to send alert notification: {str(e)}")
    
    async def _process_alerts(self):
        """Process and manage alerts"""
        try:
            # This is a placeholder for alert processing logic
            # In a full implementation, this would handle:
            # - Alert escalation
            # - Auto-remediation
            # - Alert grouping and deduplication
            pass
            
        except Exception as e:
            logger.error(f"Error processing alerts: {str(e)}")
    
    async def _cleanup_resolved_alerts(self):
        """Clean up old resolved alerts"""
        try:
            # This would clean up old resolved alerts from Redis
            # Implementation depends on Redis key patterns used
            pass
            
        except Exception as e:
            logger.error(f"Error cleaning up resolved alerts: {str(e)}")
    
    async def _generate_sla_report(self, service: str) -> Dict[str, Any]:
        """Generate SLA compliance report for a service"""
        try:
            # Get SLA thresholds
            thresholds = self.sla_thresholds.get(service, {})
            
            # Get recent performance metrics
            latest_metrics_key = f"api_performance_latest_{service}"
            latest_metrics = await self.redis.get(latest_metrics_key)
            
            if latest_metrics:
                metrics_data = json.loads(latest_metrics)
                
                # Check SLA compliance
                sla_compliance = {
                    "availability": {
                        "target": thresholds.get("availability", 99.0),
                        "actual": metrics_data.get("availability", 0.0),
                        "compliant": metrics_data.get("availability", 0.0) >= thresholds.get("availability", 99.0)
                    },
                    "response_time": {
                        "target_ms": thresholds.get("response_time_ms", 5000),
                        "actual_ms": metrics_data.get("avg_response_time_ms", 0.0),
                        "compliant": metrics_data.get("avg_response_time_ms", 0.0) <= thresholds.get("response_time_ms", 5000)
                    },
                    "error_rate": {
                        "target": thresholds.get("error_rate", 0.05),
                        "actual": metrics_data.get("error_rate", 0.0),
                        "compliant": metrics_data.get("error_rate", 0.0) <= thresholds.get("error_rate", 0.05)
                    }
                }
                
                overall_compliant = all(
                    metric["compliant"] for metric in sla_compliance.values()
                )
                
                return {
                    "service": service,
                    "period_start": metrics_data.get("period_start"),
                    "period_end": metrics_data.get("period_end"),
                    "overall_compliant": overall_compliant,
                    "sla_compliance": sla_compliance,
                    "violations": [
                        metric_name for metric_name, metric in sla_compliance.items()
                        if not metric["compliant"]
                    ]
                }
            else:
                return {
                    "service": service,
                    "error": "No metrics available for SLA calculation"
                }
                
        except Exception as e:
            logger.error(f"Failed to generate SLA report for {service}: {str(e)}")
            return {
                "service": service,
                "error": str(e)
            }
    
    async def _store_sla_report(self, service: str, report: Dict[str, Any]):
        """Store SLA report in Redis"""
        report_key = f"sla_report_{service}_{int(time.time())}"
        
        await self.redis.setex(
            report_key,
            86400,  # 24 hours
            json.dumps(report, default=str)
        )
    
    async def _check_sla_violations(self, service: str, report: Dict[str, Any]):
        """Check for SLA violations and create alerts"""
        try:
            if not report.get("overall_compliant", True):
                violations = report.get("violations", [])
                
                await self._create_alert(
                    service=service,
                    severity=AlertSeverity.WARNING,
                    title=f"{service} SLA Violation",
                    description=f"SLA violations detected: {', '.join(violations)}",
                    metadata={"sla_report": report}
                )
                
        except Exception as e:
            logger.error(f"Failed to check SLA violations for {service}: {str(e)}")
    
    async def get_monitoring_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive monitoring dashboard data"""
        try:
            dashboard_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "services": {},
                "overall_status": "healthy",
                "active_alerts": [],
                "sla_compliance": {}
            }
            
            critical_count = 0
            degraded_count = 0
            
            # Get status for each service
            for service in self.sla_thresholds.keys():
                # Get health status
                health_key = f"api_health_{service}"
                health_data = await self.redis.get(health_key)
                
                if health_data:
                    health_info = json.loads(health_data)
                    dashboard_data["services"][service] = health_info
                    
                    if health_info["status"] == "critical":
                        critical_count += 1
                    elif health_info["status"] == "degraded":
                        degraded_count += 1
                
                # Get latest performance metrics
                perf_key = f"api_performance_latest_{service}"
                perf_data = await self.redis.get(perf_key)
                
                if perf_data:
                    perf_info = json.loads(perf_data)
                    dashboard_data["services"][service]["performance"] = perf_info
                
                # Check for active alerts
                for severity in AlertSeverity:
                    alert_key = f"alert_{service}_{severity.value}"
                    alert_data = await self.redis.get(alert_key)
                    
                    if alert_data:
                        alert_info = json.loads(alert_data)
                        dashboard_data["active_alerts"].append(alert_info)
            
            # Determine overall status
            if critical_count > 0:
                dashboard_data["overall_status"] = "critical"
            elif degraded_count > 0:
                dashboard_data["overall_status"] = "degraded"
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Failed to get monitoring dashboard: {str(e)}")
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def get_service_metrics(self, service: str, hours: int = 24) -> Dict[str, Any]:
        """Get detailed metrics for a specific service"""
        try:
            # Get recent metrics (simplified implementation)
            latest_key = f"api_performance_latest_{service}"
            latest_data = await self.redis.get(latest_key)
            
            health_key = f"api_health_{service}"
            health_data = await self.redis.get(health_key)
            
            result = {
                "service": service,
                "period_hours": hours,
                "current_health": json.loads(health_data) if health_data else None,
                "current_performance": json.loads(latest_data) if latest_data else None,
                "sla_thresholds": self.sla_thresholds.get(service, {}),
                "historical_data": []  # Would be populated from time series data
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get service metrics for {service}: {str(e)}")
            return {
                "service": service,
                "error": str(e)
            }
    
    async def stop_monitoring(self):
        """Stop all monitoring tasks"""
        try:
            # Cancel all monitoring tasks
            for task in self._monitoring_tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            self._monitoring_tasks.clear()
            
            # Clear monitoring status
            await self.redis.delete("api_monitoring_started")
            
            logger.info("API integration monitoring stopped")
            
        except Exception as e:
            logger.error(f"Error stopping monitoring: {str(e)}")
    
    async def cleanup(self):
        """Clean up monitoring service resources"""
        await self.stop_monitoring()
        logger.info("API integration monitoring service cleanup completed")