#!/usr/bin/env python3
"""
Reset admin password to ensure it's working
"""

from sqlalchemy.orm import Session
from database import engine
from models import User
from utils.auth import get_password_hash, verify_password

def reset_admin():
    db = Session(bind=engine)
    
    try:
        # Find the admin user
        user = db.query(User).filter(User.email == "admin@bookedbarber.com").first()
        
        if not user:
            print("❌ Admin user not found!")
            return
            
        # Update password
        new_password = "password123"
        user.hashed_password = get_password_hash(new_password)
        user.is_active = True
        user.email_verified = True
        
        db.commit()
        
        # Verify the password works
        if verify_password(new_password, user.hashed_password):
            print("✅ Password reset successful!")
            print(f"📧 Email: {user.email}")
            print(f"🔑 Password: {new_password}")
            print(f"🛡️ Role: {user.unified_role}")
            print("🌐 Try logging in at: http://localhost:3000/login")
        else:
            print("❌ Password verification failed after reset!")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()