"""Add Stripe fields to organization table

Revision ID: add_stripe_fields
Revises: 55cc3336150f
Create Date: 2025-01-04 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_stripe_fields'
down_revision = '55cc3336150f'
branch_labels = None
depends_on = None


def upgrade():
    # Add Stripe-related fields to organization table
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        # Stripe customer ID - already exists in some versions, so check first
        try:
            batch_op.add_column(sa.Column('stripe_customer_id', sa.String(255), nullable=True))
        except:
            pass  # Column might already exist
        
        # Stripe subscription ID - already exists but ensure it's there
        try:
            batch_op.add_column(sa.Column('stripe_subscription_id', sa.String(255), nullable=True))
        except:
            pass  # Column might already exist
        
        # Additional Stripe fields for better tracking
        batch_op.add_column(sa.Column('stripe_price_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('stripe_payment_method_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('stripe_subscription_item_id', sa.String(255), nullable=True))
        
        # Subscription status tracking
        batch_op.add_column(sa.Column('subscription_status', sa.String(50), nullable=True, server_default='trial'))
        batch_op.add_column(sa.Column('subscription_started_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('subscription_expires_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('subscription_cancelled_at', sa.DateTime(), nullable=True))
        
    # Create indexes for faster lookups
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.create_index('ix_organizations_stripe_customer_id', ['stripe_customer_id'])
        batch_op.create_index('ix_organizations_stripe_subscription_id', ['stripe_subscription_id'])
        batch_op.create_index('ix_organizations_subscription_status', ['subscription_status'])


def downgrade():
    # Remove indexes
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.drop_index('ix_organizations_subscription_status')
        batch_op.drop_index('ix_organizations_stripe_subscription_id')
        batch_op.drop_index('ix_organizations_stripe_customer_id')
    
    # Remove columns
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.drop_column('subscription_cancelled_at')
        batch_op.drop_column('subscription_expires_at')
        batch_op.drop_column('subscription_started_at')
        batch_op.drop_column('subscription_status')
        batch_op.drop_column('stripe_subscription_item_id')
        batch_op.drop_column('stripe_payment_method_id')
        batch_op.drop_column('stripe_price_id')
        # Don't drop stripe_customer_id and stripe_subscription_id as they might be used elsewhere