"""
Site Reliability Engineering (SRE) Orchestrator
Central coordinator for all SRE functions to achieve 99.99% uptime
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json

from services.redis_service import cache_service
from services.sentry_monitoring import sentry_service


class IncidentSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high" 
    MEDIUM = "medium"
    LOW = "low"


class ServiceStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheck:
    name: str
    status: ServiceStatus
    response_time_ms: float
    last_check: datetime
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Incident:
    id: str
    title: str
    severity: IncidentSeverity
    status: str  # "open", "investigating", "resolved"
    created_at: datetime
    services_affected: List[str]
    description: str
    timeline: List[Dict[str, Any]] = field(default_factory=list)
    mttr_target_minutes: int = 5  # Mean Time To Recovery target
    

class SREOrchestrator:
    """
    Central SRE orchestrator managing all reliability functions
    Target: 99.99% uptime (52.6 minutes downtime/year max)
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.health_checks: Dict[str, HealthCheck] = {}
        self.active_incidents: Dict[str, Incident] = {}
        self.circuit_breakers: Dict[str, dict] = {}
        self.metrics_buffer: List[Dict[str, Any]] = []
        
        # SRE targets
        self.uptime_target = 99.99  # 99.99% uptime target
        self.incident_detection_target_seconds = 30  # <30s detection
        self.mttr_target_minutes = 5  # <5min recovery
        self.error_rate_threshold = 0.001  # <0.1% error rate
        
        # Initialize health check schedule
        self.health_check_interval = 15  # seconds
        self.dependency_check_interval = 60  # seconds
        
        self.logger.info("🚀 SRE Orchestrator initialized with 99.99% uptime target")
    
    async def start_monitoring(self):
        """Start all SRE monitoring processes"""
        try:
            self.logger.info("🎯 Starting comprehensive SRE monitoring...")
            
            # Start background monitoring tasks
            tasks = [
                self._health_check_loop(),
                self._dependency_monitoring_loop(),
                self._incident_detection_loop(),
                self._metrics_collection_loop(),
                self._auto_recovery_loop()
            ]
            
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"❌ SRE monitoring startup failed: {e}")
            await self._create_incident(
                "SRE_MONITORING_FAILURE",
                IncidentSeverity.CRITICAL,
                f"SRE monitoring system failed to start: {e}",
                ["sre-system"]
            )
    
    async def _health_check_loop(self):
        """Continuous health checking with <30s incident detection"""
        while True:
            try:
                start_time = time.time()
                
                # Run all health checks in parallel
                health_tasks = [
                    self._check_database_health(),
                    self._check_redis_health(),
                    self._check_api_health(),
                    self._check_frontend_health(),
                    self._check_system_resources()
                ]
                
                results = await asyncio.gather(*health_tasks, return_exceptions=True)
                
                # Process health check results
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        self.logger.error(f"Health check {i} failed: {result}")
                        await self._handle_health_check_failure(f"health_check_{i}", str(result))
                
                # Check if any critical services are down
                critical_down = [
                    check for check in self.health_checks.values() 
                    if check.status == ServiceStatus.UNHEALTHY and 
                    check.name in ["database", "redis", "api"]
                ]
                
                if critical_down:
                    await self._trigger_critical_incident(critical_down)
                
                # Sleep for remaining interval time
                elapsed = time.time() - start_time
                sleep_time = max(0, self.health_check_interval - elapsed)
                await asyncio.sleep(sleep_time)
                
            except Exception as e:
                self.logger.error(f"❌ Health check loop error: {e}")
                await asyncio.sleep(self.health_check_interval)
    
    async def _check_database_health(self) -> HealthCheck:
        """Check database connectivity and performance"""
        start_time = time.time()
        
        try:
            from db import get_db
            from sqlalchemy import text
            
            # Test database connection and basic query
            with next(get_db()) as db:
                db.execute(text("SELECT 1"))
                
            response_time = (time.time() - start_time) * 1000
            
            # Check if response time is acceptable (<1000ms)
            status = ServiceStatus.HEALTHY
            if response_time > 1000:
                status = ServiceStatus.DEGRADED
            elif response_time > 5000:
                status = ServiceStatus.UNHEALTHY
            
            health_check = HealthCheck(
                name="database",
                status=status,
                response_time_ms=response_time,
                last_check=datetime.utcnow(),
                metadata={"query_time_ms": response_time}
            )
            
            self.health_checks["database"] = health_check
            return health_check
            
        except Exception as e:
            health_check = HealthCheck(
                name="database",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            
            self.health_checks["database"] = health_check
            return health_check
    
    async def _check_redis_health(self) -> HealthCheck:
        """Check Redis connectivity and performance"""
        start_time = time.time()
        
        try:
            # Test Redis operations
            test_key = f"sre_health_check_{int(time.time())}"
            cache_service.set(test_key, "healthy", ttl=10)
            value = cache_service.get(test_key)
            cache_service.delete(test_key)
            
            response_time = (time.time() - start_time) * 1000
            
            status = ServiceStatus.HEALTHY
            if response_time > 100:
                status = ServiceStatus.DEGRADED
            elif response_time > 1000 or value != "healthy":
                status = ServiceStatus.UNHEALTHY
            
            health_check = HealthCheck(
                name="redis",
                status=status,
                response_time_ms=response_time,
                last_check=datetime.utcnow(),
                metadata={"operation_time_ms": response_time}
            )
            
            self.health_checks["redis"] = health_check
            return health_check
            
        except Exception as e:
            health_check = HealthCheck(
                name="redis",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            
            self.health_checks["redis"] = health_check
            return health_check
    
    async def _check_api_health(self) -> HealthCheck:
        """Check API endpoint health and performance"""
        start_time = time.time()
        
        try:
            import httpx
            
            # Test critical API endpoints
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8000/health/", timeout=5.0)
                
            response_time = (time.time() - start_time) * 1000
            
            status = ServiceStatus.HEALTHY
            if response.status_code != 200:
                status = ServiceStatus.UNHEALTHY
            elif response_time > 1000:
                status = ServiceStatus.DEGRADED
            
            health_check = HealthCheck(
                name="api",
                status=status,
                response_time_ms=response_time,
                last_check=datetime.utcnow(),
                metadata={
                    "status_code": response.status_code,
                    "response_time_ms": response_time
                }
            )
            
            self.health_checks["api"] = health_check
            return health_check
            
        except Exception as e:
            health_check = HealthCheck(
                name="api",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            
            self.health_checks["api"] = health_check
            return health_check
    
    async def _check_frontend_health(self) -> HealthCheck:
        """Check frontend availability"""
        start_time = time.time()
        
        try:
            import httpx
            
            # Test frontend health
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:3000/", timeout=10.0)
                
            response_time = (time.time() - start_time) * 1000
            
            status = ServiceStatus.HEALTHY
            if response.status_code != 200:
                status = ServiceStatus.UNHEALTHY
            elif response_time > 2000:
                status = ServiceStatus.DEGRADED
            
            health_check = HealthCheck(
                name="frontend",
                status=status,
                response_time_ms=response_time,
                last_check=datetime.utcnow(),
                metadata={
                    "status_code": response.status_code,
                    "response_time_ms": response_time
                }
            )
            
            self.health_checks["frontend"] = health_check
            return health_check
            
        except Exception as e:
            health_check = HealthCheck(
                name="frontend",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            
            self.health_checks["frontend"] = health_check
            return health_check
    
    async def _check_system_resources(self) -> HealthCheck:
        """Check system resource utilization"""
        start_time = time.time()
        
        try:
            import psutil
            
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Determine status based on thresholds
            status = ServiceStatus.HEALTHY
            if cpu_percent > 80 or memory.percent > 80 or disk.percent > 85:
                status = ServiceStatus.DEGRADED
            if cpu_percent > 95 or memory.percent > 95 or disk.percent > 95:
                status = ServiceStatus.UNHEALTHY
            
            health_check = HealthCheck(
                name="system_resources",
                status=status,
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow(),
                metadata={
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "disk_percent": disk.percent
                }
            )
            
            self.health_checks["system_resources"] = health_check
            return health_check
            
        except Exception as e:
            health_check = HealthCheck(
                name="system_resources",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=(time.time() - start_time) * 1000,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            
            self.health_checks["system_resources"] = health_check
            return health_check
    
    async def _dependency_monitoring_loop(self):
        """Monitor external dependencies"""
        while True:
            try:
                # Check external services
                dependency_tasks = [
                    self._check_stripe_dependency(),
                    self._check_sendgrid_dependency(),
                    self._check_twilio_dependency()
                ]
                
                await asyncio.gather(*dependency_tasks, return_exceptions=True)
                await asyncio.sleep(self.dependency_check_interval)
                
            except Exception as e:
                self.logger.error(f"❌ Dependency monitoring error: {e}")
                await asyncio.sleep(self.dependency_check_interval)
    
    async def _check_stripe_dependency(self):
        """Check Stripe API health"""
        try:
            from config import settings
            if not settings.stripe_secret_key:
                return
                
            import stripe
            stripe.api_key = settings.stripe_secret_key
            
            start_time = time.time()
            account = stripe.Account.retrieve()
            response_time = (time.time() - start_time) * 1000
            
            self.health_checks["stripe"] = HealthCheck(
                name="stripe",
                status=ServiceStatus.HEALTHY,
                response_time_ms=response_time,
                last_check=datetime.utcnow(),
                metadata={"account_id": account.id}
            )
            
        except Exception as e:
            self.health_checks["stripe"] = HealthCheck(
                name="stripe",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_sendgrid_dependency(self):
        """Check SendGrid API health"""
        try:
            from config import settings
            if not settings.sendgrid_api_key:
                return
                
            import sendgrid
            sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
            
            start_time = time.time()
            response = sg.client.user.profile.get()
            response_time = (time.time() - start_time) * 1000
            
            status = ServiceStatus.HEALTHY if response.status_code == 200 else ServiceStatus.UNHEALTHY
            
            self.health_checks["sendgrid"] = HealthCheck(
                name="sendgrid",
                status=status,
                response_time_ms=response_time,
                last_check=datetime.utcnow(),
                metadata={"status_code": response.status_code}
            )
            
        except Exception as e:
            self.health_checks["sendgrid"] = HealthCheck(
                name="sendgrid",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _check_twilio_dependency(self):
        """Check Twilio API health"""
        try:
            from config import settings
            if not settings.twilio_account_sid or not settings.twilio_auth_token:
                return
                
            from twilio.rest import Client
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            
            start_time = time.time()
            account = client.api.accounts(settings.twilio_account_sid).fetch()
            response_time = (time.time() - start_time) * 1000
            
            self.health_checks["twilio"] = HealthCheck(
                name="twilio",
                status=ServiceStatus.HEALTHY,
                response_time_ms=response_time,
                last_check=datetime.utcnow(),
                metadata={"account_status": account.status}
            )
            
        except Exception as e:
            self.health_checks["twilio"] = HealthCheck(
                name="twilio",
                status=ServiceStatus.UNHEALTHY,
                response_time_ms=0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _incident_detection_loop(self):
        """Automated incident detection with <30s response time"""
        while True:
            try:
                current_time = datetime.utcnow()
                
                # Check for service failures
                for service_name, health_check in self.health_checks.items():
                    if health_check.status == ServiceStatus.UNHEALTHY:
                        await self._evaluate_incident(service_name, health_check)
                
                # Check for performance degradation
                await self._check_performance_degradation()
                
                # Check for error rate spikes
                await self._check_error_rate_spikes()
                
                await asyncio.sleep(10)  # Check every 10 seconds for fast detection
                
            except Exception as e:
                self.logger.error(f"❌ Incident detection error: {e}")
                await asyncio.sleep(10)
    
    async def _evaluate_incident(self, service_name: str, health_check: HealthCheck):
        """Evaluate if an incident should be created"""
        incident_id = f"{service_name}_failure_{int(time.time())}"
        
        # Check if we already have an active incident for this service
        existing_incident = None
        for incident in self.active_incidents.values():
            if service_name in incident.services_affected and incident.status == "open":
                existing_incident = incident
                break
        
        if existing_incident:
            # Update existing incident
            existing_incident.timeline.append({
                "timestamp": datetime.utcnow().isoformat(),
                "event": f"Service {service_name} still unhealthy",
                "details": health_check.error_message or "Service check failed"
            })
        else:
            # Create new incident
            severity = IncidentSeverity.CRITICAL if service_name in ["database", "api"] else IncidentSeverity.HIGH
            
            await self._create_incident(
                incident_id,
                severity,
                f"{service_name.title()} service failure detected",
                [service_name],
                health_check.error_message
            )
    
    async def _create_incident(self, incident_id: str, severity: IncidentSeverity, 
                             title: str, services_affected: List[str], description: str = ""):
        """Create a new incident with automated response"""
        
        incident = Incident(
            id=incident_id,
            title=title,
            severity=severity,
            status="open",
            created_at=datetime.utcnow(),
            services_affected=services_affected,
            description=description,
            timeline=[{
                "timestamp": datetime.utcnow().isoformat(),
                "event": "Incident created",
                "details": description
            }]
        )
        
        self.active_incidents[incident_id] = incident
        
        # Log incident
        self.logger.error(f"🚨 INCIDENT CREATED: {title} (ID: {incident_id}, Severity: {severity.value})")
        
        # Send to monitoring systems
        await self._notify_incident(incident)
        
        # Trigger automated response
        await self._trigger_automated_response(incident)
    
    async def _notify_incident(self, incident: Incident):
        """Notify monitoring systems and stakeholders"""
        try:
            # Send to Sentry
            if hasattr(sentry_service, 'capture_message'):
                sentry_service.capture_message(
                    f"SRE Incident: {incident.title}",
                    level="error" if incident.severity == IncidentSeverity.CRITICAL else "warning",
                    extra={
                        "incident_id": incident.id,
                        "severity": incident.severity.value,
                        "services_affected": incident.services_affected
                    }
                )
            
            # Store in Redis for dashboard
            incident_data = {
                "id": incident.id,
                "title": incident.title,
                "severity": incident.severity.value,
                "status": incident.status,
                "created_at": incident.created_at.isoformat(),
                "services_affected": incident.services_affected,
                "description": incident.description
            }
            
            cache_service.set(f"incident:{incident.id}", json.dumps(incident_data), ttl=86400)
            
        except Exception as e:
            self.logger.error(f"❌ Failed to notify incident: {e}")
    
    async def _trigger_automated_response(self, incident: Incident):
        """Trigger automated incident response procedures"""
        try:
            self.logger.info(f"🔧 Triggering automated response for incident {incident.id}")
            
            # Restart services if applicable
            for service in incident.services_affected:
                if service in ["api", "frontend"]:
                    await self._attempt_service_restart(service)
                elif service == "database":
                    await self._attempt_database_recovery()
                elif service == "redis":
                    await self._attempt_redis_recovery()
            
            # Implement circuit breakers
            await self._activate_circuit_breakers(incident.services_affected)
            
        except Exception as e:
            self.logger.error(f"❌ Automated response failed: {e}")
    
    async def _attempt_service_restart(self, service: str):
        """Attempt to restart a service (placeholder for actual restart logic)"""
        self.logger.info(f"🔄 Attempting restart of {service} service")
        # In production, this would trigger actual service restart via Kubernetes API
        # For now, we log the action
        
    async def _attempt_database_recovery(self):
        """Attempt database recovery procedures"""
        self.logger.info("🔄 Attempting database recovery procedures")
        # Implement database recovery logic
        
    async def _attempt_redis_recovery(self):
        """Attempt Redis recovery procedures"""
        self.logger.info("🔄 Attempting Redis recovery procedures")
        # Implement Redis recovery logic
    
    async def _activate_circuit_breakers(self, services: List[str]):
        """Activate circuit breakers for failing services"""
        for service in services:
            self.circuit_breakers[service] = {
                "status": "open",
                "activated_at": datetime.utcnow().isoformat(),
                "failure_count": self.circuit_breakers.get(service, {}).get("failure_count", 0) + 1
            }
            self.logger.warning(f"⚡ Circuit breaker activated for {service}")
    
    async def _check_performance_degradation(self):
        """Check for performance degradation patterns"""
        # Check response times
        slow_services = [
            name for name, check in self.health_checks.items()
            if check.response_time_ms > 2000  # 2 second threshold
        ]
        
        if slow_services:
            self.logger.warning(f"⚠️ Performance degradation detected in: {slow_services}")
    
    async def _check_error_rate_spikes(self):
        """Check for error rate spikes"""
        # This would integrate with application metrics
        # For now, we check health check failures
        failed_checks = [
            name for name, check in self.health_checks.items()
            if check.status == ServiceStatus.UNHEALTHY
        ]
        
        if len(failed_checks) > 2:  # More than 2 services failing
            await self._create_incident(
                f"error_spike_{int(time.time())}",
                IncidentSeverity.HIGH,
                "Multiple service failures detected",
                failed_checks,
                f"Services failing: {', '.join(failed_checks)}"
            )
    
    async def _metrics_collection_loop(self):
        """Collect and store SRE metrics"""
        while True:
            try:
                metrics = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "health_checks": {
                        name: {
                            "status": check.status.value,
                            "response_time_ms": check.response_time_ms,
                            "last_check": check.last_check.isoformat()
                        }
                        for name, check in self.health_checks.items()
                    },
                    "active_incidents": len(self.active_incidents),
                    "uptime_percentage": self._calculate_uptime(),
                    "mttr_current": self._calculate_current_mttr()
                }
                
                # Store in buffer
                self.metrics_buffer.append(metrics)
                
                # Keep only last 1000 metrics
                if len(self.metrics_buffer) > 1000:
                    self.metrics_buffer = self.metrics_buffer[-1000:]
                
                # Store in Redis for dashboard
                cache_service.set("sre:current_metrics", json.dumps(metrics), ttl=300)
                
                await asyncio.sleep(60)  # Collect every minute
                
            except Exception as e:
                self.logger.error(f"❌ Metrics collection error: {e}")
                await asyncio.sleep(60)
    
    async def _auto_recovery_loop(self):
        """Automated recovery procedures"""
        while True:
            try:
                # Check for incidents that can be auto-resolved
                for incident_id, incident in list(self.active_incidents.items()):
                    if await self._can_auto_resolve(incident):
                        await self._auto_resolve_incident(incident)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Auto-recovery error: {e}")
                await asyncio.sleep(30)
    
    async def _can_auto_resolve(self, incident: Incident) -> bool:
        """Check if an incident can be automatically resolved"""
        # Check if all affected services are now healthy
        for service in incident.services_affected:
            health_check = self.health_checks.get(service)
            if not health_check or health_check.status != ServiceStatus.HEALTHY:
                return False
        return True
    
    async def _auto_resolve_incident(self, incident: Incident):
        """Automatically resolve an incident"""
        incident.status = "resolved"
        incident.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event": "Auto-resolved - all services healthy",
            "details": "Automated recovery completed successfully"
        })
        
        # Calculate MTTR
        mttr_minutes = (datetime.utcnow() - incident.created_at).total_seconds() / 60
        
        self.logger.info(f"✅ Auto-resolved incident {incident.id} (MTTR: {mttr_minutes:.1f}min)")
        
        # Remove from active incidents
        if incident.id in self.active_incidents:
            del self.active_incidents[incident.id]
        
        # Update metrics
        await self._update_sla_metrics(incident, mttr_minutes)
    
    async def _update_sla_metrics(self, incident: Incident, mttr_minutes: float):
        """Update SLA metrics"""
        try:
            # Store incident metrics
            incident_metrics = {
                "incident_id": incident.id,
                "severity": incident.severity.value,
                "mttr_minutes": mttr_minutes,
                "services_affected": incident.services_affected,
                "resolved_at": datetime.utcnow().isoformat()
            }
            
            cache_service.set(f"sre:incident_metrics:{incident.id}", 
                            json.dumps(incident_metrics), ttl=86400 * 30)  # Keep for 30 days
            
        except Exception as e:
            self.logger.error(f"❌ Failed to update SLA metrics: {e}")
    
    def _calculate_uptime(self) -> float:
        """Calculate current uptime percentage"""
        healthy_services = sum(1 for check in self.health_checks.values() 
                             if check.status == ServiceStatus.HEALTHY)
        total_services = len(self.health_checks)
        
        if total_services == 0:
            return 100.0
        
        return (healthy_services / total_services) * 100.0
    
    def _calculate_current_mttr(self) -> float:
        """Calculate current Mean Time To Recovery"""
        if not self.active_incidents:
            return 0.0
        
        total_time = sum(
            (datetime.utcnow() - incident.created_at).total_seconds() / 60
            for incident in self.active_incidents.values()
        )
        
        return total_time / len(self.active_incidents)
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get current health summary for dashboards"""
        return {
            "overall_status": "healthy" if self._calculate_uptime() > 99.0 else "degraded",
            "uptime_percentage": self._calculate_uptime(),
            "active_incidents": len(self.active_incidents),
            "services_checked": len(self.health_checks),
            "last_check": datetime.utcnow().isoformat(),
            "mttr_current": self._calculate_current_mttr(),
            "sre_targets": {
                "uptime_target": self.uptime_target,
                "incident_detection_seconds": self.incident_detection_target_seconds,
                "mttr_target_minutes": self.mttr_target_minutes,
                "error_rate_threshold": self.error_rate_threshold
            }
        }


# Global SRE orchestrator instance
sre_orchestrator = SREOrchestrator()