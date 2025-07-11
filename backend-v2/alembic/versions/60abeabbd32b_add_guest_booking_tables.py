"""Add guest booking tables

Revision ID: 60abeabbd32b
Revises: a0ed49b911af
Create Date: 2025-07-09 16:17:47.598618

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '60abeabbd32b'
down_revision: Union[str, None] = 'a0ed49b911af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create guest_bookings table
    op.create_table('guest_bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guest_name', sa.String(), nullable=False),
        sa.Column('guest_email', sa.String(), nullable=False),
        sa.Column('guest_phone', sa.String(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('appointment_datetime', sa.DateTime(), nullable=False),
        sa.Column('appointment_timezone', sa.String(length=50), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('service_price', sa.Float(), nullable=False),
        sa.Column('deposit_amount', sa.Float(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('confirmation_code', sa.String(), nullable=True),
        sa.Column('payment_intent_id', sa.String(), nullable=True),
        sa.Column('payment_status', sa.String(), nullable=True),
        sa.Column('converted_to_user_id', sa.Integer(), nullable=True),
        sa.Column('converted_to_appointment_id', sa.Integer(), nullable=True),
        sa.Column('conversion_date', sa.DateTime(), nullable=True),
        sa.Column('referral_source', sa.String(), nullable=True),
        sa.Column('booking_page_url', sa.String(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('marketing_consent', sa.Boolean(), nullable=True),
        sa.Column('reminder_preference', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['converted_to_appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['converted_to_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guest_bookings_confirmation_code'), 'guest_bookings', ['confirmation_code'], unique=True)
    op.create_index(op.f('ix_guest_bookings_created_at'), 'guest_bookings', ['created_at'], unique=False)
    op.create_index(op.f('ix_guest_bookings_guest_email'), 'guest_bookings', ['guest_email'], unique=False)
    op.create_index(op.f('ix_guest_bookings_guest_name'), 'guest_bookings', ['guest_name'], unique=False)
    op.create_index(op.f('ix_guest_bookings_id'), 'guest_bookings', ['id'], unique=False)
    op.create_index('idx_appointment_date_org', 'guest_bookings', ['appointment_datetime', 'organization_id'], unique=False)
    op.create_index('idx_guest_email_org', 'guest_bookings', ['guest_email', 'organization_id'], unique=False)
    op.create_index('idx_guest_phone_org', 'guest_bookings', ['guest_phone', 'organization_id'], unique=False)
    op.create_index('idx_status_org', 'guest_bookings', ['status', 'organization_id'], unique=False)
    
    # Create guest_booking_notifications table
    op.create_table('guest_booking_notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guest_booking_id', sa.Integer(), nullable=False),
        sa.Column('notification_type', sa.String(), nullable=False),
        sa.Column('channel', sa.String(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('subject', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.Column('clicked_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['guest_booking_id'], ['guest_bookings.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guest_booking_notifications_id'), 'guest_booking_notifications', ['id'], unique=False)
    op.create_index('idx_guest_booking_type', 'guest_booking_notifications', ['guest_booking_id', 'notification_type'], unique=False)


def downgrade() -> None:
    # Drop indexes and tables in reverse order
    op.drop_index('idx_guest_booking_type', table_name='guest_booking_notifications')
    op.drop_index(op.f('ix_guest_booking_notifications_id'), table_name='guest_booking_notifications')
    op.drop_table('guest_booking_notifications')
    
    op.drop_index('idx_status_org', table_name='guest_bookings')
    op.drop_index('idx_guest_phone_org', table_name='guest_bookings')
    op.drop_index('idx_guest_email_org', table_name='guest_bookings')
    op.drop_index('idx_appointment_date_org', table_name='guest_bookings')
    op.drop_index(op.f('ix_guest_bookings_id'), table_name='guest_bookings')
    op.drop_index(op.f('ix_guest_bookings_guest_name'), table_name='guest_bookings')
    op.drop_index(op.f('ix_guest_bookings_guest_email'), table_name='guest_bookings')
    op.drop_index(op.f('ix_guest_bookings_created_at'), table_name='guest_bookings')
    op.drop_index(op.f('ix_guest_bookings_confirmation_code'), table_name='guest_bookings')
    op.drop_table('guest_bookings')