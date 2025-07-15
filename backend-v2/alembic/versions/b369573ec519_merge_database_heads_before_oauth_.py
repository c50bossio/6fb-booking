"""Merge database heads before OAuth migration

Revision ID: b369573ec519
Revises: 8f33e6d146fa, add_enhanced_ai_agent_models_20250713
Create Date: 2025-07-14 22:44:36.349441

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b369573ec519'
down_revision: Union[str, Sequence[str], None] = ('8f33e6d146fa', 'add_enhanced_ai_agent_models_20250713')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
