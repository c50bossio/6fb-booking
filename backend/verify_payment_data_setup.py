#!/usr/bin/env python3
"""
Verify and setup test data for payment system testing
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from config.database import get_db, engine
from models.location import Location
from models.barber import Barber
from models.user import User
from sqlalchemy.orm import Session
import json

def verify_and_setup_data():
    """Verify existing data and set up test data if needed"""
    db = next(get_db())
    
    try:
        print("🔍 Checking existing data...")
        print("=" * 50)
        
        # Check users
        users = db.query(User).all()
        print(f"✓ Users: {len(users)}")
        for user in users[:3]:
            print(f"  - {user.email} ({user.role})")
            
        # Check locations
        locations = db.query(Location).all()
        print(f"\n✓ Locations: {len(locations)}")
        
        if not locations:
            print("  Creating test location...")
            location = Location(
                name="Test Barbershop",
                address="123 Main St",
                city="Test City",
                state="TS",
                zip_code="12345",
                phone="555-0123",
                email="shop@example.com",
                stripe_account_id=None,
                is_active=True
            )
            db.add(location)
            db.commit()
            print("  ✅ Created test location")
            locations = [location]
        
        for loc in locations:
            print(f"  - {loc.name} (ID: {loc.id})")
            print(f"    Stripe: {loc.stripe_account_id or 'Not connected'}")
            print(f"    Payment Platform: {getattr(loc, 'payment_platform', 'Not set')}")
            
        # Check barbers
        barbers = db.query(Barber).all()
        print(f"\n✓ Barbers: {len(barbers)}")
        
        if not barbers and locations:
            print("  Creating test barber...")
            barber = Barber(
                first_name="Test",
                last_name="Barber",
                email="testbarber@example.com",
                phone="555-0124",
                location_id=locations[0].id,
                hourly_rate=45.0,
                is_active=True,
                stripe_account_id=None
            )
            db.add(barber)
            db.commit()
            print("  ✅ Created test barber")
            barbers = [barber]
            
        for barber in barbers[:3]:
            print(f"  - {barber.first_name} {barber.last_name} (ID: {barber.id})")
            print(f"    Email: {barber.email}")
            print(f"    Location: {barber.location_id}")
            print(f"    Stripe: {barber.stripe_account_id or 'Not connected'}")
            print(f"    Hourly Rate: ${barber.hourly_rate}")
            
        print("\n" + "=" * 50)
        print("✅ Data verification complete")
        
        # Test API access
        print("\n🔌 Testing API Access...")
        import requests
        
        # Get auth token
        response = requests.post(
            "http://localhost:8000/api/v1/auth/token",
            data={
                "username": "test@example.com",
                "password": "testpassword123"
            }
        )
        
        if response.status_code == 200:
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test locations endpoint
            loc_response = requests.get(
                "http://localhost:8000/api/v1/locations",
                headers=headers
            )
            print(f"\nLocations API: {loc_response.status_code}")
            if loc_response.status_code == 200:
                print(f"  Returned: {len(loc_response.json())} locations")
            else:
                print(f"  Error: {loc_response.text}")
                
            # Test barbers endpoint
            barber_response = requests.get(
                "http://localhost:8000/api/v1/barbers",
                headers=headers
            )
            print(f"\nBarbers API: {barber_response.status_code}")
            if barber_response.status_code == 200:
                print(f"  Returned: {len(barber_response.json())} barbers")
            else:
                print(f"  Error: {barber_response.text}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    verify_and_setup_data()