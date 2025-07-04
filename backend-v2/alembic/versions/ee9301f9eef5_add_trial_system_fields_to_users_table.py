"""add trial system fields to users table

Revision ID: ee9301f9eef5
Revises: fa0a2801c3fb
Create Date: 2025-07-03 23:47:37.682182

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee9301f9eef5'
down_revision: Union[str, Sequence[str], None] = 'fa0a2801c3fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add trial system fields to users table
    op.add_column('users', sa.Column('user_type', sa.String(), nullable=True))
    op.add_column('users', sa.Column('trial_started_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('trial_expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('trial_active', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('subscription_status', sa.String(), nullable=True))
    
    # Set default values for existing users
    op.execute("UPDATE users SET user_type = 'client' WHERE user_type IS NULL")
    op.execute("UPDATE users SET trial_active = 1 WHERE trial_active IS NULL")
    op.execute("UPDATE users SET subscription_status = 'active' WHERE subscription_status IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove trial system fields
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'trial_active')
    op.drop_column('users', 'trial_expires_at')
    op.drop_column('users', 'trial_started_at')
    op.drop_column('users', 'user_type')
