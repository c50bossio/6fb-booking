"""Add reminder system tables

Revision ID: add_reminder_system_001
Revises: previous_migration
Create Date: 2025-01-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_reminder_system_001'
down_revision = None  # Replace with actual previous revision
branch_labels = None
depends_on = None


def upgrade():
    """Add reminder system tables"""
    
    # reminder_preferences table
    op.create_table('reminder_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('sms_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('email_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('push_enabled', sa.Boolean(), nullable=True, default=False),
        sa.Column('advance_hours', sa.Integer(), nullable=True, default=24),
        sa.Column('preferred_time_start', sa.Time(), nullable=True),  # 9:00 AM default
        sa.Column('preferred_time_end', sa.Time(), nullable=True),    # 8:00 PM default
        sa.Column('timezone', sa.String(50), nullable=True, default='UTC'),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.Index('idx_reminder_preferences_client_id', 'client_id')
    )
    
    # reminder_schedules table
    op.create_table('reminder_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('reminder_type', sa.String(20), nullable=False),  # '24_hour', '2_hour', 'followup'
        sa.Column('scheduled_for', sa.TIMESTAMP(), nullable=False),
        sa.Column('status', sa.String(20), nullable=True, default='pending'),  # 'pending', 'processing', 'sent', 'failed'
        sa.Column('delivery_attempts', sa.Integer(), nullable=True, default=0),
        sa.Column('max_attempts', sa.Integer(), nullable=True, default=3),
        sa.Column('next_retry', sa.TIMESTAMP(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True, default=1),  # 1=high, 2=medium, 3=low
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='CASCADE'),
        sa.Index('idx_reminder_schedules_appointment_id', 'appointment_id'),
        sa.Index('idx_reminder_schedules_scheduled_for', 'scheduled_for'),
        sa.Index('idx_reminder_schedules_status', 'status'),
        sa.Index('idx_reminder_schedules_processing', 'status', 'scheduled_for')  # Composite for processing query
    )
    
    # reminder_deliveries table
    op.create_table('reminder_deliveries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('schedule_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(10), nullable=False),  # 'sms', 'email', 'push'
        sa.Column('provider', sa.String(20), nullable=True),  # 'twilio', 'sendgrid', 'fcm'
        sa.Column('provider_message_id', sa.String(100), nullable=True),
        sa.Column('provider_response', sa.Text(), nullable=True),
        sa.Column('delivered_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('client_response', sa.String(20), nullable=True),  # 'confirmed', 'rescheduled', 'cancelled'
        sa.Column('response_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('delivery_status', sa.String(20), nullable=True, default='pending'),  # 'pending', 'sent', 'delivered', 'failed'
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['schedule_id'], ['reminder_schedules.id'], ondelete='CASCADE'),
        sa.Index('idx_reminder_deliveries_schedule_id', 'schedule_id'),
        sa.Index('idx_reminder_deliveries_channel', 'channel'),
        sa.Index('idx_reminder_deliveries_provider_message_id', 'provider_message_id'),
        sa.Index('idx_reminder_deliveries_delivered_at', 'delivered_at'),
        sa.Index('idx_reminder_deliveries_response', 'client_response', 'response_at')
    )
    
    # reminder_templates table (for customizable messaging)
    op.create_table('reminder_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_name', sa.String(50), nullable=False),
        sa.Column('reminder_type', sa.String(20), nullable=False),  # '24_hour', '2_hour', 'followup'
        sa.Column('channel', sa.String(10), nullable=False),  # 'sms', 'email', 'push'
        sa.Column('subject_template', sa.Text(), nullable=True),  # For email
        sa.Column('body_template', sa.Text(), nullable=False),
        sa.Column('variables', sa.Text(), nullable=True),  # Available template variables (JSON string)
        sa.Column('shop_id', sa.Integer(), nullable=True),  # Null = default, specific shop = custom
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], ondelete='CASCADE'),
        sa.Index('idx_reminder_templates_type_channel', 'reminder_type', 'channel'),
        sa.Index('idx_reminder_templates_shop_id', 'shop_id'),
        sa.UniqueConstraint('template_name', 'shop_id', name='uq_reminder_templates_name_shop')
    )
    
    # reminder_analytics table (for business intelligence)
    op.create_table('reminder_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('shop_id', sa.Integer(), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('reminder_type', sa.String(20), nullable=False),
        sa.Column('channel', sa.String(10), nullable=False),
        sa.Column('total_sent', sa.Integer(), nullable=True, default=0),
        sa.Column('total_delivered', sa.Integer(), nullable=True, default=0),
        sa.Column('total_confirmed', sa.Integer(), nullable=True, default=0),
        sa.Column('total_rescheduled', sa.Integer(), nullable=True, default=0),
        sa.Column('total_cancelled', sa.Integer(), nullable=True, default=0),
        sa.Column('no_show_prevented', sa.Integer(), nullable=True, default=0),
        sa.Column('revenue_protected', sa.Numeric(10, 2), nullable=True, default=0),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['barber_id'], ['barbers.id'], ondelete='CASCADE'),
        sa.Index('idx_reminder_analytics_date', 'date'),
        sa.Index('idx_reminder_analytics_shop_date', 'shop_id', 'date'),
        sa.Index('idx_reminder_analytics_barber_date', 'barber_id', 'date'),
        sa.UniqueConstraint('date', 'shop_id', 'barber_id', 'reminder_type', 'channel', 
                          name='uq_reminder_analytics_daily')
    )
    
    # Add reminder-related columns to existing appointments table
    op.add_column('appointments', sa.Column('reminder_confirmed', sa.Boolean(), nullable=True, default=False))
    op.add_column('appointments', sa.Column('confirmation_time', sa.TIMESTAMP(), nullable=True))
    op.add_column('appointments', sa.Column('reminder_opt_out', sa.Boolean(), nullable=True, default=False))
    op.add_column('appointments', sa.Column('last_reminder_sent', sa.TIMESTAMP(), nullable=True))
    
    # Add device token to clients table for push notifications
    op.add_column('clients', sa.Column('device_token', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('push_notifications_enabled', sa.Boolean(), nullable=True, default=False))
    
    # Create indexes for performance
    op.create_index('idx_appointments_reminder_confirmed', 'appointments', ['reminder_confirmed'])
    op.create_index('idx_appointments_confirmation_time', 'appointments', ['confirmation_time'])
    op.create_index('idx_clients_device_token', 'clients', ['device_token'])


def downgrade():
    """Remove reminder system tables"""
    
    # Remove indexes
    op.drop_index('idx_clients_device_token', table_name='clients')
    op.drop_index('idx_appointments_confirmation_time', table_name='appointments')
    op.drop_index('idx_appointments_reminder_confirmed', table_name='appointments')
    
    # Remove columns from existing tables
    op.drop_column('clients', 'push_notifications_enabled')
    op.drop_column('clients', 'device_token')
    op.drop_column('appointments', 'last_reminder_sent')
    op.drop_column('appointments', 'reminder_opt_out')
    op.drop_column('appointments', 'confirmation_time')
    op.drop_column('appointments', 'reminder_confirmed')
    
    # Drop tables in reverse order
    op.drop_table('reminder_analytics')
    op.drop_table('reminder_templates')
    op.drop_table('reminder_deliveries')
    op.drop_table('reminder_schedules')
    op.drop_table('reminder_preferences')