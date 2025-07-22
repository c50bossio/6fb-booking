"""
Six Figure Barber Analytics Service

Implements comprehensive analytics aligned with Six Figure Barber methodology.
Provides real-time metrics, progress tracking, and actionable insights for reaching 
six-figure annual revenue goals.
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract, desc
import logging
from decimal import Decimal, ROUND_HALF_UP

from models import User, Client, Service, Appointment, Payment
from services.client_tier_service import ClientTierService

logger = logging.getLogger(__name__)

class SixFigureAnalyticsService:
    """
    Six Figure Barber Analytics Service
    
    Provides comprehensive analytics and recommendations based on the 
    Six Figure Barber methodology for revenue optimization and business growth.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.client_tier_service = ClientTierService(db)
    
    def calculate_six_figure_metrics(
        self, 
        user_id: int, 
        target_annual_income: float = 100000.0,
        analysis_period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive Six Figure Barber metrics and recommendations
        
        Args:
            user_id: Barber's user ID
            target_annual_income: Annual revenue goal
            analysis_period_days: Days of historical data to analyze
            
        Returns:
            Comprehensive metrics dict aligned with Six Figure methodology
        """
        try:
            # Get current performance metrics
            current_performance = self._calculate_current_performance(user_id, analysis_period_days)
            
            # Calculate targets based on Six Figure methodology
            targets = self._calculate_six_figure_targets(target_annual_income, current_performance)
            
            # Generate optimization recommendations
            recommendations = self._generate_recommendations(current_performance, targets)
            
            # Create action items for goal achievement
            action_items = self._generate_action_items(current_performance, targets, recommendations)
            
            return {
                "current_performance": current_performance,
                "targets": targets,
                "recommendations": recommendations,
                "action_items": action_items,
                "progress_tracking": self._calculate_progress_tracking(current_performance, targets),
                "generated_at": datetime.utcnow().isoformat(),
                "status": "success",
                "methodology_version": "2025.1"
            }
            
        except Exception as e:
            logger.error(f"Error calculating Six Figure metrics for user {user_id}: {e}")
            return self._get_fallback_metrics(target_annual_income)
    
    def _calculate_current_performance(self, user_id: int, days: int) -> Dict[str, Any]:
        """Calculate current performance metrics from actual data"""
        
        # Date range for analysis
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get appointments and payments for the period
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == user_id,
                Appointment.start_time >= start_date,
                Appointment.start_time <= end_date,
                Appointment.status.in_(['completed', 'confirmed'])
            )
        ).all()
        
        payments = self.db.query(Payment).filter(
            and_(
                Payment.barber_id == user_id,
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
                Payment.status == 'completed'
            )
        ).all()
        
        # Calculate revenue metrics
        total_revenue = sum(Decimal(str(p.amount)) for p in payments)
        total_appointments = len(appointments)
        
        # Calculate averages
        average_ticket = float(total_revenue / total_appointments) if total_appointments > 0 else 0.0
        monthly_revenue = float(total_revenue * (30 / days)) if days > 0 else 0.0
        annual_projection = monthly_revenue * 12
        
        # Calculate client metrics
        client_ids = list(set(a.client_id for a in appointments if a.client_id))
        total_active_clients = len(client_ids)
        
        # Calculate visits per client
        client_visit_counts = {}
        for appointment in appointments:
            if appointment.client_id:
                client_visit_counts[appointment.client_id] = client_visit_counts.get(appointment.client_id, 0) + 1
        
        average_visits_per_client = (
            sum(client_visit_counts.values()) / len(client_visit_counts) 
            if client_visit_counts else 0.0
        )
        
        # Calculate utilization rate (assuming 8-hour workdays, 5 days/week)
        available_hours = (days / 7) * 5 * 8  # Rough estimate
        service_hours = sum(a.duration_minutes / 60 for a in appointments if a.duration_minutes)
        utilization_rate = (service_hours / available_hours * 100) if available_hours > 0 else 0.0
        
        # Get client tier distribution
        client_tier_distribution = self._calculate_client_tier_distribution(client_ids)
        
        return {
            "monthly_revenue": round(monthly_revenue, 2),
            "annual_revenue_projection": round(annual_projection, 2),
            "average_ticket": round(average_ticket, 2),
            "utilization_rate": round(utilization_rate, 1),
            "average_visits_per_client": round(average_visits_per_client, 1),
            "total_active_clients": total_active_clients,
            "total_appointments": total_appointments,
            "client_tier_distribution": client_tier_distribution,
            "analysis_period_days": days
        }
    
    def _calculate_client_tier_distribution(self, client_ids: List[int]) -> Dict[str, int]:
        """Calculate distribution of clients across tiers"""
        tier_distribution = {"new": 0, "bronze": 0, "silver": 0, "gold": 0, "platinum": 0}
        
        for client_id in client_ids:
            tier = self.client_tier_service.get_client_tier(client_id)
            tier_name = tier.name.lower() if tier else "new"
            tier_distribution[tier_name] = tier_distribution.get(tier_name, 0) + 1
        
        return tier_distribution
    
    def _calculate_six_figure_targets(self, target_annual_income: float, current_performance: Dict) -> Dict[str, Any]:
        """Calculate targets based on Six Figure Barber methodology"""
        
        monthly_target = target_annual_income / 12
        daily_target = target_annual_income / 365  # Assuming 365 working days
        
        # Estimate clients needed based on current average ticket
        current_avg_ticket = current_performance.get("average_ticket", 50)
        daily_clients_needed = daily_target / current_avg_ticket if current_avg_ticket > 0 else 0
        
        # Calculate revenue gap
        current_annual_projection = current_performance.get("annual_revenue_projection", 0)
        revenue_gap = max(0, target_annual_income - current_annual_projection)
        
        # Determine if on track (within 80% of goal is considered on track)
        on_track = current_annual_projection >= (target_annual_income * 0.8)
        
        return {
            "annual_income_target": target_annual_income,
            "monthly_revenue_target": round(monthly_target, 2),
            "daily_revenue_target": round(daily_target, 2),
            "daily_clients_target": round(daily_clients_needed, 1),
            "revenue_gap": round(revenue_gap, 2),
            "on_track": on_track
        }
    
    def _generate_recommendations(self, current_performance: Dict, targets: Dict) -> Dict[str, Any]:
        """Generate Six Figure methodology recommendations"""
        
        current_avg_ticket = current_performance.get("average_ticket", 0)
        target_revenue = targets.get("annual_income_target", 100000)
        current_projection = current_performance.get("annual_revenue_projection", 0)
        
        # Price optimization recommendations
        price_optimization = self._calculate_price_optimization(current_performance, targets)
        
        # Client acquisition recommendations
        client_acquisition = self._calculate_client_acquisition_recommendations(current_performance, targets)
        
        # Retention improvement recommendations
        retention_improvement = self._calculate_retention_recommendations(current_performance)
        
        # Efficiency optimization
        efficiency_optimization = self._calculate_efficiency_recommendations(current_performance)
        
        return {
            "price_optimization": price_optimization,
            "client_acquisition": client_acquisition,
            "retention_improvement": retention_improvement,
            "efficiency_optimization": efficiency_optimization
        }
    
    def _calculate_price_optimization(self, current_performance: Dict, targets: Dict) -> Dict[str, Any]:
        """Calculate pricing optimization recommendations"""
        
        current_avg_ticket = current_performance.get("average_ticket", 0)
        
        # Six Figure methodology suggests targeting $75-150 per visit
        six_figure_target_ticket = 120.0  # Conservative Six Figure target
        
        recommended_ticket = max(current_avg_ticket * 1.15, six_figure_target_ticket)
        increase_percentage = ((recommended_ticket - current_avg_ticket) / current_avg_ticket * 100) if current_avg_ticket > 0 else 0
        
        # Calculate potential annual impact
        total_appointments = current_performance.get("total_appointments", 0)
        annual_appointments = total_appointments * (365 / current_performance.get("analysis_period_days", 30))
        potential_increase = (recommended_ticket - current_avg_ticket) * annual_appointments
        
        return {
            "current_average_ticket": round(current_avg_ticket, 2),
            "recommended_average_ticket": round(recommended_ticket, 2),
            "recommended_increase_percentage": round(increase_percentage, 1),
            "potential_annual_increase": round(potential_increase, 2),
            "justification": self._get_pricing_justification(current_avg_ticket, recommended_ticket)
        }
    
    def _calculate_client_acquisition_recommendations(self, current_performance: Dict, targets: Dict) -> Dict[str, Any]:
        """Calculate client acquisition recommendations"""
        
        current_clients = current_performance.get("total_active_clients", 0)
        current_avg_ticket = current_performance.get("average_ticket", 0)
        target_annual = targets.get("annual_income_target", 100000)
        
        # Calculate optimal client base for Six Figure income
        visits_per_client_per_year = current_performance.get("average_visits_per_client", 4) * (12 / (current_performance.get("analysis_period_days", 30) / 30))
        optimal_clients = target_annual / (current_avg_ticket * visits_per_client_per_year) if current_avg_ticket > 0 and visits_per_client_per_year > 0 else 0
        
        additional_clients_needed = max(0, optimal_clients - current_clients)
        monthly_new_clients_needed = additional_clients_needed / 12
        
        return {
            "current_monthly_clients": round(current_clients * (30 / current_performance.get("analysis_period_days", 30)), 0),
            "target_monthly_clients": round(optimal_clients * (30 / 365), 0),
            "additional_clients_needed": round(additional_clients_needed, 0),
            "cost_per_acquisition": 25.0,  # Industry average estimate
            "potential_annual_increase": round(additional_clients_needed * current_avg_ticket * visits_per_client_per_year, 2)
        }
    
    def _calculate_retention_recommendations(self, current_performance: Dict) -> Dict[str, Any]:
        """Calculate retention improvement recommendations"""
        
        # Estimate retention rate (simplified calculation)
        current_retention = 75.0  # Default estimate - would need historical data for accuracy
        target_retention = 85.0   # Six Figure methodology target
        
        current_revenue = current_performance.get("annual_revenue_projection", 0)
        potential_increase = current_revenue * ((target_retention - current_retention) / 100)
        
        return {
            "current_retention_rate": current_retention,
            "target_retention_rate": target_retention,
            "potential_annual_increase": round(potential_increase, 2),
            "strategies": [
                "Implement follow-up system after each appointment",
                "Create loyalty program with tier progression",
                "Develop personalized service packages",
                "Regular client satisfaction surveys and feedback integration"
            ]
        }
    
    def _calculate_efficiency_recommendations(self, current_performance: Dict) -> Dict[str, Any]:
        """Calculate efficiency optimization recommendations"""
        
        current_utilization = current_performance.get("utilization_rate", 0)
        target_utilization = 85.0  # Six Figure methodology target
        
        current_revenue = current_performance.get("annual_revenue_projection", 0)
        potential_increase = current_revenue * ((target_utilization - current_utilization) / 100)
        
        return {
            "current_utilization_rate": round(current_utilization, 1),
            "target_utilization_rate": target_utilization,
            "potential_annual_increase": round(potential_increase, 2),
            "suggestions": [
                "Implement smart scheduling to reduce gaps",
                "Develop reminder system to reduce no-shows",
                "Optimize service times through process improvement",
                "Create premium time slots for high-value services"
            ]
        }
    
    def _generate_action_items(self, current_performance: Dict, targets: Dict, recommendations: Dict) -> List[Dict[str, Any]]:
        """Generate specific action items for Six Figure goal achievement"""
        
        action_items = []
        
        # Price optimization actions
        price_rec = recommendations.get("price_optimization", {})
        if price_rec.get("recommended_increase_percentage", 0) > 5:
            action_items.append({
                "title": "Implement Value-Based Pricing",
                "description": f"Increase average ticket by {price_rec.get('recommended_increase_percentage', 0):.1f}% through premium service positioning",
                "expected_impact": f"${price_rec.get('potential_annual_increase', 0):,.0f} annual revenue increase",
                "six_fb_principle": "Premium positioning and value-based pricing"
            })
        
        # Client acquisition actions
        client_rec = recommendations.get("client_acquisition", {})
        if client_rec.get("additional_clients_needed", 0) > 0:
            action_items.append({
                "title": "Strategic Client Acquisition",
                "description": f"Acquire {client_rec.get('additional_clients_needed', 0):.0f} high-value clients through referral programs and premium partnerships",
                "expected_impact": f"${client_rec.get('potential_annual_increase', 0):,.0f} annual revenue increase",
                "six_fb_principle": "Relationship-based client acquisition"
            })
        
        # Always include Six Figure methodology fundamentals
        action_items.extend([
            {
                "title": "Develop Client Tier Progression System",
                "description": "Implement systematic approach to advance clients through bronze → silver → gold → platinum tiers",
                "expected_impact": "30-50% increase in client lifetime value",
                "six_fb_principle": "Client relationship optimization"
            },
            {
                "title": "Create Premium Service Packages",
                "description": "Develop signature experiences combining multiple services for higher ticket values",
                "expected_impact": "25-40% average ticket increase",
                "six_fb_principle": "Value creation and premium positioning"
            },
            {
                "title": "Implement Retention Automation",
                "description": "Set up follow-up systems, birthday campaigns, and loyalty rewards",
                "expected_impact": "15-25% improvement in client retention",
                "six_fb_principle": "Relationship building and client lifetime value"
            }
        ])
        
        return action_items
    
    def _calculate_progress_tracking(self, current_performance: Dict, targets: Dict) -> Dict[str, Any]:
        """Calculate progress tracking metrics"""
        
        monthly_target = targets.get("monthly_revenue_target", 0)
        monthly_current = current_performance.get("monthly_revenue", 0)
        monthly_progress = (monthly_current / monthly_target * 100) if monthly_target > 0 else 0
        
        return {
            "monthly_progress": round(monthly_progress, 1),
            "year_to_date_performance": round(monthly_progress * 0.8, 1),  # Estimate
            "quarterly_trend": "improving" if monthly_progress > 70 else "needs_attention",
            "efficiency_trend": "stable"
        }
    
    def _get_pricing_justification(self, current_ticket: float, recommended_ticket: float) -> str:
        """Get justification for pricing recommendations"""
        
        if recommended_ticket > current_ticket * 1.3:
            return "Significant pricing opportunity - implement premium positioning strategy"
        elif recommended_ticket > current_ticket * 1.15:
            return "Moderate pricing adjustment aligns with Six Figure methodology"
        else:
            return "Pricing is aligned with Six Figure standards"
    
    def _get_fallback_metrics(self, target_annual_income: float) -> Dict[str, Any]:
        """Return fallback metrics when calculation fails"""
        
        return {
            "current_performance": {
                "monthly_revenue": 0.0,
                "annual_revenue_projection": 0.0,
                "average_ticket": 0.0,
                "utilization_rate": 0.0,
                "average_visits_per_client": 0.0,
                "total_active_clients": 0
            },
            "targets": {
                "annual_income_target": target_annual_income,
                "monthly_revenue_target": target_annual_income / 12,
                "daily_revenue_target": target_annual_income / 365,
                "daily_clients_target": 0,
                "revenue_gap": target_annual_income,
                "on_track": False
            },
            "recommendations": {
                "price_optimization": {
                    "current_average_ticket": 0.0,
                    "recommended_average_ticket": 120.0,
                    "recommended_increase_percentage": 0.0,
                    "potential_annual_increase": 0.0,
                    "justification": "Begin with Six Figure methodology foundation"
                }
            },
            "action_items": [
                {
                    "title": "Start Six Figure Barber Journey",
                    "description": "Begin implementing Six Figure methodology fundamentals",
                    "expected_impact": "Foundation for sustainable business growth",
                    "six_fb_principle": "Comprehensive business transformation"
                }
            ],
            "progress_tracking": {
                "monthly_progress": 0.0,
                "year_to_date_performance": 0.0,
                "quarterly_trend": "starting",
                "efficiency_trend": "baseline"
            },
            "generated_at": datetime.utcnow().isoformat(),
            "status": "fallback_data",
            "error": "Unable to calculate metrics from current data"
        }