#!/usr/bin/env python3
"""
Load Initial Data Script for 6FB Booking Platform
Usage: python scripts/load_initial_data.py
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models.service import Service
from models.location import Location
from models.barber import Barber
from models.user import User
from datetime import datetime, time
import json


def load_services(db: Session):
    """Load default services"""
    print("\n📋 Loading Services...")

    services_data = [
        {
            "name": "Classic Haircut",
            "description": "Traditional barber cut with hot towel finish",
            "duration": 30,
            "price": 35.00,
            "category": "haircut",
            "is_active": True,
        },
        {
            "name": "Fade Cut",
            "description": "Precision fade with customizable gradient",
            "duration": 45,
            "price": 45.00,
            "category": "haircut",
            "is_active": True,
        },
        {
            "name": "Beard Trim",
            "description": "Professional beard shaping and grooming",
            "duration": 20,
            "price": 25.00,
            "category": "beard",
            "is_active": True,
        },
        {
            "name": "Hot Shave",
            "description": "Traditional straight razor shave with hot towels",
            "duration": 30,
            "price": 40.00,
            "category": "shave",
            "is_active": True,
        },
        {
            "name": "Hair & Beard Combo",
            "description": "Complete grooming package",
            "duration": 60,
            "price": 65.00,
            "category": "combo",
            "is_active": True,
        },
        {
            "name": "Kids Cut",
            "description": "Haircut for children under 12",
            "duration": 25,
            "price": 25.00,
            "category": "haircut",
            "is_active": True,
        },
        {
            "name": "Design/Pattern",
            "description": "Custom hair design or pattern",
            "duration": 15,
            "price": 15.00,
            "category": "addon",
            "is_active": True,
        },
        {
            "name": "Hair Color",
            "description": "Professional hair coloring service",
            "duration": 90,
            "price": 80.00,
            "category": "color",
            "is_active": True,
        },
        {
            "name": "Edge Up",
            "description": "Quick lineup and edge cleanup",
            "duration": 15,
            "price": 20.00,
            "category": "haircut",
            "is_active": True,
        },
        {
            "name": "Premium Package",
            "description": "Haircut, beard trim, hot shave, and facial",
            "duration": 90,
            "price": 120.00,
            "category": "premium",
            "is_active": True,
        },
    ]

    created_count = 0
    for service_data in services_data:
        # Check if service already exists
        existing = (
            db.query(Service).filter(Service.name == service_data["name"]).first()
        )
        if not existing:
            service = Service(**service_data)
            db.add(service)
            created_count += 1
            print(f"   ✅ Created: {service_data['name']} (${service_data['price']})")
        else:
            print(f"   ℹ️  Exists: {service_data['name']}")

    db.commit()
    print(f"   📊 Total: {created_count} new services created")
    return created_count


def load_locations(db: Session):
    """Load default locations"""
    print("\n📍 Loading Locations...")

    locations_data = [
        {
            "name": "Downtown Flagship",
            "address": "123 Main Street",
            "city": "New York",
            "state": "NY",
            "zip_code": "10001",
            "phone": "(212) 555-0001",
            "email": "downtown@6fb.com",
            "timezone": "America/New_York",
            "is_active": True,
            "business_hours": {
                "monday": {"open": "09:00", "close": "19:00"},
                "tuesday": {"open": "09:00", "close": "19:00"},
                "wednesday": {"open": "09:00", "close": "19:00"},
                "thursday": {"open": "09:00", "close": "20:00"},
                "friday": {"open": "09:00", "close": "20:00"},
                "saturday": {"open": "08:00", "close": "18:00"},
                "sunday": {"open": "10:00", "close": "17:00"},
            },
            "settings": {
                "booking_window_days": 30,
                "cancellation_hours": 24,
                "deposit_required": False,
                "deposit_amount": 0,
                "max_daily_bookings": 50,
            },
        },
        {
            "name": "Midtown Express",
            "address": "456 Park Avenue",
            "city": "New York",
            "state": "NY",
            "zip_code": "10022",
            "phone": "(212) 555-0002",
            "email": "midtown@6fb.com",
            "timezone": "America/New_York",
            "is_active": True,
            "business_hours": {
                "monday": {"open": "08:00", "close": "20:00"},
                "tuesday": {"open": "08:00", "close": "20:00"},
                "wednesday": {"open": "08:00", "close": "20:00"},
                "thursday": {"open": "08:00", "close": "21:00"},
                "friday": {"open": "08:00", "close": "21:00"},
                "saturday": {"open": "09:00", "close": "19:00"},
                "sunday": {"closed": True},
            },
            "settings": {
                "booking_window_days": 21,
                "cancellation_hours": 12,
                "deposit_required": True,
                "deposit_amount": 20,
                "max_daily_bookings": 40,
            },
        },
    ]

    created_count = 0
    for location_data in locations_data:
        # Extract nested data
        business_hours = location_data.pop("business_hours", {})
        settings = location_data.pop("settings", {})

        # Check if location already exists
        existing = (
            db.query(Location).filter(Location.name == location_data["name"]).first()
        )
        if not existing:
            location = Location(
                **location_data,
                business_hours=json.dumps(business_hours),
                settings=json.dumps(settings),
            )
            db.add(location)
            created_count += 1
            print(
                f"   ✅ Created: {location_data['name']} ({location_data['city']}, {location_data['state']})"
            )
        else:
            print(f"   ℹ️  Exists: {location_data['name']}")

    db.commit()
    print(f"   📊 Total: {created_count} new locations created")
    return created_count


def load_sample_barbers(db: Session):
    """Load sample barber profiles (optional)"""
    print("\n💈 Loading Sample Barbers...")

    # Get first location
    location = db.query(Location).first()
    if not location:
        print("   ❌ No locations found. Please create locations first.")
        return 0

    barbers_data = [
        {
            "first_name": "Marcus",
            "last_name": "Johnson",
            "email": "marcus@6fb.com",
            "phone": "(212) 555-1001",
            "bio": "Master barber with 15+ years experience. Specializing in fades and beard sculpting.",
            "instagram": "@marcus_cuts",
            "location_id": location.id,
            "is_active": True,
            "commission_rate": 60,
            "specialties": ["fades", "beard_design", "hair_art"],
            "working_hours": {
                "monday": {"start": "09:00", "end": "18:00"},
                "tuesday": {"start": "09:00", "end": "18:00"},
                "wednesday": {"start": "09:00", "end": "18:00"},
                "thursday": {"start": "10:00", "end": "19:00"},
                "friday": {"start": "10:00", "end": "19:00"},
                "saturday": {"start": "08:00", "end": "17:00"},
            },
        },
        {
            "first_name": "James",
            "last_name": "Williams",
            "email": "james@6fb.com",
            "phone": "(212) 555-1002",
            "bio": "Precision cutting expert. Certified in classic and modern techniques.",
            "instagram": "@james_barber",
            "location_id": location.id,
            "is_active": True,
            "commission_rate": 55,
            "specialties": ["classic_cuts", "hot_shaves", "color"],
            "working_hours": {
                "tuesday": {"start": "10:00", "end": "19:00"},
                "wednesday": {"start": "10:00", "end": "19:00"},
                "thursday": {"start": "10:00", "end": "19:00"},
                "friday": {"start": "09:00", "end": "20:00"},
                "saturday": {"start": "09:00", "end": "18:00"},
                "sunday": {"start": "10:00", "end": "16:00"},
            },
        },
    ]

    created_count = 0
    for barber_data in barbers_data:
        # Extract nested data
        specialties = barber_data.pop("specialties", [])
        working_hours = barber_data.pop("working_hours", {})

        # Check if barber already exists
        existing = db.query(Barber).filter(Barber.email == barber_data["email"]).first()
        if not existing:
            # Create associated user account
            user = User(
                email=barber_data["email"],
                first_name=barber_data["first_name"],
                last_name=barber_data["last_name"],
                role="barber",
                is_active=True,
                hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCfiNDQyC",  # temp password: "changeme123"
            )
            db.add(user)
            db.flush()

            barber = Barber(
                **barber_data,
                user_id=user.id,
                specialties=json.dumps(specialties),
                working_hours=json.dumps(working_hours),
            )
            db.add(barber)
            created_count += 1
            print(
                f"   ✅ Created: {barber_data['first_name']} {barber_data['last_name']}"
            )
        else:
            print(
                f"   ℹ️  Exists: {barber_data['first_name']} {barber_data['last_name']}"
            )

    db.commit()
    print(f"   📊 Total: {created_count} new barbers created")
    if created_count > 0:
        print(f"   🔐 Default password for all barbers: changeme123")
    return created_count


def load_system_settings(db: Session):
    """Load system-wide settings"""
    print("\n⚙️  Loading System Settings...")

    # This would typically load into a Settings table
    # For now, we'll just display what should be configured

    settings = {
        "business": {
            "name": "Six Figure Barber",
            "tagline": "Elevate Your Craft, Maximize Your Income",
            "support_email": "support@6fb.com",
            "support_phone": "(888) 6FB-CUTS",
        },
        "booking": {
            "advance_booking_days": 30,
            "min_booking_notice_hours": 2,
            "cancellation_policy_hours": 24,
            "no_show_fee": 25.00,
            "deposit_percentage": 20,
        },
        "notifications": {
            "appointment_reminder_hours": [24, 2],
            "follow_up_delay_days": 3,
            "review_request_delay_days": 1,
        },
        "analytics": {
            "retention_period_days": 90,
            "inactive_client_days": 60,
            "target_retention_rate": 80,
        },
    }

    print("   ℹ️  System settings should be configured in environment variables")
    print("   📋 Recommended settings:")
    for category, items in settings.items():
        print(f"\n   {category.upper()}:")
        for key, value in items.items():
            print(f"      - {key}: {value}")

    return True


def main():
    """Main function to load all initial data"""
    print("\n🚀 6FB Booking Platform - Initial Data Loader")
    print("=" * 50)

    db = SessionLocal()

    try:
        # Confirm before proceeding
        print("\nThis script will load:")
        print("  • Default services catalog")
        print("  • Sample business locations")
        print("  • Sample barber profiles (optional)")
        print("  • System configuration settings")

        confirm = input("\nProceed with data loading? (yes/no): ").strip().lower()
        if confirm != "yes":
            print("\n❌ Data loading cancelled.")
            return

        # Load data in order
        services_count = load_services(db)
        locations_count = load_locations(db)

        # Ask about sample barbers
        load_barbers = (
            input("\nLoad sample barber profiles? (yes/no): ").strip().lower()
        )
        barbers_count = 0
        if load_barbers == "yes":
            barbers_count = load_sample_barbers(db)

        load_system_settings(db)

        # Summary
        print("\n" + "=" * 50)
        print("✅ Initial Data Loading Complete!")
        print(f"\n📊 Summary:")
        print(f"   • Services created: {services_count}")
        print(f"   • Locations created: {locations_count}")
        print(f"   • Barbers created: {barbers_count}")

        print("\n📝 Next Steps:")
        print("   1. Configure environment variables for integrations")
        print("   2. Create admin user with create_admin_user.py")
        print("   3. Test booking flow with test_booking_flow.py")
        print("   4. Configure payment processing in Stripe")

    except Exception as e:
        print(f"\n❌ Error loading data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
