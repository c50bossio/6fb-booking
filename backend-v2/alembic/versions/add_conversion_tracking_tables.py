"""add conversion tracking tables

Revision ID: add_conversion_tracking
Revises: 4df17937d4bb
Create Date: 2025-07-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_conversion_tracking'
down_revision = '4df17937d4bb'
branch_labels = None
depends_on = None


def upgrade():
    # Create conversion_events table
    op.create_table(
        'conversion_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.String(length=255), nullable=True),
        sa.Column('event_name', sa.String(length=100), nullable=False),
        sa.Column('event_type', sa.Enum('page_view', 'click', 'form_submit', 'add_to_cart', 
                                      'purchase', 'registration', 'lead', 'phone_call', 
                                      'chat_started', 'custom', name='eventtype'), nullable=False),
        sa.Column('event_value', sa.Float(), nullable=True),
        sa.Column('event_currency', sa.String(length=3), nullable=True),
        sa.Column('event_data', sa.JSON(), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('client_id', sa.String(length=255), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('channel', sa.String(length=50), nullable=True),
        sa.Column('utm_source', sa.String(length=255), nullable=True),
        sa.Column('utm_medium', sa.String(length=255), nullable=True),
        sa.Column('utm_campaign', sa.String(length=255), nullable=True),
        sa.Column('utm_term', sa.String(length=255), nullable=True),
        sa.Column('utm_content', sa.String(length=255), nullable=True),
        sa.Column('referrer', sa.Text(), nullable=True),
        sa.Column('gtm_synced', sa.Boolean(), nullable=True),
        sa.Column('gtm_sync_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('meta_synced', sa.Boolean(), nullable=True),
        sa.Column('meta_sync_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('google_ads_synced', sa.Boolean(), nullable=True),
        sa.Column('google_ads_sync_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('pending', 'tracked', 'failed', 'duplicate', 
                                   name='conversionstatus'), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('attribution_path_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for conversion_events
    op.create_index('idx_conversion_events_channel_date', 'conversion_events', ['channel', 'created_at'], unique=False)
    op.create_index('idx_conversion_events_type_date', 'conversion_events', ['event_type', 'created_at'], unique=False)
    op.create_index('idx_conversion_events_user_date', 'conversion_events', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_conversion_events_campaign', 'conversion_events', ['utm_campaign', 'created_at'], unique=False)
    op.create_index(op.f('ix_conversion_events_client_id'), 'conversion_events', ['client_id'], unique=False)
    op.create_index(op.f('ix_conversion_events_event_id'), 'conversion_events', ['event_id'], unique=True)
    op.create_index(op.f('ix_conversion_events_event_name'), 'conversion_events', ['event_name'], unique=False)
    op.create_index(op.f('ix_conversion_events_event_type'), 'conversion_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_conversion_events_session_id'), 'conversion_events', ['session_id'], unique=False)
    op.create_index(op.f('ix_conversion_events_user_id'), 'conversion_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_conversion_events_channel'), 'conversion_events', ['channel'], unique=False)
    
    # Create attribution_paths table
    op.create_table(
        'attribution_paths',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('conversion_event_id', sa.Integer(), nullable=False),
        sa.Column('touchpoints', sa.JSON(), nullable=False),
        sa.Column('first_touch_channel', sa.String(length=50), nullable=True),
        sa.Column('last_touch_channel', sa.String(length=50), nullable=True),
        sa.Column('path_length', sa.Integer(), nullable=True),
        sa.Column('attribution_model', sa.Enum('last_click', 'first_click', 'linear', 
                                              'time_decay', 'position_based', 'data_driven', 
                                              name='attributionmodel'), nullable=True),
        sa.Column('attribution_weights', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['conversion_event_id'], ['conversion_events.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('conversion_event_id')
    )
    op.create_index(op.f('ix_attribution_paths_user_id'), 'attribution_paths', ['user_id'], unique=False)
    
    # Add foreign key constraint for attribution_path_id in conversion_events
    op.create_foreign_key(None, 'conversion_events', 'attribution_paths', ['attribution_path_id'], ['id'])
    
    # Create tracking_configurations table
    op.create_table(
        'tracking_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('gtm_container_id', sa.String(length=50), nullable=True),
        sa.Column('gtm_enabled', sa.Boolean(), nullable=True),
        sa.Column('gtm_server_url', sa.String(length=255), nullable=True),
        sa.Column('meta_pixel_id', sa.String(length=50), nullable=True),
        sa.Column('meta_enabled', sa.Boolean(), nullable=True),
        sa.Column('meta_test_event_code', sa.String(length=50), nullable=True),
        sa.Column('google_ads_conversion_id', sa.String(length=50), nullable=True),
        sa.Column('google_ads_enabled', sa.Boolean(), nullable=True),
        sa.Column('google_ads_conversion_labels', sa.JSON(), nullable=True),
        sa.Column('attribution_window_days', sa.Integer(), nullable=True),
        sa.Column('view_attribution_window_days', sa.Integer(), nullable=True),
        sa.Column('default_attribution_model', sa.Enum('last_click', 'first_click', 'linear', 
                                                      'time_decay', 'position_based', 'data_driven', 
                                                      name='attributionmodel'), nullable=True),
        sa.Column('conversion_value_rules', sa.JSON(), nullable=True),
        sa.Column('excluded_domains', sa.JSON(), nullable=True),
        sa.Column('custom_channel_rules', sa.JSON(), nullable=True),
        sa.Column('enable_enhanced_conversions', sa.Boolean(), nullable=True),
        sa.Column('hash_user_data', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Create conversion_goals table
    op.create_table(
        'conversion_goals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_name', sa.String(length=100), nullable=False),
        sa.Column('event_type', sa.Enum('page_view', 'click', 'form_submit', 'add_to_cart', 
                                       'purchase', 'registration', 'lead', 'phone_call', 
                                       'chat_started', 'custom', name='eventtype'), nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('value_expression', sa.Text(), nullable=True),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('total_conversions', sa.Integer(), nullable=True),
        sa.Column('total_value', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_user_goal_name')
    )
    op.create_index('idx_conversion_goals_user_active', 'conversion_goals', ['user_id', 'is_active'], unique=False)
    op.create_index(op.f('ix_conversion_goals_user_id'), 'conversion_goals', ['user_id'], unique=False)
    
    # Create campaign_tracking table
    op.create_table(
        'campaign_tracking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.String(length=100), nullable=False),
        sa.Column('campaign_name', sa.String(length=255), nullable=False),
        sa.Column('campaign_source', sa.String(length=50), nullable=False),
        sa.Column('campaign_medium', sa.String(length=50), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_cost', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('conversions', sa.Integer(), nullable=True),
        sa.Column('conversion_value', sa.Float(), nullable=True),
        sa.Column('ctr', sa.Float(), nullable=True),
        sa.Column('conversion_rate', sa.Float(), nullable=True),
        sa.Column('cpc', sa.Float(), nullable=True),
        sa.Column('cpa', sa.Float(), nullable=True),
        sa.Column('roas', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'campaign_id', 'campaign_source', name='uq_user_campaign')
    )
    op.create_index('idx_campaign_tracking_active', 'campaign_tracking', ['user_id', 'is_active'], unique=False)
    op.create_index('idx_campaign_tracking_dates', 'campaign_tracking', ['start_date', 'end_date'], unique=False)
    op.create_index(op.f('ix_campaign_tracking_campaign_id'), 'campaign_tracking', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_tracking_user_id'), 'campaign_tracking', ['user_id'], unique=False)
    
    # Add lifetime_value column to users table if it doesn't exist
    try:
        op.add_column('users', sa.Column('lifetime_value', sa.Float(), nullable=True))
    except:
        pass  # Column might already exist


def downgrade():
    # Drop tables in reverse order of creation
    op.drop_table('campaign_tracking')
    op.drop_table('conversion_goals')
    op.drop_table('tracking_configurations')
    op.drop_table('attribution_paths')
    op.drop_table('conversion_events')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS eventtype')
    op.execute('DROP TYPE IF EXISTS attributionmodel')
    op.execute('DROP TYPE IF EXISTS conversionstatus')
    
    # Remove lifetime_value column from users table
    try:
        op.drop_column('users', 'lifetime_value')
    except:
        pass  # Column might not exist