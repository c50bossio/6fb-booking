"""add google calendar event id to appointments

Revision ID: add_google_calendar_event_id
Revises: ea46f0e03b47
Create Date: 2025-06-22 14:30:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_google_calendar_event_id"
down_revision = "ea46f0e03b47"  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade():
    # Add google_calendar_event_id column to appointments table
    with op.batch_alter_table("appointments", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("google_calendar_event_id", sa.String(length=255), nullable=True)
        )


def downgrade():
    # Remove google_calendar_event_id column from appointments table
    with op.batch_alter_table("appointments", schema=None) as batch_op:
        batch_op.drop_column("google_calendar_event_id")
