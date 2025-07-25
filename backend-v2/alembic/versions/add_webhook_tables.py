"""Add webhook tables

Revision ID: add_webhook_tables
Revises: 
Create Date: 2025-06-29

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_webhook_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create webhook_endpoints table
    op.create_table(
        'webhook_endpoints',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('events', sa.JSON(), nullable=False),
        sa.Column('auth_type', sa.Enum('none', 'bearer', 'basic', 'hmac', 'api_key', name='webhookauthtype'), nullable=True),
        sa.Column('auth_config', sa.JSON(), nullable=True),
        sa.Column('headers', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('secret', sa.String(), nullable=True),
        sa.Column('max_retries', sa.Integer(), nullable=True),
        sa.Column('retry_delay_seconds', sa.Integer(), nullable=True),
        sa.Column('timeout_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('total_deliveries', sa.Integer(), nullable=True),
        sa.Column('successful_deliveries', sa.Integer(), nullable=True),
        sa.Column('failed_deliveries', sa.Integer(), nullable=True),
        sa.Column('last_triggered_at', sa.DateTime(), nullable=True),
        sa.Column('last_success_at', sa.DateTime(), nullable=True),
        sa.Column('last_failure_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_webhook_active', 'webhook_endpoints', ['is_active'], unique=False)
    op.create_index('idx_webhook_events', 'webhook_endpoints', ['events'], unique=False)
    
    # Create webhook_logs table
    op.create_table(
        'webhook_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('endpoint_id', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('event_id', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'success', 'failed', 'retrying', name='webhookstatus'), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('request_url', sa.String(), nullable=False),
        sa.Column('request_method', sa.String(), nullable=True),
        sa.Column('request_headers', sa.JSON(), nullable=True),
        sa.Column('request_body', sa.JSON(), nullable=True),
        sa.Column('response_headers', sa.JSON(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=True),
        sa.Column('next_retry_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['endpoint_id'], ['webhook_endpoints.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_webhook_log_endpoint', 'webhook_logs', ['endpoint_id'], unique=False)
    op.create_index('idx_webhook_log_status', 'webhook_logs', ['status'], unique=False)
    op.create_index('idx_webhook_log_event', 'webhook_logs', ['event_type'], unique=False)
    op.create_index('idx_webhook_log_created', 'webhook_logs', ['created_at'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index('idx_webhook_log_created', table_name='webhook_logs')
    op.drop_index('idx_webhook_log_event', table_name='webhook_logs')
    op.drop_index('idx_webhook_log_status', table_name='webhook_logs')
    op.drop_index('idx_webhook_log_endpoint', table_name='webhook_logs')
    
    # Drop webhook_logs table
    op.drop_table('webhook_logs')
    
    # Drop indexes
    op.drop_index('idx_webhook_events', table_name='webhook_endpoints')
    op.drop_index('idx_webhook_active', table_name='webhook_endpoints')
    
    # Drop webhook_endpoints table
    op.drop_table('webhook_endpoints')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS webhookstatus')
    op.execute('DROP TYPE IF EXISTS webhookauthtype')