#!/usr/bin/env python3
"""
Simple Test User Creation
Creates a test user with minimal fields that work with the current database schema
"""

import sqlite3
import bcrypt
from datetime import datetime, timedelta
import os

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_simple_test_user():
    """Create test user using direct SQLite operations"""
    print("🔐 Creating simple test user for calendar testing...")
    
    # Use the existing database file
    db_path = "6fb_booking.db"
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if test user already exists
        cursor.execute("SELECT id, email, role FROM users WHERE email = ?", ("test_claude@example.com",))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print("✅ Test user already exists")
            print(f"   ID: {existing_user[0]}")
            print(f"   Email: {existing_user[1]}")
            print(f"   Role: {existing_user[2]}")
            
            # Create some test appointments for this user
            create_test_appointments(cursor, existing_user[0])
            conn.commit()
            conn.close()
            return True
        
        # Create test user with minimal fields
        hashed_pwd = hash_password("testpassword123")
        
        cursor.execute("""
            INSERT INTO users (email, name, hashed_password, role, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "test_claude@example.com",
            "Claude Test",
            hashed_pwd,
            "barber",
            1,  # is_active = True
            datetime.utcnow().isoformat()
        ))
        
        user_id = cursor.lastrowid
        print(f"✅ Test user created successfully")
        print(f"   ID: {user_id}")
        print(f"   Email: test_claude@example.com")
        print(f"   Role: barber")
        
        # Create some test appointments
        create_test_appointments(cursor, user_id)
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def create_test_appointments(cursor, user_id):
    """Create test appointments using direct SQL"""
    print("📅 Creating test appointments...")
    
    try:
        # Check if appointments already exist for this user
        cursor.execute("SELECT COUNT(*) FROM appointments WHERE barber_id = ?", (user_id,))
        existing_count = cursor.fetchone()[0]
        
        if existing_count > 0:
            print(f"✅ Test appointments already exist ({existing_count} found)")
            return
        
        # Create test appointments for the next few days
        base_date = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        
        test_appointments = [
            {
                "service_name": "Haircut",
                "start_time": base_date + timedelta(hours=1),
                "duration_minutes": 30,
                "price": 50.00,
                "status": "confirmed"
            },
            {
                "service_name": "Haircut + Beard",
                "start_time": base_date + timedelta(hours=3),
                "duration_minutes": 60,
                "price": 75.00,
                "status": "confirmed"
            },
            {
                "service_name": "Beard Trim", 
                "start_time": base_date + timedelta(days=1, hours=2),
                "duration_minutes": 30,
                "price": 35.00,
                "status": "pending"
            },
            {
                "service_name": "Styling",
                "start_time": base_date + timedelta(days=2, hours=1),
                "duration_minutes": 60,
                "price": 60.00,
                "status": "confirmed"
            }
        ]
        
        created_count = 0
        for apt_data in test_appointments:
            try:
                cursor.execute("""
                    INSERT INTO appointments (
                        user_id, barber_id, service_name, start_time, 
                        duration_minutes, price, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,  # user_id (client)
                    user_id,  # barber_id (same user for test)
                    apt_data["service_name"],
                    apt_data["start_time"].isoformat(),
                    apt_data["duration_minutes"],
                    apt_data["price"],
                    apt_data["status"],
                    datetime.utcnow().isoformat()
                ))
                created_count += 1
            except Exception as e:
                print(f"⚠️  Failed to create appointment {apt_data['service_name']}: {e}")
        
        print(f"✅ Created {created_count} test appointments")
        
    except Exception as e:
        print(f"❌ Error creating test appointments: {e}")

def verify_database_schema():
    """Check what tables and columns exist"""
    print("🔍 Verifying database schema...")
    
    db_path = "6fb_booking.db"
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        users_table = cursor.fetchone()
        
        if users_table:
            print("✅ Users table found")
            
            # Get column info
            cursor.execute("PRAGMA table_info(users)")
            columns = cursor.fetchall()
            print("   Columns:")
            for col in columns:
                print(f"     - {col[1]} ({col[2]})")
        else:
            print("❌ Users table not found")
            
        # Check if appointments table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'")
        appointments_table = cursor.fetchone()
        
        if appointments_table:
            print("✅ Appointments table found")
            
            # Get column info
            cursor.execute("PRAGMA table_info(appointments)")
            columns = cursor.fetchall()
            print("   Columns:")
            for col in columns:
                print(f"     - {col[1]} ({col[2]})")
        else:
            print("❌ Appointments table not found")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error verifying schema: {e}")
        return False

def main():
    """Main function to set up test data"""
    print("🧪 Simple Test Data Setup for Calendar Testing")
    print("=" * 50)
    
    # First verify the database schema
    if not verify_database_schema():
        print("❌ Database schema verification failed")
        return
    
    # Create test user and data
    if create_simple_test_user():
        print("\n🎉 Test data setup complete!")
        print("=" * 50)
        print("Test credentials:")
        print("   Email: test_claude@example.com")
        print("   Password: testpassword123")
        print("   Role: barber")
        print("\nYou can now test the calendar with these credentials!")
    else:
        print("❌ Test data setup failed")

if __name__ == "__main__":
    main()