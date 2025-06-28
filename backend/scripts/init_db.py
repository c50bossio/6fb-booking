"""
Database initialization script
Creates all tables and relationships
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from config.database import Base, DATABASE_URL

# Import all models to ensure they're registered with Base
from models import user, location, barber, client, appointment
from models import analytics, training, revenue_share, automation


def init_database():
    """Initialize database with all tables"""
    print("Initializing database...")

    # Create engine
    engine = create_engine(DATABASE_URL)

    # Drop all tables (for development - remove in production)
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)

    # Create all tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    print("Database initialized successfully!")

    # Print created tables
    print("\nCreated tables:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")


if __name__ == "__main__":
    init_database()
