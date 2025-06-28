#!/usr/bin/env python3
"""
Create test data for booking flow testing
"""

from models.location import Location
from models.barber import Barber
from models.user import User
from config.database import SessionLocal
from passlib.context import CryptContext
from datetime import datetime
import json

db = SessionLocal()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    # Create test location
    location = Location(
        name="Premium Cuts Barbershop",
        business_name="Premium Cuts LLC",
        location_code="PC001",
        address="123 Main Street",
        city="New York",
        state="NY",
        zip_code="10001",
        phone="555-123-4567",
        email="info@premiumcuts.com",
        is_active=True,
        franchise_type="owned",
        # Convert dict to JSON string for SQLite
        operating_hours=json.dumps(
            {
                "monday": {"open": "09:00", "close": "19:00"},
                "tuesday": {"open": "09:00", "close": "19:00"},
                "wednesday": {"open": "09:00", "close": "19:00"},
                "thursday": {"open": "09:00", "close": "19:00"},
                "friday": {"open": "09:00", "close": "20:00"},
                "saturday": {"open": "08:00", "close": "18:00"},
                "sunday": {"open": "10:00", "close": "16:00"},
            }
        ),
    )
    db.add(location)
    db.commit()

    print(f"✅ Location created: {location.name} (ID: {location.id})")

    # Create test barbers
    barber_data = [
        ("Mike", "Johnson", "mike@premiumcuts.com"),
        ("James", "Williams", "james@premiumcuts.com"),
        ("David", "Brown", "david@premiumcuts.com"),
    ]

    for first, last, email in barber_data:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"   - User {email} already exists")
            user = existing_user
        else:
            # Create user
            user = User(
                email=email,
                first_name=first,
                last_name=last,
                hashed_password=pwd_context.hash("barber123"),
                role="barber",
                is_active=True,
                is_verified=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user)
            db.commit()
            print(f"   - Created user: {email}")

        # Check if barber already exists
        existing_barber = db.query(Barber).filter(Barber.email == email).first()
        if not existing_barber:
            # Create barber profile
            barber = Barber(
                email=email,
                first_name=first,
                last_name=last,
                phone="555-100-0001",
                is_active=True,
                is_verified=True,
                location_id=location.id,
                user_id=user.id,
                subscription_tier="professional",
                hourly_rate=50.0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(barber)
            db.commit()
            print(f"   - Created barber: {first} {last}")

    print("\n📍 Test booking URL: http://localhost:3000/book/1/booking")
    print("   Use this to test the customer signup flow!")

except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
