"""add_barber_profile_fields_to_users

Revision ID: c5b58db65615
Revises: 60abeabbd32b
Create Date: 2025-07-23 13:41:05.267451

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5b58db65615'
down_revision: Union[str, Sequence[str], None] = '60abeabbd32b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add barber profile fields to users table."""
    # Add barber profile fields to users table
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('specialties', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('years_experience', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('profile_image_url', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('portfolio_images', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('social_links', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('profile_slug', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('profile_completed', sa.Boolean(), default=False, nullable=False))
    
    # Create unique index on profile_slug
    op.create_index('ix_users_profile_slug', 'users', ['profile_slug'], unique=True)


def downgrade() -> None:
    """Remove barber profile fields from users table."""
    # Drop index first
    op.drop_index('ix_users_profile_slug', table_name='users')
    
    # Remove columns
    op.drop_column('users', 'profile_completed')
    op.drop_column('users', 'profile_slug')
    op.drop_column('users', 'social_links')
    op.drop_column('users', 'portfolio_images')
    op.drop_column('users', 'profile_image_url')
    op.drop_column('users', 'years_experience')
    op.drop_column('users', 'specialties')
    op.drop_column('users', 'bio')
