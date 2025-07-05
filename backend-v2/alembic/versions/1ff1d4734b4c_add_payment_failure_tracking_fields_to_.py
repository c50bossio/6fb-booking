"""Add payment failure tracking fields to organizations

Revision ID: 1ff1d4734b4c
Revises: 55cc3336150f
Create Date: 2025-07-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ff1d4734b4c'
down_revision: Union[str, None] = '55cc3336150f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add payment failure tracking columns
    op.add_column('organizations', sa.Column('payment_status', sa.String(length=20), nullable=True, comment='active/failed/pending'))
    op.add_column('organizations', sa.Column('last_payment_failure', sa.DateTime(), nullable=True, comment='Last payment failure timestamp'))
    op.add_column('organizations', sa.Column('next_payment_retry', sa.DateTime(), nullable=True, comment='Next scheduled payment retry'))
    op.add_column('organizations', sa.Column('payment_failure_history', sa.JSON(), nullable=True, comment='History of payment failures'))
    
    # Set default payment_status for existing records
    op.execute("UPDATE organizations SET payment_status = 'active' WHERE payment_status IS NULL")


def downgrade() -> None:
    # Remove payment failure tracking columns
    op.drop_column('organizations', 'payment_failure_history')
    op.drop_column('organizations', 'next_payment_retry')
    op.drop_column('organizations', 'last_payment_failure')
    op.drop_column('organizations', 'payment_status')