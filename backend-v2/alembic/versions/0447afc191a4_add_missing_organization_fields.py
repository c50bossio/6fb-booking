"""Add missing organization fields

Revision ID: 0447afc191a4
Revises: 30030a7400fc
Create Date: 2025-07-04 14:48:25.849131

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0447afc191a4'
down_revision: Union[str, Sequence[str], None] = '30030a7400fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing columns to organizations table - wrap in try/except as some may exist
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('monthly_revenue_limit', sa.Float(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('features_enabled', sa.JSON(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('billing_contact_email', sa.String(255), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('tax_id', sa.String(50), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('business_hours', sa.JSON(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('website', sa.String(255), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('country', sa.String(50), nullable=False, server_default='US'))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('timezone', sa.String(50), nullable=False, server_default='UTC'))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('billing_plan', sa.String(20), nullable=False, server_default='individual'))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('organization_type', sa.String(20), nullable=False, server_default='independent'))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('parent_organization_id', sa.Integer(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('stripe_customer_id', sa.String(255), nullable=True))
        except:
            pass


def downgrade() -> None:
    """Downgrade schema."""
    # Don't drop columns in downgrade as they might be used
