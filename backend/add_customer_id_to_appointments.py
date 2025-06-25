#!/usr/bin/env python3
"""
Database migration to add customer_id field to appointments table
This fixes the missing foreign key relationship between customers and appointments
"""

import sqlite3
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_customer_id_to_appointments():
    """Add customer_id column to appointments table with foreign key constraint"""

    db_path = Path("6fb_booking.db")
    if not db_path.exists():
        logger.error(f"Database file not found: {db_path}")
        return False

    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Check if customer_id column already exists
        cursor.execute("PRAGMA table_info(appointments)")
        columns = [column[1] for column in cursor.fetchall()]

        if "customer_id" in columns:
            logger.info("customer_id column already exists in appointments table")
            return True

        logger.info("Adding customer_id column to appointments table...")

        # Add the customer_id column (nullable for now to handle existing data)
        cursor.execute(
            """
            ALTER TABLE appointments
            ADD COLUMN customer_id INTEGER
            REFERENCES customers(id)
        """
        )

        # Create index for better performance
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_appointments_customer_id
            ON appointments (customer_id)
        """
        )

        # Add some sample data linking - this will need to be customized based on your data
        # For now, let's see how many appointments and customers we have
        cursor.execute("SELECT COUNT(*) FROM appointments")
        appointment_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM customers")
        customer_count = cursor.fetchone()[0]

        logger.info(
            f"Found {appointment_count} appointments and {customer_count} customers"
        )

        conn.commit()
        logger.info("Successfully added customer_id column to appointments table")

        # Verify the change
        cursor.execute("PRAGMA table_info(appointments)")
        columns = cursor.fetchall()
        customer_id_col = [col for col in columns if col[1] == "customer_id"]

        if customer_id_col:
            logger.info(
                f"Verified: customer_id column added with info: {customer_id_col[0]}"
            )
        else:
            logger.error("Failed to verify customer_id column addition")
            return False

        return True

    except Exception as e:
        logger.error(f"Error adding customer_id column: {e}")
        if "conn" in locals():
            conn.rollback()
        return False

    finally:
        if "conn" in locals():
            conn.close()


def link_existing_appointments_to_customers():
    """Link existing appointments to customers based on email/phone matching"""

    db_path = Path("6fb_booking.db")
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Get appointments that don't have customer_id set
        cursor.execute(
            """
            SELECT a.id, a.client_id, c.email, c.phone
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.customer_id IS NULL
            LIMIT 10
        """
        )

        unlinked_appointments = cursor.fetchall()
        logger.info(
            f"Found {len(unlinked_appointments)} appointments without customer links"
        )

        if unlinked_appointments:
            logger.info("Sample unlinked appointments:")
            for apt in unlinked_appointments[:3]:
                logger.info(
                    f"  Appointment {apt[0]}: Client {apt[1]}, Email: {apt[2]}, Phone: {apt[3]}"
                )

        # Try to match appointments to customers by email
        cursor.execute(
            """
            UPDATE appointments
            SET customer_id = (
                SELECT cust.id
                FROM customers cust
                JOIN clients cl ON cl.email = cust.email
                WHERE cl.id = appointments.client_id
            )
            WHERE customer_id IS NULL
            AND EXISTS (
                SELECT 1
                FROM customers cust
                JOIN clients cl ON cl.email = cust.email
                WHERE cl.id = appointments.client_id
            )
        """
        )

        matched_by_email = cursor.rowcount
        conn.commit()

        logger.info(
            f"Linked {matched_by_email} appointments to customers by email matching"
        )

        return True

    except Exception as e:
        logger.error(f"Error linking appointments to customers: {e}")
        if "conn" in locals():
            conn.rollback()
        return False

    finally:
        if "conn" in locals():
            conn.close()


if __name__ == "__main__":
    logger.info("Starting database migration: Add customer_id to appointments")

    # Step 1: Add the customer_id column
    if add_customer_id_to_appointments():
        logger.info("✅ Successfully added customer_id column")

        # Step 2: Try to link existing data
        if link_existing_appointments_to_customers():
            logger.info("✅ Successfully linked existing appointments to customers")
        else:
            logger.warning("⚠️  Failed to link some existing appointments")
    else:
        logger.error("❌ Failed to add customer_id column")
        exit(1)

    logger.info("Database migration completed!")
