#!/usr/bin/env python3
"""Quick check for admin credentials and test authentication."""

import sys
import os
sys.path.append('/Users/bossio/6fb-booking/backend-v2')

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from datetime import datetime
import asyncio
import httpx

# Create password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def check_admin_user():
    """Check if admin user exists and create if needed."""
    try:
        # Use SQLite database directly
        engine = create_engine("sqlite:///./6fb_booking.db")
        
        with engine.connect() as conn:
            # Check if admin user exists
            result = conn.execute(
                text("SELECT email, role, is_active FROM users WHERE email = :email"),
                {"email": "admin@bookedbarber.com"}
            )
            admin_user = result.fetchone()
            
            if admin_user:
                print(f"✅ Admin user found:")
                print(f"   Email: {admin_user[0]}")
                print(f"   Role: {admin_user[1]}")
                print(f"   Active: {admin_user[2]}")
                return True
            else:
                print("❌ Admin user not found. Creating admin user...")
                
                # Create admin user
                hashed_password = pwd_context.hash("password123")
                conn.execute(
                    text("""
                        INSERT INTO users (email, name, hashed_password, role, is_active, created_at)
                        VALUES (:email, :name, :hashed_password, :role, :is_active, :created_at)
                    """),
                    {
                        "email": "admin@bookedbarber.com",
                        "name": "Admin User",
                        "hashed_password": hashed_password,
                        "role": "admin",
                        "is_active": True,
                        "created_at": datetime.utcnow()
                    }
                )
                conn.commit()
                
                print("✅ Admin user created successfully:")
                print("   Email: admin@bookedbarber.com")
                print("   Password: password123")
                print("   Role: admin")
                return True
                
    except Exception as e:
        print(f"❌ Error checking/creating admin user: {e}")
        return False

async def test_api_login():
    """Test API login with admin credentials."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/api/v2/auth/login",
                json={"email": "admin@bookedbarber.com", "password": "password123"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ API login successful!")
                print(f"   Token type: {data.get('token_type', 'N/A')}")
                print(f"   User role: {data.get('user', {}).get('role', 'N/A')}")
                return True
            else:
                print(f"❌ API login failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ API login error: {e}")
        return False

def main():
    print("🔍 Checking admin credentials for localhost:3000...")
    print()
    
    # Check database
    print("1. Checking database for admin user...")
    db_ok = check_admin_user()
    print()
    
    # Test API
    print("2. Testing API login...")
    api_ok = asyncio.run(test_api_login())
    print()
    
    # Summary
    if db_ok and api_ok:
        print("🎉 SUCCESS! Admin credentials work:")
        print("   Email: admin@bookedbarber.com")
        print("   Password: password123")
        print("   You can now login at http://localhost:3000")
    else:
        print("⚠️  Some issues found. Check the output above.")

if __name__ == "__main__":
    main()