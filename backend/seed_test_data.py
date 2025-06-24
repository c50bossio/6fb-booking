#!/usr/bin/env python
"""Seed test data for 6FB Booking Platform"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models.user import User
from models.location import Location
from models.barber import Barber
from models.client import Client
from models.appointment import Appointment
from models.booking import Service, ServiceCategory
from passlib.context import CryptContext
import random

# Initialize password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_data():
    db = SessionLocal()
    
    try:
        # Clear existing data in reverse order of dependencies
        print("Clearing existing data...")
        db.query(Appointment).delete()
        db.query(Client).delete()
        db.query(Barber).delete()
        db.query(Service).delete()
        db.query(ServiceCategory).delete()
        db.query(User).delete()
        db.query(Location).delete()
        db.commit()
        print("✅ Existing data cleared")
        # Create test categories
        categories = [
            ServiceCategory(name="Haircuts", slug="haircuts", description="All types of haircuts"),
            ServiceCategory(name="Beard Services", slug="beard-services", description="Beard trimming and styling"),
            ServiceCategory(name="Hair Treatments", slug="hair-treatments", description="Special hair treatments"),
        ]
        for cat in categories:
            db.add(cat)
        db.commit()
        
        # Create test services
        services_data = [
            {"name": "Classic Haircut", "category_id": 1, "base_price": 35.00, "duration_minutes": 30, "description": "Traditional haircut with scissors"},
            {"name": "Fade Cut", "category_id": 1, "base_price": 40.00, "duration_minutes": 45, "description": "Modern fade haircut"},
            {"name": "Buzz Cut", "category_id": 1, "base_price": 25.00, "duration_minutes": 20, "description": "Simple buzz cut"},
            {"name": "Beard Trim", "category_id": 2, "base_price": 20.00, "duration_minutes": 20, "description": "Beard trimming and shaping"},
            {"name": "Beard & Mustache", "category_id": 2, "base_price": 30.00, "duration_minutes": 30, "description": "Full beard and mustache styling"},
            {"name": "Hot Towel Shave", "category_id": 2, "base_price": 45.00, "duration_minutes": 45, "description": "Traditional hot towel shave"},
            {"name": "Hair Color", "category_id": 3, "base_price": 60.00, "duration_minutes": 60, "description": "Professional hair coloring"},
            {"name": "Deep Conditioning", "category_id": 3, "base_price": 25.00, "duration_minutes": 30, "description": "Deep conditioning treatment"},
        ]
        
        for service_data in services_data:
            service = Service(**service_data, is_active=True)
            db.add(service)
        db.commit()
        
        # Create test location
        location = Location(
            name="Downtown Barbershop",
            business_name="6FB Downtown",
            location_code="DT001",
            address="123 Main Street",
            city="New York",
            state="NY",
            zip_code="10001",
            country="USA",
            phone="555-0100",
            email="downtown@6fbbooking.com",
            timezone="America/New_York",
            is_active=True
        )
        db.add(location)
        db.commit()
        
        # Create test users
        # Admin user
        admin = User(
            email="admin@6fbbooking.com",
            first_name="Admin",
            last_name="User",
            hashed_password=pwd_context.hash("admin123"),
            role="admin",
            is_active=True,
            is_verified=True,
            primary_location_id=location.id
        )
        db.add(admin)
        
        # Barber users
        barber_users = []
        barber_data = [
            {"first_name": "John", "last_name": "Smith", "email": "john.smith@6fbbooking.com"},
            {"first_name": "Mike", "last_name": "Johnson", "email": "mike.johnson@6fbbooking.com"},
            {"first_name": "Sarah", "last_name": "Williams", "email": "sarah.williams@6fbbooking.com"},
            {"first_name": "David", "last_name": "Brown", "email": "david.brown@6fbbooking.com"},
        ]
        
        for data in barber_data:
            user = User(
                email=data["email"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                hashed_password=pwd_context.hash("barber123"),
                role="barber",
                is_active=True,
                is_verified=True,
                primary_location_id=location.id
            )
            db.add(user)
            barber_users.append(user)
        
        db.commit()
        
        # Create barbers
        barbers = []
        for i, user in enumerate(barber_users):
            barber = Barber(
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                phone=f"555-010{i+1}",
                is_active=True,
                is_verified=True,
                location_id=location.id,
                user_id=user.id,
                hourly_rate=50.0,
                monthly_revenue_goal=10000.0,
                weekly_appointment_goal=40,
                average_ticket_goal=50.0
            )
            db.add(barber)
            barbers.append(barber)
        
        db.commit()
        
        # Create test clients
        clients = []
        client_names = [
            ("Robert", "Taylor"), ("Jennifer", "Davis"), ("Michael", "Wilson"),
            ("Linda", "Martinez"), ("William", "Anderson"), ("Patricia", "Thomas"),
            ("James", "Jackson"), ("Mary", "White"), ("David", "Harris"),
            ("Elizabeth", "Martin"), ("Richard", "Thompson"), ("Barbara", "Garcia"),
        ]
        
        for i, (first_name, last_name) in enumerate(client_names):
            # Assign client to a random barber
            barber = barbers[i % len(barbers)]
            client = Client(
                first_name=first_name,
                last_name=last_name,
                email=f"{first_name.lower()}.{last_name.lower()}@example.com",
                phone=f"555-02{i:02d}",
                barber_id=barber.id
            )
            db.add(client)
            clients.append(client)
        
        db.commit()
        
        # Create test appointments for the next 7 days
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        appointment_times = [
            "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
            "12:00", "14:00", "14:30", "15:00", "15:30", "16:00",
            "16:30", "17:00", "17:30", "18:00"
        ]
        
        for day_offset in range(7):
            appointment_date = today + timedelta(days=day_offset)
            
            # Skip Sunday (day 6)
            if appointment_date.weekday() == 6:
                continue
            
            # Create 8-12 appointments per day
            num_appointments = random.randint(8, 12)
            used_times = random.sample(appointment_times, num_appointments)
            
            for time_str in used_times:
                # Random barber and client
                barber = random.choice(barbers)
                client = random.choice(clients)
                
                # Random service
                from sqlalchemy.sql import func
                service = db.query(Service).filter(Service.is_active == True).order_by(func.random()).first()
                
                # Parse time and create datetime
                hour, minute = map(int, time_str.split(':'))
                appointment_datetime = appointment_date.replace(hour=hour, minute=minute)
                
                # Create appointment
                appointment = Appointment(
                    client_id=client.id,
                    barber_id=barber.id,
                    appointment_date=appointment_date.date(),
                    appointment_time=appointment_datetime,
                    duration_minutes=service.duration_minutes,
                    status="confirmed" if day_offset > 0 else "completed",
                    is_completed=day_offset <= 0,
                    service_name=service.name,
                    service_revenue=service.base_price,
                    tip_amount=random.uniform(5, 20) if day_offset <= 0 else 0,
                    customer_type="returning" if random.random() > 0.3 else "new",
                    payment_status="pending" if day_offset > 0 else "paid",
                    payment_method="cash" if random.random() > 0.5 else "card",
                    barber_notes=f"Regular appointment for {service.name}"
                )
                db.add(appointment)
        
        db.commit()
        
        print("✅ Test data seeded successfully!")
        print(f"   - 1 Location created")
        print(f"   - 1 Admin user (admin@6fbbooking.com / admin123)")
        print(f"   - {len(barbers)} Barbers created")
        print(f"   - {len(clients)} Clients created")
        print(f"   - {len(services_data)} Services created")
        print(f"   - Multiple appointments created for the next 7 days")
        
    except Exception as e:
        print(f"❌ Error seeding data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()