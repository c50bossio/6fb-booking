#!/usr/bin/env python3
"""
Create demo appointments for testing the calendar functionality.
This script creates realistic appointment data for the test admin user.
"""

import sys
from datetime import datetime, timedelta, time
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from services import booking_service


def create_demo_appointments():
    """Create demo appointments for testing."""
    db = SessionLocal()
    
    try:
        # Get or create test admin user
        admin_user = db.query(models.User).filter(
            models.User.email == "admin.test@bookedbarber.com"
        ).first()
        
        if not admin_user:
            print("❌ Test admin user not found. Please create a user with email 'admin.test@bookedbarber.com' first.")
            return False
        
        print(f"✅ Found test admin user: {admin_user.email} (ID: {admin_user.id})")
        
        # Create appointments for the next 2 weeks
        start_date = datetime.now().date()
        services = ["Haircut", "Shave", "Haircut & Shave"]
        
        appointments_created = 0
        
        for day_offset in range(1, 15):  # Next 14 days
            appointment_date = start_date + timedelta(days=day_offset)
            
            # Skip weekends for more realistic data
            if appointment_date.weekday() >= 5:  # Saturday=5, Sunday=6
                continue
            
            # Create 2-3 appointments per day
            appointment_times = ["09:00", "11:30", "14:00", "16:30"]
            
            for i, appointment_time in enumerate(appointment_times[:3]):  # Max 3 per day
                if appointments_created >= 20:  # Limit total appointments
                    break
                    
                try:
                    # Use the booking service to create appointments
                    appointment = booking_service.create_booking(
                        db=db,
                        user_id=admin_user.id,
                        booking_date=appointment_date,
                        booking_time=appointment_time,
                        service=services[i % len(services)],
                        notes=f"Demo appointment #{appointments_created + 1}",
                        user_timezone="America/New_York"
                    )
                    
                    if appointment:
                        appointments_created += 1
                        print(f"✅ Created appointment {appointments_created}: {appointment_date} at {appointment_time} - {services[i % len(services)]}")
                    
                except Exception as e:
                    print(f"⚠️  Failed to create appointment for {appointment_date} at {appointment_time}: {str(e)}")
                    continue
            
            if appointments_created >= 20:
                break
        
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
        create_demo_appointments()