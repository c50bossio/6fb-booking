from typing import Dict, List, Optional, Tuple
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from models import Appointment, Client, Barber, DailyMetrics, WeeklyMetrics
from utils.cache import cache_result, monitor_performance


class SixFBCalculator:
    """
    Core 6FB calculations service
    Automates the metrics currently calculated in the 6FB tracking spreadsheet
    """

    def __init__(self, db: Session):
        self.db = db

    @cache_result(ttl_seconds=900, key_prefix="daily_metrics")  # Cache for 15 minutes
    @monitor_performance
    def calculate_daily_metrics(self, barber_id: int, target_date: date) -> Dict:
        """
        Calculate daily metrics for a specific barber and date
        Matches the daily calculations from the current 6FB spreadsheet
        """
        # Get all appointments for the day
        appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date == target_date,
                    Appointment.status.in_(["completed", "scheduled"]),
                )
            )
            .all()
        )

        completed_appointments = [
            apt for apt in appointments if apt.status == "completed"
        ]

        # Basic counts
        total_appointments = len(appointments)
        completed_count = len(completed_appointments)

        # Revenue calculations (matching spreadsheet columns)
        total_service_revenue = sum(
            apt.service_revenue or 0 for apt in completed_appointments
        )
        total_tips = sum(apt.tip_amount or 0 for apt in completed_appointments)
        total_product_revenue = sum(
            apt.product_revenue or 0 for apt in completed_appointments
        )
        total_revenue = total_service_revenue + total_tips + total_product_revenue

        # Customer type breakdown
        new_customers = [
            apt for apt in completed_appointments if apt.customer_type == "new"
        ]
        returning_customers = [
            apt for apt in completed_appointments if apt.customer_type == "returning"
        ]

        new_customer_count = len(new_customers)
        returning_customer_count = len(returning_customers)
        new_customer_revenue = sum(apt.total_revenue for apt in new_customers)
        returning_customer_revenue = sum(
            apt.total_revenue for apt in returning_customers
        )

        # Average calculations
        average_ticket = total_revenue / completed_count if completed_count > 0 else 0
        average_service_revenue = (
            total_service_revenue / completed_count if completed_count > 0 else 0
        )
        average_tip_percentage = (
            (total_tips / total_service_revenue * 100)
            if total_service_revenue > 0
            else 0
        )

        # Get barber's daily capacity target
        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        daily_capacity = (
            barber.target_booking_capacity or 40
        ) // 7  # Weekly target / 7 days
        booking_rate = (
            (completed_count / daily_capacity * 100) if daily_capacity > 0 else 0
        )

        return {
            "date": target_date,
            "total_appointments": total_appointments,
            "completed_appointments": completed_count,
            "total_service_revenue": round(total_service_revenue, 2),
            "total_tips": round(total_tips, 2),
            "total_product_revenue": round(total_product_revenue, 2),
            "total_revenue": round(total_revenue, 2),
            "new_customers": new_customer_count,
            "returning_customers": returning_customer_count,
            "new_customer_revenue": round(new_customer_revenue, 2),
            "returning_customer_revenue": round(returning_customer_revenue, 2),
            "average_ticket": round(average_ticket, 2),
            "average_service_revenue": round(average_service_revenue, 2),
            "average_tip_percentage": round(average_tip_percentage, 1),
            "booking_capacity": daily_capacity,
            "booking_rate": round(booking_rate, 1),
            "revenue_per_hour": (
                round(total_revenue / 8, 2) if total_revenue > 0 else 0
            ),  # Assuming 8-hour workday
        }

    @cache_result(ttl_seconds=1800, key_prefix="weekly_metrics")  # Cache for 30 minutes
    @monitor_performance
    def calculate_weekly_metrics(self, barber_id: int, week_start: date) -> Dict:
        """
        Calculate weekly metrics for a specific barber and week
        Week starts on Monday to match 6FB methodology
        """
        week_end = week_start + timedelta(days=6)

        # Get all appointments for the week
        appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= week_start,
                    Appointment.appointment_date <= week_end,
                    Appointment.status.in_(["completed", "scheduled"]),
                )
            )
            .all()
        )

        completed_appointments = [
            apt for apt in appointments if apt.status == "completed"
        ]

        # Aggregate daily metrics for the week
        weekly_totals = {
            "total_appointments": len(appointments),
            "completed_appointments": len(completed_appointments),
            "total_service_revenue": sum(
                apt.service_revenue or 0 for apt in completed_appointments
            ),
            "total_tips": sum(apt.tip_amount or 0 for apt in completed_appointments),
            "total_product_revenue": sum(
                apt.product_revenue or 0 for apt in completed_appointments
            ),
            "new_customers": len(
                [apt for apt in completed_appointments if apt.customer_type == "new"]
            ),
            "returning_customers": len(
                [
                    apt
                    for apt in completed_appointments
                    if apt.customer_type == "returning"
                ]
            ),
        }

        weekly_totals["total_revenue"] = (
            weekly_totals["total_service_revenue"]
            + weekly_totals["total_tips"]
            + weekly_totals["total_product_revenue"]
        )

        # Calculate unique customers served
        unique_customers = len(set(apt.client_id for apt in completed_appointments))

        # Weekly averages and rates
        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        weekly_capacity = barber.target_booking_capacity or 40
        booking_rate = (
            (weekly_totals["completed_appointments"] / weekly_capacity * 100)
            if weekly_capacity > 0
            else 0
        )

        average_ticket = (
            weekly_totals["total_revenue"] / weekly_totals["completed_appointments"]
            if weekly_totals["completed_appointments"] > 0
            else 0
        )

        # Calculate week-over-week growth
        previous_week_start = week_start - timedelta(days=7)
        previous_week_metrics = (
            self.calculate_weekly_metrics(barber_id, previous_week_start)
            if week_start > date.today() - timedelta(days=365)
            else None
        )

        revenue_growth_rate = 0
        appointment_growth_rate = 0
        if previous_week_metrics:
            if previous_week_metrics["total_revenue"] > 0:
                revenue_growth_rate = (
                    (
                        weekly_totals["total_revenue"]
                        - previous_week_metrics["total_revenue"]
                    )
                    / previous_week_metrics["total_revenue"]
                ) * 100
            if previous_week_metrics["completed_appointments"] > 0:
                appointment_growth_rate = (
                    (
                        weekly_totals["completed_appointments"]
                        - previous_week_metrics["completed_appointments"]
                    )
                    / previous_week_metrics["completed_appointments"]
                ) * 100

        return {
            "week_start": week_start,
            "week_end": week_end,
            **weekly_totals,
            "unique_customers": unique_customers,
            "weekly_capacity": weekly_capacity,
            "booking_rate": round(booking_rate, 1),
            "average_ticket": round(average_ticket, 2),
            "revenue_growth_rate": round(revenue_growth_rate, 1),
            "appointment_growth_rate": round(appointment_growth_rate, 1),
            "revenue_per_hour": (
                round(weekly_totals["total_revenue"] / 40, 2)
                if weekly_totals["total_revenue"] > 0
                else 0
            ),  # Assuming 40-hour work week
        }

    @cache_result(ttl_seconds=3600, key_prefix="customer_analytics")  # Cache for 1 hour
    @monitor_performance
    def calculate_customer_analytics(
        self, barber_id: int, period_days: int = 30
    ) -> Dict:
        """
        Calculate customer analytics for dashboard
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=period_days)

        # Get appointments in period
        appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == "completed",
                )
            )
            .all()
        )

        # Customer type distribution
        customer_types = {}
        for apt in appointments:
            customer_types[apt.customer_type] = (
                customer_types.get(apt.customer_type, 0) + 1
            )

        # Calculate customer lifetime values
        clients = self.db.query(Client).filter(Client.barber_id == barber_id).all()

        total_clv = sum(client.lifetime_value for client in clients)
        average_clv = total_clv / len(clients) if clients else 0

        # Identify VIP customers (top 20% by spending)
        clients_by_spending = sorted(clients, key=lambda c: c.total_spent, reverse=True)
        vip_threshold = len(clients_by_spending) // 5
        vip_customers = clients_by_spending[:vip_threshold] if vip_threshold > 0 else []

        # At-risk customers (no appointment in 45+ days)
        at_risk_date = date.today() - timedelta(days=45)
        at_risk_customers = [
            c for c in clients if c.last_visit_date and c.last_visit_date < at_risk_date
        ]

        return {
            "period_days": period_days,
            "total_customers_served": len(set(apt.client_id for apt in appointments)),
            "customer_type_distribution": customer_types,
            "total_lifetime_value": round(total_clv, 2),
            "average_lifetime_value": round(average_clv, 2),
            "vip_customers_count": len(vip_customers),
            "at_risk_customers_count": len(at_risk_customers),
            "retention_rate": self._calculate_retention_rate(barber_id, period_days),
        }

    @cache_result(ttl_seconds=600, key_prefix="sixfb_score")  # Cache for 10 minutes
    @monitor_performance
    def calculate_sixfb_score(
        self, barber_id: int, period_type: str = "weekly"
    ) -> Dict:
        """
        Calculate the overall 6FB Score based on multiple performance factors
        """
        if period_type == "weekly":
            # Get current week metrics
            today = date.today()
            week_start = today - timedelta(days=today.weekday())  # Monday
            metrics = self.calculate_weekly_metrics(barber_id, week_start)
        else:
            # Daily metrics
            metrics = self.calculate_daily_metrics(barber_id, date.today())

        # Score components (0-100 each)
        booking_utilization_score = min(metrics["booking_rate"], 100)  # Cap at 100%

        # Revenue growth score (based on week-over-week growth)
        revenue_growth = metrics.get("revenue_growth_rate", 0)
        revenue_growth_score = max(
            0, min(100, 50 + revenue_growth)
        )  # 50 is baseline, growth adds points

        # Customer retention score (based on returning customer percentage)
        total_customers = metrics.get("new_customers", 0) + metrics.get(
            "returning_customers", 0
        )
        retention_percentage = (
            (metrics.get("returning_customers", 0) / total_customers * 100)
            if total_customers > 0
            else 0
        )
        customer_retention_score = min(retention_percentage, 100)

        # Average ticket score (based on target achievement)
        barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
        target_ticket = barber.average_ticket_goal or 50  # Default $50 target
        actual_ticket = metrics.get("average_ticket", 0)
        ticket_achievement = (
            (actual_ticket / target_ticket * 100) if target_ticket > 0 else 0
        )
        average_ticket_score = min(ticket_achievement, 100)

        # Service quality score (based on tip percentage)
        tip_percentage = metrics.get("average_tip_percentage", 0)
        service_quality_score = min(tip_percentage * 5, 100)  # 20% tips = 100 points

        # Calculate weighted overall score
        weights = {
            "booking_utilization": 0.3,
            "revenue_growth": 0.2,
            "customer_retention": 0.2,
            "average_ticket": 0.15,
            "service_quality": 0.15,
        }

        overall_score = (
            booking_utilization_score * weights["booking_utilization"]
            + revenue_growth_score * weights["revenue_growth"]
            + customer_retention_score * weights["customer_retention"]
            + average_ticket_score * weights["average_ticket"]
            + service_quality_score * weights["service_quality"]
        )

        # Assign letter grade
        if overall_score >= 95:
            grade = "A+"
        elif overall_score >= 90:
            grade = "A"
        elif overall_score >= 85:
            grade = "B+"
        elif overall_score >= 80:
            grade = "B"
        elif overall_score >= 75:
            grade = "C+"
        elif overall_score >= 70:
            grade = "C"
        elif overall_score >= 60:
            grade = "D"
        else:
            grade = "F"

        return {
            "period_type": period_type,
            "overall_score": round(overall_score, 1),
            "grade": grade,
            "components": {
                "booking_utilization_score": round(booking_utilization_score, 1),
                "revenue_growth_score": round(revenue_growth_score, 1),
                "customer_retention_score": round(customer_retention_score, 1),
                "average_ticket_score": round(average_ticket_score, 1),
                "service_quality_score": round(service_quality_score, 1),
            },
            "metrics_used": metrics,
        }

    def _calculate_retention_rate(self, barber_id: int, period_days: int) -> float:
        """
        Calculate customer retention rate for the given period
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=period_days)
        previous_start = start_date - timedelta(days=period_days)

        # Customers from previous period
        previous_customers = set(
            apt.client_id
            for apt in self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= previous_start,
                    Appointment.appointment_date < start_date,
                    Appointment.status == "completed",
                )
            )
            .all()
        )

        # Customers who returned in current period
        current_customers = set(
            apt.client_id
            for apt in self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == "completed",
                )
            )
            .all()
        )

        retained_customers = previous_customers.intersection(current_customers)

        if len(previous_customers) == 0:
            return 0.0

        return len(retained_customers) / len(previous_customers) * 100
