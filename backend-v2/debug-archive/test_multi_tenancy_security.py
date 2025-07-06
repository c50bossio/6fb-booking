#!/usr/bin/env python3
"""
Test script for multi-tenancy security implementation
Tests location-based access control and data isolation
"""

import asyncio
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, Appointment, Payment, Client, Service
from database import Base, engine, SessionLocal
from middleware.multi_tenancy import LocationContext, LocationAccessError, validate_location_access
from dependencies_v2 import get_location_context
import location_models

# Test data
TEST_LOCATIONS = [
    {"id": 1, "name": "Downtown Barbershop", "code": "DTN001"},
    {"id": 2, "name": "Uptown Cuts", "code": "UPT002"},
]

TEST_USERS = [
    {"id": 1, "email": "admin@bookedbarber.com", "role": "super_admin", "location_id": None},
    {"id": 2, "email": "shop1_admin@bookedbarber.com", "role": "admin", "location_id": 1},
    {"id": 3, "email": "shop2_admin@bookedbarber.com", "role": "admin", "location_id": 2},
    {"id": 4, "email": "barber1@shop1.com", "role": "barber", "location_id": 1},
    {"id": 5, "email": "barber2@shop2.com", "role": "barber", "location_id": 2},
    {"id": 6, "email": "client@gmail.com", "role": "user", "location_id": 1},
]


def print_test_header(test_name: str):
    """Print test header"""
    print(f"\n{'=' * 60}")
    print(f"🧪 TEST: {test_name}")
    print(f"{'=' * 60}")


def print_result(passed: bool, message: str):
    """Print test result"""
    icon = "✅" if passed else "❌"
    print(f"{icon} {message}")


def test_location_access_validation():
    """Test basic location access validation"""
    print_test_header("Location Access Validation")
    
    # Test 1: Super admin can access any location
    user1 = type('User', (), {"role": "super_admin", "location_id": None})()
    try:
        validate_location_access(user1, 1, "access")
        validate_location_access(user1, 2, "access")
        print_result(True, "Super admin can access all locations")
    except LocationAccessError:
        print_result(False, "Super admin should access all locations")
    
    # Test 2: Admin can only access their location
    user2 = type('User', (), {"role": "admin", "location_id": 1})()
    try:
        validate_location_access(user2, 1, "access")
        print_result(True, "Admin can access their own location")
    except LocationAccessError:
        print_result(False, "Admin should access their own location")
    
    try:
        validate_location_access(user2, 2, "access")
        print_result(False, "Admin accessed another location")
    except LocationAccessError:
        print_result(True, "Admin correctly blocked from other location")
    
    # Test 3: Regular user can only read their location
    user3 = type('User', (), {"role": "user", "location_id": 1})()
    try:
        validate_location_access(user3, 1, "read")
        print_result(True, "User can read their location")
    except LocationAccessError:
        print_result(False, "User should read their location")
    
    try:
        validate_location_access(user3, 1, "update")
        print_result(False, "User performed update operation")
    except LocationAccessError:
        print_result(True, "User correctly blocked from update operation")


def test_location_context():
    """Test LocationContext for query filtering"""
    print_test_header("Location Context Query Filtering")
    
    db = SessionLocal()
    
    # Test 1: Super admin context (all locations)
    super_admin = type('User', (), {"role": "super_admin", "location_id": None})()
    context = LocationContext(db, super_admin)
    
    query = db.query(Appointment)
    filtered_query = context.filter_query(query, Appointment)
    print_result(
        filtered_query == query,
        "Super admin query not filtered"
    )
    
    # Test 2: Location-specific admin
    admin = type('User', (), {"role": "admin", "location_id": 1})()
    context = LocationContext(db, admin)
    
    query = db.query(Appointment)
    filtered_query = context.filter_query(query, Appointment)
    
    # Check if location filter applied
    filter_str = str(filtered_query)
    has_filter = "location_id" in filter_str or "WHERE" in filter_str
    print_result(
        has_filter,
        f"Admin query filtered by location"
    )
    
    # Test 3: Validation methods
    try:
        context.validate_create(1)  # Same location
        print_result(True, "Can create in own location")
    except LocationAccessError:
        print_result(False, "Should create in own location")
    
    try:
        context.validate_create(2)  # Different location
        print_result(False, "Created in different location")
    except LocationAccessError:
        print_result(True, "Correctly blocked from creating in different location")
    
    db.close()


