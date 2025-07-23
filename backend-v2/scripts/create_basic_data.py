#!/usr/bin/env python3
"""Create basic test data for staging environment."""

import os
import sys
from datetime import datetime, timedelta
from passlib.context import CryptContext

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings

# Create engine and session
engine = create_engine(settings.database_url)
Session = sessionmaker(bind=engine)
db = Session()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    # Create test users
    print("Creating test users...")
    
    # Test barber
    db.execute("""
        INSERT INTO users (email, name, hashed_password, role, is_active)
        VALUES (?, ?, ?, ?, ?)
    """, ("barber@example.com", "Test Barber", pwd_context.hash("password123"), "barber", True))
    
    # Test client
    db.execute("""
        INSERT INTO users (email, name, hashed_password, role, is_active)
        VALUES (?, ?, ?, ?, ?)
    """, ("client@example.com", "Test Client", pwd_context.hash("password123"), "client", True))
    
    # Test admin
    db.execute("""
        INSERT INTO users (email, name, hashed_password, role, is_active)
        VALUES (?, ?, ?, ?, ?)
    """, ("admin@example.com", "Test Admin", pwd_context.hash("password123"), "admin", True))
    
    db.commit()
    print("✅ Test users created successfully!")
    
    # Create test services
    print("Creating test services...")
    db.execute("""
        INSERT INTO services (name, description, base_price, duration_minutes, category, is_active)
        VALUES 
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?)
    """, (
        "Classic Haircut", "Traditional barber cut", 30.0, 30, "haircut", True,
        "Beard Trim", "Professional beard shaping", 20.0, 20, "beard", True,
        "Full Service", "Haircut + Beard combo", 45.0, 45, "package", True
    ))
    
    db.commit()
    print("✅ Test services created successfully!")
    
    print("\n🎉 Basic test data created successfully!")
    print("\nTest Credentials:")
    print("  Barber: barber@example.com / password123")
    print("  Client: client@example.com / password123")
    print("  Admin: admin@example.com / password123")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    db.rollback()
finally:
    db.close()