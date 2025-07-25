"""Merge migration heads

Revision ID: 934cd322bd4a
Revises: add_ai_agent_tables, c5d467b24e4f
Create Date: 2025-07-03 19:45:52.618489

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '934cd322bd4a'
down_revision: Union[str, Sequence[str], None] = ('add_ai_agent_tables', 'c5d467b24e4f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
