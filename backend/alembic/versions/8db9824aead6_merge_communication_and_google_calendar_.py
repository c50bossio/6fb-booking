"""Merge communication and google calendar branches

Revision ID: 8db9824aead6
Revises: add_communication_tables, add_google_calendar_event_id
Create Date: 2025-06-22 22:13:49.804904

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8db9824aead6'
down_revision = ('add_communication_tables', 'add_google_calendar_event_id')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass