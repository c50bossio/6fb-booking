#!/usr/bin/env python3
"""
Create admin user for production deployment
"""
import os
import sys
from pathlib import Path
from getpass import getpass

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models.user import User
from models.base import Base
from utils.security import get_password_hash


def create_admin_user():
    """Create an admin user for the platform"""
    print("=== 6FB Platform Admin User Creation ===\n")

    # Get user input
    print("Enter admin user details:")
    email = input("Email: ").strip()
    name = input("Full Name: ").strip()
    password = getpass("Password: ")
    confirm_password = getpass("Confirm Password: ")

    # Validate passwords match
    if password != confirm_password:
        print("\n❌ Passwords do not match!")
        return False

    # Validate password strength
    if len(password) < 8:
        print("\n❌ Password must be at least 8 characters long!")
        return False

    # Create database tables if they don't exist
    print("\n📊 Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)

    # Create admin user
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"\n❌ User with email {email} already exists!")
            return False

        # Create new admin user
        admin_user = User(
            email=email,
            name=name,
            hashed_password=get_password_hash(password),
            role="super_admin",
            is_active=True,
            is_verified=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(f"\n✅ Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Name: {admin_user.name}")
        print(f"   Role: {admin_user.role}")
        print(f"   ID: {admin_user.id}")

        return True

    except Exception as e:
        print(f"\n❌ Error creating admin user: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


def main():
    """Main function"""
    print("\nThis script will create an admin user for the 6FB Platform.")
    print("Make sure you're connected to the production database!\n")

    confirm = input("Continue? (y/n): ")
    if confirm.lower() != "y":
        print("Cancelled.")
        return

    success = create_admin_user()

    if success:
        print("\n🎉 Setup complete! You can now login to the admin portal.")
        print("\n📝 Next steps:")
        print("1. Login at https://6fbmentorship.com/login")
        print("2. Configure platform settings")
        print("3. Add locations and barbers")
        print("4. Set up Trafft integration")
    else:
        print("\n❌ Setup failed. Please check the errors above.")


if __name__ == "__main__":
    main()
