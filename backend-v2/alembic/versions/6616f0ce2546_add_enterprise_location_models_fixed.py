"""add enterprise location models - fixed for SQLite

Revision ID: 6616f0ce2546_fixed
Revises: b082953f27bb
Create Date: 2025-06-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6616f0ce2546'
down_revision: Union[str, None] = 'b082953f27bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create new tables
    op.create_table('barbershop_locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=50), nullable=False),
        sa.Column('zip_code', sa.String(length=20), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('status', sa.Enum('active', 'inactive', 'coming_soon', 'closed', name='locationstatus'), nullable=False),
        sa.Column('compensation_model', sa.Enum('booth_rental', 'commission', 'hybrid', 'custom', name='compensationmodel'), nullable=False),
        sa.Column('total_chairs', sa.Integer(), nullable=False),
        sa.Column('active_chairs', sa.Integer(), nullable=False),
        sa.Column('compensation_config', sa.JSON(), nullable=True),
        sa.Column('manager_id', sa.Integer(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('business_hours', sa.JSON(), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_barbershop_locations_id'), 'barbershop_locations', ['id'], unique=False)
    op.create_index(op.f('ix_barbershop_locations_name'), 'barbershop_locations', ['name'], unique=False)
    op.create_index(op.f('ix_barbershop_locations_code'), 'barbershop_locations', ['code'], unique=True)
    op.create_index(op.f('ix_barbershop_locations_status'), 'barbershop_locations', ['status'], unique=False)

    op.create_table('barber_locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=True),
        sa.Column('chair_number', sa.String(length=50), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_barber_locations_id'), 'barber_locations', ['id'], unique=False)
    op.create_index(op.f('ix_barber_locations_barber_id'), 'barber_locations', ['barber_id'], unique=False)
    op.create_index(op.f('ix_barber_locations_location_id'), 'barber_locations', ['location_id'], unique=False)

    op.create_table('chair_inventory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('chair_number', sa.String(length=50), nullable=False),
        sa.Column('chair_type', sa.Enum('standard', 'premium', 'private_booth', 'training', name='chairtype'), nullable=False),
        sa.Column('status', sa.Enum('available', 'occupied', 'maintenance', 'reserved', 'inactive', name='chairstatus'), nullable=False),
        sa.Column('assigned_barber_id', sa.Integer(), nullable=True),
        sa.Column('assignment_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('assignment_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rental_rate_weekly', sa.Float(), nullable=True),
        sa.Column('rental_rate_monthly', sa.Float(), nullable=True),
        sa.Column('last_payment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_payment_due', sa.DateTime(timezone=True), nullable=True),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('equipment', sa.JSON(), nullable=True),
        sa.Column('total_appointments_today', sa.Integer(), nullable=True),
        sa.Column('total_appointments_week', sa.Integer(), nullable=True),
        sa.Column('total_appointments_month', sa.Integer(), nullable=True),
        sa.Column('last_appointment_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revenue_today', sa.Float(), nullable=True),
        sa.Column('revenue_week', sa.Float(), nullable=True),
        sa.Column('revenue_month', sa.Float(), nullable=True),
        sa.Column('last_maintenance_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_maintenance_due', sa.DateTime(timezone=True), nullable=True),
        sa.Column('maintenance_notes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('location_id', 'chair_number', name='uq_chair_inventory_location_chair')
    )
    op.create_index(op.f('ix_chair_inventory_id'), 'chair_inventory', ['id'], unique=False)
    op.create_index(op.f('ix_chair_inventory_location_id'), 'chair_inventory', ['location_id'], unique=False)
    op.create_index(op.f('ix_chair_inventory_assigned_barber_id'), 'chair_inventory', ['assigned_barber_id'], unique=False)
    op.create_index(op.f('ix_chair_inventory_status'), 'chair_inventory', ['status'], unique=False)

    op.create_table('chair_assignment_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('chair_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_revenue', sa.Float(), nullable=True),
        sa.Column('total_appointments', sa.Integer(), nullable=True),
        sa.Column('avg_ticket', sa.Float(), nullable=True),
        sa.Column('rental_rate', sa.Float(), nullable=True),
        sa.Column('total_rent_collected', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chair_assignment_history_id'), 'chair_assignment_history', ['id'], unique=False)
    op.create_index(op.f('ix_chair_assignment_history_chair_id'), 'chair_assignment_history', ['chair_id'], unique=False)
    op.create_index(op.f('ix_chair_assignment_history_barber_id'), 'chair_assignment_history', ['barber_id'], unique=False)
    op.create_index(op.f('ix_chair_assignment_history_location_id'), 'chair_assignment_history', ['location_id'], unique=False)
    op.create_index(op.f('ix_chair_assignment_history_start_date'), 'chair_assignment_history', ['start_date'], unique=False)
    op.create_index(op.f('ix_chair_assignment_history_end_date'), 'chair_assignment_history', ['end_date'], unique=False)

    op.create_table('compensation_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('model_type', sa.Enum('booth_rental', 'commission', 'hybrid', 'custom', name='compensationmodel'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=False),
        sa.Column('incentives', sa.JSON(), nullable=True),
        sa.Column('deductions', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compensation_plans_id'), 'compensation_plans', ['id'], unique=False)
    op.create_index(op.f('ix_compensation_plans_location_id'), 'compensation_plans', ['location_id'], unique=False)
    op.create_index(op.f('ix_compensation_plans_barber_id'), 'compensation_plans', ['barber_id'], unique=False)
    op.create_index(op.f('ix_compensation_plans_model_type'), 'compensation_plans', ['model_type'], unique=False)
    op.create_index(op.f('ix_compensation_plans_is_active'), 'compensation_plans', ['is_active'], unique=False)
    op.create_index(op.f('ix_compensation_plans_effective_from'), 'compensation_plans', ['effective_from'], unique=False)

    # Add location_id to existing tables using batch mode for SQLite
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('primary_location', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_primary_location'), ['primary_location'], unique=False)

    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('location_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_appointments_location_id'), ['location_id'], unique=False)

    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('location_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_payments_location_id'), ['location_id'], unique=False)

    # Create indexes for manager_id after tables exist
    op.create_index(op.f('ix_barbershop_locations_manager_id'), 'barbershop_locations', ['manager_id'], unique=False)
    op.create_index(op.f('ix_barbershop_locations_owner_id'), 'barbershop_locations', ['owner_id'], unique=False)


def downgrade() -> None:
    # Drop indexes and columns from existing tables using batch mode
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_payments_location_id'))
        batch_op.drop_column('location_id')

    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_appointments_location_id'))
        batch_op.drop_column('location_id')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_primary_location'))
        batch_op.drop_column('primary_location')

    # Drop tables in reverse order of creation
    op.drop_index(op.f('ix_compensation_plans_effective_from'), table_name='compensation_plans')
    op.drop_index(op.f('ix_compensation_plans_is_active'), table_name='compensation_plans')
    op.drop_index(op.f('ix_compensation_plans_model_type'), table_name='compensation_plans')
    op.drop_index(op.f('ix_compensation_plans_barber_id'), table_name='compensation_plans')
    op.drop_index(op.f('ix_compensation_plans_location_id'), table_name='compensation_plans')
    op.drop_index(op.f('ix_compensation_plans_id'), table_name='compensation_plans')
    op.drop_table('compensation_plans')

    op.drop_index(op.f('ix_chair_assignment_history_end_date'), table_name='chair_assignment_history')
    op.drop_index(op.f('ix_chair_assignment_history_start_date'), table_name='chair_assignment_history')
    op.drop_index(op.f('ix_chair_assignment_history_location_id'), table_name='chair_assignment_history')
    op.drop_index(op.f('ix_chair_assignment_history_barber_id'), table_name='chair_assignment_history')
    op.drop_index(op.f('ix_chair_assignment_history_chair_id'), table_name='chair_assignment_history')
    op.drop_index(op.f('ix_chair_assignment_history_id'), table_name='chair_assignment_history')
    op.drop_table('chair_assignment_history')

    op.drop_index(op.f('ix_chair_inventory_status'), table_name='chair_inventory')
    op.drop_index(op.f('ix_chair_inventory_assigned_barber_id'), table_name='chair_inventory')
    op.drop_index(op.f('ix_chair_inventory_location_id'), table_name='chair_inventory')
    op.drop_index(op.f('ix_chair_inventory_id'), table_name='chair_inventory')
    op.drop_table('chair_inventory')

    op.drop_index(op.f('ix_barber_locations_location_id'), table_name='barber_locations')
    op.drop_index(op.f('ix_barber_locations_barber_id'), table_name='barber_locations')
    op.drop_index(op.f('ix_barber_locations_id'), table_name='barber_locations')
    op.drop_table('barber_locations')

    op.drop_index(op.f('ix_barbershop_locations_owner_id'), table_name='barbershop_locations')
    op.drop_index(op.f('ix_barbershop_locations_manager_id'), table_name='barbershop_locations')
    op.drop_index(op.f('ix_barbershop_locations_status'), table_name='barbershop_locations')
    op.drop_index(op.f('ix_barbershop_locations_code'), table_name='barbershop_locations')
    op.drop_index(op.f('ix_barbershop_locations_name'), table_name='barbershop_locations')
    op.drop_index(op.f('ix_barbershop_locations_id'), table_name='barbershop_locations')
    op.drop_table('barbershop_locations')