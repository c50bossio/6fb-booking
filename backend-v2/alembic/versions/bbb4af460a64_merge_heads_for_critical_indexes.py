"""merge_heads_for_critical_indexes

Revision ID: bbb4af460a64
Revises: create_gamification_system, e3be4567db56
Create Date: 2025-07-28 04:57:28.886971

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbb4af460a64'
down_revision: Union[str, Sequence[str], None] = ('create_gamification_system', 'e3be4567db56')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
