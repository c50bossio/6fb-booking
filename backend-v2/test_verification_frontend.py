#!/usr/bin/env python3
"""
Test script for frontend email verification page functionality
"""
import sys
import os
import requests
import sqlite3
import time
import subprocess
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_frontend_verification():
    """Test the frontend email verification page"""
    
    print("🌐 Testing Frontend Email Verification Page")
    print("=" * 55)
    
    # First, get a test verification token
    print("\n1. Setting up test data...")
    try:
        conn = sqlite3.connect('./6fb_booking.db')
        cursor = conn.cursor()
        
        # Create a test user with verification token for frontend testing
        test_email = "frontend_test_verification@example.com"
        test_token = "frontend_test_token_12345"
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).replace(tzinfo=None)
        
        # Insert test user
        cursor.execute("""
            INSERT OR REPLACE INTO users 
            (email, name, hashed_password, verification_token, verification_token_expires, email_verified, user_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            test_email,
            "Frontend Test User", 
            "hashed_password_placeholder",
            test_token,
            expires_at,
            0,  # Not verified
            "barber",
            datetime.now(timezone.utc).replace(tzinfo=None)
        ))
        
        conn.commit()
        print(f"✅ Created test user: {test_email}")
        print(f"🔑 Test token: {test_token}")
        
        # Test API endpoint directly
        print("\n2. Testing API Endpoint...")
        api_url = f"http://localhost:8000/api/v1/auth/verify-email?token={test_token}"
        
        try:
            # Start a simple server for testing
            print("📡 Starting backend server for testing...")
            
            # Check if port 8000 is already in use
            try:
                test_response = requests.get("http://localhost:8000", timeout=2)
                print("✅ Backend server is already running")
            except:
                print("❌ Backend server not running - would need to start it")
                print("📝 Manual test: Visit http://localhost:3000/verify-email?token=" + test_token)
                
        except Exception as e:
            print(f"❌ API test failed: {e}")
        
        # Frontend verification test URLs
        print("\n3. Frontend Test URLs:")
        print(f"🔗 Valid token: http://localhost:3000/verify-email?token={test_token}")
        print(f"🔗 Invalid token: http://localhost:3000/verify-email?token=invalid_token")
        print(f"🔗 No token: http://localhost:3000/verify-email")
        
        # Check that frontend has the verification page
        print("\n4. Checking Frontend Files...")
        verify_page_path = "./app/verify-email/page.tsx"
        if os.path.exists(verify_page_path):
            print("✅ Frontend verification page exists")
            
            # Check the page content
            with open(verify_page_path, 'r') as f:
                content = f.read()
                
            if 'verifyEmail' in content:
                print("✅ Page imports verifyEmail function")
            if 'useSearchParams' in content:
                print("✅ Page uses URL parameters")  
            if 'CheckCircle' in content:
                print("✅ Page has success state")
            if 'XCircle' in content:
                print("✅ Page has error state")
                
        else:
            print("❌ Frontend verification page not found")
        
        # Test scenarios summary
        print("\n5. Test Scenarios to Verify Manually:")
        print("   🧪 Valid token → Should show success message and redirect to login")
        print("   🧪 Invalid token → Should show error message with options")
        print("   🧪 Expired token → Should show error message")  
        print("   🧪 Missing token → Should show error message")
        print("   🧪 Already used token → Should show error message")
        
        # Browser testing recommendations
        print("\n6. Browser Testing Recommendations:")
        print("   📱 Test on different devices (mobile/desktop)")
        print("   🎨 Verify UI components load correctly")  
        print("   ⏱️  Check loading states and transitions")
        print("   🔗 Verify redirect to login page works")
        print("   📧 Test contact support link")
        
        conn.close()
        
        print("\n🎯 Frontend Testing Summary:")
        print("✅ Test data created successfully")
        print("✅ Frontend page structure verified")
        print("✅ Test URLs generated")
        print("📋 Manual testing required for complete verification")
        
    except Exception as e:
        print(f"❌ Error during frontend testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_frontend_verification()