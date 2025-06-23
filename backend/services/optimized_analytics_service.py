"""
Optimized Analytics Service with Query Performance Improvements
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text, case, extract
from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
from models.appointment import Appointment
from models.barber import Barber
from models.client import Client
from models.user import User
from models.location import Location
import logging

logger = logging.getLogger(__name__)


class OptimizedAnalyticsService:
    """Optimized analytics service with performance improvements."""

    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_metrics(
        self,
        start_date: date,
        end_date: date,
        location_id: Optional[int] = None,
        barber_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get dashboard metrics with optimized single query approach."""

        # Build base query with all metrics in one go
        base_query = self.db.query(
            # Revenue metrics
            func.sum(
                func.coalesce(Appointment.service_revenue, 0)
                + func.coalesce(Appointment.tip_amount, 0)
                + func.coalesce(Appointment.product_revenue, 0)
            ).label("total_revenue"),
            func.sum(func.coalesce(Appointment.service_revenue, 0)).label(
                "service_revenue"
            ),
            func.sum(func.coalesce(Appointment.tip_amount, 0)).label("tip_revenue"),
            func.sum(func.coalesce(Appointment.product_revenue, 0)).label(
                "product_revenue"
            ),
            # Appointment counts
            func.count(Appointment.id).label("total_appointments"),
            func.sum(case((Appointment.status == "completed", 1), else_=0)).label(
                "completed_appointments"
            ),
            func.sum(case((Appointment.status == "cancelled", 1), else_=0)).label(
                "cancelled_appointments"
            ),
            func.sum(case((Appointment.status == "no_show", 1), else_=0)).label(
                "no_show_appointments"
            ),
            # Client metrics
            func.count(func.distinct(Appointment.client_id)).label("unique_clients"),
            func.sum(case((Appointment.customer_type == "new", 1), else_=0)).label(
                "new_clients"
            ),
            func.sum(
                case((Appointment.customer_type == "returning", 1), else_=0)
            ).label("returning_clients"),
            # Average metrics
            func.avg(
                func.coalesce(Appointment.service_revenue, 0)
                + func.coalesce(Appointment.tip_amount, 0)
                + func.coalesce(Appointment.product_revenue, 0)
            ).label("avg_ticket"),
            func.avg(func.coalesce(Appointment.duration_minutes, 60)).label(
                "avg_duration"
            ),
        ).filter(
            and_(
                func.date(Appointment.appointment_date) >= start_date,
                func.date(Appointment.appointment_date) <= end_date,
            )
        )

        # Apply filters
        if location_id:
            base_query = base_query.join(Barber).filter(
                Barber.location_id == location_id
            )
        if barber_id:
            base_query = base_query.filter(Appointment.barber_id == barber_id)

        result = base_query.first()

        # Calculate additional metrics
        completion_rate = 0
        if result.total_appointments > 0:
            completion_rate = (
                result.completed_appointments / result.total_appointments
            ) * 100

        no_show_rate = 0
        if result.total_appointments > 0:
            no_show_rate = (
                result.no_show_appointments / result.total_appointments
            ) * 100

        return {
            "revenue": {
                "total": float(result.total_revenue or 0),
                "service": float(result.service_revenue or 0),
                "tips": float(result.tip_revenue or 0),
                "products": float(result.product_revenue or 0),
                "average_ticket": float(result.avg_ticket or 0),
            },
            "appointments": {
                "total": result.total_appointments or 0,
                "completed": result.completed_appointments or 0,
                "cancelled": result.cancelled_appointments or 0,
                "no_shows": result.no_show_appointments or 0,
                "completion_rate": round(completion_rate, 1),
                "no_show_rate": round(no_show_rate, 1),
                "average_duration": int(result.avg_duration or 60),
            },
            "clients": {
                "total_unique": result.unique_clients or 0,
                "new": result.new_clients or 0,
                "returning": result.returning_clients or 0,
                "retention_rate": round(
                    (result.returning_clients / max(result.unique_clients, 1)) * 100, 1
                ),
            },
        }

    def get_revenue_trends(
        self,
        start_date: date,
        end_date: date,
        location_id: Optional[int] = None,
        grouping: str = "daily",
    ) -> List[Dict[str, Any]]:
        """Get revenue trends with optimized grouping."""

        # Determine grouping function
        if grouping == "daily":
            date_func = func.date(Appointment.appointment_date)
            date_format = "%Y-%m-%d"
        elif grouping == "weekly":
            date_func = func.date_trunc("week", Appointment.appointment_date)
            date_format = "%Y-W%V"
        elif grouping == "monthly":
            date_func = func.date_trunc("month", Appointment.appointment_date)
            date_format = "%Y-%m"
        else:
            date_func = func.date(Appointment.appointment_date)
            date_format = "%Y-%m-%d"

        query = self.db.query(
            date_func.label("period"),
            func.sum(
                func.coalesce(Appointment.service_revenue, 0)
                + func.coalesce(Appointment.tip_amount, 0)
                + func.coalesce(Appointment.product_revenue, 0)
            ).label("revenue"),
            func.count(Appointment.id).label("appointments"),
            func.sum(case((Appointment.status == "completed", 1), else_=0)).label(
                "completed"
            ),
        ).filter(
            and_(
                Appointment.status == "completed",
                func.date(Appointment.appointment_date) >= start_date,
                func.date(Appointment.appointment_date) <= end_date,
            )
        )

        if location_id:
            query = query.join(Barber).filter(Barber.location_id == location_id)

        results = query.group_by(date_func).order_by(date_func).all()

        return [
            {
                "period": (
                    result.period.strftime(date_format)
                    if hasattr(result.period, "strftime")
                    else str(result.period)
                ),
                "revenue": float(result.revenue or 0),
                "appointments": result.appointments or 0,
                "completed": result.completed or 0,
            }
            for result in results
        ]

    def get_barber_performance_summary(
        self, start_date: date, end_date: date, location_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get barber performance with single optimized query."""

        query = (
            self.db.query(
                Barber.id,
                User.first_name,
                User.last_name,
                func.count(Appointment.id).label("total_appointments"),
                func.sum(case((Appointment.status == "completed", 1), else_=0)).label(
                    "completed_appointments"
                ),
                func.sum(
                    case(
                        (
                            Appointment.status == "completed",
                            func.coalesce(Appointment.service_revenue, 0)
                            + func.coalesce(Appointment.tip_amount, 0)
                            + func.coalesce(Appointment.product_revenue, 0),
                        ),
                        else_=0,
                    )
                ).label("total_revenue"),
                func.avg(
                    case(
                        (
                            Appointment.status == "completed",
                            func.coalesce(Appointment.service_revenue, 0)
                            + func.coalesce(Appointment.tip_amount, 0)
                            + func.coalesce(Appointment.product_revenue, 0),
                        )
                    )
                ).label("avg_ticket"),
                func.count(func.distinct(Appointment.client_id)).label(
                    "unique_clients"
                ),
                func.avg(func.coalesce(Appointment.client_satisfaction, 4.5)).label(
                    "avg_rating"
                ),
            )
            .select_from(Barber)
            .join(User, Barber.user_id == User.id)
            .outerjoin(
                Appointment,
                and_(
                    Appointment.barber_id == Barber.id,
                    func.date(Appointment.appointment_date) >= start_date,
                    func.date(Appointment.appointment_date) <= end_date,
                ),
            )
        )

        if location_id:
            query = query.filter(Barber.location_id == location_id)

        query = query.filter(Barber.is_active == True)
        results = query.group_by(Barber.id, User.first_name, User.last_name).all()

        performance_data = []
        for result in results:
            completion_rate = 0
            if result.total_appointments > 0:
                completion_rate = (
                    result.completed_appointments / result.total_appointments
                ) * 100

            performance_data.append(
                {
                    "barber_id": result.id,
                    "name": f"{result.first_name} {result.last_name}",
                    "appointments": {
                        "total": result.total_appointments or 0,
                        "completed": result.completed_appointments or 0,
                        "completion_rate": round(completion_rate, 1),
                    },
                    "revenue": {
                        "total": float(result.total_revenue or 0),
                        "average_ticket": float(result.avg_ticket or 0),
                    },
                    "clients": {"unique": result.unique_clients or 0},
                    "rating": round(float(result.avg_rating or 4.5), 1),
                }
            )

        # Sort by total revenue
        performance_data.sort(key=lambda x: x["revenue"]["total"], reverse=True)

        return performance_data

    def get_service_analytics(
        self, start_date: date, end_date: date, location_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get service performance analytics."""

        query = self.db.query(
            Appointment.service_name,
            func.count(Appointment.id).label("bookings"),
            func.sum(
                case(
                    (
                        Appointment.status == "completed",
                        func.coalesce(Appointment.service_revenue, 0),
                    ),
                    else_=0,
                )
            ).label("revenue"),
            func.avg(func.coalesce(Appointment.duration_minutes, 60)).label(
                "avg_duration"
            ),
            func.sum(case((Appointment.status == "completed", 1), else_=0)).label(
                "completed"
            ),
            func.sum(case((Appointment.status == "cancelled", 1), else_=0)).label(
                "cancelled"
            ),
        ).filter(
            and_(
                func.date(Appointment.appointment_date) >= start_date,
                func.date(Appointment.appointment_date) <= end_date,
                Appointment.service_name.isnot(None),
            )
        )

        if location_id:
            query = query.join(Barber).filter(Barber.location_id == location_id)

        results = (
            query.group_by(Appointment.service_name)
            .order_by(func.count(Appointment.id).desc())
            .all()
        )

        return [
            {
                "service_name": result.service_name,
                "bookings": result.bookings or 0,
                "revenue": float(result.revenue or 0),
                "avg_duration": int(result.avg_duration or 60),
                "completed": result.completed or 0,
                "cancelled": result.cancelled or 0,
                "completion_rate": round(
                    (result.completed / max(result.bookings, 1)) * 100, 1
                ),
            }
            for result in results
        ]

    def get_peak_hours_heatmap(
        self, start_date: date, end_date: date, location_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get peak hours heatmap data with single query."""

        query = self.db.query(
            extract("dow", Appointment.appointment_date).label("day_of_week"),
            extract("hour", Appointment.appointment_time).label("hour"),
            func.count(Appointment.id).label("bookings"),
            func.sum(case((Appointment.status == "completed", 1), else_=0)).label(
                "completed"
            ),
        ).filter(
            and_(
                func.date(Appointment.appointment_date) >= start_date,
                func.date(Appointment.appointment_date) <= end_date,
                Appointment.appointment_time.isnot(None),
            )
        )

        if location_id:
            query = query.join(Barber).filter(Barber.location_id == location_id)

        results = query.group_by(
            extract("dow", Appointment.appointment_date),
            extract("hour", Appointment.appointment_time),
        ).all()

        # Map day numbers to names
        day_names = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ]

        return [
            {
                "day": day_names[int(result.day_of_week)],
                "hour": int(result.hour),
                "bookings": result.bookings or 0,
                "completed": result.completed or 0,
                "completion_rate": round(
                    (result.completed / max(result.bookings, 1)) * 100, 1
                ),
            }
            for result in results
        ]

    def get_client_retention_metrics(
        self, start_date: date, end_date: date, location_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get client retention metrics with optimized queries."""

        # Base client query
        client_query = self.db.query(Client.id, Client.barber_id)
        if location_id:
            client_query = client_query.join(Barber).filter(
                Barber.location_id == location_id
            )

        # Get retention metrics using subqueries for better performance
        current_period_clients = self.db.query(
            func.count(func.distinct(Appointment.client_id)).label("current_clients")
        ).filter(
            and_(
                func.date(Appointment.appointment_date) >= start_date,
                func.date(Appointment.appointment_date) <= end_date,
                Appointment.status == "completed",
            )
        )

        if location_id:
            current_period_clients = current_period_clients.join(Barber).filter(
                Barber.location_id == location_id
            )

        current_count = current_period_clients.scalar() or 0

        # Previous period for comparison
        period_length = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_length)
        prev_end = start_date - timedelta(days=1)

        prev_period_clients = self.db.query(
            func.count(func.distinct(Appointment.client_id)).label("prev_clients")
        ).filter(
            and_(
                func.date(Appointment.appointment_date) >= prev_start,
                func.date(Appointment.appointment_date) <= prev_end,
                Appointment.status == "completed",
            )
        )

        if location_id:
            prev_period_clients = prev_period_clients.join(Barber).filter(
                Barber.location_id == location_id
            )

        prev_count = prev_period_clients.scalar() or 0

        # Calculate retention rate (simplified)
        retention_rate = 0
        if prev_count > 0:
            # Count clients who visited in both periods
            returning_clients = (
                self.db.query(func.count(func.distinct(Appointment.client_id)))
                .filter(
                    and_(
                        func.date(Appointment.appointment_date) >= start_date,
                        func.date(Appointment.appointment_date) <= end_date,
                        Appointment.status == "completed",
                        Appointment.client_id.in_(
                            self.db.query(Appointment.client_id).filter(
                                and_(
                                    func.date(Appointment.appointment_date)
                                    >= prev_start,
                                    func.date(Appointment.appointment_date) <= prev_end,
                                    Appointment.status == "completed",
                                )
                            )
                        ),
                    )
                )
                .scalar()
                or 0
            )

            retention_rate = (returning_clients / prev_count) * 100

        return {
            "current_period_clients": current_count,
            "previous_period_clients": prev_count,
            "retention_rate": round(retention_rate, 1),
            "new_clients": max(0, current_count - prev_count),
            "growth_rate": round(
                ((current_count - prev_count) / max(prev_count, 1)) * 100, 1
            ),
        }

    def get_comprehensive_dashboard(
        self, start_date: date, end_date: date, location_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get comprehensive dashboard data with minimal queries."""

        return {
            "summary_metrics": self.get_dashboard_metrics(
                start_date, end_date, location_id
            ),
            "revenue_trends": self.get_revenue_trends(
                start_date, end_date, location_id, "daily"
            ),
            "barber_performance": self.get_barber_performance_summary(
                start_date, end_date, location_id
            ),
            "service_analytics": self.get_service_analytics(
                start_date, end_date, location_id
            ),
            "peak_hours": self.get_peak_hours_heatmap(
                start_date, end_date, location_id
            ),
            "retention_metrics": self.get_client_retention_metrics(
                start_date, end_date, location_id
            ),
        }
