"""
AI-Related Models for BookedBarber V2

This module contains models for AI features including intervention campaigns,
client tiers, weather data, and other AI-specific functionality.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
import enum

from database import Base


# Enums for AI models
class ClientTier(str, enum.Enum):
    """Client tier classification for personalized service"""
    VIP = "vip"
    PLATINUM = "platinum"
    GOLD = "gold"
    SILVER = "silver"
    BRONZE = "bronze"
    NEW = "new"


class InterventionStatus(str, enum.Enum):
    """Status of AI intervention campaigns"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class InterventionType(str, enum.Enum):
    """Type of intervention strategy"""
    PROACTIVE_REMINDER = "proactive_reminder"
    PERSONALIZED_OFFER = "personalized_offer"
    FOLLOW_UP_SEQUENCE = "follow_up_sequence"
    LOYALTY_REWARD = "loyalty_reward"
    CANCELLATION_PREVENTION = "cancellation_prevention"


class InterventionOutcome(str, enum.Enum):
    """Outcome of intervention attempts"""
    SUCCESSFUL = "successful"
    FAILED = "failed"
    PARTIALLY_SUCCESSFUL = "partially_successful"
    NO_RESPONSE = "no_response"
    APPOINTMENT_KEPT = "appointment_kept"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    APPOINTMENT_RESCHEDULED = "appointment_rescheduled"


class WeatherCondition(str, enum.Enum):
    """Weather condition types that might affect appointments"""
    CLEAR = "clear"
    CLOUDY = "cloudy"
    RAIN = "rain"
    SNOW = "snow"
    STORM = "storm"
    FOG = "fog"
    EXTREME_HEAT = "extreme_heat"
    EXTREME_COLD = "extreme_cold"


# AI Intervention Campaign Model
class AIInterventionCampaign(Base):
    """
    Model for tracking AI-powered intervention campaigns for no-show prevention
    """
    __tablename__ = 'ai_intervention_campaigns'

    id = Column(Integer, primary_key=True, index=True)
    
    # Campaign identification
    campaign_name = Column(String(255), nullable=False)
    campaign_type = Column(SQLEnum(InterventionType), nullable=False)
    status = Column(SQLEnum(InterventionStatus), default=InterventionStatus.PENDING)
    
    # Associated entities
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Risk and prediction data
    risk_score = Column(Float, nullable=False)  # 0.0 to 1.0
    risk_level = Column(String(50), nullable=False)  # low, medium, high, critical
    predicted_no_show_probability = Column(Float, nullable=False)
    
    # AI-generated content
    ai_generated_messages = Column(JSON)  # Store personalized messages
    message_templates_used = Column(JSON)  # Template IDs and variations
    personalization_factors = Column(JSON)  # Factors used for personalization
    
    # Campaign configuration
    intervention_channels = Column(JSON)  # ['sms', 'email', 'push']
    intervention_timing = Column(JSON)  # Scheduled delivery times
    max_attempts = Column(Integer, default=3)
    attempt_intervals = Column(JSON)  # Time intervals between attempts
    
    # Execution tracking
    attempts_made = Column(Integer, default=0)
    messages_sent = Column(Integer, default=0)
    last_attempt_at = Column(DateTime)
    next_attempt_at = Column(DateTime)
    
    # Results and outcomes
    outcome = Column(SQLEnum(InterventionOutcome))
    success_rate = Column(Float)  # Campaign-specific success rate
    engagement_metrics = Column(JSON)  # Open rates, click rates, responses
    client_response = Column(Text)  # Any response received from client
    
    # AI learning data
    effectiveness_score = Column(Float)  # How effective this campaign was
    a_b_test_variant = Column(String(50))  # A/B testing variant identifier
    optimization_notes = Column(Text)  # AI-generated optimization suggestions
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships (temporarily commented out for testing until main models are updated)
    # appointment = relationship("Appointment", back_populates="ai_interventions")
    # user = relationship("User", back_populates="ai_interventions")


