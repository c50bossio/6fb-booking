#!/usr/bin/env python3
"""
Test Admin Login Script

Verifies that the admin user can authenticate with the correct password
"""

import sqlite3
import bcrypt
import os

def test_admin_login():
    """Test admin login with password verification"""
    
    db_path = "/Users/bossio/6fb-booking-features/barber-profile-availability/backend-v2/feature_barber-profile-availability.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return False
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get the admin user
        cursor.execute("""
            SELECT id, email, name, hashed_password, role, unified_role, is_active, email_verified 
            FROM users WHERE email = 'admin@bookedbarber.com'
        """)
        
        user = cursor.fetchone()
        if not user:
            print("❌ Admin user not found")
            return False
        
        user_id, email, name, hashed_password, role, unified_role, is_active, email_verified = user
        
        print("📋 Admin User Details:")
        print(f"   ID: {user_id}")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: {role}")
        print(f"   Unified Role: {unified_role}")
        print(f"   Active: {bool(is_active)}")
        print(f"   Email Verified: {bool(email_verified)}")
        
        # Test password verification
        test_password = "password123"
        if bcrypt.checkpw(test_password.encode('utf-8'), hashed_password.encode('utf-8')):
            print("\n✅ Password verification successful!")
            print(f"   Password 'password123' is correct for {email}")
        else:
            print("\n❌ Password verification failed!")
            return False
        
        # Test wrong password
        wrong_password = "wrongpassword"
        if not bcrypt.checkpw(wrong_password.encode('utf-8'), hashed_password.encode('utf-8')):
            print("✅ Wrong password correctly rejected")
        else:
            print("❌ Wrong password incorrectly accepted")
            return False
        
        print("\n🎉 Admin user is ready for login!")
        print("   Email: admin@bookedbarber.com")
        print("   Password: password123")
        print("   Role: Super Admin")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing admin login: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    test_admin_login()