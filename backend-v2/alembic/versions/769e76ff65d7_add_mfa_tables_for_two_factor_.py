"""add_mfa_tables_for_two_factor_authentication

Revision ID: 769e76ff65d7
Revises: 6f65d833c956
Create Date: 2025-07-03 07:19:28.086428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '769e76ff65d7'
down_revision: Union[str, Sequence[str], None] = '6f65d833c956'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create user_mfa_secrets table
    op.create_table('user_mfa_secrets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('secret', sa.String(length=255), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('recovery_email', sa.String(length=255), nullable=True),
        sa.Column('recovery_phone', sa.String(length=50), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('failed_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_failed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('enabled_at', sa.DateTime(), nullable=True),
        sa.Column('disabled_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_mfa_secrets_user_id'), 'user_mfa_secrets', ['user_id'], unique=False)
    op.create_index('idx_mfa_user_enabled', 'user_mfa_secrets', ['user_id', 'is_enabled'], unique=False)
    
    # Create mfa_backup_codes table
    op.create_table('mfa_backup_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('code_hash', sa.String(length=255), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mfa_backup_codes_user_id'), 'mfa_backup_codes', ['user_id'], unique=False)
    op.create_index('idx_backup_codes_user_unused', 'mfa_backup_codes', ['user_id', 'is_used'], unique=False)
    op.create_index('idx_backup_codes_hash', 'mfa_backup_codes', ['code_hash'], unique=False)
    
    # Create mfa_device_trusts table
    op.create_table('mfa_device_trusts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('device_fingerprint', sa.String(length=255), nullable=False),
        sa.Column('device_name', sa.String(length=255), nullable=True),
        sa.Column('browser', sa.String(length=100), nullable=True),
        sa.Column('platform', sa.String(length=100), nullable=True),
        sa.Column('trust_token', sa.String(length=255), nullable=False),
        sa.Column('trusted_until', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_reason', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trust_token')
    )
    op.create_index(op.f('ix_mfa_device_trusts_user_id'), 'mfa_device_trusts', ['user_id'], unique=False)
    op.create_index('idx_device_trust_user', 'mfa_device_trusts', ['user_id', 'trusted_until'], unique=False)
    op.create_index('idx_device_trust_token', 'mfa_device_trusts', ['trust_token'], unique=False)
    op.create_index('idx_device_trust_fingerprint', 'mfa_device_trusts', ['user_id', 'device_fingerprint'], unique=False)
    
    # Create mfa_events table
    op.create_table('mfa_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('event_status', sa.String(length=50), nullable=False),
        sa.Column('event_details', sa.String(length=500), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('device_fingerprint', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mfa_events_user_id'), 'mfa_events', ['user_id'], unique=False)
    op.create_index('idx_mfa_events_user', 'mfa_events', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_mfa_events_type', 'mfa_events', ['event_type', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes and tables in reverse order
    op.drop_index('idx_mfa_events_type', table_name='mfa_events')
    op.drop_index('idx_mfa_events_user', table_name='mfa_events')
    op.drop_index(op.f('ix_mfa_events_user_id'), table_name='mfa_events')
    op.drop_table('mfa_events')
    
    op.drop_index('idx_device_trust_fingerprint', table_name='mfa_device_trusts')
    op.drop_index('idx_device_trust_token', table_name='mfa_device_trusts')
    op.drop_index('idx_device_trust_user', table_name='mfa_device_trusts')
    op.drop_index(op.f('ix_mfa_device_trusts_user_id'), table_name='mfa_device_trusts')
    op.drop_table('mfa_device_trusts')
    
    op.drop_index('idx_backup_codes_hash', table_name='mfa_backup_codes')
    op.drop_index('idx_backup_codes_user_unused', table_name='mfa_backup_codes')
    op.drop_index(op.f('ix_mfa_backup_codes_user_id'), table_name='mfa_backup_codes')
    op.drop_table('mfa_backup_codes')
    
    op.drop_index('idx_mfa_user_enabled', table_name='user_mfa_secrets')
    op.drop_index(op.f('ix_user_mfa_secrets_user_id'), table_name='user_mfa_secrets')
    op.drop_table('user_mfa_secrets')
