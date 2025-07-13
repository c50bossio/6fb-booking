"""Add enhanced AI agent models with frontend alignment

Revision ID: add_enhanced_ai_agent_models_20250713
Revises: comprehensive_timezone_support_20250703
Create Date: 2025-07-13 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_enhanced_ai_agent_models_20250713'
down_revision = 'comprehensive_timezone_support_20250703'
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade database with enhanced AI agent models"""
    
    # First, let's modify existing tables to add new fields
    
    # Add new fields to agents table
    op.add_column('agents', sa.Column('capabilities', sa.JSON(), nullable=True))
    op.add_column('agents', sa.Column('estimated_cost_per_month', sa.Float(), nullable=True, default=0.0))
    op.add_column('agents', sa.Column('created_by_id', sa.Integer(), nullable=True))
    op.add_column('agents', sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False))
    op.add_column('agents', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    
    # Add foreign key constraint for created_by_id
    op.create_foreign_key('fk_agents_created_by', 'agents', 'users', ['created_by_id'], ['id'])
    
    # Add new indexes for agents
    op.create_index('idx_agent_not_deleted', 'agents', ['is_deleted', 'is_active'])
    op.create_index('idx_agent_created_by', 'agents', ['created_by_id', 'is_active'])
    
    # Add new fields to agent_instances table
    op.add_column('agent_instances', sa.Column('total_messages', sa.Integer(), nullable=False, default=0))
    op.add_column('agent_instances', sa.Column('uptime_percentage', sa.Float(), nullable=False, default=100.0))
    op.add_column('agent_instances', sa.Column('last_activity', sa.DateTime(), nullable=True))
    op.add_column('agent_instances', sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False))
    op.add_column('agent_instances', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    
    # Add new indexes for agent_instances
    op.create_index('idx_agent_instance_not_deleted', 'agent_instances', ['is_deleted', 'status'])
    op.create_index('idx_agent_instance_last_activity', 'agent_instances', ['last_activity', 'status'])
    
    # Add new fields to agent_conversations table
    op.add_column('agent_conversations', sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False))
    op.add_column('agent_conversations', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    
    # Add new indexes for agent_conversations
    op.create_index('idx_conversation_not_deleted', 'agent_conversations', ['is_deleted', 'status'])
    op.create_index('idx_conversation_last_message', 'agent_conversations', ['last_message_at', 'status'])
    
    # Create the new agent_messages table
    op.create_table('agent_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('conversation_id', sa.String(36), sa.ForeignKey('agent_conversations.conversation_id'), nullable=False),
        sa.Column('sender_type', sa.String(20), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(50), nullable=False, default='text'),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, default=0),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, default=0),
        sa.Column('total_tokens', sa.Integer(), nullable=False, default=0),
        sa.Column('token_cost', sa.Float(), nullable=False, default=0.0),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('ai_provider', sa.String(50), nullable=True),
        sa.Column('ai_model', sa.String(100), nullable=True),
        sa.Column('is_delivered', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    
    # Add indexes for agent_messages
    op.create_index('idx_message_conversation_created', 'agent_messages', ['conversation_id', 'created_at'])
    op.create_index('idx_message_sender_type', 'agent_messages', ['sender_type', 'created_at'])
    op.create_index('idx_message_not_deleted', 'agent_messages', ['is_deleted', 'created_at'])
    
    # Update agent_type enum to include new types
    # This handles PostgreSQL enum updates
    if op.get_bind().dialect.name == 'postgresql':
        # For PostgreSQL, we need to add enum values
        op.execute("ALTER TYPE agenttype ADD VALUE IF NOT EXISTS 'booking_assistant'")
        op.execute("ALTER TYPE agenttype ADD VALUE IF NOT EXISTS 'customer_service'")
        op.execute("ALTER TYPE agenttype ADD VALUE IF NOT EXISTS 'marketing_assistant'")
        op.execute("ALTER TYPE agenttype ADD VALUE IF NOT EXISTS 'analytics_assistant'")
        op.execute("ALTER TYPE agenttype ADD VALUE IF NOT EXISTS 'sales_assistant'")
        op.execute("ALTER TYPE agenttype ADD VALUE IF NOT EXISTS 'retention_specialist'")
        
        # Update agent status enum
        op.execute("ALTER TYPE agentstatus ADD VALUE IF NOT EXISTS 'stopped'")
        op.execute("ALTER TYPE agentstatus ADD VALUE IF NOT EXISTS 'maintenance'")
        
        # Update conversation status enum  
        op.execute("ALTER TYPE conversationstatus ADD VALUE IF NOT EXISTS 'active'")
        # Note: 'paused' might conflict with existing, we'll handle this gracefully


def downgrade():
    """Downgrade database by removing enhanced AI agent models"""
    
    # Drop the agent_messages table
    op.drop_table('agent_messages')
    
    # Remove new indexes
    op.drop_index('idx_conversation_last_message', 'agent_conversations')
    op.drop_index('idx_conversation_not_deleted', 'agent_conversations')
    op.drop_index('idx_agent_instance_last_activity', 'agent_instances')
    op.drop_index('idx_agent_instance_not_deleted', 'agent_instances')
    op.drop_index('idx_agent_created_by', 'agents')
    op.drop_index('idx_agent_not_deleted', 'agents')
    
    # Remove new columns from agent_conversations
    op.drop_column('agent_conversations', 'deleted_at')
    op.drop_column('agent_conversations', 'is_deleted')
    
    # Remove new columns from agent_instances
    op.drop_column('agent_instances', 'deleted_at')
    op.drop_column('agent_instances', 'is_deleted')
    op.drop_column('agent_instances', 'last_activity')
    op.drop_column('agent_instances', 'uptime_percentage')
    op.drop_column('agent_instances', 'total_messages')
    
    # Remove foreign key constraint and new columns from agents
    op.drop_constraint('fk_agents_created_by', 'agents', type_='foreignkey')
    op.drop_column('agents', 'deleted_at')
    op.drop_column('agents', 'is_deleted')
    op.drop_column('agents', 'created_by_id')
    op.drop_column('agents', 'estimated_cost_per_month')
    op.drop_column('agents', 'capabilities')
    
    # Note: We don't remove enum values in downgrade as it can break existing data
    # Enum values remain for backward compatibility