#!/usr/bin/env python3
"""
Test setup script to create database and sample data
"""
import sys
import os
from datetime import date, datetime, timedelta

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from models import Barber, Client, Appointment

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")

def create_sample_data():
    """Create sample data for testing"""
    print("Creating sample data...")
    
    db = SessionLocal()
    try:
        # Create a sample barber
        barber = Barber(
            email="demo@sixfigurecuts.com",
            hashed_password="demo_password",
            first_name="Demo",
            last_name="Barber",
            business_name="Six Figure Cuts",
            phone="555-123-4567",
            target_booking_capacity=40,
            hourly_rate=45.0,
            monthly_revenue_goal=8000.0,
            weekly_appointment_goal=35,
            average_ticket_goal=65.0
        )
        db.add(barber)
        db.commit()
        db.refresh(barber)
        print(f"✅ Created barber: {barber.business_name}")

        # Create sample clients
        clients_data = [
            {"first_name": "John", "last_name": "Smith", "email": "john.smith@email.com", "phone": "555-1001", "customer_type": "returning"},
            {"first_name": "Mike", "last_name": "Johnson", "email": "mike.j@email.com", "phone": "555-1002", "customer_type": "new"},
            {"first_name": "David", "last_name": "Wilson", "email": "david.w@email.com", "phone": "555-1003", "customer_type": "returning"},
            {"first_name": "Alex", "last_name": "Brown", "email": "alex.b@email.com", "phone": "555-1004", "customer_type": "returning"},
            {"first_name": "Robert", "last_name": "Davis", "email": "robert.d@email.com", "phone": "555-1005", "customer_type": "new"},
            {"first_name": "Chris", "last_name": "Miller", "email": "chris.m@email.com", "phone": "555-1006", "customer_type": "returning"},
        ]
        
        clients = []
        for client_data in clients_data:
            client = Client(
                barber_id=barber.id,
                first_name=client_data["first_name"],
                last_name=client_data["last_name"],
                email=client_data["email"],
                phone=client_data["phone"],
                customer_type=client_data["customer_type"]
            )
            db.add(client)
            clients.append(client)
        
        db.commit()
        for client in clients:
            db.refresh(client)
        print(f"✅ Created {len(clients)} clients")

        # Create sample appointments for today and recent days
        today = date.today()
        appointments_data = [
            # Today's appointments
            {"client_idx": 0, "date": today, "time": datetime.combine(today, datetime.strptime("09:00", "%H:%M").time()), 
             "service_revenue": 55.0, "tip": 12.0, "service": "Haircut & Beard Trim", "status": "completed"},
            {"client_idx": 1, "date": today, "time": datetime.combine(today, datetime.strptime("10:30", "%H:%M").time()), 
             "service_revenue": 45.0, "tip": 8.0, "service": "Standard Cut", "status": "completed"},
            {"client_idx": 2, "date": today, "time": datetime.combine(today, datetime.strptime("12:00", "%H:%M").time()), 
             "service_revenue": 75.0, "tip": 15.0, "service": "Premium Cut + Styling", "status": "completed"},
            {"client_idx": 3, "date": today, "time": datetime.combine(today, datetime.strptime("14:00", "%H:%M").time()), 
             "service_revenue": 50.0, "tip": 10.0, "service": "Haircut", "status": "in_progress"},
            {"client_idx": 4, "date": today, "time": datetime.combine(today, datetime.strptime("15:30", "%H:%M").time()), 
             "service_revenue": 70.0, "tip": 0.0, "service": "Cut + Beard", "status": "scheduled"},
            {"client_idx": 5, "date": today, "time": datetime.combine(today, datetime.strptime("17:00", "%H:%M").time()), 
             "service_revenue": 45.0, "tip": 0.0, "service": "Standard Cut", "status": "scheduled"},
            
            # Yesterday's appointments
            {"client_idx": 0, "date": today - timedelta(days=1), "service_revenue": 65.0, "tip": 13.0, "service": "Haircut & Beard", "status": "completed"},
            {"client_idx": 2, "date": today - timedelta(days=1), "service_revenue": 80.0, "tip": 16.0, "service": "Premium Service", "status": "completed"},
            {"client_idx": 3, "date": today - timedelta(days=1), "service_revenue": 45.0, "tip": 9.0, "service": "Standard Cut", "status": "completed"},
            
            # This week's appointments
            {"client_idx": 1, "date": today - timedelta(days=2), "service_revenue": 50.0, "tip": 10.0, "service": "Haircut", "status": "completed"},
            {"client_idx": 4, "date": today - timedelta(days=3), "service_revenue": 75.0, "tip": 15.0, "service": "Cut + Styling", "status": "completed"},
            {"client_idx": 5, "date": today - timedelta(days=4), "service_revenue": 45.0, "tip": 8.0, "service": "Standard Cut", "status": "completed"},
        ]
        
        appointments = []
        for apt_data in appointments_data:
            client = clients[apt_data["client_idx"]]
            appointment = Appointment(
                barber_id=barber.id,
                client_id=client.id,
                appointment_date=apt_data["date"],
                appointment_time=apt_data.get("time"),
                service_revenue=apt_data["service_revenue"],
                tip_amount=apt_data["tip"],
                product_revenue=0.0,
                customer_type=client.customer_type,
                service_name=apt_data["service"],
                status=apt_data["status"],
                is_completed=apt_data["status"] == "completed"
            )
            db.add(appointment)
            appointments.append(appointment)
        
        db.commit()
        print(f"✅ Created {len(appointments)} appointments")
        
        print(f"\n🎉 Sample data created successfully!")
        print(f"   Barber ID: {barber.id}")
        print(f"   Clients: {len(clients)}")
        print(f"   Appointments: {len(appointments)}")
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main test setup function"""
    print("🚀 Starting 6FB Backend Test Setup\n")
    
    try:
        create_tables()
        create_sample_data()
        print("\n✅ Test setup completed successfully!")
        print("\nNext steps:")
        print("1. Run the FastAPI server: uvicorn main:app --reload")
        print("2. Visit http://localhost:8000/docs to test the API")
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()