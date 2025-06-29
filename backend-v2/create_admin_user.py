#!/usr/bin/env python3
"""Create admin user for testing."""

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from utils.auth import get_password_hash
import os

# Use the same database URL as the app
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin_user():
    """Create admin user directly using SQL."""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        result = db.execute(text("SELECT * FROM users WHERE email = 'admin@6fb.com'"))
        admin_user = result.fetchone()
        
        if admin_user:
            print('Admin user already exists')
            print(f'ID: {admin_user[0]}')
            print(f'Email: {admin_user[1]}')
            print(f'Role: {admin_user[5]}')
        else:
            print('Creating admin user...')
            hashed_password = get_password_hash('admin123')
            
            # Insert admin user
            db.execute(text("""
                INSERT INTO users (email, name, hashed_password, role, is_active, created_at, timezone) 
                VALUES ('admin@6fb.com', 'Admin User', :password, 'admin', 1, datetime('now'), 'UTC')
            """), {"password": hashed_password})
            db.commit()
            print('Admin user created successfully')
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()