"""add integrations table

Revision ID: add_integrations_table
Revises: add_marketing_suite_tables
Create Date: 2025-01-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_integrations_table'
down_revision = 'add_marketing_suite_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute("CREATE TYPE integrationtype AS ENUM ('google_calendar', 'stripe', 'sendgrid', 'twilio', 'square', 'acuity', 'booksy', 'custom')")
    op.execute("CREATE TYPE integrationstatus AS ENUM ('active', 'inactive', 'error', 'pending', 'expired')")
    
    # Create integrations table
    op.create_table('integrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('integration_type', sa.Enum('google_calendar', 'stripe', 'sendgrid', 'twilio', 'square', 'acuity', 'booksy', 'custom', name='integrationtype'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('api_key', sa.Text(), nullable=True),
        sa.Column('api_secret', sa.Text(), nullable=True),
        sa.Column('webhook_secret', sa.Text(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('scopes', sa.JSON(), nullable=True),
        sa.Column('webhook_url', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('active', 'inactive', 'error', 'pending', 'expired', name='integrationstatus'), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('error_count', sa.Integer(), nullable=True),
        sa.Column('health_check_data', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_integrations_user_id'), 'integrations', ['user_id'], unique=False)
    op.create_index(op.f('ix_integrations_integration_type'), 'integrations', ['integration_type'], unique=False)
    op.create_index(op.f('ix_integrations_status'), 'integrations', ['status'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_integrations_status'), table_name='integrations')
    op.drop_index(op.f('ix_integrations_integration_type'), table_name='integrations')
    op.drop_index(op.f('ix_integrations_user_id'), table_name='integrations')
    
    # Drop table
    op.drop_table('integrations')
    
    # Drop enum types
    op.execute("DROP TYPE integrationstatus")
    op.execute("DROP TYPE integrationtype")