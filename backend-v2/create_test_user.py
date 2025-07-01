#!/usr/bin/env python3
"""Create a test user for authentication testing."""

from database import SessionLocal, engine
from sqlalchemy import text
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    # Use raw SQL to avoid ORM relationship issues
    with engine.connect() as conn:
        try:
            # Check if user already exists
            result = conn.execute(
                text("SELECT email FROM users WHERE email = :email"),
                {"email": "test-barber@6fb.com"}
            )
            if result.fetchone():
                print("User already exists: test-barber@6fb.com")
                return
            
            # Create test user
            hashed_password = pwd_context.hash("testpass123")
            conn.execute(
                text("""
                    INSERT INTO users (email, first_name, last_name, hashed_password, role, is_active, created_at, updated_at)
                    VALUES (:email, :first_name, :last_name, :hashed_password, :role, :is_active, :created_at, :updated_at)
                """),
                {
                    "email": "test-barber@6fb.com",
                    "first_name": "Test",
                    "last_name": "Barber",
                    "hashed_password": hashed_password,
                    "role": "barber",
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            )
            conn.commit()
            
            print("Test user created successfully:")
            print("  Email: test-barber@6fb.com")
            print("  Password: testpass123")
            print("  Role: barber")
            
        except Exception as e:
            print(f"Error creating test user: {e}")
            conn.rollback()

if __name__ == "__main__":
    create_test_user()