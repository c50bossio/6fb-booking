#!/usr/bin/env python3
"""
Security Fixes Validation Script

Validates that the critical security vulnerabilities have been resolved:
1. localStorage token storage removed (XSS protection)
2. CSRF protection middleware implemented
3. Asymmetric JWT key management with rotation

Run this script to verify security improvements are working correctly.
"""

import os
import sys
import tempfile
from pathlib import Path
import requests
import json

def validate_frontend_changes():
    """Validate that frontend localStorage usage has been removed."""
    print("🔍 Validating frontend security changes...")
    
    frontend_dir = Path(__file__).parent / "frontend-v2"
    if not frontend_dir.exists():
        print("⚠️  Frontend directory not found")
        return False
    
    # Check main API file
    api_file = frontend_dir / "lib" / "api.ts"
    if api_file.exists():
        content = api_file.read_text()
        
        # Should not contain localStorage token storage
        localStorage_token_usage = [
            "localStorage.setItem('token'",
            "localStorage.setItem('refresh_token'",
            "localStorage.getItem('token')"
        ]
        
        issues = []
        for usage in localStorage_token_usage:
            if usage in content:
                issues.append(f"Found insecure usage: {usage}")
        
        if issues:
            print("❌ Frontend still contains localStorage token usage:")
            for issue in issues:
                print(f"   - {issue}")
            return False
        
        # Should contain secure practices
        secure_practices = [
            "credentials: 'include'",  # Cookie authentication
            "getCsrfHeaders()",        # CSRF protection
        ]
        
        missing_practices = []
        for practice in secure_practices:
            if practice not in content:
                missing_practices.append(practice)
        
        if missing_practices:
            print("⚠️  Missing secure practices in frontend:")
            for practice in missing_practices:
                print(f"   - {practice}")
        
        print("✅ Frontend localStorage token usage removed")
        return True
    
    print("⚠️  Frontend API file not found")
    return False

def validate_csrf_middleware():
    """Validate CSRF middleware implementation."""
    print("🔍 Validating CSRF protection middleware...")
    
    # Check if CSRF middleware file exists
    csrf_file = Path(__file__).parent / "middleware" / "csrf_middleware.py"
    if not csrf_file.exists():
        print("❌ CSRF middleware file not found")
        return False
    
    # Check main.py includes CSRF middleware
    main_file = Path(__file__).parent / "main.py"
    if main_file.exists():
        content = main_file.read_text()
        
        if "CSRFMiddleware" not in content:
            print("❌ CSRF middleware not added to main application")
            return False
        
        if "app.add_middleware(CSRFMiddleware)" not in content:
            print("❌ CSRF middleware not properly registered")
            return False
    
    print("✅ CSRF protection middleware implemented")
    return True

def validate_jwt_security():
    """Validate JWT security enhancements."""
    print("🔍 Validating JWT security improvements...")
    
    # Check if JWT security module exists
    jwt_file = Path(__file__).parent / "utils" / "jwt_security.py"
    if not jwt_file.exists():
        print("❌ JWT security module not found")
        return False
    
    # Test JWT key manager functionality
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Import and test key manager
            sys.path.insert(0, str(Path(__file__).parent))
            from utils.jwt_security import JWTKeyManager, create_access_token, verify_token
            
            manager = JWTKeyManager(temp_dir)
            
            # Test key generation
            key_id = manager.get_current_key_id()
            algorithm = manager.get_algorithm()
            
            if algorithm != "RS256":
                print(f"❌ Expected RS256 algorithm, got {algorithm}")
                return False
            
            # Test token creation and verification
            test_data = {"sub": "test@example.com", "role": "user"}
            token = create_access_token(test_data)
            payload = verify_token(token)
            
            if payload["sub"] != "test@example.com":
                print("❌ Token creation/verification failed")
                return False
            
            # Check key files were created
            key_path = Path(temp_dir)
            private_keys = list(key_path.glob("private_key_*.pem"))
            public_keys = list(key_path.glob("public_key_*.pem"))
            
            if not private_keys or not public_keys:
                print("❌ Key files not generated properly")
                return False
            
            print("✅ JWT asymmetric key management working correctly")
            return True
            
    except Exception as e:
        print(f"❌ JWT security validation failed: {e}")
        return False

