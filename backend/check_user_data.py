#!/usr/bin/env python3
"""Check user data and appointments"""

import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import User
from models.appointment import Appointment
from models.barber import Barber
from models.location import Location
from config.database import engine, SessionLocal

# Use existing database session
session = SessionLocal()
Session = sessionmaker(bind=engine)
session = Session()

# Find the user
user_email = "bossio@tomb45.com"
user = session.query(User).filter(User.email.like(f"%{user_email}%")).first()

if user:
    print(f"✅ Found user: {user.first_name} {user.last_name}")
    print(f"   ID: {user.id}")
    print(f"   Email: {user.email}")
    print(f"   Role: {user.role}")
    print(f"   Primary Location ID: {user.primary_location_id}")

    # Check if user is a barber
    barber = session.query(Barber).filter(Barber.user_id == user.id).first()
    if barber:
        print(f"\n👤 User is a barber:")
        print(f"   Barber ID: {barber.id}")
        print(f"   Location ID: {barber.location_id}")
        print(f"   Active: {barber.is_active}")

        # Check appointments for this barber
        appointments = (
            session.query(Appointment)
            .filter(Appointment.barber_id == barber.id)
            .order_by(Appointment.appointment_datetime.desc())
            .limit(10)
            .all()
        )

        print(f"\n📅 Recent appointments: {len(appointments)}")
        for apt in appointments:
            print(f"   - {apt.appointment_datetime}: {apt.status}")
    else:
        print("\n❌ User is not set up as a barber")

        # Check if they have any location access
        if user.primary_location_id:
            location = (
                session.query(Location)
                .filter(Location.id == user.primary_location_id)
                .first()
            )
            if location:
                print(f"\n📍 Primary location: {location.name}")

                # Find barbers at this location
                barbers = (
                    session.query(Barber)
                    .filter(Barber.location_id == location.id)
                    .all()
                )
                print(f"   Barbers at location: {len(barbers)}")

                # Create a barber profile for the user
                print("\n🔧 Would you like to create a barber profile for this user?")
else:
    print(f"❌ User {user_email} not found")

    # List all users
    print("\n📋 All users in database:")
    all_users = session.query(User).all()
    for u in all_users:
        print(f"   - {u.email} ({u.first_name} {u.last_name}) - Role: {u.role}")

session.close()
