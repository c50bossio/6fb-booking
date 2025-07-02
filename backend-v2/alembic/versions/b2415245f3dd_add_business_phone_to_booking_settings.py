"""add_business_phone_to_booking_settings

Revision ID: b2415245f3dd
Revises: aeb40f6d8bbb
Create Date: 2025-07-01 21:41:26.031218

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2415245f3dd'
down_revision: Union[str, Sequence[str], None] = 'aeb40f6d8bbb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add business_phone column to booking_settings table
    op.add_column('booking_settings', sa.Column('business_phone', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove business_phone column from booking_settings table
    op.drop_column('booking_settings', 'business_phone')