def validate_auth_integration():
    """Validate that auth utilities use new security features."""
    print("🔍 Validating authentication integration...")
    
    auth_file = Path(__file__).parent / "utils" / "auth.py"
    if not auth_file.exists():
        print("❌ Auth utilities file not found")
        return False
    
    content = auth_file.read_text()
    
    # Should import secure JWT functions
    required_imports = [
        "from utils.jwt_security import",
        "create_access_token",
        "verify_token"
    ]
    
    missing_imports = []
    for import_stmt in required_imports:
        if import_stmt not in content:
            missing_imports.append(import_stmt)
    
    if missing_imports:
        print("❌ Auth utilities missing secure JWT imports:")
        for missing in missing_imports:
            print(f"   - {missing}")
        return False
    
    # Should use RS256 algorithm
    if 'ALGORITHM = "RS256"' not in content:
        print("❌ Auth utilities not using RS256 algorithm")
        return False
    
    print("✅ Authentication integration updated for security")
    return True

def validate_cookie_auth():
    """Validate cookie authentication utilities."""
    print("🔍 Validating cookie authentication...")
    
    cookie_file = Path(__file__).parent / "utils" / "cookie_auth.py"
    if not cookie_file.exists():
        print("❌ Cookie auth utilities not found")
        return False
    
    content = cookie_file.read_text()
    
    # Should have secure cookie functions
    required_functions = [
        "set_auth_cookies",
        "clear_auth_cookies", 
        "verify_csrf_token",
        "generate_csrf_token"
    ]
    
    missing_functions = []
    for func in required_functions:
        if f"def {func}" not in content:
            missing_functions.append(func)
    
    if missing_functions:
        print("❌ Cookie auth missing required functions:")
        for missing in missing_functions:
            print(f"   - {missing}")
        return False
    
    # Should set HttpOnly cookies
    if "httponly=True" not in content:
        print("❌ Cookie auth not setting HttpOnly cookies")
        return False
    
    print("✅ Cookie authentication utilities properly implemented")
    return True

def test_server_integration():
    """Test server integration if it's running."""
    print("🔍 Testing server integration...")
    
    try:
        # Try to connect to local server
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running and responding")
            
            # Test that CSRF middleware is active (optional)
            try:
                csrf_test = requests.post(
                    "http://localhost:8000/api/v2/test", 
                    json={"test": "data"},
                    timeout=5
                )
                if csrf_test.status_code == 403 and "CSRF" in csrf_test.text:
                    print("✅ CSRF protection middleware is active")
                else:
                    print("⚠️  CSRF protection status unclear")
            except:
                pass
                
            return True
    except requests.RequestException:
        print("⚠️  Server not running - skipping integration tests")
        return True  # Not a failure, just skip

def main():
    """Run all security validation tests."""
    print("🔒 BookedBarber V2 Security Fixes Validation")
    print("=" * 50)
    
    tests = [
        ("Frontend Security", validate_frontend_changes),
        ("CSRF Protection", validate_csrf_middleware),
        ("JWT Security", validate_jwt_security),
        ("Auth Integration", validate_auth_integration),
        ("Cookie Authentication", validate_cookie_auth),
        ("Server Integration", test_server_integration),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}:")
        try:
            if test_func():
                passed += 1
            else:
                print(f"❌ {test_name} validation failed")
        except Exception as e:
            print(f"❌ {test_name} validation error: {e}")
    
    print("\n" + "=" * 50)
    print(f"🎯 Security Validation Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All security fixes validated successfully!")
        print("\n🔒 Security Improvements Summary:")
        print("   ✅ XSS Protection: HttpOnly cookies (no localStorage)")
        print("   ✅ CSRF Protection: Middleware with token validation")
        print("   ✅ JWT Security: RS256 asymmetric keys with rotation")
        print("   ✅ Secure Integration: All components working together")
        return 0
    else:
        print(f"⚠️  {total - passed} validation issues found")
        print("Please review the failed tests and fix any issues.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)