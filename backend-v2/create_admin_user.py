#!/usr/bin/env python3
"""
Create admin@bookedbarber.com user for testing
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from passlib.context import CryptContext
import secrets

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Create admin@bookedbarber.com user with admin123 password"""
    
    # Connect to database
    db_path = Path(__file__).parent / "6fb_booking.db"
    engine = create_engine(f"sqlite:///{db_path}")
    
    # Hash the password
    password_hash = pwd_context.hash("admin123")
    
    # Check if user already exists
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": "admin@bookedbarber.com"}
        )
        existing_user = result.fetchone()
        
        if existing_user:
            # Update existing user
            conn.execute(
                text("""
                    UPDATE users 
                    SET hashed_password = :hashed_password,
                        is_active = 1,
                        email_verified = 1,
                        role = 'admin'
                    WHERE email = :email
                """),
                {
                    "hashed_password": password_hash,
                    "email": "admin@bookedbarber.com"
                }
            )
            conn.commit()
            print("✅ Updated existing admin@bookedbarber.com user")
        else:
            # Create new user
            conn.execute(
                text("""
                    INSERT INTO users (
                        email, hashed_password, name, 
                        is_active, email_verified, role, unified_role, created_at
                    ) VALUES (
                        :email, :hashed_password, :name,
                        1, 1, 'admin', 'admin', datetime('now')
                    )
                """),
                {
                    "email": "admin@bookedbarber.com",
                    "hashed_password": password_hash,
                    "name": "Admin User"
                }
            )
            conn.commit()
            print("✅ Created new admin@bookedbarber.com user")
    
    print("✅ Admin user ready:")
    print("   Email: admin@bookedbarber.com")
    print("   Password: admin123")
    print("   Status: Active, Verified, Admin role")

if __name__ == "__main__":
    create_admin_user()