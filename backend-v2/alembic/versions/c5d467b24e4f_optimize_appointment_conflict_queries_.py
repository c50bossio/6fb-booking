"""optimize_appointment_conflict_queries_20250703

Revision ID: c5d467b24e4f
Revises: c7836e4329d5
Create Date: 2025-07-03 17:10:52.551073

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5d467b24e4f'
down_revision: Union[str, Sequence[str], None] = 'c7836e4329d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add optimized indexes for appointment conflict detection."""
    
    # 1. CRITICAL CONFLICT DETECTION INDEXES
    # Optimized for the new EXISTS queries in booking_service.py
    op.create_index(
        'idx_appointments_conflict_detection',
        'appointments',
        ['barber_id', 'start_time', 'duration_minutes', 'status'],
        postgresql_using='btree'
    )
    
    # Partial index for active appointments only (used in conflict detection)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_active_conflicts
        ON appointments (barber_id, start_time, duration_minutes)
        WHERE status IN ('scheduled', 'confirmed', 'pending')
    """)
    
    # 2. BARBER AVAILABILITY OPTIMIZATION INDEXES
    # For BarberAvailability table
    try:
        op.create_index(
            'idx_barber_availability_optimized',
            'barber_availability',
            ['barber_id', 'day_of_week', 'is_active', 'start_time', 'end_time'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table might not exist
    
    # For BarberTimeOff table
    try:
        op.create_index(
            'idx_barber_timeoff_optimized',
            'barber_time_off',
            ['barber_id', 'status', 'start_date', 'end_date'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table might not exist
    
    # For BarberSpecialAvailability table
    try:
        op.create_index(
            'idx_barber_special_availability_optimized',
            'barber_special_availability',
            ['barber_id', 'date', 'start_time', 'end_time', 'availability_type'],
            postgresql_using='btree'
        )
    except Exception:
        pass  # Table might not exist
    
    # 3. BUFFER TIME OPTIMIZATION
    # For appointments with buffer time calculations
    op.create_index(
        'idx_appointments_with_buffers',
        'appointments',
        ['barber_id', 'start_time', 'buffer_time_before', 'buffer_time_after'],
        postgresql_using='btree'
    )
    
    # 4. TIME RANGE QUERIES OPTIMIZATION
    # For date-based queries (used frequently in availability checking)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_time_range
        ON appointments (start_time)
        WHERE status != 'cancelled'
    """)
    
    # 5. BUSINESS RULES VALIDATION OPTIMIZATION
    # For frequent user/client lookups during validation
    op.create_index(
        'idx_appointments_user_client_validation',
        'appointments',
        ['user_id', 'client_id', 'start_time', 'status'],
        postgresql_using='btree'
    )


def downgrade() -> None:
    """Remove optimized indexes."""
    
    # Drop all the indexes we created
    indexes_to_drop = [
        'idx_appointments_conflict_detection',
        'idx_appointments_active_conflicts',
        'idx_barber_availability_optimized',
        'idx_barber_timeoff_optimized',
        'idx_barber_special_availability_optimized',
        'idx_appointments_with_buffers',
        'idx_appointments_time_range',
        'idx_appointments_user_client_validation'
    ]
    
    for index_name in indexes_to_drop:
        try:
            op.drop_index(index_name)
        except Exception:
            # Index might not exist
            pass
