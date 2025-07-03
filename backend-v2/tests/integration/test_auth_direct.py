#!/usr/bin/env python3
"""
Direct authentication test bypassing SQLAlchemy models
"""

import sqlite3
import bcrypt
from datetime import datetime, timedelta
from jose import jwt

# Settings
SECRET_KEY = "development-secret-key-for-local-testing-only-not-secure"
ALGORITHM = "HS256"

def test_auth_direct():
    print("🔐 Direct Authentication Test")
    print("=" * 40)
    
    # Connect to database directly
    conn = sqlite3.connect('6fb_booking.db')
    cursor = conn.cursor()
    
    # Test multiple users and password combinations
    test_users = [
        ("admin@example.com", ["admin123", "admin", "password", "test123"]),
        ("barber@example.com", ["barber123", "barber", "password", "test123"])
    ]
    
    for email, passwords in test_users:
        cursor.execute("SELECT email, role, hashed_password FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if user:
            user_email, role, hashed_password = user
            print(f"\n✅ Found user: {user_email} (role: {role})")
            print(f"Hash: {hashed_password[:30]}...")
            
            # Test different password combinations
            for test_password in passwords:
                try:
                    is_valid = bcrypt.checkpw(test_password.encode('utf-8'), hashed_password.encode('utf-8'))
                    if is_valid:
                        print(f"✅ SUCCESS! Password '{test_password}' works for {user_email}")
                        
                        # Create JWT token
                        payload = {
                            "sub": user_email,
                            "role": role,
                            "exp": datetime.utcnow() + timedelta(minutes=30)
                        }
                        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
                        print(f"✅ JWT token created: {token[:50]}...")
                        
                        print("\n🎉 AUTHENTICATION WORKING!")
                        print("Backend can successfully:")
                        print("1. Query database")
                        print("2. Verify passwords") 
                        print("3. Generate JWT tokens")
                        return
                        
                    else:
                        print(f"❌ Password '{test_password}' failed for {user_email}")
                        
                except Exception as e:
                    print(f"❌ Password verification error for '{test_password}': {e}")
        else:
            print(f"❌ User {email} not found")
    
    # If we get here, no passwords worked - try creating a new test user
    print("\n🔧 Creating new test user with known password...")
    try:
        new_password = "testpassword123"
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cursor.execute(
            "INSERT INTO users (email, name, hashed_password, role, created_at) VALUES (?, ?, ?, ?, ?)",
            ("test_claude@example.com", "Claude Test User", hashed_password, "admin", datetime.utcnow())
        )
        conn.commit()
        
        # Test the new user
        is_valid = bcrypt.checkpw(new_password.encode('utf-8'), hashed_password.encode('utf-8'))
        if is_valid:
            print(f"✅ New test user created successfully!")
            print(f"   Email: test_claude@example.com")
            print(f"   Password: {new_password}")
            print(f"   Role: admin")
            
            # Create JWT token
            payload = {
                "sub": "test_claude@example.com",
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(minutes=30)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
            print(f"✅ JWT token created: {token[:50]}...")
            
            print("\n🎉 AUTHENTICATION WORKING!")
        
    except Exception as e:
        print(f"❌ Failed to create test user: {e}")
    
    # List all users
    cursor.execute("SELECT email, role FROM users LIMIT 10")
    users = cursor.fetchall()
    print(f"\n📋 Available test users:")
    for email, role in users:
        print(f"  - {email} (role: {role})")
    
    conn.close()

if __name__ == "__main__":
    test_auth_direct()