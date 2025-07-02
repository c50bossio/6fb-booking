#!/usr/bin/env python3
"""Test script for enterprise data creation"""

from sqlalchemy.orm import Session
from database import get_db, engine
from services.test_data_service import create_test_data_for_user, get_test_data_status
import models

def test_enterprise_data():
    """Test the enterprise data creation"""
    db = next(get_db())
    
    try:
        # Create a test user
        test_user = models.User(
            email="enterprise_test@example.com",
            name="Enterprise Test User",
            hashed_password="test",
            role="admin"
        )
        db.add(test_user)
        db.commit()
        
        print(f"Created test user: {test_user.email} (ID: {test_user.id})")
        
        # Create test data with enterprise
        print("\nCreating test data with enterprise...")
        result = create_test_data_for_user(db, test_user.id, include_enterprise=True)
        
        if result["success"]:
            print("\nTest data created successfully!")
            print(f"Created items: {result['created']}")
        else:
            print(f"\nError creating test data: {result['error']}")
        
        # Check status
        print("\nChecking test data status...")
        status = get_test_data_status(db, test_user.id)
        print(f"Status: {status}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        try:
            db.query(models.User).filter_by(email="enterprise_test@example.com").delete()
            db.commit()
        except:
            pass
        db.close()

if __name__ == "__main__":
    test_enterprise_data()