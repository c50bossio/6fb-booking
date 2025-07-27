"""
Automated Recovery Service
Implements automated incident response and recovery procedures for 99.99% uptime
"""

import asyncio
import logging
import time
import json
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from services.redis_service import cache_service
from services.circuit_breaker_service import circuit_breaker_service
from services.observability_service import observability_service


class RecoveryAction(Enum):
    RESTART_SERVICE = "restart_service"
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    FAILOVER = "failover"
    CIRCUIT_BREAKER = "circuit_breaker"
    CACHE_CLEAR = "cache_clear"
    CONNECTION_RESET = "connection_reset"
    GRACEFUL_DEGRADATION = "graceful_degradation"
    ROLLBACK = "rollback"


@dataclass
class RecoveryPlan:
    name: str
    trigger_conditions: List[str]
    actions: List[RecoveryAction]
    max_attempts: int = 3
    retry_delay_seconds: int = 30
    escalation_threshold: int = 2
    prerequisites: List[str] = field(default_factory=list)
    rollback_actions: List[RecoveryAction] = field(default_factory=list)


@dataclass
class RecoveryExecution:
    plan_name: str
    incident_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    actions_taken: List[Dict[str, Any]] = field(default_factory=list)
    success: bool = False
    attempt_count: int = 0
    error_message: Optional[str] = None


