"""merge_all_staging_heads

Revision ID: 6f65d833c956
Revises: 5cc2d7ebb62c, add_ai_analytics_20250703, add_cancellation_system, add_enhanced_recurring_appointments_20250703
Create Date: 2025-07-03 00:10:31.955275

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '6f65d833c956'
down_revision: Union[str, Sequence[str], None] = ('5cc2d7ebb62c', 'add_ai_analytics_20250703', 'add_cancellation_system', 'add_enhanced_recurring_appointments_20250703')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
