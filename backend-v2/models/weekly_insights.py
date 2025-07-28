"""
Weekly Insights Database Models for BookedBarber V2

This module provides comprehensive database models for automated weekly insights generation,
aligned with the Six Figure Barber methodology and business intelligence requirements.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from enum import Enum as PyEnum
from typing import Dict, Any, Optional, List

from db import Base

class InsightCategory(PyEnum):
    """Categories for business insights aligned with Six Figure Barber methodology"""
    REVENUE_OPTIMIZATION = "revenue_optimization"
    CLIENT_MANAGEMENT = "client_management"
    OPERATIONAL_EFFICIENCY = "operational_efficiency"
    BUSINESS_GROWTH = "business_growth"
    COMPETITIVE_ANALYSIS = "competitive_analysis"
    SERVICE_EXCELLENCE = "service_excellence"
    PROFESSIONAL_DEVELOPMENT = "professional_development"

class RecommendationPriority(PyEnum):
    """Priority levels for recommendations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RecommendationStatus(PyEnum):
    """Status tracking for recommendations"""
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISMISSED = "dismissed"

class InsightStatus(PyEnum):
    """Status of insight generation and delivery"""
    GENERATING = "generating"
    GENERATED = "generated"
    DELIVERED = "delivered"
    FAILED = "failed"
    ARCHIVED = "archived"

