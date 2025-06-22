#!/usr/bin/env python3
"""
Database-Level Booking System Test
Tests booking functionality directly through the database
"""

import sys
from datetime import datetime, date, time, timedelta
from sqlalchemy import create_engine, and_, or_, func
from sqlalchemy.orm import sessionmaker
import json

# Add the backend directory to the path
sys.path.append('/Users/bossio/6fb-booking/backend')

from config.database import Base, get_db
from models import (
    ServiceCategory, Service, Barber, Location, Client, Appointment,
    BarberAvailability, BookingRule, Review, DayOfWeek, ReviewRating
)

# Database setup
DATABASE_URL = "sqlite:///./6fb_booking.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_database_schema():
    """Test that all booking tables exist"""
    print("🗃️  Testing Database Schema...")
    
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    required_tables = [
        'service_categories', 'services', 'barber_availability',
        'booking_rules', 'reviews', 'booking_slots', 'wait_lists'
    ]
    
    print(f"Found {len(tables)} tables in database")
    
    for table in required_tables:
        if table in tables:
            print(f"✅ Table '{table}' exists")
        else:
            print(f"❌ Table '{table}' is missing!")
    
    # Show all tables
    print("\nAll tables in database:")
    for table in sorted(tables):
        print(f"  - {table}")
    
    return all(table in tables for table in required_tables)


def test_service_categories(db):
    """Test service categories functionality"""
    print("\n📁 Testing Service Categories...")
    
    # Get all categories
    categories = db.query(ServiceCategory).filter(ServiceCategory.is_active == True).all()
    print(f"Found {len(categories)} active categories")
    
    if categories:
        for cat in categories:
            print(f"  - {cat.name} (ID: {cat.id}, Order: {cat.display_order})")
            
            # Count services in this category
            service_count = db.query(Service).filter(
                and_(
                    Service.category_id == cat.id,
                    Service.is_active == True
                )
            ).count()
            print(f"    Services: {service_count}")
    else:
        print("❌ No service categories found! Creating test data...")
        
        # Create test categories
        test_categories = [
            {"name": "Haircut", "slug": "haircut", "display_order": 1},
            {"name": "Beard", "slug": "beard", "display_order": 2},
            {"name": "Color", "slug": "color", "display_order": 3},
            {"name": "Special", "slug": "special", "display_order": 4}
        ]
        
        for cat_data in test_categories:
            cat = ServiceCategory(**cat_data)
            db.add(cat)
        
        db.commit()
        print("✅ Created test categories")
    
    return len(categories) > 0


def test_services(db):
    """Test services functionality"""
    print("\n💈 Testing Services...")
    
    # Get all services with categories
    services = db.query(Service, ServiceCategory).join(
        ServiceCategory, Service.category_id == ServiceCategory.id
    ).filter(Service.is_active == True).all()
    
    print(f"Found {len(services)} active services")
    
    if services:
        # Group by category
        by_category = {}
        for service, category in services:
            if category.name not in by_category:
                by_category[category.name] = []
            by_category[category.name].append(service)
        
        for cat_name, cat_services in by_category.items():
            print(f"\n  {cat_name}:")
            for svc in cat_services[:3]:  # Show first 3
                print(f"    - {svc.name} (${svc.base_price:.2f}, {svc.duration_minutes} min)")
                if svc.requires_deposit:
                    print(f"      Deposit: {svc.deposit_amount}{'%' if svc.deposit_type == 'percentage' else '$'}")
    else:
        print("❌ No services found!")
    
    return len(services) > 0


