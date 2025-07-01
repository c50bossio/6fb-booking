"""Add location_id to users for enterprise features

Revision ID: 1e2bca78ae85
Revises: 399b7f3da2a0
Create Date: 2025-06-29 15:06:48.388427

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e2bca78ae85'
down_revision: Union[str, Sequence[str], None] = '399b7f3da2a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add location_id column to users table for enterprise features
    op.add_column('users', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_location_id', 'users', 'barbershop_locations', ['location_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove location_id column and foreign key
    op.drop_constraint('fk_users_location_id', 'users', type_='foreignkey')
    op.drop_column('users', 'location_id')
