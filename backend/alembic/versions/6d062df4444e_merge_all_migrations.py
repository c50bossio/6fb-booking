"""merge_all_migrations

Revision ID: 6d062df4444e
Revises: 8db9824aead6, add_performance_indexes
Create Date: 2025-06-23 06:57:15.396204

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6d062df4444e"  # pragma: allowlist secret
down_revision = ("8db9824aead6", "add_performance_indexes")  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
