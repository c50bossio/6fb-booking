"""merge_all_current_heads

Revision ID: ab7a9ad76dc6
Revises: add_ai_revenue_analytics, add_email_campaign_tables, add_enhanced_payment_fields, add_payment_processor_preferences
Create Date: 2025-06-25 07:47:56.321165

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ab7a9ad76dc6"
down_revision = (
    "add_ai_revenue_analytics",
    "add_email_campaign_tables",
    "add_enhanced_payment_fields",
    "add_payment_processor_preferences",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
