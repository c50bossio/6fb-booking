"""
Six Figure Barber Compliance Scoring System Models
Tracks and evaluates business compliance with 6FB methodology
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base


class SixFBComplianceScore(Base):
    """Overall compliance score for a user/business"""
    __tablename__ = "six_fb_compliance_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Overall scores
    overall_score = Column(Float, nullable=False, default=0.0)  # 0-100
    tier_level = Column(String, nullable=False, default="starter")  # starter, professional, premium, luxury
    
    # Category scores (0-100 each)
    pricing_strategy_score = Column(Float, nullable=False, default=0.0)
    service_portfolio_score = Column(Float, nullable=False, default=0.0)
    client_relationship_score = Column(Float, nullable=False, default=0.0)
    business_operations_score = Column(Float, nullable=False, default=0.0)
    marketing_presence_score = Column(Float, nullable=False, default=0.0)
    revenue_optimization_score = Column(Float, nullable=False, default=0.0)
    
    # Detailed metrics
    metrics = Column(JSON, nullable=False, default=dict)
    
    # Tracking
    last_calculated = Column(DateTime(timezone=True), server_default=func.now())
    calculation_frequency = Column(String, default="weekly")  # daily, weekly, monthly
    
    # Relationships
    user = relationship("User", back_populates="compliance_score")
    compliance_checks = relationship("SixFBComplianceCheck", back_populates="compliance_score")
    improvement_tasks = relationship("SixFBImprovementTask", back_populates="compliance_score")


class SixFBComplianceCheck(Base):
    """Individual compliance checks and their results"""
    __tablename__ = "six_fb_compliance_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    compliance_score_id = Column(Integer, ForeignKey("six_fb_compliance_scores.id"), nullable=False)
    
    # Check details
    category = Column(String, nullable=False)  # pricing, services, relationships, etc.
    check_name = Column(String, nullable=False)
    description = Column(Text)
    
    # Results
    passed = Column(Boolean, nullable=False, default=False)
    score = Column(Float, nullable=False, default=0.0)  # 0-100
    weight = Column(Float, nullable=False, default=1.0)  # Weight in overall calculation
    
    # Feedback
    feedback = Column(Text)
    recommendation = Column(Text)
    
    # Tracking
    checked_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    compliance_score = relationship("SixFBComplianceScore", back_populates="compliance_checks")


class SixFBImprovementTask(Base):
    """Actionable tasks to improve 6FB compliance"""
    __tablename__ = "six_fb_improvement_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    compliance_score_id = Column(Integer, ForeignKey("six_fb_compliance_scores.id"), nullable=False)
    
    # Task details
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String, nullable=False)
    priority = Column(String, nullable=False, default="medium")  # high, medium, low
    
    # Impact
    potential_score_improvement = Column(Float, nullable=False, default=0.0)
    revenue_impact = Column(String)  # high, medium, low
    effort_required = Column(String)  # low, medium, high
    
    # Status
    status = Column(String, nullable=False, default="pending")  # pending, in_progress, completed, dismissed
    completed_at = Column(DateTime(timezone=True))
    
    # Resources
    resources = Column(JSON, default=list)  # Links, guides, templates
    
    # Tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    compliance_score = relationship("SixFBComplianceScore", back_populates="improvement_tasks")


class SixFBBenchmark(Base):
    """Industry benchmarks for 6FB compliance metrics"""
    __tablename__ = "six_fb_benchmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Benchmark details
    metric_name = Column(String, nullable=False, unique=True)
    category = Column(String, nullable=False)
    tier_level = Column(String, nullable=False)  # starter, professional, premium, luxury
    
    # Values
    minimum_value = Column(Float)
    target_value = Column(Float, nullable=False)
    excellence_value = Column(Float)
    
    # Context
    description = Column(Text)
    calculation_method = Column(Text)
    
    # Metadata
    unit = Column(String)  # percentage, dollars, count, etc.
    frequency = Column(String)  # how often to measure
    
    # Tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SixFBComplianceHistory(Base):
    """Historical tracking of compliance scores"""
    __tablename__ = "six_fb_compliance_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Snapshot of scores
    overall_score = Column(Float, nullable=False)
    tier_level = Column(String, nullable=False)
    category_scores = Column(JSON, nullable=False)
    
    # Context
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Changes
    score_change = Column(Float)  # Change from previous period
    improvements_made = Column(JSON, default=list)
    challenges_faced = Column(JSON, default=list)
    
    # Tracking
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")