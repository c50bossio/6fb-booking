"""Add service subscription models and tables

Revision ID: 27cfdbd7a6ba
Revises: 68810d27f8d2
Create Date: 2025-07-22 07:11:04.050735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '27cfdbd7a6ba'
down_revision: Union[str, Sequence[str], None] = '68810d27f8d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create service subscription templates table
    op.create_table('service_subscription_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('subscription_type', sa.Enum('MONTHLY_PLAN', 'SERVICE_BUNDLE', 'MAINTENANCE_PLAN', 'VIP_MEMBERSHIP', 'CUSTOM_PACKAGE', name='subscriptiontype'), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('original_price', sa.Float(), nullable=True),
        sa.Column('billing_interval', sa.Enum('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME', name='billinginterval'), nullable=False),
        sa.Column('services_per_period', sa.Integer(), nullable=True),
        sa.Column('rollover_unused', sa.Boolean(), nullable=True),
        sa.Column('max_rollover', sa.Integer(), nullable=True),
        sa.Column('duration_months', sa.Integer(), nullable=True),
        sa.Column('min_commitment_months', sa.Integer(), nullable=True),
        sa.Column('early_cancellation_fee', sa.Float(), nullable=True),
        sa.Column('min_days_between_services', sa.Integer(), nullable=True),
        sa.Column('max_advance_booking_days', sa.Integer(), nullable=True),
        sa.Column('blackout_dates', sa.JSON(), nullable=True),
        sa.Column('priority_booking', sa.Boolean(), nullable=True),
        sa.Column('discount_on_additional', sa.Float(), nullable=True),
        sa.Column('free_product_samples', sa.Boolean(), nullable=True),
        sa.Column('vip_perks', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('max_subscribers', sa.Integer(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_service_subscription_templates_id'), 'service_subscription_templates', ['id'], unique=False)

    # Create subscription template services junction table
    op.create_table('subscription_template_services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('quantity_per_period', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['service_subscription_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscription_template_services_id'), 'subscription_template_services', ['id'], unique=False)

    # Create service subscriptions table
    op.create_table('service_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAST_DUE', name='subscriptionstatus'), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('next_billing_date', sa.DateTime(), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(), nullable=True),
        sa.Column('stripe_customer_id', sa.String(), nullable=True),
        sa.Column('services_used_current_period', sa.Integer(), nullable=True),
        sa.Column('services_rolled_over', sa.Integer(), nullable=True),
        sa.Column('total_services_available', sa.Integer(), nullable=True),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('last_payment_date', sa.DateTime(), nullable=True),
        sa.Column('last_payment_amount', sa.Float(), nullable=True),
        sa.Column('failed_payment_count', sa.Integer(), nullable=True),
        sa.Column('custom_price', sa.Float(), nullable=True),
        sa.Column('custom_services_per_period', sa.Integer(), nullable=True),
        sa.Column('custom_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['service_subscription_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_service_subscriptions_id'), 'service_subscriptions', ['id'], unique=False)

    # Create subscription usage records table
    op.create_table('subscription_usage_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=True),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('billing_period_start', sa.DateTime(), nullable=True),
        sa.Column('billing_period_end', sa.DateTime(), nullable=True),
        sa.Column('service_value', sa.Float(), nullable=True),
        sa.Column('discount_applied', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('refunded', sa.Boolean(), nullable=True),
        sa.Column('refunded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.ForeignKeyConstraint(['subscription_id'], ['service_subscriptions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscription_usage_records_id'), 'subscription_usage_records', ['id'], unique=False)

    # Create subscription billing events table
    op.create_table('subscription_billing_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('stripe_invoice_id', sa.String(), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.String(), nullable=True),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('billing_period_start', sa.DateTime(), nullable=True),
        sa.Column('billing_period_end', sa.DateTime(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=True),
        sa.Column('event_metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['subscription_id'], ['service_subscriptions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscription_billing_events_id'), 'subscription_billing_events', ['id'], unique=False)

    # Create performance indexes
    op.create_index('idx_service_subscriptions_client_status', 'service_subscriptions', ['client_id', 'status'], unique=False)
    op.create_index('idx_service_subscriptions_barber_status', 'service_subscriptions', ['barber_id', 'status'], unique=False)
    op.create_index('idx_service_subscriptions_next_billing', 'service_subscriptions', ['next_billing_date', 'status'], unique=False)
    op.create_index('idx_subscription_usage_subscription_date', 'subscription_usage_records', ['subscription_id', 'used_at'], unique=False)
    op.create_index('idx_subscription_billing_events_subscription', 'subscription_billing_events', ['subscription_id', 'occurred_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('idx_subscription_billing_events_subscription', table_name='subscription_billing_events')
    op.drop_index('idx_subscription_usage_subscription_date', table_name='subscription_usage_records')
    op.drop_index('idx_service_subscriptions_next_billing', table_name='service_subscriptions')
    op.drop_index('idx_service_subscriptions_barber_status', table_name='service_subscriptions')
    op.drop_index('idx_service_subscriptions_client_status', table_name='service_subscriptions')

    # Drop tables in reverse order
    op.drop_index(op.f('ix_subscription_billing_events_id'), table_name='subscription_billing_events')
    op.drop_table('subscription_billing_events')
    op.drop_index(op.f('ix_subscription_usage_records_id'), table_name='subscription_usage_records')
    op.drop_table('subscription_usage_records')
    op.drop_index(op.f('ix_service_subscriptions_id'), table_name='service_subscriptions')
    op.drop_table('service_subscriptions')
    op.drop_index(op.f('ix_subscription_template_services_id'), table_name='subscription_template_services')
    op.drop_table('subscription_template_services')
    op.drop_index(op.f('ix_service_subscription_templates_id'), table_name='service_subscription_templates')
    op.drop_table('service_subscription_templates')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS subscriptionstatus')
    op.execute('DROP TYPE IF EXISTS billinginterval') 
    op.execute('DROP TYPE IF EXISTS subscriptiontype')
