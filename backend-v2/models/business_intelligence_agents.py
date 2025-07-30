"""
Business Intelligence Agent Models for 6FB Booking V2

Specialized AI agents for business coaching, analytics, and Six Figure Barber methodology.
These agents work with calendar data and business metrics to provide intelligent insights.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
from db import Base


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BusinessIntelligenceAgentType(enum.Enum):
    """Specialized business intelligence agent types"""
    FINANCIAL_COACH = "financial_coach"
    GROWTH_STRATEGIST = "growth_strategist"
    OPERATIONS_OPTIMIZER = "operations_optimizer"
    BRAND_DEVELOPER = "brand_developer"
    CLIENT_RETENTION_SPECIALIST = "client_retention_specialist"
    PRICING_OPTIMIZER = "pricing_optimizer"
    CALENDAR_EFFICIENCY_COACH = "calendar_efficiency_coach"
    SIX_FB_COMPLIANCE_MONITOR = "six_fb_compliance_monitor"
    REVENUE_FORECASTER = "revenue_forecaster"
    MARKETING_STRATEGIST = "marketing_strategist"


class CoachingSessionType(enum.Enum):
    """Types of coaching sessions"""
    PRICING_OPTIMIZATION = "pricing_optimization"
    CLIENT_RETENTION_STRATEGY = "client_retention_strategy"
    SERVICE_DOCUMENTATION = "service_documentation"
    CALENDAR_OPTIMIZATION = "calendar_optimization"
    SERVICE_MIX_OPTIMIZATION = "service_mix_optimization"
    SCHEDULING_EFFICIENCY = "scheduling_efficiency"
    REVENUE_GROWTH = "revenue_growth"
    SIX_FB_METHODOLOGY = "six_fb_methodology"
    CUSTOMER_EXPERIENCE = "customer_experience"
    BUSINESS_ANALYTICS = "business_analytics"


class InsightPriority(enum.Enum):
    """Priority levels for business insights"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class CoachingStatus(enum.Enum):
    """Status of coaching sessions"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    FOLLOW_UP_REQUIRED = "follow_up_required"


class BusinessIntelligenceAgent(Base):
    """Business intelligence agents specialized for barbershop coaching"""
    __tablename__ = "business_intelligence_agents"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Agent identification
    name = Column(String(100), nullable=False)
    agent_type = Column(SQLEnum(BusinessIntelligenceAgentType), nullable=False, index=True)
    display_name = Column(String(100), nullable=False)  # User-friendly name
    description = Column(Text, nullable=False)
    
    # Agent personality and coaching style
    coaching_style = Column(String(50), default="supportive")  # supportive, direct, analytical, motivational
    personality_traits = Column(JSON, default=[])  # e.g., ["encouraging", "data-driven", "practical"]
    expertise_areas = Column(JSON, default=[])  # Areas of specialization
    
    # Six Figure Barber methodology configuration
    six_fb_focus_areas = Column(JSON, default=[])  # Which Six FB principles this agent focuses on
    compliance_thresholds = Column(JSON, default={})  # Thresholds for triggering coaching
    methodology_weights = Column(JSON, default={})  # How much weight to give different metrics
    
    # AI Configuration
    system_prompt = Column(Text, nullable=False)
    coaching_prompts = Column(JSON, default={})  # Different prompts for different scenarios
    example_conversations = Column(JSON, default=[])  # Training examples
    
    # Business rules
    trigger_conditions = Column(JSON, default={})  # When to activate this agent
    coaching_frequency = Column(String(20), default="weekly")  # daily, weekly, monthly, triggered
    max_sessions_per_week = Column(Integer, default=2)
    min_data_points_required = Column(Integer, default=5)  # Minimum appointments to analyze
    
    # Performance tracking
    success_metrics = Column(JSON, default=[])  # How to measure coaching success
    improvement_targets = Column(JSON, default={})  # Target improvements
    
    # Pricing and subscription
    tier_requirement = Column(String(20), default="professional")  # Minimum subscription tier
    is_premium_feature = Column(Boolean, default=False)
    monthly_cost = Column(Float, default=0.00)  # Additional cost beyond base subscription
    
    # Status and metadata
    is_active = Column(Boolean, default=True, index=True)
    is_beta = Column(Boolean, default=False)
    version = Column(String(10), default="1.0")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    coaching_sessions = relationship("BusinessCoachingSession", back_populates="agent")
    insights = relationship("BusinessInsight", back_populates="generated_by_agent")
    
    def __repr__(self):
        return f"<BusinessIntelligenceAgent(name={self.name}, type={self.agent_type})>"


class BusinessCoachingSession(Base):
    """Individual coaching sessions between agents and users"""
    __tablename__ = "business_coaching_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    agent_id = Column(Integer, ForeignKey("business_intelligence_agents.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Session details
    session_type = Column(SQLEnum(CoachingSessionType), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Session data
    business_context = Column(JSON, default={})  # Business data that triggered this session
    coaching_goals = Column(JSON, default=[])  # What the session aims to achieve
    recommended_actions = Column(JSON, default=[])  # Specific recommendations
    
    # Conversation tracking
    conversation_history = Column(JSON, default=[])  # Messages exchanged
    key_insights_discussed = Column(JSON, default=[])  # Important points covered
    user_questions = Column(JSON, default=[])  # Questions asked by user
    
    # Progress tracking
    initial_metrics = Column(JSON, default={})  # Business metrics at start
    target_metrics = Column(JSON, default={})  # Target improvements
    current_metrics = Column(JSON, default={})  # Current progress
    
    # Session outcome
    status = Column(SQLEnum(CoachingStatus), default=CoachingStatus.SCHEDULED, index=True)
    completion_percentage = Column(Float, default=0.0)
    user_satisfaction_score = Column(Float)  # 1-10 rating
    follow_up_required = Column(Boolean, default=False)
    next_session_date = Column(DateTime)
    
    # Metadata
    started_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime)
    last_interaction_at = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)
    
    # Relationships
    agent = relationship("BusinessIntelligenceAgent", back_populates="coaching_sessions")
    user = relationship("User")
    insights = relationship("BusinessInsight", back_populates="coaching_session")
    
    def __repr__(self):
        return f"<BusinessCoachingSession(id={self.id}, type={self.session_type}, status={self.status})>"


class BusinessInsight(Base):
    """Business insights generated by AI agents"""
    __tablename__ = "business_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    agent_id = Column(Integer, ForeignKey("business_intelligence_agents.id"), nullable=True, index=True)
    coaching_session_id = Column(Integer, ForeignKey("business_coaching_sessions.id"), nullable=True, index=True)
    
    # Insight details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    insight_category = Column(String(50), nullable=False, index=True)  # revenue, efficiency, client_retention, etc.
    priority = Column(SQLEnum(InsightPriority), nullable=False, index=True)
    
    # Business intelligence data
    data_source = Column(String(50), nullable=False)  # calendar, appointments, payments, etc.
    analysis_period_start = Column(DateTime, nullable=False)
    analysis_period_end = Column(DateTime, nullable=False)
    sample_size = Column(Integer, default=0)  # Number of data points analyzed
    
    # Metrics and recommendations
    current_performance = Column(JSON, default={})  # Current state metrics
    benchmark_performance = Column(JSON, default={})  # Industry/goal benchmarks
    improvement_potential = Column(JSON, default={})  # Potential improvements
    recommended_actions = Column(JSON, default=[])  # Specific action items
    
    # Six Figure Barber methodology
    six_fb_compliance_impact = Column(Float)  # How this affects compliance score
    six_fb_principle_alignment = Column(JSON, default={})  # Which principles this relates to
    expected_revenue_impact = Column(Float)  # Projected revenue impact
    implementation_difficulty = Column(String(20), default="medium")  # easy, medium, hard
    
    # Tracking and outcomes
    is_actionable = Column(Boolean, default=True)
    has_been_acted_on = Column(Boolean, default=False)
    action_taken_date = Column(DateTime)
    outcome_measured = Column(Boolean, default=False)
    actual_impact = Column(JSON, default={})  # Measured results after implementation
    
    # Metadata
    confidence_score = Column(Float, default=0.8)  # AI confidence in the insight
    expires_at = Column(DateTime)  # When insight becomes stale
    is_recurring = Column(Boolean, default=False)  # Recurring insight type
    tags = Column(JSON, default=[])  # Searchable tags
    
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    generated_by_agent = relationship("BusinessIntelligenceAgent", back_populates="insights")
    coaching_session = relationship("BusinessCoachingSession", back_populates="insights")
    
    def __repr__(self):
        return f"<BusinessInsight(id={self.id}, category={self.insight_category}, priority={self.priority})>"


class SixFigureBarberPrincipleTracking(Base):
    """Track adherence to Six Figure Barber methodology principles"""
    __tablename__ = "six_figure_barber_principle_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User and time period
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tracking_period_start = Column(DateTime, nullable=False)
    tracking_period_end = Column(DateTime, nullable=False)
    
    # Six Figure Barber principles tracking
    pricing_excellence_score = Column(Float, default=0.0)  # Premium pricing adherence
    service_excellence_score = Column(Float, default=0.0)  # Service quality metrics
    client_experience_score = Column(Float, default=0.0)  # Client satisfaction and retention
    business_efficiency_score = Column(Float, default=0.0)  # Operational efficiency
    professional_growth_score = Column(Float, default=0.0)  # Skill development and education
    
    # Overall compliance
    overall_compliance_score = Column(Float, default=0.0, index=True)
    compliance_grade = Column(String(5))  # A+, A, B+, B, C+, C, D
    
    # Detailed metrics
    average_service_price = Column(Float)
    client_retention_rate = Column(Float)
    premium_service_ratio = Column(Float)
    client_satisfaction_average = Column(Float)
    booking_efficiency_score = Column(Float)
    
    # Improvement tracking
    improvement_from_previous_period = Column(Float, default=0.0)
    areas_for_improvement = Column(JSON, default=[])
    strengths_identified = Column(JSON, default=[])
    
    # Action items and coaching
    coaching_recommendations = Column(JSON, default=[])
    action_items_completed = Column(JSON, default=[])
    next_review_date = Column(DateTime)
    
    # Metadata
    created_by_agent_id = Column(Integer, ForeignKey("business_intelligence_agents.id"))
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User")
    created_by_agent = relationship("BusinessIntelligenceAgent")
    
    def __repr__(self):
        return f"<SixFigureBarberPrincipleTracking(user_id={self.user_id}, score={self.overall_compliance_score})>"


class CoachingActionItem(Base):
    """Action items generated from coaching sessions"""
    __tablename__ = "coaching_action_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    coaching_session_id = Column(Integer, ForeignKey("business_coaching_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Action item details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    priority = Column(SQLEnum(InsightPriority), nullable=False)
    
    # Implementation details
    estimated_effort_hours = Column(Float)
    estimated_cost = Column(Float)
    expected_roi = Column(Float)
    implementation_deadline = Column(DateTime)
    
    # Progress tracking
    status = Column(String(20), default="pending", index=True)  # pending, in_progress, completed, skipped
    progress_percentage = Column(Float, default=0.0)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Outcome measurement
    success_metrics = Column(JSON, default=[])  # How to measure success
    baseline_metrics = Column(JSON, default={})  # Starting point
    current_metrics = Column(JSON, default={})  # Current measurements
    target_metrics = Column(JSON, default={})  # Success targets
    
    # Notes and updates
    implementation_notes = Column(Text)
    challenges_encountered = Column(JSON, default=[])
    lessons_learned = Column(Text)
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    coaching_session = relationship("BusinessCoachingSession")
    user = relationship("User")
    
    def __repr__(self):
        return f"<CoachingActionItem(id={self.id}, title={self.title}, status={self.status})>"