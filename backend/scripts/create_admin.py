#!/usr/bin/env python3
"""
Script to create an admin user for the 6FB Platform
"""
import os
import sys
from pathlib import Path
import argparse

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import User
from models.base import Base
from passlib.context import CryptContext
from datetime import datetime
import getpass

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin_user(
    email=None, first_name=None, last_name=None, username=None, password=None
):
    """Create an admin user with provided details or interactive prompts"""

    # Get database URL from environment or use default
    database_url = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")

    # For Render's PostgreSQL, we might need to replace postgres:// with postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    print(f"Connecting to database...")

    # Create engine and session
    engine = create_engine(database_url)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("\n=== Create Admin User ===\n")

        # Get user details
        if not email:
            email = input("Admin email: ").strip()

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"\nUser with email {email} already exists!")
            if existing_user.role == "super_admin":
                print("This user is already a super admin.")
            else:
                update = input(
                    f"Current role is '{existing_user.role}'. Update to super_admin? (y/n): "
                )
                if update.lower() == "y":
                    existing_user.role = "super_admin"
                    existing_user.updated_at = datetime.utcnow()
                    db.commit()
                    print("✅ User updated to super_admin role!")
            return

        if not first_name:
            first_name = input("First name: ").strip()
        if not last_name:
            last_name = input("Last name: ").strip()
        if username is None:
            username = (
                input("Username (optional, press Enter to skip): ").strip() or None
            )

        # Get password securely
        if not password:
            while True:
                password = getpass.getpass("Password: ")
                confirm_password = getpass.getpass("Confirm password: ")

                if password != confirm_password:
                    print("Passwords don't match. Please try again.")
                    continue

                if len(password) < 8:
                    print("Password must be at least 8 characters long.")
                    continue

                break
        else:
            # Validate password length for command line provided password
            if len(password) < 8:
                print("❌ Password must be at least 8 characters long.")
                return

        # Create user
        hashed_password = pwd_context.hash(password)

        admin_user = User(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            hashed_password=hashed_password,
            role="super_admin",
            is_active=True,
            is_verified=True,
            permissions=["*"],  # All permissions
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("\n✅ Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Name: {admin_user.first_name} {admin_user.last_name}")
        print(f"   Role: {admin_user.role}")
        print(f"   User ID: {admin_user.id}")

    except Exception as e:
        print(f"\n❌ Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create an admin user for the 6FB Platform"
    )
    parser.add_argument("--email", help="Admin email address")
    parser.add_argument("--first-name", help="First name")
    parser.add_argument("--last-name", help="Last name")
    parser.add_argument("--username", help="Username (optional)")
    parser.add_argument("--password", help="Password (will prompt if not provided)")

    args = parser.parse_args()

    create_admin_user(
        email=args.email,
        first_name=args.first_name,
        last_name=args.last_name,
        username=args.username,
        password=args.password,
    )
