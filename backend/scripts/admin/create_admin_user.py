#!/usr/bin/env python3
"""
Create Admin User Script for 6FB Booking Platform
Usage: python create_admin_user.py --email admin@example.com --password your-password --name "Admin Name"
"""

import os
import sys
import argparse
import asyncio
from pathlib import Path
from datetime import datetime
from getpass import getpass

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from models import User, Base
from config.settings import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin_user(email: str, password: str, name: str):
    """Create an admin user in the database"""

    # Get database URL from environment
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
            # Check if user already exists
            from sqlalchemy import select

            stmt = select(User).where(User.email == email)
            result = await session.execute(stmt)
            existing_user = result.scalar_one_or_none()

            if existing_user:
                print(f"❌ User with email {email} already exists")

                # Ask if they want to update the user to admin
                response = input("Would you like to update this user to admin? (y/n): ")
                if response.lower() == "y":
                    existing_user.is_admin = True
                    existing_user.is_active = True
                    existing_user.updated_at = datetime.utcnow()
                    await session.commit()
                    print(f"✅ User {email} updated to admin successfully!")
                return

            # Create new admin user
            hashed_password = pwd_context.hash(password)
            admin_user = User(
                email=email,
                hashed_password=hashed_password,
                full_name=name,
                is_active=True,
                is_admin=True,
                is_barber=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            session.add(admin_user)
            await session.commit()

            print(f"✅ Admin user created successfully!")
            print(f"   Email: {email}")
            print(f"   Name: {name}")
            print(f"   Admin: Yes")
            print(f"   Active: Yes")

        except Exception as e:
            print(f"❌ Error creating admin user: {str(e)}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Create an admin user for 6FB Booking Platform"
    )
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument(
        "--password", help="Admin password (will prompt if not provided)"
    )
    parser.add_argument("--name", required=True, help="Admin full name")
    parser.add_argument("--env", help="Environment file to load", default=".env")

    args = parser.parse_args()

    # Load environment variables if file exists
    env_file = Path(args.env)
    if env_file.exists():
        from dotenv import load_dotenv

        load_dotenv(env_file)
        print(f"✅ Loaded environment from {env_file}")

    # Get password if not provided
    password = args.password
    if not password:
        password = getpass("Enter admin password: ")
        confirm_password = getpass("Confirm password: ")

        if password != confirm_password:
            print("❌ Passwords do not match!")
            sys.exit(1)

    # Validate password strength
    if len(password) < 8:
        print("❌ Password must be at least 8 characters long!")
        sys.exit(1)

    # Create admin user
    asyncio.run(create_admin_user(args.email, password, args.name))


if __name__ == "__main__":
    main()