def test_barber_availability(db):
    """Test barber availability patterns"""
    print("\n📅 Testing Barber Availability...")
    
    # Get all availability patterns
    availability = db.query(BarberAvailability, Barber).join(
        Barber, BarberAvailability.barber_id == Barber.id
    ).filter(BarberAvailability.is_available == True).all()
    
    print(f"Found {len(availability)} availability patterns")
    
    if availability:
        # Group by barber
        by_barber = {}
        for avail, barber in availability:
            barber_name = f"{barber.first_name} {barber.last_name}"
            if barber_name not in by_barber:
                by_barber[barber_name] = []
            by_barber[barber_name].append(avail)
        
        for barber_name, patterns in by_barber.items():
            print(f"\n  {barber_name}:")
            for pattern in patterns:
                print(f"    - {pattern.day_of_week.name}: {pattern.start_time} - {pattern.end_time}")
                if pattern.break_start:
                    print(f"      Break: {pattern.break_start} - {pattern.break_end}")
    else:
        print("❌ No availability patterns found!")
        
        # Create sample availability
        barbers = db.query(Barber).filter(Barber.is_active == True).limit(2).all()
        if barbers:
            print("\nCreating sample availability for testing...")
            for barber in barbers:
                # Monday to Friday, 9 AM to 5 PM
                for day in range(5):  # 0-4 = Mon-Fri
                    avail = BarberAvailability(
                        barber_id=barber.id,
                        location_id=barber.location_id,
                        day_of_week=DayOfWeek(day),
                        start_time=time(9, 0),
                        end_time=time(17, 0),
                        break_start=time(12, 0),
                        break_end=time(13, 0),
                        is_available=True
                    )
                    db.add(avail)
            
            db.commit()
            print("✅ Created sample availability patterns")
    
    return len(availability) > 0


def test_booking_rules(db):
    """Test booking rules"""
    print("\n⚖️  Testing Booking Rules...")
    
    rules = db.query(BookingRule).filter(BookingRule.is_active == True).all()
    print(f"Found {len(rules)} active booking rules")
    
    if rules:
        for rule in rules:
            print(f"  - {rule.rule_name} ({rule.rule_type})")
            print(f"    Scope: ", end="")
            if rule.location_id:
                print(f"Location {rule.location_id}", end="")
            elif rule.barber_id:
                print(f"Barber {rule.barber_id}", end="")
            elif rule.service_id:
                print(f"Service {rule.service_id}", end="")
            else:
                print("Global", end="")
            print(f"\n    Parameters: {json.dumps(rule.parameters, indent=6)}")
    else:
        print("ℹ️  No booking rules found (this is optional)")
    
    return True


def test_appointments_and_reviews(db):
    """Test appointments and review system"""
    print("\n📋 Testing Appointments & Reviews...")
    
    # Get recent appointments
    recent = db.query(Appointment).order_by(Appointment.created_at.desc()).limit(10).all()
    print(f"Found {len(recent)} recent appointments")
    
    if recent:
        for appt in recent[:5]:
            print(f"\n  Appointment {appt.id}:")
            print(f"    Date: {appt.appointment_date} at {appt.appointment_time.time()}")
            print(f"    Service: {appt.service_name} (${appt.service_revenue:.2f})")
            print(f"    Status: {appt.status}")
            
            # Check for review
            review = db.query(Review).filter(Review.appointment_id == appt.id).first()
            if review:
                print(f"    Review: {review.overall_rating.value}/5 stars")
                if review.title:
                    print(f"    Title: {review.title}")
    
    # Count reviews
    total_reviews = db.query(Review).count()
    print(f"\nTotal reviews in system: {total_reviews}")
    
    if total_reviews > 0:
        # Calculate average ratings by barber
        avg_ratings = db.query(
            Barber.id,
            Barber.first_name,
            Barber.last_name,
            func.avg(Review.overall_rating).label('avg_rating'),
            func.count(Review.id).label('review_count')
        ).join(
            Review, Review.barber_id == Barber.id
        ).group_by(Barber.id).all()
        
        print("\nBarber ratings:")
        for barber_id, first_name, last_name, avg_rating, count in avg_ratings:
            # Convert enum average to float
            avg_val = float(avg_rating) if avg_rating else 0
            print(f"  - {first_name} {last_name}: {avg_val:.1f}/5 ({count} reviews)")
    
    return True


