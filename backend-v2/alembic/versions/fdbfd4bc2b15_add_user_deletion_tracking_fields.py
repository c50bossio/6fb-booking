"""add user deletion tracking fields

Revision ID: fdbfd4bc2b15
Revises: cc37bfcea4c5
Create Date: 2025-07-19 14:13:18.615294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fdbfd4bc2b15'
down_revision: Union[str, Sequence[str], None] = 'cc37bfcea4c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add deletion tracking fields to users table
    op.add_column('users', sa.Column('deactivated_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('deletion_scheduled_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('deletion_metadata', sa.Text(), nullable=True))
    
    # Add indexes for efficient queries
    op.create_index(op.f('ix_users_deletion_scheduled_at'), 'users', ['deletion_scheduled_at'], unique=False)
    op.create_index(op.f('ix_users_deleted_at'), 'users', ['deleted_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove indexes
    op.drop_index(op.f('ix_users_deleted_at'), table_name='users')
    op.drop_index(op.f('ix_users_deletion_scheduled_at'), table_name='users')
    
    # Remove columns
    op.drop_column('users', 'deletion_metadata')
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'deletion_scheduled_at')
    op.drop_column('users', 'deactivated_at')
