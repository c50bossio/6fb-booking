"""
Production Error Monitoring Dashboard for BookedBarber V2
Real-time business intelligence for error tracking and revenue impact
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
import json

from services.error_monitoring_service import ErrorMonitoringService, ErrorEvent, BusinessImpact
from services.business_impact_monitor import business_impact_monitor, RevenueImpact
from utils.logger import get_logger

logger = get_logger(__name__)

class DashboardTimeRange(Enum):
    """Time range options for dashboard metrics"""
    LAST_HOUR = "1h"
    LAST_4_HOURS = "4h"
    LAST_24_HOURS = "24h"
    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"

@dataclass
class ErrorMetrics:
    """Core error metrics for dashboard display"""
    total_errors: int
    critical_errors: int
    revenue_blocking_errors: int
    user_blocking_errors: int
    total_revenue_impact: float
    affected_users: int
    average_resolution_time: int  # minutes
    error_rate: float  # errors per minute
    
    @property
    def health_score(self) -> float:
        """Calculate overall system health score (0-100)"""
        if self.total_errors == 0:
            return 100.0
            
        # Weighted scoring based on business impact
        critical_penalty = self.critical_errors * 10
        revenue_penalty = min(self.total_revenue_impact / 10, 50)  # Cap at 50 points
        user_penalty = min(self.affected_users * 2, 30)  # Cap at 30 points
        
        total_penalty = critical_penalty + revenue_penalty + user_penalty
        return max(0.0, 100.0 - total_penalty)

@dataclass
class ErrorTrend:
    """Error trend data for time series visualization"""
    timestamp: datetime
    error_count: int
    revenue_impact: float
    health_score: float

class ProductionErrorDashboard:
    """Production-grade error monitoring dashboard with business intelligence"""
    
    def __init__(self):
        self.error_monitoring = ErrorMonitoringService()
        self.time_ranges = {
            DashboardTimeRange.LAST_HOUR: timedelta(hours=1),
            DashboardTimeRange.LAST_4_HOURS: timedelta(hours=4),
            DashboardTimeRange.LAST_24_HOURS: timedelta(hours=24),
            DashboardTimeRange.LAST_7_DAYS: timedelta(days=7),
            DashboardTimeRange.LAST_30_DAYS: timedelta(days=30),
        }
    
    async def get_dashboard_metrics(self, time_range: DashboardTimeRange = DashboardTimeRange.LAST_24_HOURS) -> Dict[str, Any]:
        """Get comprehensive dashboard metrics for production monitoring"""
        try:
            end_time = datetime.utcnow()
            start_time = end_time - self.time_ranges[time_range]
            
            # Get error events in time range
            errors = await self._get_errors_in_range(start_time, end_time)
            
            # Calculate core metrics
            metrics = await self._calculate_metrics(errors, time_range)
            
            # Get error trends for visualization
            trends = await self._calculate_error_trends(start_time, end_time)
            
            # Get top error categories
            categories = await self._analyze_error_categories(errors)
            
            # Get integration health status
            integration_health = await self._get_integration_health()
            
            # Get revenue impact analysis
            revenue_analysis = await self._get_revenue_impact_analysis(errors)
            
            dashboard_data = {
                "generated_at": datetime.utcnow().isoformat(),
                "time_range": time_range.value,
                "metrics": asdict(metrics),
                "trends": [asdict(trend) for trend in trends],
                "error_categories": categories,
                "integration_health": integration_health,
                "revenue_analysis": revenue_analysis,
                "alerts": await self._get_active_alerts(),
                "recommendations": await self._generate_recommendations(metrics, errors)
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Failed to generate dashboard metrics: {str(e)}")
            return {"error": "Failed to generate dashboard metrics"}
    
    async def _get_errors_in_range(self, start_time: datetime, end_time: datetime) -> List[ErrorEvent]:
        """Get all error events in specified time range"""
        # This would integrate with your error storage system
        # For now, return mock data structure
        return []
    
    async def _calculate_metrics(self, errors: List[ErrorEvent], time_range: DashboardTimeRange) -> ErrorMetrics:
        """Calculate core dashboard metrics from error events"""
        try:
            total_errors = len(errors)
            critical_errors = len([e for e in errors if e.business_impact == BusinessImpact.REVENUE_BLOCKING])
            revenue_blocking = len([e for e in errors if e.business_impact == BusinessImpact.REVENUE_BLOCKING])
            user_blocking = len([e for e in errors if e.business_impact == BusinessImpact.USER_BLOCKING])
            
            # Calculate revenue impact
            total_revenue_impact = 0.0
            affected_users = set()
            resolution_times = []
            
            for error in errors:
                impact = await business_impact_monitor.calculate_revenue_impact(error)
                total_revenue_impact += impact.total_impact
                affected_users.update(error.context.get('user_ids', []))
                
                if error.resolved_at:
                    resolution_time = (error.resolved_at - error.timestamp).total_seconds() / 60
                    resolution_times.append(resolution_time)
            
            # Calculate error rate based on time range
            time_delta = self.time_ranges[time_range]
            error_rate = total_errors / (time_delta.total_seconds() / 60) if time_delta.total_seconds() > 0 else 0
            
            avg_resolution_time = int(sum(resolution_times) / len(resolution_times)) if resolution_times else 0
            
            return ErrorMetrics(
                total_errors=total_errors,
                critical_errors=critical_errors,
                revenue_blocking_errors=revenue_blocking,
                user_blocking_errors=user_blocking,
                total_revenue_impact=total_revenue_impact,
                affected_users=len(affected_users),
                average_resolution_time=avg_resolution_time,
                error_rate=error_rate
            )
            
        except Exception as e:
            logger.error(f"Failed to calculate metrics: {str(e)}")
            return ErrorMetrics(0, 0, 0, 0, 0.0, 0, 0, 0.0)
    
    async def _calculate_error_trends(self, start_time: datetime, end_time: datetime) -> List[ErrorTrend]:
        """Calculate error trends for time series visualization"""
        trends = []
        
        # Create hourly buckets for trend analysis
        current_time = start_time
        bucket_size = timedelta(hours=1)
        
        while current_time < end_time:
            bucket_end = min(current_time + bucket_size, end_time)
            
            # Get errors in this time bucket
            bucket_errors = await self._get_errors_in_range(current_time, bucket_end)
            
            # Calculate metrics for this bucket
            bucket_metrics = await self._calculate_metrics(bucket_errors, DashboardTimeRange.LAST_HOUR)
            
            trend = ErrorTrend(
                timestamp=current_time,
                error_count=bucket_metrics.total_errors,
                revenue_impact=bucket_metrics.total_revenue_impact,
                health_score=bucket_metrics.health_score
            )
            
            trends.append(trend)
            current_time = bucket_end
        
        return trends
    
    async def _analyze_error_categories(self, errors: List[ErrorEvent]) -> Dict[str, Any]:
        """Analyze error distribution by category"""
        categories = {}
        
        for error in errors:
            category = error.category.value
            if category not in categories:
                categories[category] = {
                    "count": 0,
                    "revenue_impact": 0.0,
                    "users_affected": set(),
                    "average_resolution_time": 0,
                    "resolution_times": []
                }
            
            categories[category]["count"] += 1
            
            # Calculate revenue impact
            impact = await business_impact_monitor.calculate_revenue_impact(error)
            categories[category]["revenue_impact"] += impact.total_impact
            categories[category]["users_affected"].update(error.context.get('user_ids', []))
            
            # Track resolution times
            if error.resolved_at:
                resolution_time = (error.resolved_at - error.timestamp).total_seconds() / 60
                categories[category]["resolution_times"].append(resolution_time)
        
        # Convert to serializable format
        for category in categories:
            cat_data = categories[category]
            cat_data["users_affected"] = len(cat_data["users_affected"])
            if cat_data["resolution_times"]:
                cat_data["average_resolution_time"] = int(sum(cat_data["resolution_times"]) / len(cat_data["resolution_times"]))
            del cat_data["resolution_times"]
        
        return categories
    
    async def _get_integration_health(self) -> Dict[str, Any]:
        """Get health status of external integrations"""
        integrations = {
            "stripe": {"status": "healthy", "last_error": None, "error_rate": 0.0},
            "sendgrid": {"status": "healthy", "last_error": None, "error_rate": 0.0},
            "google_calendar": {"status": "healthy", "last_error": None, "error_rate": 0.0},
            "twilio": {"status": "healthy", "last_error": None, "error_rate": 0.0},
            "database": {"status": "healthy", "last_error": None, "error_rate": 0.0}
        }
        
        # This would integrate with your circuit breaker system
        # to get real integration health status
        
        return integrations
    
    async def _get_revenue_impact_analysis(self, errors: List[ErrorEvent]) -> Dict[str, Any]:
        """Analyze revenue impact patterns"""
        analysis = {
            "total_impact": 0.0,
            "booking_revenue_loss": 0.0,
            "payment_revenue_loss": 0.0,
            "high_impact_errors": [],
            "impact_by_hour": {},
            "recovery_analysis": {
                "average_time": 0,
                "fastest_recovery": 0,
                "slowest_recovery": 0
            }
        }
        
        recovery_times = []
        
        for error in errors:
            impact = await business_impact_monitor.calculate_revenue_impact(error)
            analysis["total_impact"] += impact.total_impact
            analysis["booking_revenue_loss"] += impact.booking_loss
            analysis["payment_revenue_loss"] += impact.payment_loss
            
            # Track high impact errors
            if impact.is_critical:
                analysis["high_impact_errors"].append({
                    "error_id": error.id,
                    "category": error.category.value,
                    "impact": impact.total_impact,
                    "users_affected": impact.affected_users,
                    "timestamp": error.timestamp.isoformat()
                })
            
            # Track recovery times
            if error.resolved_at:
                recovery_time = (error.resolved_at - error.timestamp).total_seconds() / 60
                recovery_times.append(recovery_time)
        
        # Calculate recovery analysis
        if recovery_times:
            analysis["recovery_analysis"]["average_time"] = int(sum(recovery_times) / len(recovery_times))
            analysis["recovery_analysis"]["fastest_recovery"] = int(min(recovery_times))
            analysis["recovery_analysis"]["slowest_recovery"] = int(max(recovery_times))
        
        return analysis
    
    async def _get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get currently active alerts"""
        # This would integrate with your alerting system
        return []
    
    async def _generate_recommendations(self, metrics: ErrorMetrics, errors: List[ErrorEvent]) -> List[Dict[str, str]]:
        """Generate actionable recommendations based on error patterns"""
        recommendations = []
        
        # Health score recommendations
        if metrics.health_score < 90:
            recommendations.append({
                "priority": "high",
                "category": "system_health",
                "title": "System Health Below Optimal",
                "description": f"Current health score is {metrics.health_score:.1f}%. Investigate critical errors immediately.",
                "action": "Review critical error logs and implement fixes"
            })
        
        # Revenue impact recommendations
        if metrics.total_revenue_impact > 50:
            recommendations.append({
                "priority": "critical",
                "category": "revenue",
                "title": "Significant Revenue Impact Detected",
                "description": f"${metrics.total_revenue_impact:.2f} in potential revenue loss detected.",
                "action": "Prioritize payment and booking system error resolution"
            })
        
        # Error rate recommendations
        if metrics.error_rate > 1.0:  # More than 1 error per minute
            recommendations.append({
                "priority": "medium",
                "category": "performance",
                "title": "High Error Rate Detected",
                "description": f"Current error rate: {metrics.error_rate:.2f} errors/minute",
                "action": "Investigate error patterns and implement preventive measures"
            })
        
        # Resolution time recommendations
        if metrics.average_resolution_time > 30:  # More than 30 minutes
            recommendations.append({
                "priority": "medium",
                "category": "operations",
                "title": "Slow Error Resolution",
                "description": f"Average resolution time: {metrics.average_resolution_time} minutes",
                "action": "Review incident response procedures and automation opportunities"
            })
        
        return recommendations
    
    async def export_error_report(self, time_range: DashboardTimeRange = DashboardTimeRange.LAST_24_HOURS) -> Dict[str, Any]:
        """Export comprehensive error report for stakeholders"""
        dashboard_data = await self.get_dashboard_metrics(time_range)
        
        # Add executive summary
        dashboard_data["executive_summary"] = {
            "system_health": dashboard_data["metrics"]["health_score"],
            "revenue_impact": dashboard_data["metrics"]["total_revenue_impact"],
            "critical_issues": dashboard_data["metrics"]["critical_errors"],
            "users_affected": dashboard_data["metrics"]["affected_users"],
            "status": "critical" if dashboard_data["metrics"]["health_score"] < 80 else 
                     "warning" if dashboard_data["metrics"]["health_score"] < 95 else "healthy"
        }
        
        return dashboard_data

# Global dashboard instance for production use
production_dashboard = ProductionErrorDashboard()