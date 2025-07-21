#!/usr/bin/env python3
"""
Create Super Admin User Script

Creates a super admin user with email admin@bookedbarber.com
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, UnifiedUserRole
from passlib.context import CryptContext
from config import Settings

def create_super_admin():
    """Create super admin user with admin@bookedbarber.com"""
    
    # Initialize settings
    settings = Settings()
    
    # Create database connection (check for feature worktree database)
    feature_db_path = "./feature_barber-profile-availability.db"
    main_db_path = "./6fb_booking.db"
    
    if os.path.exists(feature_db_path):
        database_url = f"sqlite:///{feature_db_path}"
        print(f"Using feature worktree database: {feature_db_path}")
    elif os.path.exists(main_db_path):
        database_url = f"sqlite:///{main_db_path}"
        print(f"Using main database: {main_db_path}")
    else:
        database_url = settings.database_url
        print(f"Using database from config: {database_url}")
    
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == "admin@bookedbarber.com").first()
        
        if existing_admin:
            # Update existing user to super admin
            pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
            existing_admin.hashed_password = pwd_context.hash("password123")
            existing_admin.role = "admin"  # Legacy role field
            existing_admin.unified_role = UnifiedUserRole.SUPER_ADMIN.value
            existing_admin.is_active = True
            existing_admin.email_verified = True
            existing_admin.name = "Super Admin"
            existing_admin.role_migrated = True
            
            db.commit()
            db.refresh(existing_admin)
            
            print("✅ Updated existing admin user!")
            print(f"   ID: {existing_admin.id}")
            print(f"   Email: {existing_admin.email}")
            print(f"   Password: password123")
            print(f"   Legacy Role: {existing_admin.role}")
            print(f"   Unified Role: {existing_admin.unified_role}")
            print(f"   Active: {existing_admin.is_active}")
            print(f"   Email Verified: {existing_admin.email_verified}")
            return existing_admin
        
        # Create password context
        pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
        
        # Create new super admin user
        super_admin = User(
            email="admin@bookedbarber.com",
            name="Super Admin",
            hashed_password=pwd_context.hash("password123"),
            role="admin",  # Legacy role field
            unified_role=UnifiedUserRole.SUPER_ADMIN.value,  # New unified role system
            is_active=True,
            email_verified=True,
            role_migrated=True,  # Mark as migrated to new role system
            phone="+1234567890",
            onboarding_completed=True,  # Skip onboarding for admin
            is_new_user=False  # Admin is not a new user
        )
        
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        
        print("🎉 Super admin user created successfully!")
        print(f"   ID: {super_admin.id}")
        print(f"   Email: admin@bookedbarber.com")
        print(f"   Password: password123")
        print(f"   Legacy Role: {super_admin.role}")
        print(f"   Unified Role: {super_admin.unified_role}")
        print(f"   Active: {super_admin.is_active}")
        print(f"   Email Verified: {super_admin.email_verified}")
        
        return super_admin
        
    except Exception as e:
        print(f"❌ Error creating super admin user: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()