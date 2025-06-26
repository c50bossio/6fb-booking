"""merge trial system with main

Revision ID: 113ca336f773
Revises: 07bcb8c087bb, add_trial_subscription_fields
Create Date: 2025-06-26 11:35:08.896729

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "113ca336f773"
down_revision = ("07bcb8c087bb", "add_trial_subscription_fields")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
