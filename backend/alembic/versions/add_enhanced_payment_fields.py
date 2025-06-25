"""Add enhanced payment processor fields

Revision ID: add_enhanced_payment_fields
Revises: add_payout_schedule_tables
Create Date: 2025-06-25 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_enhanced_payment_fields"
down_revision = "add_payout_schedule_tables"
branch_labels = None
depends_on = None


def upgrade():
    # Add processor field to payments table
    op.add_column("payments", sa.Column("processor", sa.String(50), nullable=True))

    # Add processor_payment_id for unified tracking
    op.add_column(
        "payments", sa.Column("processor_payment_id", sa.String(255), nullable=True)
    )

    # Add barber_amount and shop_fee for split tracking
    op.add_column(
        "payments", sa.Column("barber_amount", sa.Numeric(10, 2), nullable=True)
    )
    op.add_column("payments", sa.Column("shop_fee", sa.Numeric(10, 2), nullable=True))

    # Add processing_fee for accurate fee tracking
    op.add_column(
        "payments", sa.Column("processing_fee", sa.Numeric(10, 2), nullable=True)
    )

    # Add metadata for flexible data storage
    op.add_column("payments", sa.Column("metadata", sa.JSON, nullable=True))

    # Add Square account fields to barbers table
    op.add_column(
        "barbers", sa.Column("square_account_id", sa.String(255), nullable=True)
    )
    op.add_column(
        "barbers", sa.Column("square_location_id", sa.String(255), nullable=True)
    )
    op.add_column(
        "barbers", sa.Column("preferred_processor", sa.String(50), nullable=True)
    )
    op.add_column(
        "barbers", sa.Column("instant_payouts_enabled", sa.Boolean(), default=False)
    )

    # Add processor fields to appointments for tracking
    op.add_column(
        "appointments", sa.Column("payment_processor", sa.String(50), nullable=True)
    )
    op.add_column(
        "appointments", sa.Column("payment_id", sa.String(255), nullable=True)
    )

    # Create processor_metrics table for performance tracking
    op.create_table(
        "processor_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("processor", sa.String(50), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("hour", sa.Integer(), nullable=True),
        sa.Column("success_count", sa.Integer(), default=0),
        sa.Column("failure_count", sa.Integer(), default=0),
        sa.Column("total_volume", sa.Numeric(12, 2), default=0),
        sa.Column("total_fees", sa.Numeric(10, 2), default=0),
        sa.Column("avg_processing_time", sa.Float(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create index for faster metric queries
    op.create_index(
        "idx_processor_metrics_lookup",
        "processor_metrics",
        ["processor", "date", "hour"],
    )

    # Create payment_reconciliation table for cross-processor tracking
    op.create_table(
        "payment_reconciliations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reconciliation_date", sa.Date(), nullable=False),
        sa.Column("stripe_count", sa.Integer(), default=0),
        sa.Column("stripe_volume", sa.Numeric(12, 2), default=0),
        sa.Column("stripe_fees", sa.Numeric(10, 2), default=0),
        sa.Column("stripe_shop_revenue", sa.Numeric(12, 2), default=0),
        sa.Column("stripe_barber_payouts", sa.Numeric(12, 2), default=0),
        sa.Column("square_count", sa.Integer(), default=0),
        sa.Column("square_volume", sa.Numeric(12, 2), default=0),
        sa.Column("square_fees", sa.Numeric(10, 2), default=0),
        sa.Column("square_shop_revenue", sa.Numeric(12, 2), default=0),
        sa.Column("square_barber_payouts", sa.Numeric(12, 2), default=0),
        sa.Column("discrepancies", sa.JSON, nullable=True),
        sa.Column("reconciled_by", sa.Integer(), nullable=True),
        sa.Column("reconciled_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["reconciled_by"],
            ["users.id"],
        ),
    )

    # Create unique index for reconciliation dates
    op.create_index(
        "idx_reconciliation_date_unique",
        "payment_reconciliations",
        ["reconciliation_date"],
        unique=True,
    )

    # Update existing payments to have processor set to 'stripe' as default
    op.execute("UPDATE payments SET processor = 'stripe' WHERE processor IS NULL")


def downgrade():
    # Drop reconciliation table
    op.drop_index(
        "idx_reconciliation_date_unique", table_name="payment_reconciliations"
    )
    op.drop_table("payment_reconciliations")

    # Drop metrics table
    op.drop_index("idx_processor_metrics_lookup", table_name="processor_metrics")
    op.drop_table("processor_metrics")

    # Remove columns from appointments
    op.drop_column("appointments", "payment_id")
    op.drop_column("appointments", "payment_processor")

    # Remove columns from barbers
    op.drop_column("barbers", "instant_payouts_enabled")
    op.drop_column("barbers", "preferred_processor")
    op.drop_column("barbers", "square_location_id")
    op.drop_column("barbers", "square_account_id")

    # Remove columns from payments
    op.drop_column("payments", "metadata")
    op.drop_column("payments", "processing_fee")
    op.drop_column("payments", "shop_fee")
    op.drop_column("payments", "barber_amount")
    op.drop_column("payments", "processor_payment_id")
    op.drop_column("payments", "processor")
