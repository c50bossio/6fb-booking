#!/usr/bin/env python3
"""
Test script for "Any Professional" booking functionality
"""

import json
from datetime import date, time, datetime

# Test data for "Any Professional" booking
test_booking_any_professional = {
    "barber_id": None,  # null for "Any Professional"
    "location_id": 1,
    "service_id": 1,
    "appointment_date": "2025-01-15",
    "appointment_time": "10:00:00",
    "client_first_name": "Test",
    "client_last_name": "Client",
    "client_email": "test@example.com",
    "client_phone": "1234567890",
    "notes": "Testing Any Professional booking",
    "timezone": "America/New_York"
}

# Test data for specific barber booking
test_booking_specific_barber = {
    "barber_id": 1,
    "service_id": 1,
    "appointment_date": "2025-01-15",
    "appointment_time": "14:00:00",
    "client_first_name": "Test",
    "client_last_name": "Client2",
    "client_email": "test2@example.com",
    "client_phone": "0987654321",
    "notes": "Testing specific barber booking",
    "timezone": "America/New_York"
}

print("Test data for 'Any Professional' booking:")
print(json.dumps(test_booking_any_professional, indent=2))
print("\nTest data for specific barber booking:")
print(json.dumps(test_booking_specific_barber, indent=2))

# To test with curl:
print("\n\n# Test 'Any Professional' booking with curl:")
print("curl -X POST http://localhost:8000/api/public/bookings/create \\")
print("  -H 'Content-Type: application/json' \\")
print(f"  -d '{json.dumps(test_booking_any_professional)}'")

print("\n\n# Test specific barber booking with curl:")
print("curl -X POST http://localhost:8000/api/public/bookings/create \\")
print("  -H 'Content-Type: application/json' \\")
print(f"  -d '{json.dumps(test_booking_specific_barber)}'")

print("\n\n# Get 'Any Professional' availability:")
print("curl -X GET 'http://localhost:8000/api/public/locations/1/any-professional-availability?service_id=1&date=2025-01-15'")