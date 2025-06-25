"""
Revenue Analytics Models for AI-powered insights
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    JSON,
    Date,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel


class RevenuePattern(BaseModel):
    """Stores identified revenue patterns for each barber"""

    __tablename__ = "revenue_patterns"

    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")

    # Pattern details
    pattern_type = Column(
        String(50), nullable=False
    )  # daily, weekly, seasonal, holiday
    pattern_name = Column(String(100), nullable=False)
    confidence_score = Column(Float, default=0.0)  # 0-1 confidence in pattern

    # Pattern characteristics
    pattern_data = Column(JSON)  # Detailed pattern information
    avg_revenue_impact = Column(Float)  # Average $ impact when pattern occurs
    frequency = Column(String(50))  # How often pattern occurs

    # Time range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # ML model details
    model_version = Column(String(20))
    last_updated = Column(DateTime, default=func.now())

    __table_args__ = (
        Index("idx_revenue_patterns_barber_type", "barber_id", "pattern_type"),
        Index("idx_revenue_patterns_confidence", "confidence_score"),
    )


class RevenuePrediction(BaseModel):
    """Stores revenue predictions for future periods"""

    __tablename__ = "revenue_predictions"

    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")

    # Prediction period
    prediction_date = Column(Date, nullable=False)
    prediction_type = Column(String(20))  # daily, weekly, monthly

    # Predictions
    predicted_revenue = Column(Float, nullable=False)
    confidence_interval_low = Column(Float)
    confidence_interval_high = Column(Float)
    confidence_score = Column(Float)  # 0-1

    # Breakdown
    predicted_appointments = Column(Integer)
    predicted_new_clients = Column(Integer)
    predicted_avg_ticket = Column(Float)

    # Factors considered
    factors_data = Column(JSON)  # What influenced the prediction

    # Model info
    model_version = Column(String(20))
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        UniqueConstraint("barber_id", "prediction_date", "prediction_type"),
        Index("idx_predictions_barber_date", "barber_id", "prediction_date"),
    )


class PricingOptimization(BaseModel):
    """Stores AI-generated pricing recommendations"""

    __tablename__ = "pricing_optimizations"

    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")
    service_name = Column(String(200))

    # Current vs recommended pricing
    current_price = Column(Float, nullable=False)
    recommended_price = Column(Float, nullable=False)
    price_elasticity = Column(Float)  # How sensitive demand is to price

    # Impact analysis
    expected_revenue_change = Column(Float)  # % change in revenue
    expected_demand_change = Column(Float)  # % change in bookings
    confidence_score = Column(Float)

    # Reasoning
    recommendation_reason = Column(Text)
    market_analysis = Column(JSON)  # Competitor pricing, demand data

    # Status
    status = Column(String(20), default="pending")  # pending, accepted, rejected
    implemented_date = Column(DateTime)
    actual_impact = Column(JSON)  # Track actual results if implemented

    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)

    __table_args__ = (Index("idx_pricing_barber_status", "barber_id", "status"),)


class ClientSegment(BaseModel):
    """AI-identified client segments for targeting"""

    __tablename__ = "client_segments"

    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")

    # Segment details
    segment_name = Column(String(100), nullable=False)
    segment_type = Column(String(50))  # behavior, value, frequency, demographics
    description = Column(Text)

    # Segment characteristics
    characteristics = Column(JSON)  # Detailed segment attributes
    size = Column(Integer)  # Number of clients in segment
    avg_lifetime_value = Column(Float)
    avg_visit_frequency = Column(Float)  # Visits per month
    avg_ticket_size = Column(Float)

    # Recommendations
    engagement_strategy = Column(Text)
    recommended_services = Column(JSON)
    recommended_promotions = Column(JSON)

    # Performance
    revenue_contribution = Column(Float)  # % of total revenue
    growth_rate = Column(Float)  # Month-over-month growth
    churn_risk = Column(Float)  # 0-1 risk score

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class RevenueInsight(BaseModel):
    """Stores AI-generated insights and recommendations"""

    __tablename__ = "revenue_insights"

    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")

    # Insight details
    insight_type = Column(String(50), nullable=False)  # opportunity, risk, trend
    category = Column(String(50))  # pricing, scheduling, service, client
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)

    # Impact and priority
    potential_impact = Column(Float)  # Estimated $ impact
    priority = Column(String(20))  # high, medium, low
    confidence_score = Column(Float)

    # Recommendations
    recommendations = Column(JSON)  # List of specific actions

    # Status tracking
    status = Column(String(20), default="new")  # new, viewed, implemented, dismissed
    viewed_at = Column(DateTime)
    implemented_at = Column(DateTime)

    # Validity
    valid_from = Column(DateTime, default=func.now())
    valid_until = Column(DateTime)

    # Results if implemented
    actual_impact = Column(JSON)

    __table_args__ = (
        Index("idx_insights_barber_status", "barber_id", "status"),
        Index("idx_insights_priority", "priority"),
    )


class PerformanceBenchmark(BaseModel):
    """Stores performance benchmarks for comparison"""

    __tablename__ = "performance_benchmarks"

    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")

    # Benchmark period
    period_type = Column(String(20))  # weekly, monthly, quarterly
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Performance metrics
    total_revenue = Column(Float, nullable=False)
    total_appointments = Column(Integer)
    avg_ticket = Column(Float)
    client_retention_rate = Column(Float)
    booking_utilization = Column(Float)  # % of available slots filled

    # Percentile rankings (vs peers)
    revenue_percentile = Column(Float)  # 0-100
    efficiency_percentile = Column(Float)
    growth_percentile = Column(Float)
    retention_percentile = Column(Float)

    # Peer comparison
    peer_group_size = Column(Integer)
    peer_avg_revenue = Column(Float)
    peer_avg_appointments = Column(Integer)

    # Growth metrics
    revenue_growth_rate = Column(Float)  # % vs previous period
    appointment_growth_rate = Column(Float)
    new_client_acquisition_rate = Column(Float)

    # Areas for improvement
    improvement_areas = Column(JSON)  # Top 3 areas with specific recommendations

    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        UniqueConstraint("barber_id", "period_type", "period_start"),
        Index("idx_benchmarks_barber_period", "barber_id", "period_start"),
    )


class RevenueOptimizationGoal(BaseModel):
    """Tracks revenue optimization goals and progress"""

    __tablename__ = "revenue_optimization_goals"

    # Reference
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    barber = relationship("Barber")

    # Goal details
    goal_type = Column(String(50))  # revenue, appointments, avg_ticket, retention
    goal_name = Column(String(200))
    description = Column(Text)

    # Target
    current_value = Column(Float, nullable=False)
    target_value = Column(Float, nullable=False)
    target_date = Column(Date, nullable=False)

    # AI recommendations
    recommended_actions = Column(JSON)  # Specific steps to achieve goal
    estimated_difficulty = Column(String(20))  # easy, medium, hard
    success_probability = Column(Float)  # 0-1

    # Progress tracking
    progress_percentage = Column(Float, default=0.0)
    last_updated_value = Column(Float)
    last_updated = Column(DateTime, default=func.now())

    # Status
    status = Column(String(20), default="active")  # active, achieved, abandoned
    achieved_date = Column(DateTime)

    created_at = Column(DateTime, default=func.now())

    __table_args__ = (Index("idx_goals_barber_status", "barber_id", "status"),)
