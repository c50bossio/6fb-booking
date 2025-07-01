"""add marketing suite tables

Revision ID: 4df17937d4bb
Revises: 1e2bca78ae85
Create Date: 2025-07-01 16:09:55.570259

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4df17937d4bb'
down_revision: Union[str, None] = '1e2bca78ae85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Note: marketing_templates, marketing_campaigns, contact_lists, contact_segments already exist
    # Only create the new tables for enhanced marketing suite
    
    # Create campaign_recipients table
    op.create_table('campaign_recipients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('email_sent', sa.Boolean(), nullable=True),
        sa.Column('email_sent_at', sa.DateTime(), nullable=True),
        sa.Column('email_delivered', sa.Boolean(), nullable=True),
        sa.Column('email_delivered_at', sa.DateTime(), nullable=True),
        sa.Column('email_opened', sa.Boolean(), nullable=True),
        sa.Column('email_opened_at', sa.DateTime(), nullable=True),
        sa.Column('email_clicked', sa.Boolean(), nullable=True),
        sa.Column('email_clicked_at', sa.DateTime(), nullable=True),
        sa.Column('email_bounced', sa.Boolean(), nullable=True),
        sa.Column('email_bounce_reason', sa.String(length=255), nullable=True),
        sa.Column('email_unsubscribed', sa.Boolean(), nullable=True),
        sa.Column('sms_sent', sa.Boolean(), nullable=True),
        sa.Column('sms_sent_at', sa.DateTime(), nullable=True),
        sa.Column('sms_delivered', sa.Boolean(), nullable=True),
        sa.Column('sms_delivered_at', sa.DateTime(), nullable=True),
        sa.Column('sms_clicked', sa.Boolean(), nullable=True),
        sa.Column('sms_clicked_at', sa.DateTime(), nullable=True),
        sa.Column('sms_failed', sa.Boolean(), nullable=True),
        sa.Column('sms_failure_reason', sa.String(length=255), nullable=True),
        sa.Column('sms_opted_out', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['marketing_campaigns.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_campaign_recipients_id'), 'campaign_recipients', ['id'], unique=False)
    op.create_index(op.f('ix_campaign_recipients_campaign_id'), 'campaign_recipients', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_recipients_email'), 'campaign_recipients', ['email'], unique=False)
    op.create_index(op.f('ix_campaign_recipients_phone'), 'campaign_recipients', ['phone'], unique=False)
    op.create_index('idx_campaign_recipient_tracking', 'campaign_recipients', ['campaign_id', 'email_opened', 'email_clicked'], unique=False)
    op.create_index('idx_campaign_recipient_client', 'campaign_recipients', ['campaign_id', 'client_id'], unique=False)
    
    # Create marketing_usage table (already exists as MarketingUsage)
    # Skip this table as it already exists
    
    # Create marketing_credits table
    op.create_table('marketing_credits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('credit_type', sa.String(length=50), nullable=False),
        sa.Column('email_credits', sa.Integer(), nullable=True),
        sa.Column('sms_credits', sa.Integer(), nullable=True),
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('email_used', sa.Integer(), nullable=True),
        sa.Column('sms_used', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketing_credits_id'), 'marketing_credits', ['id'], unique=False)
    op.create_index(op.f('ix_marketing_credits_is_active'), 'marketing_credits', ['is_active'], unique=False)
    
    # Create marketing_analytics table (enhanced CampaignAnalytics)
    op.create_table('marketing_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('campaign_id', sa.Integer(), nullable=True),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('period_type', sa.String(length=20), nullable=False),
        sa.Column('period_date', sa.Date(), nullable=False),
        sa.Column('emails_sent', sa.Integer(), nullable=True),
        sa.Column('emails_delivered', sa.Integer(), nullable=True),
        sa.Column('emails_opened', sa.Integer(), nullable=True),
        sa.Column('unique_opens', sa.Integer(), nullable=True),
        sa.Column('emails_clicked', sa.Integer(), nullable=True),
        sa.Column('unique_clicks', sa.Integer(), nullable=True),
        sa.Column('emails_bounced', sa.Integer(), nullable=True),
        sa.Column('emails_unsubscribed', sa.Integer(), nullable=True),
        sa.Column('emails_marked_spam', sa.Integer(), nullable=True),
        sa.Column('sms_sent', sa.Integer(), nullable=True),
        sa.Column('sms_delivered', sa.Integer(), nullable=True),
        sa.Column('sms_clicked', sa.Integer(), nullable=True),
        sa.Column('sms_failed', sa.Integer(), nullable=True),
        sa.Column('sms_opted_out', sa.Integer(), nullable=True),
        sa.Column('total_conversions', sa.Integer(), nullable=True),
        sa.Column('conversion_revenue', sa.Float(), nullable=True),
        sa.Column('total_cost', sa.Float(), nullable=True),
        sa.Column('cost_per_conversion', sa.Float(), nullable=True),
        sa.Column('roi', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['marketing_campaigns.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['marketing_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketing_analytics_id'), 'marketing_analytics', ['id'], unique=False)
    op.create_index(op.f('ix_marketing_analytics_location_id'), 'marketing_analytics', ['location_id'], unique=False)
    op.create_index(op.f('ix_marketing_analytics_campaign_id'), 'marketing_analytics', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_marketing_analytics_template_id'), 'marketing_analytics', ['template_id'], unique=False)
    op.create_index(op.f('ix_marketing_analytics_period_date'), 'marketing_analytics', ['period_date'], unique=False)
    op.create_index('idx_analytics_location_period', 'marketing_analytics', ['location_id', 'period_type', 'period_date'], unique=False)
    op.create_index('idx_analytics_campaign', 'marketing_analytics', ['campaign_id', 'period_type', 'period_date'], unique=False)
    
    # Add missing columns to existing tables
    # Add location_id to marketing_campaigns
    op.add_column('marketing_campaigns', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'marketing_campaigns', 'barbershop_locations', ['location_id'], ['id'])
    
    # Add cost tracking columns to marketing_campaigns
    op.add_column('marketing_campaigns', sa.Column('estimated_recipients', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('actual_recipients', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('estimated_email_cost', sa.Float(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('estimated_sms_cost', sa.Float(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('actual_email_cost', sa.Float(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('actual_sms_cost', sa.Float(), nullable=True))
    
    # Add performance metrics to marketing_campaigns
    op.add_column('marketing_campaigns', sa.Column('emails_sent', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('emails_delivered', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('emails_opened', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('emails_clicked', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('emails_bounced', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('emails_unsubscribed', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('sms_sent', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('sms_delivered', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('sms_clicked', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('sms_failed', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('sms_opted_out', sa.Integer(), nullable=True))
    
    # Add additional fields to marketing_campaigns
    op.add_column('marketing_campaigns', sa.Column('approved_by_id', sa.Integer(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('test_mode', sa.Boolean(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('test_emails', sa.JSON(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('test_phones', sa.JSON(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('is_deleted', sa.Boolean(), nullable=True))
    op.add_column('marketing_campaigns', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.create_foreign_key(None, 'marketing_campaigns', 'users', ['approved_by_id'], ['id'])
    
    # Add location_id to marketing_templates
    op.add_column('marketing_templates', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'marketing_templates', 'barbershop_locations', ['location_id'], ['id'])
    
    # Add additional fields to marketing_templates
    op.add_column('marketing_templates', sa.Column('preview_text', sa.String(length=255), nullable=True))
    op.add_column('marketing_templates', sa.Column('default_values', sa.JSON(), nullable=True))
    op.add_column('marketing_templates', sa.Column('thumbnail_url', sa.String(length=500), nullable=True))
    op.add_column('marketing_templates', sa.Column('attachments', sa.JSON(), nullable=True))
    op.add_column('marketing_templates', sa.Column('is_global', sa.Boolean(), nullable=True))
    op.add_column('marketing_templates', sa.Column('avg_open_rate', sa.Float(), nullable=True))
    op.add_column('marketing_templates', sa.Column('avg_click_rate', sa.Float(), nullable=True))
    op.add_column('marketing_templates', sa.Column('avg_response_rate', sa.Float(), nullable=True))
    
    # Add location_id and additional fields to contact_lists
    op.add_column('contact_lists', sa.Column('location_id', sa.Integer(), nullable=True))
    op.add_column('contact_lists', sa.Column('list_type', sa.String(length=50), nullable=True))
    op.add_column('contact_lists', sa.Column('criteria', sa.JSON(), nullable=True))
    op.add_column('contact_lists', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('contact_lists', sa.Column('is_dynamic', sa.Boolean(), nullable=True))
    op.add_column('contact_lists', sa.Column('last_updated', sa.DateTime(), nullable=True))
    op.create_foreign_key(None, 'contact_lists', 'barbershop_locations', ['location_id'], ['id'])
    
    # Association table for many-to-many relationship between campaigns and contact lists
    op.create_table('campaign_contact_lists',
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('contact_list_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['marketing_campaigns.id'], ),
        sa.ForeignKeyConstraint(['contact_list_id'], ['contact_lists.id'], ),
        sa.PrimaryKeyConstraint('campaign_id', 'contact_list_id')
    )
    
    # Add usage tracking columns to marketing_usage table if it exists
    op.add_column('marketing_usage', sa.Column('location_id', sa.Integer(), nullable=True))
    op.add_column('marketing_usage', sa.Column('billing_month', sa.String(length=7), nullable=True))
    op.add_column('marketing_usage', sa.Column('unit_cost', sa.Float(), nullable=True))
    op.add_column('marketing_usage', sa.Column('total_cost', sa.Float(), nullable=True))
    op.add_column('marketing_usage', sa.Column('is_free_tier', sa.Boolean(), nullable=True))
    op.add_column('marketing_usage', sa.Column('campaign_id', sa.Integer(), nullable=True))
    op.add_column('marketing_usage', sa.Column('notification_id', sa.Integer(), nullable=True))
    op.add_column('marketing_usage', sa.Column('tracking_metadata', sa.JSON(), nullable=True))
    op.create_foreign_key(None, 'marketing_usage', 'barbershop_locations', ['location_id'], ['id'])
    op.create_foreign_key(None, 'marketing_usage', 'marketing_campaigns', ['campaign_id'], ['id'])
    op.create_foreign_key(None, 'marketing_usage', 'notification_queue', ['notification_id'], ['id'])
    op.create_index('idx_usage_billing', 'marketing_usage', ['location_id', 'billing_month', 'usage_type'], unique=False)
    op.create_index('idx_usage_user', 'marketing_usage', ['user_id', 'billing_month', 'usage_type'], unique=False)


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('idx_usage_user', table_name='marketing_usage')
    op.drop_index('idx_usage_billing', table_name='marketing_usage')
    
    # Remove foreign keys and columns from marketing_usage
    op.drop_constraint(None, 'marketing_usage', type_='foreignkey')
    op.drop_column('marketing_usage', 'tracking_metadata')
    op.drop_column('marketing_usage', 'notification_id')
    op.drop_column('marketing_usage', 'campaign_id')
    op.drop_column('marketing_usage', 'is_free_tier')
    op.drop_column('marketing_usage', 'total_cost')
    op.drop_column('marketing_usage', 'unit_cost')
    op.drop_column('marketing_usage', 'billing_month')
    op.drop_column('marketing_usage', 'location_id')
    
    # Drop association table
    op.drop_table('campaign_contact_lists')
    
    # Remove columns from contact_lists
    op.drop_constraint(None, 'contact_lists', type_='foreignkey')
    op.drop_column('contact_lists', 'last_updated')
    op.drop_column('contact_lists', 'is_dynamic')
    op.drop_column('contact_lists', 'is_active')
    op.drop_column('contact_lists', 'criteria')
    op.drop_column('contact_lists', 'list_type')
    op.drop_column('contact_lists', 'location_id')
    
    # Remove columns from marketing_templates
    op.drop_constraint(None, 'marketing_templates', type_='foreignkey')
    op.drop_column('marketing_templates', 'avg_response_rate')
    op.drop_column('marketing_templates', 'avg_click_rate')
    op.drop_column('marketing_templates', 'avg_open_rate')
    op.drop_column('marketing_templates', 'is_global')
    op.drop_column('marketing_templates', 'attachments')
    op.drop_column('marketing_templates', 'thumbnail_url')
    op.drop_column('marketing_templates', 'default_values')
    op.drop_column('marketing_templates', 'preview_text')
    op.drop_column('marketing_templates', 'location_id')
    
    # Remove columns from marketing_campaigns
    op.drop_constraint(None, 'marketing_campaigns', type_='foreignkey')
    op.drop_column('marketing_campaigns', 'deleted_at')
    op.drop_column('marketing_campaigns', 'is_deleted')
    op.drop_column('marketing_campaigns', 'test_phones')
    op.drop_column('marketing_campaigns', 'test_emails')
    op.drop_column('marketing_campaigns', 'test_mode')
    op.drop_column('marketing_campaigns', 'approved_by_id')
    op.drop_column('marketing_campaigns', 'sms_opted_out')
    op.drop_column('marketing_campaigns', 'sms_failed')
    op.drop_column('marketing_campaigns', 'sms_clicked')
    op.drop_column('marketing_campaigns', 'sms_delivered')
    op.drop_column('marketing_campaigns', 'sms_sent')
    op.drop_column('marketing_campaigns', 'emails_unsubscribed')
    op.drop_column('marketing_campaigns', 'emails_bounced')
    op.drop_column('marketing_campaigns', 'emails_clicked')
    op.drop_column('marketing_campaigns', 'emails_opened')
    op.drop_column('marketing_campaigns', 'emails_delivered')
    op.drop_column('marketing_campaigns', 'emails_sent')
    op.drop_column('marketing_campaigns', 'actual_sms_cost')
    op.drop_column('marketing_campaigns', 'actual_email_cost')
    op.drop_column('marketing_campaigns', 'estimated_sms_cost')
    op.drop_column('marketing_campaigns', 'estimated_email_cost')
    op.drop_column('marketing_campaigns', 'actual_recipients')
    op.drop_column('marketing_campaigns', 'estimated_recipients')
    op.drop_column('marketing_campaigns', 'location_id')
    
    # Drop new tables
    op.drop_index('idx_analytics_campaign', table_name='marketing_analytics')
    op.drop_index('idx_analytics_location_period', table_name='marketing_analytics')
    op.drop_index(op.f('ix_marketing_analytics_period_date'), table_name='marketing_analytics')
    op.drop_index(op.f('ix_marketing_analytics_template_id'), table_name='marketing_analytics')
    op.drop_index(op.f('ix_marketing_analytics_campaign_id'), table_name='marketing_analytics')
    op.drop_index(op.f('ix_marketing_analytics_location_id'), table_name='marketing_analytics')
    op.drop_index(op.f('ix_marketing_analytics_id'), table_name='marketing_analytics')
    op.drop_table('marketing_analytics')
    
    op.drop_index(op.f('ix_marketing_credits_is_active'), table_name='marketing_credits')
    op.drop_index(op.f('ix_marketing_credits_id'), table_name='marketing_credits')
    op.drop_table('marketing_credits')
    
    op.drop_index('idx_campaign_recipient_client', table_name='campaign_recipients')
    op.drop_index('idx_campaign_recipient_tracking', table_name='campaign_recipients')
    op.drop_index(op.f('ix_campaign_recipients_phone'), table_name='campaign_recipients')
    op.drop_index(op.f('ix_campaign_recipients_email'), table_name='campaign_recipients')
    op.drop_index(op.f('ix_campaign_recipients_campaign_id'), table_name='campaign_recipients')
    op.drop_index(op.f('ix_campaign_recipients_id'), table_name='campaign_recipients')
    op.drop_table('campaign_recipients')