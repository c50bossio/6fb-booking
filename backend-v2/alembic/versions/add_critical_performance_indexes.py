"""Add critical performance indexes for identified bottlenecks

Revision ID: add_critical_performance_indexes
Revises: add_comprehensive_indexes
Create Date: 2025-07-31

This migration adds specific indexes to address identified query performance bottlenecks:
- Analytics service optimizations
- Booking conflict detection improvements
- Organization-based query optimizations
- Six Figure Barber methodology query improvements
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_critical_performance_indexes'
down_revision = 'add_comprehensive_indexes'
branch_labels = None
depends_on = None


def upgrade():
    """Add critical performance indexes"""
    
    # Analytics Service Optimizations
    print("Adding analytics performance indexes...")
    
    # Critical analytics index for completed payments
    op.create_index(
        'idx_payments_analytics_optimized', 
        'payments', 
        ['status', 'created_at', 'amount', 'user_id'],
        postgresql_where=sa.text("status = 'completed'")
    )
    
    # Date-based analytics indexes
    op.create_index(
        'idx_payments_daily_analytics', 
        'payments',
        [sa.text('DATE(created_at)'), 'status', 'amount'],
        postgresql_where=sa.text("status = 'completed'")
    )
    
    # Organization-based analytics
    op.create_index(
        'idx_payments_org_analytics',
        'payments',
        ['organization_id', 'status', 'created_at', 'amount'],
        postgresql_where=sa.text("status = 'completed'")
    )
    
    # Booking Conflict Detection Optimizations
    print("Adding booking conflict detection indexes...")
    
    # Critical time-range conflict detection
    op.create_index(
        'idx_appointments_conflict_detection',
        'appointments',
        ['barber_id', 'status', 'start_time', 'end_time'],
        postgresql_where=sa.text("status IN ('confirmed', 'pending')")
    )
    
    # Organization-Based Query Optimizations
    print("Adding organization query indexes...")
    
    # Appointments by organization and status
    op.create_index(
        'idx_appointments_org_status_date',
        'appointments',
        ['organization_id', 'status', 'start_time', 'end_time']
    )
    
    # Users by organization and role
    op.create_index(
        'idx_users_org_role_active',
        'users',
        ['organization_id', 'unified_role', 'is_active']
    )
    
    # Six Figure Barber Methodology Optimizations
    print("Adding Six FB methodology indexes...")
    
    # Revenue tracking for barbers
    op.create_index(
        'idx_appointments_revenue_tracking',
        'appointments',
        ['barber_id', 'status', 'start_time', 'price'],
        postgresql_where=sa.text("status = 'completed'")
    )
    
    # Commission calculations
    op.create_index(
        'idx_payments_commission_calculations',
        'payments',
        ['barber_id', 'status', 'created_at', 'amount', 'commission_rate'],
        postgresql_where=sa.text("status = 'completed'")
    )
    
    # Client lifetime value tracking
    op.create_index(
        'idx_users_ltv_tracking',
        'users',
        ['lifetime_value', 'created_at', 'unified_role'],
        postgresql_where=sa.text("unified_role = 'CLIENT'")
    )
    
    # Reporting and Dashboard Optimizations
    print("Adding reporting and dashboard indexes...")
    
    # Daily revenue reports
    op.create_index(
        'idx_appointments_daily_revenue_report',
        'appointments',
        [sa.text('DATE(start_time)'), 'status', 'price', 'barber_id'],
        postgresql_where=sa.text("status = 'completed'")
    )
    
    # Client retention analysis
    op.create_index(
        'idx_clients_retention_analysis',
        'clients',
        ['user_id', 'last_visit', 'created_at', 'total_spent']
    )
    
    # Advanced Query Pattern Optimizations
    print("Adding advanced query pattern indexes...")
    
    # User sessions and activity
    op.create_index(
        'idx_users_activity_tracking',
        'users',
        ['is_active', 'created_at', 'unified_role', 'trial_expires_at']
    )
    
    # Appointment time-based queries
    op.create_index(
        'idx_appointments_time_queries',
        'appointments',
        ['start_time', 'status', 'barber_id', 'organization_id']
    )
    
    # Payment time-based queries  
    op.create_index(
        'idx_payments_time_queries',
        'payments', 
        ['created_at', 'status', 'user_id', 'organization_id']
    )
    
    # PostgreSQL-specific optimizations
    try:
        print("Adding PostgreSQL-specific optimizations...")
        
        # GiST index for time range overlaps (PostgreSQL only)
        op.execute("""
        CREATE INDEX CONCURRENTLY idx_appointments_time_range_gist 
        ON appointments USING gist(
            barber_id, 
            tsrange(start_time, start_time + (duration_minutes || ' minutes')::interval)
        ) 
        WHERE status IN ('confirmed', 'pending')
        """)
        
        # Partial index for active trial users
        op.execute("""
        CREATE INDEX CONCURRENTLY idx_users_active_trials
        ON users(trial_expires_at, unified_role, is_active)
        WHERE trial_active = true AND trial_expires_at > NOW()
        """)
        
    except Exception as e:
        print(f"PostgreSQL-specific indexes skipped (likely SQLite): {e}")
        pass
    
    print("✅ Critical performance indexes added successfully!")


def downgrade():
    """Remove critical performance indexes"""
    
    print("Removing critical performance indexes...")
    
    # Analytics indexes
    op.drop_index('idx_payments_analytics_optimized', 'payments')
    op.drop_index('idx_payments_daily_analytics', 'payments')
    op.drop_index('idx_payments_org_analytics', 'payments')
    
    # Booking conflict detection
    op.drop_index('idx_appointments_conflict_detection', 'appointments')
    
    # Organization queries
    op.drop_index('idx_appointments_org_status_date', 'appointments')
    op.drop_index('idx_users_org_role_active', 'users')
    
    # Six FB methodology
    op.drop_index('idx_appointments_revenue_tracking', 'appointments')
    op.drop_index('idx_payments_commission_calculations', 'payments')
    op.drop_index('idx_users_ltv_tracking', 'users')
    
    # Reporting and dashboard
    op.drop_index('idx_appointments_daily_revenue_report', 'appointments')
    op.drop_index('idx_clients_retention_analysis', 'clients')
    
    # Advanced query patterns
    op.drop_index('idx_users_activity_tracking', 'users')
    op.drop_index('idx_appointments_time_queries', 'appointments')
    op.drop_index('idx_payments_time_queries', 'payments')
    
    # PostgreSQL-specific indexes
    try:
        op.drop_index('idx_appointments_time_range_gist', 'appointments')
        op.drop_index('idx_users_active_trials', 'users')
    except:
        pass  # Indexes might not exist
    
    print("✅ Critical performance indexes removed successfully!")