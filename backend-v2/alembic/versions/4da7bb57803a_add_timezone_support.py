"""Add timezone support

Revision ID: 4da7bb57803a
Revises: 
Create Date: 2025-06-28 13:22:17.966760

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4da7bb57803a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add timezone column to users table
    op.add_column('users', sa.Column('timezone', sa.String(50), nullable=True, server_default='UTC'))
    
    # Add business_timezone column to booking_settings table
    op.add_column('booking_settings', sa.Column('business_timezone', sa.String(50), nullable=True, server_default='America/New_York'))
    
    # Update existing rows to have default values
    op.execute("UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL")
    op.execute("UPDATE booking_settings SET business_timezone = 'America/New_York' WHERE business_timezone IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the timezone columns
    op.drop_column('users', 'timezone')
    op.drop_column('booking_settings', 'business_timezone')
