"""
Analytics Dashboard Service
Provides comprehensive analytics data for the dashboard
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text, case, extract
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, date, timedelta
import json
import logging
from collections import defaultdict

from models.appointment import Appointment
from models.barber import Barber
from models.client import Client
from models.payment import Payment
from models.revenue_analytics import (
    RevenuePattern,
    RevenuePrediction,
    PricingOptimization,
    ClientSegment,
    RevenueInsight,
    PerformanceBenchmark,
)
from services.ai_revenue_analytics_service import AIRevenueAnalyticsService
from services.optimized_analytics_service import OptimizedAnalyticsService

logger = logging.getLogger(__name__)


class AnalyticsDashboardService:
    """Service for providing comprehensive analytics dashboard data"""

    def __init__(self, db: Session):
        self.db = db
        self.ai_service = AIRevenueAnalyticsService(db)
        self.analytics_service = OptimizedAnalyticsService(db)

    def get_executive_dashboard(self, barber_id: int) -> Dict[str, Any]:
        """Get executive-level dashboard with key metrics and insights"""

        # Time periods
        today = date.today()
        current_month_start = today.replace(day=1)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = current_month_start - timedelta(days=1)

        # Get current month metrics
        current_metrics = self.analytics_service.get_dashboard_metrics(
            current_month_start, today, barber_id=barber_id
        )

        # Get last month metrics for comparison
        last_month_metrics = self.analytics_service.get_dashboard_metrics(
            last_month_start, last_month_end, barber_id=barber_id
        )

        # Calculate trends
        revenue_trend = self._calculate_trend(
            current_metrics["revenue"]["total"], last_month_metrics["revenue"]["total"]
        )

        appointment_trend = self._calculate_trend(
            current_metrics["appointments"]["completed"],
            last_month_metrics["appointments"]["completed"],
        )

        # Get AI insights
        top_insights = (
            self.db.query(RevenueInsight)
            .filter(
                and_(
                    RevenueInsight.barber_id == barber_id,
                    RevenueInsight.status == "new",
                    RevenueInsight.valid_until > datetime.now(),
                )
            )
            .order_by(
                RevenueInsight.priority.desc(), RevenueInsight.potential_impact.desc()
            )
            .limit(3)
            .all()
        )

        # Get latest predictions
        predictions = (
            self.db.query(RevenuePrediction)
            .filter(
                and_(
                    RevenuePrediction.barber_id == barber_id,
                    RevenuePrediction.prediction_date >= today,
                    RevenuePrediction.prediction_date <= today + timedelta(days=7),
                )
            )
            .all()
        )

        # Get active goals
        active_goals = (
            self.db.query(RevenueOptimizationGoal)
            .filter(
                and_(
                    RevenueOptimizationGoal.barber_id == barber_id,
                    RevenueOptimizationGoal.status == "active",
                )
            )
            .all()
        )

        return {
            "summary": {
                "current_month_revenue": current_metrics["revenue"]["total"],
                "revenue_trend": revenue_trend,
                "appointments_completed": current_metrics["appointments"]["completed"],
                "appointment_trend": appointment_trend,
                "average_ticket": current_metrics["revenue"]["average_ticket"],
                "client_retention_rate": current_metrics["clients"]["retention_rate"],
                "performance_score": self._calculate_performance_score(barber_id),
            },
            "predictions": {
                "next_7_days_revenue": sum(p.predicted_revenue for p in predictions),
                "confidence_score": (
                    sum(p.confidence_score for p in predictions) / len(predictions)
                    if predictions
                    else 0
                ),
                "daily_predictions": [
                    {
                        "date": p.prediction_date,
                        "revenue": p.predicted_revenue,
                        "appointments": p.predicted_appointments,
                    }
                    for p in predictions
                ],
            },
            "insights": [
                {
                    "title": insight.title,
                    "description": insight.description,
                    "impact": insight.potential_impact,
                    "priority": insight.priority,
                    "actions": insight.recommendations,
                }
                for insight in top_insights
            ],
            "goals": [
                {
                    "name": goal.goal_name,
                    "progress": goal.progress_percentage,
                    "target_date": goal.target_date,
                    "status": self._get_goal_status(goal),
                }
                for goal in active_goals
            ],
            "quick_wins": self._get_quick_wins(barber_id),
        }

    def get_revenue_analytics_dashboard(self, barber_id: int) -> Dict[str, Any]:
        """Get detailed revenue analytics dashboard"""

        # Time periods
        today = date.today()
        last_30_days = today - timedelta(days=30)
        last_90_days = today - timedelta(days=90)

        # Revenue trends
        daily_trends = self.analytics_service.get_revenue_trends(
            last_30_days, today, barber_id=barber_id, grouping="daily"
        )

        # Revenue patterns
        patterns = (
            self.db.query(RevenuePattern)
            .filter(RevenuePattern.barber_id == barber_id)
            .order_by(RevenuePattern.confidence_score.desc())
            .limit(5)
            .all()
        )

        # Service performance
        service_analytics = self.analytics_service.get_service_analytics(
            last_30_days, today, barber_id=barber_id
        )

        # Peak hours analysis
        peak_hours = self.analytics_service.get_peak_hours_heatmap(
            last_30_days, today, barber_id=barber_id
        )

        # Pricing optimizations
        pricing_recommendations = (
            self.db.query(PricingOptimization)
            .filter(
                and_(
                    PricingOptimization.barber_id == barber_id,
                    PricingOptimization.status == "pending",
                    PricingOptimization.expires_at > datetime.now(),
                )
            )
            .order_by(PricingOptimization.expected_revenue_change.desc())
            .limit(5)
            .all()
        )

        return {
            "revenue_overview": {
                "total_30_days": sum(d["revenue"] for d in daily_trends),
                "daily_average": (
                    sum(d["revenue"] for d in daily_trends) / len(daily_trends)
                    if daily_trends
                    else 0
                ),
                "best_day": (
                    max(daily_trends, key=lambda x: x["revenue"])
                    if daily_trends
                    else None
                ),
                "worst_day": (
                    min(daily_trends, key=lambda x: x["revenue"])
                    if daily_trends
                    else None
                ),
            },
            "trends": {
                "daily": daily_trends,
                "patterns": [
                    {
                        "type": p.pattern_type,
                        "name": p.pattern_name,
                        "impact": p.avg_revenue_impact,
                        "confidence": p.confidence_score,
                        "details": p.pattern_data,
                    }
                    for p in patterns
                ],
            },
            "service_performance": service_analytics[:10],
            "peak_hours_analysis": self._format_peak_hours(peak_hours),
            "pricing_opportunities": [
                {
                    "service": p.service_name,
                    "current_price": p.current_price,
                    "recommended_price": p.recommended_price,
                    "expected_impact": p.expected_revenue_change,
                    "reason": p.recommendation_reason,
                }
                for p in pricing_recommendations
            ],
            "revenue_breakdown": self._get_revenue_breakdown(
                barber_id, last_30_days, today
            ),
        }

    def get_client_analytics_dashboard(self, barber_id: int) -> Dict[str, Any]:
        """Get detailed client analytics dashboard"""

        # Time periods
        today = date.today()
        last_30_days = today - timedelta(days=30)
        last_90_days = today - timedelta(days=90)

        # Client segments
        segments = (
            self.db.query(ClientSegment)
            .filter(ClientSegment.barber_id == barber_id)
            .all()
        )

        # Retention metrics
        retention_metrics = self.analytics_service.get_client_retention_metrics(
            last_30_days, today, barber_id=barber_id
        )

        # Client lifetime values
        client_values = self._calculate_client_lifetime_values(barber_id)

        # At-risk clients
        at_risk_clients = self._identify_at_risk_clients(barber_id)

        # New vs returning analysis
        new_vs_returning = self._analyze_new_vs_returning(
            barber_id, last_30_days, today
        )

        return {
            "overview": {
                "total_active_clients": retention_metrics["current_period_clients"],
                "new_clients_30_days": retention_metrics["new_clients"],
                "retention_rate": retention_metrics["retention_rate"],
                "avg_lifetime_value": client_values["average_ltv"],
                "total_client_value": client_values["total_value"],
            },
            "segments": [
                {
                    "name": s.segment_name,
                    "size": s.size,
                    "avg_value": s.avg_lifetime_value,
                    "visit_frequency": s.avg_visit_frequency,
                    "revenue_contribution": s.revenue_contribution,
                    "strategies": (
                        json.loads(s.recommended_promotions)
                        if s.recommended_promotions
                        else []
                    ),
                }
                for s in segments
            ],
            "retention_analysis": {
                "monthly_retention": retention_metrics,
                "churn_risk": {
                    "high_risk_count": len(
                        [c for c in at_risk_clients if c["risk_score"] > 0.7]
                    ),
                    "medium_risk_count": len(
                        [c for c in at_risk_clients if 0.3 < c["risk_score"] <= 0.7]
                    ),
                    "total_at_risk_value": sum(
                        c["lifetime_value"] for c in at_risk_clients
                    ),
                },
            },
            "acquisition": new_vs_returning,
            "top_clients": client_values["top_clients"][:10],
            "engagement_opportunities": self._get_client_engagement_opportunities(
                barber_id
            ),
        }

    def get_performance_dashboard(self, barber_id: int) -> Dict[str, Any]:
        """Get performance analytics and benchmarking dashboard"""

        # Get latest benchmark
        latest_benchmark = (
            self.db.query(PerformanceBenchmark)
            .filter(PerformanceBenchmark.barber_id == barber_id)
            .order_by(PerformanceBenchmark.created_at.desc())
            .first()
        )

        if not latest_benchmark:
            # Generate new benchmark
            latest_benchmark = self.ai_service.benchmark_performance(barber_id)

        # Historical performance
        historical_performance = self._get_historical_performance(barber_id)

        # Efficiency metrics
        efficiency_metrics = self._calculate_efficiency_metrics(barber_id)

        # Growth analysis
        growth_analysis = self._analyze_growth_metrics(barber_id)

        return {
            "benchmark": {
                "revenue_percentile": latest_benchmark.revenue_percentile,
                "efficiency_percentile": latest_benchmark.efficiency_percentile,
                "growth_percentile": latest_benchmark.growth_percentile,
                "retention_percentile": latest_benchmark.retention_percentile,
                "peer_comparison": {
                    "your_revenue": latest_benchmark.total_revenue,
                    "peer_avg_revenue": latest_benchmark.peer_avg_revenue,
                    "your_appointments": latest_benchmark.total_appointments,
                    "peer_avg_appointments": latest_benchmark.peer_avg_appointments,
                },
                "improvement_areas": (
                    json.loads(latest_benchmark.improvement_areas)
                    if latest_benchmark.improvement_areas
                    else []
                ),
            },
            "efficiency": efficiency_metrics,
            "growth": growth_analysis,
            "historical_trends": historical_performance,
            "productivity_score": self._calculate_productivity_score(
                efficiency_metrics
            ),
            "recommendations": self._generate_performance_recommendations(
                latest_benchmark, efficiency_metrics
            ),
        }

    def get_optimization_dashboard(self, barber_id: int) -> Dict[str, Any]:
        """Get optimization opportunities and recommendations dashboard"""

        # Active optimizations
        active_optimizations = {
            "pricing": self._get_active_pricing_optimizations(barber_id),
            "scheduling": self._get_scheduling_optimizations(barber_id),
            "service_mix": self._get_service_mix_optimizations(barber_id),
            "client_targeting": self._get_client_targeting_optimizations(barber_id),
        }

        # Implementation tracking
        implemented = self._track_implemented_optimizations(barber_id)

        # ROI analysis
        roi_analysis = self._calculate_optimization_roi(barber_id)

        # Next best actions
        next_actions = self._prioritize_next_actions(barber_id)

        return {
            "active_opportunities": active_optimizations,
            "implementation_status": {
                "total_implemented": implemented["count"],
                "success_rate": implemented["success_rate"],
                "total_impact": implemented["total_impact"],
                "recent_wins": implemented["recent_wins"],
            },
            "roi_analysis": roi_analysis,
            "next_best_actions": next_actions,
            "optimization_score": self._calculate_optimization_score(
                active_optimizations, implemented
            ),
        }

    # Helper methods
    def _calculate_trend(self, current: float, previous: float) -> Dict[str, Any]:
        """Calculate trend between two values"""
        if previous == 0:
            return {"value": 0, "direction": "stable", "percentage": 0}

        change = ((current - previous) / previous) * 100
        direction = "up" if change > 0 else "down" if change < 0 else "stable"

        return {"value": change, "direction": direction, "percentage": abs(change)}

    def _calculate_performance_score(self, barber_id: int) -> float:
        """Calculate overall performance score"""
        # Get latest benchmark
        benchmark = (
            self.db.query(PerformanceBenchmark)
            .filter(PerformanceBenchmark.barber_id == barber_id)
            .order_by(PerformanceBenchmark.created_at.desc())
            .first()
        )

        if not benchmark:
            return 50.0  # Default middle score

        # Weighted average of percentiles
        weights = {"revenue": 0.3, "efficiency": 0.25, "growth": 0.25, "retention": 0.2}

        score = (
            benchmark.revenue_percentile * weights["revenue"]
            + benchmark.efficiency_percentile * weights["efficiency"]
            + benchmark.growth_percentile * weights["growth"]
            + benchmark.retention_percentile * weights["retention"]
        )

        return round(score, 1)

    def _get_goal_status(self, goal) -> str:
        """Determine goal status based on progress and timeline"""
        days_remaining = (goal.target_date - date.today()).days
        progress_needed = 100 - goal.progress_percentage

        if goal.progress_percentage >= 100:
            return "completed"
        elif days_remaining <= 0:
            return "overdue"
        elif progress_needed / days_remaining > 5:  # Need more than 5% progress per day
            return "at_risk"
        else:
            return "on_track"

    def _get_quick_wins(self, barber_id: int) -> List[Dict[str, Any]]:
        """Identify quick win opportunities"""
        quick_wins = []

        # Check for easy pricing optimizations
        easy_pricing = (
            self.db.query(PricingOptimization)
            .filter(
                and_(
                    PricingOptimization.barber_id == barber_id,
                    PricingOptimization.status == "pending",
                    PricingOptimization.confidence_score > 0.8,
                    PricingOptimization.expected_revenue_change > 5,
                )
            )
            .first()
        )

        if easy_pricing:
            quick_wins.append(
                {
                    "type": "pricing",
                    "action": f"Adjust {easy_pricing.service_name} price to ${easy_pricing.recommended_price}",
                    "impact": f"+${easy_pricing.expected_revenue_change:.0f}/month",
                    "effort": "low",
                }
            )

        # Check for scheduling gaps
        today = date.today()
        recent_utilization = self._calculate_recent_utilization(barber_id)
        if recent_utilization < 0.7:
            quick_wins.append(
                {
                    "type": "scheduling",
                    "action": "Enable online booking for last-minute appointments",
                    "impact": f"+{(0.8 - recent_utilization) * 100:.0f}% capacity utilization",
                    "effort": "low",
                }
            )

        # Check for client re-engagement
        inactive_vips = self._get_inactive_vip_clients(barber_id)
        if inactive_vips:
            quick_wins.append(
                {
                    "type": "retention",
                    "action": f"Send win-back offers to {len(inactive_vips)} high-value inactive clients",
                    "impact": f"+${sum(c['lifetime_value'] for c in inactive_vips) * 0.3:.0f} potential",
                    "effort": "low",
                }
            )

        return quick_wins[:3]  # Top 3 quick wins

    def _format_peak_hours(self, peak_hours: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format peak hours data for dashboard"""
        # Create heatmap structure
        heatmap = defaultdict(dict)

        for slot in peak_hours:
            heatmap[slot["day"]][slot["hour"]] = {
                "bookings": slot["bookings"],
                "completion_rate": slot["completion_rate"],
            }

        # Find best and worst times
        sorted_slots = sorted(peak_hours, key=lambda x: x["bookings"], reverse=True)

        return {
            "heatmap": dict(heatmap),
            "best_times": sorted_slots[:5],
            "worst_times": sorted_slots[-5:],
            "recommendations": self._generate_scheduling_recommendations(peak_hours),
        }

    def _generate_scheduling_recommendations(
        self, peak_hours: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on peak hours analysis"""
        recommendations = []

        # Find underutilized premium times
        premium_hours = [
            slot
            for slot in peak_hours
            if 9 <= slot["hour"] <= 18 and slot["bookings"] < 5
        ]
        if premium_hours:
            recommendations.append(
                f"Increase marketing for {len(premium_hours)} underutilized prime-time slots"
            )

        # Find overbooked times
        overbooked = [slot for slot in peak_hours if slot["bookings"] > 10]
        if overbooked:
            recommendations.append(
                f"Consider premium pricing for {len(overbooked)} high-demand time slots"
            )

        return recommendations

    def _get_revenue_breakdown(
        self, barber_id: int, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Get detailed revenue breakdown"""

        breakdown = (
            self.db.query(
                func.sum(Appointment.service_revenue).label("services"),
                func.sum(Appointment.tip_amount).label("tips"),
                func.sum(Appointment.product_revenue).label("products"),
                func.count(case((Appointment.customer_type == "new", 1))).label(
                    "new_clients"
                ),
                func.count(case((Appointment.customer_type == "returning", 1))).label(
                    "returning_clients"
                ),
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == "completed",
                )
            )
            .first()
        )

        total = (
            (breakdown.services or 0)
            + (breakdown.tips or 0)
            + (breakdown.products or 0)
        )

        return {
            "by_type": {
                "services": breakdown.services or 0,
                "tips": breakdown.tips or 0,
                "products": breakdown.products or 0,
            },
            "by_client_type": {
                "new": (breakdown.new_clients or 0)
                * (
                    total
                    / (
                        (breakdown.new_clients or 0)
                        + (breakdown.returning_clients or 1)
                    )
                ),
                "returning": (breakdown.returning_clients or 0)
                * (
                    total
                    / (
                        (breakdown.new_clients or 0)
                        + (breakdown.returning_clients or 1)
                    )
                ),
            },
            "percentages": {
                "services": (breakdown.services or 0) / total * 100 if total > 0 else 0,
                "tips": (breakdown.tips or 0) / total * 100 if total > 0 else 0,
                "products": (breakdown.products or 0) / total * 100 if total > 0 else 0,
            },
        }

    def _calculate_client_lifetime_values(self, barber_id: int) -> Dict[str, Any]:
        """Calculate client lifetime values"""

        # Get all clients with their transaction history
        clients = (
            self.db.query(
                Client.id,
                Client.full_name,
                func.count(Appointment.id).label("total_visits"),
                func.sum(
                    func.coalesce(Appointment.service_revenue, 0)
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("total_revenue"),
                func.min(Appointment.appointment_date).label("first_visit"),
                func.max(Appointment.appointment_date).label("last_visit"),
            )
            .join(Appointment, Appointment.client_id == Client.id)
            .filter(
                and_(Client.barber_id == barber_id, Appointment.status == "completed")
            )
            .group_by(Client.id, Client.full_name)
            .all()
        )

        client_values = []
        total_value = 0

        for client in clients:
            # Simple CLV calculation
            months_active = max(1, (client.last_visit - client.first_visit).days / 30)
            monthly_value = client.total_revenue / months_active
            estimated_ltv = monthly_value * 24  # 2-year projection

            client_values.append(
                {
                    "id": client.id,
                    "name": client.full_name,
                    "lifetime_value": estimated_ltv,
                    "total_visits": client.total_visits,
                    "avg_transaction": (
                        client.total_revenue / client.total_visits
                        if client.total_visits > 0
                        else 0
                    ),
                    "months_active": months_active,
                }
            )

            total_value += estimated_ltv

        # Sort by LTV
        client_values.sort(key=lambda x: x["lifetime_value"], reverse=True)

        return {
            "top_clients": client_values,
            "average_ltv": total_value / len(client_values) if client_values else 0,
            "total_value": total_value,
        }

    def _identify_at_risk_clients(self, barber_id: int) -> List[Dict[str, Any]]:
        """Identify clients at risk of churning"""

        # Get clients who haven't visited recently
        thirty_days_ago = date.today() - timedelta(days=30)
        sixty_days_ago = date.today() - timedelta(days=60)

        at_risk = (
            self.db.query(
                Client.id,
                Client.full_name,
                func.max(Appointment.appointment_date).label("last_visit"),
                func.count(Appointment.id).label("total_visits"),
                func.sum(
                    func.coalesce(Appointment.service_revenue, 0)
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("lifetime_value"),
            )
            .join(Appointment, Appointment.client_id == Client.id)
            .filter(
                and_(Client.barber_id == barber_id, Appointment.status == "completed")
            )
            .group_by(Client.id, Client.full_name)
            .having(func.max(Appointment.appointment_date) < thirty_days_ago)
            .all()
        )

        at_risk_list = []

        for client in at_risk:
            days_since_visit = (date.today() - client.last_visit).days

            # Calculate risk score
            if days_since_visit > 90:
                risk_score = 0.9
            elif days_since_visit > 60:
                risk_score = 0.7
            else:
                risk_score = 0.5

            # Adjust based on visit frequency
            if client.total_visits > 10:
                risk_score *= 0.8  # Loyal clients less likely to churn

            at_risk_list.append(
                {
                    "id": client.id,
                    "name": client.full_name,
                    "last_visit": client.last_visit,
                    "days_since_visit": days_since_visit,
                    "total_visits": client.total_visits,
                    "lifetime_value": client.lifetime_value,
                    "risk_score": risk_score,
                }
            )

        return sorted(
            at_risk_list,
            key=lambda x: x["risk_score"] * x["lifetime_value"],
            reverse=True,
        )

    def _analyze_new_vs_returning(
        self, barber_id: int, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Analyze new vs returning client metrics"""

        data = (
            self.db.query(
                Appointment.customer_type,
                func.count(Appointment.id).label("count"),
                func.sum(
                    func.coalesce(Appointment.service_revenue, 0)
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("revenue"),
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == "completed",
                )
            )
            .group_by(Appointment.customer_type)
            .all()
        )

        result = {
            "new": {"count": 0, "revenue": 0},
            "returning": {"count": 0, "revenue": 0},
        }

        for row in data:
            if row.customer_type == "new":
                result["new"] = {"count": row.count, "revenue": row.revenue or 0}
            else:
                result["returning"] = {"count": row.count, "revenue": row.revenue or 0}

        total_count = result["new"]["count"] + result["returning"]["count"]
        total_revenue = result["new"]["revenue"] + result["returning"]["revenue"]

        return {
            "counts": result,
            "percentages": {
                "new": (
                    (result["new"]["count"] / total_count * 100)
                    if total_count > 0
                    else 0
                ),
                "returning": (
                    (result["returning"]["count"] / total_count * 100)
                    if total_count > 0
                    else 0
                ),
            },
            "avg_values": {
                "new": (
                    result["new"]["revenue"] / result["new"]["count"]
                    if result["new"]["count"] > 0
                    else 0
                ),
                "returning": (
                    result["returning"]["revenue"] / result["returning"]["count"]
                    if result["returning"]["count"] > 0
                    else 0
                ),
            },
            "revenue_split": {
                "new": (
                    (result["new"]["revenue"] / total_revenue * 100)
                    if total_revenue > 0
                    else 0
                ),
                "returning": (
                    (result["returning"]["revenue"] / total_revenue * 100)
                    if total_revenue > 0
                    else 0
                ),
            },
        }

    def _get_client_engagement_opportunities(
        self, barber_id: int
    ) -> List[Dict[str, Any]]:
        """Identify client engagement opportunities"""
        opportunities = []

        # Birthday campaigns
        upcoming_birthdays = self._get_upcoming_birthdays(barber_id)
        if upcoming_birthdays:
            opportunities.append(
                {
                    "type": "birthday",
                    "title": f"{len(upcoming_birthdays)} clients with birthdays this month",
                    "action": "Send personalized birthday offers",
                    "potential_value": len(upcoming_birthdays)
                    * 75,  # Assume $75 avg birthday visit
                }
            )

        # Service anniversaries
        service_anniversaries = self._get_service_anniversaries(barber_id)
        if service_anniversaries:
            opportunities.append(
                {
                    "type": "anniversary",
                    "title": f"{len(service_anniversaries)} clients celebrating 1-year anniversary",
                    "action": "Send thank you messages with exclusive offers",
                    "potential_value": len(service_anniversaries) * 100,
                }
            )

        # Seasonal campaigns
        seasonal = self._get_seasonal_opportunities(barber_id)
        opportunities.extend(seasonal)

        return opportunities

    def _calculate_efficiency_metrics(self, barber_id: int) -> Dict[str, Any]:
        """Calculate detailed efficiency metrics"""

        last_30_days = date.today() - timedelta(days=30)

        # Get appointment data
        appointments = (
            self.db.query(
                Appointment.appointment_date,
                Appointment.appointment_time,
                Appointment.duration_minutes,
                Appointment.status,
                func.coalesce(Appointment.service_revenue, 0)
                + func.coalesce(Appointment.tip_amount, 0)
                + func.coalesce(Appointment.product_revenue, 0).label("revenue"),
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= last_30_days,
                )
            )
            .all()
        )

        # Calculate metrics
        total_available_hours = 8 * 22  # 8 hours/day, 22 working days
        total_booked_hours = sum(
            a.duration_minutes / 60 for a in appointments if a.status == "completed"
        )
        total_revenue = sum(a.revenue for a in appointments if a.status == "completed")

        return {
            "utilization_rate": (
                (total_booked_hours / total_available_hours * 100)
                if total_available_hours > 0
                else 0
            ),
            "revenue_per_hour": (
                total_revenue / total_booked_hours if total_booked_hours > 0 else 0
            ),
            "average_appointment_duration": (
                sum(a.duration_minutes for a in appointments if a.status == "completed")
                / len([a for a in appointments if a.status == "completed"])
                if appointments
                else 60
            ),
            "no_show_rate": (
                len([a for a in appointments if a.status == "no_show"])
                / len(appointments)
                * 100
                if appointments
                else 0
            ),
            "total_productive_hours": total_booked_hours,
            "revenue_per_appointment": (
                total_revenue
                / len([a for a in appointments if a.status == "completed"])
                if appointments
                else 0
            ),
        }

    # Additional helper methods would continue here...
