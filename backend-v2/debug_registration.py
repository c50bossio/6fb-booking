#!/usr/bin/env python3
"""
Debug script to test registration functionality and identify the exact error.
"""

import sys
import traceback
from datetime import datetime, timedelta, timezone

# Add the backend directory to Python path
sys.path.insert(0, '/Users/bossio/6fb-booking/backend-v2')

def test_registration():
    print("🔍 Testing registration components...")
    
    try:
        # Test 1: Schema validation
        print("\n1️⃣ Testing schema validation...")
        import uuid
        from schemas_new.auth import UserCreate
        unique_email = f'test-{uuid.uuid4().hex[:8]}@example.com'
        user_data = UserCreate(
            email=unique_email,
            password='TestPassword123@',
            name='Test User',
            role='barber'
        )
        print("✅ Schema validation passed")
        print(f"   Data: {user_data}")
        
        # Test 2: Password validation
        print("\n2️⃣ Testing password validation...")
        from services.password_security import validate_password_strength
        password_validation = validate_password_strength(
            user_data.password,
            user_data={
                "email": user_data.email,
                "name": user_data.name
            }
        )
        print(f"   Password valid: {password_validation.is_valid}")
        if not password_validation.is_valid:
            print(f"   Errors: {password_validation.errors}")
            print("❌ Password validation failed")
            return False
        print("✅ Password validation passed")
        
        # Test 3: Password hashing
        print("\n3️⃣ Testing password hashing...")
        from utils.auth import get_password_hash
        hashed_password = get_password_hash(user_data.password)
        print("✅ Password hashing passed")
        
        # Test 4: User model creation
        print("\n4️⃣ Testing User model creation...")
        import models
        trial_start = datetime.now(timezone.utc).replace(tzinfo=None)
        trial_end = trial_start + timedelta(days=14)
        
        new_user = models.User(
            email=user_data.email,
            name=user_data.name,
            hashed_password=hashed_password,
            role=user_data.role,
            trial_started_at=trial_start,
            trial_expires_at=trial_end,
            trial_active=True,
            subscription_status="trial"
        )
        print("✅ User model creation passed")
        print(f"   User: {new_user.email}, Role: {new_user.role}")
        
        # Test 5: Database connection
        print("\n5️⃣ Testing database connection...")
        from database import get_db
        db = next(get_db())
        print("✅ Database connection passed")
        
        # Test 6: Email verification imports
        print("\n6️⃣ Testing email verification imports...")
        from utils.email_verification import (
            create_verification_token,
            send_verification_email
        )
        print("✅ Email verification imports passed")
        
        # Test 7: Save user to database first
        print("\n7️⃣ Testing database save...")
        try:
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            print("✅ Database save passed")
        except Exception as e:
            print(f"❌ Database save failed: {e}")
            traceback.print_exc()
            return False
        
        # Test 8: Create verification token
        print("\n8️⃣ Testing verification token creation...")
        try:
            verification_token = create_verification_token(db, new_user)
            print("✅ Verification token creation passed")
            print(f"   Token: {verification_token[:10]}...")
        except Exception as e:
            print(f"❌ Verification token creation failed: {e}")
            traceback.print_exc()
            return False
        
        print("\n🎉 All tests passed! Registration should work.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_registration()
    sys.exit(0 if success else 1)