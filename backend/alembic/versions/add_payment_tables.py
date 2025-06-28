"""Add payment tables

Revision ID: add_payment_tables
Revises:
Create Date: 2024-01-10 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_payment_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create stripe_customers table
    op.create_table(
        "stripe_customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("stripe_customer_id"),
    )
    op.create_index(
        op.f("ix_stripe_customers_stripe_customer_id"),
        "stripe_customers",
        ["stripe_customer_id"],
        unique=True,
    )

    # Create payment_methods table
    op.create_table(
        "payment_methods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stripe_payment_method_id", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("card_brand", sa.String(50), nullable=True),
        sa.Column("card_last4", sa.String(4), nullable=True),
        sa.Column("card_exp_month", sa.Integer(), nullable=True),
        sa.Column("card_exp_year", sa.Integer(), nullable=True),
        sa.Column("bank_name", sa.String(255), nullable=True),
        sa.Column("bank_last4", sa.String(4), nullable=True),
        sa.Column("wallet_type", sa.String(50), nullable=True),
        sa.Column("is_default", sa.Boolean(), default=False, nullable=False),
        sa.Column("meta_data", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_payment_method_id"),
    )
    op.create_index(
        op.f("ix_payment_methods_user_id"), "payment_methods", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_payment_methods_stripe_payment_method_id"),
        "payment_methods",
        ["stripe_payment_method_id"],
        unique=True,
    )

    # Create payment status enum
    payment_status_enum = postgresql.ENUM(
        "pending",
        "processing",
        "succeeded",
        "failed",
        "canceled",
        "refunded",
        "partially_refunded",
        name="payment_status",
    )
    payment_status_enum.create(op.get_bind())

    # Create payments table
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("payment_method_id", sa.Integer(), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=False),
        sa.Column("stripe_charge_id", sa.String(255), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),  # Amount in cents
        sa.Column("currency", sa.String(3), default="USD", nullable=False),
        sa.Column("status", payment_status_enum, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("receipt_email", sa.String(255), nullable=True),
        sa.Column("receipt_url", sa.String(500), nullable=True),
        sa.Column("failure_code", sa.String(100), nullable=True),
        sa.Column("failure_message", sa.Text(), nullable=True),
        sa.Column("meta_data", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["appointment_id"], ["appointments.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["payment_method_id"], ["payment_methods.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_payment_intent_id"),
    )
    op.create_index(op.f("ix_payments_user_id"), "payments", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_payments_appointment_id"), "payments", ["appointment_id"], unique=False
    )
    op.create_index(op.f("ix_payments_status"), "payments", ["status"], unique=False)
    op.create_index(
        op.f("ix_payments_created_at"), "payments", ["created_at"], unique=False
    )

    # Create refund status enum
    refund_status_enum = postgresql.ENUM(
        "pending", "succeeded", "failed", "canceled", name="refund_status"
    )
    refund_status_enum.create(op.get_bind())

    # Create refunds table
    op.create_table(
        "refunds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("stripe_refund_id", sa.String(255), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),  # Amount in cents
        sa.Column("currency", sa.String(3), default="USD", nullable=False),
        sa.Column("status", refund_status_enum, nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.String(255), nullable=True),
        sa.Column("meta_data", sa.JSON(), nullable=True),
        sa.Column("refunded_by_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["refunded_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_refund_id"),
    )
    op.create_index(
        op.f("ix_refunds_payment_id"), "refunds", ["payment_id"], unique=False
    )
    op.create_index(op.f("ix_refunds_status"), "refunds", ["status"], unique=False)

    # Create payment_webhook_events table
    op.create_table(
        "payment_webhook_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stripe_event_id", sa.String(255), nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("processed", sa.Boolean(), default=False, nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_event_id"),
    )
    op.create_index(
        op.f("ix_payment_webhook_events_type"),
        "payment_webhook_events",
        ["type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_webhook_events_processed"),
        "payment_webhook_events",
        ["processed"],
        unique=False,
    )

    # Create payment_reports table
    op.create_table(
        "payment_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_type", sa.String(50), nullable=False),
        sa.Column("date_from", sa.Date(), nullable=False),
        sa.Column("date_to", sa.Date(), nullable=False),
        sa.Column("total_amount", sa.Integer(), nullable=False),
        sa.Column("total_count", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), default="USD", nullable=False),
        sa.Column("breakdown_by_service", sa.JSON(), nullable=True),
        sa.Column("breakdown_by_barber", sa.JSON(), nullable=True),
        sa.Column("breakdown_by_payment_method", sa.JSON(), nullable=True),
        sa.Column("generated_by_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["generated_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payment_reports_date_from"),
        "payment_reports",
        ["date_from"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_reports_date_to"), "payment_reports", ["date_to"], unique=False
    )

    # Add payment-related columns to appointments table
    op.add_column(
        "appointments",
        sa.Column("payment_required", sa.Boolean(), default=True, nullable=False),
    )
    op.add_column(
        "appointments", sa.Column("payment_status", sa.String(50), nullable=True)
    )
    op.add_column("appointments", sa.Column("payment_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_appointments_payment_id",
        "appointments",
        "payments",
        ["payment_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Add payment-related columns to services table
    op.add_column(
        "services",
        sa.Column("requires_deposit", sa.Boolean(), default=False, nullable=False),
    )
    op.add_column(
        "services", sa.Column("deposit_amount", sa.Integer(), nullable=True)
    )  # Amount in cents

    # Create trigger to update updated_at timestamp
    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """
    )

    # Apply trigger to all payment tables
    for table in ["stripe_customers", "payment_methods", "payments", "refunds"]:
        op.execute(
            f"""
            CREATE TRIGGER update_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
        )


def downgrade():
    # Drop triggers
    for table in ["stripe_customers", "payment_methods", "payments", "refunds"]:
        op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table};")

    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    # Drop foreign keys and columns from existing tables
    op.drop_constraint("fk_appointments_payment_id", "appointments", type_="foreignkey")
    op.drop_column("appointments", "payment_id")
    op.drop_column("appointments", "payment_status")
    op.drop_column("appointments", "payment_required")
    op.drop_column("services", "deposit_amount")
    op.drop_column("services", "requires_deposit")

    # Drop indexes
    op.drop_index(op.f("ix_payment_reports_date_to"), table_name="payment_reports")
    op.drop_index(op.f("ix_payment_reports_date_from"), table_name="payment_reports")
    op.drop_index(
        op.f("ix_payment_webhook_events_processed"), table_name="payment_webhook_events"
    )
    op.drop_index(
        op.f("ix_payment_webhook_events_type"), table_name="payment_webhook_events"
    )
    op.drop_index(op.f("ix_refunds_status"), table_name="refunds")
    op.drop_index(op.f("ix_refunds_payment_id"), table_name="refunds")
    op.drop_index(op.f("ix_payments_created_at"), table_name="payments")
    op.drop_index(op.f("ix_payments_status"), table_name="payments")
    op.drop_index(op.f("ix_payments_appointment_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_user_id"), table_name="payments")
    op.drop_index(
        op.f("ix_payment_methods_stripe_payment_method_id"),
        table_name="payment_methods",
    )
    op.drop_index(op.f("ix_payment_methods_user_id"), table_name="payment_methods")
    op.drop_index(
        op.f("ix_stripe_customers_stripe_customer_id"), table_name="stripe_customers"
    )

    # Drop tables
    op.drop_table("payment_reports")
    op.drop_table("payment_webhook_events")
    op.drop_table("refunds")
    op.drop_table("payments")
    op.drop_table("payment_methods")
    op.drop_table("stripe_customers")

    # Drop enums
    refund_status_enum = postgresql.ENUM(
        "pending", "succeeded", "failed", "canceled", name="refund_status"
    )
    refund_status_enum.drop(op.get_bind())

    payment_status_enum = postgresql.ENUM(
        "pending",
        "processing",
        "succeeded",
        "failed",
        "canceled",
        "refunded",
        "partially_refunded",
        name="payment_status",
    )
    payment_status_enum.drop(op.get_bind())
