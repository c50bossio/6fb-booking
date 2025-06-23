#!/usr/bin/env python3
"""
Seed test data for native booking system
Creates locations, barbers, services, and categories
"""
from sqlalchemy.orm import Session
from datetime import datetime, time
from config.database import SessionLocal, engine
from models.base import Base
from models.location import Location
from models.barber import Barber
from models.booking import Service, ServiceCategory, BarberAvailability, DayOfWeek


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
                is_active=True,
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
                location_id=1,
            )
            db.add(barber)
            db.commit()
            print("✅ Created test barber")

        # Create service categories
        categories = [
            {"id": 1, "name": "Haircuts", "display_order": 1},
            {"id": 2, "name": "Beard Services", "display_order": 2},
            {"id": 3, "name": "Add-ons", "display_order": 3},
        ]

        for cat_data in categories:
            category = (
                db.query(ServiceCategory)
                .filter(ServiceCategory.id == cat_data["id"])
                .first()
            )
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
                "is_active": True,
            },
            {
                "name": "Premium Haircut",
                "category_id": 1,
                "base_price": 45.0,
                "duration_minutes": 45,
                "is_active": True,
            },
            {
                "name": "Beard Trim",
                "category_id": 2,
                "base_price": 20.0,
                "duration_minutes": 20,
                "is_active": True,
            },
            {
                "name": "Hot Towel Shave",
                "category_id": 2,
                "base_price": 35.0,
                "duration_minutes": 30,
                "is_active": True,
            },
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
            availability = (
                db.query(BarberAvailability)
                .filter(
                    BarberAvailability.barber_id == 1,
                    BarberAvailability.day_of_week == DayOfWeek(day),
                )
                .first()
            )

            if not availability:
                availability = BarberAvailability(
                    barber_id=1,
                    day_of_week=DayOfWeek(day),
                    start_time=time(9, 0),
                    end_time=time(18, 0),
                    is_available=True,
                    break_start=time(12, 0),
                    break_end=time(13, 0),
                )
                db.add(availability)

        db.commit()
        print("✅ Created barber availability")

        print("\n🎉 Test data seeded successfully!")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_booking_data()
