from db import SessionLocal
from utils.auth import verify_password
import models

db = SessionLocal()

# Find user
user = db.query(models.User).filter(models.User.email == "test@example.com").first()

if user:
    print(f"User found: {user.email}")
    print(f"User ID: {user.id}")
    print(f"User role: {user.role}")
    print(f"Is active: {user.is_active}")
    print(f"Has password: {bool(user.hashed_password)}")
    
    # Test password
    if verify_password("TestPass123", user.hashed_password):
        print("✓ Password is correct!")
    else:
        print("✗ Password is incorrect")
        # Let's set the correct password
        from utils.auth import get_password_hash
        user.hashed_password = get_password_hash("TestPass123")
        db.commit()
        print("→ Password has been updated to TestPass123")
else:
    print("User not found!")

db.close()