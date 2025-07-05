"""add_unified_role_system_for_user_hierarchy

Revision ID: 9e94ca70cc82
Revises: 41ef3fd77ea7
Create Date: 2025-07-04 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e94ca70cc82'
down_revision: Union[str, None] = '41ef3fd77ea7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add unified role system to replace dual role/user_type system.
    
    This migration:
    1. Adds unified_role field to users table
    2. Migrates existing role/user_type combinations to unified roles
    3. Adds indexes for performance
    4. Keeps old fields for backwards compatibility during transition
    """
    
    # Add unified_role column to users table
    op.add_column('users', sa.Column('unified_role', sa.String(50), nullable=True, index=True))
    
    # Create temporary table to store role mappings
    role_mapping_table = op.create_table(
        'temp_role_mapping',
        sa.Column('old_role', sa.String(50)),
        sa.Column('old_user_type', sa.String(50)),
        sa.Column('new_unified_role', sa.String(50))
    )
    
    # Insert role mapping data
    op.bulk_insert(role_mapping_table, [
        # System admin roles
        {'old_role': 'admin', 'old_user_type': 'client', 'new_unified_role': 'super_admin'},
        {'old_role': 'admin', 'old_user_type': 'barber', 'new_unified_role': 'super_admin'},
        {'old_role': 'admin', 'old_user_type': 'barbershop', 'new_unified_role': 'super_admin'},
        
        # Business owner roles
        {'old_role': 'barber', 'old_user_type': 'barbershop', 'new_unified_role': 'shop_owner'},
        {'old_role': 'user', 'old_user_type': 'barbershop', 'new_unified_role': 'shop_owner'},
        
        # Individual barber roles
        {'old_role': 'barber', 'old_user_type': 'barber', 'new_unified_role': 'individual_barber'},
        {'old_role': 'user', 'old_user_type': 'barber', 'new_unified_role': 'individual_barber'},
        
        # Staff barber roles
        {'old_role': 'barber', 'old_user_type': 'client', 'new_unified_role': 'barber'},
        
        # Client roles
        {'old_role': 'user', 'old_user_type': 'client', 'new_unified_role': 'client'},
        {'old_role': 'client', 'old_user_type': 'client', 'new_unified_role': 'client'},
        
        # Default fallback
        {'old_role': None, 'old_user_type': None, 'new_unified_role': 'client'},
    ])
    
    # Update users table with unified roles based on existing role/user_type combinations
    op.execute("""
        UPDATE users 
        SET unified_role = (
            SELECT new_unified_role 
            FROM temp_role_mapping 
            WHERE (temp_role_mapping.old_role = users.role OR (temp_role_mapping.old_role IS NULL AND users.role IS NULL))
            AND (temp_role_mapping.old_user_type = users.user_type OR (temp_role_mapping.old_user_type IS NULL AND users.user_type IS NULL))
            LIMIT 1
        )
    """)
    
    # Set default unified_role for any users that didn't match
    op.execute("UPDATE users SET unified_role = 'client' WHERE unified_role IS NULL")
    
    # Make unified_role non-nullable after setting values
    op.alter_column('users', 'unified_role', nullable=False)
    
    # Add index for performance
    op.create_index('ix_users_unified_role', 'users', ['unified_role'])
    
    # Add is_migrated flag to track migration status
    op.add_column('users', sa.Column('role_migrated', sa.Boolean(), default=True, server_default='1'))
    
    # Drop temporary table
    op.drop_table('temp_role_mapping')
    
    # Add comments for documentation
    op.execute("PRAGMA table_info(users)")


def downgrade() -> None:
    """
    Remove unified role system and revert to dual role/user_type system.
    """
    
    # Drop the unified_role column and related fields
    op.drop_index('ix_users_unified_role', table_name='users')
    op.drop_column('users', 'unified_role')
    op.drop_column('users', 'role_migrated')