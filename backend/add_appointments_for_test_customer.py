#!/usr/bin/env python3
"""
Add appointments for the API test customer
"""

import sqlite3
import logging
from datetime import datetime, timedelta, date, time
from pathlib import Path
import random

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_test_appointments():
    """Add test appointments for API test customer"""

    db_path = Path("6fb_booking.db")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Get the API test customer
    cursor.execute(
        "SELECT id FROM customers WHERE email = ?", ("api_test_customer@example.com",)
    )
    customer_result = cursor.fetchone()

    if not customer_result:
        logger.error("API test customer not found")
        return False

    customer_id = customer_result[0]

    # Get a client ID to use
    cursor.execute("SELECT id FROM clients ORDER BY id LIMIT 1")
    client_result = cursor.fetchone()

    if not client_result:
        logger.error("No clients found")
        return False

    client_id = client_result[0]

    # Get a barber ID
    cursor.execute(
        "SELECT id FROM users WHERE role IN ('barber', 'admin') ORDER BY id LIMIT 1"
    )
    barber_result = cursor.fetchone()

    if not barber_result:
        logger.error("No barbers found")
        return False

    barber_id = barber_result[0]

    # Create test appointments
    appointments = []

    # Past completed appointments
    for i in range(3):
        past_date = date.today() - timedelta(days=random.randint(30, 120))
        appointment_time = time(
            hour=random.randint(9, 16), minute=random.choice([0, 15, 30, 45])
        )

        appointment = {
            "customer_id": customer_id,
            "client_id": client_id,
            "barber_id": barber_id,
            "appointment_date": past_date,
            "appointment_time": datetime.combine(past_date, appointment_time),
            "duration_minutes": random.choice([45, 60, 75]),
            "service_revenue": random.randint(35, 75),
            "tip_amount": random.randint(8, 20),
            "product_revenue": random.choice([0, 0, 12.99, 18.99]),
            "customer_type": "Returning" if i > 0 else "New",
            "status": "completed",
            "is_completed": True,
            "completion_time": datetime.combine(past_date, appointment_time)
            + timedelta(minutes=60),
            "service_name": random.choice(
                [
                    "Haircut & Shampoo",
                    "Full Service Cut",
                    "Beard Trim & Cut",
                    "Premium Style",
                ]
            ),
            "payment_method": "card",
            "payment_status": "paid",
            "booking_source": "website",
            "booking_device": "mobile",
            "booking_time": datetime.combine(past_date, appointment_time)
            - timedelta(days=random.randint(1, 7)),
            "client_satisfaction": random.randint(4, 5),
            "service_rating": random.randint(4, 5),
            "barber_notes": f"Great appointment #{i+1} with API test customer",
        }
        appointments.append(appointment)

    # Future confirmed appointments
    for i in range(2):
        future_date = date.today() + timedelta(days=random.randint(7, 45))
        appointment_time = time(
            hour=random.randint(9, 16), minute=random.choice([0, 15, 30, 45])
        )

        appointment = {
            "customer_id": customer_id,
            "client_id": client_id,
            "barber_id": barber_id,
            "appointment_date": future_date,
            "appointment_time": datetime.combine(future_date, appointment_time),
            "duration_minutes": random.choice([45, 60, 75]),
            "service_revenue": random.randint(35, 75),
            "tip_amount": 0,  # No tip until completed
            "product_revenue": 0,
            "customer_type": "Returning",
            "status": "confirmed",
            "is_completed": False,
            "completion_time": None,
            "service_name": random.choice(
                ["Haircut & Shampoo", "Full Service Cut", "Beard Trim & Cut"]
            ),
            "payment_method": "card",
            "payment_status": "pending",
            "booking_source": "website",
            "booking_device": "mobile",
            "booking_time": datetime.now() - timedelta(days=random.randint(1, 5)),
            "client_satisfaction": None,
            "service_rating": None,
            "barber_notes": f"Upcoming appointment #{i+1} for API test customer",
        }
        appointments.append(appointment)

    # Insert appointments
    insert_query = """
        INSERT INTO appointments (
            customer_id, client_id, barber_id,
            appointment_date, appointment_time, duration_minutes,
            service_revenue, tip_amount, product_revenue,
            customer_type, status, is_completed, completion_time,
            service_name, payment_method, payment_status,
            booking_source, booking_device, booking_time,
            client_satisfaction, service_rating, barber_notes,
            created_at, updated_at
        ) VALUES (
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?
        )
    """

    inserted_count = 0

    for apt in appointments:
        try:
            cursor.execute(
                insert_query,
                (
                    apt["customer_id"],
                    apt["client_id"],
                    apt["barber_id"],
                    apt["appointment_date"],
                    apt["appointment_time"],
                    apt["duration_minutes"],
                    apt["service_revenue"],
                    apt["tip_amount"],
                    apt["product_revenue"],
                    apt["customer_type"],
                    apt["status"],
                    apt["is_completed"],
                    apt.get("completion_time"),
                    apt["service_name"],
                    apt["payment_method"],
                    apt["payment_status"],
                    apt["booking_source"],
                    apt["booking_device"],
                    apt["booking_time"],
                    apt.get("client_satisfaction"),
                    apt.get("service_rating"),
                    apt["barber_notes"],
                    datetime.now(),
                    datetime.now(),
                ),
            )
            inserted_count += 1

        except Exception as e:
            logger.warning(f"Failed to insert appointment: {e}")
            continue

    conn.commit()
    conn.close()

    logger.info(
        f"✅ Successfully inserted {inserted_count}/{len(appointments)} appointments for API test customer"
    )
    return inserted_count > 0


if __name__ == "__main__":
    success = add_test_appointments()
    if not success:
        exit(1)
