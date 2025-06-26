"""Add SMS reminder tracking

Revision ID: add_sms_reminder_tracking
Revises: 8db9824aead6
Create Date: 2025-06-26 11:40:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_sms_reminder_tracking"  # pragma: allowlist secret
down_revision = "8db9824aead6"  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration was referenced but never existed
    # Creating empty migration to satisfy dependencies
    # Force redeploy trigger
    pass


def downgrade() -> None:
    pass
