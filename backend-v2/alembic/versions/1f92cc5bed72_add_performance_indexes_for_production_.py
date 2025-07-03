"""add_performance_indexes_for_production_scale

Revision ID: 1f92cc5bed72
Revises: 2a7928f02512
Create Date: 2025-07-02 18:48:28.631173

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f92cc5bed72'
down_revision: Union[str, Sequence[str], None] = '2a7928f02512'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for production scale."""
    
    # Appointments table indexes
    op.create_index('idx_appointments_barber_date', 'appointments', ['barber_id', 'appointment_date'])
    op.create_index('idx_appointments_client_date', 'appointments', ['client_id', 'appointment_date'])
    op.create_index('idx_appointments_status_date', 'appointments', ['status', 'appointment_date'])
    op.create_index('idx_appointments_location', 'appointments', ['location_id'])
    op.create_index('idx_appointments_date', 'appointments', ['appointment_date'])
    
    # Payments table indexes
    op.create_index('idx_payments_appointment', 'payments', ['appointment_id'])
    op.create_index('idx_payments_user_date', 'payments', ['user_id', 'created_at'])
    op.create_index('idx_payments_status', 'payments', ['status'])
    op.create_index('idx_payments_stripe_payment_intent', 'payments', ['stripe_payment_intent_id'])
    
    # Users table indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_location', 'users', ['location_id'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    
    # Barbers table indexes
    op.create_index('idx_barbers_user', 'barbers', ['user_id'])
    op.create_index('idx_barbers_location', 'barbers', ['location_id'])
    op.create_index('idx_barbers_is_active', 'barbers', ['is_active'])
    
    # Clients table indexes
    op.create_index('idx_clients_phone', 'clients', ['phone'])
    op.create_index('idx_clients_email', 'clients', ['email'])
    op.create_index('idx_clients_barber', 'clients', ['barber_id'])
    
    # Services table indexes
    op.create_index('idx_services_barber', 'services', ['barber_id'])
    op.create_index('idx_services_price', 'services', ['price'])
    op.create_index('idx_services_is_active', 'services', ['is_active'])
    
    # Analytics events indexes (if table exists)
    try:
        op.create_index('idx_analytics_events_user_date', 'analytics_events', ['user_id', 'event_date'])
        op.create_index('idx_analytics_events_type_date', 'analytics_events', ['event_type', 'event_date'])
        op.create_index('idx_analytics_events_barber_date', 'analytics_events', ['barber_id', 'event_date'])
    except:
        pass  # Table might not exist yet
    
    # Reviews table indexes (if table exists)
    try:
        op.create_index('idx_reviews_location_date', 'reviews', ['location_id', 'created_at'])
        op.create_index('idx_reviews_rating', 'reviews', ['rating'])
        op.create_index('idx_reviews_provider', 'reviews', ['provider'])
    except:
        pass  # Table might not exist yet
    
    # Integrations table indexes
    try:
        op.create_index('idx_integrations_user_provider', 'integrations', ['user_id', 'provider'])
        op.create_index('idx_integrations_is_active', 'integrations', ['is_active'])
    except:
        pass  # Table might not exist yet
    
    # Audit logs indexes (if table exists)
    try:
        op.create_index('idx_audit_logs_user_timestamp', 'audit_logs', ['user_id', 'timestamp'])
        op.create_index('idx_audit_logs_action_timestamp', 'audit_logs', ['action', 'timestamp'])
        op.create_index('idx_audit_logs_entity_type_id', 'audit_logs', ['entity_type', 'entity_id'])
    except:
        pass  # Table might not exist yet


def downgrade() -> None:
    """Remove performance indexes."""
    
    # Drop appointments indexes
    op.drop_index('idx_appointments_barber_date', 'appointments')
    op.drop_index('idx_appointments_client_date', 'appointments')
    op.drop_index('idx_appointments_status_date', 'appointments')
    op.drop_index('idx_appointments_location', 'appointments')
    op.drop_index('idx_appointments_date', 'appointments')
    
    # Drop payments indexes
    op.drop_index('idx_payments_appointment', 'payments')
    op.drop_index('idx_payments_user_date', 'payments')
    op.drop_index('idx_payments_status', 'payments')
    op.drop_index('idx_payments_stripe_payment_intent', 'payments')
    
    # Drop users indexes
    op.drop_index('idx_users_email', 'users')
    op.drop_index('idx_users_location', 'users')
    op.drop_index('idx_users_role', 'users')
    op.drop_index('idx_users_is_active', 'users')
    
    # Drop barbers indexes
    op.drop_index('idx_barbers_user', 'barbers')
    op.drop_index('idx_barbers_location', 'barbers')
    op.drop_index('idx_barbers_is_active', 'barbers')
    
    # Drop clients indexes
    op.drop_index('idx_clients_phone', 'clients')
    op.drop_index('idx_clients_email', 'clients')
    op.drop_index('idx_clients_barber', 'clients')
    
    # Drop services indexes
    op.drop_index('idx_services_barber', 'services')
    op.drop_index('idx_services_price', 'services')
    op.drop_index('idx_services_is_active', 'services')
    
    # Drop optional table indexes (if they exist)
    try:
        op.drop_index('idx_analytics_events_user_date', 'analytics_events')
        op.drop_index('idx_analytics_events_type_date', 'analytics_events')
        op.drop_index('idx_analytics_events_barber_date', 'analytics_events')
    except:
        pass
    
    try:
        op.drop_index('idx_reviews_location_date', 'reviews')
        op.drop_index('idx_reviews_rating', 'reviews')
        op.drop_index('idx_reviews_provider', 'reviews')
    except:
        pass
    
    try:
        op.drop_index('idx_integrations_user_provider', 'integrations')
        op.drop_index('idx_integrations_is_active', 'integrations')
    except:
        pass
    
    try:
        op.drop_index('idx_audit_logs_user_timestamp', 'audit_logs')
        op.drop_index('idx_audit_logs_action_timestamp', 'audit_logs')
        op.drop_index('idx_audit_logs_entity_type_id', 'audit_logs')
    except:
        pass
