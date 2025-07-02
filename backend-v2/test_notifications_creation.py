#!/usr/bin/env python3
"""
Test script to verify notification creation in test data service
"""

from sqlalchemy.orm import Session
from config.database import SessionLocal
from services.test_data_service import create_test_data_for_user, get_test_data_status
import sys

def test_notification_creation():
    """Test that notifications are created properly"""
    db = SessionLocal()
    try:
        # Use user_id 1 for testing (adjust as needed)
        user_id = 1
        
        # Check current status
        print("Current test data status:")
        status = get_test_data_status(db, user_id)
        print(f"Has test data: {status['has_test_data']}")
        for key, count in status['counts'].items():
            print(f"  {key}: {count}")
        
        # Create test data
        print("\nCreating test data...")
        result = create_test_data_for_user(db, user_id)
        
        if result['success']:
            print(f"\nSuccess! {result['message']}")
            print("\nCreated items:")
            for key, count in result['created'].items():
                print(f"  {key}: {count}")
        else:
            print(f"\nError: {result['message']}")
            print(f"Details: {result.get('error', 'No details')}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_notification_creation()