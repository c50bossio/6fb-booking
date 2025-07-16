#!/usr/bin/env python3
"""
Create test location data for the locations API endpoint.
This script creates sample barbershop locations for testing purposes.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from location_models import BarbershopLocation, LocationStatus, CompensationModel
from models import User
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_locations():
    """Create test barbershop locations."""
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Check if locations already exist
        existing_locations = db.query(BarbershopLocation).count()
        if existing_locations > 0:
            logger.info(f"Found {existing_locations} existing locations. Skipping creation.")
            return
        
        # Create test locations
        test_locations = [
            {
                "name": "Downtown Barbershop",
                "code": "DOWNTOWN",
                "address": "123 Main Street",
                "city": "Downtown",
                "state": "NY",
                "zip_code": "10001",
                "phone": "(555) 123-4567",
                "email": "downtown@bookedbarber.com",
                "status": LocationStatus.ACTIVE,
                "compensation_model": CompensationModel.COMMISSION,
                "total_chairs": 6,
                "active_chairs": 4,
                "business_hours": {
                    "monday": {"open": "09:00", "close": "19:00"},
                    "tuesday": {"open": "09:00", "close": "19:00"},
                    "wednesday": {"open": "09:00", "close": "19:00"},
                    "thursday": {"open": "09:00", "close": "19:00"},
                    "friday": {"open": "09:00", "close": "20:00"},
                    "saturday": {"open": "08:00", "close": "18:00"},
                    "sunday": {"open": "10:00", "close": "16:00"}
                },
                "timezone": "America/New_York",
                "currency": "USD",
                "compensation_config": {
                    "commission_rate": 0.55,
                    "minimum_weekly_guarantee": 300,
                    "product_commission": 0.10
                }
            },
            {
                "name": "Uptown Cuts",
                "code": "UPTOWN",
                "address": "456 Broadway Avenue",
                "city": "Uptown",
                "state": "NY",
                "zip_code": "10025",
                "phone": "(555) 987-6543",
                "email": "uptown@bookedbarber.com",
                "status": LocationStatus.ACTIVE,
                "compensation_model": CompensationModel.BOOTH_RENTAL,
                "total_chairs": 8,
                "active_chairs": 6,
                "business_hours": {
                    "monday": {"open": "08:00", "close": "20:00"},
                    "tuesday": {"open": "08:00", "close": "20:00"},
                    "wednesday": {"open": "08:00", "close": "20:00"},
                    "thursday": {"open": "08:00", "close": "20:00"},
                    "friday": {"open": "08:00", "close": "21:00"},
                    "saturday": {"open": "07:00", "close": "19:00"},
                    "sunday": {"open": "09:00", "close": "17:00"}
                },
                "timezone": "America/New_York",
                "currency": "USD",
                "compensation_config": {
                    "weekly_booth_rental": 200,
                    "monthly_booth_rental": 750,
                    "product_commission": 0.15
                }
            },
            {
                "name": "Westside Barber Co.",
                "code": "WESTSIDE",
                "address": "789 Oak Street",
                "city": "Westside",
                "state": "NY",
                "zip_code": "10036",
                "phone": "(555) 555-0123",
                "email": "westside@bookedbarber.com",
                "status": LocationStatus.ACTIVE,
                "compensation_model": CompensationModel.HYBRID,
                "total_chairs": 5,
                "active_chairs": 5,
                "business_hours": {
                    "monday": {"open": "09:00", "close": "18:00"},
                    "tuesday": {"open": "09:00", "close": "18:00"},
                    "wednesday": {"open": "09:00", "close": "18:00"},
                    "thursday": {"open": "09:00", "close": "18:00"},
                    "friday": {"open": "09:00", "close": "19:00"},
                    "saturday": {"open": "08:00", "close": "17:00"},
                    "sunday": {"closed": True}
                },
                "timezone": "America/New_York",
                "currency": "USD",
                "compensation_config": {
                    "base_weekly_rental": 150,
                    "commission_rate": 0.35,
                    "product_commission": 0.12
                }
            },
            {
                "name": "Elite Cuts & Styling",
                "code": "ELITE",
                "address": "321 Park Avenue",
                "city": "Midtown",
                "state": "NY",
                "zip_code": "10017",
                "phone": "(555) 234-5678",
                "email": "elite@bookedbarber.com",
                "status": LocationStatus.ACTIVE,
                "compensation_model": CompensationModel.COMMISSION,
                "total_chairs": 4,
                "active_chairs": 3,
                "business_hours": {
                    "monday": {"open": "10:00", "close": "19:00"},
                    "tuesday": {"open": "10:00", "close": "19:00"},
                    "wednesday": {"open": "10:00", "close": "19:00"},
                    "thursday": {"open": "10:00", "close": "19:00"},
                    "friday": {"open": "10:00", "close": "20:00"},
                    "saturday": {"open": "09:00", "close": "18:00"},
                    "sunday": {"open": "11:00", "close": "17:00"}
                },
                "timezone": "America/New_York",
                "currency": "USD",
                "compensation_config": {
                    "commission_rate": 0.60,
                    "minimum_weekly_guarantee": 400,
                    "product_commission": 0.20
                }
            },
            {
                "name": "Brooklyn Barber House",
                "code": "BROOKLYN",
                "address": "567 Atlantic Avenue",
                "city": "Brooklyn",
                "state": "NY",
                "zip_code": "11217",
                "phone": "(718) 555-0199",
                "email": "brooklyn@bookedbarber.com",
                "status": LocationStatus.COMING_SOON,
                "compensation_model": CompensationModel.COMMISSION,
                "total_chairs": 7,
                "active_chairs": 0,
                "business_hours": {
                    "monday": {"open": "09:00", "close": "19:00"},
                    "tuesday": {"open": "09:00", "close": "19:00"},
                    "wednesday": {"open": "09:00", "close": "19:00"},
                    "thursday": {"open": "09:00", "close": "19:00"},
                    "friday": {"open": "09:00", "close": "20:00"},
                    "saturday": {"open": "08:00", "close": "18:00"},
                    "sunday": {"open": "10:00", "close": "16:00"}
                },
                "timezone": "America/New_York",
                "currency": "USD",
                "compensation_config": {
                    "commission_rate": 0.50,
                    "minimum_weekly_guarantee": 250,
                    "product_commission": 0.15
                }
            }
        ]
        
        # Create location objects and add to database
        created_locations = []
        for location_data in test_locations:
            location = BarbershopLocation(**location_data)
            db.add(location)
            created_locations.append(location)
        
        # Commit the transaction
        db.commit()
        
        # Refresh objects to get their IDs
        for location in created_locations:
            db.refresh(location)
        
        logger.info(f"✅ Successfully created {len(created_locations)} test locations:")
        for location in created_locations:
            logger.info(f"  - {location.name} (Code: {location.code}, ID: {location.id})")
        
        return created_locations
        
    except Exception as e:
        logger.error(f"❌ Error creating test locations: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def verify_locations():
    """Verify that locations were created successfully."""
    
    db = SessionLocal()
    try:
        locations = db.query(BarbershopLocation).all()
        
        logger.info(f"\n📊 Location verification:")
        logger.info(f"Total locations in database: {len(locations)}")
        
        for location in locations:
            logger.info(f"  - {location.name} ({location.code})")
            logger.info(f"    Status: {location.status}")
            logger.info(f"    Chairs: {location.active_chairs}/{location.total_chairs}")
            logger.info(f"    Address: {location.address}, {location.city}, {location.state} {location.zip_code}")
            logger.info(f"    Phone: {location.phone}")
            logger.info(f"    Email: {location.email}")
            logger.info(f"    Compensation: {location.compensation_model}")
            logger.info(f"    Created: {location.created_at}")
            logger.info("")
        
        return locations
        
    except Exception as e:
        logger.error(f"❌ Error verifying locations: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("🚀 Starting test location creation...")
    
    try:
        # Create test locations
        locations = create_test_locations()
        
        # Verify the locations were created
        verify_locations()
        
        logger.info("✅ Test location creation completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to create test locations: {e}")
        sys.exit(1)