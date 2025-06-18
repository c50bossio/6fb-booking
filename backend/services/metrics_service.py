from typing import Dict, List, Optional
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from models import DailyMetrics, WeeklyMetrics, MonthlyMetrics, SixFBScore, Barber
from .sixfb_calculator import SixFBCalculator


class MetricsService:
    """
    Service for managing and caching 6FB metrics
    Handles aggregation and storage of calculated metrics
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.calculator = SixFBCalculator(db)
    
    def update_daily_metrics(self, barber_id: int, target_date: date) -> DailyMetrics:
        """
        Calculate and store/update daily metrics for a barber
        """
        # Calculate current metrics
        calculated_metrics = self.calculator.calculate_daily_metrics(barber_id, target_date)
        
        # Check if metrics already exist for this date
        existing_metrics = self.db.query(DailyMetrics).filter(
            DailyMetrics.barber_id == barber_id,
            DailyMetrics.date == target_date
        ).first()
        
        if existing_metrics:
            # Update existing record
            for key, value in calculated_metrics.items():
                if key != "date" and hasattr(existing_metrics, key):
                    setattr(existing_metrics, key, value)
            metrics_record = existing_metrics
        else:
            # Create new record
            metrics_record = DailyMetrics(
                barber_id=barber_id,
                date=target_date,
                total_appointments=calculated_metrics["total_appointments"],
                completed_appointments=calculated_metrics["completed_appointments"],
                total_service_revenue=calculated_metrics["total_service_revenue"],
                total_tip_amount=calculated_metrics["total_tips"],
                total_product_revenue=calculated_metrics["total_product_revenue"],
                total_revenue=calculated_metrics["total_revenue"],
                new_customers=calculated_metrics["new_customers"],
                returning_customers=calculated_metrics["returning_customers"],
                new_customer_revenue=calculated_metrics["new_customer_revenue"],
                returning_customer_revenue=calculated_metrics["returning_customer_revenue"],
                booking_capacity=calculated_metrics["booking_capacity"],
                booking_rate=calculated_metrics["booking_rate"],
                average_ticket=calculated_metrics["average_ticket"],
                average_service_revenue=calculated_metrics["average_service_revenue"],
                average_tip_percentage=calculated_metrics["average_tip_percentage"]
            )
            self.db.add(metrics_record)
        
        self.db.commit()
        self.db.refresh(metrics_record)
        return metrics_record
    
    def update_weekly_metrics(self, barber_id: int, week_start: date) -> WeeklyMetrics:
        """
        Calculate and store/update weekly metrics for a barber
        """
        calculated_metrics = self.calculator.calculate_weekly_metrics(barber_id, week_start)
        
        # Get year and week number
        year = week_start.year
        week_number = week_start.isocalendar()[1]
        
        # Check if metrics already exist for this week
        existing_metrics = self.db.query(WeeklyMetrics).filter(
            WeeklyMetrics.barber_id == barber_id,
            WeeklyMetrics.week_start_date == week_start
        ).first()
        
        if existing_metrics:
            # Update existing record
            existing_metrics.total_appointments = calculated_metrics["total_appointments"]
            existing_metrics.completed_appointments = calculated_metrics["completed_appointments"]
            existing_metrics.total_service_revenue = calculated_metrics["total_service_revenue"]
            existing_metrics.total_tip_amount = calculated_metrics["total_tips"]
            existing_metrics.total_product_revenue = calculated_metrics["total_product_revenue"]
            existing_metrics.total_revenue = calculated_metrics["total_revenue"]
            existing_metrics.new_customers = calculated_metrics["new_customers"]
            existing_metrics.returning_customers = calculated_metrics["returning_customers"]
            existing_metrics.unique_customers = calculated_metrics["unique_customers"]
            existing_metrics.weekly_capacity = calculated_metrics["weekly_capacity"]
            existing_metrics.booking_rate = calculated_metrics["booking_rate"]
            existing_metrics.average_ticket = calculated_metrics["average_ticket"]
            existing_metrics.revenue_per_hour = calculated_metrics["revenue_per_hour"]
            existing_metrics.revenue_growth_rate = calculated_metrics["revenue_growth_rate"]
            existing_metrics.appointment_growth_rate = calculated_metrics["appointment_growth_rate"]
            metrics_record = existing_metrics
        else:
            # Create new record
            metrics_record = WeeklyMetrics(
                barber_id=barber_id,
                week_start_date=week_start,
                year=year,
                week_number=week_number,
                total_appointments=calculated_metrics["total_appointments"],
                completed_appointments=calculated_metrics["completed_appointments"],
                total_service_revenue=calculated_metrics["total_service_revenue"],
                total_tip_amount=calculated_metrics["total_tips"],
                total_product_revenue=calculated_metrics["total_product_revenue"],
                total_revenue=calculated_metrics["total_revenue"],
                new_customers=calculated_metrics["new_customers"],
                returning_customers=calculated_metrics["returning_customers"],
                unique_customers=calculated_metrics["unique_customers"],
                weekly_capacity=calculated_metrics["weekly_capacity"],
                booking_rate=calculated_metrics["booking_rate"],
                average_ticket=calculated_metrics["average_ticket"],
                revenue_per_hour=calculated_metrics["revenue_per_hour"],
                revenue_growth_rate=calculated_metrics["revenue_growth_rate"],
                appointment_growth_rate=calculated_metrics["appointment_growth_rate"]
            )
            self.db.add(metrics_record)
        
        self.db.commit()
        self.db.refresh(metrics_record)
        return metrics_record
    
    def update_sixfb_score(self, barber_id: int, calculation_date: date, period_type: str = "weekly") -> SixFBScore:
        """
        Calculate and store 6FB score
        """
        calculated_score = self.calculator.calculate_sixfb_score(barber_id, period_type)
        
        # Check if score already exists for this date and period
        existing_score = self.db.query(SixFBScore).filter(
            SixFBScore.barber_id == barber_id,
            SixFBScore.calculation_date == calculation_date,
            SixFBScore.period_type == period_type
        ).first()
        
        if existing_score:
            # Update existing record
            existing_score.booking_utilization_score = calculated_score["components"]["booking_utilization_score"]
            existing_score.revenue_growth_score = calculated_score["components"]["revenue_growth_score"]
            existing_score.customer_retention_score = calculated_score["components"]["customer_retention_score"]
            existing_score.average_ticket_score = calculated_score["components"]["average_ticket_score"]
            existing_score.service_quality_score = calculated_score["components"]["service_quality_score"]
            existing_score.overall_score = calculated_score["overall_score"]
            existing_score.grade = calculated_score["grade"]
            score_record = existing_score
        else:
            # Create new record
            score_record = SixFBScore(
                barber_id=barber_id,
                calculation_date=calculation_date,
                period_type=period_type,
                booking_utilization_score=calculated_score["components"]["booking_utilization_score"],
                revenue_growth_score=calculated_score["components"]["revenue_growth_score"],
                customer_retention_score=calculated_score["components"]["customer_retention_score"],
                average_ticket_score=calculated_score["components"]["average_ticket_score"],
                service_quality_score=calculated_score["components"]["service_quality_score"],
                overall_score=calculated_score["overall_score"],
                grade=calculated_score["grade"]
            )
            self.db.add(score_record)
        
        self.db.commit()
        self.db.refresh(score_record)
        return score_record
    
    def get_dashboard_metrics(self, barber_id: int) -> Dict:
        """
        Get comprehensive dashboard metrics for a barber
        """
        today = date.today()
        current_week_start = today - timedelta(days=today.weekday())  # Monday
        
        # Ensure metrics are up to date
        daily_metrics = self.update_daily_metrics(barber_id, today)
        weekly_metrics = self.update_weekly_metrics(barber_id, current_week_start)
        sixfb_score = self.update_sixfb_score(barber_id, today, "weekly")
        
        # Get previous week for comparison
        previous_week_start = current_week_start - timedelta(days=7)
        previous_weekly_metrics = self.db.query(WeeklyMetrics).filter(
            WeeklyMetrics.barber_id == barber_id,
            WeeklyMetrics.week_start_date == previous_week_start
        ).first()
        
        # Calculate week-over-week changes
        revenue_change = 0
        appointments_change = 0
        if previous_weekly_metrics:
            if previous_weekly_metrics.total_revenue > 0:
                revenue_change = ((weekly_metrics.total_revenue - previous_weekly_metrics.total_revenue) / 
                                previous_weekly_metrics.total_revenue) * 100
            if previous_weekly_metrics.completed_appointments > 0:
                appointments_change = ((weekly_metrics.completed_appointments - previous_weekly_metrics.completed_appointments) / 
                                     previous_weekly_metrics.completed_appointments) * 100
        
        return {
            "daily": {
                "date": daily_metrics.date,
                "appointments": daily_metrics.completed_appointments,
                "revenue": daily_metrics.total_revenue,
                "average_ticket": daily_metrics.average_ticket,
                "booking_rate": daily_metrics.booking_rate
            },
            "weekly": {
                "week_start": weekly_metrics.week_start_date,
                "appointments": weekly_metrics.completed_appointments,
                "revenue": weekly_metrics.total_revenue,
                "average_ticket": weekly_metrics.average_ticket,
                "booking_rate": weekly_metrics.booking_rate,
                "unique_customers": weekly_metrics.unique_customers,
                "new_customers": weekly_metrics.new_customers,
                "returning_customers": weekly_metrics.returning_customers
            },
            "comparisons": {
                "revenue_change": round(revenue_change, 1),
                "appointments_change": round(appointments_change, 1)
            },
            "sixfb_score": {
                "overall_score": sixfb_score.overall_score,
                "grade": sixfb_score.grade,
                "components": {
                    "booking_utilization": sixfb_score.booking_utilization_score,
                    "revenue_growth": sixfb_score.revenue_growth_score,
                    "customer_retention": sixfb_score.customer_retention_score,
                    "average_ticket": sixfb_score.average_ticket_score,
                    "service_quality": sixfb_score.service_quality_score
                }
            }
        }
    
    def refresh_all_metrics(self, barber_id: int, days_back: int = 30):
        """
        Refresh all metrics for the past N days
        Useful after bulk data import or corrections
        """
        today = date.today()
        
        # Refresh daily metrics
        for i in range(days_back):
            target_date = today - timedelta(days=i)
            self.update_daily_metrics(barber_id, target_date)
        
        # Refresh weekly metrics
        current_week_start = today - timedelta(days=today.weekday())
        for i in range(days_back // 7 + 1):
            week_start = current_week_start - timedelta(weeks=i)
            self.update_weekly_metrics(barber_id, week_start)
        
        # Refresh 6FB scores
        for i in range(days_back):
            target_date = today - timedelta(days=i)
            self.update_sixfb_score(barber_id, target_date, "daily")
            if i % 7 == 0:  # Weekly scores
                self.update_sixfb_score(barber_id, target_date, "weekly")
        
        self.db.commit()