def test_booking_flow_simulation(db):
    """Simulate a booking flow"""
    print("\n🔄 Simulating Booking Flow...")
    
    # 1. Find an active barber
    barber = db.query(Barber).filter(Barber.is_active == True).first()
    if not barber:
        print("❌ No active barbers found!")
        return False
    
    print(f"✅ Selected barber: {barber.first_name} {barber.last_name}")
    
    # 2. Get barber's services
    services = db.query(Service).filter(
        and_(
            Service.is_active == True,
            or_(
                Service.barber_id == barber.id,
                and_(
                    Service.location_id == barber.location_id,
                    Service.barber_id == None
                )
            )
        )
    ).all()
    
    if not services:
        print("❌ No services available for this barber!")
        return False
    
    service = services[0]
    print(f"✅ Selected service: {service.name} (${service.base_price:.2f}, {service.duration_minutes} min)")
    
    # 3. Check barber's availability for tomorrow
    tomorrow = date.today() + timedelta(days=1)
    day_of_week = DayOfWeek(tomorrow.weekday())
    
    availability = db.query(BarberAvailability).filter(
        and_(
            BarberAvailability.barber_id == barber.id,
            BarberAvailability.day_of_week == day_of_week,
            BarberAvailability.is_available == True
        )
    ).first()
    
    if availability:
        print(f"✅ Barber is available on {day_of_week.name}: {availability.start_time} - {availability.end_time}")
    else:
        print(f"❌ Barber not available on {day_of_week.name}")
        return False
    
    # 4. Find available slot
    # Get existing appointments for tomorrow
    existing = db.query(Appointment).filter(
        and_(
            Appointment.barber_id == barber.id,
            Appointment.appointment_date == tomorrow,
            Appointment.status.in_(['scheduled', 'completed'])
        )
    ).all()
    
    print(f"ℹ️  Barber has {len(existing)} existing appointments tomorrow")
    
    # 5. Create a test booking
    # Find or create test client
    test_email = "test_booking@example.com"
    client = db.query(Client).filter(Client.email == test_email).first()
    
    if not client:
        client = Client(
            first_name="Test",
            last_name="Booking",
            email=test_email,
            phone="555-0000",
            barber_id=barber.id,
            customer_type="new",
            first_visit_date=tomorrow,
            total_visits=0,
            total_spent=0.0
        )
        db.add(client)
        db.commit()
        print("✅ Created test client")
    
    # Create appointment
    appointment_time = datetime.combine(tomorrow, availability.start_time)
    
    appointment = Appointment(
        appointment_date=tomorrow,
        appointment_time=appointment_time,
        duration_minutes=service.duration_minutes,
        barber_id=barber.id,
        client_id=client.id,
        service_name=service.name,
        service_category=service.category.name if service.category else None,
        service_revenue=service.base_price,
        customer_type="new" if client.total_visits == 0 else "returning",
        status="scheduled",
        is_completed=False,
        payment_status="pending",
        booking_source="test_script"
    )
    
    db.add(appointment)
    db.commit()
    
    print(f"✅ Created test appointment ID: {appointment.id}")
    print(f"   Date: {appointment.appointment_date}")
    print(f"   Time: {appointment.appointment_time.time()}")
    print(f"   Service: {appointment.service_name}")
    print(f"   Revenue: ${appointment.service_revenue:.2f}")
    
    return True


def run_all_tests():
    """Run all database tests"""
    print("🚀 Starting Database-Level Booking System Tests")
    print("=" * 60)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Test 1: Schema
        if not test_database_schema():
            print("\n❌ Schema test failed!")
            return
        
        # Test 2: Service Categories
        test_service_categories(db)
        
        # Test 3: Services
        test_services(db)
        
        # Test 4: Barber Availability
        test_barber_availability(db)
        
        # Test 5: Booking Rules
        test_booking_rules(db)
        
        # Test 6: Appointments & Reviews
        test_appointments_and_reviews(db)
        
        # Test 7: Booking Flow Simulation
        test_booking_flow_simulation(db)
        
        print("\n✅ All database tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    run_all_tests()