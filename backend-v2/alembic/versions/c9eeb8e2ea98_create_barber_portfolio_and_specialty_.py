"""create_barber_portfolio_and_specialty_models

Revision ID: c9eeb8e2ea98
Revises: c5b58db65615
Create Date: 2025-07-23 13:41:35.606105

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9eeb8e2ea98'
down_revision: Union[str, Sequence[str], None] = 'c5b58db65615'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create barber portfolio and specialty tables."""
    # Create barber_portfolio_images table
    op.create_table('barber_portfolio_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, default=0),
        sa.Column('is_featured', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_barber_portfolio_images_barber_id'), 'barber_portfolio_images', ['barber_id'], unique=False)
    op.create_index(op.f('ix_barber_portfolio_images_display_order'), 'barber_portfolio_images', ['display_order'], unique=False)
    
    # Create barber_specialties table
    op.create_table('barber_specialties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('specialty_name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),  # e.g., "cuts", "styling", "coloring"
        sa.Column('experience_level', sa.String(length=20), nullable=True),  # e.g., "beginner", "intermediate", "expert"
        sa.Column('is_primary', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_barber_specialties_barber_id'), 'barber_specialties', ['barber_id'], unique=False)
    op.create_index(op.f('ix_barber_specialties_specialty_name'), 'barber_specialties', ['specialty_name'], unique=False)
    op.create_index(op.f('ix_barber_specialties_category'), 'barber_specialties', ['category'], unique=False)


def downgrade() -> None:
    """Drop barber portfolio and specialty tables."""
    op.drop_index(op.f('ix_barber_specialties_category'), table_name='barber_specialties')
    op.drop_index(op.f('ix_barber_specialties_specialty_name'), table_name='barber_specialties')
    op.drop_index(op.f('ix_barber_specialties_barber_id'), table_name='barber_specialties')
    op.drop_table('barber_specialties')
    
    op.drop_index(op.f('ix_barber_portfolio_images_display_order'), table_name='barber_portfolio_images')
    op.drop_index(op.f('ix_barber_portfolio_images_barber_id'), table_name='barber_portfolio_images')
    op.drop_table('barber_portfolio_images')
