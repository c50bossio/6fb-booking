#!/usr/bin/env python3
"""
Populate Test Data Script for 6FB Booking Platform
Usage: python populate_test_data.py --type all|services|barbers|locations
"""

import os
import sys
import argparse
import asyncio
from pathlib import Path
from datetime import datetime, time
from decimal import Decimal
import random

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from passlib.context import CryptContext
from models import User, Service, Location, Base
from config.settings import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test data definitions
TEST_SERVICES = [
    {
        "name": "Classic Haircut",
        "description": "Traditional barbershop haircut with hot towel service",
        "duration": 30,
        "price": Decimal("35.00"),
        "active": True,
    },
    {
        "name": "Fade & Design",
        "description": "Modern fade with custom design work",
        "duration": 45,
        "price": Decimal("45.00"),
        "active": True,
    },
    {
        "name": "Beard Trim",
        "description": "Professional beard shaping and maintenance",
        "duration": 20,
        "price": Decimal("25.00"),
        "active": True,
    },
    {
        "name": "Hot Shave",
        "description": "Traditional straight razor shave with hot towels",
        "duration": 40,
        "price": Decimal("40.00"),
        "active": True,
    },
    {
        "name": "Hair & Beard Combo",
        "description": "Complete haircut and beard trim package",
        "duration": 60,
        "price": Decimal("55.00"),
        "active": True,
    },
    {
        "name": "Kids Cut",
        "description": "Haircut for children under 12",
        "duration": 25,
        "price": Decimal("25.00"),
        "active": True,
    },
]

TEST_BARBERS = [
    {
        "email": "mike.johnson@6fbbooking.com",
        "full_name": "Mike Johnson",
        "specialties": ["Fades", "Traditional Cuts"],
        "bio": "Master barber with 15 years experience",
    },
    {
        "email": "carlos.rodriguez@6fbbooking.com",
        "full_name": "Carlos Rodriguez",
        "specialties": ["Hair Design", "Modern Styles"],
        "bio": "Specializing in modern cuts and designs",
    },
    {
        "email": "james.williams@6fbbooking.com",
        "full_name": "James Williams",
        "specialties": ["Beard Styling", "Hot Shaves"],
        "bio": "Expert in beard grooming and traditional shaves",
    },
    {
        "email": "david.brown@6fbbooking.com",
        "full_name": "David Brown",
        "specialties": ["Kids Cuts", "Family Styles"],
        "bio": "Family-friendly barber great with kids",
    },
]

TEST_LOCATIONS = [
    {
        "name": "Downtown Flagship",
        "address": "123 Main Street",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94105",
        "phone": "(415) 555-0001",
        "email": "downtown@6fbbooking.com",
        "timezone": "America/Los_Angeles",
        "active": True,
        "hours": {
            "monday": {"open": "09:00", "close": "19:00"},
            "tuesday": {"open": "09:00", "close": "19:00"},
            "wednesday": {"open": "09:00", "close": "19:00"},
            "thursday": {"open": "09:00", "close": "20:00"},
            "friday": {"open": "09:00", "close": "20:00"},
            "saturday": {"open": "08:00", "close": "18:00"},
            "sunday": {"open": "10:00", "close": "16:00"},
        },
    },
    {
        "name": "Mission District",
        "address": "456 Valencia Street",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94110",
        "phone": "(415) 555-0002",
        "email": "mission@6fbbooking.com",
        "timezone": "America/Los_Angeles",
        "active": True,
        "hours": {
            "monday": {"open": "10:00", "close": "20:00"},
            "tuesday": {"open": "10:00", "close": "20:00"},
            "wednesday": {"open": "10:00", "close": "20:00"},
            "thursday": {"open": "10:00", "close": "21:00"},
            "friday": {"open": "10:00", "close": "21:00"},
            "saturday": {"open": "09:00", "close": "19:00"},
            "sunday": {"closed": True},
        },
    },
    {
        "name": "Financial District",
        "address": "789 Market Street",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94103",
        "phone": "(415) 555-0003",
        "email": "fidi@6fbbooking.com",
        "timezone": "America/Los_Angeles",
        "active": True,
        "hours": {
            "monday": {"open": "08:00", "close": "18:00"},
            "tuesday": {"open": "08:00", "close": "18:00"},
            "wednesday": {"open": "08:00", "close": "18:00"},
            "thursday": {"open": "08:00", "close": "18:00"},
            "friday": {"open": "08:00", "close": "18:00"},
            "saturday": {"closed": True},
            "sunday": {"closed": True},
        },
    },
]


