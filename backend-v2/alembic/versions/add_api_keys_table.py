"""add api keys table

Revision ID: add_api_keys_table
Revises: ed548ba61608
Create Date: 2025-01-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_api_keys_table'
down_revision = 'ed548ba61608'
branch_labels = None
depends_on = None


def upgrade():
    # Create api_keys table
    op.create_table('api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('key_hash', sa.String(length=64), nullable=False),
        sa.Column('key_prefix', sa.String(length=20), nullable=False),
        sa.Column('key_type', sa.String(length=50), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=False),
        sa.Column('allowed_ips', sa.JSON(), nullable=True),
        sa.Column('allowed_origins', sa.JSON(), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED', name='apikeystatus'), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('rate_limit_override', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_reason', sa.String(length=500), nullable=True),
        sa.Column('revoked_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['revoked_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_api_keys_key_hash', 'api_keys', ['key_hash'], unique=True)
    op.create_index('idx_api_keys_user_status', 'api_keys', ['user_id', 'status'], unique=False)
    op.create_index('idx_api_keys_type_status', 'api_keys', ['key_type', 'status'], unique=False)
    op.create_index('idx_api_keys_expires_at', 'api_keys', ['expires_at'], unique=False)
    
    # Add api_keys relationship to users table if needed
    # This is handled by SQLAlchemy relationship backref


def downgrade():
    # Drop indexes
    op.drop_index('idx_api_keys_expires_at', table_name='api_keys')
    op.drop_index('idx_api_keys_type_status', table_name='api_keys')
    op.drop_index('idx_api_keys_user_status', table_name='api_keys')
    op.drop_index('idx_api_keys_key_hash', table_name='api_keys')
    
    # Drop table
    op.drop_table('api_keys')
    
    # Drop enum type
    op.execute('DROP TYPE IF EXISTS apikeystatus')