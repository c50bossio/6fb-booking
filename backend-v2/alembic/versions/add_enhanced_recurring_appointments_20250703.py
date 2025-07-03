"""Add enhanced recurring appointments with blackout dates and series management

Revision ID: add_enhanced_recurring_appointments_20250703
Revises: comprehensive_timezone_support_20250703
Create Date: 2025-07-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = 'add_enhanced_recurring_appointments_20250703'
down_revision = 'comprehensive_timezone_support_20250703'
branch_labels = None
depends_on = None


def upgrade():
    # Create blackout_dates table
    op.create_table('blackout_dates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('blackout_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('blackout_type', sa.String(), nullable=True),
        sa.Column('is_recurring', sa.Boolean(), nullable=True),
        sa.Column('recurrence_pattern', sa.String(), nullable=True),
        sa.Column('recurrence_end_date', sa.Date(), nullable=True),
        sa.Column('allow_emergency_bookings', sa.Boolean(), nullable=True),
        sa.Column('affects_existing_appointments', sa.Boolean(), nullable=True),
        sa.Column('auto_reschedule', sa.Boolean(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_blackout_date_barber', 'blackout_dates', ['blackout_date', 'barber_id'], unique=False)
    op.create_index('idx_blackout_date_location', 'blackout_dates', ['blackout_date', 'location_id'], unique=False)
    op.create_index(op.f('ix_blackout_dates_blackout_date'), 'blackout_dates', ['blackout_date'], unique=False)
    op.create_index(op.f('ix_blackout_dates_id'), 'blackout_dates', ['id'], unique=False)
    
    # Create recurring_appointment_series table
    op.create_table('recurring_appointment_series',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pattern_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('series_name', sa.String(), nullable=True),
        sa.Column('series_description', sa.Text(), nullable=True),
        sa.Column('payment_type', sa.String(), nullable=True),
        sa.Column('total_series_price', sa.Float(), nullable=True),
        sa.Column('paid_amount', sa.Float(), nullable=True),
        sa.Column('payment_status', sa.String(), nullable=True),
        sa.Column('total_planned', sa.Integer(), nullable=True),
        sa.Column('total_completed', sa.Integer(), nullable=True),
        sa.Column('total_cancelled', sa.Integer(), nullable=True),
        sa.Column('total_rescheduled', sa.Integer(), nullable=True),
        sa.Column('series_status', sa.String(), nullable=True),
        sa.Column('completion_percentage', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['pattern_id'], ['recurring_appointment_patterns.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recurring_appointment_series_id'), 'recurring_appointment_series', ['id'], unique=False)
    
    # Add new columns to appointments table
    with op.batch_alter_table('appointments') as batch_op:
        batch_op.add_column(sa.Column('recurring_series_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('is_recurring_instance', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('original_scheduled_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('recurrence_sequence', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_appointments_recurring_series', 'recurring_appointment_series', ['recurring_series_id'], ['id'])
    
    # Set default values for new columns
    op.execute("UPDATE appointments SET is_recurring_instance = false WHERE is_recurring_instance IS NULL")
    
    # Make is_recurring_instance not nullable after setting default values
    with op.batch_alter_table('appointments') as batch_op:
        batch_op.alter_column('is_recurring_instance', nullable=False, server_default='false')
    
    # Set default values for blackout_dates columns
    op.execute("UPDATE blackout_dates SET blackout_type = 'full_day' WHERE blackout_type IS NULL")
    op.execute("UPDATE blackout_dates SET is_recurring = false WHERE is_recurring IS NULL")
    op.execute("UPDATE blackout_dates SET allow_emergency_bookings = false WHERE allow_emergency_bookings IS NULL")
    op.execute("UPDATE blackout_dates SET affects_existing_appointments = true WHERE affects_existing_appointments IS NULL")
    op.execute("UPDATE blackout_dates SET auto_reschedule = false WHERE auto_reschedule IS NULL")
    op.execute("UPDATE blackout_dates SET is_active = true WHERE is_active IS NULL")


def downgrade():
    # Remove new columns from appointments table
    with op.batch_alter_table('appointments') as batch_op:
        batch_op.drop_constraint('fk_appointments_recurring_series', type_='foreignkey')
        batch_op.drop_column('recurrence_sequence')
        batch_op.drop_column('original_scheduled_date')
        batch_op.drop_column('is_recurring_instance')
        batch_op.drop_column('recurring_series_id')
    
    # Drop recurring_appointment_series table
    op.drop_index(op.f('ix_recurring_appointment_series_id'), table_name='recurring_appointment_series')
    op.drop_table('recurring_appointment_series')
    
    # Drop blackout_dates table
    op.drop_index(op.f('ix_blackout_dates_id'), table_name='blackout_dates')
    op.drop_index(op.f('ix_blackout_dates_blackout_date'), table_name='blackout_dates')
    op.drop_index('idx_blackout_date_location', table_name='blackout_dates')
    op.drop_index('idx_blackout_date_barber', table_name='blackout_dates')
    op.drop_table('blackout_dates')