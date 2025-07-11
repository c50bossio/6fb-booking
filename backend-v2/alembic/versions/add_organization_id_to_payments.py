"""Add organization_id to payments table

Revision ID: add_org_to_payments
Revises: add_org_to_appointments
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_org_to_payments'
down_revision = 'add_org_to_appointments'
branch_labels = None
depends_on = None


def upgrade():
    # Add organization_id column to payments table
    op.add_column('payments', 
        sa.Column('organization_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_payments_organization_id',
        'payments', 'organizations',
        ['organization_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for better query performance
    op.create_index(
        'idx_payments_organization_id',
        'payments',
        ['organization_id']
    )
    
    # Migrate data from location_id to organization_id if location_id exists
    connection = op.get_bind()
    
    # Check if location_id column exists
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('payments')]
    
    if 'location_id' in columns:
        # Copy location_id values to organization_id
        op.execute("""
            UPDATE payments 
            SET organization_id = location_id 
            WHERE location_id IS NOT NULL
        """)
        
        # Drop the old location_id column and its constraints
        try:
            # Drop foreign key if it exists
            op.drop_constraint('fk_payments_location_id', 'payments', type_='foreignkey')
        except:
            pass  # Constraint might not exist
            
        try:
            # Drop index if it exists
            op.drop_index('idx_payments_location_id', 'payments')
        except:
            pass  # Index might not exist
            
        # Drop the column
        op.drop_column('payments', 'location_id')


def downgrade():
    # Add location_id column back
    op.add_column('payments',
        sa.Column('location_id', sa.Integer(), nullable=True)
    )
    
    # Copy organization_id values back to location_id
    op.execute("""
        UPDATE payments 
        SET location_id = organization_id 
        WHERE organization_id IS NOT NULL
    """)
    
    # Drop organization_id index and foreign key
    op.drop_index('idx_payments_organization_id', 'payments')
    op.drop_constraint('fk_payments_organization_id', 'payments', type_='foreignkey')
    
    # Drop organization_id column
    op.drop_column('payments', 'organization_id')