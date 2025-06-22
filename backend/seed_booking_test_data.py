#!/usr/bin/env python3
"""
Seed test data for booking system
"""
import os
import sys
from datetime import datetime, time, date
from sqlalchemy.orm import Session

# Set environment variables
os.environ["DATA_ENCRYPTION_KEY"] = "BcyOvTLRfOGPAUWZlxaeYHCMpwP9w391ZBFCMNy-TOQ="

from config.database import get_db, SessionLocal
from models import (
    ServiceCategory,
    Service,
    Location,
    Barber,
    BarberAvailability,
    DayOfWeek,
    User,
)


def create_test_data():
    """Create test data for booking system"""
    db = SessionLocal()

    try:
        print("🌱 Seeding booking test data...")

        # Create a test location if it doesn't exist
        location = db.query(Location).first()
        if not location:
            location = Location(
                name="Test Barbershop",
                business_name="Test Barbershop LLC",
                location_code="TEST001",
                address="123 Main St",
                city="Test City",
                state="TS",
                zip_code="12345",
                phone="555-0123",
                email="test@barbershop.com",
                timezone="America/New_York",
                payment_processor="stripe",
                default_commission_rate=0.30,
                accepts_cash=True,
                accepts_credit_card=True,
                accepts_digital_wallet=False,
                accepts_crypto=False,
                credit_card_fee_percentage=2.9,
                credit_card_fee_fixed=0.30,
                payout_frequency="weekly",
                payout_method="direct_deposit",
            )
            db.add(location)
            db.commit()
            print(f"✅ Created location: {location.name}")
        else:
            print(f"✅ Using existing location: {location.name}")

        # Create test user for barber if needed
        user = db.query(User).first()
        if not user:
            user = User(
                email="test.barber@example.com",
                username="testbarber",
                hashed_password="$2b$12$test_hash",  # This is just for testing
                first_name="Test",
                last_name="Barber",
                role="barber",
                status="active",
            )
            db.add(user)
            db.commit()
            print(f"✅ Created user: {user.email}")
        else:
            print(f"✅ Using existing user: {user.email}")

        # Create a test barber if it doesn't exist
        barber = db.query(Barber).first()
        if not barber:
            barber = Barber(
                user_id=user.id,
                first_name="Test",
                last_name="Barber",
                email="test.barber@example.com",
                phone="555-0123",
                business_name="Test Barber Co",
                bio="Professional barber with 5+ years experience",
                location_id=location.id,
                status="active",
                hire_date=date.today(),
            )
            db.add(barber)
            db.commit()
            print(f"✅ Created barber: {barber.first_name} {barber.last_name}")
        else:
            print(f"✅ Using existing barber: {barber.first_name} {barber.last_name}")

        # Create service categories
        categories_data = [
            {
                "name": "Haircuts",
                "slug": "haircuts",
                "description": "Professional haircuts and styling",
            },
            {
                "name": "Beard Care",
                "slug": "beard-care",
                "description": "Beard trimming and grooming",
            },
            {
                "name": "Styling",
                "slug": "styling",
                "description": "Hair styling and finishing",
            },
        ]

        for cat_data in categories_data:
            category = (
                db.query(ServiceCategory)
                .filter(ServiceCategory.slug == cat_data["slug"])
                .first()
            )
            if not category:
                category = ServiceCategory(**cat_data, display_order=1, is_active=True)
                db.add(category)
                db.commit()
                print(f"✅ Created category: {category.name}")

        # Create services
        haircut_category = (
            db.query(ServiceCategory).filter(ServiceCategory.slug == "haircuts").first()
        )
        services_data = [
            {
                "name": "Classic Cut",
                "description": "Traditional men's haircut with scissors and clippers",
                "category_id": haircut_category.id,
                "base_price": 35.0,
                "duration_minutes": 30,
                "location_id": location.id,
                "barber_id": barber.id,
                "is_active": True,
            },
            {
                "name": "Fade Cut",
                "description": "Modern fade haircut with precise blending",
                "category_id": haircut_category.id,
                "base_price": 45.0,
                "duration_minutes": 45,
                "location_id": location.id,
                "barber_id": barber.id,
                "is_active": True,
            },
        ]

        for service_data in services_data:
            service = (
                db.query(Service).filter(Service.name == service_data["name"]).first()
            )
            if not service:
                service = Service(**service_data)
                db.add(service)
                db.commit()
                print(f"✅ Created service: {service.name}")

        # Create barber availability
        availability_data = [
            {
                "day_of_week": DayOfWeek.MONDAY,
                "start_time": time(9, 0),
                "end_time": time(17, 0),
            },
            {
                "day_of_week": DayOfWeek.TUESDAY,
                "start_time": time(9, 0),
                "end_time": time(17, 0),
            },
            {
                "day_of_week": DayOfWeek.WEDNESDAY,
                "start_time": time(9, 0),
                "end_time": time(17, 0),
            },
            {
                "day_of_week": DayOfWeek.THURSDAY,
                "start_time": time(9, 0),
                "end_time": time(17, 0),
            },
            {
                "day_of_week": DayOfWeek.FRIDAY,
                "start_time": time(9, 0),
                "end_time": time(17, 0),
            },
        ]

        for avail_data in availability_data:
            availability = (
                db.query(BarberAvailability)
                .filter(
                    BarberAvailability.barber_id == barber.id,
                    BarberAvailability.day_of_week == avail_data["day_of_week"],
                )
                .first()
            )

            if not availability:
                availability = BarberAvailability(
                    barber_id=barber.id,
                    location_id=location.id,
                    is_available=True,
                    **avail_data,
                )
                db.add(availability)
                db.commit()
                print(f"✅ Created availability: {avail_data['day_of_week'].value}")

        print("\n🎉 Test data seeding completed successfully!")
        print(f"Location ID: {location.id}")
        print(f"Barber ID: {barber.id}")
        print(f"Services created: {len(services_data)}")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_test_data()
