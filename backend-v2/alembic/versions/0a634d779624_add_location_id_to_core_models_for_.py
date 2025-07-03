"""add_location_id_to_core_models_for_multi_tenancy

Revision ID: 0a634d779624
Revises: 1f92cc5bed72
Create Date: 2025-07-02 19:05:16.774773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a634d779624'
down_revision: Union[str, Sequence[str], None] = '1f92cc5bed72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add location_id to core models for multi-tenancy support."""
    
    # Add location_id to appointments table
    op.add_column('appointments', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_appointments_location_id', 'appointments', 'barbershop_locations', ['location_id'], ['id'])
    
    # Add location_id to payments table
    op.add_column('payments', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_payments_location_id', 'payments', 'barbershop_locations', ['location_id'], ['id'])
    
    # Add location_id to clients table
    op.add_column('clients', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_clients_location_id', 'clients', 'barbershop_locations', ['location_id'], ['id'])
    
    # Add location_id to services table
    op.add_column('services', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_services_location_id', 'services', 'barbershop_locations', ['location_id'], ['id'])
    
    # Create indexes for better query performance
    op.create_index('idx_appointments_location_id', 'appointments', ['location_id'])
    op.create_index('idx_payments_location_id', 'payments', ['location_id'])
    op.create_index('idx_clients_location_id', 'clients', ['location_id'])
    op.create_index('idx_services_location_id', 'services', ['location_id'])
    
    # Update existing records to set location_id based on related user's location
    # This is a data migration to ensure existing data has proper location assignment
    op.execute("""
        UPDATE appointments a
        SET location_id = u.location_id
        FROM users u
        WHERE a.barber_id = u.id AND u.location_id IS NOT NULL
    """)
    
    op.execute("""
        UPDATE payments p
        SET location_id = u.location_id
        FROM users u
        WHERE p.barber_id = u.id AND u.location_id IS NOT NULL
    """)
    
    op.execute("""
        UPDATE clients c
        SET location_id = u.location_id
        FROM users u
        WHERE c.barber_id = u.id AND u.location_id IS NOT NULL
    """)
    
    op.execute("""
        UPDATE services s
        SET location_id = u.location_id
        FROM users u
        WHERE s.barber_id = u.id AND u.location_id IS NOT NULL
    """)
    


def downgrade() -> None:
    """Remove location_id from core models."""
    
    # Drop indexes
    op.drop_index('idx_services_location_id', 'services')
    op.drop_index('idx_clients_location_id', 'clients')
    op.drop_index('idx_payments_location_id', 'payments')
    op.drop_index('idx_appointments_location_id', 'appointments')
    
    # Drop foreign keys and columns
    op.drop_constraint('fk_services_location_id', 'services', type_='foreignkey')
    op.drop_column('services', 'location_id')
    
    op.drop_constraint('fk_clients_location_id', 'clients', type_='foreignkey')
    op.drop_column('clients', 'location_id')
    
    op.drop_constraint('fk_payments_location_id', 'payments', type_='foreignkey')
    op.drop_column('payments', 'location_id')
    
    op.drop_constraint('fk_appointments_location_id', 'appointments', type_='foreignkey')
    op.drop_column('appointments', 'location_id')
