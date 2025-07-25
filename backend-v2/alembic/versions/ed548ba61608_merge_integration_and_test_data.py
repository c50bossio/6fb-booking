"""merge_integration_and_test_data

Revision ID: ed548ba61608
Revises: a0442f2673db, add_integrations_table
Create Date: 2025-07-02 12:18:45.207400

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = 'ed548ba61608'
down_revision: Union[str, Sequence[str], None] = ('a0442f2673db', 'add_integrations_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
