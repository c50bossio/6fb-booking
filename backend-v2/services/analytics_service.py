"""
Advanced Analytics Service for 6FB Booking Platform

This service provides comprehensive analytics functionality including:
- Revenue tracking and reporting
- Appointment analytics
- Client retention metrics
- Six Figure Barber methodology calculations
- AI Agent performance analytics
- Predictive insights and business intelligence
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract
from sqlalchemy.sql import text
import calendar
import logging

from models import User, Appointment, Payment, Client, Service, BarberAvailability
from schemas import DateRange
from utils.cache_decorators import cache_result, cache_analytics, cache_user_data, invalidate_user_cache

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    @cache_analytics(ttl=600)  # Cache for 10 minutes
    def get_revenue_analytics(
        self, 
        user_id: Optional[int] = None,
        date_range: Optional[DateRange] = None,
        group_by: str = "day",  # day, week, month, year
        user_ids: Optional[List[int]] = None  # For organization filtering
    ) -> Dict[str, Any]:
        """
        Get revenue analytics for a specific user, organization, or all users
        
        Args:
            user_id: Optional single user ID to filter by (legacy)
            date_range: Optional date range to filter by
            group_by: Grouping period (day, week, month, year)
            user_ids: Optional list of user IDs for organization filtering
            
        Returns:
            Dictionary containing revenue analytics data
        """
        # Optimized query with proper indexing
        query = self.db.query(
            Payment.created_at,
            func.sum(Payment.amount).label('total_revenue'),
            func.count(Payment.id).label('transaction_count'),
            func.avg(Payment.amount).label('average_transaction')
        ).filter(Payment.status == 'completed')
        
        # Support both single user_id and multiple user_ids
        if user_ids:
            query = query.filter(Payment.user_id.in_(user_ids))
        elif user_id:
            query = query.filter(Payment.user_id == user_id)
            
        if date_range:
            query = query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        # Group by the specified period (SQLite compatible)
        if group_by == "day":
            query = query.group_by(func.date(Payment.created_at))
        elif group_by == "week":
            # SQLite doesn't have date_trunc, use strftime for week
            query = query.group_by(func.strftime('%Y-%W', Payment.created_at))
        elif group_by == "month":
            # SQLite equivalent of date_trunc for month
            query = query.group_by(func.strftime('%Y-%m', Payment.created_at))
        elif group_by == "year":
            # SQLite equivalent of date_trunc for year
            query = query.group_by(func.strftime('%Y', Payment.created_at))
            
        results = query.all()
        
        # Calculate summary statistics
        total_revenue = sum(r.total_revenue or 0 for r in results)
        total_transactions = sum(r.transaction_count or 0 for r in results)
        average_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
        
        # Format results for frontend consumption
        revenue_data = []
        for result in results:
            revenue_data.append({
                "date": result.created_at.isoformat() if result.created_at else None,
                "revenue": float(result.total_revenue or 0),
                "transactions": int(result.transaction_count or 0),
                "average": float(result.average_transaction or 0)
            })
        
        return {
            "summary": {
                "total_revenue": float(total_revenue),
                "total_transactions": int(total_transactions),
                "average_transaction": float(average_transaction),
                "period": group_by
            },
            "data": revenue_data
        }

    def get_appointment_analytics(
        self,
        user_id: Optional[int] = None,
        date_range: Optional[DateRange] = None,
        user_ids: Optional[List[int]] = None  # For organization filtering
    ) -> Dict[str, Any]:
        """
        Get appointment analytics including completion rates, no-shows, etc.
        
        Args:
            user_id: Optional single user ID to filter by (legacy)
            date_range: Optional date range to filter by
            user_ids: Optional list of user IDs for organization filtering
            
        Returns:
            Dictionary containing appointment analytics
        """
        query = self.db.query(Appointment)
        
        # Support both single user_id and multiple user_ids
        if user_ids:
            query = query.filter(Appointment.user_id.in_(user_ids))
        elif user_id:
            query = query.filter(Appointment.user_id == user_id)
            
        if date_range:
            query = query.filter(
                and_(
                    Appointment.start_time >= date_range.start_date,
                    Appointment.start_time <= date_range.end_date
                )
            )
        
        appointments = query.all()
        
        # Calculate statistics
        total_appointments = len(appointments)
        completed = sum(1 for a in appointments if a.status == 'completed')
        cancelled = sum(1 for a in appointments if a.status == 'cancelled')
        no_shows = sum(1 for a in appointments if a.status == 'no_show')
        pending = sum(1 for a in appointments if a.status == 'pending')
        
        # Service breakdown
        service_stats = {}
        for appointment in appointments:
            service = appointment.service_name
            if service not in service_stats:
                service_stats[service] = {
                    "count": 0,
                    "revenue": 0,
                    "completed": 0,
                    "cancelled": 0
                }
            service_stats[service]["count"] += 1
            service_stats[service]["revenue"] += appointment.price or 0
            if appointment.status == 'completed':
                service_stats[service]["completed"] += 1
            elif appointment.status == 'cancelled':
                service_stats[service]["cancelled"] += 1
        
        # Time slot analysis
        time_slot_stats = {}
        for appointment in appointments:
            hour = appointment.start_time.hour
            if hour not in time_slot_stats:
                time_slot_stats[hour] = 0
            time_slot_stats[hour] += 1
        
        return {
            "summary": {
                "total": total_appointments,
                "completed": completed,
                "cancelled": cancelled,
                "no_shows": no_shows,
                "pending": pending,
                "completion_rate": (completed / total_appointments * 100) if total_appointments > 0 else 0,
                "cancellation_rate": (cancelled / total_appointments * 100) if total_appointments > 0 else 0,
                "no_show_rate": (no_shows / total_appointments * 100) if total_appointments > 0 else 0
            },
            "by_service": service_stats,
            "by_time_slot": time_slot_stats
        }

    def get_client_retention_metrics(
        self,
        user_id: Optional[int] = None,
        date_range: Optional[DateRange] = None
    ) -> Dict[str, Any]:
        """
        Calculate client retention metrics including retention rate, churn rate, etc.
        
        Args:
            user_id: Optional user ID to filter by
            date_range: Optional date range to filter by
            
        Returns:
            Dictionary containing client retention metrics
        """
        # Get all clients with their appointment history
        query = self.db.query(Client).join(Appointment, Client.id == Appointment.client_id)
        
        if user_id:
            query = query.filter(Appointment.user_id == user_id)
        
        clients = query.distinct().all()
        
        # Calculate retention metrics
        total_clients = len(clients)
        active_clients = 0
        new_clients = 0
        returning_clients = 0
        at_risk_clients = 0
        lost_clients = 0
        
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        for client in clients:
            if client.last_visit_date:
                if client.last_visit_date >= thirty_days_ago:
                    active_clients += 1
                elif client.last_visit_date >= sixty_days_ago:
                    at_risk_clients += 1
                else:
                    lost_clients += 1
                    
            if client.total_visits == 1:
                new_clients += 1
            elif client.total_visits > 1:
                returning_clients += 1
        
        # Calculate retention rate
        retention_rate = (returning_clients / total_clients * 100) if total_clients > 0 else 0
        
        # Calculate average customer lifetime value
        total_revenue = sum(client.total_spent or 0 for client in clients)
        avg_lifetime_value = total_revenue / total_clients if total_clients > 0 else 0
        
        # Client segmentation
        client_segments = {
            "vip": sum(1 for c in clients if c.customer_type == 'vip'),
            "regular": sum(1 for c in clients if c.customer_type == 'returning'),
            "new": sum(1 for c in clients if c.customer_type == 'new'),
            "at_risk": sum(1 for c in clients if c.customer_type == 'at_risk')
        }
        
        return {
            "summary": {
                "total_clients": total_clients,
                "active_clients": active_clients,
                "new_clients": new_clients,
                "returning_clients": returning_clients,
                "at_risk_clients": at_risk_clients,
                "lost_clients": lost_clients,
                "retention_rate": retention_rate,
                "average_lifetime_value": avg_lifetime_value
            },
            "segments": client_segments,
            "trends": {
                "active_percentage": (active_clients / total_clients * 100) if total_clients > 0 else 0,
                "at_risk_percentage": (at_risk_clients / total_clients * 100) if total_clients > 0 else 0,
                "lost_percentage": (lost_clients / total_clients * 100) if total_clients > 0 else 0
            }
        }

    @cache_analytics(ttl=900)  # Cache for 15 minutes
    def calculate_six_figure_barber_metrics(
        self,
        user_id: int,
        target_annual_income: float = 100000.0
    ) -> Dict[str, Any]:
        """
        Calculate Six Figure Barber methodology metrics (Optimized version)
        
        The Six Figure Barber methodology focuses on:
        1. Service pricing optimization
        2. Client retention and frequency
        3. Time management and efficiency
        4. Revenue per client maximization
        
        Args:
            user_id: User ID to calculate metrics for
            target_annual_income: Target annual income (default $100,000)
            
        Returns:
            Dictionary containing Six Figure Barber metrics and recommendations
        """
        # Pre-calculate date ranges
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        one_year_ago = now - timedelta(days=365)
        
        # Use a single optimized query with CTEs (Common Table Expressions)
        # For SQLite compatibility, we'll use subqueries
        metrics_query = text("""
        WITH payment_metrics AS (
            SELECT 
                COUNT(DISTINCT p.id) as payment_count,
                COALESCE(SUM(p.amount), 0) as total_revenue,
                COALESCE(AVG(p.amount), 0) as avg_ticket,
                COUNT(DISTINCT a.client_id) as unique_clients
            FROM payments p
            INNER JOIN appointments a ON p.appointment_id = a.id
            WHERE a.user_id = :user_id 
                AND p.status = 'completed'
                AND p.created_at >= :thirty_days_ago
        ),
        appointment_metrics AS (
            SELECT 
                COALESCE(SUM(duration_minutes), 0) as total_minutes,
                COUNT(*) as completed_appointments
            FROM appointments
            WHERE user_id = :user_id 
                AND status = 'completed'
                AND start_time >= :thirty_days_ago
        ),
        client_frequency AS (
            SELECT 
                COUNT(DISTINCT client_id) as total_clients,
                COUNT(*) as total_visits
            FROM appointments
            WHERE user_id = :user_id 
                AND status = 'completed'
                AND start_time >= :one_year_ago
        )
        SELECT 
            pm.total_revenue,
            pm.avg_ticket,
            pm.payment_count,
            pm.unique_clients,
            am.total_minutes,
            am.completed_appointments,
            cf.total_clients as year_clients,
            cf.total_visits as year_visits
        FROM payment_metrics pm
        CROSS JOIN appointment_metrics am
        CROSS JOIN client_frequency cf
        """)
        
        try:
            result = self.db.execute(metrics_query, {
                'user_id': user_id,
                'thirty_days_ago': thirty_days_ago,
                'one_year_ago': one_year_ago
            }).fetchone()
            
            if not result:
                # Return default metrics if no data
                return self._get_default_six_fb_metrics(target_annual_income)
            
            # Extract values from result
            monthly_revenue = float(result.total_revenue)
            avg_ticket = float(result.avg_ticket)
            booked_minutes = float(result.total_minutes)
            year_clients = int(result.year_clients)
            year_visits = int(result.year_visits)
            
            # Calculate derived metrics
            annual_revenue_projection = monthly_revenue * 12
            booked_hours = booked_minutes / 60
            
            # Time utilization calculation
            working_days_per_month = 22
            working_hours_per_day = 8
            total_working_hours = working_days_per_month * working_hours_per_day
            utilization_rate = (booked_hours / total_working_hours * 100) if total_working_hours > 0 else 0
            
            # Client frequency
            avg_visits_per_client = year_visits / year_clients if year_clients > 0 else 0
            
            # Target calculations
            monthly_target = target_annual_income / 12
            revenue_gap = monthly_target - monthly_revenue
            
            # Required metrics
            clients_needed_per_month = monthly_target / avg_ticket if avg_ticket > 0 else 0
            current_clients_per_month = monthly_revenue / avg_ticket if avg_ticket > 0 else 0
            additional_clients_needed = max(0, clients_needed_per_month - current_clients_per_month)
            
            # Recommendations
            recommended_price_increase = 0
            if monthly_revenue > 0 and revenue_gap > 0:
                recommended_price_increase = min((revenue_gap / monthly_revenue) * 100, 30)  # Cap at 30%
            
            # Daily targets
            daily_revenue_target = monthly_target / working_days_per_month
            daily_clients_target = int(clients_needed_per_month / working_days_per_month)
            
            return {
                "current_performance": {
                    "monthly_revenue": round(monthly_revenue, 2),
                    "annual_revenue_projection": round(annual_revenue_projection, 2),
                    "average_ticket": round(avg_ticket, 2),
                    "utilization_rate": round(utilization_rate, 1),
                    "average_visits_per_client": round(avg_visits_per_client, 1),
                    "total_active_clients": year_clients
                },
                "targets": {
                    "annual_income_target": target_annual_income,
                    "monthly_revenue_target": round(monthly_target, 2),
                    "daily_revenue_target": round(daily_revenue_target, 2),
                    "daily_clients_target": daily_clients_target,
                    "revenue_gap": round(revenue_gap, 2),
                    "on_track": monthly_revenue >= (monthly_target * 0.8)  # Within 20% of goal
                },
                "recommendations": {
                    "price_optimization": {
                        "current_average_ticket": round(avg_ticket, 2),
                        "recommended_average_ticket": round(avg_ticket * (1 + recommended_price_increase / 100), 2),
                        "recommended_increase_percentage": round(recommended_price_increase, 1),
                        "potential_annual_increase": round(annual_revenue_projection * (recommended_price_increase / 100), 2),
                        "justification": self._get_price_justification(avg_ticket, recommended_price_increase)
                    },
                    "client_acquisition": {
                        "current_monthly_clients": int(current_clients_per_month),
                        "target_monthly_clients": int(clients_needed_per_month),
                        "additional_clients_needed": int(additional_clients_needed),
                        "cost_per_acquisition": 25.0,  # Industry average
                        "potential_annual_increase": round(additional_clients_needed * avg_ticket * 12, 2)
                    },
                    "retention_improvement": {
                        "current_retention_rate": min(95.0, year_clients / max(year_clients * 1.2, 1) * 100),
                        "target_retention_rate": 85.0,
                        "potential_annual_increase": round(annual_revenue_projection * 0.1, 2),  # 10% improvement
                        "strategies": [
                            "Implement follow-up system",
                            "Create loyalty program",
                            "Improve service quality",
                            "Personalized communication"
                        ]
                    },
                    "efficiency_optimization": {
                        "current_utilization_rate": round(utilization_rate, 1),
                        "target_utilization_rate": 80.0,
                        "potential_annual_increase": round(annual_revenue_projection * 0.15, 2),  # 15% improvement
                        "suggestions": [
                            "Optimize scheduling",
                            "Reduce no-shows",
                            "Streamline service times",
                            "Implement buffer time management"
                        ]
                    }
                },
                "progress_tracking": {
                    "monthly_progress": round((monthly_revenue / monthly_target) * 100, 1),
                    "year_to_date_performance": round((annual_revenue_projection / target_annual_income) * 100, 1),
                    "quarterly_trend": self._calculate_trend(monthly_revenue),
                    "efficiency_trend": self._calculate_efficiency_trend(utilization_rate)
                },
                "action_items": self._generate_action_items(
                    monthly_revenue, monthly_target, avg_ticket, utilization_rate, avg_visits_per_client
                ),
                "generated_at": datetime.utcnow().isoformat(),
                "status": "calculated"
            }
            
        except Exception as e:
            logger.error(f"Error calculating Six Figure Barber metrics: {e}")
            # Return safe default values on error
            return self._get_default_six_fb_metrics(target_annual_income)

    def _generate_action_items(
        self,
        current_revenue: float,
        target_revenue: float,
        avg_ticket: float,
        utilization_rate: float,
        avg_visits: float
    ) -> List[Dict[str, str]]:
        """Generate prioritized action items based on current metrics"""
        action_items = []
        
        # Revenue gap analysis
        if current_revenue < target_revenue * 0.5:
            action_items.append({
                "priority": "high",
                "category": "pricing",
                "action": "Review and optimize service pricing",
                "impact": "Immediate revenue increase"
            })
        
        # Utilization analysis
        if utilization_rate < 60:
            action_items.append({
                "priority": "high",
                "category": "marketing",
                "action": "Increase marketing efforts to attract new clients",
                "impact": "Fill empty appointment slots"
            })
        
        # Average ticket analysis
        if avg_ticket < 40:
            action_items.append({
                "priority": "high",
                "category": "upselling",
                "action": "Implement service packages and add-ons",
                "impact": "Increase average transaction value"
            })
        
        # Client retention analysis
        if avg_visits < 1.5:
            action_items.append({
                "priority": "medium",
                "category": "retention",
                "action": "Create client loyalty program",
                "impact": "Increase visit frequency"
            })
        
        # Time management
        if utilization_rate > 90:
            action_items.append({
                "priority": "medium",
                "category": "efficiency",
                "action": "Optimize appointment scheduling",
                "impact": "Reduce downtime between clients"
            })
        
        return action_items

    def _get_default_six_fb_metrics(self, target_annual_income: float) -> Dict[str, Any]:
        """Return default metrics structure when no data is available"""
        monthly_target = target_annual_income / 12
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
                "monthly_revenue_target": round(monthly_target, 2),
                "daily_revenue_target": round(monthly_target / 22, 2),
                "daily_clients_target": 0,
                "revenue_gap": round(monthly_target, 2),
                "on_track": False
            },
            "recommendations": {
                "price_optimization": {
                    "current_average_ticket": 0.0,
                    "recommended_average_ticket": 50.0,  # Industry average
                    "recommended_increase_percentage": 0.0,
                    "potential_annual_increase": 0.0,
                    "justification": "Start by setting competitive service prices"
                },
                "client_acquisition": {
                    "current_monthly_clients": 0,
                    "target_monthly_clients": int(monthly_target / 50),  # Based on average ticket
                    "additional_clients_needed": int(monthly_target / 50),
                    "cost_per_acquisition": 25.0,
                    "potential_annual_increase": 0.0
                },
                "retention_improvement": {
                    "current_retention_rate": 0.0,
                    "target_retention_rate": 85.0,
                    "potential_annual_increase": 0.0,
                    "strategies": [
                        "Build client database",
                        "Implement booking system",
                        "Create service menu",
                        "Establish communication channels"
                    ]
                },
                "efficiency_optimization": {
                    "current_utilization_rate": 0.0,
                    "target_utilization_rate": 80.0,
                    "potential_annual_increase": 0.0,
                    "suggestions": [
                        "Set up scheduling system",
                        "Define service durations",
                        "Create availability calendar",
                        "Implement booking policies"
                    ]
                }
            },
            "progress_tracking": {
                "monthly_progress": 0.0,
                "year_to_date_performance": 0.0,
                "quarterly_trend": "new",
                "efficiency_trend": "new"
            },
            "action_items": [
                {
                    "priority": "high",
                    "category": "setup",
                    "action": "Set up service menu and pricing",
                    "impact": "Foundation for revenue generation"
                }
            ],
            "generated_at": datetime.utcnow().isoformat(),
            "status": "no_data"
        }

    def _get_price_justification(self, avg_ticket: float, increase_percentage: float) -> str:
        """Generate justification for price recommendations"""
        if avg_ticket < 30:
            return "Your current pricing is significantly below market average"
        elif avg_ticket < 45:
            return "Your current pricing is below market average"
        elif increase_percentage > 20:
            return "Significant value enhancement needed to justify price increase"
        elif increase_percentage > 10:
            return "Moderate price adjustment recommended based on service value"
        elif increase_percentage > 0:
            return "Minor price optimization to align with market standards"
        else:
            return "Your pricing is well-optimized for current performance"

    def _calculate_trend(self, current_value: float) -> str:
        """Calculate performance trend"""
        # In a real implementation, this would compare to historical data
        if current_value > 0:
            return "improving"
        else:
            return "stable"

    def _calculate_efficiency_trend(self, utilization_rate: float) -> str:
        """Calculate efficiency trend"""
        if utilization_rate >= 80:
            return "optimal"
        elif utilization_rate >= 60:
            return "improving"
        elif utilization_rate >= 40:
            return "stable"
        else:
            return "needs_attention"

    @cache_result(ttl=600, prefix="dashboard")  # Cache for 10 minutes
    def get_advanced_dashboard_summary(
        self,
        user_id: Optional[int] = None,
        date_range: Optional[DateRange] = None,
        user_ids: Optional[List[int]] = None  # For organization filtering
    ) -> Dict[str, Any]:
        """
        Get an advanced comprehensive dashboard summary with enhanced analytics
        
        Args:
            user_id: Optional single user ID to filter by (legacy)
            date_range: Optional date range to filter by
            user_ids: Optional list of user IDs for organization filtering
            
        Returns:
            Dictionary containing advanced dashboard summary data
        """
        # Get all analytics data with organization support
        revenue_analytics = self.get_revenue_analytics(user_id, date_range, "month", user_ids)
        appointment_analytics = self.get_appointment_analytics(user_id, date_range, user_ids)
        retention_metrics = self.get_client_retention_metrics(user_id, date_range)
        clv_analytics = self.get_client_lifetime_value_analytics(user_id, date_range)
        pattern_analytics = self.get_appointment_patterns_analytics(user_id, date_range)
        
        # Get barber-specific metrics if user_id is provided
        barber_metrics = None
        if user_id:
            # Check if user is a barber
            user = self.db.query(User).filter(User.id == user_id).first()
            if user and user.role in ['barber', 'admin']:
                barber_metrics = self.get_barber_performance_metrics(user_id, date_range)
        
        # Get comparative data
        comparative_data = self.get_comparative_analytics(user_id, "previous_month")
        
        # Enhanced key metrics
        key_metrics = {
            'revenue': {
                'current': revenue_analytics["summary"]["total_revenue"],
                'change': comparative_data['comparisons']['revenue']['change'],
                'trend': 'up' if comparative_data['comparisons']['revenue']['change'] > 0 else 'down'
            },
            'appointments': {
                'current': appointment_analytics["summary"]["total"],
                'change': comparative_data['comparisons']['appointments']['change'],
                'completion_rate': appointment_analytics["summary"]["completion_rate"]
            },
            'clients': {
                'active': retention_metrics["summary"]["active_clients"],
                'change': comparative_data['comparisons']['active_clients']['change'],
                'retention_rate': retention_metrics["summary"]["retention_rate"]
            },
            'clv': {
                'average': clv_analytics['summary']['average_clv'],
                'total': clv_analytics['summary']['total_clv']
            }
        }
        
        # Business insights and recommendations
        insights = self._generate_business_insights(
            revenue_analytics, appointment_analytics, retention_metrics, 
            clv_analytics, pattern_analytics, barber_metrics
        )
        
        dashboard_data = {
            'key_metrics': key_metrics,
            'revenue_analytics': revenue_analytics,
            'appointment_analytics': appointment_analytics,
            'retention_metrics': retention_metrics,
            'clv_analytics': clv_analytics,
            'pattern_analytics': pattern_analytics,
            'comparative_data': comparative_data,
            'business_insights': insights,
            'quick_actions': self._generate_quick_actions(insights)
        }
        
        if barber_metrics:
            dashboard_data['barber_performance'] = barber_metrics
        
        return dashboard_data

    def get_dashboard_summary(
        self,
        user_id: Optional[int] = None,
        date_range: Optional[DateRange] = None
    ) -> Dict[str, Any]:
        """
        Get a comprehensive dashboard summary combining all analytics
        
        Args:
            user_id: Optional user ID to filter by
            date_range: Optional date range to filter by
            
        Returns:
            Dictionary containing dashboard summary data
        """
        # Get all analytics data
        revenue_analytics = self.get_revenue_analytics(user_id, date_range, "month")
        appointment_analytics = self.get_appointment_analytics(user_id, date_range)
        retention_metrics = self.get_client_retention_metrics(user_id, date_range)
        
        # Calculate period comparisons
        if date_range:
            # Calculate previous period for comparison
            period_length = (date_range.end_date - date_range.start_date).days
            previous_start = date_range.start_date - timedelta(days=period_length)
            previous_end = date_range.start_date - timedelta(days=1)
            previous_range = DateRange(start_date=previous_start, end_date=previous_end)
            
            previous_revenue = self.get_revenue_analytics(user_id, previous_range, "month")
            revenue_change = self._calculate_percentage_change(
                revenue_analytics["summary"]["total_revenue"],
                previous_revenue["summary"]["total_revenue"]
            )
        else:
            revenue_change = 0
        
        # Get top performing services
        top_services = sorted(
            appointment_analytics["by_service"].items(),
            key=lambda x: x[1]["revenue"],
            reverse=True
        )[:5]
        
        # Get peak hours
        peak_hours = sorted(
            appointment_analytics["by_time_slot"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        
        return {
            "key_metrics": {
                "total_revenue": revenue_analytics["summary"]["total_revenue"],
                "revenue_change": revenue_change,
                "total_appointments": appointment_analytics["summary"]["total"],
                "completion_rate": appointment_analytics["summary"]["completion_rate"],
                "active_clients": retention_metrics["summary"]["active_clients"],
                "retention_rate": retention_metrics["summary"]["retention_rate"]
            },
            "revenue_trend": revenue_analytics["data"],
            "top_services": [
                {
                    "name": service[0],
                    "revenue": service[1]["revenue"],
                    "count": service[1]["count"]
                }
                for service in top_services
            ],
            "peak_hours": [
                {
                    "hour": f"{hour[0]}:00",
                    "appointments": hour[1]
                }
                for hour in peak_hours
            ],
            "client_segments": retention_metrics["segments"],
            "quick_stats": {
                "today_revenue": self._get_today_revenue(user_id),
                "week_revenue": self._get_week_revenue(user_id),
                "month_revenue": self._get_month_revenue(user_id),
                "upcoming_appointments": self._get_upcoming_appointments_count(user_id)
            }
        }

    def _calculate_percentage_change(self, current: float, previous: float) -> float:
        """Calculate percentage change between two values"""
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100

    def _get_today_revenue(self, user_id: Optional[int] = None) -> float:
        """Get today's revenue"""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        query = self.db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.status == 'completed',
                Payment.created_at >= today_start
            )
        )
        if user_id:
            query = query.filter(Payment.user_id == user_id)
        result = query.scalar()
        return float(result or 0)

    def _get_week_revenue(self, user_id: Optional[int] = None) -> float:
        """Get this week's revenue"""
        week_start = datetime.utcnow() - timedelta(days=7)
        query = self.db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.status == 'completed',
                Payment.created_at >= week_start
            )
        )
        if user_id:
            query = query.filter(Payment.user_id == user_id)
        result = query.scalar()
        return float(result or 0)

    def _get_month_revenue(self, user_id: Optional[int] = None) -> float:
        """Get this month's revenue"""
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = self.db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.status == 'completed',
                Payment.created_at >= month_start
            )
        )
        if user_id:
            query = query.filter(Payment.user_id == user_id)
        result = query.scalar()
        return float(result or 0)

    def _get_upcoming_appointments_count(self, user_id: Optional[int] = None) -> int:
        """Get count of upcoming appointments"""
        now = datetime.utcnow()
        query = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.start_time >= now,
                Appointment.status.in_(['pending', 'confirmed'])
            )
        )
        if user_id:
            query = query.filter(Appointment.user_id == user_id)
        result = query.scalar()
        return int(result or 0)
    
    def _generate_business_insights(
        self,
        revenue_analytics: Dict,
        appointment_analytics: Dict,
        retention_metrics: Dict,
        clv_analytics: Dict,
        pattern_analytics: Dict,
        barber_metrics: Optional[Dict] = None
    ) -> List[Dict[str, str]]:
        """
        Generate actionable business insights based on analytics data
        
        Returns:
            List of insight dictionaries with type, title, description, and priority
        """
        insights = []
        
        # Revenue insights
        if revenue_analytics['summary']['total_revenue'] > 0:
            avg_transaction = revenue_analytics['summary']['average_transaction']
            if avg_transaction < 50:
                insights.append({
                    'type': 'revenue',
                    'priority': 'high',
                    'title': 'Low Average Transaction Value',
                    'description': f'Your average transaction is ${avg_transaction:.2f}. Consider service packages or premium offerings to increase value.',
                    'action': 'Review pricing strategy and create service bundles'
                })
        
        # Appointment insights
        completion_rate = appointment_analytics['summary']['completion_rate']
        no_show_rate = appointment_analytics['summary']['no_show_rate']
        
        if completion_rate < 80:
            insights.append({
                'type': 'appointments',
                'priority': 'high',
                'title': 'Low Appointment Completion Rate',
                'description': f'Only {completion_rate:.1f}% of appointments are completed. Focus on reducing cancellations and no-shows.',
                'action': 'Implement confirmation system and cancellation policy'
            })
        
        if no_show_rate > 15:
            insights.append({
                'type': 'appointments',
                'priority': 'medium',
                'title': 'High No-Show Rate',
                'description': f'{no_show_rate:.1f}% of appointments result in no-shows. This impacts revenue and scheduling.',
                'action': 'Send reminder notifications and require deposits'
            })
        
        # Client retention insights
        retention_rate = retention_metrics['summary']['retention_rate']
        if retention_rate < 60:
            insights.append({
                'type': 'retention',
                'priority': 'high',
                'title': 'Low Client Retention',
                'description': f'Only {retention_rate:.1f}% of clients return. Focus on building relationships and follow-up.',
                'action': 'Create loyalty program and improve client communication'
            })
        
        # CLV insights
        avg_clv = clv_analytics['summary']['average_clv']
        if avg_clv < 200:
            insights.append({
                'type': 'clv',
                'priority': 'medium',
                'title': 'Low Customer Lifetime Value',
                'description': f'Average CLV is ${avg_clv:.2f}. Focus on increasing visit frequency and service value.',
                'action': 'Develop membership programs and upselling strategies'
            })
        
        # Service popularity insights
        if pattern_analytics['service_analytics']:
            services = pattern_analytics['service_analytics']
            low_performing_services = [
                service for service, stats in services.items()
                if stats['completion_rate'] < 70
            ]
            
            if low_performing_services:
                insights.append({
                    'type': 'services',
                    'priority': 'medium',
                    'title': 'Underperforming Services',
                    'description': f'Services like {", ".join(low_performing_services[:3])} have low completion rates.',
                    'action': 'Review service quality, pricing, or consider discontinuing'
                })
        
        # Barber-specific insights
        if barber_metrics:
            utilization = barber_metrics['efficiency']['utilization_rate']
            if utilization < 60:
                insights.append({
                    'type': 'efficiency',
                    'priority': 'high',
                    'title': 'Low Schedule Utilization',
                    'description': f'Your schedule is only {utilization:.1f}% utilized. There\'s room for more bookings.',
                    'action': 'Increase marketing efforts or adjust availability hours'
                })
            elif utilization > 95:
                insights.append({
                    'type': 'efficiency',
                    'priority': 'medium',
                    'title': 'Over-Scheduled',
                    'description': f'Your schedule is {utilization:.1f}% full. Consider raising prices or expanding hours.',
                    'action': 'Optimize pricing or increase capacity'
                })
        
        return insights
    
    def _generate_quick_actions(
        self,
        insights: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Generate quick action items based on business insights
        
        Args:
            insights: List of business insights
            
        Returns:
            List of quick action dictionaries
        """
        actions = []
        
        # Priority actions based on insights
        high_priority_insights = [i for i in insights if i['priority'] == 'high']
        
        for insight in high_priority_insights[:3]:  # Top 3 high priority items
            actions.append({
                'title': insight['action'],
                'category': insight['type'],
                'urgency': 'high',
                'description': insight['description']
            })
        
        # Add standard quick actions
        actions.extend([
            {
                'title': 'Send client feedback survey',
                'category': 'retention',
                'urgency': 'low',
                'description': 'Gather feedback to improve service quality'
            },
            {
                'title': 'Review upcoming week schedule',
                'category': 'planning',
                'urgency': 'medium',
                'description': 'Optimize schedule for maximum efficiency'
            },
            {
                'title': 'Update service pricing',
                'category': 'revenue',
                'urgency': 'medium',
                'description': 'Ensure pricing reflects current market value'
            }
        ])
        
        return actions[:5]  # Return top 5 actions

    def get_barber_performance_metrics(
        self,
        barber_id: int,
        date_range: Optional[DateRange] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive performance metrics for a specific barber
        
        Args:
            barber_id: Barber user ID (using user_id since current schema doesn't have barber_id)
            date_range: Optional date range to filter by
            
        Returns:
            Dictionary containing barber performance metrics
        """
        # Base query filters - using user_id since current schema doesn't have separate barber_id
        appointment_query = self.db.query(Appointment).filter(
            Appointment.user_id == barber_id
        )
        payment_query = self.db.query(Payment).filter(
            Payment.user_id == barber_id,
            Payment.status == 'completed'
        )
        
        if date_range:
            appointment_query = appointment_query.filter(
                and_(
                    Appointment.start_time >= date_range.start_date,
                    Appointment.start_time <= date_range.end_date
                )
            )
            payment_query = payment_query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        appointments = appointment_query.all()
        payments = payment_query.all()
        
        # Basic metrics
        total_appointments = len(appointments)
        completed_appointments = sum(1 for a in appointments if a.status == 'completed')
        cancelled_appointments = sum(1 for a in appointments if a.status == 'cancelled')
        no_show_appointments = sum(1 for a in appointments if a.status == 'no_show')
        
        # Revenue metrics
        total_revenue = sum(p.amount for p in payments)
        barber_earnings = sum(p.barber_amount for p in payments)
        platform_fees = sum(p.platform_fee for p in payments)
        
        # Service performance
        service_performance = {}
        for appointment in appointments:
            service = appointment.service_name
            if service not in service_performance:
                service_performance[service] = {
                    'count': 0,
                    'revenue': 0,
                    'avg_duration': 0,
                    'completion_rate': 0,
                    'completed': 0
                }
            
            service_performance[service]['count'] += 1
            service_performance[service]['revenue'] += appointment.price or 0
            service_performance[service]['avg_duration'] += appointment.duration_minutes or 30
            
            if appointment.status == 'completed':
                service_performance[service]['completed'] += 1
        
        # Calculate service averages
        for service, data in service_performance.items():
            if data['count'] > 0:
                data['avg_duration'] = data['avg_duration'] / data['count']
                data['completion_rate'] = (data['completed'] / data['count']) * 100
        
        # Time utilization analysis
        total_scheduled_minutes = sum(a.duration_minutes or 30 for a in appointments)
        total_scheduled_hours = total_scheduled_minutes / 60
        
        # Get barber's available hours from schedule
        available_hours = self._calculate_available_hours(barber_id, date_range)
        utilization_rate = (total_scheduled_hours / available_hours * 100) if available_hours > 0 else 0
        
        # Client relationship metrics
        unique_clients = len(set(a.client_id for a in appointments if a.client_id))
        repeat_clients = 0
        client_visit_counts = {}
        
        for appointment in appointments:
            if appointment.client_id:
                client_id = appointment.client_id
                client_visit_counts[client_id] = client_visit_counts.get(client_id, 0) + 1
        
        repeat_clients = sum(1 for count in client_visit_counts.values() if count > 1)
        client_retention_rate = (repeat_clients / unique_clients * 100) if unique_clients > 0 else 0
        
        # Peak performance analysis
        hourly_performance = {}
        daily_performance = {}
        
        for appointment in appointments:
            hour = appointment.start_time.hour
            day = appointment.start_time.strftime('%A')
            
            hourly_performance[hour] = hourly_performance.get(hour, 0) + 1
            daily_performance[day] = daily_performance.get(day, 0) + 1
        
        peak_hour = max(hourly_performance.items(), key=lambda x: x[1])[0] if hourly_performance else None
        peak_day = max(daily_performance.items(), key=lambda x: x[1])[0] if daily_performance else None
        
        # Average metrics
        avg_appointment_value = total_revenue / total_appointments if total_appointments > 0 else 0
        avg_daily_appointments = total_appointments / 30 if date_range and (date_range.end_date - date_range.start_date).days >= 30 else 0
        
        return {
            'summary': {
                'total_appointments': total_appointments,
                'completed_appointments': completed_appointments,
                'cancelled_appointments': cancelled_appointments,
                'no_show_appointments': no_show_appointments,
                'completion_rate': (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0,
                'cancellation_rate': (cancelled_appointments / total_appointments * 100) if total_appointments > 0 else 0,
                'no_show_rate': (no_show_appointments / total_appointments * 100) if total_appointments > 0 else 0
            },
            'revenue': {
                'total_revenue': float(total_revenue),
                'barber_earnings': float(barber_earnings),
                'platform_fees': float(platform_fees),
                'average_appointment_value': float(avg_appointment_value),
                'revenue_per_hour': float(total_revenue / total_scheduled_hours) if total_scheduled_hours > 0 else 0
            },
            'efficiency': {
                'utilization_rate': float(utilization_rate),
                'available_hours': float(available_hours),
                'scheduled_hours': float(total_scheduled_hours),
                'average_daily_appointments': float(avg_daily_appointments)
            },
            'client_metrics': {
                'unique_clients': unique_clients,
                'repeat_clients': repeat_clients,
                'client_retention_rate': float(client_retention_rate),
                'average_visits_per_client': sum(client_visit_counts.values()) / len(client_visit_counts) if client_visit_counts else 0
            },
            'service_performance': service_performance,
            'peak_performance': {
                'peak_hour': peak_hour,
                'peak_day': peak_day,
                'hourly_distribution': hourly_performance,
                'daily_distribution': daily_performance
            }
        }

    def get_client_lifetime_value_analytics(
        self,
        user_id: Optional[int] = None,
        date_range: Optional[DateRange] = None
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive client lifetime value analytics
        
        Args:
            user_id: Optional user ID to filter by
            date_range: Optional date range to filter by
            
        Returns:
            Dictionary containing CLV analytics and segmentation
        """
        # Base query for clients with their appointments and payments
        clients_query = self.db.query(Client).join(
            Appointment, Client.id == Appointment.client_id
        ).join(
            Payment, Appointment.id == Payment.appointment_id
        ).filter(
            Payment.status == 'completed'
        )
        
        if user_id:
            clients_query = clients_query.filter(Appointment.user_id == user_id)
        
        if date_range:
            clients_query = clients_query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        clients = clients_query.distinct().all()
        
        # CLV calculations
        clv_data = []
        total_clv = 0
        
        for client in clients:
            # Get client's payments
            client_payments = self.db.query(Payment).join(
                Appointment, Payment.appointment_id == Appointment.id
            ).filter(
                Appointment.client_id == client.id,
                Payment.status == 'completed'
            )
            
            if user_id:
                client_payments = client_payments.filter(Appointment.user_id == user_id)
            
            payments = client_payments.all()
            
            if not payments:
                continue
            
            # Calculate metrics for this client
            total_spent = sum(p.amount for p in payments)
            visit_count = len(payments)
            avg_order_value = total_spent / visit_count if visit_count > 0 else 0
            
            # Calculate visit frequency (days between visits)
            if len(payments) > 1:
                payment_dates = sorted([p.created_at for p in payments])
                total_days = (payment_dates[-1] - payment_dates[0]).days
                visit_frequency = total_days / (len(payments) - 1) if len(payments) > 1 else 0
            else:
                visit_frequency = 0
            
            # Predict future value based on frequency and AOV
            # Simple model: if client visits regularly, project 2 years of future visits
            if visit_frequency > 0 and visit_frequency <= 90:  # Visits within 90 days
                annual_visits = 365 / visit_frequency
                predicted_clv = avg_order_value * annual_visits * 2  # 2-year projection
            else:
                predicted_clv = total_spent  # One-time customer
            
            # Client segmentation
            if total_spent >= 500 and visit_count >= 5:
                segment = 'vip'
            elif total_spent >= 200 and visit_count >= 3:
                segment = 'regular'
            elif visit_count >= 2:
                segment = 'returning'
            else:
                segment = 'new'
            
            client_data = {
                'client_id': client.id,
                'total_spent': float(total_spent),
                'visit_count': visit_count,
                'avg_order_value': float(avg_order_value),
                'visit_frequency': float(visit_frequency),
                'predicted_clv': float(predicted_clv),
                'segment': segment,
                'first_visit': min(p.created_at for p in payments),
                'last_visit': max(p.created_at for p in payments)
            }
            
            clv_data.append(client_data)
            total_clv += predicted_clv
        
        # Segment analysis
        segments = {
            'vip': {'count': 0, 'total_clv': 0, 'avg_clv': 0},
            'regular': {'count': 0, 'total_clv': 0, 'avg_clv': 0},
            'returning': {'count': 0, 'total_clv': 0, 'avg_clv': 0},
            'new': {'count': 0, 'total_clv': 0, 'avg_clv': 0}
        }
        
        for client in clv_data:
            segment = client['segment']
            segments[segment]['count'] += 1
            segments[segment]['total_clv'] += client['predicted_clv']
        
        # Calculate segment averages
        for segment_data in segments.values():
            if segment_data['count'] > 0:
                segment_data['avg_clv'] = segment_data['total_clv'] / segment_data['count']
        
        # Top customers
        top_customers = sorted(clv_data, key=lambda x: x['predicted_clv'], reverse=True)[:10]
        
        # At-risk customers (haven't visited in 60+ days)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        at_risk_customers = [
            client for client in clv_data 
            if client['last_visit'] < sixty_days_ago and client['segment'] in ['vip', 'regular']
        ]
        
        return {
            'summary': {
                'total_clients': len(clv_data),
                'total_clv': float(total_clv),
                'average_clv': float(total_clv / len(clv_data)) if clv_data else 0,
                'total_revenue_to_date': sum(c['total_spent'] for c in clv_data)
            },
            'segments': segments,
            'top_customers': top_customers,
            'at_risk_customers': at_risk_customers,
            'insights': {
                'highest_clv_segment': max(segments.items(), key=lambda x: x[1]['avg_clv'])[0] if segments else None,
                'retention_opportunity': len(at_risk_customers),
                'avg_visit_frequency': sum(c['visit_frequency'] for c in clv_data) / len(clv_data) if clv_data else 0,
                'avg_order_value': sum(c['avg_order_value'] for c in clv_data) / len(clv_data) if clv_data else 0
            }
        }

    def get_appointment_patterns_analytics(
        self,
        user_id: Optional[int] = None,
        date_range: Optional[DateRange] = None
    ) -> Dict[str, Any]:
        """
        Analyze appointment booking patterns, no-shows, and service popularity
        
        Args:
            user_id: Optional user ID to filter by
            date_range: Optional date range to filter by
            
        Returns:
            Dictionary containing appointment pattern analytics
        """
        query = self.db.query(Appointment)
        
        if user_id:
            query = query.filter(Appointment.user_id == user_id)
        
        if date_range:
            query = query.filter(
                and_(
                    Appointment.start_time >= date_range.start_date,
                    Appointment.start_time <= date_range.end_date
                )
            )
        
        appointments = query.all()
        
        # Booking patterns by time
        hourly_bookings = {}
        daily_bookings = {}
        monthly_bookings = {}
        
        # Service popularity
        service_stats = {}
        
        # No-show analysis
        no_show_patterns = {
            'by_hour': {},
            'by_day': {},
            'by_service': {},
            'by_advance_booking': {}  # How far in advance was it booked
        }
        
        for appointment in appointments:
            hour = appointment.start_time.hour
            day_name = appointment.start_time.strftime('%A')
            month = appointment.start_time.strftime('%Y-%m')
            service = appointment.service_name
            
            # Booking patterns
            hourly_bookings[hour] = hourly_bookings.get(hour, 0) + 1
            daily_bookings[day_name] = daily_bookings.get(day_name, 0) + 1
            monthly_bookings[month] = monthly_bookings.get(month, 0) + 1
            
            # Service statistics
            if service not in service_stats:
                service_stats[service] = {
                    'total_bookings': 0,
                    'completed': 0,
                    'cancelled': 0,
                    'no_shows': 0,
                    'total_revenue': 0,
                    'avg_price': 0
                }
            
            service_stats[service]['total_bookings'] += 1
            service_stats[service]['total_revenue'] += appointment.price or 0
            
            if appointment.status == 'completed':
                service_stats[service]['completed'] += 1
            elif appointment.status == 'cancelled':
                service_stats[service]['cancelled'] += 1
            elif appointment.status == 'no_show':
                service_stats[service]['no_shows'] += 1
            
            # No-show pattern analysis
            if appointment.status == 'no_show':
                no_show_patterns['by_hour'][hour] = no_show_patterns['by_hour'].get(hour, 0) + 1
                no_show_patterns['by_day'][day_name] = no_show_patterns['by_day'].get(day_name, 0) + 1
                no_show_patterns['by_service'][service] = no_show_patterns['by_service'].get(service, 0) + 1
                
                # Calculate advance booking time
                advance_days = (appointment.start_time.date() - appointment.created_at.date()).days
                if advance_days <= 1:
                    booking_window = 'same_day'
                elif advance_days <= 7:
                    booking_window = 'within_week'
                else:
                    booking_window = 'advance_booking'
                
                no_show_patterns['by_advance_booking'][booking_window] = \
                    no_show_patterns['by_advance_booking'].get(booking_window, 0) + 1
        
        # Calculate service averages
        for service, stats in service_stats.items():
            if stats['total_bookings'] > 0:
                stats['avg_price'] = stats['total_revenue'] / stats['total_bookings']
                stats['completion_rate'] = (stats['completed'] / stats['total_bookings']) * 100
                stats['no_show_rate'] = (stats['no_shows'] / stats['total_bookings']) * 100
        
        # Find patterns
        busiest_hour = max(hourly_bookings.items(), key=lambda x: x[1])[0] if hourly_bookings else None
        busiest_day = max(daily_bookings.items(), key=lambda x: x[1])[0] if daily_bookings else None
        most_popular_service = max(service_stats.items(), key=lambda x: x[1]['total_bookings'])[0] if service_stats else None
        
        # No-show insights
        highest_no_show_hour = max(no_show_patterns['by_hour'].items(), key=lambda x: x[1])[0] if no_show_patterns['by_hour'] else None
        highest_no_show_day = max(no_show_patterns['by_day'].items(), key=lambda x: x[1])[0] if no_show_patterns['by_day'] else None
        
        return {
            'booking_patterns': {
                'hourly_distribution': hourly_bookings,
                'daily_distribution': daily_bookings,
                'monthly_trends': monthly_bookings,
                'busiest_hour': busiest_hour,
                'busiest_day': busiest_day
            },
            'service_analytics': service_stats,
            'service_insights': {
                'most_popular_service': most_popular_service,
                'highest_revenue_service': max(service_stats.items(), key=lambda x: x[1]['total_revenue'])[0] if service_stats else None,
                'lowest_no_show_service': min(service_stats.items(), key=lambda x: x[1]['no_show_rate'])[0] if service_stats else None
            },
            'no_show_analysis': {
                'patterns': no_show_patterns,
                'insights': {
                    'highest_risk_hour': highest_no_show_hour,
                    'highest_risk_day': highest_no_show_day,
                    'same_day_booking_risk': no_show_patterns['by_advance_booking'].get('same_day', 0),
                    'total_no_shows': sum(stats['no_shows'] for stats in service_stats.values())
                }
            }
        }

    def _calculate_available_hours(
        self,
        barber_id: int,
        date_range: Optional[DateRange] = None
    ) -> float:
        """
        Calculate total available hours for a barber based on their schedule
        
        Args:
            barber_id: Barber user ID
            date_range: Optional date range to calculate for
            
        Returns:
            Total available hours as float
        """
        # Get barber's regular availability
        availability = self.db.query(BarberAvailability).filter(
            BarberAvailability.barber_id == barber_id,
            BarberAvailability.is_active == True
        ).all()
        
        if not availability:
            # Default to 8 hours per day, 5 days per week if no schedule set
            return 8 * 5 * 4  # 160 hours per month
        
        # Calculate weekly available hours
        weekly_hours = 0
        for avail in availability:
            start_hour = avail.start_time.hour + avail.start_time.minute / 60
            end_hour = avail.end_time.hour + avail.end_time.minute / 60
            weekly_hours += end_hour - start_hour
        
        # If date range is provided, calculate for that period
        if date_range:
            days = (date_range.end_date - date_range.start_date).days
            weeks = days / 7
            return weekly_hours * weeks
        
        # Default to 4 weeks (monthly calculation)
        return weekly_hours * 4

    def get_comparative_analytics(
        self,
        user_id: Optional[int] = None,
        comparison_period: str = "previous_month"
    ) -> Dict[str, Any]:
        """
        Get comparative analytics between current and previous periods
        
        Args:
            user_id: Optional user ID to filter by
            comparison_period: Period to compare against (previous_month, previous_quarter, previous_year)
            
        Returns:
            Dictionary containing comparative analytics
        """
        now = datetime.utcnow()
        
        # Define current and comparison periods
        if comparison_period == "previous_month":
            current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            current_end = now
            
            # Previous month
            if current_start.month == 1:
                prev_start = current_start.replace(year=current_start.year - 1, month=12)
            else:
                prev_start = current_start.replace(month=current_start.month - 1)
            
            prev_end = current_start - timedelta(days=1)
            prev_end = prev_end.replace(hour=23, minute=59, second=59)
            
        elif comparison_period == "previous_quarter":
            # Current quarter
            quarter = (now.month - 1) // 3 + 1
            current_start = now.replace(month=(quarter - 1) * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
            current_end = now
            
            # Previous quarter
            if quarter == 1:
                prev_quarter = 4
                prev_year = current_start.year - 1
            else:
                prev_quarter = quarter - 1
                prev_year = current_start.year
            
            prev_start = datetime(prev_year, (prev_quarter - 1) * 3 + 1, 1)
            prev_end = current_start - timedelta(days=1)
            prev_end = prev_end.replace(hour=23, minute=59, second=59)
            
        else:  # previous_year
            current_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            current_end = now
            prev_start = current_start.replace(year=current_start.year - 1)
            prev_end = current_start - timedelta(days=1)
            prev_end = prev_end.replace(hour=23, minute=59, second=59)
        
        # Get analytics for both periods
        current_range = DateRange(start_date=current_start, end_date=current_end)
        previous_range = DateRange(start_date=prev_start, end_date=prev_end)
        
        current_analytics = {
            'revenue': self.get_revenue_analytics(user_id, current_range),
            'appointments': self.get_appointment_analytics(user_id, current_range),
            'retention': self.get_client_retention_metrics(user_id, current_range)
        }
        
        previous_analytics = {
            'revenue': self.get_revenue_analytics(user_id, previous_range),
            'appointments': self.get_appointment_analytics(user_id, previous_range),
            'retention': self.get_client_retention_metrics(user_id, previous_range)
        }
        
        # Calculate percentage changes
        comparisons = {
            'revenue': {
                'current': current_analytics['revenue']['summary']['total_revenue'],
                'previous': previous_analytics['revenue']['summary']['total_revenue'],
                'change': self._calculate_percentage_change(
                    current_analytics['revenue']['summary']['total_revenue'],
                    previous_analytics['revenue']['summary']['total_revenue']
                )
            },
            'appointments': {
                'current': current_analytics['appointments']['summary']['total'],
                'previous': previous_analytics['appointments']['summary']['total'],
                'change': self._calculate_percentage_change(
                    current_analytics['appointments']['summary']['total'],
                    previous_analytics['appointments']['summary']['total']
                )
            },
            'completion_rate': {
                'current': current_analytics['appointments']['summary']['completion_rate'],
                'previous': previous_analytics['appointments']['summary']['completion_rate'],
                'change': current_analytics['appointments']['summary']['completion_rate'] - 
                         previous_analytics['appointments']['summary']['completion_rate']
            },
            'active_clients': {
                'current': current_analytics['retention']['summary']['active_clients'],
                'previous': previous_analytics['retention']['summary']['active_clients'],
                'change': self._calculate_percentage_change(
                    current_analytics['retention']['summary']['active_clients'],
                    previous_analytics['retention']['summary']['active_clients']
                )
            }
        }
        
        return {
            'period': comparison_period,
            'current_period': {
                'start': current_start.isoformat(),
                'end': current_end.isoformat()
            },
            'previous_period': {
                'start': prev_start.isoformat(),
                'end': prev_end.isoformat()
            },
            'comparisons': comparisons,
            'current_data': current_analytics,
            'previous_data': previous_analytics
        }

    # ===============================
    # AI AGENT ANALYTICS METHODS
    # ===============================

    def get_agent_analytics(
        self, 
        start_date: datetime, 
        end_date: datetime,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get comprehensive AI agent analytics with business intelligence"""
        
        try:
            from models.agent import AgentInstance, AgentConversation, ConversationStatus, AgentStatus
            from models import User
            
            # Build base query filters
            base_filters = [
                AgentConversation.created_at >= start_date,
                AgentConversation.created_at <= end_date
            ]
            
            if user_id:
                base_filters.append(AgentInstance.user_id == user_id)
            
            # Core metrics
            revenue_data = self._get_agent_revenue_metrics(base_filters)
            conversation_data = self._get_agent_conversation_metrics(base_filters)
            performance_data = self._get_agent_performance_metrics(base_filters)
            roi_data = self._get_agent_roi_analysis(base_filters)
            
            # Advanced analytics
            trend_data = self._get_agent_trend_analysis(start_date, end_date, base_filters)
            agent_comparison = self._get_agent_comparison_data(base_filters)
            
            # Business intelligence
            optimization_recommendations = self._get_agent_optimization_recommendations(
                revenue_data, conversation_data, performance_data
            )
            
            return {
                # Core Metrics
                "total_revenue": revenue_data.get("total", 0),
                "total_conversations": conversation_data.get("total", 0),
                "success_rate": performance_data.get("success_rate", 0),
                "avg_response_time": performance_data.get("avg_response_time", 0),
                "roi": roi_data.get("roi", 0),
                
                # Performance Breakdown
                "revenue_by_agent_type": revenue_data.get("by_agent_type", {}),
                "conversation_trends": trend_data.get("daily_trends", []),
                "top_performing_agents": agent_comparison.get("top_performers", []),
                
                # Business Intelligence
                "optimization_recommendations": optimization_recommendations,
                "competitive_benchmarks": self._get_competitive_benchmarks(),
                "current_period_performance": self._get_current_agent_metrics(),
                
                # Metadata
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": (end_date - start_date).days
                },
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except ImportError:
            # Agent models not available - return mock data for development
            return self._get_mock_agent_analytics(start_date, end_date)
    
    def _get_agent_revenue_metrics(self, base_filters: List) -> Dict[str, Any]:
        """Calculate agent revenue metrics"""
        try:
            from models.agent import AgentInstance, AgentConversation, ConversationStatus
            
            # Mock data for development - replace with real queries when agent system is active
            mock_revenue_data = {
                "total": 12850.0,
                "by_agent_type": {
                    "rebooking": 7800.0,
                    "birthday_wishes": 2300.0,
                    "no_show_fee": 1950.0,
                    "review_request": 800.0
                },
                "growth_rate": 23.5,
                "average_per_conversation": 85.0
            }
            
            return mock_revenue_data
            
        except ImportError:
            return {"total": 0, "by_agent_type": {}, "growth_rate": 0, "average_per_conversation": 0}
    
    def _get_agent_conversation_metrics(self, base_filters: List) -> Dict[str, Any]:
        """Calculate agent conversation metrics"""
        try:
            # Mock data for development
            mock_conversation_data = {
                "total": 152,
                "status_breakdown": {
                    "completed": 98,
                    "in_progress": 12,
                    "failed": 8,
                    "opted_out": 4
                },
                "funnel_analysis": {
                    "initiated": 152,
                    "engaged": 134,
                    "responded": 110,
                    "completed": 98
                },
                "conversion_rates": {
                    "engagement_rate": 88.2,
                    "response_rate": 72.4,
                    "completion_rate": 64.5
                }
            }
            
            return mock_conversation_data
            
        except ImportError:
            return {"total": 0, "status_breakdown": {}, "funnel_analysis": {}, "conversion_rates": {}}
    
    def _get_agent_performance_metrics(self, base_filters: List) -> Dict[str, Any]:
        """Calculate agent performance metrics"""
        try:
            # Mock data for development
            mock_performance_data = {
                "success_rate": 78.5,
                "avg_response_time": 32.0,  # minutes
                "active_agents": 6,
                "successful_conversations": 98,
                "total_completed": 125
            }
            
            return mock_performance_data
            
        except ImportError:
            return {"success_rate": 0, "avg_response_time": 0, "active_agents": 0}
    
    def _get_agent_roi_analysis(self, base_filters: List) -> Dict[str, Any]:
        """Calculate agent ROI analysis"""
        try:
            # Mock data for development
            total_revenue = 12850.0
            total_costs = 3200.0
            
            mock_roi_data = {
                "roi": total_revenue / total_costs,
                "net_profit": total_revenue - total_costs,
                "profit_margin": ((total_revenue - total_costs) / total_revenue) * 100,
                "cost_breakdown": {
                    "ai_costs": 2400.0,
                    "platform_costs": 800.0,
                    "total_costs": total_costs
                }
            }
            
            return mock_roi_data
            
        except ImportError:
            return {"roi": 0, "net_profit": 0, "profit_margin": 0, "cost_breakdown": {}}
    
    def _get_agent_trend_analysis(self, start_date: datetime, end_date: datetime, base_filters: List) -> Dict[str, Any]:
        """Analyze agent trends"""
        try:
            # Generate mock daily trends
            daily_trends = []
            current_date = start_date
            
            while current_date <= end_date:
                # Mock data with some variation
                base_conversations = 5 + (hash(current_date.strftime("%Y%m%d")) % 8)
                base_revenue = base_conversations * (60 + (hash(current_date.strftime("%Y%m%d")) % 40))
                
                daily_trends.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "conversations": base_conversations,
                    "revenue": float(base_revenue)
                })
                
                current_date += timedelta(days=1)
            
            return {
                "daily_trends": daily_trends,
                "forecasting": {
                    "next_7_days_conversations": 45,
                    "next_7_days_revenue": 3200.0,
                    "confidence_level": "medium"
                }
            }
            
        except Exception:
            return {"daily_trends": [], "forecasting": {}}
    
    def _get_agent_comparison_data(self, base_filters: List) -> Dict[str, Any]:
        """Compare agent performance"""
        try:
            # Mock data for development
            mock_comparison = {
                "top_performers": [
                    {
                        "name": "Smart Rebooking Agent",
                        "revenue": 7800.0,
                        "conversations": 89,
                        "conversion_rate": 84.3
                    },
                    {
                        "name": "Birthday Wishes Agent", 
                        "revenue": 2300.0,
                        "conversations": 28,
                        "conversion_rate": 71.4
                    },
                    {
                        "name": "No-Show Fee Collection",
                        "revenue": 1950.0,
                        "conversations": 15,
                        "conversion_rate": 93.3
                    }
                ]
            }
            
            return mock_comparison
            
        except Exception:
            return {"top_performers": []}
    
    def _get_agent_optimization_recommendations(
        self, 
        revenue_data: Dict, 
        conversation_data: Dict, 
        performance_data: Dict
    ) -> List[Dict[str, Any]]:
        """Generate optimization recommendations"""
        
        recommendations = []
        
        # Revenue optimization
        if revenue_data.get("growth_rate", 0) < 15:
            recommendations.append({
                "type": "revenue",
                "priority": "high",
                "title": "Accelerate Revenue Growth",
                "description": "Revenue growth is below target. Focus on high-performing agent types.",
                "action": "Scale rebooking agents and optimize message timing",
                "potential_impact": "20-30% revenue increase"
            })
        
        # Success rate optimization
        if performance_data.get("success_rate", 0) < 75:
            recommendations.append({
                "type": "conversion",
                "priority": "high", 
                "title": "Improve Agent Success Rate",
                "description": "Agent success rate can be improved with better targeting.",
                "action": "Implement A/B testing for agent messages",
                "potential_impact": "15-20% success rate improvement"
            })
        
        # Engagement optimization
        engagement_rate = conversation_data.get("conversion_rates", {}).get("engagement_rate", 0)
        if engagement_rate < 80:
            recommendations.append({
                "type": "engagement",
                "priority": "medium",
                "title": "Boost Client Engagement",
                "description": "Client engagement could be higher with optimized messaging.",
                "action": "Personalize messages based on client history",
                "potential_impact": "25-35% engagement improvement"
            })
        
        # Default optimization recommendations
        if not recommendations:
            recommendations.extend([
                {
                    "type": "scaling",
                    "priority": "low",
                    "title": "Scale High-Performance Agents",
                    "description": "Your agents are performing well. Consider expanding successful strategies.",
                    "action": "Deploy additional rebooking and upsell agents",
                    "potential_impact": "10-15% overall growth"
                },
                {
                    "type": "automation",
                    "priority": "low",
                    "title": "Enhance Workflow Automation",
                    "description": "Implement advanced multi-step agent workflows.",
                    "action": "Create agent sequences for complex customer journeys",
                    "potential_impact": "Improved efficiency and consistency"
                }
            ])
        
        return recommendations
    
    def _get_competitive_benchmarks(self) -> Dict[str, Any]:
        """Provide industry benchmarks"""
        return {
            "industry_averages": {
                "success_rate": 65.0,
                "avg_response_time": 45.0,
                "roi": 3.2,
                "engagement_rate": 58.0
            },
            "top_quartile": {
                "success_rate": 85.0,
                "avg_response_time": 20.0,
                "roi": 6.5,
                "engagement_rate": 78.0
            },
            "your_performance_vs_industry": "above_average"
        }
    
    def _get_current_agent_metrics(self) -> Dict[str, Any]:
        """Get current period agent metrics"""
        return {
            "today_conversations": 8,
            "today_revenue": 520.0,
            "active_conversations": 3,
            "agents_running": 6
        }
    
    def _get_mock_agent_analytics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Provide mock data when agent system is not available"""
        
        days = (end_date - start_date).days
        mock_conversations = max(1, days * 5)  # ~5 conversations per day
        mock_revenue = mock_conversations * 85.0  # ~$85 per conversation
        
        # Generate daily trends
        daily_trends = []
        current_date = start_date
        
        while current_date <= end_date:
            base_conversations = 3 + (hash(current_date.strftime("%Y%m%d")) % 6)
            base_revenue = base_conversations * (70 + (hash(current_date.strftime("%Y%m%d")) % 30))
            
            daily_trends.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "conversations": base_conversations,
                "revenue": float(base_revenue)
            })
            
            current_date += timedelta(days=1)
        
        return {
            "total_revenue": mock_revenue,
            "total_conversations": mock_conversations,
            "success_rate": 78.5,
            "avg_response_time": 32.0,
            "roi": 4.2,
            "revenue_by_agent_type": {
                "rebooking": mock_revenue * 0.6,
                "birthday_wishes": mock_revenue * 0.18,
                "no_show_fee": mock_revenue * 0.15,
                "review_request": mock_revenue * 0.07
            },
            "conversation_trends": daily_trends,
            "top_performing_agents": [
                {
                    "name": "Smart Rebooking Agent",
                    "revenue": mock_revenue * 0.6,
                    "conversion_rate": 84.3
                },
                {
                    "name": "Birthday Agent",
                    "revenue": mock_revenue * 0.18,
                    "conversion_rate": 71.4
                },
                {
                    "name": "No-Show Collection",
                    "revenue": mock_revenue * 0.15,
                    "conversion_rate": 93.3
                }
            ],
            "optimization_recommendations": [
                {
                    "type": "scaling",
                    "priority": "high",
                    "title": "Scale Successful Agent Types",
                    "description": "Your rebooking agents are performing exceptionally well.",
                    "action": "Deploy additional rebooking agents during peak hours",
                    "potential_impact": "25-35% revenue increase"
                }
            ],
            "competitive_benchmarks": self._get_competitive_benchmarks(),
            "current_period_performance": self._get_current_agent_metrics(),
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "last_updated": datetime.utcnow().isoformat()
        }
    
    def get_detailed_revenue_breakdown(
        self,
        user_ids: List[int],
        date_range: Optional[DateRange] = None,
        breakdown_by: str = "all"
    ) -> Dict[str, Any]:
        """
        Get detailed revenue breakdown aligned with Six Figure Barber methodology
        
        Args:
            user_ids: List of user IDs for organization filtering
            date_range: Optional date range to filter by
            breakdown_by: Type of breakdown (all, service, time, client_type, premium)
            
        Returns:
            Comprehensive revenue breakdown data
        """
        # Base payment query
        query = self.db.query(Payment).filter(
            Payment.user_id.in_(user_ids),
            Payment.status == 'completed'
        )
        
        if date_range:
            query = query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        payments = query.all()
        
        # Calculate breakdown based on type
        breakdown_data = {
            "summary": self._calculate_revenue_summary(payments),
            "date_range": {
                "start": date_range.start_date.isoformat() if date_range else None,
                "end": date_range.end_date.isoformat() if date_range else None
            }
        }
        
        if breakdown_by == "all" or breakdown_by == "service":
            breakdown_data["by_service"] = self._breakdown_by_service(payments, user_ids)
        
        if breakdown_by == "all" or breakdown_by == "time":
            breakdown_data["by_time"] = self._breakdown_by_time(payments)
        
        if breakdown_by == "all" or breakdown_by == "client_type":
            breakdown_data["by_client_type"] = self._breakdown_by_client_type(payments, user_ids)
        
        if breakdown_by == "all" or breakdown_by == "premium":
            breakdown_data["premium_analysis"] = self._analyze_premium_services(payments, user_ids)
        
        # Six Figure Barber specific metrics
        breakdown_data["six_figure_metrics"] = self._calculate_six_figure_metrics(payments, user_ids, date_range)
        
        return breakdown_data
    
    def _calculate_revenue_summary(self, payments: List[Payment]) -> Dict[str, Any]:
        """Calculate summary revenue statistics"""
        if not payments:
            return {
                "total_revenue": 0.0,
                "transaction_count": 0,
                "average_transaction": 0.0,
                "highest_transaction": 0.0,
                "lowest_transaction": 0.0
            }
        
        amounts = [float(p.amount) for p in payments]
        return {
            "total_revenue": sum(amounts),
            "transaction_count": len(payments),
            "average_transaction": sum(amounts) / len(amounts),
            "highest_transaction": max(amounts),
            "lowest_transaction": min(amounts)
        }
    
    def _breakdown_by_service(self, payments: List[Payment], user_ids: List[int]) -> Dict[str, Any]:
        """Breakdown revenue by service category"""
        # Get appointments linked to payments
        appointment_ids = [p.appointment_id for p in payments if p.appointment_id]
        appointments = self.db.query(Appointment).filter(
            Appointment.id.in_(appointment_ids)
        ).all()
        
        # Get services
        service_ids = [a.service_id for a in appointments if a.service_id]
        services = self.db.query(Service).filter(Service.id.in_(service_ids)).all()
        service_map = {s.id: s for s in services}
        
        # Create appointment to payment mapping
        appointment_payment_map = {p.appointment_id: float(p.amount) for p in payments if p.appointment_id}
        
        # Calculate revenue by service
        service_revenue = {}
        for appointment in appointments:
            if appointment.service_id and appointment.id in appointment_payment_map:
                service = service_map.get(appointment.service_id)
                if service:
                    service_name = service.name
                    service_category = service.category or "Uncategorized"
                    
                    if service_category not in service_revenue:
                        service_revenue[service_category] = {
                            "total": 0.0,
                            "count": 0,
                            "services": {}
                        }
                    
                    if service_name not in service_revenue[service_category]["services"]:
                        service_revenue[service_category]["services"][service_name] = {
                            "revenue": 0.0,
                            "count": 0,
                            "average": 0.0
                        }
                    
                    amount = appointment_payment_map[appointment.id]
                    service_revenue[service_category]["total"] += amount
                    service_revenue[service_category]["count"] += 1
                    service_revenue[service_category]["services"][service_name]["revenue"] += amount
                    service_revenue[service_category]["services"][service_name]["count"] += 1
        
        # Calculate averages
        for category in service_revenue.values():
            for service in category["services"].values():
                if service["count"] > 0:
                    service["average"] = service["revenue"] / service["count"]
        
        return service_revenue
    
    def _breakdown_by_time(self, payments: List[Payment]) -> Dict[str, Any]:
        """Breakdown revenue by time periods"""
        time_breakdown = {
            "by_hour": {},
            "by_day_of_week": {},
            "by_month": {},
            "peak_hours": [],
            "peak_days": []
        }
        
        for payment in payments:
            # Hour of day
            hour = payment.created_at.hour
            hour_key = f"{hour:02d}:00"
            if hour_key not in time_breakdown["by_hour"]:
                time_breakdown["by_hour"][hour_key] = {"revenue": 0.0, "count": 0}
            time_breakdown["by_hour"][hour_key]["revenue"] += float(payment.amount)
            time_breakdown["by_hour"][hour_key]["count"] += 1
            
            # Day of week
            day_name = payment.created_at.strftime("%A")
            if day_name not in time_breakdown["by_day_of_week"]:
                time_breakdown["by_day_of_week"][day_name] = {"revenue": 0.0, "count": 0}
            time_breakdown["by_day_of_week"][day_name]["revenue"] += float(payment.amount)
            time_breakdown["by_day_of_week"][day_name]["count"] += 1
            
            # Month
            month_key = payment.created_at.strftime("%Y-%m")
            if month_key not in time_breakdown["by_month"]:
                time_breakdown["by_month"][month_key] = {"revenue": 0.0, "count": 0}
            time_breakdown["by_month"][month_key]["revenue"] += float(payment.amount)
            time_breakdown["by_month"][month_key]["count"] += 1
        
        # Identify peak periods
        if time_breakdown["by_hour"]:
            sorted_hours = sorted(time_breakdown["by_hour"].items(), 
                                key=lambda x: x[1]["revenue"], reverse=True)
            time_breakdown["peak_hours"] = [
                {"hour": h[0], "revenue": h[1]["revenue"]} 
                for h in sorted_hours[:3]
            ]
        
        if time_breakdown["by_day_of_week"]:
            sorted_days = sorted(time_breakdown["by_day_of_week"].items(), 
                               key=lambda x: x[1]["revenue"], reverse=True)
            time_breakdown["peak_days"] = [
                {"day": d[0], "revenue": d[1]["revenue"]} 
                for d in sorted_days[:3]
            ]
        
        return time_breakdown
    
    def _breakdown_by_client_type(self, payments: List[Payment], user_ids: List[int]) -> Dict[str, Any]:
        """Breakdown revenue by client type (new vs returning)"""
        client_breakdown = {
            "new_clients": {"revenue": 0.0, "count": 0},
            "returning_clients": {"revenue": 0.0, "count": 0},
            "client_segments": {}
        }
        
        # Get client IDs from payments
        client_ids = [p.client_id for p in payments if p.client_id]
        clients = self.db.query(Client).filter(Client.id.in_(client_ids)).all()
        client_map = {c.id: c for c in clients}
        
        for payment in payments:
            if payment.client_id and payment.client_id in client_map:
                client = client_map[payment.client_id]
                amount = float(payment.amount)
                
                # Determine if new or returning (simplified - check if created within 30 days)
                days_since_creation = (payment.created_at - client.created_at).days
                is_new = days_since_creation <= 30
                
                if is_new:
                    client_breakdown["new_clients"]["revenue"] += amount
                    client_breakdown["new_clients"]["count"] += 1
                else:
                    client_breakdown["returning_clients"]["revenue"] += amount
                    client_breakdown["returning_clients"]["count"] += 1
                
                # Segment by lifetime value
                # Get all payments for this client
                client_total = self.db.query(func.sum(Payment.amount)).filter(
                    Payment.client_id == client.id,
                    Payment.status == 'completed'
                ).scalar() or 0
                
                if client_total < 100:
                    segment = "bronze"
                elif client_total < 500:
                    segment = "silver"
                elif client_total < 1000:
                    segment = "gold"
                else:
                    segment = "platinum"
                
                if segment not in client_breakdown["client_segments"]:
                    client_breakdown["client_segments"][segment] = {
                        "revenue": 0.0,
                        "count": 0,
                        "average": 0.0
                    }
                
                client_breakdown["client_segments"][segment]["revenue"] += amount
                client_breakdown["client_segments"][segment]["count"] += 1
        
        # Calculate averages
        for segment in client_breakdown["client_segments"].values():
            if segment["count"] > 0:
                segment["average"] = segment["revenue"] / segment["count"]
        
        return client_breakdown
    
    def _analyze_premium_services(self, payments: List[Payment], user_ids: List[int]) -> Dict[str, Any]:
        """Analyze premium service adoption and performance"""
        # Get appointments and services
        appointment_ids = [p.appointment_id for p in payments if p.appointment_id]
        appointments = self.db.query(Appointment).filter(
            Appointment.id.in_(appointment_ids)
        ).all()
        
        service_ids = [a.service_id for a in appointments if a.service_id]
        services = self.db.query(Service).filter(Service.id.in_(service_ids)).all()
        
        # Define premium threshold (services over $50)
        premium_threshold = 50.0
        
        premium_analysis = {
            "premium_revenue": 0.0,
            "standard_revenue": 0.0,
            "premium_count": 0,
            "standard_count": 0,
            "premium_services": [],
            "upsell_opportunities": []
        }
        
        # Create service price map
        service_prices = {s.id: float(s.price) for s in services}
        
        # Analyze each payment
        for appointment in appointments:
            if appointment.service_id in service_prices:
                service_price = service_prices[appointment.service_id]
                payment = next((p for p in payments if p.appointment_id == appointment.id), None)
                
                if payment:
                    amount = float(payment.amount)
                    service = next((s for s in services if s.id == appointment.service_id), None)
                    
                    if service_price >= premium_threshold:
                        premium_analysis["premium_revenue"] += amount
                        premium_analysis["premium_count"] += 1
                        
                        # Track premium services
                        existing = next((ps for ps in premium_analysis["premium_services"] 
                                       if ps["name"] == service.name), None)
                        if existing:
                            existing["revenue"] += amount
                            existing["count"] += 1
                        else:
                            premium_analysis["premium_services"].append({
                                "name": service.name,
                                "revenue": amount,
                                "count": 1,
                                "base_price": service_price
                            })
                    else:
                        premium_analysis["standard_revenue"] += amount
                        premium_analysis["standard_count"] += 1
        
        # Calculate metrics
        total_revenue = premium_analysis["premium_revenue"] + premium_analysis["standard_revenue"]
        if total_revenue > 0:
            premium_analysis["premium_percentage"] = (premium_analysis["premium_revenue"] / total_revenue) * 100
        else:
            premium_analysis["premium_percentage"] = 0.0
        
        # Sort premium services by revenue
        premium_analysis["premium_services"].sort(key=lambda x: x["revenue"], reverse=True)
        
        # Identify upsell opportunities
        if premium_analysis["premium_percentage"] < 30:
            premium_analysis["upsell_opportunities"].append({
                "opportunity": "Low premium adoption",
                "recommendation": "Promote premium services to increase average ticket",
                "potential_impact": "15-25% revenue increase"
            })
        
        return premium_analysis
    
    def _calculate_six_figure_metrics(
        self, 
        payments: List[Payment], 
        user_ids: List[int],
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Calculate metrics specific to Six Figure Barber methodology"""
        # Calculate annual run rate
        total_revenue = sum(float(p.amount) for p in payments)
        
        if date_range:
            days_in_range = (date_range.end_date - date_range.start_date).days
        else:
            # Default to 30 days if no range specified
            days_in_range = 30
        
        daily_average = total_revenue / days_in_range if days_in_range > 0 else 0
        annual_run_rate = daily_average * 365
        
        # Calculate path to six figures
        six_figure_target = 100000
        progress_percentage = (annual_run_rate / six_figure_target) * 100
        
        # Calculate required metrics to reach six figures
        working_days_per_year = 250  # Assuming 5 days/week, 50 weeks/year
        required_daily_revenue = six_figure_target / working_days_per_year
        current_daily_revenue = total_revenue / days_in_range if days_in_range > 0 else 0
        revenue_gap = required_daily_revenue - current_daily_revenue
        
        # Get average ticket price
        avg_ticket = total_revenue / len(payments) if payments else 0
        
        # Calculate required improvements
        required_metrics = {
            "current_annual_run_rate": annual_run_rate,
            "progress_to_six_figures": progress_percentage,
            "daily_revenue_gap": max(0, revenue_gap),
            "current_daily_average": current_daily_revenue,
            "required_daily_average": required_daily_revenue,
            "current_average_ticket": avg_ticket
        }
        
        # Recommendations based on gap
        if revenue_gap > 0:
            if avg_ticket > 0:
                additional_daily_clients = revenue_gap / avg_ticket
                required_metrics["additional_daily_clients_needed"] = additional_daily_clients
                
                # Price increase recommendation
                price_increase_needed = (revenue_gap / current_daily_revenue * 100) if current_daily_revenue > 0 else 0
                required_metrics["recommended_price_increase_percentage"] = price_increase_needed
        
        # Achievement tracking
        milestones = {
            "reached_50k": annual_run_rate >= 50000,
            "reached_75k": annual_run_rate >= 75000,
            "reached_100k": annual_run_rate >= 100000,
            "reached_150k": annual_run_rate >= 150000,
            "next_milestone": self._get_next_milestone(annual_run_rate)
        }
        
        return {
            "financial_metrics": required_metrics,
            "milestones": milestones,
            "recommendations": self._generate_six_figure_recommendations(required_metrics)
        }
    
    def _get_next_milestone(self, current_run_rate: float) -> Dict[str, Any]:
        """Determine next milestone based on current run rate"""
        milestones = [50000, 75000, 100000, 150000, 200000]
        
        for milestone in milestones:
            if current_run_rate < milestone:
                return {
                    "target": milestone,
                    "remaining": milestone - current_run_rate,
                    "percentage_complete": (current_run_rate / milestone) * 100
                }
        
        return {
            "target": 250000,
            "remaining": 250000 - current_run_rate,
            "percentage_complete": (current_run_rate / 250000) * 100
        }
    
    def _generate_six_figure_recommendations(self, metrics: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate recommendations based on Six Figure Barber methodology"""
        recommendations = []
        
        if metrics["progress_to_six_figures"] < 50:
            recommendations.append({
                "priority": "high",
                "category": "revenue",
                "title": "Significant Revenue Growth Needed",
                "description": f"You're at {metrics['progress_to_six_figures']:.1f}% of six-figure goal",
                "action": "Focus on premium service adoption and client acquisition"
            })
        
        if metrics.get("recommended_price_increase_percentage", 0) > 10:
            recommendations.append({
                "priority": "high",
                "category": "pricing",
                "title": "Price Optimization Opportunity",
                "description": f"Consider a {metrics['recommended_price_increase_percentage']:.1f}% price increase",
                "action": "Review and adjust service pricing to reflect value"
            })
        
        if metrics.get("additional_daily_clients_needed", 0) > 3:
            recommendations.append({
                "priority": "medium",
                "category": "capacity",
                "title": "Increase Daily Client Volume",
                "description": f"Need {metrics['additional_daily_clients_needed']:.1f} more clients per day",
                "action": "Optimize schedule and marketing to attract more clients"
            })
        
        return recommendations