"""
Create location tables manually
"""

from database import engine, Base
import location_models

# Create all tables from location_models
print("Creating location tables...")
Base.metadata.create_all(bind=engine, tables=[
    location_models.BarbershopLocation.__table__,
    location_models.BarberLocation.__table__,
    location_models.ChairInventory.__table__,
    location_models.ChairAssignmentHistory.__table__,
    location_models.CompensationPlan.__table__
])

print("Location tables created successfully!")

# Verify tables exist
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
location_tables = [t for t in tables if 'location' in t or 'chair' in t or 'compensation' in t]
print(f"\nLocation-related tables in database: {location_tables}")