"""add_enhanced_notification_preferences

Revision ID: aeb40f6d8bbb
Revises: 612fc4abd565
Create Date: 2025-07-01 07:46:51.471711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aeb40f6d8bbb'
down_revision: Union[str, Sequence[str], None] = '612fc4abd565'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create notification_preferences_v2 table
    op.create_table(
        'notification_preferences_v2',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('sms_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('timezone', sa.String(length=50), nullable=True, default='UTC'),
        sa.Column('email_appointment_confirmation', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_appointment_reminder', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_appointment_changes', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_appointment_cancellation', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_payment_confirmation', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_payment_failed', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_marketing', sa.Boolean(), nullable=True, default=False),
        sa.Column('email_news_updates', sa.Boolean(), nullable=True, default=False),
        sa.Column('email_promotional', sa.Boolean(), nullable=True, default=False),
        sa.Column('email_system_alerts', sa.Boolean(), nullable=True, default=True),
        sa.Column('sms_appointment_confirmation', sa.Boolean(), nullable=True, default=True),
        sa.Column('sms_appointment_reminder', sa.Boolean(), nullable=True, default=True),
        sa.Column('sms_appointment_changes', sa.Boolean(), nullable=True, default=True),
        sa.Column('sms_appointment_cancellation', sa.Boolean(), nullable=True, default=True),
        sa.Column('sms_payment_confirmation', sa.Boolean(), nullable=True, default=False),
        sa.Column('sms_payment_failed', sa.Boolean(), nullable=True, default=True),
        sa.Column('sms_marketing', sa.Boolean(), nullable=True, default=False),
        sa.Column('sms_promotional', sa.Boolean(), nullable=True, default=False),
        sa.Column('sms_system_alerts', sa.Boolean(), nullable=True, default=False),
        sa.Column('email_frequency', sa.String(length=20), nullable=True, default='immediate'),
        sa.Column('sms_frequency', sa.String(length=20), nullable=True, default='immediate'),
        sa.Column('reminder_hours', sa.JSON(), nullable=True),
        sa.Column('quiet_hours_enabled', sa.Boolean(), nullable=True, default=False),
        sa.Column('quiet_hours_start', sa.String(length=5), nullable=True, default='22:00'),
        sa.Column('quiet_hours_end', sa.String(length=5), nullable=True, default='08:00'),
        sa.Column('weekend_notifications', sa.Boolean(), nullable=True, default=True),
        sa.Column('consent_given_at', sa.DateTime(), nullable=True),
        sa.Column('consent_ip_address', sa.String(length=45), nullable=True),
        sa.Column('last_updated_at', sa.DateTime(), nullable=True),
        sa.Column('data_processing_consent', sa.Boolean(), nullable=True, default=True),
        sa.Column('marketing_consent', sa.Boolean(), nullable=True, default=False),
        sa.Column('unsubscribe_token', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('unsubscribe_token')
    )
    op.create_index(op.f('ix_notification_preferences_v2_id'), 'notification_preferences_v2', ['id'], unique=False)
    op.create_index(op.f('ix_notification_preferences_v2_unsubscribe_token'), 'notification_preferences_v2', ['unsubscribe_token'], unique=True)
    
    # Create notification_preference_audit table
    op.create_table(
        'notification_preference_audit',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('preferences_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('field_changed', sa.String(length=100), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('change_reason', sa.String(length=200), nullable=True),
        sa.Column('changed_at', sa.DateTime(), nullable=True),
        sa.Column('changed_by_ip', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['preferences_id'], ['notification_preferences_v2.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_preference_audit_id'), 'notification_preference_audit', ['id'], unique=False)
    
    # Create unsubscribe_requests table
    op.create_table(
        'unsubscribe_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('email_address', sa.String(length=255), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('unsubscribe_type', sa.String(length=50), nullable=False),
        sa.Column('token_used', sa.String(length=64), nullable=True),
        sa.Column('method', sa.String(length=20), nullable=False),
        sa.Column('campaign_id', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, default='active'),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('reverted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_unsubscribe_requests_id'), 'unsubscribe_requests', ['id'], unique=False)
    op.create_index(op.f('ix_unsubscribe_requests_email_address'), 'unsubscribe_requests', ['email_address'], unique=False)
    op.create_index(op.f('ix_unsubscribe_requests_phone_number'), 'unsubscribe_requests', ['phone_number'], unique=False)
    
    # Create notification_channels table
    op.create_table(
        'notification_channels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('requires_consent', sa.Boolean(), nullable=True, default=False),
        sa.Column('supports_marketing', sa.Boolean(), nullable=True, default=True),
        sa.Column('supports_transactional', sa.Boolean(), nullable=True, default=True),
        sa.Column('rate_limit_per_hour', sa.Integer(), nullable=True),
        sa.Column('rate_limit_per_day', sa.Integer(), nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_notification_channels_id'), 'notification_channels', ['id'], unique=False)
    
    # Create notification_templates_v2 table
    op.create_table(
        'notification_templates_v2',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_type', sa.String(length=20), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('subject', sa.String(length=200), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('variables', sa.JSON(), nullable=True),
        sa.Column('required_variables', sa.JSON(), nullable=True),
        sa.Column('sample_data', sa.JSON(), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True, default='en'),
        sa.Column('fallback_template_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_system_template', sa.Boolean(), nullable=True, default=False),
        sa.Column('requires_approval', sa.Boolean(), nullable=True, default=False),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['fallback_template_id'], ['notification_templates_v2.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_notification_templates_v2_id'), 'notification_templates_v2', ['id'], unique=False)
    op.create_index(op.f('ix_notification_templates_v2_name'), 'notification_templates_v2', ['name'], unique=True)
    op.create_index('idx_template_type_category', 'notification_templates_v2', ['template_type', 'category'], unique=False)
    op.create_index('idx_template_active_name', 'notification_templates_v2', ['is_active', 'name'], unique=False)
    
    # Insert default notification channels
    op.execute("""
        INSERT INTO notification_channels (name, display_name, description, is_active, requires_consent, supports_marketing, supports_transactional)
        VALUES 
        ('email', 'Email', 'Email notifications', true, false, true, true),
        ('sms', 'SMS', 'Text message notifications', true, true, true, true),
        ('push', 'Push Notifications', 'Push notifications (future)', false, true, true, true),
        ('webhook', 'Webhooks', 'API webhooks for integrations', true, false, false, true)
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_template_active_name', table_name='notification_templates_v2')
    op.drop_index('idx_template_type_category', table_name='notification_templates_v2')
    op.drop_index(op.f('ix_notification_templates_v2_name'), table_name='notification_templates_v2')
    op.drop_index(op.f('ix_notification_templates_v2_id'), table_name='notification_templates_v2')
    op.drop_table('notification_templates_v2')
    op.drop_index(op.f('ix_notification_channels_id'), table_name='notification_channels')
    op.drop_table('notification_channels')
    op.drop_index(op.f('ix_unsubscribe_requests_phone_number'), table_name='unsubscribe_requests')
    op.drop_index(op.f('ix_unsubscribe_requests_email_address'), table_name='unsubscribe_requests')
    op.drop_index(op.f('ix_unsubscribe_requests_id'), table_name='unsubscribe_requests')
    op.drop_table('unsubscribe_requests')
    op.drop_index(op.f('ix_notification_preference_audit_id'), table_name='notification_preference_audit')
    op.drop_table('notification_preference_audit')
    op.drop_index(op.f('ix_notification_preferences_v2_unsubscribe_token'), table_name='notification_preferences_v2')
    op.drop_index(op.f('ix_notification_preferences_v2_id'), table_name='notification_preferences_v2')
    op.drop_table('notification_preferences_v2')
