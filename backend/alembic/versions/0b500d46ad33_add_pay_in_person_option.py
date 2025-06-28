"""add_pay_in_person_option

Revision ID: 0b500d46ad33
Revises: d97934fce840
Create Date: 2025-06-27 09:52:19.169152

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0b500d46ad33"
down_revision = "d97934fce840"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add pay_in_person_enabled column to locations table
    with op.batch_alter_table("locations", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "pay_in_person_enabled",
                sa.Boolean(),
                nullable=False,
                server_default="true",
            )
        )
        batch_op.add_column(
            sa.Column("pay_in_person_message", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    # Remove pay_in_person columns from locations table
    with op.batch_alter_table("locations", schema=None) as batch_op:
        batch_op.drop_column("pay_in_person_message")
        batch_op.drop_column("pay_in_person_enabled")
