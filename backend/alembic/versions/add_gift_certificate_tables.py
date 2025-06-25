"""Add gift certificate tables

Revision ID: add_gift_certificate_tables
Revises: ea46f0e03b47
Create Date: 2025-06-25 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_gift_certificate_tables"
down_revision = "ea46f0e03b47"  # pragma: allowlist secret
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create gift certificate status enum
    gift_certificate_status = sa.Enum(
        "active",
        "partially_used",
        "fully_used",
        "expired",
        "cancelled",
        name="giftcertificatestatus",
    )
    gift_certificate_status.create(op.get_bind())

    # Create gift_certificates table
    op.create_table(
        "gift_certificates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("original_amount", sa.Integer(), nullable=False),
        sa.Column("remaining_balance", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("sender_name", sa.String(length=200), nullable=False),
        sa.Column("sender_email", sa.String(length=255), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), nullable=True),
        sa.Column("recipient_name", sa.String(length=200), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("recipient_user_id", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", gift_certificate_status, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_charge_id", sa.String(length=255), nullable=True),
        sa.Column("meta_data", sa.JSON(), nullable=True),
        sa.CheckConstraint(
            "original_amount > 0", name="check_positive_original_amount"
        ),
        sa.CheckConstraint("remaining_balance >= 0", name="check_non_negative_balance"),
        sa.CheckConstraint(
            "remaining_balance <= original_amount",
            name="check_balance_not_exceed_original",
        ),
        sa.ForeignKeyConstraint(
            ["recipient_user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["sender_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_gift_certificates_code"), "gift_certificates", ["code"], unique=True
    )
    op.create_index(
        "idx_gift_certificates_recipient_email",
        "gift_certificates",
        ["recipient_email"],
        unique=False,
    )
    op.create_index(
        "idx_gift_certificates_sender_email",
        "gift_certificates",
        ["sender_email"],
        unique=False,
    )
    op.create_index(
        "idx_gift_certificates_status_expiry",
        "gift_certificates",
        ["status", "expiry_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gift_certificates_expiry_date"),
        "gift_certificates",
        ["expiry_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gift_certificates_status"),
        "gift_certificates",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gift_certificates_stripe_charge_id"),
        "gift_certificates",
        ["stripe_charge_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_gift_certificates_stripe_payment_intent_id"),
        "gift_certificates",
        ["stripe_payment_intent_id"],
        unique=True,
    )

    # Create gift_certificate_redemptions table
    op.create_table(
        "gift_certificate_redemptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("gift_certificate_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("amount_used", sa.Integer(), nullable=False),
        sa.Column("balance_before", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("redeemed_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.CheckConstraint("amount_used > 0", name="check_positive_amount_used"),
        sa.CheckConstraint(
            "balance_after >= 0", name="check_non_negative_balance_after"
        ),
        sa.CheckConstraint(
            "balance_before > balance_after", name="check_balance_decreased"
        ),
        sa.ForeignKeyConstraint(
            ["appointment_id"],
            ["appointments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["gift_certificate_id"],
            ["gift_certificates.id"],
        ),
        sa.ForeignKeyConstraint(
            ["redeemed_by_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_redemptions_appointment",
        "gift_certificate_redemptions",
        ["appointment_id"],
        unique=False,
    )
    op.create_index(
        "idx_redemptions_certificate",
        "gift_certificate_redemptions",
        ["gift_certificate_id"],
        unique=False,
    )
    op.create_index(
        "idx_redemptions_user",
        "gift_certificate_redemptions",
        ["redeemed_by_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gift_certificate_redemptions_appointment_id"),
        "gift_certificate_redemptions",
        ["appointment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gift_certificate_redemptions_gift_certificate_id"),
        "gift_certificate_redemptions",
        ["gift_certificate_id"],
        unique=False,
    )


def downgrade() -> None:
    # Drop gift_certificate_redemptions table
    op.drop_index(
        op.f("ix_gift_certificate_redemptions_gift_certificate_id"),
        table_name="gift_certificate_redemptions",
    )
    op.drop_index(
        op.f("ix_gift_certificate_redemptions_appointment_id"),
        table_name="gift_certificate_redemptions",
    )
    op.drop_index("idx_redemptions_user", table_name="gift_certificate_redemptions")
    op.drop_index(
        "idx_redemptions_certificate", table_name="gift_certificate_redemptions"
    )
    op.drop_index(
        "idx_redemptions_appointment", table_name="gift_certificate_redemptions"
    )
    op.drop_table("gift_certificate_redemptions")

    # Drop gift_certificates table
    op.drop_index(
        op.f("ix_gift_certificates_stripe_payment_intent_id"),
        table_name="gift_certificates",
    )
    op.drop_index(
        op.f("ix_gift_certificates_stripe_charge_id"), table_name="gift_certificates"
    )
    op.drop_index(op.f("ix_gift_certificates_status"), table_name="gift_certificates")
    op.drop_index(
        op.f("ix_gift_certificates_expiry_date"), table_name="gift_certificates"
    )
    op.drop_index("idx_gift_certificates_status_expiry", table_name="gift_certificates")
    op.drop_index("idx_gift_certificates_sender_email", table_name="gift_certificates")
    op.drop_index(
        "idx_gift_certificates_recipient_email", table_name="gift_certificates"
    )
    op.drop_index(op.f("ix_gift_certificates_code"), table_name="gift_certificates")
    op.drop_table("gift_certificates")

    # Drop gift certificate status enum
    sa.Enum(name="giftcertificatestatus").drop(op.get_bind())
