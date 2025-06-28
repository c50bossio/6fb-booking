#!/usr/bin/env python3
"""
Add variety to calendar appointments - different clients, barbers, services
"""
import sqlite3
from datetime import datetime, timedelta, date
from pathlib import Path
import random


def add_variety_appointments():
    """Add more diverse appointments to the calendar"""

    db_path = Path("6fb_booking.db")
    if not db_path.exists():
        print("❌ Database file not found")
        return False

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        print("🎨 Adding variety to calendar appointments...")

        # Get all available barbers
        cursor.execute("SELECT id, first_name, last_name FROM barbers")
        barbers = cursor.fetchall()

        if not barbers:
            print("❌ No barbers found")
            return False

        # Get location
        cursor.execute("SELECT id FROM locations ORDER BY id LIMIT 1")
        location_id = cursor.fetchone()[0]

        # Use first barber as default for client requirements
        default_barber_id = barbers[0][0]

        # Create additional clients
        test_clients = [
            ("Michael", "Johnson", "michael.j@example.com", "555-0001"),
            ("Sarah", "Wilson", "sarah.w@example.com", "555-0002"),
            ("David", "Brown", "david.b@example.com", "555-0003"),
            ("Emily", "Davis", "emily.d@example.com", "555-0004"),
            ("James", "Miller", "james.m@example.com", "555-0005"),
        ]

        client_ids = []
        for first_name, last_name, email, phone in test_clients:
            # Check if client exists
            cursor.execute("SELECT id FROM clients WHERE email = ?", (email,))
            existing = cursor.fetchone()

            if existing:
                client_ids.append(existing[0])
            else:
                cursor.execute(
                    """
                    INSERT INTO clients (first_name, last_name, email, phone, barber_id, customer_type, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                    (first_name, last_name, email, phone, default_barber_id, "Regular"),
                )
                client_ids.append(cursor.lastrowid)

        print(f"✅ Created/found {len(client_ids)} test clients")

        # Service variations
        services = [
            ("Classic Haircut", 35.0, 30),
            ("Fade Cut", 45.0, 45),
            ("Beard Trim", 25.0, 20),
            ("Haircut + Beard", 60.0, 60),
            ("Hot Towel Shave", 40.0, 35),
        ]

        # Create varied appointments for the next 10 days
        appointments_created = 0
        today = date.today()

        for day_offset in range(1, 11):  # Next 10 days
            appointment_date = today + timedelta(days=day_offset)

            # Skip weekends occasionally
            if appointment_date.weekday() >= 5 and random.random() < 0.7:
                continue

            # Random number of appointments per day (1-4)
            daily_appointments = random.randint(1, 4)

            # Available time slots
            time_slots = [
                "09:00:00",
                "10:30:00",
                "12:00:00",
                "13:30:00",
                "15:00:00",
                "16:30:00",
            ]
            selected_times = random.sample(
                time_slots, min(daily_appointments, len(time_slots))
            )

            for appt_time in selected_times:
                if appointments_created >= 20:  # Limit total
                    break

                # Random selections
                barber = random.choice(barbers)
                client_id = random.choice(client_ids)
                service_name, service_price, service_duration = random.choice(services)

                # Random status and payment
                status_options = [
                    "confirmed",
                    "confirmed",
                    "confirmed",
                    "pending",
                    "completed",
                ]
                payment_options = ["paid", "paid", "pending", "pending"]

                status = random.choice(status_options)
                payment_status = random.choice(payment_options)

                # Add some completed appointments for past dates
                if appointment_date < today:
                    status = "completed"
                    payment_status = "paid"

                cursor.execute(
                    """
                    INSERT INTO appointments (
                        client_id, barber_id, appointment_date, appointment_time,
                        duration_minutes, service_revenue, service_name,
                        customer_type, status, payment_status,
                        barber_notes, tip_amount, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                    (
                        client_id,
                        barber[0],  # barber_id
                        appointment_date,
                        f"{appointment_date} {appt_time}",
                        service_duration,
                        service_price,
                        service_name,
                        random.choice(["New", "Returning", "Returning"]),
                        status,
                        payment_status,
                        f"Appointment with {barber[1]} {barber[2]}",
                        (
                            round(service_price * random.uniform(0.15, 0.25), 2)
                            if status == "completed"
                            else 0
                        ),
                    ),
                )

                appointments_created += 1

        conn.commit()
        print(f"✅ Added {appointments_created} varied appointments")

        # Show summary
        cursor.execute(
            """
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
            FROM appointments
        """
        )

        total, confirmed, pending, completed = cursor.fetchone()
        print(f"\n📊 Calendar Summary:")
        print(f"  Total appointments: {total}")
        print(f"  Confirmed: {confirmed}")
        print(f"  Pending: {pending}")
        print(f"  Completed: {completed}")

        # Show appointments by barber
        cursor.execute(
            """
            SELECT b.first_name, b.last_name, COUNT(*) as appointment_count
            FROM appointments a
            JOIN barbers b ON a.barber_id = b.id
            GROUP BY b.id, b.first_name, b.last_name
            ORDER BY appointment_count DESC
        """
        )

        print(f"\n👨‍💼 Appointments by Barber:")
        for barber_first, barber_last, count in cursor.fetchall():
            print(f"  {barber_first} {barber_last}: {count} appointments")

        print(f"\n🎉 Calendar now has diverse, realistic appointment data!")
        return True

    except Exception as e:
        print(f"❌ Error adding variety: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = add_variety_appointments()
    if not success:
        exit(1)
