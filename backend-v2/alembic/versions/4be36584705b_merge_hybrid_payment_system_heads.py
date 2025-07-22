"""merge_hybrid_payment_system_heads

Revision ID: 4be36584705b
Revises: 84384b18be74, payment_indexes_001, add_performance_indexes, perf_idx_20250721
Create Date: 2025-07-21 20:13:37.156688

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4be36584705b'
down_revision: Union[str, Sequence[str], None] = ('84384b18be74', 'payment_indexes_001', 'add_performance_indexes', 'perf_idx_20250721')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
