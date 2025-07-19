#!/usr/bin/env python3
"""Setup a fresh database and create test user"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, Service
from utils.auth import get_password_hash
from config import settings

def setup_fresh_database():
    """Create a fresh database with tables and test user"""
    
    # Remove existing database
    db_path = "6fb_booking.db"
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"🗑️ Removed existing database: {db_path}")
    
    # Create new database with all tables
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(bind=engine)
    print("🏗️ Created fresh database with all tables")
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create fresh test user
        test_user = User(
            email='fresh@test.com',
            hashed_password=get_password_hash('Fresh123!'),
            name='Fresh Test User',
            role='client',
            is_active=True,
            email_verified=True
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print('✅ Fresh test user created successfully!')
        print('📧 Email: fresh@test.com')
        print('🔑 Password: Fresh123!')
        print(f'🆔 User ID: {test_user.id}')
        print(f'👤 Role: {test_user.role}')
        
        # Create admin user too
        admin_user = User(
            email='admin@test.com',
            hashed_password=get_password_hash('Admin123!'),
            name='Test Admin',
            role='admin',
            is_active=True,
            email_verified=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print('👑 Admin user created!')
        print('📧 Admin Email: admin@test.com')
        print('🔑 Admin Password: Admin123!')
        
        return test_user, admin_user
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
        return None, None
    finally:
        db.close()

if __name__ == "__main__":
    setup_fresh_database()