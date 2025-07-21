#!/usr/bin/env python3
"""
Simple Super Admin Creation Script

Creates a super admin user with minimal dependencies
"""

import sqlite3
import bcrypt
import os

def create_super_admin():
    """Create super admin user directly via SQLite"""
    
    # Find the correct database file
    possible_dbs = [
        "/Users/bossio/6fb-booking-features/barber-profile-availability/backend-v2/feature_barber-profile-availability.db",
        "/Users/bossio/6fb-booking-features/barber-profile-availability/backend-v2/6fb_booking.db",
        "/Users/bossio/6fb-booking-features/barber-profile-availability/backend-v2/feature_barber_profile_availability.db"
    ]
    
    db_path = None
    for db in possible_dbs:
        if os.path.exists(db):
            db_path = db
            break
    
    if not db_path:
        print("❌ No database found. Available files:")
        backend_dir = "/Users/bossio/6fb-booking-features/barber-profile-availability/backend-v2"
        if os.path.exists(backend_dir):
            for file in os.listdir(backend_dir):
                if file.endswith('.db'):
                    print(f"  - {file}")
                    db_path = os.path.join(backend_dir, file)
                    break
    
    if not db_path:
        print("❌ No SQLite database found in the feature worktree backend directory")
        return None
    
    print(f"Using database: {db_path}")
    
    # Hash the password using bcrypt
    password = "password123"
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("❌ Users table does not exist in the database")
            return None
        
        # Check if admin user already exists
        cursor.execute("SELECT id, email, role, unified_role FROM users WHERE email = 'admin@bookedbarber.com'")
        existing_user = cursor.fetchone()
        
        if existing_user:
            # Update existing user
            cursor.execute("""
                UPDATE users 
                SET 
                    hashed_password = ?,
                    role = 'admin',
                    unified_role = 'super_admin',
                    is_active = 1,
                    email_verified = 1,
                    name = 'Super Admin',
                    role_migrated = 1,
                    onboarding_completed = 1,
                    is_new_user = 0
                WHERE email = 'admin@bookedbarber.com'
            """, (hashed_password,))
            
            print("✅ Updated existing admin user!")
            print(f"   ID: {existing_user[0]}")
            print(f"   Email: admin@bookedbarber.com")
            print(f"   Password: password123")
            print(f"   Previous Role: {existing_user[2]}")
            print(f"   Previous Unified Role: {existing_user[3]}")
            print(f"   New Role: admin")
            print(f"   New Unified Role: super_admin")
        else:
            # Create new admin user
            cursor.execute("""
                INSERT INTO users (
                    email, name, hashed_password, role, unified_role,
                    is_active, email_verified, role_migrated,
                    onboarding_completed, is_new_user, phone, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                'admin@bookedbarber.com',
                'Super Admin',
                hashed_password,
                'admin',
                'super_admin',
                1,  # is_active
                1,  # email_verified
                1,  # role_migrated
                1,  # onboarding_completed
                0,  # is_new_user
                '+1234567890'  # phone
            ))
            
            user_id = cursor.lastrowid
            print("🎉 Super admin user created successfully!")
            print(f"   ID: {user_id}")
            print(f"   Email: admin@bookedbarber.com")
            print(f"   Password: password123")
            print(f"   Role: admin")
            print(f"   Unified Role: super_admin")
        
        conn.commit()
        
        # Verify the user was created/updated
        cursor.execute("""
            SELECT id, email, name, role, unified_role, is_active, email_verified 
            FROM users WHERE email = 'admin@bookedbarber.com'
        """)
        result = cursor.fetchone()
        
        if result:
            print("\n✅ Verification:")
            print(f"   ID: {result[0]}")
            print(f"   Email: {result[1]}")
            print(f"   Name: {result[2]}")
            print(f"   Role: {result[3]}")
            print(f"   Unified Role: {result[4]}")
            print(f"   Active: {bool(result[5])}")
            print(f"   Email Verified: {bool(result[6])}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        conn.rollback()
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    create_super_admin()