"""remove_profile_slug_non_marketplace

Revision ID: 1dcae95b6716
Revises: c9eeb8e2ea98
Create Date: 2025-07-23 14:13:55.027687

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1dcae95b6716'
down_revision: Union[str, Sequence[str], None] = 'c9eeb8e2ea98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove profile_slug field - BookedBarber V2 is NOT a marketplace."""
    # Drop index first
    op.drop_index('ix_users_profile_slug', table_name='users')
    
    # Remove profile_slug column
    op.drop_column('users', 'profile_slug')


def downgrade() -> None:
    """Re-add profile_slug field if needed."""
    # Add profile_slug column back
    op.add_column('users', sa.Column('profile_slug', sa.String(length=100), nullable=True))
    
    # Recreate index
    op.create_index('ix_users_profile_slug', 'users', ['profile_slug'], unique=True)
