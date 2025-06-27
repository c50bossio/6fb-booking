#!/usr/bin/env python3
"""
Simple authentication test - direct password verification
"""

import sqlite3
from passlib.context import CryptContext
import base64
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Create password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_auth_direct():
    """Test authentication by directly checking the database"""
    
    # Test credentials from the create_test_users.py script
    test_emails = [
        "test@example.com",
        "admin@6fb.com"
    ]
    test_passwords = [
        "testpassword123", 
        "admin123"
    ]
    
    # Connect to database
    conn = sqlite3.connect('6fb_booking.db')
    cursor = conn.cursor()
    
    print("🔍 Testing authentication with known test users...")
    print("=" * 50)
    
    # Get all users first
    cursor.execute("SELECT id, email, first_name, last_name, hashed_password, role, is_active FROM users")
    all_users = cursor.fetchall()
    
    print(f"Found {len(all_users)} users in database")
    print()
    
    # Test each known password against all users
    for i, (email, password) in enumerate(zip(test_emails, test_passwords)):
        print(f"🧪 Testing {email} / {password}")
        
        found_match = False
        for user in all_users:
            user_id, encrypted_email, first_name, last_name, hashed_password, role, is_active = user
            
            try:
                # Since emails are encrypted, we need to test password against all users
                # and look for matches based on the user creation script patterns
                if pwd_context.verify(password, hashed_password):
                    print(f"  ✅ Password matches user ID {user_id}: {first_name} {last_name} ({role})")
                    print(f"     Email: {encrypted_email}")
                    print(f"     Active: {bool(is_active)}")
                    found_match = True
                    break
            except Exception as e:
                continue
        
        if not found_match:
            print(f"  ❌ No match found for {email} / {password}")
        print()
    
    # Test if we can create a new simple user for testing
    print("🛠️  Creating a simple test user for debugging...")
    
    # Create a simple test user with known credentials
    simple_email = "simple@test.com"
    simple_password = "password123"
    simple_hashed = pwd_context.hash(simple_password)
    
    try:
        cursor.execute("""
            INSERT INTO users (
                email, first_name, last_name, hashed_password, role, is_active, is_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            simple_email,  # This will be encrypted by the EncryptedString type
            "Simple", 
            "User", 
            simple_hashed, 
            "barber", 
            1, 
            1
        ))
        conn.commit()
        print(f"  ✅ Created simple test user: {simple_email} / {simple_password}")
    except Exception as e:
        if "UNIQUE constraint failed" in str(e) or "already exists" in str(e):
            print(f"  ℹ️  Simple test user already exists: {simple_email} / {simple_password}")
        else:
            print(f"  ❌ Failed to create simple test user: {e}")
    
    conn.close()
    
    print()
    print("📋 SUMMARY - Use these credentials to test login:")
    print("=" * 50)
    print("1. simple@test.com / password123")
    print("2. test@example.com / testpassword123") 
    print("3. admin@6fb.com / admin123")
    print()
    print("If login still fails, the issue is likely in:")
    print("- Environment variables (DATA_ENCRYPTION_KEY)")
    print("- API routing/proxy configuration") 
    print("- Frontend request format")

if __name__ == "__main__":
    test_auth_direct()