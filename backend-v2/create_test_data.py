from main import app
from database import SessionLocal
from utils.auth import get_password_hash
import models
from datetime import datetime, timedelta
import random

def create_test_data():
    db = SessionLocal()
    try:
        print("🔧 Creating test data...\n")
        
        # Get test barber
        barber = db.query(models.User).filter(models.User.email == "test-barber@6fb.com").first()
        if not barber:
            print("❌ Test barber not found. Please create it first.")
            return
        
        # Create services if they don't exist
        services = db.query(models.Service).all()
        if not services:
            print("📋 Creating services...")
            service_list = [
                {"name": "Haircut", "duration": 30, "price": 45.00, "description": "Classic men's haircut"},
                {"name": "Beard Trim", "duration": 20, "price": 25.00, "description": "Professional beard trimming"},
                {"name": "Haircut & Beard", "duration": 45, "price": 65.00, "description": "Full service package"},
                {"name": "Hair Design", "duration": 60, "price": 85.00, "description": "Custom hair design and styling"},
                {"name": "Kids Haircut", "duration": 25, "price": 30.00, "description": "Children's haircut (12 and under)"},
            ]
            
            for svc in service_list:
                service = models.Service(**svc)
                db.add(service)
            db.commit()
            services = db.query(models.Service).all()
            print(f"✅ Created {len(services)} services")
        
        # Create clients if they don't exist
        clients = db.query(models.Client).filter(models.Client.created_by_id == barber.id).all()
        if len(clients) < 5:
            print("👥 Creating test clients...")
            client_list = [
                {"name": "John Smith", "email": "john.smith@example.com", "phone": "+1234567890"},
                {"name": "Mike Johnson", "email": "mike.j@example.com", "phone": "+1234567891"},
                {"name": "David Brown", "email": "david.b@example.com", "phone": "+1234567892"},
                {"name": "Chris Wilson", "email": "chris.w@example.com", "phone": "+1234567893"},
                {"name": "James Davis", "email": "james.d@example.com", "phone": "+1234567894"},
            ]
            
            for cl in client_list:
                existing = db.query(models.Client).filter(models.Client.email == cl["email"]).first()
                if not existing:
                    client = models.Client(**cl, created_by_id=barber.id)
                    db.add(client)
            db.commit()
            clients = db.query(models.Client).filter(models.Client.created_by_id == barber.id).all()
            print(f"✅ Total {len(clients)} clients")
        
        # Create appointments for the next 7 days
        print("\n📅 Creating test appointments...")
        appointment_count = 0
        
        # Get current date and time
        now = datetime.now()
        start_date = now.replace(hour=9, minute=0, second=0, microsecond=0)
        
        # Create appointments for the next 7 days
        for day in range(7):
            current_date = start_date + timedelta(days=day)
            
            # Skip Sunday (day 6)
            if current_date.weekday() == 6:
                continue
            
            # Create 4-6 appointments per day
            num_appointments = random.randint(4, 6)
            time_slots = [9, 10, 11, 14, 15, 16, 17]  # Available time slots
            
            # Randomly select time slots
            selected_slots = random.sample(time_slots, num_appointments)
            selected_slots.sort()
            
            for slot in selected_slots:
                # Random client and service
                client = random.choice(clients)
                service = random.choice(services)
                
                # Calculate appointment time
                appointment_time = current_date.replace(hour=slot, minute=0)
                
                # Check if appointment already exists
                existing = db.query(models.Appointment).filter(
                    models.Appointment.start_time == appointment_time,
                    models.Appointment.barber_id == barber.id
                ).first()
                
                if not existing:
                    # Create appointment
                    appointment = models.Appointment(
                        user_id=barber.id,
                        barber_id=barber.id,
                        client_id=client.id,
                        service_id=service.id,
                        service_name=service.name,
                        start_time=appointment_time,
                        duration_minutes=service.duration,
                        price=service.price,
                        status="confirmed",
                        notes=f"Test appointment for {client.name}"
                    )
                    db.add(appointment)
                    appointment_count += 1
        
        db.commit()
        print(f"✅ Created {appointment_count} appointments")
        
        # Create one appointment with a conflict (same time tomorrow)
        tomorrow = now + timedelta(days=1)
        conflict_time = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
        
        # Check if we already have an appointment at this time
        existing_appointment = db.query(models.Appointment).filter(
            models.Appointment.start_time == conflict_time,
            models.Appointment.barber_id == barber.id
        ).first()
        
        if existing_appointment:
            print(f"\n⚠️  Created potential conflict at {conflict_time.strftime('%Y-%m-%d %I:%M %p')}")
            print("   (This will show up in the Conflicts panel if you have Google Calendar events)")
        
        print("\n✨ Test data created successfully!")
        print("\nYou can now:")
        print("1. Login to the system")
        print("2. View the calendar with appointments")
        print("3. Test drag-and-drop to reschedule")
        print("4. Test sync with Google Calendar")
        print("5. Check for conflicts")
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()