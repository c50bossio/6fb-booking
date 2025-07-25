"""Merge heads before adding idempotency table

Revision ID: e49a7b87f641
Revises: 9bae8df87db7, add_api_keys_table
Create Date: 2025-07-02 13:14:12.810888

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = 'e49a7b87f641'
down_revision: Union[str, Sequence[str], None] = ('9bae8df87db7', 'add_api_keys_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
