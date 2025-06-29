"""Add recurring pattern id to appointments

Revision ID: 0d12ce167173
Revises: 32cde931f92d
Create Date: 2025-06-28 20:37:40.819583

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d12ce167173'
down_revision: Union[str, Sequence[str], None] = '32cde931f92d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add recurring_pattern_id column to appointments table
    with op.batch_alter_table('appointments') as batch_op:
        batch_op.add_column(sa.Column('recurring_pattern_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_appointments_recurring_pattern', 
            'recurring_appointment_patterns', 
            ['recurring_pattern_id'], 
            ['id']
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key and column
    with op.batch_alter_table('appointments') as batch_op:
        batch_op.drop_constraint('fk_appointments_recurring_pattern', type_='foreignkey')
        batch_op.drop_column('recurring_pattern_id')
