#!/usr/bin/env python3
"""Create a test organization and associate test user with it."""

from database import SessionLocal, engine
from sqlalchemy import text
from datetime import datetime

def create_test_organization():
    """Create test organization and associate test user with it."""
    with engine.connect() as conn:
        try:
            # Check if organization already exists
            result = conn.execute(
                text("SELECT id FROM organizations WHERE slug = :slug"),
                {"slug": "test-barbershop"}
            )
            org_row = result.fetchone()
            
            if org_row:
                org_id = org_row[0]
                print(f"Organization already exists with ID: {org_id}")
            else:
                # Create test organization
                result = conn.execute(
                    text("""
                        INSERT INTO organizations (
                            name, slug, description, street_address, city, state, 
                            zip_code, country, phone, email, website, timezone,
                            chairs_count, billing_plan, organization_type,
                            subscription_status, subscription_started_at, 
                            subscription_expires_at, is_active, created_at, updated_at
                        ) VALUES (
                            :name, :slug, :description, :street_address, :city, :state,
                            :zip_code, :country, :phone, :email, :website, :timezone,
                            :chairs_count, :billing_plan, :organization_type,
                            :subscription_status, :subscription_started_at,
                            :subscription_expires_at, :is_active, :created_at, :updated_at
                        )
                    """),
                    {
                        "name": "Test Barbershop",
                        "slug": "test-barbershop",
                        "description": "A test barbershop for homepage builder testing",
                        "street_address": "123 Test Street",
                        "city": "Test City",
                        "state": "CA",
                        "zip_code": "12345",
                        "country": "US",
                        "phone": "+1-555-0123",
                        "email": "contact@testbarbershop.com",
                        "website": "https://testbarbershop.com",
                        "timezone": "America/Los_Angeles",
                        "chairs_count": 3,
                        "billing_plan": "studio",
                        "organization_type": "barbershop",
                        "subscription_status": "trial",
                        "subscription_started_at": datetime.utcnow(),
                        "subscription_expires_at": datetime.utcnow(),
                        "is_active": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                )
                org_id = result.lastrowid
                print(f"Test organization created with ID: {org_id}")
            
            # Get test user ID
            result = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": "test-barber@6fb.com"}
            )
            user_row = result.fetchone()
            if not user_row:
                print("Test user not found!")
                return
            
            user_id = user_row[0]
            
            # Check if user-organization relationship exists
            result = conn.execute(
                text("SELECT id FROM user_organizations WHERE user_id = :user_id AND organization_id = :org_id"),
                {"user_id": user_id, "org_id": org_id}
            )
            if result.fetchone():
                print("User already associated with organization")
            else:
                # Associate user with organization
                conn.execute(
                    text("""
                        INSERT INTO user_organizations (
                            user_id, organization_id, role, is_primary,
                            can_manage_billing, can_manage_staff, can_view_analytics,
                            joined_at, created_at
                        ) VALUES (
                            :user_id, :organization_id, :role, :is_primary,
                            :can_manage_billing, :can_manage_staff, :can_view_analytics,
                            :joined_at, :created_at
                        )
                    """),
                    {
                        "user_id": user_id,
                        "organization_id": org_id,
                        "role": "SHOP_OWNER",
                        "is_primary": True,
                        "can_manage_billing": True,
                        "can_manage_staff": True,
                        "can_view_analytics": True,
                        "joined_at": datetime.utcnow(),
                        "created_at": datetime.utcnow()
                    }
                )
                print("User associated with organization as SHOP_OWNER")
            
            conn.commit()
            
            print("\nTest setup complete:")
            print(f"  Organization: Test Barbershop (ID: {org_id})")
            print(f"  User: test-barber@6fb.com (ID: {user_id})")
            print("  Role: SHOP_OWNER")
            print("  Can access homepage builder: Yes")
            
        except Exception as e:
            print(f"Error creating test organization: {e}")
            conn.rollback()

if __name__ == "__main__":
    create_test_organization()