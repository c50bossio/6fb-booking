#!/usr/bin/env python3
"""
Development User Creation
Creates a development user that matches the dev-token-bypass authentication
"""

import sqlite3
import bcrypt
from datetime import datetime
import os

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_dev_user():
    """Create development user that matches the dev-token-bypass"""
    print("🔐 Creating development user for dev-token-bypass...")
    
    # Use the existing database file
    db_path = "6fb_booking.db"
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if dev user already exists
        cursor.execute("SELECT id, email, role FROM users WHERE email = ?", ("dev@bookedbarber.com",))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print("✅ Development user already exists")
            print(f"   ID: {existing_user[0]}")
            print(f"   Email: {existing_user[1]}")
            print(f"   Role: {existing_user[2]}")
            conn.close()
            return True
        
        # Create development user that matches the backend bypass
        hashed_pwd = hash_password("dev123")  # Simple dev password
        
        # Insert with ID 999999 to match the backend bypass
        cursor.execute("""
            INSERT INTO users (id, email, name, hashed_password, role, unified_role, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            999999,  # Match the ID from the backend bypass
            "dev@bookedbarber.com",  # Match email from backend bypass
            "Development User",
            hashed_pwd,
            "super_admin",  # Match role from backend bypass
            "super_admin",  # unified_role
            1,  # is_active = True
            datetime.now().isoformat()
        ))
        
        print(f"✅ Development user created successfully")
        print(f"   ID: 999999")
        print(f"   Email: dev@bookedbarber.com") 
        print(f"   Role: super_admin")
        print(f"   Password: dev123")
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating development user: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def verify_dev_user():
    """Verify the development user exists and can be authenticated"""
    print("🔍 Verifying development user...")
    
    db_path = "6fb_booking.db"
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check user exists
        cursor.execute("""
            SELECT id, email, name, role, is_active 
            FROM users 
            WHERE email = ? AND id = ?
        """, ("dev@bookedbarber.com", 999999))
        
        user = cursor.fetchone()
        if user:
            print("✅ Development user verified")
            print(f"   ID: {user[0]}")
            print(f"   Email: {user[1]}")
            print(f"   Name: {user[2]}")
            print(f"   Role: {user[3]}")
            print(f"   Active: {bool(user[4])}")
            
            # Test password verification
            cursor.execute("SELECT hashed_password FROM users WHERE id = ?", (999999,))
            stored_hash = cursor.fetchone()[0]
            
            # Verify the password
            is_valid = bcrypt.checkpw("dev123".encode('utf-8'), stored_hash.encode('utf-8'))
            print(f"   Password Valid: {is_valid}")
            
            conn.close()
            return True
        else:
            print("❌ Development user not found")
            conn.close()
            return False
            
    except Exception as e:
        print(f"❌ Error verifying development user: {e}")
        if 'conn' in locals():
            conn.close()
        return False

def main():
    """Main function to create and verify development user"""
    print("🧪 Development User Setup")
    print("=" * 50)
    
    # Create development user
    if create_dev_user():
        print()
        # Verify the user was created correctly
        if verify_dev_user():
            print("\n🎉 Development user setup complete!")
            print("=" * 50)
            print("Development credentials:")
            print("   Email: dev@bookedbarber.com")
            print("   Password: dev123")
            print("   Role: super_admin")
            print("   Backend bypass: Use 'dev-token-bypass' token")
            print("\nYou can now use either:")
            print("1. Regular login with dev@bookedbarber.com / dev123")
            print("2. Dev bypass button (uses dev-token-bypass token)")
        else:
            print("❌ Development user verification failed")
    else:
        print("❌ Development user setup failed")

if __name__ == "__main__":
    main()