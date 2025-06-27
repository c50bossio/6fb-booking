"""merge_payment_nullable_with_pay_in_person

Revision ID: 44c0c356048e
Revises: 0b500d46ad33, d87735d29a9c
Create Date: 2025-06-27 14:54:56.194698

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "44c0c356048e"
down_revision = ("0b500d46ad33", "d87735d29a9c")  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
