#!/usr/bin/env python3
"""
Create a verified test user for marketing integrations testing.
"""

import os
import sys
from datetime import datetime, timezone

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, Organization, UnifiedUserRole, UserOrganization
from utils.auth_simple import pwd_context

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_test_user():
    """Create a verified test user for development."""
    db = SessionLocal()
    
    try:
        # Check if test user already exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if existing_user:
            print("Test user already exists.")
            # Ensure user is verified
            existing_user.is_verified = True
            existing_user.email_verified = True  # Add this field
            existing_user.email_verified_at = datetime.now(timezone.utc)
            db.commit()
            print(f"Updated test user - ID: {existing_user.id}")
            return existing_user.id
        
        # Create default organization if it doesn't exist
        organization = db.query(Organization).first()
        if not organization:
            organization = Organization(
                name="Test Barbershop",
                slug="test-barbershop",
                street_address="123 Test Street",
                city="Test City",
                state="TS",
                zip_code="12345",
                phone="555-0123",
                email="test@barbershop.com",
                is_active=True
            )
            db.add(organization)
            db.commit()
            print(f"Created test organization - ID: {organization.id}")
        
        # Create test user
        user = User(
            email="test@example.com",
            name="Test User",
            hashed_password=pwd_context.hash("testpassword123"),
            is_active=True,
            is_verified=True,
            email_verified=True,  # Add this field
            email_verified_at=datetime.now(timezone.utc),
            role=UnifiedUserRole.SHOP_OWNER  # Give shop owner role for full access
        )
        db.add(user)
        db.commit()
        
        # Create user-organization relationship
        user_org = UserOrganization(
            user_id=user.id,
            organization_id=organization.id,
            role="owner",
            is_primary=True,
            can_manage_billing=True,
            can_manage_staff=True,
            can_view_analytics=True
        )
        db.add(user_org)
        db.commit()
        
        print(f"Created verified test user:")
        print(f"  Email: test@example.com")
        print(f"  Password: testpassword123")
        print(f"  User ID: {user.id}")
        print(f"  Role: {user.role}")
        print(f"  Verified: {user.is_verified}")
        print(f"  Organization: {organization.name}")
        
        return user.id
        
    except Exception as e:
        print(f"Error creating test user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()