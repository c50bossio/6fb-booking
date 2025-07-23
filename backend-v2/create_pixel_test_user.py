#!/usr/bin/env python3
"""
Create a test user with proper organization setup for pixel tracking tests.
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from db import SessionLocal
from models import User, UnifiedUserRole
from models.organization import Organization, UserOrganization, UserRole
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    """Create a test user with proper organization and permissions."""
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "pixeltest@example.com").first()
        if existing_user:
            print("Test user already exists")
            # Update their verification status and organization role
            existing_user.email_verified = True
            
            user_org = db.query(UserOrganization).filter(
                UserOrganization.user_id == existing_user.id,
                UserOrganization.is_primary == True
            ).first()
            
            if user_org:
                user_org.role = UserRole.OWNER.value
                
            db.commit()
            print(f"Updated user {existing_user.email} to verified and owner role")
            return existing_user
        
        # Create organization first
        org = Organization(
            name="Test Pixel Shop",
            slug="test-pixel-shop",
            description="Test barbershop for pixel tracking",
            chairs_count=3,
            billing_plan="studio",
            subscription_status="trial",
            # Add some test tracking pixels
            gtm_container_id="GTM-TEST123",
            ga4_measurement_id="G-1234567890",
            meta_pixel_id="123456789012345",
            tracking_enabled=True
        )
        db.add(org)
        db.flush()  # Get the ID
        
        # Create user
        hashed_password = pwd_context.hash("TestPass123")
        user = User(
            email="pixeltest@example.com",
            hashed_password=hashed_password,
            name="Pixel Test User",
            role=UnifiedUserRole.BARBER.value,
            is_active=True,
            email_verified=True
        )
        db.add(user)
        db.flush()  # Get the ID
        
        # Create user-organization relationship with owner role
        user_org = UserOrganization(
            user_id=user.id,
            organization_id=org.id,
            role=UserRole.OWNER.value,
            is_primary=True,
            can_manage_billing=True,
            can_manage_staff=True,
            can_view_analytics=True
        )
        db.add(user_org)
        
        db.commit()
        
        print(f"Created test user: {user.email}")
        print(f"Organization: {org.name} (ID: {org.id})")
        print(f"User role in org: {user_org.role}")
        print(f"Test tracking pixels configured:")
        print(f"  - GTM: {org.gtm_container_id}")
        print(f"  - GA4: {org.ga4_measurement_id}")
        print(f"  - Meta: {org.meta_pixel_id}")
        
        return user
        
    except IntegrityError as e:
        db.rollback()
        print(f"Error creating test user: {e}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()