class EmailDeliveryStatus(PyEnum):
    """Email delivery status tracking"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"

class WeeklyInsight(Base):
    """
    Core model for storing weekly business insights generated for barbers.
    Each record represents a complete weekly analysis for a specific barber.
    """
    __tablename__ = "weekly_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    week_start_date = Column(DateTime, nullable=False, index=True)
    week_end_date = Column(DateTime, nullable=False)
    generation_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Core insight data
    overall_score = Column(Float, nullable=False)  # Six Figure Barber methodology score
    previous_week_score = Column(Float, nullable=True)
    score_change = Column(Float, nullable=True)  # Week-over-week change
    
    # Business metrics summary
    revenue_current_week = Column(Float, default=0.0)
    revenue_previous_week = Column(Float, default=0.0)
    revenue_growth_percent = Column(Float, default=0.0)
    
    appointments_current_week = Column(Integer, default=0)
    appointments_previous_week = Column(Integer, default=0)
    appointment_growth_percent = Column(Float, default=0.0)
    
    new_clients_count = Column(Integer, default=0)
    returning_clients_count = Column(Integer, default=0)
    client_retention_rate = Column(Float, default=0.0)
    
    average_ticket_size = Column(Float, default=0.0)
    booking_efficiency_percent = Column(Float, default=0.0)
    no_show_rate_percent = Column(Float, default=0.0)
    
    # Six Figure Barber alignment scores
    revenue_optimization_score = Column(Float, default=0.0)
    client_value_score = Column(Float, default=0.0)
    service_excellence_score = Column(Float, default=0.0)
    business_efficiency_score = Column(Float, default=0.0)
    professional_growth_score = Column(Float, default=0.0)
    
    # Trend analysis
    trend_analysis = Column(JSON, nullable=True)  # Store trend data as JSON
    
    # Key insights summary
    top_achievements = Column(JSON, nullable=True)  # List of top achievements
    key_opportunities = Column(JSON, nullable=True)  # List of improvement opportunities
    risk_factors = Column(JSON, nullable=True)  # List of identified risks
    
    # AI-generated insights
    executive_summary = Column(Text, nullable=True)
    key_insights = Column(Text, nullable=True)
    
    # Status and metadata
    status = Column(Enum(InsightStatus), default=InsightStatus.GENERATING, nullable=False)
    generation_duration_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="weekly_insights")
    recommendations = relationship("WeeklyRecommendation", back_populates="weekly_insight", cascade="all, delete-orphan")
    email_deliveries = relationship("InsightEmailDelivery", back_populates="weekly_insight", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<WeeklyInsight(user_id={self.user_id}, week_start={self.week_start_date}, score={self.overall_score})>"

class WeeklyRecommendation(Base):
    """
    Individual recommendations generated as part of weekly insights.
    Each recommendation is actionable and aligned with Six Figure Barber principles.
    """
    __tablename__ = "weekly_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    weekly_insight_id = Column(Integer, ForeignKey("weekly_insights.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Recommendation details
    category = Column(Enum(InsightCategory), nullable=False, index=True)
    priority = Column(Enum(RecommendationPriority), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Impact and implementation
    expected_impact = Column(String(255), nullable=True)  # e.g., "15-25% revenue increase"
    estimated_effort = Column(String(100), nullable=True)  # e.g., "2-3 hours", "1 week"
    confidence_score = Column(Float, default=0.0)  # 0-1 confidence in recommendation
    
    # Six Figure Barber alignment
    six_fb_principle = Column(String(100), nullable=True)  # Which SixFB principle this supports
    methodology_alignment_score = Column(Float, default=0.0)
    
    # Action items
    action_items = Column(JSON, nullable=True)  # List of specific action steps
    success_metrics = Column(JSON, nullable=True)  # How to measure success
    
    # Implementation tracking
    status = Column(Enum(RecommendationStatus), default=RecommendationStatus.PENDING, nullable=False)
    user_feedback_rating = Column(Integer, nullable=True)  # 1-5 star rating from user
    user_feedback_text = Column(Text, nullable=True)
    implementation_notes = Column(Text, nullable=True)
    
    # Outcome tracking
    implemented_date = Column(DateTime, nullable=True)
    measured_impact = Column(String(255), nullable=True)  # Actual measured impact
    roi_estimated = Column(Float, nullable=True)  # Estimated ROI
    roi_actual = Column(Float, nullable=True)  # Actual measured ROI
    
    # Relationships
    weekly_insight = relationship("WeeklyInsight", back_populates="recommendations")
    user = relationship("User")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<WeeklyRecommendation(title={self.title}, priority={self.priority}, status={self.status})>"

class InsightEmailDelivery(Base):
    """
    Tracking model for email delivery of weekly insights reports.
    Supports comprehensive email analytics and engagement tracking.
    """
    __tablename__ = "insight_email_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    weekly_insight_id = Column(Integer, ForeignKey("weekly_insights.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Email details
    email_address = Column(String(255), nullable=False)
    subject_line = Column(String(500), nullable=False)
    template_version = Column(String(50), nullable=True)
    
    # Content details
    content_html = Column(Text, nullable=True)  # HTML version of email
    content_text = Column(Text, nullable=True)  # Plain text version
    attachments = Column(JSON, nullable=True)  # List of attachment filenames
    
    # Delivery tracking
    status = Column(Enum(EmailDeliveryStatus), default=EmailDeliveryStatus.PENDING, nullable=False)
    scheduled_send_time = Column(DateTime, nullable=True)
    actual_send_time = Column(DateTime, nullable=True)
    delivery_time = Column(DateTime, nullable=True)
    
    # Email provider details
    email_provider = Column(String(50), nullable=True)  # SendGrid, etc.
    message_id = Column(String(255), nullable=True, unique=True)
    
    # Engagement tracking
    opened_count = Column(Integer, default=0)
    first_opened_at = Column(DateTime, nullable=True)
    last_opened_at = Column(DateTime, nullable=True)
    
    clicked_count = Column(Integer, default=0)
    first_clicked_at = Column(DateTime, nullable=True)
    last_clicked_at = Column(DateTime, nullable=True)
    clicked_links = Column(JSON, nullable=True)  # Track which links were clicked
    
    # Delivery issues
    bounce_reason = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Unsubscribe tracking
    unsubscribed_at = Column(DateTime, nullable=True)
    unsubscribe_reason = Column(String(255), nullable=True)
    
    # Relationships
    weekly_insight = relationship("WeeklyInsight", back_populates="email_deliveries")
    user = relationship("User")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<InsightEmailDelivery(user_id={self.user_id}, status={self.status}, opened={self.opened_count})>"

class InsightTemplate(Base):
    """
    Template management for generating consistent, professional insight reports.
    Supports versioning and A/B testing of different template styles.
    """
    __tablename__ = "insight_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    version = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template content
    email_subject_template = Column(String(500), nullable=False)
    email_html_template = Column(Text, nullable=False)
    email_text_template = Column(Text, nullable=False)
    
    # PDF report template
    pdf_template = Column(Text, nullable=True)
    
    # Template configuration
    variables = Column(JSON, nullable=True)  # Available template variables
    styling_config = Column(JSON, nullable=True)  # Colors, fonts, etc.
    
    # Usage tracking
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    usage_count = Column(Integer, default=0)
    
    # A/B testing
    ab_test_group = Column(String(50), nullable=True)
    conversion_rate = Column(Float, default=0.0)
    engagement_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<InsightTemplate(name={self.name}, version={self.version}, active={self.is_active})>"

class RecommendationCategory(Base):
    """
    Predefined categories and templates for recommendations to ensure consistency
    and alignment with Six Figure Barber methodology.
    """
    __tablename__ = "recommendation_categories"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(Enum(InsightCategory), nullable=False, unique=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Six Figure Barber alignment
    six_fb_principle = Column(String(100), nullable=False)
    methodology_weight = Column(Float, default=1.0)  # Weight in overall score
    
    # Template for recommendations in this category
    title_template = Column(String(500), nullable=True)
    description_template = Column(Text, nullable=True)
    action_items_template = Column(JSON, nullable=True)
    
    # Icon and styling
    icon_name = Column(String(50), nullable=True)
    color_hex = Column(String(7), nullable=True)  # e.g., "#1E40AF"
    
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<RecommendationCategory(category={self.category}, principle={self.six_fb_principle})>"

class InsightMetric(Base):
    """
    Track the effectiveness and performance of the insights system itself.
    Used for continuous improvement of insight generation quality.
    """
    __tablename__ = "insight_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    weekly_insight_id = Column(Integer, ForeignKey("weekly_insights.id"), nullable=True, index=True)
    
    # Metric details
    metric_name = Column(String(255), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_category = Column(String(100), nullable=False)
    
    # Context
    measurement_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_period_start = Column(DateTime, nullable=True)
    data_period_end = Column(DateTime, nullable=True)
    
    # Quality metrics
    accuracy_score = Column(Float, nullable=True)  # How accurate was the insight
    relevance_score = Column(Float, nullable=True)  # How relevant to the barber
    actionability_score = Column(Float, nullable=True)  # How actionable
    
    # Metadata
    insight_metadata = Column(JSON, nullable=True)  # Additional context data
    
    # Relationships
    user = relationship("User")
    weekly_insight = relationship("WeeklyInsight")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<InsightMetric(user_id={self.user_id}, metric={self.metric_name}, value={self.metric_value})>"

class WeeklyInsightArchive(Base):
    """
    Archive table for storing compressed historical insight data.
    Maintains long-term insights history while optimizing storage.
    """
    __tablename__ = "weekly_insight_archives"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Archive period
    archive_start_date = Column(DateTime, nullable=False, index=True)
    archive_end_date = Column(DateTime, nullable=False, index=True)
    insights_count = Column(Integer, nullable=False)
    
    # Compressed data
    insights_data = Column(JSON, nullable=False)  # Compressed insight summaries
    aggregated_metrics = Column(JSON, nullable=True)  # Summary statistics
    
    # Archive metadata
    compression_ratio = Column(Float, nullable=True)
    original_size_bytes = Column(Integer, nullable=True)
    compressed_size_bytes = Column(Integer, nullable=True)
    
    # Relationships
    user = relationship("User")
    
    archived_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<WeeklyInsightArchive(user_id={self.user_id}, period={self.archive_start_date} to {self.archive_end_date})>"

# Add relationships to the User model (if not already present)
# This would be added to the existing User model in models.py:
# weekly_insights = relationship("WeeklyInsight", back_populates="user", cascade="all, delete-orphan")