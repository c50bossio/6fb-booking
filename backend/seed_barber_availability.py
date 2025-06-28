#!/usr/bin/env python3
"""
Seed barber availability data for testing
"""
from datetime import time
from sqlalchemy.orm import Session
from config.database import SessionLocal
from models import Barber, BarberAvailability, DayOfWeek


def seed_barber_availability():
    """Add availability for all barbers"""
    db = SessionLocal()

    try:
        # Get all barbers
        barbers = db.query(Barber).all()

        if not barbers:
            print("No barbers found. Please run seed data script first.")
            return

        print(f"Found {len(barbers)} barbers")

        # Standard business hours: Mon-Sat 9AM-6PM
        for barber in barbers:
            print(
                f"\nAdding availability for {barber.first_name} {barber.last_name}..."
            )

            # Monday to Saturday
            for day in range(0, 6):  # 0=Monday, 5=Saturday
                # Check if availability already exists
                existing = (
                    db.query(BarberAvailability)
                    .filter(
                        BarberAvailability.barber_id == barber.id,
                        BarberAvailability.day_of_week == DayOfWeek(day),
                    )
                    .first()
                )

                if existing:
                    print(f"  - {DayOfWeek(day).name} already configured")
                    continue

                availability = BarberAvailability(
                    barber_id=barber.id,
                    location_id=barber.location_id,  # Add required location_id
                    day_of_week=DayOfWeek(day),
                    start_time=time(9, 0),  # 9:00 AM
                    end_time=time(18, 0),  # 6:00 PM
                    break_start=time(12, 0),  # 12:00 PM
                    break_end=time(13, 0),  # 1:00 PM
                    is_available=True,
                )
                db.add(availability)
                print(
                    f"  - Added {DayOfWeek(day).name}: 9:00 AM - 6:00 PM (break 12:00-1:00 PM)"
                )

            # Sunday - closed
            sunday_availability = (
                db.query(BarberAvailability)
                .filter(
                    BarberAvailability.barber_id == barber.id,
                    BarberAvailability.day_of_week == DayOfWeek.SUNDAY,
                )
                .first()
            )

            if not sunday_availability:
                sunday = BarberAvailability(
                    barber_id=barber.id,
                    location_id=barber.location_id,  # Add required location_id
                    day_of_week=DayOfWeek.SUNDAY,
                    start_time=time(9, 0),  # Required field even if not available
                    end_time=time(18, 0),  # Required field even if not available
                    is_available=False,
                )
                db.add(sunday)
                print(f"  - Added SUNDAY: Closed")

        db.commit()
        print("\n✅ Barber availability seeded successfully!")

    except Exception as e:
        print(f"❌ Error seeding availability: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_barber_availability()
