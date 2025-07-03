"""merge gdpr compliance with existing heads

Revision ID: dd6da0a86472
Revises: 0a634d779624, add_double_booking_prevention, add_gdpr_compliance_tables
Create Date: 2025-07-02 19:44:49.003584

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd6da0a86472'
down_revision: Union[str, Sequence[str], None] = ('0a634d779624', 'add_double_booking_prevention', 'add_gdpr_compliance_tables')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
