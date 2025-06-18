"""add communication tables

Revision ID: add_communication_tables
Revises: add_payment_tables
Create Date: 2024-01-18 10:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_communication_tables'
down_revision = 'add_payment_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create email_logs table
    op.create_table('email_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('recipient', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('template', sa.String(length=100), nullable=False),
        sa.Column('status', sa.Enum('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam', name='emailstatus'), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.Column('clicked_at', sa.DateTime(), nullable=True),
        sa.Column('bounced_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('message_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_logs_message_id'), 'email_logs', ['message_id'], unique=False)
    op.create_index(op.f('ix_email_logs_recipient'), 'email_logs', ['recipient'], unique=False)
    op.create_index(op.f('ix_email_logs_status'), 'email_logs', ['status'], unique=False)
    op.create_index(op.f('ix_email_logs_user_id'), 'email_logs', ['user_id'], unique=False)

    # Create sms_logs table
    op.create_table('sms_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('recipient', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('sent', 'delivered', 'failed', 'undelivered', name='smsstatus'), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('twilio_sid', sa.String(length=100), nullable=True),
        sa.Column('cost', sa.Float(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sms_logs_recipient'), 'sms_logs', ['recipient'], unique=False)
    op.create_index(op.f('ix_sms_logs_status'), 'sms_logs', ['status'], unique=False)
    op.create_index(op.f('ix_sms_logs_twilio_sid'), 'sms_logs', ['twilio_sid'], unique=False)
    op.create_index(op.f('ix_sms_logs_user_id'), 'sms_logs', ['user_id'], unique=False)

    # Create notification_preferences table
    op.create_table('notification_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email_appointment_confirmation', sa.Boolean(), nullable=True),
        sa.Column('email_appointment_reminder', sa.Boolean(), nullable=True),
        sa.Column('email_appointment_cancellation', sa.Boolean(), nullable=True),
        sa.Column('email_payment_receipt', sa.Boolean(), nullable=True),
        sa.Column('email_marketing', sa.Boolean(), nullable=True),
        sa.Column('email_performance_reports', sa.Boolean(), nullable=True),
        sa.Column('email_team_updates', sa.Boolean(), nullable=True),
        sa.Column('sms_appointment_confirmation', sa.Boolean(), nullable=True),
        sa.Column('sms_appointment_reminder', sa.Boolean(), nullable=True),
        sa.Column('sms_appointment_cancellation', sa.Boolean(), nullable=True),
        sa.Column('sms_payment_confirmation', sa.Boolean(), nullable=True),
        sa.Column('sms_marketing', sa.Boolean(), nullable=True),
        sa.Column('push_enabled', sa.Boolean(), nullable=True),
        sa.Column('push_appointment_updates', sa.Boolean(), nullable=True),
        sa.Column('push_performance_alerts', sa.Boolean(), nullable=True),
        sa.Column('push_team_updates', sa.Boolean(), nullable=True),
        sa.Column('reminder_hours_before', sa.Integer(), nullable=True),
        sa.Column('second_reminder_hours', sa.Integer(), nullable=True),
        sa.Column('quiet_hours_enabled', sa.Boolean(), nullable=True),
        sa.Column('quiet_hours_start', sa.Integer(), nullable=True),
        sa.Column('quiet_hours_end', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_preferences_user_id'), 'notification_preferences', ['user_id'], unique=True)

    # Create communication_templates table
    op.create_table('communication_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('type', sa.Enum('appointment_confirmation', 'appointment_reminder', 'appointment_cancellation', 'payment_receipt', 'welcome', 'password_reset', 'marketing', 'notification', 'custom', name='communicationtype'), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_communication_templates_name'), 'communication_templates', ['name'], unique=True)
    op.create_index(op.f('ix_communication_templates_type'), 'communication_templates', ['type'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_index(op.f('ix_communication_templates_type'), table_name='communication_templates')
    op.drop_index(op.f('ix_communication_templates_name'), table_name='communication_templates')
    op.drop_table('communication_templates')
    
    op.drop_index(op.f('ix_notification_preferences_user_id'), table_name='notification_preferences')
    op.drop_table('notification_preferences')
    
    op.drop_index(op.f('ix_sms_logs_user_id'), table_name='sms_logs')
    op.drop_index(op.f('ix_sms_logs_twilio_sid'), table_name='sms_logs')
    op.drop_index(op.f('ix_sms_logs_status'), table_name='sms_logs')
    op.drop_index(op.f('ix_sms_logs_recipient'), table_name='sms_logs')
    op.drop_table('sms_logs')
    
    op.drop_index(op.f('ix_email_logs_user_id'), table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_status'), table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_recipient'), table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_message_id'), table_name='email_logs')
    op.drop_table('email_logs')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS communicationtype')
    op.execute('DROP TYPE IF EXISTS smsstatus')
    op.execute('DROP TYPE IF EXISTS emailstatus')