"""
Pydantic schemas for AI Agent functionality
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AgentType(str, Enum):
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


class AgentStatus(str, Enum):
    """Agent instance status - aligned with frontend interface"""
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    
    # Legacy statuses for backward compatibility
    DRAFT = "draft"
    INACTIVE = "inactive"


class ConversationStatus(str, Enum):
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


class SubscriptionTier(str, Enum):
    """Agent subscription tiers"""
    TRIAL = "trial"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class ConversationChannel(str, Enum):
    """Communication channels"""
    SMS = "sms"
    EMAIL = "email"


# Base schemas
class AgentBase(BaseModel):
    """Base agent schema"""
    name: str = Field(..., max_length=100)
    agent_type: AgentType
    description: Optional[str] = None
    is_active: bool = True


class AgentCreate(AgentBase):
    """Schema for creating an agent template"""
    default_config: Dict[str, Any] = Field(default_factory=dict)
    prompt_templates: Dict[str, str] = Field(default_factory=dict)
    required_permissions: List[str] = Field(default_factory=list)
    supported_channels: List[ConversationChannel] = Field(default_factory=lambda: [ConversationChannel.SMS, ConversationChannel.EMAIL])
    min_interval_hours: int = Field(24, ge=1)
    max_attempts: int = Field(3, ge=1, le=10)
    base_price: float = Field(29.99, ge=0)
    token_rate: float = Field(0.0001, ge=0)
    success_fee_percent: float = Field(2.0, ge=0, le=100)
    is_premium: bool = False


class AgentResponse(AgentBase):
    """Schema for agent responses"""
    id: int
    default_config: Dict[str, Any]
    prompt_templates: Dict[str, str]
    required_permissions: List[str]
    supported_channels: List[str]
    min_interval_hours: int
    max_attempts: int
    base_price: float
    token_rate: float
    success_fee_percent: float
    is_premium: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Agent Instance schemas
class AgentInstanceBase(BaseModel):
    """Base agent instance schema"""
    name: str = Field(..., max_length=100)
    config: Dict[str, Any] = Field(default_factory=dict)
    schedule_config: Dict[str, Any] = Field(default_factory=lambda: {
        "enabled": True,
        "timezone": "America/New_York",
        "active_hours": {"start": "09:00", "end": "19:00"},
        "active_days": ["mon", "tue", "wed", "thu", "fri", "sat"]
    })


class AgentInstanceCreate(AgentInstanceBase):
    """Schema for creating an agent instance"""
    agent_id: int
    location_id: Optional[int] = None


class AgentInstanceUpdate(BaseModel):
    """Schema for updating an agent instance"""
    name: Optional[str] = Field(None, max_length=100)
    config: Optional[Dict[str, Any]] = None
    schedule_config: Optional[Dict[str, Any]] = None
    status: Optional[AgentStatus] = None


class AgentInstanceResponse(AgentInstanceBase):
    """Schema for agent instance responses"""
    id: int
    agent_id: int
    user_id: int
    location_id: Optional[int]
    status: AgentStatus
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    error_count: int
    last_error: Optional[str]
    total_conversations: int
    successful_conversations: int
    total_revenue_generated: float
    activated_at: Optional[datetime]
    deactivated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    agent: AgentResponse
    
    model_config = ConfigDict(from_attributes=True)


# Conversation schemas
class ConversationMessage(BaseModel):
    """Schema for a single message in a conversation"""
    role: str  # system, assistant, user
    content: str
    timestamp: datetime
    tokens_used: Optional[int] = None


class AgentMessageCreate(BaseModel):
    """Schema for creating a new agent message"""
    conversation_id: str
    sender_type: str = Field(..., regex="^(user|agent|system)$")
    sender_id: Optional[int] = None
    content: str = Field(..., min_length=1)
    message_type: str = Field(default="text", max_length=50)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentMessageResponse(BaseModel):
    """Schema for agent message responses"""
    id: str
    conversation_id: str
    sender_type: str
    sender_id: Optional[int]
    content: str
    message_type: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    token_cost: float
    metadata: Dict[str, Any]
    processing_time_ms: Optional[int]
    ai_provider: Optional[str]
    ai_model: Optional[str]
    is_delivered: bool
    is_read: bool
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    failed_at: Optional[datetime]
    failure_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    """Schema for creating a conversation"""
    agent_instance_id: int
    client_id: int
    channel: ConversationChannel
    context_data: Dict[str, Any] = Field(default_factory=dict)
    scheduled_at: Optional[datetime] = None


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation"""
    status: Optional[ConversationStatus] = None
    goal_achieved: Optional[bool] = None
    revenue_generated: Optional[float] = None
    appointment_id: Optional[int] = None


