"""Add organization_id to appointments table

Revision ID: add_org_to_appointments
Revises: add_comprehensive_indexes
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_org_to_appointments'
down_revision = 'add_comprehensive_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add organization_id column to appointments table
    op.add_column('appointments', 
        sa.Column('organization_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_appointments_organization_id',
        'appointments', 'organizations',
        ['organization_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for better query performance
    op.create_index(
        'idx_appointments_organization_id',
        'appointments',
        ['organization_id']
    )
    
    # Migrate data from location_id to organization_id if location_id exists
    # Note: This assumes location_id was meant to reference organizations
    connection = op.get_bind()
    
    # Check if location_id column exists
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('appointments')]
    
    if 'location_id' in columns:
        # Copy location_id values to organization_id
        op.execute("""
            UPDATE appointments 
            SET organization_id = location_id 
            WHERE location_id IS NOT NULL
        """)
        
        # Drop the old location_id column and its constraints
        try:
            # Drop foreign key if it exists
            op.drop_constraint('fk_appointments_location_id', 'appointments', type_='foreignkey')
        except:
            pass  # Constraint might not exist
            
        try:
            # Drop index if it exists
            op.drop_index('idx_appointments_location_id', 'appointments')
        except:
            pass  # Index might not exist
            
        # Drop the column
        op.drop_column('appointments', 'location_id')


def downgrade():
    # Add location_id column back
    op.add_column('appointments',
        sa.Column('location_id', sa.Integer(), nullable=True)
    )
    
    # Copy organization_id values back to location_id
    op.execute("""
        UPDATE appointments 
        SET location_id = organization_id 
        WHERE organization_id IS NOT NULL
    """)
    
    # Drop organization_id index and foreign key
    op.drop_index('idx_appointments_organization_id', 'appointments')
    op.drop_constraint('fk_appointments_organization_id', 'appointments', type_='foreignkey')
    
    # Drop organization_id column
    op.drop_column('appointments', 'organization_id')