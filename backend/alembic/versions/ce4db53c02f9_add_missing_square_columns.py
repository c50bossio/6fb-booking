"""add_missing_square_columns

Revision ID: ce4db53c02f9
Revises: 44c0c356048e
Create Date: 2025-06-27 20:24:55.132426

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ce4db53c02f9"
down_revision = "44c0c356048e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to payment_integrations table
    op.add_column(
        "payment_integrations",
        sa.Column("square_last_sync", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "payment_integrations",
        sa.Column("shopify_shop_domain", sa.String(200), nullable=True),
    )
    op.add_column(
        "payment_integrations",
        sa.Column("shopify_access_token", sa.String(200), nullable=True),
    )
    op.add_column(
        "payment_integrations",
        sa.Column("shopify_webhook_secret", sa.String(200), nullable=True),
    )
    op.add_column(
        "payment_integrations",
        sa.Column(
            "shopify_environment", sa.String(20), default="development", nullable=True
        ),
    )
    op.add_column(
        "payment_integrations",
        sa.Column("shopify_last_sync", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    # Remove the added columns
    op.drop_column("payment_integrations", "shopify_last_sync")
    op.drop_column("payment_integrations", "shopify_environment")
    op.drop_column("payment_integrations", "shopify_webhook_secret")
    op.drop_column("payment_integrations", "shopify_access_token")
    op.drop_column("payment_integrations", "shopify_shop_domain")
    op.drop_column("payment_integrations", "square_last_sync")
