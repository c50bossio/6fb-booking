"""merge_notification_system_heads

Revision ID: 5cc2d7ebb62c
Revises: comprehensive_timezone_support_20250703, dd6da0a86472, optimize_appointments_indexes_20250702
Create Date: 2025-07-02 20:24:59.925822

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5cc2d7ebb62c'
down_revision: Union[str, Sequence[str], None] = ('comprehensive_timezone_support_20250703', 'dd6da0a86472', 'optimize_appointments_indexes_20250702')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
