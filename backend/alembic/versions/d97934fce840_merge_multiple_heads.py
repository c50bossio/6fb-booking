"""merge_multiple_heads

Revision ID: d97934fce840
Revises: 113ca336f773, add_local_seo_models, add_pin_authentication_system, add_pos_sessions_table, add_product_catalog_tables
Create Date: 2025-06-27 09:52:14.523216

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d97934fce840"  # pragma: allowlist secret
down_revision = (
    "113ca336f773",
    "add_local_seo_models",
    "add_pin_authentication_system",
    "add_pos_sessions_table",
    "add_product_catalog_tables",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
