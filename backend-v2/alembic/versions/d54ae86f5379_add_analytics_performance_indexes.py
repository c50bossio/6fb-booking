"""Add analytics performance indexes

Revision ID: d54ae86f5379
Revises: 03eef1835359
Create Date: 2025-07-15 23:44:10.254443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd54ae86f5379'
down_revision: Union[str, Sequence[str], None] = '03eef1835359'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create indexes for payments table (analytics-heavy table)
    op.create_index(
        'idx_payments_status_created_at',
        'payments',
        ['status', 'created_at'],
        if_not_exists=True
    )
    op.create_index(
        'idx_payments_user_id_status',
        'payments',
        ['user_id', 'status'],
        if_not_exists=True
    )
    op.create_index(
        'idx_payments_appointment_id',
        'payments',
        ['appointment_id'],
        if_not_exists=True
    )
    op.create_index(
        'idx_payments_created_at',
        'payments',
        ['created_at'],
        if_not_exists=True
    )

    # Create indexes for appointments table (core analytics queries)
    op.create_index(
        'idx_appointments_user_id_start_time',
        'appointments',
        ['user_id', 'start_time'],
        if_not_exists=True
    )
    op.create_index(
        'idx_appointments_status_start_time',
        'appointments',
        ['status', 'start_time'],
        if_not_exists=True
    )
    op.create_index(
        'idx_appointments_client_id',
        'appointments',
        ['client_id'],
        if_not_exists=True
    )
    op.create_index(
        'idx_appointments_service_name',
        'appointments',
        ['service_name'],
        if_not_exists=True
    )
    op.create_index(
        'idx_appointments_start_time',
        'appointments',
        ['start_time'],
        if_not_exists=True
    )

    # Create indexes for clients table (retention analytics)
    op.create_index(
        'idx_clients_created_at',
        'clients',
        ['created_at'],
        if_not_exists=True
    )

    # Create composite indexes for complex analytics queries
    op.create_index(
        'idx_appointments_user_status_time',
        'appointments',
        ['user_id', 'status', 'start_time'],
        if_not_exists=True
    )
    op.create_index(
        'idx_payments_user_status_created',
        'payments',
        ['user_id', 'status', 'created_at'],
        if_not_exists=True
    )

    # Index for Six Figure Barber metrics queries
    op.create_index(
        'idx_appointments_client_user_status',
        'appointments',
        ['client_id', 'user_id', 'status'],
        if_not_exists=True
    )
    op.create_index(
        'idx_payments_amount_status',
        'payments',
        ['amount', 'status'],
        if_not_exists=True
    )

    # Enterprise analytics indexes (for multiple location queries)
    op.create_index(
        'idx_appointments_user_client_time',
        'appointments',
        ['user_id', 'client_id', 'start_time'],
        if_not_exists=True
    )
    op.create_index(
        'idx_payments_user_amount_created',
        'payments',
        ['user_id', 'amount', 'created_at'],
        if_not_exists=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop all analytics indexes
    op.drop_index('idx_payments_user_amount_created', 'payments')
    op.drop_index('idx_appointments_user_client_time', 'appointments')
    op.drop_index('idx_payments_amount_status', 'payments')
    op.drop_index('idx_appointments_client_user_status', 'appointments')
    op.drop_index('idx_payments_user_status_created', 'payments')
    op.drop_index('idx_appointments_user_status_time', 'appointments')
    op.drop_index('idx_clients_created_at', 'clients')
    op.drop_index('idx_appointments_start_time', 'appointments')
    op.drop_index('idx_appointments_service_name', 'appointments')
    op.drop_index('idx_appointments_client_id', 'appointments')
    op.drop_index('idx_appointments_status_start_time', 'appointments')
    op.drop_index('idx_appointments_user_id_start_time', 'appointments')
    op.drop_index('idx_payments_created_at', 'payments')
    op.drop_index('idx_payments_appointment_id', 'payments')
    op.drop_index('idx_payments_user_id_status', 'payments')
    op.drop_index('idx_payments_status_created_at', 'payments')
