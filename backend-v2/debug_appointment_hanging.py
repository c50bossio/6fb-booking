#!/usr/bin/env python3
"""
Debug script to isolate appointment creation hanging issue.
This will test each step of appointment creation individually.
"""

import sys
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the backend-v2 directory to Python path
sys.path.insert(0, '/Users/bossio/6fb-booking/backend-v2')

def test_imports():
    """Test if all required imports work without hanging"""
    logger.info("Testing imports...")
    
    try:
        logger.info("Importing database...")
        logger.info("✓ Database imported")
        
        logger.info("Importing models...")
        logger.info("✓ Models imported")
        
        logger.info("Importing schemas...")
        logger.info("✓ Schemas imported")
        
        logger.info("Importing booking_service...")
        logger.info("✓ Booking service imported")
        
        logger.info("Importing barber_availability_service...")
        logger.info("✓ Barber availability service imported")
        
        logger.info("Importing booking_rules_service...")
        logger.info("✓ Booking rules service imported")
        
        logger.info("Importing notification_service...")
        try:
            logger.info("✓ Notification service imported")
        except ImportError:
            logger.warning("⚠️ Notification service not available")
        
        logger.info("Importing client_service...")
        try:
            logger.info("✓ Client service imported")
        except ImportError:
            logger.warning("⚠️ Client service not available")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Import failed: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    logger.info("Testing database connection...")
    
    try:
        from db import get_db
        
        # Get a database session
        db = next(get_db())
        logger.info("✓ Database session created")
        
        # Test a simple query
        from models import User
        user_count = db.query(User).count()
        logger.info(f"✓ Database query successful - {user_count} users found")
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

def test_booking_settings():
    """Test booking settings retrieval"""
    logger.info("Testing booking settings...")
    
    try:
        from db import get_db
        from services import booking_service
        
        db = next(get_db())
        settings = booking_service.get_booking_settings(db)
        logger.info(f"✓ Booking settings retrieved: {settings.business_name}")
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Booking settings failed: {e}")
        return False

