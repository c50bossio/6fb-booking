"""add_google_calendar_webhook_models

Revision ID: e3be4567db56
Revises: aa1702ed4855
Create Date: 2025-07-28 01:20:38.076770

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3be4567db56'
down_revision: Union[str, Sequence[str], None] = 'aa1702ed4855'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create google_calendar_webhook_subscriptions table
    op.create_table(
        'google_calendar_webhook_subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('google_subscription_id', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('google_calendar_id', sa.String(255), nullable=False, index=True),
        sa.Column('google_resource_id', sa.String(255), nullable=False),
        sa.Column('webhook_url', sa.String(500), nullable=False),
        sa.Column('webhook_token', sa.String(255), nullable=True),
        sa.Column('expiration_time', sa.DateTime(), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_renewed_at', sa.DateTime()),
        sa.Column('is_active', sa.Boolean(), default=True, index=True),
        sa.Column('last_notification_received', sa.DateTime(), nullable=True),
        sa.Column('notification_count', sa.Integer(), default=0),
        sa.Column('error_count', sa.Integer(), default=0),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('last_error_at', sa.DateTime(), nullable=True),
        sa.Column('sync_token', sa.String(255), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True)
    )
    
    # Create google_calendar_webhook_notifications table
    op.create_table(
        'google_calendar_webhook_notifications',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('google_calendar_webhook_subscriptions.id'), nullable=False, index=True),
        sa.Column('google_channel_id', sa.String(255), nullable=False, index=True),
        sa.Column('google_resource_id', sa.String(255), nullable=False, index=True),
        sa.Column('google_resource_uri', sa.String(500), nullable=True),
        sa.Column('google_resource_state', sa.String(50), nullable=True),
        sa.Column('message_number', sa.BigInteger(), nullable=True, index=True),
        sa.Column('expiration_time', sa.DateTime(), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(20), default='pending', nullable=False, index=True),
        sa.Column('sync_triggered', sa.Boolean(), default=False),
        sa.Column('events_processed', sa.Integer(), default=0),
        sa.Column('events_created', sa.Integer(), default=0),
        sa.Column('events_updated', sa.Integer(), default=0),
        sa.Column('events_deleted', sa.Integer(), default=0),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('raw_headers', sa.Text(), nullable=True),
        sa.Column('raw_body', sa.Text(), nullable=True)
    )
    
    # Create google_calendar_sync_events table
    op.create_table(
        'google_calendar_sync_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('notification_id', sa.Integer(), sa.ForeignKey('google_calendar_webhook_notifications.id'), nullable=True, index=True),
        sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True, index=True),
        sa.Column('google_event_id', sa.String(255), nullable=False, index=True),
        sa.Column('google_calendar_id', sa.String(255), nullable=False),
        sa.Column('operation_type', sa.String(20), nullable=False, index=True),
        sa.Column('sync_direction', sa.String(20), nullable=False, index=True),
        sa.Column('event_summary', sa.String(500), nullable=True),
        sa.Column('event_start_time', sa.DateTime(), nullable=True),
        sa.Column('event_end_time', sa.DateTime(), nullable=True),
        sa.Column('event_status', sa.String(50), nullable=True),
        sa.Column('sync_status', sa.String(20), nullable=False, index=True),
        sa.Column('conflict_resolution', sa.String(50), nullable=True),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('changes_detected', sa.Text(), nullable=True),
        sa.Column('applied_changes', sa.Text(), nullable=True)
    )
    
    # Create google_calendar_conflict_resolutions table
    op.create_table(
        'google_calendar_conflict_resolutions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('sync_event_id', sa.Integer(), sa.ForeignKey('google_calendar_sync_events.id'), nullable=False, index=True),
        sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True, index=True),
        sa.Column('conflict_type', sa.String(50), nullable=False, index=True),
        sa.Column('google_event_id', sa.String(255), nullable=False),
        sa.Column('google_data', sa.Text(), nullable=True),
        sa.Column('local_data', sa.Text(), nullable=True),
        sa.Column('resolution_strategy', sa.String(50), nullable=False),
        sa.Column('resolution_reason', sa.Text(), nullable=True),
        sa.Column('resolved_by', sa.String(50), nullable=True),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(20), default='pending', nullable=False, index=True),
        sa.Column('requires_manual_review', sa.Boolean(), default=False, index=True),
        sa.Column('final_data', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True)
    )
    
    # Add google_event_id column to appointments table if it doesn't exist
    try:
        op.add_column('appointments', sa.Column('google_event_id', sa.String(255), nullable=True, index=True))
    except sa.exc.OperationalError:
        # Column might already exist
        pass


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the new tables
    op.drop_table('google_calendar_conflict_resolutions')
    op.drop_table('google_calendar_sync_events')
    op.drop_table('google_calendar_webhook_notifications')
    op.drop_table('google_calendar_webhook_subscriptions')
    
    # Remove google_event_id column from appointments table
    try:
        op.drop_column('appointments', 'google_event_id')
    except sa.exc.OperationalError:
        # Column might not exist
        pass
