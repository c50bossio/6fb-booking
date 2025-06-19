#!/usr/bin/env python3
"""
Script to run directly in Render Shell to create admin user
Copy and paste this entire script into the Render Shell
"""

import os
import sys
from datetime import datetime

# Import database and models
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import User
from models.base import Base
import bcrypt

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

# Create engine and session
print("Connecting to database...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# User details
email = 'c50bossio@gmail.com'
password = 'Welcome123!'
first_name = 'Chris'
last_name = 'Bossio'

try:
    # Check if user exists
    existing_user = db.query(User).filter(User.email == email).first()
    
    if existing_user:
        print(f"User {email} already exists!")
        if existing_user.role != "super_admin":
            # Update to super_admin
            existing_user.role = "super_admin"
            existing_user.is_active = True
            existing_user.is_verified = True
            existing_user.permissions = ["*"]
            existing_user.updated_at = datetime.utcnow()
            
            # Update password
            salt = bcrypt.gensalt()
            existing_user.hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            
            db.commit()
            print(f"✅ Updated {email} to super_admin with new password")
        else:
            print("User is already a super_admin")
            # Still update password
            salt = bcrypt.gensalt()
            existing_user.hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            db.commit()
            print("✅ Updated password")
    else:
        # Create new user
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        admin_user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=hashed_password,
            role="super_admin",
            is_active=True,
            is_verified=True,
            permissions=["*"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(admin_user)
        db.commit()
        print(f"✅ Created new super_admin user {email}")
    
    print("\n📧 Email:", email)
    print("🔑 Password:", password)
    print("\n✅ Admin user ready! Use these credentials at https://sixfb-backend.onrender.com/docs")
    print("\n⚠️  IMPORTANT: Change this password after first login!")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    db.rollback()
finally:
    db.close()