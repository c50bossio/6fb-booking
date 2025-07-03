"""Add comprehensive timezone support

Revision ID: comprehensive_timezone_support_20250703
Revises: ed548ba61608
Create Date: 2025-07-03 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'comprehensive_timezone_support_20250703'
down_revision: Union[str, Sequence[str], None] = 'ed548ba61608'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for comprehensive timezone support."""
    
    # 1. Enhance users table with timezone preferences
    op.add_column('users', sa.Column('timezone_preference', sa.String(50), nullable=True, 
                                    comment='User preferred timezone for display'))
    op.add_column('users', sa.Column('auto_detect_timezone', sa.Boolean(), 
                                    nullable=False, server_default='true',
                                    comment='Whether to auto-detect timezone from browser'))
    op.add_column('users', sa.Column('timezone_last_updated', sa.DateTime(), nullable=True,
                                    comment='When timezone was last updated'))
    
    # 2. Enhance booking_settings with timezone configuration
    op.add_column('booking_settings', sa.Column('default_user_timezone', sa.String(50), 
                                               nullable=True, server_default="'UTC'",
                                               comment='Default timezone for new users'))
    op.add_column('booking_settings', sa.Column('allowed_timezones', sa.JSON(), nullable=True,
                                               comment='List of allowed timezones for this business'))
    op.add_column('booking_settings', sa.Column('timezone_auto_detect', sa.Boolean(),
                                               nullable=False, server_default='true',
                                               comment='Whether to enable timezone auto-detection'))
    
    # 3. Add timezone support to barbershop_locations
    try:
        # Check if table exists (might not in all environments)
        op.add_column('barbershop_locations', sa.Column('location_timezone', sa.String(50),
                                                       nullable=True, server_default="'UTC'",
                                                       comment='Timezone for this location'))
        op.add_column('barbershop_locations', sa.Column('business_hours_timezone', sa.String(50),
                                                       nullable=True,
                                                       comment='Timezone for business hours (if different from location)'))
    except Exception:
        # Table might not exist in all environments, skip
        pass
    
    # 4. Enhance appointments with timezone tracking
    op.add_column('appointments', sa.Column('created_timezone', sa.String(50), nullable=True,
                                           comment='Timezone when appointment was created'))
    op.add_column('appointments', sa.Column('user_timezone', sa.String(50), nullable=True,
                                           comment='User timezone at time of booking'))
    op.add_column('appointments', sa.Column('display_timezone', sa.String(50), nullable=True,
                                           comment='Preferred timezone for displaying this appointment'))
    
    # 5. Add timezone table for caching timezone information
    op.create_table('timezone_cache',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('timezone_name', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('utc_offset', sa.String(10), nullable=False),
        sa.Column('dst_offset', sa.String(10), nullable=True),
        sa.Column('is_dst_active', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_common', sa.Boolean(), nullable=False, default=False),
        sa.Column('region', sa.String(50), nullable=True),
        sa.Column('country', sa.String(3), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        comment='Cache of timezone information for performance'
    )
    
    # 6. Create timezone conversion log table for debugging
    op.create_table('timezone_conversion_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('appointment_id', sa.Integer(), sa.ForeignKey('appointments.id'), nullable=True, index=True),
        sa.Column('source_timezone', sa.String(50), nullable=False),
        sa.Column('target_timezone', sa.String(50), nullable=False),
        sa.Column('source_datetime', sa.DateTime(), nullable=False),
        sa.Column('target_datetime', sa.DateTime(), nullable=False),
        sa.Column('conversion_type', sa.String(50), nullable=False),  # 'booking', 'display', 'reminder', etc.
        sa.Column('context', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        comment='Log timezone conversions for debugging and audit'
    )
    
    # 7. Add indexes for performance
    op.create_index('idx_users_timezone_preference', 'users', ['timezone_preference'])
    op.create_index('idx_appointments_user_timezone', 'appointments', ['user_timezone'])
    op.create_index('idx_appointments_display_timezone', 'appointments', ['display_timezone'])
    
    # 8. Update existing records with default values
    op.execute("UPDATE users SET timezone_preference = timezone WHERE timezone_preference IS NULL")
    op.execute("UPDATE users SET auto_detect_timezone = true WHERE auto_detect_timezone IS NULL")
    
    # Update existing appointments with timezone information
    op.execute("""
        UPDATE appointments 
        SET user_timezone = (
            SELECT u.timezone 
            FROM users u 
            WHERE u.id = appointments.user_id
        )
        WHERE user_timezone IS NULL AND user_id IS NOT NULL
    """)
    
    op.execute("UPDATE appointments SET created_timezone = 'UTC' WHERE created_timezone IS NULL")
    op.execute("UPDATE appointments SET display_timezone = user_timezone WHERE display_timezone IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    
    # Drop indexes
    op.drop_index('idx_appointments_display_timezone', 'appointments')
    op.drop_index('idx_appointments_user_timezone', 'appointments')
    op.drop_index('idx_users_timezone_preference', 'users')
    
    # Drop new tables
    op.drop_table('timezone_conversion_log')
    op.drop_table('timezone_cache')
    
    # Remove columns from appointments
    op.drop_column('appointments', 'display_timezone')
    op.drop_column('appointments', 'user_timezone')
    op.drop_column('appointments', 'created_timezone')
    
    # Remove columns from barbershop_locations (if they exist)
    try:
        op.drop_column('barbershop_locations', 'business_hours_timezone')
        op.drop_column('barbershop_locations', 'location_timezone')
    except Exception:
        pass
    
    # Remove columns from booking_settings
    op.drop_column('booking_settings', 'timezone_auto_detect')
    op.drop_column('booking_settings', 'allowed_timezones')
    op.drop_column('booking_settings', 'default_user_timezone')
    
    # Remove columns from users
    op.drop_column('users', 'timezone_last_updated')
    op.drop_column('users', 'auto_detect_timezone')
    op.drop_column('users', 'timezone_preference')