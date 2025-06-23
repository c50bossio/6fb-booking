#!/usr/bin/env python3
"""
Create Admin User Script for 6FB Booking Platform
Usage: python scripts/create_admin_user.py
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from models.user import User
from config.database import SessionLocal, engine
import getpass
from datetime import datetime
import re

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def validate_email(email):
    """Validate email format"""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, "Password is valid"


def create_admin_user():
    """Interactive script to create an admin user"""
    print("\n=== 6FB Booking Platform - Create Admin User ===\n")

    # Get user input
    while True:
        email = input("Admin Email: ").strip()
        if not validate_email(email):
            print("❌ Invalid email format. Please try again.")
            continue
        break

    first_name = input("First Name: ").strip()
    last_name = input("Last Name: ").strip()

    while True:
        password = getpass.getpass(
            "Password (min 8 chars, mixed case, number, special char): "
        )
        is_valid, message = validate_password(password)
        if not is_valid:
            print(f"❌ {message}")
            continue

        password_confirm = getpass.getpass("Confirm Password: ")
        if password != password_confirm:
            print("❌ Passwords do not match. Please try again.")
            continue
        break

    # Role selection
    print("\nSelect admin role:")
    print("1. Super Admin (full system access)")
    print("2. Admin (standard admin access)")
    print("3. Manager (location management)")

    while True:
        role_choice = input("Enter choice (1-3): ").strip()
        if role_choice == "1":
            role = "super_admin"
            break
        elif role_choice == "2":
            role = "admin"
            break
        elif role_choice == "3":
            role = "manager"
            break
        else:
            print("❌ Invalid choice. Please enter 1, 2, or 3.")

    # Confirm details
    print(f"\n📋 Admin User Details:")
    print(f"   Email: {email}")
    print(f"   Name: {first_name} {last_name}")
    print(f"   Role: {role}")

    confirm = input("\nCreate this admin user? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("❌ Admin user creation cancelled.")
        return

    # Create user in database
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"\n❌ Error: User with email {email} already exists!")

            # Offer to update the existing user to admin
            update = (
                input("Would you like to update this user to admin role? (yes/no): ")
                .strip()
                .lower()
            )
            if update == "yes":
                existing_user.role = role
                existing_user.is_active = True
                existing_user.updated_at = datetime.utcnow()
                db.commit()
                print(f"\n✅ User {email} updated to {role} role successfully!")
            return

        # Hash password
        hashed_password = pwd_context.hash(password)

        # Create new admin user
        admin_user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=hashed_password,
            role=role,
            is_active=True,
            email_verified=True,
            created_at=datetime.utcnow(),
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(f"\n✅ Admin user created successfully!")
        print(f"   User ID: {admin_user.id}")
        print(f"   Email: {admin_user.email}")
        print(f"   Role: {admin_user.role}")

        # Generate login instructions
        print("\n📝 Login Instructions:")
        print(f"   1. Go to: https://your-frontend-url.com/login")
        print(f"   2. Email: {email}")
        print(f"   3. Password: [the password you just created]")
        print(f"\n🔐 Security Reminder:")
        print(f"   - Change this password after first login")
        print(f"   - Enable 2FA if available")
        print(f"   - Keep credentials secure")

    except Exception as e:
        print(f"\n❌ Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()


def list_admin_users():
    """List all existing admin users"""
    db = SessionLocal()
    try:
        admins = (
            db.query(User)
            .filter(User.role.in_(["super_admin", "admin", "manager"]))
            .all()
        )

        if not admins:
            print("\n📭 No admin users found.")
            return

        print(f"\n📋 Existing Admin Users ({len(admins)} total):")
        print("-" * 70)
        print(f"{'Email':<30} {'Name':<25} {'Role':<15}")
        print("-" * 70)

        for admin in admins:
            name = f"{admin.first_name} {admin.last_name}"
            print(f"{admin.email:<30} {name:<25} {admin.role:<15}")

    finally:
        db.close()


def main():
    """Main function with menu"""
    while True:
        print("\n=== Admin User Management ===")
        print("1. Create new admin user")
        print("2. List existing admin users")
        print("3. Exit")

        choice = input("\nEnter choice (1-3): ").strip()

        if choice == "1":
            create_admin_user()
        elif choice == "2":
            list_admin_users()
        elif choice == "3":
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")


if __name__ == "__main__":
    main()
