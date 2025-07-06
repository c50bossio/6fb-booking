#!/usr/bin/env python3
"""
Comprehensive test user creation script for BookedBarber V2.

This script creates test users for all unified roles with proper organization
structure and relationships to test the permission system thoroughly.

Usage:
    python create_test_users_comprehensive.py [--clean]
    
    --clean: Remove existing test users before creating new ones
"""

import os
import sys
import argparse
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from models import User, Organization, UserOrganization, UnifiedUserRole
from models.organization import OrganizationType, UserRole
import hashlib
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
from config import settings

# Test user password for all accounts
TEST_PASSWORD = "TestPass123!"

# Color codes for terminal output
GREEN = '\033[92m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

def print_header(text):
    """Print a formatted header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(text):
    """Print success message"""
    print(f"{GREEN}✓ {text}{RESET}")

def print_info(text):
    """Print info message"""
    print(f"{YELLOW}→ {text}{RESET}")

def print_error(text):
    """Print error message"""
    print(f"{RED}✗ {text}{RESET}")

def create_test_organizations(db):
    """Create test organizations with proper hierarchy"""
    print_header("Creating Test Organizations")
    
    organizations = []
    
    # 1. Enterprise with multiple locations
    print_info("Creating Enterprise Organization...")
    
    # Headquarters
    hq = Organization(
        name="Elite Barber Group HQ",
        slug="elite-barber-group-hq",
        organization_type=OrganizationType.HEADQUARTERS.value,
        chairs_count=0,  # HQ doesn't have chairs directly
        street_address="123 Corporate Blvd",
        city="New York",
        state="NY",
        zip_code="10001",
        phone="(555) 100-0001",
        email="hq@elitebarbergroup.com",
        subscription_status="active",
        subscription_started_at=datetime.now(timezone.utc) - timedelta(days=180),
        stripe_customer_id="cus_test_enterprise_hq",
        is_active=True
    )
    db.add(hq)
    db.flush()
    organizations.append(hq)
    print_success(f"Created HQ: {hq.name} (ID: {hq.id})")
    
    # Location 1
    loc1 = Organization(
        name="Elite Barber Group - Manhattan",
        slug="elite-barber-manhattan",
        organization_type=OrganizationType.LOCATION.value,
        parent_organization_id=hq.id,
        chairs_count=8,
        street_address="456 5th Avenue",
        city="New York",
        state="NY",
        zip_code="10002",
        phone="(555) 100-0002",
        email="manhattan@elitebarbergroup.com",
        is_active=True
    )
    db.add(loc1)
    organizations.append(loc1)
    print_success(f"Created Location: {loc1.name}")
    
    # Location 2
    loc2 = Organization(
        name="Elite Barber Group - Brooklyn",
        slug="elite-barber-brooklyn",
        organization_type=OrganizationType.LOCATION.value,
        parent_organization_id=hq.id,
        chairs_count=6,
        street_address="789 Atlantic Ave",
        city="Brooklyn",
        state="NY",
        zip_code="11201",
        phone="(555) 100-0003",
        email="brooklyn@elitebarbergroup.com",
        is_active=True
    )
    db.add(loc2)
    organizations.append(loc2)
    print_success(f"Created Location: {loc2.name}")
    
    # 2. Single shop (no parent)
    print_info("\nCreating Single Shop Organization...")
    
    single_shop = Organization(
        name="Classic Cuts Barbershop",
        slug="classic-cuts",
        organization_type=OrganizationType.INDEPENDENT.value,
        chairs_count=4,
        street_address="321 Main Street",
        city="Chicago",
        state="IL",
        zip_code="60601",
        phone="(555) 200-0001",
        email="info@classiccuts.com",
        subscription_status="trial",
        subscription_started_at=datetime.now(timezone.utc) - timedelta(days=7),
        subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        stripe_customer_id="cus_test_single_shop",
        is_active=True
    )
    db.add(single_shop)
    organizations.append(single_shop)
    print_success(f"Created Single Shop: {single_shop.name}")
    
    # 3. Individual barber shop (for individual barber testing)
    print_info("\nCreating Individual Barber Organization...")
    
    individual_org = Organization(
        name="Mike's Chair",
        slug="mikes-chair",
        organization_type=OrganizationType.INDEPENDENT.value,
        chairs_count=1,
        street_address="Suite 10, Co-working Space",
        city="Los Angeles",
        state="CA",
        zip_code="90001",
        phone="(555) 300-0001",
        email="mike@barberpro.com",
        subscription_status="active",
        subscription_started_at=datetime.now(timezone.utc) - timedelta(days=30),
        stripe_customer_id="cus_test_individual",
        is_active=True
    )
    db.add(individual_org)
    organizations.append(individual_org)
    print_success(f"Created Individual Organization: {individual_org.name}")
    
    db.flush()
    return {
        'hq': hq,
        'location1': loc1,
        'location2': loc2,
        'single_shop': single_shop,
        'individual': individual_org
    }

def create_test_users(db, organizations):
    """Create test users for all roles"""
    print_header("Creating Test Users")
    
    # No need for auth service, using pwd_context directly
    users = {}
    
    # User data for each role
    test_users_data = [
        # System roles
        {
            'email': 'super.admin@bookedbarber.com',
            'name': 'Super Admin',
            'unified_role': UnifiedUserRole.SUPER_ADMIN.value,
            'phone': '(555) 000-0001',
            'description': 'Platform administrator with full system access'
        },
        {
            'email': 'platform.admin@bookedbarber.com',
            'name': 'Platform Admin',
            'unified_role': UnifiedUserRole.PLATFORM_ADMIN.value,
            'phone': '(555) 000-0002',
            'description': 'Platform support staff'
        },
        
        # Business owners
        {
            'email': 'enterprise.owner@elitebarbergroup.com',
            'name': 'John Enterprise',
            'unified_role': UnifiedUserRole.ENTERPRISE_OWNER.value,
            'phone': '(555) 001-0001',
            'organization': 'hq',
            'description': 'Multi-location enterprise owner'
        },
        {
            'email': 'shop.owner@classiccuts.com',
            'name': 'Sarah ShopOwner',
            'unified_role': UnifiedUserRole.SHOP_OWNER.value,
            'phone': '(555) 002-0001',
            'organization': 'single_shop',
            'description': 'Single barbershop owner'
        },
        {
            'email': 'individual.barber@barberpro.com',
            'name': 'Mike Barber',
            'unified_role': UnifiedUserRole.INDIVIDUAL_BARBER.value,
            'phone': '(555) 003-0001',
            'organization': 'individual',
            'description': 'Solo barber with own business'
        },
        
        # Staff roles
        {
            'email': 'shop.manager@elitebarbergroup.com',
            'name': 'David Manager',
            'unified_role': UnifiedUserRole.SHOP_MANAGER.value,
            'phone': '(555) 004-0001',
            'organization': 'location1',
            'description': 'Manhattan location manager'
        },
        {
            'email': 'barber1@elitebarbergroup.com',
            'name': 'Carlos Barber',
            'unified_role': UnifiedUserRole.BARBER.value,
            'phone': '(555) 005-0001',
            'organization': 'location1',
            'description': 'Staff barber at Manhattan location'
        },
        {
            'email': 'barber2@classiccuts.com',
            'name': 'Tony Styles',
            'unified_role': UnifiedUserRole.BARBER.value,
            'phone': '(555) 005-0002',
            'organization': 'single_shop',
            'description': 'Staff barber at Classic Cuts'
        },
        {
            'email': 'receptionist@elitebarbergroup.com',
            'name': 'Lisa Reception',
            'unified_role': UnifiedUserRole.RECEPTIONIST.value,
            'phone': '(555) 006-0001',
            'organization': 'location1',
            'description': 'Front desk at Manhattan location'
        },
        
        # Client role
        {
            'email': 'client1@gmail.com',
            'name': 'Robert Client',
            'unified_role': UnifiedUserRole.CLIENT.value,
            'phone': '(555) 007-0001',
            'description': 'Regular client'
        },
        {
            'email': 'client2@gmail.com',
            'name': 'James Customer',
            'unified_role': UnifiedUserRole.CLIENT.value,
            'phone': '(555) 007-0002',
            'description': 'New client'
        },
        
        # Viewer role
        {
            'email': 'viewer@elitebarbergroup.com',
            'name': 'Alex Viewer',
            'unified_role': UnifiedUserRole.VIEWER.value,
            'phone': '(555) 008-0001',
            'organization': 'hq',
            'description': 'Read-only access for reporting'
        }
    ]
    
    # Create each user
    for user_data in test_users_data:
        print_info(f"Creating {user_data['unified_role']}: {user_data['name']}...")
        
        # Create user
        user = User(
            email=user_data['email'],
            name=user_data['name'],
            phone=user_data['phone'],
            hashed_password=pwd_context.hash(TEST_PASSWORD),
            unified_role=user_data['unified_role'],
            is_active=True,
            is_test_data=True,
            email_verified=True,
            verified_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )
        
        # Set trial status for business owners
        if user_data['unified_role'] in [
            UnifiedUserRole.ENTERPRISE_OWNER.value,
            UnifiedUserRole.SHOP_OWNER.value,
            UnifiedUserRole.INDIVIDUAL_BARBER.value
        ]:
            if user_data.get('organization') == 'single_shop':
                # Shop owner in trial
                user.trial_started_at = datetime.now(timezone.utc) - timedelta(days=7)
                user.trial_expires_at = datetime.now(timezone.utc) + timedelta(days=7)
                user.trial_active = True
                user.subscription_status = "trial"
            else:
                # Others have active subscriptions
                user.trial_started_at = datetime.now(timezone.utc) - timedelta(days=30)
                user.trial_expires_at = datetime.now(timezone.utc) - timedelta(days=16)
                user.trial_active = False
                user.subscription_status = "active"
        
        db.add(user)
        db.flush()
        
        # Add to organization if specified
        if 'organization' in user_data:
            org = organizations[user_data['organization']]
            
            # Determine organization role based on unified role
            org_role_mapping = {
                UnifiedUserRole.ENTERPRISE_OWNER.value: UserRole.OWNER.value,
                UnifiedUserRole.SHOP_OWNER.value: UserRole.OWNER.value,
                UnifiedUserRole.INDIVIDUAL_BARBER.value: UserRole.OWNER.value,
                UnifiedUserRole.SHOP_MANAGER.value: UserRole.MANAGER.value,
                UnifiedUserRole.BARBER.value: UserRole.BARBER.value,
                UnifiedUserRole.RECEPTIONIST.value: UserRole.RECEPTIONIST.value,
                UnifiedUserRole.CLIENT.value: UserRole.VIEWER.value,  # Clients get minimal role in org
                UnifiedUserRole.VIEWER.value: UserRole.VIEWER.value,
            }
            
            user_org = UserOrganization(
                user_id=user.id,
                organization_id=org.id,
                role=org_role_mapping.get(user_data['unified_role'], UserRole.VIEWER.value),
                is_primary=True
            )
            
            # Set specific permissions based on role
            if user_data['unified_role'] == UnifiedUserRole.SHOP_MANAGER.value:
                user_org.can_manage_staff = True
                user_org.can_view_analytics = True
            elif user_data['unified_role'] == UnifiedUserRole.RECEPTIONIST.value:
                user_org.can_view_analytics = False
                user_org.can_manage_staff = False
            elif user_data['unified_role'] in [
                UnifiedUserRole.ENTERPRISE_OWNER.value,
                UnifiedUserRole.SHOP_OWNER.value,
                UnifiedUserRole.INDIVIDUAL_BARBER.value
            ]:
                user_org.can_manage_billing = True
                user_org.can_manage_staff = True
                user_org.can_view_analytics = True
            
            db.add(user_org)
            
            # For enterprise owner, also add access to child locations
            if user_data['unified_role'] == UnifiedUserRole.ENTERPRISE_OWNER.value:
                for loc_key in ['location1', 'location2']:
                    loc_org = UserOrganization(
                        user_id=user.id,
                        organization_id=organizations[loc_key].id,
                        role=UserRole.OWNER.value,
                        is_primary=False,
                        can_manage_billing=True,
                        can_manage_staff=True,
                        can_view_analytics=True
                    )
                    db.add(loc_org)
        
        users[user_data['unified_role']] = user
        print_success(f"Created: {user.email} - {user_data['description']}")
    
    db.flush()
    return users

def print_test_credentials(users):
    """Print test user credentials in a formatted table"""
    print_header("Test User Credentials")
    
    print(f"{'Role':<25} {'Email':<40} {'Password':<15}")
    print("-" * 80)
    
    # System roles
    print(f"\n{YELLOW}System Roles:{RESET}")
    for role in [UnifiedUserRole.SUPER_ADMIN.value, UnifiedUserRole.PLATFORM_ADMIN.value]:
        if role in users:
            user = users[role]
            print(f"{role:<25} {user.email:<40} {TEST_PASSWORD:<15}")
    
    # Business owners
    print(f"\n{YELLOW}Business Owners:{RESET}")
    for role in [
        UnifiedUserRole.ENTERPRISE_OWNER.value,
        UnifiedUserRole.SHOP_OWNER.value,
        UnifiedUserRole.INDIVIDUAL_BARBER.value
    ]:
        if role in users:
            user = users[role]
            print(f"{role:<25} {user.email:<40} {TEST_PASSWORD:<15}")
    
    # Staff roles
    print(f"\n{YELLOW}Staff Roles:{RESET}")
    for role in [
        UnifiedUserRole.SHOP_MANAGER.value,
        UnifiedUserRole.BARBER.value,
        UnifiedUserRole.RECEPTIONIST.value
    ]:
        if role in users:
            user = users[role]
            print(f"{role:<25} {user.email:<40} {TEST_PASSWORD:<15}")
    
    # Client and viewer
    print(f"\n{YELLOW}Other Roles:{RESET}")
    for role in [UnifiedUserRole.CLIENT.value, UnifiedUserRole.VIEWER.value]:
        if role in users:
            user = users[role]
            print(f"{role:<25} {user.email:<40} {TEST_PASSWORD:<15}")
    
    print("\n" + "-" * 80)
    print(f"{GREEN}All test users use the same password: {TEST_PASSWORD}{RESET}")

def clean_test_data(db):
    """Remove existing test data"""
    print_header("Cleaning Existing Test Data")
    
    # Delete test users
    deleted_users = db.query(User).filter(User.is_test_data == True).delete()
    print_info(f"Deleted {deleted_users} test users")
    
    # Delete test organizations
    test_org_names = [
        "Elite Barber Group HQ",
        "Elite Barber Group - Manhattan",
        "Elite Barber Group - Brooklyn",
        "Classic Cuts Barbershop",
        "Mike's Chair"
    ]
    deleted_orgs = db.query(Organization).filter(
        Organization.name.in_(test_org_names)
    ).delete(synchronize_session=False)
    print_info(f"Deleted {deleted_orgs} test organizations")
    
    db.commit()
    print_success("Test data cleaned")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Create comprehensive test users for BookedBarber V2')
    parser.add_argument('--clean', action='store_true', help='Clean existing test data before creating')
    args = parser.parse_args()
    
    print_header("BookedBarber V2 - Test User Creation")
    
    # Create database session
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Clean if requested
        if args.clean:
            clean_test_data(db)
        
        # Create organizations
        organizations = create_test_organizations(db)
        
        # Create users
        users = create_test_users(db, organizations)
        
        # Commit all changes
        db.commit()
        print_success("\nAll test data created successfully!")
        
        # Print credentials
        print_test_credentials(users)
        
        # Print usage instructions
        print_header("Usage Instructions")
        print("1. Navigate to http://localhost:3000/login")
        print("2. Use any of the email/password combinations above")
        print("3. Test different features based on role permissions")
        print("\nOrganization Structure:")
        print("- Elite Barber Group: Multi-location enterprise")
        print("  - HQ: No direct chairs")
        print("  - Manhattan: 8 chairs")
        print("  - Brooklyn: 6 chairs")
        print("- Classic Cuts: Single shop with 4 chairs (in trial)")
        print("- Mike's Chair: Individual barber with 1 chair")
        
    except Exception as e:
        print_error(f"Error creating test data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()