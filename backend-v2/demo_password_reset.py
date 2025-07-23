#!/usr/bin/env python3
"""
Demo script to show the complete password reset flow
"""
import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from db import get_db, engine
from utils.password_reset import create_password_reset_token, send_reset_email
from utils.auth import get_password_hash
import models

def demo_password_reset():
    """Demonstrate the complete password reset flow"""
    print("🎯 6FB Password Reset Flow Demo")
    print("=" * 60)
    
    # Create a test user
    test_email = "demo@6fb.com"
    test_name = "Demo User"
    
    print(f"\n1️⃣ Setting up demo user: {test_email}")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == test_email).first()
        
        if not user:
            # Create user
            user = models.User(
                email=test_email,
                name=test_name,
                hashed_password=get_password_hash("DemoPassword123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Created demo user: {test_email}")
        else:
            print(f"✅ Demo user already exists: {test_email}")
        
        # Create password reset token
        print(f"\n2️⃣ Creating password reset token")
        reset_token = create_password_reset_token(db, user)
        print(f"✅ Token created: {reset_token.token[:8]}...")
        print(f"   Expires at: {reset_token.expires_at}")
        
        # Generate reset URL
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?token={reset_token.token}"
        
        print(f"\n3️⃣ Password Reset URL:")
        print("=" * 60)
        print(f"🔗 {reset_url}")
        print("=" * 60)
        
        # Send email
        print(f"\n4️⃣ Sending password reset email")
        send_reset_email(test_email, reset_token.token, test_name)
        
        # Instructions
        print(f"\n5️⃣ Next Steps:")
        print("   1. If SendGrid is configured, check the email at:", test_email)
        print("   2. Otherwise, check the console output above for the email content")
        print("   3. Click the reset link or paste the URL in your browser")
        print("   4. Enter a new password that meets the requirements:")
        print("      - At least 8 characters")
        print("      - One uppercase letter")
        print("      - One lowercase letter") 
        print("      - One number")
        print("   5. After resetting, login with your new password")
        
        print(f"\n📝 Demo Details:")
        print(f"   Email: {test_email}")
        print(f"   Original Password: DemoPassword123!")
        print(f"   Token (for API testing): {reset_token.token}")
        
        # Show how to test via API
        print(f"\n🧪 To test via API:")
        print(f"   curl -X POST http://localhost:8000/api/v1/auth/reset-password \\")
        print(f"     -H 'Content-Type: application/json' \\")
        print(f"     -d '{{\"token\": \"{reset_token.token}\", \"new_password\": \"NewPassword123!\"}}'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
    
    print("\n✨ Demo completed!")

if __name__ == "__main__":
    demo_password_reset()