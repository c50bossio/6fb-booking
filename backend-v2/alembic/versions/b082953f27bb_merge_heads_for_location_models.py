"""merge_heads_for_location_models

Revision ID: b082953f27bb
Revises: 0d12ce167173, add_webhook_tables
Create Date: 2025-06-29 12:43:08.349101

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = 'b082953f27bb'
down_revision: Union[str, Sequence[str], None] = ('0d12ce167173', 'add_webhook_tables')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
