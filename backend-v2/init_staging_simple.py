#!/usr/bin/env python3
"""
Simple staging database initialization
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment variables for staging
os.environ['ENVIRONMENT'] = 'staging'
os.environ['DATABASE_URL'] = 'sqlite:///./staging_6fb_booking.db'

# Import modules
from database import engine, Base, SessionLocal
from models import User, UnifiedUserRole
from utils.auth import get_password_hash
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def create_basic_users():
    """Create basic users for staging"""
    logger.info("Creating basic users for staging...")
    
    db = SessionLocal()
    try:
        # Create admin user
        admin_user = User(
            email="admin@staging.bookedbarber.com",
            name="Admin User",
            phone="+1234567890",
            hashed_password=get_password_hash("staging123!"),
            is_active=True,
            email_verified=True,
            unified_role=UnifiedUserRole.SUPER_ADMIN.value,
            user_type="admin",
            created_at=utcnow()
        )
        db.add(admin_user)
        
        # Create business owner user
        owner_user = User(
            email="owner@staging.bookedbarber.com",
            name="Business Owner",
            phone="+1234567891",
            hashed_password=get_password_hash("staging123!"),
            is_active=True,
            email_verified=True,
            unified_role=UnifiedUserRole.SHOP_OWNER.value,
            user_type="business_owner",
            created_at=utcnow()
        )
        db.add(owner_user)
        
        # Create barber user
        barber_user = User(
            email="barber@staging.bookedbarber.com",
            name="Barber User",
            phone="+1234567892",
            hashed_password=get_password_hash("staging123!"),
            is_active=True,
            email_verified=True,
            unified_role=UnifiedUserRole.BARBER.value,
            user_type="barber",
            commission_rate=0.70,
            created_at=utcnow()
        )
        db.add(barber_user)
        
        # Create client user
        client_user = User(
            email="client@staging.bookedbarber.com",
            name="Client User",
            phone="+1234567893",
            hashed_password=get_password_hash("staging123!"),
            is_active=True,
            email_verified=True,
            unified_role=UnifiedUserRole.CLIENT.value,
            user_type="client",
            created_at=utcnow()
        )
        db.add(client_user)
        
        db.commit()
        logger.info("Created basic users successfully!")
        
    except Exception as e:
        logger.error(f"Error creating basic users: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function to initialize staging database"""
    try:
        logger.info("Starting simple staging database initialization...")
        
        # Check if staging database already exists
        if os.path.exists("staging_6fb_booking.db"):
            response = input("Staging database already exists. Do you want to recreate it? (y/n): ")
            if response.lower() != 'y':
                logger.info("Staging database initialization cancelled")
                return
            else:
                os.remove("staging_6fb_booking.db")
                logger.info("Removed existing staging database")
        
        # Create tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Create basic users
        create_basic_users()
        
        logger.info("Staging database initialization completed successfully!")
        logger.info("\nStaging Test Accounts:")
        logger.info("======================")
        logger.info("Admin: admin@staging.bookedbarber.com / staging123!")
        logger.info("Owner: owner@staging.bookedbarber.com / staging123!")
        logger.info("Barber: barber@staging.bookedbarber.com / staging123!")
        logger.info("Client: client@staging.bookedbarber.com / staging123!")
        
    except Exception as e:
        logger.error(f"Failed to initialize staging database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()