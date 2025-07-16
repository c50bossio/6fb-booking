#!/usr/bin/env python3
"""
Quick test appointments creation using correct database schema
"""

import sqlite3
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

DB_PATH = "6fb_booking.db"

def create_quick_test_appointments():
    """Create a few test appointments directly in database with correct schema"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get the admin user ID
        cursor.execute("SELECT id FROM users WHERE email = ?", ("admin.test@bookedbarber.com",))
        admin_user = cursor.fetchone()
        
        if not admin_user:
            print("❌ Admin user not found. Please run create_test_admin.py first.")
            return False
        
        admin_id = admin_user[0]
        
        # Check if we need to create a client first
        cursor.execute("SELECT id FROM clients LIMIT 1")
        existing_client = cursor.fetchone()
        
        if not existing_client:
            # Create a test client
            cursor.execute("""
                INSERT INTO clients (first_name, last_name, email, phone, notes, created_by_id, created_at, is_test_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "Test",
                "Client",
                "test.client@example.com", 
                "+1234567890",
                "Test client for drag and drop demo",
                admin_id,
                datetime.now(),
                True
            ))
            client_id = cursor.lastrowid
            print(f"✅ Created test client with ID: {client_id}")
        else:
            client_id = existing_client[0]
            print(f"✅ Using existing client ID: {client_id}")
        
        # Clear existing test appointments
        cursor.execute("DELETE FROM appointments WHERE is_test_data = 1")
        print("🗑️ Cleared existing test appointments")
        
        # Create a few test appointments in the future
        base_time = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
        # Ensure all appointments are in the future
        if base_time <= datetime.now():
            base_time = base_time + timedelta(days=1)  # Move to tomorrow
        
        appointments_created = 0
        
        test_appointments = [
            {
                "service_name": "Haircut",
                "duration": 60,
                "price": 45.0,
                "time_offset_hours": 2,  # Future time
                "notes": "Test appointment for drag and drop demo #1"
            },
            {
                "service_name": "Shave", 
                "duration": 30,
                "price": 25.0,
                "time_offset_hours": 4,  # Future time
                "notes": "Test appointment for drag and drop demo #2"
            },
            {
                "service_name": "Haircut & Shave",
                "duration": 90, 
                "price": 65.0,
                "time_offset_hours": 26,  # Day after tomorrow
                "notes": "Test appointment for drag and drop demo #3"
            }
        ]
        
        for i, appt in enumerate(test_appointments):
            start_time = base_time + timedelta(hours=appt["time_offset_hours"])
            
            cursor.execute("""
                INSERT INTO appointments (
                    user_id, barber_id, client_id, service_name, start_time,
                    duration_minutes, price, status, notes, created_at, is_test_data, version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                admin_id,           # user_id
                admin_id,           # barber_id (admin is also the barber)
                client_id,          # client_id
                appt["service_name"], # service_name
                start_time,         # start_time
                appt["duration"],   # duration_minutes
                appt["price"],      # price
                "confirmed",        # status
                appt["notes"],      # notes
                datetime.now(),     # created_at
                True,               # is_test_data
                1                   # version
            ))
            appointments_created += 1
            print(f"✅ Created appointment: {appt['service_name']} at {start_time.strftime('%Y-%m-%d %H:%M')}")
        
        conn.commit()
        print(f"\n🎉 Successfully created {appointments_created} test appointments!")
        print("\n📋 Test appointments created:")
        
        # List the created appointments
        cursor.execute("""
            SELECT id, service_name, start_time, duration_minutes, price, notes
            FROM appointments 
            WHERE is_test_data = 1
            ORDER BY start_time
        """)
        
        for row in cursor.fetchall():
            appt_id, service, start_time, duration, price, notes = row
            start_dt = datetime.fromisoformat(start_time)
            print(f"  ID {appt_id}: {service} - {start_dt.strftime('%Y-%m-%d %H:%M')} ({duration}min, ${price})")
        
        print(f"\n🎯 You can now test drag & drop on the calendar!")
        print(f"   Navigate to http://localhost:3000/calendar")
        print(f"   Try dragging the appointments to different time slots")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating test appointments: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    create_quick_test_appointments()