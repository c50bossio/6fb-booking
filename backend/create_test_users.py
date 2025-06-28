#!/usr/bin/env python3
"""
Create test users for authentication testing
"""

from models.user import User
from passlib.context import CryptContext
from config.database import SessionLocal
from datetime import datetime

# Create password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create database session
db = SessionLocal()

# Test users data
test_users = [
    {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "password": "testpassword123",
        "role": "barber",
        "is_active": True,
        "is_verified": True,
    },
    {
        "email": "admin@6fb.com",
        "first_name": "Admin",
        "last_name": "User",
        "password": "admin123",
        "role": "super_admin",
        "is_active": True,
        "is_verified": True,
    },
]

# Create users
for user_data in test_users:
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data["email"]).first()

    if existing_user:
        print(f"✓ User {user_data['email']} already exists")
        continue

    # Create new user
    user = User(
        email=user_data["email"],
        first_name=user_data["first_name"],
        last_name=user_data["last_name"],
        hashed_password=pwd_context.hash(user_data["password"]),
        role=user_data["role"],
        is_active=user_data["is_active"],
        is_verified=user_data["is_verified"],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()

    print(
        f"✅ Created user: {user_data['email']} / {user_data['password']} (role: {user_data['role']})"
    )

print("\n📋 Test Users Summary:")
print("- Regular User: test@example.com / testpassword123")
print("- Admin User: admin@6fb.com / admin123")

db.close()
