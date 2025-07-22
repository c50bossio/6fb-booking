"""
Apply critical performance indexes for BookedBarber V2
"""

import sqlite3
import os
from pathlib import Path

def apply_performance_indexes():
    """Apply performance indexes to SQLite database"""
    
    # Database path
    db_path = Path(__file__).parent.parent / "6fb_booking.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return False
    
    print(f"🔧 Applying performance indexes to {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Critical performance indexes
    indexes = [
        # 1. Appointments table - Critical for availability queries
        {
            'name': 'idx_appointments_availability_lookup',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_appointments_availability_lookup 
                     ON appointments(barber_id, start_time, status)''',
            'description': 'Barber availability lookup'
        },
        {
            'name': 'idx_appointments_date_status',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_appointments_date_status 
                     ON appointments(DATE(start_time), status)''',
            'description': 'Daily availability queries'
        },
        {
            'name': 'idx_appointments_user_history',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_appointments_user_history 
                     ON appointments(user_id, start_time, status)''',
            'description': 'User appointment history for rebooking'
        },
        {
            'name': 'idx_appointments_time_range',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_appointments_time_range 
                     ON appointments(start_time, duration_minutes)''',
            'description': 'Time range conflict detection'
        },
        
        # 2. Users table - Authentication and role queries
        {
            'name': 'idx_users_email_active',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_users_email_active 
                     ON users(email, is_active)''',
            'description': 'Email authentication lookup'
        },
        {
            'name': 'idx_users_role_active',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_users_role_active 
                     ON users(unified_role, is_active)''',
            'description': 'Role-based user queries'
        },
        
        # 3. Barber Profiles table
        {
            'name': 'idx_barber_profiles_active',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_barber_profiles_active 
                     ON barber_profiles(is_active, user_id)''',
            'description': 'Active barber lookup'
        },
        
        # 4. Payments table - Financial queries
        {
            'name': 'idx_payments_status_date',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_payments_status_date 
                     ON payments(status, created_at)''',
            'description': 'Payment status and reporting'
        },
        {
            'name': 'idx_payments_appointment',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_payments_appointment 
                     ON payments(appointment_id, status)''',
            'description': 'Appointment payment lookup'
        },
        
        # 5. Performance optimization indexes
        {
            'name': 'idx_appointments_created_status',
            'sql': '''CREATE INDEX IF NOT EXISTS idx_appointments_created_status 
                     ON appointments(created_at, status)''',
            'description': 'Analytics and reporting queries'
        }
    ]
    
    applied_count = 0
    failed_count = 0
    
    for index in indexes:
        try:
            print(f"   Creating {index['name']} - {index['description']}")
            cursor.execute(index['sql'])
            applied_count += 1
        except sqlite3.Error as e:
            print(f"   ❌ Failed to create {index['name']}: {e}")
            failed_count += 1
    
    # Commit changes
    conn.commit()
    
    # Get index information
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name
    """)
    
    existing_indexes = cursor.fetchall()
    
    print(f"\n📊 Index Application Summary:")
    print(f"   ✅ Successfully applied: {applied_count}")
    print(f"   ❌ Failed: {failed_count}")
    print(f"   📋 Total performance indexes: {len(existing_indexes)}")
    
    print(f"\n🔍 Existing Performance Indexes:")
    for idx in existing_indexes:
        print(f"   • {idx[0]}")
    
    # Analyze query performance
    print(f"\n⚡ Running ANALYZE to update query planner statistics...")
    cursor.execute("ANALYZE")
    
    conn.close()
    
    return applied_count > 0

if __name__ == "__main__":
    success = apply_performance_indexes()
    if success:
        print("\n✅ Performance indexes applied successfully!")
    else:
        print("\n❌ Failed to apply performance indexes")