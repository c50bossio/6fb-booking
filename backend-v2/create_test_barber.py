import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_barber():
    db = SessionLocal()
    try:
        # Check if test barber already exists
        existing = db.query(User).filter(User.email == "test-barber@6fb.com").first()
        if existing:
            print("Test barber already exists")
            return
        
        # Create test barber
        test_barber = User(
            email="test-barber@6fb.com",
            first_name="Test",
            last_name="Barber",
            hashed_password=pwd_context.hash("test123"),
            role="barber",
            is_active=True,
            phone="+1234567890"
        )
        
        db.add(test_barber)
        db.commit()
        
        print("✅ Test barber created successfully!")
        print("Email: test-barber@6fb.com")
        print("Password: test123")
        
    except Exception as e:
        print(f"Error creating test barber: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_barber()