class AutomatedRecoveryService:
    """
    Automated recovery service implementing self-healing infrastructure
    Provides automated incident response with <5 minute MTTR target
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.recovery_plans: Dict[str, RecoveryPlan] = {}
        self.active_recoveries: Dict[str, RecoveryExecution] = {}
        self.recovery_history: List[RecoveryExecution] = []
        
        # Recovery configuration
        self.max_concurrent_recoveries = 3
        self.recovery_timeout_minutes = 10
        self.cooldown_period_seconds = 300  # 5 minutes between recovery attempts
        
        # Initialize default recovery plans
        self._initialize_recovery_plans()
        
        self.logger.info("🔧 Automated Recovery Service initialized")
    
    def _initialize_recovery_plans(self):
        """Initialize default recovery plans for common issues"""
        
        # Database connection failure recovery
        self.register_recovery_plan(RecoveryPlan(
            name="database_recovery",
            trigger_conditions=["database_connection_failure", "database_timeout"],
            actions=[
                RecoveryAction.CONNECTION_RESET,
                RecoveryAction.CIRCUIT_BREAKER,
                RecoveryAction.RESTART_SERVICE
            ],
            max_attempts=3,
            retry_delay_seconds=15,
            rollback_actions=[RecoveryAction.GRACEFUL_DEGRADATION]
        ))
        
        # Redis cache failure recovery
        self.register_recovery_plan(RecoveryPlan(
            name="redis_recovery",
            trigger_conditions=["redis_connection_failure", "redis_timeout"],
            actions=[
                RecoveryAction.CACHE_CLEAR,
                RecoveryAction.CONNECTION_RESET,
                RecoveryAction.GRACEFUL_DEGRADATION
            ],
            max_attempts=2,
            retry_delay_seconds=30
        ))
        
        # High CPU usage recovery
        self.register_recovery_plan(RecoveryPlan(
            name="high_cpu_recovery",
            trigger_conditions=["high_cpu_usage", "performance_degradation"],
            actions=[
                RecoveryAction.SCALE_UP,
                RecoveryAction.GRACEFUL_DEGRADATION
            ],
            max_attempts=2,
            retry_delay_seconds=60
        ))
        
        # API endpoint failure recovery
        self.register_recovery_plan(RecoveryPlan(
            name="api_endpoint_recovery",
            trigger_conditions=["api_endpoint_failure", "high_error_rate"],
            actions=[
                RecoveryAction.RESTART_SERVICE,
                RecoveryAction.CIRCUIT_BREAKER,
                RecoveryAction.FAILOVER
            ],
            max_attempts=3,
            retry_delay_seconds=30,
            rollback_actions=[RecoveryAction.ROLLBACK]
        ))
        
        # External service failure recovery
        self.register_recovery_plan(RecoveryPlan(
            name="external_service_recovery",
            trigger_conditions=["stripe_failure", "sendgrid_failure", "twilio_failure"],
            actions=[
                RecoveryAction.CIRCUIT_BREAKER,
                RecoveryAction.GRACEFUL_DEGRADATION
            ],
            max_attempts=1,
            retry_delay_seconds=60
        ))
        
        # Payment processing failure recovery
        self.register_recovery_plan(RecoveryPlan(
            name="payment_recovery",
            trigger_conditions=["payment_failure_spike", "stripe_connection_failure"],
            actions=[
                RecoveryAction.CIRCUIT_BREAKER,
                RecoveryAction.GRACEFUL_DEGRADATION,
                RecoveryAction.FAILOVER
            ],
            max_attempts=2,
            retry_delay_seconds=45,
            prerequisites=["validate_payment_queue"]
        ))
        
        # Memory leak recovery
        self.register_recovery_plan(RecoveryPlan(
            name="memory_leak_recovery",
            trigger_conditions=["high_memory_usage", "memory_leak_detected"],
            actions=[
                RecoveryAction.CACHE_CLEAR,
                RecoveryAction.RESTART_SERVICE
            ],
            max_attempts=2,
            retry_delay_seconds=120
        ))
    
    def register_recovery_plan(self, plan: RecoveryPlan):
        """Register a new recovery plan"""
        self.recovery_plans[plan.name] = plan
        self.logger.info(f"📋 Registered recovery plan: {plan.name}")
    
    async def trigger_recovery(self, incident_id: str, trigger_condition: str, 
                              context: Optional[Dict[str, Any]] = None) -> bool:
        """Trigger automated recovery for an incident"""
        
        # Find matching recovery plans
        matching_plans = [
            plan for plan in self.recovery_plans.values()
            if trigger_condition in plan.trigger_conditions
        ]
        
        if not matching_plans:
            self.logger.warning(f"⚠️ No recovery plan found for condition: {trigger_condition}")
            return False
        
        # Check concurrent recovery limit
        if len(self.active_recoveries) >= self.max_concurrent_recoveries:
            self.logger.warning(f"⚠️ Maximum concurrent recoveries reached ({self.max_concurrent_recoveries})")
            return False
        
        # Execute recovery plans in priority order
        for plan in matching_plans:
            if await self._can_execute_plan(plan, incident_id):
                success = await self._execute_recovery_plan(plan, incident_id, context or {})
                if success:
                    return True
        
        return False
    
    async def _can_execute_plan(self, plan: RecoveryPlan, incident_id: str) -> bool:
        """Check if a recovery plan can be executed"""
        
        # Check cooldown period
        last_execution = self._get_last_execution(plan.name)
        if last_execution:
            time_since_last = datetime.utcnow() - last_execution.start_time
            if time_since_last.total_seconds() < self.cooldown_period_seconds:
                self.logger.debug(f"🕐 Recovery plan {plan.name} in cooldown period")
                return False
        
        # Check prerequisites
        for prerequisite in plan.prerequisites:
            if not await self._check_prerequisite(prerequisite):
                self.logger.warning(f"❌ Prerequisite {prerequisite} not met for {plan.name}")
                return False
        
        return True
    
    async def _execute_recovery_plan(self, plan: RecoveryPlan, incident_id: str, 
                                   context: Dict[str, Any]) -> bool:
        """Execute a recovery plan"""
        
        execution = RecoveryExecution(
            plan_name=plan.name,
            incident_id=incident_id,
            start_time=datetime.utcnow()
        )
        
        self.active_recoveries[incident_id] = execution
        
        self.logger.info(f"🔧 Starting recovery plan {plan.name} for incident {incident_id}")
        
        try:
            # Execute recovery actions
            for attempt in range(plan.max_attempts):
                execution.attempt_count = attempt + 1
                
                success = await self._execute_actions(plan.actions, execution, context)
                
                if success:
                    execution.success = True
                    execution.end_time = datetime.utcnow()
                    
                    recovery_time = (execution.end_time - execution.start_time).total_seconds()
                    self.logger.info(f"✅ Recovery plan {plan.name} succeeded in {recovery_time:.1f}s")
                    
                    # Record metrics
                    observability_service.record_metric(
                        "recovery_success_total",
                        1,
                        {"plan": plan.name, "attempt": str(attempt + 1)}
                    )
                    
                    observability_service.record_metric(
                        "recovery_time_seconds",
                        recovery_time,
                        {"plan": plan.name}
                    )
                    
                    break
                
                if attempt < plan.max_attempts - 1:
                    self.logger.info(f"🔄 Recovery attempt {attempt + 1} failed, retrying in {plan.retry_delay_seconds}s")
                    await asyncio.sleep(plan.retry_delay_seconds)
            
            if not execution.success:
                self.logger.error(f"❌ Recovery plan {plan.name} failed after {plan.max_attempts} attempts")
                
                # Execute rollback actions if available
                if plan.rollback_actions:
                    await self._execute_rollback(plan, execution, context)
                
                # Record failure metrics
                observability_service.record_metric(
                    "recovery_failure_total",
                    1,
                    {"plan": plan.name}
                )
            
            return execution.success
            
        except Exception as e:
            execution.error_message = str(e)
            execution.end_time = datetime.utcnow()
            
            self.logger.error(f"❌ Recovery plan {plan.name} failed with exception: {e}")
            return False
            
        finally:
            # Move to history and clean up
            self.recovery_history.append(execution)
            if incident_id in self.active_recoveries:
                del self.active_recoveries[incident_id]
            
            # Keep only last 100 recovery executions
            if len(self.recovery_history) > 100:
                self.recovery_history = self.recovery_history[-100:]
    
    async def _execute_actions(self, actions: List[RecoveryAction], 
                             execution: RecoveryExecution, context: Dict[str, Any]) -> bool:
        """Execute a list of recovery actions"""
        
        for action in actions:
            action_start = time.time()
            
            try:
                success = await self._execute_single_action(action, context)
                
                action_time = time.time() - action_start
                
                execution.actions_taken.append({
                    "action": action.value,
                    "success": success,
                    "duration_seconds": action_time,
                    "timestamp": datetime.utcnow().isoformat(),
                    "context": context
                })
                
                if not success:
                    self.logger.warning(f"⚠️ Recovery action {action.value} failed")
                    return False
                
                self.logger.info(f"✅ Recovery action {action.value} completed in {action_time:.1f}s")
                
                # Small delay between actions
                await asyncio.sleep(1)
                
            except Exception as e:
                execution.actions_taken.append({
                    "action": action.value,
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                    "context": context
                })
                
                self.logger.error(f"❌ Recovery action {action.value} failed: {e}")
                return False
        
        return True
    
    async def _execute_single_action(self, action: RecoveryAction, 
                                   context: Dict[str, Any]) -> bool:
        """Execute a single recovery action"""
        
        if action == RecoveryAction.RESTART_SERVICE:
            return await self._restart_service(context.get("service", "backend"))
        
        elif action == RecoveryAction.SCALE_UP:
            return await self._scale_service(context.get("service", "backend"), "up")
        
        elif action == RecoveryAction.SCALE_DOWN:
            return await self._scale_service(context.get("service", "backend"), "down")
        
        elif action == RecoveryAction.FAILOVER:
            return await self._failover_service(context.get("service", "backend"))
        
        elif action == RecoveryAction.CIRCUIT_BREAKER:
            service = context.get("service", "external_api")
            circuit_breaker_service.force_open(service, "Automated recovery")
            return True
        
        elif action == RecoveryAction.CACHE_CLEAR:
            return await self._clear_cache(context.get("cache_keys", []))
        
        elif action == RecoveryAction.CONNECTION_RESET:
            return await self._reset_connections(context.get("service", "database"))
        
        elif action == RecoveryAction.GRACEFUL_DEGRADATION:
            return await self._enable_graceful_degradation(context.get("features", []))
        
        elif action == RecoveryAction.ROLLBACK:
            return await self._rollback_deployment(context.get("version"))
        
        else:
            self.logger.warning(f"❓ Unknown recovery action: {action}")
            return False
    
    async def _restart_service(self, service: str) -> bool:
        """Restart a service (placeholder for actual restart logic)"""
        self.logger.info(f"🔄 Restarting service: {service}")
        
        # In production, this would:
        # 1. Send restart signal to Kubernetes
        # 2. Wait for graceful shutdown
        # 3. Verify new instance is healthy
        # 4. Update load balancer
        
        # For now, simulate restart delay
        await asyncio.sleep(5)
        
        return True
    
    async def _scale_service(self, service: str, direction: str) -> bool:
        """Scale a service up or down"""
        self.logger.info(f"📈 Scaling service {service} {direction}")
        
        # In production, this would:
        # 1. Update Kubernetes deployment replicas
        # 2. Wait for new pods to be ready
        # 3. Verify load distribution
        
        await asyncio.sleep(3)
        return True
    
    async def _failover_service(self, service: str) -> bool:
        """Failover to backup service instance"""
        self.logger.info(f"🔄 Failing over service: {service}")
        
        # In production, this would:
        # 1. Switch traffic to backup instances
        # 2. Update DNS/load balancer
        # 3. Verify traffic routing
        
        await asyncio.sleep(2)
        return True
    
    async def _clear_cache(self, cache_keys: List[str]) -> bool:
        """Clear cache entries"""
        try:
            if cache_keys:
                for key in cache_keys:
                    cache_service.delete(key)
            else:
                # Clear all cache if no specific keys
                # Note: This is a destructive operation, use carefully
                pass
            
            self.logger.info(f"🗑️ Cleared cache keys: {cache_keys}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to clear cache: {e}")
            return False
    
    async def _reset_connections(self, service: str) -> bool:
        """Reset connections for a service"""
        self.logger.info(f"🔌 Resetting connections for: {service}")
        
        # In production, this would:
        # 1. Close existing database connections
        # 2. Clear connection pools
        # 3. Re-establish connections
        
        await asyncio.sleep(2)
        return True
    
    async def _enable_graceful_degradation(self, features: List[str]) -> bool:
        """Enable graceful degradation for specific features"""
        self.logger.info(f"⬇️ Enabling graceful degradation for: {features}")
        
        try:
            # Store degradation flags in Redis
            degradation_config = {
                "enabled": True,
                "features": features,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            cache_service.set("graceful_degradation", json.dumps(degradation_config), ttl=3600)
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to enable graceful degradation: {e}")
            return False
    
    async def _rollback_deployment(self, version: Optional[str]) -> bool:
        """Rollback to previous deployment version"""
        self.logger.info(f"⏪ Rolling back deployment to version: {version}")
        
        # In production, this would:
        # 1. Trigger Kubernetes rollback
        # 2. Update image tags
        # 3. Verify rollback success
        
        await asyncio.sleep(10)
        return True
    
    async def _execute_rollback(self, plan: RecoveryPlan, execution: RecoveryExecution, 
                              context: Dict[str, Any]):
        """Execute rollback actions if recovery fails"""
        self.logger.info(f"⏪ Executing rollback for plan {plan.name}")
        
        for action in plan.rollback_actions:
            try:
                await self._execute_single_action(action, context)
            except Exception as e:
                self.logger.error(f"❌ Rollback action {action.value} failed: {e}")
    
    async def _check_prerequisite(self, prerequisite: str) -> bool:
        """Check if a prerequisite condition is met"""
        
        if prerequisite == "validate_payment_queue":
            # Check if payment queue is healthy
            return True  # Placeholder
        
        elif prerequisite == "backup_available":
            # Check if backup is available
            return True  # Placeholder
        
        elif prerequisite == "maintenance_window":
            # Check if we're in maintenance window
            return True  # Placeholder
        
        return True
    
    def _get_last_execution(self, plan_name: str) -> Optional[RecoveryExecution]:
        """Get the last execution of a recovery plan"""
        for execution in reversed(self.recovery_history):
            if execution.plan_name == plan_name:
                return execution
        return None
    
    def get_recovery_status(self) -> Dict[str, Any]:
        """Get current recovery status"""
        return {
            "active_recoveries": len(self.active_recoveries),
            "total_plans": len(self.recovery_plans),
            "recovery_history_size": len(self.recovery_history),
            "successful_recoveries_24h": self._count_recent_successes(),
            "failed_recoveries_24h": self._count_recent_failures(),
            "average_recovery_time": self._calculate_average_recovery_time(),
            "last_recovery": self.recovery_history[-1].start_time.isoformat() if self.recovery_history else None
        }
    
    def _count_recent_successes(self) -> int:
        """Count successful recoveries in last 24 hours"""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        return len([
            e for e in self.recovery_history
            if e.start_time >= cutoff and e.success
        ])
    
    def _count_recent_failures(self) -> int:
        """Count failed recoveries in last 24 hours"""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        return len([
            e for e in self.recovery_history
            if e.start_time >= cutoff and not e.success
        ])
    
    def _calculate_average_recovery_time(self) -> float:
        """Calculate average recovery time for successful recoveries"""
        successful_recoveries = [
            e for e in self.recovery_history
            if e.success and e.end_time
        ]
        
        if not successful_recoveries:
            return 0.0
        
        total_time = sum(
            (e.end_time - e.start_time).total_seconds()
            for e in successful_recoveries
        )
        
        return total_time / len(successful_recoveries)
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for recovery service"""
        return {
            "status": "healthy",
            "active_recoveries": len(self.active_recoveries),
            "registered_plans": len(self.recovery_plans),
            "last_check": datetime.utcnow().isoformat()
        }


# Global automated recovery service instance
recovery_service = AutomatedRecoveryService()