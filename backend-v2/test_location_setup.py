#!/usr/bin/env python3
"""
Test script to create sample location data for testing location filtering
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import get_db, engine
from location_models import BarbershopLocation, LocationStatus, CompensationModel
from models import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_test_locations():
    """Create test locations for development"""
    
    # Create database session
    db = next(get_db())
    
    try:
        # Check if locations already exist
        existing_locations = db.query(BarbershopLocation).count()
        if existing_locations > 0:
            logger.info(f"Found {existing_locations} existing locations")
            return
        
        # Create test locations
        locations_data = [
            {
                'name': 'Downtown Location',
                'code': 'DT001',
                'address': '123 Main St',
                'city': 'Seattle',
                'state': 'WA',
                'zip_code': '98101',
                'phone': '(206) 555-0123',
                'email': 'downtown@bookedbarber.com',
                'status': LocationStatus.ACTIVE,
                'compensation_model': CompensationModel.COMMISSION,
                'total_chairs': 8,
                'active_chairs': 6,
                'business_hours': {
                    'monday': {'open': '09:00', 'close': '19:00'},
                    'tuesday': {'open': '09:00', 'close': '19:00'},
                    'wednesday': {'open': '09:00', 'close': '19:00'},
                    'thursday': {'open': '09:00', 'close': '20:00'},
                    'friday': {'open': '09:00', 'close': '20:00'},
                    'saturday': {'open': '08:00', 'close': '18:00'},
                    'sunday': {'open': '10:00', 'close': '17:00'}
                },
                'timezone': 'America/Los_Angeles'
            },
            {
                'name': 'Uptown Location', 
                'code': 'UT002',
                'address': '456 Pine Ave',
                'city': 'Seattle',
                'state': 'WA',
                'zip_code': '98109',
                'phone': '(206) 555-0456',
                'email': 'uptown@bookedbarber.com',
                'status': LocationStatus.ACTIVE,
                'compensation_model': CompensationModel.BOOTH_RENTAL,
                'total_chairs': 6,
                'active_chairs': 4,
                'business_hours': {
                    'monday': {'open': '10:00', 'close': '18:00'},
                    'tuesday': {'open': '10:00', 'close': '18:00'},
                    'wednesday': {'open': '10:00', 'close': '18:00'},
                    'thursday': {'open': '10:00', 'close': '19:00'},
                    'friday': {'open': '10:00', 'close': '19:00'},
                    'saturday': {'open': '09:00', 'close': '17:00'},
                    'sunday': {'closed': True}
                },
                'timezone': 'America/Los_Angeles'
            },
            {
                'name': 'Westside Location',
                'code': 'WS003',
                'address': '789 Oak Blvd',
                'city': 'Seattle',
                'state': 'WA',
                'zip_code': '98115',
                'phone': '(206) 555-0789',
                'email': 'westside@bookedbarber.com',
                'status': LocationStatus.ACTIVE,
                'compensation_model': CompensationModel.HYBRID,
                'total_chairs': 5,
                'active_chairs': 3,
                'business_hours': {
                    'monday': {'open': '09:00', 'close': '18:00'},
                    'tuesday': {'open': '09:00', 'close': '18:00'},
                    'wednesday': {'open': '09:00', 'close': '18:00'},
                    'thursday': {'open': '09:00', 'close': '19:00'},
                    'friday': {'open': '09:00', 'close': '19:00'},
                    'saturday': {'open': '08:00', 'close': '17:00'},
                    'sunday': {'open': '11:00', 'close': '16:00'}
                },
                'timezone': 'America/Los_Angeles'
            }
        ]
        
        # Create locations
        created_locations = []
        for location_data in locations_data:
            location = BarbershopLocation(**location_data)
            db.add(location)
            created_locations.append(location)
        
        db.commit()
        
        for location in created_locations:
            db.refresh(location)
            logger.info(f"Created location: {location.id} - {location.name}")
        
        logger.info(f"Successfully created {len(created_locations)} test locations")
        
    except Exception as e:
        logger.error(f"Error creating test locations: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    create_test_locations()