#!/usr/bin/env python3
"""
Setup sample data for testing the booking flow
"""

import sys
import os

sys.path.append("/Users/bossio/6fb-booking/backend")

from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models import ServiceCategory, Service, Location, Barber
import json


def create_sample_data():
    """Create sample service categories, services, and location data"""
    db = SessionLocal()

    try:
        # Check if location exists, create if not
        location = db.query(Location).filter(Location.id == 1).first()
        if not location:
            location = Location(
                id=1,
                name="Six Figure Barber - Downtown",
                business_name="Six Figure Barber",
                address="123 Main Street",
                city="Downtown",
                state="NY",
                zip_code="10001",
                phone="(555) 123-4567",
                email="downtown@sixfigurebarber.com",
                timezone="America/New_York",
                is_active=True,
                onboarding_status="completed",
            )
            db.add(location)
            db.flush()

        # Check if service categories exist
        categories = db.query(ServiceCategory).all()
        if not categories:
            # Create service categories
            categories_data = [
                {
                    "name": "Cuts",
                    "description": "Professional haircuts",
                    "display_order": 1,
                },
                {
                    "name": "Styling",
                    "description": "Hair styling services",
                    "display_order": 2,
                },
                {
                    "name": "Grooming",
                    "description": "Beard and grooming services",
                    "display_order": 3,
                },
                {
                    "name": "Treatments",
                    "description": "Hair treatments and care",
                    "display_order": 4,
                },
            ]

            category_objects = []
            for cat_data in categories_data:
                category = ServiceCategory(
                    name=cat_data["name"],
                    description=cat_data["description"],
                    display_order=cat_data["display_order"],
                    is_active=True,
                )
                db.add(category)
                category_objects.append(category)

            db.flush()
            categories = category_objects

        # Check if services exist
        services = db.query(Service).all()
        if not services:
            # Create services
            services_data = [
                # Cuts
                {
                    "name": "Classic Cut",
                    "description": "Traditional men's haircut with scissor and clipper work",
                    "category_name": "Cuts",
                    "base_price": 45.00,
                    "duration_minutes": 45,
                    "requires_deposit": True,
                    "deposit_amount": 15.00,
                    "deposit_type": "fixed",
                },
                {
                    "name": "Premium Cut & Style",
                    "description": "Premium haircut with styling and finish",
                    "category_name": "Cuts",
                    "base_price": 65.00,
                    "duration_minutes": 60,
                    "requires_deposit": True,
                    "deposit_amount": 20.00,
                    "deposit_type": "fixed",
                },
                {
                    "name": "Fade Cut",
                    "description": "Modern fade haircut with precision blending",
                    "category_name": "Cuts",
                    "base_price": 55.00,
                    "duration_minutes": 50,
                    "requires_deposit": True,
                    "deposit_amount": 18.00,
                    "deposit_type": "fixed",
                },
                # Styling
                {
                    "name": "Hair Styling",
                    "description": "Professional hair styling for special occasions",
                    "category_name": "Styling",
                    "base_price": 35.00,
                    "duration_minutes": 30,
                    "requires_deposit": False,
                    "is_addon": True,
                },
                {
                    "name": "Wash & Style",
                    "description": "Hair wash with professional styling",
                    "category_name": "Styling",
                    "base_price": 25.00,
                    "duration_minutes": 25,
                    "requires_deposit": False,
                },
                # Grooming
                {
                    "name": "Beard Trim",
                    "description": "Professional beard trimming and shaping",
                    "category_name": "Grooming",
                    "base_price": 25.00,
                    "duration_minutes": 20,
                    "requires_deposit": False,
                    "is_addon": True,
                },
                {
                    "name": "Full Shave",
                    "description": "Traditional straight razor shave with hot towel",
                    "category_name": "Grooming",
                    "base_price": 40.00,
                    "duration_minutes": 45,
                    "requires_deposit": True,
                    "deposit_amount": 15.00,
                    "deposit_type": "fixed",
                },
                {
                    "name": "Cut & Beard Combo",
                    "description": "Haircut and beard trim combination service",
                    "category_name": "Grooming",
                    "base_price": 65.00,
                    "duration_minutes": 75,
                    "requires_deposit": True,
                    "deposit_amount": 25.00,
                    "deposit_type": "fixed",
                },
                # Treatments
                {
                    "name": "Hair Treatment",
                    "description": "Deep conditioning hair treatment",
                    "category_name": "Treatments",
                    "base_price": 30.00,
                    "duration_minutes": 30,
                    "requires_deposit": False,
                    "is_addon": True,
                },
            ]

            for service_data in services_data:
                # Find category
                category = next(
                    (c for c in categories if c.name == service_data["category_name"]),
                    None,
                )
                if not category:
                    continue

                service = Service(
                    name=service_data["name"],
                    description=service_data["description"],
                    category_id=category.id,
                    base_price=service_data["base_price"],
                    duration_minutes=service_data["duration_minutes"],
                    requires_deposit=service_data.get("requires_deposit", False),
                    deposit_amount=service_data.get("deposit_amount"),
                    deposit_type=service_data.get("deposit_type"),
                    is_addon=service_data.get("is_addon", False),
                    location_id=location.id,  # Associate with location
                    is_active=True,
                    display_order=len(services) + 1,
                    min_advance_hours=2,  # 2 hours minimum advance booking
                    tags=json.dumps([service_data["category_name"].lower()]),
                )
                db.add(service)

        # Ensure barbers exist
        barbers = db.query(Barber).filter(Barber.location_id == 1).all()
        if not barbers:
            print("No barbers found for location 1. Creating sample barbers...")
            barber_names = [
                ("John", "Smith"),
                ("Maria", "Garcia"),
                ("Mike", "Johnson"),
                ("Sarah", "Williams"),
            ]

            for first_name, last_name in barber_names:
                barber = Barber(
                    first_name=first_name,
                    last_name=last_name,
                    email=f"{first_name.lower()}.{last_name.lower()}@sixfigurebarber.com",
                    location_id=location.id,
                    is_active=True,
                    role="barber",
                )
                db.add(barber)

        db.commit()
        print("✅ Sample data created successfully!")

        # Verify data
        categories_count = db.query(ServiceCategory).count()
        services_count = db.query(Service).count()
        barbers_count = db.query(Barber).filter(Barber.location_id == 1).count()

        print(f"📊 Data Summary:")
        print(f"   Service Categories: {categories_count}")
        print(f"   Services: {services_count}")
        print(f"   Barbers: {barbers_count}")
        print(f"   Location: {location.name}")

    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
        return False
    finally:
        db.close()

    return True


if __name__ == "__main__":
    print("🚀 Setting up sample data for booking system...")
    success = create_sample_data()

    if success:
        print("\n🎉 Setup complete! You can now test the booking flow:")
        print("1. Visit http://localhost:3000")
        print("2. Try booking an appointment")
        print("3. Services should now appear in the booking flow")
    else:
        print("\n❌ Setup failed. Check the error messages above.")
        sys.exit(1)
