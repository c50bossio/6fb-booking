#!/usr/bin/env python3
"""
Create Test User for Calendar Testing
Creates the test_claude@example.com user if it doesn't exist
"""

import asyncio
import sys
from pathlib import Path
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import datetime, timedelta
import bcrypt

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from models import User, Appointment
from location_models import BarbershopLocation
from config import settings

# Database setup
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_test_user():
    """Create test user for calendar testing"""
    print("🔐 Creating test user for calendar testing...")
    
    session = SessionLocal()
    try:
        # Check if test user already exists
        existing_user = session.query(User).filter(User.email == "test_claude@example.com").first()
        
        if existing_user:
            print("✅ Test user already exists")
            print(f"   Email: {existing_user.email}")
            print(f"   Role: {existing_user.role}")
            print(f"   Active: {existing_user.is_active}")
            return existing_user
        
        # Create test user
        test_user = User(
            email="test_claude@example.com",
            hashed_password=hash_password("testpassword123"),
            name="Claude Test",
            role="barber",  # Barber role for full calendar access
            is_active=True,
            phone="+1234567890",
            created_at=datetime.utcnow()
        )
        
        session.add(test_user)
        session.commit()
        session.refresh(test_user)
        
        print("✅ Test user created successfully")
        print(f"   Email: {test_user.email}")
        print(f"   Role: {test_user.role}")
        print(f"   ID: {test_user.id}")
        
        return test_user
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        session.rollback()
        return None
    finally:
        session.close()

def create_test_appointments(user_id: int):
    """Create some test appointments for testing"""
    print("📅 Creating test appointments...")
    
    session = SessionLocal()
    try:
        # Check if appointments already exist
        existing_appointments = session.query(Appointment).filter(
            Appointment.barber_id == user_id
        ).count()
        
        if existing_appointments > 0:
            print(f"✅ Test appointments already exist ({existing_appointments} found)")
            return
        
        # Create test appointments for the next few days
        base_date = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        
        test_appointments = [
            {
                "service_name": "Haircut",
                "start_time": base_date + timedelta(hours=1),
                "duration_minutes": 30,
                "price": 50.00,
                "status": "confirmed"
            },
            {
                "service_name": "Haircut + Beard",
                "start_time": base_date + timedelta(hours=3),
                "duration_minutes": 60,
                "price": 75.00,
                "status": "confirmed"
            },
            {
                "service_name": "Beard Trim",
                "start_time": base_date + timedelta(days=1, hours=2),
                "duration_minutes": 30,
                "price": 35.00,
                "status": "pending"
            },
            {
                "service_name": "Styling",
                "start_time": base_date + timedelta(days=2, hours=1),
                "duration_minutes": 60,
                "price": 60.00,
                "status": "confirmed"
            }
        ]
        
        created_count = 0
        for apt_data in test_appointments:
            appointment = Appointment(
                user_id=user_id,  # Client user
                barber_id=user_id,  # Same user as barber for test
                service_name=apt_data["service_name"],
                start_time=apt_data["start_time"],
                duration_minutes=apt_data["duration_minutes"],
                price=apt_data["price"],
                status=apt_data["status"],
                created_at=datetime.utcnow()
            )
            
            session.add(appointment)
            created_count += 1
        
        session.commit()
        print(f"✅ Created {created_count} test appointments")
        
    except Exception as e:
        print(f"❌ Error creating test appointments: {e}")
        session.rollback()
    finally:
        session.close()

def create_test_location():
    """Create a test location"""
    print("🏢 Creating test location...")
    
    session = SessionLocal()
    try:
        # Check if location already exists
        existing_location = session.query(BarbershopLocation).filter(
            BarbershopLocation.name == "Test Barbershop"
        ).first()
        
        if existing_location:
            print("✅ Test location already exists")
            return existing_location
        
        # Create test location
        test_location = BarbershopLocation(
            name="Test Barbershop",
            address="123 Test Street",
            city="Test City",
            state="TS",
            zip_code="12345",
            phone="+1234567890",
            email="test@testbarbershop.com",
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        session.add(test_location)
        session.commit()
        session.refresh(test_location)
        
        print(f"✅ Test location created: {test_location.name}")
        return test_location
        
    except Exception as e:
        print(f"❌ Error creating test location: {e}")
        session.rollback()
        return None
    finally:
        session.close()

def main():
    """Main function to set up test data"""
    print("🧪 Setting up test data for calendar testing")
    print("=" * 50)
    
    try:
        # Create test user
        test_user = create_test_user()
        if not test_user:
            print("❌ Failed to create test user")
            return
        
        # Create test location
        test_location = create_test_location()
        
        # Create test appointments
        create_test_appointments(test_user.id)
        
        print("\n🎉 Test data setup complete!")
        print("=" * 50)
        print("Test credentials:")
        print(f"   Email: test_claude@example.com")
        print(f"   Password: testpassword123")
        print(f"   Role: barber")
        print("\nYou can now test the calendar at:")
        print(f"   {test_user.email} / testpassword123")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")

if __name__ == "__main__":
    main()