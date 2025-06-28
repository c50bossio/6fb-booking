#!/usr/bin/env python3
"""
Display summary of calendar appointments for 6FB booking system
"""
import sqlite3
from datetime import date, timedelta
from pathlib import Path


def show_calendar_summary():
    """Show a summary of calendar appointments"""

    db_path = Path("6fb_booking.db")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        print("📅 6FB BOOKING CALENDAR SUMMARY")
        print("=" * 50)

        today = date.today()
        week_ahead = today + timedelta(days=7)

        # Total appointments
        cursor.execute("SELECT COUNT(*) FROM appointments")
        total_count = cursor.fetchone()[0]
        print(f"🗓️  Total appointments in system: {total_count}")

        # Upcoming appointments (next 7 days)
        cursor.execute(
            """
            SELECT COUNT(*) FROM appointments
            WHERE appointment_date BETWEEN ? AND ?
        """,
            (today, week_ahead),
        )
        upcoming_count = cursor.fetchone()[0]
        print(f"📅 Upcoming appointments (next 7 days): {upcoming_count}")

        # Today's appointments
        cursor.execute(
            """
            SELECT COUNT(*) FROM appointments
            WHERE appointment_date = ?
        """,
            (today,),
        )
        today_count = cursor.fetchone()[0]
        print(f"🎯 Today's appointments: {today_count}")

        print("\n📋 APPOINTMENT STATUS BREAKDOWN")
        print("-" * 30)
        cursor.execute(
            """
            SELECT status, COUNT(*) as count
            FROM appointments
            WHERE appointment_date >= ?
            GROUP BY status
            ORDER BY count DESC
        """,
            (today,),
        )

        for status, count in cursor.fetchall():
            print(f"  {status.title()}: {count}")

        print("\n👥 UPCOMING APPOINTMENTS BY DAY")
        print("-" * 40)

        for day_offset in range(7):
            check_date = today + timedelta(days=day_offset)
            cursor.execute(
                """
                SELECT
                    a.appointment_time,
                    c.first_name,
                    c.last_name,
                    a.service_name,
                    b.first_name as barber_first,
                    b.last_name as barber_last,
                    a.status
                FROM appointments a
                JOIN clients c ON a.client_id = c.id
                JOIN barbers b ON a.barber_id = b.id
                WHERE appointment_date = ?
                ORDER BY a.appointment_time
            """,
                (check_date,),
            )

            appointments = cursor.fetchall()

            if appointments:
                day_name = check_date.strftime("%A, %B %d")
                print(f"\n📅 {day_name}:")
                for appt in appointments:
                    (
                        time_str,
                        client_first,
                        client_last,
                        service,
                        barber_first,
                        barber_last,
                        status,
                    ) = appt
                    time_part = (
                        time_str.split()[1][:5] if " " in time_str else time_str[:5]
                    )
                    print(
                        f"  {time_part} - {client_first} {client_last} | {service} | {barber_first} {barber_last} [{status}]"
                    )

        print("\n👨‍💼 BARBER WORKLOAD (Upcoming Week)")
        print("-" * 35)
        cursor.execute(
            """
            SELECT
                b.first_name,
                b.last_name,
                COUNT(*) as appointment_count
            FROM appointments a
            JOIN barbers b ON a.barber_id = b.id
            WHERE a.appointment_date BETWEEN ? AND ?
            GROUP BY b.id, b.first_name, b.last_name
            ORDER BY appointment_count DESC
        """,
            (today, week_ahead),
        )

        for barber_first, barber_last, count in cursor.fetchall():
            print(f"  {barber_first} {barber_last}: {count} appointments")

        print("\n💰 REVENUE SUMMARY (Upcoming Week)")
        print("-" * 30)
        cursor.execute(
            """
            SELECT
                SUM(service_revenue) as total_revenue,
                AVG(service_revenue) as avg_revenue,
                COUNT(*) as paid_count
            FROM appointments
            WHERE appointment_date BETWEEN ? AND ?
            AND service_revenue > 0
        """,
            (today, week_ahead),
        )

        total_rev, avg_rev, paid_count = cursor.fetchone()
        if total_rev:
            print(f"  Expected Revenue: ${total_rev:.2f}")
            print(f"  Average Ticket: ${avg_rev:.2f}")
            print(f"  Revenue Appointments: {paid_count}")

        print(f"\n🎉 Calendar is ready! You now have realistic appointment data")
        print(f"   spanning multiple days with various clients, barbers, and services.")
        print(f"\n🌐 Visit your frontend application to see the populated calendar!")

    except Exception as e:
        print(f"❌ Error displaying summary: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    show_calendar_summary()
