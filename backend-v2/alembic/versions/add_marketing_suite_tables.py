"""Add marketing suite tables

Revision ID: marketing_suite_001
Revises: 1e2bca78ae85
Create Date: 2025-07-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'marketing_suite_001'
down_revision = '1e2bca78ae85'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create marketing_templates table
    op.create_table('marketing_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('template_type', sa.String(length=20), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('subject', sa.String(length=200), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=True),
        sa.Column('preview_data', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketing_templates_id'), 'marketing_templates', ['id'], unique=False)

    # Create contact_lists table
    op.create_table('contact_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('contact_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contact_lists_id'), 'contact_lists', ['id'], unique=False)

    # Create contact_segments table
    op.create_table('contact_segments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('criteria', sa.JSON(), nullable=False),
        sa.Column('contact_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contact_segments_id'), 'contact_segments', ['id'], unique=False)

    # Create marketing_campaigns table
    op.create_table('marketing_campaigns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('campaign_type', sa.String(length=20), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('subject', sa.String(length=200), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('recipient_list_id', sa.Integer(), nullable=True),
        sa.Column('recipient_segment_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, default='draft'),
        sa.Column('scheduled_for', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['recipient_list_id'], ['contact_lists.id'], ),
        sa.ForeignKeyConstraint(['recipient_segment_id'], ['contact_segments.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['marketing_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketing_campaigns_id'), 'marketing_campaigns', ['id'], unique=False)

    # Create contact_list_members table
    op.create_table('contact_list_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('list_id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['contact_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['list_id'], ['contact_lists.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contact_list_members_id'), 'contact_list_members', ['id'], unique=False)
    op.create_index('idx_list_contact_unique', 'contact_list_members', ['list_id', 'contact_id'], unique=True)

    # Create campaign_analytics table
    op.create_table('campaign_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('total_recipients', sa.Integer(), nullable=True, default=0),
        sa.Column('sent_count', sa.Integer(), nullable=True, default=0),
        sa.Column('delivered_count', sa.Integer(), nullable=True, default=0),
        sa.Column('opened_count', sa.Integer(), nullable=True, default=0),
        sa.Column('clicked_count', sa.Integer(), nullable=True, default=0),
        sa.Column('bounced_count', sa.Integer(), nullable=True, default=0),
        sa.Column('unsubscribed_count', sa.Integer(), nullable=True, default=0),
        sa.Column('spam_reports', sa.Integer(), nullable=True, default=0),
        sa.Column('first_open_time', sa.DateTime(), nullable=True),
        sa.Column('last_open_time', sa.DateTime(), nullable=True),
        sa.Column('device_stats', sa.JSON(), nullable=True),
        sa.Column('client_stats', sa.JSON(), nullable=True),
        sa.Column('location_stats', sa.JSON(), nullable=True),
        sa.Column('link_clicks', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['marketing_campaigns.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('campaign_id')
    )
    op.create_index(op.f('ix_campaign_analytics_id'), 'campaign_analytics', ['id'], unique=False)

    # Create marketing_usage table
    op.create_table('marketing_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('emails_sent', sa.Integer(), nullable=True, default=0),
        sa.Column('email_limit', sa.Integer(), nullable=True),
        sa.Column('sms_sent', sa.Integer(), nullable=True, default=0),
        sa.Column('sms_limit', sa.Integer(), nullable=True),
        sa.Column('campaigns_created', sa.Integer(), nullable=True, default=0),
        sa.Column('campaigns_sent', sa.Integer(), nullable=True, default=0),
        sa.Column('total_contacts', sa.Integer(), nullable=True, default=0),
        sa.Column('new_contacts', sa.Integer(), nullable=True, default=0),
        sa.Column('unsubscribed_contacts', sa.Integer(), nullable=True, default=0),
        sa.Column('estimated_cost', sa.Float(), nullable=True, default=0.0),
        sa.Column('cost_breakdown', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketing_usage_id'), 'marketing_usage', ['id'], unique=False)
    op.create_index('idx_usage_period_unique', 'marketing_usage', ['period_start', 'period_end'], unique=True)

    # Add email_opt_in and sms_opt_in columns to clients table if they don't exist
    try:
        op.add_column('clients', sa.Column('email_opt_in', sa.Boolean(), nullable=True, default=True))
        op.add_column('clients', sa.Column('sms_opt_in', sa.Boolean(), nullable=True, default=False))
    except:
        pass  # Columns might already exist


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('marketing_usage')
    op.drop_table('campaign_analytics')
    op.drop_table('contact_list_members')
    op.drop_table('marketing_campaigns')
    op.drop_table('contact_segments')
    op.drop_table('contact_lists')
    op.drop_table('marketing_templates')
    
    # Remove columns from clients table
    try:
        op.drop_column('clients', 'sms_opt_in')
        op.drop_column('clients', 'email_opt_in')
    except:
        pass  # Columns might not exist