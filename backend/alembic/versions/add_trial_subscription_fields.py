"""Add trial and subscription fields to users

Revision ID: add_trial_subscription_fields
Revises: ab7a9ad76dc6_merge_all_current_heads
Create Date: 2025-06-26 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_trial_subscription_fields"
down_revision: Union[str, None] = "add_mfa_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create subscription status enum
    subscription_status_enum = sa.Enum(
        "TRIAL", "ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE", name="subscriptionstatus"
    )
    subscription_status_enum.create(op.get_bind())

    # Add trial and subscription columns to users table
    op.add_column(
        "users",
        sa.Column(
            "subscription_status",
            subscription_status_enum,
            nullable=False,
            server_default="TRIAL",
        ),
    )
    op.add_column("users", sa.Column("trial_start_date", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("trial_end_date", sa.DateTime(), nullable=True))
    op.add_column(
        "users",
        sa.Column("trial_used", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users", sa.Column("subscription_id", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "users", sa.Column("customer_id", sa.String(length=255), nullable=True)
    )

    # Create indexes for performance
    op.create_index("ix_users_subscription_status", "users", ["subscription_status"])
    op.create_index("ix_users_trial_end_date", "users", ["trial_end_date"])
    op.create_index("ix_users_subscription_id", "users", ["subscription_id"])


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_users_subscription_id", table_name="users")
    op.drop_index("ix_users_trial_end_date", table_name="users")
    op.drop_index("ix_users_subscription_status", table_name="users")

    # Drop columns
    op.drop_column("users", "customer_id")
    op.drop_column("users", "subscription_id")
    op.drop_column("users", "trial_used")
    op.drop_column("users", "trial_end_date")
    op.drop_column("users", "trial_start_date")
    op.drop_column("users", "subscription_status")

    # Drop enum
    subscription_status_enum = sa.Enum(name="subscriptionstatus")
    subscription_status_enum.drop(op.get_bind())
