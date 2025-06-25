"""Add payment processor preferences tables

Revision ID: add_payment_processor_preferences
Revises: add_payout_schedule_tables
Create Date: 2025-06-25 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_payment_processor_preferences"
down_revision = "add_payout_schedule_tables"
branch_labels = None
depends_on = None


def upgrade():
    # Create payment processor enum
    op.execute("CREATE TYPE paymentprocessor AS ENUM ('stripe', 'square', 'both')")

    # Create processor_preferences table
    op.create_table(
        "processor_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column(
            "primary_processor",
            sa.Enum("stripe", "square", "both", name="paymentprocessor"),
            nullable=True,
        ),
        sa.Column("stripe_enabled", sa.Boolean(), nullable=True),
        sa.Column("square_enabled", sa.Boolean(), nullable=True),
        sa.Column("stripe_settings", sa.JSON(), nullable=True),
        sa.Column("square_settings", sa.JSON(), nullable=True),
        sa.Column("stripe_effective_rate", sa.Float(), nullable=True),
        sa.Column("square_effective_rate", sa.Float(), nullable=True),
        sa.Column("monthly_volume_threshold", sa.Float(), nullable=True),
        sa.Column("average_transaction_size", sa.Float(), nullable=True),
        sa.Column("auto_switch_enabled", sa.Boolean(), nullable=True),
        sa.Column("auto_switch_rules", sa.JSON(), nullable=True),
        sa.Column("unified_analytics", sa.Boolean(), nullable=True),
        sa.Column("comparison_view", sa.Boolean(), nullable=True),
        sa.Column("fee_alert_threshold", sa.Float(), nullable=True),
        sa.Column("processor_issue_alerts", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("barber_id"),
    )
    op.create_index(
        op.f("ix_processor_preferences_barber_id"),
        "processor_preferences",
        ["barber_id"],
        unique=True,
    )

    # Create processor_metrics table
    op.create_table(
        "processor_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("preference_id", sa.Integer(), nullable=False),
        sa.Column(
            "processor",
            sa.Enum("stripe", "square", "both", name="paymentprocessor"),
            nullable=False,
        ),
        sa.Column("total_transactions", sa.Integer(), nullable=True),
        sa.Column("total_volume", sa.Float(), nullable=True),
        sa.Column("total_fees", sa.Float(), nullable=True),
        sa.Column("average_processing_time", sa.Float(), nullable=True),
        sa.Column("success_rate", sa.Float(), nullable=True),
        sa.Column("failed_transactions", sa.Integer(), nullable=True),
        sa.Column("disputed_transactions", sa.Integer(), nullable=True),
        sa.Column("total_payouts", sa.Integer(), nullable=True),
        sa.Column("average_payout_time", sa.Float(), nullable=True),
        sa.Column("instant_payout_count", sa.Integer(), nullable=True),
        sa.Column("instant_payout_fees", sa.Float(), nullable=True),
        sa.Column("monthly_metrics", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["preference_id"],
            ["processor_preferences.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_processor_metrics_preference_id"),
        "processor_metrics",
        ["preference_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_processor_metrics_processor"),
        "processor_metrics",
        ["processor"],
        unique=False,
    )

    # Add payment_processor column to appointments table
    op.add_column(
        "appointments", sa.Column("payment_processor", sa.String(50), nullable=True)
    )

    # Set default values for existing data
    op.execute(
        "UPDATE appointments SET payment_processor = 'stripe' WHERE payment_processor IS NULL"
    )

    # Create index on payment_processor
    op.create_index(
        op.f("ix_appointments_payment_processor"),
        "appointments",
        ["payment_processor"],
        unique=False,
    )


def downgrade():
    # Drop indexes
    op.drop_index(op.f("ix_appointments_payment_processor"), table_name="appointments")
    op.drop_index(
        op.f("ix_processor_metrics_processor"), table_name="processor_metrics"
    )
    op.drop_index(
        op.f("ix_processor_metrics_preference_id"), table_name="processor_metrics"
    )
    op.drop_index(
        op.f("ix_processor_preferences_barber_id"), table_name="processor_preferences"
    )

    # Drop columns
    op.drop_column("appointments", "payment_processor")

    # Drop tables
    op.drop_table("processor_metrics")
    op.drop_table("processor_preferences")

    # Drop enum
    op.execute("DROP TYPE paymentprocessor")
