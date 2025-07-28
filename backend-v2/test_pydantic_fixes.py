#!/usr/bin/env python3
"""
Test that our Pydantic fixes work correctly
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

def test_schema_imports():
    """Test that schema modules can be imported"""
    try:
        # Test critical schema imports
        from schemas_new import commission, product, booking_validation, review, agent, basic
        from schemas import BaseResponse
        print("✅ Schema imports successful")
        return True
    except Exception as e:
        print(f"❌ Schema import failed: {e}")
        return False

def test_schema_instantiation():
    """Test that schemas can be instantiated"""
    try:
        from schemas_new.basic import UserBase, BookingCreate
        from datetime import date, time
        
        # Test basic model creation
        user = UserBase(email="test@example.com", name="Test User")
        booking = BookingCreate(date=date.today(), time=time(10, 0))
        
        print("✅ Schema instantiation successful")
        return True
    except Exception as e:
        print(f"❌ Schema instantiation failed: {e}")
        return False

def test_field_validation():
    """Test that field validation works"""
    try:
        from schemas_new.basic import UserBase
        
        # Test validation works
        try:
            UserBase(email="invalid-email", name="Test")
            print("❌ Validation should have failed for invalid email")
            return False
        except Exception:
            print("✅ Field validation working correctly")
            return True
            
    except Exception as e:
        print(f"❌ Field validation test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing Pydantic fixes...")
    
    tests = [
        test_schema_imports,
        test_schema_instantiation, 
        test_field_validation
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
    
    print(f"\nResults: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All Pydantic fixes are working correctly!")
        return 0
    else:
        print("⚠️  Some tests failed - there may be remaining issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())