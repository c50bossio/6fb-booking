"""Add PIN authentication system for barbers

Revision ID: add_pin_authentication_system
Revises: add_shopify_integration_tables
Create Date: 2025-06-27 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_pin_authentication_system"
down_revision = "20250627120000"  # Shopify integration tables migration
branch_labels = None
depends_on = None


def upgrade():
    """Add PIN authentication fields to barbers table and create pos_sessions table"""

    # Add PIN authentication fields to barbers table
    op.add_column("barbers", sa.Column("pin_hash", sa.String(255), nullable=True))
    op.add_column(
        "barbers",
        sa.Column("pin_attempts", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "barbers",
        sa.Column("pin_locked_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "barbers", sa.Column("pin_last_used", sa.DateTime(timezone=True), nullable=True)
    )

    # Create pos_sessions table
    op.create_table(
        "pos_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("session_token", sa.String(255), nullable=False),
        sa.Column("barber_id", sa.Integer(), nullable=False),
        sa.Column("device_info", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("location_info", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "last_activity",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("login_method", sa.String(50), server_default="pin", nullable=True),
        sa.Column("logout_reason", sa.String(100), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for performance
    op.create_index(
        "ix_pos_sessions_session_token", "pos_sessions", ["session_token"], unique=True
    )
    op.create_index("ix_pos_sessions_barber_id", "pos_sessions", ["barber_id"])
    op.create_index("ix_pos_sessions_is_active", "pos_sessions", ["is_active"])
    op.create_index("ix_pos_sessions_expires_at", "pos_sessions", ["expires_at"])

    # Create foreign key constraint
    op.create_foreign_key(
        "fk_pos_sessions_barber_id",
        "pos_sessions",
        "barbers",
        ["barber_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    """Remove PIN authentication system"""

    # Drop pos_sessions table
    op.drop_table("pos_sessions")

    # Remove PIN authentication fields from barbers table
    op.drop_column("barbers", "pin_last_used")
    op.drop_column("barbers", "pin_locked_until")
    op.drop_column("barbers", "pin_attempts")
    op.drop_column("barbers", "pin_hash")
