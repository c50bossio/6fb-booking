"""Merge analytics indexes with main branch

Revision ID: 124092957e6d
Revises: 8f33e6d146fa, add_analytics_indexes
Create Date: 2025-07-08 21:58:54.490413

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '124092957e6d'
down_revision: Union[str, Sequence[str], None] = ('8f33e6d146fa', 'add_analytics_indexes')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
