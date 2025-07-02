#!/usr/bin/env python3
"""
Test appointment display functionality by creating test appointments
and verifying they appear in the calendar.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Appointment, User, Client
import random

def create_test_appointments():
    """Create test appointments for today and upcoming days"""
    db = SessionLocal()
    
    try:
        # Get barber users
        barbers = db.query(User).filter(User.role == "barber").limit(3).all()
        if not barbers:
            print("❌ No barber users found in database")
            return
        
        # Get or create test clients
        test_clients = []
        for i in range(3):
            email = f"test_client_{i}@example.com"
            client = db.query(Client).filter(Client.email == email).first()
            if not client:
                client = Client(
                    email=email,
                    first_name=f"Test{i}",
                    last_name=f"Client{i}",
                    phone=f"555-000{i}"
                )
                db.add(client)
                db.commit()
            test_clients.append(client)
        
        # Create appointments for the next 7 days
        services = ["Haircut", "Shave", "Haircut & Shave"]
        statuses = ["confirmed", "pending", "completed"]
        prices = {"Haircut": 30.0, "Shave": 20.0, "Haircut & Shave": 45.0}
        durations = {"Haircut": 30, "Shave": 20, "Haircut & Shave": 45}
        
        appointments_created = 0
        
        for day_offset in range(7):
            date = datetime.now().date() + timedelta(days=day_offset)
            
            # Create 3-5 appointments per day
            num_appointments = random.randint(3, 5)
            
            for _ in range(num_appointments):
                # Random time between 9 AM and 6 PM
                hour = random.randint(9, 17)
                minute = random.choice([0, 30])
                start_time = datetime.combine(date, datetime.min.time()).replace(hour=hour, minute=minute)
                
                # Random service
                service = random.choice(services)
                
                # Random barber and client
                barber = random.choice(barbers)
                client = random.choice(test_clients)
                
                # Status - today's appointments are more likely to be completed
                if day_offset == 0:
                    status = random.choice(["completed", "completed", "confirmed"])
                elif day_offset < 2:
                    status = random.choice(["confirmed", "pending"])
                else:
                    status = "pending"
                
                # Check if appointment already exists
                existing = db.query(Appointment).filter(
                    Appointment.barber_id == barber.id,
                    Appointment.start_time == start_time
                ).first()
                
                if not existing:
                    appointment = Appointment(
                        user_id=barber.id,  # The barber who owns this appointment
                        barber_id=barber.id,
                        client_id=client.id,
                        service_name=service,
                        start_time=start_time,
                        duration_minutes=durations[service],
                        price=prices[service],
                        status=status,
                        notes=f"Test appointment for {client.first_name}"
                    )
                    db.add(appointment)
                    appointments_created += 1
        
        db.commit()
        print(f"✅ Created {appointments_created} test appointments")
        
        # Display summary
        total_appointments = db.query(Appointment).count()
        today_appointments = db.query(Appointment).filter(
            Appointment.start_time >= datetime.now().date(),
            Appointment.start_time < datetime.now().date() + timedelta(days=1)
        ).count()
        
        print(f"📊 Total appointments in database: {total_appointments}")
        print(f"📅 Today's appointments: {today_appointments}")
        
        # Show sample appointments
        print("\n📋 Sample appointments:")
        sample_appointments = db.query(Appointment).order_by(Appointment.start_time).limit(5).all()
        for apt in sample_appointments:
            barber_name = db.query(User).filter(User.id == apt.barber_id).first().email
            client_name = db.query(Client).filter(Client.id == apt.client_id).first().first_name if apt.client_id else "N/A"
            print(f"  - {apt.start_time.strftime('%Y-%m-%d %H:%M')} | {apt.service_name} | {barber_name} | {client_name} | {apt.status}")
        
    except Exception as e:
        print(f"❌ Error creating test appointments: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Creating Test Appointments")
    print("=" * 50)
    create_test_appointments()