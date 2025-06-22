"""add booking system tables

Revision ID: 20250621184040
Revises: 069d2c0b62fb
Create Date: 2025-06-21 18:40:40.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250621184040'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create service_categories table
    op.create_table('service_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_service_categories_id'), 'service_categories', ['id'], unique=False)

    # Create services table
    op.create_table('services',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('base_price', sa.Float(), nullable=False),
        sa.Column('min_price', sa.Float(), nullable=True),
        sa.Column('max_price', sa.Float(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('buffer_minutes', sa.Integer(), nullable=True),
        sa.Column('requires_deposit', sa.Boolean(), nullable=True),
        sa.Column('deposit_type', sa.String(length=20), nullable=True),
        sa.Column('deposit_amount', sa.Float(), nullable=True),
        sa.Column('is_addon', sa.Boolean(), nullable=True),
        sa.Column('can_overlap', sa.Boolean(), nullable=True),
        sa.Column('max_advance_days', sa.Integer(), nullable=True),
        sa.Column('min_advance_hours', sa.Integer(), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('meta_description', sa.Text(), nullable=True),
        sa.CheckConstraint('base_price >= 0', name='check_positive_price'),
        sa.CheckConstraint('deposit_amount >= 0', name='check_positive_deposit'),
        sa.CheckConstraint('duration_minutes > 0', name='check_positive_duration'),
        sa.ForeignKeyConstraint(['barber_id'], ['barbers.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['service_categories.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_services_id'), 'services', ['id'], unique=False)

    # Create barber_availability table
    op.create_table('barber_availability',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Enum('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', name='dayofweek'), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('break_start', sa.Time(), nullable=True),
        sa.Column('break_end', sa.Time(), nullable=True),
        sa.Column('is_available', sa.Boolean(), nullable=True),
        sa.Column('max_bookings', sa.Integer(), nullable=True),
        sa.Column('effective_from', sa.Date(), nullable=True),
        sa.Column('effective_until', sa.Date(), nullable=True),
        sa.CheckConstraint('break_end > break_start OR break_start IS NULL', name='check_valid_break'),
        sa.CheckConstraint('end_time > start_time', name='check_valid_hours'),
        sa.ForeignKeyConstraint(['barber_id'], ['barbers.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('barber_id', 'location_id', 'day_of_week', 'start_time', name='unique_barber_schedule')
    )
    op.create_index(op.f('ix_barber_availability_id'), 'barber_availability', ['id'], unique=False)

    # Create booking_rules table
    op.create_table('booking_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('location_id', sa.Integer(), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('service_id', sa.Integer(), nullable=True),
        sa.Column('rule_type', sa.String(length=50), nullable=False),
        sa.Column('rule_name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('effective_from', sa.DateTime(), nullable=True),
        sa.Column('effective_until', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['barbers.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_booking_rules_id'), 'booking_rules', ['id'], unique=False)

    # Create reviews table
    op.create_table('reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('overall_rating', sa.Enum('ONE_STAR', 'TWO_STARS', 'THREE_STARS', 'FOUR_STARS', 'FIVE_STARS', name='reviewrating'), nullable=False),
        sa.Column('service_rating', sa.Enum('ONE_STAR', 'TWO_STARS', 'THREE_STARS', 'FOUR_STARS', 'FIVE_STARS', name='reviewrating'), nullable=True),
        sa.Column('cleanliness_rating', sa.Enum('ONE_STAR', 'TWO_STARS', 'THREE_STARS', 'FOUR_STARS', 'FIVE_STARS', name='reviewrating'), nullable=True),
        sa.Column('punctuality_rating', sa.Enum('ONE_STAR', 'TWO_STARS', 'THREE_STARS', 'FOUR_STARS', 'FIVE_STARS', name='reviewrating'), nullable=True),
        sa.Column('value_rating', sa.Enum('ONE_STAR', 'TWO_STARS', 'THREE_STARS', 'FOUR_STARS', 'FIVE_STARS', name='reviewrating'), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('barber_response', sa.Text(), nullable=True),
        sa.Column('barber_response_date', sa.DateTime(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('verification_date', sa.DateTime(), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=True),
        sa.Column('is_hidden', sa.Boolean(), nullable=True),
        sa.Column('hide_reason', sa.String(length=200), nullable=True),
        sa.Column('photos', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['barber_id'], ['barbers.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('appointment_id')
    )
    op.create_index(op.f('ix_reviews_id'), 'reviews', ['id'], unique=False)

    # Create booking_slots table
    op.create_table('booking_slots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('barber_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('slot_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=True),
        sa.Column('is_blocked', sa.Boolean(), nullable=True),
        sa.Column('block_reason', sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['barbers.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('barber_id', 'location_id', 'slot_date', 'start_time', name='unique_booking_slot')
    )
    op.create_index(op.f('ix_booking_slots_id'), 'booking_slots', ['id'], unique=False)

    # Create wait_lists table
    op.create_table('wait_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('barber_id', sa.Integer(), nullable=True),
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('preferred_date', sa.Date(), nullable=False),
        sa.Column('preferred_time_start', sa.Time(), nullable=True),
        sa.Column('preferred_time_end', sa.Time(), nullable=True),
        sa.Column('flexibility_days', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('notification_sent_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['barber_id'], ['barbers.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wait_lists_id'), 'wait_lists', ['id'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_index(op.f('ix_wait_lists_id'), table_name='wait_lists')
    op.drop_table('wait_lists')
    
    op.drop_index(op.f('ix_booking_slots_id'), table_name='booking_slots')
    op.drop_table('booking_slots')
    
    op.drop_index(op.f('ix_reviews_id'), table_name='reviews')
    op.drop_table('reviews')
    
    op.drop_index(op.f('ix_booking_rules_id'), table_name='booking_rules')
    op.drop_table('booking_rules')
    
    op.drop_index(op.f('ix_barber_availability_id'), table_name='barber_availability')
    op.drop_table('barber_availability')
    
    op.drop_index(op.f('ix_services_id'), table_name='services')
    op.drop_table('services')
    
    op.drop_index(op.f('ix_service_categories_id'), table_name='service_categories')
    op.drop_table('service_categories')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS dayofweek')
    op.execute('DROP TYPE IF EXISTS reviewrating')