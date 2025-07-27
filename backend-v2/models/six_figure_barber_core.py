"""
Six Figure Barber Methodology - Core Business Logic Models

This module implements the foundational data models for the Six Figure Barber methodology,
supporting the five core principles:
1. Revenue Optimization Tracking
2. Client Value Maximization
3. Service Delivery Excellence
4. Business Efficiency Metrics
5. Professional Growth Tracking

These models are designed to integrate with the existing V2 architecture while providing
comprehensive tracking and analytics for premium barbershop management.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Enum as SQLEnum, Date, Index, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta, date, timezone
import enum
from decimal import Decimal
from typing import Dict, Any, Optional

from db import Base


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ============================================================================
# CORE ENUMS FOR SIX FIGURE BARBER METHODOLOGY
# ============================================================================

class SixFBPrinciple(enum.Enum):
    """Six Figure Barber core principles"""
    REVENUE_OPTIMIZATION = "revenue_optimization"
    CLIENT_VALUE_MAXIMIZATION = "client_value_maximization"
    SERVICE_DELIVERY_EXCELLENCE = "service_delivery_excellence"
    BUSINESS_EFFICIENCY = "business_efficiency"
    PROFESSIONAL_GROWTH = "professional_growth"


class RevenueMetricType(enum.Enum):
    """Types of revenue metrics tracked"""
    DAILY_REVENUE = "daily_revenue"
    WEEKLY_REVENUE = "weekly_revenue"
    MONTHLY_REVENUE = "monthly_revenue"
    QUARTERLY_REVENUE = "quarterly_revenue"
    ANNUAL_REVENUE = "annual_revenue"
    REVENUE_PER_CLIENT = "revenue_per_client"
    REVENUE_PER_HOUR = "revenue_per_hour"
    AVERAGE_TICKET_SIZE = "average_ticket_size"
    UPSELL_CONVERSION_RATE = "upsell_conversion_rate"
    PRICE_OPTIMIZATION_IMPACT = "price_optimization_impact"


class ClientValueTier(enum.Enum):
    """Client value tiers based on 6FB methodology"""
    PREMIUM_VIP = "premium_vip"          # Top 5% - highest value clients
    CORE_REGULAR = "core_regular"        # 20% - consistent, reliable clients
    DEVELOPING = "developing"            # 50% - growing relationship potential
    OCCASIONAL = "occasional"            # 20% - infrequent visits
    AT_RISK = "at_risk"                 # 5% - churning or problematic


class ServiceExcellenceArea(enum.Enum):
    """Areas of service excellence measurement"""
    TECHNICAL_SKILL = "technical_skill"
    CLIENT_EXPERIENCE = "client_experience"
    CONSULTATION_QUALITY = "consultation_quality"
    TIMELINESS = "timeliness"
    CLEANLINESS = "cleanliness"
    PROFESSIONALISM = "professionalism"
    UPSELLING_ABILITY = "upselling_ability"
    CLIENT_RETENTION = "client_retention"


class EfficiencyMetricType(enum.Enum):
    """Business efficiency metrics"""
    BOOKING_UTILIZATION = "booking_utilization"
    NO_SHOW_RATE = "no_show_rate"
    CANCELLATION_RATE = "cancellation_rate"
    REBOOK_RATE = "rebook_rate"
    TIME_PER_SERVICE = "time_per_service"
    OPERATIONAL_OVERHEAD = "operational_overhead"
    COST_PER_CLIENT_ACQUISITION = "cost_per_client_acquisition"
    PROFIT_MARGIN = "profit_margin"


class GrowthMetricType(enum.Enum):
    """Professional growth tracking metrics"""
    MONTHLY_REVENUE_GROWTH = "monthly_revenue_growth"
    CLIENT_BASE_GROWTH = "client_base_growth"
    SKILL_DEVELOPMENT = "skill_development"
    BRAND_RECOGNITION = "brand_recognition"
    REFERRAL_GENERATION = "referral_generation"
    MARKET_POSITIONING = "market_positioning"
    BUSINESS_EXPANSION = "business_expansion"


class UpsellingStrategy(enum.Enum):
    """Upselling strategies for Six Figure Barber methodology"""
    PREMIUM_SERVICE_UPGRADE = "premium_service_upgrade"
    PACKAGE_BUNDLING = "package_bundling"
    SEASONAL_PROMOTION = "seasonal_promotion"
    LOYALTY_TIER_UPGRADE = "loyalty_tier_upgrade"
    ADD_ON_SERVICES = "add_on_services"
    PRODUCT_RECOMMENDATION = "product_recommendation"
    MEMBERSHIP_UPSELL = "membership_upsell"


# ============================================================================
# REVENUE OPTIMIZATION MODELS
# ============================================================================

class SixFBRevenueMetrics(Base):
    """
    Comprehensive revenue tracking aligned with Six Figure Barber methodology.
    Tracks all revenue streams and optimization opportunities.
    """
    __tablename__ = "six_fb_revenue_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    metric_type = Column(SQLEnum(RevenueMetricType), nullable=False, index=True)
    
    # Core revenue data
    amount = Column(Numeric(10, 2), nullable=False, default=0)
    target_amount = Column(Numeric(10, 2), nullable=True)
    variance_amount = Column(Numeric(10, 2), nullable=True)  # actual - target
    variance_percentage = Column(Float, nullable=True)
    
    # Context and attribution
    service_count = Column(Integer, default=0)
    client_count = Column(Integer, default=0)
    average_ticket = Column(Numeric(10, 2), nullable=True)
    upsell_revenue = Column(Numeric(10, 2), default=0)
    retail_revenue = Column(Numeric(10, 2), default=0)
    
    # Six Figure Barber specific metrics
    premium_service_percentage = Column(Float, default=0)
    client_lifetime_value_impact = Column(Numeric(10, 2), default=0)
    pricing_strategy_effectiveness = Column(Float, default=0)  # 0-100 score
    
    # Analytics and insights
    insights = Column(JSON, nullable=True)  # AI-generated insights
    optimization_opportunities = Column(JSON, nullable=True)
    competitive_positioning = Column(JSON, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="six_fb_revenue_metrics")
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_revenue_user_date_type", "user_id", "date", "metric_type"),
        Index("idx_revenue_date_amount", "date", "amount"),
    )


class SixFBRevenueGoals(Base):
    """
    Six Figure Barber revenue goals and milestone tracking.
    Supports the methodology's structured approach to income growth.
    """
    __tablename__ = "six_fb_revenue_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Goal definition
    goal_name = Column(String, nullable=False)
    target_annual_revenue = Column(Numeric(12, 2), nullable=False)
    target_monthly_revenue = Column(Numeric(10, 2), nullable=False)
    target_weekly_revenue = Column(Numeric(10, 2), nullable=False)
    target_daily_revenue = Column(Numeric(8, 2), nullable=False)
    
    # Timeline
    start_date = Column(Date, nullable=False)
    target_date = Column(Date, nullable=False)
    achieved_date = Column(Date, nullable=True)
    
    # Progress tracking
    current_annual_pace = Column(Numeric(12, 2), default=0)
    progress_percentage = Column(Float, default=0)
    days_ahead_behind_schedule = Column(Integer, default=0)
    
    # Six Figure Barber methodology alignment
    sfb_principle_focus = Column(SQLEnum(SixFBPrinciple), nullable=False)
    milestone_requirements = Column(JSON, nullable=True)  # Required achievements
    coaching_recommendations = Column(JSON, nullable=True)
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    is_achieved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="six_fb_revenue_goals")


# ============================================================================
# CLIENT VALUE MAXIMIZATION MODELS
# ============================================================================

class SixFBClientValueProfile(Base):
    """
    Comprehensive client value profiling based on Six Figure Barber methodology.
    Tracks client tier, lifetime value, and relationship quality.
    """
    __tablename__ = "six_fb_client_value_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Client value tier and classification
    value_tier = Column(SQLEnum(ClientValueTier), nullable=False, index=True)
    tier_justification = Column(Text, nullable=True)
    last_tier_review_date = Column(Date, nullable=True)
    
    # Financial metrics
    lifetime_value = Column(Numeric(10, 2), default=0)
    annual_value = Column(Numeric(10, 2), default=0)
    average_ticket_size = Column(Numeric(8, 2), default=0)
    total_revenue_generated = Column(Numeric(10, 2), default=0)
    
    # Relationship metrics
    relationship_score = Column(Float, default=0)  # 0-100 relationship quality
    trust_level = Column(Float, default=0)  # 0-100 trust indicator
    loyalty_score = Column(Float, default=0)  # 0-100 loyalty measurement
    advocacy_potential = Column(Float, default=0)  # 0-100 referral likelihood
    
    # Behavioral patterns
    visit_frequency_days = Column(Float, nullable=True)
    appointment_consistency = Column(Float, default=0)  # 0-100 consistency score
    upsell_receptivity = Column(Float, default=0)  # 0-100 upsell acceptance rate
    price_sensitivity = Column(Float, default=0)  # 0-100 price sensitivity
    
    # Service preferences and personalization
    preferred_services = Column(JSON, nullable=True)
    service_evolution = Column(JSON, nullable=True)  # How services have evolved
    personalization_data = Column(JSON, nullable=True)  # Custom preferences
    
    # Six Figure Barber specific metrics
    premium_service_adoption = Column(Float, default=0)  # % of premium services used
    brand_alignment_score = Column(Float, default=0)  # How well client fits brand
    growth_potential = Column(Float, default=0)  # Potential for value increase
    
    # Risk and opportunity assessment
    churn_risk_score = Column(Float, default=0)  # 0-100 churn probability
    upsell_opportunities = Column(JSON, nullable=True)
    retention_strategies = Column(JSON, nullable=True)
    
    # Metadata
    last_calculated = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="six_fb_client_profiles")
    client = relationship("Client", back_populates="six_fb_value_profile")
    
    # Indexes
    __table_args__ = (
        Index("idx_client_value_user_tier", "user_id", "value_tier"),
        Index("idx_client_value_lifetime", "lifetime_value"),
        Index("idx_client_value_risk", "churn_risk_score"),
    )


class SixFBClientJourney(Base):
    """
    Tracks client journey stages and touchpoints aligned with Six Figure Barber methodology.
    Enables strategic relationship building and value maximization.
    """
    __tablename__ = "six_fb_client_journeys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Journey stage tracking
    current_stage = Column(String, nullable=False, index=True)
    stage_entry_date = Column(Date, nullable=False)
    days_in_current_stage = Column(Integer, default=0)
    
    # Journey progression
    journey_history = Column(JSON, nullable=True)  # Previous stages and dates
    milestone_achievements = Column(JSON, nullable=True)
    next_expected_milestone = Column(JSON, nullable=True)
    
    # Six Figure Barber methodology alignment
    relationship_building_score = Column(Float, default=0)
    value_creation_opportunities = Column(JSON, nullable=True)
    premium_positioning_readiness = Column(Float, default=0)
    
    # Engagement tracking
    last_interaction_date = Column(Date, nullable=True)
    interaction_frequency = Column(Float, default=0)
    engagement_quality_score = Column(Float, default=0)
    
    # Outcomes and conversions
    conversion_events = Column(JSON, nullable=True)
    retention_indicators = Column(JSON, nullable=True)
    advocacy_actions = Column(JSON, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")


# ============================================================================
# SERVICE DELIVERY EXCELLENCE MODELS
# ============================================================================

class SixFBServiceExcellenceMetrics(Base):
    """
    Service delivery excellence tracking based on Six Figure Barber standards.
    Measures technical skill, client experience, and service quality.
    """
    __tablename__ = "six_fb_service_excellence_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    service_date = Column(Date, nullable=False, index=True)
    
    # Excellence area measurements
    excellence_area = Column(SQLEnum(ServiceExcellenceArea), nullable=False)
    score = Column(Float, nullable=False)  # 0-100 excellence score
    target_score = Column(Float, default=85)  # Six Figure Barber standard
    variance = Column(Float, nullable=True)  # actual - target
    
    # Detailed assessment
    assessment_criteria = Column(JSON, nullable=True)  # Specific criteria evaluated
    strengths_identified = Column(JSON, nullable=True)
    improvement_areas = Column(JSON, nullable=True)
    action_items = Column(JSON, nullable=True)
    
    # Context and attribution
    service_type = Column(String, nullable=True)
    service_duration_minutes = Column(Integer, nullable=True)
    complexity_level = Column(String, nullable=True)  # simple, moderate, complex
    
    # Client feedback integration
    client_satisfaction_score = Column(Float, nullable=True)  # 0-100
    client_feedback = Column(Text, nullable=True)
    net_promoter_score = Column(Integer, nullable=True)  # -100 to +100
    
    # Six Figure Barber methodology alignment
    premium_positioning_score = Column(Float, default=0)
    brand_consistency_score = Column(Float, default=0)
    value_demonstration_score = Column(Float, default=0)
    
    # Metadata
    assessment_method = Column(String, nullable=True)  # self, client, peer, system
    assessor_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    appointment = relationship("Appointment")
    client = relationship("Client")
    
    # Indexes
    __table_args__ = (
        Index("idx_excellence_user_date_area", "user_id", "service_date", "excellence_area"),
        Index("idx_excellence_score", "score"),
    )


class SixFBServiceStandards(Base):
    """
    Defines and tracks adherence to Six Figure Barber service standards.
    Ensures consistent premium service delivery across all client interactions.
    """
    __tablename__ = "six_fb_service_standards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Standard definition
    standard_name = Column(String, nullable=False)
    excellence_area = Column(SQLEnum(ServiceExcellenceArea), nullable=False)
    description = Column(Text, nullable=False)
    
    # Performance criteria
    minimum_score = Column(Float, default=75)  # Minimum acceptable score
    target_score = Column(Float, default=85)   # Six Figure Barber target
    excellence_score = Column(Float, default=95)  # Excellence threshold
    
    # Current performance
    current_average_score = Column(Float, default=0)
    last_30_days_average = Column(Float, default=0)
    trend_direction = Column(String, default="stable")  # improving, declining, stable
    
    # Compliance tracking
    total_assessments = Column(Integer, default=0)
    compliant_assessments = Column(Integer, default=0)
    compliance_rate = Column(Float, default=0)
    
    # Six Figure Barber alignment
    methodology_principle = Column(SQLEnum(SixFBPrinciple), nullable=False)
    business_impact = Column(Text, nullable=True)
    client_value_impact = Column(Text, nullable=True)
    
    # Continuous improvement
    improvement_plan = Column(JSON, nullable=True)
    training_requirements = Column(JSON, nullable=True)
    milestone_targets = Column(JSON, nullable=True)
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    last_reviewed = Column(Date, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")


# ============================================================================
# BUSINESS EFFICIENCY MODELS
# ============================================================================

class SixFBEfficiencyMetrics(Base):
    """
    Business efficiency metrics aligned with Six Figure Barber methodology.
    Tracks operational efficiency, time management, and resource optimization.
    """
    __tablename__ = "six_fb_efficiency_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    metric_type = Column(SQLEnum(EfficiencyMetricType), nullable=False, index=True)
    
    # Core efficiency measurement
    value = Column(Float, nullable=False)
    target_value = Column(Float, nullable=True)
    variance = Column(Float, nullable=True)  # actual - target
    variance_percentage = Column(Float, nullable=True)
    
    # Context and details
    measurement_unit = Column(String, nullable=True)  # %, minutes, $, count
    sample_size = Column(Integer, nullable=True)  # Number of data points
    calculation_method = Column(String, nullable=True)
    
    # Six Figure Barber methodology context
    efficiency_impact_on_revenue = Column(Numeric(8, 2), nullable=True)
    client_experience_impact = Column(Float, nullable=True)  # 0-100 score
    brand_positioning_impact = Column(Float, nullable=True)  # 0-100 score
    
    # Breakdown and attribution
    contributing_factors = Column(JSON, nullable=True)
    improvement_opportunities = Column(JSON, nullable=True)
    best_practices_applied = Column(JSON, nullable=True)
    
    # Comparative analysis
    industry_benchmark = Column(Float, nullable=True)
    six_fb_benchmark = Column(Float, nullable=True)
    performance_vs_benchmark = Column(Float, nullable=True)
    
    # Metadata
    data_quality_score = Column(Float, default=100)  # Data reliability
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_efficiency_user_date_type", "user_id", "date", "metric_type"),
        Index("idx_efficiency_value", "value"),
    )


class SixFBOperationalExcellence(Base):
    """
    Operational excellence tracking for Six Figure Barber methodology.
    Focuses on business systems, processes, and workflow optimization.
    """
    __tablename__ = "six_fb_operational_excellence"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Excellence area definition
    area_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    methodology_alignment = Column(SQLEnum(SixFBPrinciple), nullable=False)
    
    # Current performance
    current_score = Column(Float, default=0)  # 0-100 excellence score
    target_score = Column(Float, default=85)
    last_assessment_date = Column(Date, nullable=True)
    
    # Performance trends
    score_trend_30_days = Column(Float, nullable=True)
    score_trend_90_days = Column(Float, nullable=True)
    improvement_rate = Column(Float, nullable=True)  # Points per month
    
    # Process optimization
    process_documentation = Column(JSON, nullable=True)
    automation_opportunities = Column(JSON, nullable=True)
    efficiency_gains_implemented = Column(JSON, nullable=True)
    
    # Business impact
    revenue_impact = Column(Numeric(8, 2), nullable=True)
    time_savings_minutes_per_day = Column(Float, nullable=True)
    client_satisfaction_impact = Column(Float, nullable=True)
    
    # Six Figure Barber methodology integration
    coaching_recommendations = Column(JSON, nullable=True)
    milestone_integration = Column(JSON, nullable=True)
    success_metrics = Column(JSON, nullable=True)
    
    # Continuous improvement
    improvement_plan = Column(JSON, nullable=True)
    action_items = Column(JSON, nullable=True)
    next_review_date = Column(Date, nullable=True)
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    priority_level = Column(String, default="medium")  # high, medium, low
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")


# ============================================================================
# PROFESSIONAL GROWTH MODELS
# ============================================================================

class SixFBGrowthMetrics(Base):
    """
    Professional growth tracking aligned with Six Figure Barber methodology.
    Measures skill development, business expansion, and career progression.
    """
    __tablename__ = "six_fb_growth_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    metric_type = Column(SQLEnum(GrowthMetricType), nullable=False, index=True)
    
    # Growth measurement
    current_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=True)
    target_value = Column(Float, nullable=True)
    growth_rate = Column(Float, nullable=True)  # Rate of change
    
    # Progress tracking
    progress_percentage = Column(Float, nullable=True)
    time_to_target_days = Column(Integer, nullable=True)
    milestone_achievements = Column(JSON, nullable=True)
    
    # Six Figure Barber methodology context
    methodology_principle = Column(SQLEnum(SixFBPrinciple), nullable=False)
    coaching_focus_area = Column(String, nullable=True)
    development_stage = Column(String, nullable=True)  # beginner, intermediate, advanced, expert
    
    # Impact measurement
    revenue_impact = Column(Numeric(10, 2), nullable=True)
    client_satisfaction_impact = Column(Float, nullable=True)
    brand_positioning_impact = Column(Float, nullable=True)
    market_competitiveness_impact = Column(Float, nullable=True)
    
    # Development activities
    training_completed = Column(JSON, nullable=True)
    certifications_earned = Column(JSON, nullable=True)
    skills_developed = Column(JSON, nullable=True)
    experience_gained = Column(JSON, nullable=True)
    
    # Validation and recognition
    peer_recognition = Column(JSON, nullable=True)
    client_testimonials = Column(JSON, nullable=True)
    industry_recognition = Column(JSON, nullable=True)
    portfolio_updates = Column(JSON, nullable=True)
    
    # Next steps and planning
    development_plan = Column(JSON, nullable=True)
    investment_required = Column(Numeric(8, 2), nullable=True)
    expected_roi = Column(Float, nullable=True)
    timeline_milestones = Column(JSON, nullable=True)
    
    # Metadata
    assessment_method = Column(String, nullable=True)
    data_sources = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_growth_user_date_type", "user_id", "date", "metric_type"),
        Index("idx_growth_progress", "progress_percentage"),
    )


class SixFBProfessionalDevelopmentPlan(Base):
    """
    Structured professional development planning based on Six Figure Barber methodology.
    Provides roadmap for skill advancement and business growth.
    """
    __tablename__ = "six_fb_professional_development_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Plan overview
    plan_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    methodology_focus = Column(SQLEnum(SixFBPrinciple), nullable=False)
    
    # Timeline and scope
    start_date = Column(Date, nullable=False)
    target_completion_date = Column(Date, nullable=False)
    actual_completion_date = Column(Date, nullable=True)
    duration_weeks = Column(Integer, nullable=False)
    
    # Goals and objectives
    primary_goals = Column(JSON, nullable=False)
    success_criteria = Column(JSON, nullable=False)
    key_performance_indicators = Column(JSON, nullable=True)
    
    # Development areas
    skill_development_areas = Column(JSON, nullable=True)
    business_development_areas = Column(JSON, nullable=True)
    personal_development_areas = Column(JSON, nullable=True)
    
    # Action plan
    development_activities = Column(JSON, nullable=False)
    training_requirements = Column(JSON, nullable=True)
    resource_requirements = Column(JSON, nullable=True)
    investment_budget = Column(Numeric(8, 2), nullable=True)
    
    # Progress tracking
    completion_percentage = Column(Float, default=0)
    milestones_achieved = Column(JSON, nullable=True)
    current_phase = Column(String, nullable=True)
    next_milestone = Column(JSON, nullable=True)
    
    # Results and outcomes
    achievements = Column(JSON, nullable=True)
    skills_acquired = Column(JSON, nullable=True)
    business_impact = Column(JSON, nullable=True)
    roi_calculation = Column(JSON, nullable=True)
    
    # Six Figure Barber integration
    coaching_integration = Column(JSON, nullable=True)
    methodology_application = Column(JSON, nullable=True)
    community_engagement = Column(JSON, nullable=True)
    
    # Review and adjustment
    review_schedule = Column(JSON, nullable=True)
    adjustment_history = Column(JSON, nullable=True)
    lessons_learned = Column(JSON, nullable=True)
    
    # Status and metadata
    status = Column(String, default="active")  # active, paused, completed, cancelled
    priority_level = Column(String, default="medium")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")


# ============================================================================
# COMPREHENSIVE DASHBOARD AND ANALYTICS MODELS
# ============================================================================

class SixFBMethodologyDashboard(Base):
    """
    Comprehensive dashboard data for Six Figure Barber methodology tracking.
    Aggregates all core principles into actionable insights and recommendations.
    """
    __tablename__ = "six_fb_methodology_dashboards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    dashboard_date = Column(Date, nullable=False, index=True)
    
    # Overall methodology scores
    overall_methodology_score = Column(Float, default=0)  # 0-100 comprehensive score
    revenue_optimization_score = Column(Float, default=0)
    client_value_score = Column(Float, default=0)
    service_excellence_score = Column(Float, default=0)
    business_efficiency_score = Column(Float, default=0)
    professional_growth_score = Column(Float, default=0)
    
    # Key performance indicators
    monthly_revenue = Column(Numeric(10, 2), default=0)
    revenue_growth_rate = Column(Float, default=0)
    client_retention_rate = Column(Float, default=0)
    average_client_value = Column(Numeric(8, 2), default=0)
    booking_efficiency = Column(Float, default=0)
    
    # Six Figure Barber milestones
    current_milestone_level = Column(String, nullable=True)
    next_milestone_target = Column(String, nullable=True)
    milestone_progress_percentage = Column(Float, default=0)
    estimated_days_to_next_milestone = Column(Integer, nullable=True)
    
    # Priority focus areas
    top_opportunities = Column(JSON, nullable=True)
    critical_improvements_needed = Column(JSON, nullable=True)
    quick_wins_available = Column(JSON, nullable=True)
    
    # Coaching recommendations
    coaching_priorities = Column(JSON, nullable=True)
    recommended_actions = Column(JSON, nullable=True)
    training_suggestions = Column(JSON, nullable=True)
    
    # Trends and insights
    performance_trends = Column(JSON, nullable=True)
    competitive_analysis = Column(JSON, nullable=True)
    market_opportunities = Column(JSON, nullable=True)
    
    # Goals and planning
    active_goals = Column(JSON, nullable=True)
    goal_progress = Column(JSON, nullable=True)
    upcoming_milestones = Column(JSON, nullable=True)
    
    # Success indicators
    success_stories = Column(JSON, nullable=True)
    client_testimonials = Column(JSON, nullable=True)
    achievement_highlights = Column(JSON, nullable=True)
    
    # Metadata
    last_updated = Column(DateTime, default=utcnow)
    data_freshness_score = Column(Float, default=100)  # Data quality indicator
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    user = relationship("User", back_populates="six_fb_dashboards")
    
    # Indexes
    __table_args__ = (
        Index("idx_dashboard_user_date", "user_id", "dashboard_date"),
        Index("idx_dashboard_score", "overall_methodology_score"),
    )