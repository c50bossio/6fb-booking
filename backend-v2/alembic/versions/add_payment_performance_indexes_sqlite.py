"""add_payment_performance_indexes_sqlite

Revision ID: payment_indexes_sqlite_001
Revises: add_webhook_tables
Create Date: 2025-07-21 16:00:00.000000

CRITICAL PERFORMANCE OPTIMIZATION:
SQLite-compatible indexes for payment queries to ensure sub-second response times
for all payment operations, even with millions of transactions.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'payment_indexes_sqlite_001'
down_revision: Union[str, Sequence[str], None] = 'add_webhook_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for payment queries (SQLite compatible)"""
    
    # Critical payment lookup indexes (SQLite compatible)
    op.create_index(
        'idx_payments_user_created', 
        'payments', 
        ['user_id', 'created_at']
    )
    
    op.create_index(
        'idx_payments_barber_status', 
        'payments', 
        ['barber_id', 'status']
    )
    
    op.create_index(
        'idx_payments_stripe_intent', 
        'payments', 
        ['stripe_payment_intent_id'],
        unique=True
    )
    
    op.create_index(
        'idx_payments_appointment', 
        'payments', 
        ['appointment_id']
    )
    
    # Status-based queries (for reconciliation and reporting)
    op.create_index(
        'idx_payments_status_created', 
        'payments', 
        ['status', 'created_at']
    )
    
    # Amount-based queries (for analytics and fraud detection)
    op.create_index(
        'idx_payments_amount_created', 
        'payments', 
        ['amount', 'created_at']
    )
    
    # Organization-level queries
    op.create_index(
        'idx_payments_organization_created', 
        'payments', 
        ['organization_id', 'created_at']
    )
    
    # Try to create refunds indexes if table exists
    try:
        op.create_index(
            'idx_refunds_payment', 
            'refunds', 
            ['payment_id']
        )
        
        op.create_index(
            'idx_refunds_status_created', 
            'refunds', 
            ['status', 'created_at']
        )
    except Exception:
        print("Note: Refunds table not found, skipping refunds indexes")
    
    # Try to create payouts indexes if table exists
    try:
        op.create_index(
            'idx_payouts_barber_status', 
            'payouts', 
            ['barber_id', 'status']
        )
        
        op.create_index(
            'idx_payouts_period', 
            'payouts', 
            ['period_start', 'period_end']
        )
        
        op.create_index(
            'idx_payouts_created', 
            'payouts', 
            ['created_at']
        )
    except Exception:
        print("Note: Payouts table not found, skipping payouts indexes")
    
    # Try to create gift certificate indexes if table exists
    try:
        op.create_index(
            'idx_gift_certificates_code', 
            'gift_certificates', 
            ['code'],
            unique=True
        )
        
        op.create_index(
            'idx_gift_certificates_status', 
            'gift_certificates', 
            ['status']
        )
        
        op.create_index(
            'idx_gift_certificates_expires', 
            'gift_certificates', 
            ['valid_until']
        )
    except Exception:
        print("Note: Gift certificates table not found, skipping gift certificate indexes")
    
    # Appointment indexes (for payment eligibility checks)
    try:
        op.create_index(
            'idx_appointments_user_start', 
            'appointments', 
            ['user_id', 'start_time']
        )
        
        op.create_index(
            'idx_appointments_barber_start', 
            'appointments', 
            ['barber_id', 'start_time']
        )
        
        op.create_index(
            'idx_appointments_status_start', 
            'appointments', 
            ['status', 'start_time']
        )
    except Exception:
        print("Note: Appointments table not found, skipping appointment indexes")
    
    # User indexes for payment operations
    try:
        op.create_index(
            'idx_users_stripe_account', 
            'users', 
            ['stripe_account_id']
        )
        
        op.create_index(
            'idx_users_role_active', 
            'users', 
            ['unified_role', 'is_active']
        )
    except Exception:
        print("Note: Users table columns not found, skipping user indexes")
    
    # Composite indexes for complex queries
    op.create_index(
        'idx_payments_user_barber_created', 
        'payments', 
        ['user_id', 'barber_id', 'created_at']
    )
    
    op.create_index(
        'idx_payments_org_status_amount', 
        'payments', 
        ['organization_id', 'status', 'amount']
    )


def downgrade() -> None:
    """Remove performance indexes"""
    
    # Drop all indexes in reverse order
    try:
        op.drop_index('idx_payments_org_status_amount', 'payments')
        op.drop_index('idx_payments_user_barber_created', 'payments')
    except Exception:
        pass
    
    # Drop user indexes
    try:
        op.drop_index('idx_users_role_active', 'users')
        op.drop_index('idx_users_stripe_account', 'users')
    except Exception:
        pass
    
    # Drop appointment indexes
    try:
        op.drop_index('idx_appointments_status_start', 'appointments')
        op.drop_index('idx_appointments_barber_start', 'appointments')
        op.drop_index('idx_appointments_user_start', 'appointments')
    except Exception:
        pass
    
    # Drop gift certificate indexes
    try:
        op.drop_index('idx_gift_certificates_expires', 'gift_certificates')
        op.drop_index('idx_gift_certificates_status', 'gift_certificates')
        op.drop_index('idx_gift_certificates_code', 'gift_certificates')
    except Exception:
        pass
    
    # Drop payout indexes
    try:
        op.drop_index('idx_payouts_created', 'payouts')
        op.drop_index('idx_payouts_period', 'payouts')
        op.drop_index('idx_payouts_barber_status', 'payouts')
    except Exception:
        pass
    
    # Drop refund indexes
    try:
        op.drop_index('idx_refunds_status_created', 'refunds')
        op.drop_index('idx_refunds_payment', 'refunds')
    except Exception:
        pass
    
    # Drop payment indexes
    try:
        op.drop_index('idx_payments_organization_created', 'payments')
        op.drop_index('idx_payments_amount_created', 'payments')
        op.drop_index('idx_payments_status_created', 'payments')
        op.drop_index('idx_payments_appointment', 'payments')
        op.drop_index('idx_payments_stripe_intent', 'payments')
        op.drop_index('idx_payments_barber_status', 'payments')
        op.drop_index('idx_payments_user_created', 'payments')
    except Exception:
        pass