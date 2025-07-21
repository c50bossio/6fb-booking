#!/usr/bin/env python3
"""
Create simple demo appointments directly in the database without barber availability checks.
This is for testing/demo purposes only.
"""

import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models


def create_simple_demo_appointments():
    """Create demo appointments directly in database."""
    db = SessionLocal()
    
    try:
        # Get admin user
        admin_user = db.query(models.User).filter(
            models.User.email == "admin.test@bookedbarber.com"
        ).first()
        
        if not admin_user:
            print("❌ Test admin user not found.")
            return False
        
        print(f"✅ Found test admin user: {admin_user.email} (ID: {admin_user.id})")
        
        # Get or create a barber user for the appointments
        barber_user = db.query(models.User).filter(
            models.User.email == "test-barber@6fb.com"
        ).first()
        
        if not barber_user:
            print("❌ Test barber user not found.")
            return False
            
        print(f"✅ Found test barber: {barber_user.email} (ID: {barber_user.id})")
        
        # Create appointments for next 2 weeks
        start_date = datetime.now()
        services = ["Haircut", "Shave", "Haircut & Shave"]
        appointment_times = [
            (9, 0),   # 9:00 AM
            (11, 30), # 11:30 AM
            (14, 0),  # 2:00 PM
            (16, 30)  # 4:30 PM
        ]
        
        appointments_created = 0
        
        for day_offset in range(1, 15):  # Next 14 days
            appointment_date = start_date + timedelta(days=day_offset)
            
            # Skip weekends
            if appointment_date.weekday() >= 5:
                continue
            
            # Create 2-3 appointments per day
            for i, (hour, minute) in enumerate(appointment_times[:3]):
                if appointments_created >= 20:
                    break
                
                # Create appointment datetime
                appointment_datetime = appointment_date.replace(
                    hour=hour, 
                    minute=minute, 
                    second=0, 
                    microsecond=0
                )
                
                service = services[i % len(services)]
                
                # Create appointment directly
                appointment = models.Appointment(
                    user_id=admin_user.id,
                    barber_id=barber_user.id,
                    service_name=service,
                    start_time=appointment_datetime,
                    duration_minutes=30,
                    price=30.0 if service == "Haircut" else (20.0 if service == "Shave" else 45.0),
                    status="confirmed",
                    notes=f"Demo appointment #{appointments_created + 1}",
                    created_at=datetime.utcnow()
                )
                
                db.add(appointment)
                appointments_created += 1
                
                print(f"✅ Created appointment {appointments_created}: {appointment_datetime.strftime('%Y-%m-%d %H:%M')} - {service}")
                
                if appointments_created >= 20:
                    break
            
            if appointments_created >= 20:
                break
        
        # Commit all appointments
        db.commit()
        
        print(f"\n🎉 Successfully created {appointments_created} demo appointments!")
        
        # Verify appointments were created
        user_appointments = db.query(models.Appointment).filter(
            models.Appointment.user_id == admin_user.id
        ).count()
        
        print(f"📊 Total appointments for user {admin_user.email}: {user_appointments}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating demo appointments: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


def delete_demo_appointments():
    """Delete demo appointments (cleanup function)."""
    db = SessionLocal()
    
    try:
        admin_user = db.query(models.User).filter(
            models.User.email == "admin.test@bookedbarber.com"
        ).first()
        
        if not admin_user:
            print("❌ Test admin user not found.")
            return False
        
        deleted_count = db.query(models.Appointment).filter(
            models.Appointment.user_id == admin_user.id
        ).delete()
        
        db.commit()
        print(f"🗑️  Deleted {deleted_count} appointments for user {admin_user.email}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting demo appointments: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--delete":
        delete_demo_appointments()
    else:
        create_simple_demo_appointments()