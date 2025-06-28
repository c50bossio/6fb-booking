#!/usr/bin/env python3
"""
Quick calendar data population for 6FB booking system
Creates appointment data directly in SQLite to populate the calendar
"""
import sqlite3
import os
from datetime import datetime, timedelta, date, time
from pathlib import Path


def create_calendar_appointments():
    """Create appointments directly in SQLite for calendar testing"""

    # Connect to SQLite database
    db_path = Path("6fb_booking.db")
    if not db_path.exists():
        print("❌ Database file not found: 6fb_booking.db")
        return False

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        print("🗓️  Creating calendar appointment data...")

        # Check if we have basic data
        cursor.execute("SELECT COUNT(*) FROM locations")
        location_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM barbers")
        barber_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM services")
        service_count = cursor.fetchone()[0]

        print(
            f"Found: {location_count} locations, {barber_count} barbers, {service_count} services"
        )

        if location_count == 0 or barber_count == 0:
            print(
                "❌ Need at least 1 location and 1 barber. Run seed_booking_test_data.py first."
            )
            return False

        # Get existing data
        cursor.execute("SELECT id FROM locations ORDER BY id LIMIT 1")
        location_id = cursor.fetchone()[0]

        cursor.execute("SELECT id FROM barbers ORDER BY id LIMIT 1")
        barber_id = cursor.fetchone()[0]

        # Create a simple client if none exists
        cursor.execute("SELECT COUNT(*) FROM clients")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                INSERT INTO clients (first_name, last_name, email, phone, is_active, created_at, updated_at)
                VALUES ('John', 'Doe', 'john.doe@example.com', '555-0123', 1, datetime('now'), datetime('now'))
            """
            )
            print("✅ Created test client")

        cursor.execute("SELECT id FROM clients ORDER BY id LIMIT 1")
        client_id = cursor.fetchone()[0]

        # Service details (appointments table stores service info directly, not service_id)
        service_name = "Classic Haircut"
        service_price = 35.0
        service_duration = 30

        # Clear existing test appointments to avoid duplicates
        cursor.execute(
            "DELETE FROM appointments WHERE client_id = ? AND barber_id = ?",
            (client_id, barber_id),
        )

        # Create appointments for the next 7 days
        appointments_created = 0
        today = date.today()

        for day_offset in range(7):
            appointment_date = today + timedelta(days=day_offset)

            # Skip weekends
            if appointment_date.weekday() >= 5:
                continue

            # Create 2-3 appointments per day at different times
            appointment_times = ["09:00:00", "11:30:00", "14:00:00"]

            for i, appt_time in enumerate(appointment_times):
                if appointments_created >= 12:  # Limit total appointments
                    break

                # Insert appointment using the correct schema
                cursor.execute(
                    """
                    INSERT INTO appointments (
                        client_id, barber_id, appointment_date, appointment_time,
                        duration_minutes, service_revenue, service_name,
                        customer_type, status, payment_status,
                        barber_notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                    (
                        client_id,
                        barber_id,
                        appointment_date,
                        f"{appointment_date} {appt_time}",
                        service_duration,
                        service_price,
                        service_name,
                        "Returning" if appointments_created > 0 else "New",
                        "confirmed" if i < 2 else "pending",
                        "paid" if i == 0 else "pending",
                        f"Test appointment #{appointments_created + 1} for calendar",
                    ),
                )

                appointments_created += 1

        conn.commit()
        print(f"✅ Created {appointments_created} calendar appointments")

        # Display created appointments
        cursor.execute(
            """
            SELECT a.appointment_time, c.first_name, c.last_name, a.service_name, a.service_revenue, a.status
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.client_id = ? AND a.barber_id = ?
            ORDER BY a.appointment_time
        """,
            (client_id, barber_id),
        )

        appointments = cursor.fetchall()
        print(f"\n📅 Calendar Appointments Created:")
        for appt in appointments:
            appt_datetime, first_name, last_name, svc_name, price, status = appt
            print(
                f"  • {appt_datetime} - {first_name} {last_name} - {svc_name or 'Service'} (${price}) [{status}]"
            )

        print(f"\n🎉 Calendar is now populated with {len(appointments)} appointments!")
        print("🌐 Visit your frontend calendar to see the appointments")

        return True

    except Exception as e:
        print(f"❌ Error creating calendar data: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = create_calendar_appointments()
    if not success:
        exit(1)
