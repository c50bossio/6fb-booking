"""
AI Analytics models for cross-user intelligence and benchmarking.
Provides privacy-compliant aggregated insights across the platform.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BenchmarkCategory(enum.Enum):
    """Categories for performance benchmarks"""
    REVENUE = "revenue"
    APPOINTMENTS = "appointments"
    CLIENTS = "clients"
    EFFICIENCY = "efficiency"
    PRICING = "pricing"
    RETENTION = "retention"
    GROWTH = "growth"


class InsightType(enum.Enum):
    """Types of AI-generated insights"""
    PRICING_OPTIMIZATION = "pricing_optimization"
    REVENUE_FORECAST = "revenue_forecast"
    CLIENT_RETENTION = "client_retention"
    COMPETITIVE_ANALYSIS = "competitive_analysis"
    GROWTH_OPPORTUNITY = "growth_opportunity"
    SEASONAL_TREND = "seasonal_trend"
    BENCHMARK_COMPARISON = "benchmark_comparison"
    COACHING_RECOMMENDATION = "coaching_recommendation"


class BusinessSegment(enum.Enum):
    """Business size/type segments for benchmarking"""
    SOLO_BARBER = "solo_barber"
    SMALL_SHOP = "small_shop"  # 2-3 chairs
    MEDIUM_SHOP = "medium_shop"  # 4-6 chairs
    LARGE_SHOP = "large_shop"  # 7+ chairs
    CHAIN = "chain"  # Multiple locations


class PerformanceBenchmark(Base):
    """
    Anonymized performance benchmarks aggregated across all users.
    Used for industry comparisons and percentile rankings.
    """
    __tablename__ = "performance_benchmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Benchmark metadata
    category = Column(String(50), nullable=False, index=True)  # BenchmarkCategory
    metric_name = Column(String(100), nullable=False, index=True)
    business_segment = Column(String(50), nullable=False, index=True)  # BusinessSegment
    
    # Geographic and temporal context
    region = Column(String(50), nullable=True, index=True)  # Country/state for regional benchmarks
    month = Column(Integer, nullable=False, index=True)  # Month of year (1-12)
    year = Column(Integer, nullable=False, index=True)
    
    # Statistical data (anonymized aggregations)
    sample_size = Column(Integer, nullable=False)  # Number of businesses in sample
    percentile_10 = Column(Float, nullable=True)
    percentile_25 = Column(Float, nullable=True)
    percentile_50 = Column(Float, nullable=True)  # Median
    percentile_75 = Column(Float, nullable=True)
    percentile_90 = Column(Float, nullable=True)
    mean_value = Column(Float, nullable=True)
    std_deviation = Column(Float, nullable=True)
    
    # Additional context data
    metadata = Column(JSON, nullable=True)  # Additional benchmark context
    
    # Privacy and data integrity
    anonymized_at = Column(DateTime, default=utcnow, nullable=False)
    aggregation_period = Column(String(20), default="monthly", nullable=False)
    data_source_hash = Column(String(64), nullable=True)  # Hash for data lineage without exposing sources
    
    # Constraints and indexes
    __table_args__ = (
        Index('idx_benchmark_lookup', 'category', 'metric_name', 'business_segment', 'year', 'month'),
        Index('idx_benchmark_region', 'region', 'year', 'month'),
        Index('idx_benchmark_temporal', 'year', 'month', 'category'),
    )


class AIInsightCache(Base):
    """
    Cache for AI-generated insights to optimize performance.
    Stores personalized insights and recommendations.
    """
    __tablename__ = "ai_insights_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Target and scope
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Null for global insights
    insight_type = Column(String(50), nullable=False, index=True)  # InsightType
    business_segment = Column(String(50), nullable=True, index=True)
    
    # Insight content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    insight_data = Column(JSON, nullable=False)  # Structured insight data
    
    # Confidence and validation
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    data_freshness_score = Column(Float, nullable=False)  # How fresh is underlying data
    statistical_significance = Column(Float, nullable=True)  # P-value or similar
    
    # Actionability
    action_items = Column(JSON, nullable=True)  # Structured list of recommended actions
    estimated_impact = Column(String(20), nullable=True)  # low, medium, high
    priority_score = Column(Integer, default=50, nullable=False)  # 1-100
    
    # Lifecycle management
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    view_count = Column(Integer, default=0, nullable=False)
    last_viewed_at = Column(DateTime, nullable=True)
    
    # User interaction
    user_rating = Column(Integer, nullable=True)  # 1-5 user feedback
    user_feedback = Column(Text, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="ai_insights")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_user_insights', 'user_id', 'is_active', 'expires_at'),
        Index('idx_insight_type', 'insight_type', 'is_active'),
        Index('idx_priority', 'priority_score', 'is_active', 'expires_at'),
        Index('idx_expiry_cleanup', 'expires_at', 'is_active'),
    )


class CrossUserMetric(Base):
    """
    Anonymized metrics for cross-user pattern analysis.
    Used to identify trends and generate insights without exposing individual data.
    """
    __tablename__ = "cross_user_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Temporal context
    date = Column(DateTime, nullable=False, index=True)
    period_type = Column(String(20), default="daily", nullable=False)  # daily, weekly, monthly
    
    # Business context (anonymized)
    business_segment = Column(String(50), nullable=False, index=True)
    service_category = Column(String(50), nullable=True, index=True)
    location_type = Column(String(50), nullable=True, index=True)  # urban, suburban, rural
    
    # Anonymized performance metrics
    revenue_bucket = Column(String(20), nullable=True)  # low, medium, high (no exact values)
    appointment_volume_bucket = Column(String(20), nullable=True)
    client_count_bucket = Column(String(20), nullable=True)
    efficiency_score_bucket = Column(String(20), nullable=True)
    
    # Pattern indicators (boolean flags for pattern recognition)
    has_online_booking = Column(Boolean, nullable=True)
    uses_marketing_automation = Column(Boolean, nullable=True)
    offers_packages = Column(Boolean, nullable=True)
    has_loyalty_program = Column(Boolean, nullable=True)
    uses_dynamic_pricing = Column(Boolean, nullable=True)
    
    # Success indicators
    is_top_performer = Column(Boolean, default=False, nullable=False)  # Top quartile
    growth_trend = Column(String(20), nullable=True)  # growing, stable, declining
    
    # Privacy protection
    noise_added = Column(Boolean, default=True, nullable=False)  # Differential privacy applied
    k_anonymity_level = Column(Integer, nullable=True)  # K-anonymity level achieved
    aggregated_at = Column(DateTime, default=utcnow, nullable=False)
    
    # Indexes for analytics queries
    __table_args__ = (
        Index('idx_cross_user_analysis', 'business_segment', 'date', 'is_top_performer'),
        Index('idx_pattern_analysis', 'has_online_booking', 'uses_marketing_automation', 'is_top_performer'),
        Index('idx_temporal_analysis', 'date', 'period_type', 'business_segment'),
    )


class PredictiveModel(Base):
    """
    Metadata and performance tracking for ML models used in predictions.
    """
    __tablename__ = "predictive_models"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Model identification
    model_name = Column(String(100), nullable=False, unique=True, index=True)
    model_type = Column(String(50), nullable=False)  # regression, classification, time_series
    prediction_target = Column(String(100), nullable=False)  # revenue, churn, demand, etc.
    
    # Model versioning
    version = Column(String(20), nullable=False)
    model_hash = Column(String(64), nullable=True)  # Hash of model weights/parameters
    
    # Training metadata
    training_data_size = Column(Integer, nullable=True)
    training_date = Column(DateTime, nullable=False)
    training_duration_seconds = Column(Integer, nullable=True)
    
    # Performance metrics
    accuracy_score = Column(Float, nullable=True)
    precision_score = Column(Float, nullable=True)
    recall_score = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    mae = Column(Float, nullable=True)  # Mean Absolute Error
    rmse = Column(Float, nullable=True)  # Root Mean Square Error
    r2_score = Column(Float, nullable=True)  # R-squared
    
    # Model configuration
    hyperparameters = Column(JSON, nullable=True)
    feature_importance = Column(JSON, nullable=True)
    
    # Deployment status
    is_active = Column(Boolean, default=False, nullable=False)
    deployed_at = Column(DateTime, nullable=True)
    last_prediction_at = Column(DateTime, nullable=True)
    prediction_count = Column(Integer, default=0, nullable=False)
    
    # Lifecycle
    created_at = Column(DateTime, default=utcnow, nullable=False)
    retired_at = Column(DateTime, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_active_models', 'is_active', 'prediction_target'),
        Index('idx_model_performance', 'prediction_target', 'accuracy_score'),
    )


class BusinessIntelligenceReport(Base):
    """
    Generated business intelligence reports combining multiple AI insights.
    """
    __tablename__ = "business_intelligence_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Report metadata
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    report_type = Column(String(50), nullable=False)  # weekly_summary, monthly_deep_dive, etc.
    title = Column(String(200), nullable=False)
    
    # Report content
    executive_summary = Column(Text, nullable=False)
    key_insights = Column(JSON, nullable=False)  # List of structured insights
    recommendations = Column(JSON, nullable=False)  # List of action items
    benchmarks = Column(JSON, nullable=True)  # Industry comparison data
    predictions = Column(JSON, nullable=True)  # Forecast data
    
    # Report scope
    date_range_start = Column(DateTime, nullable=False)
    date_range_end = Column(DateTime, nullable=False)
    business_areas_covered = Column(JSON, nullable=False)  # revenue, clients, marketing, etc.
    
    # Quality metrics
    insight_count = Column(Integer, nullable=False)
    data_freshness_score = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    
    # User interaction
    generated_at = Column(DateTime, default=utcnow, nullable=False)
    viewed_at = Column(DateTime, nullable=True)
    downloaded_at = Column(DateTime, nullable=True)
    user_rating = Column(Integer, nullable=True)  # 1-5
    
    # Relationships
    user = relationship("User", back_populates="bi_reports")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_reports', 'user_id', 'generated_at'),
        Index('idx_report_type', 'report_type', 'generated_at'),
    )