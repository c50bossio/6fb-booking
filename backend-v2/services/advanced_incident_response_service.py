"""
Advanced Incident Response and Recovery Service
Automated incident detection, response, and recovery with ML-powered root cause analysis
and business-aware escalation for the 6fb-booking platform
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import json
import hashlib
from decimal import Decimal

from services.redis_service import cache_service
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity
from services.slo_management_service import slo_manager
from services.enhanced_health_monitoring_service import enhanced_health_monitor, HealthStatus


class IncidentSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class IncidentStatus(Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"
    CLOSED = "closed"


class RecoveryStrategy(Enum):
    RESTART_SERVICE = "restart_service"
    SCALE_UP = "scale_up"
    FAILOVER = "failover"
    CIRCUIT_BREAKER = "circuit_breaker"
    GRACEFUL_DEGRADATION = "graceful_degradation"
    MANUAL_INTERVENTION = "manual_intervention"


@dataclass
class IncidentSignal:
    """Signal indicating a potential incident"""
    signal_id: str
    source: str  # health_check, slo_breach, error_spike, etc.
    signal_type: str
    severity: IncidentSeverity
    timestamp: datetime
    details: Dict[str, Any]
    affected_services: List[str]
    business_impact_score: float  # 0-100
    correlation_id: Optional[str] = None


@dataclass
class Incident:
    """Comprehensive incident representation"""
    incident_id: str
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
    detected_by: str
    
    # Affected systems and business impact
    affected_services: List[str] = field(default_factory=list)
    affected_users: int = 0
    estimated_revenue_impact: Decimal = Decimal('0')
    business_impact_score: float = 0  # 0-100
    
    # Technical details
    root_cause_analysis: Dict[str, Any] = field(default_factory=dict)
    signals: List[IncidentSignal] = field(default_factory=list)
    timeline: List[Dict[str, Any]] = field(default_factory=list)
    
    # Response and recovery
    recovery_strategies: List[RecoveryStrategy] = field(default_factory=list)
    automated_actions_taken: List[Dict[str, Any]] = field(default_factory=list)
    manual_actions_required: List[str] = field(default_factory=list)
    
    # Escalation and communication
    escalation_level: int = 0
    stakeholders_notified: List[str] = field(default_factory=list)
    customer_impact_message: Optional[str] = None
    
    # Resolution tracking
    resolved_at: Optional[datetime] = None
    resolution_summary: Optional[str] = None
    lessons_learned: List[str] = field(default_factory=list)
    
    # SLA tracking
    detection_time_seconds: float = 0
    response_time_seconds: float = 0
    resolution_time_seconds: float = 0


@dataclass
class RecoveryAction:
    """Automated recovery action"""
    action_id: str
    strategy: RecoveryStrategy
    target_service: str
    parameters: Dict[str, Any]
    success_probability: float  # 0-1
    estimated_recovery_time_minutes: int
    business_risk: str  # low, medium, high
    prerequisites: List[str] = field(default_factory=list)


class AdvancedIncidentResponseService:
    """Advanced incident response system with ML-powered automation"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Incident tracking
        self.active_incidents = {}
        self.incident_history = deque(maxlen=1000)
        self.incident_signals = defaultdict(list)
        
        # Signal correlation and pattern detection
        self.signal_correlations = {}
        self.pattern_library = self._build_pattern_library()
        
        # Recovery automation
        self.recovery_playbooks = self._create_recovery_playbooks()
        self.automated_recovery_enabled = True
        self.recovery_history = deque(maxlen=500)
        
        # Escalation rules
        self.escalation_rules = self._create_escalation_rules()
        self.escalation_cooldowns = {}
        
        # Machine learning for root cause analysis
        self.root_cause_patterns = {}
        self.prediction_models = {}
        
        # Business impact calculation
        self.business_impact_rules = self._create_business_impact_rules()
        
        # Configuration
        self.signal_correlation_window = 300  # 5 minutes
        self.max_concurrent_incidents = 10
        self.auto_resolution_enabled = True
        
        # Monitoring
        self._monitoring_tasks = []
        self._stop_monitoring = False
        
        self.logger.info("🚨 Advanced Incident Response Service initialized")
    
    def _build_pattern_library(self) -> Dict[str, Dict[str, Any]]:
        """Build library of known incident patterns"""
        return {
            "database_cascade_failure": {
                "signals": ["database_unhealthy", "api_latency_spike", "booking_errors"],
                "typical_sequence": ["database_primary", "booking_system", "payment_system"],
                "recovery_strategies": [RecoveryStrategy.RESTART_SERVICE, RecoveryStrategy.FAILOVER],
                "business_impact": "critical",
                "average_resolution_minutes": 15
            },
            
            "payment_provider_outage": {
                "signals": ["stripe_api_unhealthy", "payment_errors", "checkout_failures"],
                "typical_sequence": ["stripe_api", "payment_system"],
                "recovery_strategies": [RecoveryStrategy.CIRCUIT_BREAKER, RecoveryStrategy.GRACEFUL_DEGRADATION],
                "business_impact": "high",
                "average_resolution_minutes": 30
            },
            
            "frontend_deployment_issues": {
                "signals": ["frontend_unhealthy", "javascript_errors", "asset_loading_failures"],
                "typical_sequence": ["frontend_web", "cdn"],
                "recovery_strategies": [RecoveryStrategy.RESTART_SERVICE, RecoveryStrategy.FAILOVER],
                "business_impact": "medium",
                "average_resolution_minutes": 10
            },
            
            "api_rate_limiting_breach": {
                "signals": ["api_error_rate_spike", "redis_cache_degraded", "rate_limit_exceeded"],
                "typical_sequence": ["redis_cache", "api_gateway"],
                "recovery_strategies": [RecoveryStrategy.SCALE_UP, RecoveryStrategy.CIRCUIT_BREAKER],
                "business_impact": "medium",
                "average_resolution_minutes": 5
            },
            
            "external_dependency_cascade": {
                "signals": ["sendgrid_api_unhealthy", "twilio_api_unhealthy", "notification_failures"],
                "typical_sequence": ["external_apis", "notification_system"],
                "recovery_strategies": [RecoveryStrategy.CIRCUIT_BREAKER, RecoveryStrategy.GRACEFUL_DEGRADATION],
                "business_impact": "low",
                "average_resolution_minutes": 20
            }
        }
    
    def _create_recovery_playbooks(self) -> Dict[str, List[RecoveryAction]]:
        """Create automated recovery playbooks"""
        return {
            "database_primary": [
                RecoveryAction(
                    action_id="db_connection_reset",
                    strategy=RecoveryStrategy.RESTART_SERVICE,
                    target_service="database_primary",
                    parameters={"restart_type": "connection_pool_reset"},
                    success_probability=0.8,
                    estimated_recovery_time_minutes=2,
                    business_risk="low"
                ),
                RecoveryAction(
                    action_id="db_failover_to_replica",
                    strategy=RecoveryStrategy.FAILOVER,
                    target_service="database_primary",
                    parameters={"failover_target": "database_replica"},
                    success_probability=0.9,
                    estimated_recovery_time_minutes=5,
                    business_risk="medium",
                    prerequisites=["database_replica_healthy"]
                )
            ],
            
            "api_gateway": [
                RecoveryAction(
                    action_id="api_restart",
                    strategy=RecoveryStrategy.RESTART_SERVICE,
                    target_service="api_gateway",
                    parameters={"restart_type": "graceful_restart"},
                    success_probability=0.85,
                    estimated_recovery_time_minutes=3,
                    business_risk="medium"
                ),
                RecoveryAction(
                    action_id="api_scale_up",
                    strategy=RecoveryStrategy.SCALE_UP,
                    target_service="api_gateway",
                    parameters={"scale_factor": 2, "max_instances": 10},
                    success_probability=0.9,
                    estimated_recovery_time_minutes=5,
                    business_risk="low"
                )
            ],
            
            "payment_system": [
                RecoveryAction(
                    action_id="payment_circuit_breaker",
                    strategy=RecoveryStrategy.CIRCUIT_BREAKER,
                    target_service="payment_system",
                    parameters={"circuit_name": "stripe_payment", "timeout_seconds": 300},
                    success_probability=0.95,
                    estimated_recovery_time_minutes=1,
                    business_risk="low"
                ),
                RecoveryAction(
                    action_id="payment_graceful_degradation",
                    strategy=RecoveryStrategy.GRACEFUL_DEGRADATION,
                    target_service="payment_system",
                    parameters={"fallback_mode": "cash_only", "notification_required": True},
                    success_probability=0.99,
                    estimated_recovery_time_minutes=2,
                    business_risk="medium"
                )
            ],
            
            "booking_system": [
                RecoveryAction(
                    action_id="booking_cache_clear",
                    strategy=RecoveryStrategy.RESTART_SERVICE,
                    target_service="booking_system",
                    parameters={"action": "clear_cache", "restart_cache": True},
                    success_probability=0.7,
                    estimated_recovery_time_minutes=1,
                    business_risk="low"
                ),
                RecoveryAction(
                    action_id="booking_read_only_mode",
                    strategy=RecoveryStrategy.GRACEFUL_DEGRADATION,
                    target_service="booking_system",
                    parameters={"mode": "read_only", "allow_viewing": True},
                    success_probability=0.95,
                    estimated_recovery_time_minutes=1,
                    business_risk="low"
                )
            ],
            
            "frontend_web": [
                RecoveryAction(
                    action_id="frontend_restart",
                    strategy=RecoveryStrategy.RESTART_SERVICE,
                    target_service="frontend_web",
                    parameters={"restart_type": "rolling_restart"},
                    success_probability=0.9,
                    estimated_recovery_time_minutes=3,
                    business_risk="medium"
                ),
                RecoveryAction(
                    action_id="cdn_cache_invalidation",
                    strategy=RecoveryStrategy.RESTART_SERVICE,
                    target_service="cdn",
                    parameters={"action": "invalidate_cache", "paths": ["*"]},
                    success_probability=0.8,
                    estimated_recovery_time_minutes=2,
                    business_risk="low"
                )
            ]
        }
    
    def _create_escalation_rules(self) -> List[Dict[str, Any]]:
        """Create escalation rules based on severity and business impact"""
        return [
            {
                "condition": {
                    "severity": IncidentSeverity.EMERGENCY,
                    "business_impact_score": "> 90"
                },
                "escalation_level": 3,
                "immediate_notification": True,
                "stakeholders": ["engineering_manager", "cto", "ceo"],
                "notification_methods": ["sms", "email", "slack", "phone_call"],
                "escalation_delay_minutes": 0
            },
            {
                "condition": {
                    "severity": IncidentSeverity.CRITICAL,
                    "business_impact_score": "> 70"
                },
                "escalation_level": 2,
                "immediate_notification": True,
                "stakeholders": ["on_call_engineer", "engineering_manager"],
                "notification_methods": ["sms", "email", "slack"],
                "escalation_delay_minutes": 5
            },
            {
                "condition": {
                    "severity": IncidentSeverity.HIGH,
                    "business_impact_score": "> 50"
                },
                "escalation_level": 1,
                "immediate_notification": False,
                "stakeholders": ["on_call_engineer"],
                "notification_methods": ["email", "slack"],
                "escalation_delay_minutes": 15
            },
            {
                "condition": {
                    "severity": IncidentSeverity.MEDIUM,
                    "business_impact_score": "> 30"
                },
                "escalation_level": 0,
                "immediate_notification": False,
                "stakeholders": ["team_lead"],
                "notification_methods": ["slack"],
                "escalation_delay_minutes": 30
            }
        ]
    
    def _create_business_impact_rules(self) -> Dict[str, Any]:
        """Create business impact calculation rules"""
        return {
            "revenue_impact_per_minute": {
                "payment_system": 500.0,  # $500/minute during payment outage
                "booking_system": 200.0,  # $200/minute during booking outage
                "api_gateway": 300.0,     # $300/minute during API outage
                "frontend_web": 150.0,    # $150/minute during frontend outage
                "database_primary": 400.0, # $400/minute during database outage
                "default": 50.0           # $50/minute for other services
            },
            
            "user_impact_multipliers": {
                "business_hours": 2.0,    # 2x impact during business hours
                "peak_hours": 3.0,        # 3x impact during peak hours (lunch time)
                "weekend": 0.5,           # 0.5x impact during weekends
                "holiday": 0.3            # 0.3x impact during holidays
            },
            
            "service_criticality_scores": {
                "payment_system": 95,
                "booking_system": 90,
                "database_primary": 85,
                "api_gateway": 80,
                "user_management": 75,
                "frontend_web": 70,
                "notification_system": 40,
                "cdn": 30
            }
        }
    
    async def start_monitoring(self):
        """Start incident response monitoring"""
        try:
            self.logger.info("🚨 Starting advanced incident response monitoring...")
            
            # Start monitoring tasks
            tasks = [
                self._signal_collection_loop(),
                self._incident_correlation_loop(),
                self._automated_response_loop(),
                self._escalation_monitoring_loop(),
                self._pattern_learning_loop(),
                self._incident_resolution_loop()
            ]
            
            self._monitoring_tasks = [asyncio.create_task(task) for task in tasks]
            await asyncio.gather(*self._monitoring_tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"❌ Incident response monitoring startup failed: {e}")
            await enhanced_sentry.capture_exception(e, {"context": "incident_response_startup"})
    
    async def create_incident_signal(self, 
                                   source: str, 
                                   signal_type: str, 
                                   severity: IncidentSeverity,
                                   details: Dict[str, Any],
                                   affected_services: List[str]) -> str:
        """Create a new incident signal"""
        
        signal_id = self._generate_signal_id(source, signal_type, details)
        business_impact_score = self._calculate_business_impact_score(affected_services, severity)
        
        signal = IncidentSignal(
            signal_id=signal_id,
            source=source,
            signal_type=signal_type,
            severity=severity,
            timestamp=datetime.utcnow(),
            details=details,
            affected_services=affected_services,
            business_impact_score=business_impact_score
        )
        
        # Store signal for correlation
        self.incident_signals[signal_id] = signal
        
        # Check for immediate incident creation
        await self._evaluate_signal_for_incident(signal)
        
        self.logger.info(f"📊 Created incident signal: {signal_id} ({severity.value})")
        return signal_id
    
    async def create_incident(self, 
                            title: str, 
                            description: str, 
                            severity: IncidentSeverity,
                            affected_services: List[str],
                            detected_by: str = "automated_system",
                            signals: List[IncidentSignal] = None) -> str:
        """Create a new incident"""
        
        incident_id = self._generate_incident_id()
        business_impact_score = self._calculate_business_impact_score(affected_services, severity)
        
        incident = Incident(
            incident_id=incident_id,
            title=title,
            description=description,
            severity=severity,
            status=IncidentStatus.OPEN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            detected_by=detected_by,
            affected_services=affected_services,
            business_impact_score=business_impact_score,
            signals=signals or [],
            timeline=[{
                "timestamp": datetime.utcnow().isoformat(),
                "event": "incident_created",
                "details": {"created_by": detected_by, "severity": severity.value}
            }]
        )
        
        # Calculate business impact
        await self._calculate_detailed_business_impact(incident)
        
        # Perform root cause analysis
        await self._perform_root_cause_analysis(incident)
        
        # Determine recovery strategies
        incident.recovery_strategies = self._determine_recovery_strategies(incident)
        
        # Store incident
        self.active_incidents[incident_id] = incident
        
        # Log incident creation
        self.logger.error(f"🚨 INCIDENT CREATED: {incident_id} - {title} ({severity.value})")
        
        # Record SLO impact
        await self._record_incident_slo_impact(incident)
        
        # Trigger immediate response
        await self._trigger_incident_response(incident)
        
        return incident_id
    
    async def get_incident_status(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive incident status"""
        
        incident = self.active_incidents.get(incident_id)
        if not incident:
            # Check incident history
            for historical_incident in self.incident_history:
                if historical_incident.incident_id == incident_id:
                    incident = historical_incident
                    break
        
        if not incident:
            return None
        
        # Calculate current metrics
        duration_minutes = (datetime.utcnow() - incident.created_at).total_seconds() / 60
        
        return {
            "incident_id": incident.incident_id,
            "title": incident.title,
            "description": incident.description,
            "severity": incident.severity.value,
            "status": incident.status.value,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat(),
            "duration_minutes": duration_minutes,
            "affected_services": incident.affected_services,
            "business_impact": {
                "score": incident.business_impact_score,
                "estimated_revenue_impact": float(incident.estimated_revenue_impact),
                "affected_users": incident.affected_users
            },
            "response_metrics": {
                "detection_time_seconds": incident.detection_time_seconds,
                "response_time_seconds": incident.response_time_seconds,
                "resolution_time_seconds": incident.resolution_time_seconds
            },
            "recovery_progress": {
                "strategies_available": len(incident.recovery_strategies),
                "automated_actions_taken": len(incident.automated_actions_taken),
                "manual_actions_required": len(incident.manual_actions_required)
            },
            "escalation": {
                "level": incident.escalation_level,
                "stakeholders_notified": incident.stakeholders_notified
            },
            "timeline": incident.timeline[-10:],  # Last 10 events
            "root_cause_analysis": incident.root_cause_analysis,
            "resolution": {
                "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
                "resolution_summary": incident.resolution_summary,
                "lessons_learned": incident.lessons_learned
            }
        }
    
    async def get_active_incidents_summary(self) -> Dict[str, Any]:
        """Get summary of all active incidents"""
        
        summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "total_active": len(self.active_incidents),
            "severity_breakdown": {
                "emergency": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0
            },
            "business_impact": {
                "total_revenue_at_risk": 0,
                "total_users_affected": 0,
                "highest_impact_score": 0
            },
            "response_metrics": {
                "avg_detection_time_seconds": 0,
                "avg_response_time_seconds": 0,
                "automated_resolution_rate": 0
            },
            "incidents": []
        }
        
        if not self.active_incidents:
            return summary
        
        total_detection_time = 0
        total_response_time = 0
        automated_resolutions = 0
        
        for incident in self.active_incidents.values():
            # Update severity breakdown
            summary["severity_breakdown"][incident.severity.value] += 1
            
            # Update business impact
            summary["business_impact"]["total_revenue_at_risk"] += float(incident.estimated_revenue_impact)
            summary["business_impact"]["total_users_affected"] += incident.affected_users
            summary["business_impact"]["highest_impact_score"] = max(
                summary["business_impact"]["highest_impact_score"],
                incident.business_impact_score
            )
            
            # Update response metrics
            total_detection_time += incident.detection_time_seconds
            total_response_time += incident.response_time_seconds
            
            if len(incident.automated_actions_taken) > len(incident.manual_actions_required):
                automated_resolutions += 1
            
            # Add incident summary
            summary["incidents"].append({
                "incident_id": incident.incident_id,
                "title": incident.title,
                "severity": incident.severity.value,
                "status": incident.status.value,
                "duration_minutes": (datetime.utcnow() - incident.created_at).total_seconds() / 60,
                "affected_services": incident.affected_services,
                "business_impact_score": incident.business_impact_score
            })
        
        # Calculate averages
        incident_count = len(self.active_incidents)
        summary["response_metrics"]["avg_detection_time_seconds"] = total_detection_time / incident_count
        summary["response_metrics"]["avg_response_time_seconds"] = total_response_time / incident_count
        summary["response_metrics"]["automated_resolution_rate"] = (automated_resolutions / incident_count) * 100
        
        return summary
    
    async def resolve_incident(self, 
                             incident_id: str, 
                             resolution_summary: str,
                             lessons_learned: List[str] = None,
                             resolved_by: str = "automated_system") -> bool:
        """Resolve an incident"""
        
        incident = self.active_incidents.get(incident_id)
        if not incident:
            return False
        
        # Update incident
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = datetime.utcnow()
        incident.resolution_summary = resolution_summary
        incident.lessons_learned = lessons_learned or []
        incident.updated_at = datetime.utcnow()
        
        # Calculate resolution time
        incident.resolution_time_seconds = (
            incident.resolved_at - incident.created_at
        ).total_seconds()
        
        # Add to timeline
        incident.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event": "incident_resolved",
            "details": {
                "resolved_by": resolved_by,
                "resolution_summary": resolution_summary,
                "resolution_time_minutes": incident.resolution_time_seconds / 60
            }
        })
        
        # Move to history
        self.incident_history.append(incident)
        del self.active_incidents[incident_id]
        
        # Record resolution metrics
        await self._record_incident_resolution_metrics(incident)
        
        # Update pattern learning
        await self._learn_from_incident(incident)
        
        self.logger.info(f"✅ INCIDENT RESOLVED: {incident_id} - {resolution_summary}")
        
        # Notify stakeholders
        await self._notify_incident_resolution(incident)
        
        return True
    
    # Signal Processing and Correlation
    
    async def _signal_collection_loop(self):
        """Collect signals from various monitoring sources"""
        while not self._stop_monitoring:
            try:
                # Collect health monitoring signals
                await self._collect_health_signals()
                
                # Collect SLO breach signals
                await self._collect_slo_signals()
                
                # Collect performance anomaly signals
                await self._collect_performance_signals()
                
                # Clean up old signals
                self._cleanup_old_signals()
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Signal collection error: {e}")
                await asyncio.sleep(30)
    
    async def _collect_health_signals(self):
        """Collect signals from health monitoring"""
        try:
            health_summary = await enhanced_health_monitor.get_system_health_summary()
            
            for service_name, health_data in health_summary.get("services", {}).items():
                status = health_data.get("status")
                
                if status in ["unhealthy", "critical"]:
                    severity = IncidentSeverity.CRITICAL if status == "critical" else IncidentSeverity.HIGH
                    
                    await self.create_incident_signal(
                        source="health_monitoring",
                        signal_type=f"{service_name}_unhealthy",
                        severity=severity,
                        details={
                            "service": service_name,
                            "status": status,
                            "response_time_ms": health_data.get("response_time_ms"),
                            "error_message": health_data.get("error_message")
                        },
                        affected_services=[service_name]
                    )
                
        except Exception as e:
            self.logger.error(f"❌ Error collecting health signals: {e}")
    
    async def _collect_slo_signals(self):
        """Collect SLO breach signals"""
        try:
            slo_status = await slo_manager.get_all_slo_status()
            
            for slo_name, slo_data in slo_status.get("slos", {}).items():
                status = slo_data.get("status")
                
                if status in ["breach", "critical"]:
                    severity = IncidentSeverity.CRITICAL if status == "breach" else IncidentSeverity.HIGH
                    
                    # Map SLO to affected services
                    affected_services = self._map_slo_to_services(slo_name)
                    
                    await self.create_incident_signal(
                        source="slo_monitoring",
                        signal_type=f"slo_{status}",
                        severity=severity,
                        details={
                            "slo_name": slo_name,
                            "current_percentage": slo_data.get("current_percentage"),
                            "target_percentage": slo_data.get("target_percentage"),
                            "error_budget_remaining": slo_data.get("error_budget_remaining_percentage")
                        },
                        affected_services=affected_services
                    )
                    
        except Exception as e:
            self.logger.error(f"❌ Error collecting SLO signals: {e}")
    
    async def _collect_performance_signals(self):
        """Collect performance anomaly signals"""
        try:
            # This would integrate with performance monitoring
            # For now, simulate performance signal collection
            pass
            
        except Exception as e:
            self.logger.error(f"❌ Error collecting performance signals: {e}")
    
    async def _incident_correlation_loop(self):
        """Correlate signals to detect incidents"""
        while not self._stop_monitoring:
            try:
                await self._correlate_signals()
                await asyncio.sleep(60)  # Correlate every minute
                
            except Exception as e:
                self.logger.error(f"❌ Signal correlation error: {e}")
                await asyncio.sleep(60)
    
    async def _correlate_signals(self):
        """Correlate recent signals to detect incident patterns"""
        now = datetime.utcnow()
        correlation_window = timedelta(seconds=self.signal_correlation_window)
        
        # Get recent signals
        recent_signals = []
        for signal_list in self.incident_signals.values():
            for signal in signal_list:
                if now - signal.timestamp <= correlation_window:
                    recent_signals.append(signal)
        
        if len(recent_signals) < 2:
            return
        
        # Group signals by affected services
        service_signals = defaultdict(list)
        for signal in recent_signals:
            for service in signal.affected_services:
                service_signals[service].append(signal)
        
        # Look for pattern matches
        for pattern_name, pattern_data in self.pattern_library.items():
            matched_services = []
            pattern_signals = []
            
            for signal_type in pattern_data["signals"]:
                for signal in recent_signals:
                    if signal_type in signal.signal_type:
                        matched_services.extend(signal.affected_services)
                        pattern_signals.append(signal)
            
            # Check if we have enough signals for this pattern
            if len(pattern_signals) >= 2 and len(set(matched_services)) >= 2:
                await self._create_correlated_incident(pattern_name, pattern_data, pattern_signals)
    
    async def _create_correlated_incident(self, 
                                        pattern_name: str, 
                                        pattern_data: Dict[str, Any], 
                                        signals: List[IncidentSignal]):
        """Create incident from correlated signals"""
        
        affected_services = list(set(
            service for signal in signals for service in signal.affected_services
        ))
        
        # Determine severity based on pattern and signals
        max_severity = max(signal.severity for signal in signals)
        
        title = f"{pattern_name.replace('_', ' ').title()} Detected"
        description = f"Correlated incident detected matching {pattern_name} pattern"
        
        await self.create_incident(
            title=title,
            description=description,
            severity=max_severity,
            affected_services=affected_services,
            detected_by="pattern_correlation",
            signals=signals
        )
    
    # Automated Response and Recovery
    
    async def _automated_response_loop(self):
        """Execute automated responses for incidents"""
        while not self._stop_monitoring:
            try:
                for incident in list(self.active_incidents.values()):
                    if (incident.status == IncidentStatus.OPEN and 
                        self.automated_recovery_enabled):
                        await self._execute_automated_recovery(incident)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Automated response error: {e}")
                await asyncio.sleep(30)
    
    async def _execute_automated_recovery(self, incident: Incident):
        """Execute automated recovery actions for an incident"""
        
        # Check if we should attempt automated recovery
        if not self._should_attempt_automated_recovery(incident):
            return
        
        # Update incident status
        incident.status = IncidentStatus.MITIGATING
        incident.updated_at = datetime.utcnow()
        
        # Get recovery actions for affected services
        recovery_actions = []
        for service in incident.affected_services:
            playbook_actions = self.recovery_playbooks.get(service, [])
            recovery_actions.extend(playbook_actions)
        
        if not recovery_actions:
            self.logger.warning(f"No recovery actions available for incident {incident.incident_id}")
            return
        
        # Sort by success probability and business risk
        recovery_actions.sort(key=lambda x: (x.success_probability, -self._risk_score(x.business_risk)), reverse=True)
        
        # Execute recovery actions
        for action in recovery_actions[:3]:  # Try top 3 actions
            if await self._check_recovery_prerequisites(action):
                success = await self._execute_recovery_action(incident, action)
                
                if success:
                    # Check if incident is resolved
                    if await self._verify_incident_resolution(incident):
                        await self.resolve_incident(
                            incident.incident_id,
                            f"Automatically resolved by {action.strategy.value}",
                            ["Automated recovery successful"],
                            "automated_recovery_system"
                        )
                        return
                    else:
                        # Action helped but didn't fully resolve
                        incident.timeline.append({
                            "timestamp": datetime.utcnow().isoformat(),
                            "event": "partial_recovery",
                            "details": {
                                "action": action.strategy.value,
                                "service": action.target_service
                            }
                        })
                else:
                    # Action failed
                    incident.timeline.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "event": "recovery_action_failed",
                        "details": {
                            "action": action.strategy.value,
                            "service": action.target_service
                        }
                    })
        
        # If automated recovery didn't work, escalate
        if incident.status == IncidentStatus.MITIGATING:
            incident.status = IncidentStatus.INVESTIGATING
            incident.manual_actions_required.append("Manual investigation required - automated recovery insufficient")
            await self._escalate_incident(incident)
    
    async def _execute_recovery_action(self, incident: Incident, action: RecoveryAction) -> bool:
        """Execute a specific recovery action"""
        
        try:
            self.logger.info(f"🔧 Executing recovery action: {action.strategy.value} for {action.target_service}")
            
            success = False
            
            if action.strategy == RecoveryStrategy.RESTART_SERVICE:
                success = await self._restart_service(action.target_service, action.parameters)
            
            elif action.strategy == RecoveryStrategy.SCALE_UP:
                success = await self._scale_service(action.target_service, action.parameters)
            
            elif action.strategy == RecoveryStrategy.FAILOVER:
                success = await self._failover_service(action.target_service, action.parameters)
            
            elif action.strategy == RecoveryStrategy.CIRCUIT_BREAKER:
                success = await self._activate_circuit_breaker(action.target_service, action.parameters)
            
            elif action.strategy == RecoveryStrategy.GRACEFUL_DEGRADATION:
                success = await self._enable_graceful_degradation(action.target_service, action.parameters)
            
            # Record action
            incident.automated_actions_taken.append({
                "timestamp": datetime.utcnow().isoformat(),
                "action_id": action.action_id,
                "strategy": action.strategy.value,
                "target_service": action.target_service,
                "parameters": action.parameters,
                "success": success
            })
            
            # Store in recovery history
            self.recovery_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "incident_id": incident.incident_id,
                "action": action,
                "success": success
            })
            
            return success
            
        except Exception as e:
            self.logger.error(f"❌ Recovery action execution failed: {e}")
            return False
    
    # Recovery Action Implementations
    
    async def _restart_service(self, service: str, parameters: Dict[str, Any]) -> bool:
        """Restart a service (simulation)"""
        restart_type = parameters.get("restart_type", "standard")
        
        self.logger.info(f"🔄 Restarting {service} ({restart_type})")
        
        # In a real implementation, this would:
        # - Send restart signal to Kubernetes/Docker
        # - Wait for service to come back online
        # - Verify service health
        
        # Simulate restart delay
        await asyncio.sleep(2)
        
        # Simulate 80% success rate
        import random
        return random.random() < 0.8
    
    async def _scale_service(self, service: str, parameters: Dict[str, Any]) -> bool:
        """Scale up a service (simulation)"""
        scale_factor = parameters.get("scale_factor", 2)
        max_instances = parameters.get("max_instances", 10)
        
        self.logger.info(f"📈 Scaling {service} by factor {scale_factor}")
        
        # In a real implementation, this would:
        # - Update Kubernetes deployment
        # - Monitor scaling progress
        # - Verify increased capacity
        
        await asyncio.sleep(3)
        
        # Simulate 90% success rate
        import random
        return random.random() < 0.9
    
    async def _failover_service(self, service: str, parameters: Dict[str, Any]) -> bool:
        """Failover to backup service (simulation)"""
        failover_target = parameters.get("failover_target")
        
        self.logger.info(f"🔀 Failing over {service} to {failover_target}")
        
        # In a real implementation, this would:
        # - Switch DNS/load balancer to backup
        # - Verify backup service health
        # - Update service discovery
        
        await asyncio.sleep(5)
        
        # Simulate 85% success rate
        import random
        return random.random() < 0.85
    
    async def _activate_circuit_breaker(self, service: str, parameters: Dict[str, Any]) -> bool:
        """Activate circuit breaker (simulation)"""
        circuit_name = parameters.get("circuit_name")
        timeout_seconds = parameters.get("timeout_seconds", 300)
        
        self.logger.info(f"⚡ Activating circuit breaker for {service} ({circuit_name})")
        
        # In a real implementation, this would:
        # - Configure circuit breaker in API gateway
        # - Set timeout and failure thresholds
        # - Enable fallback responses
        
        await asyncio.sleep(1)
        
        # Circuit breakers usually work reliably
        return True
    
    async def _enable_graceful_degradation(self, service: str, parameters: Dict[str, Any]) -> bool:
        """Enable graceful degradation (simulation)"""
        fallback_mode = parameters.get("fallback_mode")
        
        self.logger.info(f"⬇️ Enabling graceful degradation for {service} ({fallback_mode})")
        
        # In a real implementation, this would:
        # - Enable feature flags for degraded mode
        # - Switch to cached/simplified responses
        # - Notify users of limited functionality
        
        await asyncio.sleep(1)
        
        # Graceful degradation usually works
        return True
    
    # Business Impact and Escalation
    
    def _calculate_business_impact_score(self, affected_services: List[str], severity: IncidentSeverity) -> float:
        """Calculate business impact score (0-100)"""
        
        base_scores = {
            IncidentSeverity.LOW: 10,
            IncidentSeverity.MEDIUM: 30,
            IncidentSeverity.HIGH: 60,
            IncidentSeverity.CRITICAL: 85,
            IncidentSeverity.EMERGENCY: 100
        }
        
        base_score = base_scores.get(severity, 30)
        
        # Adjust based on affected services
        service_criticality = sum(
            self.business_impact_rules["service_criticality_scores"].get(service, 20)
            for service in affected_services
        )
        
        # Apply business hours multiplier
        multiplier = self._get_business_hours_multiplier()
        
        # Calculate final score
        final_score = min(100, (base_score + service_criticality / len(affected_services)) * multiplier)
        
        return final_score
    
    async def _calculate_detailed_business_impact(self, incident: Incident):
        """Calculate detailed business impact metrics"""
        
        revenue_per_minute = sum(
            self.business_impact_rules["revenue_impact_per_minute"].get(
                service, 
                self.business_impact_rules["revenue_impact_per_minute"]["default"]
            )
            for service in incident.affected_services
        )
        
        # Estimate duration based on severity
        estimated_duration_minutes = {
            IncidentSeverity.LOW: 60,
            IncidentSeverity.MEDIUM: 30,
            IncidentSeverity.HIGH: 15,
            IncidentSeverity.CRITICAL: 10,
            IncidentSeverity.EMERGENCY: 5
        }.get(incident.severity, 30)
        
        # Apply business hours multiplier
        multiplier = self._get_business_hours_multiplier()
        
        incident.estimated_revenue_impact = Decimal(
            str(revenue_per_minute * estimated_duration_minutes * multiplier)
        )
        
        # Estimate affected users
        if "frontend_web" in incident.affected_services or "api_gateway" in incident.affected_services:
            incident.affected_users = int(1000 * multiplier)  # All users during business hours
        elif "booking_system" in incident.affected_services:
            incident.affected_users = int(500 * multiplier)   # Users actively booking
        elif "payment_system" in incident.affected_services:
            incident.affected_users = int(200 * multiplier)   # Users making payments
        else:
            incident.affected_users = int(100 * multiplier)   # Limited impact
    
    def _get_business_hours_multiplier(self) -> float:
        """Get business impact multiplier based on current time"""
        now = datetime.utcnow()
        hour = now.hour
        is_weekend = now.weekday() >= 5
        
        if is_weekend:
            return self.business_impact_rules["user_impact_multipliers"]["weekend"]
        elif 12 <= hour <= 14:  # Peak lunch hours
            return self.business_impact_rules["user_impact_multipliers"]["peak_hours"]
        elif 9 <= hour <= 18:   # Business hours
            return self.business_impact_rules["user_impact_multipliers"]["business_hours"]
        else:
            return 1.0
    
    async def _escalation_monitoring_loop(self):
        """Monitor incidents for escalation"""
        while not self._stop_monitoring:
            try:
                for incident in list(self.active_incidents.values()):
                    await self._check_escalation_criteria(incident)
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"❌ Escalation monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _escalate_incident(self, incident: Incident):
        """Escalate incident based on rules"""
        
        # Find matching escalation rule
        escalation_rule = None
        for rule in self.escalation_rules:
            if self._matches_escalation_criteria(incident, rule["condition"]):
                escalation_rule = rule
                break
        
        if not escalation_rule:
            return
        
        # Check escalation cooldown
        cooldown_key = f"{incident.incident_id}_escalation_{escalation_rule['escalation_level']}"
        if cooldown_key in self.escalation_cooldowns:
            last_escalation = self.escalation_cooldowns[cooldown_key]
            if (datetime.utcnow() - last_escalation).total_seconds() < escalation_rule["escalation_delay_minutes"] * 60:
                return
        
        # Escalate
        incident.escalation_level = escalation_rule["escalation_level"]
        incident.stakeholders_notified.extend(escalation_rule["stakeholders"])
        incident.updated_at = datetime.utcnow()
        
        # Add to timeline
        incident.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event": "escalation",
            "details": {
                "level": escalation_rule["escalation_level"],
                "stakeholders": escalation_rule["stakeholders"],
                "reason": "escalation_criteria_met"
            }
        })
        
        # Record escalation
        self.escalation_cooldowns[cooldown_key] = datetime.utcnow()
        
        # Send notifications
        await self._send_escalation_notifications(incident, escalation_rule)
        
        self.logger.warning(f"📢 INCIDENT ESCALATED: {incident.incident_id} to level {escalation_rule['escalation_level']}")
    
    # Helper Methods
    
    def _generate_signal_id(self, source: str, signal_type: str, details: Dict[str, Any]) -> str:
        """Generate unique signal ID"""
        content = f"{source}_{signal_type}_{json.dumps(details, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _generate_incident_id(self) -> str:
        """Generate unique incident ID"""
        timestamp = int(datetime.utcnow().timestamp())
        return f"INC-{timestamp}"
    
    def _map_slo_to_services(self, slo_name: str) -> List[str]:
        """Map SLO name to affected services"""
        mapping = {
            "api_availability": ["api_gateway"],
            "api_latency_p95": ["api_gateway"],
            "api_latency_p99": ["api_gateway"],
            "api_error_rate": ["api_gateway"],
            "payment_availability": ["payment_system"],
            "payment_error_rate": ["payment_system"],
            "payment_success_rate": ["payment_system"],
            "booking_availability": ["booking_system"],
            "booking_success_rate": ["booking_system"],
            "database_latency": ["database_primary"],
            "frontend_availability": ["frontend_web"],
            "auth_availability": ["user_management"],
            "auth_latency": ["user_management"]
        }
        
        return mapping.get(slo_name, [slo_name])
    
    def _risk_score(self, risk_level: str) -> int:
        """Convert risk level to numeric score"""
        return {"low": 1, "medium": 2, "high": 3}.get(risk_level, 2)
    
    def _should_attempt_automated_recovery(self, incident: Incident) -> bool:
        """Determine if automated recovery should be attempted"""
        
        # Don't attempt if already tried recently
        recent_attempts = [
            action for action in incident.automated_actions_taken
            if (datetime.utcnow() - datetime.fromisoformat(action["timestamp"].replace('Z', '+00:00'))).total_seconds() < 300
        ]
        
        if len(recent_attempts) >= 3:
            return False
        
        # Don't attempt for emergency incidents without approval
        if incident.severity == IncidentSeverity.EMERGENCY:
            return False
        
        # Don't attempt if too many manual actions required
        if len(incident.manual_actions_required) > 5:
            return False
        
        return True
    
    async def _check_recovery_prerequisites(self, action: RecoveryAction) -> bool:
        """Check if recovery action prerequisites are met"""
        
        for prerequisite in action.prerequisites:
            if prerequisite == "database_replica_healthy":
                health_summary = await enhanced_health_monitor.get_system_health_summary()
                replica_status = health_summary.get("services", {}).get("database_replica", {}).get("status")
                if replica_status != "healthy":
                    return False
        
        return True
    
    async def _verify_incident_resolution(self, incident: Incident) -> bool:
        """Verify if incident is actually resolved"""
        
        # Check health of affected services
        health_summary = await enhanced_health_monitor.get_system_health_summary()
        
        for service in incident.affected_services:
            service_health = health_summary.get("services", {}).get(service, {})
            if service_health.get("status") in ["unhealthy", "critical"]:
                return False
        
        # Check SLO compliance
        slo_status = await slo_manager.get_all_slo_status()
        for slo_name, slo_data in slo_status.get("slos", {}).items():
            if slo_data.get("status") in ["breach", "critical"]:
                return False
        
        return True
    
    def _matches_escalation_criteria(self, incident: Incident, criteria: Dict[str, Any]) -> bool:
        """Check if incident matches escalation criteria"""
        
        # Check severity
        if "severity" in criteria:
            required_severity = IncidentSeverity(criteria["severity"])
            if incident.severity != required_severity:
                return False
        
        # Check business impact score
        if "business_impact_score" in criteria:
            condition = criteria["business_impact_score"]
            if condition.startswith("> "):
                threshold = float(condition[2:])
                if incident.business_impact_score <= threshold:
                    return False
        
        return True
    
    async def _check_escalation_criteria(self, incident: Incident):
        """Check if incident should be escalated"""
        
        # Check duration-based escalation
        duration_minutes = (datetime.utcnow() - incident.created_at).total_seconds() / 60
        
        # Escalate critical incidents after 10 minutes
        if (incident.severity == IncidentSeverity.CRITICAL and 
            duration_minutes > 10 and 
            incident.escalation_level < 2):
            await self._escalate_incident(incident)
        
        # Escalate high impact incidents after 20 minutes
        if (incident.business_impact_score > 70 and 
            duration_minutes > 20 and 
            incident.escalation_level < 1):
            await self._escalate_incident(incident)
    
    def _cleanup_old_signals(self):
        """Clean up old signals"""
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        
        for signal_id in list(self.incident_signals.keys()):
            signals = self.incident_signals[signal_id]
            if isinstance(signals, list):
                self.incident_signals[signal_id] = [
                    s for s in signals if s.timestamp > cutoff_time
                ]
                if not self.incident_signals[signal_id]:
                    del self.incident_signals[signal_id]
            elif hasattr(signals, 'timestamp') and signals.timestamp <= cutoff_time:
                del self.incident_signals[signal_id]
    
    # Machine Learning and Pattern Recognition
    
    async def _pattern_learning_loop(self):
        """Learn patterns from incident data"""
        while not self._stop_monitoring:
            try:
                await self._analyze_incident_patterns()
                await asyncio.sleep(3600)  # Run every hour
                
            except Exception as e:
                self.logger.error(f"❌ Pattern learning error: {e}")
                await asyncio.sleep(3600)
    
    async def _perform_root_cause_analysis(self, incident: Incident):
        """Perform automated root cause analysis"""
        
        root_cause = {
            "timestamp": datetime.utcnow().isoformat(),
            "analysis_method": "automated_correlation",
            "confidence_score": 0.0,
            "primary_cause": None,
            "contributing_factors": [],
            "evidence": []
        }
        
        # Analyze signals for patterns
        if incident.signals:
            # Look for temporal correlation
            signal_times = [s.timestamp for s in incident.signals]
            if len(signal_times) > 1:
                time_diffs = [
                    (signal_times[i+1] - signal_times[i]).total_seconds()
                    for i in range(len(signal_times) - 1)
                ]
                
                if all(diff < 60 for diff in time_diffs):  # All within 1 minute
                    root_cause["primary_cause"] = "cascading_failure"
                    root_cause["confidence_score"] = 0.8
                    root_cause["evidence"].append("Rapid signal succession indicates cascade")
        
        # Analyze affected services for common dependencies
        common_deps = self._find_common_dependencies(incident.affected_services)
        if common_deps:
            root_cause["contributing_factors"].extend(common_deps)
            root_cause["evidence"].append(f"Common dependencies: {common_deps}")
        
        # Check for known patterns
        for pattern_name, pattern_data in self.pattern_library.items():
            if self._matches_incident_pattern(incident, pattern_data):
                root_cause["primary_cause"] = pattern_name
                root_cause["confidence_score"] = 0.9
                root_cause["evidence"].append(f"Matches known pattern: {pattern_name}")
                break
        
        incident.root_cause_analysis = root_cause
    
    def _find_common_dependencies(self, services: List[str]) -> List[str]:
        """Find common dependencies between services"""
        if len(services) <= 1:
            return []
        
        common_deps = set()
        first_service_deps = set(
            enhanced_health_monitor.dependency_definitions.get(services[0], type('obj', (object,), {"dependencies": []})).dependencies
        )
        
        for service in services[1:]:
            service_deps = set(
                enhanced_health_monitor.dependency_definitions.get(service, type('obj', (object,), {"dependencies": []})).dependencies
            )
            if not common_deps:
                common_deps = first_service_deps.intersection(service_deps)
            else:
                common_deps = common_deps.intersection(service_deps)
        
        return list(common_deps)
    
    def _matches_incident_pattern(self, incident: Incident, pattern_data: Dict[str, Any]) -> bool:
        """Check if incident matches a known pattern"""
        
        # Check if affected services match pattern sequence
        pattern_services = set(pattern_data.get("typical_sequence", []))
        incident_services = set(incident.affected_services)
        
        # Must have at least 50% overlap
        overlap = len(pattern_services.intersection(incident_services))
        return overlap >= len(pattern_services) * 0.5
    
    def _determine_recovery_strategies(self, incident: Incident) -> List[RecoveryStrategy]:
        """Determine appropriate recovery strategies"""
        
        strategies = []
        
        # Check for pattern-based strategies
        for pattern_data in self.pattern_library.values():
            if self._matches_incident_pattern(incident, pattern_data):
                strategies.extend(pattern_data.get("recovery_strategies", []))
        
        # Add service-specific strategies
        for service in incident.affected_services:
            if service in self.recovery_playbooks:
                service_strategies = [action.strategy for action in self.recovery_playbooks[service]]
                strategies.extend(service_strategies)
        
        # Remove duplicates and return
        return list(set(strategies))
    
    async def _learn_from_incident(self, incident: Incident):
        """Learn from resolved incident"""
        
        # Extract patterns for future use
        if incident.resolution_time_seconds > 0:
            pattern_key = "_".join(sorted(incident.affected_services))
            
            if pattern_key not in self.root_cause_patterns:
                self.root_cause_patterns[pattern_key] = []
            
            self.root_cause_patterns[pattern_key].append({
                "incident_id": incident.incident_id,
                "resolution_time_seconds": incident.resolution_time_seconds,
                "successful_actions": [
                    action for action in incident.automated_actions_taken
                    if action["success"]
                ],
                "root_cause": incident.root_cause_analysis
            })
    
    # Notification and Communication
    
    async def _send_escalation_notifications(self, incident: Incident, escalation_rule: Dict[str, Any]):
        """Send escalation notifications"""
        
        try:
            notification_message = (
                f"🚨 INCIDENT ESCALATED (Level {escalation_rule['escalation_level']})\n"
                f"ID: {incident.incident_id}\n"
                f"Title: {incident.title}\n"
                f"Severity: {incident.severity.value}\n"
                f"Business Impact: {incident.business_impact_score:.1f}/100\n"
                f"Affected Services: {', '.join(incident.affected_services)}\n"
                f"Duration: {(datetime.utcnow() - incident.created_at).total_seconds() / 60:.1f} minutes"
            )
            
            # Send to monitoring systems
            await enhanced_sentry.capture_business_event(
                "incident_escalation",
                notification_message,
                {
                    "incident_id": incident.incident_id,
                    "escalation_level": escalation_rule["escalation_level"],
                    "stakeholders": escalation_rule["stakeholders"],
                    "business_impact_score": incident.business_impact_score
                },
                severity=AlertSeverity.CRITICAL if escalation_rule["escalation_level"] >= 2 else AlertSeverity.HIGH
            )
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send escalation notifications: {e}")
    
    async def _notify_incident_resolution(self, incident: Incident):
        """Notify stakeholders of incident resolution"""
        
        try:
            resolution_message = (
                f"✅ INCIDENT RESOLVED\n"
                f"ID: {incident.incident_id}\n"
                f"Title: {incident.title}\n"
                f"Resolution Time: {incident.resolution_time_seconds / 60:.1f} minutes\n"
                f"Resolution: {incident.resolution_summary}"
            )
            
            await enhanced_sentry.capture_business_event(
                "incident_resolved",
                resolution_message,
                {
                    "incident_id": incident.incident_id,
                    "resolution_time_minutes": incident.resolution_time_seconds / 60,
                    "automated_resolution": len(incident.automated_actions_taken) > 0
                },
                severity=AlertSeverity.INFO
            )
            
        except Exception as e:
            self.logger.error(f"❌ Failed to send resolution notifications: {e}")
    
    # Additional Helper Methods
    
    async def _evaluate_signal_for_incident(self, signal: IncidentSignal):
        """Evaluate if a signal should trigger immediate incident creation"""
        
        # Create incident for emergency/critical signals
        if signal.severity in [IncidentSeverity.EMERGENCY, IncidentSeverity.CRITICAL]:
            if signal.business_impact_score > 80:
                await self.create_incident(
                    title=f"Critical Issue: {signal.signal_type}",
                    description=f"High-impact signal detected: {signal.details}",
                    severity=signal.severity,
                    affected_services=signal.affected_services,
                    detected_by=signal.source,
                    signals=[signal]
                )
    
    async def _incident_resolution_loop(self):
        """Monitor incidents for automatic resolution"""
        while not self._stop_monitoring:
            try:
                for incident in list(self.active_incidents.values()):
                    if (incident.status in [IncidentStatus.MITIGATING, IncidentStatus.INVESTIGATING] and
                        self.auto_resolution_enabled):
                        
                        if await self._verify_incident_resolution(incident):
                            await self.resolve_incident(
                                incident.incident_id,
                                "Automatically verified as resolved",
                                ["System health restored"],
                                "auto_resolution_system"
                            )
                
                await asyncio.sleep(120)  # Check every 2 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Incident resolution monitoring error: {e}")
                await asyncio.sleep(120)
    
    async def _analyze_incident_patterns(self):
        """Analyze patterns in historical incidents"""
        
        # This would use machine learning to identify patterns
        # For now, we'll implement basic pattern analysis
        
        if len(self.incident_history) < 10:
            return
        
        # Analyze recent incidents for common patterns
        recent_incidents = list(self.incident_history)[-50:]  # Last 50 incidents
        
        # Group by similar service combinations
        service_combinations = defaultdict(list)
        for incident in recent_incidents:
            key = "_".join(sorted(incident.affected_services))
            service_combinations[key].append(incident)
        
        # Update pattern library with frequently occurring combinations
        for combo, incidents in service_combinations.items():
            if len(incidents) >= 3:  # At least 3 incidents with same service combo
                avg_resolution_time = sum(
                    inc.resolution_time_seconds for inc in incidents if inc.resolution_time_seconds
                ) / len([inc for inc in incidents if inc.resolution_time_seconds])
                
                pattern_name = f"pattern_{combo}"
                self.pattern_library[pattern_name] = {
                    "signals": list(set(
                        signal.signal_type for incident in incidents 
                        for signal in incident.signals
                    )),
                    "typical_sequence": combo.split("_"),
                    "recovery_strategies": list(set(
                        strategy for incident in incidents 
                        for strategy in incident.recovery_strategies
                    )),
                    "business_impact": "high" if any(inc.business_impact_score > 70 for inc in incidents) else "medium",
                    "average_resolution_minutes": avg_resolution_time / 60 if avg_resolution_time else 30
                }
    
    async def _record_incident_slo_impact(self, incident: Incident):
        """Record incident's impact on SLOs"""
        
        # This would record the impact on relevant SLOs
        # and help with error budget calculations
        
        for service in incident.affected_services:
            # Map service to relevant SLOs and record impact
            relevant_slos = self._map_slo_to_services(service)
            
            for slo_name in relevant_slos:
                # Record SLO impact measurement
                await slo_manager.record_measurement(
                    slo_name=slo_name,
                    success_count=0,  # Incident means failure
                    total_count=1,
                    context={
                        "incident_id": incident.incident_id,
                        "incident_severity": incident.severity.value
                    }
                )
    
    async def _record_incident_resolution_metrics(self, incident: Incident):
        """Record metrics about incident resolution"""
        
        metrics = {
            "incident_id": incident.incident_id,
            "severity": incident.severity.value,
            "resolution_time_minutes": incident.resolution_time_seconds / 60,
            "business_impact_score": incident.business_impact_score,
            "estimated_revenue_impact": float(incident.estimated_revenue_impact),
            "automated_actions_count": len(incident.automated_actions_taken),
            "manual_actions_count": len(incident.manual_actions_required),
            "escalation_level": incident.escalation_level,
            "affected_services_count": len(incident.affected_services),
            "resolution_method": "automated" if len(incident.automated_actions_taken) > len(incident.manual_actions_required) else "manual"
        }
        
        # Store metrics for analysis
        await cache_service.set(
            f"incident_metrics:{incident.incident_id}",
            json.dumps(metrics),
            ttl=86400 * 30  # Keep for 30 days
        )
    
    async def stop_monitoring(self):
        """Stop incident response monitoring"""
        self._stop_monitoring = True
        
        # Cancel all monitoring tasks
        for task in self._monitoring_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self._monitoring_tasks:
            await asyncio.gather(*self._monitoring_tasks, return_exceptions=True)


# Global advanced incident response instance
advanced_incident_response = AdvancedIncidentResponseService()