def test_user_creation():
    """Test user creation for appointment testing"""
    logger.info("Testing user creation...")
    
    try:
        from db import get_db
        import models
        
        db = next(get_db())
        
        # Check if test user exists
        test_user = db.query(models.User).filter(models.User.email == "debug_test@test.com").first()
        
        if not test_user:
            logger.info("Creating test user...")
            test_user = models.User(
                email="debug_test@test.com",
                name="Debug Test User",
                hashed_password="dummy_hash",
                role="user",
                is_active=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            logger.info(f"✓ Test user created with ID: {test_user.id}")
        else:
            logger.info(f"✓ Test user already exists with ID: {test_user.id}")
        
        db.close()
        return test_user.id
        
    except Exception as e:
        logger.error(f"❌ User creation failed: {e}")
        return None

def test_appointment_creation_step_by_step(user_id):
    """Test appointment creation step by step to find where it hangs"""
    logger.info("Testing appointment creation step by step...")
    
    try:
        from db import get_db
        from services import booking_service
        from datetime import date, time, datetime, timedelta
        import pytz
        
        db = next(get_db())
        
        # Test data
        booking_date = date.today() + timedelta(days=1)  # Tomorrow
        booking_time = "14:00"
        service = "Haircut"
        
        logger.info(f"Testing appointment for {booking_date} at {booking_time}")
        
        # Step 1: Get booking settings
        logger.info("Step 1: Getting booking settings...")
        settings = booking_service.get_booking_settings(db)
        logger.info("✓ Booking settings retrieved")
        
        # Step 2: Validate service
        logger.info("Step 2: Validating service...")
        SERVICES = {
            "Haircut": {"duration": 30, "price": 30},
            "Shave": {"duration": 30, "price": 20},
            "Haircut & Shave": {"duration": 30, "price": 45}
        }
        if service not in SERVICES:
            raise ValueError(f"Invalid service: {service}")
        logger.info("✓ Service validated")
        
        # Step 3: Parse time and create timezone-aware datetime
        logger.info("Step 3: Creating timezone-aware datetime...")
        business_tz = pytz.timezone(settings.business_timezone)
        hour, minute = map(int, booking_time.split(":"))
        start_time_business = business_tz.localize(datetime.combine(booking_date, time(hour, minute)))
        start_time_utc = start_time_business.astimezone(pytz.UTC)
        logger.info("✓ Timezone conversion completed")
        
        # Step 4: Validate booking time constraints
        logger.info("Step 4: Validating time constraints...")
        now_business = datetime.now(business_tz)
        min_booking_time = now_business + timedelta(minutes=settings.min_lead_time_minutes)
        max_booking_time = now_business + timedelta(days=settings.max_advance_days)
        
        if start_time_business < min_booking_time:
            raise ValueError(f"Booking must be at least {settings.min_lead_time_minutes} minutes in advance")
        if start_time_business > max_booking_time:
            raise ValueError(f"Booking cannot be more than {settings.max_advance_days} days in advance")
        logger.info("✓ Time constraints validated")
        
        # Step 5: Check barber availability
        logger.info("Step 5: Checking barber availability...")
        from services import barber_availability_service
        
        available_barbers = barber_availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=booking_date,
            start_time=start_time_business.time(),
            end_time=(start_time_business + timedelta(minutes=SERVICES[service]["duration"])).time()
        )
        
        if not available_barbers:
            raise ValueError(f"No barbers available at {booking_time} on {booking_date}")
        
        barber = available_barbers[0]
        barber_id = barber.id
        logger.info(f"✓ Barber availability checked - assigned barber {barber.name} (ID: {barber_id})")
        
        # Step 6: Validate business rules
        logger.info("Step 6: Validating business rules...")
        from services import booking_rules_service
        
        is_valid, rule_violations = booking_rules_service.validate_booking_against_rules(
            db=db,
            user_id=user_id,
            service_id=None,
            barber_id=barber_id,
            booking_date=booking_date,
            booking_time=start_time_business.time(),
            duration_minutes=SERVICES[service]["duration"],
            client_id=None
        )
        
        if not is_valid:
            raise ValueError(f"Booking violates business rules: {'; '.join(rule_violations)}")
        logger.info("✓ Business rules validated")
        
        # Step 7: Check for conflicts
        logger.info("Step 7: Checking for appointment conflicts...")
        import models
        from sqlalchemy import and_
        
        service_duration = SERVICES[service]["duration"]
        end_time_utc = start_time_utc + timedelta(minutes=service_duration)
        
        potential_conflicts = db.query(models.Appointment).filter(
            and_(
                models.Appointment.barber_id == barber_id,
                models.Appointment.status.in_(["scheduled", "confirmed", "pending"]),
                models.Appointment.start_time >= start_time_utc - timedelta(hours=1),
                models.Appointment.start_time <= start_time_utc + timedelta(hours=1)
            )
        ).all()
        
        logger.info(f"✓ Conflict check completed - found {len(potential_conflicts)} potential conflicts")
        
        # Check for actual conflicts
        existing = None
        for appointment in potential_conflicts:
            if appointment.start_time.tzinfo is None:
                appointment_start = pytz.UTC.localize(appointment.start_time)
            else:
                appointment_start = appointment.start_time
                
            appointment_end = appointment_start + timedelta(minutes=appointment.duration_minutes)
            
            if not (end_time_utc <= appointment_start or start_time_utc >= appointment_end):
                existing = appointment
                break
        
        if existing:
            raise ValueError("This time slot is already booked")
        logger.info("✓ No conflicts found")
        
        # Step 8: Create appointment record
        logger.info("Step 8: Creating appointment record...")
        appointment = models.Appointment(
            user_id=user_id,
            barber_id=barber_id,
            client_id=None,
            service_name=service,
            start_time=start_time_utc.replace(tzinfo=None),
            duration_minutes=SERVICES[service]["duration"],
            price=SERVICES[service]["price"],
            status="scheduled",
            notes="Debug test appointment"
        )
        
        db.add(appointment)
        logger.info("✓ Appointment record created (not committed yet)")
        
        # Step 9: Commit to database
        logger.info("Step 9: Committing to database...")
        db.commit()
        logger.info("✓ Database commit successful")
        
        # Step 10: Refresh appointment
        logger.info("Step 10: Refreshing appointment...")
        db.refresh(appointment)
        logger.info(f"✓ Appointment refreshed - ID: {appointment.id}")
        
        # Step 11: Test notification service (this might be where it hangs)
        logger.info("Step 11: Testing notification service...")
        try:
            notification_service = booking_service.get_notification_service()
            if notification_service:
                logger.info("✓ Notification service available (but not calling it)")
            else:
                logger.info("✓ Notification service not available")
        except Exception as e:
            logger.warning(f"⚠️ Notification service issue: {e}")
        
        db.close()
        logger.info(f"✅ Appointment creation test completed successfully - ID: {appointment.id}")
        return appointment.id
        
    except Exception as e:
        logger.error(f"❌ Appointment creation failed at step: {e}")
        return None

def cleanup_test_data():
    """Clean up test data"""
    logger.info("Cleaning up test data...")
    
    try:
        from db import get_db
        import models
        
        db = next(get_db())
        
        # Remove test appointments
        test_appointments = db.query(models.Appointment).filter(
            models.Appointment.notes == "Debug test appointment"
        ).all()
        
        for appointment in test_appointments:
            db.delete(appointment)
        
        # Remove test user
        test_user = db.query(models.User).filter(models.User.email == "debug_test@test.com").first()
        if test_user:
            db.delete(test_user)
        
        db.commit()
        logger.info(f"✓ Cleaned up {len(test_appointments)} test appointments and test user")
        
        db.close()
        
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")

def main():
    """Main debug function"""
    logger.info("🔍 Starting appointment creation debugging...")
    
    # Test 1: Imports
    if not test_imports():
        logger.error("❌ Import test failed - stopping")
        return
    
    # Test 2: Database connection
    if not test_database_connection():
        logger.error("❌ Database test failed - stopping")
        return
    
    # Test 3: Booking settings
    if not test_booking_settings():
        logger.error("❌ Booking settings test failed - stopping")
        return
    
    # Test 4: User creation
    user_id = test_user_creation()
    if not user_id:
        logger.error("❌ User creation test failed - stopping")
        return
    
    # Test 5: Appointment creation (step by step)
    appointment_id = test_appointment_creation_step_by_step(user_id)
    
    if appointment_id:
        logger.info("✅ All tests passed - appointment creation working")
    else:
        logger.error("❌ Appointment creation failed")
    
    # Cleanup
    cleanup_test_data()
    
    logger.info("🔍 Debugging completed")

if __name__ == "__main__":
    main()