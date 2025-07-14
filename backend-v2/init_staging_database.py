#!/usr/bin/env python3
"""
Initialize staging database with schema and sample data
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment file for staging
os.environ['ENV_FILE'] = '.env.staging'

# Now import our modules
from database import engine, Base, SessionLocal
from models import User, Client, Service, Appointment, Payment, Organization, UnifiedUserRole, UserOrganization
from models.consent import UserConsent, CookieConsent
from utils.auth import get_password_hash
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """Create all database tables"""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

def create_sample_data():
    """Create sample data for staging environment"""
    logger.info("Creating sample data for staging...")
    
    db = SessionLocal()
    try:
        # Create admin user
        admin_user = User(
            email="admin@staging.bookedbarber.com",
            name="Admin User",
            phone="+1234567890",
            hashed_password=get_password_hash("staging123!"),
            is_active=True,
            email_verified=True,
            unified_role=UnifiedUserRole.SUPER_ADMIN.value,
            user_type="admin",
            created_at=datetime.utcnow()
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        logger.info(f"Created admin user: {admin_user.email}")
        
        # Create business owner user
        owner_user = User(
            email="owner@staging.bookedbarber.com",
            name="Business Owner",
            phone="+1234567891",
            hashed_password=get_password_hash("staging123!"),
            is_active=True,
            email_verified=True,
            unified_role=UnifiedUserRole.SHOP_OWNER.value,
            user_type="business_owner",
            created_at=datetime.utcnow()
        )
        db.add(owner_user)
        db.commit()
        db.refresh(owner_user)
        logger.info(f"Created business owner: {owner_user.email}")
        
        # Create barber users
        barber_users = []
        for i in range(1, 4):
            barber_user = User(
                email=f"barber{i}@staging.bookedbarber.com",
                name=f"Barber User {i}",
                phone=f"+123456789{i}",
                hashed_password=get_password_hash("staging123!"),
                is_active=True,
                email_verified=True,
                unified_role=UnifiedUserRole.BARBER.value,
                user_type="barber",
                commission_rate=0.70,
                created_at=datetime.utcnow()
            )
            db.add(barber_user)
            barber_users.append(barber_user)
        
        db.commit()
        logger.info(f"Created {len(barber_users)} barber users")
        
        # Create client users
        client_users = []
        for i in range(1, 6):
            client_user = User(
                email=f"client{i}@staging.bookedbarber.com",
                name=f"Client User {i}",
                phone=f"+123456780{i}",
                hashed_password=get_password_hash("staging123!"),
                is_active=True,
                email_verified=True,
                unified_role=UnifiedUserRole.CLIENT.value,
                user_type="client",
                created_at=datetime.utcnow()
            )
            db.add(client_user)
            client_users.append(client_user)
        
        db.commit()
        logger.info(f"Created {len(client_users)} client users")
        
        # Create organization (barbershop)
        organization = Organization(
            name="Staging Barber Shop",
            slug="staging-barber-shop",
            description="A staging barbershop for testing purposes",
            street_address="123 Main St",
            city="Staging City",
            state="ST",
            zip_code="12345",
            phone="+1234567890",
            email="staging@bookedbarber.com",
            timezone="America/New_York",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(organization)
        db.commit()
        db.refresh(organization)
        logger.info(f"Created organization: {organization.name}")
        
        # Update users to associate with organization
        for user in barber_users + [owner_user]:
            user.location_id = organization.id
        
        # Create user-organization relationships
        owner_org = UserOrganization(
            user_id=owner_user.id,
            organization_id=organization.id,
            role="owner",
            is_primary=True,
            created_at=datetime.utcnow()
        )
        db.add(owner_org)
        
        for barber_user in barber_users:
            barber_org = UserOrganization(
                user_id=barber_user.id,
                organization_id=organization.id,
                role="barber",
                is_primary=True,
                created_at=datetime.utcnow()
            )
            db.add(barber_org)
        
        db.commit()
        logger.info("Associated users with organization")
        
        # Create services
        services = [
            Service(
                name="Haircut",
                description="Professional haircut service",
                duration=30,
                price=25.00,
                is_active=True,
                created_at=datetime.utcnow()
            ),
            Service(
                name="Beard Trim",
                description="Beard trimming and styling",
                duration=20,
                price=15.00,
                is_active=True,
                created_at=datetime.utcnow()
            ),
            Service(
                name="Haircut + Beard",
                description="Complete haircut and beard service",
                duration=45,
                price=35.00,
                is_active=True,
                created_at=datetime.utcnow()
            ),
            Service(
                name="Styling",
                description="Hair styling and finishing",
                duration=25,
                price=20.00,
                is_active=True,
                created_at=datetime.utcnow()
            )
        ]
        
        for service in services:
            db.add(service)
        
        db.commit()
        logger.info(f"Created {len(services)} services")
        
        # Create sample appointments
        base_date = datetime.utcnow() + timedelta(days=1)  # Tomorrow
        for i in range(5):
            appointment_date = base_date + timedelta(days=i)
            appointment = Appointment(
                client_id=client_users[i % len(client_users)].id,
                barber_id=barber_users[i % len(barber_users)].id,
                service_id=services[i % len(services)].id,
                appointment_date=appointment_date.date(),
                appointment_time=f"{10 + i}:00",
                duration=services[i % len(services)].duration,
                price=services[i % len(services)].price,
                status="confirmed",
                notes=f"Sample appointment {i+1}",
                created_at=datetime.utcnow()
            )
            db.add(appointment)
        
        db.commit()
        logger.info("Created sample appointments")
        
        # Create sample payments
        for i in range(3):
            payment = Payment(
                appointment_id=i + 1,  # Assuming appointment IDs start from 1
                amount=services[i % len(services)].price,
                stripe_payment_intent_id=f"pi_staging_{i+1}",
                status="completed",
                payment_method="card",
                created_at=datetime.utcnow()
            )
            db.add(payment)
        
        db.commit()
        logger.info("Created sample payments")
        
        logger.info("Sample data creation completed successfully!")
        
    except Exception as e:
        logger.error(f"Error creating sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function to initialize staging database"""
    try:
        logger.info("Starting staging database initialization...")
        
        # Check if staging database already exists
        if os.path.exists("staging_6fb_booking.db"):
            response = input("Staging database already exists. Do you want to recreate it? (y/n): ")
            if response.lower() != 'y':
                logger.info("Staging database initialization cancelled")
                return
            else:
                os.remove("staging_6fb_booking.db")
                logger.info("Removed existing staging database")
        
        # Create tables
        create_tables()
        
        # Create sample data
        create_sample_data()
        
        logger.info("Staging database initialization completed successfully!")
        logger.info("\nStaging Test Accounts:")
        logger.info("======================")
        logger.info("Admin: admin@staging.bookedbarber.com / staging123!")
        logger.info("Owner: owner@staging.bookedbarber.com / staging123!")
        logger.info("Barber1: barber1@staging.bookedbarber.com / staging123!")
        logger.info("Barber2: barber2@staging.bookedbarber.com / staging123!")
        logger.info("Barber3: barber3@staging.bookedbarber.com / staging123!")
        logger.info("Client1: client1@staging.bookedbarber.com / staging123!")
        logger.info("Client2: client2@staging.bookedbarber.com / staging123!")
        logger.info("Client3: client3@staging.bookedbarber.com / staging123!")
        logger.info("Client4: client4@staging.bookedbarber.com / staging123!")
        logger.info("Client5: client5@staging.bookedbarber.com / staging123!")
        
    except Exception as e:
        logger.error(f"Failed to initialize staging database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()