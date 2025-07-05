"""Add unified role to users

Revision ID: 5be230588964
Revises: c934da92f503
Create Date: 2025-07-04 14:53:31.092109

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5be230588964'
down_revision: Union[str, Sequence[str], None] = 'c934da92f503'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add unified role fields to users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('unified_role', sa.String(50), nullable=False, server_default='client'))
        batch_op.add_column(sa.Column('role_migrated', sa.Boolean(), nullable=False, server_default='0'))
        
        # Trial system fields
        batch_op.add_column(sa.Column('trial_started_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('trial_expires_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('trial_active', sa.Boolean(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('subscription_status', sa.String(50), nullable=False, server_default='trial'))
        
        # Email verification fields
        batch_op.add_column(sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('verification_token', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('verification_token_expires', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('verified_at', sa.DateTime(), nullable=True))
        
    # Create index on unified_role
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index('ix_users_unified_role', ['unified_role'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove index
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_unified_role')
    
    # Remove columns
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('verified_at')
        batch_op.drop_column('verification_token_expires')
        batch_op.drop_column('verification_token')
        batch_op.drop_column('email_verified')
        batch_op.drop_column('subscription_status')
        batch_op.drop_column('trial_active')
        batch_op.drop_column('trial_expires_at')
        batch_op.drop_column('trial_started_at')
        batch_op.drop_column('role_migrated')
        batch_op.drop_column('unified_role')
