"""
Database models for conversion tracking and attribution.
Supports multi-channel tracking, attribution modeling, and analytics.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    ForeignKey, Text, Enum, Index, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from database import Base


class EventType(str, enum.Enum):
    """Types of conversion events"""
    PAGE_VIEW = "page_view"
    CLICK = "click"
    FORM_SUBMIT = "form_submit"
    ADD_TO_CART = "add_to_cart"
    PURCHASE = "purchase"
    REGISTRATION = "registration"
    LEAD = "lead"
    PHONE_CALL = "phone_call"
    CHAT_STARTED = "chat_started"
    CUSTOM = "custom"


class AttributionModel(str, enum.Enum):
    """Attribution models for conversion credit distribution"""
    LAST_CLICK = "last_click"
    FIRST_CLICK = "first_click"
    LINEAR = "linear"
    TIME_DECAY = "time_decay"
    POSITION_BASED = "position_based"
    DATA_DRIVEN = "data_driven"


class ConversionStatus(str, enum.Enum):
    """Status of conversion tracking"""
    PENDING = "pending"
    TRACKED = "tracked"
    FAILED = "failed"
    DUPLICATE = "duplicate"


class ConversionEvent(Base):
    """
    Tracks individual conversion events from various sources.
    Supports deduplication, attribution, and multi-platform syncing.
    """
    __tablename__ = "conversion_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Event identification
    event_id = Column(String(255), unique=True, index=True)  # For deduplication
    event_name = Column(String(100), nullable=False, index=True)
    event_type = Column(Enum(EventType), nullable=False, index=True)
    
    # Event value and metadata
    event_value = Column(Float, nullable=True)  # Revenue or goal value
    event_currency = Column(String(3), default="USD")
    event_data = Column(JSON, nullable=True)  # Additional event-specific data
    
    # Source and session data
    source_url = Column(Text, nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)  # Hashed for privacy
    client_id = Column(String(255), nullable=True, index=True)  # GA client ID
    session_id = Column(String(255), nullable=True, index=True)
    
    # Attribution data
    channel = Column(String(50), nullable=True, index=True)
    utm_source = Column(String(255), nullable=True)
    utm_medium = Column(String(255), nullable=True)
    utm_campaign = Column(String(255), nullable=True)
    utm_term = Column(String(255), nullable=True)
    utm_content = Column(String(255), nullable=True)
    referrer = Column(Text, nullable=True)
    
    # Platform sync status
    gtm_synced = Column(Boolean, default=False)
    gtm_sync_time = Column(DateTime(timezone=True), nullable=True)
    meta_synced = Column(Boolean, default=False)
    meta_sync_time = Column(DateTime(timezone=True), nullable=True)
    google_ads_synced = Column(Boolean, default=False)
    google_ads_sync_time = Column(DateTime(timezone=True), nullable=True)
    
    # Tracking status
    status = Column(Enum(ConversionStatus), default=ConversionStatus.PENDING)
    error_message = Column(Text, nullable=True)
    
    # Attribution relationship (removed circular reference)
    # attribution_path_id = Column(Integer, ForeignKey("attribution_paths.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    # user = relationship("User", back_populates="conversion_events")  # Temporarily disabled - relationship removed
    attribution_path = relationship("AttributionPath", back_populates="conversion_event", uselist=False)
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_conversion_events_user_date", "user_id", "created_at"),
        Index("idx_conversion_events_type_date", "event_type", "created_at"),
        Index("idx_conversion_events_channel_date", "channel", "created_at"),
        Index("idx_conversion_events_campaign", "utm_campaign", "created_at"),
    )
    
    def __repr__(self):
        return f"<ConversionEvent {self.event_name} - User {self.user_id}>"


class AttributionPath(Base):
    """
    Stores the attribution path for each conversion.
    Maps the customer journey and credit distribution.
    """
    __tablename__ = "attribution_paths"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conversion_event_id = Column(Integer, ForeignKey("conversion_events.id"), nullable=False, unique=True)
    
    # Path data
    touchpoints = Column(JSON, nullable=False)  # Array of touchpoint events
    first_touch_channel = Column(String(50), nullable=True)
    last_touch_channel = Column(String(50), nullable=True)
    path_length = Column(Integer, default=1)
    
    # Attribution calculation
    attribution_model = Column(Enum(AttributionModel), default=AttributionModel.LAST_CLICK)
    attribution_weights = Column(JSON, nullable=True)  # Channel -> weight mapping
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    conversion_event = relationship("ConversionEvent", back_populates="attribution_path", uselist=False)
    
    def __repr__(self):
        return f"<AttributionPath for Event {self.conversion_event_id}>"


class TrackingConfiguration(Base):
    """
    Stores user-specific tracking configuration and settings.
    Manages platform credentials and attribution preferences.
    """
    __tablename__ = "tracking_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Google Tag Manager settings
    gtm_container_id = Column(String(50), nullable=True)
    gtm_enabled = Column(Boolean, default=False)
    gtm_server_url = Column(String(255), nullable=True)
    
    # Meta/Facebook settings
    meta_pixel_id = Column(String(50), nullable=True)
    meta_enabled = Column(Boolean, default=False)
    meta_test_event_code = Column(String(50), nullable=True)
    
    # Google Ads settings
    google_ads_conversion_id = Column(String(50), nullable=True)
    google_ads_enabled = Column(Boolean, default=False)
    google_ads_conversion_labels = Column(JSON, nullable=True)  # Event -> label mapping
    
    # Attribution settings
    attribution_window_days = Column(Integer, default=30)
    view_attribution_window_days = Column(Integer, default=1)
    default_attribution_model = Column(Enum(AttributionModel), default=AttributionModel.DATA_DRIVEN)
    
    # Advanced settings
    conversion_value_rules = Column(JSON, nullable=True)  # Rules for dynamic value assignment
    excluded_domains = Column(JSON, nullable=True)  # Domains to exclude from tracking
    custom_channel_rules = Column(JSON, nullable=True)  # Custom channel classification rules
    
    # Privacy settings
    enable_enhanced_conversions = Column(Boolean, default=True)
    hash_user_data = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<TrackingConfiguration for User {self.user_id}>"


class ConversionGoal(Base):
    """
    Defines conversion goals and their values.
    Allows customization of what constitutes a conversion.
    """
    __tablename__ = "conversion_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Goal definition
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    event_name = Column(String(100), nullable=False)  # Event that triggers this goal
    event_type = Column(Enum(EventType), nullable=False)
    
    # Goal value
    value = Column(Float, nullable=True)  # Fixed value
    value_expression = Column(Text, nullable=True)  # Dynamic value calculation
    
    # Goal conditions
    conditions = Column(JSON, nullable=True)  # Additional conditions for goal completion
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Tracking
    total_conversions = Column(Integer, default=0)
    total_value = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_goal_name"),
        Index("idx_conversion_goals_user_active", "user_id", "is_active"),
    )
    
    def __repr__(self):
        return f"<ConversionGoal {self.name} - User {self.user_id}>"


class CampaignTracking(Base):
    """
    Tracks marketing campaign performance and ROI.
    Links campaigns to conversions and costs.
    """
    __tablename__ = "campaign_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Campaign identification
    campaign_id = Column(String(100), nullable=False, index=True)
    campaign_name = Column(String(255), nullable=False)
    campaign_source = Column(String(50), nullable=False)  # google_ads, meta, email, etc.
    campaign_medium = Column(String(50), nullable=False)
    
    # Campaign dates
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Campaign costs
    total_cost = Column(Float, default=0.0)
    currency = Column(String(3), default="USD")
    
    # Performance metrics (updated periodically)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    conversion_value = Column(Float, default=0.0)
    
    # Calculated metrics
    ctr = Column(Float, nullable=True)  # Click-through rate
    conversion_rate = Column(Float, nullable=True)
    cpc = Column(Float, nullable=True)  # Cost per click
    cpa = Column(Float, nullable=True)  # Cost per acquisition
    roas = Column(Float, nullable=True)  # Return on ad spend
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        UniqueConstraint("user_id", "campaign_id", "campaign_source", name="uq_user_campaign"),
        Index("idx_campaign_tracking_dates", "start_date", "end_date"),
        Index("idx_campaign_tracking_active", "user_id", "is_active"),
    )
    
    def calculate_metrics(self):
        """Calculate derived metrics from raw data"""
        if self.impressions > 0:
            self.ctr = (self.clicks / self.impressions) * 100
        
        if self.clicks > 0:
            self.conversion_rate = (self.conversions / self.clicks) * 100
            self.cpc = self.total_cost / self.clicks
        
        if self.conversions > 0:
            self.cpa = self.total_cost / self.conversions
        
        if self.total_cost > 0:
            self.roas = self.conversion_value / self.total_cost
    
    def __repr__(self):
        return f"<CampaignTracking {self.campaign_name} - {self.campaign_source}>"


# Update User model to include conversion tracking relationships
def update_user_model():
    """
    This function should be called to add relationships to the User model.
    Add these lines to your existing User model:
    
    # Conversion tracking relationships
    conversion_events = relationship("ConversionEvent", back_populates="user")
    tracking_config = relationship("TrackingConfiguration", back_populates="user", uselist=False)
    conversion_goals = relationship("ConversionGoal", back_populates="user")
    campaign_tracking = relationship("CampaignTracking", back_populates="user")
    
    # Add lifetime value column if not exists
    lifetime_value = Column(Float, default=0.0)
    """
    pass


class CampaignSource(str, enum.Enum):
    """Campaign source types for tracking"""
    GOOGLE_ADS = "google_ads"
    META_ADS = "meta_ads"
    ORGANIC_SEARCH = "organic_search"
    DIRECT = "direct"
    EMAIL = "email"
    SMS = "sms"
    REFERRAL = "referral"
    SOCIAL = "social"
    OTHER = "other"