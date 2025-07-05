"""Add organization hierarchy fields

Revision ID: c934da92f503
Revises: 0447afc191a4
Create Date: 2025-07-04 14:50:23.891066

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c934da92f503'
down_revision: Union[str, Sequence[str], None] = '0447afc191a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add organization hierarchy fields
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('organization_type', sa.String(20), nullable=False, server_default='independent'))
        batch_op.add_column(sa.Column('parent_organization_id', sa.Integer(), nullable=True))
        
    # Add foreign key constraint
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_organizations_parent', 'organizations', ['parent_organization_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove foreign key constraint
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_organizations_parent', type_='foreignkey')
    
    # Remove columns
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.drop_column('parent_organization_id')
        batch_op.drop_column('organization_type')
