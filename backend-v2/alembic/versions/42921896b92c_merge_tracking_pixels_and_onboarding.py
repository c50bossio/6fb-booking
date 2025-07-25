"""merge_tracking_pixels_and_onboarding

Revision ID: 42921896b92c
Revises: 693391a038b5, 958456e0ff67
Create Date: 2025-07-04 19:04:15.294486

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '42921896b92c'
down_revision: Union[str, Sequence[str], None] = ('693391a038b5', '958456e0ff67')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
