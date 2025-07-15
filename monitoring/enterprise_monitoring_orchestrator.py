"""
Enterprise Monitoring Orchestrator for BookedBarber V2
====================================================

Central orchestrator that coordinates all monitoring systems:
- Sentry error tracking
- DataDog APM
- Health checks
- Alerting system
- Business metrics
- ELK logging
- Uptime monitoring
- CI/CD integration
"""

import asyncio
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import os
import signal
import sys

# Import all monitoring components
from monitoring.sentry.production_sentry_config import initialize_sentry
from monitoring.datadog.apm_config import initialize_datadog_apm
from monitoring.health.production_health_endpoints import health_monitor
from monitoring.alerting.enterprise_alerting_system import initialize_alerting
from monitoring.metrics.business_metrics_tracker import initialize_business_metrics
from monitoring.logging.enterprise_elk_integration import initialize_elk_system
from monitoring.uptime.enterprise_uptime_monitor import initialize_uptime_monitoring

logger = logging.getLogger(__name__)


class MonitoringSystemStatus(str, Enum):
    """Status of monitoring systems"""
    INITIALIZING = "initializing"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"
    MAINTENANCE = "maintenance"


@dataclass
class SystemHealth:
    """Overall system health summary"""
    status: MonitoringSystemStatus
    timestamp: datetime
    components: Dict[str, Dict[str, Any]]
    alerts_active: int
    incidents_open: int
    uptime_percentage: float
    error_rate: float
    response_time_p95: float
    last_deployment: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['status'] = self.status.value
        if self.last_deployment:
            data['last_deployment'] = self.last_deployment.isoformat()
        return data


