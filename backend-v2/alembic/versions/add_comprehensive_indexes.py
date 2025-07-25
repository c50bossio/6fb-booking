"""Add comprehensive database indexes for performance

Revision ID: add_comprehensive_indexes
Revises: 
Create Date: 2024-01-09

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_comprehensive_indexes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add comprehensive indexes for all major query patterns"""
    
    # Users table indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_primary_org', 'users', ['primary_organization_id'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    
    # Appointments table indexes
    op.create_index('idx_appointments_user_status_start', 'appointments', 
                    ['user_id', 'status', 'start_time'])
    op.create_index('idx_appointments_barber_status_start', 'appointments', 
                    ['barber_id', 'status', 'start_time'])
    op.create_index('idx_appointments_client_status', 'appointments', 
                    ['client_id', 'status'])
    op.create_index('idx_appointments_start_time', 'appointments', ['start_time'])
    op.create_index('idx_appointments_end_time', 'appointments', ['end_time'])
    op.create_index('idx_appointments_status', 'appointments', ['status'])
    op.create_index('idx_appointments_created_at', 'appointments', ['created_at'])
    op.create_index('idx_appointments_service_id', 'appointments', ['service_id'])
    
    # Payments table indexes
    op.create_index('idx_payments_user_status_created', 'payments', 
                    ['user_id', 'status', 'created_at'])
    op.create_index('idx_payments_appointment_status', 'payments', 
                    ['appointment_id', 'status'])
    op.create_index('idx_payments_status', 'payments', ['status'])
    op.create_index('idx_payments_created_at', 'payments', ['created_at'])
    op.create_index('idx_payments_stripe_payment_intent', 'payments', ['stripe_payment_intent_id'])
    op.create_index('idx_payments_stripe_charge', 'payments', ['stripe_charge_id'])
    
    # Clients table indexes
    op.create_index('idx_clients_user_id', 'clients', ['user_id'])
    op.create_index('idx_clients_email', 'clients', ['email'])
    op.create_index('idx_clients_phone', 'clients', ['phone'])
    op.create_index('idx_clients_created_at', 'clients', ['created_at'])
    op.create_index('idx_clients_last_visit', 'clients', ['last_visit'])
    op.create_index('idx_clients_user_created', 'clients', ['user_id', 'created_at'])
    
    # Services table indexes
    op.create_index('idx_services_user_id', 'services', ['user_id'])
    op.create_index('idx_services_active', 'services', ['is_active'])
    op.create_index('idx_services_user_active', 'services', ['user_id', 'is_active'])
    
    # BookingSettings table indexes
    op.create_index('idx_booking_settings_user', 'booking_settings', ['user_id'])
    
    # BarberAvailability table indexes
    op.create_index('idx_barber_availability_user', 'barber_availability', ['user_id'])
    op.create_index('idx_barber_availability_user_day', 'barber_availability', 
                    ['user_id', 'day_of_week'])
    
    # Organizations table indexes (if exists)
    try:
        op.create_index('idx_organizations_owner', 'organizations', ['owner_id'])
        op.create_index('idx_organizations_active', 'organizations', ['is_active'])
    except:
        pass  # Table might not exist
    
    # UserOrganization table indexes (if exists)
    try:
        op.create_index('idx_user_organization_user', 'user_organization', ['user_id'])
        op.create_index('idx_user_organization_org', 'user_organization', ['organization_id'])
        op.create_index('idx_user_organization_user_org', 'user_organization', 
                        ['user_id', 'organization_id'])
    except:
        pass  # Table might not exist
    
    # Notifications table indexes (if exists)
    try:
        op.create_index('idx_notifications_user', 'notifications', ['user_id'])
        op.create_index('idx_notifications_read', 'notifications', ['is_read'])
        op.create_index('idx_notifications_user_read', 'notifications', ['user_id', 'is_read'])
        op.create_index('idx_notifications_created', 'notifications', ['created_at'])
    except:
        pass  # Table might not exist
    
    # API Keys table indexes (if exists)
    try:
        op.create_index('idx_api_keys_key', 'api_keys', ['key'])
        op.create_index('idx_api_keys_user', 'api_keys', ['user_id'])
        op.create_index('idx_api_keys_active', 'api_keys', ['is_active'])
    except:
        pass  # Table might not exist
    
    # Composite indexes for common join patterns
    op.create_index('idx_payments_user_appointment', 'payments', 
                    ['user_id', 'appointment_id'])
    op.create_index('idx_appointments_user_client', 'appointments', 
                    ['user_id', 'client_id'])
    op.create_index('idx_appointments_barber_client', 'appointments', 
                    ['barber_id', 'client_id'])
    
    # Text search indexes (for PostgreSQL)
    # Note: These will be ignored for SQLite
    try:
        op.execute("CREATE INDEX idx_clients_name_search ON clients USING gin(to_tsvector('english', name))")
        op.execute("CREATE INDEX idx_services_name_search ON services USING gin(to_tsvector('english', name))")
    except:
        pass  # Not supported in SQLite


