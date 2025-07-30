"""
Six Figure Barber Business Metrics Service
Provides business-aligned error analytics and KPI correlation
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import statistics

from services.error_monitoring_service import (
    ErrorEvent, ErrorSeverity, ErrorCategory, BusinessImpact,
    error_monitoring_service
)

logger = logging.getLogger(__name__)

@dataclass
class BusinessMetric:
    """Business metric data point"""
    name: str
    value: float
    trend: str  # "up", "down", "stable" 
    health_score: float  # 0-100
    impact_level: str  # "critical", "moderate", "minimal"
    recommendation: str

@dataclass
class SixFigureBarberKPI:
    """Six Figure Barber methodology KPI"""
    metric_name: str
    current_value: float
    target_value: float
    health_percentage: float
    error_correlation: float
    improvement_actions: List[str]

class SixFigureBarberMetricsService:
    """Business metrics service aligned with Six Figure Barber methodology"""
    
    def __init__(self):
        self.metrics_cache = {}
        self.cache_expiry = timedelta(minutes=5)
    
    async def get_revenue_pipeline_health(self) -> BusinessMetric:
        """Assess health of revenue-generating pipeline"""
        
        # Get errors affecting revenue pipeline in last 24 hours
        revenue_errors = await error_monitoring_service.get_errors_by_business_impact(
            BusinessImpact.REVENUE_BLOCKING,
            since=datetime.utcnow() - timedelta(days=1)
        )
        
        # Calculate revenue pipeline health score
        error_count = len(revenue_errors)
        
        if error_count == 0:
            health_score = 100.0
            trend = "stable"
            impact_level = "minimal"
            recommendation = "Revenue pipeline is healthy - maintain monitoring"
        elif error_count <= 2:
            health_score = 85.0
            trend = "down"
            impact_level = "minimal"
            recommendation = "Minor revenue impacts detected - review payment flow"
        elif error_count <= 5:
            health_score = 60.0
            trend = "down" 
            impact_level = "moderate"
            recommendation = "Multiple revenue issues - immediate attention required"
        else:
            health_score = 25.0
            trend = "down"
            impact_level = "critical"
            recommendation = "CRITICAL: Revenue pipeline severely impacted - emergency response"
        
        return BusinessMetric(
            name="Revenue Pipeline Health",
            value=error_count,
            trend=trend,
            health_score=health_score,
            impact_level=impact_level,
            recommendation=recommendation
        )
    
    async def get_client_experience_score(self) -> BusinessMetric:
        """Calculate client experience impact score"""
        
        # Get user-blocking and experience-degrading errors
        client_errors = []
        
        user_blocking_errors = await error_monitoring_service.get_errors_by_business_impact(
            BusinessImpact.USER_BLOCKING,
            since=datetime.utcnow() - timedelta(hours=4)
        )
        client_errors.extend(user_blocking_errors)
        
        experience_errors = await error_monitoring_service.get_errors_by_business_impact(
            BusinessImpact.EXPERIENCE_DEGRADING,
            since=datetime.utcnow() - timedelta(hours=4)
        )
        client_errors.extend(experience_errors)
        
        # Weight errors based on severity
        weighted_score = 0
        for error in client_errors:
            if error.severity == ErrorSeverity.CRITICAL:
                weighted_score += 10
            elif error.severity == ErrorSeverity.HIGH:
                weighted_score += 5
            elif error.severity == ErrorSeverity.MEDIUM:
                weighted_score += 2
            else:
                weighted_score += 1
        
        # Calculate client experience score (inverse of weighted errors)
        if weighted_score == 0:
            health_score = 100.0
            trend = "stable"
            impact_level = "minimal"
            recommendation = "Excellent client experience - maintain current quality"
        elif weighted_score <= 5:
            health_score = 90.0
            trend = "stable"
            impact_level = "minimal" 
            recommendation = "Good client experience - minor improvements available"
        elif weighted_score <= 15:
            health_score = 70.0
            trend = "down"
            impact_level = "moderate"
            recommendation = "Client experience issues detected - review user journey"
        else:
            health_score = 40.0
            trend = "down"
            impact_level = "critical"
            recommendation = "URGENT: Significant client experience degradation"
        
        return BusinessMetric(
            name="Client Experience Score",
            value=100 - weighted_score,
            trend=trend,
            health_score=health_score,
            impact_level=impact_level,
            recommendation=recommendation
        )
    
    async def get_booking_funnel_analysis(self) -> Dict[str, Any]:
        """Analyze booking funnel error patterns"""
        
        # Get booking-related errors by category
        booking_errors = await error_monitoring_service.get_errors_by_category(
            ErrorCategory.BOOKING,
            since=datetime.utcnow() - timedelta(hours=6)
        )
        
        payment_errors = await error_monitoring_service.get_errors_by_category(
            ErrorCategory.PAYMENT,
            since=datetime.utcnow() - timedelta(hours=6)
        )
        
        auth_errors = await error_monitoring_service.get_errors_by_category(
            ErrorCategory.AUTHENTICATION,
            since=datetime.utcnow() - timedelta(hours=6)
        )
        
        # Analyze funnel stages
        funnel_analysis = {
            "authentication_stage": {
                "error_count": len(auth_errors),
                "conversion_impact": self._calculate_conversion_impact(auth_errors),
                "top_issues": self._get_top_error_messages(auth_errors, 3)
            },
            "booking_stage": {
                "error_count": len(booking_errors),
                "conversion_impact": self._calculate_conversion_impact(booking_errors),
                "top_issues": self._get_top_error_messages(booking_errors, 3)
            },
            "payment_stage": {
                "error_count": len(payment_errors),
                "conversion_impact": self._calculate_conversion_impact(payment_errors),
                "top_issues": self._get_top_error_messages(payment_errors, 3)
            },
            "overall_funnel_health": self._calculate_funnel_health(
                auth_errors, booking_errors, payment_errors
            ),
            "recommendations": self._generate_funnel_recommendations(
                auth_errors, booking_errors, payment_errors
            )
        }
        
        return funnel_analysis
    
    async def get_barber_productivity_index(self) -> BusinessMetric:
        """Calculate barber productivity impact from errors"""
        
        # Get errors that affect barber workflows
        productivity_affecting_categories = [
            ErrorCategory.BOOKING,
            ErrorCategory.AUTHENTICATION,
            ErrorCategory.DATABASE,
            ErrorCategory.USER_EXPERIENCE
        ]
        
        productivity_errors = []
        for category in productivity_affecting_categories:
            errors = await error_monitoring_service.get_errors_by_category(
                category,
                since=datetime.utcnow() - timedelta(hours=8)
            )
            productivity_errors.extend(errors)
        
        # Calculate productivity impact
        total_errors = len(productivity_errors)
        high_impact_errors = [
            e for e in productivity_errors 
            if e.severity in [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH]
        ]
        
        # Productivity index (higher is better)
        if total_errors == 0:
            productivity_index = 100.0
            trend = "stable"
            impact_level = "minimal"
            recommendation = "Optimal barber productivity - systems running smoothly"
        elif len(high_impact_errors) == 0 and total_errors <= 3:
            productivity_index = 90.0
            trend = "stable"
            impact_level = "minimal"
            recommendation = "Good productivity - minor system optimizations available"
        elif len(high_impact_errors) <= 2:
            productivity_index = 75.0
            trend = "down"
            impact_level = "moderate"
            recommendation = "Productivity impacts detected - review barber workflows"
        else:
            productivity_index = 50.0
            trend = "down"
            impact_level = "critical"
            recommendation = "URGENT: Significant productivity loss - immediate system fixes needed"
        
        return BusinessMetric(
            name="Barber Productivity Index",
            value=productivity_index,
            trend=trend,
            health_score=productivity_index,
            impact_level=impact_level,
            recommendation=recommendation
        )
    
    async def get_six_figure_barber_kpis(self) -> List[SixFigureBarberKPI]:
        """Get comprehensive Six Figure Barber methodology KPIs"""
        
        kpis = []
        
        # Revenue Conversion Rate KPI
        revenue_health = await self.get_revenue_pipeline_health()
        kpis.append(SixFigureBarberKPI(
            metric_name="Revenue Conversion Rate",
            current_value=revenue_health.health_score,
            target_value=95.0,
            health_percentage=revenue_health.health_score,
            error_correlation=100 - revenue_health.health_score,
            improvement_actions=[
                "Monitor payment gateway stability",
                "Optimize booking confirmation flow",
                "Implement payment retry logic",
                "Add conversion tracking analytics"
            ]
        ))
        
        # Client Satisfaction Index KPI
        client_experience = await self.get_client_experience_score()
        kpis.append(SixFigureBarberKPI(
            metric_name="Client Satisfaction Index",
            current_value=client_experience.health_score,
            target_value=92.0,
            health_percentage=client_experience.health_score,
            error_correlation=100 - client_experience.health_score,
            improvement_actions=[
                "Reduce page load times",
                "Improve error messaging",
                "Enhance mobile experience",
                "Add proactive user support"
            ]
        ))
        
        # Business Efficiency Score KPI
        productivity = await self.get_barber_productivity_index()
        kpis.append(SixFigureBarberKPI(
            metric_name="Business Efficiency Score",
            current_value=productivity.health_score,
            target_value=90.0,
            health_percentage=productivity.health_score,
            error_correlation=100 - productivity.health_score,
            improvement_actions=[
                "Optimize database queries",
                "Implement caching strategies",
                "Reduce authentication friction",
                "Streamline booking workflows"
            ]
        ))
        
        # System Reliability KPI
        system_reliability = await self._calculate_system_reliability()
        kpis.append(SixFigureBarberKPI(
            metric_name="System Reliability Score", 
            current_value=system_reliability,
            target_value=99.5,
            health_percentage=system_reliability,
            error_correlation=100 - system_reliability,
            improvement_actions=[
                "Implement circuit breakers",
                "Add health check monitoring",
                "Improve error recovery",
                "Enhance system monitoring"
            ]
        ))
        
        return kpis
    
    async def get_error_cost_analysis(self) -> Dict[str, Any]:
        """Calculate business cost of errors"""
        
        # Get all errors from last 24 hours
        all_errors = await error_monitoring_service.get_recent_errors(
            since=datetime.utcnow() - timedelta(days=1)
        )
        
        # Estimate cost impact per error type
        cost_analysis = {
            "revenue_blocking_cost": self._calculate_revenue_blocking_cost(all_errors),
            "user_blocking_cost": self._calculate_user_blocking_cost(all_errors),
            "productivity_cost": self._calculate_productivity_cost(all_errors),
            "support_overhead_cost": self._calculate_support_cost(all_errors),
            "total_estimated_cost": 0,
            "cost_breakdown": [],
            "roi_of_fixes": []
        }
        
        # Calculate total cost
        cost_analysis["total_estimated_cost"] = (
            cost_analysis["revenue_blocking_cost"] +
            cost_analysis["user_blocking_cost"] + 
            cost_analysis["productivity_cost"] +
            cost_analysis["support_overhead_cost"]
        )
        
        return cost_analysis
    
    def _calculate_conversion_impact(self, errors: List[ErrorEvent]) -> float:
        """Calculate conversion impact percentage"""
        if not errors:
            return 0.0
        
        # Weight by severity and business impact
        impact_score = 0
        for error in errors:
            severity_multiplier = {
                ErrorSeverity.CRITICAL: 10,
                ErrorSeverity.HIGH: 5,
                ErrorSeverity.MEDIUM: 2,
                ErrorSeverity.LOW: 1
            }.get(error.severity, 1)
            
            business_multiplier = {
                BusinessImpact.REVENUE_BLOCKING: 10,
                BusinessImpact.USER_BLOCKING: 5,
                BusinessImpact.EXPERIENCE_DEGRADING: 2,
                BusinessImpact.OPERATIONAL: 1,
                BusinessImpact.MONITORING: 0.5
            }.get(error.business_impact, 1)
            
            impact_score += severity_multiplier * business_multiplier
        
        # Convert to percentage (capped at 100%)
        return min(impact_score, 100.0)
    
    def _get_top_error_messages(self, errors: List[ErrorEvent], limit: int) -> List[Dict[str, Any]]:
        """Get top error messages by frequency"""
        error_counts = {}
        for error in errors:
            message = error.message[:100]  # Truncate for grouping
            error_counts[message] = error_counts.get(message, 0) + 1
        
        # Sort by frequency and take top N
        sorted_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {"message": message, "count": count}
            for message, count in sorted_errors[:limit]
        ]
    
    def _calculate_funnel_health(
        self, 
        auth_errors: List[ErrorEvent],
        booking_errors: List[ErrorEvent], 
        payment_errors: List[ErrorEvent]
    ) -> Dict[str, Any]:
        """Calculate overall funnel health"""
        
        total_errors = len(auth_errors) + len(booking_errors) + len(payment_errors)
        
        if total_errors == 0:
            health_score = 100.0
            status = "excellent"
        elif total_errors <= 5:
            health_score = 85.0
            status = "good"
        elif total_errors <= 15:
            health_score = 65.0
            status = "needs_attention"
        else:
            health_score = 30.0
            status = "critical"
        
        return {
            "health_score": health_score,
            "status": status,
            "total_errors": total_errors,
            "error_distribution": {
                "authentication": len(auth_errors),
                "booking": len(booking_errors),
                "payment": len(payment_errors)
            }
        }
    
    def _generate_funnel_recommendations(
        self,
        auth_errors: List[ErrorEvent],
        booking_errors: List[ErrorEvent],
        payment_errors: List[ErrorEvent]
    ) -> List[str]:
        """Generate specific funnel improvement recommendations"""
        
        recommendations = []
        
        if len(auth_errors) > 2:
            recommendations.append("🔐 Optimize authentication flow - high error rate detected")
        
        if len(booking_errors) > 3:
            recommendations.append("📅 Review booking system stability - multiple issues found")
        
        if len(payment_errors) > 1:
            recommendations.append("💳 Critical: Fix payment processing issues immediately")
        
        if not recommendations:
            recommendations.append("✅ Funnel performing well - maintain current monitoring")
        
        return recommendations
    
    async def _calculate_system_reliability(self) -> float:
        """Calculate overall system reliability score"""
        
        # Get all errors from last 24 hours
        all_errors = await error_monitoring_service.get_recent_errors(
            since=datetime.utcnow() - timedelta(days=1)
        )
        
        # Calculate reliability based on error frequency and severity
        critical_errors = [e for e in all_errors if e.severity == ErrorSeverity.CRITICAL]
        high_errors = [e for e in all_errors if e.severity == ErrorSeverity.HIGH]
        
        # Reliability score calculation
        if len(critical_errors) > 0:
            return max(85.0 - (len(critical_errors) * 10), 50.0)
        elif len(high_errors) > 3:
            return max(92.0 - (len(high_errors) * 2), 70.0)
        elif len(all_errors) > 20:
            return max(96.0 - (len(all_errors) * 0.5), 80.0)
        else:
            return 99.5 - (len(all_errors) * 0.5)
    
    def _calculate_revenue_blocking_cost(self, errors: List[ErrorEvent]) -> float:
        """Calculate estimated cost of revenue-blocking errors"""
        revenue_errors = [
            e for e in errors 
            if e.business_impact == BusinessImpact.REVENUE_BLOCKING
        ]
        
        # Estimate: $50 average booking value * 10% conversion impact per error
        return len(revenue_errors) * 50.0 * 0.10
    
    def _calculate_user_blocking_cost(self, errors: List[ErrorEvent]) -> float:
        """Calculate cost of user-blocking errors"""
        user_errors = [
            e for e in errors
            if e.business_impact == BusinessImpact.USER_BLOCKING
        ]
        
        # Estimate: $25 opportunity cost per user-blocking error
        return len(user_errors) * 25.0
    
    def _calculate_productivity_cost(self, errors: List[ErrorEvent]) -> float:
        """Calculate productivity cost from system issues"""
        productivity_categories = [
            ErrorCategory.DATABASE,
            ErrorCategory.PERFORMANCE,
            ErrorCategory.INFRASTRUCTURE
        ]
        
        productivity_errors = [
            e for e in errors
            if e.category in productivity_categories
        ]
        
        # Estimate: $15 productivity loss per error
        return len(productivity_errors) * 15.0
    
    def _calculate_support_cost(self, errors: List[ErrorEvent]) -> float:
        """Calculate support overhead cost"""
        # Estimate: $10 support cost per customer-facing error
        customer_facing_errors = [
            e for e in errors
            if e.business_impact in [
                BusinessImpact.REVENUE_BLOCKING,
                BusinessImpact.USER_BLOCKING,
                BusinessImpact.EXPERIENCE_DEGRADING
            ]
        ]
        
        return len(customer_facing_errors) * 10.0

# Global metrics service instance
six_figure_barber_metrics_service = SixFigureBarberMetricsService()