"""Add comprehensive cancellation and refund system

Revision ID: add_cancellation_system
Revises: 
Create Date: 2025-07-03

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_cancellation_system'
down_revision = None  # Update this with the actual latest revision
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    cancellation_reason_enum = sa.Enum(
        'CLIENT_REQUEST', 'EMERGENCY', 'ILLNESS', 'WEATHER', 
        'BARBER_UNAVAILABLE', 'SCHEDULING_CONFLICT', 'NO_SHOW', 'OTHER',
        name='cancellationreason'
    )
    
    refund_type_enum = sa.Enum(
        'FULL_REFUND', 'PARTIAL_REFUND', 'NO_REFUND', 'CREDIT_ONLY',
        name='refundtype'
    )
    
    cancellation_reason_enum.create(op.get_bind())
    refund_type_enum.create(op.get_bind())
    
    # Create cancellation_policies table
    op.create_table(
        'cancellation_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_default', sa.Boolean(), nullable=True, default=False),
        sa.Column('service_id', sa.Integer(), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('immediate_cancellation_hours', sa.Integer(), nullable=True, default=0),
        sa.Column('short_notice_hours', sa.Integer(), nullable=True, default=24),
        sa.Column('advance_notice_hours', sa.Integer(), nullable=True, default=48),
        sa.Column('immediate_refund_percentage', sa.Float(), nullable=True, default=0.0),
        sa.Column('short_notice_refund_percentage', sa.Float(), nullable=True, default=0.5),
        sa.Column('advance_refund_percentage', sa.Float(), nullable=True, default=1.0),
        sa.Column('immediate_cancellation_fee', sa.Float(), nullable=True, default=0.0),
        sa.Column('short_notice_cancellation_fee', sa.Float(), nullable=True, default=0.0),
        sa.Column('advance_cancellation_fee', sa.Float(), nullable=True, default=0.0),
        sa.Column('no_show_fee', sa.Float(), nullable=True, default=0.0),
        sa.Column('no_show_refund_percentage', sa.Float(), nullable=True, default=0.0),
        sa.Column('allow_emergency_exception', sa.Boolean(), nullable=True, default=True),
        sa.Column('emergency_refund_percentage', sa.Float(), nullable=True, default=1.0),
        sa.Column('emergency_requires_approval', sa.Boolean(), nullable=True, default=True),
        sa.Column('max_cancellations_per_month', sa.Integer(), nullable=True),
        sa.Column('penalty_for_excess_cancellations', sa.Float(), nullable=True, default=0.0),
        sa.Column('first_time_client_grace', sa.Boolean(), nullable=True, default=True),
        sa.Column('first_time_client_hours', sa.Integer(), nullable=True, default=24),
        sa.Column('first_time_client_refund_percentage', sa.Float(), nullable=True, default=1.0),
        sa.Column('auto_offer_to_waitlist', sa.Boolean(), nullable=True, default=True),
        sa.Column('waitlist_notification_hours', sa.Integer(), nullable=True, default=2),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('advanced_rules', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cancellation_policies_id'), 'cancellation_policies', ['id'], unique=False)
    
    # Create appointment_cancellations table
    op.create_table(
        'appointment_cancellations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('policy_id', sa.Integer(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_by_id', sa.Integer(), nullable=True),
        sa.Column('reason', cancellation_reason_enum, nullable=True, default='CLIENT_REQUEST'),
        sa.Column('reason_details', sa.Text(), nullable=True),
        sa.Column('hours_before_appointment', sa.Float(), nullable=False),
        sa.Column('original_appointment_time', sa.DateTime(), nullable=False),
        sa.Column('original_amount', sa.Float(), nullable=False),
        sa.Column('refund_type', refund_type_enum, nullable=False),
        sa.Column('refund_percentage', sa.Float(), nullable=True, default=0.0),
        sa.Column('refund_amount', sa.Float(), nullable=True, default=0.0),
        sa.Column('cancellation_fee', sa.Float(), nullable=True, default=0.0),
        sa.Column('net_refund_amount', sa.Float(), nullable=True, default=0.0),
        sa.Column('policy_rule_applied', sa.String(length=50), nullable=True),
        sa.Column('is_emergency_exception', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_first_time_client_grace', sa.Boolean(), nullable=True, default=False),
        sa.Column('requires_manual_approval', sa.Boolean(), nullable=True, default=False),
        sa.Column('refund_processed', sa.Boolean(), nullable=True, default=False),
        sa.Column('refund_processed_at', sa.DateTime(), nullable=True),
        sa.Column('refund_processed_by_id', sa.Integer(), nullable=True),
        sa.Column('original_payment_id', sa.Integer(), nullable=True),
        sa.Column('refund_id', sa.Integer(), nullable=True),
        sa.Column('slot_offered_to_waitlist', sa.Boolean(), nullable=True, default=False),
        sa.Column('waitlist_offered_at', sa.DateTime(), nullable=True),
        sa.Column('slot_filled_from_waitlist', sa.Boolean(), nullable=True, default=False),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['cancelled_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['original_payment_id'], ['payments.id'], ),
        sa.ForeignKeyConstraint(['policy_id'], ['cancellation_policies.id'], ),
        sa.ForeignKeyConstraint(['refund_id'], ['refunds.id'], ),
        sa.ForeignKeyConstraint(['refund_processed_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('appointment_id')
    )
    op.create_index(op.f('ix_appointment_cancellations_id'), 'appointment_cancellations', ['id'], unique=False)
    
    # Create waitlist_entries table
    op.create_table(
        'waitlist_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=True),
        sa.Column('service_id', sa.Integer(), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('preferred_date', sa.DateTime(), nullable=True),
        sa.Column('earliest_acceptable_date', sa.DateTime(), nullable=True),
        sa.Column('latest_acceptable_date', sa.DateTime(), nullable=True),
        sa.Column('preferred_time_start', sa.Time(), nullable=True),
        sa.Column('preferred_time_end', sa.Time(), nullable=True),
        sa.Column('flexible_on_barber', sa.Boolean(), nullable=True, default=True),
        sa.Column('flexible_on_time', sa.Boolean(), nullable=True, default=True),
        sa.Column('flexible_on_date', sa.Boolean(), nullable=True, default=False),
        sa.Column('notify_via_sms', sa.Boolean(), nullable=True, default=True),
        sa.Column('notify_via_email', sa.Boolean(), nullable=True, default=True),
        sa.Column('notify_via_push', sa.Boolean(), nullable=True, default=False),
        sa.Column('auto_book_if_available', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('priority_score', sa.Integer(), nullable=True, default=0),
        sa.Column('times_notified', sa.Integer(), nullable=True, default=0),
        sa.Column('last_notified_at', sa.DateTime(), nullable=True),
        sa.Column('current_offer_appointment_id', sa.Integer(), nullable=True),
        sa.Column('offer_expires_at', sa.DateTime(), nullable=True),
        sa.Column('declined_appointment_ids', sa.JSON(), nullable=True),
        sa.Column('fulfilled_at', sa.DateTime(), nullable=True),
        sa.Column('fulfilled_appointment_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['current_offer_appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['fulfilled_appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_waitlist_entries_id'), 'waitlist_entries', ['id'], unique=False)
    
    # Create cancellation_policy_history table
    op.create_table(
        'cancellation_policy_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('policy_id', sa.Integer(), nullable=False),
        sa.Column('changed_by_id', sa.Integer(), nullable=False),
        sa.Column('change_reason', sa.String(length=255), nullable=True),
        sa.Column('previous_config', sa.JSON(), nullable=True),
        sa.Column('new_config', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['changed_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['policy_id'], ['cancellation_policies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cancellation_policy_history_id'), 'cancellation_policy_history', ['id'], unique=False)

def downgrade():
    # Drop tables
    op.drop_index(op.f('ix_cancellation_policy_history_id'), table_name='cancellation_policy_history')
    op.drop_table('cancellation_policy_history')
    
    op.drop_index(op.f('ix_waitlist_entries_id'), table_name='waitlist_entries')
    op.drop_table('waitlist_entries')
    
    op.drop_index(op.f('ix_appointment_cancellations_id'), table_name='appointment_cancellations')
    op.drop_table('appointment_cancellations')
    
    op.drop_index(op.f('ix_cancellation_policies_id'), table_name='cancellation_policies')
    op.drop_table('cancellation_policies')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS refundtype')
    op.execute('DROP TYPE IF EXISTS cancellationreason')