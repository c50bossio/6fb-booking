"""Merge AI models migration with existing head

Revision ID: e26babfffafd
Revises: 7d9ed2831dfd, e69dd56e6788
Create Date: 2025-07-21 21:48:09.938774

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e26babfffafd'
down_revision: Union[str, Sequence[str], None] = ('7d9ed2831dfd', 'e69dd56e6788')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
