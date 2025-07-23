#!/usr/bin/env python3
"""
Simple script to verify the test-barber@6fb.com user exists.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from db import engine

def verify_test_barber():
    """Simple verification of test-barber@6fb.com user."""
    
    with engine.connect() as conn:
        # Check user exists
        result = conn.execute(text("""
            SELECT id, email, name, role, is_active, location_id, created_at
            FROM users 
            WHERE email = :email
        """), {"email": "test-barber@6fb.com"})
        
        user = result.fetchone()
        
        if not user:
            print("❌ User test-barber@6fb.com NOT FOUND!")
            return
        
        print("✅ TEST BARBER FOUND")
        print("=" * 50)
        print(f"ID: {user[0]}")
        print(f"Email: {user[1]}")
        print(f"Name: {user[2]}")
        print(f"Role: {user[3]}")
        print(f"Active: {user[4]}")
        print(f"Location ID: {user[5]}")
        print(f"Created: {user[6]}")
        
        # Check services
        services_result = conn.execute(text("""
            SELECT s.id, s.name, s.base_price, s.duration_minutes
            FROM services s
            JOIN barber_services bs ON s.id = bs.service_id
            WHERE bs.barber_id = :barber_id
        """), {"barber_id": user[0]})
        
        services = services_result.fetchall()
        print(f"\nSERVICES ({len(services)}):")
        for service in services:
            print(f"  - {service[1]}: ${service[2]} ({service[3]} min)")
        
        # Check clients
        clients_result = conn.execute(text("""
            SELECT COUNT(*) FROM clients
        """))
        client_count = clients_result.scalar()
        print(f"\nTOTAL CLIENTS IN SYSTEM: {client_count}")
        
        print("\nTEST CREDENTIALS:")
        print(f"  Email: test-barber@6fb.com")
        print(f"  Password: testpass123")
        print("\n" + "=" * 50)
        print("✅ Test barber is ready for use!")

if __name__ == "__main__":
    verify_test_barber()