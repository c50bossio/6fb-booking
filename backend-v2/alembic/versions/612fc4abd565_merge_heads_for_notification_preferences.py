"""merge_heads_for_notification_preferences

Revision ID: 612fc4abd565
Revises: 4df17937d4bb, marketing_suite_001
Create Date: 2025-07-01 07:46:46.511472

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '612fc4abd565'
down_revision: Union[str, Sequence[str], None] = ('4df17937d4bb', 'marketing_suite_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
