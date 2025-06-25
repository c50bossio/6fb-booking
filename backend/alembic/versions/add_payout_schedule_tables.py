"""Add payout schedule tables

Revision ID: add_payout_schedule_tables
Revises: ea46f0e03b47
Create Date: 2025-06-25 10:00:00

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_payout_schedule_tables"
down_revision = "ea46f0e03b47"  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute(
        "CREATE TYPE payoutfrequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'custom')"
    )
    op.execute(
        "CREATE TYPE payoutstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled')"
    )
    op.execute(
        "CREATE TYPE payouttype AS ENUM ('commission', 'booth_rent_refund', 'bonus', 'adjustment')"
    )

    # Create payout_schedules table
    op.create_table(
        "payout_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column(
            "frequency",
            sa.Enum(
                "daily",
                "weekly",
                "biweekly",
                "monthly",
                "custom",
                name="payoutfrequency",
            ),
            nullable=False,
        ),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("day_of_month", sa.Integer(), nullable=True),
        sa.Column("custom_interval_days", sa.Integer(), nullable=True),
        sa.Column("minimum_payout_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("auto_payout_enabled", sa.Boolean(), nullable=True),
        sa.Column("email_notifications", sa.Boolean(), nullable=True),
        sa.Column("sms_notifications", sa.Boolean(), nullable=True),
        sa.Column("advance_notice_days", sa.Integer(), nullable=True),
        sa.Column("preferred_payment_method", sa.String(50), nullable=True),
        sa.Column("backup_payment_method", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("last_payout_date", sa.DateTime(), nullable=True),
        sa.Column("next_payout_date", sa.DateTime(), nullable=True),
        sa.Column("total_payouts_sent", sa.Integer(), nullable=True),
        sa.Column("total_amount_paid", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payout_schedules_barber_id"),
        "payout_schedules",
        ["barber_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payout_schedules_id"), "payout_schedules", ["id"], unique=False
    )

    # Create scheduled_payouts table
    op.create_table(
        "scheduled_payouts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=True),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column(
            "payout_type",
            sa.Enum(
                "commission",
                "booth_rent_refund",
                "bonus",
                "adjustment",
                name="payouttype",
            ),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "processing",
                "completed",
                "failed",
                "cancelled",
                name="payoutstatus",
            ),
            nullable=True,
        ),
        sa.Column("scheduled_date", sa.DateTime(), nullable=False),
        sa.Column("processed_date", sa.DateTime(), nullable=True),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("platform_payout_id", sa.String(255), nullable=True),
        sa.Column("platform_transfer_id", sa.String(255), nullable=True),
        sa.Column("platform_fee", sa.Numeric(8, 2), nullable=True),
        sa.Column("net_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=True),
        sa.Column("max_retries", sa.Integer(), nullable=True),
        sa.Column("next_retry_date", sa.DateTime(), nullable=True),
        sa.Column("notification_sent", sa.Boolean(), nullable=True),
        sa.Column("notification_sent_date", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["schedule_id"],
            ["payout_schedules.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_scheduled_payouts_barber_id"),
        "scheduled_payouts",
        ["barber_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_scheduled_payouts_id"), "scheduled_payouts", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_scheduled_payouts_scheduled_date"),
        "scheduled_payouts",
        ["scheduled_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_scheduled_payouts_status"),
        "scheduled_payouts",
        ["status"],
        unique=False,
    )

    # Create payout_earnings table
    op.create_table(
        "payout_earnings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scheduled_payout_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("payment_id", sa.Integer(), nullable=True),
        sa.Column("earning_type", sa.String(50), nullable=True),
        sa.Column("gross_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("commission_rate", sa.Numeric(5, 4), nullable=True),
        sa.Column("commission_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("earned_date", sa.DateTime(), nullable=False),
        sa.Column("service_name", sa.String(200), nullable=True),
        sa.Column("customer_name", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["appointment_id"],
            ["appointments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"],
            ["payments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["scheduled_payout_id"],
            ["scheduled_payouts.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payout_earnings_id"), "payout_earnings", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_payout_earnings_scheduled_payout_id"),
        "payout_earnings",
        ["scheduled_payout_id"],
        unique=False,
    )

    # Create payout_notifications table
    op.create_table(
        "payout_notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scheduled_payout_id", sa.Integer(), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("notification_type", sa.String(50), nullable=True),
        sa.Column("channel", sa.String(20), nullable=True),
        sa.Column("recipient", sa.String(255), nullable=True),
        sa.Column("subject", sa.String(255), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("template_used", sa.String(100), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("delivery_status", sa.String(20), nullable=True),
        sa.Column("delivery_error", sa.Text(), nullable=True),
        sa.Column("opened_at", sa.DateTime(), nullable=True),
        sa.Column("clicked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["barber_id"],
            ["barbers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["scheduled_payout_id"],
            ["scheduled_payouts.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payout_notifications_id"), "payout_notifications", ["id"], unique=False
    )

    # Set default values
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN frequency SET DEFAULT 'weekly'::payoutfrequency"
    )
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN minimum_payout_amount SET DEFAULT 25.00"
    )
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN auto_payout_enabled SET DEFAULT true"
    )
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN email_notifications SET DEFAULT true"
    )
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN sms_notifications SET DEFAULT false"
    )
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN advance_notice_days SET DEFAULT 1"
    )
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN preferred_payment_method SET DEFAULT 'stripe'"
    )
    op.execute("ALTER TABLE payout_schedules ALTER COLUMN is_active SET DEFAULT true")
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN total_payouts_sent SET DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE payout_schedules ALTER COLUMN total_amount_paid SET DEFAULT 0.00"
    )

    op.execute(
        "ALTER TABLE scheduled_payouts ALTER COLUMN payout_type SET DEFAULT 'commission'::payouttype"
    )
    op.execute("ALTER TABLE scheduled_payouts ALTER COLUMN currency SET DEFAULT 'USD'")
    op.execute(
        "ALTER TABLE scheduled_payouts ALTER COLUMN status SET DEFAULT 'pending'::payoutstatus"
    )
    op.execute(
        "ALTER TABLE scheduled_payouts ALTER COLUMN platform_fee SET DEFAULT 0.00"
    )
    op.execute("ALTER TABLE scheduled_payouts ALTER COLUMN retry_count SET DEFAULT 0")
    op.execute("ALTER TABLE scheduled_payouts ALTER COLUMN max_retries SET DEFAULT 3")
    op.execute(
        "ALTER TABLE scheduled_payouts ALTER COLUMN notification_sent SET DEFAULT false"
    )


def downgrade():
    # Drop tables in reverse order due to foreign key constraints
    op.drop_index(op.f("ix_payout_notifications_id"), table_name="payout_notifications")
    op.drop_table("payout_notifications")

    op.drop_index(
        op.f("ix_payout_earnings_scheduled_payout_id"), table_name="payout_earnings"
    )
    op.drop_index(op.f("ix_payout_earnings_id"), table_name="payout_earnings")
    op.drop_table("payout_earnings")

    op.drop_index(op.f("ix_scheduled_payouts_status"), table_name="scheduled_payouts")
    op.drop_index(
        op.f("ix_scheduled_payouts_scheduled_date"), table_name="scheduled_payouts"
    )
    op.drop_index(op.f("ix_scheduled_payouts_id"), table_name="scheduled_payouts")
    op.drop_index(
        op.f("ix_scheduled_payouts_barber_id"), table_name="scheduled_payouts"
    )
    op.drop_table("scheduled_payouts")

    op.drop_index(op.f("ix_payout_schedules_id"), table_name="payout_schedules")
    op.drop_index(op.f("ix_payout_schedules_barber_id"), table_name="payout_schedules")
    op.drop_table("payout_schedules")

    # Drop enum types
    op.execute("DROP TYPE payouttype")
    op.execute("DROP TYPE payoutstatus")
    op.execute("DROP TYPE payoutfrequency")
