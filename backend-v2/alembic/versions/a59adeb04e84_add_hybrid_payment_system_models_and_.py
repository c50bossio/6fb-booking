"""add_hybrid_payment_system_models_and_user_fields

Revision ID: a59adeb04e84
Revises: 4be36584705b
Create Date: 2025-07-21 20:13:40.928770

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a59adeb04e84'
down_revision: Union[str, Sequence[str], None] = '4be36584705b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add hybrid payment system models and user fields."""
    
    # Add columns to users table for hybrid payment system
    op.add_column('users', sa.Column('payment_mode', sa.String(20), nullable=False, server_default='centralized'))
    op.add_column('users', sa.Column('external_payment_processor', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('external_account_config', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('collection_preferences', sa.JSON(), nullable=True))
    
    # Create payment_processor_connections table
    op.create_table(
        'payment_processor_connections',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('barber_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('processor_type', sa.Enum('stripe', 'square', 'paypal', 'clover', 'toast', 'shopify', 'custom', name='externalpaymentprocessor'), nullable=False),
        sa.Column('account_id', sa.String(255), nullable=False),
        sa.Column('account_name', sa.String(255), nullable=True),
        sa.Column('status', sa.Enum('pending', 'connected', 'expired', 'disconnected', 'error', name='connectionstatus'), nullable=False, server_default='pending'),
        sa.Column('connection_data', sa.JSON(), nullable=True),
        sa.Column('webhook_url', sa.String(500), nullable=True),
        sa.Column('webhook_secret', sa.String(255), nullable=True),
        sa.Column('supports_payments', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('supports_refunds', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('supports_recurring', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('default_currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('processing_fees', sa.JSON(), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('last_transaction_at', sa.DateTime(), nullable=True),
        sa.Column('total_transactions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_volume', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('connected_at', sa.DateTime(), nullable=True),
        sa.Column('disconnected_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('error_count', sa.Integer(), nullable=False, server_default='0')
    )
    
    # Create external_transactions table
    op.create_table(
        'external_transactions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('connection_id', sa.Integer(), sa.ForeignKey('payment_processor_connections.id'), nullable=False, index=True),
        sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True, index=True),
        sa.Column('external_transaction_id', sa.String(255), nullable=False, index=True),
        sa.Column('external_charge_id', sa.String(255), nullable=True),
        sa.Column('external_customer_id', sa.String(255), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('processing_fee', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('net_amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('last_four', sa.String(4), nullable=True),
        sa.Column('brand', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('refunded_at', sa.DateTime(), nullable=True),
        sa.Column('refund_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('commission_rate', sa.Float(), nullable=True),
        sa.Column('commission_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('commission_collected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('external_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    
    # Create platform_collections table
    op.create_table(
        'platform_collections',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('barber_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('connection_id', sa.Integer(), sa.ForeignKey('payment_processor_connections.id'), nullable=True, index=True),
        sa.Column('external_transaction_id', sa.Integer(), sa.ForeignKey('external_transactions.id'), nullable=True, index=True),
        sa.Column('collection_type', sa.Enum('commission', 'booth_rent', 'platform_fee', 'late_fee', 'adjustment', name='collectiontype'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reference_id', sa.String(255), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('period_start', sa.DateTime(), nullable=True),
        sa.Column('period_end', sa.DateTime(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('grace_period_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('status', sa.Enum('pending', 'due', 'processing', 'collected', 'failed', 'disputed', 'waived', name='collectionstatus'), nullable=False, server_default='pending'),
        sa.Column('collection_method', sa.String(50), nullable=True),
        sa.Column('collection_account', sa.String(255), nullable=True),
        sa.Column('external_collection_id', sa.String(255), nullable=True),
        sa.Column('collected_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('next_retry_at', sa.DateTime(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('dispute_reason', sa.Text(), nullable=True),
        sa.Column('waived_reason', sa.Text(), nullable=True),
        sa.Column('waived_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    
    # Create hybrid_payment_configs table
    op.create_table(
        'hybrid_payment_configs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('barber_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True, index=True),
        sa.Column('payment_mode', sa.Enum('centralized', 'decentralized', 'hybrid', name='paymentmode'), nullable=False, server_default='centralized'),
        sa.Column('primary_processor', sa.Enum('stripe', 'square', 'paypal', 'clover', 'toast', 'shopify', 'custom', name='externalpaymentprocessor'), nullable=True),
        sa.Column('fallback_to_platform', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('collection_method', sa.String(50), nullable=False, server_default='ach'),
        sa.Column('collection_frequency', sa.String(20), nullable=False, server_default='weekly'),
        sa.Column('collection_day', sa.Integer(), nullable=True),
        sa.Column('auto_collection', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('minimum_collection_amount', sa.Float(), nullable=False, server_default='10.0'),
        sa.Column('collection_buffer_days', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('maximum_outstanding', sa.Float(), nullable=False, server_default='1000.0'),
        sa.Column('notify_before_collection', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notification_days_ahead', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('collection_email', sa.String(255), nullable=True),
        sa.Column('collection_phone', sa.String(20), nullable=True),
        sa.Column('bank_account_config', sa.JSON(), nullable=True),
        sa.Column('backup_payment_method', sa.String(255), nullable=True),
        sa.Column('enable_installments', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('enable_early_payment_discount', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('early_payment_discount_rate', sa.Float(), nullable=False, server_default='0.02'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_collection_at', sa.DateTime(), nullable=True)
    )
    
    # Create payment_mode_history table
    op.create_table(
        'payment_mode_history',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('barber_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('previous_mode', sa.Enum('centralized', 'decentralized', 'hybrid', name='paymentmode'), nullable=True),
        sa.Column('new_mode', sa.Enum('centralized', 'decentralized', 'hybrid', name='paymentmode'), nullable=False),
        sa.Column('change_reason', sa.Text(), nullable=True),
        sa.Column('changed_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('effective_date', sa.DateTime(), nullable=False),
        sa.Column('pending_collections_affected', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('active_connections_affected', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )
    
    # Create indexes for performance
    op.create_index('idx_processor_connections_barber_status', 'payment_processor_connections', ['barber_id', 'status'])
    op.create_index('idx_external_transactions_connection_status', 'external_transactions', ['connection_id', 'status'])
    op.create_index('idx_external_transactions_appointment', 'external_transactions', ['appointment_id'])
    op.create_index('idx_platform_collections_barber_status', 'platform_collections', ['barber_id', 'status'])
    op.create_index('idx_platform_collections_due_date', 'platform_collections', ['due_date'])
    op.create_index('idx_platform_collections_type_status', 'platform_collections', ['collection_type', 'status'])


def downgrade() -> None:
    """Remove hybrid payment system models and user fields."""
    
    # Drop indexes
    op.drop_index('idx_platform_collections_type_status')
    op.drop_index('idx_platform_collections_due_date')
    op.drop_index('idx_platform_collections_barber_status')
    op.drop_index('idx_external_transactions_appointment')
    op.drop_index('idx_external_transactions_connection_status')
    op.drop_index('idx_processor_connections_barber_status')
    
    # Drop tables in reverse order
    op.drop_table('payment_mode_history')
    op.drop_table('hybrid_payment_configs')
    op.drop_table('platform_collections')
    op.drop_table('external_transactions')
    op.drop_table('payment_processor_connections')
    
    # Remove columns from users table
    op.drop_column('users', 'collection_preferences')
    op.drop_column('users', 'external_account_config')
    op.drop_column('users', 'external_payment_processor')
    op.drop_column('users', 'payment_mode')
    
    # Drop enums (SQLite doesn't support this, but keeping for completeness)
    # op.execute('DROP TYPE IF EXISTS paymentmode')
    # op.execute('DROP TYPE IF EXISTS externalpaymentprocessor')
    # op.execute('DROP TYPE IF EXISTS connectionstatus')
    # op.execute('DROP TYPE IF EXISTS collectiontype')
    # op.execute('DROP TYPE IF EXISTS collectionstatus')
