"""Add performance indexes for database optimization

Revision ID: add_performance_indexes
Revises: 
Create Date: 2025-06-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = None  # Replace with actual revision
branch_labels = None
depends_on = None


def upgrade():
    """Add performance indexes to optimize database queries."""
    
    # Appointments table indexes
    op.create_index('idx_appointments_barber_date', 'appointments', ['barber_id', 'appointment_date'])
    op.create_index('idx_appointments_client_date', 'appointments', ['client_id', 'appointment_date'])
    op.create_index('idx_appointments_status_date', 'appointments', ['status', 'appointment_date'])
    op.create_index('idx_appointments_date_time', 'appointments', ['appointment_date', 'appointment_time'])
    op.create_index('idx_appointments_barber_status', 'appointments', ['barber_id', 'status'])
    op.create_index('idx_appointments_created_at', 'appointments', ['created_at'])
    
    # Clients table indexes
    op.create_index('idx_clients_barber_id', 'clients', ['barber_id'])
    op.create_index('idx_clients_customer_type', 'clients', ['customer_type'])
    op.create_index('idx_clients_last_visit', 'clients', ['last_visit_date'])
    op.create_index('idx_clients_total_spent', 'clients', ['total_spent'])
    op.create_index('idx_clients_created_at', 'clients', ['created_at'])
    op.create_index('idx_clients_full_name', 'clients', ['first_name', 'last_name'])
    
    # Barbers table indexes
    op.create_index('idx_barbers_user_id', 'barbers', ['user_id'])
    op.create_index('idx_barbers_location_id', 'barbers', ['location_id'])
    op.create_index('idx_barbers_is_active', 'barbers', ['is_active'])
    op.create_index('idx_barbers_email', 'barbers', ['email'])
    
    # Users table indexes (if not already existing)
    try:
        op.create_index('idx_users_email', 'users', ['email'])
        op.create_index('idx_users_role', 'users', ['role'])
        op.create_index('idx_users_is_active', 'users', ['is_active'])
    except Exception:
        # Index might already exist
        pass
    
    # Payments table indexes
    try:
        op.create_index('idx_payments_appointment_id', 'payments', ['appointment_id'])
        op.create_index('idx_payments_status', 'payments', ['status'])
        op.create_index('idx_payments_created_at', 'payments', ['created_at'])
        op.create_index('idx_payments_amount', 'payments', ['amount'])
    except Exception:
        # Table might not exist yet
        pass
    
    # Services table indexes (for booking system)
    try:
        op.create_index('idx_services_category_id', 'services', ['category_id'])
        op.create_index('idx_services_is_active', 'services', ['is_active'])
        op.create_index('idx_services_price', 'services', ['price'])
        op.create_index('idx_services_duration', 'services', ['duration_minutes'])
    except Exception:
        # Table might not exist yet
        pass
    
    # Barber availability indexes
    try:
        op.create_index('idx_barber_availability_barber_day', 'barber_availability', ['barber_id', 'day_of_week'])
        op.create_index('idx_barber_availability_effective_dates', 'barber_availability', ['effective_from', 'effective_until'])
        op.create_index('idx_barber_availability_is_available', 'barber_availability', ['is_available'])
    except Exception:
        # Table might not exist yet
        pass
    
    # Booking slots indexes
    try:
        op.create_index('idx_booking_slots_barber_date', 'booking_slots', ['barber_id', 'slot_date'])
        op.create_index('idx_booking_slots_available', 'booking_slots', ['is_available'])
        op.create_index('idx_booking_slots_blocked', 'booking_slots', ['is_blocked'])
        op.create_index('idx_booking_slots_time_range', 'booking_slots', ['start_time', 'end_time'])
    except Exception:
        # Table might not exist yet
        pass
    
    # Reviews table indexes
    try:
        op.create_index('idx_reviews_appointment_id', 'reviews', ['appointment_id'])
        op.create_index('idx_reviews_client_id', 'reviews', ['client_id'])
        op.create_index('idx_reviews_barber_id', 'reviews', ['barber_id'])
        op.create_index('idx_reviews_rating', 'reviews', ['rating'])
        op.create_index('idx_reviews_created_at', 'reviews', ['created_at'])
    except Exception:
        # Table might not exist yet
        pass
    
    # Composite indexes for complex queries
    op.create_index('idx_appointments_analytics', 'appointments', 
                   ['barber_id', 'appointment_date', 'status', 'service_revenue'])
    op.create_index('idx_clients_analytics', 'clients', 
                   ['barber_id', 'customer_type', 'total_spent', 'last_visit_date'])


def downgrade():
    """Remove performance indexes."""
    
    # Drop all the indexes we created
    indexes_to_drop = [
        # Appointments
        'idx_appointments_barber_date',
        'idx_appointments_client_date', 
        'idx_appointments_status_date',
        'idx_appointments_date_time',
        'idx_appointments_barber_status',
        'idx_appointments_created_at',
        'idx_appointments_analytics',
        
        # Clients
        'idx_clients_barber_id',
        'idx_clients_customer_type',
        'idx_clients_last_visit',
        'idx_clients_total_spent',
        'idx_clients_created_at',
        'idx_clients_full_name',
        'idx_clients_analytics',
        
        # Barbers
        'idx_barbers_user_id',
        'idx_barbers_location_id',
        'idx_barbers_is_active',
        'idx_barbers_email',
        
        # Users
        'idx_users_email',
        'idx_users_role',
        'idx_users_is_active',
        
        # Payments
        'idx_payments_appointment_id',
        'idx_payments_status',
        'idx_payments_created_at',
        'idx_payments_amount',
        
        # Services
        'idx_services_category_id',
        'idx_services_is_active',
        'idx_services_price',
        'idx_services_duration',
        
        # Barber availability
        'idx_barber_availability_barber_day',
        'idx_barber_availability_effective_dates',
        'idx_barber_availability_is_available',
        
        # Booking slots
        'idx_booking_slots_barber_date',
        'idx_booking_slots_available',
        'idx_booking_slots_blocked',
        'idx_booking_slots_time_range',
        
        # Reviews
        'idx_reviews_appointment_id',
        'idx_reviews_client_id',
        'idx_reviews_barber_id',
        'idx_reviews_rating',
        'idx_reviews_created_at',
    ]
    
    for index_name in indexes_to_drop:
        try:
            op.drop_index(index_name)
        except Exception:
            # Index might not exist
            pass