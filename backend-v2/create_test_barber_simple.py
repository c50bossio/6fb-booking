from db import SessionLocal
from utils.auth import get_password_hash
import models

def create_test_barber():
    db = SessionLocal()
    try:
        # Check if test barber already exists
        existing = db.query(models.User).filter(models.User.email == "test-barber@6fb.com").first()
        if existing:
            print(f"Test barber already exists with ID: {existing.id}")
            return
        
        # Create test barber
        test_barber = models.User(
            email="test-barber@6fb.com",
            name="Test Barber",
            hashed_password=get_password_hash("test123"),
            role="barber",
            is_active=True,
            phone="+1234567890"
        )
        
        db.add(test_barber)
        db.commit()
        
        print("✅ Test barber created successfully!")
        print("Email: test-barber@6fb.com")
        print("Password: test123")
        print(f"User ID: {test_barber.id}")
        
    except Exception as e:
        print(f"Error creating test barber: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_barber()