"""add_barber_profiles_table_manual

Revision ID: 84384b18be74
Revises: 60abeabbd32b
Create Date: 2025-07-21 14:09:13.405369

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84384b18be74'
down_revision: Union[str, Sequence[str], None] = '60abeabbd32b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create barber_profiles table
    op.create_table('barber_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('profile_image_url', sa.String(), nullable=True),
        sa.Column('instagram_handle', sa.String(), nullable=True),
        sa.Column('website_url', sa.String(), nullable=True),
        sa.Column('specialties', sa.JSON(), nullable=True),
        sa.Column('certifications', sa.JSON(), nullable=True),
        sa.Column('hourly_rate', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Create indexes
    op.create_index('ix_barber_profiles_user_id', 'barber_profiles', ['user_id'], unique=False)
    op.create_index('ix_barber_profiles_active', 'barber_profiles', ['is_active'], unique=False)
    op.create_index('ix_barber_profiles_created_at', 'barber_profiles', ['created_at'], unique=False)
    op.create_index(op.f('ix_barber_profiles_id'), 'barber_profiles', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index(op.f('ix_barber_profiles_id'), table_name='barber_profiles')
    op.drop_index('ix_barber_profiles_created_at', table_name='barber_profiles')
    op.drop_index('ix_barber_profiles_active', table_name='barber_profiles')
    op.drop_index('ix_barber_profiles_user_id', table_name='barber_profiles')
    
    # Drop table
    op.drop_table('barber_profiles')
