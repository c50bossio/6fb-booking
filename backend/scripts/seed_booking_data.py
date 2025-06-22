"""
Seed initial data for the booking system
Run this after applying the booking system migration
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from config.database import SessionLocal, engine
from models.booking import (
    ServiceCategory,
    Service,
    BookingRule,
    DayOfWeek,
    BarberAvailability,
)
from datetime import time
import json


def seed_service_categories(db: Session):
    """Seed initial service categories"""
    categories = [
        {
            "name": "Haircut",
            "slug": "haircut",
            "description": "Professional haircut services",
            "display_order": 1,
            "icon": "scissors",
            "color": "#4A5568",
        },
        {
            "name": "Beard & Shave",
            "slug": "beard-shave",
            "description": "Beard grooming and shaving services",
            "display_order": 2,
            "icon": "razor",
            "color": "#2D3748",
        },
        {
            "name": "Hair Color",
            "slug": "hair-color",
            "description": "Hair coloring and treatment services",
            "display_order": 3,
            "icon": "palette",
            "color": "#E53E3E",
        },
        {
            "name": "Hair Treatment",
            "slug": "hair-treatment",
            "description": "Special hair treatments and care",
            "display_order": 4,
            "icon": "sparkles",
            "color": "#38B2AC",
        },
        {
            "name": "Combo Packages",
            "slug": "combo-packages",
            "description": "Combined services at special prices",
            "display_order": 5,
            "icon": "package",
            "color": "#D69E2E",
        },
    ]

    for cat_data in categories:
        category = db.query(ServiceCategory).filter_by(slug=cat_data["slug"]).first()
        if not category:
            category = ServiceCategory(**cat_data)
            db.add(category)

    db.commit()
    print(f"Seeded {len(categories)} service categories")


def seed_services(db: Session):
    """Seed initial services"""
    # Get categories
    haircut_cat = db.query(ServiceCategory).filter_by(slug="haircut").first()
    beard_cat = db.query(ServiceCategory).filter_by(slug="beard-shave").first()
    color_cat = db.query(ServiceCategory).filter_by(slug="hair-color").first()
    treatment_cat = db.query(ServiceCategory).filter_by(slug="hair-treatment").first()
    combo_cat = db.query(ServiceCategory).filter_by(slug="combo-packages").first()

    services = [
        # Haircut services
        {
            "name": "Classic Haircut",
            "description": "Traditional haircut with consultation and styling",
            "category_id": haircut_cat.id,
            "base_price": 35.0,
            "duration_minutes": 30,
            "buffer_minutes": 5,
            "display_order": 1,
        },
        {
            "name": "Premium Haircut",
            "description": "Detailed haircut with hot towel, shampoo, and styling",
            "category_id": haircut_cat.id,
            "base_price": 50.0,
            "duration_minutes": 45,
            "buffer_minutes": 5,
            "display_order": 2,
        },
        {
            "name": "Kids Haircut",
            "description": "Haircut for children 12 and under",
            "category_id": haircut_cat.id,
            "base_price": 25.0,
            "duration_minutes": 20,
            "buffer_minutes": 5,
            "display_order": 3,
        },
        # Beard services
        {
            "name": "Beard Trim",
            "description": "Professional beard shaping and trimming",
            "category_id": beard_cat.id,
            "base_price": 25.0,
            "duration_minutes": 20,
            "display_order": 1,
        },
        {
            "name": "Hot Shave",
            "description": "Traditional hot towel shave with straight razor",
            "category_id": beard_cat.id,
            "base_price": 40.0,
            "duration_minutes": 30,
            "display_order": 2,
        },
        {
            "name": "Beard Design",
            "description": "Custom beard design and detailing",
            "category_id": beard_cat.id,
            "base_price": 35.0,
            "duration_minutes": 30,
            "display_order": 3,
        },
        # Color services
        {
            "name": "Full Color",
            "description": "Complete hair color transformation",
            "category_id": color_cat.id,
            "base_price": 80.0,
            "duration_minutes": 90,
            "buffer_minutes": 15,
            "requires_deposit": True,
            "deposit_type": "percentage",
            "deposit_amount": 50.0,
            "display_order": 1,
        },
        {
            "name": "Highlights",
            "description": "Professional highlighting service",
            "category_id": color_cat.id,
            "base_price": 100.0,
            "duration_minutes": 120,
            "buffer_minutes": 15,
            "requires_deposit": True,
            "deposit_type": "percentage",
            "deposit_amount": 50.0,
            "display_order": 2,
        },
        # Treatment services
        {
            "name": "Deep Conditioning",
            "description": "Intensive hair conditioning treatment",
            "category_id": treatment_cat.id,
            "base_price": 30.0,
            "duration_minutes": 20,
            "is_addon": True,
            "display_order": 1,
        },
        {
            "name": "Scalp Treatment",
            "description": "Therapeutic scalp massage and treatment",
            "category_id": treatment_cat.id,
            "base_price": 35.0,
            "duration_minutes": 25,
            "is_addon": True,
            "display_order": 2,
        },
        # Combo packages
        {
            "name": "Haircut & Beard",
            "description": "Classic haircut with beard trim",
            "category_id": combo_cat.id,
            "base_price": 55.0,
            "duration_minutes": 45,
            "buffer_minutes": 5,
            "is_featured": True,
            "display_order": 1,
        },
        {
            "name": "Premium Package",
            "description": "Premium haircut, beard trim, and hot shave",
            "category_id": combo_cat.id,
            "base_price": 85.0,
            "duration_minutes": 75,
            "buffer_minutes": 10,
            "is_featured": True,
            "display_order": 2,
        },
    ]

    for service_data in services:
        service = (
            db.query(Service)
            .filter_by(
                name=service_data["name"], category_id=service_data["category_id"]
            )
            .first()
        )
        if not service:
            service = Service(**service_data)
            db.add(service)

    db.commit()
    print(f"Seeded {len(services)} services")


def seed_booking_rules(db: Session):
    """Seed initial booking rules"""
    rules = [
        {
            "rule_type": "cancellation",
            "rule_name": "24 Hour Cancellation Policy",
            "description": "Appointments must be cancelled at least 24 hours in advance",
            "parameters": {
                "hours_before": 24,
                "fee_type": "percentage",
                "fee_amount": 50,
                "applies_to": "all_services",
            },
            "priority": 1,
            "is_active": True,
        },
        {
            "rule_type": "reschedule",
            "rule_name": "Reschedule Policy",
            "description": "Appointments can be rescheduled up to 4 hours before",
            "parameters": {
                "hours_before": 4,
                "max_reschedules": 2,
                "applies_to": "all_services",
            },
            "priority": 1,
            "is_active": True,
        },
        {
            "rule_type": "booking_window",
            "rule_name": "Advance Booking Window",
            "description": "How far in advance appointments can be booked",
            "parameters": {
                "min_hours": 2,
                "max_days": 60,
                "applies_to": "all_services",
            },
            "priority": 1,
            "is_active": True,
        },
        {
            "rule_type": "no_show",
            "rule_name": "No Show Policy",
            "description": "Policy for clients who don't show up",
            "parameters": {
                "fee_type": "percentage",
                "fee_amount": 100,
                "block_after_count": 3,
                "block_duration_days": 30,
            },
            "priority": 1,
            "is_active": True,
        },
        {
            "rule_type": "deposit",
            "rule_name": "Deposit Policy for Color Services",
            "description": "Deposit required for color services",
            "parameters": {
                "service_categories": ["hair-color"],
                "deposit_type": "percentage",
                "deposit_amount": 50,
                "refundable": True,
                "refund_hours_before": 48,
            },
            "priority": 2,
            "is_active": True,
        },
    ]

    for rule_data in rules:
        rule = (
            db.query(BookingRule)
            .filter_by(
                rule_type=rule_data["rule_type"], rule_name=rule_data["rule_name"]
            )
            .first()
        )
        if not rule:
            rule = BookingRule(**rule_data)
            db.add(rule)

    db.commit()
    print(f"Seeded {len(rules)} booking rules")


def seed_sample_availability(db: Session):
    """Seed sample barber availability"""
    # This would typically be done per barber, but we'll create a template
    # Get first barber and location if they exist
    from models import Barber, Location

    barber = db.query(Barber).first()
    location = db.query(Location).first()

    if not barber or not location:
        print("No barbers or locations found. Skipping availability seeding.")
        return

    # Standard work week schedule
    weekday_schedule = [
        {
            "barber_id": barber.id,
            "location_id": location.id,
            "day_of_week": day,
            "start_time": time(9, 0),  # 9:00 AM
            "end_time": time(18, 0),  # 6:00 PM
            "break_start": time(13, 0),  # 1:00 PM
            "break_end": time(14, 0),  # 2:00 PM
            "is_available": True,
        }
        for day in [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
        ]
    ]

    # Saturday schedule
    saturday_schedule = {
        "barber_id": barber.id,
        "location_id": location.id,
        "day_of_week": DayOfWeek.SATURDAY,
        "start_time": time(9, 0),  # 9:00 AM
        "end_time": time(17, 0),  # 5:00 PM
        "is_available": True,
    }

    # Add all schedules
    all_schedules = weekday_schedule + [saturday_schedule]

    for schedule_data in all_schedules:
        availability = (
            db.query(BarberAvailability)
            .filter_by(
                barber_id=schedule_data["barber_id"],
                location_id=schedule_data["location_id"],
                day_of_week=schedule_data["day_of_week"],
                start_time=schedule_data["start_time"],
            )
            .first()
        )
        if not availability:
            availability = BarberAvailability(**schedule_data)
            db.add(availability)

    db.commit()
    print(
        f"Seeded sample availability for barber {barber.first_name} {barber.last_name}"
    )


def main():
    """Run all seed functions"""
    db = SessionLocal()

    try:
        print("Starting booking system data seeding...")

        # Seed in order
        seed_service_categories(db)
        seed_services(db)
        seed_booking_rules(db)
        seed_sample_availability(db)

        print("Booking system data seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
