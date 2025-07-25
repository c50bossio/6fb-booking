"""add organization tables for business hierarchy

Revision ID: 55cc3336150f
Revises: ee9301f9eef5
Create Date: 2025-07-04 12:46:14.793560

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '55cc3336150f'
down_revision: Union[str, Sequence[str], None] = 'ee9301f9eef5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
