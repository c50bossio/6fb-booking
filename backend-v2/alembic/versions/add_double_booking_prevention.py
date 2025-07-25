"""Add double booking prevention mechanisms

Revision ID: add_double_booking_prevention
Revises: e49a7b87f641
Create Date: 2025-01-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_double_booking_prevention'
down_revision = 'e49a7b87f641'
branch_labels = None
depends_on = None


def upgrade():
    # Add version column for optimistic concurrency control
    op.add_column('appointments', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    
    # Add index on version column for performance
    op.create_index('ix_appointments_version', 'appointments', ['version'])
    
    # Add composite unique constraint to prevent double bookings
    # This constraint ensures a barber can't have overlapping appointments
    # Note: We can't use a simple unique constraint because we need to check time ranges
    # Instead, we'll use a database-level function and trigger (PostgreSQL specific)
    
    # For PostgreSQL, create a function to check for overlapping appointments
    op.execute("""
        CREATE OR REPLACE FUNCTION check_appointment_overlap()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Check if there's any overlap with existing appointments for the same barber
            -- Exclude cancelled appointments and the current appointment (for updates)
            IF EXISTS (
                SELECT 1 FROM appointments
                WHERE barber_id = NEW.barber_id
                AND status NOT IN ('cancelled', 'no_show')
                AND id != COALESCE(NEW.id, -1)
                AND (
                    -- Check for time overlap including buffer times
                    (NEW.start_time - INTERVAL '1 minute' * COALESCE(NEW.buffer_time_before, 0), 
                     NEW.start_time + INTERVAL '1 minute' * (NEW.duration_minutes + COALESCE(NEW.buffer_time_after, 0)))
                    OVERLAPS
                    (start_time - INTERVAL '1 minute' * COALESCE(buffer_time_before, 0),
                     start_time + INTERVAL '1 minute' * (duration_minutes + COALESCE(buffer_time_after, 0)))
                )
            ) THEN
                RAISE EXCEPTION 'Appointment overlaps with existing appointment for barber %', NEW.barber_id
                USING ERRCODE = '23505';  -- unique_violation error code
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Create trigger for insert and update
    op.execute("""
        CREATE TRIGGER prevent_appointment_overlap
        BEFORE INSERT OR UPDATE OF start_time, duration_minutes, barber_id, status, buffer_time_before, buffer_time_after
        ON appointments
        FOR EACH ROW
        WHEN (NEW.status NOT IN ('cancelled', 'no_show'))
        EXECUTE FUNCTION check_appointment_overlap();
    """)
    
    # Add indexes for performance on overlap checks
    op.create_index('ix_appointments_barber_start_time', 'appointments', ['barber_id', 'start_time'])
    op.create_index('ix_appointments_status_barber', 'appointments', ['status', 'barber_id'])
    
    # Add a composite index for the most common query pattern
    op.create_index(
        'ix_appointments_barber_status_time',
        'appointments',
        ['barber_id', 'status', 'start_time'],
        postgresql_where=sa.text("status NOT IN ('cancelled', 'no_show')")
    )
    
    # Add a lock timeout setting for booking operations (PostgreSQL specific)
    # This prevents long-running locks from blocking other operations
    op.execute("ALTER DATABASE CURRENT SET lock_timeout = '5s';")


def downgrade():
    # Remove the trigger and function
    op.execute("DROP TRIGGER IF EXISTS prevent_appointment_overlap ON appointments;")
    op.execute("DROP FUNCTION IF EXISTS check_appointment_overlap();")
    
    # Remove indexes
    op.drop_index('ix_appointments_barber_status_time', table_name='appointments')
    op.drop_index('ix_appointments_status_barber', table_name='appointments')
    op.drop_index('ix_appointments_barber_start_time', table_name='appointments')
    op.drop_index('ix_appointments_version', table_name='appointments')
    
    # Remove version column
    op.drop_column('appointments', 'version')
    
    # Reset lock timeout
    op.execute("ALTER DATABASE CURRENT RESET lock_timeout;")