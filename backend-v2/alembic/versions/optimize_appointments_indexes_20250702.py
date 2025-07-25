"""optimize_appointments_indexes_20250702

Revision ID: optimize_appointments_indexes_20250702
Revises: ed548ba61608
Create Date: 2025-07-02 19:30:00.000000

This migration creates optimized composite indexes for the appointments system
based on actual query patterns found in the booking service and appointment router.

Key optimizations:
1. Composite indexes for common query patterns
2. Slot availability lookups 
3. Barber availability queries
4. Admin reporting and analytics
5. User appointment listings
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'optimize_appointments_indexes_20250702'
down_revision: Union[str, Sequence[str], None] = 'ed548ba61608'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add optimized composite indexes for appointments system."""
    
    # 1. PRIMARY APPOINTMENT QUERY PATTERNS
    # Most common: appointments by date range and status (for slot availability)
    op.create_index(
        'idx_appointments_start_time_status',
        'appointments',
        ['start_time', 'status'],
        postgresql_using='btree'
    )
    
    # Barber-specific availability queries (used frequently for slot checking)
    op.create_index(
        'idx_appointments_barber_start_time_status',
        'appointments',
        ['barber_id', 'start_time', 'status'],
        postgresql_using='btree'
    )
    
    # User appointment listings (most common user-facing query)
    op.create_index(
        'idx_appointments_user_start_time_status',
        'appointments',
        ['user_id', 'start_time', 'status'],
        postgresql_using='btree'
    )
    
    # 2. ADMINISTRATIVE AND REPORTING QUERIES
    # Admin dashboard queries with date filters
    op.create_index(
        'idx_appointments_location_start_time',
        'appointments',
        ['location_id', 'start_time'],
        postgresql_using='btree'
    )
    
    # Status-based reporting (e.g., cancelled appointments, no-shows)
    op.create_index(
        'idx_appointments_status_start_time',
        'appointments',
        ['status', 'start_time'],
        postgresql_using='btree'
    )
    
    # 3. CONFLICT DETECTION AND DOUBLE-BOOKING PREVENTION
    # Quick conflict checks for booking validation
    op.create_index(
        'idx_appointments_barber_start_duration',
        'appointments',
        ['barber_id', 'start_time', 'duration_minutes'],
        postgresql_using='btree'
    )
    
    # 4. CLIENT RELATIONSHIP QUERIES
    # Client appointment history
    op.create_index(
        'idx_appointments_client_start_time',
        'appointments',
        ['client_id', 'start_time'],
        postgresql_using='btree'
    )
    
    # 5. SERVICE-BASED ANALYTICS
    # Service performance and popularity queries
    op.create_index(
        'idx_appointments_service_start_time',
        'appointments',
        ['service_id', 'start_time'],
        postgresql_using='btree'
    )
    
    # 6. GOOGLE CALENDAR INTEGRATION
    # For syncing with external calendars
    op.create_index(
        'idx_appointments_google_event_id',
        'appointments',
        ['google_event_id'],
        postgresql_using='btree'
    )
    
    # 7. RECURRING APPOINTMENTS
    # For recurring appointment patterns
    op.create_index(
        'idx_appointments_recurring_pattern',
        'appointments',
        ['recurring_pattern_id', 'start_time'],
        postgresql_using='btree'
    )
    
    # 8. VERSION CONTROL FOR CONCURRENCY
    # For optimistic locking
    op.create_index(
        'idx_appointments_id_version',
        'appointments',
        ['id', 'version'],
        postgresql_using='btree'
    )
    
    # 9. PAYMENT RELATIONSHIP INDEXES
    # Optimize payment-related queries
    op.create_index(
        'idx_payments_appointment_status',
        'payments',
        ['appointment_id', 'status'],
        postgresql_using='btree'
    )
    
    op.create_index(
        'idx_payments_created_at_status',
        'payments',
        ['created_at', 'status'],
        postgresql_using='btree'
    )
    
    # Barber payout calculations
    op.create_index(
        'idx_payments_barber_created_status',
        'payments',
        ['barber_id', 'created_at', 'status'],
        postgresql_using='btree'
    )
    
    # 10. USER PERFORMANCE INDEXES
    # Email-based user lookups (for auth and guest bookings)
    op.create_index(
        'idx_users_email_active',
        'users',
        ['email', 'is_active'],
        postgresql_using='btree'
    )
    
    # Role-based access control
    op.create_index(
        'idx_users_role_location',
        'users',
        ['role', 'location_id'],
        postgresql_using='btree'
    )
    
    # 11. BOOKING SETTINGS OPTIMIZATION
    # Frequently accessed settings
    try:
        op.create_index(
            'idx_booking_settings_business_id',
            'booking_settings',
            ['business_id'],
            postgresql_using='btree'
        )
    except Exception:
        # Table might not exist yet
        pass
    
    # 12. PARTIAL INDEXES FOR PERFORMANCE
    # Only index active appointments (excluding cancelled/completed)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_active_start_time 
        ON appointments (start_time, barber_id) 
        WHERE status IN ('pending', 'confirmed', 'scheduled')
    """)
    
    # Only index future appointments for availability checking
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_future_availability
        ON appointments (barber_id, start_time, duration_minutes)
        WHERE start_time > NOW() AND status != 'cancelled'
    """)
    
    # 13. TEXT SEARCH INDEXES (if using PostgreSQL)
    # For searching appointment notes
    try:
        op.execute("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_notes_gin
            ON appointments USING gin(to_tsvector('english', COALESCE(notes, '')))
        """)
    except Exception:
        # Might be SQLite or other DB
        pass


def downgrade() -> None:
    """Remove optimized composite indexes."""
    
    # Drop all the indexes we created
    indexes_to_drop = [
        'idx_appointments_start_time_status',
        'idx_appointments_barber_start_time_status',
        'idx_appointments_user_start_time_status',
        'idx_appointments_location_start_time',
        'idx_appointments_status_start_time',
        'idx_appointments_barber_start_duration',
        'idx_appointments_client_start_time',
        'idx_appointments_service_start_time',
        'idx_appointments_google_event_id',
        'idx_appointments_recurring_pattern',
        'idx_appointments_id_version',
        'idx_payments_appointment_status',
        'idx_payments_created_at_status',
        'idx_payments_barber_created_status',
        'idx_users_email_active',
        'idx_users_role_location',
        'idx_appointments_active_start_time',
        'idx_appointments_future_availability',
        'idx_appointments_notes_gin'
    ]
    
    for index_name in indexes_to_drop:
        try:
            op.drop_index(index_name)
        except Exception:
            # Index might not exist
            pass
    
    # Drop booking settings index if it exists
    try:
        op.drop_index('idx_booking_settings_business_id')
    except Exception:
        pass