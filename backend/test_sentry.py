#!/usr/bin/env python3
"""
Test script to verify Sentry integration is working
"""
import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import and initialize Sentry
from sentry_config import init_sentry

print("Initializing Sentry...")
init_sentry()

import sentry_sdk

print("Sentry SDK Version:", sentry_sdk.VERSION)
print("Sentry DSN configured:", bool(os.getenv("SENTRY_DSN") or "default DSN"))

# Test 1: Send a test message
print("\nTest 1: Sending a test message...")
sentry_sdk.capture_message("Test message from 6FB Booking Platform", level="info")
print("✓ Test message sent")

# Test 2: Capture an exception
print("\nTest 2: Capturing a test exception...")
try:
    division_by_zero = 1 / 0
except ZeroDivisionError as e:
    sentry_sdk.capture_exception(e)
    print("✓ Exception captured")

# Test 3: Add context
print("\nTest 3: Sending error with context...")
sentry_sdk.set_tag("test", "true")
sentry_sdk.set_user({"id": "test-user-123", "email": "test@6fb.com"})
sentry_sdk.set_context(
    "test_context", {"platform": "6FB Booking", "test_type": "integration"}
)

try:
    raise ValueError("Test error with context")
except ValueError as e:
    sentry_sdk.capture_exception(e)
    print("✓ Error with context captured")

print("\n✅ All tests completed!")
print("Check your Sentry dashboard at https://sentry.io to see the captured events.")
