"""Add AI Memory Tables (SQLite Compatible)

Revision ID: 24e2df6fb87c
Revises: 47c3f8761124
Create Date: 2025-07-30 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision = '24e2df6fb87c'
down_revision = '47c3f8761124'
branch_labels = None
depends_on = None


def upgrade():
    # Create ai_memories table
    op.create_table(
        'ai_memories',
        sa.Column('id', sa.String(36), primary_key=True),  # Using String for SQLite UUID compatibility
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('memory_type', sa.String(50), nullable=False),
        sa.Column('context', sa.Text, default='{}'),  # JSON as text for SQLite
        sa.Column('importance', sa.Float, default=1.0),
        sa.Column('access_count', sa.Integer, default=0),
        sa.Column('embedding_vector', sa.String(255)),
        sa.Column('created_at', sa.DateTime, default=func.now()),
        sa.Column('last_accessed', sa.DateTime),
        sa.Column('is_long_term', sa.Boolean, default=False),
    )
    
    # Create indexes for ai_memories
    op.create_index('idx_ai_memories_user_id', 'ai_memories', ['user_id'])
    op.create_index('idx_ai_memories_type', 'ai_memories', ['memory_type'])
    op.create_index('idx_ai_memories_importance', 'ai_memories', ['importance'])
    
    # Create business_patterns table
    op.create_table(
        'business_patterns',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('pattern_type', sa.String(100), nullable=False),
        sa.Column('pattern_data', sa.Text, nullable=False),  # JSON as text
        sa.Column('outcome_data', sa.Text, default='{}'),  # JSON as text
        sa.Column('success_rate', sa.Float),
        sa.Column('confidence_score', sa.Float),
        sa.Column('created_at', sa.DateTime, default=func.now()),
        sa.Column('updated_at', sa.DateTime, default=func.now()),
    )
    
    # Create indexes for business_patterns
    op.create_index('idx_business_patterns_user_id', 'business_patterns', ['user_id'])
    op.create_index('idx_business_patterns_type', 'business_patterns', ['pattern_type'])
    
    # Create strategy_outcomes table
    op.create_table(
        'strategy_outcomes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('strategy_id', sa.String(255), nullable=False),
        sa.Column('strategy_title', sa.String(255), nullable=False),
        sa.Column('strategy_description', sa.Text),
        sa.Column('strategy_type', sa.String(100)),
        sa.Column('implementation_status', sa.String(50), default='pending'),
        sa.Column('implementation_date', sa.DateTime),
        sa.Column('completion_date', sa.DateTime),
        sa.Column('baseline_metrics', sa.Text, default='{}'),  # JSON as text
        sa.Column('outcome_metrics', sa.Text, default='{}'),  # JSON as text
        sa.Column('success_indicators', sa.Text, default='{}'),  # JSON as text
        sa.Column('roi_percentage', sa.Float),
        sa.Column('success_rating', sa.Float),
        sa.Column('created_at', sa.DateTime, default=func.now()),
        sa.Column('updated_at', sa.DateTime, default=func.now()),
    )
    
    # Create indexes for strategy_outcomes
    op.create_index('idx_strategy_outcomes_user_id', 'strategy_outcomes', ['user_id'])
    op.create_index('idx_strategy_outcomes_status', 'strategy_outcomes', ['implementation_status'])
    op.create_index('idx_strategy_outcomes_type', 'strategy_outcomes', ['strategy_type'])
    
    # Create agent_performance table
    op.create_table(
        'agent_performance',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('agent_id', sa.String(100), nullable=False),
        sa.Column('agent_name', sa.String(100)),
        sa.Column('total_interactions', sa.Integer, default=0),
        sa.Column('average_satisfaction', sa.Float, default=0.5),
        sa.Column('effectiveness_score', sa.Float, default=0.5),
        sa.Column('response_time_avg', sa.Float),
        sa.Column('query_type_performance', sa.Text, default='{}'),  # JSON as text
        sa.Column('user_preference_score', sa.Float, default=0.5),
        sa.Column('created_at', sa.DateTime, default=func.now()),
        sa.Column('updated_at', sa.DateTime, default=func.now()),
    )
    
    # Create indexes for agent_performance
    op.create_index('idx_agent_performance_user_id', 'agent_performance', ['user_id'])
    op.create_index('idx_agent_performance_agent_id', 'agent_performance', ['agent_id'])
    
    # Create user_learning_profiles table
    op.create_table(
        'user_learning_profiles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('communication_style', sa.String(50), default='balanced'),
        sa.Column('detail_level', sa.String(50), default='medium'),
        sa.Column('response_length', sa.String(50), default='medium'),
        sa.Column('preferred_topics', sa.Text, default='[]'),  # JSON array as text
        sa.Column('avoided_topics', sa.Text, default='[]'),  # JSON array as text
        sa.Column('preferred_agents', sa.Text, default='[]'),  # JSON array as text
        sa.Column('agent_effectiveness_rankings', sa.Text, default='{}'),  # JSON as text
        sa.Column('business_characteristics', sa.Text, default='{}'),  # JSON as text
        sa.Column('improvement_areas', sa.Text, default='[]'),  # JSON array as text
        sa.Column('success_factors', sa.Text, default='[]'),  # JSON array as text
        sa.Column('total_interactions', sa.Integer, default=0),
        sa.Column('learning_confidence', sa.Float, default=0.0),
        sa.Column('last_updated', sa.DateTime, default=func.now()),
        sa.Column('created_at', sa.DateTime, default=func.now()),
    )
    
    # Create indexes for user_learning_profiles
    op.create_index('idx_user_learning_profiles_user_id', 'user_learning_profiles', ['user_id'])
    
    # Create conversation_contexts table
    op.create_table(
        'conversation_contexts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('conversation_id', sa.String(255), nullable=False),
        sa.Column('active_agents', sa.Text, default='[]'),  # JSON array as text
        sa.Column('business_context', sa.Text, default='{}'),  # JSON as text
        sa.Column('strategy_tracking', sa.Text, default='{}'),  # JSON as text
        sa.Column('recent_messages', sa.Text, default='[]'),  # JSON array as text
        sa.Column('session_start', sa.DateTime, default=func.now()),
        sa.Column('last_activity', sa.DateTime, default=func.now()),
        sa.Column('is_active', sa.Boolean, default=True),
    )
    
    # Create indexes for conversation_contexts
    op.create_index('idx_conversation_contexts_user_id', 'conversation_contexts', ['user_id'])
    op.create_index('idx_conversation_contexts_active', 'conversation_contexts', ['is_active'])
    
    # Create business_insight_learning table (note: requires business_insights table to exist)
    # This table will be created only if business_insights exists
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'business_insights' in inspector.get_table_names():
        op.create_table(
            'business_insight_learning',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('insight_id', sa.String(36), sa.ForeignKey('business_insights.id'), nullable=False),
            sa.Column('user_rating', sa.Float),
            sa.Column('was_implemented', sa.Boolean, default=False),
            sa.Column('implementation_outcome', sa.Text, default='{}'),  # JSON as text
            sa.Column('click_through_rate', sa.Float),
            sa.Column('time_to_implementation', sa.Integer),
            sa.Column('follow_up_questions', sa.Integer, default=0),
            sa.Column('created_at', sa.DateTime, default=func.now()),
            sa.Column('updated_at', sa.DateTime, default=func.now()),
        )
        
        # Create indexes for business_insight_learning
        op.create_index('idx_business_insight_learning_user_id', 'business_insight_learning', ['user_id'])
        op.create_index('idx_business_insight_learning_insight_id', 'business_insight_learning', ['insight_id'])
    
    # Create ai_knowledge_graph table
    op.create_table(
        'ai_knowledge_graph',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('concept_a', sa.String(255), nullable=False),
        sa.Column('concept_b', sa.String(255), nullable=False),
        sa.Column('relationship_type', sa.String(100), nullable=False),
        sa.Column('strength', sa.Float, default=1.0),
        sa.Column('confidence', sa.Float, default=0.5),
        sa.Column('evidence_count', sa.Integer, default=1),
        sa.Column('evidence_sources', sa.Text, default='[]'),  # JSON array as text
        sa.Column('created_at', sa.DateTime, default=func.now()),
        sa.Column('updated_at', sa.DateTime, default=func.now()),
    )
    
    # Create indexes for ai_knowledge_graph
    op.create_index('idx_ai_knowledge_graph_user_id', 'ai_knowledge_graph', ['user_id'])
    op.create_index('idx_ai_knowledge_graph_concepts', 'ai_knowledge_graph', ['concept_a', 'concept_b'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('ai_knowledge_graph')
    if 'business_insight_learning' in [table.name for table in sa.MetaData().tables.values()]:
        op.drop_table('business_insight_learning')
    op.drop_table('conversation_contexts')
    op.drop_table('user_learning_profiles')
    op.drop_table('agent_performance')
    op.drop_table('strategy_outcomes')
    op.drop_table('business_patterns')
    op.drop_table('ai_memories')