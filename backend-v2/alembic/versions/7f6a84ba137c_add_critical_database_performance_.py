"""add_critical_database_performance_indexes

Revision ID: 7f6a84ba137c
Revises: bbb4af460a64
Create Date: 2025-07-28 04:57:35.000700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f6a84ba137c'
down_revision: Union[str, Sequence[str], None] = 'bbb4af460a64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add critical database performance indexes for the 6fb-booking platform.
    
    This migration focuses on the most impactful indexes for:
    - Appointment lookups by barber and date
    - User authentication and role queries  
    - Payment processing and status checks
    - Barber availability scheduling
    """
    
    # ===========================================
    # CRITICAL APPOINTMENTS TABLE INDEXES
    # ===========================================
    
    # Most critical: Barber schedule lookups (barber viewing their appointments)
    _create_index_safe('idx_appointments_barber_start', 'appointments', 
                      ['barber_id', 'start_time'])
    
    # Barber appointments by status and date (confirmed, pending appointments)
    _create_index_safe('idx_appointments_barber_status_start', 'appointments', 
                      ['barber_id', 'status', 'start_time'])
    
    # User appointment history (clients viewing their bookings)
    _create_index_safe('idx_appointments_user_start', 'appointments', 
                      ['user_id', 'start_time'])
    
    # System-wide appointment queries by status and date
    _create_index_safe('idx_appointments_status_start', 'appointments', 
                      ['status', 'start_time'])
    
    # Client-specific appointment lookups
    _create_index_safe('idx_appointments_client_status', 'appointments', 
                      ['client_id', 'status'])
    
    # Service-based appointment queries
    _create_index_safe('idx_appointments_service_start', 'appointments', 
                      ['service_id', 'start_time'])
    
    # ===========================================
    # CRITICAL USER TABLE INDEXES  
    # ===========================================
    
    # Authentication: email + active status for login
    _create_index_safe('idx_users_email_active', 'users', 
                      ['email', 'is_active'])
    
    # Role-based queries: role + active status
    _create_index_safe('idx_users_role_active', 'users', 
                      ['unified_role', 'is_active'])
    
    # User registration and analytics queries
    _create_index_safe('idx_users_created_active', 'users', 
                      ['created_at', 'is_active'])
    
    # ===========================================
    # CRITICAL PAYMENTS TABLE INDEXES
    # ===========================================
    
    # User payment history (most common query)
    _create_index_safe('idx_payments_user_status', 'payments', 
                      ['user_id', 'status'])
    
    # Payment status by creation date (financial reporting)
    _create_index_safe('idx_payments_status_created', 'payments', 
                      ['status', 'created_at'])
    
    # Appointment payment lookup
    _create_index_safe('idx_payments_appointment_status', 'payments', 
                      ['appointment_id', 'status'])
    
    # Barber earnings queries
    _create_index_safe('idx_payments_barber_status', 'payments', 
                      ['barber_id', 'status'])
    
    # Stripe payment intent lookups for webhook processing
    _create_index_safe('idx_payments_stripe_intent', 'payments', 
                      ['stripe_payment_intent_id'])
    
    # ===========================================
    # CRITICAL BARBER AVAILABILITY INDEXES
    # ===========================================
    
    # Most critical: Barber availability by day (scheduling queries)
    _create_index_safe('idx_barber_availability_barber_day', 'barber_availability', 
                      ['barber_id', 'day_of_week'])
    
    # Active availability schedules
    _create_index_safe('idx_barber_availability_barber_active', 'barber_availability', 
                      ['barber_id', 'is_active'])
    
    # System-wide availability queries
    _create_index_safe('idx_barber_availability_day_active', 'barber_availability', 
                      ['day_of_week', 'is_active'])
    
    # ===========================================
    # ADDITIONAL PERFORMANCE INDEXES
    # ===========================================
    
    # Client table indexes for contact lookups
    _create_index_safe('idx_clients_email', 'clients', ['email'])
    _create_index_safe('idx_clients_phone', 'clients', ['phone'])
    _create_index_safe('idx_clients_barber_created', 'clients', 
                      ['barber_id', 'created_at'])
    
    # Service table indexes
    _create_index_safe('idx_services_barber_active', 'services', 
                      ['barber_id', 'is_active'])
    
    # Organization-based queries (multi-location support)
    _create_index_safe('idx_appointments_org_start', 'appointments', 
                      ['organization_id', 'start_time'])
    _create_index_safe('idx_payments_org_created', 'payments', 
                      ['organization_id', 'created_at'])


def downgrade() -> None:
    """Remove critical performance indexes."""
    
    # Remove appointments indexes
    _drop_index_safe('idx_appointments_barber_start', 'appointments')
    _drop_index_safe('idx_appointments_barber_status_start', 'appointments')
    _drop_index_safe('idx_appointments_user_start', 'appointments')
    _drop_index_safe('idx_appointments_status_start', 'appointments')
    _drop_index_safe('idx_appointments_client_status', 'appointments')
    _drop_index_safe('idx_appointments_service_start', 'appointments')
    _drop_index_safe('idx_appointments_org_start', 'appointments')
    
    # Remove user indexes
    _drop_index_safe('idx_users_email_active', 'users')
    _drop_index_safe('idx_users_role_active', 'users')
    _drop_index_safe('idx_users_created_active', 'users')
    
    # Remove payment indexes
    _drop_index_safe('idx_payments_user_status', 'payments')
    _drop_index_safe('idx_payments_status_created', 'payments')
    _drop_index_safe('idx_payments_appointment_status', 'payments')
    _drop_index_safe('idx_payments_barber_status', 'payments')
    _drop_index_safe('idx_payments_stripe_intent', 'payments')
    _drop_index_safe('idx_payments_org_created', 'payments')
    
    # Remove barber availability indexes
    _drop_index_safe('idx_barber_availability_barber_day', 'barber_availability')
    _drop_index_safe('idx_barber_availability_barber_active', 'barber_availability')
    _drop_index_safe('idx_barber_availability_day_active', 'barber_availability')
    
    # Remove additional indexes
    _drop_index_safe('idx_clients_email', 'clients')
    _drop_index_safe('idx_clients_phone', 'clients')
    _drop_index_safe('idx_clients_barber_created', 'clients')
    _drop_index_safe('idx_services_barber_active', 'services')


def _create_index_safe(index_name: str, table_name: str, columns: list):
    """Safely create an index, ignoring if it already exists."""
    try:
        op.create_index(index_name, table_name, columns)
        print(f"✓ Created index: {index_name}")
    except Exception as e:
        print(f"⚠ Index {index_name} already exists or failed to create: {e}")


def _drop_index_safe(index_name: str, table_name: str):
    """Safely drop an index, ignoring if it doesn't exist."""
    try:
        op.drop_index(index_name, table_name)
        print(f"✓ Dropped index: {index_name}")
    except Exception as e:
        print(f"⚠ Index {index_name} doesn't exist or failed to drop: {e}")
