"""Add Google Calendar integration tables

Revision ID: google_calendar_integration
Revises: 
Create Date: 2025-07-03 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = 'google_calendar_integration'
down_revision = '6f65d833c956'  # Use the latest migration as base
branch_labels = None
depends_on = None


def upgrade():
    """Create Google Calendar integration tables."""
    
    # Create google_calendar_settings table
    op.create_table(
        'google_calendar_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_connected', sa.Boolean(), default=False),
        sa.Column('connection_date', sa.DateTime(), nullable=True),
        sa.Column('last_sync_date', sa.DateTime(), nullable=True),
        sa.Column('google_email', sa.String(255), nullable=True),
        sa.Column('calendar_id', sa.String(255), default='primary'),
        sa.Column('auto_sync_enabled', sa.Boolean(), default=True),
        sa.Column('sync_on_create', sa.Boolean(), default=True),
        sa.Column('sync_on_update', sa.Boolean(), default=True),
        sa.Column('sync_on_delete', sa.Boolean(), default=True),
        sa.Column('sync_all_appointments', sa.Boolean(), default=True),
        sa.Column('sync_only_confirmed', sa.Boolean(), default=False),
        sa.Column('sync_only_paid', sa.Boolean(), default=False),
        sa.Column('include_client_email', sa.Boolean(), default=True),
        sa.Column('include_client_phone', sa.Boolean(), default=True),
        sa.Column('include_service_price', sa.Boolean(), default=False),
        sa.Column('include_notes', sa.Boolean(), default=True),
        sa.Column('enable_reminders', sa.Boolean(), default=True),
        sa.Column('reminder_email_minutes', sa.Integer(), default=1440),
        sa.Column('reminder_popup_minutes', sa.Integer(), default=15),
        sa.Column('event_visibility', sa.String(20), default='private'),
        sa.Column('show_client_name', sa.Boolean(), default=True),
        sa.Column('show_service_details', sa.Boolean(), default=True),
        sa.Column('timezone', sa.String(50), default='America/New_York'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('error_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), default=datetime.utcnow),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.UniqueConstraint('user_id')
    )
    
    # Create indexes for google_calendar_settings
    op.create_index('ix_google_calendar_settings_user_id', 'google_calendar_settings', ['user_id'])
    op.create_index('ix_google_calendar_settings_is_connected', 'google_calendar_settings', ['is_connected'])
    
    # Create google_calendar_sync_logs table
    op.create_table(
        'google_calendar_sync_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=True),
        sa.Column('operation', sa.String(20), nullable=False),
        sa.Column('direction', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('google_event_id', sa.String(255), nullable=True),
        sa.Column('google_calendar_id', sa.String(255), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('sync_data', sa.Text(), nullable=True),
        sa.Column('response_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=datetime.utcnow),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], )
    )
    
    # Create indexes for google_calendar_sync_logs
    op.create_index('ix_google_calendar_sync_logs_user_id', 'google_calendar_sync_logs', ['user_id'])
    op.create_index('ix_google_calendar_sync_logs_appointment_id', 'google_calendar_sync_logs', ['appointment_id'])
    op.create_index('ix_google_calendar_sync_logs_operation', 'google_calendar_sync_logs', ['operation'])
    op.create_index('ix_google_calendar_sync_logs_status', 'google_calendar_sync_logs', ['status'])
    op.create_index('ix_google_calendar_sync_logs_google_event_id', 'google_calendar_sync_logs', ['google_event_id'])
    op.create_index('ix_google_calendar_sync_logs_created_at', 'google_calendar_sync_logs', ['created_at'])


def downgrade():
    """Drop Google Calendar integration tables."""
    
    # Drop indexes first
    op.drop_index('ix_google_calendar_sync_logs_created_at', 'google_calendar_sync_logs')
    op.drop_index('ix_google_calendar_sync_logs_google_event_id', 'google_calendar_sync_logs')
    op.drop_index('ix_google_calendar_sync_logs_status', 'google_calendar_sync_logs')
    op.drop_index('ix_google_calendar_sync_logs_operation', 'google_calendar_sync_logs')
    op.drop_index('ix_google_calendar_sync_logs_appointment_id', 'google_calendar_sync_logs')
    op.drop_index('ix_google_calendar_sync_logs_user_id', 'google_calendar_sync_logs')
    
    op.drop_index('ix_google_calendar_settings_is_connected', 'google_calendar_settings')
    op.drop_index('ix_google_calendar_settings_user_id', 'google_calendar_settings')
    
    # Drop tables
    op.drop_table('google_calendar_sync_logs')
    op.drop_table('google_calendar_settings')