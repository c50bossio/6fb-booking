"""
Test script to demonstrate the comprehensive booking validation system.

Run with: python test_booking_validation.py
"""

import sys
from datetime import date, datetime, time, timedelta
from pydantic import ValidationError
import pytz

# Add the backend directory to the path
sys.path.append('.')

from schemas_new.booking_validation import (
    EnhancedAppointmentCreate,
    AppointmentUpdate,
    GuestInfoValidation,
    BusinessHoursValidation,
    DateValidation,
    TimeSlotValidation,
    get_user_friendly_error
)


def test_guest_info_validation():
    """Test guest information validation and sanitization"""
    print("\n=== Testing Guest Info Validation ===")
    
    # Test 1: Valid guest info
    try:
        guest = GuestInfoValidation(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+1 (555) 123-4567"
        )
        print(f"✓ Valid guest info: {guest.first_name} {guest.last_name}")
        print(f"  Email: {guest.email}")
        print(f"  Phone: {guest.phone}")
    except ValidationError as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test 2: Names with special characters (should be sanitized)
    try:
        guest = GuestInfoValidation(
            first_name="John123<script>",
            last_name="O'Connor-Smith",
            email="john@example.com"
        )
        print(f"✓ Sanitized name: {guest.first_name} {guest.last_name}")
    except ValidationError as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Invalid email (disposable)
    try:
        guest = GuestInfoValidation(
            first_name="Test",
            last_name="User",
            email="test@tempmail.com"
        )
        print(f"✗ Should have rejected disposable email")
    except ValidationError as e:
        print(f"✓ Correctly rejected disposable email: {e.errors()[0]['msg']}")
    
    # Test 4: Invalid phone number
    try:
        guest = GuestInfoValidation(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            phone="123"  # Too short
        )
        print(f"✗ Should have rejected invalid phone")
    except ValidationError as e:
        print(f"✓ Correctly rejected invalid phone: {e.errors()[0]['msg']}")


def test_date_validation():
    """Test date validation rules"""
    print("\n=== Testing Date Validation ===")
    
    # Test 1: Valid future date
    try:
        tomorrow = date.today() + timedelta(days=1)
        date_val = DateValidation(date=tomorrow, timezone="America/New_York")
        print(f"✓ Valid future date: {date_val.date}")
    except ValidationError as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test 2: Past date (should fail)
    try:
        yesterday = date.today() - timedelta(days=1)
        date_val = DateValidation(date=yesterday)
        print(f"✗ Should have rejected past date")
    except ValidationError as e:
        print(f"✓ Correctly rejected past date: {e.errors()[0]['msg']}")
    
    # Test 3: Too far in future (should fail)
    try:
        far_future = date.today() + timedelta(days=400)
        date_val = DateValidation(date=far_future)
        print(f"✗ Should have rejected date too far in future")
    except ValidationError as e:
        print(f"✓ Correctly rejected far future date: {e.errors()[0]['msg']}")


def test_time_slot_validation():
    """Test time slot validation"""
    print("\n=== Testing Time Slot Validation ===")
    
    # Test 1: Valid time on 15-minute increment
    try:
        time_val = TimeSlotValidation(time="14:30")
        print(f"✓ Valid time slot: {time_val.time}")
    except ValidationError as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test 2: Invalid increment (should fail)
    try:
        time_val = TimeSlotValidation(time="14:37")
        print(f"✗ Should have rejected invalid increment")
    except ValidationError as e:
        print(f"✓ Correctly rejected invalid increment: {e.errors()[0]['msg']}")
    
    # Test 3: Outside business hours
    try:
        business_hours = BusinessHoursValidation(
            start_time=time(9, 0),
            end_time=time(17, 0)
        )
        time_val = TimeSlotValidation(
            time="18:00",
            business_hours=business_hours
        )
        print(f"✗ Should have rejected time outside business hours")
    except ValidationError as e:
        print(f"✓ Correctly rejected outside hours: {e.errors()[0]['msg']}")


