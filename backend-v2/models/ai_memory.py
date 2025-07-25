"""
🧠 AI Agent Memory & Learning Models

Persistent storage for AI Agent memory, learning patterns, and continuous improvement.
Enables the AI to remember what works, learn from failures, and get smarter over time.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    ForeignKey, Text, Enum, Index, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from db import Base


class LearningEventType(str, enum.Enum):
    """Types of learning events the AI can process"""
    CONVERSION_SUCCESS = "conversion_success"    # Client converted
    CONVERSION_FAILURE = "conversion_failure"    # Client declined/ignored
    MESSAGE_ENGAGEMENT = "message_engagement"    # Client opened/responded
    TIMING_OPTIMIZATION = "timing_optimization"  # Optimal timing discovered
    PERSONALITY_DETECTION = "personality_detection"  # Personality pattern learned
    CHANNEL_PREFERENCE = "channel_preference"    # Channel effectiveness learned
    SERVICE_COMPATIBILITY = "service_compatibility"  # Service pairing success
    SEASONAL_PATTERN = "seasonal_pattern"        # Seasonal trends learned


class AIMemoryRecord(Base):
    """
    🧠 Core AI memory storage - remembers everything the AI learns
    """
    __tablename__ = "ai_memory_records"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Memory identification
    memory_type = Column(Enum(LearningEventType), nullable=False, index=True)
    context_hash = Column(String(64), nullable=False, index=True)  # Unique context identifier
    
    # Learning data
    input_features = Column(JSON, nullable=False)  # What led to this learning
    outcome_data = Column(JSON, nullable=False)    # What happened
    success_score = Column(Float, nullable=False)  # 0.0 to 1.0 success rate
    confidence_level = Column(Float, nullable=False)  # How confident in this learning
    
    # Context information
    client_personality = Column(String(50))
    service_type = Column(String(100))
    channel_used = Column(String(50))
    timing_factor = Column(String(50))
    seasonal_context = Column(String(20))
    
    # Performance tracking
    usage_count = Column(Integer, default=1)  # How often this memory is used
    accuracy_score = Column(Float, default=0.5)  # How accurate this memory proves
    last_validated = Column(DateTime, default=func.now())
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by_agent_version = Column(String(20), default="v1.0")
    
    # Indexes for fast retrieval
    __table_args__ = (
        Index('idx_memory_type_context', 'memory_type', 'context_hash'),
        Index('idx_memory_personality_service', 'client_personality', 'service_type'),
        Index('idx_memory_performance', 'success_score', 'confidence_level'),
        Index('idx_memory_recent', 'created_at'),
    )


class AILearningPattern(Base):
    """
    📈 Aggregated learning patterns - high-level insights the AI discovers
    """
    __tablename__ = "ai_learning_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Pattern identification
    pattern_name = Column(String(200), nullable=False, unique=True)
    pattern_type = Column(Enum(LearningEventType), nullable=False, index=True)
    description = Column(Text)
    
    # Pattern data
    trigger_conditions = Column(JSON, nullable=False)  # When this pattern applies
    predicted_outcomes = Column(JSON, nullable=False)  # What to expect
    confidence_score = Column(Float, nullable=False)   # How reliable this pattern is
    
    # Performance metrics
    times_applied = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    average_revenue = Column(Float, default=0.0)
    
    # Pattern evolution
    discovery_date = Column(DateTime, default=func.now())
    last_refined = Column(DateTime, default=func.now())
    refinement_count = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    validation_status = Column(String(20), default="learning")  # learning, validated, deprecated
    
    # Memory records that contributed to this pattern
    contributing_memories = relationship("AIMemoryRecord", secondary="pattern_memory_links")


class PatternMemoryLink(Base):
    """Links patterns to the memory records that created them"""
    __tablename__ = "pattern_memory_links"
    
    pattern_id = Column(Integer, ForeignKey("ai_learning_patterns.id"), primary_key=True)
    memory_id = Column(Integer, ForeignKey("ai_memory_records.id"), primary_key=True)
    contribution_weight = Column(Float, default=1.0)  # How much this memory contributed


class AIPerformanceMetrics(Base):
    """
    📊 Track AI Agent performance over time for continuous improvement
    """
    __tablename__ = "ai_performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Time period
    date = Column(DateTime, nullable=False, index=True)
    period_type = Column(String(20), default="daily")  # daily, weekly, monthly
    
    # Core performance
    opportunities_identified = Column(Integer, default=0)
    opportunities_executed = Column(Integer, default=0)
    conversions_achieved = Column(Integer, default=0)
    total_revenue_generated = Column(Float, default=0.0)
    
    # AI accuracy metrics
    confidence_accuracy = Column(Float, default=0.0)  # How accurate confidence scores are
    personality_detection_accuracy = Column(Float, default=0.0)
    timing_optimization_accuracy = Column(Float, default=0.0)
    channel_selection_accuracy = Column(Float, default=0.0)
    
    # Learning progress
    new_patterns_discovered = Column(Integer, default=0)
    patterns_refined = Column(Integer, default=0)
    memory_records_created = Column(Integer, default=0)
    
    # Efficiency metrics
    avg_response_time_ms = Column(Float, default=0.0)
    cpu_usage_percent = Column(Float, default=0.0)
    memory_usage_mb = Column(Float, default=0.0)
    
    # AI version tracking
    agent_version = Column(String(20), default="v1.0")
    model_version = Column(String(50))
    
    created_at = Column(DateTime, default=func.now())


class AIExperiment(Base):
    """
    🧪 A/B testing and experimentation framework for AI improvement
    """
    __tablename__ = "ai_experiments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Experiment setup
    name = Column(String(200), nullable=False)
    description = Column(Text)
    hypothesis = Column(Text)  # What we're testing
    
    # Experiment configuration
    experiment_type = Column(String(50))  # message_variation, timing_test, confidence_threshold
    control_config = Column(JSON)  # Control group settings
    variant_config = Column(JSON)  # Test group settings
    
    # Experiment status
    status = Column(String(20), default="planning")  # planning, running, completed, paused
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    target_sample_size = Column(Integer, default=100)
    
    # Results
    control_performance = Column(JSON)  # Control group results
    variant_performance = Column(JSON)  # Test group results
    statistical_significance = Column(Float)  # p-value
    winner = Column(String(20))  # control, variant, inconclusive
    
    # Implementation
    should_implement = Column(Boolean, default=False)
    implemented_at = Column(DateTime)
    implementation_notes = Column(Text)
    
    created_at = Column(DateTime, default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))


class AIKnowledgeBase(Base):
    """
    📚 Structured knowledge base for AI decision making
    """
    __tablename__ = "ai_knowledge_base"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Knowledge classification
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100))
    knowledge_type = Column(String(50))  # rule, pattern, fact, insight
    
    # Knowledge content
    title = Column(String(200), nullable=False)
    content = Column(JSON, nullable=False)
    conditions = Column(JSON)  # When this knowledge applies
    
    # Knowledge validation
    evidence_strength = Column(Float, default=0.5)  # How well supported this knowledge is
    sample_size = Column(Integer, default=0)  # How many data points support this
    last_validated = Column(DateTime, default=func.now())
    
    # Usage tracking
    times_used = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    
    # Lifecycle
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deprecation_date = Column(DateTime)  # When this knowledge becomes outdated
    
    # Source tracking
    source_type = Column(String(50))  # learned, imported, manual
    source_reference = Column(String(200))
    
    __table_args__ = (
        Index('idx_knowledge_category', 'category', 'subcategory'),
        Index('idx_knowledge_performance', 'success_rate', 'evidence_strength'),
    )