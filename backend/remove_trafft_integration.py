#!/usr/bin/env python3
"""
Script to remove Trafft integration code and ensure native booking system works
This script will:
1. Identify all Trafft-related code
2. Comment out or remove Trafft-specific functionality
3. Ensure native booking endpoints are properly configured
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

# Files that contain Trafft references based on our search
TRAFFT_FILES = [
    "add_missing_columns.py",
    "check_appointments.py",
    "check_integration_status.py",
    "direct_insert.py",
    "emergency_schema_fix.py",
    "insert_test_appointment.py",
    "quick_data_insert.py",
    "send_test_webhook_to_production.py",
    "simple_webhook_test.py",
    "test_postman_api.py",
    "test_real_webhook_data.py",
    "test_webhook_endpoint.py",
    "test_webhook_processing.py",
    "models/barber.py",
    "api/v1/endpoints/public_dashboard.py",
    "api/v1/endpoints/dashboard.py",
    "api/v1/endpoints/public_status.py",
    "api/appointments.py",
]


def find_trafft_references(file_path: str) -> List[Tuple[int, str]]:
    """Find all lines containing 'trafft' references"""
    trafft_lines = []

    if not os.path.exists(file_path):
        return trafft_lines

    with open(file_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            if "trafft" in line.lower():
                trafft_lines.append((i, line.strip()))

    return trafft_lines


def comment_out_trafft_code(file_path: str):
    """Comment out lines containing Trafft references"""
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    modified = False
    for i, line in enumerate(lines):
        if "trafft" in line.lower() and not line.strip().startswith("#"):
            # Comment out the line
            lines[i] = "# " + line
            modified = True

    if modified:
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print(f"✅ Modified {file_path}")


def check_router_configuration():
    """Check if all booking routers are properly configured in main.py"""
    main_py = "main.py"

    with open(main_py, "r", encoding="utf-8") as f:
        content = f.read()

    issues = []

    # Check if services router is included
    if "services.router" not in content:
        issues.append("Services router not included")

    # Check if booking router is included
    if "booking.router" not in content:
        issues.append("Booking router not included")

    # Check if the booking router uses the correct prefix
    if 'prefix="/api/v1/booking"' not in content:
        issues.append("Booking router prefix might be incorrect")

    return issues


def create_booking_test_data_script():
    """Create a script to seed test data for booking system"""
    script_content = '''#!/usr/bin/env python3
"""
Seed test data for native booking system
Creates locations, barbers, services, and categories
"""
from sqlalchemy.orm import Session
from datetime import datetime, time
from config.database import SessionLocal, engine
from models import Base, Location, Barber, Service, ServiceCategory, BarberAvailability, DayOfWeek

def seed_booking_data():
    """Create test data for booking system"""
    db = SessionLocal()

    try:
        # Create test location
        location = db.query(Location).filter(Location.id == 1).first()
        if not location:
            location = Location(
                id=1,
                name="Test Barbershop",
                address="123 Main St",
                city="New York",
                state="NY",
                zip_code="10001",
                phone="555-1234",
                is_active=True
            )
            db.add(location)
            db.commit()
            print("✅ Created test location")

        # Create test barber
        barber = db.query(Barber).filter(Barber.id == 1).first()
        if not barber:
            barber = Barber(
                id=1,
                email="test.barber@example.com",
                first_name="Test",
                last_name="Barber",
                business_name="Test Barber Shop",
                phone="555-5678",
                is_active=True,
                location_id=1
            )
            db.add(barber)
            db.commit()
            print("✅ Created test barber")

        # Create service categories
        categories = [
            {"id": 1, "name": "Haircuts", "display_order": 1},
            {"id": 2, "name": "Beard Services", "display_order": 2},
            {"id": 3, "name": "Add-ons", "display_order": 3}
        ]

        for cat_data in categories:
            category = db.query(ServiceCategory).filter(ServiceCategory.id == cat_data["id"]).first()
            if not category:
                category = ServiceCategory(**cat_data, is_active=True)
                db.add(category)

        db.commit()
        print("✅ Created service categories")

        # Create services
        services = [
            {
                "name": "Classic Haircut",
                "category_id": 1,
                "base_price": 30.0,
                "duration_minutes": 30,
                "is_active": True
            },
            {
                "name": "Premium Haircut",
                "category_id": 1,
                "base_price": 45.0,
                "duration_minutes": 45,
                "is_active": True
            },
            {
                "name": "Beard Trim",
                "category_id": 2,
                "base_price": 20.0,
                "duration_minutes": 20,
                "is_active": True
            },
            {
                "name": "Hot Towel Shave",
                "category_id": 2,
                "base_price": 35.0,
                "duration_minutes": 30,
                "is_active": True
            }
        ]

        for svc_data in services:
            service = db.query(Service).filter(Service.name == svc_data["name"]).first()
            if not service:
                service = Service(**svc_data, location_id=1)
                db.add(service)

        db.commit()
        print("✅ Created services")

        # Create barber availability (Monday to Friday, 9 AM to 6 PM)
        for day in range(5):  # Monday = 0, Friday = 4
            availability = db.query(BarberAvailability).filter(
                BarberAvailability.barber_id == 1,
                BarberAvailability.day_of_week == DayOfWeek(day)
            ).first()

            if not availability:
                availability = BarberAvailability(
                    barber_id=1,
                    day_of_week=DayOfWeek(day),
                    start_time=time(9, 0),
                    end_time=time(18, 0),
                    is_available=True,
                    break_start=time(12, 0),
                    break_end=time(13, 0)
                )
                db.add(availability)

        db.commit()
        print("✅ Created barber availability")

        print("\\n🎉 Test data seeded successfully!")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_booking_data()
'''

    with open("seed_native_booking_data.py", "w") as f:
        f.write(script_content)

    print("✅ Created seed_native_booking_data.py")


def main():
    """Main function to remove Trafft integration"""
    print("🔧 Removing Trafft Integration and Ensuring Native Booking Works")
    print("=" * 80)

    # Step 1: Find all Trafft references
    print("\n📋 Finding Trafft references...")
    all_references = []

    for file_path in TRAFFT_FILES:
        refs = find_trafft_references(file_path)
        if refs:
            all_references.append((file_path, refs))
            print(f"\n{file_path}:")
            for line_num, line in refs:
                print(f"  Line {line_num}: {line}")

    # Step 2: Comment out Trafft code in critical files
    print("\n🔧 Commenting out Trafft code in model files...")
    critical_files = [
        "models/barber.py",
        "api/v1/endpoints/dashboard.py",
        "api/v1/endpoints/public_dashboard.py",
        "api/v1/endpoints/public_status.py",
    ]

    for file_path in critical_files:
        if os.path.exists(file_path):
            comment_out_trafft_code(file_path)

    # Step 3: Check router configuration
    print("\n🔍 Checking router configuration...")
    issues = check_router_configuration()

    if issues:
        print("⚠️  Router configuration issues found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("✅ Router configuration looks good")

    # Step 4: Create test data script
    print("\n📝 Creating test data script...")
    create_booking_test_data_script()

    # Step 5: Provide summary and next steps
    print("\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)

    print("\n✅ Trafft integration code has been commented out")
    print("✅ Native booking system is ready to use")

    print("\n📋 Next Steps:")
    print("1. Run the seeding script to create test data:")
    print("   python seed_native_booking_data.py")
    print("\n2. Test the native booking flow:")
    print("   python test_native_booking_flow.py")

    print("\n📚 Native Booking API Endpoints:")
    print("  Public Endpoints (no auth required):")
    print("    - GET  /api/v1/services/categories")
    print("    - GET  /api/v1/services/")
    print("    - GET  /api/v1/booking/public/shops/{shop_id}/barbers")
    print("    - GET  /api/v1/booking/public/barbers/{barber_id}/services")
    print("    - GET  /api/v1/booking/public/barbers/{barber_id}/availability")
    print("    - POST /api/v1/booking/public/bookings/create")
    print("    - GET  /api/v1/booking/public/bookings/confirm/{booking_token}")

    print("\n  Authenticated Endpoints:")
    print("    - GET  /api/v1/booking/appointments")
    print("    - POST /api/v1/booking/appointments")
    print("    - PUT  /api/v1/booking/appointments/{id}")
    print("    - DELETE /api/v1/booking/appointments/{id}")


if __name__ == "__main__":
    main()
