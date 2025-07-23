"""add_payment_performance_indexes

Revision ID: payment_indexes_001
Revises: 29008851deb1
Create Date: 2025-07-21 15:30:00.000000

CRITICAL PERFORMANCE OPTIMIZATION:
Adds comprehensive indexes for payment queries to ensure sub-second response times
for all payment operations, even with millions of transactions.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'payment_indexes_001'
down_revision: Union[str, Sequence[str], None] = '29008851deb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for payment queries"""
    
    # Critical payment lookup indexes
    op.create_index(
        'idx_payments_user_created', 
        'payments', 
        ['user_id', 'created_at'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_payments_barber_status', 
        'payments', 
        ['barber_id', 'status'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_payments_stripe_intent', 
        'payments', 
        ['stripe_payment_intent_id'], 
        unique=True,
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_payments_appointment', 
        'payments', 
        ['appointment_id'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_payments_organization_created', 
        'payments', 
        ['organization_id', 'created_at'], 
        postgresql_concurrently=True
    )
    
    # Status-based queries (for reconciliation and reporting)
    op.create_index(
        'idx_payments_status_created', 
        'payments', 
        ['status', 'created_at'], 
        postgresql_concurrently=True
    )
    
    # Amount-based queries (for analytics and fraud detection)
    op.create_index(
        'idx_payments_amount_created', 
        'payments', 
        ['amount', 'created_at'], 
        postgresql_concurrently=True
    )
    
    # Refund lookup indexes
    op.create_index(
        'idx_refunds_payment', 
        'refunds', 
        ['payment_id'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_refunds_status_created', 
        'refunds', 
        ['status', 'created_at'], 
        postgresql_concurrently=True
    )
    
    # Payout indexes for barber earnings
    op.create_index(
        'idx_payouts_barber_status', 
        'payouts', 
        ['barber_id', 'status'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_payouts_period', 
        'payouts', 
        ['period_start', 'period_end'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_payouts_created', 
        'payouts', 
        ['created_at'], 
        postgresql_concurrently=True
    )
    
    # Gift certificate indexes
    op.create_index(
        'idx_gift_certificates_code', 
        'gift_certificates', 
        ['code'], 
        unique=True,
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_gift_certificates_status', 
        'gift_certificates', 
        ['status'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_gift_certificates_expires', 
        'gift_certificates', 
        ['valid_until'], 
        postgresql_concurrently=True
    )
    
    # Appointment indexes (for payment eligibility checks)
    op.create_index(
        'idx_appointments_user_start', 
        'appointments', 
        ['user_id', 'start_time'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_appointments_barber_start', 
        'appointments', 
        ['barber_id', 'start_time'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_appointments_status_start', 
        'appointments', 
        ['status', 'start_time'], 
        postgresql_concurrently=True
    )
    
    # User indexes for payment operations
    op.create_index(
        'idx_users_stripe_account', 
        'users', 
        ['stripe_account_id'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_users_role_active', 
        'users', 
        ['unified_role', 'is_active'], 
        postgresql_concurrently=True
    )
    
    # Composite indexes for complex queries
    op.create_index(
        'idx_payments_user_barber_created', 
        'payments', 
        ['user_id', 'barber_id', 'created_at'], 
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_payments_org_status_amount', 
        'payments', 
        ['organization_id', 'status', 'amount'], 
        postgresql_concurrently=True
    )


def downgrade() -> None:
    """Remove performance indexes"""
    
    # Drop all indexes in reverse order
    op.drop_index('idx_payments_org_status_amount', 'payments')
    op.drop_index('idx_payments_user_barber_created', 'payments')
    op.drop_index('idx_users_role_active', 'users')
    op.drop_index('idx_users_stripe_account', 'users')
    op.drop_index('idx_appointments_status_start', 'appointments')
    op.drop_index('idx_appointments_barber_start', 'appointments')
    op.drop_index('idx_appointments_user_start', 'appointments')
    op.drop_index('idx_gift_certificates_expires', 'gift_certificates')
    op.drop_index('idx_gift_certificates_status', 'gift_certificates')
    op.drop_index('idx_gift_certificates_code', 'gift_certificates')
    op.drop_index('idx_payouts_created', 'payouts')
    op.drop_index('idx_payouts_period', 'payouts')
    op.drop_index('idx_payouts_barber_status', 'payouts')
    op.drop_index('idx_refunds_status_created', 'refunds')
    op.drop_index('idx_refunds_payment', 'refunds')
    op.drop_index('idx_payments_amount_created', 'payments')
    op.drop_index('idx_payments_status_created', 'payments')
    op.drop_index('idx_payments_organization_created', 'payments')
    op.drop_index('idx_payments_appointment', 'payments')
    op.drop_index('idx_payments_stripe_intent', 'payments')
    op.drop_index('idx_payments_barber_status', 'payments')
    op.drop_index('idx_payments_user_created', 'payments')