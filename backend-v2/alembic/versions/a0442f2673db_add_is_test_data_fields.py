"""add_is_test_data_fields

Revision ID: a0442f2673db
Revises: b2415245f3dd
Create Date: 2025-07-02 00:57:16.083635

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0442f2673db'
down_revision: Union[str, Sequence[str], None] = 'b2415245f3dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_test_data field to clients table
    op.add_column('clients', sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add is_test_data field to appointments table
    op.add_column('appointments', sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add is_test_data field to barber_availability table
    op.add_column('barber_availability', sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add is_test_data field to barber_time_off table
    op.add_column('barber_time_off', sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add is_test_data field to users table (for test barbers)
    op.add_column('users', sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove is_test_data field from all tables
    op.drop_column('users', 'is_test_data')
    op.drop_column('barber_time_off', 'is_test_data')
    op.drop_column('barber_availability', 'is_test_data')
    op.drop_column('appointments', 'is_test_data')
    op.drop_column('clients', 'is_test_data')
