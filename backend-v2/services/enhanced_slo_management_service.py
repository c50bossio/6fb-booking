"""
Enhanced SLO Management Service for 6fb-booking
Comprehensive SLO tracking specifically designed for 99.9%+ uptime
with zero revenue-impacting incidents, including AI Dashboard reliability
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict, field
from enum import Enum
from collections import defaultdict, deque
import json
import statistics

from services.redis_service import cache_service
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity


logger = logging.getLogger(__name__)


class BusinessCriticality(Enum):
    """Business criticality levels aligned with Six Figure Barber methodology"""
    REVENUE_CRITICAL = "revenue_critical"      # Direct revenue impact
    CUSTOMER_CRITICAL = "customer_critical"    # Customer experience impact
    BUSINESS_CRITICAL = "business_critical"    # Business operations impact
    PERFORMANCE_CRITICAL = "performance_critical"  # Performance/efficiency impact
    DATA_CRITICAL = "data_critical"           # Data integrity/availability


class SLOViolationSeverity(Enum):
    """SLO violation severity levels"""
    CATASTROPHIC = "catastrophic"  # Complete service failure
    CRITICAL = "critical"          # Major service degradation
    MAJOR = "major"               # Significant impact
    MINOR = "minor"               # Limited impact
    WARNING = "warning"           # Approaching threshold


@dataclass
class EnhancedSLODefinition:
    """Enhanced SLO definition with business context"""
    name: str
    description: str
    target_percentage: float
    measurement_window_hours: int
    business_criticality: BusinessCriticality
    revenue_impact_score: float  # 0-100 scale
    six_figure_methodology_area: str  # revenue_optimization, client_value, etc.
    
    # Alert thresholds
    catastrophic_threshold: float
    critical_threshold: float
    major_threshold: float
    warning_threshold: float
    
    # Dependencies and relationships
    dependent_services: List[str] = field(default_factory=list)
    impact_multiplier_during_peak: float = 1.5
    
    # Recovery targets
    detection_time_seconds: int = 30
    recovery_time_minutes: int = 5
    
    # Measurement configuration
    measurement_interval_seconds: int = 60
    aggregation_method: str = "average"  # average, p95, p99, count
    
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class SLOViolation:
    """Record of an SLO violation"""
    slo_name: str
    severity: SLOViolationSeverity
    started_at: datetime
    ended_at: Optional[datetime]
    current_performance: float
    target_performance: float
    business_impact_score: float
    affected_users: int
    revenue_impact_estimate: float
    root_cause: Optional[str] = None
    recovery_actions: List[str] = field(default_factory=list)
    lessons_learned: List[str] = field(default_factory=list)


@dataclass
class ErrorBudget:
    """Enhanced error budget tracking"""
    slo_name: str
    total_budget_percentage: float
    consumed_percentage: float
    remaining_percentage: float
    burn_rate_per_hour: float
    projected_depletion: Optional[datetime]
    fast_burn_threshold: float = 2.0  # 2x normal burn rate
    slow_burn_threshold: float = 0.1   # 10% of normal burn rate
    budget_alerts: List[str] = field(default_factory=list)
    last_reset: datetime = field(default_factory=datetime.utcnow)


class EnhancedSLOManagementService:
    """Enhanced SLO management with focus on 99.9%+ uptime and zero revenue impact"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Enhanced SLO definitions for 6fb-booking
        self.slo_definitions = self._create_enhanced_slo_definitions()
        
        # Measurement and tracking
        self.measurements = defaultdict(lambda: deque(maxlen=10000))
        self.error_budgets = {}
        self.active_violations = {}
        self.violation_history = deque(maxlen=1000)
        
        # Business context tracking
        self.business_hours = {"start": 9, "end": 18}
        self.peak_hours = {"start": 12, "end": 14}
        self.peak_days = [0, 1, 2, 3, 4]  # Monday to Friday
        
        # Performance tracking
        self.uptime_target = 99.9
        self.current_uptime = 100.0
        self.revenue_protection_score = 100.0
        
        # Monitoring configuration
        self._monitoring_active = False
        self._monitoring_task = None
        
        self.logger.info("🎯 Enhanced SLO Management Service initialized - targeting 99.9%+ uptime")
    
    def _create_enhanced_slo_definitions(self) -> Dict[str, EnhancedSLODefinition]:
        """Create comprehensive SLO definitions for 6fb-booking platform"""
        
        slos = {}
        
        # AI Dashboard SLOs - Critical for business intelligence
        slos['ai_dashboard_availability'] = EnhancedSLODefinition(
            name="ai_dashboard_availability",
            description="AI Dashboard must be available 99.95% of the time",
            target_percentage=99.95,
            measurement_window_hours=24,
            business_criticality=BusinessCriticality.BUSINESS_CRITICAL,
            revenue_impact_score=85.0,
            six_figure_methodology_area="business_efficiency",
            catastrophic_threshold=95.0,
            critical_threshold=98.0,
            major_threshold=99.0,
            warning_threshold=99.5,
            dependent_services=["api_gateway", "database_primary", "ai_orchestrator"],
            detection_time_seconds=15,
            recovery_time_minutes=3,
            tags={"component": "ai_dashboard", "criticality": "high"}
        )
        
        slos['ai_dashboard_response_time'] = EnhancedSLODefinition(
            name="ai_dashboard_response_time",
            description="95% of AI Dashboard queries complete within 2 seconds",
            target_percentage=95.0,
            measurement_window_hours=4,
            business_criticality=BusinessCriticality.PERFORMANCE_CRITICAL,
            revenue_impact_score=60.0,
            six_figure_methodology_area="business_efficiency",
            catastrophic_threshold=50.0,
            critical_threshold=70.0,
            major_threshold=85.0,
            warning_threshold=90.0,
            aggregation_method="p95",
            tags={"component": "ai_dashboard", "metric": "latency"}
        )
        
        # Revenue-Critical SLOs
        slos['payment_processing_availability'] = EnhancedSLODefinition(
            name="payment_processing_availability",
            description="Payment processing must be available 99.99% of the time",
            target_percentage=99.99,
            measurement_window_hours=24,
            business_criticality=BusinessCriticality.REVENUE_CRITICAL,
            revenue_impact_score=100.0,
            six_figure_methodology_area="revenue_optimization",
            catastrophic_threshold=98.0,
            critical_threshold=99.0,
            major_threshold=99.5,
            warning_threshold=99.8,
            dependent_services=["stripe_api", "database_primary", "payment_system"],
            impact_multiplier_during_peak=2.0,
            detection_time_seconds=10,
            recovery_time_minutes=2,
            tags={"component": "payments", "criticality": "revenue_critical"}
        )
        
        slos['payment_success_rate'] = EnhancedSLODefinition(
            name="payment_success_rate",
            description="99.5% of payment transactions must succeed",
            target_percentage=99.5,
            measurement_window_hours=12,
            business_criticality=BusinessCriticality.REVENUE_CRITICAL,
            revenue_impact_score=95.0,
            six_figure_methodology_area="revenue_optimization",
            catastrophic_threshold=95.0,
            critical_threshold=97.0,
            major_threshold=98.5,
            warning_threshold=99.0,
            impact_multiplier_during_peak=2.5,
            tags={"component": "payments", "metric": "success_rate"}
        )
        
        slos['booking_completion_rate'] = EnhancedSLODefinition(
            name="booking_completion_rate",
            description="98% of booking attempts must complete successfully",
            target_percentage=98.0,
            measurement_window_hours=8,
            business_criticality=BusinessCriticality.REVENUE_CRITICAL,
            revenue_impact_score=90.0,
            six_figure_methodology_area="client_value_creation",
            catastrophic_threshold=85.0,
            critical_threshold=90.0,
            major_threshold=95.0,
            warning_threshold=97.0,
            dependent_services=["booking_system", "database_primary", "calendar_integration"],
            impact_multiplier_during_peak=2.0,
            tags={"component": "booking", "metric": "completion_rate"}
        )
        
        # Customer Experience SLOs
        slos['booking_api_response_time'] = EnhancedSLODefinition(
            name="booking_api_response_time",
            description="95% of booking API requests complete within 500ms",
            target_percentage=95.0,
            measurement_window_hours=2,
            business_criticality=BusinessCriticality.CUSTOMER_CRITICAL,
            revenue_impact_score=75.0,
            six_figure_methodology_area="client_value_creation",
            catastrophic_threshold=50.0,
            critical_threshold=70.0,
            major_threshold=85.0,
            warning_threshold=90.0,
            aggregation_method="p95",
            impact_multiplier_during_peak=1.8,
            tags={"component": "booking_api", "metric": "latency"}
        )
        
        slos['frontend_availability'] = EnhancedSLODefinition(
            name="frontend_availability",
            description="Frontend application must be available 99.9% of the time",
            target_percentage=99.9,
            measurement_window_hours=12,
            business_criticality=BusinessCriticality.CUSTOMER_CRITICAL,
            revenue_impact_score=85.0,
            six_figure_methodology_area="client_value_creation",
            catastrophic_threshold=95.0,
            critical_threshold=97.0,
            major_threshold=98.5,
            warning_threshold=99.5,
            dependent_services=["api_gateway", "cdn", "load_balancer"],
            impact_multiplier_during_peak=1.5,
            tags={"component": "frontend", "criticality": "customer_facing"}
        )
        
        slos['authentication_availability'] = EnhancedSLODefinition(
            name="authentication_availability",
            description="Authentication service must be available 99.95% of the time",
            target_percentage=99.95,
            measurement_window_hours=24,
            business_criticality=BusinessCriticality.CUSTOMER_CRITICAL,
            revenue_impact_score=80.0,
            six_figure_methodology_area="professional_growth",
            catastrophic_threshold=95.0,
            critical_threshold=98.0,
            major_threshold=99.0,
            warning_threshold=99.5,
            dependent_services=["database_primary", "redis_cache"],
            tags={"component": "authentication", "criticality": "access_control"}
        )
        
        # Business Operations SLOs
        slos['database_query_performance'] = EnhancedSLODefinition(
            name="database_query_performance",
            description="95% of database queries complete within 100ms",
            target_percentage=95.0,
            measurement_window_hours=1,
            business_criticality=BusinessCriticality.BUSINESS_CRITICAL,
            revenue_impact_score=70.0,
            six_figure_methodology_area="business_efficiency",
            catastrophic_threshold=50.0,
            critical_threshold=70.0,
            major_threshold=85.0,
            warning_threshold=90.0,
            aggregation_method="p95",
            tags={"component": "database", "metric": "query_performance"}
        )
        
        slos['notification_delivery_rate'] = EnhancedSLODefinition(
            name="notification_delivery_rate",
            description="98% of notifications must be delivered successfully",
            target_percentage=98.0,
            measurement_window_hours=6,
            business_criticality=BusinessCriticality.BUSINESS_CRITICAL,
            revenue_impact_score=40.0,
            six_figure_methodology_area="client_value_creation",
            catastrophic_threshold=80.0,
            critical_threshold=90.0,
            major_threshold=95.0,
            warning_threshold=97.0,
            dependent_services=["sendgrid_api", "twilio_api"],
            tags={"component": "notifications", "metric": "delivery_rate"}
        )
        
        # Data Integrity SLOs
        slos['data_backup_success_rate'] = EnhancedSLODefinition(
            name="data_backup_success_rate",
            description="100% of scheduled backups must complete successfully",
            target_percentage=100.0,
            measurement_window_hours=24,
            business_criticality=BusinessCriticality.DATA_CRITICAL,
            revenue_impact_score=95.0,
            six_figure_methodology_area="scalability",
            catastrophic_threshold=90.0,
            critical_threshold=95.0,
            major_threshold=98.0,
            warning_threshold=99.5,
            measurement_interval_seconds=3600,  # Check every hour
            tags={"component": "backup", "metric": "success_rate"}
        )
        
        slos['data_consistency_check'] = EnhancedSLODefinition(
            name="data_consistency_check",
            description="99.99% data consistency across all systems",
            target_percentage=99.99,
            measurement_window_hours=24,
            business_criticality=BusinessCriticality.DATA_CRITICAL,
            revenue_impact_score=90.0,
            six_figure_methodology_area="scalability",
            catastrophic_threshold=99.0,
            critical_threshold=99.5,
            major_threshold=99.8,
            warning_threshold=99.9,
            measurement_interval_seconds=1800,  # Check every 30 minutes
            tags={"component": "data_integrity", "metric": "consistency"}
        )
        
        return slos
    
    async def start_monitoring(self):
        """Start comprehensive SLO monitoring"""
        if self._monitoring_active:
            self.logger.warning("SLO monitoring already active")
            return
        
        try:
            self.logger.info("🎯 Starting enhanced SLO monitoring for 99.9%+ uptime...")
            
            self._monitoring_active = True
            
            # Initialize error budgets
            await self._initialize_error_budgets()
            
            # Start monitoring loop
            self._monitoring_task = asyncio.create_task(self._monitoring_loop())
            
            # Start additional tracking loops
            additional_tasks = [
                self._error_budget_tracking_loop(),
                self._business_context_loop(),
                self._violation_analysis_loop(),
                self._uptime_calculation_loop()
            ]
            
            await asyncio.gather(*additional_tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"❌ Enhanced SLO monitoring startup failed: {e}")
            await enhanced_sentry.capture_exception(e, {"context": "slo_monitoring_startup"})
    
    async def record_measurement(self, slo_name: str, success_count: int, total_count: int, 
                               response_time_ms: Optional[float] = None, 
                               business_context: Optional[Dict[str, Any]] = None):
        """Record an SLO measurement with enhanced context"""
        
        if slo_name not in self.slo_definitions:
            self.logger.warning(f"Unknown SLO: {slo_name}")
            return
        
        timestamp = datetime.utcnow()
        slo_def = self.slo_definitions[slo_name]
        
        # Calculate success rate
        success_rate = (success_count / total_count * 100) if total_count > 0 else 100.0
        
        # Apply business context multiplier
        business_multiplier = 1.0
        if business_context and business_context.get("is_peak_hours"):
            business_multiplier = slo_def.impact_multiplier_during_peak
        
        # Adjust success rate based on business context
        adjusted_success_rate = success_rate / business_multiplier if business_multiplier > 1 else success_rate
        
        measurement = {
            "timestamp": timestamp.isoformat(),
            "success_count": success_count,
            "total_count": total_count,
            "success_rate": success_rate,
            "adjusted_success_rate": adjusted_success_rate,
            "response_time_ms": response_time_ms,
            "business_context": business_context or {},
            "business_multiplier": business_multiplier,
            "meets_slo": adjusted_success_rate >= slo_def.target_percentage
        }
        
        self.measurements[slo_name].append(measurement)
        
        # Update error budget
        await self._update_error_budget(slo_name)
        
        # Check for violations
        await self._check_slo_violation(slo_name, adjusted_success_rate)
        
        # Store in cache for real-time access
        await self._cache_measurement(slo_name, measurement)
    
    async def get_slo_status(self, slo_name: str) -> Optional[Dict[str, Any]]:
        """Get current SLO status with comprehensive details"""
        
        if slo_name not in self.slo_definitions:
            return None
        
        slo_def = self.slo_definitions[slo_name]
        current_time = datetime.utcnow()
        
        # Get measurements within window
        window_start = current_time - timedelta(hours=slo_def.measurement_window_hours)
        recent_measurements = [
            m for m in self.measurements[slo_name]
            if datetime.fromisoformat(m["timestamp"]) >= window_start
        ]
        
        if not recent_measurements:
            return {
                "slo_name": slo_name,
                "status": "no_data",
                "current_performance": 0.0,
                "target_performance": slo_def.target_percentage,
                "measurements_count": 0,
                "error_budget": self.error_budgets.get(slo_name),
                "business_impact": "unknown"
            }
        
        # Calculate current performance
        if slo_def.aggregation_method == "average":
            current_performance = statistics.mean([m["adjusted_success_rate"] for m in recent_measurements])
        elif slo_def.aggregation_method == "p95":
            success_rates = [m["adjusted_success_rate"] for m in recent_measurements]
            current_performance = statistics.quantiles(success_rates, n=20)[18] if len(success_rates) > 1 else success_rates[0]
        elif slo_def.aggregation_method == "p99":
            success_rates = [m["adjusted_success_rate"] for m in recent_measurements]
            current_performance = statistics.quantiles(success_rates, n=100)[98] if len(success_rates) > 1 else success_rates[0]
        else:
            current_performance = statistics.mean([m["adjusted_success_rate"] for m in recent_measurements])
        
        # Determine status
        if current_performance < slo_def.catastrophic_threshold:
            status = "catastrophic"
            severity = SLOViolationSeverity.CATASTROPHIC
        elif current_performance < slo_def.critical_threshold:
            status = "critical"
            severity = SLOViolationSeverity.CRITICAL
        elif current_performance < slo_def.major_threshold:
            status = "major"
            severity = SLOViolationSeverity.MAJOR
        elif current_performance < slo_def.warning_threshold:
            status = "warning"
            severity = SLOViolationSeverity.WARNING
        else:
            status = "healthy"
            severity = None
        
        # Calculate business impact
        business_impact = self._calculate_business_impact(slo_def, current_performance)
        
        # Get error budget
        error_budget = self.error_budgets.get(slo_name)
        
        return {
            "slo_name": slo_name,
            "status": status,
            "severity": severity.value if severity else None,
            "current_performance": current_performance,
            "target_performance": slo_def.target_percentage,
            "performance_gap": max(0, slo_def.target_percentage - current_performance),
            "measurements_count": len(recent_measurements),
            "measurement_window_hours": slo_def.measurement_window_hours,
            "business_criticality": slo_def.business_criticality.value,
            "revenue_impact_score": slo_def.revenue_impact_score,
            "six_figure_methodology_area": slo_def.six_figure_methodology_area,
            "business_impact": business_impact,
            "error_budget": asdict(error_budget) if error_budget else None,
            "dependent_services": slo_def.dependent_services,
            "recommendations": self._generate_slo_recommendations(slo_def, current_performance, status),
            "last_updated": current_time.isoformat()
        }
    
    async def get_overall_slo_health(self) -> Dict[str, Any]:
        """Get overall SLO health across all services"""
        
        current_time = datetime.utcnow()
        slo_statuses = {}
        overall_scores = {
            "revenue_critical": [],
            "customer_critical": [],
            "business_critical": [],
            "performance_critical": [],
            "data_critical": []
        }
        
        # Get status for all SLOs
        for slo_name in self.slo_definitions:
            status = await self.get_slo_status(slo_name)
            if status:
                slo_statuses[slo_name] = status
                
                # Group by business criticality
                criticality = self.slo_definitions[slo_name].business_criticality.value
                overall_scores[criticality].append(status["current_performance"])
        
        # Calculate overall health scores
        health_scores = {}
        for criticality, scores in overall_scores.items():
            if scores:
                health_scores[criticality] = {
                    "average_performance": statistics.mean(scores),
                    "worst_performance": min(scores),
                    "best_performance": max(scores),
                    "slo_count": len(scores),
                    "healthy_slos": len([s for s in scores if s >= 99.0]),
                    "degraded_slos": len([s for s in scores if 95.0 <= s < 99.0]),
                    "unhealthy_slos": len([s for s in scores if s < 95.0])
                }
        
        # Calculate overall uptime and revenue protection
        self._calculate_current_uptime()
        self._calculate_revenue_protection_score()
        
        # Identify critical violations
        critical_violations = [
            name for name, status in slo_statuses.items()
            if status["status"] in ["catastrophic", "critical"] and 
            self.slo_definitions[name].business_criticality in [
                BusinessCriticality.REVENUE_CRITICAL,
                BusinessCriticality.CUSTOMER_CRITICAL
            ]
        ]
        
        # Generate executive summary
        executive_summary = self._generate_executive_summary(health_scores, critical_violations)
        
        return {
            "timestamp": current_time.isoformat(),
            "overall_uptime_percentage": self.current_uptime,
            "revenue_protection_score": self.revenue_protection_score,
            "uptime_target": self.uptime_target,
            "uptime_status": "meeting_target" if self.current_uptime >= self.uptime_target else "below_target",
            "health_scores_by_criticality": health_scores,
            "slo_statuses": slo_statuses,
            "critical_violations": critical_violations,
            "total_slos": len(self.slo_definitions),
            "executive_summary": executive_summary,
            "business_context": self._get_current_business_context(),
            "recommendations": self._generate_overall_recommendations(health_scores, critical_violations)
        }
    
    async def get_error_budget_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive error budget dashboard"""
        
        dashboard_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_budgets": {},
            "budget_alerts": [],
            "burn_rate_analysis": {},
            "depletion_forecasts": {},
            "budget_utilization_summary": {
                "revenue_critical": [],
                "customer_critical": [],
                "business_critical": [],
                "performance_critical": [],
                "data_critical": []
            }
        }
        
        for slo_name, error_budget in self.error_budgets.items():
            slo_def = self.slo_definitions[slo_name]
            
            # Add to dashboard
            dashboard_data["error_budgets"][slo_name] = asdict(error_budget)
            
            # Group by criticality
            criticality = slo_def.business_criticality.value
            dashboard_data["budget_utilization_summary"][criticality].append({
                "slo_name": slo_name,
                "consumed_percentage": error_budget.consumed_percentage,
                "remaining_percentage": error_budget.remaining_percentage,
                "burn_rate": error_budget.burn_rate_per_hour
            })
            
            # Check for budget alerts
            if error_budget.budget_alerts:
                dashboard_data["budget_alerts"].extend([
                    {
                        "slo_name": slo_name,
                        "alert": alert,
                        "business_criticality": criticality,
                        "revenue_impact_score": slo_def.revenue_impact_score
                    }
                    for alert in error_budget.budget_alerts
                ])
            
            # Burn rate analysis
            if error_budget.burn_rate_per_hour > 0:
                hours_to_depletion = error_budget.remaining_percentage / error_budget.burn_rate_per_hour
                
                dashboard_data["burn_rate_analysis"][slo_name] = {
                    "current_burn_rate": error_budget.burn_rate_per_hour,
                    "normal_burn_rate": error_budget.total_budget_percentage / (slo_def.measurement_window_hours or 24),
                    "burn_rate_multiplier": error_budget.burn_rate_per_hour / (error_budget.total_budget_percentage / (slo_def.measurement_window_hours or 24)),
                    "hours_to_depletion": hours_to_depletion if hours_to_depletion > 0 else float('inf'),
                    "fast_burn": error_budget.burn_rate_per_hour > error_budget.fast_burn_threshold,
                    "slow_burn": error_budget.burn_rate_per_hour < error_budget.slow_burn_threshold
                }
        
        return dashboard_data
    
    # Helper Methods
    
    async def _initialize_error_budgets(self):
        """Initialize error budgets for all SLOs"""
        for slo_name, slo_def in self.slo_definitions.items():
            total_budget = 100.0 - slo_def.target_percentage
            
            self.error_budgets[slo_name] = ErrorBudget(
                slo_name=slo_name,
                total_budget_percentage=total_budget,
                consumed_percentage=0.0,
                remaining_percentage=total_budget,
                burn_rate_per_hour=0.0,
                projected_depletion=None
            )
    
    async def _update_error_budget(self, slo_name: str):
        """Update error budget based on recent measurements"""
        if slo_name not in self.slo_definitions or slo_name not in self.error_budgets:
            return
        
        slo_def = self.slo_definitions[slo_name]
        error_budget = self.error_budgets[slo_name]
        
        # Get measurements within window
        window_start = datetime.utcnow() - timedelta(hours=slo_def.measurement_window_hours)
        recent_measurements = [
            m for m in self.measurements[slo_name]
            if datetime.fromisoformat(m["timestamp"]) >= window_start
        ]
        
        if not recent_measurements:
            return
        
        # Calculate actual performance
        actual_performance = statistics.mean([m["adjusted_success_rate"] for m in recent_measurements])
        
        # Calculate error rate
        error_rate = 100.0 - actual_performance
        
        # Update budget consumption
        error_budget.consumed_percentage = min(error_rate, error_budget.total_budget_percentage)
        error_budget.remaining_percentage = max(0.0, error_budget.total_budget_percentage - error_budget.consumed_percentage)
        
        # Calculate burn rate
        if len(recent_measurements) > 1:
            time_span_hours = (
                datetime.fromisoformat(recent_measurements[-1]["timestamp"]) -
                datetime.fromisoformat(recent_measurements[0]["timestamp"])
            ).total_seconds() / 3600
            
            if time_span_hours > 0:
                error_budget.burn_rate_per_hour = error_budget.consumed_percentage / time_span_hours
        
        # Project depletion
        if error_budget.burn_rate_per_hour > 0 and error_budget.remaining_percentage > 0:
            hours_to_depletion = error_budget.remaining_percentage / error_budget.burn_rate_per_hour
            error_budget.projected_depletion = datetime.utcnow() + timedelta(hours=hours_to_depletion)
        else:
            error_budget.projected_depletion = None
        
        # Generate budget alerts
        error_budget.budget_alerts = []
        
        budget_utilization = (error_budget.consumed_percentage / error_budget.total_budget_percentage) * 100 if error_budget.total_budget_percentage > 0 else 0
        
        if budget_utilization >= 100:
            error_budget.budget_alerts.append("BUDGET_EXHAUSTED")
        elif budget_utilization >= 90:
            error_budget.budget_alerts.append("BUDGET_CRITICAL")
        elif budget_utilization >= 75:
            error_budget.budget_alerts.append("BUDGET_WARNING")
        
        # Check burn rate
        normal_burn_rate = error_budget.total_budget_percentage / slo_def.measurement_window_hours
        if error_budget.burn_rate_per_hour > normal_burn_rate * error_budget.fast_burn_threshold:
            error_budget.budget_alerts.append("FAST_BURN_DETECTED")
    
    async def _check_slo_violation(self, slo_name: str, current_performance: float):
        """Check for SLO violations and trigger alerts"""
        slo_def = self.slo_definitions[slo_name]
        
        violation_severity = None
        
        if current_performance < slo_def.catastrophic_threshold:
            violation_severity = SLOViolationSeverity.CATASTROPHIC
        elif current_performance < slo_def.critical_threshold:
            violation_severity = SLOViolationSeverity.CRITICAL
        elif current_performance < slo_def.major_threshold:
            violation_severity = SLOViolationSeverity.MAJOR
        elif current_performance < slo_def.warning_threshold:
            violation_severity = SLOViolationSeverity.WARNING
        
        if violation_severity:
            await self._handle_slo_violation(slo_name, violation_severity, current_performance)
        else:
            # Check if we can resolve an existing violation
            if slo_name in self.active_violations:
                await self._resolve_slo_violation(slo_name, current_performance)
    
    async def _handle_slo_violation(self, slo_name: str, severity: SLOViolationSeverity, current_performance: float):
        """Handle SLO violation with appropriate response"""
        slo_def = self.slo_definitions[slo_name]
        
        # Check if this is a new violation or escalation
        if slo_name in self.active_violations:
            existing_violation = self.active_violations[slo_name]
            if severity.value != existing_violation.severity.value:
                self.logger.warning(f"SLO violation escalated: {slo_name} from {existing_violation.severity.value} to {severity.value}")
                existing_violation.severity = severity
                existing_violation.current_performance = current_performance
        else:
            # Create new violation
            violation = SLOViolation(
                slo_name=slo_name,
                severity=severity,
                started_at=datetime.utcnow(),
                ended_at=None,
                current_performance=current_performance,
                target_performance=slo_def.target_percentage,
                business_impact_score=self._calculate_business_impact(slo_def, current_performance),
                affected_users=self._estimate_affected_users(slo_def),
                revenue_impact_estimate=self._estimate_revenue_impact(slo_def, current_performance)
            )
            
            self.active_violations[slo_name] = violation
            
            # Send alert
            await self._send_slo_violation_alert(violation, slo_def)
    
    async def _resolve_slo_violation(self, slo_name: str, current_performance: float):
        """Resolve an SLO violation"""
        if slo_name not in self.active_violations:
            return
        
        violation = self.active_violations[slo_name]
        violation.ended_at = datetime.utcnow()
        violation.current_performance = current_performance
        
        # Calculate recovery time
        recovery_time = (violation.ended_at - violation.started_at).total_seconds() / 60
        
        # Move to history
        self.violation_history.append(violation)
        del self.active_violations[slo_name]
        
        # Send recovery notification
        await self._send_slo_recovery_alert(violation, recovery_time)
        
        self.logger.info(f"✅ SLO violation resolved: {slo_name} (Recovery time: {recovery_time:.1f}min)")
    
    def _calculate_business_impact(self, slo_def: EnhancedSLODefinition, current_performance: float) -> Dict[str, Any]:
        """Calculate business impact of SLO performance"""
        
        performance_gap = max(0, slo_def.target_percentage - current_performance)
        gap_percentage = (performance_gap / slo_def.target_percentage) * 100
        
        # Base impact score
        base_impact = slo_def.revenue_impact_score * (gap_percentage / 100)
        
        # Apply business context multipliers
        context = self._get_current_business_context()
        business_multiplier = context.get("business_impact_multiplier", 1.0)
        
        if context.get("is_peak_hours"):
            business_multiplier *= slo_def.impact_multiplier_during_peak
        
        final_impact_score = min(100.0, base_impact * business_multiplier)
        
        return {
            "impact_score": final_impact_score,
            "performance_gap_percentage": gap_percentage,
            "business_criticality": slo_def.business_criticality.value,
            "revenue_impact_score": slo_def.revenue_impact_score,
            "six_figure_methodology_area": slo_def.six_figure_methodology_area,
            "business_multiplier": business_multiplier,
            "estimated_revenue_impact": self._estimate_revenue_impact(slo_def, current_performance)
        }
    
    def _estimate_affected_users(self, slo_def: EnhancedSLODefinition) -> int:
        """Estimate number of affected users based on SLO type"""
        # This would be connected to actual user metrics
        # For now, provide estimates based on service type
        
        user_estimates = {
            "payment_processing": 100,  # High impact on active users
            "booking": 200,             # Medium-high impact
            "ai_dashboard": 50,         # Lower user count but high business impact
            "frontend": 500,            # All active users
            "authentication": 300       # Most active users
        }
        
        # Extract service type from SLO name
        for service_type, user_count in user_estimates.items():
            if service_type in slo_def.name:
                return user_count
        
        return 10  # Default conservative estimate
    
    def _estimate_revenue_impact(self, slo_def: EnhancedSLODefinition, current_performance: float) -> float:
        """Estimate revenue impact in dollars"""
        if slo_def.business_criticality != BusinessCriticality.REVENUE_CRITICAL:
            return 0.0
        
        # Calculate potential lost revenue based on performance gap
        performance_gap = max(0, slo_def.target_percentage - current_performance)
        gap_ratio = performance_gap / 100.0
        
        # Estimate hourly revenue impact (would be connected to real revenue metrics)
        hourly_revenue_estimates = {
            "payment_processing": 1000.0,  # $1000/hour potential impact
            "booking": 500.0,              # $500/hour potential impact
        }
        
        base_hourly_impact = 0.0
        for service_type, impact in hourly_revenue_estimates.items():
            if service_type in slo_def.name:
                base_hourly_impact = impact
                break
        
        return base_hourly_impact * gap_ratio
    
    def _generate_slo_recommendations(self, slo_def: EnhancedSLODefinition, current_performance: float, status: str) -> List[str]:
        """Generate actionable recommendations for SLO improvement"""
        recommendations = []
        
        if status == "catastrophic":
            recommendations.extend([
                "🚨 IMMEDIATE ACTION REQUIRED - Service is experiencing catastrophic failure",
                "Activate incident response team immediately",
                "Implement emergency rollback procedures if recent deployment caused issue",
                "Scale infrastructure resources to handle current load",
                "Notify all stakeholders of service degradation"
            ])
            
            if slo_def.business_criticality == BusinessCriticality.REVENUE_CRITICAL:
                recommendations.append("💰 REVENUE IMPACT - Prioritize revenue-critical service recovery")
        
        elif status == "critical":
            recommendations.extend([
                "🔴 Critical SLO violation - Immediate investigation required",
                "Check dependent services for cascading failures",
                "Review recent changes and deployments",
                "Consider activating backup systems or failover procedures"
            ])
        
        elif status == "major":
            recommendations.extend([
                "🟠 Major SLO degradation detected",
                "Investigate root cause of performance degradation",
                "Monitor error budget consumption closely",
                "Prepare contingency plans for further degradation"
            ])
        
        elif status == "warning":
            recommendations.extend([
                "🟡 SLO performance approaching threshold",
                "Review system metrics for early warning signs",
                "Consider proactive scaling or optimization",
                "Update monitoring thresholds if needed"
            ])
        
        # Add SLO-specific recommendations
        if "ai_dashboard" in slo_def.name:
            recommendations.extend([
                "Check AI orchestrator service health",
                "Verify vector database connectivity",
                "Review AI model response times"
            ])
        
        if "payment" in slo_def.name:
            recommendations.extend([
                "Verify Stripe API connectivity and response times",
                "Check payment processing queue status",
                "Review fraud detection system performance"
            ])
        
        if "booking" in slo_def.name:
            recommendations.extend([
                "Check calendar integration services",
                "Verify appointment slot availability calculation",
                "Review booking validation logic"
            ])
        
        # Add Six Figure Barber methodology context
        methodology_recommendations = {
            "revenue_optimization": "Focus on revenue-impacting fixes first",
            "client_value_creation": "Prioritize customer experience improvements",
            "business_efficiency": "Optimize operational workflows",
            "professional_growth": "Ensure barber-facing tools remain reliable",
            "scalability": "Implement long-term scalability improvements"
        }
        
        if slo_def.six_figure_methodology_area in methodology_recommendations:
            recommendations.append(f"📊 Six Figure Barber: {methodology_recommendations[slo_def.six_figure_methodology_area]}")
        
        return recommendations
    
    def _get_current_business_context(self) -> Dict[str, Any]:
        """Get current business context for impact assessment"""
        now = datetime.utcnow()
        current_hour = now.hour
        current_day = now.weekday()
        
        is_business_hours = self.business_hours["start"] <= current_hour <= self.business_hours["end"]
        is_peak_hours = self.peak_hours["start"] <= current_hour <= self.peak_hours["end"]
        is_business_day = current_day in self.peak_days
        
        business_impact_multiplier = 1.0
        if is_peak_hours and is_business_day:
            business_impact_multiplier = 2.0
        elif is_business_hours and is_business_day:
            business_impact_multiplier = 1.5
        elif is_business_day:
            business_impact_multiplier = 1.2
        
        return {
            "timestamp": now.isoformat(),
            "is_business_hours": is_business_hours,
            "is_peak_hours": is_peak_hours,
            "is_business_day": is_business_day,
            "business_impact_multiplier": business_impact_multiplier,
            "current_hour": current_hour,
            "current_day": current_day
        }
    
    def _calculate_current_uptime(self):
        """Calculate current overall uptime percentage"""
        total_weight = 0
        weighted_uptime = 0
        
        uptime_weights = {
            BusinessCriticality.REVENUE_CRITICAL: 5.0,
            BusinessCriticality.CUSTOMER_CRITICAL: 4.0,
            BusinessCriticality.BUSINESS_CRITICAL: 3.0,
            BusinessCriticality.PERFORMANCE_CRITICAL: 2.0,
            BusinessCriticality.DATA_CRITICAL: 3.0
        }
        
        for slo_name, slo_def in self.slo_definitions.items():
            weight = uptime_weights.get(slo_def.business_criticality, 1.0)
            
            # Get recent measurements
            recent_measurements = list(self.measurements[slo_name])[-10:] if self.measurements[slo_name] else []
            
            if recent_measurements:
                uptime = statistics.mean([m["adjusted_success_rate"] for m in recent_measurements])
            else:
                uptime = 100.0  # Assume healthy if no data
            
            weighted_uptime += uptime * weight
            total_weight += weight
        
        self.current_uptime = weighted_uptime / total_weight if total_weight > 0 else 100.0
    
    def _calculate_revenue_protection_score(self):
        """Calculate revenue protection score based on revenue-critical SLOs"""
        revenue_critical_slos = [
            name for name, slo_def in self.slo_definitions.items()
            if slo_def.business_criticality == BusinessCriticality.REVENUE_CRITICAL
        ]
        
        if not revenue_critical_slos:
            self.revenue_protection_score = 100.0
            return
        
        total_score = 0
        for slo_name in revenue_critical_slos:
            recent_measurements = list(self.measurements[slo_name])[-5:] if self.measurements[slo_name] else []
            
            if recent_measurements:
                performance = statistics.mean([m["adjusted_success_rate"] for m in recent_measurements])
            else:
                performance = 100.0
            
            total_score += performance
        
        self.revenue_protection_score = total_score / len(revenue_critical_slos)
    
    def _generate_executive_summary(self, health_scores: Dict[str, Any], critical_violations: List[str]) -> Dict[str, Any]:
        """Generate executive summary for leadership"""
        
        summary = {
            "overall_health": "healthy",
            "key_metrics": {
                "uptime_status": "meeting_target" if self.current_uptime >= self.uptime_target else "below_target",
                "revenue_protection": "protected" if self.revenue_protection_score >= 99.0 else "at_risk",
                "critical_services_count": len([name for name, slo_def in self.slo_definitions.items() 
                                              if slo_def.business_criticality == BusinessCriticality.REVENUE_CRITICAL]),
                "active_violations": len(critical_violations)
            },
            "business_impact": {
                "six_figure_methodology_areas_affected": list(set([
                    self.slo_definitions[name].six_figure_methodology_area 
                    for name in critical_violations
                ])),
                "estimated_revenue_impact_per_hour": sum([
                    self._estimate_revenue_impact(self.slo_definitions[name], 95.0)  # Assume 95% performance
                    for name in critical_violations
                ])
            },
            "immediate_actions_required": len(critical_violations) > 0,
            "trend": "stable"  # Would calculate based on historical data
        }
        
        # Determine overall health
        if critical_violations:
            summary["overall_health"] = "critical"
        elif self.current_uptime < self.uptime_target:
            summary["overall_health"] = "degraded"
        elif self.revenue_protection_score < 99.0:
            summary["overall_health"] = "at_risk"
        
        return summary
    
    def _generate_overall_recommendations(self, health_scores: Dict[str, Any], critical_violations: List[str]) -> List[str]:
        """Generate overall system recommendations"""
        recommendations = []
        
        if critical_violations:
            recommendations.append("🚨 CRITICAL: Immediate attention required for revenue-impacting services")
            recommendations.extend([f"- Investigate {violation}" for violation in critical_violations[:3]])
        
        if self.current_uptime < self.uptime_target:
            recommendations.append(f"📈 Current uptime ({self.current_uptime:.2f}%) is below target ({self.uptime_target}%)")
            recommendations.append("- Review infrastructure scaling and resilience patterns")
        
        if self.revenue_protection_score < 99.0:
            recommendations.append("💰 Revenue protection score needs improvement")
            recommendations.append("- Focus on payment processing and booking system reliability")
        
        # Check error budget status
        budget_alerts_count = sum(len(budget.budget_alerts) for budget in self.error_budgets.values())
        if budget_alerts_count > 0:
            recommendations.append(f"⚠️ {budget_alerts_count} error budget alerts require attention")
        
        return recommendations
    
    # Background Monitoring Loops
    
    async def _monitoring_loop(self):
        """Main SLO monitoring loop"""
        while self._monitoring_active:
            try:
                # Perform periodic checks
                await self._perform_periodic_checks()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"❌ SLO monitoring loop error: {e}")
                await asyncio.sleep(60)
    
    async def _error_budget_tracking_loop(self):
        """Error budget tracking and alerting loop"""
        while self._monitoring_active:
            try:
                # Update all error budgets
                for slo_name in self.slo_definitions:
                    await self._update_error_budget(slo_name)
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Error budget tracking error: {e}")
                await asyncio.sleep(300)
    
    async def _business_context_loop(self):
        """Business context monitoring loop"""
        while self._monitoring_active:
            try:
                context = self._get_current_business_context()
                await cache_service.set("business_context", json.dumps(context), ttl=300)
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Business context loop error: {e}")
                await asyncio.sleep(300)
    
    async def _violation_analysis_loop(self):
        """SLO violation analysis and reporting loop"""
        while self._monitoring_active:
            try:
                # Analyze violation patterns
                await self._analyze_violation_patterns()
                
                await asyncio.sleep(900)  # Analyze every 15 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Violation analysis error: {e}")
                await asyncio.sleep(900)
    
    async def _uptime_calculation_loop(self):
        """Uptime and revenue protection calculation loop"""
        while self._monitoring_active:
            try:
                self._calculate_current_uptime()
                self._calculate_revenue_protection_score()
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Uptime calculation error: {e}")
                await asyncio.sleep(300)
    
    async def _perform_periodic_checks(self):
        """Perform periodic SLO checks"""
        # This would integrate with actual monitoring systems
        # For now, we'll focus on the framework
        pass
    
    async def _analyze_violation_patterns(self):
        """Analyze patterns in SLO violations"""
        if not self.violation_history:
            return
        
        # Analyze recent violations for patterns
        recent_violations = [v for v in self.violation_history if 
                           (datetime.utcnow() - v.started_at).days <= 7]
        
        if len(recent_violations) >= 3:
            self.logger.warning(f"Pattern detected: {len(recent_violations)} violations in the last 7 days")
    
    async def _cache_measurement(self, slo_name: str, measurement: Dict[str, Any]):
        """Cache measurement for real-time access"""
        cache_key = f"slo_measurement:{slo_name}"
        await cache_service.set(cache_key, json.dumps(measurement), ttl=300)
    
    async def _send_slo_violation_alert(self, violation: SLOViolation, slo_def: EnhancedSLODefinition):
        """Send SLO violation alert"""
        alert_severity = {
            SLOViolationSeverity.CATASTROPHIC: AlertSeverity.CRITICAL,
            SLOViolationSeverity.CRITICAL: AlertSeverity.HIGH,
            SLOViolationSeverity.MAJOR: AlertSeverity.MEDIUM,
            SLOViolationSeverity.MINOR: AlertSeverity.LOW,
            SLOViolationSeverity.WARNING: AlertSeverity.LOW
        }.get(violation.severity, AlertSeverity.MEDIUM)
        
        alert_message = (
            f"SLO Violation: {violation.slo_name} - {violation.severity.value.upper()}\n"
            f"Performance: {violation.current_performance:.2f}% (Target: {violation.target_performance:.2f}%)\n"
            f"Business Impact: {violation.business_impact_score:.1f}/100\n"
            f"Revenue Impact: ${violation.revenue_impact_estimate:.2f}/hour"
        )
        
        await enhanced_sentry.capture_business_event(
            "slo_violation",
            alert_message,
            {
                "slo_name": violation.slo_name,
                "severity": violation.severity.value,
                "performance": violation.current_performance,
                "target": violation.target_performance,
                "business_criticality": slo_def.business_criticality.value,
                "revenue_impact": violation.revenue_impact_estimate
            },
            severity=alert_severity
        )
        
        self.logger.error(f"🚨 SLO VIOLATION: {alert_message}")
    
    async def _send_slo_recovery_alert(self, violation: SLOViolation, recovery_time_minutes: float):
        """Send SLO recovery notification"""
        recovery_message = (
            f"SLO Recovered: {violation.slo_name}\n"
            f"Recovery Time: {recovery_time_minutes:.1f} minutes\n"
            f"Final Performance: {violation.current_performance:.2f}%"
        )
        
        await enhanced_sentry.capture_business_event(
            "slo_recovery",
            recovery_message,
            {
                "slo_name": violation.slo_name,
                "recovery_time_minutes": recovery_time_minutes,
                "final_performance": violation.current_performance
            },
            severity=AlertSeverity.LOW
        )
        
        self.logger.info(f"✅ SLO RECOVERY: {recovery_message}")
    
    async def stop_monitoring(self):
        """Stop SLO monitoring"""
        self._monitoring_active = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass


# Global enhanced SLO management instance
enhanced_slo_manager = EnhancedSLOManagementService()