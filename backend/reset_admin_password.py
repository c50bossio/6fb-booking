#!/usr/bin/env python3
"""
Reset admin password - Run this locally or in Render Shell
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from config.settings import settings

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_admin_password():
    # Database URL
    DATABASE_URL = os.environ.get("DATABASE_URL", settings.DATABASE_URL)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Add SSL for production
    if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
        if "?" in DATABASE_URL:
            DATABASE_URL += "&sslmode=require"
        else:
            DATABASE_URL += "?sslmode=require"
    
    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    # New password
    new_password = "admin123"
    hashed_password = pwd_context.hash(new_password)
    
    with engine.connect() as conn:
        # Find admin user
        result = conn.execute(text("""
            SELECT id, email, first_name, last_name 
            FROM users 
            WHERE email = 'c50bossio@gmail.com'
        """))
        
        user = result.fetchone()
        if not user:
            print("❌ Admin user not found!")
            return
        
        print(f"Found user: {user.first_name} {user.last_name} ({user.email})")
        
        # Update password
        conn.execute(text("""
            UPDATE users 
            SET hashed_password = :password,
                updated_at = NOW()
            WHERE id = :user_id
        """), {"password": hashed_password, "user_id": user.id})
        
        conn.commit()
        print(f"✅ Password reset successfully!")
        print(f"Email: {user.email}")
        print(f"Password: {new_password}")

if __name__ == "__main__":
    try:
        reset_admin_password()
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)