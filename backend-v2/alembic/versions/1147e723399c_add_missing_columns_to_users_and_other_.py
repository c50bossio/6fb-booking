"""Add missing columns to users and other tables

Revision ID: 1147e723399c
Revises: 036b48e0d677
Create Date: 2025-06-28 13:59:07.703772

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1147e723399c'
down_revision: Union[str, Sequence[str], None] = '036b48e0d677'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('appointments', sa.Column('service_id', sa.Integer(), nullable=True))
    op.drop_index(op.f('ix_appointments_client_id'), table_name='appointments')
    op.create_foreign_key(None, 'appointments', 'clients', ['client_id'], ['id'])
    op.create_foreign_key(None, 'appointments', 'services', ['service_id'], ['id'])
    op.add_column('clients', sa.Column('barber_id', sa.Integer(), nullable=True))
    op.add_column('clients', sa.Column('sms_enabled', sa.Boolean(), nullable=True))
    op.add_column('clients', sa.Column('email_enabled', sa.Boolean(), nullable=True))
    op.add_column('clients', sa.Column('marketing_enabled', sa.Boolean(), nullable=True))
    op.alter_column('clients', 'date_of_birth',
               existing_type=sa.DATETIME(),
               type_=sa.Date(),
               existing_nullable=True)
    op.create_foreign_key(None, 'clients', 'users', ['barber_id'], ['id'])
    op.add_column('payments', sa.Column('barber_id', sa.Integer(), nullable=True))
    op.add_column('payments', sa.Column('stripe_payment_intent_id', sa.String(), nullable=True))
    op.add_column('payments', sa.Column('platform_fee', sa.Float(), nullable=True))
    op.add_column('payments', sa.Column('barber_amount', sa.Float(), nullable=True))
    op.add_column('payments', sa.Column('commission_rate', sa.Float(), nullable=True))
    op.add_column('payments', sa.Column('refund_amount', sa.Float(), nullable=True))
    op.add_column('payments', sa.Column('refund_reason', sa.String(), nullable=True))
    op.add_column('payments', sa.Column('refunded_at', sa.DateTime(), nullable=True))
    op.add_column('payments', sa.Column('stripe_refund_id', sa.String(), nullable=True))
    op.add_column('payments', sa.Column('gift_certificate_id', sa.Integer(), nullable=True))
    op.add_column('payments', sa.Column('gift_certificate_amount_used', sa.Float(), nullable=True))
    op.add_column('payments', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.create_foreign_key(None, 'payments', 'gift_certificates', ['gift_certificate_id'], ['id'])
    op.create_foreign_key(None, 'payments', 'users', ['barber_id'], ['id'])
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('stripe_account_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('stripe_account_status', sa.String(), nullable=True))
    op.add_column('users', sa.Column('commission_rate', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('google_calendar_credentials', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('google_calendar_id', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'google_calendar_id')
    op.drop_column('users', 'google_calendar_credentials')
    op.drop_column('users', 'commission_rate')
    op.drop_column('users', 'stripe_account_status')
    op.drop_column('users', 'stripe_account_id')
    op.drop_column('users', 'phone')
    op.drop_constraint(None, 'payments', type_='foreignkey')
    op.drop_constraint(None, 'payments', type_='foreignkey')
    op.drop_column('payments', 'updated_at')
    op.drop_column('payments', 'gift_certificate_amount_used')
    op.drop_column('payments', 'gift_certificate_id')
    op.drop_column('payments', 'stripe_refund_id')
    op.drop_column('payments', 'refunded_at')
    op.drop_column('payments', 'refund_reason')
    op.drop_column('payments', 'refund_amount')
    op.drop_column('payments', 'commission_rate')
    op.drop_column('payments', 'barber_amount')
    op.drop_column('payments', 'platform_fee')
    op.drop_column('payments', 'stripe_payment_intent_id')
    op.drop_column('payments', 'barber_id')
    op.drop_constraint(None, 'clients', type_='foreignkey')
    op.alter_column('clients', 'date_of_birth',
               existing_type=sa.Date(),
               type_=sa.DATETIME(),
               existing_nullable=True)
    op.drop_column('clients', 'marketing_enabled')
    op.drop_column('clients', 'email_enabled')
    op.drop_column('clients', 'sms_enabled')
    op.drop_column('clients', 'barber_id')
    op.drop_constraint(None, 'appointments', type_='foreignkey')
    op.drop_constraint(None, 'appointments', type_='foreignkey')
    op.create_index(op.f('ix_appointments_client_id'), 'appointments', ['client_id'], unique=False)
    op.drop_column('appointments', 'service_id')
    # ### end Alembic commands ###
