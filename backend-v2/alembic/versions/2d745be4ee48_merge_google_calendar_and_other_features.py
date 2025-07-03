"""merge google calendar and other features

Revision ID: 2d745be4ee48
Revises: 769e76ff65d7, add_conversion_tracking, google_calendar_integration
Create Date: 2025-07-03 09:47:33.699609

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d745be4ee48'
down_revision: Union[str, Sequence[str], None] = ('769e76ff65d7', 'add_conversion_tracking', 'google_calendar_integration')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