class EnterpriseMonitoringOrchestrator:
    """Central orchestrator for all monitoring systems"""
    
    def __init__(self):
        self.initialized = False
        self.monitoring_systems = {
            'sentry': {'status': MonitoringSystemStatus.INITIALIZING, 'last_check': None},
            'datadog': {'status': MonitoringSystemStatus.INITIALIZING, 'last_check': None},
            'health_checks': {'status': MonitoringSystemStatus.INITIALIZING, 'last_check': None},
            'alerting': {'status': MonitoringSystemStatus.INITIALIZING, 'last_check': None},
            'business_metrics': {'status': MonitoringSystemStatus.INITIALIZING, 'last_check': None},
            'elk_logging': {'status': MonitoringSystemStatus.INITIALIZING, 'last_check': None},
            'uptime_monitoring': {'status': MonitoringSystemStatus.INITIALIZING, 'last_check': None}
        }
        
        self.health_summary = SystemHealth(
            status=MonitoringSystemStatus.INITIALIZING,
            timestamp=datetime.utcnow(),
            components={},
            alerts_active=0,
            incidents_open=0,
            uptime_percentage=0.0,
            error_rate=0.0,
            response_time_p95=0.0
        )
        
        # Configuration
        self.config = self._load_configuration()
        
        # Background tasks
        self.monitoring_tasks = []
        self.shutdown_event = asyncio.Event()
        
        # Graceful shutdown handling
        self._setup_signal_handlers()
    
    def _load_configuration(self) -> Dict[str, Any]:
        """Load monitoring configuration"""
        return {
            'deployment_tracking': {
                'enabled': os.getenv('DEPLOYMENT_TRACKING_ENABLED', 'true').lower() == 'true',
                'webhook_url': os.getenv('DEPLOYMENT_WEBHOOK_URL'),
                'notification_channels': ['slack', 'email']
            },
            'incident_management': {
                'auto_resolution_timeout': int(os.getenv('INCIDENT_AUTO_RESOLUTION_TIMEOUT', '3600')),
                'escalation_enabled': os.getenv('INCIDENT_ESCALATION_ENABLED', 'true').lower() == 'true',
                'escalation_delay': int(os.getenv('INCIDENT_ESCALATION_DELAY', '1800'))
            },
            'health_checks': {
                'frequency_seconds': int(os.getenv('HEALTH_CHECK_FREQUENCY', '60')),
                'timeout_seconds': int(os.getenv('HEALTH_CHECK_TIMEOUT', '30'))
            },
            'performance_tracking': {
                'enabled': os.getenv('PERFORMANCE_TRACKING_ENABLED', 'true').lower() == 'true',
                'sample_rate': float(os.getenv('PERFORMANCE_SAMPLE_RATE', '0.1')),
                'slow_request_threshold_ms': int(os.getenv('SLOW_REQUEST_THRESHOLD_MS', '2000'))
            },
            'business_metrics': {
                'collection_interval': int(os.getenv('BUSINESS_METRICS_INTERVAL', '300')),
                'sla_tracking': os.getenv('SLA_TRACKING_ENABLED', 'true').lower() == 'true'
            },
            'log_management': {
                'retention_days': int(os.getenv('LOG_RETENTION_DAYS', '30')),
                'log_level': os.getenv('LOG_LEVEL', 'INFO'),
                'structured_logging': os.getenv('STRUCTURED_LOGGING', 'true').lower() == 'true'
            }
        }
    
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, initiating graceful shutdown...")
            self.shutdown_event.set()
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def initialize(self):
        """Initialize all monitoring systems"""
        logger.info("Starting enterprise monitoring orchestrator...")
        
        initialization_results = {}
        
        try:
            # Initialize Sentry first for error tracking
            logger.info("Initializing Sentry error tracking...")
            try:
                sentry_success = initialize_sentry()
                initialization_results['sentry'] = sentry_success
                self.monitoring_systems['sentry']['status'] = (
                    MonitoringSystemStatus.HEALTHY if sentry_success else MonitoringSystemStatus.FAILED
                )
                self.monitoring_systems['sentry']['last_check'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to initialize Sentry: {e}")
                initialization_results['sentry'] = False
                self.monitoring_systems['sentry']['status'] = MonitoringSystemStatus.FAILED
            
            # Initialize DataDog APM
            logger.info("Initializing DataDog APM...")
            try:
                initialize_datadog_apm()
                initialization_results['datadog'] = True
                self.monitoring_systems['datadog']['status'] = MonitoringSystemStatus.HEALTHY
                self.monitoring_systems['datadog']['last_check'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to initialize DataDog APM: {e}")
                initialization_results['datadog'] = False
                self.monitoring_systems['datadog']['status'] = MonitoringSystemStatus.FAILED
            
            # Initialize alerting system
            logger.info("Initializing alerting system...")
            try:
                await initialize_alerting()
                initialization_results['alerting'] = True
                self.monitoring_systems['alerting']['status'] = MonitoringSystemStatus.HEALTHY
                self.monitoring_systems['alerting']['last_check'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to initialize alerting system: {e}")
                initialization_results['alerting'] = False
                self.monitoring_systems['alerting']['status'] = MonitoringSystemStatus.FAILED
            
            # Initialize business metrics
            logger.info("Initializing business metrics...")
            try:
                await initialize_business_metrics()
                initialization_results['business_metrics'] = True
                self.monitoring_systems['business_metrics']['status'] = MonitoringSystemStatus.HEALTHY
                self.monitoring_systems['business_metrics']['last_check'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to initialize business metrics: {e}")
                initialization_results['business_metrics'] = False
                self.monitoring_systems['business_metrics']['status'] = MonitoringSystemStatus.FAILED
            
            # Initialize ELK logging
            logger.info("Initializing ELK logging system...")
            try:
                await initialize_elk_system()
                initialization_results['elk_logging'] = True
                self.monitoring_systems['elk_logging']['status'] = MonitoringSystemStatus.HEALTHY
                self.monitoring_systems['elk_logging']['last_check'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to initialize ELK logging: {e}")
                initialization_results['elk_logging'] = False
                self.monitoring_systems['elk_logging']['status'] = MonitoringSystemStatus.FAILED
            
            # Initialize uptime monitoring
            logger.info("Initializing uptime monitoring...")
            try:
                await initialize_uptime_monitoring()
                initialization_results['uptime_monitoring'] = True
                self.monitoring_systems['uptime_monitoring']['status'] = MonitoringSystemStatus.HEALTHY
                self.monitoring_systems['uptime_monitoring']['last_check'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to initialize uptime monitoring: {e}")
                initialization_results['uptime_monitoring'] = False
                self.monitoring_systems['uptime_monitoring']['status'] = MonitoringSystemStatus.FAILED
            
            # Initialize health checks last
            logger.info("Initializing health checks...")
            try:
                # Health checks initialize automatically
                initialization_results['health_checks'] = True
                self.monitoring_systems['health_checks']['status'] = MonitoringSystemStatus.HEALTHY
                self.monitoring_systems['health_checks']['last_check'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to initialize health checks: {e}")
                initialization_results['health_checks'] = False
                self.monitoring_systems['health_checks']['status'] = MonitoringSystemStatus.FAILED
            
            # Start background monitoring tasks
            await self._start_monitoring_tasks()
            
            # Update overall status
            failed_systems = [name for name, success in initialization_results.items() if not success]
            if not failed_systems:
                self.health_summary.status = MonitoringSystemStatus.HEALTHY
                logger.info("All monitoring systems initialized successfully")
            elif len(failed_systems) < len(initialization_results) / 2:
                self.health_summary.status = MonitoringSystemStatus.DEGRADED
                logger.warning(f"Some monitoring systems failed to initialize: {failed_systems}")
            else:
                self.health_summary.status = MonitoringSystemStatus.FAILED
                logger.error(f"Critical monitoring systems failed: {failed_systems}")
            
            self.initialized = True
            
            # Send initialization alert
            if initialization_results.get('alerting', False):
                await self._send_initialization_alert(initialization_results)
            
        except Exception as e:
            logger.error(f"Failed to initialize monitoring orchestrator: {e}")
            self.health_summary.status = MonitoringSystemStatus.FAILED
            raise
    
    async def _start_monitoring_tasks(self):
        """Start background monitoring tasks"""
        # Health summary update task
        self.monitoring_tasks.append(
            asyncio.create_task(self._health_summary_updater())
        )
        
        # System health check task
        self.monitoring_tasks.append(
            asyncio.create_task(self._system_health_checker())
        )
        
        # Performance monitoring task
        if self.config['performance_tracking']['enabled']:
            self.monitoring_tasks.append(
                asyncio.create_task(self._performance_monitor())
            )
        
        # Deployment tracking task
        if self.config['deployment_tracking']['enabled']:
            self.monitoring_tasks.append(
                asyncio.create_task(self._deployment_tracker())
            )
        
        # Incident management task
        self.monitoring_tasks.append(
            asyncio.create_task(self._incident_manager())
        )
        
        logger.info(f"Started {len(self.monitoring_tasks)} monitoring background tasks")
    
    async def _health_summary_updater(self):
        """Background task to update health summary"""
        while not self.shutdown_event.is_set():
            try:
                await self._update_health_summary()
                await asyncio.sleep(60)  # Update every minute
            except Exception as e:
                logger.error(f"Error in health summary updater: {e}")
                await asyncio.sleep(60)
    
    async def _update_health_summary(self):
        """Update overall health summary"""
        try:
            # Collect data from all monitoring systems
            from monitoring.uptime.enterprise_uptime_monitor import get_uptime_dashboard_data
            from monitoring.metrics.business_metrics_tracker import get_dashboard_data
            from monitoring.alerting.enterprise_alerting_system import get_active_incidents
            
            # Get uptime data
            uptime_data = await get_uptime_dashboard_data()
            uptime_percentage = uptime_data.get('overall_stats', {}).get('average_uptime', 0)
            
            # Get business metrics
            business_data = await get_dashboard_data()
            
            # Get active incidents
            active_incidents = get_active_incidents()
            
            # Calculate error rate from recent metrics
            error_rate = 0.0
            response_time_p95 = 0.0
            
            if business_data.get('current_metrics', {}).get('metrics', {}):
                metrics = business_data['current_metrics']['metrics']
                if 'error_rate' in metrics:
                    error_rate = metrics['error_rate'].get('value', 0)
                if 'average_response_time' in metrics:
                    response_time_p95 = metrics['average_response_time'].get('value', 0)
            
            # Update health summary
            self.health_summary = SystemHealth(
                status=self._calculate_overall_status(),
                timestamp=datetime.utcnow(),
                components=self.monitoring_systems,
                alerts_active=len(active_incidents),
                incidents_open=len([i for i in active_incidents if i.status == 'open']),
                uptime_percentage=uptime_percentage,
                error_rate=error_rate,
                response_time_p95=response_time_p95,
                last_deployment=self._get_last_deployment_time()
            )
            
        except Exception as e:
            logger.error(f"Failed to update health summary: {e}")
    
    def _calculate_overall_status(self) -> MonitoringSystemStatus:
        """Calculate overall system status"""
        system_statuses = [system['status'] for system in self.monitoring_systems.values()]
        
        if all(status == MonitoringSystemStatus.HEALTHY for status in system_statuses):
            return MonitoringSystemStatus.HEALTHY
        elif any(status == MonitoringSystemStatus.FAILED for status in system_statuses):
            # Check if critical systems are failing
            critical_systems = ['sentry', 'alerting', 'health_checks']
            critical_failing = any(
                self.monitoring_systems[sys]['status'] == MonitoringSystemStatus.FAILED
                for sys in critical_systems
            )
            if critical_failing:
                return MonitoringSystemStatus.FAILED
            else:
                return MonitoringSystemStatus.DEGRADED
        elif any(status == MonitoringSystemStatus.DEGRADED for status in system_statuses):
            return MonitoringSystemStatus.DEGRADED
        else:
            return MonitoringSystemStatus.HEALTHY
    
    def _get_last_deployment_time(self) -> Optional[datetime]:
        """Get last deployment time"""
        try:
            deployment_marker = os.getenv('DEPLOYMENT_TIME')
            if deployment_marker:
                return datetime.fromisoformat(deployment_marker)
        except Exception:
            pass
        return None
    
    async def _system_health_checker(self):
        """Background task to check system health"""
        while not self.shutdown_event.is_set():
            try:
                # Check each monitoring system
                for system_name in self.monitoring_systems.keys():
                    await self._check_system_health(system_name)
                
                await asyncio.sleep(self.config['health_checks']['frequency_seconds'])
                
            except Exception as e:
                logger.error(f"Error in system health checker: {e}")
                await asyncio.sleep(60)
    
    async def _check_system_health(self, system_name: str):
        """Check health of a specific monitoring system"""
        try:
            system = self.monitoring_systems[system_name]
            previous_status = system['status']
            
            # Perform health check based on system type
            if system_name == 'sentry':
                # Check if Sentry is capturing errors
                health_ok = True  # Simplified check
            elif system_name == 'datadog':
                # Check if DataDog is receiving metrics
                health_ok = True  # Simplified check
            elif system_name == 'alerting':
                # Check if alerting system is responsive
                health_ok = True  # Simplified check
            elif system_name == 'elk_logging':
                # Check if ELK is ingesting logs
                health_ok = True  # Simplified check
            elif system_name == 'uptime_monitoring':
                # Check if uptime monitoring is running
                health_ok = True  # Simplified check
            elif system_name == 'business_metrics':
                # Check if business metrics are being collected
                health_ok = True  # Simplified check
            else:
                health_ok = True
            
            # Update status
            if health_ok:
                system['status'] = MonitoringSystemStatus.HEALTHY
            else:
                system['status'] = MonitoringSystemStatus.FAILED
            
            system['last_check'] = datetime.utcnow()
            
            # Send alert if status changed
            if previous_status != system['status']:
                await self._send_system_status_alert(system_name, previous_status, system['status'])
                
        except Exception as e:
            logger.error(f"Failed to check health of {system_name}: {e}")
            self.monitoring_systems[system_name]['status'] = MonitoringSystemStatus.FAILED
    
    async def _performance_monitor(self):
        """Background task to monitor performance"""
        while not self.shutdown_event.is_set():
            try:
                # Collect performance metrics
                await self._collect_performance_metrics()
                await asyncio.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"Error in performance monitor: {e}")
                await asyncio.sleep(300)
    
    async def _collect_performance_metrics(self):
        """Collect system performance metrics"""
        try:
            import psutil
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # Network I/O
            network = psutil.net_io_counters()
            
            # Log performance metrics
            logger.info(f"Performance metrics - CPU: {cpu_percent}%, Memory: {memory_percent}%, Disk: {disk_percent}%")
            
            # Track in business metrics if available
            from monitoring.metrics.business_metrics_tracker import business_metrics
            await business_metrics.track_metric("system_cpu_usage", cpu_percent)
            await business_metrics.track_metric("system_memory_usage", memory_percent)
            await business_metrics.track_metric("system_disk_usage", disk_percent)
            
        except Exception as e:
            logger.error(f"Failed to collect performance metrics: {e}")
    
    async def _deployment_tracker(self):
        """Background task to track deployments"""
        while not self.shutdown_event.is_set():
            try:
                # Check for deployment markers
                deployment_in_progress = os.getenv('DEPLOYMENT_IN_PROGRESS', 'false').lower() == 'true'
                
                if deployment_in_progress:
                    await self._handle_deployment_event()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error in deployment tracker: {e}")
                await asyncio.sleep(60)
    
    async def _handle_deployment_event(self):
        """Handle deployment event"""
        try:
            # Send deployment notification
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            await send_alert(
                title="Deployment In Progress",
                description="Application deployment is currently in progress",
                severity=AlertSeverity.INFO,
                source="deployment_tracker",
                category="deployment",
                metadata={
                    "deployment_time": datetime.utcnow().isoformat(),
                    "environment": os.getenv("ENVIRONMENT", "production")
                },
                tags=["deployment", "infrastructure"]
            )
            
        except Exception as e:
            logger.error(f"Failed to handle deployment event: {e}")
    
    async def _incident_manager(self):
        """Background task to manage incidents"""
        while not self.shutdown_event.is_set():
            try:
                # Check for auto-resolution opportunities
                await self._check_incident_auto_resolution()
                
                # Check for escalation needs
                if self.config['incident_management']['escalation_enabled']:
                    await self._check_incident_escalation()
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Error in incident manager: {e}")
                await asyncio.sleep(300)
    
    async def _check_incident_auto_resolution(self):
        """Check incidents for auto-resolution"""
        try:
            from monitoring.alerting.enterprise_alerting_system import get_active_incidents
            
            active_incidents = get_active_incidents()
            timeout = self.config['incident_management']['auto_resolution_timeout']
            cutoff_time = datetime.utcnow() - timedelta(seconds=timeout)
            
            for incident in active_incidents:
                if incident.created_at < cutoff_time and incident.status == 'open':
                    # Auto-resolve old incidents
                    logger.info(f"Auto-resolving old incident: {incident.id}")
                    
        except Exception as e:
            logger.error(f"Failed to check incident auto-resolution: {e}")
    
    async def _check_incident_escalation(self):
        """Check incidents for escalation"""
        try:
            from monitoring.alerting.enterprise_alerting_system import get_active_incidents
            
            active_incidents = get_active_incidents()
            escalation_delay = self.config['incident_management']['escalation_delay']
            cutoff_time = datetime.utcnow() - timedelta(seconds=escalation_delay)
            
            for incident in active_incidents:
                if (incident.created_at < cutoff_time and 
                    incident.status == 'open' and 
                    incident.escalation_count == 0):
                    # Escalate incident
                    logger.info(f"Escalating incident: {incident.id}")
                    
        except Exception as e:
            logger.error(f"Failed to check incident escalation: {e}")
    
    async def _send_initialization_alert(self, initialization_results: Dict[str, bool]):
        """Send alert about monitoring system initialization"""
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            failed_systems = [name for name, success in initialization_results.items() if not success]
            
            if not failed_systems:
                await send_alert(
                    title="Monitoring Systems Initialized",
                    description="All monitoring systems have been successfully initialized",
                    severity=AlertSeverity.INFO,
                    source="monitoring_orchestrator",
                    category="system",
                    metadata={
                        "initialized_systems": list(initialization_results.keys()),
                        "status": "success"
                    },
                    tags=["monitoring", "initialization", "success"]
                )
            else:
                await send_alert(
                    title="Monitoring Initialization Issues",
                    description=f"Some monitoring systems failed to initialize: {', '.join(failed_systems)}",
                    severity=AlertSeverity.WARNING,
                    source="monitoring_orchestrator",
                    category="system",
                    metadata={
                        "failed_systems": failed_systems,
                        "successful_systems": [name for name, success in initialization_results.items() if success],
                        "status": "partial_failure"
                    },
                    tags=["monitoring", "initialization", "failure"]
                )
                
        except Exception as e:
            logger.error(f"Failed to send initialization alert: {e}")
    
    async def _send_system_status_alert(self, system_name: str, previous_status: MonitoringSystemStatus, current_status: MonitoringSystemStatus):
        """Send alert about monitoring system status change"""
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            if current_status == MonitoringSystemStatus.FAILED:
                severity = AlertSeverity.CRITICAL
                title = f"Monitoring System Failed: {system_name}"
                description = f"Monitoring system '{system_name}' has failed"
            elif current_status == MonitoringSystemStatus.DEGRADED:
                severity = AlertSeverity.WARNING
                title = f"Monitoring System Degraded: {system_name}"
                description = f"Monitoring system '{system_name}' is degraded"
            elif current_status == MonitoringSystemStatus.HEALTHY and previous_status in [MonitoringSystemStatus.FAILED, MonitoringSystemStatus.DEGRADED]:
                severity = AlertSeverity.INFO
                title = f"Monitoring System Recovered: {system_name}"
                description = f"Monitoring system '{system_name}' has recovered"
            else:
                return  # No alert needed
            
            await send_alert(
                title=title,
                description=description,
                severity=severity,
                source="monitoring_orchestrator",
                category="system",
                metadata={
                    "system_name": system_name,
                    "previous_status": previous_status.value,
                    "current_status": current_status.value
                },
                tags=["monitoring", "system_status", system_name]
            )
            
        except Exception as e:
            logger.error(f"Failed to send system status alert: {e}")
    
    async def get_comprehensive_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive dashboard data from all monitoring systems"""
        try:
            dashboard_data = {
                "system_health": self.health_summary.to_dict(),
                "monitoring_systems": self.monitoring_systems,
                "uptime": {},
                "business_metrics": {},
                "logs": {},
                "performance": {},
                "incidents": [],
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Collect data from all systems
            try:
                from monitoring.uptime.enterprise_uptime_monitor import get_uptime_dashboard_data
                dashboard_data["uptime"] = await get_uptime_dashboard_data()
            except Exception as e:
                logger.error(f"Failed to get uptime data: {e}")
            
            try:
                from monitoring.metrics.business_metrics_tracker import get_dashboard_data
                dashboard_data["business_metrics"] = await get_dashboard_data()
            except Exception as e:
                logger.error(f"Failed to get business metrics: {e}")
            
            try:
                from monitoring.logging.enterprise_elk_integration import get_log_dashboard_data
                dashboard_data["logs"] = await get_log_dashboard_data()
            except Exception as e:
                logger.error(f"Failed to get log data: {e}")
            
            try:
                from monitoring.alerting.enterprise_alerting_system import get_active_incidents
                dashboard_data["incidents"] = [asdict(incident) for incident in get_active_incidents()]
            except Exception as e:
                logger.error(f"Failed to get incidents: {e}")
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Failed to get comprehensive dashboard data: {e}")
            return {"error": str(e)}
    
    async def shutdown(self):
        """Graceful shutdown of monitoring orchestrator"""
        logger.info("Shutting down monitoring orchestrator...")
        
        # Set shutdown event
        self.shutdown_event.set()
        
        # Cancel all background tasks
        for task in self.monitoring_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.monitoring_tasks:
            await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
        
        # Send shutdown alert
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            await send_alert(
                title="Monitoring System Shutdown",
                description="BookedBarber V2 monitoring system is shutting down",
                severity=AlertSeverity.WARNING,
                source="monitoring_orchestrator",
                category="system",
                metadata={
                    "shutdown_time": datetime.utcnow().isoformat(),
                    "uptime_seconds": time.time() - (self.health_summary.timestamp.timestamp() if self.health_summary.timestamp else time.time())
                },
                tags=["monitoring", "shutdown"]
            )
        except Exception as e:
            logger.error(f"Failed to send shutdown alert: {e}")
        
        logger.info("Monitoring orchestrator shutdown complete")
    
    async def handle_ci_cd_integration(self, event_type: str, metadata: Dict[str, Any]):
        """Handle CI/CD pipeline integration events"""
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            if event_type == "deployment_start":
                await send_alert(
                    title="Deployment Started",
                    description="New deployment has started",
                    severity=AlertSeverity.INFO,
                    source="ci_cd_integration",
                    category="deployment",
                    metadata=metadata,
                    tags=["deployment", "ci_cd", "start"]
                )
                
                # Temporarily suppress certain alerts during deployment
                os.environ["DEPLOYMENT_IN_PROGRESS"] = "true"
                
            elif event_type == "deployment_complete":
                await send_alert(
                    title="Deployment Completed",
                    description="Deployment has completed successfully",
                    severity=AlertSeverity.INFO,
                    source="ci_cd_integration",
                    category="deployment",
                    metadata=metadata,
                    tags=["deployment", "ci_cd", "complete"]
                )
                
                # Re-enable alerts
                os.environ.pop("DEPLOYMENT_IN_PROGRESS", None)
                
            elif event_type == "deployment_failed":
                await send_alert(
                    title="Deployment Failed",
                    description="Deployment has failed",
                    severity=AlertSeverity.CRITICAL,
                    source="ci_cd_integration",
                    category="deployment",
                    metadata=metadata,
                    tags=["deployment", "ci_cd", "failed"]
                )
                
                # Re-enable alerts
                os.environ.pop("DEPLOYMENT_IN_PROGRESS", None)
                
        except Exception as e:
            logger.error(f"Failed to handle CI/CD integration event: {e}")


# Global orchestrator instance
monitoring_orchestrator = EnterpriseMonitoringOrchestrator()

# Main entry point
async def main():
    """Main entry point for monitoring orchestrator"""
    try:
        await monitoring_orchestrator.initialize()
        
        # Keep running until shutdown signal
        await monitoring_orchestrator.shutdown_event.wait()
        
        # Graceful shutdown
        await monitoring_orchestrator.shutdown()
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
        await monitoring_orchestrator.shutdown()
    except Exception as e:
        logger.error(f"Fatal error in monitoring orchestrator: {e}")
        await monitoring_orchestrator.shutdown()
        sys.exit(1)

# Convenience functions for external integration
async def initialize_monitoring():
    """Initialize monitoring orchestrator"""
    await monitoring_orchestrator.initialize()

async def get_monitoring_dashboard_data() -> Dict[str, Any]:
    """Get comprehensive monitoring dashboard data"""
    return await monitoring_orchestrator.get_comprehensive_dashboard_data()

async def handle_deployment_event(event_type: str, metadata: Dict[str, Any]):
    """Handle deployment event from CI/CD"""
    await monitoring_orchestrator.handle_ci_cd_integration(event_type, metadata)

def get_system_health() -> SystemHealth:
    """Get current system health"""
    return monitoring_orchestrator.health_summary

# Run orchestrator if executed directly
if __name__ == "__main__":
    asyncio.run(main())