# Weather Data Model
class WeatherData(Base):
    """
    Model for storing weather data that might affect appointment attendance
    """
    __tablename__ = 'weather_data'

    id = Column(Integer, primary_key=True, index=True)
    
    # Location information
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    zip_code = Column(String(20))
    
    # Weather details
    condition = Column(SQLEnum(WeatherCondition), nullable=False)
    temperature = Column(Float)  # In Fahrenheit
    humidity = Column(Float)  # Percentage
    wind_speed = Column(Float)  # mph
    precipitation_chance = Column(Float)  # Percentage
    precipitation_amount = Column(Float)  # Inches
    
    # Derived metrics for AI
    comfort_index = Column(Float)  # AI-calculated comfort score
    travel_difficulty = Column(Float)  # How difficult travel might be
    appointment_impact_score = Column(Float)  # Likelihood to affect appointments
    
    # Data source and quality
    data_source = Column(String(100))  # Weather API provider
    data_quality = Column(Float)  # Confidence in data accuracy
    is_forecast = Column(Boolean, default=False)  # True for future predictions
    
    # Time information
    recorded_at = Column(DateTime, nullable=False)
    forecast_for = Column(DateTime)  # For forecast data
    valid_until = Column(DateTime)  # When this data expires
    
    # AI processing
    processed_by_ai = Column(Boolean, default=False)
    ai_analysis = Column(JSON)  # AI insights about weather impact
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Client Tier Model
class ClientTierData(Base):
    """
    Model for storing client tier classifications and related data
    """
    __tablename__ = 'client_tier_data'

    id = Column(Integer, primary_key=True, index=True)
    
    # Client identification
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    
    # Tier information
    current_tier = Column(SQLEnum(ClientTier), nullable=False, default=ClientTier.NEW)
    previous_tier = Column(SQLEnum(ClientTier))
    tier_since = Column(DateTime, default=datetime.utcnow)
    
    # Tier calculation metrics
    total_spent = Column(Float, default=0.0)
    total_appointments = Column(Integer, default=0)
    no_show_rate = Column(Float, default=0.0)
    avg_tip_percentage = Column(Float, default=0.0)
    referrals_made = Column(Integer, default=0)
    loyalty_points = Column(Integer, default=0)
    
    # Engagement metrics
    last_appointment_date = Column(DateTime)
    avg_time_between_appointments = Column(Integer)  # Days
    preferred_services = Column(JSON)  # List of preferred service types
    preferred_times = Column(JSON)  # Preferred appointment times
    communication_preferences = Column(JSON)  # SMS, email, etc.
    
    # AI-calculated scores
    loyalty_score = Column(Float, default=0.0)  # 0.0 to 1.0
    value_score = Column(Float, default=0.0)  # Revenue value to business
    engagement_score = Column(Float, default=0.0)  # How engaged they are
    retention_risk = Column(Float, default=0.0)  # Risk of churning
    upsell_potential = Column(Float, default=0.0)  # Potential for upselling
    
    # Tier-specific benefits and status
    tier_benefits = Column(JSON)  # Benefits available at current tier
    benefits_used = Column(JSON)  # Benefits they've actually used
    next_tier_requirements = Column(JSON)  # What's needed for next tier
    
    # AI personalization data
    personality_profile = Column(JSON)  # AI-analyzed personality traits
    booking_patterns = Column(JSON)  # AI-identified patterns
    price_sensitivity = Column(Float)  # How price-sensitive they are
    service_preferences = Column(JSON)  # Detailed service preferences
    
    # Promotion and marketing
    eligible_promotions = Column(JSON)  # Current eligible promotions
    promotion_response_history = Column(JSON)  # How they respond to promos
    marketing_preferences = Column(JSON)  # Marketing channel preferences
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_calculated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships (temporarily commented out for testing)
    # user = relationship("User", back_populates="client_tier_data")


