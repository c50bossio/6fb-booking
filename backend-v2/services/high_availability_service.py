"""
High Availability and Resilience Service
Comprehensive load balancing, failover, circuit breakers, and resilience patterns
for 99.9%+ uptime in the 6fb-booking platform
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import json
import random
from decimal import Decimal

from services.redis_service import cache_service
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity


class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Blocking requests
    HALF_OPEN = "half_open"  # Testing recovery


class FailoverStrategy(Enum):
    ACTIVE_PASSIVE = "active_passive"
    ACTIVE_ACTIVE = "active_active"
    ROUND_ROBIN = "round_robin"
    WEIGHTED = "weighted"
    GEOGRAPHIC = "geographic"


class LoadBalancingAlgorithm(Enum):
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    LEAST_RESPONSE_TIME = "least_response_time"
    HASH_BASED = "hash_based"
    HEALTH_AWARE = "health_aware"


@dataclass
class ServiceInstance:
    """Represents a service instance"""
    instance_id: str
    service_name: str
    host: str
    port: int
    weight: float = 1.0
    current_connections: int = 0
    total_requests: int = 0
    failed_requests: int = 0
    last_health_check: Optional[datetime] = None
    health_status: str = "unknown"  # healthy, unhealthy, draining
    response_time_ms: float = 0.0
    created_at: datetime = field(default_factory=datetime.utcnow)
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class CircuitBreaker:
    """Circuit breaker implementation"""
    name: str
    failure_threshold: int
    recovery_timeout_seconds: int
    success_threshold: int  # for half-open state
    
    # State tracking
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_state_change: datetime = field(default_factory=datetime.utcnow)
    
    # Statistics
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    blocked_requests: int = 0
    
    # Configuration
    timeout_seconds: float = 5.0
    fallback_enabled: bool = True
    fallback_response: Any = None


@dataclass
class HealthCheck:
    """Health check configuration"""
    service_name: str
    endpoint: str
    method: str = "GET"
    timeout_seconds: float = 5.0
    interval_seconds: int = 30
    unhealthy_threshold: int = 3
    healthy_threshold: int = 2
    expected_status_codes: List[int] = field(default_factory=lambda: [200])
    expected_response_time_ms: float = 1000.0


@dataclass
class FailoverRule:
    """Failover rule configuration"""
    primary_service: str
    backup_services: List[str]
    strategy: FailoverStrategy
    health_check_failures_threshold: int = 3
    automatic_failback: bool = True
    failback_delay_seconds: int = 300
    traffic_percentage_cutover: float = 100.0


class HighAvailabilityService:
    """Comprehensive high availability and resilience service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Service discovery and load balancing
        self.service_registry = defaultdict(list)
        self.load_balancer_state = defaultdict(dict)
        self.service_health = defaultdict(dict)
        
        # Circuit breakers
        self.circuit_breakers = {}
        self.circuit_breaker_configs = self._create_circuit_breaker_configs()
        
        # Health checks
        self.health_checks = {}
        self.health_check_results = defaultdict(deque)
        
        # Failover management
        self.failover_rules = {}
        self.failover_state = {}
        self.failover_history = deque(maxlen=100)
        
        # Rate limiting and traffic shaping
        self.rate_limiters = {}
        self.traffic_patterns = defaultdict(lambda: deque(maxlen=1000))
        
        # Chaos engineering
        self.chaos_experiments = {}
        self.chaos_enabled = False
        
        # Monitoring and metrics
        self.availability_metrics = defaultdict(lambda: deque(maxlen=1440))  # 24 hours of minute data
        self.performance_metrics = defaultdict(lambda: deque(maxlen=1440))
        
        # Configuration
        self.enable_automatic_failover = True
        self.enable_circuit_breakers = True
        self.enable_health_checks = True
        
        # Background tasks
        self._monitoring_tasks = []
        self._stop_monitoring = False
        
        self.logger.info("🛡️ High Availability Service initialized")
    
    def _create_circuit_breaker_configs(self) -> Dict[str, Dict[str, Any]]:
        """Create circuit breaker configurations for critical services"""
        return {
            "database_primary": {
                "failure_threshold": 5,
                "recovery_timeout_seconds": 60,
                "success_threshold": 3,
                "timeout_seconds": 5.0,
                "fallback_enabled": True,
                "fallback_response": {"error": "Database temporarily unavailable", "fallback": True}
            },
            
            "stripe_api": {
                "failure_threshold": 3,
                "recovery_timeout_seconds": 30,
                "success_threshold": 2,
                "timeout_seconds": 10.0,
                "fallback_enabled": True,
                "fallback_response": {"error": "Payment service unavailable", "fallback": True}
            },
            
            "sendgrid_api": {
                "failure_threshold": 5,
                "recovery_timeout_seconds": 120,
                "success_threshold": 3,
                "timeout_seconds": 15.0,
                "fallback_enabled": True,
                "fallback_response": {"error": "Email service degraded", "fallback": True}
            },
            
            "twilio_api": {
                "failure_threshold": 5,
                "recovery_timeout_seconds": 120,
                "success_threshold": 3,
                "timeout_seconds": 15.0,
                "fallback_enabled": True,
                "fallback_response": {"error": "SMS service degraded", "fallback": True}
            },
            
            "api_gateway": {
                "failure_threshold": 10,
                "recovery_timeout_seconds": 30,
                "success_threshold": 5,
                "timeout_seconds": 3.0,
                "fallback_enabled": False
            },
            
            "booking_system": {
                "failure_threshold": 5,
                "recovery_timeout_seconds": 45,
                "success_threshold": 3,
                "timeout_seconds": 5.0,
                "fallback_enabled": True,
                "fallback_response": {"error": "Booking temporarily unavailable", "fallback": True}
            },
            
            "payment_system": {
                "failure_threshold": 3,
                "recovery_timeout_seconds": 30,
                "success_threshold": 2,
                "timeout_seconds": 8.0,
                "fallback_enabled": True,
                "fallback_response": {"error": "Payment processing unavailable", "fallback": True}
            }
        }
    
    async def start_monitoring(self):
        """Start high availability monitoring and management"""
        try:
            self.logger.info("🛡️ Starting high availability monitoring...")
            
            # Initialize circuit breakers
            await self._initialize_circuit_breakers()
            
            # Initialize health checks
            await self._initialize_health_checks()
            
            # Initialize failover rules
            await self._initialize_failover_rules()
            
            # Start monitoring tasks
            tasks = [
                self._circuit_breaker_monitoring_loop(),
                self._health_check_loop(),
                self._failover_monitoring_loop(),
                self._load_balancer_loop(),
                self._availability_metrics_loop(),
                self._traffic_analysis_loop()
            ]
            
            self._monitoring_tasks = [asyncio.create_task(task) for task in tasks]
            await asyncio.gather(*self._monitoring_tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"❌ High availability monitoring startup failed: {e}")
            await enhanced_sentry.capture_exception(e, {"context": "ha_monitoring_startup"})
    
    # Circuit Breaker Management
    
    async def _initialize_circuit_breakers(self):
        """Initialize circuit breakers for all services"""
        for service_name, config in self.circuit_breaker_configs.items():
            circuit_breaker = CircuitBreaker(
                name=service_name,
                failure_threshold=config["failure_threshold"],
                recovery_timeout_seconds=config["recovery_timeout_seconds"],
                success_threshold=config["success_threshold"],
                timeout_seconds=config["timeout_seconds"],
                fallback_enabled=config["fallback_enabled"],
                fallback_response=config.get("fallback_response")
            )
            
            self.circuit_breakers[service_name] = circuit_breaker
            self.logger.info(f"🔌 Initialized circuit breaker for {service_name}")
    
    async def execute_with_circuit_breaker(self, 
                                         service_name: str, 
                                         operation: Callable, 
                                         *args, 
                                         **kwargs) -> Any:
        """Execute operation with circuit breaker protection"""
        
        circuit = self.circuit_breakers.get(service_name)
        if not circuit or not self.enable_circuit_breakers:
            return await operation(*args, **kwargs)
        
        # Check circuit state
        if circuit.state == CircuitState.OPEN:
            # Check if we should attempt recovery
            if self._should_attempt_recovery(circuit):
                circuit.state = CircuitState.HALF_OPEN
                circuit.last_state_change = datetime.utcnow()
                self.logger.info(f"🔄 Circuit breaker {service_name} moved to HALF_OPEN")
            else:
                # Circuit is open, return fallback or raise exception
                circuit.blocked_requests += 1
                if circuit.fallback_enabled and circuit.fallback_response is not None:
                    return circuit.fallback_response
                else:
                    raise CircuitBreakerOpenException(f"Circuit breaker {service_name} is OPEN")
        
        # Execute operation
        circuit.total_requests += 1
        start_time = time.time()
        
        try:
            # Execute with timeout
            result = await asyncio.wait_for(
                operation(*args, **kwargs),
                timeout=circuit.timeout_seconds
            )
            
            # Record success
            execution_time = time.time() - start_time
            await self._record_circuit_success(circuit, execution_time)
            
            return result
            
        except asyncio.TimeoutError:
            await self._record_circuit_failure(circuit, "timeout")
            raise CircuitBreakerTimeoutException(f"Operation timed out after {circuit.timeout_seconds}s")
            
        except Exception as e:
            await self._record_circuit_failure(circuit, str(e))
            raise
    
    async def _record_circuit_success(self, circuit: CircuitBreaker, execution_time: float):
        """Record successful circuit breaker execution"""
        circuit.successful_requests += 1
        
        if circuit.state == CircuitState.HALF_OPEN:
            circuit.success_count += 1
            
            # Check if we should close the circuit
            if circuit.success_count >= circuit.success_threshold:
                circuit.state = CircuitState.CLOSED
                circuit.failure_count = 0
                circuit.success_count = 0
                circuit.last_state_change = datetime.utcnow()
                self.logger.info(f"✅ Circuit breaker {circuit.name} CLOSED (recovered)")
        
        elif circuit.state == CircuitState.CLOSED:
            # Reset failure count on success
            circuit.failure_count = max(0, circuit.failure_count - 1)
    
    async def _record_circuit_failure(self, circuit: CircuitBreaker, error: str):
        """Record failed circuit breaker execution"""
        circuit.failed_requests += 1
        circuit.failure_count += 1
        circuit.last_failure_time = datetime.utcnow()
        
        if circuit.state == CircuitState.CLOSED:
            # Check if we should open the circuit
            if circuit.failure_count >= circuit.failure_threshold:
                circuit.state = CircuitState.OPEN
                circuit.last_state_change = datetime.utcnow()
                self.logger.error(f"🚫 Circuit breaker {circuit.name} OPENED due to failures")
                
                # Send alert
                await enhanced_sentry.capture_business_event(
                    "circuit_breaker_opened",
                    f"Circuit breaker {circuit.name} opened due to {circuit.failure_count} failures",
                    {
                        "service": circuit.name,
                        "failure_count": circuit.failure_count,
                        "last_error": error
                    },
                    severity=AlertSeverity.HIGH
                )
        
        elif circuit.state == CircuitState.HALF_OPEN:
            # Failure in half-open state, go back to open
            circuit.state = CircuitState.OPEN
            circuit.success_count = 0
            circuit.last_state_change = datetime.utcnow()
            self.logger.warning(f"🔄 Circuit breaker {circuit.name} back to OPEN (recovery failed)")
    
    def _should_attempt_recovery(self, circuit: CircuitBreaker) -> bool:
        """Check if circuit breaker should attempt recovery"""
        if circuit.state != CircuitState.OPEN:
            return False
        
        time_since_open = datetime.utcnow() - circuit.last_state_change
        return time_since_open.total_seconds() >= circuit.recovery_timeout_seconds
    
    async def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """Get status of all circuit breakers"""
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "circuit_breakers_enabled": self.enable_circuit_breakers,
            "total_circuits": len(self.circuit_breakers),
            "circuits": {}
        }
        
        state_counts = {"closed": 0, "open": 0, "half_open": 0}
        
        for name, circuit in self.circuit_breakers.items():
            circuit_status = {
                "state": circuit.state.value,
                "failure_count": circuit.failure_count,
                "success_count": circuit.success_count,
                "total_requests": circuit.total_requests,
                "successful_requests": circuit.successful_requests,
                "failed_requests": circuit.failed_requests,
                "blocked_requests": circuit.blocked_requests,
                "success_rate": (circuit.successful_requests / circuit.total_requests * 100) if circuit.total_requests > 0 else 0,
                "last_state_change": circuit.last_state_change.isoformat(),
                "fallback_enabled": circuit.fallback_enabled,
                "configuration": {
                    "failure_threshold": circuit.failure_threshold,
                    "recovery_timeout_seconds": circuit.recovery_timeout_seconds,
                    "success_threshold": circuit.success_threshold,
                    "timeout_seconds": circuit.timeout_seconds
                }
            }
            
            status["circuits"][name] = circuit_status
            state_counts[circuit.state.value] += 1
        
        status["summary"] = {
            "closed_circuits": state_counts["closed"],
            "open_circuits": state_counts["open"],
            "half_open_circuits": state_counts["half_open"],
            "overall_health": "healthy" if state_counts["open"] == 0 else "degraded"
        }
        
        return status
    
    async def manually_open_circuit(self, service_name: str, reason: str = "Manual intervention") -> bool:
        """Manually open a circuit breaker"""
        circuit = self.circuit_breakers.get(service_name)
        if not circuit:
            return False
        
        circuit.state = CircuitState.OPEN
        circuit.last_state_change = datetime.utcnow()
        
        self.logger.warning(f"🔧 Circuit breaker {service_name} manually OPENED: {reason}")
        
        await enhanced_sentry.capture_business_event(
            "circuit_breaker_manual_open",
            f"Circuit breaker {service_name} manually opened",
            {"service": service_name, "reason": reason},
            severity=AlertSeverity.MEDIUM
        )
        
        return True
    
    async def manually_close_circuit(self, service_name: str, reason: str = "Manual intervention") -> bool:
        """Manually close a circuit breaker"""
        circuit = self.circuit_breakers.get(service_name)
        if not circuit:
            return False
        
        circuit.state = CircuitState.CLOSED
        circuit.failure_count = 0
        circuit.success_count = 0
        circuit.last_state_change = datetime.utcnow()
        
        self.logger.info(f"🔧 Circuit breaker {service_name} manually CLOSED: {reason}")
        
        return True
    
    # Service Discovery and Load Balancing
    
    async def register_service_instance(self, 
                                      service_name: str, 
                                      instance_id: str,
                                      host: str, 
                                      port: int,
                                      weight: float = 1.0,
                                      tags: Dict[str, str] = None) -> bool:
        """Register a service instance"""
        
        instance = ServiceInstance(
            instance_id=instance_id,
            service_name=service_name,
            host=host,
            port=port,
            weight=weight,
            tags=tags or {}
        )
        
        # Add to service registry
        self.service_registry[service_name] = [
            inst for inst in self.service_registry[service_name]
            if inst.instance_id != instance_id
        ]
        self.service_registry[service_name].append(instance)
        
        # Initialize load balancer state
        if service_name not in self.load_balancer_state:
            self.load_balancer_state[service_name] = {
                "current_index": 0,
                "algorithm": LoadBalancingAlgorithm.HEALTH_AWARE,
                "sticky_sessions": {}
            }
        
        self.logger.info(f"📋 Registered service instance: {service_name}/{instance_id} at {host}:{port}")
        
        return True
    
    async def deregister_service_instance(self, 
                                        service_name: str, 
                                        instance_id: str) -> bool:
        """Deregister a service instance"""
        
        if service_name not in self.service_registry:
            return False
        
        initial_count = len(self.service_registry[service_name])
        self.service_registry[service_name] = [
            inst for inst in self.service_registry[service_name]
            if inst.instance_id != instance_id
        ]
        
        removed = len(self.service_registry[service_name]) < initial_count
        
        if removed:
            self.logger.info(f"📋 Deregistered service instance: {service_name}/{instance_id}")
        
        return removed
    
    async def get_service_instance(self, 
                                 service_name: str, 
                                 algorithm: LoadBalancingAlgorithm = None,
                                 session_id: str = None) -> Optional[ServiceInstance]:
        """Get a service instance using load balancing"""
        
        instances = self.service_registry.get(service_name, [])
        if not instances:
            return None
        
        # Filter healthy instances
        healthy_instances = [
            inst for inst in instances
            if self.service_health.get(service_name, {}).get(inst.instance_id, {}).get("status") == "healthy"
        ]
        
        if not healthy_instances:
            # No healthy instances, use all instances as fallback
            healthy_instances = instances
        
        # Use specified algorithm or default
        if not algorithm:
            algorithm = self.load_balancer_state[service_name].get("algorithm", LoadBalancingAlgorithm.HEALTH_AWARE)
        
        # Apply load balancing algorithm
        if algorithm == LoadBalancingAlgorithm.ROUND_ROBIN:
            return self._round_robin_selection(service_name, healthy_instances)
        
        elif algorithm == LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN:
            return self._weighted_round_robin_selection(service_name, healthy_instances)
        
        elif algorithm == LoadBalancingAlgorithm.LEAST_CONNECTIONS:
            return self._least_connections_selection(healthy_instances)
        
        elif algorithm == LoadBalancingAlgorithm.LEAST_RESPONSE_TIME:
            return self._least_response_time_selection(healthy_instances)
        
        elif algorithm == LoadBalancingAlgorithm.HASH_BASED:
            return self._hash_based_selection(healthy_instances, session_id or "default")
        
        elif algorithm == LoadBalancingAlgorithm.HEALTH_AWARE:
            return self._health_aware_selection(service_name, healthy_instances)
        
        else:
            return healthy_instances[0] if healthy_instances else None
    
    def _round_robin_selection(self, service_name: str, instances: List[ServiceInstance]) -> ServiceInstance:
        """Round-robin load balancing"""
        state = self.load_balancer_state[service_name]
        index = state["current_index"] % len(instances)
        state["current_index"] = (index + 1) % len(instances)
        return instances[index]
    
    def _weighted_round_robin_selection(self, service_name: str, instances: List[ServiceInstance]) -> ServiceInstance:
        """Weighted round-robin load balancing"""
        total_weight = sum(inst.weight for inst in instances)
        
        if total_weight == 0:
            return self._round_robin_selection(service_name, instances)
        
        # Use weighted random selection
        random_weight = random.uniform(0, total_weight)
        cumulative_weight = 0
        
        for instance in instances:
            cumulative_weight += instance.weight
            if random_weight <= cumulative_weight:
                return instance
        
        return instances[-1]  # Fallback
    
    def _least_connections_selection(self, instances: List[ServiceInstance]) -> ServiceInstance:
        """Least connections load balancing"""
        return min(instances, key=lambda inst: inst.current_connections)
    
    def _least_response_time_selection(self, instances: List[ServiceInstance]) -> ServiceInstance:
        """Least response time load balancing"""
        return min(instances, key=lambda inst: inst.response_time_ms)
    
    def _hash_based_selection(self, instances: List[ServiceInstance], session_id: str) -> ServiceInstance:
        """Hash-based (sticky session) load balancing"""
        hash_value = hash(session_id)
        index = hash_value % len(instances)
        return instances[index]
    
    def _health_aware_selection(self, service_name: str, instances: List[ServiceInstance]) -> ServiceInstance:
        """Health-aware load balancing with preference for healthy instances"""
        
        # Score instances based on health and performance
        scored_instances = []
        
        for instance in instances:
            health_data = self.service_health.get(service_name, {}).get(instance.instance_id, {})
            
            # Base score from health status
            health_score = {
                "healthy": 100,
                "degraded": 70,
                "unhealthy": 30,
                "unknown": 50
            }.get(health_data.get("status", "unknown"), 50)
            
            # Adjust for response time (lower is better)
            response_time_score = max(0, 100 - (instance.response_time_ms / 10))
            
            # Adjust for current load (lower connections is better)
            load_score = max(0, 100 - instance.current_connections * 10)
            
            # Combine scores
            total_score = (health_score * 0.5) + (response_time_score * 0.3) + (load_score * 0.2)
            
            scored_instances.append((instance, total_score))
        
        # Sort by score (descending) and select best instance
        scored_instances.sort(key=lambda x: x[1], reverse=True)
        
        # Use weighted random selection from top 3 instances
        top_instances = scored_instances[:min(3, len(scored_instances))]
        total_score = sum(score for _, score in top_instances)
        
        if total_score == 0:
            return scored_instances[0][0]
        
        random_score = random.uniform(0, total_score)
        cumulative_score = 0
        
        for instance, score in top_instances:
            cumulative_score += score
            if random_score <= cumulative_score:
                return instance
        
        return top_instances[0][0]  # Fallback
    
    async def update_instance_health(self, 
                                   service_name: str, 
                                   instance_id: str,
                                   health_status: str,
                                   response_time_ms: float = 0.0,
                                   current_connections: int = 0):
        """Update health status of a service instance"""
        
        if service_name not in self.service_health:
            self.service_health[service_name] = {}
        
        self.service_health[service_name][instance_id] = {
            "status": health_status,
            "response_time_ms": response_time_ms,
            "current_connections": current_connections,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        # Update the instance object
        for instance in self.service_registry.get(service_name, []):
            if instance.instance_id == instance_id:
                instance.health_status = health_status
                instance.response_time_ms = response_time_ms
                instance.current_connections = current_connections
                instance.last_health_check = datetime.utcnow()
                break
    
    # Health Check Management
    
    async def _initialize_health_checks(self):
        """Initialize health checks for critical services"""
        
        health_check_configs = {
            "api_gateway": HealthCheck(
                service_name="api_gateway",
                endpoint="http://localhost:8000/health/",
                timeout_seconds=5.0,
                interval_seconds=30
            ),
            
            "frontend_web": HealthCheck(
                service_name="frontend_web",
                endpoint="http://localhost:3000/",
                timeout_seconds=10.0,
                interval_seconds=60
            ),
            
            "database_primary": HealthCheck(
                service_name="database_primary",
                endpoint="tcp://localhost:5432",  # Would use database health check
                timeout_seconds=5.0,
                interval_seconds=30
            )
        }
        
        for name, config in health_check_configs.items():
            self.health_checks[name] = config
            self.logger.info(f"🏥 Initialized health check for {name}")
    
    async def _health_check_loop(self):
        """Perform regular health checks"""
        while not self._stop_monitoring:
            try:
                if self.enable_health_checks:
                    await self._perform_all_health_checks()
                
                await asyncio.sleep(30)  # Health checks every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Health check loop error: {e}")
                await asyncio.sleep(30)
    
    async def _perform_all_health_checks(self):
        """Perform health checks for all configured services"""
        
        health_check_tasks = []
        for service_name, health_check in self.health_checks.items():
            task = asyncio.create_task(self._perform_health_check(service_name, health_check))
            health_check_tasks.append(task)
        
        if health_check_tasks:
            await asyncio.gather(*health_check_tasks, return_exceptions=True)
    
    async def _perform_health_check(self, service_name: str, health_check: HealthCheck):
        """Perform health check for a specific service"""
        
        start_time = time.time()
        
        try:
            if health_check.endpoint.startswith("http"):
                # HTTP health check
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.request(
                        method=health_check.method,
                        url=health_check.endpoint,
                        timeout=health_check.timeout_seconds
                    )
                    
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    is_healthy = (
                        response.status_code in health_check.expected_status_codes and
                        response_time_ms <= health_check.expected_response_time_ms
                    )
                    
                    result = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "healthy": is_healthy,
                        "status_code": response.status_code,
                        "response_time_ms": response_time_ms,
                        "error": None
                    }
            
            else:
                # Custom health check (database, etc.)
                result = await self._custom_health_check(service_name, health_check)
                result["response_time_ms"] = (time.time() - start_time) * 1000
            
            # Store result
            self.health_check_results[service_name].append(result)
            
            # Update service health status
            await self._update_service_health_from_check(service_name, result, health_check)
            
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            
            result = {
                "timestamp": datetime.utcnow().isoformat(),
                "healthy": False,
                "status_code": None,
                "response_time_ms": response_time_ms,
                "error": str(e)
            }
            
            self.health_check_results[service_name].append(result)
            await self._update_service_health_from_check(service_name, result, health_check)
    
    async def _custom_health_check(self, service_name: str, health_check: HealthCheck) -> Dict[str, Any]:
        """Perform custom health check for non-HTTP services"""
        
        if service_name == "database_primary":
            try:
                from db import get_db
                from sqlalchemy import text
                
                with next(get_db()) as db:
                    db.execute(text("SELECT 1"))
                
                return {
                    "timestamp": datetime.utcnow().isoformat(),
                    "healthy": True,
                    "status_code": 200,
                    "error": None
                }
                
            except Exception as e:
                return {
                    "timestamp": datetime.utcnow().isoformat(),
                    "healthy": False,
                    "status_code": 500,
                    "error": str(e)
                }
        
        # Default: assume healthy
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "healthy": True,
            "status_code": 200,
            "error": None
        }
    
    async def _update_service_health_from_check(self, 
                                              service_name: str, 
                                              result: Dict[str, Any], 
                                              health_check: HealthCheck):
        """Update service health based on health check result"""
        
        # Get recent health check results
        recent_results = list(self.health_check_results[service_name])[-10:]  # Last 10 results
        
        if not recent_results:
            return
        
        # Count recent healthy/unhealthy results
        healthy_count = sum(1 for r in recent_results if r["healthy"])
        unhealthy_count = len(recent_results) - healthy_count
        
        # Determine health status
        current_status = self.service_health.get(service_name, {}).get("primary", {}).get("status", "unknown")
        
        if current_status != "healthy" and healthy_count >= health_check.healthy_threshold:
            new_status = "healthy"
        elif current_status == "healthy" and unhealthy_count >= health_check.unhealthy_threshold:
            new_status = "unhealthy"
        elif unhealthy_count > 0 and healthy_count > 0:
            new_status = "degraded"
        else:
            new_status = current_status
        
        # Update health status
        await self.update_instance_health(
            service_name=service_name,
            instance_id="primary",
            health_status=new_status,
            response_time_ms=result.get("response_time_ms", 0.0)
        )
        
        # Check for status change
        if new_status != current_status:
            self.logger.info(f"🏥 Health status changed for {service_name}: {current_status} -> {new_status}")
            
            # Trigger failover if service became unhealthy
            if new_status == "unhealthy" and current_status == "healthy":
                await self._trigger_health_based_failover(service_name)
    
    # Failover Management
    
    async def _initialize_failover_rules(self):
        """Initialize failover rules for critical services"""
        
        failover_configs = {
            "database_primary": FailoverRule(
                primary_service="database_primary",
                backup_services=["database_replica"],
                strategy=FailoverStrategy.ACTIVE_PASSIVE,
                health_check_failures_threshold=3,
                automatic_failback=True,
                failback_delay_seconds=300
            ),
            
            "api_gateway": FailoverRule(
                primary_service="api_gateway",
                backup_services=["api_gateway_backup"],
                strategy=FailoverStrategy.ACTIVE_ACTIVE,
                health_check_failures_threshold=2,
                automatic_failback=False
            )
        }
        
        for service_name, rule in failover_configs.items():
            self.failover_rules[service_name] = rule
            
            # Initialize failover state
            self.failover_state[service_name] = {
                "active_service": rule.primary_service,
                "failed_over": False,
                "failover_time": None,
                "failure_count": 0,
                "last_failure": None
            }
            
            self.logger.info(f"🔄 Initialized failover rule for {service_name}")
    
    async def _failover_monitoring_loop(self):
        """Monitor services for failover conditions"""
        while not self._stop_monitoring:
            try:
                if self.enable_automatic_failover:
                    await self._check_failover_conditions()
                    await self._check_failback_conditions()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"❌ Failover monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _trigger_health_based_failover(self, service_name: str):
        """Trigger failover based on health check failures"""
        
        failover_rule = self.failover_rules.get(service_name)
        if not failover_rule:
            return
        
        failover_state = self.failover_state[service_name]
        failover_state["failure_count"] += 1
        failover_state["last_failure"] = datetime.utcnow()
        
        # Check if we should trigger failover
        if (failover_state["failure_count"] >= failover_rule.health_check_failures_threshold and
            not failover_state["failed_over"]):
            
            await self._execute_failover(service_name, failover_rule, "health_check_failures")
    
    async def _execute_failover(self, 
                              service_name: str, 
                              failover_rule: FailoverRule, 
                              reason: str):
        """Execute failover to backup service"""
        
        if not failover_rule.backup_services:
            self.logger.warning(f"⚠️ No backup services configured for {service_name}")
            return
        
        # Find healthy backup service
        backup_service = None
        for backup in failover_rule.backup_services:
            backup_health = self.service_health.get(backup, {}).get("primary", {})
            if backup_health.get("status") == "healthy":
                backup_service = backup
                break
        
        if not backup_service:
            self.logger.error(f"❌ No healthy backup services available for {service_name}")
            return
        
        # Execute failover
        failover_state = self.failover_state[service_name]
        failover_state["active_service"] = backup_service
        failover_state["failed_over"] = True
        failover_state["failover_time"] = datetime.utcnow()
        
        # Record failover event
        failover_event = {
            "timestamp": datetime.utcnow().isoformat(),
            "service": service_name,
            "primary": failover_rule.primary_service,
            "backup": backup_service,
            "reason": reason,
            "strategy": failover_rule.strategy.value
        }
        
        self.failover_history.append(failover_event)
        
        self.logger.critical(f"🔄 FAILOVER EXECUTED: {service_name} -> {backup_service} (reason: {reason})")
        
        # Send alert
        await enhanced_sentry.capture_business_event(
            "automatic_failover_executed",
            f"Automatic failover: {service_name} failed over to {backup_service}",
            failover_event,
            severity=AlertSeverity.CRITICAL
        )
        
        # TODO: In a real implementation, update load balancer configuration
        # TODO: In a real implementation, update DNS records if needed
        # TODO: In a real implementation, notify external systems
    
    async def _check_failback_conditions(self):
        """Check if failed over services can fail back to primary"""
        
        for service_name, failover_state in self.failover_state.items():
            if not failover_state["failed_over"]:
                continue
            
            failover_rule = self.failover_rules.get(service_name)
            if not failover_rule or not failover_rule.automatic_failback:
                continue
            
            # Check if enough time has passed
            if failover_state["failover_time"]:
                time_since_failover = datetime.utcnow() - failover_state["failover_time"]
                if time_since_failover.total_seconds() < failover_rule.failback_delay_seconds:
                    continue
            
            # Check if primary service is healthy
            primary_health = self.service_health.get(failover_rule.primary_service, {}).get("primary", {})
            if primary_health.get("status") == "healthy":
                await self._execute_failback(service_name, failover_rule)
    
    async def _execute_failback(self, service_name: str, failover_rule: FailoverRule):
        """Execute failback to primary service"""
        
        failover_state = self.failover_state[service_name]
        failover_state["active_service"] = failover_rule.primary_service
        failover_state["failed_over"] = False
        failover_state["failover_time"] = None
        failover_state["failure_count"] = 0
        
        self.logger.info(f"🔄 FAILBACK EXECUTED: {service_name} -> {failover_rule.primary_service}")
        
        # Send notification
        await enhanced_sentry.capture_business_event(
            "automatic_failback_executed",
            f"Automatic failback: {service_name} failed back to {failover_rule.primary_service}",
            {
                "service": service_name,
                "primary": failover_rule.primary_service,
                "timestamp": datetime.utcnow().isoformat()
            },
            severity=AlertSeverity.INFO
        )
    
    # Monitoring and Metrics
    
    async def _circuit_breaker_monitoring_loop(self):
        """Monitor circuit breaker states"""
        while not self._stop_monitoring:
            try:
                # Check for circuit breaker state changes
                for name, circuit in self.circuit_breakers.items():
                    await self._monitor_circuit_breaker(name, circuit)
                
                await asyncio.sleep(30)  # Monitor every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Circuit breaker monitoring error: {e}")
                await asyncio.sleep(30)
    
    async def _monitor_circuit_breaker(self, name: str, circuit: CircuitBreaker):
        """Monitor individual circuit breaker"""
        
        # Record metrics
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "state": circuit.state.value,
            "failure_count": circuit.failure_count,
            "success_rate": (circuit.successful_requests / circuit.total_requests * 100) if circuit.total_requests > 0 else 0,
            "blocked_requests": circuit.blocked_requests
        }
        
        # Store in Redis for dashboard access
        await cache_service.set(f"circuit_breaker_metrics:{name}", json.dumps(metrics), ttl=300)
    
    async def _load_balancer_loop(self):
        """Monitor load balancer performance"""
        while not self._stop_monitoring:
            try:
                await self._update_load_balancer_metrics()
                await asyncio.sleep(60)  # Update every minute
                
            except Exception as e:
                self.logger.error(f"❌ Load balancer monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _update_load_balancer_metrics(self):
        """Update load balancer performance metrics"""
        
        for service_name, instances in self.service_registry.items():
            if not instances:
                continue
            
            # Calculate service-level metrics
            total_requests = sum(inst.total_requests for inst in instances)
            failed_requests = sum(inst.failed_requests for inst in instances)
            avg_response_time = sum(inst.response_time_ms for inst in instances) / len(instances)
            
            healthy_instances = len([
                inst for inst in instances
                if self.service_health.get(service_name, {}).get(inst.instance_id, {}).get("status") == "healthy"
            ])
            
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "total_instances": len(instances),
                "healthy_instances": healthy_instances,
                "total_requests": total_requests,
                "failed_requests": failed_requests,
                "success_rate": ((total_requests - failed_requests) / total_requests * 100) if total_requests > 0 else 0,
                "avg_response_time_ms": avg_response_time,
                "availability": (healthy_instances / len(instances) * 100) if instances else 0
            }
            
            # Store metrics
            self.availability_metrics[service_name].append(metrics)
            
            # Store in Redis for dashboard
            await cache_service.set(f"load_balancer_metrics:{service_name}", json.dumps(metrics), ttl=300)
    
    async def _availability_metrics_loop(self):
        """Calculate and store availability metrics"""
        while not self._stop_monitoring:
            try:
                await self._calculate_availability_metrics()
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Availability metrics error: {e}")
                await asyncio.sleep(300)
    
    async def _calculate_availability_metrics(self):
        """Calculate comprehensive availability metrics"""
        
        availability_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "services": {},
            "overall": {
                "uptime_percentage": 0,
                "circuit_breakers_healthy": 0,
                "services_available": 0
            }
        }
        
        total_uptime = 0
        service_count = 0
        healthy_circuits = 0
        available_services = 0
        
        for service_name in self.service_registry.keys():
            # Calculate service availability
            recent_metrics = list(self.availability_metrics[service_name])[-12:]  # Last hour
            
            if recent_metrics:
                avg_availability = sum(m["availability"] for m in recent_metrics) / len(recent_metrics)
                total_uptime += avg_availability
                service_count += 1
                
                if avg_availability >= 99.0:
                    available_services += 1
            else:
                avg_availability = 0
            
            # Check circuit breaker health
            circuit = self.circuit_breakers.get(service_name)
            circuit_healthy = circuit and circuit.state == CircuitState.CLOSED
            if circuit_healthy:
                healthy_circuits += 1
            
            availability_summary["services"][service_name] = {
                "availability_percentage": avg_availability,
                "circuit_breaker_healthy": circuit_healthy,
                "instances_count": len(self.service_registry[service_name]),
                "healthy_instances": len([
                    inst for inst in self.service_registry[service_name]
                    if self.service_health.get(service_name, {}).get(inst.instance_id, {}).get("status") == "healthy"
                ])
            }
        
        # Calculate overall metrics
        if service_count > 0:
            availability_summary["overall"]["uptime_percentage"] = total_uptime / service_count
            availability_summary["overall"]["services_available"] = available_services
        
        availability_summary["overall"]["circuit_breakers_healthy"] = healthy_circuits
        availability_summary["overall"]["total_services"] = service_count
        availability_summary["overall"]["total_circuit_breakers"] = len(self.circuit_breakers)
        
        # Store summary
        await cache_service.set("ha_availability_summary", json.dumps(availability_summary), ttl=300)
    
    async def _traffic_analysis_loop(self):
        """Analyze traffic patterns for optimization"""
        while not self._stop_monitoring:
            try:
                await self._analyze_traffic_patterns()
                await asyncio.sleep(600)  # Analyze every 10 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Traffic analysis error: {e}")
                await asyncio.sleep(600)
    
    async def _analyze_traffic_patterns(self):
        """Analyze traffic patterns and suggest optimizations"""
        
        # This would analyze request patterns, identify hotspots,
        # and suggest load balancing optimizations
        
        analysis = {
            "timestamp": datetime.utcnow().isoformat(),
            "recommendations": [],
            "traffic_distribution": {},
            "performance_insights": {}
        }
        
        # Analyze each service
        for service_name, instances in self.service_registry.items():
            if len(instances) <= 1:
                continue
            
            # Check request distribution
            request_counts = [inst.total_requests for inst in instances]
            if request_counts:
                max_requests = max(request_counts)
                min_requests = min(request_counts)
                
                # Check for load imbalance
                if max_requests > 0 and (max_requests - min_requests) / max_requests > 0.3:
                    analysis["recommendations"].append({
                        "service": service_name,
                        "type": "load_imbalance",
                        "description": f"Load imbalance detected: {max_requests} vs {min_requests} requests",
                        "suggestion": "Consider adjusting instance weights or load balancing algorithm"
                    })
        
        # Store analysis
        await cache_service.set("ha_traffic_analysis", json.dumps(analysis), ttl=600)
    
    # Public API Methods
    
    async def get_high_availability_status(self) -> Dict[str, Any]:
        """Get comprehensive high availability status"""
        
        circuit_status = await self.get_circuit_breaker_status()
        
        # Get service registry status
        service_status = {}
        for service_name, instances in self.service_registry.items():
            healthy_count = len([
                inst for inst in instances
                if self.service_health.get(service_name, {}).get(inst.instance_id, {}).get("status") == "healthy"
            ])
            
            service_status[service_name] = {
                "total_instances": len(instances),
                "healthy_instances": healthy_count,
                "availability_percentage": (healthy_count / len(instances) * 100) if instances else 0,
                "load_balancing_algorithm": self.load_balancer_state.get(service_name, {}).get("algorithm", {}).value if self.load_balancer_state.get(service_name, {}).get("algorithm") else "unknown"
            }
        
        # Get failover status
        failover_status = {}
        for service_name, state in self.failover_state.items():
            failover_status[service_name] = {
                "active_service": state["active_service"],
                "failed_over": state["failed_over"],
                "failure_count": state["failure_count"],
                "last_failure": state["last_failure"].isoformat() if state["last_failure"] else None
            }
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "high_availability_enabled": {
                "automatic_failover": self.enable_automatic_failover,
                "circuit_breakers": self.enable_circuit_breakers,
                "health_checks": self.enable_health_checks
            },
            "circuit_breakers": circuit_status,
            "services": service_status,
            "failover_state": failover_status,
            "overall_health": self._calculate_overall_ha_health(circuit_status, service_status)
        }
    
    def _calculate_overall_ha_health(self, circuit_status: Dict, service_status: Dict) -> Dict[str, Any]:
        """Calculate overall high availability health"""
        
        # Circuit breaker health
        open_circuits = circuit_status.get("summary", {}).get("open_circuits", 0)
        total_circuits = circuit_status.get("summary", {}).get("closed_circuits", 0) + open_circuits
        
        circuit_health = ((total_circuits - open_circuits) / total_circuits * 100) if total_circuits > 0 else 100
        
        # Service availability health
        total_availability = sum(s.get("availability_percentage", 0) for s in service_status.values())
        service_count = len(service_status)
        avg_availability = total_availability / service_count if service_count > 0 else 100
        
        # Overall health score
        overall_score = (circuit_health * 0.4) + (avg_availability * 0.6)
        
        if overall_score >= 99:
            status = "excellent"
        elif overall_score >= 95:
            status = "good"
        elif overall_score >= 90:
            status = "degraded"
        else:
            status = "critical"
        
        return {
            "status": status,
            "score": overall_score,
            "circuit_breaker_health": circuit_health,
            "service_availability_health": avg_availability,
            "services_count": service_count,
            "open_circuits": open_circuits
        }
    
    async def get_availability_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get availability metrics for specified time period"""
        
        try:
            availability_summary = await cache_service.get("ha_availability_summary")
            if availability_summary:
                availability_data = json.loads(availability_summary)
            else:
                availability_data = {"services": {}, "overall": {}}
            
            traffic_analysis = await cache_service.get("ha_traffic_analysis")
            if traffic_analysis:
                traffic_data = json.loads(traffic_analysis)
            else:
                traffic_data = {"recommendations": []}
            
            return {
                "time_period_hours": hours,
                "availability_summary": availability_data,
                "traffic_analysis": traffic_data,
                "failover_events": list(self.failover_history)[-10:],  # Last 10 events
                "recommendations": traffic_data.get("recommendations", [])
            }
            
        except Exception as e:
            self.logger.error(f"Error getting availability metrics: {e}")
            return {
                "error": "Failed to retrieve availability metrics",
                "time_period_hours": hours
            }
    
    async def stop_monitoring(self):
        """Stop high availability monitoring"""
        self._stop_monitoring = True
        
        # Cancel all monitoring tasks
        for task in self._monitoring_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self._monitoring_tasks:
            await asyncio.gather(*self._monitoring_tasks, return_exceptions=True)


# Custom Exceptions

class CircuitBreakerOpenException(Exception):
    """Exception raised when circuit breaker is open"""
    pass


class CircuitBreakerTimeoutException(Exception):
    """Exception raised when circuit breaker times out"""
    pass


# Global high availability service instance
high_availability_service = HighAvailabilityService()