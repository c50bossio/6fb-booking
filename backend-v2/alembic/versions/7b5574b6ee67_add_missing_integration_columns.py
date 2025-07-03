"""add_missing_integration_columns

Revision ID: 7b5574b6ee67
Revises: ed548ba61608
Create Date: 2025-07-02 12:19:37.964249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '7b5574b6ee67'
down_revision: Union[str, Sequence[str], None] = 'ed548ba61608'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing columns to integrations table
    connection = op.get_bind()
    result = connection.execute(text("PRAGMA table_info(integrations)"))
    existing_columns = [row[1] for row in result]
    
    if 'health_check_data' not in existing_columns:
        op.add_column('integrations', sa.Column('health_check_data', sa.JSON(), nullable=True))
    
    if 'last_health_check' not in existing_columns:
        op.add_column('integrations', sa.Column('last_health_check', sa.DateTime(), nullable=True))
    
    if 'stripe_account_id' not in existing_columns:
        op.add_column('integrations', sa.Column('stripe_account_id', sa.String(255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the columns
    op.drop_column('integrations', 'stripe_account_id')
    op.drop_column('integrations', 'last_health_check')
    op.drop_column('integrations', 'health_check_data')
