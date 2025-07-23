#!/usr/bin/env python3
"""Create admin user for testing calendar access"""

import sys
import os
from sqlalchemy import text
from database import get_db
from passlib.context import CryptContext

# Setup password hashing
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def create_admin_user():
    """Create admin user if it doesn't exist"""
    db = next(get_db())
    
    try:
        # Check if admin user exists
        result = db.execute(
            text("SELECT email, hashed_password FROM users WHERE email = :email"), 
            {"email": "admin@bookedbarber.com"}
        ).fetchone()
        
        if result:
            print(f"✅ User exists: {result[0]}")
            print(f"✅ Password hash exists: {bool(result[1])}")
            
            # Test password verification
            if result[1] and pwd_context.verify("password123", result[1]):
                print("✅ Password verification successful!")
            else:
                print("❌ Password verification failed - updating password...")
                hashed_password = pwd_context.hash("password123")
                db.execute(
                    text("UPDATE users SET hashed_password = :password WHERE email = :email"),
                    {"password": hashed_password, "email": "admin@bookedbarber.com"}
                )
                db.commit()
                print("✅ Password updated successfully!")
        else:
            print("❌ User does not exist - creating user...")
            hashed_password = pwd_context.hash("password123")
            db.execute(text("""
                INSERT INTO users (email, hashed_password, name, role, unified_role, is_active, email_verified, created_at, trial_active) 
                VALUES (:email, :password, :name, :role, :unified_role, :is_active, :email_verified, datetime('now'), :trial_active)
            """), {
                "email": "admin@bookedbarber.com",
                "password": hashed_password,
                "name": "Admin User",
                "role": "admin",
                "unified_role": "admin", 
                "is_active": True,
                "email_verified": True,
                "trial_active": False
            })
            db.commit()
            print("✅ Admin user created successfully!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()