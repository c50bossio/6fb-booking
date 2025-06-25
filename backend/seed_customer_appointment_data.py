#!/usr/bin/env python3
"""
Seed customer appointment test data
Creates realistic appointment data linked to customer accounts for testing
"""

import sqlite3
import logging
from datetime import datetime, timedelta, date, time
from pathlib import Path
import random

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_existing_customers():
    """Get existing customer accounts"""

    db_path = Path("6fb_booking.db")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, email, first_name, last_name
        FROM customers
        WHERE is_active = 1
        ORDER BY id
    """
    )

    customers = cursor.fetchall()
    conn.close()

    return customers


def get_barbers_and_services():
    """Get available barbers and services"""

    db_path = Path("6fb_booking.db")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Get barbers (users with role barber)
    cursor.execute(
        """
        SELECT id, first_name, last_name
        FROM users
        WHERE role = 'barber' OR role = 'admin'
        ORDER BY id
        LIMIT 5
    """
    )
    barbers = cursor.fetchall()

    # Get services
    cursor.execute(
        """
        SELECT id, name, base_price, duration_minutes
        FROM services
        WHERE is_active = 1
        ORDER BY id
        LIMIT 5
    """
    )
    services = cursor.fetchall()

    # Get locations
    cursor.execute(
        """
        SELECT id, name
        FROM locations
        ORDER BY id
        LIMIT 3
    """
    )
    locations = cursor.fetchall()

    conn.close()

    return barbers, services, locations


def create_realistic_appointments(
    customer_id, first_name, barbers, services, locations
):
    """Create realistic appointment history for a customer"""

    appointments = []

    # Create past appointments (completed)
    for i in range(random.randint(2, 8)):
        past_date = date.today() - timedelta(days=random.randint(30, 365))
        appointment_time = time(
            hour=random.randint(9, 17), minute=random.choice([0, 15, 30, 45])
        )

        barber = random.choice(barbers)
        service = random.choice(services)
        location = random.choice(locations)

        # Calculate realistic pricing
        base_price = service[2] if service[2] else random.randint(25, 85)
        tip_amount = round(base_price * random.uniform(0.15, 0.25), 2)

        appointment = {
            "customer_id": customer_id,
            "barber_id": barber[0],
            "service_id": service[0],
            "location_id": location[0],
            "appointment_date": past_date,
            "appointment_time": datetime.combine(past_date, appointment_time),
            "duration_minutes": (
                service[3] if service[3] else random.choice([45, 60, 75, 90])
            ),
            "service_revenue": base_price,
            "tip_amount": tip_amount,
            "product_revenue": random.choice([0, 0, 0, 8.99, 15.99, 22.99]),
            "total_amount": base_price + tip_amount,
            "customer_type": "Returning" if i > 0 else "New",
            "status": "completed",
            "is_completed": True,
            "completion_time": datetime.combine(past_date, appointment_time)
            + timedelta(minutes=service[3] if service[3] else 60),
            "service_name": service[1],
            "payment_method": random.choice(["card", "cash", "digital"]),
            "payment_status": "paid",
            "booking_source": random.choice(["website", "phone", "walk_in", "app"]),
            "booking_device": random.choice(["mobile", "desktop", "tablet"]),
            "booking_time": datetime.combine(past_date, appointment_time)
            - timedelta(days=random.randint(1, 14)),
            "client_satisfaction": random.randint(4, 5),
            "service_rating": random.randint(4, 5),
            "notes": f"Great service as always! {first_name} is a valued customer.",
        }

        appointments.append(appointment)

    # Create upcoming appointments (confirmed)
    for i in range(random.randint(1, 3)):
        future_date = date.today() + timedelta(days=random.randint(1, 60))
        appointment_time = time(
            hour=random.randint(9, 17), minute=random.choice([0, 15, 30, 45])
        )

        barber = random.choice(barbers)
        service = random.choice(services)
        location = random.choice(locations)

        base_price = service[2] if service[2] else random.randint(25, 85)

        appointment = {
            "customer_id": customer_id,
            "barber_id": barber[0],
            "service_id": service[0],
            "location_id": location[0],
            "appointment_date": future_date,
            "appointment_time": datetime.combine(future_date, appointment_time),
            "duration_minutes": (
                service[3] if service[3] else random.choice([45, 60, 75, 90])
            ),
            "service_revenue": base_price,
            "tip_amount": 0,  # No tip until service is completed
            "product_revenue": 0,
            "total_amount": base_price,
            "customer_type": "Returning",
            "status": "confirmed",
            "is_completed": False,
            "service_name": service[1],
            "payment_method": "card",
            "payment_status": "pending",
            "booking_source": random.choice(["website", "app", "phone"]),
            "booking_device": random.choice(["mobile", "desktop"]),
            "booking_time": datetime.now() - timedelta(days=random.randint(1, 7)),
            "notes": f"Upcoming appointment for {first_name}.",
        }

        appointments.append(appointment)

    return appointments


def insert_appointments(appointments):
    """Insert appointments into database"""

    db_path = Path("6fb_booking.db")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Get existing client ID (we'll create a generic client for customer appointments)
    cursor.execute("SELECT id FROM clients ORDER BY id LIMIT 1")
    client_result = cursor.fetchone()

    if not client_result:
        logger.error("No clients found. Please ensure clients table has data.")
        return False

    client_id = client_result[0]

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
                    client_id,
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
                    apt["notes"],
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
        f"Successfully inserted {inserted_count}/{len(appointments)} appointments"
    )
    return inserted_count > 0


def main():
    """Main function to seed customer appointment data"""

    logger.info("Starting customer appointment data seeding...")

    # Get existing customers
    customers = get_existing_customers()

    if not customers:
        logger.error("No customers found. Please create customer accounts first.")
        return False

    logger.info(f"Found {len(customers)} customers")

    # Get barbers, services, and locations
    barbers, services, locations = get_barbers_and_services()

    if not barbers:
        logger.error("No barbers found. Please ensure users table has barber entries.")
        return False

    if not services:
        logger.error("No services found. Please ensure services table has entries.")
        return False

    if not locations:
        logger.error("No locations found. Please ensure locations table has entries.")
        return False

    logger.info(
        f"Found {len(barbers)} barbers, {len(services)} services, {len(locations)} locations"
    )

    # Create appointments for each customer
    all_appointments = []

    for customer_id, email, first_name, last_name in customers:
        logger.info(f"Creating appointments for {first_name} {last_name} ({email})")

        customer_appointments = create_realistic_appointments(
            customer_id, first_name, barbers, services, locations
        )

        all_appointments.extend(customer_appointments)
        logger.info(f"  Created {len(customer_appointments)} appointments")

    # Insert all appointments
    logger.info(f"Inserting {len(all_appointments)} total appointments...")

    if insert_appointments(all_appointments):
        logger.info("✅ Successfully seeded customer appointment data!")
        return True
    else:
        logger.error("❌ Failed to seed appointment data")
        return False


if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)