class ConversationResponse(BaseModel):
    """Schema for conversation responses"""
    id: int
    conversation_id: str
    agent_instance_id: int
    client_id: int
    channel: str
    status: ConversationStatus
    messages: List[ConversationMessage]
    message_count: int
    total_tokens_used: int
    token_cost: float
    goal_achieved: Optional[bool]
    revenue_generated: float
    appointment_id: Optional[int]
    context_data: Dict[str, Any]
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    last_message_at: Optional[datetime]
    completed_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Metrics schemas
class AgentMetricsResponse(BaseModel):
    """Schema for agent metrics"""
    id: int
    agent_instance_id: int
    date: datetime
    conversations_started: int
    conversations_completed: int
    conversations_failed: int
    messages_sent: int
    messages_received: int
    goals_achieved: int
    conversion_rate: float
    response_rate: float
    revenue_generated: float
    tokens_used: int
    token_cost: float
    roi: float
    avg_response_time_minutes: Optional[float]
    avg_conversation_duration_minutes: Optional[float]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Subscription schemas
class SubscriptionCreate(BaseModel):
    """Schema for creating a subscription"""
    tier: SubscriptionTier
    stripe_customer_id: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    """Schema for updating a subscription"""
    tier: Optional[SubscriptionTier] = None
    status: Optional[str] = None


class SubscriptionResponse(BaseModel):
    """Schema for subscription responses"""
    id: int
    user_id: int
    tier: SubscriptionTier
    status: str
    monthly_price: float
    stripe_subscription_id: Optional[str]
    stripe_customer_id: Optional[str]
    conversation_limit: Optional[int]
    agent_limit: int
    included_tokens: int
    conversations_used: int
    tokens_used: int
    overage_tokens: int
    overage_charges: float
    trial_ends_at: Optional[datetime]
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Template schemas
class TemplateCreate(BaseModel):
    """Schema for creating a template"""
    agent_type: AgentType
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    system_prompt: str
    initial_message_template: str
    follow_up_templates: List[str] = Field(default_factory=list)
    required_variables: List[str] = Field(default_factory=list)
    tone_settings: Dict[str, str] = Field(default_factory=lambda: {
        "formality": "professional",
        "enthusiasm": "moderate",
        "emoji_usage": "minimal"
    })


class TemplateResponse(BaseModel):
    """Schema for template responses"""
    id: int
    agent_type: AgentType
    name: str
    description: Optional[str]
    system_prompt: str
    initial_message_template: str
    follow_up_templates: List[str]
    required_variables: List[str]
    tone_settings: Dict[str, str]
    usage_count: int
    avg_success_rate: Optional[float]
    is_system: bool
    created_by_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Analytics schemas
class AgentAnalytics(BaseModel):
    """Schema for agent analytics dashboard"""
    total_revenue: float
    total_conversations: int
    success_rate: float
    avg_response_time: float
    roi: float
    top_performing_agents: List[Dict[str, Any]]
    conversation_trends: List[Dict[str, Any]]
    revenue_by_agent_type: Dict[str, float]


class ConversationAnalytics(BaseModel):
    """Schema for conversation analytics"""
    total_messages: int
    avg_messages_per_conversation: float
    response_rate: float
    completion_rate: float
    opt_out_rate: float
    avg_time_to_completion: float
    peak_hours: List[int]
    channel_distribution: Dict[str, int]