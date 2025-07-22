"""Add AI models for SQLite (no enums)

Revision ID: 68810d27f8d2
Revises: e26babfffafd
Create Date: 2025-07-21 21:48:43.293831

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '68810d27f8d2'
down_revision: Union[str, Sequence[str], None] = 'e26babfffafd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # AI Intervention Campaigns table
    op.create_table('ai_intervention_campaigns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_name', sa.String(length=255), nullable=False),
        sa.Column('campaign_type', sa.String(length=50), nullable=False),  # SQLite string instead of enum
        sa.Column('status', sa.String(length=50), nullable=True, default='pending'),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False),
        sa.Column('risk_level', sa.String(length=50), nullable=False),
        sa.Column('predicted_no_show_probability', sa.Float(), nullable=False),
        sa.Column('ai_generated_messages', sa.JSON(), nullable=True),
        sa.Column('message_templates_used', sa.JSON(), nullable=True),
        sa.Column('personalization_factors', sa.JSON(), nullable=True),
        sa.Column('intervention_channels', sa.JSON(), nullable=True),
        sa.Column('intervention_timing', sa.JSON(), nullable=True),
        sa.Column('max_attempts', sa.Integer(), nullable=True, default=3),
        sa.Column('attempt_intervals', sa.JSON(), nullable=True),
        sa.Column('attempts_made', sa.Integer(), nullable=True, default=0),
        sa.Column('messages_sent', sa.Integer(), nullable=True, default=0),
        sa.Column('last_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('next_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('outcome', sa.String(length=50), nullable=True),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('engagement_metrics', sa.JSON(), nullable=True),
        sa.Column('client_response', sa.Text(), nullable=True),
        sa.Column('effectiveness_score', sa.Float(), nullable=True),
        sa.Column('a_b_test_variant', sa.String(length=50), nullable=True),
        sa.Column('optimization_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_intervention_campaigns_id'), 'ai_intervention_campaigns', ['id'], unique=False)

    # Weather Data table
    op.create_table('weather_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('zip_code', sa.String(length=20), nullable=True),
        sa.Column('condition', sa.String(length=50), nullable=False),  # SQLite string instead of enum
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('humidity', sa.Float(), nullable=True),
        sa.Column('wind_speed', sa.Float(), nullable=True),
        sa.Column('precipitation_chance', sa.Float(), nullable=True),
        sa.Column('precipitation_amount', sa.Float(), nullable=True),
        sa.Column('comfort_index', sa.Float(), nullable=True),
        sa.Column('travel_difficulty', sa.Float(), nullable=True),
        sa.Column('appointment_impact_score', sa.Float(), nullable=True),
        sa.Column('data_source', sa.String(length=100), nullable=True),
        sa.Column('data_quality', sa.Float(), nullable=True),
        sa.Column('is_forecast', sa.Boolean(), nullable=True, default=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('forecast_for', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('processed_by_ai', sa.Boolean(), nullable=True, default=False),
        sa.Column('ai_analysis', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_weather_data_id'), 'weather_data', ['id'], unique=False)

    # Client Tier Data table
    op.create_table('client_tier_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('current_tier', sa.String(length=50), nullable=False, default='new'),  # SQLite string instead of enum
        sa.Column('previous_tier', sa.String(length=50), nullable=True),
        sa.Column('tier_since', sa.DateTime(), nullable=True),
        sa.Column('total_spent', sa.Float(), nullable=True, default=0.0),
        sa.Column('total_appointments', sa.Integer(), nullable=True, default=0),
        sa.Column('no_show_rate', sa.Float(), nullable=True, default=0.0),
        sa.Column('avg_tip_percentage', sa.Float(), nullable=True, default=0.0),
        sa.Column('referrals_made', sa.Integer(), nullable=True, default=0),
        sa.Column('loyalty_points', sa.Integer(), nullable=True, default=0),
        sa.Column('last_appointment_date', sa.DateTime(), nullable=True),
        sa.Column('avg_time_between_appointments', sa.Integer(), nullable=True),
        sa.Column('preferred_services', sa.JSON(), nullable=True),
        sa.Column('preferred_times', sa.JSON(), nullable=True),
        sa.Column('communication_preferences', sa.JSON(), nullable=True),
        sa.Column('loyalty_score', sa.Float(), nullable=True, default=0.0),
        sa.Column('value_score', sa.Float(), nullable=True, default=0.0),
        sa.Column('engagement_score', sa.Float(), nullable=True, default=0.0),
        sa.Column('retention_risk', sa.Float(), nullable=True, default=0.0),
        sa.Column('upsell_potential', sa.Float(), nullable=True, default=0.0),
        sa.Column('tier_benefits', sa.JSON(), nullable=True),
        sa.Column('benefits_used', sa.JSON(), nullable=True),
        sa.Column('next_tier_requirements', sa.JSON(), nullable=True),
        sa.Column('personality_profile', sa.JSON(), nullable=True),
        sa.Column('booking_patterns', sa.JSON(), nullable=True),
        sa.Column('price_sensitivity', sa.Float(), nullable=True),
        sa.Column('service_preferences', sa.JSON(), nullable=True),
        sa.Column('eligible_promotions', sa.JSON(), nullable=True),
        sa.Column('promotion_response_history', sa.JSON(), nullable=True),
        sa.Column('marketing_preferences', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('last_calculated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_client_tier_data_id'), 'client_tier_data', ['id'], unique=False)

    # Message Templates table
    op.create_table('message_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_name', sa.String(length=255), nullable=False),
        sa.Column('template_type', sa.String(length=100), nullable=False),
        sa.Column('message_channel', sa.String(length=50), nullable=False),
        sa.Column('subject_template', sa.Text(), nullable=True),
        sa.Column('body_template', sa.Text(), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=True),
        sa.Column('ai_generated', sa.Boolean(), nullable=True, default=False),
        sa.Column('ai_confidence', sa.Float(), nullable=True),
        sa.Column('personalization_factors', sa.JSON(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('success_rate', sa.Float(), nullable=True, default=0.0),
        sa.Column('engagement_rate', sa.Float(), nullable=True, default=0.0),
        sa.Column('is_test_variant', sa.Boolean(), nullable=True, default=False),
        sa.Column('test_group', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_templates_id'), 'message_templates', ['id'], unique=False)

    # AI Message Generations table
    op.create_table('ai_message_generations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.String(length=100), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('appointment_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(length=100), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False),
        sa.Column('ai_provider', sa.String(length=100), nullable=True),
        sa.Column('ai_model', sa.String(length=100), nullable=True),
        sa.Column('generation_prompt', sa.Text(), nullable=True),
        sa.Column('ai_confidence', sa.Float(), nullable=True),
        sa.Column('generation_time_ms', sa.Integer(), nullable=True),
        sa.Column('personalization_data', sa.JSON(), nullable=True),
        sa.Column('client_segment', sa.String(length=100), nullable=True),
        sa.Column('risk_level', sa.String(length=50), nullable=True),
        sa.Column('was_sent', sa.Boolean(), nullable=True, default=False),
        sa.Column('delivery_status', sa.String(length=50), nullable=True),
        sa.Column('opened', sa.Boolean(), nullable=True, default=False),
        sa.Column('clicked', sa.Boolean(), nullable=True, default=False),
        sa.Column('responded', sa.Boolean(), nullable=True, default=False),
        sa.Column('engagement_score', sa.Float(), nullable=True),
        sa.Column('test_variant', sa.String(length=50), nullable=True),
        sa.Column('control_group', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.Column('clicked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['message_templates.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('message_id')
    )
    op.create_index(op.f('ix_ai_message_generations_id'), 'ai_message_generations', ['id'], unique=False)

    # Message Personalizations table
    op.create_table('message_personalizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rule_name', sa.String(length=255), nullable=False),
        sa.Column('rule_type', sa.String(length=100), nullable=False),
        sa.Column('client_tier', sa.String(length=50), nullable=True),  # SQLite string instead of enum
        sa.Column('appointment_type', sa.String(length=100), nullable=True),
        sa.Column('risk_level', sa.String(length=50), nullable=True),
        sa.Column('time_of_day', sa.String(length=50), nullable=True),
        sa.Column('day_of_week', sa.String(length=20), nullable=True),
        sa.Column('weather_condition', sa.String(length=50), nullable=True),
        sa.Column('content_variations', sa.JSON(), nullable=True),
        sa.Column('tone_style', sa.String(length=100), nullable=True),
        sa.Column('urgency_level', sa.String(length=50), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('success_rate', sa.Float(), nullable=True, default=0.0),
        sa.Column('conversion_rate', sa.Float(), nullable=True, default=0.0),
        sa.Column('is_test_rule', sa.Boolean(), nullable=True, default=False),
        sa.Column('test_description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_personalizations_id'), 'message_personalizations', ['id'], unique=False)

    # Client Sentiments table
    op.create_table('client_sentiments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.String(length=100), nullable=True),
        sa.Column('conversation_id', sa.String(length=100), nullable=True),
        sa.Column('sentiment_score', sa.Float(), nullable=False),
        sa.Column('sentiment_label', sa.String(length=50), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('detected_intent', sa.String(length=50), nullable=True),  # SQLite string instead of enum
        sa.Column('intent_confidence', sa.Float(), nullable=True),
        sa.Column('message_text', sa.Text(), nullable=False),
        sa.Column('message_channel', sa.String(length=50), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=True),
        sa.Column('interaction_type', sa.String(length=100), nullable=True),
        sa.Column('ai_provider', sa.String(length=100), nullable=True),
        sa.Column('ai_model', sa.String(length=100), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_client_sentiments_id'), 'client_sentiments', ['id'], unique=False)

    # AI Intervention Learning table
    op.create_table('ai_intervention_learning',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('client_segment', sa.String(length=100), nullable=True),
        sa.Column('appointment_type', sa.String(length=100), nullable=True),
        sa.Column('risk_level', sa.String(length=50), nullable=True),
        sa.Column('intervention_type', sa.String(length=50), nullable=False),  # SQLite string instead of enum
        sa.Column('message_template', sa.String(length=255), nullable=True),
        sa.Column('delivery_channel', sa.String(length=50), nullable=True),
        sa.Column('timing_offset', sa.Integer(), nullable=True),
        sa.Column('was_successful', sa.Boolean(), nullable=False),
        sa.Column('outcome_type', sa.String(length=50), nullable=False),  # SQLite string instead of enum
        sa.Column('engagement_score', sa.Float(), nullable=True),
        sa.Column('conversion_rate', sa.Float(), nullable=True),
        sa.Column('weather_condition', sa.String(length=50), nullable=True),
        sa.Column('day_of_week', sa.String(length=20), nullable=True),
        sa.Column('time_of_day', sa.String(length=20), nullable=True),
        sa.Column('season', sa.String(length=20), nullable=True),
        sa.Column('client_tier', sa.String(length=50), nullable=True),  # SQLite string instead of enum
        sa.Column('feature_importance', sa.JSON(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('sample_size', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('learned_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['ai_intervention_campaigns.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_intervention_learning_id'), 'ai_intervention_learning', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order
    op.drop_index(op.f('ix_ai_intervention_learning_id'), table_name='ai_intervention_learning')
    op.drop_table('ai_intervention_learning')
    op.drop_index(op.f('ix_client_sentiments_id'), table_name='client_sentiments')
    op.drop_table('client_sentiments')
    op.drop_index(op.f('ix_message_personalizations_id'), table_name='message_personalizations')
    op.drop_table('message_personalizations')
    op.drop_index(op.f('ix_ai_message_generations_id'), table_name='ai_message_generations')
    op.drop_table('ai_message_generations')
    op.drop_index(op.f('ix_message_templates_id'), table_name='message_templates')
    op.drop_table('message_templates')
    op.drop_index(op.f('ix_client_tier_data_id'), table_name='client_tier_data')
    op.drop_table('client_tier_data')
    op.drop_index(op.f('ix_weather_data_id'), table_name='weather_data')
    op.drop_table('weather_data')
    op.drop_index(op.f('ix_ai_intervention_campaigns_id'), table_name='ai_intervention_campaigns')
    op.drop_table('ai_intervention_campaigns')
