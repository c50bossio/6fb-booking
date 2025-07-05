"""add_staff_invitations_table

Revision ID: 30030a7400fc
Revises: 88f8ddde18e9
Create Date: 2025-07-04 13:58:56.917807

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30030a7400fc'
down_revision: Union[str, Sequence[str], None] = '88f8ddde18e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create staff_invitations table for organization member invitations."""
    # Create InvitationStatus enum
    invitation_status_enum = sa.Enum('pending', 'accepted', 'expired', 'cancelled', name='invitationstatus')
    invitation_status_enum.create(op.get_bind())
    
    # Create InvitationRole enum
    invitation_role_enum = sa.Enum('barber', 'receptionist', 'shop_manager', name='invitationrole')
    invitation_role_enum.create(op.get_bind())
    
    # Create staff_invitations table
    op.create_table('staff_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('invited_role', invitation_role_enum, nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('invited_by_id', sa.Integer(), nullable=False),
        sa.Column('status', invitation_status_enum, nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('accepted_by_id', sa.Integer(), nullable=True),
        sa.Column('email_sent_at', sa.DateTime(), nullable=True),
        sa.Column('email_send_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_viewed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['accepted_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['invited_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index(op.f('ix_staff_invitations_email'), 'staff_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_staff_invitations_token'), 'staff_invitations', ['token'], unique=True)
    op.create_index('idx_staff_invitations_organization', 'staff_invitations', ['organization_id'], unique=False)
    op.create_index('idx_staff_invitations_status', 'staff_invitations', ['status'], unique=False)


def downgrade() -> None:
    """Drop staff_invitations table and related enums."""
    # Drop indexes
    op.drop_index('idx_staff_invitations_status', table_name='staff_invitations')
    op.drop_index('idx_staff_invitations_organization', table_name='staff_invitations')
    op.drop_index(op.f('ix_staff_invitations_token'), table_name='staff_invitations')
    op.drop_index(op.f('ix_staff_invitations_email'), table_name='staff_invitations')
    
    # Drop table
    op.drop_table('staff_invitations')
    
    # Drop enums
    sa.Enum('barber', 'receptionist', 'shop_manager', name='invitationrole').drop(op.get_bind())
    sa.Enum('pending', 'accepted', 'expired', 'cancelled', name='invitationstatus').drop(op.get_bind())
