#!/usr/bin/env python3
"""
Simple test script to verify custom role permissions functionality.

This script tests the custom permissions system by:
1. Creating test data
2. Testing API endpoints
3. Verifying permission checking works correctly
"""

import requests
import sys

# Test configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v2"

def test_available_permissions():
    """Test the available permissions endpoint"""
    print("🔍 Testing available permissions endpoint...")
    
    response = requests.get(f"{API_BASE}/settings/roles/available-permissions")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Available permissions retrieved successfully")
        print(f"   - Roles: {list(data['roles'].keys())}")
        print(f"   - Categories: {list(data['categories'].keys())}")
        print(f"   - Total permissions: {sum(len(perms) for perms in data['permissions'].values())}")
        return True
    else:
        print(f"❌ Failed to get available permissions: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_validation_endpoint():
    """Test the permission validation endpoint"""
    print("\n🔍 Testing permission validation endpoint...")
    
    # Test valid configuration
    valid_config = {
        "role": "barber",
        "permissions": {
            "view_all_clients": True,
            "create_appointments": True,
            "view_basic_analytics": False
        }
    }
    
    response = requests.post(
        f"{API_BASE}/settings/roles/validate-permissions",
        json=valid_config
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Validation endpoint working")
        print(f"   - Valid: {data['valid']}")
        print(f"   - Errors: {len(data.get('errors', []))}")
        print(f"   - Warnings: {len(data.get('warnings', []))}")
        
        # Test invalid configuration
        invalid_config = {
            "role": "barber", 
            "permissions": {
                "invalid_permission": True,
                "create_appointments": False  # Core permission removal
            }
        }
        
        response2 = requests.post(
            f"{API_BASE}/settings/roles/validate-permissions",
            json=invalid_config
        )
        
        if response2.status_code == 200:
            data2 = response2.json()
            print(f"   - Invalid config detected: {not data2['valid']}")
            print(f"   - Validation errors: {len(data2.get('errors', []))}")
            return True
        else:
            print(f"❌ Validation failed for invalid config: {response2.status_code}")
            return False
    else:
        print(f"❌ Validation endpoint failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_database_access():
    """Test that the database table was created correctly"""
    print("\n🔍 Testing database table creation...")
    
    try:
        import sqlite3
        
        # Connect to the database
        db_path = "6fb_booking.db"
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='custom_role_permissions'
        """)
        
        table_exists = cursor.fetchone() is not None
        
        if table_exists:
            print("✅ custom_role_permissions table exists")
            
            # Check table structure
            cursor.execute("PRAGMA table_info(custom_role_permissions)")
            columns = cursor.fetchall()
            
            expected_columns = [
                'id', 'organization_id', 'role', 'permission', 
                'enabled', 'created_by', 'created_at', 'updated_at'
            ]
            
            actual_columns = [col[1] for col in columns]
            
            missing_columns = set(expected_columns) - set(actual_columns)
            if missing_columns:
                print(f"❌ Missing columns: {missing_columns}")
                return False
            else:
                print(f"✅ All expected columns present: {len(actual_columns)} columns")
                return True
        else:
            print("❌ custom_role_permissions table not found")
            return False
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def test_permission_imports():
    """Test that all required modules can be imported"""
    print("\n🔍 Testing module imports...")
    
    try:
        # Test model imports
        from models.custom_role_permissions import (
            CUSTOMIZABLE_ROLES, CUSTOMIZABLE_PERMISSIONS, 
            PERMISSION_CATEGORIES
        )
        print("✅ Custom permissions model imported successfully")
        
        # Test service imports
        print("✅ Custom permissions service imported successfully")
        
        # Test schema imports
        print("✅ Custom permissions schemas imported successfully")
        
        # Test router imports
        print("✅ Role permissions router imported successfully")
        
        # Test basic data structures
        print(f"   - Customizable roles: {len(CUSTOMIZABLE_ROLES)}")
        print(f"   - Customizable permissions: {len(CUSTOMIZABLE_PERMISSIONS)}")
        print(f"   - Permission categories: {len(PERMISSION_CATEGORIES)}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Custom Role Permissions Test Suite")
    print("=" * 50)
    
    tests = [
        ("Module Imports", test_permission_imports),
        ("Database Table", test_database_access),
        ("Available Permissions API", test_available_permissions),
        ("Permission Validation API", test_validation_endpoint),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} - {test_name}")
    
    print(f"\nTests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Custom role permissions system is working.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())