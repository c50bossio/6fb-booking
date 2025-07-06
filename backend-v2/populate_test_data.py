#!/usr/bin/env python3
"""
Populate Test Data Script

Creates sample data for development and testing purposes.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, Client, Appointment, Service
from datetime import datetime, timedelta
from config import settings
import random

def populate_test_data():
    """Create sample test data if it doesn't exist"""
    # Create database connection
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("📊 Populating test data...")
        
        # Get the admin user
        admin_user = db.query(User).filter(User.email == "admin.test@bookedbarber.com").first()
        if not admin_user:
            print("❌ Admin user not found. Create admin user first.")
            return
        
        # Create sample services if they don't exist
        from models import ServiceCategoryEnum
        
        services_data = [
            {"name": "Haircut", "duration": 30, "price": 25.00, "category": ServiceCategoryEnum.HAIRCUT},
            {"name": "Beard Trim", "duration": 15, "price": 15.00, "category": ServiceCategoryEnum.BEARD},
            {"name": "Hair Wash", "duration": 20, "price": 10.00, "category": ServiceCategoryEnum.HAIR_TREATMENT},
            {"name": "Full Service", "duration": 60, "price": 45.00, "category": ServiceCategoryEnum.PACKAGE},
            {"name": "Buzz Cut", "duration": 15, "price": 20.00, "category": ServiceCategoryEnum.HAIRCUT}
        ]
        
        services = []
        for service_data in services_data:
            existing_service = db.query(Service).filter(Service.name == service_data["name"]).first()
            if not existing_service:
                service = Service(
                    name=service_data["name"],
                    duration_minutes=service_data["duration"],
                    base_price=service_data["price"],
                    category=service_data["category"],
                    description=f"Professional {service_data['name'].lower()} service",
                    is_active=True
                )
                db.add(service)
                services.append(service)
                print(f"   ✅ Created service: {service_data['name']}")
            else:
                services.append(existing_service)
        
        db.commit()
        
        # Create sample clients if they don't exist
        clients_data = [
            {"name": "John Smith", "email": "john.smith@example.com", "phone": "+1555001001"},
            {"name": "Sarah Johnson", "email": "sarah.j@example.com", "phone": "+1555001002"},
            {"name": "Mike Brown", "email": "mike.brown@example.com", "phone": "+1555001003"},
            {"name": "Lisa Davis", "email": "lisa.davis@example.com", "phone": "+1555001004"},
            {"name": "Tom Wilson", "email": "tom.wilson@example.com", "phone": "+1555001005"},
            {"name": "Emily Garcia", "email": "emily.g@example.com", "phone": "+1555001006"},
            {"name": "David Martinez", "email": "david.m@example.com", "phone": "+1555001007"},
            {"name": "Jennifer Rodriguez", "email": "jennifer.r@example.com", "phone": "+1555001008"}
        ]
        
        clients = []
        for client_data in clients_data:
            existing_client = db.query(Client).filter(Client.email == client_data["email"]).first()
            if not existing_client:
                client = Client(
                    name=client_data["name"],
                    email=client_data["email"],
                    phone=client_data["phone"],
                    created_at=datetime.now() - timedelta(days=random.randint(1, 90))
                )
                db.add(client)
                clients.append(client)
                print(f"   ✅ Created client: {client_data['name']}")
            else:
                clients.append(existing_client)
        
        db.commit()
        
        # Create sample appointments for the last 30 days and future
        appointment_count = 0
        for i in range(50):  # Create 50 appointments
            # Random date in the last 30 days or next 30 days
            days_offset = random.randint(-30, 30)
            appointment_date = datetime.now() + timedelta(days=days_offset)
            
            # Random time during business hours (9 AM to 6 PM)
            hour = random.randint(9, 17)
            minute = random.choice([0, 15, 30, 45])
            appointment_datetime = appointment_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            client = random.choice(clients)
            service = random.choice(services)
            
            # Determine status based on date
            if appointment_datetime < datetime.now():
                status = random.choice(["completed", "completed", "completed", "cancelled"])  # Most past appointments completed
            else:
                status = random.choice(["confirmed", "pending"])
            
            appointment = Appointment(
                client_id=client.id,
                barber_id=admin_user.id,  # Using admin as barber for simplicity
                service_id=service.id,
                start_time=appointment_datetime,
                end_time=appointment_datetime + timedelta(minutes=service.duration_minutes),
                status=status,
                notes=f"Test appointment for {client.name}",
                created_at=appointment_datetime - timedelta(days=random.randint(1, 7))
            )
            
            # Check if similar appointment already exists
            existing = db.query(Appointment).filter(
                Appointment.client_id == client.id,
                Appointment.start_time == appointment_datetime
            ).first()
            
            if not existing:
                db.add(appointment)
                appointment_count += 1
        
        db.commit()
        print(f"   ✅ Created {appointment_count} appointments")
        
        # Create sample payments (simple approach - just add to Payment table if it exists)
        try:
            from models.payment import Payment
            payment_count = 0
            completed_appointments = db.query(Appointment).filter(Appointment.status == "completed").all()
            
            for appointment in completed_appointments[:20]:  # Create payments for first 20 completed appointments
                existing_payment = db.query(Payment).filter(Payment.appointment_id == appointment.id).first()
                if not existing_payment:
                    payment = Payment(
                        appointment_id=appointment.id,
                        amount=float(appointment.service.base_price) if hasattr(appointment, 'service') else 25.00,
                        status="completed",
                        payment_method="card",
                        created_at=appointment.start_time + timedelta(hours=1)
                    )
                    db.add(payment)
                    payment_count += 1
            
            db.commit()
            print(f"   ✅ Created {payment_count} payments")
            
        except ImportError:
            print("   ℹ️  Payment model not found, skipping payment data")
        
        print("🎉 Test data population completed!")
        
        # Print summary
        total_clients = db.query(Client).count()
        total_appointments = db.query(Appointment).count()
        total_services = db.query(Service).count()
        
        print(f"\n📈 Database Summary:")
        print(f"   Clients: {total_clients}")
        print(f"   Services: {total_services}")
        print(f"   Appointments: {total_appointments}")
        
    except Exception as e:
        print(f"❌ Error populating test data: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    populate_test_data()