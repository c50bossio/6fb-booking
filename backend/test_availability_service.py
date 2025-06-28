#!/usr/bin/env python3
"""
Test the fixed availability service
"""
from datetime import date, time, timedelta
from config.database import SessionLocal
from services.availability_service import AvailabilityService


def test_availability_service():
    """Test availability service with real data"""
    db = SessionLocal()

    try:
        service = AvailabilityService(db)

        # Test for tomorrow (should be available for most slots)
        tomorrow = date.today() + timedelta(days=1)
        print(f"Testing availability for {tomorrow}...")

        # Test barber 1 at 10:00 AM for 60 minutes
        barber_id = 1
        appointment_time = time(10, 0)
        duration_minutes = 60

        print(
            f"\nChecking availability for barber {barber_id} at {appointment_time} for {duration_minutes} minutes..."
        )

        is_available, conflicts = service.check_real_time_availability(
            barber_id=barber_id,
            appointment_date=tomorrow,
            start_time=appointment_time,
            duration_minutes=duration_minutes,
        )

        print(f"Available: {is_available}")
        if conflicts:
            print("Conflicts:")
            for conflict in conflicts:
                print(f"  - {conflict.type}: {conflict.message}")
        else:
            print("No conflicts found!")

        # Test an invalid time (before business hours)
        print(f"\nTesting early morning time (7:00 AM)...")
        early_time = time(7, 0)

        is_available, conflicts = service.check_real_time_availability(
            barber_id=barber_id,
            appointment_date=tomorrow,
            start_time=early_time,
            duration_minutes=duration_minutes,
        )

        print(f"Available: {is_available}")
        if conflicts:
            print("Expected conflicts for early time:")
            for conflict in conflicts:
                print(f"  - {conflict.type}: {conflict.message}")

        # Test Sunday (should be unavailable)
        print(f"\nTesting Sunday availability...")
        # Find next Sunday
        days_until_sunday = (6 - tomorrow.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7
        next_sunday = tomorrow + timedelta(days=days_until_sunday)

        is_available, conflicts = service.check_real_time_availability(
            barber_id=barber_id,
            appointment_date=next_sunday,
            start_time=appointment_time,
            duration_minutes=duration_minutes,
        )

        print(f"Sunday ({next_sunday}) Available: {is_available}")
        if conflicts:
            print("Expected conflicts for Sunday:")
            for conflict in conflicts:
                print(f"  - {conflict.type}: {conflict.message}")

        print("\n✅ Availability service test completed!")

    except Exception as e:
        print(f"❌ Error testing availability service: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_availability_service()
