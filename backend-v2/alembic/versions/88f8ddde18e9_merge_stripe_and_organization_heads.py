"""merge_stripe_and_organization_heads

Revision ID: 88f8ddde18e9
Revises: 9e94ca70cc82, add_stripe_fields
Create Date: 2025-07-04 13:58:49.132524

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '88f8ddde18e9'
down_revision: Union[str, Sequence[str], None] = ('9e94ca70cc82', 'add_stripe_fields')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
