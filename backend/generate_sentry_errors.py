#!/usr/bin/env python3
"""
Generate variety of errors for Sentry dashboard testing
"""

import sentry_sdk
import time
import random
import json
from datetime import datetime

# Initialize Sentry
sentry_sdk.init(
    dsn="https://b950bc02bf8c4f4f96f5c65e95b87e4d@sentry.io/4509526819012608",
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
    environment="testing",
    release="backend@error-variety-test",
)

print("🎭 Generating 5 different types of errors for Sentry dashboard...")

# 1. Database Connection Error
print("\n1️⃣ Generating Database Connection Error...")
try:
    # Simulate a database connection error
    class DatabaseConnectionError(Exception):
        pass

    sentry_sdk.set_context(
        "database",
        {
            "host": "non-existent-host.com",
            "database": "ghost_database",
            "connection_attempt": "Failed",
            "port": 5432,
        },
    )
    raise DatabaseConnectionError(
        "Could not connect to database: Connection refused (host=non-existent-host.com, port=5432)"
    )
except Exception as e:
    sentry_sdk.capture_exception(e)
    print("   ✅ Database error captured")

time.sleep(1)

# 2. API Rate Limit Error
print("\n2️⃣ Generating API Rate Limit Error...")


class RateLimitExceeded(Exception):
    pass


try:
    sentry_sdk.set_tag("error_type", "rate_limit")
    sentry_sdk.set_context(
        "api",
        {
            "endpoint": "/api/v1/bookings",
            "rate_limit": "100/hour",
            "current_usage": "157",
            "reset_time": datetime.now().isoformat(),
        },
    )
    raise RateLimitExceeded("API rate limit exceeded: 157/100 requests per hour")
except RateLimitExceeded as e:
    sentry_sdk.capture_exception(e)
    print("   ✅ Rate limit error captured")

time.sleep(1)

# 3. JSON Parse Error
print("\n3️⃣ Generating JSON Parse Error...")
try:
    invalid_json = (
        '{"name": "John", "age": 30, "city": "New York"'  # Missing closing brace
    )
    sentry_sdk.add_breadcrumb(
        message="Attempting to parse booking data",
        category="json",
        level="info",
        data={"raw_input": invalid_json},
    )
    parsed = json.loads(invalid_json)
except json.JSONDecodeError as e:
    sentry_sdk.set_context(
        "parsing",
        {
            "input_type": "booking_data",
            "input_length": len(invalid_json),
            "error_position": e.pos,
        },
    )
    sentry_sdk.capture_exception(e)
    print("   ✅ JSON parse error captured")

time.sleep(1)

# 4. Memory/Resource Error
print("\n4️⃣ Generating Memory/Resource Error...")
try:
    sentry_sdk.set_tag("resource_type", "memory")
    sentry_sdk.add_breadcrumb(
        message="Starting large data processing", category="memory", level="warning"
    )
    # Simulate memory error
    huge_list = []
    for i in range(1000000):
        huge_list.append([0] * 1000000)  # This would actually cause MemoryError
except:
    # Since we can't actually create a MemoryError easily, we'll simulate it
    memory_error = MemoryError(
        "Unable to allocate 8GB for booking analytics processing"
    )
    sentry_sdk.set_context(
        "system",
        {
            "available_memory": "512MB",
            "requested_memory": "8GB",
            "process": "booking_analytics",
        },
    )
    sentry_sdk.capture_exception(memory_error)
    print("   ✅ Memory error captured")

time.sleep(1)

# 5. Authentication/Permission Error
print("\n5️⃣ Generating Authentication Error...")


class UnauthorizedAccessError(Exception):
    pass


try:
    user_id = "user_12345"
    resource = "admin_dashboard"
    sentry_sdk.set_user(
        {
            "id": user_id,
            "username": "john.doe@example.com",
            "ip_address": "192.168.1.42",
        }
    )
    sentry_sdk.set_context(
        "auth",
        {
            "attempted_resource": resource,
            "user_role": "standard_user",
            "required_role": "admin",
            "auth_method": "JWT",
        },
    )
    sentry_sdk.add_breadcrumb(
        message=f"User {user_id} attempted to access {resource}",
        category="auth",
        level="warning",
    )
    raise UnauthorizedAccessError(
        f"User {user_id} does not have permission to access {resource}"
    )
except UnauthorizedAccessError as e:
    sentry_sdk.capture_exception(e)
    print("   ✅ Authentication error captured")

print("\n✨ All 5 error types have been generated and sent to Sentry!")
print(
    "🔗 Check your dashboard at: https://sentry.io/organizations/sixfb/issues/?project=4509526819012608"
)
