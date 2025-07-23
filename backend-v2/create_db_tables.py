#!/usr/bin/env python3
"""
Script to create database tables directly using SQLAlchemy models.
This bypasses the broken migration system.
"""

from database import engine, Base
import models

def create_tables():
    """Create all tables from SQLAlchemy models"""
    print("Creating database tables...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    create_tables()