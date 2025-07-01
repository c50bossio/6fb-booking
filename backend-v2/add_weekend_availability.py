#!/usr/bin/env python3
"""Add weekend availability for test barber."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from datetime import time

# Database connection
DATABASE_URL = "sqlite:///./6fb_booking.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def add_weekend_availability():
    db = SessionLocal()
    
    try:
        # Get test barber
        barber = db.query(models.User).filter(
            models.User.email == "barber@example.com"
        ).first()
        
        if not barber:
            print("Test barber not found!")
            return
        
        print(f"Adding weekend availability for {barber.name} (ID: {barber.id})")
        
        # Add Saturday and Sunday availability
        for day in [5, 6]:  # 5=Saturday, 6=Sunday
            # Check if already exists
            existing = db.query(models.BarberAvailability).filter(
                models.BarberAvailability.barber_id == barber.id,
                models.BarberAvailability.day_of_week == day
            ).first()
            
            if not existing:
                avail = models.BarberAvailability(
                    barber_id=barber.id,
                    day_of_week=day,
                    start_time=time(9, 0),   # 9 AM
                    end_time=time(18, 0),    # 6 PM
                    is_active=True
                )
                db.add(avail)
                day_name = "Saturday" if day == 5 else "Sunday"
                print(f"  Added {day_name} availability")
            else:
                day_name = "Saturday" if day == 5 else "Sunday"
                print(f"  {day_name} availability already exists")
        
        db.commit()
        print("✅ Weekend availability added successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_weekend_availability()