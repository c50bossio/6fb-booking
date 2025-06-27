"""make_appointment_id_nullable_add_payment_type

Revision ID: d87735d29a9c
Revises: d97934fce840
Create Date: 2025-06-27 14:53:50.577699

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "d87735d29a9c"  # pragma: allowlist secret
down_revision = "d97934fce840"  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if we're using SQLite
    conn = op.get_bind()
    is_sqlite = conn.dialect.name == "sqlite"

    if is_sqlite:
        # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        # First, rename the old table
        op.rename_table("payments", "payments_old")

        # Create new table with updated schema
        op.create_table(
            "payments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("appointment_id", sa.Integer(), nullable=True),  # Now nullable
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("payment_method_id", sa.Integer(), nullable=True),
            sa.Column("stripe_payment_intent_id", sa.String(255), nullable=False),
            sa.Column("stripe_charge_id", sa.String(255), nullable=True),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
            sa.Column("status", sa.String(50), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("failure_code", sa.String(100), nullable=True),
            sa.Column("failure_message", sa.Text(), nullable=True),
            sa.Column("receipt_url", sa.String(500), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            # New columns
            sa.Column("payment_type", sa.String(50), nullable=True),
            sa.Column("subscription_id", sa.String(255), nullable=True),
            sa.Column("price_id", sa.String(255), nullable=True),
            sa.Column(
                "billing_period_start", sa.DateTime(timezone=True), nullable=True
            ),
            sa.Column("billing_period_end", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

        # Copy data from old table
        op.execute(
            """
            INSERT INTO payments (
                id, appointment_id, user_id, payment_method_id,
                stripe_payment_intent_id, stripe_charge_id, amount, currency,
                status, description, metadata, failure_code, failure_message,
                receipt_url, created_at, updated_at, payment_type
            )
            SELECT
                id, appointment_id, user_id, payment_method_id,
                stripe_payment_intent_id, stripe_charge_id, amount, currency,
                status, description, metadata, failure_code, failure_message,
                receipt_url, created_at, updated_at, 'appointment'
            FROM payments_old
        """
        )

        # Drop old table
        op.drop_table("payments_old")

        # Create indexes
        op.create_index("idx_payments_appointment", "payments", ["appointment_id"])
        op.create_index("idx_payments_user_status", "payments", ["user_id", "status"])
        op.create_index("idx_payments_created_at", "payments", ["created_at"])
        op.create_index("idx_payments_subscription", "payments", ["subscription_id"])
        op.create_index("idx_payments_type", "payments", ["payment_type"])

    else:
        # PostgreSQL and other databases that support ALTER COLUMN
        # Add payment_type column to distinguish between appointment and subscription payments
        op.add_column(
            "payments", sa.Column("payment_type", sa.String(50), nullable=True)
        )

        # Set existing payments as appointment type
        op.execute(
            "UPDATE payments SET payment_type = 'appointment' WHERE appointment_id IS NOT NULL"
        )

        # Make appointment_id nullable
        op.alter_column(
            "payments", "appointment_id", existing_type=sa.INTEGER(), nullable=True
        )

        # Add subscription-related columns
        op.add_column(
            "payments", sa.Column("subscription_id", sa.String(255), nullable=True)
        )
        op.add_column("payments", sa.Column("price_id", sa.String(255), nullable=True))
        op.add_column(
            "payments",
            sa.Column(
                "billing_period_start", sa.DateTime(timezone=True), nullable=True
            ),
        )
        op.add_column(
            "payments",
            sa.Column("billing_period_end", sa.DateTime(timezone=True), nullable=True),
        )

        # Create index for subscription payments
        op.create_index("idx_payments_subscription", "payments", ["subscription_id"])
        op.create_index("idx_payments_type", "payments", ["payment_type"])

        # Add check constraint to ensure either appointment_id or subscription_id exists
        op.create_check_constraint(
            "check_payment_has_context",
            "payments",
            "(appointment_id IS NOT NULL AND payment_type = 'appointment') OR (subscription_id IS NOT NULL AND payment_type = 'subscription')",
        )


def downgrade() -> None:
    # Remove check constraint
    op.drop_constraint("check_payment_has_context", "payments", type_="check")

    # Drop indexes
    op.drop_index("idx_payments_subscription", table_name="payments")
    op.drop_index("idx_payments_type", table_name="payments")

    # Remove subscription-related columns
    op.drop_column("payments", "billing_period_end")
    op.drop_column("payments", "billing_period_start")
    op.drop_column("payments", "price_id")
    op.drop_column("payments", "subscription_id")

    # Make appointment_id not nullable again (this will fail if there are NULL values)
    op.alter_column(
        "payments", "appointment_id", existing_type=sa.INTEGER(), nullable=False
    )

    # Remove payment_type column
    op.drop_column("payments", "payment_type")
