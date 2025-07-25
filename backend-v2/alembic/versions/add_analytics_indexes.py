"""Add indexes for analytics performance optimization

Revision ID: add_analytics_indexes
Revises: 
Create Date: 2024-01-09

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_analytics_indexes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add indexes to improve analytics query performance"""
    
    # Payments table indexes
    op.create_index('idx_payments_user_status_created', 'payments', 
                    ['user_id', 'status', 'created_at'])
    op.create_index('idx_payments_appointment_status', 'payments', 
                    ['appointment_id', 'status'])
    op.create_index('idx_payments_created_at', 'payments', ['created_at'])
    
    # Appointments table indexes
    op.create_index('idx_appointments_user_status_start', 'appointments', 
                    ['user_id', 'status', 'start_time'])
    op.create_index('idx_appointments_barber_status_start', 'appointments', 
                    ['barber_id', 'status', 'start_time'])
    op.create_index('idx_appointments_client_status', 'appointments', 
                    ['client_id', 'status'])
    op.create_index('idx_appointments_start_time', 'appointments', ['start_time'])
    
    # Clients table indexes
    op.create_index('idx_clients_created_at', 'clients', ['created_at'])
    op.create_index('idx_clients_last_visit', 'clients', ['last_visit'])
    
    # Users table indexes (for barber queries)
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_primary_org', 'users', ['primary_organization_id'])
    
    # Composite indexes for common join patterns
    op.create_index('idx_payments_user_appointment', 'payments', 
                    ['user_id', 'appointment_id'])
    op.create_index('idx_appointments_user_client', 'appointments', 
                    ['user_id', 'client_id'])


def downgrade():
    """Remove analytics performance indexes"""
    
    # Remove payments indexes
    op.drop_index('idx_payments_user_status_created', 'payments')
    op.drop_index('idx_payments_appointment_status', 'payments')
    op.drop_index('idx_payments_created_at', 'payments')
    
    # Remove appointments indexes
    op.drop_index('idx_appointments_user_status_start', 'appointments')
    op.drop_index('idx_appointments_barber_status_start', 'appointments')
    op.drop_index('idx_appointments_client_status', 'appointments')
    op.drop_index('idx_appointments_start_time', 'appointments')
    
    # Remove clients indexes
    op.drop_index('idx_clients_created_at', 'clients')
    op.drop_index('idx_clients_last_visit', 'clients')
    
    # Remove users indexes
    op.drop_index('idx_users_role', 'users')
    op.drop_index('idx_users_primary_org', 'users')
    
    # Remove composite indexes
    op.drop_index('idx_payments_user_appointment', 'payments')
    op.drop_index('idx_appointments_user_client', 'appointments')