"""Merge heads

Revision ID: a0ed49b911af
Revises: 124092957e6d, add_org_to_payments
Create Date: 2025-07-09 06:28:34.989894

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = 'a0ed49b911af'
down_revision: Union[str, Sequence[str], None] = ('124092957e6d', 'add_org_to_payments')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
