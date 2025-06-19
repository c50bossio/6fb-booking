#!/usr/bin/env python3
"""
Generate variety of errors for Sentry dashboard testing - simplified version
"""

import sentry_sdk
from datetime import datetime

# Initialize Sentry
sentry_sdk.init(
    dsn="https://b950bc02bf8c4f4f96f5c65e95b87e4d@sentry.io/4509526819012608",
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
    environment="testing",
    release="backend@error-variety-test"
)

print("🎭 Generating 5 different types of errors for Sentry dashboard...")

# 1. Database Connection Error
print("\n1️⃣ Generating Database Connection Error...")
try:
    raise ConnectionError("Could not connect to database: Connection refused (host=non-existent-host.com, port=5432)")
except Exception as e:
    event_id = sentry_sdk.capture_exception(e)
    print(f"   ✅ Database error captured: {event_id}")

# 2. API Rate Limit Error
print("\n2️⃣ Generating API Rate Limit Error...")
try:
    raise RuntimeError("API rate limit exceeded: 157/100 requests per hour")
except Exception as e:
    event_id = sentry_sdk.capture_exception(e)
    print(f"   ✅ Rate limit error captured: {event_id}")

# 3. JSON Parse Error
print("\n3️⃣ Generating JSON Parse Error...")
try:
    import json
    json.loads('{"invalid": json}')
except Exception as e:
    event_id = sentry_sdk.capture_exception(e)
    print(f"   ✅ JSON parse error captured: {event_id}")

# 4. Memory/Resource Error
print("\n4️⃣ Generating Memory/Resource Error...")
try:
    raise MemoryError("Unable to allocate 8GB for booking analytics processing")
except Exception as e:
    event_id = sentry_sdk.capture_exception(e)
    print(f"   ✅ Memory error captured: {event_id}")

# 5. Authentication/Permission Error
print("\n5️⃣ Generating Authentication Error...")
try:
    raise PermissionError("User user_12345 does not have permission to access admin_dashboard")
except Exception as e:
    event_id = sentry_sdk.capture_exception(e)
    print(f"   ✅ Authentication error captured: {event_id}")

print("\n✨ All 5 error types have been generated and sent to Sentry!")
print("🔗 Check your dashboard at: https://sentry.io/organizations/sixfb/issues/?project=4509526819012608")