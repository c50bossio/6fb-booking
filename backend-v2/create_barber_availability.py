from sqlalchemy.orm import Session
from db import SessionLocal, engine
from models import User, BarberAvailability
from datetime import datetime, timedelta, time

def create_barber_availability():
    """Create test barber availability for the booking system"""
    db = SessionLocal()
    try:
        # Find or create a barber user
        barber = db.query(User).filter(User.role == "barber").first()
        if not barber:
            # Create a test barber
            from utils.auth import get_password_hash
            barber = User(
                email="barber@6fb.com",
                name="Test Barber",
                role="barber",
                is_active=True,
                hashed_password=get_password_hash("Barber123!")
            )
            db.add(barber)
            db.commit()
            print(f"✅ Created test barber: {barber.email}")
        else:
            print(f"ℹ️  Using existing barber: {barber.email}")
        
        # Check if availability already exists
        existing_availability = db.query(BarberAvailability).filter(
            BarberAvailability.barber_id == barber.id
        ).first()
        
        if existing_availability:
            print("ℹ️  Barber availability already exists")
            return
        
        # Create availability for the next 30 days
        today = datetime.now().date()
        
        for days_ahead in range(30):
            date = today + timedelta(days=days_ahead)
            
            # Skip Sundays
            if date.weekday() == 6:
                continue
            
            # Different hours for Saturday
            if date.weekday() == 5:  # Saturday
                start_time = time(9, 0)  # 9 AM
                end_time = time(17, 0)   # 5 PM
            else:  # Weekdays
                start_time = time(8, 0)  # 8 AM
                end_time = time(19, 0)   # 7 PM
            
            availability = BarberAvailability(
                barber_id=barber.id,
                date=date,
                start_time=start_time,
                end_time=end_time,
                is_available=True
            )
            db.add(availability)
        
        db.commit()
        print(f"\n✨ Successfully created availability for {barber.first_name} {barber.last_name} for the next 30 days!")
        
    except Exception as e:
        print(f"❌ Error creating barber availability: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_barber_availability()