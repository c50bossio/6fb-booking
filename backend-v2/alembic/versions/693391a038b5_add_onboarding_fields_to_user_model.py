"""Add onboarding fields to User model

Revision ID: 693391a038b5
Revises: 73be971fc289
Create Date: 2025-07-04 18:28:35.196309

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '693391a038b5'
down_revision: Union[str, Sequence[str], None] = '73be971fc289'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add onboarding fields to users table
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('onboarding_status', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('is_new_user', sa.Boolean(), nullable=True, server_default='true'))
    
    # Set default values for existing users (SQLite compatible)
    op.execute("UPDATE users SET onboarding_completed = true, is_new_user = false WHERE created_at < datetime('now')")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove onboarding fields from users table
    op.drop_column('users', 'is_new_user')
    op.drop_column('users', 'onboarding_status')
    op.drop_column('users', 'onboarding_completed')
