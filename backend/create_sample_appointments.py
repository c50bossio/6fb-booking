#!/usr/bin/env python3
"""
Create sample appointment data for calendar testing
"""
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.database import SessionLocal
from models.appointment import Appointment
from models.client import Client
from models.booking import Service, ServiceCategory
from models.location import Location
from models.barber import Barber
from models.user import User


def create_sample_data():
    """Create sample appointments for calendar testing"""
    db = SessionLocal()

    try:
        print("🔄 Creating sample appointment data...")

        # Check existing data
        location = db.query(Location).first()
        user = db.query(User).first()

        print(f"Found location: {location.name if location else 'None'}")
        print(f"Found user: {user.email if user else 'None'}")

        # Create location if none exists
        if not location:
            location = Location(
                name="6FB Main Location",
                business_name="Six Figure Barber Main",
                location_code="6FB001",
                address="123 Main Street",
                city="Downtown",
                state="CA",
                zip_code="90210",
                phone="(555) 123-4567",
                email="main@sixfigurebarber.com",
            )
            db.add(location)
            db.commit()
            db.refresh(location)
            print(f"✅ Created location: {location.name}")

        # Create/find barber
        barber = db.query(Barber).first()
        if not barber and user:
            barber = Barber(
                user_id=user.id,
                location_id=location.id,
                bio="Master barber with 10+ years experience",
                specialties="Classic cuts, beard styling, hot towel shaves",
                hourly_rate=75.00,
                commission_rate=0.60,  # 60% commission
            )
            db.add(barber)
            db.commit()
            db.refresh(barber)
            print(f"✅ Created barber for user: {user.email}")

        # Create service category
        category = db.query(ServiceCategory).first()
        if not category:
            category = ServiceCategory(
                name="Haircuts",
                slug="haircuts",
                description="Professional haircut services",
                display_order=1,
                icon="scissors",
                color="#14b8a6",
            )
            db.add(category)
            db.commit()
            db.refresh(category)
            print(f"✅ Created service category: {category.name}")

        # Create services
        services = db.query(Service).all()
        if not services:
            sample_services = [
                {
                    "name": "Classic Haircut",
                    "description": "Traditional barber haircut with styling",
                    "base_price": 50.00,
                    "duration_minutes": 45,
                },
                {
                    "name": "Haircut + Beard Trim",
                    "description": "Full haircut with professional beard styling",
                    "base_price": 75.00,
                    "duration_minutes": 60,
                },
                {
                    "name": "Hot Towel Shave",
                    "description": "Traditional hot towel straight razor shave",
                    "base_price": 45.00,
                    "duration_minutes": 30,
                },
            ]

            for service_data in sample_services:
                service = Service(
                    category_id=category.id,
                    location_id=location.id,
                    barber_id=barber.id if barber else None,
                    **service_data,
                )
                db.add(service)
                services.append(service)

            db.commit()
            print(f"✅ Created {len(sample_services)} services")

        # Create sample clients
        existing_clients = db.query(Client).count()
        if existing_clients < 3:
            sample_clients = [
                {
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john.doe@example.com",
                    "phone": "(555) 001-1001",
                },
                {
                    "first_name": "Mike",
                    "last_name": "Johnson",
                    "email": "mike.johnson@example.com",
                    "phone": "(555) 002-2002",
                },
                {
                    "first_name": "David",
                    "last_name": "Wilson",
                    "email": "david.wilson@example.com",
                    "phone": "(555) 003-3003",
                },
            ]

            for client_data in sample_clients:
                # Check if client already exists
                existing = (
                    db.query(Client)
                    .filter(Client.email == client_data["email"])
                    .first()
                )
                if not existing:
                    client = Client(**client_data)
                    db.add(client)

            db.commit()
            print(f"✅ Created sample clients")

        # Get clients and services for appointments
        clients = db.query(Client).limit(3).all()
        services = db.query(Service).limit(3).all()

        # Check existing appointments
        existing_appointments = db.query(Appointment).count()
        print(f"Found {existing_appointments} existing appointments")

        if existing_appointments < 5:
            # Create appointments for the next 7 days
            base_date = datetime.now().replace(
                hour=9, minute=0, second=0, microsecond=0
            )
            appointments_created = 0

            for day_offset in range(7):
                appointment_date = base_date + timedelta(days=day_offset)

                # Skip weekends for now
                if appointment_date.weekday() >= 5:
                    continue

                # Create 1-2 appointments per day
                for hour_offset in [0, 2]:  # 9 AM and 11 AM
                    if appointments_created >= 8:
                        break

                    appt_time = appointment_date + timedelta(hours=hour_offset)
                    client = clients[appointments_created % len(clients)]
                    service = services[appointments_created % len(services)]

                    appointment = Appointment(
                        client_id=client.id,
                        service_id=service.id,
                        barber_id=barber.id if barber else None,
                        location_id=location.id,
                        appointment_datetime=appt_time,
                        status="confirmed",
                        notes=f"Sample appointment #{appointments_created + 1}",
                        total_price=service.base_price,
                        payment_status=(
                            "paid" if appointments_created % 2 == 0 else "pending"
                        ),
                    )

                    db.add(appointment)
                    appointments_created += 1

                if appointments_created >= 8:
                    break

            db.commit()
            print(f"✅ Created {appointments_created} sample appointments")

            # Display created appointments
            appointments = (
                db.query(Appointment).order_by(Appointment.appointment_datetime).all()
            )
            print("\n📅 Sample Appointments Created:")
            for appt in appointments[-appointments_created:]:
                client_name = f"{appt.client.first_name} {appt.client.last_name}"
                service_name = appt.service.name if appt.service else "Unknown Service"
                date_str = appt.appointment_datetime.strftime("%Y-%m-%d %H:%M")
                print(
                    f"  • {date_str} - {client_name} - {service_name} (${appt.total_price})"
                )

        else:
            print("✅ Appointments already exist, skipping creation")

        print(
            f"\n🎉 Calendar data ready! Total appointments: {db.query(Appointment).count()}"
        )

    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
