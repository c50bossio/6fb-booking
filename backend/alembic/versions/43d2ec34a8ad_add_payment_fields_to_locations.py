"""add_payment_fields_to_locations

Revision ID: 43d2ec34a8ad
Revises: 20250621184040
Create Date: 2025-06-21 22:45:33.887127

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "43d2ec34a8ad"
down_revision = "20250621184040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add payment-related columns to locations table
    op.add_column(
        "locations", sa.Column("payment_processor", sa.String(50), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("payment_api_key", sa.String(500), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("payment_secret_key", sa.String(500), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("payment_webhook_secret", sa.String(500), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("payment_platform", sa.String(50), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("stripe_account_id", sa.String(255), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("default_commission_rate", sa.Float(), nullable=True)
    )
    op.add_column("locations", sa.Column("accepts_cash", sa.Boolean(), nullable=True))
    op.add_column(
        "locations", sa.Column("accepts_credit_card", sa.Boolean(), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("accepts_digital_wallet", sa.Boolean(), nullable=True)
    )
    op.add_column("locations", sa.Column("accepts_crypto", sa.Boolean(), nullable=True))
    op.add_column(
        "locations", sa.Column("credit_card_fee_percentage", sa.Float(), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("credit_card_fee_fixed", sa.Float(), nullable=True)
    )
    op.add_column(
        "locations",
        sa.Column("digital_wallet_fee_percentage", sa.Float(), nullable=True),
    )
    op.add_column(
        "locations", sa.Column("digital_wallet_fee_fixed", sa.Float(), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("requires_deposit", sa.Boolean(), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("deposit_percentage", sa.Float(), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("deposit_fixed_amount", sa.Float(), nullable=True)
    )
    op.add_column("locations", sa.Column("cancellation_fee", sa.Float(), nullable=True))
    op.add_column("locations", sa.Column("no_show_fee", sa.Float(), nullable=True))
    op.add_column(
        "locations", sa.Column("payout_frequency", sa.String(50), nullable=True)
    )
    op.add_column("locations", sa.Column("payout_method", sa.String(50), nullable=True))
    op.add_column(
        "locations", sa.Column("bank_account_id", sa.String(255), nullable=True)
    )
    op.add_column(
        "locations", sa.Column("bank_routing_number", sa.String(50), nullable=True)
    )
    op.add_column("locations", sa.Column("tax_rate", sa.Float(), nullable=True))
    op.add_column("locations", sa.Column("tax_id", sa.String(100), nullable=True))
    op.add_column(
        "locations", sa.Column("includes_tax_in_price", sa.Boolean(), nullable=True)
    )

    # Set default values for existing rows
    op.execute(
        "UPDATE locations SET payment_processor = 'stripe' WHERE payment_processor IS NULL"
    )
    op.execute(
        "UPDATE locations SET default_commission_rate = 0.30 WHERE default_commission_rate IS NULL"
    )
    op.execute("UPDATE locations SET accepts_cash = 1 WHERE accepts_cash IS NULL")
    op.execute(
        "UPDATE locations SET accepts_credit_card = 1 WHERE accepts_credit_card IS NULL"
    )
    op.execute(
        "UPDATE locations SET accepts_digital_wallet = 0 WHERE accepts_digital_wallet IS NULL"
    )
    op.execute("UPDATE locations SET accepts_crypto = 0 WHERE accepts_crypto IS NULL")
    op.execute(
        "UPDATE locations SET credit_card_fee_percentage = 2.9 WHERE credit_card_fee_percentage IS NULL"
    )
    op.execute(
        "UPDATE locations SET credit_card_fee_fixed = 0.30 WHERE credit_card_fee_fixed IS NULL"
    )
    op.execute(
        "UPDATE locations SET digital_wallet_fee_percentage = 2.9 WHERE digital_wallet_fee_percentage IS NULL"
    )
    op.execute(
        "UPDATE locations SET digital_wallet_fee_fixed = 0.30 WHERE digital_wallet_fee_fixed IS NULL"
    )
    op.execute(
        "UPDATE locations SET requires_deposit = 0 WHERE requires_deposit IS NULL"
    )
    op.execute(
        "UPDATE locations SET deposit_percentage = 20.0 WHERE deposit_percentage IS NULL"
    )
    op.execute(
        "UPDATE locations SET payout_frequency = 'weekly' WHERE payout_frequency IS NULL"
    )
    op.execute(
        "UPDATE locations SET payout_method = 'direct_deposit' WHERE payout_method IS NULL"
    )
    op.execute("UPDATE locations SET tax_rate = 0.0 WHERE tax_rate IS NULL")
    op.execute(
        "UPDATE locations SET includes_tax_in_price = 0 WHERE includes_tax_in_price IS NULL"
    )


def downgrade() -> None:
    # Remove payment-related columns from locations table
    op.drop_column("locations", "includes_tax_in_price")
    op.drop_column("locations", "tax_id")
    op.drop_column("locations", "tax_rate")
    op.drop_column("locations", "bank_routing_number")
    op.drop_column("locations", "bank_account_id")
    op.drop_column("locations", "payout_method")
    op.drop_column("locations", "payout_frequency")
    op.drop_column("locations", "no_show_fee")
    op.drop_column("locations", "cancellation_fee")
    op.drop_column("locations", "deposit_fixed_amount")
    op.drop_column("locations", "deposit_percentage")
    op.drop_column("locations", "requires_deposit")
    op.drop_column("locations", "digital_wallet_fee_fixed")
    op.drop_column("locations", "digital_wallet_fee_percentage")
    op.drop_column("locations", "credit_card_fee_fixed")
    op.drop_column("locations", "credit_card_fee_percentage")
    op.drop_column("locations", "accepts_crypto")
    op.drop_column("locations", "accepts_digital_wallet")
    op.drop_column("locations", "accepts_credit_card")
    op.drop_column("locations", "accepts_cash")
    op.drop_column("locations", "default_commission_rate")
    op.drop_column("locations", "stripe_account_id")
    op.drop_column("locations", "payment_platform")
    op.drop_column("locations", "payment_webhook_secret")
    op.drop_column("locations", "payment_secret_key")
    op.drop_column("locations", "payment_api_key")
    op.drop_column("locations", "payment_processor")
