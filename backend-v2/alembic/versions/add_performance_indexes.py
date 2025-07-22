"""Add critical performance indexes for real-time booking

Revision ID: add_performance_indexes
Revises: [previous_revision]
Create Date: 2025-01-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_performance_indexes'
down_revision = None  # Will be set by alembic
branch_labels = None
depends_on = None

def upgrade():
    """Add critical performance indexes for real-time booking system"""
    
    # 1. Appointments table - Critical for availability queries
    
    # Composite index for availability queries (barber_id + start_time + status)
    op.create_index(
        'idx_appointments_availability_lookup',
        'appointments',
        ['barber_id', 'start_time', 'status'],
        postgresql_where=sa.text("status IN ('confirmed', 'checked_in')")
    )
    
    # Date-based queries for daily availability
    op.create_index(
        'idx_appointments_date_status',
        'appointments',
        [sa.text('DATE(start_time)'), 'status'],
        postgresql_where=sa.text("status IN ('confirmed', 'checked_in')")
    )
    
    # Barber availability with time range
    op.create_index(
        'idx_appointments_barber_time_range',
        'appointments', 
        ['barber_id', 'start_time', 'duration_minutes']
    )
    
    # User appointment history for quick rebooking
    op.create_index(
        'idx_appointments_user_history',
        'appointments',
        ['user_id', 'start_time', 'status'],
        postgresql_where=sa.text("status IN ('completed', 'confirmed')")
    )
    
    # Recurring appointments optimization
    op.create_index(
        'idx_appointments_recurring',
        'appointments',
        ['recurring_series_id', 'recurrence_sequence']
    )
    
    # 2. Barber Profiles table - For barber lookup and filtering
    
    # Active barbers with location
    op.create_index(
        'idx_barber_profiles_active_location',
        'barber_profiles',
        ['is_active', 'location_id'],
        postgresql_where=sa.text("is_active = true")
    )
    
    # User lookup for barber profiles
    op.create_index(
        'idx_barber_profiles_user_active',
        'barber_profiles',
        ['user_id', 'is_active']
    )
    
    # 3. Users table - Authentication and role-based queries
    
    # Email lookup with active status
    op.create_index(
        'idx_users_email_active',
        'users',
        ['email', 'is_active'],
        postgresql_where=sa.text("is_active = true")
    )
    
    # Role-based queries with location
    op.create_index(
        'idx_users_role_location',
        'users',
        ['unified_role', 'location_id']
    )
    
    # Timezone-based queries for scheduling
    op.create_index(
        'idx_users_timezone_preference',
        'users',
        ['timezone_preference', 'is_active']
    )
    
    # 4. Services table - Service lookup and pricing
    
    # Active services by category (if Services table exists)
    try:
        op.create_index(
            'idx_services_active_category',
            'services',
            ['is_active', 'category'],
            postgresql_where=sa.text("is_active = true")
        )
        
        # Price range queries
        op.create_index(
            'idx_services_price_duration',
            'services',
            ['price', 'duration_minutes']
        )
    except:
        # Services table might not exist yet
        pass
    
    # 5. Payments table - Financial tracking and reporting
    
    # Payment status and date for reporting
    op.create_index(
        'idx_payments_status_date',
        'payments',
        ['status', 'created_at']
    )
    
    # Barber earnings lookup
    op.create_index(
        'idx_payments_barber_earnings',
        'payments',
        ['barber_id', 'status', 'created_at'],
        postgresql_where=sa.text("status = 'succeeded'")
    )
    
    # Appointment payment lookup
    op.create_index(
        'idx_payments_appointment',
        'payments',
        ['appointment_id', 'status']
    )
    
    # 6. Barber Availability table - Schedule management
    
    try:
        # Daily availability lookup
        op.create_index(
            'idx_barber_availability_daily',
            'barber_availability',
            ['barber_id', 'day_of_week', 'is_available']
        )
        
        # Time-based availability
        op.create_index(
            'idx_barber_availability_time',
            'barber_availability',
            ['barber_id', 'start_time', 'end_time']
        )
    except:
        # BarberAvailability table might not exist
        pass
    
    # 7. Performance optimization indexes for analytics
    
    # Created date indexes for reporting
    op.create_index(
        'idx_appointments_created_month',
        'appointments',
        [sa.text('DATE_TRUNC(\'month\', created_at)'), 'status']
    )
    
    # User activity tracking
    op.create_index(
        'idx_users_created_active',
        'users',
        ['created_at', 'is_active']
    )

def downgrade():
    """Remove performance indexes"""
    
    # Drop all created indexes
    indexes_to_drop = [
        'idx_appointments_availability_lookup',
        'idx_appointments_date_status', 
        'idx_appointments_barber_time_range',
        'idx_appointments_user_history',
        'idx_appointments_recurring',
        'idx_barber_profiles_active_location',
        'idx_barber_profiles_user_active',
        'idx_users_email_active',
        'idx_users_role_location',
        'idx_users_timezone_preference',
        'idx_payments_status_date',
        'idx_payments_barber_earnings',
        'idx_payments_appointment',
        'idx_appointments_created_month',
        'idx_users_created_active'
    ]
    
    # Optional indexes (may not exist)
    optional_indexes = [
        'idx_services_active_category',
        'idx_services_price_duration',
        'idx_barber_availability_daily',
        'idx_barber_availability_time'
    ]
    
    # Drop required indexes
    for index_name in indexes_to_drop:
        try:
            op.drop_index(index_name)
        except:
            # Index might not exist in all environments
            pass
    
    # Drop optional indexes
    for index_name in optional_indexes:
        try:
            op.drop_index(index_name)
        except:
            # Expected to fail if table doesn't exist
            pass