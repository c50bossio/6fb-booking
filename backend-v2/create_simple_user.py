#!/usr/bin/env python3
"""
Create a simple test user directly in the database.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from config import settings
import uuid

def create_simple_user():
    """Create a simple test user directly in the database"""
    # Create database connection
    engine = create_engine(settings.database_url)
    
    # Create password context
    pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
    hashed_password = pwd_context.hash("password123")
    
    # Insert user directly with SQL
    with engine.connect() as conn:
        # Check if user exists
        result = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": "test@example.com"})
        if result.fetchone():
            print("✅ User test@example.com already exists!")
            return
        
        # Insert new user
        user_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO users (
                id, email, name, phone, hashed_password, role, 
                is_active, email_verified, created_at, unified_role, 
                user_type, onboarding_completed
            ) VALUES (
                :id, :email, :name, :phone, :hashed_password, :role,
                1, 1, datetime('now'), :unified_role,
                :user_type, 1
            )
        """), {
            "id": user_id,
            "email": "test@example.com",
            "name": "Test User",
            "phone": "+1234567890",
            "hashed_password": hashed_password,
            "role": "barber",
            "unified_role": "BARBER",
            "user_type": "barber"
        })
        
        conn.commit()
        
        print("🎉 Test user created successfully!")
        print("   Email: test@example.com")
        print("   Password: password123")
        print("   Role: barber")

if __name__ == "__main__":
    create_simple_user()