#!/usr/bin/env python3
"""
Simple test to create a user and verify login works
"""
import sys
sys.path.append('/Users/bossio/6fb-booking/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import User
from passlib.context import CryptContext
from config.database import DATABASE_URL

# Create database session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test credentials
email = "demo@example.com"
password = "DemoPass123!"

print("Creating demo user...")

# Check if user exists
existing_user = db.query(User).filter(User.email == email).first()
if existing_user:
    print(f"User {email} already exists, deleting...")
    db.delete(existing_user)
    db.commit()

# Create new user
hashed_password = pwd_context.hash(password)
new_user = User(
    email=email,
    hashed_password=hashed_password,
    first_name="Demo",
    last_name="User",
    role="barber",
    is_active=True
)

db.add(new_user)
db.commit()
db.refresh(new_user)

print(f"✅ User created successfully!")
print(f"   ID: {new_user.id}")
print(f"   Email: {new_user.email}")
print(f"   Name: {new_user.first_name} {new_user.last_name}")
print(f"   Password Hash: {new_user.hashed_password[:20]}...")

# Verify password
print(f"\nVerifying password...")
is_valid = pwd_context.verify(password, new_user.hashed_password)
print(f"   Password verification: {'✅ PASSED' if is_valid else '❌ FAILED'}")

print(f"\n📝 Login Credentials:")
print(f"   Email: {email}")
print(f"   Password: {password}")
print(f"\n✅ You can now login at http://localhost:3000/login")

db.close()