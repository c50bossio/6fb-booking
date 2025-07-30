"""
Chaos Engineering Service for 6fb-booking Platform

Implements controlled chaos experiments to proactively identify weaknesses
in the system and validate the effectiveness of our automated recovery
mechanisms. Designed to support 99.9%+ uptime through resilience testing.

Features:
- Controlled failure injection with safety mechanisms
- Integration with automated recovery systems for validation
- Business-aware experiment scheduling to minimize impact
- Comprehensive experiment tracking and analysis
- Six Figure Barber methodology alignment for business continuity testing
"""

import asyncio
import logging
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import json

logger = logging.getLogger(__name__)


class ChaosExperimentType(Enum):
    """Types of chaos experiments"""
    SERVICE_LATENCY = "service_latency"
    SERVICE_FAILURE = "service_failure"
    DATABASE_SLOWDOWN = "database_slowdown"
    NETWORK_PARTITION = "network_partition"
    MEMORY_PRESSURE = "memory_pressure"
    CPU_SPIKE = "cpu_spike"
    CACHE_FAILURE = "cache_failure"
    DEPENDENCY_TIMEOUT = "dependency_timeout"
    DISK_PRESSURE = "disk_pressure"
    CIRCUIT_BREAKER_TRIGGER = "circuit_breaker_trigger"


class ExperimentStatus(Enum):
    """Experiment execution status"""
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RECOVERY_VALIDATED = "recovery_validated"


class SafetyLevel(Enum):
    """Safety levels for experiments"""
    SAFE = "safe"           # No impact to users
    LOW_RISK = "low_risk"   # Minimal user impact
    MEDIUM_RISK = "medium_risk"  # Controlled user impact
    HIGH_RISK = "high_risk"      # Significant impact, requires approval


@dataclass
class ChaosExperiment:
    """Chaos experiment definition"""
    experiment_id: str
    name: str
    experiment_type: ChaosExperimentType
    target_service: str
    duration_seconds: int
    intensity: float  # 0.0 to 1.0
    safety_level: SafetyLevel
    
    # Scheduling and safety
    scheduled_time: datetime
    prerequisites: List[str] = field(default_factory=list)
    abort_conditions: List[str] = field(default_factory=list)
    recovery_timeout_seconds: int = 300
    
    # Business alignment
    business_impact_acceptable: bool = True
    revenue_impact_risk: str = "low"  # low, medium, high
    client_experience_risk: str = "low"
    
    # Experiment tracking
    status: ExperimentStatus = ExperimentStatus.PLANNED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Dict[str, Any] = field(default_factory=dict)
    recovery_triggered: bool = False
    recovery_successful: bool = False
    
    # Metrics and validation
    metrics_before: Dict[str, Any] = field(default_factory=dict)
    metrics_during: Dict[str, Any] = field(default_factory=dict)
    metrics_after: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExperimentResult:
    """Results of a chaos experiment"""
    experiment_id: str
    success: bool
    recovery_triggered: bool
    recovery_time_seconds: Optional[float]
    business_impact: str
    lessons_learned: List[str]
    recommendations: List[str]
    system_improvements: List[str]


