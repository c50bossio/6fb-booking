"""add webhook tracking tables

Revision ID: cc37bfcea4c5
Revises: 60abeabbd32b
Create Date: 2025-07-19 14:05:53.071223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc37bfcea4c5'
down_revision: Union[str, Sequence[str], None] = '60abeabbd32b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create webhook_events table
    op.create_table('webhook_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_id', sa.String(length=255), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('headers', sa.Text(), nullable=True),
        sa.Column('source_ip', sa.String(length=45), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=True),
        sa.Column('result', sa.Text(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_events_event_id'), 'webhook_events', ['event_id'], unique=True)
    op.create_index(op.f('ix_webhook_events_source'), 'webhook_events', ['source'], unique=False)
    op.create_index(op.f('ix_webhook_events_status'), 'webhook_events', ['status'], unique=False)
    
    # Create webhook_retries table
    op.create_table('webhook_retries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('webhook_event_id', sa.Integer(), nullable=False),
        sa.Column('retry_at', sa.DateTime(), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['webhook_event_id'], ['webhook_events.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_retries_retry_at'), 'webhook_retries', ['retry_at'], unique=False)
    
    # Create webhook_dead_letters table
    op.create_table('webhook_dead_letters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_id', sa.String(length=255), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('headers', sa.Text(), nullable=True),
        sa.Column('final_error', sa.Text(), nullable=True),
        sa.Column('total_attempts', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('resolved', sa.Boolean(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_dead_letters_source'), 'webhook_dead_letters', ['source'], unique=False)
    
    # Add dispute tracking columns to payments table if they don't exist
    with op.batch_alter_table('payments', schema=None) as batch_op:
        # Check if columns exist before adding them
        try:
            batch_op.add_column(sa.Column('dispute_status', sa.String(length=50), nullable=True))
            batch_op.add_column(sa.Column('dispute_reason', sa.String(length=100), nullable=True))
            batch_op.add_column(sa.Column('dispute_amount', sa.Float(), nullable=True))
        except:
            # Columns might already exist
            pass


def downgrade() -> None:
    """Downgrade schema."""
    # Drop dispute tracking columns from payments table
    with op.batch_alter_table('payments', schema=None) as batch_op:
        try:
            batch_op.drop_column('dispute_amount')
            batch_op.drop_column('dispute_reason')
            batch_op.drop_column('dispute_status')
        except:
            # Columns might not exist
            pass
    
    # Drop webhook tables
    op.drop_index(op.f('ix_webhook_dead_letters_source'), table_name='webhook_dead_letters')
    op.drop_table('webhook_dead_letters')
    op.drop_index(op.f('ix_webhook_retries_retry_at'), table_name='webhook_retries')
    op.drop_table('webhook_retries')
    op.drop_index(op.f('ix_webhook_events_status'), table_name='webhook_events')
    op.drop_index(op.f('ix_webhook_events_source'), table_name='webhook_events')
    op.drop_index(op.f('ix_webhook_events_event_id'), table_name='webhook_events')
    op.drop_table('webhook_events')
