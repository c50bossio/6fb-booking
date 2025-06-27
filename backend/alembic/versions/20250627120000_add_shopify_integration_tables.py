"""Add Shopify integration tables

Revision ID: 20250627120000
Revises: add_sms_reminder_tracking
Create Date: 2025-06-27 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250627120000"
down_revision = "add_sms_reminder_tracking"
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute(
        "CREATE TYPE paymentmodeltype AS ENUM ('booth_rent', 'commission', 'hybrid', 'product_only')"
    )
    op.execute(
        "CREATE TYPE salessource AS ENUM ('square', 'shopify', 'manual', 'in_person')"
    )
    op.execute(
        "CREATE TYPE paymentstatus AS ENUM ('pending', 'paid', 'overdue', 'partial', 'cancelled')"
    )

    # Create barber_payment_models table
    op.create_table(
        "barber_payment_models",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column(
            "payment_type",
            sa.Enum(
                "booth_rent",
                "commission",
                "hybrid",
                "product_only",
                name="paymentmodeltype",
            ),
            nullable=False,
        ),
        sa.Column("booth_rent_amount", sa.Numeric(10, 2), default=0.00),
        sa.Column("rent_frequency", sa.String(20), default="weekly"),
        sa.Column("rent_due_day", sa.Integer(), default=1),
        sa.Column("service_commission_rate", sa.Float(), default=0.0),
        sa.Column("minimum_service_payout", sa.Numeric(10, 2), default=0.00),
        sa.Column("product_commission_rate", sa.Float(), default=0.15),
        sa.Column("minimum_product_payout", sa.Numeric(10, 2), default=0.00),
        sa.Column("stripe_connect_account_id", sa.String(100), nullable=True),
        sa.Column("stripe_onboarding_completed", sa.Boolean(), default=False),
        sa.Column("stripe_payouts_enabled", sa.Boolean(), default=False),
        sa.Column("enable_instant_payouts", sa.Boolean(), default=False),
        sa.Column("rentredi_tenant_id", sa.String(100), nullable=True),
        sa.Column("rentredi_property_id", sa.String(100), nullable=True),
        sa.Column("square_location_id", sa.String(100), nullable=True),
        sa.Column("square_employee_id", sa.String(100), nullable=True),
        sa.Column("square_merchant_id", sa.String(100), nullable=True),
        sa.Column("square_access_token", sa.String(500), nullable=True),
        sa.Column("square_account_verified", sa.Boolean(), default=False),
        sa.Column("active", sa.Boolean(), default=True),
        sa.Column("auto_collect_rent", sa.Boolean(), default=True),
        sa.Column("auto_pay_commissions", sa.Boolean(), default=False),
        sa.Column("payout_method", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["barber_id"], ["barbers.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_barber_payment_models_barber_id"),
        "barber_payment_models",
        ["barber_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_barber_payment_models_location_id"),
        "barber_payment_models",
        ["location_id"],
        unique=False,
    )

    # Create booth_rent_payments table
    op.create_table(
        "booth_rent_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payment_model_id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("amount_due", sa.Numeric(10, 2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(10, 2), default=0.00),
        sa.Column("due_date", sa.DateTime(), nullable=False),
        sa.Column("paid_date", sa.DateTime(), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "paid",
                "overdue",
                "partial",
                "cancelled",
                name="paymentstatus",
            ),
            default="pending",
        ),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("rentredi_payment_id", sa.String(100), nullable=True),
        sa.Column("rentredi_transaction_id", sa.String(100), nullable=True),
        sa.Column("late_fee_amount", sa.Numeric(10, 2), default=0.00),
        sa.Column("grace_period_days", sa.Integer(), default=3),
        sa.Column("created_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["payment_model_id"], ["barber_payment_models.id"]),
        sa.ForeignKeyConstraint(["barber_id"], ["barbers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_booth_rent_payments_payment_model_id"),
        "booth_rent_payments",
        ["payment_model_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_booth_rent_payments_barber_id"),
        "booth_rent_payments",
        ["barber_id"],
        unique=False,
    )

    # Create product_sales table
    op.create_table(
        "product_sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("product_name", sa.String(200), nullable=False),
        sa.Column("product_sku", sa.String(100), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("sale_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("cost_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("quantity", sa.Integer(), default=1),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("commission_rate", sa.Float(), nullable=False),
        sa.Column("commission_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("commission_paid", sa.Boolean(), default=False),
        sa.Column(
            "sales_source",
            sa.Enum("square", "shopify", "manual", "in_person", name="salessource"),
            default="manual",
        ),
        # Square integration fields
        sa.Column("square_transaction_id", sa.String(100), nullable=True),
        sa.Column("square_payment_id", sa.String(100), nullable=True),
        sa.Column("square_location_id", sa.String(100), nullable=True),
        # Shopify integration fields
        sa.Column("shopify_order_id", sa.String(100), nullable=True),
        sa.Column("shopify_order_number", sa.String(50), nullable=True),
        sa.Column("shopify_product_id", sa.String(100), nullable=True),
        sa.Column("shopify_variant_id", sa.String(100), nullable=True),
        sa.Column("shopify_fulfillment_status", sa.String(50), nullable=True),
        # Integration metadata
        sa.Column("external_transaction_id", sa.String(100), nullable=True),
        sa.Column("sync_status", sa.String(50), default="pending"),
        sa.Column("last_sync_attempt", sa.DateTime(), nullable=True),
        sa.Column("sync_error_message", sa.Text(), nullable=True),
        # Customer info
        sa.Column("customer_name", sa.String(200), nullable=True),
        sa.Column("customer_email", sa.String(200), nullable=True),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        # Metadata
        sa.Column("sale_date", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("created_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["barber_id"], ["barbers.id"]),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_product_sales_barber_id"), "product_sales", ["barber_id"], unique=False
    )
    op.create_index(
        op.f("ix_product_sales_sales_source"),
        "product_sales",
        ["sales_source"],
        unique=False,
    )
    op.create_index(
        op.f("ix_product_sales_sync_status"),
        "product_sales",
        ["sync_status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_product_sales_sale_date"), "product_sales", ["sale_date"], unique=False
    )

    # Create commission_payments table
    op.create_table(
        "commission_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payment_model_id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("service_revenue", sa.Numeric(10, 2), default=0.00),
        sa.Column("service_commission_rate", sa.Float(), default=0.0),
        sa.Column("service_commission_amount", sa.Numeric(10, 2), default=0.00),
        sa.Column("product_revenue", sa.Numeric(10, 2), default=0.00),
        sa.Column("product_commission_rate", sa.Float(), default=0.0),
        sa.Column("product_commission_amount", sa.Numeric(10, 2), default=0.00),
        sa.Column("total_commission", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_paid", sa.Numeric(10, 2), default=0.00),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "paid",
                "overdue",
                "partial",
                "cancelled",
                name="paymentstatus",
            ),
            default="pending",
        ),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("paid_date", sa.DateTime(), nullable=True),
        sa.Column("stripe_transfer_id", sa.String(100), nullable=True),
        sa.Column("stripe_payout_id", sa.String(100), nullable=True),
        sa.Column("payout_status", sa.String(50), nullable=True),
        sa.Column("payout_arrival_date", sa.DateTime(), nullable=True),
        sa.Column("shop_owner_amount", sa.Numeric(10, 2), default=0.00),
        sa.Column("barber_amount", sa.Numeric(10, 2), default=0.00),
        sa.Column("adjustment_amount", sa.Numeric(10, 2), default=0.00),
        sa.Column("adjustment_reason", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["payment_model_id"], ["barber_payment_models.id"]),
        sa.ForeignKeyConstraint(["barber_id"], ["barbers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_commission_payments_payment_model_id"),
        "commission_payments",
        ["payment_model_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_commission_payments_barber_id"),
        "commission_payments",
        ["barber_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_commission_payments_status"),
        "commission_payments",
        ["status"],
        unique=False,
    )

    # Create payment_integrations table
    op.create_table(
        "payment_integrations",
        sa.Column("id", sa.Integer(), nullable=False),
        # Stripe Connect configuration
        sa.Column("stripe_platform_fee_percent", sa.Float(), default=0.25),
        sa.Column("stripe_instant_fee_percent", sa.Float(), default=1.0),
        sa.Column("stripe_webhook_configured", sa.Boolean(), default=False),
        sa.Column("last_payout_sync", sa.DateTime(), nullable=True),
        # RentRedi configuration
        sa.Column("rentredi_api_key", sa.String(200), nullable=True),
        sa.Column("rentredi_environment", sa.String(20), default="sandbox"),
        sa.Column("rentredi_webhook_secret", sa.String(200), nullable=True),
        # Square configuration
        sa.Column("square_application_id", sa.String(200), nullable=True),
        sa.Column("square_access_token", sa.String(200), nullable=True),
        sa.Column("square_environment", sa.String(20), default="sandbox"),
        sa.Column("square_webhook_signature_key", sa.String(200), nullable=True),
        sa.Column("square_last_sync", sa.DateTime(), nullable=True),
        # Shopify configuration for online product sales
        sa.Column("shopify_shop_domain", sa.String(200), nullable=True),
        sa.Column("shopify_access_token", sa.String(200), nullable=True),
        sa.Column("shopify_webhook_secret", sa.String(200), nullable=True),
        sa.Column("shopify_environment", sa.String(20), default="development"),
        sa.Column("shopify_last_sync", sa.DateTime(), nullable=True),
        # General settings
        sa.Column("auto_sync_enabled", sa.Boolean(), default=True),
        sa.Column("sync_frequency_hours", sa.Integer(), default=24),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        # Metadata
        sa.Column("created_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    # Drop tables in reverse order due to foreign key constraints
    op.drop_table("payment_integrations")

    op.drop_index(
        op.f("ix_commission_payments_status"), table_name="commission_payments"
    )
    op.drop_index(
        op.f("ix_commission_payments_barber_id"), table_name="commission_payments"
    )
    op.drop_index(
        op.f("ix_commission_payments_payment_model_id"),
        table_name="commission_payments",
    )
    op.drop_table("commission_payments")

    op.drop_index(op.f("ix_product_sales_sale_date"), table_name="product_sales")
    op.drop_index(op.f("ix_product_sales_sync_status"), table_name="product_sales")
    op.drop_index(op.f("ix_product_sales_sales_source"), table_name="product_sales")
    op.drop_index(op.f("ix_product_sales_barber_id"), table_name="product_sales")
    op.drop_table("product_sales")

    op.drop_index(
        op.f("ix_booth_rent_payments_barber_id"), table_name="booth_rent_payments"
    )
    op.drop_index(
        op.f("ix_booth_rent_payments_payment_model_id"),
        table_name="booth_rent_payments",
    )
    op.drop_table("booth_rent_payments")

    op.drop_index(
        op.f("ix_barber_payment_models_location_id"), table_name="barber_payment_models"
    )
    op.drop_index(
        op.f("ix_barber_payment_models_barber_id"), table_name="barber_payment_models"
    )
    op.drop_table("barber_payment_models")

    # Drop enum types
    op.execute("DROP TYPE paymentstatus")
    op.execute("DROP TYPE salessource")
    op.execute("DROP TYPE paymentmodeltype")