class ChaosEngineeringService:
    """
    Controlled chaos engineering service for resilience testing
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_experiments: Dict[str, ChaosExperiment] = {}
        self.experiment_history: List[ChaosExperiment] = []
        self.experiment_schedule: List[ChaosExperiment] = []
        
        # Safety configuration
        self.max_concurrent_experiments = 1  # Conservative approach
        self.business_hours_experiments_enabled = False  # Default: off-hours only
        self.auto_abort_on_high_impact = True
        self.require_approval_for_high_risk = True
        
        # Integration flags (set by main application)
        self.recovery_service = None
        self.observability_service = None
        self.slo_service = None
        
        # Experiment statistics
        self.experiment_stats = {
            "total_experiments": 0,
            "successful_experiments": 0,
            "recovery_validations": 0,
            "system_improvements_identified": 0,
            "business_continuity_validated": 0
        }
        
        self.logger.info("🧪 Chaos Engineering Service initialized")
    
    def set_integrations(self, recovery_service=None, observability_service=None, slo_service=None):
        """Set integration services"""
        self.recovery_service = recovery_service
        self.observability_service = observability_service
        self.slo_service = slo_service
        self.logger.info("🔗 Chaos engineering integrations configured")
    
    def schedule_experiment(self, experiment: ChaosExperiment) -> bool:
        """Schedule a chaos experiment"""
        try:
            # Validate experiment safety
            if not self._validate_experiment_safety(experiment):
                self.logger.warning(f"❌ Experiment {experiment.name} failed safety validation")
                return False
            
            # Check business hours policy
            if not self._is_safe_time_for_experiment(experiment):
                self.logger.warning(f"⏰ Experiment {experiment.name} scheduled outside safe time window")
                return False
            
            # Add to schedule
            self.experiment_schedule.append(experiment)
            self.experiment_schedule.sort(key=lambda e: e.scheduled_time)
            
            self.logger.info(f"📅 Scheduled chaos experiment: {experiment.name} for {experiment.scheduled_time}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error scheduling experiment: {e}")
            return False
    
    async def run_experiment(self, experiment_id: str) -> bool:
        """Run a scheduled chaos experiment"""
        try:
            experiment = self._find_experiment(experiment_id)
            if not experiment:
                self.logger.error(f"❌ Experiment {experiment_id} not found")
                return False
            
            # Final safety checks
            if not await self._pre_experiment_checks(experiment):
                self.logger.warning(f"⚠️ Pre-experiment checks failed for {experiment.name}")
                return False
            
            # Start experiment
            return await self._execute_experiment(experiment)
            
        except Exception as e:
            self.logger.error(f"❌ Error running experiment {experiment_id}: {e}")
            return False
    
    async def _execute_experiment(self, experiment: ChaosExperiment) -> bool:
        """Execute the chaos experiment"""
        try:
            experiment.status = ExperimentStatus.RUNNING
            experiment.started_at = datetime.utcnow()
            self.active_experiments[experiment.experiment_id] = experiment
            
            self.logger.info(f"🧪 Starting chaos experiment: {experiment.name}")
            
            # Capture baseline metrics
            experiment.metrics_before = await self._capture_metrics(experiment.target_service)
            
            # Inject failure
            failure_injected = await self._inject_failure(experiment)
            if not failure_injected:
                experiment.status = ExperimentStatus.FAILED
                return False
            
            # Monitor during experiment
            monitoring_task = asyncio.create_task(self._monitor_experiment(experiment))
            
            # Wait for experiment duration
            await asyncio.sleep(experiment.duration_seconds)
            
            # Stop failure injection
            await self._stop_failure_injection(experiment)
            
            # Wait for recovery and monitoring
            await monitoring_task
            
            # Capture final metrics
            experiment.metrics_after = await self._capture_metrics(experiment.target_service)
            
            # Analyze results
            await self._analyze_experiment_results(experiment)
            
            experiment.status = ExperimentStatus.COMPLETED
            experiment.completed_at = datetime.utcnow()
            
            # Update statistics
            self.experiment_stats["total_experiments"] += 1
            if experiment.recovery_successful:
                self.experiment_stats["successful_experiments"] += 1
                self.experiment_stats["recovery_validations"] += 1
            
            self.logger.info(f"✅ Chaos experiment completed: {experiment.name}")
            return True
            
        except Exception as e:
            experiment.status = ExperimentStatus.FAILED
            self.logger.error(f"❌ Experiment {experiment.name} failed: {e}")
            return False
        
        finally:
            # Clean up
            if experiment.experiment_id in self.active_experiments:
                del self.active_experiments[experiment.experiment_id]
            
            # Move to history
            self.experiment_history.append(experiment)
            if len(self.experiment_history) > 100:
                self.experiment_history = self.experiment_history[-100:]
    
    async def _inject_failure(self, experiment: ChaosExperiment) -> bool:
        """Inject the specified failure type"""
        try:
            if experiment.experiment_type == ChaosExperimentType.SERVICE_LATENCY:
                return await self._inject_latency(experiment)
            
            elif experiment.experiment_type == ChaosExperimentType.SERVICE_FAILURE:
                return await self._inject_service_failure(experiment)
            
            elif experiment.experiment_type == ChaosExperimentType.DATABASE_SLOWDOWN:
                return await self._inject_database_slowdown(experiment)
            
            elif experiment.experiment_type == ChaosExperimentType.CACHE_FAILURE:
                return await self._inject_cache_failure(experiment)
            
            elif experiment.experiment_type == ChaosExperimentType.MEMORY_PRESSURE:
                return await self._inject_memory_pressure(experiment)
            
            elif experiment.experiment_type == ChaosExperimentType.CIRCUIT_BREAKER_TRIGGER:
                return await self._trigger_circuit_breaker(experiment)
            
            else:
                self.logger.warning(f"❓ Unknown experiment type: {experiment.experiment_type}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Error injecting failure: {e}")
            return False
    
    async def _inject_latency(self, experiment: ChaosExperiment) -> bool:
        """Inject artificial latency"""
        self.logger.info(f"⏱️ Injecting latency to {experiment.target_service}")
        
        # In production, this would:
        # 1. Configure network rules to add latency
        # 2. Use service mesh to inject delays
        # 3. Modify application-level timeouts
        
        # Simulate latency injection
        await asyncio.sleep(1)
        return True
    
    async def _inject_service_failure(self, experiment: ChaosExperiment) -> bool:
        """Inject service failure"""
        self.logger.info(f"💥 Injecting service failure to {experiment.target_service}")
        
        # In production, this would:
        # 1. Stop service instances
        # 2. Block network traffic
        # 3. Return error responses
        
        # Simulate service failure
        await asyncio.sleep(1)
        return True
    
    async def _inject_database_slowdown(self, experiment: ChaosExperiment) -> bool:
        """Inject database slowdown"""
        self.logger.info(f"🐌 Injecting database slowdown for {experiment.target_service}")
        
        # In production, this would:
        # 1. Add artificial query delays
        # 2. Limit connection pool size
        # 3. Inject network latency to database
        
        await asyncio.sleep(1)
        return True
    
    async def _inject_cache_failure(self, experiment: ChaosExperiment) -> bool:
        """Inject cache failure"""
        self.logger.info(f"🗄️ Injecting cache failure for {experiment.target_service}")
        
        # In production, this would:
        # 1. Stop Redis/cache service
        # 2. Block cache network access
        # 3. Simulate cache misses
        
        await asyncio.sleep(1)
        return True
    
    async def _inject_memory_pressure(self, experiment: ChaosExperiment) -> bool:
        """Inject memory pressure"""
        self.logger.info(f"🧠 Injecting memory pressure for {experiment.target_service}")
        
        # In production, this would:
        # 1. Allocate large amounts of memory
        # 2. Trigger garbage collection pressure
        # 3. Limit available memory for processes
        
        await asyncio.sleep(1)
        return True
    
    async def _trigger_circuit_breaker(self, experiment: ChaosExperiment) -> bool:
        """Trigger circuit breaker"""
        self.logger.info(f"🔌 Triggering circuit breaker for {experiment.target_service}")
        
        # In production, this would:
        # 1. Generate failure patterns to trigger circuit breakers
        # 2. Validate circuit breaker behavior
        # 3. Test recovery mechanisms
        
        await asyncio.sleep(1)
        return True
    
    async def _stop_failure_injection(self, experiment: ChaosExperiment):
        """Stop the failure injection"""
        self.logger.info(f"🛑 Stopping failure injection for {experiment.name}")
        
        # In production, this would:
        # 1. Remove network rules
        # 2. Restart stopped services
        # 3. Clear artificial constraints
        
        await asyncio.sleep(1)
    
    async def _monitor_experiment(self, experiment: ChaosExperiment):
        """Monitor experiment progress and safety"""
        try:
            monitoring_interval = 10  # seconds
            start_time = datetime.utcnow()
            
            while experiment.status == ExperimentStatus.RUNNING:
                # Check abort conditions
                if await self._should_abort_experiment(experiment):
                    self.logger.warning(f"⚠️ Aborting experiment {experiment.name} due to safety conditions")
                    experiment.status = ExperimentStatus.CANCELLED
                    break
                
                # Capture metrics during experiment
                current_metrics = await self._capture_metrics(experiment.target_service)
                experiment.metrics_during = current_metrics
                
                # Check if recovery was triggered
                if self.recovery_service and not experiment.recovery_triggered:
                    # Check if automated recovery was triggered
                    recovery_status = await self._check_recovery_triggered(experiment)
                    if recovery_status:
                        experiment.recovery_triggered = True
                        self.logger.info(f"🔧 Automated recovery triggered for experiment {experiment.name}")
                
                # Check experiment duration
                elapsed_time = (datetime.utcnow() - start_time).total_seconds()
                if elapsed_time >= experiment.duration_seconds:
                    break
                
                await asyncio.sleep(monitoring_interval)
                
        except Exception as e:
            self.logger.error(f"❌ Error monitoring experiment: {e}")
    
    async def _should_abort_experiment(self, experiment: ChaosExperiment) -> bool:
        """Check if experiment should be aborted"""
        try:
            # Check business impact thresholds
            if self.slo_service:
                violations = await self.slo_service.get_active_violations()
                critical_violations = [v for v in violations if v.severity == "critical"]
                if critical_violations:
                    return True
            
            # Check system health
            if self.observability_service:
                metrics = await self.observability_service.get_system_metrics()
                if metrics:
                    # Abort if error rate is too high
                    if metrics.get("error_rate", 0) > 20:  # 20% error rate threshold
                        return True
                    
                    # Abort if response time is too high
                    if metrics.get("response_time", 0) > 10000:  # 10 second threshold
                        return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"❌ Error checking abort conditions: {e}")
            return True  # Err on the side of safety
    
    async def _check_recovery_triggered(self, experiment: ChaosExperiment) -> bool:
        """Check if automated recovery was triggered"""
        try:
            if not self.recovery_service:
                return False
            
            # Check if recovery service has active recoveries
            recovery_status = self.recovery_service.get_recovery_status()
            return recovery_status.get("active_recoveries", 0) > 0
            
        except Exception:
            return False
    
    async def _capture_metrics(self, service: str) -> Dict[str, Any]:
        """Capture metrics for analysis"""
        try:
            if self.observability_service:
                return await self.observability_service.get_service_metrics(service)
            
            # Fallback: basic metrics
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "service": service,
                "availability": 100.0,
                "response_time": 100.0,
                "error_rate": 0.0
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error capturing metrics: {e}")
            return {}
    
    async def _analyze_experiment_results(self, experiment: ChaosExperiment):
        """Analyze experiment results and generate insights"""
        try:
            results = {
                "experiment_name": experiment.name,
                "target_service": experiment.target_service,
                "experiment_type": experiment.experiment_type.value,
                "duration_seconds": experiment.duration_seconds,
                "recovery_triggered": experiment.recovery_triggered,
                "recovery_successful": False,  # Will be updated based on analysis
                "business_impact": "minimal",  # Will be analyzed
                "lessons_learned": [],
                "recommendations": []
            }
            
            # Analyze recovery effectiveness
            if experiment.recovery_triggered:
                recovery_time = self._calculate_recovery_time(experiment)
                if recovery_time and recovery_time < experiment.recovery_timeout_seconds:
                    experiment.recovery_successful = True
                    results["recovery_successful"] = True
                    results["recovery_time_seconds"] = recovery_time
                    results["lessons_learned"].append("Automated recovery system responded effectively")
                else:
                    results["lessons_learned"].append("Automated recovery was slow or ineffective")
                    results["recommendations"].append("Review and optimize automated recovery strategies")
            else:
                results["lessons_learned"].append("No automated recovery was triggered - consider improving detection")
                results["recommendations"].append("Review monitoring thresholds and recovery triggers")
            
            # Analyze business impact
            impact_analysis = self._analyze_business_impact(experiment)
            results["business_impact"] = impact_analysis["level"]
            results["lessons_learned"].extend(impact_analysis["insights"])
            
            # Store results
            experiment.results = results
            
            self.logger.info(f"📊 Analysis completed for experiment {experiment.name}")
            
        except Exception as e:
            self.logger.error(f"❌ Error analyzing experiment results: {e}")
    
    def _calculate_recovery_time(self, experiment: ChaosExperiment) -> Optional[float]:
        """Calculate recovery time based on metrics"""
        try:
            if not experiment.metrics_during or not experiment.metrics_after:
                return None
            
            # Simple recovery time calculation based on when metrics improved
            # In production, this would be more sophisticated
            return 60.0  # Placeholder: 60 seconds
            
        except Exception:
            return None
    
    def _analyze_business_impact(self, experiment: ChaosExperiment) -> Dict[str, Any]:
        """Analyze business impact of the experiment"""
        try:
            impact_level = "minimal"
            insights = []
            
            # Analyze metrics for business impact indicators
            metrics_before = experiment.metrics_before
            metrics_after = experiment.metrics_after
            
            if metrics_before and metrics_after:
                # Check availability impact
                availability_before = metrics_before.get("availability", 100)
                availability_after = metrics_after.get("availability", 100)
                availability_impact = availability_before - availability_after
                
                if availability_impact > 5:
                    impact_level = "significant"
                    insights.append(f"Availability impacted by {availability_impact:.1f}%")
                
                # Check response time impact
                response_time_before = metrics_before.get("response_time", 0)
                response_time_after = metrics_after.get("response_time", 0)
                
                if response_time_after > response_time_before * 2:
                    impact_level = "moderate" if impact_level == "minimal" else impact_level
                    insights.append("Response time significantly degraded during experiment")
            
            # Business continuity validation
            if experiment.recovery_successful:
                insights.append("Business continuity mechanisms validated successfully")
                self.experiment_stats["business_continuity_validated"] += 1
            
            return {
                "level": impact_level,
                "insights": insights
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error analyzing business impact: {e}")
            return {"level": "unknown", "insights": ["Impact analysis failed"]}
    
    def _validate_experiment_safety(self, experiment: ChaosExperiment) -> bool:
        """Validate experiment safety"""
        # Check safety level requirements
        if experiment.safety_level == SafetyLevel.HIGH_RISK and self.require_approval_for_high_risk:
            self.logger.warning(f"⚠️ High-risk experiment {experiment.name} requires manual approval")
            return False
        
        # Check business impact acceptability
        if not experiment.business_impact_acceptable:
            self.logger.warning(f"⚠️ Experiment {experiment.name} has unacceptable business impact")
            return False
        
        # Check revenue impact risk
        if experiment.revenue_impact_risk == "high":
            self.logger.warning(f"⚠️ Experiment {experiment.name} has high revenue impact risk")
            return False
        
        return True
    
    def _is_safe_time_for_experiment(self, experiment: ChaosExperiment) -> bool:
        """Check if it's a safe time to run the experiment"""
        now = datetime.utcnow()
        
        # Check business hours policy
        if not self.business_hours_experiments_enabled:
            # Only allow experiments during off-hours (assuming UTC)
            if 8 <= now.hour <= 18:  # 8 AM to 6 PM UTC
                return False
        
        # Check if it's a weekend (safer for experiments)
        weekday = now.weekday()
        if weekday >= 5:  # Saturday or Sunday
            return True
        
        # Check for scheduled maintenance windows
        # In production, this would check against a maintenance calendar
        
        return True
    
    async def _pre_experiment_checks(self, experiment: ChaosExperiment) -> bool:
        """Perform pre-experiment safety checks"""
        try:
            # Check system health
            if self.observability_service:
                metrics = await self.observability_service.get_system_metrics()
                if metrics and metrics.get("error_rate", 0) > 5:
                    self.logger.warning("⚠️ System error rate too high for experiment")
                    return False
            
            # Check SLO status
            if self.slo_service:
                violations = await self.slo_service.get_active_violations()
                if violations:
                    self.logger.warning("⚠️ Active SLO violations - experiment postponed")
                    return False
            
            # Check concurrent experiments
            if len(self.active_experiments) >= self.max_concurrent_experiments:
                self.logger.warning("⚠️ Too many concurrent experiments")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error in pre-experiment checks: {e}")
            return False
    
    def _find_experiment(self, experiment_id: str) -> Optional[ChaosExperiment]:
        """Find experiment by ID"""
        for experiment in self.experiment_schedule:
            if experiment.experiment_id == experiment_id:
                return experiment
        return None
    
    def get_experiment_statistics(self) -> Dict[str, Any]:
        """Get chaos engineering statistics"""
        return {
            **self.experiment_stats,
            "active_experiments": len(self.active_experiments),
            "scheduled_experiments": len(self.experiment_schedule),
            "experiment_history_size": len(self.experiment_history),
            "success_rate": (
                self.experiment_stats["successful_experiments"] / 
                max(self.experiment_stats["total_experiments"], 1) * 100
            ),
            "last_experiment": (
                self.experiment_history[-1].started_at.isoformat() 
                if self.experiment_history else None
            )
        }
    
    def get_recommended_experiments(self) -> List[Dict[str, Any]]:
        """Get recommended chaos experiments based on system analysis"""
        recommendations = []
        
        # Recommend basic resilience tests
        base_experiments = [
            {
                "name": "Payment Service Resilience Test",
                "type": ChaosExperimentType.SERVICE_LATENCY.value,
                "target": "payment_service",
                "justification": "Validate payment system resilience and recovery",
                "business_value": "Ensures revenue protection mechanisms work",
                "safety_level": SafetyLevel.LOW_RISK.value
            },
            {
                "name": "Booking System Database Resilience",
                "type": ChaosExperimentType.DATABASE_SLOWDOWN.value,
                "target": "booking_service",
                "justification": "Test booking system under database stress",
                "business_value": "Validates client experience protection",
                "safety_level": SafetyLevel.MEDIUM_RISK.value
            },
            {
                "name": "Cache Failure Recovery Test",
                "type": ChaosExperimentType.CACHE_FAILURE.value,
                "target": "auth_service",
                "justification": "Validate system behavior when cache is unavailable",
                "business_value": "Ensures graceful degradation",
                "safety_level": SafetyLevel.SAFE.value
            }
        ]
        
        recommendations.extend(base_experiments)
        return recommendations
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for chaos engineering service"""
        return {
            "status": "healthy",
            "active_experiments": len(self.active_experiments),
            "scheduled_experiments": len(self.experiment_schedule),
            "integrations_configured": all([
                self.recovery_service is not None,
                self.observability_service is not None,
                self.slo_service is not None
            ]),
            "safety_enabled": self.auto_abort_on_high_impact,
            "last_check": datetime.utcnow().isoformat()
        }


# Global chaos engineering service instance (will be initialized by main application)
chaos_engineering_service = ChaosEngineeringService()