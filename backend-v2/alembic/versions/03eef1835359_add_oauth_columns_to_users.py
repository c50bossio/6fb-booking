"""add_oauth_columns_to_users

Revision ID: 03eef1835359
Revises: b369573ec519
Create Date: 2025-07-14 23:36:02.002212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '03eef1835359'
down_revision: Union[str, Sequence[str], None] = 'b369573ec519'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add OAuth columns to users table
    op.add_column('users', sa.Column('is_oauth_user', sa.Boolean(), nullable=True, default=False))
    op.add_column('users', sa.Column('oauth_provider', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('oauth_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('profile_picture_url', sa.String(500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove OAuth columns from users table
    op.drop_column('users', 'profile_picture_url')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')
    op.drop_column('users', 'is_oauth_user')
