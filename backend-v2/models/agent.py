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
from database import Base


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AgentType(enum.Enum):
    """Types of available agents - aligned with frontend interface"""
    BOOKING_ASSISTANT = "booking_assistant"
    CUSTOMER_SERVICE = "customer_service"
    MARKETING_ASSISTANT = "marketing_assistant"
    ANALYTICS_ASSISTANT = "analytics_assistant"
    SALES_ASSISTANT = "sales_assistant"
    RETENTION_SPECIALIST = "retention_specialist"
    
    # Legacy types for backward compatibility
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
    """Agent instance status - aligned with frontend interface"""
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    
    # Legacy statuses for backward compatibility
    DRAFT = "draft"
    INACTIVE = "inactive"


class ConversationStatus(enum.Enum):
    """Status of agent conversations - aligned with frontend interface"""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"
    
    # Legacy statuses for backward compatibility
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_RESPONSE = "waiting_response"
    FAILED = "failed"
    OPTED_OUT = "opted_out"


class SubscriptionTier(enum.Enum):
    """Agent subscription tiers"""
    TRIAL = "trial"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
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
    capabilities = Column(JSON, default=[])
    required_permissions = Column(JSON, default=[])
    supported_channels = Column(JSON, default=["sms", "email"])
    
    # Cost estimation fields for frontend
    estimated_cost_per_month = Column(Float, default=0.0)
    
    # Owner/creator tracking
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Business rules
    min_interval_hours = Column(Integer, default=24)  # Minimum time between messages
    max_attempts = Column(Integer, default=3)  # Max attempts per conversation
    
    # Pricing
    base_price = Column(Float, default=29.99)  # Monthly base price
    token_rate = Column(Float, default=0.0001)  # Cost per token
    success_fee_percent = Column(Float, default=2.0)  # Success fee percentage
    
    # Metadata
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    
    # Soft delete support
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    instances = relationship("AgentInstance", back_populates="agent", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_agent_type_active', 'agent_type', 'is_active'),
        Index('idx_agent_not_deleted', 'is_deleted', 'is_active'),
        Index('idx_agent_created_by', 'created_by_id', 'is_active'),
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
    status = Column(SQLEnum(AgentStatus), default=AgentStatus.STOPPED, index=True)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    error_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    
    # Performance metrics
    total_conversations = Column(Integer, default=0)
    total_messages = Column(Integer, default=0)
    successful_conversations = Column(Integer, default=0)
    total_revenue_generated = Column(Float, default=0.0)
    uptime_percentage = Column(Float, default=100.0)
    
    # Activity tracking
    last_activity = Column(DateTime, nullable=True)
    
    # Activation
    activated_at = Column(DateTime, nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    
    # Soft delete support
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
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
        Index('idx_agent_instance_not_deleted', 'is_deleted', 'status'),
        Index('idx_agent_instance_last_activity', 'last_activity', 'status'),
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
    
    # Soft delete support
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
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
        Index('idx_conversation_not_deleted', 'is_deleted', 'status'),
        Index('idx_conversation_last_message', 'last_message_at', 'status'),
    )


class AgentMessage(Base):
    """Individual messages within agent conversations"""
    __tablename__ = "agent_messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    conversation_id = Column(String(36), ForeignKey("agent_conversations.conversation_id"), nullable=False)
    
    # Message details
    sender_type = Column(String(20), nullable=False, index=True)  # user, agent, system
    sender_id = Column(Integer, nullable=True)  # Reference to user/client if applicable
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text")  # text, image, action, etc.
    
    # AI processing details
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    token_cost = Column(Float, default=0.0)
    
    # Processing metadata
    metadata = Column(JSON, default={})
    processing_time_ms = Column(Integer, nullable=True)
    ai_provider = Column(String(50), nullable=True)
    ai_model = Column(String(100), nullable=True)
    
    # Status and timing
    is_delivered = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    # Soft delete support
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    conversation = relationship("AgentConversation", backref="messages")
    
    # Indexes
    __table_args__ = (
        Index('idx_message_conversation_created', 'conversation_id', 'created_at'),
        Index('idx_message_sender_type', 'sender_type', 'created_at'),
        Index('idx_message_not_deleted', 'is_deleted', 'created_at'),
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
    
    # Billing
    monthly_price = Column(Float, default=0.0)
    stripe_subscription_id = Column(String(100), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)
    
    # Usage limits
    conversation_limit = Column(Integer, nullable=True)  # None = unlimited
    agent_limit = Column(Integer, default=3)
    included_tokens = Column(Integer, default=0)
    
    # Usage tracking (current period)
    conversations_used = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    overage_tokens = Column(Integer, default=0)
    overage_charges = Column(Float, default=0.0)
    
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