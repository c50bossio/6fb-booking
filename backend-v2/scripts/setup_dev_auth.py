#!/usr/bin/env python3
"""
Development Authentication Setup Script

This script creates a test user and provides instructions for using the development authentication bypass.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from db import get_db, engine
from models import User
from utils.auth import get_password_hash
from config import settings

def create_dev_user():
    """Create a development test user."""
    db = Session(engine)
    try:
        # Check if dev user already exists
        dev_user = db.query(User).filter(User.email == "dev@bookedbarber.com").first()
        
        if dev_user:
            print("✅ Development user already exists:")
            print(f"   Email: {dev_user.email}")
            print(f"   Name: {dev_user.name}")
            print(f"   Role: {dev_user.role}")
            print(f"   Active: {dev_user.is_active}")
        else:
            # Create dev user
            dev_user = User(
                email="dev@bookedbarber.com",
                name="Dev User",
                role="barber",
                hashed_password=get_password_hash("dev"),
                is_active=True
            )
            db.add(dev_user)
            db.commit()
            db.refresh(dev_user)
            
            print("✅ Created development user:")
            print(f"   Email: {dev_user.email}")
            print(f"   Password: dev")
            print(f"   Name: {dev_user.name}")
            print(f"   Role: {dev_user.role}")
            
        return dev_user
    except Exception as e:
        print(f"❌ Error creating dev user: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def show_auth_instructions():
    """Show instructions for using development authentication."""
    print("\n🚀 Development Authentication Instructions:")
    print("=" * 50)
    
    print("\n1. Manual Login (Traditional):")
    print("   • Email: dev@bookedbarber.com")
    print("   • Password: dev")
    
    print("\n2. Development Bypass Token (Automatic):")
    print("   • Token: 'dev-token-bypass'")
    print("   • Works in development environment only")
    print("   • Automatically creates/uses dev user")
    
    print("\n3. API Testing with cURL:")
    print("   # Using bypass token")
    print('   curl -H "Authorization: Bearer dev-token-bypass" http://localhost:8000/api/v2/search/recent')
    
    print("\n4. Frontend Development:")
    print("   • Set localStorage token: localStorage.setItem('token', 'dev-token-bypass')")
    print("   • Or use regular login with dev@bookedbarber.com / dev")
    
    print("\n5. Test API Endpoints:")
    print("   • Recent searches: GET /api/v2/search/recent")
    print("   • Search barbers: GET /api/v2/search/barbers?q=test")
    print("   • User profile: GET /api/v2/auth/me")

def test_auth_endpoints():
    """Test authentication endpoints."""
    import requests
    
    print("\n🧪 Testing Authentication Endpoints:")
    print("=" * 40)
    
    try:
        # Test dev bypass token
        headers = {"Authorization": "Bearer dev-token-bypass"}
        
        # Test user profile endpoint
        response = requests.get("http://localhost:8000/api/v2/auth/me", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ User profile: {user_data.get('email')} ({user_data.get('role')})")
        else:
            print(f"❌ User profile failed: {response.status_code}")
        
        # Test search endpoint
        response = requests.get("http://localhost:8000/api/v2/search/recent", headers=headers)
        if response.status_code == 200:
            print("✅ Search endpoint accessible")
        else:
            print(f"❌ Search endpoint failed: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️  Backend server not running on localhost:8000")
        print("   Start the backend with: uvicorn main:app --reload")

def main():
    """Main setup function."""
    print("🔧 Setting up Development Authentication")
    print("=" * 50)
    
    # Check environment
    if settings.environment != "development":
        print(f"⚠️  Warning: Environment is '{settings.environment}', not 'development'")
        print("   Development bypass tokens only work in development environment")
    else:
        print("✅ Environment: development")
    
    # Create dev user
    dev_user = create_dev_user()
    
    if dev_user:
        # Show instructions
        show_auth_instructions()
        
        # Test endpoints
        test_auth_endpoints()
        
        print("\n🎉 Development authentication setup complete!")
        print("   You can now use the bypass token or manual login to access protected endpoints.")
    else:
        print("❌ Failed to set up development authentication")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())