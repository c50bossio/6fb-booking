"""Add AI Analytics tables for cross-user intelligence

Revision ID: add_ai_analytics_20250703
Revises: comprehensive_timezone_support_20250703
Create Date: 2025-07-03 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_ai_analytics_20250703'
down_revision = 'comprehensive_timezone_support_20250703'
branch_labels = None
depends_on = None


def upgrade():
    """Create AI Analytics tables for revolutionary cross-user intelligence"""
    
    # Performance Benchmarks table
    op.create_table('performance_benchmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('business_segment', sa.String(length=50), nullable=False),
        sa.Column('region', sa.String(length=50), nullable=True),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('sample_size', sa.Integer(), nullable=False),
        sa.Column('percentile_10', sa.Float(), nullable=True),
        sa.Column('percentile_25', sa.Float(), nullable=True),
        sa.Column('percentile_50', sa.Float(), nullable=True),
        sa.Column('percentile_75', sa.Float(), nullable=True),
        sa.Column('percentile_90', sa.Float(), nullable=True),
        sa.Column('mean_value', sa.Float(), nullable=True),
        sa.Column('std_deviation', sa.Float(), nullable=True),
        sa.Column('additional_data', sa.JSON(), nullable=True),
        sa.Column('anonymized_at', sa.DateTime(), nullable=False),
        sa.Column('aggregation_period', sa.String(length=20), nullable=False),
        sa.Column('data_source_hash', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance benchmarks
    op.create_index('idx_benchmark_lookup', 'performance_benchmarks', 
                   ['category', 'metric_name', 'business_segment', 'year', 'month'])
    op.create_index('idx_benchmark_region', 'performance_benchmarks', 
                   ['region', 'year', 'month'])
    op.create_index('idx_benchmark_temporal', 'performance_benchmarks', 
                   ['year', 'month', 'category'])
    op.create_index(op.f('ix_performance_benchmarks_id'), 'performance_benchmarks', ['id'])
    op.create_index(op.f('ix_performance_benchmarks_category'), 'performance_benchmarks', ['category'])
    op.create_index(op.f('ix_performance_benchmarks_metric_name'), 'performance_benchmarks', ['metric_name'])
    op.create_index(op.f('ix_performance_benchmarks_business_segment'), 'performance_benchmarks', ['business_segment'])
    
    # AI Insights Cache table
    op.create_table('ai_insights_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('insight_type', sa.String(length=50), nullable=False),
        sa.Column('business_segment', sa.String(length=50), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('insight_data', sa.JSON(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('data_freshness_score', sa.Float(), nullable=False),
        sa.Column('statistical_significance', sa.Float(), nullable=True),
        sa.Column('action_items', sa.JSON(), nullable=True),
        sa.Column('estimated_impact', sa.String(length=20), nullable=True),
        sa.Column('priority_score', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('view_count', sa.Integer(), nullable=False),
        sa.Column('last_viewed_at', sa.DateTime(), nullable=True),
        sa.Column('user_rating', sa.Integer(), nullable=True),
        sa.Column('user_feedback', sa.Text(), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for AI insights cache
    op.create_index('idx_user_insights', 'ai_insights_cache', 
                   ['user_id', 'is_active', 'expires_at'])
    op.create_index('idx_insight_type', 'ai_insights_cache', 
                   ['insight_type', 'is_active'])
    op.create_index('idx_priority', 'ai_insights_cache', 
                   ['priority_score', 'is_active', 'expires_at'])
    op.create_index('idx_expiry_cleanup', 'ai_insights_cache', 
                   ['expires_at', 'is_active'])
    op.create_index(op.f('ix_ai_insights_cache_id'), 'ai_insights_cache', ['id'])
    op.create_index(op.f('ix_ai_insights_cache_user_id'), 'ai_insights_cache', ['user_id'])
    op.create_index(op.f('ix_ai_insights_cache_insight_type'), 'ai_insights_cache', ['insight_type'])
    op.create_index(op.f('ix_ai_insights_cache_expires_at'), 'ai_insights_cache', ['expires_at'])
    op.create_index(op.f('ix_ai_insights_cache_is_active'), 'ai_insights_cache', ['is_active'])
    
    # Cross User Metrics table
    op.create_table('cross_user_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('period_type', sa.String(length=20), nullable=False),
        sa.Column('business_segment', sa.String(length=50), nullable=False),
        sa.Column('service_category', sa.String(length=50), nullable=True),
        sa.Column('location_type', sa.String(length=50), nullable=True),
        sa.Column('revenue_bucket', sa.String(length=20), nullable=True),
        sa.Column('appointment_volume_bucket', sa.String(length=20), nullable=True),
        sa.Column('client_count_bucket', sa.String(length=20), nullable=True),
        sa.Column('efficiency_score_bucket', sa.String(length=20), nullable=True),
        sa.Column('has_online_booking', sa.Boolean(), nullable=True),
        sa.Column('uses_marketing_automation', sa.Boolean(), nullable=True),
        sa.Column('offers_packages', sa.Boolean(), nullable=True),
        sa.Column('has_loyalty_program', sa.Boolean(), nullable=True),
        sa.Column('uses_dynamic_pricing', sa.Boolean(), nullable=True),
        sa.Column('is_top_performer', sa.Boolean(), nullable=False),
        sa.Column('growth_trend', sa.String(length=20), nullable=True),
        sa.Column('noise_added', sa.Boolean(), nullable=False),
        sa.Column('k_anonymity_level', sa.Integer(), nullable=True),
        sa.Column('aggregated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for cross user metrics
    op.create_index('idx_cross_user_analysis', 'cross_user_metrics', 
                   ['business_segment', 'date', 'is_top_performer'])
    op.create_index('idx_pattern_analysis', 'cross_user_metrics', 
                   ['has_online_booking', 'uses_marketing_automation', 'is_top_performer'])
    op.create_index('idx_temporal_analysis', 'cross_user_metrics', 
                   ['date', 'period_type', 'business_segment'])
    op.create_index(op.f('ix_cross_user_metrics_id'), 'cross_user_metrics', ['id'])
    op.create_index(op.f('ix_cross_user_metrics_date'), 'cross_user_metrics', ['date'])
    op.create_index(op.f('ix_cross_user_metrics_business_segment'), 'cross_user_metrics', ['business_segment'])
    op.create_index(op.f('ix_cross_user_metrics_service_category'), 'cross_user_metrics', ['service_category'])
    op.create_index(op.f('ix_cross_user_metrics_location_type'), 'cross_user_metrics', ['location_type'])
    
    # Predictive Models table
    op.create_table('predictive_models',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('model_type', sa.String(length=50), nullable=False),
        sa.Column('prediction_target', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('model_hash', sa.String(length=64), nullable=True),
        sa.Column('training_data_size', sa.Integer(), nullable=True),
        sa.Column('training_date', sa.DateTime(), nullable=False),
        sa.Column('training_duration_seconds', sa.Integer(), nullable=True),
        sa.Column('accuracy_score', sa.Float(), nullable=True),
        sa.Column('precision_score', sa.Float(), nullable=True),
        sa.Column('recall_score', sa.Float(), nullable=True),
        sa.Column('f1_score', sa.Float(), nullable=True),
        sa.Column('mae', sa.Float(), nullable=True),
        sa.Column('rmse', sa.Float(), nullable=True),
        sa.Column('r2_score', sa.Float(), nullable=True),
        sa.Column('hyperparameters', sa.JSON(), nullable=True),
        sa.Column('feature_importance', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('deployed_at', sa.DateTime(), nullable=True),
        sa.Column('last_prediction_at', sa.DateTime(), nullable=True),
        sa.Column('prediction_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('retired_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('model_name')
    )
    
    # Create indexes for predictive models
    op.create_index('idx_active_models', 'predictive_models', 
                   ['is_active', 'prediction_target'])
    op.create_index('idx_model_performance', 'predictive_models', 
                   ['prediction_target', 'accuracy_score'])
    op.create_index(op.f('ix_predictive_models_id'), 'predictive_models', ['id'])
    op.create_index(op.f('ix_predictive_models_model_name'), 'predictive_models', ['model_name'])
    
    # Business Intelligence Reports table
    op.create_table('business_intelligence_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('report_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('executive_summary', sa.Text(), nullable=False),
        sa.Column('key_insights', sa.JSON(), nullable=False),
        sa.Column('recommendations', sa.JSON(), nullable=False),
        sa.Column('benchmarks', sa.JSON(), nullable=True),
        sa.Column('predictions', sa.JSON(), nullable=True),
        sa.Column('date_range_start', sa.DateTime(), nullable=False),
        sa.Column('date_range_end', sa.DateTime(), nullable=False),
        sa.Column('business_areas_covered', sa.JSON(), nullable=False),
        sa.Column('insight_count', sa.Integer(), nullable=False),
        sa.Column('data_freshness_score', sa.Float(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('viewed_at', sa.DateTime(), nullable=True),
        sa.Column('downloaded_at', sa.DateTime(), nullable=True),
        sa.Column('user_rating', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for business intelligence reports
    op.create_index('idx_user_reports', 'business_intelligence_reports', 
                   ['user_id', 'generated_at'])
    op.create_index('idx_report_type', 'business_intelligence_reports', 
                   ['report_type', 'generated_at'])
    op.create_index(op.f('ix_business_intelligence_reports_id'), 'business_intelligence_reports', ['id'])
    op.create_index(op.f('ix_business_intelligence_reports_user_id'), 'business_intelligence_reports', ['user_id'])


def downgrade():
    """Remove AI Analytics tables"""
    
    # Drop business intelligence reports table
    op.drop_index(op.f('ix_business_intelligence_reports_user_id'), table_name='business_intelligence_reports')
    op.drop_index(op.f('ix_business_intelligence_reports_id'), table_name='business_intelligence_reports')
    op.drop_index('idx_report_type', table_name='business_intelligence_reports')
    op.drop_index('idx_user_reports', table_name='business_intelligence_reports')
    op.drop_table('business_intelligence_reports')
    
    # Drop predictive models table
    op.drop_index(op.f('ix_predictive_models_model_name'), table_name='predictive_models')
    op.drop_index(op.f('ix_predictive_models_id'), table_name='predictive_models')
    op.drop_index('idx_model_performance', table_name='predictive_models')
    op.drop_index('idx_active_models', table_name='predictive_models')
    op.drop_table('predictive_models')
    
    # Drop cross user metrics table
    op.drop_index(op.f('ix_cross_user_metrics_location_type'), table_name='cross_user_metrics')
    op.drop_index(op.f('ix_cross_user_metrics_service_category'), table_name='cross_user_metrics')
    op.drop_index(op.f('ix_cross_user_metrics_business_segment'), table_name='cross_user_metrics')
    op.drop_index(op.f('ix_cross_user_metrics_date'), table_name='cross_user_metrics')
    op.drop_index(op.f('ix_cross_user_metrics_id'), table_name='cross_user_metrics')
    op.drop_index('idx_temporal_analysis', table_name='cross_user_metrics')
    op.drop_index('idx_pattern_analysis', table_name='cross_user_metrics')
    op.drop_index('idx_cross_user_analysis', table_name='cross_user_metrics')
    op.drop_table('cross_user_metrics')
    
    # Drop AI insights cache table
    op.drop_index(op.f('ix_ai_insights_cache_is_active'), table_name='ai_insights_cache')
    op.drop_index(op.f('ix_ai_insights_cache_expires_at'), table_name='ai_insights_cache')
    op.drop_index(op.f('ix_ai_insights_cache_insight_type'), table_name='ai_insights_cache')
    op.drop_index(op.f('ix_ai_insights_cache_user_id'), table_name='ai_insights_cache')
    op.drop_index(op.f('ix_ai_insights_cache_id'), table_name='ai_insights_cache')
    op.drop_index('idx_expiry_cleanup', table_name='ai_insights_cache')
    op.drop_index('idx_priority', table_name='ai_insights_cache')
    op.drop_index('idx_insight_type', table_name='ai_insights_cache')
    op.drop_index('idx_user_insights', table_name='ai_insights_cache')
    op.drop_table('ai_insights_cache')
    
    # Drop performance benchmarks table
    op.drop_index(op.f('ix_performance_benchmarks_business_segment'), table_name='performance_benchmarks')
    op.drop_index(op.f('ix_performance_benchmarks_metric_name'), table_name='performance_benchmarks')
    op.drop_index(op.f('ix_performance_benchmarks_category'), table_name='performance_benchmarks')
    op.drop_index(op.f('ix_performance_benchmarks_id'), table_name='performance_benchmarks')
    op.drop_index('idx_benchmark_temporal', table_name='performance_benchmarks')
    op.drop_index('idx_benchmark_region', table_name='performance_benchmarks')
    op.drop_index('idx_benchmark_lookup', table_name='performance_benchmarks')
    op.drop_table('performance_benchmarks')