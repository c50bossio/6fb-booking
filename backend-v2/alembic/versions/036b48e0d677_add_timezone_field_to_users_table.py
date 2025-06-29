"""Add timezone field to users table

Revision ID: 036b48e0d677
Revises: 4da7bb57803a
Create Date: 2025-06-28 13:22:30.244256

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '036b48e0d677'
down_revision: Union[str, Sequence[str], None] = '4da7bb57803a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add timezone column to users table with default 'UTC'
    op.add_column('users', sa.Column('timezone', sa.String(length=50), nullable=True))
    
    # Set default value for existing records
    op.execute("UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL")
    
    # Make column non-nullable after setting defaults
    op.alter_column('users', 'timezone', nullable=False, server_default='UTC')


def downgrade() -> None:
    """Downgrade schema."""
    # Remove timezone column from users table
    op.drop_column('users', 'timezone')
