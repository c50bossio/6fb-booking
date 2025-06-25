#!/usr/bin/env python3
"""
Simple setup script for sample services data
"""

import sqlite3
import json


def setup_sample_data():
    """Add sample services directly to SQLite database"""

    # Connect to the database
    db_path = "/Users/bossio/6fb-booking/backend/6fb_booking.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if service categories exist
        cursor.execute("SELECT COUNT(*) FROM service_categories")
        category_count = cursor.fetchone()[0]

        if category_count == 0:
            print("Creating service categories...")
            categories = [
                (1, "Cuts", "cuts", "Professional haircuts", 1, 1),
                (2, "Styling", "styling", "Hair styling services", 2, 1),
                (3, "Grooming", "grooming", "Beard and grooming services", 3, 1),
                (4, "Treatments", "treatments", "Hair treatments and care", 4, 1),
            ]

            cursor.executemany(
                """
                INSERT INTO service_categories (id, name, slug, description, display_order, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                categories,
            )

        # Check if services exist
        cursor.execute("SELECT COUNT(*) FROM services")
        service_count = cursor.fetchone()[0]

        if service_count == 0:
            print("Creating services...")
            services = [
                # (id, name, description, category_id, base_price, duration_minutes, requires_deposit, deposit_amount, deposit_type, is_addon, location_id, is_active, display_order, min_advance_hours, tags)
                (
                    1,
                    "Classic Cut",
                    "Traditional men's haircut with scissor and clipper work",
                    1,
                    45.00,
                    45,
                    1,
                    15.00,
                    "fixed",
                    0,
                    1,
                    1,
                    1,
                    2,
                    '["cuts"]',
                ),
                (
                    2,
                    "Premium Cut & Style",
                    "Premium haircut with styling and finish",
                    1,
                    65.00,
                    60,
                    1,
                    20.00,
                    "fixed",
                    0,
                    1,
                    1,
                    2,
                    2,
                    '["cuts", "premium"]',
                ),
                (
                    3,
                    "Fade Cut",
                    "Modern fade haircut with precision blending",
                    1,
                    55.00,
                    50,
                    1,
                    18.00,
                    "fixed",
                    0,
                    1,
                    1,
                    3,
                    2,
                    '["cuts", "fade"]',
                ),
                (
                    4,
                    "Hair Styling",
                    "Professional hair styling for special occasions",
                    2,
                    35.00,
                    30,
                    0,
                    None,
                    None,
                    1,
                    1,
                    1,
                    4,
                    2,
                    '["styling"]',
                ),
                (
                    5,
                    "Wash & Style",
                    "Hair wash with professional styling",
                    2,
                    25.00,
                    25,
                    0,
                    None,
                    None,
                    0,
                    1,
                    1,
                    5,
                    2,
                    '["styling", "wash"]',
                ),
                (
                    6,
                    "Beard Trim",
                    "Professional beard trimming and shaping",
                    3,
                    25.00,
                    20,
                    0,
                    None,
                    None,
                    1,
                    1,
                    1,
                    6,
                    2,
                    '["grooming", "beard"]',
                ),
                (
                    7,
                    "Full Shave",
                    "Traditional straight razor shave with hot towel",
                    3,
                    40.00,
                    45,
                    1,
                    15.00,
                    "fixed",
                    0,
                    1,
                    1,
                    7,
                    2,
                    '["grooming", "shave"]',
                ),
                (
                    8,
                    "Cut & Beard Combo",
                    "Haircut and beard trim combination service",
                    3,
                    65.00,
                    75,
                    1,
                    25.00,
                    "fixed",
                    0,
                    1,
                    1,
                    8,
                    2,
                    '["cuts", "grooming", "combo"]',
                ),
                (
                    9,
                    "Hair Treatment",
                    "Deep conditioning hair treatment",
                    4,
                    30.00,
                    30,
                    0,
                    None,
                    None,
                    1,
                    1,
                    1,
                    9,
                    2,
                    '["treatments"]',
                ),
            ]

            cursor.executemany(
                """
                INSERT INTO services (id, name, description, category_id, base_price, duration_minutes,
                                    requires_deposit, deposit_amount, deposit_type, is_addon, location_id,
                                    is_active, display_order, min_advance_hours, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                services,
            )

        # Ensure location exists
        cursor.execute("SELECT COUNT(*) FROM locations WHERE id = 1")
        location_count = cursor.fetchone()[0]

        if location_count == 0:
            print("Creating sample location...")
            cursor.execute(
                """
                INSERT INTO locations (id, name, business_name, address, city, state, zip_code,
                                     phone, email, timezone, is_active, onboarding_status)
                VALUES (1, 'Six Figure Barber - Downtown', 'Six Figure Barber',
                       '123 Main Street', 'Downtown', 'NY', '10001',
                       '(555) 123-4567', 'downtown@sixfigurebarber.com',
                       'America/New_York', 1, 'completed')
            """
            )

        conn.commit()
        print("✅ Sample data created successfully!")

        # Verify data
        cursor.execute("SELECT COUNT(*) FROM service_categories")
        categories_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM services")
        services_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM barbers WHERE location_id = 1")
        barbers_count = cursor.fetchone()[0]

        print(f"📊 Data Summary:")
        print(f"   Service Categories: {categories_count}")
        print(f"   Services: {services_count}")
        print(f"   Barbers: {barbers_count}")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    print("🚀 Setting up sample data for booking system...")
    success = setup_sample_data()

    if success:
        print("\n🎉 Setup complete! Now test the API:")
        print("curl http://localhost:8000/api/v1/booking/public/shops/1/services")
    else:
        print("\n❌ Setup failed.")
        exit(1)
