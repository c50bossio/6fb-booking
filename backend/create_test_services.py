#!/usr/bin/env python3
"""
Create test services for booking flow testing
"""

from config.database import SessionLocal
from sqlalchemy import text
from datetime import datetime

db = SessionLocal()

try:
    # First check if service_categories table exists
    result = db.execute(
        text(
            'SELECT name FROM sqlite_master WHERE type="table" AND name="service_categories"'
        )
    )
    if not result.fetchone():
        print("Creating service_categories table...")
        db.execute(
            text(
                """
            CREATE TABLE service_categories (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                location_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        """
            )
        )
        db.commit()

    # Create default categories
    categories = [
        ("Haircuts", "haircuts", "Classic and modern haircut styles", 1),
        ("Beard Services", "beard-services", "Beard trims and grooming", 2),
        ("Hair Treatments", "hair-treatments", "Special hair care services", 3),
    ]

    category_ids = {}
    for name, slug, desc, order in categories:
        result = db.execute(
            text("SELECT id FROM service_categories WHERE name = :name"), {"name": name}
        )
        existing = result.fetchone()
        if not existing:
            result = db.execute(
                text(
                    """
                INSERT INTO service_categories (name, slug, description, display_order, is_active)
                VALUES (:name, :slug, :desc, :order, 1)
            """
                ),
                {"name": name, "slug": slug, "desc": desc, "order": order},
            )
            db.commit()
            category_ids[name] = result.lastrowid
            print(f"✅ Created category: {name}")
        else:
            category_ids[name] = existing[0]
            print(f"   Category {name} already exists")

    # Check if services table exists
    result = db.execute(
        text('SELECT name FROM sqlite_master WHERE type="table" AND name="services"')
    )
    if not result.fetchone():
        print("Creating services table...")
        db.execute(
            text(
                """
            CREATE TABLE services (
                id INTEGER PRIMARY KEY,
                location_id INTEGER NOT NULL,
                category_id INTEGER,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                duration_minutes INTEGER NOT NULL DEFAULT 30,
                base_price DECIMAL(10,2) NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                is_addon BOOLEAN DEFAULT 0,
                max_advance_days INTEGER DEFAULT 90,
                requires_consultation BOOLEAN DEFAULT 0,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (location_id) REFERENCES locations(id),
                FOREIGN KEY (category_id) REFERENCES service_categories(id)
            )
        """
            )
        )
        db.commit()

    # Create test services
    services = [
        # Haircuts
        (
            "Classic Cut",
            "Traditional barber cut with hot towel finish",
            30,
            35.00,
            category_ids.get("Haircuts", 1),
        ),
        (
            "Fade Cut",
            "Modern fade with precise blending",
            45,
            45.00,
            category_ids.get("Haircuts", 1),
        ),
        (
            "Kids Cut",
            "Haircut for children under 12",
            20,
            25.00,
            category_ids.get("Haircuts", 1),
        ),
        (
            "Buzz Cut",
            "Quick all-over clipper cut",
            15,
            20.00,
            category_ids.get("Haircuts", 1),
        ),
        # Beard Services
        (
            "Beard Trim",
            "Shape and trim with hot towel",
            20,
            25.00,
            category_ids.get("Beard Services", 2),
        ),
        (
            "Beard Design",
            "Custom beard shaping and lineup",
            30,
            35.00,
            category_ids.get("Beard Services", 2),
        ),
        (
            "Hot Shave",
            "Traditional straight razor shave",
            30,
            40.00,
            category_ids.get("Beard Services", 2),
        ),
        # Hair Treatments
        (
            "Hair Treatment",
            "Deep conditioning treatment",
            20,
            30.00,
            category_ids.get("Hair Treatments", 3),
        ),
        (
            "Scalp Massage",
            "Relaxing scalp treatment",
            15,
            25.00,
            category_ids.get("Hair Treatments", 3),
        ),
    ]

    for idx, (name, desc, duration, price, category_id) in enumerate(services):
        # Check if service already exists
        result = db.execute(
            text("SELECT id FROM services WHERE name = :name AND location_id = 1"),
            {"name": name},
        )
        if not result.fetchone():
            db.execute(
                text(
                    """
                INSERT INTO services (location_id, category_id, name, description, duration_minutes, base_price, display_order)
                VALUES (1, :cat_id, :name, :desc, :duration, :price, :order)
            """
                ),
                {
                    "cat_id": category_id,
                    "name": name,
                    "desc": desc,
                    "duration": duration,
                    "price": price,
                    "order": idx,
                },
            )
            print(f"✅ Created service: {name} (${price}, {duration} min)")

    db.commit()

    # Show summary
    count = db.execute(
        text("SELECT COUNT(*) FROM services WHERE location_id = 1")
    ).fetchone()[0]
    print(f"\n📊 Total services for location 1: {count}")

except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()

print("\n🎯 Services created! Test the booking flow at:")
print("   http://localhost:3000/book/1/booking")