# AI Learning Model for interventions
class MessageTemplate(Base):
    """
    Model for storing AI-generated message templates
    """
    __tablename__ = 'message_templates'

    id = Column(Integer, primary_key=True, index=True)
    
    # Template identification
    template_name = Column(String(255), nullable=False)
    template_type = Column(String(100), nullable=False)  # reminder, confirmation, etc.
    message_channel = Column(String(50), nullable=False)  # sms, email, push
    
    # Template content
    subject_template = Column(Text)  # For email templates
    body_template = Column(Text, nullable=False)
    variables = Column(JSON)  # Available variables for personalization
    
    # AI metadata
    ai_generated = Column(Boolean, default=False)
    ai_confidence = Column(Float)
    personalization_factors = Column(JSON)
    
    # Performance tracking
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    engagement_rate = Column(Float, default=0.0)
    
    # A/B testing
    is_test_variant = Column(Boolean, default=False)
    test_group = Column(String(50))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIMessageGeneration(Base):
    """
    Model for tracking AI-generated messages and their performance
    """
    __tablename__ = 'ai_message_generations'

    id = Column(Integer, primary_key=True, index=True)
    
    # Message identification
    message_id = Column(String(100), unique=True, nullable=False)
    template_id = Column(Integer, ForeignKey('message_templates.id'))
    appointment_id = Column(Integer, ForeignKey('appointments.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Message content
    subject = Column(String(500))  # For email messages
    body = Column(Text, nullable=False)
    message_type = Column(String(100), nullable=False)  # reminder, confirmation, etc.
    channel = Column(String(50), nullable=False)  # sms, email, push
    
    # AI generation data
    ai_provider = Column(String(100))  # openai, anthropic, etc.
    ai_model = Column(String(100))
    generation_prompt = Column(Text)
    ai_confidence = Column(Float)
    generation_time_ms = Column(Integer)
    
    # Personalization factors
    personalization_data = Column(JSON)
    client_segment = Column(String(100))
    risk_level = Column(String(50))
    
    # Performance tracking
    was_sent = Column(Boolean, default=False)
    delivery_status = Column(String(50))
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    responded = Column(Boolean, default=False)
    engagement_score = Column(Float)
    
    # A/B testing
    test_variant = Column(String(50))
    control_group = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)


class MessagePersonalization(Base):
    """
    Model for storing message personalization rules and data
    """
    __tablename__ = 'message_personalizations'

    id = Column(Integer, primary_key=True, index=True)
    
    # Personalization rule identification
    rule_name = Column(String(255), nullable=False)
    rule_type = Column(String(100), nullable=False)  # client_tier, behavior, preference
    
    # Target criteria
    client_tier = Column(SQLEnum(ClientTier))
    appointment_type = Column(String(100))
    risk_level = Column(String(50))
    time_of_day = Column(String(50))
    day_of_week = Column(String(20))
    weather_condition = Column(String(50))
    
    # Personalization content
    content_variations = Column(JSON)  # Different content for different criteria
    tone_style = Column(String(100))  # formal, casual, friendly, etc.
    urgency_level = Column(String(50))  # low, medium, high
    
    # Performance data
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    conversion_rate = Column(Float, default=0.0)
    
    # A/B testing
    is_test_rule = Column(Boolean, default=False)
    test_description = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ConversationIntent(str, enum.Enum):
    """Intent detected from customer conversations"""
    CONFIRM_APPOINTMENT = "confirm_appointment"
    CANCEL_APPOINTMENT = "cancel_appointment"
    RESCHEDULE_REQUEST = "reschedule_request"
    GENERAL_QUESTION = "general_question"
    COMPLAINT_ISSUE = "complaint_issue"
    LOCATION_INQUIRY = "location_inquiry"
    SERVICE_QUESTION = "service_question"
    PRICING_INQUIRY = "pricing_inquiry"
    EMERGENCY_REQUEST = "emergency_request"
    UNCLEAR_INTENT = "unclear_intent"


class ClientSentiment(Base):
    """
    Model for tracking client sentiment analysis
    """
    __tablename__ = 'client_sentiments'

    id = Column(Integer, primary_key=True, index=True)
    
    # Client and message identification
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    message_id = Column(String(100))
    conversation_id = Column(String(100))
    
    # Sentiment analysis
    sentiment_score = Column(Float, nullable=False)  # -1.0 to 1.0
    sentiment_label = Column(String(50), nullable=False)  # positive, negative, neutral
    confidence = Column(Float, nullable=False)  # 0.0 to 1.0
    
    # Intent detection
    detected_intent = Column(SQLEnum(ConversationIntent))
    intent_confidence = Column(Float)
    
    # Message details
    message_text = Column(Text, nullable=False)
    message_channel = Column(String(50), nullable=False)  # sms, email, chat
    
    # Context information
    appointment_id = Column(Integer, ForeignKey('appointments.id'))
    interaction_type = Column(String(100))  # incoming_sms, support_chat, etc.
    
    # AI processing metadata
    ai_provider = Column(String(100))
    ai_model = Column(String(100))
    processing_time_ms = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    analyzed_at = Column(DateTime, default=datetime.utcnow)


class AIInterventionLearning(Base):
    """
    Model for storing AI learning data about intervention effectiveness
    """
    __tablename__ = 'ai_intervention_learning'

    id = Column(Integer, primary_key=True, index=True)
    
    # Learning context
    campaign_id = Column(Integer, ForeignKey('ai_intervention_campaigns.id'), nullable=False)
    client_segment = Column(String(100))  # Type of client this applies to
    appointment_type = Column(String(100))  # Type of appointment
    risk_level = Column(String(50))  # Risk level this learning applies to
    
    # Intervention details
    intervention_type = Column(SQLEnum(InterventionType), nullable=False)
    message_template = Column(String(255))
    delivery_channel = Column(String(50))
    timing_offset = Column(Integer)  # Minutes before appointment
    
    # Outcome data
    was_successful = Column(Boolean, nullable=False)
    outcome_type = Column(SQLEnum(InterventionOutcome), nullable=False)
    engagement_score = Column(Float)  # How well client engaged
    conversion_rate = Column(Float)  # Rate of successful interventions
    
    # Context factors
    weather_condition = Column(String(50))
    day_of_week = Column(String(20))
    time_of_day = Column(String(20))
    season = Column(String(20))
    client_tier = Column(SQLEnum(ClientTier))
    
    # AI optimization data
    feature_importance = Column(JSON)  # Which factors were most important
    confidence_score = Column(Float)  # AI confidence in this learning
    sample_size = Column(Integer)  # How many data points this represents
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    learned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships (temporarily commented out for testing)
    # campaign = relationship("AIInterventionCampaign", back_populates="learning_data")


# Add back_populates to existing models (this would be added to the main models)
# Note: These would need to be added to the actual User and Appointment models
"""
# Add to User model:
ai_interventions = relationship("AIInterventionCampaign", back_populates="user")
client_tier_data = relationship("ClientTierData", back_populates="user", uselist=False)

# Add to Appointment model:
ai_interventions = relationship("AIInterventionCampaign", back_populates="appointment")
"""

# Note: Relationships are temporarily commented out for testing
# Add back_populates relationships when main models are updated:
# AIInterventionCampaign.learning_data = relationship("AIInterventionLearning", back_populates="campaign")