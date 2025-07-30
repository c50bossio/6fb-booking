"""
AI Memory Models for 6FB Booking V2
Database models for storing AI memory, learning patterns, and business insights.
"""

from sqlalchemy import Column, String, Text, DateTime, Float, Integer, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()


class AIMemory(Base):
    """Stores AI memories for learning and context"""
    __tablename__ = "ai_memories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    content = Column(Text, nullable=False)
    memory_type = Column(String(50), nullable=False)  # 'conversation', 'strategy', 'pattern', 'outcome'
    context = Column(JSON, default={})
    importance = Column(Float, default=1.0)
    access_count = Column(Integer, default=0)
    embedding_vector = Column(String(255))  # Could be upgraded to vector type for better performance
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed = Column(DateTime)
    is_long_term = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="ai_memories")


class BusinessPattern(Base):
    """Stores identified business patterns and their outcomes"""
    __tablename__ = "business_patterns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    pattern_type = Column(String(100), nullable=False)  # 'revenue', 'client_behavior', 'scheduling', etc.
    pattern_data = Column(JSON, nullable=False)
    outcome_data = Column(JSON, default={})
    success_rate = Column(Float)
    confidence_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="business_patterns")


class StrategyOutcome(Base):
    """Tracks AI-recommended strategies and their real-world outcomes"""
    __tablename__ = "strategy_outcomes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    strategy_id = Column(String(255), nullable=False)  # References strategy from conversations
    strategy_title = Column(String(255), nullable=False)
    strategy_description = Column(Text)
    strategy_type = Column(String(100))  # 'pricing', 'marketing', 'operations', 'service'
    
    # Implementation tracking
    implementation_status = Column(String(50), default='pending')  # 'pending', 'active', 'completed', 'abandoned'
    implementation_date = Column(DateTime)
    completion_date = Column(DateTime)
    
    # Baseline metrics (before strategy)
    baseline_metrics = Column(JSON, default={})
    
    # Outcome metrics (after strategy)
    outcome_metrics = Column(JSON, default={})
    
    # Success measurement
    success_indicators = Column(JSON, default={})
    roi_percentage = Column(Float)
    success_rating = Column(Float)  # 0.0 to 1.0
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="strategy_outcomes")


class AgentPerformance(Base):
    """Tracks performance of individual AI agents per user"""
    __tablename__ = "agent_performance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    agent_id = Column(String(100), nullable=False)  # 'financial', 'growth', 'operations', 'brand'
    agent_name = Column(String(100))
    
    # Performance metrics
    total_interactions = Column(Integer, default=0)
    average_satisfaction = Column(Float, default=0.5)
    effectiveness_score = Column(Float, default=0.5)
    response_time_avg = Column(Float)  # Average response time in seconds
    
    # Query type performance
    query_type_performance = Column(JSON, default={})  # Performance by query type
    
    # User preference indicators
    user_preference_score = Column(Float, default=0.5)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="agent_performances")


class UserLearningProfile(Base):
    """Stores learned user preferences and characteristics"""
    __tablename__ = "user_learning_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, unique=True)
    
    # Communication preferences
    communication_style = Column(String(50), default='balanced')  # 'formal', 'casual', 'balanced'
    detail_level = Column(String(50), default='medium')  # 'brief', 'medium', 'detailed'
    response_length = Column(String(50), default='medium')  # 'short', 'medium', 'long'
    
    # Topic preferences
    preferred_topics = Column(ARRAY(String), default=[])
    avoided_topics = Column(ARRAY(String), default=[])
    
    # Agent preferences
    preferred_agents = Column(ARRAY(String), default=[])
    agent_effectiveness_rankings = Column(JSON, default={})
    
    # Business characteristics learned
    business_characteristics = Column(JSON, default={})
    improvement_areas = Column(ARRAY(String), default=[])
    success_factors = Column(ARRAY(String), default=[])
    
    # Learning metadata
    total_interactions = Column(Integer, default=0)
    learning_confidence = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="learning_profile", uselist=False)


class ConversationContext(Base):
    """Stores conversation contexts for maintaining state across sessions"""
    __tablename__ = "conversation_contexts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    conversation_id = Column(String(255), nullable=False)
    
    # Conversation state
    active_agents = Column(ARRAY(String), default=[])
    business_context = Column(JSON, default={})
    strategy_tracking = Column(JSON, default={})
    
    # Message history (recent messages for context)
    recent_messages = Column(JSON, default=[])
    
    # Session metadata
    session_start = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="conversation_contexts")


class BusinessInsightLearning(Base):
    """Tracks which insights were effective and user responses"""
    __tablename__ = "business_insight_learning"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    insight_id = Column(UUID(as_uuid=True), ForeignKey('business_insights.id'), nullable=False)
    
    # User response to insight
    user_rating = Column(Float)  # User's rating of insight usefulness
    was_implemented = Column(Boolean, default=False)
    implementation_outcome = Column(JSON, default={})
    
    # Learning signals
    click_through_rate = Column(Float)
    time_to_implementation = Column(Integer)  # Days
    follow_up_questions = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="insight_learning")
    insight = relationship("BusinessInsight", back_populates="learning_records")


class AIKnowledgeGraph(Base):
    """Stores relationships between business concepts for enhanced understanding"""
    __tablename__ = "ai_knowledge_graph"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Graph nodes (concepts)
    concept_a = Column(String(255), nullable=False)
    concept_b = Column(String(255), nullable=False)
    
    # Relationship data
    relationship_type = Column(String(100), nullable=False)  # 'causes', 'correlates', 'improves', etc.
    strength = Column(Float, default=1.0)  # Relationship strength
    confidence = Column(Float, default=0.5)  # Confidence in relationship
    
    # Supporting evidence
    evidence_count = Column(Integer, default=1)
    evidence_sources = Column(JSON, default=[])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="knowledge_graph")


# Add these relationships to your existing User model
"""
Add these to your User model:

    # AI Memory relationships
    ai_memories = relationship("AIMemory", back_populates="user", cascade="all, delete-orphan")
    business_patterns = relationship("BusinessPattern", back_populates="user", cascade="all, delete-orphan")
    strategy_outcomes = relationship("StrategyOutcome", back_populates="user", cascade="all, delete-orphan")
    agent_performances = relationship("AgentPerformance", back_populates="user", cascade="all, delete-orphan")
    learning_profile = relationship("UserLearningProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    conversation_contexts = relationship("ConversationContext", back_populates="user", cascade="all, delete-orphan")
    insight_learning = relationship("BusinessInsightLearning", back_populates="user", cascade="all, delete-orphan")
    knowledge_graph = relationship("AIKnowledgeGraph", back_populates="user", cascade="all, delete-orphan")
"""

# Add this to your BusinessInsight model
"""
Add this to your BusinessInsight model:

    learning_records = relationship("BusinessInsightLearning", back_populates="insight", cascade="all, delete-orphan")
"""