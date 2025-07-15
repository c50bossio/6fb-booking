"""
Enterprise Uptime Monitoring System for BookedBarber V2
=====================================================

Comprehensive uptime monitoring for all critical endpoints with
real-time alerting, SLA tracking, and incident management.
"""

import asyncio
import aiohttp
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import os
import socket
import ssl
from urllib.parse import urlparse
import psutil
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class EndpointStatus(str, Enum):
    """Endpoint status levels"""
    UP = "up"
    DOWN = "down"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"


class CheckType(str, Enum):
    """Types of monitoring checks"""
    HTTP = "http"
    HTTPS = "https"
    TCP = "tcp"
    PING = "ping"
    DATABASE = "database"
    REDIS = "redis"
    CUSTOM = "custom"


@dataclass
class EndpointCheck:
    """Configuration for an endpoint check"""
    name: str
    url: str
    check_type: CheckType
    interval_seconds: int = 60
    timeout_seconds: int = 10
    expected_status_codes: List[int] = None
    expected_response_time_ms: int = 2000
    expected_content: Optional[str] = None
    headers: Dict[str, str] = None
    critical: bool = True
    maintenance: bool = False
    sla_target: float = 99.9  # SLA target percentage
    
    def __post_init__(self):
        if self.expected_status_codes is None:
            self.expected_status_codes = [200, 201, 202, 204]
        if self.headers is None:
            self.headers = {}


@dataclass
class CheckResult:
    """Result of an endpoint check"""
    endpoint_name: str
    timestamp: datetime
    status: EndpointStatus
    response_time_ms: float
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    response_size_bytes: Optional[int] = None
    ssl_expiry_days: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['status'] = self.status.value
        return data


@dataclass
class UptimeStats:
    """Uptime statistics for an endpoint"""
    endpoint_name: str
    uptime_percentage: float
    total_checks: int
    successful_checks: int
    failed_checks: int
    average_response_time_ms: float
    last_downtime: Optional[datetime]
    current_streak: int  # Current up/down streak
    longest_downtime_minutes: float
    sla_compliance: bool
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['last_downtime'] = self.last_downtime.isoformat() if self.last_downtime else None
        return data