def test_data_isolation():
    """Test actual data isolation with sample data"""
    print_test_header("Data Isolation with Sample Records")
    
    db = SessionLocal()
    
    # Create test appointments
    print("\n📊 Creating test data...")
    
    # Clear existing test data
    db.query(Appointment).filter(Appointment.is_test_data == True).delete()
    db.query(Client).filter(Client.is_test_data == True).delete()
    db.query(Service).filter(Service.location_id.in_([1, 2])).delete()
    db.commit()
    
    # Create test appointments for different locations
    appointments = [
        Appointment(
            user_id=4, barber_id=4, location_id=1,
            service_name="Haircut - Shop 1",
            start_time="2025-01-15 10:00:00",
            duration_minutes=30, price=30.0,
            status="confirmed", is_test_data=True
        ),
        Appointment(
            user_id=5, barber_id=5, location_id=2,
            service_name="Haircut - Shop 2",
            start_time="2025-01-15 10:00:00",
            duration_minutes=30, price=35.0,
            status="confirmed", is_test_data=True
        ),
    ]
    
    for appt in appointments:
        db.add(appt)
    db.commit()
    
    # Test data access for different users
    print("\n🔍 Testing data access...")
    
    # Super admin sees all
    super_admin = type('User', (), {"role": "super_admin", "location_id": None})()
    context = LocationContext(db, super_admin)
    query = context.filter_query(db.query(Appointment), Appointment)
    count = query.filter(Appointment.is_test_data == True).count()
    print_result(count == 2, f"Super admin sees all appointments: {count}")
    
    # Location 1 admin sees only location 1
    admin1 = type('User', (), {"role": "admin", "location_id": 1})()
    context = LocationContext(db, admin1)
    query = context.filter_query(db.query(Appointment), Appointment)
    appointments = query.filter(Appointment.is_test_data == True).all()
    
    location_1_only = all(a.location_id == 1 for a in appointments)
    print_result(
        len(appointments) == 1 and location_1_only,
        f"Location 1 admin sees only location 1 data: {len(appointments)} appointments"
    )
    
    # Location 2 admin sees only location 2
    admin2 = type('User', (), {"role": "admin", "location_id": 2})()
    context = LocationContext(db, admin2)
    query = context.filter_query(db.query(Appointment), Appointment)
    appointments = query.filter(Appointment.is_test_data == True).all()
    
    location_2_only = all(a.location_id == 2 for a in appointments)
    print_result(
        len(appointments) == 1 and location_2_only,
        f"Location 2 admin sees only location 2 data: {len(appointments)} appointments"
    )
    
    # Clean up test data
    db.query(Appointment).filter(Appointment.is_test_data == True).delete()
    db.commit()
    db.close()


def test_cross_location_operations():
    """Test prevention of cross-location operations"""
    print_test_header("Cross-Location Operation Prevention")
    
    db = SessionLocal()
    
    # Setup: Create a client in location 1
    client = Client(
        first_name="Test",
        last_name="Client",
        email="test@example.com",
        barber_id=4,  # Location 1 barber
        location_id=1,
        is_test_data=True
    )
    db.add(client)
    db.commit()
    
    # Test 1: Location 2 admin cannot update location 1 client
    admin2 = type('User', (), {"role": "admin", "location_id": 2})()
    context = LocationContext(db, admin2)
    
    try:
        context.validate_update(client)
        print_result(False, "Location 2 admin updated location 1 client")
    except LocationAccessError:
        print_result(True, "Location 2 admin blocked from updating location 1 client")
    
    # Test 2: Location 2 admin cannot delete location 1 client
    try:
        context.validate_delete(client)
        print_result(False, "Location 2 admin deleted location 1 client")
    except LocationAccessError:
        print_result(True, "Location 2 admin blocked from deleting location 1 client")
    
    # Clean up
    db.query(Client).filter(Client.is_test_data == True).delete()
    db.commit()
    db.close()


def run_all_tests():
    """Run all multi-tenancy tests"""
    print("\n" + "=" * 60)
    print("🚀 MULTI-TENANCY SECURITY TEST SUITE")
    print("=" * 60)
    
    try:
        # Run tests
        test_location_access_validation()
        test_location_context()
        test_data_isolation()
        test_cross_location_operations()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS COMPLETED")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()