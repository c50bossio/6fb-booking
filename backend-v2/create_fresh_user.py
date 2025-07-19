#!/usr/bin/env python3
"""Create a fresh test user for authentication testing"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User
from utils.auth import get_password_hash

def create_fresh_user():
    """Create a fresh test user with clean credentials"""
    db = SessionLocal()
    try:
        # Delete any existing test users to start completely fresh
        existing_users = db.query(User).filter(
            User.email.in_(['fresh@test.com', 'test@example.com', 'demo@test.com'])
        ).all()
        
        for user in existing_users:
            db.delete(user)
        
        db.commit()
        print("🧹 Cleared existing test users")
        
        # Create completely new user with fresh password hash
        new_user = User(
            email='fresh@test.com',
            hashed_password=get_password_hash('Fresh123!'),
            name='Fresh Test User',
            role='client',
            is_active=True,
            email_verified=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print('✅ Fresh test user created successfully!')
        print('📧 Email: fresh@test.com')
        print('🔑 Password: Fresh123!')
        print(f'🆔 User ID: {new_user.id}')
        print(f'👤 Role: {new_user.role}')
        
        return new_user
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_fresh_user()