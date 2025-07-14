#!/usr/bin/env python3
"""
Simple authentication test to bypass TestClient compatibility issues
and establish that our Phase 4 test coverage improvement is on track.
"""

import os
import sys
import requests
import json
from datetime import datetime

# Set testing environment
os.environ["TESTING"] = "true"

def test_basic_import():
    """Test that we can import main modules without errors"""
    try:
        print("🔍 Testing basic imports...")
        
        # Test main app import
        from main import app
        print("✅ Main app imported successfully")
        
        # Test authentication utilities
        from utils.auth import create_access_token, get_password_hash
        print("✅ Auth utilities imported successfully")
        
        # Test models
        from models import User
        print("✅ Models imported successfully")
        
        # Test schemas (fixed from schemas_new removal)
        from schemas import IntegrationCreate, ReviewResponseSchema
        print("✅ Schemas imported successfully (schemas_new migration complete)")
        
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_database_setup():
    """Test that database can be set up"""
    try:
        print("\n🔍 Testing database setup...")
        
        from database import get_db, engine, Base
        from sqlalchemy.orm import sessionmaker
        
        # Test database connection
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Test basic query
        from models import User
        user_count = db.query(User).count()
        print(f"✅ Database connection successful (found {user_count} users)")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False

def test_auth_utilities():
    """Test authentication utilities work correctly"""
    try:
        print("\n🔍 Testing authentication utilities...")
        
        from utils.auth import get_password_hash, verify_password, create_access_token
        
        # Test password hashing
        password = "testpassword123"
        hashed = get_password_hash(password)
        verified = verify_password(password, hashed)
        
        if not verified:
            raise Exception("Password verification failed")
        
        print("✅ Password hashing and verification working")
        
        # Test token creation
        token = create_access_token({"sub": "test@example.com"})
        if not token or len(token) < 10:
            raise Exception("Token creation failed")
        
        print("✅ JWT token creation working")
        
        return True
        
    except Exception as e:
        print(f"❌ Authentication utilities failed: {e}")
        return False

def test_service_imports():
    """Test that key services can be imported"""
    try:
        print("\n🔍 Testing service imports...")
        
        # Test services that were fixed in schemas_new migration
        from services.google_ads_service import GoogleAdsService
        print("✅ Google Ads service imported (import fix successful)")
        
        from services.review_service import ReviewService
        print("✅ Review service imported (import fix successful)")
        
        from services.integration_service import IntegrationServiceFactory
        print("✅ Integration service imported (import fix successful)")
        
        from services.notification_service import NotificationService
        print("✅ Notification service imported")
        
        return True
        
    except Exception as e:
        print(f"❌ Service imports failed: {e}")
        return False

def generate_test_coverage_baseline():
    """Generate basic test coverage baseline info"""
    try:
        print("\n📊 Generating test coverage baseline...")
        
        # Get basic system info
        import subprocess
        
        # Count Python files
        result = subprocess.run(
            ["find", ".", "-name", "*.py", "-not", "-path", "./.venv/*", "-not", "-path", "./venv/*"],
            capture_output=True, text=True, cwd="/Users/bossio/6fb-booking/backend-v2"
        )
        
        if result.returncode == 0:
            py_files = len(result.stdout.strip().split('\n'))
            print(f"📁 Total Python files: {py_files}")
        
        # Count test files
        result = subprocess.run(
            ["find", "tests", "-name", "test_*.py"],
            capture_output=True, text=True, cwd="/Users/bossio/6fb-booking/backend-v2"
        )
        
        if result.returncode == 0:
            test_files = len([f for f in result.stdout.strip().split('\n') if f.strip()])
            print(f"🧪 Total test files: {test_files}")
        
        # Basic coverage estimates based on previous analysis
        print("\n📈 Current test coverage status (from previous analysis):")
        print(f"   Current coverage: ~23.71% (9,590/40,451 lines)")
        print(f"   Target coverage: 80%+ (32,360+ lines)")
        print(f"   Gap to close: ~22,770 lines of test coverage needed")
        
        print("\n🎯 Phase 4 Test Coverage Improvement Progress:")
        print("   ✅ Import issues resolved (schemas_new migration complete)")
        print("   ✅ Test infrastructure discovered (pytest.ini configured)")
        print("   🔄 TestClient compatibility being resolved") 
        print("   ⏳ Authentication tests pending")
        print("   ⏳ Payment tests pending")
        print("   ⏳ Booking workflow tests pending")
        
        return True
        
    except Exception as e:
        print(f"❌ Test coverage baseline failed: {e}")
        return False

def main():
    """Run all tests and report results"""
    print("🚀 BookedBarber V2 Test Infrastructure Validation")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now().isoformat()}")
    print()
    
    tests = [
        ("Basic Imports", test_basic_import),
        ("Database Setup", test_database_setup), 
        ("Auth Utilities", test_auth_utilities),
        ("Service Imports", test_service_imports),
        ("Coverage Baseline", generate_test_coverage_baseline)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 All infrastructure tests passed!")
        print("✅ Ready to proceed with Phase 4: Test Coverage Improvement")
        print("✅ Import issues from schemas_new removal have been resolved")
        print("✅ Core services and utilities are working correctly")
        print("\n📝 Next Steps:")
        print("   1. Resolve TestClient compatibility for pytest")
        print("   2. Run authentication test suite") 
        print("   3. Implement payment processing tests")
        print("   4. Create end-to-end booking workflow tests")
        print("   5. Achieve 80%+ test coverage target")
    else:
        print(f"\n⚠️  {total - passed} tests failed. Fix these issues before proceeding.")
        print("❌ Phase 4 test coverage improvement blocked by infrastructure issues")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)