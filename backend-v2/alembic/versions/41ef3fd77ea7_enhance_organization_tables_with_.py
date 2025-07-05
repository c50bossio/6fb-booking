"""enhance organization tables with additional constraints and indexes

Revision ID: 41ef3fd77ea7
Revises: 55cc3336150f
Create Date: 2025-07-04 12:49:51.986873

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41ef3fd77ea7'
down_revision: Union[str, Sequence[str], None] = '55cc3336150f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema with organization enhancements."""
    
    # Add additional constraints and indexes for organizations table
    # Add unique constraint on organization slug
    op.create_unique_constraint('uq_organizations_slug', 'organizations', ['slug'])
    
    # Add indexes for performance
    op.create_index('idx_organizations_name', 'organizations', ['name'])
    op.create_index('idx_organizations_billing_plan', 'organizations', ['billing_plan'])
    op.create_index('idx_organizations_subscription_status', 'organizations', ['subscription_status'])
    op.create_index('idx_organizations_is_active', 'organizations', ['is_active'])
    op.create_index('idx_organizations_chairs_count', 'organizations', ['chairs_count'])
    op.create_index('idx_organizations_stripe_account_id', 'organizations', ['stripe_account_id'])
    
    # Add composite indexes for common queries
    op.create_index('idx_organizations_active_billing', 'organizations', ['is_active', 'billing_plan'])
    op.create_index('idx_organizations_location', 'organizations', ['city', 'state', 'country'])
    
    # Enhance user_organizations table indexes (these might already exist from the model)
    try:
        op.create_index('idx_user_org_composite', 'user_organizations', ['user_id', 'organization_id'], unique=True)
    except Exception:
        # Index might already exist
        pass
    
    # Add billing-related fields to support enterprise features
    op.add_column('organizations', sa.Column('monthly_revenue_limit', sa.Float(), nullable=True,
                                            comment='Monthly revenue limit for billing plan'))
    op.add_column('organizations', sa.Column('features_enabled', sa.JSON(), nullable=True,
                                            comment='JSON object with enabled features per plan'))
    op.add_column('organizations', sa.Column('billing_contact_email', sa.String(255), nullable=True,
                                            comment='Email for billing notifications'))
    op.add_column('organizations', sa.Column('tax_id', sa.String(50), nullable=True,
                                            comment='Tax ID or EIN for business'))
    
    # Add parent organization support for enterprise hierarchies
    op.add_column('organizations', sa.Column('parent_organization_id', sa.Integer(), nullable=True,
                                            comment='Parent organization for multi-location enterprises'))
    op.create_foreign_key('fk_organizations_parent', 'organizations', 'organizations', 
                         ['parent_organization_id'], ['id'])
    op.create_index('idx_organizations_parent', 'organizations', ['parent_organization_id'])
    
    # Add location type field to distinguish between different organization types
    op.add_column('organizations', sa.Column('organization_type', sa.String(20), nullable=True,
                                            comment='Type: headquarters, location, franchise'))
    op.create_index('idx_organizations_type', 'organizations', ['organization_type'])
    
    # Enhance user_organizations with more granular permissions
    op.add_column('user_organizations', sa.Column('can_manage_billing', sa.Boolean(), 
                                                  nullable=True, default=False,
                                                  comment='Can manage billing and subscriptions'))
    op.add_column('user_organizations', sa.Column('can_manage_staff', sa.Boolean(), 
                                                  nullable=True, default=False,
                                                  comment='Can invite and manage staff members'))
    op.add_column('user_organizations', sa.Column('can_view_analytics', sa.Boolean(), 
                                                  nullable=True, default=True,
                                                  comment='Can view business analytics'))
    op.add_column('user_organizations', sa.Column('last_accessed_at', sa.DateTime(), nullable=True,
                                                  comment='Last time user accessed this organization'))
    
    # Add constraint to ensure only one primary organization per user
    op.create_index('idx_user_org_primary_unique', 'user_organizations', 
                   ['user_id'], unique=True, 
                   postgresql_where=sa.text('is_primary = true'))


def downgrade() -> None:
    """Downgrade schema by removing enhancements."""
    
    # Remove indexes
    op.drop_index('idx_user_org_primary_unique', 'user_organizations')
    op.drop_index('idx_organizations_type', 'organizations')
    op.drop_index('idx_organizations_parent', 'organizations')
    op.drop_index('idx_organizations_location', 'organizations')
    op.drop_index('idx_organizations_active_billing', 'organizations')
    op.drop_index('idx_organizations_stripe_account_id', 'organizations')
    op.drop_index('idx_organizations_chairs_count', 'organizations')
    op.drop_index('idx_organizations_is_active', 'organizations')
    op.drop_index('idx_organizations_subscription_status', 'organizations')
    op.drop_index('idx_organizations_billing_plan', 'organizations')
    op.drop_index('idx_organizations_name', 'organizations')
    
    # Remove foreign key and constraint
    op.drop_constraint('fk_organizations_parent', 'organizations', type_='foreignkey')
    op.drop_constraint('uq_organizations_slug', 'organizations', type_='unique')
    
    # Remove added columns
    op.drop_column('user_organizations', 'last_accessed_at')
    op.drop_column('user_organizations', 'can_view_analytics')
    op.drop_column('user_organizations', 'can_manage_staff')
    op.drop_column('user_organizations', 'can_manage_billing')
    
    op.drop_column('organizations', 'organization_type')
    op.drop_column('organizations', 'parent_organization_id')
    op.drop_column('organizations', 'tax_id')
    op.drop_column('organizations', 'billing_contact_email')
    op.drop_column('organizations', 'features_enabled')
    op.drop_column('organizations', 'monthly_revenue_limit')
    
    # Try to remove composite index if it exists
    try:
        op.drop_index('idx_user_org_composite', 'user_organizations')
    except Exception:
        pass