async def populate_services(session: AsyncSession):
    """Populate test services"""
    print("\n📦 Populating Services...")

    for service_data in TEST_SERVICES:
        # Check if service exists
        stmt = select(Service).where(Service.name == service_data["name"])
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            print(f"   ⚠️  Service '{service_data['name']}' already exists")
            continue

        service = Service(**service_data)
        session.add(service)
        print(f"   ✅ Created service: {service_data['name']}")

    await session.commit()
    print("   ✅ Services populated successfully!")


async def populate_barbers(session: AsyncSession, locations):
    """Populate test barbers"""
    print("\n💈 Populating Barbers...")

    for idx, barber_data in enumerate(TEST_BARBERS):
        # Check if barber exists
        stmt = select(User).where(User.email == barber_data["email"])
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            print(f"   ⚠️  Barber '{barber_data['email']}' already exists")
            continue

        # Create barber user
        barber = User(
            email=barber_data["email"],
            hashed_password=pwd_context.hash("testpassword123"),
            full_name=barber_data["full_name"],
            is_active=True,
            is_admin=False,
            is_barber=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Assign to a location (distribute evenly)
        if locations:
            barber.location_id = locations[idx % len(locations)].id

        session.add(barber)
        print(f"   ✅ Created barber: {barber_data['full_name']}")

    await session.commit()
    print("   ✅ Barbers populated successfully!")


async def populate_locations(session: AsyncSession):
    """Populate test locations"""
    print("\n📍 Populating Locations...")

    created_locations = []
    for location_data in TEST_LOCATIONS:
        # Check if location exists
        stmt = select(Location).where(Location.name == location_data["name"])
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            print(f"   ⚠️  Location '{location_data['name']}' already exists")
            created_locations.append(existing)
            continue

        location = Location(**location_data)
        session.add(location)
        created_locations.append(location)
        print(f"   ✅ Created location: {location_data['name']}")

    await session.commit()
    print("   ✅ Locations populated successfully!")
    return created_locations


async def populate_all_data():
    """Populate all test data"""
    settings = get_settings()
    database_url = settings.DATABASE_URL

    # Convert to async URL if needed
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("sqlite://"):
        database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Populate in order
            locations = await populate_locations(session)
            await populate_services(session)
            await populate_barbers(session, locations)

            print("\n✅ All test data populated successfully!")

        except Exception as e:
            print(f"\n❌ Error populating data: {str(e)}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()


async def populate_specific_data(data_type: str):
    """Populate specific type of test data"""
    settings = get_settings()
    database_url = settings.DATABASE_URL

    # Convert to async URL if needed
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("sqlite://"):
        database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            if data_type == "services":
                await populate_services(session)
            elif data_type == "locations":
                await populate_locations(session)
            elif data_type == "barbers":
                # Get existing locations for barber assignment
                stmt = select(Location).where(Location.active == True)
                result = await session.execute(stmt)
                locations = result.scalars().all()
                await populate_barbers(session, locations)

        except Exception as e:
            print(f"\n❌ Error populating {data_type}: {str(e)}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Populate test data for 6FB Booking Platform"
    )
    parser.add_argument(
        "--type",
        choices=["all", "services", "barbers", "locations"],
        default="all",
        help="Type of data to populate",
    )
    parser.add_argument("--env", help="Environment file to load", default=".env")
    parser.add_argument(
        "--force", action="store_true", help="Force overwrite existing data"
    )

    args = parser.parse_args()

    # Load environment variables if file exists
    env_file = Path(args.env)
    if env_file.exists():
        from dotenv import load_dotenv

        load_dotenv(env_file)
        print(f"✅ Loaded environment from {env_file}")

    print("🚀 6FB Booking Platform - Test Data Population")
    print("=" * 50)

    if args.force:
        print("⚠️  WARNING: Force mode is not implemented yet")
        print("   Existing data will be skipped, not overwritten")

    # Run population
    if args.type == "all":
        asyncio.run(populate_all_data())
    else:
        asyncio.run(populate_specific_data(args.type))


if __name__ == "__main__":
    main()
