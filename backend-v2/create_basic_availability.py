#!/usr/bin/env python3
"""
Create basic availability for barber 35 to test reschedule functionality
"""
import sys
import os
sys.path.append('/Users/bossio/6fb-booking/backend-v2')

from database import SessionLocal
from models import BarberAvailability, User
from datetime import time, date, timedelta

def create_availability():
    """Create basic availability for barber 35"""
    with SessionLocal() as db:
        try:
            # Check if barber exists
            barber = db.query(User).filter(User.id == 35).first()
            if not barber:
                print("❌ Barber 35 not found")
                return False
                
            print(f"✅ Found barber: {barber.name or barber.email}")
            
            # Delete existing availability to avoid conflicts
            db.query(BarberAvailability).filter(BarberAvailability.barber_id == 35).delete()
            
            # Create basic weekly availability (Monday to Sunday, 9 AM to 5 PM)
            days = [
                (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'), 
                (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')
            ]
            
            for day_num, day_name in days:
                availability = BarberAvailability(
                    barber_id=35,
                    day_of_week=day_num,
                    start_time=time(9, 0),  # 9:00 AM
                    end_time=time(17, 0),   # 5:00 PM
                    is_active=True
                )
                db.add(availability)
                print(f"✅ Added availability for {day_name}: 9:00 AM - 5:00 PM")
            
            db.commit()
            print("✅ Availability created successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Error creating availability: {e}")
            db.rollback()
            return False

if __name__ == "__main__":
    print("🔧 Creating basic availability for barber 35...")
    success = create_availability()
    if success:
        print("✅ Setup complete! Barber 35 now has availability Monday-Sunday 9 AM to 5 PM")
    else:
        print("❌ Setup failed!")