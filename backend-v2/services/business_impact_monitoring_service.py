"""
Business Impact Monitoring Service for BookedBarber
Correlates technical metrics with business impact, revenue loss, and Six Figure Barber methodology alignment.
Enhances existing SRE monitoring with business-aware alerting and impact calculations.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from decimal import Decimal
import json
import redis
from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session

from db import get_db
from models import (
    User, Appointment, Payment, Service, Client,
    SixFBRevenueMetrics, SixFBClientValueProfile, SixFBServiceExcellenceMetrics,
    SixFBEfficiencyMetrics, SixFBGrowthMetrics, SixFBMethodologyDashboard,
    UnifiedUserRole, ServiceCategoryEnum, RevenueMetricType
)
from services.redis_cache import cache_service
from services.performance_monitoring import performance_tracker, SystemHealthSnapshot
from services.business_analytics_service import BusinessAnalyticsService

logger = logging.getLogger(__name__)


class BusinessImpactSeverity(Enum):
    """Business impact severity levels"""
    MINIMAL = "minimal"          # <$10 impact
    LOW = "low"                 # $10-100 impact
    MEDIUM = "medium"           # $100-500 impact
    HIGH = "high"               # $500-2000 impact
    CRITICAL = "critical"       # >$2000 impact


class SixFBPrincipleImpact(Enum):
    """Six Figure Barber principle impact categories"""
    REVENUE_OPTIMIZATION = "revenue_optimization"
    CLIENT_VALUE_CREATION = "client_value_creation"
    SERVICE_EXCELLENCE = "service_excellence"
    BUSINESS_EFFICIENCY = "business_efficiency"
    PROFESSIONAL_GROWTH = "professional_growth"


@dataclass
class BusinessImpactCalculation:
    """Business impact calculation result"""
    timestamp: datetime
    incident_type: str
    technical_severity: str
    business_severity: BusinessImpactSeverity
    estimated_revenue_loss: Decimal
    affected_bookings: int
    affected_clients: int
    sixfb_principle_impact: List[SixFBPrincipleImpact]
    recovery_urgency_score: int  # 1-100
    stakeholder_notifications: List[str]
    mitigation_priorities: List[str]
    business_context: Dict[str, Any]


@dataclass
class RevenueImpactMetrics:
    """Revenue impact tracking metrics"""
    current_hourly_rate: Decimal
    peak_hours_affected: bool
    high_value_clients_affected: int
    premium_services_affected: int
    booking_completion_rate_drop: float
    payment_success_rate_drop: float
    client_satisfaction_impact: float
    brand_reputation_risk: str


@dataclass
class CustomerExperienceImpact:
    """Customer experience impact assessment"""
    user_journey_stage: str
    abandonment_rate_increase: float
    error_frequency: int
    performance_degradation: float
    mobile_vs_desktop_impact: Dict[str, float]
    conversion_funnel_impact: Dict[str, float]
    client_support_ticket_increase: int
    social_media_sentiment_risk: str


class BusinessImpactMonitoringService:
    """
    Business Impact Monitoring Service
    Correlates technical incidents with business metrics and Six Figure Barber methodology impact
    """
    
    def __init__(self):
        self.impact_history = []
        self.business_thresholds = self._initialize_business_thresholds()
        self.sixfb_weights = self._initialize_sixfb_weights()
        self.stakeholder_configs = self._initialize_stakeholder_configs()
        
    def _initialize_business_thresholds(self) -> Dict[str, Any]:
        """Initialize business impact thresholds"""
        return {
            "revenue_loss": {
                "minimal": 10.0,
                "low": 100.0,
                "medium": 500.0,
                "high": 2000.0
            },
            "booking_impact": {
                "minimal": 1,
                "low": 5,
                "medium": 15,
                "high": 50
            },
            "performance_degradation": {
                "minimal": 0.1,  # 10% slower
                "low": 0.25,     # 25% slower
                "medium": 0.5,   # 50% slower
                "high": 1.0      # 100% slower (timeout)
            },
            "error_rate_impact": {
                "minimal": 0.01,  # 1% error rate
                "low": 0.05,      # 5% error rate
                "medium": 0.15,   # 15% error rate
                "high": 0.25      # 25% error rate
            }
        }
    
    def _initialize_sixfb_weights(self) -> Dict[str, Dict[str, float]]:
        """Initialize Six Figure Barber principle impact weights"""
        return {
            "revenue_optimization": {
                "payment_failure": 1.0,
                "booking_system_down": 0.9,
                "pricing_display_error": 0.8,
                "upselling_system_failure": 0.7
            },
            "client_value_creation": {
                "booking_system_down": 1.0,
                "client_portal_unavailable": 0.9,
                "notification_system_failure": 0.8,
                "calendar_sync_issues": 0.7
            },
            "service_excellence": {
                "appointment_scheduling_failure": 1.0,
                "client_communication_breakdown": 0.9,
                "service_tracking_unavailable": 0.8,
                "quality_metrics_down": 0.7
            },
            "business_efficiency": {
                "admin_dashboard_down": 1.0,
                "reporting_system_failure": 0.9,
                "inventory_management_issues": 0.8, 
                "schedule_optimization_failure": 0.7
            },
            "professional_growth": {
                "analytics_dashboard_down": 1.0,
                "coaching_insights_unavailable": 0.9,
                "performance_tracking_failure": 0.8,
                "goal_tracking_system_down": 0.7
            }
        }
    
    def _initialize_stakeholder_configs(self) -> Dict[str, Dict[str, Any]]:
        """Initialize stakeholder notification configurations"""
        return {
            "executives": {
                "min_severity": BusinessImpactSeverity.HIGH,
                "min_revenue_impact": 1000.0,
                "notification_delay": 0,  # Immediate
                "escalation_time": 300,   # 5 minutes
            },
            "business_operations": {
                "min_severity": BusinessImpactSeverity.MEDIUM,
                "min_revenue_impact": 200.0,
                "notification_delay": 60,   # 1 minute
                "escalation_time": 900,     # 15 minutes
            },
            "customer_success": {
                "min_severity": BusinessImpactSeverity.LOW,
                "min_revenue_impact": 50.0,
                "notification_delay": 120,  # 2 minutes
                "escalation_time": 1800,    # 30 minutes
            },
            "technical_team": {
                "min_severity": BusinessImpactSeverity.MINIMAL,
                "min_revenue_impact": 0.0,
                "notification_delay": 0,    # Immediate
                "escalation_time": 600,     # 10 minutes
            }
        }
    
    async def analyze_business_impact(
        self, 
        incident_type: str,
        technical_metrics: Dict[str, Any],
        affected_systems: List[str],
        duration_minutes: Optional[int] = None
    ) -> BusinessImpactCalculation:
        """
        Analyze business impact of a technical incident
        
        Args:
            incident_type: Type of incident (e.g., 'service_down', 'high_latency', 'payment_failure')
            technical_metrics: Technical metrics from monitoring system
            affected_systems: List of affected system components
            duration_minutes: Duration of incident (if known)
            
        Returns:
            BusinessImpactCalculation with comprehensive impact analysis
        """
        logger.info(f"Analyzing business impact for incident: {incident_type}")
        
        try:
            # Calculate revenue impact
            revenue_impact = await self._calculate_revenue_impact(
                incident_type, affected_systems, duration_minutes
            )
            
            # Assess customer experience impact
            cx_impact = await self._assess_customer_experience_impact(
                incident_type, technical_metrics, affected_systems
            )
            
            # Determine Six Figure Barber principle impacts
            sixfb_impacts = self._assess_sixfb_principle_impacts(
                incident_type, affected_systems
            )
            
            # Calculate business severity
            business_severity = self._determine_business_severity(
                revenue_impact.estimated_revenue_loss,
                revenue_impact.affected_bookings,
                cx_impact.abandonment_rate_increase
            )
            
            # Calculate recovery urgency score
            urgency_score = self._calculate_recovery_urgency(
                business_severity, sixfb_impacts, revenue_impact, cx_impact
            )
            
            # Determine stakeholder notifications
            stakeholder_notifications = self._determine_stakeholder_notifications(
                business_severity, revenue_impact.estimated_revenue_loss, sixfb_impacts
            )
            
            # Generate mitigation priorities
            mitigation_priorities = self._generate_mitigation_priorities(
                incident_type, revenue_impact, cx_impact, sixfb_impacts
            )
            
            # Compile business context
            business_context = {
                "revenue_metrics": asdict(revenue_impact),
                "customer_experience": asdict(cx_impact),
                "peak_hours_active": await self._is_peak_hours(),
                "high_value_period": await self._is_high_value_period(),
                "competing_incidents": await self._get_competing_incidents(),
                "business_calendar_events": await self._get_business_calendar_events()
            }
            
            impact_calculation = BusinessImpactCalculation(
                timestamp=datetime.now(),
                incident_type=incident_type,
                technical_severity=technical_metrics.get("severity", "unknown"),
                business_severity=business_severity,
                estimated_revenue_loss=revenue_impact.estimated_revenue_loss,
                affected_bookings=revenue_impact.affected_bookings,
                affected_clients=revenue_impact.high_value_clients_affected,
                sixfb_principle_impact=sixfb_impacts,
                recovery_urgency_score=urgency_score,
                stakeholder_notifications=stakeholder_notifications,
                mitigation_priorities=mitigation_priorities,
                business_context=business_context
            )
            
            # Store impact calculation
            await self._store_impact_calculation(impact_calculation)
            
            # Trigger business-aware alerts
            await self._trigger_business_alerts(impact_calculation)
            
            return impact_calculation
            
        except Exception as e:
            logger.error(f"Error analyzing business impact: {e}")
            # Return minimal impact calculation on error
            return BusinessImpactCalculation(
                timestamp=datetime.now(),
                incident_type=incident_type,
                technical_severity="unknown",
                business_severity=BusinessImpactSeverity.MINIMAL,
                estimated_revenue_loss=Decimal("0.00"),
                affected_bookings=0,
                affected_clients=0,
                sixfb_principle_impact=[],
                recovery_urgency_score=50,
                stakeholder_notifications=["technical_team"],
                mitigation_priorities=["investigate_technical_root_cause"],
                business_context={"error": str(e)}
            )
    
    async def _calculate_revenue_impact(
        self, 
        incident_type: str, 
        affected_systems: List[str], 
        duration_minutes: Optional[int]
    ) -> RevenueImpactMetrics:
        """Calculate revenue impact of the incident"""
        
        # Get current business metrics
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            # Calculate current hourly revenue rate
            current_hour = datetime.now().hour
            hourly_revenue = db.query(func.avg(Payment.amount)).filter(
                Payment.status == "completed",
                func.extract('hour', Payment.created_at) == current_hour,
                func.date(Payment.created_at) >= datetime.now().date() - timedelta(days=30)
            ).scalar() or Decimal("0.00")
            
            # Determine if peak hours are affected
            peak_hours = [10, 11, 12, 13, 14, 15, 16, 17]  # 10 AM - 5 PM
            is_peak_hours = current_hour in peak_hours
            
            # Calculate affected bookings based on incident type and systems
            affected_bookings = 0
            if "booking_system" in affected_systems or incident_type == "service_down":
                # Estimate bookings affected per hour during incident
                avg_bookings_per_hour = db.query(func.count(Appointment.id)).filter(
                    func.date(Appointment.created_at) >= datetime.now().date() - timedelta(days=7),
                    func.extract('hour', Appointment.created_at) == current_hour
                ).scalar() or 0
                affected_bookings = avg_bookings_per_hour * (duration_minutes or 60) // 60
            
            # Calculate high-value clients affected
            high_value_threshold = 500.0  # Clients who spend $500+ annually
            high_value_clients_affected = 0
            if affected_bookings > 0:
                high_value_clients = db.query(func.count(func.distinct(Payment.barber_id))).filter(
                    func.date(Payment.created_at) >= datetime.now().date() - timedelta(days=365),
                    Payment.status == "completed"
                ).having(func.sum(Payment.amount) >= high_value_threshold).scalar() or 0
                
                # Estimate proportion of high-value clients affected
                high_value_clients_affected = int(high_value_clients * 0.1)  # Assume 10% affected
            
            # Count premium services affected
            premium_services_affected = 0
            if "service_catalog" in affected_systems:
                premium_services_affected = db.query(func.count(Service.id)).filter(
                    Service.base_price >= 75.0
                ).scalar() or 0
            
            # Calculate performance impact on booking completion
            booking_completion_rate_drop = 0.0
            if incident_type in ["high_latency", "database_slow"]:
                booking_completion_rate_drop = 0.15  # 15% drop for performance issues
            elif incident_type == "service_down":
                booking_completion_rate_drop = 1.0   # 100% drop for complete outage
            
            # Calculate payment success rate impact
            payment_success_rate_drop = 0.0
            if "payment_system" in affected_systems or incident_type == "payment_failure":
                payment_success_rate_drop = 0.8  # 80% drop for payment issues
            
            # Estimate client satisfaction impact
            client_satisfaction_impact = 0.0
            if incident_type == "service_down":
                client_satisfaction_impact = -2.0  # -2 points on satisfaction scale
            elif incident_type == "high_latency":
                client_satisfaction_impact = -0.5   # -0.5 points for slow performance
            
            # Assess brand reputation risk
            brand_reputation_risk = "low"
            if business_severity_from_revenue(hourly_revenue * (duration_minutes or 60) // 60) in [
                BusinessImpactSeverity.HIGH, BusinessImpactSeverity.CRITICAL
            ]:
                brand_reputation_risk = "high"
            elif affected_bookings > 10:
                brand_reputation_risk = "medium"
            
            # Calculate estimated revenue loss
            estimated_loss = Decimal("0.00")
            if duration_minutes:
                hourly_loss = hourly_revenue * Decimal(str(booking_completion_rate_drop))
                estimated_loss = hourly_loss * Decimal(str(duration_minutes)) / Decimal("60")
            
            return RevenueImpactMetrics(
                current_hourly_rate=hourly_revenue,
                peak_hours_affected=is_peak_hours,
                high_value_clients_affected=high_value_clients_affected,
                premium_services_affected=premium_services_affected,
                booking_completion_rate_drop=booking_completion_rate_drop,
                payment_success_rate_drop=payment_success_rate_drop,
                client_satisfaction_impact=client_satisfaction_impact,
                brand_reputation_risk=brand_reputation_risk,
                estimated_revenue_loss=estimated_loss
            )
            
        finally:
            db.close()
    
    async def _assess_customer_experience_impact(
        self, 
        incident_type: str, 
        technical_metrics: Dict[str, Any], 
        affected_systems: List[str]
    ) -> CustomerExperienceImpact:
        """Assess customer experience impact of the incident"""
        
        # Determine user journey stage most affected
        user_journey_stage = "unknown"
        if "booking_system" in affected_systems:
            user_journey_stage = "booking"
        elif "payment_system" in affected_systems:
            user_journey_stage = "payment"
        elif "client_portal" in affected_systems:
            user_journey_stage = "account_management"
        elif "notification_system" in affected_systems:
            user_journey_stage = "communication"
        else:
            user_journey_stage = "general_usage"
        
        # Calculate abandonment rate increase
        abandonment_rate_increase = 0.0
        if incident_type == "service_down":
            abandonment_rate_increase = 0.8  # 80% increase in abandonment
        elif incident_type == "high_latency":
            latency_impact = technical_metrics.get("response_time_ms", 1000)
            if latency_impact > 5000:  # >5 seconds
                abandonment_rate_increase = 0.6
            elif latency_impact > 2000:  # >2 seconds
                abandonment_rate_increase = 0.3
            else:
                abandonment_rate_increase = 0.1
        
        # Estimate error frequency increase
        error_frequency = technical_metrics.get("error_rate", 0.0) * 100  # Convert to percentage
        
        # Calculate performance degradation percentage
        baseline_response_time = 500  # ms
        current_response_time = technical_metrics.get("response_time_ms", baseline_response_time)
        performance_degradation = max(0, (current_response_time - baseline_response_time) / baseline_response_time)
        
        # Mobile vs desktop impact (mobile typically more sensitive to performance)
        mobile_vs_desktop_impact = {
            "mobile": performance_degradation * 1.5,  # Mobile users more sensitive
            "desktop": performance_degradation
        }
        
        # Conversion funnel impact by stage
        conversion_funnel_impact = {
            "discovery": abandonment_rate_increase * 0.2,  # Lower impact on discovery
            "consideration": abandonment_rate_increase * 0.5,  # Medium impact on consideration
            "booking": abandonment_rate_increase * 1.0,  # Full impact on booking
            "payment": abandonment_rate_increase * 1.2,  # Higher impact on payment
            "retention": abandonment_rate_increase * 0.3   # Lower impact on retention
        }
        
        # Estimate support ticket increase
        support_ticket_increase = 0
        if incident_type == "service_down":
            support_ticket_increase = 10  # Expect 10 additional tickets
        elif abandonment_rate_increase > 0.3:
            support_ticket_increase = 5   # Expect 5 additional tickets
        
        # Social media sentiment risk
        social_sentiment_risk = "low"
        if incident_type == "service_down" and abandonment_rate_increase > 0.5:
            social_sentiment_risk = "high"
        elif performance_degradation > 1.0:  # >100% slower
            social_sentiment_risk = "medium"
        
        return CustomerExperienceImpact(
            user_journey_stage=user_journey_stage,
            abandonment_rate_increase=abandonment_rate_increase,
            error_frequency=int(error_frequency),
            performance_degradation=performance_degradation,
            mobile_vs_desktop_impact=mobile_vs_desktop_impact,
            conversion_funnel_impact=conversion_funnel_impact,
            client_support_ticket_increase=support_ticket_increase,
            social_media_sentiment_risk=social_sentiment_risk
        )
    
    def _assess_sixfb_principle_impacts(
        self, 
        incident_type: str, 
        affected_systems: List[str]
    ) -> List[SixFBPrincipleImpact]:
        """Assess which Six Figure Barber principles are impacted"""
        
        impacted_principles = []
        
        # Check each principle against incident type and affected systems
        for principle, incident_weights in self.sixfb_weights.items():
            impact_score = 0.0
            
            # Calculate impact score for this principle
            if incident_type in incident_weights:
                impact_score += incident_weights[incident_type]
            
            # Check affected systems for additional impact
            for system in affected_systems:
                system_weight = incident_weights.get(f"{system}_failure", 0.0)
                impact_score += system_weight
            
            # If impact score is significant, add to impacted principles
            if impact_score >= 0.5:
                impacted_principles.append(SixFBPrincipleImpact(principle))
        
        return impacted_principles
    
    def _determine_business_severity(
        self, 
        estimated_revenue_loss: Decimal,
        affected_bookings: int,
        abandonment_rate_increase: float
    ) -> BusinessImpactSeverity:
        """Determine business severity based on multiple impact factors"""
        
        # Revenue-based severity
        revenue_loss_float = float(estimated_revenue_loss)
        if revenue_loss_float >= self.business_thresholds["revenue_loss"]["high"]:
            return BusinessImpactSeverity.CRITICAL
        elif revenue_loss_float >= self.business_thresholds["revenue_loss"]["medium"]:
            severity_from_revenue = BusinessImpactSeverity.HIGH
        elif revenue_loss_float >= self.business_thresholds["revenue_loss"]["low"]:
            severity_from_revenue = BusinessImpactSeverity.MEDIUM
        elif revenue_loss_float >= self.business_thresholds["revenue_loss"]["minimal"]:
            severity_from_revenue = BusinessImpactSeverity.LOW
        else:
            severity_from_revenue = BusinessImpactSeverity.MINIMAL
        
        # Booking-based severity
        if affected_bookings >= self.business_thresholds["booking_impact"]["high"]:
            severity_from_bookings = BusinessImpactSeverity.HIGH
        elif affected_bookings >= self.business_thresholds["booking_impact"]["medium"]:
            severity_from_bookings = BusinessImpactSeverity.MEDIUM
        elif affected_bookings >= self.business_thresholds["booking_impact"]["low"]:
            severity_from_bookings = BusinessImpactSeverity.LOW
        else:
            severity_from_bookings = BusinessImpactSeverity.MINIMAL
        
        # Customer experience severity
        if abandonment_rate_increase >= 0.8:
            severity_from_cx = BusinessImpactSeverity.CRITICAL
        elif abandonment_rate_increase >= 0.5:
            severity_from_cx = BusinessImpactSeverity.HIGH
        elif abandonment_rate_increase >= 0.3:
            severity_from_cx = BusinessImpactSeverity.MEDIUM
        elif abandonment_rate_increase >= 0.1:
            severity_from_cx = BusinessImpactSeverity.LOW
        else:
            severity_from_cx = BusinessImpactSeverity.MINIMAL
        
        # Return highest severity from all factors
        severities = [severity_from_revenue, severity_from_bookings, severity_from_cx]
        severity_order = [
            BusinessImpactSeverity.MINIMAL,
            BusinessImpactSeverity.LOW,
            BusinessImpactSeverity.MEDIUM,
            BusinessImpactSeverity.HIGH,
            BusinessImpactSeverity.CRITICAL
        ]
        
        return max(severities, key=lambda s: severity_order.index(s))
    
    def _calculate_recovery_urgency(
        self,
        business_severity: BusinessImpactSeverity,
        sixfb_impacts: List[SixFBPrincipleImpact],
        revenue_impact: RevenueImpactMetrics,
        cx_impact: CustomerExperienceImpact
    ) -> int:
        """Calculate recovery urgency score (1-100)"""
        
        base_score = 50
        
        # Severity impact
        severity_scores = {
            BusinessImpactSeverity.MINIMAL: 10,
            BusinessImpactSeverity.LOW: 25,
            BusinessImpactSeverity.MEDIUM: 50,
            BusinessImpactSeverity.HIGH: 75,
            BusinessImpactSeverity.CRITICAL: 95
        }
        base_score = severity_scores[business_severity]
        
        # Peak hours multiplier
        if revenue_impact.peak_hours_affected:
            base_score = min(100, base_score * 1.3)
        
        # High-value clients multiplier
        if revenue_impact.high_value_clients_affected > 5:
            base_score = min(100, base_score * 1.2)
        
        # Customer experience multiplier
        if cx_impact.abandonment_rate_increase > 0.5:
            base_score = min(100, base_score * 1.25)
        
        # Six Figure Barber principles multiplier
        critical_principles = [
            SixFBPrincipleImpact.REVENUE_OPTIMIZATION,
            SixFBPrincipleImpact.CLIENT_VALUE_CREATION
        ]
        if any(principle in sixfb_impacts for principle in critical_principles):
            base_score = min(100, base_score * 1.15)
        
        return int(base_score)
    
    def _determine_stakeholder_notifications(
        self,
        business_severity: BusinessImpactSeverity,
        estimated_revenue_loss: Decimal,
        sixfb_impacts: List[SixFBPrincipleImpact]
    ) -> List[str]:
        """Determine which stakeholders should be notified"""
        
        notifications = ["technical_team"]  # Always notify technical team
        revenue_loss_float = float(estimated_revenue_loss)
        
        for stakeholder, config in self.stakeholder_configs.items():
            if stakeholder == "technical_team":
                continue
                
            # Check severity threshold
            severity_order = [
                BusinessImpactSeverity.MINIMAL,
                BusinessImpactSeverity.LOW,
                BusinessImpactSeverity.MEDIUM,
                BusinessImpactSeverity.HIGH,
                BusinessImpactSeverity.CRITICAL
            ]
            
            severity_met = severity_order.index(business_severity) >= severity_order.index(config["min_severity"])
            revenue_met = revenue_loss_float >= config["min_revenue_impact"]
            
            if severity_met or revenue_met:
                notifications.append(stakeholder)
        
        # Special case: if revenue optimization is impacted, always notify executives
        if SixFBPrincipleImpact.REVENUE_OPTIMIZATION in sixfb_impacts and "executives" not in notifications:
            notifications.append("executives")
        
        return notifications
    
    def _generate_mitigation_priorities(
        self,
        incident_type: str,
        revenue_impact: RevenueImpactMetrics,
        cx_impact: CustomerExperienceImpact,
        sixfb_impacts: List[SixFBPrincipleImpact]
    ) -> List[str]:
        """Generate prioritized mitigation actions"""
        
        priorities = []
        
        # High-impact mitigation actions
        if revenue_impact.payment_success_rate_drop > 0.5:
            priorities.append("restore_payment_processing_immediately")
            priorities.append("notify_affected_clients_payment_alternative")
        
        if revenue_impact.booking_completion_rate_drop > 0.7:
            priorities.append("restore_booking_system_critical")
            priorities.append("enable_phone_booking_backup")
        
        if cx_impact.abandonment_rate_increase > 0.5:
            priorities.append("implement_user_communication_banner")
            priorities.append("reduce_system_load_non_essential")
        
        # Six Figure Barber specific priorities
        if SixFBPrincipleImpact.REVENUE_OPTIMIZATION in sixfb_impacts:
            priorities.append("protect_premium_service_bookings")
            priorities.append("prioritize_high_value_client_experience")
        
        if SixFBPrincipleImpact.CLIENT_VALUE_CREATION in sixfb_impacts:
            priorities.append("maintain_client_communication_channels")
            priorities.append("preserve_personalization_features")
        
        # Performance-based priorities
        if incident_type == "high_latency":
            priorities.append("scale_infrastructure_immediately")
            priorities.append("optimize_database_queries")
        
        # Peak hours priorities
        if revenue_impact.peak_hours_affected:
            priorities.append("implement_load_balancing")
            priorities.append("defer_non_critical_operations")
        
        # Default technical priorities
        if not priorities:
            priorities.extend([
                "investigate_root_cause",
                "implement_circuit_breaker",
                "monitor_system_recovery"
            ])
        
        return priorities
    
    async def _is_peak_hours(self) -> bool:
        """Check if current time is during peak business hours"""
        current_hour = datetime.now().hour
        current_day = datetime.now().weekday()  # 0 = Monday, 6 = Sunday
        
        # Peak hours: 10 AM - 5 PM, Tuesday - Saturday
        return 10 <= current_hour <= 17 and 1 <= current_day <= 5
    
    async def _is_high_value_period(self) -> bool:
        """Check if current period is high-value (weekend, holidays, etc.)"""
        current_day = datetime.now().weekday()
        current_date = datetime.now().date()
        
        # Weekend booking period (Friday afternoon - Sunday)
        if current_day >= 4:  # Friday, Saturday, Sunday
            return True
        
        # Holiday periods (simplified - would integrate with business calendar)
        holiday_periods = [
            (datetime(2024, 12, 20).date(), datetime(2024, 12, 31).date()),  # Holiday season
            (datetime(2024, 7, 1).date(), datetime(2024, 7, 7).date()),      # Independence Day week
        ]
        
        for start_date, end_date in holiday_periods:
            if start_date <= current_date <= end_date:
                return True
        
        return False
    
    async def _get_competing_incidents(self) -> List[Dict[str, Any]]:
        """Get other active incidents that might compete for resources"""
        try:
            # Get recent incidents from cache
            incidents = await cache_service.get("active_incidents") or []
            return [
                incident for incident in incidents 
                if incident.get("status") == "active" and 
                   incident.get("timestamp", 0) > time.time() - 3600  # Last hour
            ]
        except Exception:
            return []
    
    async def _get_business_calendar_events(self) -> List[Dict[str, Any]]:
        """Get relevant business calendar events that might affect impact"""
        current_date = datetime.now().date()
        
        # Simplified business events - would integrate with actual business calendar
        events = []
        
        # Marketing campaigns
        if current_date.day == 1:  # First of month
            events.append({
                "type": "marketing_campaign",
                "name": "Monthly Promotion Launch",
                "impact": "increased_traffic_expected"
            })
        
        # Payroll processing
        if current_date.day in [15, 30, 31]:  # Mid-month and end-of-month
            events.append({
                "type": "payroll_processing",
                "name": "Barber Payout Processing",
                "impact": "critical_payment_operations"
            })
        
        return events
    
    async def _store_impact_calculation(self, calculation: BusinessImpactCalculation):
        """Store business impact calculation for historical analysis"""
        try:
            impact_data = asdict(calculation)
            # Convert Decimal to float for JSON serialization
            impact_data["estimated_revenue_loss"] = float(calculation.estimated_revenue_loss)
            
            # Store in cache with timestamp key
            cache_key = f"business_impact:{calculation.timestamp.isoformat()}"
            await cache_service.set(cache_key, impact_data, ttl=86400)  # 24 hours
            
            # Store in recent impacts list
            recent_impacts = await cache_service.get("recent_business_impacts") or []
            recent_impacts.append(impact_data)
            
            # Keep only last 100 impacts
            if len(recent_impacts) > 100:
                recent_impacts = recent_impacts[-100:]
            
            await cache_service.set("recent_business_impacts", recent_impacts, ttl=86400)
            
        except Exception as e:
            logger.error(f"Error storing impact calculation: {e}")
    
    async def _trigger_business_alerts(self, calculation: BusinessImpactCalculation):
        """Trigger business-aware alerts based on impact calculation"""
        try:
            alert_data = {
                "timestamp": calculation.timestamp.isoformat(),
                "incident_type": calculation.incident_type,
                "business_severity": calculation.business_severity.value,
                "estimated_revenue_loss": float(calculation.estimated_revenue_loss),
                "recovery_urgency_score": calculation.recovery_urgency_score,
                "stakeholder_notifications": calculation.stakeholder_notifications,
                "mitigation_priorities": calculation.mitigation_priorities,
                "sixfb_principles_affected": [p.value for p in calculation.sixfb_principle_impact]
            }
            
            # Store alert for dashboard and notification system
            alert_key = f"business_alert:{calculation.timestamp.timestamp()}"
            await cache_service.set(alert_key, alert_data, ttl=3600)  # 1 hour
            
            # Log business alert
            logger.warning(
                f"BUSINESS IMPACT ALERT [{calculation.business_severity.value.upper()}]: "
                f"{calculation.incident_type} - "
                f"${calculation.estimated_revenue_loss} estimated loss, "
                f"urgency: {calculation.recovery_urgency_score}/100"
            )
            
        except Exception as e:
            logger.error(f"Error triggering business alerts: {e}")
    
    async def get_business_impact_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive business impact dashboard data"""
        try:
            # Get recent business impacts
            recent_impacts = await cache_service.get("recent_business_impacts") or []
            
            # Calculate summary statistics
            total_incidents = len(recent_impacts)
            total_revenue_loss = sum(
                impact.get("estimated_revenue_loss", 0) 
                for impact in recent_impacts[-30:]  # Last 30 incidents
            )
            
            # Group by severity
            severity_distribution = {}
            for impact in recent_impacts[-30:]:
                severity = impact.get("business_severity", "minimal")
                severity_distribution[severity] = severity_distribution.get(severity, 0) + 1
            
            # Calculate MTTR (Mean Time To Recovery) by business severity
            mttr_by_severity = {}
            for severity in ["critical", "high", "medium", "low", "minimal"]:
                severity_incidents = [
                    impact for impact in recent_impacts 
                    if impact.get("business_severity") == severity
                ]
                if severity_incidents:
                    # Simplified MTTR calculation - would integrate with actual recovery times
                    mttr_by_severity[severity] = 15.0 if severity == "critical" else 30.0
            
            # Six Figure Barber principle impact analysis
            principle_impacts = {}
            for impact in recent_impacts[-30:]:
                for principle in impact.get("sixfb_principles_affected", []):
                    principle_impacts[principle] = principle_impacts.get(principle, 0) + 1
            
            return {
                "summary": {
                    "total_incidents_30d": total_incidents,
                    "total_revenue_impact_30d": total_revenue_loss,
                    "average_recovery_urgency": sum(
                        impact.get("recovery_urgency_score", 50) 
                        for impact in recent_impacts[-30:]
                    ) / max(1, len(recent_impacts[-30:])),
                    "current_active_incidents": len(await self._get_competing_incidents())
                },
                "severity_distribution": severity_distribution,
                "mttr_by_business_severity": mttr_by_severity,
                "sixfb_principle_impacts": principle_impacts,
                "recent_incidents": recent_impacts[-10:],  # Last 10 incidents
                "business_thresholds": self.business_thresholds,
                "peak_hours_status": await self._is_peak_hours(),
                "high_value_period_status": await self._is_high_value_period()
            }
            
        except Exception as e:
            logger.error(f"Error generating business impact dashboard: {e}")
            return {"error": str(e)}


# Helper function for revenue severity calculation
def business_severity_from_revenue(revenue_loss: float) -> BusinessImpactSeverity:
    """Helper function to determine business severity from revenue loss"""
    if revenue_loss >= 2000.0:
        return BusinessImpactSeverity.CRITICAL
    elif revenue_loss >= 500.0:
        return BusinessImpactSeverity.HIGH
    elif revenue_loss >= 100.0:
        return BusinessImpactSeverity.MEDIUM
    elif revenue_loss >= 10.0:
        return BusinessImpactSeverity.LOW
    else:
        return BusinessImpactSeverity.MINIMAL


# Global business impact monitoring service instance
business_impact_monitor = BusinessImpactMonitoringService()