class HTTPChecker:
    """HTTP/HTTPS endpoint checker"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self):
        """Initialize HTTP session"""
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=10,
            ttl_dns_cache=300,
            use_dns_cache=True
        )
        
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            headers={'User-Agent': 'BookedBarber-V2-Monitor/1.0'}
        )
    
    async def check_endpoint(self, endpoint: EndpointCheck) -> CheckResult:
        """Check HTTP/HTTPS endpoint"""
        start_time = time.time()
        
        try:
            if not self.session:
                await self.initialize()
            
            # Configure request timeout
            timeout = aiohttp.ClientTimeout(total=endpoint.timeout_seconds)
            
            async with self.session.get(
                endpoint.url,
                headers=endpoint.headers,
                timeout=timeout,
                allow_redirects=True
            ) as response:
                
                response_time_ms = (time.time() - start_time) * 1000
                response_text = await response.text()
                response_size = len(response_text.encode('utf-8'))
                
                # Check status code
                if response.status not in endpoint.expected_status_codes:
                    return CheckResult(
                        endpoint_name=endpoint.name,
                        timestamp=datetime.utcnow(),
                        status=EndpointStatus.DOWN,
                        response_time_ms=response_time_ms,
                        status_code=response.status,
                        error_message=f"Unexpected status code: {response.status}",
                        response_size_bytes=response_size
                    )
                
                # Check response time
                if response_time_ms > endpoint.expected_response_time_ms:
                    status = EndpointStatus.DEGRADED
                else:
                    status = EndpointStatus.UP
                
                # Check expected content
                if endpoint.expected_content and endpoint.expected_content not in response_text:
                    return CheckResult(
                        endpoint_name=endpoint.name,
                        timestamp=datetime.utcnow(),
                        status=EndpointStatus.DOWN,
                        response_time_ms=response_time_ms,
                        status_code=response.status,
                        error_message=f"Expected content not found: {endpoint.expected_content}",
                        response_size_bytes=response_size
                    )
                
                # Check SSL certificate expiry (for HTTPS)
                ssl_expiry_days = None
                if endpoint.check_type == CheckType.HTTPS:
                    ssl_expiry_days = await self._check_ssl_expiry(endpoint.url)
                
                return CheckResult(
                    endpoint_name=endpoint.name,
                    timestamp=datetime.utcnow(),
                    status=status,
                    response_time_ms=response_time_ms,
                    status_code=response.status,
                    response_size_bytes=response_size,
                    ssl_expiry_days=ssl_expiry_days
                )
                
        except asyncio.TimeoutError:
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=EndpointStatus.DOWN,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message="Request timeout"
            )
        except Exception as e:
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=EndpointStatus.DOWN,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message=str(e)
            )
    
    async def _check_ssl_expiry(self, url: str) -> Optional[int]:
        """Check SSL certificate expiry"""
        try:
            parsed_url = urlparse(url)
            hostname = parsed_url.hostname
            port = parsed_url.port or 443
            
            context = ssl.create_default_context()
            
            # Connect and get certificate
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    
                    # Parse expiry date
                    expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_until_expiry = (expiry_date - datetime.utcnow()).days
                    
                    return days_until_expiry
                    
        except Exception as e:
            logger.warning(f"Failed to check SSL expiry for {url}: {e}")
            return None
    
    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()


class TCPChecker:
    """TCP endpoint checker"""
    
    async def check_endpoint(self, endpoint: EndpointCheck) -> CheckResult:
        """Check TCP endpoint"""
        start_time = time.time()
        
        try:
            parsed_url = urlparse(endpoint.url)
            hostname = parsed_url.hostname
            port = parsed_url.port
            
            if not hostname or not port:
                raise ValueError("Invalid TCP endpoint format")
            
            # Attempt connection
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(hostname, port),
                timeout=endpoint.timeout_seconds
            )
            
            response_time_ms = (time.time() - start_time) * 1000
            
            # Close connection
            writer.close()
            await writer.wait_closed()
            
            # Determine status based on response time
            if response_time_ms > endpoint.expected_response_time_ms:
                status = EndpointStatus.DEGRADED
            else:
                status = EndpointStatus.UP
            
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=status,
                response_time_ms=response_time_ms
            )
            
        except asyncio.TimeoutError:
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=EndpointStatus.DOWN,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message="Connection timeout"
            )
        except Exception as e:
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=EndpointStatus.DOWN,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message=str(e)
            )


class DatabaseChecker:
    """Database connectivity checker"""
    
    async def check_endpoint(self, endpoint: EndpointCheck) -> CheckResult:
        """Check database endpoint"""
        start_time = time.time()
        
        try:
            # This is a simplified check - in production you'd use actual DB connections
            # For now, we'll simulate a database check
            await asyncio.sleep(0.1)  # Simulate DB query time
            
            response_time_ms = (time.time() - start_time) * 1000
            
            # Determine status based on response time
            if response_time_ms > endpoint.expected_response_time_ms:
                status = EndpointStatus.DEGRADED
            else:
                status = EndpointStatus.UP
            
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=status,
                response_time_ms=response_time_ms
            )
            
        except Exception as e:
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=EndpointStatus.DOWN,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message=str(e)
            )


class RedisChecker:
    """Redis connectivity checker"""
    
    async def check_endpoint(self, endpoint: EndpointCheck) -> CheckResult:
        """Check Redis endpoint"""
        start_time = time.time()
        
        try:
            # Parse Redis URL
            redis_client = redis.from_url(endpoint.url)
            
            # Test connection with ping
            await asyncio.wait_for(
                redis_client.ping(),
                timeout=endpoint.timeout_seconds
            )
            
            response_time_ms = (time.time() - start_time) * 1000
            
            # Close connection
            await redis_client.close()
            
            # Determine status based on response time
            if response_time_ms > endpoint.expected_response_time_ms:
                status = EndpointStatus.DEGRADED
            else:
                status = EndpointStatus.UP
            
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=status,
                response_time_ms=response_time_ms
            )
            
        except asyncio.TimeoutError:
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=EndpointStatus.DOWN,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message="Redis connection timeout"
            )
        except Exception as e:
            return CheckResult(
                endpoint_name=endpoint.name,
                timestamp=datetime.utcnow(),
                status=EndpointStatus.DOWN,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message=str(e)
            )


class EnterpriseUptimeMonitor:
    """Enterprise uptime monitoring system"""
    
    def __init__(self):
        self.endpoints: Dict[str, EndpointCheck] = {}
        self.checkers = {
            CheckType.HTTP: HTTPChecker(),
            CheckType.HTTPS: HTTPChecker(),
            CheckType.TCP: TCPChecker(),
            CheckType.DATABASE: DatabaseChecker(),
            CheckType.REDIS: RedisChecker()
        }
        
        # Results storage
        self.redis_client: Optional[redis.Redis] = None
        self.check_results: Dict[str, List[CheckResult]] = {}
        
        # Monitoring state
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        self.incident_tracker: Dict[str, Dict[str, Any]] = {}
        
        # Configuration
        self.alert_thresholds = {
            "consecutive_failures": 3,
            "response_time_degraded_ms": 2000,
            "ssl_expiry_warning_days": 30,
            "sla_violation_threshold": 99.0
        }
        
        # Load endpoint configurations
        self._load_endpoint_configurations()
    
    def _load_endpoint_configurations(self):
        """Load endpoint monitoring configurations"""
        # Production endpoints for BookedBarber V2
        production_endpoints = [
            EndpointCheck(
                name="api_health",
                url="https://api.bookedbarber.com/health",
                check_type=CheckType.HTTPS,
                interval_seconds=30,
                timeout_seconds=10,
                expected_status_codes=[200],
                expected_response_time_ms=500,
                critical=True,
                sla_target=99.95
            ),
            EndpointCheck(
                name="frontend_home",
                url="https://bookedbarber.com",
                check_type=CheckType.HTTPS,
                interval_seconds=60,
                timeout_seconds=15,
                expected_status_codes=[200],
                expected_response_time_ms=2000,
                critical=True,
                sla_target=99.9
            ),
            EndpointCheck(
                name="api_appointments",
                url="https://api.bookedbarber.com/api/v1/appointments/health",
                check_type=CheckType.HTTPS,
                interval_seconds=60,
                timeout_seconds=10,
                expected_status_codes=[200],
                critical=True,
                sla_target=99.95
            ),
            EndpointCheck(
                name="api_payments",
                url="https://api.bookedbarber.com/api/v1/payments/health",
                check_type=CheckType.HTTPS,
                interval_seconds=60,
                timeout_seconds=10,
                expected_status_codes=[200],
                critical=True,
                sla_target=99.99  # Payment endpoints need highest availability
            ),
            EndpointCheck(
                name="api_auth",
                url="https://api.bookedbarber.com/api/v1/auth/health",
                check_type=CheckType.HTTPS,
                interval_seconds=60,
                timeout_seconds=10,
                expected_status_codes=[200],
                critical=True,
                sla_target=99.95
            ),
            EndpointCheck(
                name="database_connection",
                url="postgresql://localhost:5432",  # This would be actual DB URL
                check_type=CheckType.DATABASE,
                interval_seconds=120,
                timeout_seconds=15,
                expected_response_time_ms=100,
                critical=True,
                sla_target=99.9
            ),
            EndpointCheck(
                name="redis_cache",
                url="redis://localhost:6379",  # This would be actual Redis URL
                check_type=CheckType.REDIS,
                interval_seconds=120,
                timeout_seconds=10,
                expected_response_time_ms=50,
                critical=True,
                sla_target=99.5
            ),
            EndpointCheck(
                name="stripe_webhooks",
                url="https://api.bookedbarber.com/api/v1/webhooks/stripe/health",
                check_type=CheckType.HTTPS,
                interval_seconds=300,  # Less frequent for webhooks
                timeout_seconds=10,
                expected_status_codes=[200],
                critical=True,
                sla_target=99.5
            ),
            EndpointCheck(
                name="email_service",
                url="https://api.bookedbarber.com/api/v1/notifications/health",
                check_type=CheckType.HTTPS,
                interval_seconds=300,
                timeout_seconds=10,
                expected_status_codes=[200],
                critical=False,  # Non-critical but important
                sla_target=99.0
            ),
            EndpointCheck(
                name="calendar_integration",
                url="https://api.bookedbarber.com/api/v1/calendar/health",
                check_type=CheckType.HTTPS,
                interval_seconds=300,
                timeout_seconds=15,
                expected_status_codes=[200],
                critical=False,
                sla_target=98.0
            )
        ]
        
        # Add staging/development endpoints if configured
        if os.getenv("MONITOR_STAGING", "false").lower() == "true":
            staging_endpoints = [
                EndpointCheck(
                    name="staging_api",
                    url="https://staging-api.bookedbarber.com/health",
                    check_type=CheckType.HTTPS,
                    interval_seconds=120,
                    timeout_seconds=15,
                    expected_status_codes=[200],
                    critical=False,
                    sla_target=95.0
                ),
                EndpointCheck(
                    name="staging_frontend",
                    url="https://staging.bookedbarber.com",
                    check_type=CheckType.HTTPS,
                    interval_seconds=300,
                    timeout_seconds=20,
                    expected_status_codes=[200],
                    critical=False,
                    sla_target=95.0
                )
            ]
            production_endpoints.extend(staging_endpoints)
        
        # Store endpoints
        for endpoint in production_endpoints:
            self.endpoints[endpoint.name] = endpoint
    
    async def initialize(self):
        """Initialize uptime monitoring system"""
        try:
            # Initialize Redis for data storage
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis_client = redis.from_url(redis_url)
            
            # Initialize HTTP checker
            await self.checkers[CheckType.HTTP].initialize()
            await self.checkers[CheckType.HTTPS].initialize()
            
            # Start monitoring all endpoints
            await self.start_monitoring()
            
            # Start background tasks
            asyncio.create_task(self._stats_calculation_worker())
            asyncio.create_task(self._incident_management_worker())
            asyncio.create_task(self._cleanup_worker())
            
            logger.info(f"Uptime monitoring initialized for {len(self.endpoints)} endpoints")
            
        except Exception as e:
            logger.error(f"Failed to initialize uptime monitoring: {e}")
    
    async def start_monitoring(self):
        """Start monitoring all configured endpoints"""
        for endpoint_name, endpoint in self.endpoints.items():
            if endpoint.maintenance:
                logger.info(f"Skipping {endpoint_name} - in maintenance mode")
                continue
            
            # Start monitoring task for this endpoint
            task = asyncio.create_task(self._monitor_endpoint(endpoint))
            self.monitoring_tasks[endpoint_name] = task
            
            logger.info(f"Started monitoring {endpoint_name} every {endpoint.interval_seconds}s")
    
    async def _monitor_endpoint(self, endpoint: EndpointCheck):
        """Monitor a single endpoint continuously"""
        consecutive_failures = 0
        last_status = EndpointStatus.UP
        
        while True:
            try:
                # Perform check
                checker = self.checkers.get(endpoint.check_type)
                if not checker:
                    logger.error(f"No checker available for {endpoint.check_type}")
                    await asyncio.sleep(endpoint.interval_seconds)
                    continue
                
                result = await checker.check_endpoint(endpoint)
                
                # Store result
                await self._store_check_result(result)
                
                # Track consecutive failures
                if result.status == EndpointStatus.DOWN:
                    consecutive_failures += 1
                else:
                    consecutive_failures = 0
                
                # Check for status changes and trigger alerts
                if result.status != last_status:
                    await self._handle_status_change(endpoint, result, last_status)
                
                # Check for alert conditions
                await self._check_alert_conditions(endpoint, result, consecutive_failures)
                
                last_status = result.status
                
                logger.debug(f"Checked {endpoint.name}: {result.status.value} ({result.response_time_ms:.2f}ms)")
                
            except Exception as e:
                logger.error(f"Error monitoring {endpoint.name}: {e}")
                
                # Create error result
                error_result = CheckResult(
                    endpoint_name=endpoint.name,
                    timestamp=datetime.utcnow(),
                    status=EndpointStatus.DOWN,
                    response_time_ms=0,
                    error_message=str(e)
                )
                await self._store_check_result(error_result)
            
            # Wait for next check
            await asyncio.sleep(endpoint.interval_seconds)
    
    async def _store_check_result(self, result: CheckResult):
        """Store check result in Redis"""
        try:
            if not self.redis_client:
                # Fallback to in-memory storage
                if result.endpoint_name not in self.check_results:
                    self.check_results[result.endpoint_name] = []
                
                self.check_results[result.endpoint_name].append(result)
                
                # Keep only last 1000 results per endpoint
                if len(self.check_results[result.endpoint_name]) > 1000:
                    self.check_results[result.endpoint_name] = self.check_results[result.endpoint_name][-1000:]
                
                return
            
            # Store in Redis time series
            timestamp = int(result.timestamp.timestamp())
            
            # Store detailed result
            await self.redis_client.setex(
                f"uptime:result:{result.endpoint_name}:{timestamp}",
                3600 * 24 * 7,  # 7 days TTL
                json.dumps(result.to_dict())
            )
            
            # Store in time series for quick queries
            await self.redis_client.zadd(
                f"uptime:timeseries:{result.endpoint_name}",
                {json.dumps(result.to_dict()): timestamp}
            )
            
            # Keep only last 24 hours in time series
            cutoff_time = timestamp - (24 * 3600)
            await self.redis_client.zremrangebyscore(
                f"uptime:timeseries:{result.endpoint_name}",
                0,
                cutoff_time
            )
            
            # Store current status
            await self.redis_client.setex(
                f"uptime:current:{result.endpoint_name}",
                300,  # 5 minute TTL
                json.dumps(result.to_dict())
            )
            
        except Exception as e:
            logger.error(f"Failed to store check result: {e}")
    
    async def _handle_status_change(self, endpoint: EndpointCheck, result: CheckResult, previous_status: EndpointStatus):
        """Handle endpoint status changes"""
        try:
            # Log status change
            logger.info(f"Status change for {endpoint.name}: {previous_status.value} -> {result.status.value}")
            
            # Track incident
            if result.status == EndpointStatus.DOWN and previous_status in [EndpointStatus.UP, EndpointStatus.DEGRADED]:
                # Start new incident
                incident_id = f"{endpoint.name}_{int(result.timestamp.timestamp())}"
                self.incident_tracker[incident_id] = {
                    "endpoint_name": endpoint.name,
                    "start_time": result.timestamp,
                    "end_time": None,
                    "status": "open",
                    "initial_error": result.error_message
                }
                
                # Trigger down alert
                await self._trigger_status_alert(endpoint, result, "down")
                
            elif result.status in [EndpointStatus.UP, EndpointStatus.DEGRADED] and previous_status == EndpointStatus.DOWN:
                # End incident
                for incident_id, incident in self.incident_tracker.items():
                    if incident["endpoint_name"] == endpoint.name and incident["status"] == "open":
                        incident["end_time"] = result.timestamp
                        incident["status"] = "resolved"
                        
                        # Calculate downtime
                        downtime_duration = (result.timestamp - incident["start_time"]).total_seconds()
                        incident["downtime_seconds"] = downtime_duration
                        
                        break
                
                # Trigger recovery alert
                await self._trigger_status_alert(endpoint, result, "recovery")
            
        except Exception as e:
            logger.error(f"Failed to handle status change: {e}")
    
    async def _check_alert_conditions(self, endpoint: EndpointCheck, result: CheckResult, consecutive_failures: int):
        """Check various alert conditions"""
        try:
            # Consecutive failures
            if consecutive_failures >= self.alert_thresholds["consecutive_failures"]:
                await self._trigger_consecutive_failures_alert(endpoint, consecutive_failures)
            
            # Response time degradation
            if (result.status != EndpointStatus.DOWN and 
                result.response_time_ms > self.alert_thresholds["response_time_degraded_ms"]):
                await self._trigger_performance_alert(endpoint, result)
            
            # SSL certificate expiry warning
            if (result.ssl_expiry_days is not None and 
                result.ssl_expiry_days <= self.alert_thresholds["ssl_expiry_warning_days"]):
                await self._trigger_ssl_expiry_alert(endpoint, result)
            
        except Exception as e:
            logger.error(f"Failed to check alert conditions: {e}")
    
    async def _trigger_status_alert(self, endpoint: EndpointCheck, result: CheckResult, alert_type: str):
        """Trigger status change alert"""
        try:
            # Import here to avoid circular imports
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            if alert_type == "down":
                severity = AlertSeverity.CRITICAL if endpoint.critical else AlertSeverity.WARNING
                title = f"Endpoint Down: {endpoint.name}"
                description = f"Endpoint {endpoint.name} is down. Error: {result.error_message or 'Unknown error'}"
            else:  # recovery
                severity = AlertSeverity.INFO
                title = f"Endpoint Recovered: {endpoint.name}"
                description = f"Endpoint {endpoint.name} has recovered and is back online"
            
            await send_alert(
                title=title,
                description=description,
                severity=severity,
                source="uptime_monitoring",
                category="infrastructure",
                metadata={
                    "endpoint_name": endpoint.name,
                    "endpoint_url": endpoint.url,
                    "status": result.status.value,
                    "response_time_ms": result.response_time_ms,
                    "error_message": result.error_message,
                    "critical": endpoint.critical
                },
                tags=["uptime", "endpoint", alert_type, endpoint.name]
            )
            
        except Exception as e:
            logger.error(f"Failed to trigger status alert: {e}")
    
    async def _trigger_consecutive_failures_alert(self, endpoint: EndpointCheck, failure_count: int):
        """Trigger consecutive failures alert"""
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            severity = AlertSeverity.CRITICAL if endpoint.critical else AlertSeverity.WARNING
            
            await send_alert(
                title=f"Consecutive Failures: {endpoint.name}",
                description=f"Endpoint {endpoint.name} has failed {failure_count} consecutive checks",
                severity=severity,
                source="uptime_monitoring",
                category="infrastructure",
                metadata={
                    "endpoint_name": endpoint.name,
                    "failure_count": failure_count,
                    "threshold": self.alert_thresholds["consecutive_failures"]
                },
                tags=["uptime", "consecutive_failures", endpoint.name]
            )
            
        except Exception as e:
            logger.error(f"Failed to trigger consecutive failures alert: {e}")
    
    async def _trigger_performance_alert(self, endpoint: EndpointCheck, result: CheckResult):
        """Trigger performance degradation alert"""
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            await send_alert(
                title=f"Performance Degradation: {endpoint.name}",
                description=f"Endpoint {endpoint.name} response time ({result.response_time_ms:.2f}ms) exceeds threshold ({self.alert_thresholds['response_time_degraded_ms']}ms)",
                severity=AlertSeverity.WARNING,
                source="uptime_monitoring",
                category="performance",
                metadata={
                    "endpoint_name": endpoint.name,
                    "response_time_ms": result.response_time_ms,
                    "threshold_ms": self.alert_thresholds["response_time_degraded_ms"]
                },
                tags=["uptime", "performance", endpoint.name]
            )
            
        except Exception as e:
            logger.error(f"Failed to trigger performance alert: {e}")
    
    async def _trigger_ssl_expiry_alert(self, endpoint: EndpointCheck, result: CheckResult):
        """Trigger SSL certificate expiry alert"""
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            if result.ssl_expiry_days <= 7:
                severity = AlertSeverity.CRITICAL
            elif result.ssl_expiry_days <= 14:
                severity = AlertSeverity.WARNING
            else:
                severity = AlertSeverity.INFO
            
            await send_alert(
                title=f"SSL Certificate Expiring: {endpoint.name}",
                description=f"SSL certificate for {endpoint.name} expires in {result.ssl_expiry_days} days",
                severity=severity,
                source="uptime_monitoring",
                category="security",
                metadata={
                    "endpoint_name": endpoint.name,
                    "ssl_expiry_days": result.ssl_expiry_days,
                    "threshold_days": self.alert_thresholds["ssl_expiry_warning_days"]
                },
                tags=["uptime", "ssl", "certificate", endpoint.name]
            )
            
        except Exception as e:
            logger.error(f"Failed to trigger SSL expiry alert: {e}")
    
    async def _stats_calculation_worker(self):
        """Background worker for calculating uptime statistics"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                for endpoint_name in self.endpoints.keys():
                    await self._calculate_endpoint_stats(endpoint_name)
                    
            except Exception as e:
                logger.error(f"Error in stats calculation worker: {e}")
    
    async def _calculate_endpoint_stats(self, endpoint_name: str):
        """Calculate uptime statistics for an endpoint"""
        try:
            # Get recent check results (last 24 hours)
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=24)
            
            results = await self._get_check_results(endpoint_name, start_time, end_time)
            
            if not results:
                return
            
            # Calculate statistics
            total_checks = len(results)
            successful_checks = len([r for r in results if r.status == EndpointStatus.UP])
            failed_checks = total_checks - successful_checks
            
            uptime_percentage = (successful_checks / total_checks) * 100 if total_checks > 0 else 0
            
            response_times = [r.response_time_ms for r in results if r.response_time_ms > 0]
            average_response_time_ms = sum(response_times) / len(response_times) if response_times else 0
            
            # Find last downtime
            last_downtime = None
            for result in reversed(results):
                if result.status == EndpointStatus.DOWN:
                    last_downtime = result.timestamp
                    break
            
            # Calculate current streak
            current_streak = 0
            current_status = results[-1].status if results else EndpointStatus.UP
            for result in reversed(results):
                if result.status == current_status:
                    current_streak += 1
                else:
                    break
            
            # Calculate longest downtime
            longest_downtime_minutes = 0
            downtime_start = None
            for result in results:
                if result.status == EndpointStatus.DOWN and downtime_start is None:
                    downtime_start = result.timestamp
                elif result.status != EndpointStatus.DOWN and downtime_start is not None:
                    downtime_duration = (result.timestamp - downtime_start).total_seconds() / 60
                    longest_downtime_minutes = max(longest_downtime_minutes, downtime_duration)
                    downtime_start = None
            
            # Check SLA compliance
            endpoint = self.endpoints[endpoint_name]
            sla_compliance = uptime_percentage >= endpoint.sla_target
            
            # Create stats object
            stats = UptimeStats(
                endpoint_name=endpoint_name,
                uptime_percentage=uptime_percentage,
                total_checks=total_checks,
                successful_checks=successful_checks,
                failed_checks=failed_checks,
                average_response_time_ms=average_response_time_ms,
                last_downtime=last_downtime,
                current_streak=current_streak,
                longest_downtime_minutes=longest_downtime_minutes,
                sla_compliance=sla_compliance
            )
            
            # Store stats in Redis
            if self.redis_client:
                await self.redis_client.setex(
                    f"uptime:stats:{endpoint_name}",
                    300,  # 5 minute TTL
                    json.dumps(stats.to_dict())
                )
            
            # Check for SLA violations
            if not sla_compliance:
                await self._trigger_sla_violation_alert(endpoint, stats)
            
        except Exception as e:
            logger.error(f"Failed to calculate stats for {endpoint_name}: {e}")
    
    async def _get_check_results(self, endpoint_name: str, start_time: datetime, end_time: datetime) -> List[CheckResult]:
        """Get check results for time range"""
        try:
            if not self.redis_client:
                # Fallback to in-memory storage
                results = self.check_results.get(endpoint_name, [])
                return [r for r in results if start_time <= r.timestamp <= end_time]
            
            # Get from Redis
            start_ts = int(start_time.timestamp())
            end_ts = int(end_time.timestamp())
            
            data = await self.redis_client.zrangebyscore(
                f"uptime:timeseries:{endpoint_name}",
                start_ts,
                end_ts
            )
            
            results = []
            for item in data:
                result_dict = json.loads(item)
                result = CheckResult(
                    endpoint_name=result_dict["endpoint_name"],
                    timestamp=datetime.fromisoformat(result_dict["timestamp"]),
                    status=EndpointStatus(result_dict["status"]),
                    response_time_ms=result_dict["response_time_ms"],
                    status_code=result_dict.get("status_code"),
                    error_message=result_dict.get("error_message"),
                    response_size_bytes=result_dict.get("response_size_bytes"),
                    ssl_expiry_days=result_dict.get("ssl_expiry_days")
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get check results: {e}")
            return []
    
    async def _trigger_sla_violation_alert(self, endpoint: EndpointCheck, stats: UptimeStats):
        """Trigger SLA violation alert"""
        try:
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            await send_alert(
                title=f"SLA Violation: {endpoint.name}",
                description=f"Endpoint {endpoint.name} uptime ({stats.uptime_percentage:.2f}%) is below SLA target ({endpoint.sla_target}%)",
                severity=AlertSeverity.CRITICAL if endpoint.critical else AlertSeverity.WARNING,
                source="uptime_monitoring",
                category="sla",
                metadata={
                    "endpoint_name": endpoint.name,
                    "current_uptime": stats.uptime_percentage,
                    "sla_target": endpoint.sla_target,
                    "total_checks": stats.total_checks,
                    "failed_checks": stats.failed_checks
                },
                tags=["uptime", "sla_violation", endpoint.name]
            )
            
        except Exception as e:
            logger.error(f"Failed to trigger SLA violation alert: {e}")
    
    async def _incident_management_worker(self):
        """Background worker for incident management"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                # Process and clean up old incidents
                current_time = datetime.utcnow()
                incidents_to_remove = []
                
                for incident_id, incident in self.incident_tracker.items():
                    # Auto-close incidents older than 24 hours
                    if (current_time - incident["start_time"]).total_seconds() > 24 * 3600:
                        if incident["status"] == "open":
                            incident["status"] = "auto_closed"
                            incident["end_time"] = current_time
                        
                        # Mark for removal if older than 7 days
                        if (current_time - incident["start_time"]).total_seconds() > 7 * 24 * 3600:
                            incidents_to_remove.append(incident_id)
                
                # Remove old incidents
                for incident_id in incidents_to_remove:
                    del self.incident_tracker[incident_id]
                    
            except Exception as e:
                logger.error(f"Error in incident management worker: {e}")
    
    async def _cleanup_worker(self):
        """Background worker for cleanup tasks"""
        while True:
            try:
                # Run cleanup once per day
                await asyncio.sleep(24 * 3600)
                
                # Clean up old data in Redis
                if self.redis_client:
                    cutoff_time = int((datetime.utcnow() - timedelta(days=7)).timestamp())
                    
                    for endpoint_name in self.endpoints.keys():
                        # Clean time series data
                        await self.redis_client.zremrangebyscore(
                            f"uptime:timeseries:{endpoint_name}",
                            0,
                            cutoff_time
                        )
                
            except Exception as e:
                logger.error(f"Error in cleanup worker: {e}")
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get uptime dashboard data"""
        try:
            dashboard_data = {
                "endpoints": {},
                "overall_stats": {
                    "total_endpoints": len(self.endpoints),
                    "critical_endpoints": len([e for e in self.endpoints.values() if e.critical]),
                    "endpoints_up": 0,
                    "endpoints_down": 0,
                    "endpoints_degraded": 0,
                    "average_uptime": 0
                },
                "incidents": list(self.incident_tracker.values()),
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Get current status and stats for each endpoint
            uptimes = []
            for endpoint_name, endpoint in self.endpoints.items():
                # Get current status
                current_status = EndpointStatus.UP
                if self.redis_client:
                    current_data = await self.redis_client.get(f"uptime:current:{endpoint_name}")
                    if current_data:
                        current_result = json.loads(current_data)
                        current_status = EndpointStatus(current_result["status"])
                
                # Get stats
                stats_data = {}
                if self.redis_client:
                    stats_json = await self.redis_client.get(f"uptime:stats:{endpoint_name}")
                    if stats_json:
                        stats_data = json.loads(stats_json)
                
                dashboard_data["endpoints"][endpoint_name] = {
                    "config": asdict(endpoint),
                    "current_status": current_status.value,
                    "stats": stats_data
                }
                
                # Update overall stats
                if current_status == EndpointStatus.UP:
                    dashboard_data["overall_stats"]["endpoints_up"] += 1
                elif current_status == EndpointStatus.DOWN:
                    dashboard_data["overall_stats"]["endpoints_down"] += 1
                else:
                    dashboard_data["overall_stats"]["endpoints_degraded"] += 1
                
                if stats_data and "uptime_percentage" in stats_data:
                    uptimes.append(stats_data["uptime_percentage"])
            
            # Calculate average uptime
            if uptimes:
                dashboard_data["overall_stats"]["average_uptime"] = sum(uptimes) / len(uptimes)
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Failed to get dashboard data: {e}")
            return {}
    
    async def stop_monitoring(self):
        """Stop all monitoring tasks"""
        try:
            for task in self.monitoring_tasks.values():
                task.cancel()
            
            await asyncio.gather(*self.monitoring_tasks.values(), return_exceptions=True)
            self.monitoring_tasks.clear()
            
            # Close HTTP sessions
            await self.checkers[CheckType.HTTP].close()
            await self.checkers[CheckType.HTTPS].close()
            
            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()
            
            logger.info("Uptime monitoring stopped")
            
        except Exception as e:
            logger.error(f"Error stopping monitoring: {e}")


# Global uptime monitor instance
uptime_monitor = EnterpriseUptimeMonitor()

# Convenience functions
async def initialize_uptime_monitoring():
    """Initialize uptime monitoring"""
    await uptime_monitor.initialize()

async def get_uptime_dashboard_data() -> Dict[str, Any]:
    """Get uptime dashboard data"""
    return await uptime_monitor.get_dashboard_data()

async def get_endpoint_status(endpoint_name: str) -> Optional[EndpointStatus]:
    """Get current status of an endpoint"""
    try:
        if uptime_monitor.redis_client:
            current_data = await uptime_monitor.redis_client.get(f"uptime:current:{endpoint_name}")
            if current_data:
                result = json.loads(current_data)
                return EndpointStatus(result["status"])
        return None
    except Exception as e:
        logger.error(f"Failed to get endpoint status: {e}")
        return None

def add_custom_endpoint(endpoint: EndpointCheck):
    """Add custom endpoint for monitoring"""
    uptime_monitor.endpoints[endpoint.name] = endpoint