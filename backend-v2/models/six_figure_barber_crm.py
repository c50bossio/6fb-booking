"""
Six Figure Barber CRM - Advanced Client Relationship Management

This module extends the Six Figure Barber methodology with comprehensive CRM capabilities
focused on maximizing client value, building relationships, and driving revenue growth.

Key Features:
- Enhanced client profiles with relationship scoring
- Communication tracking and engagement optimization  
- Client journey management with automated touchpoints
- Value tier progression with retention strategies
- Predictive analytics for churn and growth opportunities
- Automated workflow triggers for relationship building

All models align with Six Figure Barber principles:
1. Revenue Optimization through client value maximization
2. Premium positioning and relationship quality
3. Data-driven client engagement strategies
4. Automated systems for scale and efficiency
5. Professional growth through client success metrics
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Enum as SQLEnum, Date, Index, Numeric, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta, date, timezone
import enum
from decimal import Decimal
from typing import Dict, Any, Optional, List

from db import Base
from models.six_figure_barber_core import ClientValueTier, SixFBPrinciple


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ============================================================================
# CRM ENUMS AND TYPES
# ============================================================================

class CommunicationType(enum.Enum):
    """Types of client communication"""
    SMS = "sms"
    EMAIL = "email"
    PHONE_CALL = "phone_call"
    IN_PERSON = "in_person"
    SOCIAL_MEDIA = "social_media"
    PUSH_NOTIFICATION = "push_notification"
    DIRECT_MAIL = "direct_mail"
    VIDEO_CALL = "video_call"


class CommunicationStatus(enum.Enum):
    """Status of communication attempts"""
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    RESPONDED = "responded"
    BOUNCED = "bounced"
    FAILED = "failed"
    SCHEDULED = "scheduled"
    DRAFT = "draft"


class EngagementType(enum.Enum):
    """Types of client engagement activities"""
    APPOINTMENT_BOOKING = "appointment_booking"
    SERVICE_COMPLETION = "service_completion"
    PAYMENT_COMPLETION = "payment_completion"
    REVIEW_SUBMISSION = "review_submission"
    REFERRAL_MADE = "referral_made"
    SOCIAL_SHARE = "social_share"
    WEBSITE_VISIT = "website_visit"
    EMAIL_OPEN = "email_open"
    SMS_RESPONSE = "sms_response"
    LOYALTY_REDEMPTION = "loyalty_redemption"
    UPSELL_ACCEPTANCE = "upsell_acceptance"
    FEEDBACK_SUBMISSION = "feedback_submission"


class ClientStage(enum.Enum):
    """Client journey stages in Six Figure Barber methodology"""
    PROSPECT = "prospect"                    # Potential client, not yet booked
    FIRST_TIME_CLIENT = "first_time_client"  # Booked first appointment
    CONVERTING_CLIENT = "converting_client"  # 2-3 visits, evaluating service
    REGULAR_CLIENT = "regular_client"        # Consistent visits, established routine
    LOYAL_CLIENT = "loyal_client"           # High trust, premium service adoption
    ADVOCATE_CLIENT = "advocate_client"      # Actively refers others
    VIP_CLIENT = "vip_client"               # Highest tier, premium everything
    AT_RISK_CLIENT = "at_risk_client"       # Declining engagement, intervention needed
    INACTIVE_CLIENT = "inactive_client"      # No recent activity, retention focus
    WIN_BACK_CLIENT = "win_back_client"     # Re-engaging after inactivity


class TouchpointType(enum.Enum):
    """Types of client touchpoints"""
    WELCOME_SEQUENCE = "welcome_sequence"
    PRE_APPOINTMENT = "pre_appointment"
    POST_APPOINTMENT = "post_appointment"
    BIRTHDAY_OUTREACH = "birthday_outreach"
    RETENTION_CAMPAIGN = "retention_campaign"
    UPSELL_OPPORTUNITY = "upsell_opportunity"
    REVIEW_REQUEST = "review_request"
    REFERRAL_REQUEST = "referral_request"
    SEASONAL_PROMOTION = "seasonal_promotion"
    LOYALTY_REWARD = "loyalty_reward"
    WIN_BACK_CAMPAIGN = "win_back_campaign"
    VIP_RECOGNITION = "vip_recognition"


class WorkflowTrigger(enum.Enum):
    """Automated workflow trigger events"""
    NEW_CLIENT_SIGNUP = "new_client_signup"
    FIRST_APPOINTMENT_COMPLETED = "first_appointment_completed"
    MULTIPLE_NO_SHOWS = "multiple_no_shows"
    HIGH_SPEND_THRESHOLD = "high_spend_threshold"
    BIRTHDAY_APPROACHING = "birthday_approaching"
    OVERDUE_VISIT = "overdue_visit"
    NEGATIVE_FEEDBACK = "negative_feedback"
    POSITIVE_FEEDBACK = "positive_feedback"
    REFERRAL_MADE = "referral_made"
    CHURN_RISK_DETECTED = "churn_risk_detected"
    TIER_UPGRADE_ELIGIBLE = "tier_upgrade_eligible"
    SEASON_CHANGE = "season_change"


# ============================================================================
# ENHANCED CLIENT PROFILE MODELS
# ============================================================================

class SixFBClientCommunicationProfile(Base):
    """
    Enhanced communication profile tracking all client interactions and preferences.
    Essential for building strong relationships aligned with Six Figure Barber methodology.
    """
    __tablename__ = "six_fb_client_communication_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Communication preferences
    preferred_communication_method = Column(SQLEnum(CommunicationType), default=CommunicationType.SMS)
    communication_frequency_preference = Column(String, default="moderate")  # low, moderate, high
    best_contact_time = Column(String, nullable=True)  # "morning", "afternoon", "evening"
    timezone_preference = Column(String, default="UTC")
    
    # Communication permissions and compliance
    sms_consent = Column(Boolean, default=True)
    email_consent = Column(Boolean, default=True)
    phone_consent = Column(Boolean, default=True)
    marketing_consent = Column(Boolean, default=False)
    gdpr_compliant = Column(Boolean, default=True)
    
    # Communication history summary
    total_communications_sent = Column(Integer, default=0)
    total_communications_responded = Column(Integer, default=0)
    response_rate = Column(Float, default=0.0)  # 0-100%
    average_response_time_hours = Column(Float, nullable=True)
    
    # Engagement quality metrics
    engagement_score = Column(Float, default=0.0)  # 0-100 overall engagement
    communication_sentiment = Column(Float, default=50.0)  # 0-100, 50=neutral
    preferred_content_types = Column(JSON, nullable=True)
    communication_patterns = Column(JSON, nullable=True)
    
    # Six Figure Barber communication alignment
    premium_communication_preference = Column(Boolean, default=False)
    personal_touch_importance = Column(Float, default=50.0)  # 0-100 importance score
    relationship_building_stage = Column(String, default="initial")
    
    # Metadata
    last_communication_date = Column(DateTime, nullable=True)
    profile_last_updated = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")
    
    # Indexes
    __table_args__ = (
        Index("idx_comm_profile_user_client", "user_id", "client_id"),
        Index("idx_comm_profile_engagement", "engagement_score"),
    )


class SixFBClientBehaviorAnalytics(Base):
    """
    Advanced client behavior tracking and predictive analytics.
    Powers intelligent recommendations and automated workflows.
    """
    __tablename__ = "six_fb_client_behavior_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    analysis_date = Column(Date, nullable=False, index=True)
    
    # Behavioral patterns
    visit_pattern_consistency = Column(Float, default=0.0)  # 0-100 consistency score
    booking_lead_time_days = Column(Float, nullable=True)
    cancellation_pattern = Column(JSON, nullable=True)
    rescheduling_frequency = Column(Float, default=0.0)
    
    # Service preferences evolution
    service_exploration_rate = Column(Float, default=0.0)  # 0-100 willingness to try new services
    premium_service_adoption_rate = Column(Float, default=0.0)
    add_on_acceptance_rate = Column(Float, default=0.0)
    price_sensitivity_score = Column(Float, default=50.0)  # 0-100, higher = more sensitive
    
    # Digital engagement patterns
    website_engagement_score = Column(Float, default=0.0)
    social_media_engagement = Column(Float, default=0.0)
    review_participation_rate = Column(Float, default=0.0)
    referral_activity_score = Column(Float, default=0.0)
    
    # Predictive indicators
    churn_risk_score = Column(Float, default=0.0)  # 0-100 probability of churning
    upsell_receptivity_score = Column(Float, default=0.0)  # 0-100 likelihood to accept upsells
    lifetime_value_projection = Column(Numeric(10, 2), nullable=True)
    growth_potential_score = Column(Float, default=0.0)  # 0-100 potential for value increase
    
    # Six Figure Barber methodology alignment
    premium_positioning_alignment = Column(Float, default=0.0)  # How well client fits premium brand
    relationship_deepening_potential = Column(Float, default=0.0)
    advocacy_potential_score = Column(Float, default=0.0)
    
    # Behavioral insights
    key_behavioral_traits = Column(JSON, nullable=True)
    engagement_preferences = Column(JSON, nullable=True)
    optimization_opportunities = Column(JSON, nullable=True)
    
    # Machine learning features
    ml_features = Column(JSON, nullable=True)  # Features for ML models
    model_predictions = Column(JSON, nullable=True)  # Model outputs
    prediction_confidence = Column(Float, nullable=True)  # 0-100 confidence in predictions
    
    # Metadata
    last_calculated = Column(DateTime, default=utcnow)
    calculation_version = Column(String, default="1.0")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")
    
    # Indexes
    __table_args__ = (
        Index("idx_behavior_user_client_date", "user_id", "client_id", "analysis_date"),
        Index("idx_behavior_churn_risk", "churn_risk_score"),
        Index("idx_behavior_growth_potential", "growth_potential_score"),
    )


# ============================================================================
# COMMUNICATION TRACKING MODELS
# ============================================================================

class SixFBClientCommunication(Base):
    """
    Comprehensive tracking of all client communications.
    Essential for relationship building and engagement optimization.
    """
    __tablename__ = "six_fb_client_communications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Communication details
    communication_type = Column(SQLEnum(CommunicationType), nullable=False)
    communication_status = Column(SQLEnum(CommunicationStatus), default=CommunicationStatus.SENT)
    subject = Column(String, nullable=True)
    message_content = Column(Text, nullable=True)
    
    # Delivery and timing
    sent_at = Column(DateTime, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    
    # Context and attribution
    campaign_id = Column(String, nullable=True)
    touchpoint_type = Column(SQLEnum(TouchpointType), nullable=True)
    automation_triggered = Column(Boolean, default=False)
    automation_workflow_id = Column(String, nullable=True)
    
    # Six Figure Barber methodology context
    relationship_building_intent = Column(String, nullable=True)  # appreciation, education, promotion, etc.
    value_creation_focus = Column(String, nullable=True)
    premium_positioning_elements = Column(JSON, nullable=True)
    
    # Engagement tracking
    engagement_score = Column(Float, default=0.0)  # 0-100 based on response and interaction
    sentiment_score = Column(Float, nullable=True)  # -100 to +100 sentiment analysis
    response_content = Column(Text, nullable=True)
    response_sentiment = Column(Float, nullable=True)
    
    # Performance metrics
    conversion_generated = Column(Boolean, default=False)
    conversion_value = Column(Numeric(8, 2), nullable=True)
    appointment_booked = Column(Boolean, default=False)
    referral_generated = Column(Boolean, default=False)
    
    # Technical details
    message_id = Column(String, nullable=True)  # External system message ID
    delivery_metadata = Column(JSON, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Personalization data
    personalization_data = Column(JSON, nullable=True)
    dynamic_content_used = Column(JSON, nullable=True)
    a_b_test_variant = Column(String, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")
    
    # Indexes
    __table_args__ = (
        Index("idx_comm_user_client_date", "user_id", "client_id", "sent_at"),
        Index("idx_comm_type_status", "communication_type", "communication_status"),
        Index("idx_comm_campaign", "campaign_id"),
        Index("idx_comm_touchpoint", "touchpoint_type"),
    )


class SixFBClientEngagementHistory(Base):
    """
    Tracks all client engagement activities for relationship scoring and optimization.
    """
    __tablename__ = "six_fb_client_engagement_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Engagement details
    engagement_type = Column(SQLEnum(EngagementType), nullable=False)
    engagement_date = Column(DateTime, nullable=False)
    engagement_value = Column(Float, default=0.0)  # Weighted value for scoring
    
    # Context and attribution
    source_type = Column(String, nullable=True)  # app, website, email, etc.
    source_details = Column(JSON, nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    communication_id = Column(Integer, ForeignKey("six_fb_client_communications.id"), nullable=True)
    
    # Engagement quality
    engagement_quality_score = Column(Float, default=0.0)  # 0-100 quality rating
    engagement_duration_seconds = Column(Integer, nullable=True)
    engagement_depth = Column(String, nullable=True)  # surface, moderate, deep
    
    # Six Figure Barber alignment
    relationship_building_contribution = Column(Float, default=0.0)  # 0-100 contribution score
    value_demonstration_score = Column(Float, default=0.0)
    premium_brand_alignment = Column(Float, default=0.0)
    
    # Impact measurement
    revenue_impact = Column(Numeric(8, 2), nullable=True)
    retention_impact_score = Column(Float, nullable=True)
    advocacy_impact_score = Column(Float, nullable=True)
    
    # Additional data
    engagement_metadata = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")
    appointment = relationship("Appointment")
    communication = relationship("SixFBClientCommunication")
    
    # Indexes
    __table_args__ = (
        Index("idx_engagement_user_client_date", "user_id", "client_id", "engagement_date"),
        Index("idx_engagement_type_value", "engagement_type", "engagement_value"),
        Index("idx_engagement_quality", "engagement_quality_score"),
    )


# ============================================================================
# CLIENT JOURNEY AND TOUCHPOINT MANAGEMENT
# ============================================================================

class SixFBClientJourneyStage(Base):
    """
    Enhanced client journey tracking with automated stage progression.
    """
    __tablename__ = "six_fb_client_journey_stages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Current stage information
    current_stage = Column(SQLEnum(ClientStage), nullable=False, index=True)
    stage_entry_date = Column(Date, nullable=False)
    days_in_current_stage = Column(Integer, default=0)
    previous_stage = Column(SQLEnum(ClientStage), nullable=True)
    
    # Stage progression metrics
    progression_score = Column(Float, default=0.0)  # 0-100 readiness for next stage
    stage_completion_percentage = Column(Float, default=0.0)  # 0-100 completion of current stage
    expected_next_stage = Column(SQLEnum(ClientStage), nullable=True)
    expected_progression_date = Column(Date, nullable=True)
    
    # Stage requirements and milestones
    required_milestones = Column(JSON, nullable=True)
    completed_milestones = Column(JSON, nullable=True)
    milestone_completion_rate = Column(Float, default=0.0)
    
    # Six Figure Barber methodology alignment
    value_tier_alignment = Column(SQLEnum(ClientValueTier), nullable=True)
    relationship_quality_score = Column(Float, default=0.0)  # 0-100
    premium_positioning_readiness = Column(Float, default=0.0)  # 0-100
    
    # Touchpoint optimization
    recommended_touchpoints = Column(JSON, nullable=True)
    active_touchpoint_sequences = Column(JSON, nullable=True)
    touchpoint_effectiveness_score = Column(Float, default=0.0)
    
    # Risk and opportunity assessment
    regression_risk_score = Column(Float, default=0.0)  # 0-100 risk of moving backward
    acceleration_opportunity_score = Column(Float, default=0.0)  # 0-100 opportunity to advance
    intervention_required = Column(Boolean, default=False)
    intervention_type = Column(String, nullable=True)
    
    # Performance tracking
    stage_performance_metrics = Column(JSON, nullable=True)
    comparative_performance = Column(JSON, nullable=True)  # vs. similar clients
    optimization_suggestions = Column(JSON, nullable=True)
    
    # Metadata
    last_calculated = Column(DateTime, default=utcnow)
    calculation_trigger = Column(String, nullable=True)  # manual, automatic, scheduled
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")
    
    # Indexes
    __table_args__ = (
        Index("idx_journey_user_client_stage", "user_id", "client_id", "current_stage"),
        Index("idx_journey_progression", "progression_score"),
        Index("idx_journey_risk", "regression_risk_score"),
    )


class SixFBClientTouchpointPlan(Base):
    """
    Planned and executed touchpoints for optimal client relationship building.
    """
    __tablename__ = "six_fb_client_touchpoint_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    journey_stage_id = Column(Integer, ForeignKey("six_fb_client_journey_stages.id"), nullable=True)
    
    # Touchpoint definition
    touchpoint_type = Column(SQLEnum(TouchpointType), nullable=False)
    touchpoint_name = Column(String, nullable=False)
    touchpoint_description = Column(Text, nullable=True)
    
    # Scheduling and execution
    planned_date = Column(DateTime, nullable=False)
    executed_date = Column(DateTime, nullable=True)
    status = Column(String, default="planned")  # planned, scheduled, executed, cancelled, failed
    
    # Touchpoint configuration
    communication_channels = Column(JSON, nullable=True)  # Channels to use
    message_template_id = Column(String, nullable=True)
    personalization_data = Column(JSON, nullable=True)
    automation_workflow = Column(Boolean, default=False)
    
    # Six Figure Barber methodology alignment
    relationship_building_objective = Column(String, nullable=True)
    value_creation_goal = Column(String, nullable=True)
    premium_positioning_elements = Column(JSON, nullable=True)
    expected_client_experience = Column(Text, nullable=True)
    
    # Success criteria and measurement
    success_criteria = Column(JSON, nullable=True)
    success_metrics = Column(JSON, nullable=True)
    target_engagement_score = Column(Float, nullable=True)
    target_response_rate = Column(Float, nullable=True)
    
    # Execution results
    actual_engagement_score = Column(Float, nullable=True)
    actual_response_rate = Column(Float, nullable=True)
    client_feedback = Column(Text, nullable=True)
    execution_notes = Column(Text, nullable=True)
    
    # Performance analysis
    effectiveness_score = Column(Float, nullable=True)  # 0-100 overall effectiveness
    relationship_impact = Column(Float, nullable=True)  # Impact on relationship quality
    revenue_impact = Column(Numeric(8, 2), nullable=True)
    follow_up_touchpoints_generated = Column(JSON, nullable=True)
    
    # Optimization data
    optimization_suggestions = Column(JSON, nullable=True)
    a_b_test_data = Column(JSON, nullable=True)
    learnings_captured = Column(JSON, nullable=True)
    
    # Metadata
    created_by = Column(String, nullable=True)  # system, user, workflow
    priority_level = Column(String, default="medium")  # low, medium, high, urgent
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")
    journey_stage = relationship("SixFBClientJourneyStage")
    
    # Indexes
    __table_args__ = (
        Index("idx_touchpoint_user_client_date", "user_id", "client_id", "planned_date"),
        Index("idx_touchpoint_type_status", "touchpoint_type", "status"),
        Index("idx_touchpoint_effectiveness", "effectiveness_score"),
    )


# ============================================================================
# AUTOMATED WORKFLOW MODELS
# ============================================================================

class SixFBAutomatedWorkflow(Base):
    """
    Automated workflow definitions for intelligent client relationship management.
    """
    __tablename__ = "six_fb_automated_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Workflow definition
    workflow_name = Column(String, nullable=False)
    workflow_description = Column(Text, nullable=True)
    workflow_type = Column(String, nullable=False)  # touchpoint_sequence, retention_campaign, etc.
    
    # Trigger configuration
    trigger_event = Column(SQLEnum(WorkflowTrigger), nullable=False)
    trigger_conditions = Column(JSON, nullable=True)  # Additional conditions for triggering
    trigger_frequency = Column(String, default="once")  # once, daily, weekly, monthly
    
    # Target criteria
    target_client_criteria = Column(JSON, nullable=True)
    target_client_stages = Column(JSON, nullable=True)
    target_value_tiers = Column(JSON, nullable=True)
    exclusion_criteria = Column(JSON, nullable=True)
    
    # Workflow steps
    workflow_steps = Column(JSON, nullable=False)  # Sequence of actions
    step_timing = Column(JSON, nullable=True)  # Timing between steps
    personalization_rules = Column(JSON, nullable=True)
    
    # Six Figure Barber methodology alignment
    methodology_principle = Column(SQLEnum(SixFBPrinciple), nullable=False)
    relationship_building_focus = Column(String, nullable=True)
    value_creation_objective = Column(String, nullable=True)
    premium_positioning_strategy = Column(JSON, nullable=True)
    
    # Performance configuration
    success_metrics = Column(JSON, nullable=True)
    optimization_criteria = Column(JSON, nullable=True)
    a_b_testing_enabled = Column(Boolean, default=False)
    machine_learning_optimization = Column(Boolean, default=False)
    
    # Status and controls
    is_active = Column(Boolean, default=True)
    priority_level = Column(String, default="medium")
    max_concurrent_executions = Column(Integer, default=100)
    
    # Performance tracking
    total_executions = Column(Integer, default=0)
    successful_executions = Column(Integer, default=0)
    failed_executions = Column(Integer, default=0)
    average_success_rate = Column(Float, default=0.0)
    
    # Results and optimization
    total_revenue_generated = Column(Numeric(10, 2), default=0)
    total_appointments_booked = Column(Integer, default=0)
    average_engagement_improvement = Column(Float, default=0.0)
    optimization_history = Column(JSON, nullable=True)
    
    # Metadata
    created_by = Column(String, nullable=True)
    last_optimization_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_workflow_user_active", "user_id", "is_active"),
        Index("idx_workflow_trigger", "trigger_event"),
        Index("idx_workflow_success_rate", "average_success_rate"),
    )


class SixFBWorkflowExecution(Base):
    """
    Tracks individual workflow executions for performance monitoring and optimization.
    """
    __tablename__ = "six_fb_workflow_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("six_fb_automated_workflows.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Execution details
    execution_id = Column(String, nullable=False, unique=True, index=True)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running, completed, failed, cancelled
    
    # Trigger context
    trigger_event_data = Column(JSON, nullable=True)
    trigger_timestamp = Column(DateTime, nullable=False)
    trigger_source = Column(String, nullable=True)
    
    # Execution steps
    current_step = Column(Integer, default=0)
    total_steps = Column(Integer, nullable=False)
    completed_steps = Column(JSON, nullable=True)
    failed_steps = Column(JSON, nullable=True)
    
    # Personalization applied
    personalization_data_used = Column(JSON, nullable=True)
    dynamic_content_generated = Column(JSON, nullable=True)
    client_context_applied = Column(JSON, nullable=True)
    
    # Performance tracking
    engagement_generated = Column(Float, default=0.0)
    response_rate = Column(Float, nullable=True)
    conversion_achieved = Column(Boolean, default=False)
    revenue_generated = Column(Numeric(8, 2), default=0)
    
    # Quality metrics
    client_satisfaction_score = Column(Float, nullable=True)
    relationship_impact_score = Column(Float, nullable=True)
    brand_consistency_score = Column(Float, nullable=True)
    
    # Error handling
    error_details = Column(JSON, nullable=True)
    retry_count = Column(Integer, default=0)
    recovery_actions = Column(JSON, nullable=True)
    
    # Results and learnings
    success_criteria_met = Column(JSON, nullable=True)
    execution_metrics = Column(JSON, nullable=True)
    learnings_captured = Column(JSON, nullable=True)
    optimization_suggestions = Column(JSON, nullable=True)
    
    # Metadata
    execution_version = Column(String, default="1.0")
    a_b_test_variant = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    workflow = relationship("SixFBAutomatedWorkflow")
    user = relationship("User")
    client = relationship("Client")
    
    # Indexes
    __table_args__ = (
        Index("idx_execution_workflow_date", "workflow_id", "started_at"),
        Index("idx_execution_client_status", "client_id", "status"),
        Index("idx_execution_revenue", "revenue_generated"),
    )


# ============================================================================
# VALUE TIER AND RETENTION MODELS
# ============================================================================

class SixFBClientValueTierHistory(Base):
    """
    Tracks client value tier changes over time for retention and growth analysis.
    """
    __tablename__ = "six_fb_client_value_tier_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Tier change details
    previous_tier = Column(SQLEnum(ClientValueTier), nullable=True)
    new_tier = Column(SQLEnum(ClientValueTier), nullable=False)
    change_date = Column(Date, nullable=False)
    change_reason = Column(String, nullable=True)  # automatic, manual, intervention
    
    # Change triggers and context
    triggering_event = Column(String, nullable=True)
    triggering_metrics = Column(JSON, nullable=True)
    change_justification = Column(Text, nullable=True)
    
    # Tier performance at time of change
    lifetime_value_at_change = Column(Numeric(10, 2), nullable=True)
    relationship_score_at_change = Column(Float, nullable=True)
    engagement_score_at_change = Column(Float, nullable=True)
    
    # Six Figure Barber methodology impact
    revenue_impact_projected = Column(Numeric(8, 2), nullable=True)
    relationship_building_plan = Column(JSON, nullable=True)
    value_creation_opportunities = Column(JSON, nullable=True)
    
    # Change management
    tier_change_communication_sent = Column(Boolean, default=False)
    tier_benefits_activated = Column(JSON, nullable=True)
    tier_requirements_updated = Column(JSON, nullable=True)
    
    # Monitoring and validation
    change_success_metrics = Column(JSON, nullable=True)
    tier_stability_score = Column(Float, nullable=True)  # 0-100 likelihood to maintain tier
    progression_readiness_score = Column(Float, nullable=True)  # 0-100 readiness for next tier
    
    # Metadata
    changed_by = Column(String, nullable=True)  # system, user_id, automation
    validation_required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    user = relationship("User")
    client = relationship("Client")
    
    # Indexes
    __table_args__ = (
        Index("idx_tier_history_client_date", "client_id", "change_date"),
        Index("idx_tier_history_user_tier", "user_id", "new_tier"),
    )


class SixFBRetentionCampaign(Base):
    """
    Manages targeted retention campaigns for at-risk and churning clients.
    """
    __tablename__ = "six_fb_retention_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Campaign definition
    campaign_name = Column(String, nullable=False)
    campaign_description = Column(Text, nullable=True)
    campaign_type = Column(String, nullable=False)  # churn_prevention, win_back, engagement_boost
    
    # Target criteria
    target_client_criteria = Column(JSON, nullable=False)
    target_risk_score_range = Column(JSON, nullable=True)  # min/max churn risk scores
    target_value_tiers = Column(JSON, nullable=True)
    target_inactivity_days = Column(Integer, nullable=True)
    
    # Campaign timeline
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    duration_days = Column(Integer, nullable=True)
    
    # Campaign strategy
    retention_strategy = Column(JSON, nullable=False)  # Steps and tactics
    communication_sequence = Column(JSON, nullable=True)
    incentive_structure = Column(JSON, nullable=True)
    personal_outreach_included = Column(Boolean, default=False)
    
    # Six Figure Barber methodology alignment
    relationship_recovery_approach = Column(JSON, nullable=True)
    value_re_demonstration_plan = Column(JSON, nullable=True)
    premium_positioning_maintenance = Column(JSON, nullable=True)
    
    # Performance tracking
    target_clients_identified = Column(Integer, default=0)
    clients_enrolled = Column(Integer, default=0)
    clients_responded = Column(Integer, default=0)
    clients_retained = Column(Integer, default=0)
    clients_reactivated = Column(Integer, default=0)
    
    # Success metrics
    retention_rate = Column(Float, default=0.0)  # % of at-risk clients retained
    reactivation_rate = Column(Float, default=0.0)  # % of inactive clients reactivated
    revenue_recovered = Column(Numeric(10, 2), default=0)
    relationship_improvement_score = Column(Float, default=0.0)
    
    # Campaign optimization
    a_b_test_variants = Column(JSON, nullable=True)
    optimization_insights = Column(JSON, nullable=True)
    success_factors = Column(JSON, nullable=True)
    improvement_recommendations = Column(JSON, nullable=True)
    
    # Status and controls
    status = Column(String, default="planned")  # planned, active, paused, completed, cancelled
    budget_allocated = Column(Numeric(8, 2), nullable=True)
    budget_spent = Column(Numeric(8, 2), default=0)
    roi_achieved = Column(Float, nullable=True)
    
    # Metadata
    created_by = Column(String, nullable=True)
    last_optimization_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_retention_user_status", "user_id", "status"),
        Index("idx_retention_dates", "start_date", "end_date"),
        Index("idx_retention_roi", "roi_achieved"),
    )


# ============================================================================
# ANALYTICS AND INSIGHTS MODELS
# ============================================================================

class SixFBClientAnalyticsSummary(Base):
    """
    Comprehensive analytics summary for CRM dashboard and insights.
    """
    __tablename__ = "six_fb_client_analytics_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    summary_date = Column(Date, nullable=False, index=True)
    summary_period = Column(String, default="daily")  # daily, weekly, monthly, quarterly
    
    # Client base metrics
    total_clients = Column(Integer, default=0)
    new_clients_acquired = Column(Integer, default=0)
    clients_retained = Column(Integer, default=0)
    clients_lost = Column(Integer, default=0)
    client_growth_rate = Column(Float, default=0.0)
    
    # Value tier distribution
    premium_vip_clients = Column(Integer, default=0)
    core_regular_clients = Column(Integer, default=0)
    developing_clients = Column(Integer, default=0)
    occasional_clients = Column(Integer, default=0)
    at_risk_clients = Column(Integer, default=0)
    
    # Relationship quality metrics
    average_relationship_score = Column(Float, default=0.0)
    average_engagement_score = Column(Float, default=0.0)
    average_communication_response_rate = Column(Float, default=0.0)
    relationship_improvement_rate = Column(Float, default=0.0)
    
    # Financial metrics
    total_client_lifetime_value = Column(Numeric(12, 2), default=0)
    average_client_lifetime_value = Column(Numeric(10, 2), default=0)
    revenue_per_client = Column(Numeric(8, 2), default=0)
    client_acquisition_cost = Column(Numeric(8, 2), nullable=True)
    
    # Retention and churn metrics
    retention_rate = Column(Float, default=0.0)
    churn_rate = Column(Float, default=0.0)
    average_churn_risk_score = Column(Float, default=0.0)
    clients_at_high_churn_risk = Column(Integer, default=0)
    
    # Engagement and communication metrics
    total_communications_sent = Column(Integer, default=0)
    total_engagements_generated = Column(Integer, default=0)
    communication_effectiveness_score = Column(Float, default=0.0)
    touchpoint_success_rate = Column(Float, default=0.0)
    
    # Six Figure Barber methodology performance
    premium_positioning_score = Column(Float, default=0.0)
    relationship_building_effectiveness = Column(Float, default=0.0)
    value_creation_success_rate = Column(Float, default=0.0)
    methodology_alignment_score = Column(Float, default=0.0)
    
    # Automation and efficiency
    automated_workflows_executed = Column(Integer, default=0)
    automation_success_rate = Column(Float, default=0.0)
    time_saved_through_automation_hours = Column(Float, default=0.0)
    manual_intervention_required = Column(Integer, default=0)
    
    # Growth and opportunity metrics
    upsell_opportunities_identified = Column(Integer, default=0)
    tier_progression_opportunities = Column(Integer, default=0)
    referral_potential_score = Column(Float, default=0.0)
    expansion_revenue_potential = Column(Numeric(10, 2), default=0)
    
    # Key insights and recommendations
    top_performing_strategies = Column(JSON, nullable=True)
    areas_needing_attention = Column(JSON, nullable=True)
    optimization_opportunities = Column(JSON, nullable=True)
    recommended_actions = Column(JSON, nullable=True)
    
    # Metadata
    calculation_timestamp = Column(DateTime, default=utcnow)
    data_freshness_score = Column(Float, default=100.0)
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index("idx_analytics_user_date", "user_id", "summary_date"),
        Index("idx_analytics_period", "summary_period"),
    )