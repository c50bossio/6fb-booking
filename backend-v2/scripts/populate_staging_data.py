#!/usr/bin/env python3
"""
Populate staging environment with realistic sample data for testing premium features.

This script creates:
- Sample barber profiles with realistic data
- Diverse appointment types across different services
- Calendar appointments showing premium features (drag-drop, colors, symbols)
- Past, present, and future appointments for comprehensive testing
"""

import os
import sys
import json
from datetime import datetime, timedelta, time
from typing import List, Dict, Any
import random

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from db import Base
from models import User, Appointment, Service
from config import settings
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class StagingDataPopulator:
    """Populates staging environment with realistic sample data."""
    
    def __init__(self):
        # Use staging database
        self.engine = create_engine("sqlite:///./staging_6fb_booking.db")
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Service types with colors and pricing
        self.services = [
            {"name": "Classic Haircut", "duration": 30, "price": 35.00, "color": "#4F46E5", "description": "Traditional men's haircut with styling"},
            {"name": "Beard Trim", "duration": 20, "price": 25.00, "color": "#DC2626", "description": "Professional beard trimming and shaping"},
            {"name": "Hair & Beard Combo", "duration": 45, "price": 55.00, "color": "#059669", "description": "Complete grooming experience"},
            {"name": "Premium Cut", "duration": 60, "price": 75.00, "color": "#D97706", "description": "Luxury haircut with wash and styling"},
            {"name": "Buzz Cut", "duration": 15, "price": 20.00, "color": "#7C3AED", "description": "Quick and clean military-style cut"},
            {"name": "Fade Cut", "duration": 40, "price": 45.00, "color": "#EC4899", "description": "Modern fade with precision styling"},
            {"name": "Shampoo & Style", "duration": 25, "price": 30.00, "color": "#10B981", "description": "Hair wash and professional styling"},
            {"name": "Hot Towel Shave", "duration": 35, "price": 40.00, "color": "#F59E0B", "description": "Traditional straight razor shave"}
        ]
        
        # Sample barber profiles
        self.barbers = [
            {
                "name": "Marcus Johnson", 
                "email": "marcus@bookedbarber.com",
                "phone": "+1-555-0123",
                "specialties": ["Classic Cuts", "Beard Styling"],
                "bio": "10+ years experience. Specializes in classic cuts and modern fades.",
                "symbol": "🔥",
                "working_hours": {"start": "09:00", "end": "18:00"},
                "instagram": "@marcuscuts"
            },
            {
                "name": "Diego Rivera", 
                "email": "diego@bookedbarber.com",
                "phone": "+1-555-0124", 
                "specialties": ["Fades", "Hot Towel Shaves"],
                "bio": "Award-winning barber known for precision fades and traditional shaves.",
                "symbol": "✂️",
                "working_hours": {"start": "10:00", "end": "19:00"},
                "instagram": "@diegothebarber"
            },
            {
                "name": "Aisha Thompson", 
                "email": "aisha@bookedbarber.com",
                "phone": "+1-555-0125",
                "specialties": ["Premium Styling", "Hair & Beard Combos"], 
                "bio": "Celebrity stylist bringing high-end techniques to everyday clients.",
                "symbol": "💎",
                "working_hours": {"start": "11:00", "end": "20:00"},
                "instagram": "@aishastylist"
            }
        ]
        
        # Sample clients for appointments
        self.clients = [
            {"name": "John Smith", "email": "john.smith@email.com", "phone": "+1-555-1001"},
            {"name": "Michael Brown", "email": "mike.brown@email.com", "phone": "+1-555-1002"},
            {"name": "David Wilson", "email": "david.wilson@email.com", "phone": "+1-555-1003"},
            {"name": "Chris Davis", "email": "chris.davis@email.com", "phone": "+1-555-1004"},
            {"name": "James Miller", "email": "james.miller@email.com", "phone": "+1-555-1005"},
            {"name": "Robert Garcia", "email": "robert.garcia@email.com", "phone": "+1-555-1006"},
            {"name": "William Martinez", "email": "will.martinez@email.com", "phone": "+1-555-1007"},
            {"name": "Thomas Anderson", "email": "tom.anderson@email.com", "phone": "+1-555-1008"},
            {"name": "Daniel Rodriguez", "email": "dan.rodriguez@email.com", "phone": "+1-555-1009"},
            {"name": "Anthony Lee", "email": "anthony.lee@email.com", "phone": "+1-555-1010"}
        ]

    def populate_all_data(self):
        """Populate all sample data."""
        print("🚀 Starting staging data population...\n")
        
        with self.SessionLocal() as db:
            # Clear existing data
            self._clear_existing_data(db)
            
            # Create services
            service_objects = self._create_services(db)
            
            # Create barbers
            barber_objects = self._create_barbers(db)
            
            # Create clients  
            client_objects = self._create_clients(db)
            
            # Create appointments
            self._create_appointments(db, barber_objects, client_objects, service_objects)
            
            print("✅ Staging data population completed successfully!")
            self._print_summary(db)

    def _clear_existing_data(self, db):
        """Clear existing staging data."""
        print("🧹 Clearing existing staging data...")
        
        # Clear in correct order due to foreign key constraints
        db.execute(text("DELETE FROM appointments"))
        db.execute(text("DELETE FROM services"))
        db.execute(text("DELETE FROM users WHERE role != 'admin'"))  # Keep admin if exists
        
        db.commit()
        print("   ✅ Existing data cleared")

    def _create_services(self, db) -> List[Service]:
        """Create service types."""
        print("🛠️ Creating service types...")
        
        service_objects = []
        for service_data in self.services:
            service = Service(
                name=service_data["name"],
                duration_minutes=service_data["duration"],
                price=service_data["price"],
                color=service_data["color"],
                description=service_data["description"],
                category="haircut",
                is_active=True
            )
            db.add(service)
            service_objects.append(service)
        
        db.commit()
        db.refresh_all()
        print(f"   ✅ Created {len(service_objects)} service types")
        return service_objects

    def _create_barbers(self, db) -> List[User]:
        """Create barber profiles."""
        print("👨‍💼 Creating barber profiles...")
        
        barber_objects = []
        for i, barber_data in enumerate(self.barbers):
            barber = User(
                email=barber_data["email"],
                hashed_password=pwd_context.hash("password123"),  # Simple password for testing
                name=barber_data["name"],
                phone=barber_data["phone"],
                role="barber",
                is_active=True,
                is_verified=True,
                profile_data=json.dumps({
                    "specialties": barber_data["specialties"],
                    "bio": barber_data["bio"], 
                    "symbol": barber_data["symbol"],
                    "working_hours": barber_data["working_hours"],
                    "social": {"instagram": barber_data["instagram"]},
                    "avatar_url": f"/api/v1/avatars/barber_{i+1}.jpg",
                    "rating": round(random.uniform(4.2, 5.0), 1),
                    "total_cuts": random.randint(150, 800)
                }),
                timezone="America/New_York"
            )
            db.add(barber)
            barber_objects.append(barber)
        
        db.commit()
        for barber in barber_objects:
            db.refresh(barber)
        
        print(f"   ✅ Created {len(barber_objects)} barber profiles")
        return barber_objects

    def _create_clients(self, db) -> List[User]:
        """Create client profiles."""
        print("👥 Creating client profiles...")
        
        client_objects = []
        for client_data in self.clients:
            client = User(
                email=client_data["email"],
                hashed_password=pwd_context.hash("client123"),  # Simple password for testing
                name=client_data["name"],
                phone=client_data["phone"],
                role="client",
                is_active=True,
                is_verified=True,
                timezone="America/New_York"
            )
            db.add(client)
            client_objects.append(client)
        
        db.commit()
        for client in client_objects:
            db.refresh(client)
            
        print(f"   ✅ Created {len(client_objects)} client profiles")
        return client_objects

    def _create_appointments(self, db, barbers: List[User], clients: List[User], services: List[Service]):
        """Create diverse appointments across time periods."""
        print("📅 Creating appointment data...")
        
        appointments = []
        now = datetime.now()
        
        # Create appointments across different time periods
        appointment_scenarios = [
            # Past appointments (last 2 weeks)
            {"period": "past", "days_offset": [-14, -1], "count": 8, "statuses": ["completed"]},
            
            # Current week appointments  
            {"period": "current", "days_offset": [-2, 0], "count": 6, "statuses": ["confirmed", "in_progress"]},
            
            # Today's appointments
            {"period": "today", "days_offset": [0, 0], "count": 4, "statuses": ["confirmed", "pending"]},
            
            # Tomorrow's appointments
            {"period": "tomorrow", "days_offset": [1, 1], "count": 5, "statuses": ["confirmed", "pending"]},
            
            # Future appointments (next 2 weeks)
            {"period": "future", "days_offset": [2, 14], "count": 12, "statuses": ["confirmed", "pending"]},
            
            # Far future (next month)
            {"period": "far_future", "days_offset": [15, 30], "count": 8, "statuses": ["confirmed"]}
        ]
        
        appointment_id = 1
        for scenario in appointment_scenarios:
            period_appointments = self._create_period_appointments(
                scenario, barbers, clients, services, now, appointment_id
            )
            appointments.extend(period_appointments)
            appointment_id += len(period_appointments)
        
        # Add appointments to database
        for appointment in appointments:
            db.add(appointment)
        
        db.commit()
        print(f"   ✅ Created {len(appointments)} appointments across different time periods")
        
        # Print appointment distribution
        self._print_appointment_distribution(appointments)

    def _create_period_appointments(self, scenario: Dict, barbers: List[User], clients: List[User], 
                                   services: List[Service], base_date: datetime, start_id: int) -> List[Appointment]:
        """Create appointments for a specific time period."""
        appointments = []
        
        for i in range(scenario["count"]):
            # Random day within the period
            days_offset = random.randint(scenario["days_offset"][0], scenario["days_offset"][1])
            appointment_date = base_date + timedelta(days=days_offset)
            
            # Random time during business hours (9 AM - 7 PM)
            hour = random.randint(9, 18)
            minute = random.choice([0, 15, 30, 45])
            appointment_time = appointment_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # Random selections
            barber = random.choice(barbers)
            client = random.choice(clients)
            service = random.choice(services)
            status = random.choice(scenario["statuses"])
            
            appointment = Appointment(
                user_id=barber.id,
                client_id=client.id,
                service_id=service.id,
                start_time=appointment_time,
                duration_minutes=service.duration_minutes,
                status=status,
                price=service.price,
                notes=self._generate_appointment_notes(service.name, scenario["period"]),
                created_at=appointment_time - timedelta(days=random.randint(1, 7))  # Created 1-7 days before
            )
            appointments.append(appointment)
        
        return appointments

    def _generate_appointment_notes(self, service_name: str, period: str) -> str:
        """Generate realistic appointment notes."""
        notes_templates = {
            "past": [
                "Great session! Client very happy with the result.",
                "Regular client, knows exactly what he wants.",
                "First time client - went well, will likely return.",
                "Recommended some styling products."
            ],
            "current": [
                "Regular monthly appointment.",
                "Client requested subtle changes from last time.",
                "Touch-up appointment for special event."
            ],
            "today": [
                "Walk-in appointment - good timing.",
                "Regular client, same style as usual.",
                "Client has important meeting tomorrow."
            ],
            "tomorrow": [
                "Weekend appointment - client prefers Saturdays.",
                "Booked in advance for special occasion.",
                "First appointment with this client."
            ],
            "future": [
                "Monthly maintenance appointment.",
                "Client planning for vacation.",
                "Regular standing appointment."
            ],
            "far_future": [
                "Advanced booking for special event.",
                "Client likes to plan ahead.",
                "Holiday appointment booking."
            ]
        }
        
        templates = notes_templates.get(period, ["Standard appointment."])
        base_note = random.choice(templates)
        
        # Add service-specific notes
        if "Beard" in service_name:
            base_note += " Focus on beard shape and length."
        elif "Premium" in service_name:
            base_note += " Include scalp treatment and styling."
        elif "Fade" in service_name:
            base_note += " Client prefers mid-fade with texture on top."
        elif "Shave" in service_name:
            base_note += " Hot towel treatment included."
            
        return base_note

    def _print_appointment_distribution(self, appointments: List[Appointment]):
        """Print distribution of appointments by status and time period."""
        print("\n📊 Appointment Distribution:")
        
        now = datetime.now()
        periods = {
            "Past (completed)": 0,
            "Current week": 0, 
            "Today": 0,
            "Tomorrow": 0,
            "Future (2 weeks)": 0,
            "Far future": 0
        }
        
        statuses = {"confirmed": 0, "pending": 0, "completed": 0, "in_progress": 0}
        
        for appointment in appointments:
            # Count by status
            statuses[appointment.status] = statuses.get(appointment.status, 0) + 1
            
            # Count by time period
            days_diff = (appointment.start_time - now).days
            if days_diff < -1:
                periods["Past (completed)"] += 1
            elif days_diff == -1 or days_diff == 0:
                if appointment.start_time.date() == now.date():
                    periods["Today"] += 1
                else:
                    periods["Current week"] += 1
            elif days_diff == 1:
                periods["Tomorrow"] += 1
            elif days_diff <= 14:
                periods["Future (2 weeks)"] += 1
            else:
                periods["Far future"] += 1
        
        print("   By Time Period:")
        for period, count in periods.items():
            print(f"     {period}: {count}")
            
        print("   By Status:")
        for status, count in statuses.items():
            print(f"     {status.title()}: {count}")

    def _print_summary(self, db):
        """Print summary of created data."""
        print("\n📋 Staging Environment Summary:")
        
        # Count records
        barber_count = db.query(User).filter(User.role == "barber").count()
        client_count = db.query(User).filter(User.role == "client").count()
        service_count = db.query(Service).count()
        appointment_count = db.query(Appointment).count()
        
        print(f"   👨‍💼 Barbers: {barber_count}")
        print(f"   👥 Clients: {client_count}")
        print(f"   🛠️ Services: {service_count}")
        print(f"   📅 Appointments: {appointment_count}")
        
        print(f"\n🌐 Staging Environment Access:")
        print(f"   Frontend: http://localhost:3002")
        print(f"   Backend: http://localhost:8001") 
        print(f"   API Docs: http://localhost:8001/docs")
        
        print(f"\n🔐 Test Credentials:")
        print(f"   Barber Login: marcus@bookedbarber.com / password123")
        print(f"   Client Login: john.smith@email.com / client123")
        
        print(f"\n✨ Premium Features Ready for Testing:")
        print(f"   🎨 Service color coding across {service_count} service types")
        print(f"   👤 Barber symbols and identification")
        print(f"   🖱️ Drag-and-drop appointment rescheduling")
        print(f"   📊 Calendar views with realistic appointment distribution")


def main():
    """Main function to populate staging data."""
    print("BookedBarber V2 - Staging Data Population Script")
    print("=" * 60)
    
    try:
        populator = StagingDataPopulator()
        populator.populate_all_data()
        
        print("\n🎉 Success! Staging environment is ready for comprehensive testing.")
        print("🚀 You can now test all premium features with realistic data.")
        
    except Exception as e:
        print(f"\n❌ Error during data population: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())