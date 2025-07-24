#!/usr/bin/env python3
"""
Test appointments endpoint to identify the 500 error
"""
import sys
import sqlite3
sys.path.append('.')

# Test direct database query
print("Testing database appointments query...")
try:
    conn = sqlite3.connect('6fb_booking.db')
    cursor = conn.cursor()
    
    # Test the query that the appointments endpoint probably uses
    cursor.execute("SELECT * FROM appointments LIMIT 5")
    results = cursor.fetchall()
    print(f"✅ Found {len(results)} appointments in database")
    
    for row in results:
        print(f"  - Appointment ID: {row[0]}, Service: {row[5]}, Start: {row[6]}")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Database query failed: {e}")

# Test appointments router import
print("\nTesting appointments router import...")
try:
    from routers.appointments import router
    print("✅ Appointments router imported successfully")
except Exception as e:
    print(f"❌ Router import failed: {e}")

# Test with FastAPI test client
print("\nTesting appointments endpoint with test client...")
try:
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    from routers import appointments
    
    app = FastAPI()
    app.include_router(appointments.router, prefix="/api/v2")
    
    client = TestClient(app)
    
    # This will likely fail due to auth, but we can see if it times out
    response = client.get("/api/v2/appointments/")
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text[:200]}")
    
except Exception as e:
    print(f"❌ Test client failed: {e}")