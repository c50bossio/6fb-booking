#!/usr/bin/env python3
"""
Debug the webhook flow to see where data processing stops
"""
import asyncio
import json
import sys
import traceback
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))


async def debug_webhook_processing():
    """Debug webhook processing step by step"""
    print("🔍 Debugging webhook processing flow...")

    # Test 1: Check if we can import the sync service
    print("\n1️⃣ Testing service imports...")
    try:
        from services.trafft_sync_service import TrafftSyncService

        print("✅ TrafftSyncService imported successfully")
    except Exception as e:
        print(f"❌ Failed to import TrafftSyncService: {e}")
        traceback.print_exc()
        return

    # Test 2: Check database connection
    print("\n2️⃣ Testing database connection...")
    try:
        from config.database import SessionLocal

        db = SessionLocal()
        print("✅ Database connection successful")
        db.close()
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        traceback.print_exc()
        return

    # Test 3: Test model imports
    print("\n3️⃣ Testing model imports...")
    try:
        from models.appointment import Appointment
        from models.client import Client
        from models.barber import Barber
        from models.location import Location

        print("✅ All models imported successfully")
    except Exception as e:
        print(f"❌ Model import failed: {e}")
        traceback.print_exc()
        return

    # Test 4: Create sync service and test processing
    print("\n4️⃣ Testing webhook processing...")
    try:
        db = SessionLocal()
        sync_service = TrafftSyncService(db)

        # Sample webhook data from your logs
        webhook_data = {
            "appointmentId": "TEST123",
            "appointmentStatus": "Approved",
            "appointmentStartDateTime": "June 21, 2025 12:45 pm",
            "appointmentEndDateTime": "June 21, 2025 1:15 pm",
            "appointmentPrice": "$30.00",
            "bookingUuid": "test-uuid-123",
            "customerFullName": "Test Customer",
            "customerFirstName": "Test",
            "customerLastName": "Customer",
            "customerEmail": "test@example.com",
            "customerPhone": "+1234567890",
            "employeeFullName": "Test Barber",
            "employeeFirstName": "Test",
            "employeeLastName": "Barber",
            "employeeEmail": "barber@test.com",
            "serviceName": "Haircut Only",
            "servicePrice": "$30.00",
            "locationName": "Test Location",
            "locationAddress": "123 Test St, Test City, FL",
        }

        print(f"   Processing test appointment: {webhook_data['customerFullName']}")
        result = await sync_service.process_appointment_webhook(webhook_data)
        print(f"✅ Processing result: {result}")

        db.close()

    except Exception as e:
        print(f"❌ Webhook processing failed: {e}")
        traceback.print_exc()

    # Test 5: Check if any appointments exist in database
    print("\n5️⃣ Checking database for appointments...")
    try:
        db = SessionLocal()
        appointments = db.query(Appointment).all()
        print(f"📊 Total appointments in database: {len(appointments)}")

        if appointments:
            print("📋 Recent appointments:")
            for apt in appointments[-3:]:
                print(
                    f"   • ID {apt.id}: {getattr(apt, 'client_name', 'Unknown')} - {apt.start_time}"
                )
                if hasattr(apt, "trafft_appointment_id") and apt.trafft_appointment_id:
                    print(f"     🔗 Trafft ID: {apt.trafft_appointment_id}")

        db.close()

    except Exception as e:
        print(f"❌ Database query failed: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(debug_webhook_processing())
