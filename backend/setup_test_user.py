#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import SessionLocal
from models.user import User
from passlib.context import CryptContext

# Password context
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def create_test_user():
    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == 'test@6fb.com').first()
        if existing_user:
            print('✅ Test user already exists: test@6fb.com')
            return
        
        # Hash password
        hashed_password = pwd_context.hash('test123')
        
        # Create test user
        test_user = User(
            email='test@6fb.com',
            first_name='Test',
            last_name='User',
            hashed_password=hashed_password,
            role='admin',
            is_active=True,
            is_verified=True
        )
        
        db.add(test_user)
        db.commit()
        
        print('✅ Test user created successfully!')
        print('Email: test@6fb.com')
        print('Password: test123')
        print('Role: admin')
        
    except Exception as e:
        print(f'❌ Error creating test user: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    create_test_user()