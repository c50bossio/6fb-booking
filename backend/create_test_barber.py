#!/usr/bin/env python3

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import sqlite3
from datetime import datetime

def create_test_barber():
    try:
        # Connect to database
        conn = sqlite3.connect("6fb_booking.db")
        cursor = conn.cursor()

        # Check if barber exists
        cursor.execute("SELECT id FROM barbers WHERE email = ?", ("testbarber@6fb.com",))
        if cursor.fetchone():
            print("✅ Test barber already exists: testbarber@6fb.com")
            return

        # Insert test barber
        cursor.execute(
            """
            INSERT INTO barbers (
                email, first_name, last_name, business_name, phone, 
                is_active, is_verified, subscription_tier, 
                target_booking_capacity, hourly_rate, average_service_duration,
                monthly_revenue_goal, weekly_appointment_goal, average_ticket_goal,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                "testbarber@6fb.com", 
                "Test", 
                "Barber", 
                "Test Barbershop", 
                "555-123-4567",
                True, 
                True, 
                "premium",
                40, 
                45.0, 
                60,
                8000.0, 
                40, 
                200.0,
                datetime.utcnow().isoformat(),
                datetime.utcnow().isoformat()
            ),
        )

        barber_id = cursor.lastrowid

        # Create a basic payment model for the barber
        cursor.execute(
            """
            INSERT INTO barber_payment_models (
                barber_id, payment_type, service_commission_rate, product_commission_rate,
                booth_rent_amount, rent_frequency, rent_due_day, 
                auto_collect_rent, auto_pay_commissions, active,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                barber_id,
                "commission",  # PaymentModelType.COMMISSION
                0.30,  # 30% commission
                0.15,  # 15% product commission
                0.0,   # No booth rent
                "weekly",
                1,     # Monday
                True,
                True,
                True,
                datetime.utcnow().isoformat(),
                datetime.utcnow().isoformat()
            ),
        )

        conn.commit()
        conn.close()

        print("✅ Test barber created successfully!")
        print(f"Barber ID: {barber_id}")
        print("Name: Test Barber")
        print("Email: testbarber@6fb.com")
        print("Payment Type: Commission (30%)")

    except Exception as e:
        print(f"❌ Error creating test barber: {e}")

if __name__ == "__main__":
    create_test_barber()