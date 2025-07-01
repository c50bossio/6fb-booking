"""
Drop and recreate location tables with correct schema
"""

from database import engine, Base
from sqlalchemy import text
import models  # Import models first to ensure User table exists
import location_models

# Drop existing tables
print("Dropping existing location tables...")
with engine.connect() as conn:
    try:
        conn.execute(text("DROP TABLE IF EXISTS chair_assignment_history"))
        conn.execute(text("DROP TABLE IF EXISTS compensation_plans"))
        conn.execute(text("DROP TABLE IF EXISTS chair_inventory"))
        conn.execute(text("DROP TABLE IF EXISTS barber_locations"))
        conn.execute(text("DROP TABLE IF EXISTS barbershop_locations"))
        conn.commit()
    except Exception as e:
        print(f"Error dropping tables: {e}")

# Recreate tables with correct schema
print("Creating location tables with correct schema...")
Base.metadata.create_all(bind=engine)

print("Tables created successfully!")

# Verify table structure
from sqlalchemy import inspect
inspector = inspect(engine)

# Check barbershop_locations columns
columns = inspector.get_columns('barbershop_locations')
column_names = [col['name'] for col in columns]
print(f"\nColumns in barbershop_locations: {column_names}")

# Add some test data
from database import SessionLocal
from location_models import BarbershopLocation, CompensationModel, LocationStatus

db = SessionLocal()
try:
    # Check if test location already exists
    existing = db.query(BarbershopLocation).filter(BarbershopLocation.code == "LOC001").first()
    if not existing:
        # Create a test location
        test_location = BarbershopLocation(
            name="Downtown Barbershop",
            code="LOC001",
            address="123 Main St",
            city="New York",
            state="NY",
            zip_code="10001",
            phone="555-1234",
            email="downtown@6fb.com",
            status=LocationStatus.ACTIVE,
            compensation_model=CompensationModel.COMMISSION,
            total_chairs=8,
            active_chairs=6,
            compensation_config={
                "commission_rate": 0.20,
                "booth_rental_weekly": 300,
                "hybrid_base": 150,
                "hybrid_commission": 0.10
            },
            timezone="America/New_York",
            currency="USD"
        )
        db.add(test_location)
        db.commit()
        print("\nTest location created successfully!")
    else:
        print("\nTest location already exists.")
except Exception as e:
    print(f"Error creating test data: {e}")
    db.rollback()
finally:
    db.close()