"""add_tracking_pixels_to_organizations

Revision ID: 958456e0ff67
Revises: 88f8ddde18e9
Create Date: 2025-07-04 18:33:40.627644

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '958456e0ff67'
down_revision: Union[str, None] = '88f8ddde18e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add tracking pixel fields to organizations table
    op.add_column('organizations', sa.Column('gtm_container_id', sa.String(50), nullable=True, comment='Google Tag Manager Container ID (GTM-XXXXXXX)'))
    op.add_column('organizations', sa.Column('ga4_measurement_id', sa.String(50), nullable=True, comment='Google Analytics 4 Measurement ID (G-XXXXXXXXXX)'))
    op.add_column('organizations', sa.Column('meta_pixel_id', sa.String(50), nullable=True, comment='Meta/Facebook Pixel ID'))
    op.add_column('organizations', sa.Column('google_ads_conversion_id', sa.String(50), nullable=True, comment='Google Ads Conversion ID (AW-XXXXXXXXX)'))
    op.add_column('organizations', sa.Column('google_ads_conversion_label', sa.String(50), nullable=True, comment='Google Ads Conversion Label'))
    op.add_column('organizations', sa.Column('tracking_enabled', sa.Boolean(), nullable=False, server_default='true', comment='Enable/disable all tracking pixels'))
    op.add_column('organizations', sa.Column('custom_tracking_code', sa.Text(), nullable=True, comment='Custom HTML/JS tracking code'))
    op.add_column('organizations', sa.Column('tracking_settings', sa.JSON(), nullable=True, comment='JSON object with advanced tracking settings'))


def downgrade() -> None:
    # Remove tracking pixel fields from organizations table
    op.drop_column('organizations', 'tracking_settings')
    op.drop_column('organizations', 'custom_tracking_code')
    op.drop_column('organizations', 'tracking_enabled')
    op.drop_column('organizations', 'google_ads_conversion_label')
    op.drop_column('organizations', 'google_ads_conversion_id')
    op.drop_column('organizations', 'meta_pixel_id')
    op.drop_column('organizations', 'ga4_measurement_id')
    op.drop_column('organizations', 'gtm_container_id')