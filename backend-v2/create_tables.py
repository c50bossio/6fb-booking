#!/usr/bin/env python3
"""Create database tables from models."""

from sqlalchemy import create_engine
from database import Base
from config import settings
import models  # Import all models to register them

# Create engine
engine = create_engine(settings.database_url)

# Create all tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Database tables created successfully!")