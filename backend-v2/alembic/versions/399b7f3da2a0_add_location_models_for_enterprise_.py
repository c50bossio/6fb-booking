"""add location models for enterprise dashboard

Revision ID: 399b7f3da2a0
Revises: 6616f0ce2546
Create Date: 2025-06-29 13:25:54.180902

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '399b7f3da2a0'
down_revision: Union[str, Sequence[str], None] = '6616f0ce2546'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create barbershop_locations table
    op.create_table(
        'barbershop_locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('state', sa.String(50), nullable=False),
        sa.Column('zip_code', sa.String(20), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('status', sa.Enum('active', 'inactive', 'coming_soon', 'closed', name='locationstatus'), nullable=False),
        sa.Column('compensation_model', sa.Enum('booth_rental', 'commission', 'hybrid', 'custom', name='compensationmodel'), nullable=False),
        sa.Column('total_chairs', sa.Integer(), nullable=False, default=0),
        sa.Column('active_chairs', sa.Integer(), nullable=False, default=0),
        sa.Column('compensation_config', sa.JSON(), nullable=True),
        sa.Column('manager_id', sa.Integer(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('business_hours', sa.JSON(), nullable=True),
        sa.Column('timezone', sa.String(50), nullable=True, default='America/New_York'),
        sa.Column('currency', sa.String(10), nullable=True, default='USD'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['manager_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_barbershop_locations_name'), 'barbershop_locations', ['name'], unique=False)

    # Create barber_locations association table
    op.create_table(
        'barber_locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=True, default=True),
        sa.Column('chair_number', sa.String(50), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], )
    )

    # Create chair_inventory table
    op.create_table(
        'chair_inventory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('chair_number', sa.String(50), nullable=False),
        sa.Column('chair_type', sa.Enum('standard', 'premium', 'private_booth', 'training', name='chairtype'), nullable=False),
        sa.Column('status', sa.Enum('available', 'occupied', 'maintenance', 'reserved', 'inactive', name='chairstatus'), nullable=False),
        sa.Column('assigned_barber_id', sa.Integer(), nullable=True),
        sa.Column('assignment_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('assignment_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rental_rate_weekly', sa.Float(), nullable=True, default=0),
        sa.Column('rental_rate_monthly', sa.Float(), nullable=True, default=0),
        sa.Column('last_payment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_payment_due', sa.DateTime(timezone=True), nullable=True),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('equipment', sa.JSON(), nullable=True),
        sa.Column('total_appointments_today', sa.Integer(), nullable=True, default=0),
        sa.Column('total_appointments_week', sa.Integer(), nullable=True, default=0),
        sa.Column('total_appointments_month', sa.Integer(), nullable=True, default=0),
        sa.Column('last_appointment_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revenue_today', sa.Float(), nullable=True, default=0),
        sa.Column('revenue_week', sa.Float(), nullable=True, default=0),
        sa.Column('revenue_month', sa.Float(), nullable=True, default=0),
        sa.Column('last_maintenance_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_maintenance_due', sa.DateTime(timezone=True), nullable=True),
        sa.Column('maintenance_notes', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], ),
        sa.ForeignKeyConstraint(['assigned_barber_id'], ['users.id'], )
    )

    # Create chair_assignment_history table
    op.create_table(
        'chair_assignment_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('chair_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_revenue', sa.Float(), nullable=True, default=0),
        sa.Column('total_appointments', sa.Integer(), nullable=True, default=0),
        sa.Column('avg_ticket', sa.Float(), nullable=True, default=0),
        sa.Column('rental_rate', sa.Float(), nullable=True, default=0),
        sa.Column('total_rent_collected', sa.Float(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['chair_id'], ['chair_inventory.id'], ),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], )
    )

    # Create compensation_plans table
    op.create_table(
        'compensation_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('model_type', sa.Enum('booth_rental', 'commission', 'hybrid', 'custom', name='compensationmodel'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_default', sa.Boolean(), nullable=True, default=False),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=False),
        sa.Column('incentives', sa.JSON(), nullable=True),
        sa.Column('deductions', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], ),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], )
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order due to foreign key dependencies
    op.drop_table('compensation_plans')
    op.drop_table('chair_assignment_history')
    op.drop_table('chair_inventory')
    op.drop_table('barber_locations')
    op.drop_index(op.f('ix_barbershop_locations_name'), table_name='barbershop_locations')
    op.drop_table('barbershop_locations')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS locationstatus")
    op.execute("DROP TYPE IF EXISTS compensationmodel")
    op.execute("DROP TYPE IF EXISTS chairtype")
    op.execute("DROP TYPE IF EXISTS chairstatus")
