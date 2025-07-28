"""Add semantic search and vector storage tables

Revision ID: aa1702ed4855
Revises: 60abeabbd32b
Create Date: 2025-07-27 17:12:20.772789

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa1702ed4855'
down_revision: Union[str, Sequence[str], None] = '60abeabbd32b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create embedding_cache table
    op.create_table(
        'embedding_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('content_type', sa.String(length=20), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('content_text', sa.Text(), nullable=False),
        sa.Column('embedding', sa.JSON(), nullable=False),
        sa.Column('embedding_model', sa.String(length=50), nullable=False, server_default='voyage-3-large'),
        sa.Column('chunk_index', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('embedding_dimension', sa.Integer(), nullable=False, server_default='1024'),
        sa.Column('content_length', sa.Integer(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('last_used_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for embedding_cache
    op.create_index(op.f('ix_embedding_cache_id'), 'embedding_cache', ['id'], unique=False)
    op.create_index(op.f('ix_embedding_cache_content_hash'), 'embedding_cache', ['content_hash'], unique=True)
    op.create_index(op.f('ix_embedding_cache_content_type'), 'embedding_cache', ['content_type'], unique=False)
    op.create_index(op.f('ix_embedding_cache_entity_id'), 'embedding_cache', ['entity_id'], unique=False)
    op.create_index(op.f('ix_embedding_cache_is_active'), 'embedding_cache', ['is_active'], unique=False)
    op.create_index('idx_embedding_cache_type_entity', 'embedding_cache', ['content_type', 'entity_id'], unique=False)
    op.create_index('idx_embedding_cache_active_used', 'embedding_cache', ['is_active', 'last_used_at'], unique=False)
    op.create_index('idx_embedding_cache_model_dimension', 'embedding_cache', ['embedding_model', 'embedding_dimension'], unique=False)
    
    # Create search_analytics table
    op.create_table(
        'search_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('query', sa.String(length=500), nullable=False),
        sa.Column('query_hash', sa.String(length=64), nullable=False),
        sa.Column('normalized_query', sa.String(length=500), nullable=True),
        sa.Column('query_intent', sa.String(length=50), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_role', sa.String(length=50), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('search_type', sa.String(length=20), nullable=False),
        sa.Column('search_category', sa.String(length=20), nullable=True),
        sa.Column('min_similarity', sa.Float(), nullable=True),
        sa.Column('limit_requested', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('results_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('has_semantic_results', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('has_keyword_results', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('top_similarity_score', sa.Float(), nullable=True),
        sa.Column('avg_similarity_score', sa.Float(), nullable=True),
        sa.Column('clicked_result_id', sa.Integer(), nullable=True),
        sa.Column('clicked_result_type', sa.String(length=20), nullable=True),
        sa.Column('clicked_result_position', sa.Integer(), nullable=True),
        sa.Column('clicked_result_score', sa.Float(), nullable=True),
        sa.Column('time_to_click_ms', sa.Integer(), nullable=True),
        sa.Column('search_time_ms', sa.Integer(), nullable=False),
        sa.Column('embedding_time_ms', sa.Integer(), nullable=True),
        sa.Column('similarity_time_ms', sa.Integer(), nullable=True),
        sa.Column('fallback_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('search_context', sa.JSON(), nullable=True),
        sa.Column('result_metadata', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for search_analytics
    op.create_index(op.f('ix_search_analytics_id'), 'search_analytics', ['id'], unique=False)
    op.create_index(op.f('ix_search_analytics_query'), 'search_analytics', ['query'], unique=False)
    op.create_index(op.f('ix_search_analytics_query_hash'), 'search_analytics', ['query_hash'], unique=False)
    op.create_index(op.f('ix_search_analytics_user_id'), 'search_analytics', ['user_id'], unique=False)
    op.create_index(op.f('ix_search_analytics_session_id'), 'search_analytics', ['session_id'], unique=False)
    op.create_index(op.f('ix_search_analytics_search_type'), 'search_analytics', ['search_type'], unique=False)
    op.create_index(op.f('ix_search_analytics_created_at'), 'search_analytics', ['created_at'], unique=False)
    op.create_index('idx_search_analytics_user_time', 'search_analytics', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_search_analytics_query_time', 'search_analytics', ['query_hash', 'created_at'], unique=False)
    op.create_index('idx_search_analytics_type_time', 'search_analytics', ['search_type', 'created_at'], unique=False)
    op.create_index('idx_search_analytics_performance', 'search_analytics', ['search_time_ms', 'results_count'], unique=False)
    
    # Create search_query_suggestions table
    op.create_table(
        'search_query_suggestions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('query', sa.String(length=200), nullable=False),
        sa.Column('normalized_query', sa.String(length=200), nullable=False),
        sa.Column('search_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('success_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_results_count', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('last_searched_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('click_through_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_click_position', sa.Float(), nullable=True),
        sa.Column('is_trending', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('intent', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for search_query_suggestions
    op.create_index(op.f('ix_search_query_suggestions_id'), 'search_query_suggestions', ['id'], unique=False)
    op.create_index(op.f('ix_search_query_suggestions_query'), 'search_query_suggestions', ['query'], unique=True)
    op.create_index(op.f('ix_search_query_suggestions_normalized_query'), 'search_query_suggestions', ['normalized_query'], unique=False)
    
    # Create semantic_search_config table
    op.create_table(
        'semantic_search_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('primary_model', sa.String(length=50), nullable=False, server_default='voyage-3-large'),
        sa.Column('query_model', sa.String(length=50), nullable=False, server_default='voyage-3-large'),
        sa.Column('content_model', sa.String(length=50), nullable=False, server_default='voyage-3-large'),
        sa.Column('min_similarity_barber', sa.Float(), nullable=False, server_default='0.6'),
        sa.Column('min_similarity_service', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('min_similarity_recommendation', sa.Float(), nullable=False, server_default='0.4'),
        sa.Column('max_embedding_cache_size', sa.Integer(), nullable=False, server_default='10000'),
        sa.Column('embedding_cache_ttl_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('batch_size', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('enable_hybrid_search', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('enable_query_expansion', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('enable_result_reranking', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('enable_analytics', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('business_id', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for semantic_search_config
    op.create_index(op.f('ix_semantic_search_config_id'), 'semantic_search_config', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order
    op.drop_index(op.f('ix_semantic_search_config_id'), table_name='semantic_search_config')
    op.drop_table('semantic_search_config')
    
    op.drop_index(op.f('ix_search_query_suggestions_normalized_query'), table_name='search_query_suggestions')
    op.drop_index(op.f('ix_search_query_suggestions_query'), table_name='search_query_suggestions')
    op.drop_index(op.f('ix_search_query_suggestions_id'), table_name='search_query_suggestions')
    op.drop_table('search_query_suggestions')
    
    op.drop_index('idx_search_analytics_performance', table_name='search_analytics')
    op.drop_index('idx_search_analytics_type_time', table_name='search_analytics')
    op.drop_index('idx_search_analytics_query_time', table_name='search_analytics')
    op.drop_index('idx_search_analytics_user_time', table_name='search_analytics')
    op.drop_index(op.f('ix_search_analytics_created_at'), table_name='search_analytics')
    op.drop_index(op.f('ix_search_analytics_search_type'), table_name='search_analytics')
    op.drop_index(op.f('ix_search_analytics_session_id'), table_name='search_analytics')
    op.drop_index(op.f('ix_search_analytics_user_id'), table_name='search_analytics')
    op.drop_index(op.f('ix_search_analytics_query_hash'), table_name='search_analytics')
    op.drop_index(op.f('ix_search_analytics_query'), table_name='search_analytics')
    op.drop_index(op.f('ix_search_analytics_id'), table_name='search_analytics')
    op.drop_table('search_analytics')
    
    op.drop_index('idx_embedding_cache_model_dimension', table_name='embedding_cache')
    op.drop_index('idx_embedding_cache_active_used', table_name='embedding_cache')
    op.drop_index('idx_embedding_cache_type_entity', table_name='embedding_cache')
    op.drop_index(op.f('ix_embedding_cache_is_active'), table_name='embedding_cache')
    op.drop_index(op.f('ix_embedding_cache_entity_id'), table_name='embedding_cache')
    op.drop_index(op.f('ix_embedding_cache_content_type'), table_name='embedding_cache')
    op.drop_index(op.f('ix_embedding_cache_content_hash'), table_name='embedding_cache')
    op.drop_index(op.f('ix_embedding_cache_id'), table_name='embedding_cache')
    op.drop_table('embedding_cache')
