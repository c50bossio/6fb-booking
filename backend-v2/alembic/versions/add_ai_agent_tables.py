"""add ai agent tables

Revision ID: add_ai_agent_tables
Revises: 
Create Date: 2025-07-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_ai_agent_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create Agent table
    op.create_table('agents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('agent_type', sa.Enum('rebooking', 'no_show_fee', 'birthday_wishes', 'holiday_greetings', 'review_request', 'retention', 'upsell', 'appointment_reminder', 'custom', name='agenttype'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_config', sa.JSON(), nullable=False),
        sa.Column('prompt_templates', sa.JSON(), nullable=False),
        sa.Column('required_permissions', sa.JSON(), nullable=True),
        sa.Column('supported_channels', sa.JSON(), nullable=True),
        sa.Column('min_interval_hours', sa.Integer(), nullable=True),
        sa.Column('max_attempts', sa.Integer(), nullable=True),
        sa.Column('base_price', sa.Float(), nullable=True),
        sa.Column('token_rate', sa.Float(), nullable=True),
        sa.Column('success_fee_percent', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_premium', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_agent_type_active', 'agents', ['agent_type', 'is_active'], unique=False)
    op.create_index(op.f('ix_agents_agent_type'), 'agents', ['agent_type'], unique=False)

    # Create AgentInstance table
    op.create_table('agent_instances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('schedule_config', sa.JSON(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'active', 'paused', 'inactive', 'error', name='agentstatus'), nullable=True),
        sa.Column('last_run_at', sa.DateTime(), nullable=True),
        sa.Column('next_run_at', sa.DateTime(), nullable=True),
        sa.Column('error_count', sa.Integer(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('total_conversations', sa.Integer(), nullable=True),
        sa.Column('successful_conversations', sa.Integer(), nullable=True),
        sa.Column('total_revenue_generated', sa.Float(), nullable=True),
        sa.Column('activated_at', sa.DateTime(), nullable=True),
        sa.Column('deactivated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['barbershop_locations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_agent_instance_next_run', 'agent_instances', ['next_run_at', 'status'], unique=False)
    op.create_index('idx_agent_instance_user_status', 'agent_instances', ['user_id', 'status'], unique=False)
    op.create_index(op.f('ix_agent_instances_status'), 'agent_instances', ['status'], unique=False)

    # Create AgentConversation table
    op.create_table('agent_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=True),
        sa.Column('agent_instance_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('status', sa.Enum('pending', 'in_progress', 'waiting_response', 'completed', 'failed', 'opted_out', name='conversationstatus'), nullable=True),
        sa.Column('messages', sa.JSON(), nullable=True),
        sa.Column('message_count', sa.Integer(), nullable=True),
        sa.Column('total_tokens_used', sa.Integer(), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('token_cost', sa.Float(), nullable=True),
        sa.Column('goal_achieved', sa.Boolean(), nullable=True),
        sa.Column('revenue_generated', sa.Float(), nullable=True),
        sa.Column('appointment_id', sa.Integer(), nullable=True),
        sa.Column('context_data', sa.JSON(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('last_message_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agent_instance_id'], ['agent_instances.id'], ),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('conversation_id')
    )
    op.create_index('idx_conversation_client_agent', 'agent_conversations', ['client_id', 'agent_instance_id'], unique=False)
    op.create_index('idx_conversation_status_scheduled', 'agent_conversations', ['status', 'scheduled_at'], unique=False)
    op.create_index(op.f('ix_agent_conversations_conversation_id'), 'agent_conversations', ['conversation_id'], unique=True)
    op.create_index(op.f('ix_agent_conversations_status'), 'agent_conversations', ['status'], unique=False)

    # Create AgentMetrics table
    op.create_table('agent_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_instance_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('conversations_started', sa.Integer(), nullable=True),
        sa.Column('conversations_completed', sa.Integer(), nullable=True),
        sa.Column('conversations_failed', sa.Integer(), nullable=True),
        sa.Column('messages_sent', sa.Integer(), nullable=True),
        sa.Column('messages_received', sa.Integer(), nullable=True),
        sa.Column('goals_achieved', sa.Integer(), nullable=True),
        sa.Column('conversion_rate', sa.Float(), nullable=True),
        sa.Column('response_rate', sa.Float(), nullable=True),
        sa.Column('revenue_generated', sa.Float(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('token_cost', sa.Float(), nullable=True),
        sa.Column('roi', sa.Float(), nullable=True),
        sa.Column('avg_response_time_minutes', sa.Float(), nullable=True),
        sa.Column('avg_conversation_duration_minutes', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agent_instance_id'], ['agent_instances.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_metrics_instance_date', 'agent_metrics', ['agent_instance_id', 'date'], unique=False)
    op.create_index(op.f('ix_agent_metrics_date'), 'agent_metrics', ['date'], unique=False)

    # Create AgentSubscription table
    op.create_table('agent_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tier', sa.Enum('trial', 'starter', 'professional', 'enterprise', 'custom', name='subscriptiontier'), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('monthly_price', sa.Float(), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(length=100), nullable=True),
        sa.Column('stripe_customer_id', sa.String(length=100), nullable=True),
        sa.Column('conversation_limit', sa.Integer(), nullable=True),
        sa.Column('agent_limit', sa.Integer(), nullable=True),
        sa.Column('included_tokens', sa.Integer(), nullable=True),
        sa.Column('conversations_used', sa.Integer(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('overage_tokens', sa.Integer(), nullable=True),
        sa.Column('overage_charges', sa.Float(), nullable=True),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('idx_subscription_status_tier', 'agent_subscriptions', ['status', 'tier'], unique=False)
    op.create_index(op.f('ix_agent_subscriptions_status'), 'agent_subscriptions', ['status'], unique=False)
    op.create_index(op.f('ix_agent_subscriptions_tier'), 'agent_subscriptions', ['tier'], unique=False)

    # Create AgentTemplate table
    op.create_table('agent_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_type', sa.Enum('rebooking', 'no_show_fee', 'birthday_wishes', 'holiday_greetings', 'review_request', 'retention', 'upsell', 'appointment_reminder', 'custom', name='agenttype'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('initial_message_template', sa.Text(), nullable=False),
        sa.Column('follow_up_templates', sa.JSON(), nullable=True),
        sa.Column('required_variables', sa.JSON(), nullable=True),
        sa.Column('tone_settings', sa.JSON(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('avg_success_rate', sa.Float(), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_template_type_active', 'agent_templates', ['agent_type', 'is_active'], unique=False)
    op.create_index(op.f('ix_agent_templates_agent_type'), 'agent_templates', ['agent_type'], unique=False)

    # Add agent-related columns to existing tables
    op.add_column('clients', sa.Column('agent_opt_out', sa.Boolean(), nullable=True))
    op.add_column('clients', sa.Column('agent_preferences', sa.JSON(), nullable=True))
    op.add_column('appointments', sa.Column('created_by_agent_id', sa.Integer(), nullable=True))
    op.add_column('payments', sa.Column('collected_by_agent_id', sa.Integer(), nullable=True))
    
    # Add foreign keys
    op.create_foreign_key(None, 'appointments', 'agent_instances', ['created_by_agent_id'], ['id'])
    op.create_foreign_key(None, 'payments', 'agent_instances', ['collected_by_agent_id'], ['id'])


def downgrade() -> None:
    # Drop foreign keys
    op.drop_constraint(None, 'payments', type_='foreignkey')
    op.drop_constraint(None, 'appointments', type_='foreignkey')
    
    # Drop columns from existing tables
    op.drop_column('payments', 'collected_by_agent_id')
    op.drop_column('appointments', 'created_by_agent_id')
    op.drop_column('clients', 'agent_preferences')
    op.drop_column('clients', 'agent_opt_out')
    
    # Drop tables
    op.drop_index('idx_template_type_active', table_name='agent_templates')
    op.drop_index(op.f('ix_agent_templates_agent_type'), table_name='agent_templates')
    op.drop_table('agent_templates')
    
    op.drop_index('idx_subscription_status_tier', table_name='agent_subscriptions')
    op.drop_index(op.f('ix_agent_subscriptions_tier'), table_name='agent_subscriptions')
    op.drop_index(op.f('ix_agent_subscriptions_status'), table_name='agent_subscriptions')
    op.drop_table('agent_subscriptions')
    
    op.drop_index('idx_metrics_instance_date', table_name='agent_metrics')
    op.drop_index(op.f('ix_agent_metrics_date'), table_name='agent_metrics')
    op.drop_table('agent_metrics')
    
    op.drop_index('idx_conversation_status_scheduled', table_name='agent_conversations')
    op.drop_index('idx_conversation_client_agent', table_name='agent_conversations')
    op.drop_index(op.f('ix_agent_conversations_status'), table_name='agent_conversations')
    op.drop_index(op.f('ix_agent_conversations_conversation_id'), table_name='agent_conversations')
    op.drop_table('agent_conversations')
    
    op.drop_index('idx_agent_instance_user_status', table_name='agent_instances')
    op.drop_index('idx_agent_instance_next_run', table_name='agent_instances')
    op.drop_index(op.f('ix_agent_instances_status'), table_name='agent_instances')
    op.drop_table('agent_instances')
    
    op.drop_index('idx_agent_type_active', table_name='agents')
    op.drop_index(op.f('ix_agents_agent_type'), table_name='agents')
    op.drop_table('agents')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS agenttype')
    op.execute('DROP TYPE IF EXISTS agentstatus')
    op.execute('DROP TYPE IF EXISTS conversationstatus')
    op.execute('DROP TYPE IF EXISTS subscriptiontier')