#!/usr/bin/env python3
"""
Setup customer authentication system
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from config.database import SessionLocal, engine
from models.customer import Customer
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_customer_table():
    """Create the customers table if it doesn't exist"""
    print("Creating customers table...")

    with engine.connect() as conn:
        conn.execute(
            text(
                """
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) NOT NULL UNIQUE,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            hashed_password VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE,
            last_login DATETIME,
            newsletter_subscription BOOLEAN DEFAULT FALSE,
            preferred_barber_id INTEGER,
            preferred_location_id INTEGER,
            avatar_url VARCHAR(500),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(preferred_barber_id) REFERENCES barbers(id),
            FOREIGN KEY(preferred_location_id) REFERENCES locations(id)
        )
        """
            )
        )
        conn.commit()

    print("Customers table created successfully")


def create_test_customer():
    """Create a test customer account"""
    print("Creating test customer...")

    db = SessionLocal()
    try:
        # Check if test customer already exists
        existing_customer = (
            db.query(Customer).filter(Customer.email == "test@customer.com").first()
        )
        if existing_customer:
            print("Test customer already exists")
            return existing_customer

        # Create new test customer
        hashed_password = pwd_context.hash("password123")

        customer = Customer(
            email="test@customer.com",
            first_name="Test",
            last_name="Customer",
            phone="555-123-4567",
            hashed_password=hashed_password,
            is_active=True,
            is_verified=True,
            newsletter_subscription=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(customer)
        db.commit()
        db.refresh(customer)

        print(f"Test customer created with ID: {customer.id}")
        return customer

    except Exception as e:
        print(f"Error creating test customer: {e}")
        db.rollback()
        return None
    finally:
        db.close()


def main():
    print("Setting up customer authentication system...")

    # Create customers table
    create_customer_table()

    # Create test customer
    test_customer = create_test_customer()

    if test_customer:
        print("\n✅ Customer authentication setup complete!")
        print("\nTest login credentials:")
        print("Email: test@customer.com")
        print("Password: password123")
        print(f"\nCustomer ID: {test_customer.id}")
        print("Access the customer portal at: http://localhost:3001/customer/login")
    else:
        print("\n❌ Failed to set up customer authentication")


if __name__ == "__main__":
    main()
