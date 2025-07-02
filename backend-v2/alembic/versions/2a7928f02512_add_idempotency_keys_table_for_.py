"""Add idempotency keys table for duplicate operation prevention

Revision ID: 2a7928f02512
Revises: e49a7b87f641
Create Date: 2025-07-02 13:14:16.635569

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a7928f02512'
down_revision: Union[str, Sequence[str], None] = 'e49a7b87f641'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create idempotency_keys table
    op.create_table(
        'idempotency_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('operation_type', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('request_hash', sa.String(length=64), nullable=False),
        sa.Column('response_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', name='uq_idempotency_key')
    )
    
    # Create indexes for efficient queries
    op.create_index('ix_idempotency_key', 'idempotency_keys', ['key'])
    op.create_index('ix_idempotency_operation_type', 'idempotency_keys', ['operation_type'])
    op.create_index('ix_idempotency_user_id', 'idempotency_keys', ['user_id'])
    op.create_index('ix_idempotency_expires_at', 'idempotency_keys', ['expires_at'])
    op.create_index('ix_idempotency_expires_created', 'idempotency_keys', ['expires_at', 'created_at'])
    op.create_index('ix_idempotency_operation_user', 'idempotency_keys', ['operation_type', 'user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes first
    op.drop_index('ix_idempotency_operation_user', 'idempotency_keys')
    op.drop_index('ix_idempotency_expires_created', 'idempotency_keys')
    op.drop_index('ix_idempotency_expires_at', 'idempotency_keys')
    op.drop_index('ix_idempotency_user_id', 'idempotency_keys')
    op.drop_index('ix_idempotency_operation_type', 'idempotency_keys')
    op.drop_index('ix_idempotency_key', 'idempotency_keys')
    
    # Drop table
    op.drop_table('idempotency_keys')
