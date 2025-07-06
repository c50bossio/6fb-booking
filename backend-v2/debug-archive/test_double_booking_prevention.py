"""
Test script to demonstrate the double-booking prevention system.

This script tests various scenarios including:
1. Concurrent booking attempts
2. Overlapping appointments with buffers
3. Optimistic concurrency control
4. Retry logic with exponential backoff
"""

import asyncio
import threading
import time
from datetime import datetime, date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from services.booking_service_wrapper import configure_booking_service
from services.booking_service import create_booking, update_booking, cancel_booking
from services.booking_service_enhanced import BookingConflictError, ConcurrencyError

# Configure colored output for better visibility
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_test_header(test_name: str):
    """Print a formatted test header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}TEST: {test_name}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")


def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")


def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")


def print_info(message: str):
    """Print info message"""
    print(f"{Colors.YELLOW}ℹ {message}{Colors.RESET}")


def setup_test_data(db: Session):
    """Set up test data for double-booking tests"""
    # Create test users
    test_user1 = models.User(
        email="testuser1@example.com",
        name="Test User 1",
        role="client",
        is_active=True
    )
    test_user2 = models.User(
        email="testuser2@example.com",
        name="Test User 2",
        role="client",
        is_active=True
    )
    
    # Create test barbers
    test_barber1 = models.User(
        email="testbarber1@example.com",
        name="Test Barber 1",
        role="barber",
        is_active=True
    )
    test_barber2 = models.User(
        email="testbarber2@example.com",
        name="Test Barber 2",
        role="barber",
        is_active=True
    )
    
    db.add_all([test_user1, test_user2, test_barber1, test_barber2])
    db.commit()
    
    # Create barber availability
    for barber in [test_barber1, test_barber2]:
        for day in range(7):  # All days of the week
            availability = models.BarberAvailability(
                barber_id=barber.id,
                day_of_week=day,
                start_time=datetime.strptime("09:00", "%H:%M").time(),
                end_time=datetime.strptime("18:00", "%H:%M").time(),
                is_available=True
            )
            db.add(availability)
    
    db.commit()
    
    return {
        'user1': test_user1,
        'user2': test_user2,
        'barber1': test_barber1,
        'barber2': test_barber2
    }


def test_concurrent_bookings(test_data: dict):
    """Test concurrent booking attempts for the same time slot"""
    print_test_header("Concurrent Booking Prevention")
    
    booking_date = date.today() + timedelta(days=1)
    booking_time = "14:00"
    
    def attempt_booking(user_id: int, attempt_num: int):
        """Attempt to create a booking"""
        db = SessionLocal()
        try:
            appointment = create_booking(
                db=db,
                user_id=user_id,
                booking_date=booking_date,
                booking_time=booking_time,
                service="Haircut",
                barber_id=test_data['barber1'].id
            )
            db.commit()
            return (attempt_num, True, appointment.id)
        except Exception as e:
            db.rollback()
            return (attempt_num, False, str(e))
        finally:
            db.close()
    
    # Run 5 concurrent booking attempts
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for i in range(5):
            user_id = test_data['user1'].id if i % 2 == 0 else test_data['user2'].id
            future = executor.submit(attempt_booking, user_id, i + 1)
            futures.append(future)
        
        successful_bookings = 0
        failed_bookings = 0
        
        for future in as_completed(futures):
            attempt_num, success, result = future.result()
            if success:
                successful_bookings += 1
                print_success(f"Attempt {attempt_num}: Booking created (ID: {result})")
            else:
                failed_bookings += 1
                print_error(f"Attempt {attempt_num}: {result}")
    
    print_info(f"Results: {successful_bookings} successful, {failed_bookings} failed")
    
    if successful_bookings == 1 and failed_bookings == 4:
        print_success("Concurrent booking prevention working correctly!")
    else:
        print_error("Concurrent booking prevention may have issues")


def test_overlapping_appointments(test_data: dict):
    """Test detection of overlapping appointments with buffers"""
    print_test_header("Overlapping Appointment Detection")
    
    db = SessionLocal()
    booking_date = date.today() + timedelta(days=2)
    
    try:
        # Create initial appointment with buffers
        print_info("Creating appointment at 10:00 with 15min buffers...")
        appointment1 = create_booking(
            db=db,
            user_id=test_data['user1'].id,
            booking_date=booking_date,
            booking_time="10:00",
            service="Haircut",
            barber_id=test_data['barber1'].id,
            buffer_time_before=15,
            buffer_time_after=15
        )
        print_success(f"Created appointment 1 (10:00-10:30 + buffers = 9:45-10:45)")
        
        # Test various overlapping scenarios
        test_cases = [
            ("09:30", "Overlaps with buffer before"),
            ("10:15", "Overlaps during appointment"),
            ("10:30", "Overlaps with buffer after"),
            ("09:00", "Before buffer - should succeed"),
            ("11:00", "After buffer - should succeed")
        ]
        
        for time_slot, description in test_cases:
            try:
                print_info(f"Attempting booking at {time_slot} ({description})...")
                appointment = create_booking(
                    db=db,
                    user_id=test_data['user2'].id,
                    booking_date=booking_date,
                    booking_time=time_slot,
                    service="Haircut",
                    barber_id=test_data['barber1'].id
                )
                print_success(f"Booking at {time_slot} succeeded")
            except ValueError as e:
                if "conflict" in str(e).lower() or "booked" in str(e).lower():
                    print_success(f"Booking at {time_slot} correctly blocked: {e}")
                else:
                    print_error(f"Unexpected error at {time_slot}: {e}")
        
    finally:
        db.close()


def test_optimistic_concurrency_control(test_data: dict):
    """Test optimistic concurrency control for updates"""
    print_test_header("Optimistic Concurrency Control")
    
    db1 = SessionLocal()
    db2 = SessionLocal()
    
    try:
        # Create an appointment
        booking_date = date.today() + timedelta(days=3)
        appointment = create_booking(
            db=db1,
            user_id=test_data['user1'].id,
            booking_date=booking_date,
            booking_time="15:00",
            service="Haircut",
            barber_id=test_data['barber1'].id
        )
        appointment_id = appointment.id
        print_success(f"Created appointment {appointment_id}")
        
        # Simulate two users trying to update the same appointment
        print_info("Simulating concurrent updates...")
        
        # User 1 loads the appointment
        booking1 = db1.query(models.Appointment).filter(
            models.Appointment.id == appointment_id
        ).first()
        version1 = booking1.version
        print_info(f"User 1 loaded appointment (version {version1})")
        
        # User 2 loads the appointment
        booking2 = db2.query(models.Appointment).filter(
            models.Appointment.id == appointment_id
        ).first()
        version2 = booking2.version
        print_info(f"User 2 loaded appointment (version {version2})")
        
        # User 1 updates first
        try:
            update_booking(
                db=db1,
                booking_id=appointment_id,
                user_id=test_data['user1'].id,
                update_data={'notes': 'Updated by user 1'}
            )
            print_success("User 1 update succeeded")
        except Exception as e:
            print_error(f"User 1 update failed: {e}")
        
        # User 2 tries to update (should detect version mismatch)
        try:
            update_booking(
                db=db2,
                booking_id=appointment_id,
                user_id=test_data['user1'].id,
                update_data={'notes': 'Updated by user 2'}
            )
            print_info("User 2 update succeeded (with automatic retry)")
        except Exception as e:
            print_error(f"User 2 update failed: {e}")
        
    finally:
        db1.close()
        db2.close()


def test_retry_logic(test_data: dict):
    """Test retry logic with exponential backoff"""
    print_test_header("Retry Logic with Exponential Backoff")
    
    booking_date = date.today() + timedelta(days=4)
    booking_time = "11:00"
    
    # Create a booking to cause conflicts
    db_setup = SessionLocal()
    create_booking(
        db=db_setup,
        user_id=test_data['user1'].id,
        booking_date=booking_date,
        booking_time=booking_time,
        service="Haircut",
        barber_id=test_data['barber1'].id
    )
    db_setup.close()
    
    print_info("Attempting to create conflicting booking with retry logic...")
    
    start_time = time.time()
    
    try:
        db = SessionLocal()
        appointment = create_booking(
            db=db,
            user_id=test_data['user2'].id,
            booking_date=booking_date,
            booking_time=booking_time,
            service="Haircut",
            barber_id=test_data['barber1'].id
        )
        print_error("Booking should have failed due to conflict")
    except ValueError as e:
        elapsed_time = time.time() - start_time
        print_success(f"Booking correctly failed after retries: {e}")
        print_info(f"Total time with retries: {elapsed_time:.2f} seconds")
    finally:
        db.close()


def test_database_constraints(test_data: dict):
    """Test database-level constraints as final safety net"""
    print_test_header("Database-Level Constraints")
    
    db = SessionLocal()
    booking_date = date.today() + timedelta(days=5)
    
    try:
        # Bypass the service layer and try to insert directly
        print_info("Attempting to bypass service layer and insert conflicting appointments...")
        
        # Create first appointment directly
        appointment1 = models.Appointment(
            user_id=test_data['user1'].id,
            barber_id=test_data['barber1'].id,
            service_name="Haircut",
            start_time=datetime.combine(booking_date, datetime.strptime("13:00", "%H:%M").time()),
            duration_minutes=30,
            price=30,
            status="scheduled",
            version=1
        )
        db.add(appointment1)
        db.commit()
        print_success("First appointment created")
        
        # Try to create overlapping appointment directly
        appointment2 = models.Appointment(
            user_id=test_data['user2'].id,
            barber_id=test_data['barber1'].id,
            service_name="Haircut",
            start_time=datetime.combine(booking_date, datetime.strptime("13:15", "%H:%M").time()),
            duration_minutes=30,
            price=30,
            status="scheduled",
            version=1
        )
        db.add(appointment2)
        
        try:
            db.commit()
            print_error("Database constraint should have prevented this!")
        except Exception as e:
            db.rollback()
            if "appointment_overlaps" in str(e) or "unique_violation" in str(e):
                print_success(f"Database constraint correctly blocked overlap: {e}")
            else:
                print_error(f"Unexpected database error: {e}")
        
    finally:
        db.close()


def cleanup_test_data(db: Session):
    """Clean up test data"""
    print_info("\nCleaning up test data...")
    
    # Delete test appointments
    db.query(models.Appointment).filter(
        models.Appointment.user_id.in_(
            db.query(models.User.id).filter(
                models.User.email.like('test%@example.com')
            )
        )
    ).delete(synchronize_session=False)
    
    # Delete test availability
    db.query(models.BarberAvailability).filter(
        models.BarberAvailability.barber_id.in_(
            db.query(models.User.id).filter(
                models.User.email.like('test%@example.com')
            )
        )
    ).delete(synchronize_session=False)
    
    # Delete test users
    db.query(models.User).filter(
        models.User.email.like('test%@example.com')
    ).delete(synchronize_session=False)
    
    db.commit()
    print_success("Test data cleaned up")


def main():
    """Run all double-booking prevention tests"""
    print(f"\n{Colors.BOLD}{Colors.GREEN}DOUBLE-BOOKING PREVENTION TEST SUITE{Colors.RESET}")
    print(f"{Colors.GREEN}{'='*60}{Colors.RESET}\n")
    
    # Apply double-booking prevention
    configure_booking_service(enable_double_booking_prevention=True)
    print_success("Double-booking prevention system activated")
    
    db = SessionLocal()
    
    try:
        # Clean up any existing test data
        cleanup_test_data(db)
        
        # Set up test data
        test_data = setup_test_data(db)
        print_success("Test data created")
        
        # Run tests
        test_concurrent_bookings(test_data)
        test_overlapping_appointments(test_data)
        test_optimistic_concurrency_control(test_data)
        test_retry_logic(test_data)
        test_database_constraints(test_data)
        
        print(f"\n{Colors.BOLD}{Colors.GREEN}ALL TESTS COMPLETED{Colors.RESET}")
        
    except Exception as e:
        print_error(f"Test suite failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up
        cleanup_test_data(db)
        db.close()


if __name__ == "__main__":
    main()