"""
AI Agent Models for BookedBarber V2
Enables barbershops to deploy automated agents for various business tasks
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text, JSON, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime, timezone
from db import Base


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AgentType(enum.Enum):
    """Types of available agents"""
    REBOOKING = "rebooking"
    NO_SHOW_FEE = "no_show_fee"
    BIRTHDAY_WISHES = "birthday_wishes"
    HOLIDAY_GREETINGS = "holiday_greetings"
    REVIEW_REQUEST = "review_request"
    RETENTION = "retention"
    UPSELL = "upsell"
    APPOINTMENT_REMINDER = "appointment_reminder"
    CUSTOM = "custom"


class AgentStatus(enum.Enum):
    """Agent instance status"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    INACTIVE = "inactive"
    ERROR = "error"


class ConversationStatus(enum.Enum):
    """Status of agent conversations"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_RESPONSE = "waiting_response"
    COMPLETED = "completed"
    FAILED = "failed"
    OPTED_OUT = "opted_out"


class SubscriptionTier(enum.Enum):
    """Agent subscription tiers - Optimized pricing structure"""
    TRIAL = "trial"
    STARTER = "starter"      # $10/month - 1 agent, 5K tokens
    PROFESSIONAL = "professional"  # $25/month - 3 agents, 15K tokens
    BUSINESS = "business"    # $50/month - unlimited agents, 50K tokens
    ENTERPRISE = "enterprise"  # Custom pricing
    CUSTOM = "custom"


class Agent(Base):
    """Agent template definitions"""
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    agent_type = Column(SQLEnum(AgentType), nullable=False, index=True)
    description = Column(Text)
    
    # Configuration templates
    default_config = Column(JSON, nullable=False, default={})
    prompt_templates = Column(JSON, nullable=False, default={})
    
    # Capabilities and requirements
    required_permissions = Column(JSON, default=[])
    supported_channels = Column(JSON, default=["sms", "email"])
    
    # Business rules
    min_interval_hours = Column(Integer, default=24)  # Minimum time between messages
    max_attempts = Column(Integer, default=3)  # Max attempts per conversation
    
    # Pricing - Optimized for accessibility and usage-based scaling
    base_price = Column(Float, default=10.00)  # Monthly base price (reduced for accessibility)
    token_rate = Column(Float, default=0.0005)  # Cost per token (increased margin)
    success_fee_percent = Column(Float, default=1.5)  # Success fee percentage (slightly reduced)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    instances = relationship("AgentInstance", back_populates="agent", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_agent_type_active', 'agent_type', 'is_active'),
    )


class AgentInstance(Base):
    """Active agent instances for each barbershop"""
    __tablename__ = "agent_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Barbershop owner
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)
    
    # Instance configuration
    name = Column(String(100), nullable=False)  # Custom name
    config = Column(JSON, nullable=False, default={})  # Instance-specific config
    
    # Scheduling
    schedule_config = Column(JSON, default={
        "enabled": True,
        "timezone": "America/New_York",
        "active_hours": {"start": "09:00", "end": "19:00"},
        "active_days": ["mon", "tue", "wed", "thu", "fri", "sat"]
    })
    
    # Status and health
    status = Column(SQLEnum(AgentStatus), default=AgentStatus.DRAFT, index=True)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    error_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    
    # Performance metrics
    total_conversations = Column(Integer, default=0)
    successful_conversations = Column(Integer, default=0)
    total_revenue_generated = Column(Float, default=0.0)
    
    # Activation
    activated_at = Column(DateTime, nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    agent = relationship("Agent", back_populates="instances")
    user = relationship("User", foreign_keys=[user_id])
    conversations = relationship("AgentConversation", back_populates="agent_instance", cascade="all, delete-orphan")
    metrics = relationship("AgentMetrics", back_populates="agent_instance", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_agent_instance_user_status', 'user_id', 'status'),
        Index('idx_agent_instance_next_run', 'next_run_at', 'status'),
    )


class AgentConversation(Base):
    """Track individual agent-client conversations"""
    __tablename__ = "agent_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    agent_instance_id = Column(Integer, ForeignKey("agent_instances.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Conversation details
    channel = Column(String(20), nullable=False)  # sms, email
    status = Column(SQLEnum(ConversationStatus), default=ConversationStatus.PENDING, index=True)
    
    # Message tracking
    messages = Column(JSON, default=[])  # Array of message objects
    message_count = Column(Integer, default=0)
    
    # AI usage
    total_tokens_used = Column(Integer, default=0)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    token_cost = Column(Float, default=0.0)
    
    # Outcomes
    goal_achieved = Column(Boolean, nullable=True)
    revenue_generated = Column(Float, default=0.0)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    
    # Context data
    context_data = Column(JSON, default={})  # Client history, preferences, etc.
    
    # Timing
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    last_message_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    agent_instance = relationship("AgentInstance", back_populates="conversations")
    client = relationship("Client", backref="agent_conversations")
    appointment = relationship("Appointment", backref="agent_conversation")
    
    # Indexes
    __table_args__ = (
        Index('idx_conversation_status_scheduled', 'status', 'scheduled_at'),
        Index('idx_conversation_client_agent', 'client_id', 'agent_instance_id'),
    )


class AgentMetrics(Base):
    """Daily metrics for agent performance"""
    __tablename__ = "agent_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_instance_id = Column(Integer, ForeignKey("agent_instances.id"), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    
    # Volume metrics
    conversations_started = Column(Integer, default=0)
    conversations_completed = Column(Integer, default=0)
    conversations_failed = Column(Integer, default=0)
    messages_sent = Column(Integer, default=0)
    messages_received = Column(Integer, default=0)
    
    # Success metrics
    goals_achieved = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    response_rate = Column(Float, default=0.0)
    
    # Financial metrics
    revenue_generated = Column(Float, default=0.0)
    tokens_used = Column(Integer, default=0)
    token_cost = Column(Float, default=0.0)
    roi = Column(Float, default=0.0)
    
    # Performance metrics
    avg_response_time_minutes = Column(Float, nullable=True)
    avg_conversation_duration_minutes = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    agent_instance = relationship("AgentInstance", back_populates="metrics")
    
    # Indexes
    __table_args__ = (
        Index('idx_metrics_instance_date', 'agent_instance_id', 'date'),
    )


class AgentSubscription(Base):
    """Subscription and billing for agent features"""
    __tablename__ = "agent_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Subscription details
    tier = Column(SQLEnum(SubscriptionTier), default=SubscriptionTier.TRIAL, index=True)
    status = Column(String(20), default="active", index=True)  # active, past_due, cancelled
    
    # Billing - New accessible pricing tiers
    monthly_price = Column(Float, default=10.00)  # Starter tier default
    stripe_subscription_id = Column(String(100), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)
    
    # Usage limits - Tiered structure with generous token allowances
    conversation_limit = Column(Integer, nullable=True)  # None = unlimited
    agent_limit = Column(Integer, default=1)  # Default for starter
    included_tokens = Column(Integer, default=5000)  # Free tokens included
    
    # Usage tracking (current period) - Enhanced for tiered pricing
    conversations_used = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    overage_tokens = Column(Integer, default=0)
    overage_charges = Column(Float, default=0.0)
    
    # Token usage breakdown by tier (JSON)
    token_tier_breakdown = Column(JSON, default={})
    token_tier_costs = Column(JSON, default={})
    
    # Success-based revenue tracking
    monthly_revenue_generated = Column(Float, default=0.0)
    success_fees_charged = Column(Float, default=0.0)
    
    # Dates
    trial_ends_at = Column(DateTime, nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="agent_subscription")
    
    # Indexes
    __table_args__ = (
        Index('idx_subscription_status_tier', 'status', 'tier'),
    )


class AgentTemplate(Base):
    """Saved conversation templates and prompts"""
    __tablename__ = "agent_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_type = Column(SQLEnum(AgentType), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Template content
    system_prompt = Column(Text, nullable=False)
    initial_message_template = Column(Text, nullable=False)
    follow_up_templates = Column(JSON, default=[])
    
    # Variables and personalization
    required_variables = Column(JSON, default=[])  # e.g., ["client_name", "last_service"]
    tone_settings = Column(JSON, default={
        "formality": "professional",
        "enthusiasm": "moderate",
        "emoji_usage": "minimal"
    })
    
    # Performance data
    usage_count = Column(Integer, default=0)
    avg_success_rate = Column(Float, nullable=True)
    
    # Ownership
    is_system = Column(Boolean, default=False)  # System vs user-created
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_template_type_active', 'agent_type', 'is_active'),
    )