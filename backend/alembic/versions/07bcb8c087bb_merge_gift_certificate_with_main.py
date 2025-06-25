"""merge_gift_certificate_with_main

Revision ID: 07bcb8c087bb
Revises: ab7a9ad76dc6, add_gift_certificate_tables
Create Date: 2025-06-25 17:38:54.170641

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "07bcb8c087bb"
down_revision = ("ab7a9ad76dc6", "add_gift_certificate_tables")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
