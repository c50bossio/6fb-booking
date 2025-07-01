#!/usr/bin/env python3
"""
Script to check and create test data for the 6FB booking system.
Checks for test-barber@6fb.com user and creates it if needed.
Also creates test services and clients.
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, Service, Client
from location_models import BarbershopLocation
from utils.auth import get_password_hash
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_create_test_barber(db: Session):
    """Check if test-barber@6fb.com exists and create if not."""
    test_email = "test-barber@6fb.com"
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == test_email).first()
    
    if existing_user:
        logger.info(f"✓ User {test_email} already exists")
        logger.info(f"  - ID: {existing_user.id}")
        logger.info(f"  - Name: {existing_user.name}")
        logger.info(f"  - Role: {existing_user.role}")
        logger.info(f"  - Active: {existing_user.is_active}")
        logger.info(f"  - Location ID: {existing_user.location_id}")
        return existing_user
    else:
        logger.info(f"× User {test_email} not found. Creating...")
        
        # Get or create a default location
        location = db.query(BarbershopLocation).first()
        if not location:
            location = BarbershopLocation(
                name="Default Location",
                code="DEFAULT",
                address="123 Main St",
                city="New York",
                state="NY",
                zip_code="10001",
                phone="+1234567890"
            )
            db.add(location)
            db.commit()
            logger.info("  - Created default location")
        
        # Create the test barber
        new_user = User(
            email=test_email,
            name="Test Barber",
            hashed_password=get_password_hash("testpass123"),
            role="barber",
            is_active=True,
            location_id=location.id,
            created_at=datetime.utcnow()
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"✓ Created user {test_email}")
        logger.info(f"  - ID: {new_user.id}")
        logger.info(f"  - Password: testpass123")
        logger.info(f"  - Location: {location.name}")
        
        return new_user

def create_test_services(db: Session, barber: User):
    """Create test services if they don't exist."""
    from models import ServiceCategoryEnum, barber_services
    
    services_data = [
        {"name": "Regular Haircut", "price": 30.00, "duration": 30, "category": ServiceCategoryEnum.HAIRCUT},
        {"name": "Fade Cut", "price": 35.00, "duration": 45, "category": ServiceCategoryEnum.HAIRCUT},
        {"name": "Beard Trim", "price": 20.00, "duration": 20, "category": ServiceCategoryEnum.BEARD},
        {"name": "Hair + Beard Combo", "price": 45.00, "duration": 60, "category": ServiceCategoryEnum.PACKAGE},
        {"name": "Kids Cut", "price": 25.00, "duration": 30, "category": ServiceCategoryEnum.HAIRCUT},
    ]
    
    created_count = 0
    for service_data in services_data:
        existing = db.query(Service).filter(
            Service.name == service_data["name"]
        ).first()
        
        if not existing:
            service = Service(
                name=service_data["name"],
                description=f"Professional {service_data['name'].lower()} service",
                category=service_data["category"],
                base_price=float(service_data["price"]),
                duration_minutes=service_data["duration"],
                is_active=True,
                is_bookable_online=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by_id=barber.id
            )
            db.add(service)
            db.flush()  # Get the service ID
            
            # Link service to barber
            db.execute(barber_services.insert().values(
                barber_id=barber.id,
                service_id=service.id,
                is_available=True
            ))
            
            created_count += 1
    
    if created_count > 0:
        db.commit()
        logger.info(f"✓ Created {created_count} test services")
    else:
        logger.info("✓ Test services already exist")
    
    # List all services for the barber
    services = barber.services_offered
    logger.info(f"  Total services for barber: {len(services)}")
    for service in services:
        logger.info(f"  - {service.name}: ${service.base_price} ({service.duration_minutes} min)")

def create_test_clients(db: Session):
    """Create test clients if they don't exist."""
    clients_data = [
        {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890"
        },
        {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "phone": "+1234567891"
        },
        {
            "first_name": "Mike",
            "last_name": "Johnson",
            "email": "mike.johnson@example.com",
            "phone": "+1234567892"
        },
        {
            "first_name": "Sarah",
            "last_name": "Williams",
            "email": "sarah.williams@example.com",
            "phone": "+1234567893"
        },
        {
            "first_name": "David",
            "last_name": "Brown",
            "email": "david.brown@example.com",
            "phone": "+1234567894"
        }
    ]
    
    created_count = 0
    for client_data in clients_data:
        existing = db.query(Client).filter(
            Client.email == client_data["email"]
        ).first()
        
        if not existing:
            client = Client(
                first_name=client_data["first_name"],
                last_name=client_data["last_name"],
                email=client_data["email"],
                phone=client_data["phone"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(client)
            created_count += 1
    
    if created_count > 0:
        db.commit()
        logger.info(f"✓ Created {created_count} test clients")
    else:
        logger.info("✓ Test clients already exist")
    
    # List all clients
    clients = db.query(Client).all()
    logger.info(f"  Total clients in system: {len(clients)}")
    for client in clients[:5]:  # Show first 5
        logger.info(f"  - {client.first_name} {client.last_name} ({client.email})")

def main():
    """Main function to check and create test data."""
    logger.info("=== Checking and Creating Test Data ===")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Check/create test barber
        test_barber = check_and_create_test_barber(db)
        
        # Create test services for the barber
        logger.info("\n=== Test Services ===")
        create_test_services(db, test_barber)
        
        # Create test clients
        logger.info("\n=== Test Clients ===")
        create_test_clients(db)
        
        logger.info("\n✓ Test data check completed successfully!")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()