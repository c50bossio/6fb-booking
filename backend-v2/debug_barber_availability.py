#!/usr/bin/env python3
"""
Debug script to check barber availability data and setup.
"""

import sys
import logging
from datetime import time, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the backend-v2 directory to Python path
sys.path.insert(0, '/Users/bossio/6fb-booking/backend-v2')

def check_barbers():
    """Check what barbers exist in the system"""
    logger.info("Checking barbers in system...")
    
    try:
        from db import get_db
        import models
        
        db = next(get_db())
        
        # Get all users with barber roles
        barbers = db.query(models.User).filter(
            models.User.role.in_(["barber", "admin", "super_admin"]),
            models.User.is_active == True
        ).all()
        
        logger.info(f"Found {len(barbers)} potential barbers:")
        for barber in barbers:
            logger.info(f"  - ID: {barber.id}, Name: {barber.name}, Email: {barber.email}, Role: {barber.role}")
        
        db.close()
        return barbers
        
    except Exception as e:
        logger.error(f"Error checking barbers: {e}")
        return []

def check_barber_availability():
    """Check barber availability records"""
    logger.info("Checking barber availability records...")
    
    try:
        from db import get_db
        import models
        
        db = next(get_db())
        
        # Check if BarberAvailability table exists and has records
        try:
            availability_records = db.query(models.BarberAvailability).all()
            logger.info(f"Found {len(availability_records)} availability records:")
            
            for record in availability_records:
                logger.info(f"  - Barber ID: {record.barber_id}, Day: {record.day_of_week}, "
                          f"Time: {record.start_time} - {record.end_time}, Active: {record.is_active}")
        
        except Exception as e:
            logger.warning(f"BarberAvailability table issue: {e}")
            logger.info("This table might not exist or be properly initialized")
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error checking availability: {e}")

def create_default_barber_availability():
    """Create default availability for existing barbers"""
    logger.info("Creating default barber availability...")
    
    try:
        from db import get_db
        import models
        
        db = next(get_db())
        
        # Get all barbers
        barbers = db.query(models.User).filter(
            models.User.role.in_(["barber", "admin", "super_admin"]),
            models.User.is_active == True
        ).all()
        
        if not barbers:
            logger.warning("No barbers found to create availability for")
            return
        
        # Check if BarberAvailability table exists
        try:
            # Create default Monday-Friday 9 AM - 5 PM availability for each barber
            for barber in barbers:
                logger.info(f"Creating availability for barber {barber.name} (ID: {barber.id})")
                
                # Monday to Friday (0-4 in Python's weekday)
                for day in range(5):  # 0 = Monday, 4 = Friday
                    # Check if availability already exists
                    existing = db.query(models.BarberAvailability).filter(
                        models.BarberAvailability.barber_id == barber.id,
                        models.BarberAvailability.day_of_week == day,
                        models.BarberAvailability.is_active == True
                    ).first()
                    
                    if not existing:
                        availability = models.BarberAvailability(
                            barber_id=barber.id,
                            day_of_week=day,
                            start_time=time(9, 0),  # 9:00 AM
                            end_time=time(17, 0),   # 5:00 PM
                            is_active=True
                        )
                        db.add(availability)
                        logger.info(f"  - Added availability for day {day} (9:00-17:00)")
                    else:
                        logger.info(f"  - Availability already exists for day {day}")
            
            db.commit()
            logger.info("✓ Default barber availability created")
            
        except Exception as e:
            logger.error(f"Error creating availability: {e}")
            # Check if the table exists
            logger.info("Checking if BarberAvailability table exists...")
            try:
                from sqlalchemy import inspect
                inspector = inspect(db.bind)
                tables = inspector.get_table_names()
                if 'barber_availability' in tables:
                    logger.info("✓ BarberAvailability table exists")
                else:
                    logger.error("❌ BarberAvailability table does not exist!")
                    logger.info("Available tables:", tables)
            except Exception as table_check_error:
                logger.error(f"Error checking tables: {table_check_error}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error in create_default_barber_availability: {e}")

def test_barber_availability_service():
    """Test the barber availability service with a specific time"""
    logger.info("Testing barber availability service...")
    
    try:
        from db import get_db
        from services import barber_availability_service
        from datetime import date, time
        
        db = next(get_db())
        
        # Test for tomorrow at 2 PM
        test_date = date.today() + timedelta(days=1)
        test_start_time = time(14, 0)  # 2:00 PM
        test_end_time = time(14, 30)   # 2:30 PM
        
        logger.info(f"Testing availability for {test_date} from {test_start_time} to {test_end_time}")
        
        available_barbers = barber_availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=test_date,
            start_time=test_start_time,
            end_time=test_end_time
        )
        
        logger.info(f"Found {len(available_barbers)} available barbers:")
        for barber in available_barbers:
            logger.info(f"  - {barber.name} (ID: {barber.id})")
        
        if not available_barbers:
            logger.warning("❌ No barbers available - this is the root cause of the hanging!")
        else:
            logger.info("✓ Barbers are available")
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error testing barber availability service: {e}")

def main():
    """Main debug function"""
    logger.info("🔍 Starting barber availability debugging...")
    
    # Check barbers
    barbers = check_barbers()
    
    # Check availability records
    check_barber_availability()
    
    # Create default availability if needed
    if barbers:
        create_default_barber_availability()
    
    # Test the service
    test_barber_availability_service()
    
    logger.info("🔍 Barber availability debugging completed")

if __name__ == "__main__":
    main()