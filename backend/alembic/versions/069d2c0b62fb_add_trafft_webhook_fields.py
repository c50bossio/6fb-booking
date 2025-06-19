"""Add Trafft webhook fields

Revision ID: 069d2c0b62fb
Revises: add_communication_tables
Create Date: 2025-06-19 14:13:39.459428

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '069d2c0b62fb'
down_revision = 'add_communication_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new fields to appointments table
    op.add_column('appointments', sa.Column('trafft_booking_uuid', sa.String(100), nullable=True))
    op.add_column('appointments', sa.Column('trafft_employee_id', sa.String(100), nullable=True))
    op.add_column('appointments', sa.Column('trafft_location_name', sa.String(200), nullable=True))
    op.add_column('appointments', sa.Column('trafft_sync_status', sa.String(50), server_default='synced', nullable=True))
    op.add_column('appointments', sa.Column('trafft_last_sync', sa.DateTime(), nullable=True))
    
    # Add index for booking UUID
    op.create_index(op.f('ix_appointments_trafft_booking_uuid'), 'appointments', ['trafft_booking_uuid'], unique=True)
    
    # Add new fields to barbers table
    op.add_column('barbers', sa.Column('trafft_employee_id', sa.String(100), nullable=True))
    op.add_column('barbers', sa.Column('trafft_employee_email', sa.String(255), nullable=True))
    
    # Add indexes for barber fields
    op.create_index(op.f('ix_barbers_trafft_employee_id'), 'barbers', ['trafft_employee_id'], unique=False)
    op.create_index(op.f('ix_barbers_trafft_employee_email'), 'barbers', ['trafft_employee_email'], unique=False)


def downgrade() -> None:
    # Remove indexes
    op.drop_index(op.f('ix_barbers_trafft_employee_email'), table_name='barbers')
    op.drop_index(op.f('ix_barbers_trafft_employee_id'), table_name='barbers')
    op.drop_index(op.f('ix_appointments_trafft_booking_uuid'), table_name='appointments')
    
    # Remove columns from barbers
    op.drop_column('barbers', 'trafft_employee_email')
    op.drop_column('barbers', 'trafft_employee_id')
    
    # Remove columns from appointments
    op.drop_column('appointments', 'trafft_last_sync')
    op.drop_column('appointments', 'trafft_sync_status')
    op.drop_column('appointments', 'trafft_location_name')
    op.drop_column('appointments', 'trafft_employee_id')
    op.drop_column('appointments', 'trafft_booking_uuid')