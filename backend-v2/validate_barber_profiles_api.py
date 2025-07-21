#!/usr/bin/env python3
"""
Barber Profile API Validation Script

Quick validation script to test the barber profile API endpoints against a running server.
This script can be used to verify that the API is working correctly in development or staging.

Usage:
    python validate_barber_profiles_api.py [--host HOST] [--port PORT]

Example:
    python validate_barber_profiles_api.py --host localhost --port 8002
"""

import argparse
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Optional

import httpx


class BarberProfileAPIValidator:
    """Validator for barber profile API endpoints"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.client = None
        self.test_results = []
        
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    async def test_server_health(self) -> Dict:
        """Test if server is accessible"""
        test_name = "Server Health Check"
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                return {"name": test_name, "status": "PASS", "message": "Server is healthy"}
            else:
                # Try root endpoint if health endpoint doesn't exist
                response = await self.client.get(f"{self.base_url}/")
                if response.status_code in [200, 404]:  # 404 is fine, server is responding
                    return {"name": test_name, "status": "PASS", "message": "Server is responding"}
                else:
                    return {"name": test_name, "status": "FAIL", "message": f"Server returned {response.status_code}"}
        except Exception as e:
            return {"name": test_name, "status": "FAIL", "message": f"Cannot connect to server: {e}"}

    async def test_openapi_docs(self) -> Dict:
        """Test OpenAPI documentation accessibility"""
        test_name = "OpenAPI Documentation"
        try:
            # Test OpenAPI JSON
            response = await self.client.get(f"{self.base_url}/openapi.json")
            if response.status_code != 200:
                return {"name": test_name, "status": "FAIL", "message": f"OpenAPI JSON not accessible: {response.status_code}"}
            
            openapi_data = response.json()
            if "paths" not in openapi_data:
                return {"name": test_name, "status": "FAIL", "message": "Invalid OpenAPI schema"}
            
            # Test Swagger UI
            docs_response = await self.client.get(f"{self.base_url}/docs")
            if docs_response.status_code != 200:
                return {"name": test_name, "status": "WARN", "message": "Swagger UI not accessible"}
            
            return {"name": test_name, "status": "PASS", "message": "OpenAPI docs accessible"}
            
        except Exception as e:
            return {"name": test_name, "status": "FAIL", "message": f"Error accessing docs: {e}"}

    async def test_barber_profiles_endpoints_documented(self) -> Dict:
        """Test that barber profile endpoints are documented"""
        test_name = "Barber Profile Endpoints Documentation"
        try:
            response = await self.client.get(f"{self.base_url}/openapi.json")
            if response.status_code != 200:
                return {"name": test_name, "status": "FAIL", "message": "Cannot access OpenAPI schema"}
            
            openapi_data = response.json()
            paths = openapi_data.get("paths", {})
            
            # Check for barber profile endpoints
            expected_patterns = [
                "/barbers/profiles",  # List/Create profiles
                "profile",  # Any endpoint containing "profile"
            ]
            
            found_endpoints = []
            for path in paths.keys():
                if any(pattern in path for pattern in expected_patterns):
                    found_endpoints.append(path)
            
            if found_endpoints:
                return {
                    "name": test_name, 
                    "status": "PASS", 
                    "message": f"Found barber profile endpoints: {', '.join(found_endpoints[:3])}..."
                }
            else:
                return {"name": test_name, "status": "FAIL", "message": "No barber profile endpoints found in documentation"}
                
        except Exception as e:
            return {"name": test_name, "status": "FAIL", "message": f"Error checking endpoints: {e}"}

    async def test_unauthorized_access(self) -> Dict:
        """Test that endpoints properly require authentication"""
        test_name = "Authentication Required"
        try:
            # Try to create a profile without authentication
            profile_data = {
                "bio": "Test profile",
                "years_experience": 5
            }
            
            response = await self.client.post(
                f"{self.base_url}/barbers/profiles",
                json=profile_data
            )
            
            # Should be unauthorized (401) or forbidden (403)
            if response.status_code in [401, 403]:
                return {"name": test_name, "status": "PASS", "message": "Authentication properly required"}
            elif response.status_code == 404:
                return {"name": test_name, "status": "WARN", "message": "Endpoint not found - check routing"}
            else:
                return {"name": test_name, "status": "FAIL", "message": f"Expected 401/403, got {response.status_code}"}
                
        except Exception as e:
            return {"name": test_name, "status": "FAIL", "message": f"Error testing authentication: {e}"}

    async def test_cors_headers(self) -> Dict:
        """Test CORS headers for frontend integration"""
        test_name = "CORS Headers"
        try:
            response = await self.client.options(f"{self.base_url}/barbers/profiles")
            
            # Check for CORS headers
            cors_headers = [
                "access-control-allow-origin",
                "access-control-allow-methods", 
                "access-control-allow-headers"
            ]
            
            found_headers = []
            for header in cors_headers:
                if header in response.headers:
                    found_headers.append(header)
            
            if found_headers:
                return {"name": test_name, "status": "PASS", "message": f"CORS headers present: {len(found_headers)}/3"}
            else:
                return {"name": test_name, "status": "WARN", "message": "No CORS headers found"}
                
        except Exception as e:
            return {"name": test_name, "status": "WARN", "message": f"Could not test CORS: {e}"}

    async def test_error_handling(self) -> Dict:
        """Test API error handling"""
        test_name = "Error Handling"
        try:
            # Test getting non-existent barber profile
            response = await self.client.get(f"{self.base_url}/barbers/99999/profile")
            
            if response.status_code == 404:
                try:
                    error_data = response.json()
                    if "detail" in error_data:
                        return {"name": test_name, "status": "PASS", "message": "Proper error responses"}
                    else:
                        return {"name": test_name, "status": "WARN", "message": "404 returned but no error detail"}
                except:
                    return {"name": test_name, "status": "WARN", "message": "404 returned but response not JSON"}
            elif response.status_code in [401, 403]:
                return {"name": test_name, "status": "PASS", "message": "Authentication error properly handled"}
            else:
                return {"name": test_name, "status": "WARN", "message": f"Unexpected response: {response.status_code}"}
                
        except Exception as e:
            return {"name": test_name, "status": "FAIL", "message": f"Error testing error handling: {e}"}

    async def run_all_tests(self) -> Dict:
        """Run all validation tests"""
        print(f"🧪 Validating Barber Profile API at {self.base_url}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 60)
        
        # Define tests to run
        tests = [
            self.test_server_health,
            self.test_openapi_docs,
            self.test_barber_profiles_endpoints_documented,
            self.test_unauthorized_access,
            self.test_cors_headers,
            self.test_error_handling,
        ]
        
        results = []
        for test_func in tests:
            print(f"Running {test_func.__name__}...", end=" ")
            start_time = time.time()
            
            try:
                result = await test_func()
                result["execution_time"] = time.time() - start_time
                results.append(result)
                
                # Print result
                status = result["status"]
                if status == "PASS":
                    print(f"✅ PASS - {result['message']}")
                elif status == "WARN":
                    print(f"⚠️  WARN - {result['message']}")
                else:
                    print(f"❌ FAIL - {result['message']}")
                    
            except Exception as e:
                result = {
                    "name": test_func.__name__,
                    "status": "FAIL", 
                    "message": f"Test error: {e}",
                    "execution_time": time.time() - start_time
                }
                results.append(result)
                print(f"❌ FAIL - Test error: {e}")
        
        # Summary
        print("-" * 60)
        passed = sum(1 for r in results if r["status"] == "PASS")
        warned = sum(1 for r in results if r["status"] == "WARN")
        failed = sum(1 for r in results if r["status"] == "FAIL")
        total = len(results)
        
        print(f"📊 Summary: {passed}/{total} passed, {warned} warnings, {failed} failed")
        
        if failed == 0:
            print("🎉 All critical validations passed!")
        else:
            print("⚠️  Some validations failed - check the results above")
        
        return {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "total_tests": total,
            "passed": passed,
            "warned": warned,
            "failed": failed,
            "results": results
        }


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Validate Barber Profile API endpoints")
    parser.add_argument("--host", default="localhost", help="API host (default: localhost)")
    parser.add_argument("--port", type=int, default=8000, help="API port (default: 8000)")
    parser.add_argument("--https", action="store_true", help="Use HTTPS instead of HTTP")
    parser.add_argument("--save-report", help="Save results to JSON file")
    
    args = parser.parse_args()
    
    # Build base URL
    protocol = "https" if args.https else "http"
    base_url = f"{protocol}://{args.host}:{args.port}"
    
    try:
        async with BarberProfileAPIValidator(base_url) as validator:
            results = await validator.run_all_tests()
            
            if args.save_report:
                with open(args.save_report, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"\n📄 Results saved to {args.save_report}")
    
    except KeyboardInterrupt:
        print("\n🛑 Validation interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Validation error: {e}")
        return 1
    
    return 0 if results["failed"] == 0 else 1


if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))