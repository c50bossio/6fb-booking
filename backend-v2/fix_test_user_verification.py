#!/usr/bin/env python3
"""
Fix Test User Email Verification
Marks the test user's email as verified so they can log in
"""

import sqlite3
import os
from datetime import datetime

def fix_test_user_verification():
    """Mark test user email as verified"""
    print("🔧 Fixing test user email verification...")
    
    # Use the existing database file
    db_path = "6fb_booking.db"
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT id, email, email_verified FROM users WHERE email = ?", ("test_claude@example.com",))
        user = cursor.fetchone()
        
        if not user:
            print("❌ Test user not found")
            return False
            
        print(f"✅ Found user: ID={user[0]}, Email={user[1]}, Verified={user[2]}")
        
        # Update email verification status
        cursor.execute("""
            UPDATE users 
            SET email_verified = 1, 
                verified_at = ? 
            WHERE email = ?
        """, (datetime.now().isoformat(), "test_claude@example.com"))
        
        conn.commit()
        
        # Verify the update
        cursor.execute("SELECT email_verified, verified_at FROM users WHERE email = ?", ("test_claude@example.com",))
        updated_user = cursor.fetchone()
        
        print(f"✅ User updated: Verified={updated_user[0]}, Verified_at={updated_user[1]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error fixing user verification: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def main():
    """Main function"""
    print("🧪 Fixing Test User Email Verification")
    print("=" * 50)
    
    if fix_test_user_verification():
        print("\n🎉 Test user email verification fixed!")
        print("=" * 50)
        print("You can now log in with:")
        print("   Email: test_claude@example.com")
        print("   Password: testpassword123")
    else:
        print("❌ Failed to fix test user verification")

if __name__ == "__main__":
    main()