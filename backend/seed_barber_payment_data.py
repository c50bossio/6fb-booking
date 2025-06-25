"""
Seed test data for barber payments feature
"""

import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models.barber import Barber
from models.barber_payment import BarberPaymentModel, PaymentModelType
from models.user import User
from models.appointment import Appointment
from models.payment import Payment, PaymentStatus
from models.location import Location
from services.auth_service import AuthService
import random


def create_test_barbers(db: Session):
    """Create test barbers if they don't exist"""
    auth_service = AuthService()
    barbers_data = [
        {
            "first_name": "John",
            "last_name": "Smith",
            "email": "john.smith@6fb.com",
            "phone": "555-0101",
            "payment_model": PaymentModelType.COMMISSION,
            "commission_rate": 0.30,  # 30% commission
        },
        {
            "first_name": "Maria",
            "last_name": "Garcia",
            "email": "maria.garcia@6fb.com",
            "phone": "555-0102",
            "payment_model": PaymentModelType.BOOTH_RENT,
            "booth_rent": 500.00,  # $500/week
        },
        {
            "first_name": "Mike",
            "last_name": "Johnson",
            "email": "mike.johnson@6fb.com",
            "phone": "555-0103",
            "payment_model": PaymentModelType.COMMISSION,
            "commission_rate": 0.40,  # 40% commission
        },
        {
            "first_name": "Sarah",
            "last_name": "Williams",
            "email": "sarah.williams@6fb.com",
            "phone": "555-0104",
            "payment_model": PaymentModelType.BOOTH_RENT,
            "booth_rent": 800.00,  # $800/week
        },
    ]

    created_barbers = []

    for barber_data in barbers_data:
        # Check if barber exists
        existing = db.query(Barber).filter(Barber.email == barber_data["email"]).first()
        if not existing:
            # Create user account first
            user = User(
                email=barber_data["email"],
                first_name=barber_data["first_name"],
                last_name=barber_data["last_name"],
                hashed_password=auth_service.get_password_hash("barber123"),
                role="barber",
                is_active=True,
            )
            db.add(user)
            db.flush()

            # Create barber
            barber = Barber(
                user_id=user.id,
                first_name=barber_data["first_name"],
                last_name=barber_data["last_name"],
                email=barber_data["email"],
                phone=barber_data["phone"],
                is_active=True,
                location_id=1,  # Default location
            )
            db.add(barber)
            db.flush()

            # Create payment model
            payment_model = BarberPaymentModel(
                barber_id=barber.id,
                payment_type=barber_data["payment_model"],
                service_commission_rate=barber_data.get("commission_rate", 0),
                product_commission_rate=0.15,  # 15% for products
                booth_rent_amount=barber_data.get("booth_rent", 0),
                rent_frequency="weekly",
                rent_due_day=1,  # Monday
                auto_collect_rent=True,
                auto_pay_commissions=True,
            )
            db.add(payment_model)

            created_barbers.append(barber)
            print(f"✅ Created barber: {barber.first_name} {barber.last_name}")
        else:
            created_barbers.append(existing)
            print(
                f"ℹ️  Barber already exists: {existing.first_name} {existing.last_name}"
            )

    db.commit()
    return created_barbers


def create_test_payments(db: Session, barbers):
    """Create test payments and appointments"""
    auth_service = AuthService()
    # Define available services with hardcoded data
    services = [
        {"name": "Haircut", "duration": 30, "price": 50.00},
        {"name": "Beard Trim", "duration": 20, "price": 30.00},
        {"name": "Hair & Beard", "duration": 45, "price": 75.00},
        {"name": "Deluxe Cut", "duration": 60, "price": 100.00},
        {"name": "Kids Cut", "duration": 20, "price": 25.00},
        {"name": "Senior Cut", "duration": 30, "price": 40.00},
        {"name": "Fade", "duration": 35, "price": 60.00},
        {"name": "Razor Shave", "duration": 30, "price": 45.00},
    ]

    # Create test client and user
    from models.client import Client

    client = db.query(Client).first()

    # Always get or create the test user
    user = db.query(User).filter(User.email == "testclient@6fb.com").first()
    if not user:
        user = User(
            email="testclient@6fb.com",
            first_name="Test",
            last_name="Client",
            hashed_password=auth_service.get_password_hash("client123"),
            role="client",
            is_active=True,
        )
        db.add(user)
        db.flush()

    if not client:
        # Use the first barber as the default barber for this test client
        first_barber = barbers[0] if barbers else None
        if not first_barber:
            # Create a dummy barber if none exist (shouldn't happen in this context)
            first_barber_id = 1
        else:
            first_barber_id = first_barber.id

        client = Client(
            barber_id=first_barber_id,
            first_name="Test",
            last_name="Client",
            email="testclient@6fb.com",
            phone="555-0000",
        )
        db.add(client)
        db.flush()

    # Create appointments and payments for each barber
    for barber in barbers:
        # Create 3-5 appointments per barber
        num_appointments = random.randint(3, 5)

        for i in range(num_appointments):
            # Randomly select a service
            service = random.choice(services)

            # Create appointment
            appointment_datetime = datetime.now() - timedelta(
                days=random.randint(1, 30)
            )
            appointment = Appointment(
                barber_id=barber.id,
                client_id=client.id,
                appointment_date=appointment_datetime.date(),
                appointment_time=appointment_datetime,
                duration_minutes=service["duration"],
                service_name=service["name"],
                service_revenue=service["price"],
                customer_type="returning",  # Required field
                status="completed",
                is_completed=True,
                payment_status="paid",
                payment_method="card",
            )
            db.add(appointment)
            db.flush()

            # Create payment
            payment = Payment(
                appointment_id=appointment.id,
                user_id=user.id,  # Required field
                amount=int(service["price"] * 100),  # Convert to cents
                currency="USD",
                status=PaymentStatus.SUCCEEDED,
                stripe_payment_intent_id=f"pi_test_{appointment.id}",
                description=f"Payment for {service['name']}",
                paid_at=appointment_datetime,
            )
            db.add(payment)

        print(f"✅ Created {num_appointments} payments for {barber.first_name}")

    db.commit()


def main():
    """Main function to seed barber payment data"""
    print("🌱 Seeding barber payment test data...")

    db = SessionLocal()
    try:
        # Ensure we have a location
        location = db.query(Location).first()
        if not location:
            location = Location(
                name="Main Shop",
                business_name="Six Feet Behind - Main Shop",
                location_code="MAIN001",
                address="123 Main St",
                city="New York",
                state="NY",
                zip_code="10001",
                phone="555-0100",
                is_active=True,
            )
            db.add(location)
            db.commit()
            print("✅ Created default location")

        # Create barbers
        barbers = create_test_barbers(db)

        # Create payments
        create_test_payments(db, barbers)

        print("\n✅ Successfully seeded barber payment data!")
        print("🌐 Visit: https://web-production-92a6c.up.railway.app/barber-payments")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
