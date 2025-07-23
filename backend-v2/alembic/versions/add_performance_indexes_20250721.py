"""Add performance indexes for concurrent load optimization

Revision ID: perf_idx_20250721
Revises: add_payment_performance_indexes_sqlite
Create Date: 2025-07-21 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'perf_idx_20250721'
down_revision = 'add_payment_performance_indexes_sqlite'
branch_labels = None
depends_on = None


def upgrade():
    """Add critical performance indexes for load testing optimization."""
    
    # Add index on User.email for faster authentication lookups
    try:
        op.create_index('idx_users_email_unique', 'users', ['email'], unique=True)
    except Exception:
        # Index might already exist, skip
        pass
    
    # Add composite index on Appointment.user_id and start_time for faster user appointment queries
    try:
        op.create_index('idx_appointments_user_start_time', 'appointments', ['user_id', 'start_time'])
    except Exception:
        pass
    
    # Add index on Appointment.barber_id for barber-specific queries
    try:
        op.create_index('idx_appointments_barber_id', 'appointments', ['barber_id'])
    except Exception:
        pass
    
    # Add index on Appointment.status for status filtering
    try:
        op.create_index('idx_appointments_status', 'appointments', ['status'])
    except Exception:
        pass
    
    # Add composite index on Appointment.start_time and status for calendar queries
    try:
        op.create_index('idx_appointments_start_time_status', 'appointments', ['start_time', 'status'])
    except Exception:
        pass
    
    # Add index on Payment.user_id for user payment history
    try:
        op.create_index('idx_payments_user_id', 'payments', ['user_id'])
    except Exception:
        pass
        
    # Add index on BookingSettings.business_id for settings lookup
    try:
        op.create_index('idx_booking_settings_business_id', 'booking_settings', ['business_id'])
    except Exception:
        pass


def downgrade():
    """Remove performance indexes."""
    
    try:
        op.drop_index('idx_users_email_unique', table_name='users')
    except Exception:
        pass
    
    try:
        op.drop_index('idx_appointments_user_start_time', table_name='appointments')
    except Exception:
        pass
    
    try:
        op.drop_index('idx_appointments_barber_id', table_name='appointments')
    except Exception:
        pass
    
    try:
        op.drop_index('idx_appointments_status', table_name='appointments')
    except Exception:
        pass
    
    try:
        op.drop_index('idx_appointments_start_time_status', table_name='appointments')
    except Exception:
        pass
    
    try:
        op.drop_index('idx_payments_user_id', table_name='payments')
    except Exception:
        pass
        
    try:
        op.drop_index('idx_booking_settings_business_id', table_name='booking_settings')
    except Exception:
        pass