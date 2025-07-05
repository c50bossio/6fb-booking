"""Add permission columns to user_organizations

Revision ID: 12f0261105f3
Revises: 5be230588964
Create Date: 2025-07-04 14:58:45.837426

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12f0261105f3'
down_revision: Union[str, Sequence[str], None] = '5be230588964'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add granular permission columns to user_organizations
    with op.batch_alter_table('user_organizations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('can_manage_billing', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('can_manage_staff', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('can_view_analytics', sa.Boolean(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('last_accessed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove permission columns
    with op.batch_alter_table('user_organizations', schema=None) as batch_op:
        batch_op.drop_column('last_accessed_at')
        batch_op.drop_column('can_view_analytics')
        batch_op.drop_column('can_manage_staff')
        batch_op.drop_column('can_manage_billing')
