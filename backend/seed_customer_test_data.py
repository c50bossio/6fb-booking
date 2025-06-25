#!/usr/bin/env python3
"""
Seed Customer Test Data
Creates sample appointment and booking data for customer testing
"""

import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import SessionLocal, engine
from models.customer import Customer
from models.appointment import Appointment
from models.user import User
from models.location import Location
from models.barber import Barber
from models.client import Client
import random


def create_sample_data():
    """Create sample appointment data for customer testing"""
    db = SessionLocal()

    try:
        print("🔍 Checking existing data...")

        # Check if we have locations and barbers
        locations = db.query(Location).all()
        barbers = db.query(User).filter(User.role == "barber").all()
        customers = db.query(Customer).all()

        print(
            f"Found {len(locations)} locations, {len(barbers)} barbers, {len(customers)} customers"
        )

        # If no locations, create a test location
        if not locations:
            print("📍 Creating test location...")
            test_location = Location(
                name="Test Barbershop",
                address="123 Test Street",
                city="Test City",
                state="TC",
                zip_code="12345",
                phone="+1234567890",
                email="test@testbarbershop.com",
                is_active=True,
            )
            db.add(test_location)
            db.commit()
            db.refresh(test_location)
            locations = [test_location]
            print(f"✅ Created test location: {test_location.name}")

        # If no barbers, create test barbers
        if not barbers:
            print("✂️ Creating test barbers...")
            test_barbers_data = [
                {
                    "email": "barber1@testshop.com",
                    "first_name": "Mike",
                    "last_name": "Cuts",
                    "role": "barber",
                },
                {
                    "email": "barber2@testshop.com",
                    "first_name": "Sarah",
                    "last_name": "Styles",
                    "role": "barber",
                },
                {
                    "email": "barber3@testshop.com",
                    "first_name": "Alex",
                    "last_name": "Trim",
                    "role": "barber",
                },
            ]

            for barber_data in test_barbers_data:
                # Check if user already exists
                existing_barber = (
                    db.query(User).filter(User.email == barber_data["email"]).first()
                )
                if not existing_barber:
                    barber = User(
                        email=barber_data["email"],
                        first_name=barber_data["first_name"],
                        last_name=barber_data["last_name"],
                        role=barber_data["role"],
                        is_active=True,
                        hashed_password="$2b$12$dummy_hash_for_testing",  # Dummy hash
                    )
                    db.add(barber)
                    db.commit()
                    db.refresh(barber)

                    # Create barber profile
                    barber_profile = Barber(
                        user_id=barber.id,
                        location_id=locations[0].id,
                        specialties=["Haircut", "Beard Trim", "Styling"],
                        years_experience=random.randint(2, 10),
                        hourly_rate=random.randint(30, 80),
                        is_active=True,
                    )
                    db.add(barber_profile)
                    print(f"✅ Created barber: {barber.first_name} {barber.last_name}")

            db.commit()
            barbers = db.query(User).filter(User.role == "barber").all()

        # If no customers, inform the user
        if not customers:
            print(
                "⚠️ No customers found. Run the authentication test script first to create test customers."
            )
            return

        print(f"\n📅 Creating sample appointments for {len(customers)} customers...")

        # Create sample appointments for each customer
        appointment_types = [
            "Haircut",
            "Beard Trim",
            "Haircut + Beard",
            "Styling",
            "Wash + Cut",
        ]
        appointment_statuses = ["scheduled", "completed", "cancelled", "no_show"]

        appointments_created = 0

        for customer in customers:
            # Create 2-5 appointments per customer
            num_appointments = random.randint(2, 5)

            for i in range(num_appointments):
                # Create appointment 1-30 days from now (mix of past and future)
                days_offset = random.randint(-15, 30)
                appointment_date = datetime.now() + timedelta(days=days_offset)

                # Set appointment time
                hour = random.randint(9, 17)  # 9 AM to 5 PM
                minute = random.choice([0, 15, 30, 45])
                appointment_datetime = appointment_date.replace(
                    hour=hour, minute=minute, second=0, microsecond=0
                )

                # Select random barber and location
                selected_barber = random.choice(barbers)
                selected_location = random.choice(locations)

                # Determine status based on date
                if appointment_datetime < datetime.now():
                    # Past appointments are mostly completed
                    status = random.choice(
                        ["completed", "completed", "completed", "cancelled", "no_show"]
                    )
                else:
                    # Future appointments are scheduled
                    status = "scheduled"

                # Create appointment
                appointment = Appointment(
                    customer_id=customer.id,
                    barber_id=selected_barber.id,
                    location_id=selected_location.id,
                    appointment_datetime=appointment_datetime,
                    service_type=random.choice(appointment_types),
                    status=status,
                    price=random.randint(25, 85),
                    duration_minutes=random.choice([30, 45, 60, 90]),
                    notes=f"Test appointment for {customer.first_name}",
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )

                db.add(appointment)
                appointments_created += 1

        db.commit()
        print(f"✅ Created {appointments_created} sample appointments")

        # Create some client records for customers (legacy compatibility)
        print("\n👥 Creating client records for customers...")
        clients_created = 0

        for customer in customers:
            # Check if client record already exists
            existing_client = (
                db.query(Client).filter(Client.email == customer.email).first()
            )
            if not existing_client:
                client = Client(
                    first_name=customer.first_name,
                    last_name=customer.last_name,
                    email=customer.email,
                    phone=customer.phone,
                    preferred_barber_id=random.choice(barbers).id if barbers else None,
                    notes=f"Auto-generated client record for customer {customer.email}",
                    is_active=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )
                db.add(client)
                clients_created += 1

        db.commit()
        print(f"✅ Created {clients_created} client records")

        # Summary
        print("\n" + "=" * 60)
        print("📊 CUSTOMER TEST DATA SUMMARY")
        print("=" * 60)
        print(f"Customers: {len(customers)}")
        print(f"Appointments Created: {appointments_created}")
        print(f"Client Records Created: {clients_created}")
        print(f"Available Barbers: {len(barbers)}")
        print(f"Available Locations: {len(locations)}")

        print("\n👥 CUSTOMER DETAILS:")
        for customer in customers:
            customer_appointments = (
                db.query(Appointment)
                .filter(Appointment.customer_id == customer.id)
                .count()
            )
            print(
                f"  - {customer.full_name} ({customer.email}): {customer_appointments} appointments"
            )

        print("\n✅ Customer test data setup complete!")

    except Exception as e:
        print(f"❌ Error creating sample data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
