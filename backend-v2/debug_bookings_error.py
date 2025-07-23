import sys
sys.path.append('.')

from db import SessionLocal
from models import User, Appointment
from services import booking_service

def debug_bookings():
    db = SessionLocal()
    try:
        # Get admin user
        admin = db.query(User).filter(User.email == "admin@6fb.com").first()
        if not admin:
            print("❌ Admin user not found")
            return
            
        print(f"✅ Found admin user: {admin.email} (ID: {admin.id})")
        
        # Try to get bookings using the service
        print("\nTesting booking_service.get_user_bookings...")
        try:
            bookings = booking_service.get_user_bookings(db, admin.id)
            print(f"✅ Success! Found {len(bookings)} bookings")
            
            for booking in bookings[:3]:  # Show first 3
                print(f"  - Booking ID {booking.id}: {booking.service_name} at {booking.start_time}")
                
        except Exception as e:
            print(f"❌ Error getting bookings: {str(e)}")
            import traceback
            traceback.print_exc()
            
        # Try direct query
        print("\nTrying direct database query...")
        try:
            direct_bookings = db.query(Appointment).filter(
                Appointment.user_id == admin.id
            ).all()
            print(f"✅ Direct query found {len(direct_bookings)} bookings")
        except Exception as e:
            print(f"❌ Direct query error: {str(e)}")
            import traceback
            traceback.print_exc()
            
    finally:
        db.close()

if __name__ == "__main__":
    debug_bookings()