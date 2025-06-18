from sqlalchemy import Column, Date, Integer, ForeignKey, Float, String
from sqlalchemy.orm import relationship
from .base import BaseModel


class DailyMetrics(BaseModel):
    """
    Daily aggregated metrics for 6FB dashboard
    Pre-calculated for fast dashboard loading
    """
    __tablename__ = "daily_metrics"
    
    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")
    date = Column(Date, nullable=False, index=True)
    
    # Appointment Metrics
    total_appointments = Column(Integer, default=0)
    completed_appointments = Column(Integer, default=0)
    cancelled_appointments = Column(Integer, default=0)
    no_show_appointments = Column(Integer, default=0)
    
    # Revenue Metrics (matching 6FB spreadsheet)
    total_service_revenue = Column(Float, default=0.0)
    total_tip_amount = Column(Float, default=0.0)
    total_product_revenue = Column(Float, default=0.0)
    total_revenue = Column(Float, default=0.0)  # Sum of all revenue types
    
    # Customer Type Breakdown
    new_customers = Column(Integer, default=0)
    returning_customers = Column(Integer, default=0)
    new_customer_revenue = Column(Float, default=0.0)
    returning_customer_revenue = Column(Float, default=0.0)
    
    # Booking Metrics
    booking_capacity = Column(Integer, default=0)  # Target appointments for the day
    booking_rate = Column(Float, default=0.0)  # (completed / capacity) * 100
    
    # Average Metrics
    average_ticket = Column(Float, default=0.0)  # Total revenue / completed appointments
    average_service_revenue = Column(Float, default=0.0)
    average_tip_percentage = Column(Float, default=0.0)
    
    # Unique index on barber_id + date
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )


class WeeklyMetrics(BaseModel):
    """
    Weekly aggregated metrics for 6FB dashboard
    Week starts on Monday to match 6FB methodology
    """
    __tablename__ = "weekly_metrics"
    
    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")
    week_start_date = Column(Date, nullable=False, index=True)  # Monday of the week
    year = Column(Integer, nullable=False)
    week_number = Column(Integer, nullable=False)
    
    # Appointment Metrics
    total_appointments = Column(Integer, default=0)
    completed_appointments = Column(Integer, default=0)
    cancelled_appointments = Column(Integer, default=0)
    no_show_appointments = Column(Integer, default=0)
    
    # Revenue Metrics
    total_service_revenue = Column(Float, default=0.0)
    total_tip_amount = Column(Float, default=0.0)
    total_product_revenue = Column(Float, default=0.0)
    total_revenue = Column(Float, default=0.0)
    
    # Customer Metrics
    new_customers = Column(Integer, default=0)
    returning_customers = Column(Integer, default=0)
    unique_customers = Column(Integer, default=0)  # Total unique customers served
    
    # Weekly Booking Metrics
    weekly_capacity = Column(Integer, default=0)  # Target appointments for the week
    booking_rate = Column(Float, default=0.0)  # Weekly booking utilization
    
    # Performance Metrics
    average_ticket = Column(Float, default=0.0)
    revenue_per_hour = Column(Float, default=0.0)
    
    # Growth Metrics (compared to previous week)
    revenue_growth_rate = Column(Float, default=0.0)  # % change from previous week
    appointment_growth_rate = Column(Float, default=0.0)
    customer_growth_rate = Column(Float, default=0.0)


class MonthlyMetrics(BaseModel):
    """
    Monthly aggregated metrics for 6FB reporting
    """
    __tablename__ = "monthly_metrics"
    
    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    
    # Appointment Metrics
    total_appointments = Column(Integer, default=0)
    completed_appointments = Column(Integer, default=0)
    working_days = Column(Integer, default=0)
    
    # Revenue Metrics
    total_revenue = Column(Float, default=0.0)
    average_daily_revenue = Column(Float, default=0.0)
    highest_day_revenue = Column(Float, default=0.0)
    lowest_day_revenue = Column(Float, default=0.0)
    
    # Customer Metrics
    total_customers_served = Column(Integer, default=0)
    new_customers_acquired = Column(Integer, default=0)
    customer_retention_rate = Column(Float, default=0.0)
    
    # Performance Metrics
    average_ticket = Column(Float, default=0.0)
    booking_rate = Column(Float, default=0.0)
    
    # Monthly Goals
    revenue_goal = Column(Float, default=0.0)
    revenue_goal_achievement = Column(Float, default=0.0)  # % of goal achieved


class SixFBScore(BaseModel):
    """
    6FB Score calculation and tracking
    """
    __tablename__ = "sixfb_scores"
    
    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")
    calculation_date = Column(Date, nullable=False, index=True)
    period_type = Column(String(20), nullable=False)  # daily, weekly, monthly
    
    # Score Components (0-100 each)
    booking_utilization_score = Column(Float, default=0.0)  # Based on booking rate
    revenue_growth_score = Column(Float, default=0.0)  # Revenue trend
    customer_retention_score = Column(Float, default=0.0)  # Returning customer %
    average_ticket_score = Column(Float, default=0.0)  # Ticket value performance
    service_quality_score = Column(Float, default=0.0)  # Based on tips %
    
    # Overall Score (weighted average)
    overall_score = Column(Float, default=0.0)  # 0-100
    grade = Column(String(2))  # A+, A, B+, B, C+, C, D, F
    
    # Benchmarking
    peer_percentile = Column(Float, default=0.0)  # Position vs other 6FB members
    improvement_from_previous = Column(Float, default=0.0)  # Score change