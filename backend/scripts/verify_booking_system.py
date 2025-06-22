"""
Verify the booking system setup
Checks that all tables were created and relationships work correctly
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect
from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models.booking import (
    ServiceCategory,
    Service,
    BookingRule,
    Review,
    BarberAvailability,
    BookingSlot,
    WaitList,
)
from models import Barber, Location, Client, Appointment


def check_tables_exist():
    """Check if all booking tables were created"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    required_tables = [
        "service_categories",
        "services",
        "barber_availability",
        "booking_rules",
        "reviews",
        "booking_slots",
        "wait_lists",
    ]

    print("Checking for required tables...")
    all_exist = True
    for table in required_tables:
        if table in tables:
            print(f"✓ Table '{table}' exists")
        else:
            print(f"✗ Table '{table}' NOT FOUND")
            all_exist = False

    return all_exist


def test_relationships(db: Session):
    """Test that all relationships work correctly"""
    print("\nTesting relationships...")

    try:
        # Test ServiceCategory -> Service relationship
        category = db.query(ServiceCategory).first()
        if category:
            services = category.services
            print(f"✓ ServiceCategory '{category.name}' has {len(services)} services")

        # Test Service -> Category relationship
        service = db.query(Service).first()
        if service:
            print(
                f"✓ Service '{service.name}' belongs to category '{service.category.name}'"
            )

        # Test Barber -> BarberAvailability relationship
        barber = db.query(Barber).first()
        if barber:
            availability = (
                db.query(BarberAvailability).filter_by(barber_id=barber.id).first()
            )
            if availability:
                print(f"✓ Barber '{barber.first_name}' has availability records")

        # Test Location relationships
        location = db.query(Location).first()
        if location:
            services = db.query(Service).filter_by(location_id=location.id).all()
            print(f"✓ Location '{location.name}' can have services")

        print("\nAll relationship tests passed!")

    except Exception as e:
        print(f"✗ Relationship test failed: {e}")
        return False

    return True


def display_sample_data(db: Session):
    """Display sample data from the booking system"""
    print("\n" + "=" * 60)
    print("SAMPLE DATA FROM BOOKING SYSTEM")
    print("=" * 60)

    # Service Categories
    print("\nService Categories:")
    categories = db.query(ServiceCategory).order_by(ServiceCategory.display_order).all()
    for cat in categories:
        print(f"  - {cat.name} ({cat.slug}) - {len(cat.services)} services")

    # Services
    print("\nServices by Category:")
    for cat in categories:
        if cat.services:
            print(f"\n  {cat.name}:")
            for service in cat.services:
                deposit_info = ""
                if service.requires_deposit:
                    deposit_info = f" (Requires {service.deposit_amount}{'%' if service.deposit_type == 'percentage' else '$'} deposit)"
                print(
                    f"    - {service.name}: ${service.base_price} / {service.duration_minutes}min{deposit_info}"
                )

    # Booking Rules
    print("\nBooking Rules:")
    rules = (
        db.query(BookingRule)
        .filter_by(is_active=True)
        .order_by(BookingRule.priority)
        .all()
    )
    for rule in rules:
        print(f"  - {rule.rule_name} ({rule.rule_type})")
        print(f"    {rule.description}")

    # Barber Availability
    print("\nBarber Availability:")
    availability = db.query(BarberAvailability).all()
    if availability:
        barber_schedules = {}
        for avail in availability:
            if avail.barber_id not in barber_schedules:
                barber_schedules[avail.barber_id] = []
            barber_schedules[avail.barber_id].append(avail)

        for barber_id, schedules in barber_schedules.items():
            barber = db.query(Barber).get(barber_id)
            if barber:
                print(f"\n  {barber.first_name} {barber.last_name}:")
                for schedule in schedules:
                    break_info = ""
                    if schedule.break_start:
                        break_info = f" (Break: {schedule.break_start.strftime('%I:%M %p')} - {schedule.break_end.strftime('%I:%M %p')})"
                    print(
                        f"    - {schedule.day_of_week.name}: {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')}{break_info}"
                    )
    else:
        print("  No availability records found")


def main():
    """Run all verification checks"""
    print("Verifying Booking System Setup")
    print("=" * 60)

    # Check tables
    if not check_tables_exist():
        print("\n✗ Not all tables exist. Please run the migration first.")
        return

    # Test with database session
    db = SessionLocal()
    try:
        # Test relationships
        if not test_relationships(db):
            print("\n✗ Relationship tests failed.")
            return

        # Display sample data
        display_sample_data(db)

        print("\n" + "=" * 60)
        print("✓ Booking system verification completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Verification failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