def downgrade():
    """Remove all indexes"""
    
    # Remove Users indexes
    op.drop_index('idx_users_email', 'users')
    op.drop_index('idx_users_role', 'users')
    op.drop_index('idx_users_primary_org', 'users')
    op.drop_index('idx_users_is_active', 'users')
    op.drop_index('idx_users_created_at', 'users')
    
    # Remove Appointments indexes
    op.drop_index('idx_appointments_user_status_start', 'appointments')
    op.drop_index('idx_appointments_barber_status_start', 'appointments')
    op.drop_index('idx_appointments_client_status', 'appointments')
    op.drop_index('idx_appointments_start_time', 'appointments')
    op.drop_index('idx_appointments_end_time', 'appointments')
    op.drop_index('idx_appointments_status', 'appointments')
    op.drop_index('idx_appointments_created_at', 'appointments')
    op.drop_index('idx_appointments_service_id', 'appointments')
    
    # Remove Payments indexes
    op.drop_index('idx_payments_user_status_created', 'payments')
    op.drop_index('idx_payments_appointment_status', 'payments')
    op.drop_index('idx_payments_status', 'payments')
    op.drop_index('idx_payments_created_at', 'payments')
    op.drop_index('idx_payments_stripe_payment_intent', 'payments')
    op.drop_index('idx_payments_stripe_charge', 'payments')
    
    # Remove Clients indexes
    op.drop_index('idx_clients_user_id', 'clients')
    op.drop_index('idx_clients_email', 'clients')
    op.drop_index('idx_clients_phone', 'clients')
    op.drop_index('idx_clients_created_at', 'clients')
    op.drop_index('idx_clients_last_visit', 'clients')
    op.drop_index('idx_clients_user_created', 'clients')
    
    # Remove Services indexes
    op.drop_index('idx_services_user_id', 'services')
    op.drop_index('idx_services_active', 'services')
    op.drop_index('idx_services_user_active', 'services')
    
    # Remove BookingSettings indexes
    op.drop_index('idx_booking_settings_user', 'booking_settings')
    
    # Remove BarberAvailability indexes
    op.drop_index('idx_barber_availability_user', 'barber_availability')
    op.drop_index('idx_barber_availability_user_day', 'barber_availability')
    
    # Remove optional table indexes
    try:
        op.drop_index('idx_organizations_owner', 'organizations')
        op.drop_index('idx_organizations_active', 'organizations')
    except:
        pass
    
    try:
        op.drop_index('idx_user_organization_user', 'user_organization')
        op.drop_index('idx_user_organization_org', 'user_organization')
        op.drop_index('idx_user_organization_user_org', 'user_organization')
    except:
        pass
    
    try:
        op.drop_index('idx_notifications_user', 'notifications')
        op.drop_index('idx_notifications_read', 'notifications')
        op.drop_index('idx_notifications_user_read', 'notifications')
        op.drop_index('idx_notifications_created', 'notifications')
    except:
        pass
    
    try:
        op.drop_index('idx_api_keys_key', 'api_keys')
        op.drop_index('idx_api_keys_user', 'api_keys')
        op.drop_index('idx_api_keys_active', 'api_keys')
    except:
        pass
    
    # Remove composite indexes
    op.drop_index('idx_payments_user_appointment', 'payments')
    op.drop_index('idx_appointments_user_client', 'appointments')
    op.drop_index('idx_appointments_barber_client', 'appointments')
    
    # Remove text search indexes
    try:
        op.drop_index('idx_clients_name_search', 'clients')
        op.drop_index('idx_services_name_search', 'services')
    except:
        pass