"""fix_critical_decimal_precision_for_payments

Revision ID: 29008851deb1
Revises: 60abeabbd32b
Create Date: 2025-07-21 14:36:42.677328

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '29008851deb1'
down_revision: Union[str, Sequence[str], None] = '60abeabbd32b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    CRITICAL SECURITY FIX: Convert Float columns to DECIMAL for monetary precision.
    
    This migration fixes financial calculation errors by replacing Float with DECIMAL
    for all monetary values. Float arithmetic can cause rounding errors in financial
    transactions, leading to incorrect commission calculations and payouts.
    """
    # Critical payment fields
    op.alter_column('payments', 'amount',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True,
                   nullable=False)
    
    op.alter_column('payments', 'platform_fee',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True)
    
    op.alter_column('payments', 'barber_amount',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True)
    
    op.alter_column('payments', 'commission_rate',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=5, scale=4),
                   existing_nullable=True)
    
    op.alter_column('payments', 'refund_amount',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True)
    
    op.alter_column('payments', 'gift_certificate_amount_used',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True)
    
    # User commission rate
    op.alter_column('users', 'commission_rate',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=5, scale=4),
                   existing_nullable=True)
    
    op.alter_column('users', 'lifetime_value',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True)
    
    # Appointment price
    op.alter_column('appointments', 'price',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True,
                   nullable=False)
    
    # Refund amounts
    op.alter_column('refunds', 'amount',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True,
                   nullable=False)
    
    # Payout amounts
    op.alter_column('payouts', 'amount',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True,
                   nullable=False)
    
    # Gift certificate amounts
    op.alter_column('gift_certificates', 'amount',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True,
                   nullable=False)
    
    op.alter_column('gift_certificates', 'balance',
                   existing_type=sa.Float(),
                   type_=sa.DECIMAL(precision=10, scale=2),
                   existing_nullable=True,
                   nullable=False)


def downgrade() -> None:
    """
    WARNING: This downgrade will lose precision for monetary values.
    Only use in development environments.
    """
    # Reverse all DECIMAL columns back to Float (with potential precision loss)
    op.alter_column('gift_certificates', 'balance',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=False,
                   nullable=True)
    
    op.alter_column('gift_certificates', 'amount',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=False,
                   nullable=True)
    
    op.alter_column('payouts', 'amount',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=False,
                   nullable=True)
    
    op.alter_column('refunds', 'amount',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=False,
                   nullable=True)
    
    op.alter_column('appointments', 'price',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=False,
                   nullable=True)
    
    op.alter_column('users', 'lifetime_value',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=True)
    
    op.alter_column('users', 'commission_rate',
                   existing_type=sa.DECIMAL(precision=5, scale=4),
                   type_=sa.Float(),
                   existing_nullable=True)
    
    op.alter_column('payments', 'gift_certificate_amount_used',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=True)
    
    op.alter_column('payments', 'refund_amount',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=True)
    
    op.alter_column('payments', 'commission_rate',
                   existing_type=sa.DECIMAL(precision=5, scale=4),
                   type_=sa.Float(),
                   existing_nullable=True)
    
    op.alter_column('payments', 'barber_amount',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=True)
    
    op.alter_column('payments', 'platform_fee',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=True)
    
    op.alter_column('payments', 'amount',
                   existing_type=sa.DECIMAL(precision=10, scale=2),
                   type_=sa.Float(),
                   existing_nullable=False,
                   nullable=True)
