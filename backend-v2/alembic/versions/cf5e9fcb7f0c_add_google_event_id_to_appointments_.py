"""Add google_event_id to appointments table

Revision ID: cf5e9fcb7f0c
Revises: 1147e723399c
Create Date: 2025-06-28 15:56:22.750407

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf5e9fcb7f0c'
down_revision: Union[str, Sequence[str], None] = '1147e723399c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add google_event_id column to appointments table
    op.add_column('appointments', sa.Column('google_event_id', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove google_event_id column from appointments table
    op.drop_column('appointments', 'google_event_id')