def test_full_appointment_validation():
    """Test complete appointment creation validation"""
    print("\n=== Testing Full Appointment Creation ===")
    
    # Test 1: Valid appointment
    try:
        tomorrow = date.today() + timedelta(days=1)
        appointment = EnhancedAppointmentCreate(
            date=tomorrow,
            time="14:30",
            timezone="America/New_York",
            service_name="Premium Haircut",
            duration_minutes=45,
            guest_info=GuestInfoValidation(
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                phone="+1 555 123 4567"
            ),
            notes="First time client, prefers scissors",
            price=50.00
        )
        print(f"✓ Valid appointment for {appointment.date} at {appointment.time}")
        print(f"  Service: {appointment.service_name}")
        print(f"  Guest: {appointment.guest_info.first_name} {appointment.guest_info.last_name}")
        print(f"  Notes: {appointment.notes}")
    except ValidationError as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test 2: Missing service information
    try:
        tomorrow = date.today() + timedelta(days=1)
        appointment = EnhancedAppointmentCreate(
            date=tomorrow,
            time="14:30",
            # No service_id or service_name
            guest_info=GuestInfoValidation(
                first_name="John",
                last_name="Doe",
                email="john@example.com"
            )
        )
        print(f"✗ Should have required service information")
    except ValidationError as e:
        print(f"✓ Correctly required service: {e.errors()[0]['msg']}")
    
    # Test 3: Same-day booking too soon
    try:
        now = datetime.now(pytz.UTC)
        appointment = EnhancedAppointmentCreate(
            date=now.date(),
            time=now.strftime("%H:%M"),  # Current time
            timezone="UTC",
            service_name="Haircut",
            guest_info=GuestInfoValidation(
                first_name="Rush",
                last_name="Client",
                email="rush@example.com"
            )
        )
        print(f"✗ Should have rejected same-day booking with insufficient lead time")
    except ValidationError as e:
        print(f"✓ Correctly rejected rushed booking: {e.errors()[0]['msg']}")
    
    # Test 4: Notes sanitization
    try:
        tomorrow = date.today() + timedelta(days=1)
        appointment = EnhancedAppointmentCreate(
            date=tomorrow,
            time="14:30",
            service_name="Haircut",
            guest_info=GuestInfoValidation(
                first_name="Test",
                last_name="User",
                email="test@example.com"
            ),
            notes="<script>alert('xss')</script>Regular notes here"
        )
        print(f"✓ Sanitized notes: {appointment.notes}")
    except ValidationError as e:
        print(f"✗ Unexpected error: {e}")


def test_appointment_update():
    """Test appointment update validation"""
    print("\n=== Testing Appointment Update ===")
    
    # Test 1: Valid update
    try:
        next_week = date.today() + timedelta(days=7)
        update = AppointmentUpdate(
            date=next_week,
            time="15:00",
            notes="Rescheduled due to conflict"
        )
        print(f"✓ Valid update to {update.date} at {update.time}")
    except ValidationError as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test 2: Partial update (only time)
    try:
        update = AppointmentUpdate(
            time="16:30"
        )
        print(f"✓ Valid time-only update to {update.time}")
    except ValidationError as e:
        print(f"✗ Unexpected error: {e}")
    
    # Test 3: Invalid status
    try:
        update = AppointmentUpdate(
            status="invalid_status"
        )
        print(f"✗ Should have rejected invalid status")
    except ValidationError as e:
        print(f"✓ Correctly rejected invalid status: {e.errors()[0]['msg']}")


def test_error_messages():
    """Test user-friendly error messages"""
    print("\n=== Testing User-Friendly Error Messages ===")
    
    test_errors = [
        "date_past validation failed",
        "time_invalid format error",
        "phone_invalid number",
        "notes_too_long exceeded limit",
        "business_hours outside range"
    ]
    
    for error in test_errors:
        friendly = get_user_friendly_error(error)
        print(f"Technical: '{error}'")
        print(f"Friendly:  '{friendly}'")
        print()


def main():
    """Run all validation tests"""
    print("BookedBarber Booking Validation System Test")
    print("=" * 50)
    
    test_guest_info_validation()
    test_date_validation()
    test_time_slot_validation()
    test_full_appointment_validation()
    test_appointment_update()
    test_error_messages()
    
    print("\n" + "=" * 50)
    print("All validation tests completed!")
    print("\nKey Features Demonstrated:")
    print("✓ Input sanitization (XSS prevention)")
    print("✓ Date/time validation with timezone support")
    print("✓ Business hours enforcement")
    print("✓ Phone number formatting and validation")
    print("✓ Email validation with disposable email detection")
    print("✓ Time slot increment validation")
    print("✓ Booking window constraints")
    print("✓ User-friendly error messages")


if __name__ == "__main__":
    main()