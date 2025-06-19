#!/usr/bin/env python3
"""
Manual script to sync recent Trafft webhook data to appointments
"""
import sqlite3
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from config.database import SessionLocal
from services.trafft_sync_service import TrafftSyncService
import asyncio


async def sync_recent_webhooks():
    """Sync recent webhook data to appointments"""
    print("🔄 Starting manual Trafft webhook sync...")

    # Get webhook logs
    try:
        conn = sqlite3.connect("/tmp/trafft_webhooks.db")
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, timestamp, event_type, body_parsed
            FROM webhook_logs
            WHERE event_type = 'appointment.booked'
            ORDER BY timestamp DESC
            LIMIT 10
        """
        )
        webhooks = cursor.fetchall()
        conn.close()

        print(f"📋 Found {len(webhooks)} recent appointment webhooks")

        # Process each webhook
        db = SessionLocal()
        sync_service = TrafftSyncService(db)

        processed = 0
        for webhook_id, timestamp, event_type, body_parsed in webhooks:
            try:
                data = json.loads(body_parsed)
                print(
                    f"⚡ Processing webhook {webhook_id}: {data.get('customerFullName', 'Unknown')} - {data.get('appointmentStartDateTime', 'Unknown time')}"
                )

                result = await sync_service.process_appointment_webhook(data)
                print(f"   ✅ Result: {result.get('status', 'unknown')}")
                processed += 1

            except Exception as e:
                print(f"   ❌ Error processing webhook {webhook_id}: {e}")

        db.close()
        print(f"🎉 Successfully processed {processed} webhooks!")

    except Exception as e:
        print(f"❌ Error accessing webhook database: {e}")
        print(
            "💡 This means webhooks are being logged elsewhere or there's a configuration issue"
        )


if __name__ == "__main__":
    asyncio.run(sync_recent_webhooks())
