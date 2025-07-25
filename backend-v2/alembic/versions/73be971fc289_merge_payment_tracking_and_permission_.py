"""Merge payment tracking and permission columns

Revision ID: 73be971fc289
Revises: 12f0261105f3, 1ff1d4734b4c
Create Date: 2025-07-04 18:21:00.655340

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '73be971fc289'
down_revision: Union[str, Sequence[str], None] = ('12f0261105f3', '1ff1d4734b4c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
