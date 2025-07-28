"""
Customer Experience Monitoring Service for BookedBarber
Monitors user journey, conversion funnels, and UX degradation with business impact correlation.
Integrated with Six Figure Barber methodology for client value optimization.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import json
from collections import defaultdict, deque

from services.redis_cache import cache_service
from services.business_impact_monitoring_service import business_impact_monitor

logger = logging.getLogger(__name__)


class UserJourneyStage(Enum):
    """User journey stages for experience tracking"""
    DISCOVERY = "discovery"
    CONSIDERATION = "consideration"
    BOOKING = "booking"
    PAYMENT = "payment"
    CONFIRMATION = "confirmation"
    EXPERIENCE = "experience"
    RETENTION = "retention"


class DeviceType(Enum):
    """Device types for experience differentiation"""
    MOBILE = "mobile"
    TABLET = "tablet"
    DESKTOP = "desktop"
    UNKNOWN = "unknown"


class ExperienceDegradationType(Enum):
    """Types of experience degradation"""
    PERFORMANCE = "performance"
    FUNCTIONALITY = "functionality"
    USABILITY = "usability"
    ACCESSIBILITY = "accessibility"
    CONTENT = "content"


@dataclass
class UserJourneyEvent:
    """Individual user journey event"""
    timestamp: datetime
    user_id: Optional[str]
    session_id: str
    stage: UserJourneyStage
    action: str
    device_type: DeviceType
    success: bool
    duration_ms: Optional[float]
    error_details: Optional[str]
    business_value: float  # Estimated business value of this action
    metadata: Dict[str, Any]


@dataclass
class ConversionFunnelMetrics:
    """Conversion funnel performance metrics"""
    stage: UserJourneyStage
    total_entries: int
    successful_completions: int
    conversion_rate: float
    average_duration_ms: float
    abandonment_points: List[str]
    device_breakdown: Dict[DeviceType, Dict[str, float]]
    business_impact: float  # Revenue impact of conversions/abandonments


@dataclass
class UXDegradationAlert:
    """UX degradation alert with business context"""
    timestamp: datetime
    degradation_type: ExperienceDegradationType
    affected_stage: UserJourneyStage
    severity: str
    description: str
    affected_users: int
    estimated_revenue_impact: float
    device_types_affected: List[DeviceType]
    mitigation_suggestions: List[str]
    business_context: Dict[str, Any]


class CustomerExperienceMonitoringService:
    """
    Comprehensive customer experience monitoring with business impact correlation.
    Tracks user journeys, conversion funnels, and UX degradation patterns.
    """
    
    def __init__(self):
        self.journey_events = deque(maxlen=10000)  # Store recent journey events
        self.conversion_metrics = {}
        self.degradation_alerts = deque(maxlen=100)
        self.device_performance = defaultdict(lambda: defaultdict(list))
        self.stage_performance = defaultdict(lambda: defaultdict(list))
        
        # Business impact weights for different journey stages
        self.stage_business_weights = {
            UserJourneyStage.DISCOVERY: 1.0,
            UserJourneyStage.CONSIDERATION: 2.0,
            UserJourneyStage.BOOKING: 5.0,
            UserJourneyStage.PAYMENT: 8.0,
            UserJourneyStage.CONFIRMATION: 3.0,
            UserJourneyStage.EXPERIENCE: 4.0,
            UserJourneyStage.RETENTION: 6.0
        }
        
        # Performance thresholds by device type
        self.performance_thresholds = {
            DeviceType.MOBILE: {
                "page_load_ms": 3000,
                "interaction_response_ms": 500,
                "form_completion_ms": 10000
            },
            DeviceType.TABLET: {
                "page_load_ms": 2500,
                "interaction_response_ms": 400,
                "form_completion_ms": 8000
            },
            DeviceType.DESKTOP: {
                "page_load_ms": 2000,
                "interaction_response_ms": 300,
                "form_completion_ms": 6000
            }
        }
        
        # Conversion rate targets by stage
        self.conversion_targets = {
            UserJourneyStage.DISCOVERY: 0.25,      # 25% move to consideration
            UserJourneyStage.CONSIDERATION: 0.40,  # 40% move to booking
            UserJourneyStage.BOOKING: 0.85,        # 85% complete booking
            UserJourneyStage.PAYMENT: 0.95,        # 95% complete payment
            UserJourneyStage.CONFIRMATION: 0.98,   # 98% receive confirmation
            UserJourneyStage.EXPERIENCE: 0.90,     # 90% positive experience
            UserJourneyStage.RETENTION: 0.60       # 60% return customers
        }
    
    async def track_journey_event(
        self,
        user_id: Optional[str],
        session_id: str,
        stage: UserJourneyStage,
        action: str,
        device_type: DeviceType,
        success: bool,
        duration_ms: Optional[float] = None,
        error_details: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserJourneyEvent:
        """Track a user journey event with business impact correlation"""
        
        try:
            # Calculate business value of the event
            business_value = await self._calculate_event_business_value(
                stage, action, success, device_type
            )
            
            # Create journey event
            event = UserJourneyEvent(
                timestamp=datetime.now(),
                user_id=user_id,
                session_id=session_id,
                stage=stage,
                action=action,
                device_type=device_type,
                success=success,
                duration_ms=duration_ms,
                error_details=error_details,
                business_value=business_value,
                metadata=metadata or {}
            )
            
            # Store event
            self.journey_events.append(event)
            await self._cache_journey_event(event)
            
            # Update performance tracking
            await self._update_performance_tracking(event)
            
            # Check for UX degradation
            await self._check_ux_degradation(event)
            
            # Update conversion funnel metrics
            await self._update_conversion_metrics(event)
            
            return event
            
        except Exception as e:
            logger.error(f"Error tracking journey event: {e}")
            raise
    
    async def _calculate_event_business_value(
        self,
        stage: UserJourneyStage,
        action: str,
        success: bool,
        device_type: DeviceType
    ) -> float:
        """Calculate the business value of a journey event"""
        
        # Base value from stage importance
        base_value = self.stage_business_weights.get(stage, 1.0)
        
        # Success multiplier
        success_multiplier = 1.0 if success else -0.5  # Failed actions have negative value
        
        # Action-specific multipliers
        action_multipliers = {
            "page_view": 0.1,
            "form_start": 0.3,
            "form_complete": 1.0,
            "booking_attempt": 2.0,
            "booking_success": 5.0,
            "payment_attempt": 3.0,
            "payment_success": 8.0,
            "service_selection": 1.5,
            "time_slot_selection": 2.0,
            "client_registration": 4.0,
            "appointment_confirmation": 6.0,
            "review_submission": 2.0,
            "rebooking": 7.0
        }
        
        action_multiplier = action_multipliers.get(action, 0.5)
        
        # Device-specific adjustments (mobile conversions are more valuable due to difficulty)
        device_multipliers = {
            DeviceType.MOBILE: 1.2,
            DeviceType.TABLET: 1.1,
            DeviceType.DESKTOP: 1.0,
            DeviceType.UNKNOWN: 0.8
        }
        
        device_multiplier = device_multipliers.get(device_type, 1.0)
        
        return base_value * success_multiplier * action_multiplier * device_multiplier
    
    async def _cache_journey_event(self, event: UserJourneyEvent):
        """Cache journey event for real-time analysis"""
        try:
            event_data = asdict(event)
            event_data["timestamp"] = event.timestamp.isoformat()
            
            # Store individual event
            await cache_service.set(
                f"journey_event:{event.session_id}:{int(event.timestamp.timestamp() * 1000)}",
                event_data,
                ttl=3600  # 1 hour
            )
            
            # Update session journey
            session_key = f"user_journey:{event.session_id}"
            session_journey = await cache_service.get(session_key) or []
            session_journey.append(event_data)
            
            # Keep only last 50 events per session
            if len(session_journey) > 50:
                session_journey = session_journey[-50:]
            
            await cache_service.set(session_key, session_journey, ttl=7200)  # 2 hours
            
        except Exception as e:
            logger.error(f"Error caching journey event: {e}")
    
    async def _update_performance_tracking(self, event: UserJourneyEvent):
        """Update performance tracking metrics"""
        try:
            if event.duration_ms is not None:
                # Update device performance tracking
                self.device_performance[event.device_type][event.action].append(event.duration_ms)
                
                # Update stage performance tracking
                self.stage_performance[event.stage][event.action].append(event.duration_ms)
                
                # Keep only recent performance data (last 1000 events per category)
                for device_actions in self.device_performance.values():
                    for action_times in device_actions.values():
                        if len(action_times) > 1000:
                            action_times[:] = action_times[-1000:]
                
                for stage_actions in self.stage_performance.values():
                    for action_times in stage_actions.values():
                        if len(action_times) > 1000:
                            action_times[:] = action_times[-1000:]
            
        except Exception as e:
            logger.error(f"Error updating performance tracking: {e}")
    
    async def _check_ux_degradation(self, event: UserJourneyEvent):
        """Check for UX degradation patterns and trigger alerts"""
        try:
            degradation_detected = False
            degradation_type = None
            severity = "low"
            description = ""
            mitigation_suggestions = []
            
            # Performance degradation check
            if event.duration_ms is not None and event.device_type in self.performance_thresholds:
                thresholds = self.performance_thresholds[event.device_type]
                
                if event.action in ["page_view", "page_load"] and event.duration_ms > thresholds["page_load_ms"]:
                    degradation_detected = True
                    degradation_type = ExperienceDegradationType.PERFORMANCE
                    severity = "high" if event.duration_ms > thresholds["page_load_ms"] * 2 else "medium"
                    description = f"Page load time {event.duration_ms:.0f}ms exceeds {thresholds['page_load_ms']}ms threshold"
                    mitigation_suggestions = [
                        "Optimize page assets and reduce bundle size",
                        "Implement progressive loading",
                        "Review database query performance",
                        "Consider CDN optimization"
                    ]
                
                elif "form" in event.action and event.duration_ms > thresholds["form_completion_ms"]:
                    degradation_detected = True
                    degradation_type = ExperienceDegradationType.USABILITY
                    severity = "medium"
                    description = f"Form completion time {event.duration_ms:.0f}ms exceeds expected duration"
                    mitigation_suggestions = [
                        "Simplify form fields and validation",
                        "Implement auto-save functionality",
                        "Add progress indicators",
                        "Optimize form submission handling"
                    ]
            
            # Functionality degradation check
            if not event.success:
                degradation_detected = True
                degradation_type = ExperienceDegradationType.FUNCTIONALITY
                
                if event.stage in [UserJourneyStage.BOOKING, UserJourneyStage.PAYMENT]:
                    severity = "critical"
                    description = f"Critical functionality failure in {event.stage.value}: {event.error_details}"
                    mitigation_suggestions = [
                        "Investigate and fix underlying technical issue",
                        "Implement fallback mechanisms",
                        "Add better error handling and user feedback",
                        "Consider manual assistance for affected users"
                    ]
                else:
                    severity = "medium"
                    description = f"Functionality issue in {event.stage.value}: {event.error_details}"
                    mitigation_suggestions = [
                        "Review error handling logic",
                        "Improve user feedback mechanisms",
                        "Add retry functionality where appropriate"
                    ]
            
            # Create degradation alert if detected
            if degradation_detected:
                await self._create_ux_degradation_alert(
                    degradation_type=degradation_type,
                    affected_stage=event.stage,
                    severity=severity,
                    description=description,
                    event=event,
                    mitigation_suggestions=mitigation_suggestions
                )
            
        except Exception as e:
            logger.error(f"Error checking UX degradation: {e}")
    
    async def _create_ux_degradation_alert(
        self,
        degradation_type: ExperienceDegradationType,
        affected_stage: UserJourneyStage,
        severity: str,
        description: str,
        event: UserJourneyEvent,
        mitigation_suggestions: List[str]
    ):
        """Create a UX degradation alert with business impact assessment"""
        try:
            # Count affected users in recent time window
            recent_time = datetime.now() - timedelta(minutes=15)
            affected_users = len(set(
                e.user_id for e in self.journey_events
                if e.timestamp >= recent_time and e.stage == affected_stage and not e.success
            ))
            
            # Estimate revenue impact
            estimated_revenue_impact = await self._estimate_degradation_revenue_impact(
                degradation_type, affected_stage, affected_users, event.device_type
            )
            
            # Get business context
            business_context = await self._get_business_context_for_alert()
            
            # Create alert
            alert = UXDegradationAlert(
                timestamp=datetime.now(),
                degradation_type=degradation_type,
                affected_stage=affected_stage,
                severity=severity,
                description=description,
                affected_users=affected_users,
                estimated_revenue_impact=estimated_revenue_impact,
                device_types_affected=[event.device_type],
                mitigation_suggestions=mitigation_suggestions,
                business_context=business_context
            )
            
            # Store alert
            self.degradation_alerts.append(alert)
            await self._cache_degradation_alert(alert)
            
            # Trigger business impact analysis if severe
            if severity in ["critical", "high"] or estimated_revenue_impact > 100:
                await self._trigger_business_impact_analysis(alert)
            
            # Log alert
            logger.warning(
                f"UX Degradation Alert [{severity.upper()}]: "
                f"{degradation_type.value} in {affected_stage.value} - "
                f"{description} - "
                f"Affected users: {affected_users}, "
                f"Estimated revenue impact: ${estimated_revenue_impact:.2f}"
            )
            
        except Exception as e:
            logger.error(f"Error creating UX degradation alert: {e}")
    
    async def _estimate_degradation_revenue_impact(
        self,
        degradation_type: ExperienceDegradationType,
        affected_stage: UserJourneyStage,
        affected_users: int,
        device_type: DeviceType
    ) -> float:
        """Estimate revenue impact of UX degradation"""
        
        # Base impact per user by stage
        base_impact_per_user = {
            UserJourneyStage.DISCOVERY: 5.0,
            UserJourneyStage.CONSIDERATION: 15.0,
            UserJourneyStage.BOOKING: 50.0,
            UserJourneyStage.PAYMENT: 75.0,
            UserJourneyStage.CONFIRMATION: 25.0,
            UserJourneyStage.EXPERIENCE: 35.0,
            UserJourneyStage.RETENTION: 100.0
        }
        
        base_impact = base_impact_per_user.get(affected_stage, 10.0)
        
        # Degradation type multipliers
        degradation_multipliers = {
            ExperienceDegradationType.PERFORMANCE: 0.8,
            ExperienceDegradationType.FUNCTIONALITY: 1.5,
            ExperienceDegradationType.USABILITY: 1.0,
            ExperienceDegradationType.ACCESSIBILITY: 0.6,
            ExperienceDegradationType.CONTENT: 0.4
        }
        
        degradation_multiplier = degradation_multipliers.get(degradation_type, 1.0)
        
        # Device type impact (mobile issues typically have higher impact)
        device_multipliers = {
            DeviceType.MOBILE: 1.3,
            DeviceType.TABLET: 1.1,
            DeviceType.DESKTOP: 1.0,
            DeviceType.UNKNOWN: 0.8
        }
        
        device_multiplier = device_multipliers.get(device_type, 1.0)
        
        return base_impact * degradation_multiplier * device_multiplier * affected_users
    
    async def _get_business_context_for_alert(self) -> Dict[str, Any]:
        """Get business context for degradation alerts"""
        try:
            current_hour = datetime.now().hour
            current_day = datetime.now().weekday()
            
            return {
                "peak_hours": 10 <= current_hour <= 17 and 1 <= current_day <= 5,
                "weekend_period": current_day >= 5,
                "business_hours": 8 <= current_hour <= 20,
                "high_traffic_expected": current_hour in [12, 13, 17, 18, 19],  # Lunch and evening
                "timestamp": datetime.now().isoformat()
            }
        except Exception:
            return {}
    
    async def _cache_degradation_alert(self, alert: UXDegradationAlert):
        """Cache degradation alert for dashboard and notification systems"""
        try:
            alert_data = asdict(alert)
            alert_data["timestamp"] = alert.timestamp.isoformat()
            
            # Store individual alert
            await cache_service.set(
                f"ux_degradation_alert:{int(alert.timestamp.timestamp() * 1000)}",
                alert_data,
                ttl=3600  # 1 hour
            )
            
            # Update recent alerts list
            recent_alerts = await cache_service.get("recent_ux_alerts") or []
            recent_alerts.append(alert_data)
            
            # Keep only last 20 alerts
            if len(recent_alerts) > 20:
                recent_alerts = recent_alerts[-20:]
            
            await cache_service.set("recent_ux_alerts", recent_alerts, ttl=7200)  # 2 hours
            
        except Exception as e:
            logger.error(f"Error caching degradation alert: {e}")
    
    async def _trigger_business_impact_analysis(self, alert: UXDegradationAlert):
        """Trigger business impact analysis for severe UX degradation"""
        try:
            # Create incident for business impact analysis
            incident_type = f"ux_degradation_{alert.degradation_type.value}"
            
            technical_metrics = {
                "severity": alert.severity,
                "affected_users": alert.affected_users,
                "degradation_type": alert.degradation_type.value,
                "user_journey_stage": alert.affected_stage.value
            }
            
            affected_systems = [f"{alert.affected_stage.value}_system"]
            
            # Analyze business impact
            impact_calculation = await business_impact_monitor.analyze_business_impact(
                incident_type=incident_type,
                technical_metrics=technical_metrics,
                affected_systems=affected_systems,
                duration_minutes=15  # Assume 15-minute impact window
            )
            
            # Store correlation between UX alert and business impact
            correlation_data = {
                "ux_alert_id": int(alert.timestamp.timestamp() * 1000),
                "business_impact": asdict(impact_calculation),
                "correlation_timestamp": datetime.now().isoformat()
            }
            
            await cache_service.set(
                f"ux_business_correlation:{int(alert.timestamp.timestamp() * 1000)}",
                correlation_data,
                ttl=3600
            )
            
        except Exception as e:
            logger.error(f"Error triggering business impact analysis: {e}")
    
    async def _update_conversion_metrics(self, event: UserJourneyEvent):
        """Update conversion funnel metrics"""
        try:
            stage = event.stage
            
            # Initialize stage metrics if not exists
            if stage not in self.conversion_metrics:
                self.conversion_metrics[stage] = {
                    "total_entries": 0,
                    "successful_completions": 0,
                    "total_duration_ms": 0,
                    "abandonment_points": defaultdict(int),
                    "device_breakdown": defaultdict(lambda: {"entries": 0, "completions": 0}),
                    "last_updated": datetime.now()
                }
            
            metrics = self.conversion_metrics[stage]
            
            # Update entry count
            metrics["total_entries"] += 1
            
            # Update device breakdown
            device_metrics = metrics["device_breakdown"][event.device_type]
            device_metrics["entries"] += 1
            
            # Update success metrics
            if event.success:
                metrics["successful_completions"] += 1
                device_metrics["completions"] += 1
                
                if event.duration_ms:
                    metrics["total_duration_ms"] += event.duration_ms
            else:
                # Track abandonment point
                metrics["abandonment_points"][event.action] += 1
            
            metrics["last_updated"] = datetime.now()
            
        except Exception as e:
            logger.error(f"Error updating conversion metrics: {e}")
    
    async def get_conversion_funnel_analysis(self) -> Dict[str, Any]:
        """Get comprehensive conversion funnel analysis"""
        try:
            funnel_analysis = {}
            
            for stage, metrics in self.conversion_metrics.items():
                if metrics["total_entries"] > 0:
                    conversion_rate = metrics["successful_completions"] / metrics["total_entries"]
                    avg_duration = metrics["total_duration_ms"] / max(1, metrics["successful_completions"])
                    
                    # Calculate device-specific conversion rates
                    device_conversions = {}
                    for device, device_metrics in metrics["device_breakdown"].items():
                        if device_metrics["entries"] > 0:
                            device_conversions[device.value] = {
                                "conversion_rate": device_metrics["completions"] / device_metrics["entries"],
                                "entries": device_metrics["entries"],
                                "completions": device_metrics["completions"]
                            }
                    
                    # Calculate business impact
                    target_rate = self.conversion_targets.get(stage, 0.5)
                    performance_vs_target = conversion_rate / target_rate if target_rate > 0 else 1.0
                    
                    stage_business_weight = self.stage_business_weights.get(stage, 1.0)
                    business_impact = (conversion_rate * metrics["total_entries"] * stage_business_weight)
                    
                    funnel_analysis[stage.value] = {
                        "total_entries": metrics["total_entries"],
                        "successful_completions": metrics["successful_completions"],
                        "conversion_rate": round(conversion_rate * 100, 2),
                        "target_conversion_rate": round(target_rate * 100, 2),
                        "performance_vs_target": round(performance_vs_target, 2),
                        "average_duration_ms": round(avg_duration, 0),
                        "abandonment_points": dict(metrics["abandonment_points"]),
                        "device_breakdown": device_conversions,
                        "business_impact": round(business_impact, 2),
                        "last_updated": metrics["last_updated"].isoformat()
                    }
            
            return {
                "funnel_analysis": funnel_analysis,
                "overall_funnel_health": self._calculate_overall_funnel_health(funnel_analysis),
                "optimization_opportunities": self._identify_optimization_opportunities(funnel_analysis),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting conversion funnel analysis: {e}")
            return {"error": str(e)}
    
    def _calculate_overall_funnel_health(self, funnel_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall funnel health score"""
        if not funnel_analysis:
            return {"score": 0, "status": "unknown"}
        
        total_score = 0
        stage_count = 0
        
        for stage_data in funnel_analysis.values():
            performance_vs_target = stage_data.get("performance_vs_target", 0)
            stage_score = min(100, performance_vs_target * 100)
            total_score += stage_score
            stage_count += 1
        
        overall_score = total_score / stage_count if stage_count > 0 else 0
        
        if overall_score >= 90:
            status = "excellent"
        elif overall_score >= 75:
            status = "good"
        elif overall_score >= 60:
            status = "needs_attention"
        else:
            status = "critical"
        
        return {
            "score": round(overall_score, 1),
            "status": status,
            "stage_count": stage_count
        }
    
    def _identify_optimization_opportunities(self, funnel_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify optimization opportunities in the conversion funnel"""
        opportunities = []
        
        for stage_name, stage_data in funnel_analysis.items():
            performance_vs_target = stage_data.get("performance_vs_target", 1.0)
            conversion_rate = stage_data.get("conversion_rate", 0)
            
            if performance_vs_target < 0.8:  # 20% below target
                opportunity = {
                    "stage": stage_name,
                    "type": "conversion_rate_improvement",
                    "priority": "high" if performance_vs_target < 0.6 else "medium",
                    "current_rate": conversion_rate,
                    "target_rate": stage_data.get("target_conversion_rate", 0),
                    "potential_improvement": f"{(stage_data.get('target_conversion_rate', 0) - conversion_rate):.1f}%",
                    "affected_users": stage_data.get("total_entries", 0)
                }
                
                # Add specific recommendations based on stage
                if stage_name == "booking":
                    opportunity["recommendations"] = [
                        "Simplify booking form",
                        "Add progress indicators",
                        "Implement auto-save",
                        "Improve time slot selection UX"
                    ]
                elif stage_name == "payment":
                    opportunity["recommendations"] = [
                        "Optimize payment form",
                        "Add multiple payment options",
                        "Improve error handling",
                        "Add trust indicators"
                    ]
                else:
                    opportunity["recommendations"] = [
                        "Analyze user feedback",
                        "Improve page performance",
                        "Simplify user interface",
                        "Add helpful guidance"
                    ]
                
                opportunities.append(opportunity)
            
            # Check for device-specific issues
            device_breakdown = stage_data.get("device_breakdown", {})
            mobile_conversion = device_breakdown.get("mobile", {}).get("conversion_rate", 0)
            desktop_conversion = device_breakdown.get("desktop", {}).get("conversion_rate", 0)
            
            if mobile_conversion > 0 and desktop_conversion > 0:
                if mobile_conversion < desktop_conversion * 0.7:  # Mobile 30% worse than desktop
                    opportunities.append({
                        "stage": stage_name,
                        "type": "mobile_optimization",
                        "priority": "high",
                        "mobile_conversion": f"{mobile_conversion:.1f}%",
                        "desktop_conversion": f"{desktop_conversion:.1f}%",
                        "gap": f"{(desktop_conversion - mobile_conversion):.1f}%",
                        "recommendations": [
                            "Optimize mobile interface",
                            "Improve touch interactions",
                            "Reduce mobile page load time",
                            "Simplify mobile forms"
                        ]
                    })
        
        return opportunities
    
    async def get_ux_degradation_dashboard(self) -> Dict[str, Any]:
        """Get UX degradation monitoring dashboard"""
        try:
            # Get recent alerts
            recent_alerts = await cache_service.get("recent_ux_alerts") or []
            
            # Categorize alerts by severity and type
            alert_summary = {
                "total_alerts": len(recent_alerts),
                "by_severity": defaultdict(int),
                "by_type": defaultdict(int),
                "by_stage": defaultdict(int),
                "by_device": defaultdict(int)
            }
            
            total_revenue_impact = 0
            for alert in recent_alerts:
                alert_summary["by_severity"][alert.get("severity", "unknown")] += 1
                alert_summary["by_type"][alert.get("degradation_type", "unknown")] += 1
                alert_summary["by_stage"][alert.get("affected_stage", "unknown")] += 1
                
                for device in alert.get("device_types_affected", []):
                    alert_summary["by_device"][device] += 1
                
                total_revenue_impact += alert.get("estimated_revenue_impact", 0)
            
            # Get performance trends
            performance_trends = await self._get_performance_trends()
            
            return {
                "alert_summary": dict(alert_summary),
                "total_estimated_revenue_impact": round(total_revenue_impact, 2),
                "recent_alerts": recent_alerts[-10:],  # Last 10 alerts
                "performance_trends": performance_trends,
                "monitoring_status": "active",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting UX degradation dashboard: {e}")
            return {"error": str(e)}
    
    async def _get_performance_trends(self) -> Dict[str, Any]:
        """Get performance trends across devices and stages"""
        trends = {}
        
        # Device performance trends
        for device_type, actions in self.device_performance.items():
            device_trends = {}
            for action, durations in actions.items():
                if durations:
                    device_trends[action] = {
                        "average_ms": sum(durations) / len(durations),
                        "median_ms": sorted(durations)[len(durations) // 2],
                        "p95_ms": sorted(durations)[int(len(durations) * 0.95)] if len(durations) > 20 else max(durations),
                        "sample_count": len(durations)
                    }
            
            if device_trends:
                trends[device_type.value] = device_trends
        
        return trends


# Global customer experience monitoring service instance
cx_monitor = CustomerExperienceMonitoringService()