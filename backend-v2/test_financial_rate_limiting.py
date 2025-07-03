#!/usr/bin/env python3
"""
Test script for financial rate limiting implementation
Tests rate limits on payment and financial endpoints
"""

import asyncio
import time
from datetime import datetime
from typing import Dict, List, Tuple
import httpx
import json
from collections import defaultdict

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "test123"
ADMIN_EMAIL = "admin@bookedbarber.com"
ADMIN_PASSWORD = "admin123"


class FinancialRateLimitTester:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL)
        self.results = defaultdict(list)
        self.auth_token = None
        self.admin_token = None
    
    async def setup(self):
        """Setup test environment"""
        print("🔧 Setting up test environment...")
        
        # Get auth tokens
        self.auth_token = await self.get_auth_token(TEST_USER_EMAIL, TEST_USER_PASSWORD)
        self.admin_token = await self.get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        print("✅ Setup complete")
    
    async def get_auth_token(self, email: str, password: str) -> str:
        """Get authentication token"""
        try:
            response = await self.client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password}
            )
            if response.status_code == 200:
                return response.json()["access_token"]
        except Exception as e:
            print(f"❌ Failed to get auth token for {email}: {e}")
        return None
    
    async def test_endpoint_rate_limit(
        self, 
        endpoint: str, 
        method: str = "GET",
        body: Dict = None,
        expected_limit: int = 10,
        window_seconds: int = 60,
        use_admin: bool = False
    ) -> Dict:
        """Test rate limit for a specific endpoint"""
        print(f"\n🧪 Testing {method} {endpoint}")
        print(f"   Expected limit: {expected_limit} requests per {window_seconds} seconds")
        
        token = self.admin_token if use_admin else self.auth_token
        if not token:
            print("   ❌ No auth token available")
            return {"success": False, "error": "No auth token"}
        
        headers = {"Authorization": f"Bearer {token}"}
        
        successful_requests = 0
        rate_limited_requests = 0
        errors = []
        response_times = []
        
        # Make requests up to expected limit + buffer
        for i in range(expected_limit + 5):
            start_time = time.time()
            
            try:
                if method == "GET":
                    response = await self.client.get(endpoint, headers=headers)
                elif method == "POST":
                    response = await self.client.post(
                        endpoint, 
                        headers=headers, 
                        json=body or {}
                    )
                
                response_time = time.time() - start_time
                response_times.append(response_time)
                
                if response.status_code == 429:
                    rate_limited_requests += 1
                    retry_after = response.headers.get("Retry-After", "unknown")
                    print(f"   ⏱️  Rate limited at request {i + 1} (Retry-After: {retry_after}s)")
                elif response.status_code in [200, 201]:
                    successful_requests += 1
                else:
                    errors.append({
                        "request": i + 1,
                        "status": response.status_code,
                        "detail": response.text
                    })
                
            except Exception as e:
                errors.append({
                    "request": i + 1,
                    "error": str(e)
                })
            
            # Small delay between requests
            await asyncio.sleep(0.1)
        
        # Results
        result = {
            "endpoint": endpoint,
            "method": method,
            "expected_limit": expected_limit,
            "successful_requests": successful_requests,
            "rate_limited_requests": rate_limited_requests,
            "errors": errors,
            "avg_response_time": sum(response_times) / len(response_times) if response_times else 0,
            "passed": successful_requests <= expected_limit and rate_limited_requests > 0
        }
        
        # Print summary
        status = "✅ PASSED" if result["passed"] else "❌ FAILED"
        print(f"   {status} - {successful_requests} successful, {rate_limited_requests} rate limited")
        if errors:
            print(f"   ⚠️  {len(errors)} errors encountered")
        
        return result
    
    async def test_velocity_checks(self):
        """Test velocity-based security checks"""
        print("\n🚀 Testing Velocity Checks")
        
        # Rapid succession test
        print("\n   Testing rapid succession detection...")
        rapid_results = []
        
        for i in range(10):
            try:
                response = await self.client.post(
                    "/api/v1/payments/create-intent",
                    headers={"Authorization": f"Bearer {self.auth_token}"},
                    json={"booking_id": 1, "amount": 50}
                )
                rapid_results.append({
                    "request": i + 1,
                    "status": response.status_code,
                    "timestamp": time.time()
                })
            except Exception as e:
                rapid_results.append({
                    "request": i + 1,
                    "error": str(e),
                    "timestamp": time.time()
                })
        
        # Check if velocity limits triggered
        blocked = sum(1 for r in rapid_results if r.get("status") == 429)
        print(f"   Rapid requests blocked: {blocked}/10")
    
    async def test_amount_patterns(self):
        """Test suspicious amount pattern detection"""
        print("\n💰 Testing Amount Pattern Detection")
        
        # Test escalating amounts
        amounts = [1, 10, 100, 1000, 5000]
        print("\n   Testing escalating amounts pattern...")
        
        for amount in amounts:
            try:
                response = await self.client.post(
                    "/api/v1/payments/create-intent",
                    headers={"Authorization": f"Bearer {self.auth_token}"},
                    json={"booking_id": 1, "amount": amount}
                )
                
                if response.status_code == 403:
                    print(f"   🛡️  Suspicious activity blocked at ${amount}")
                    break
                elif response.status_code == 429:
                    print(f"   ⏱️  Rate limited at ${amount}")
                else:
                    print(f"   ✓ ${amount} processed")
                
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error at ${amount}: {e}")
    
    async def run_all_tests(self):
        """Run all rate limiting tests"""
        print("\n" + "=" * 60)
        print("🚀 FINANCIAL RATE LIMITING TEST SUITE")
        print("=" * 60)
        
        await self.setup()
        
        # Test payment endpoints
        test_cases = [
            {
                "endpoint": "/api/v1/payments/create-intent",
                "method": "POST",
                "body": {"booking_id": 1},
                "expected_limit": 10,
                "window_seconds": 60
            },
            {
                "endpoint": "/api/v1/payments/confirm",
                "method": "POST",
                "body": {"payment_intent_id": "pi_test", "booking_id": 1},
                "expected_limit": 15,
                "window_seconds": 60
            },
            {
                "endpoint": "/api/v1/payments/gift-certificates",
                "method": "POST",
                "body": {
                    "amount": 100,
                    "purchaser_name": "Test User",
                    "purchaser_email": "test@example.com"
                },
                "expected_limit": 10,
                "window_seconds": 3600  # per hour
            },
            {
                "endpoint": "/api/v1/payments/gift-certificates/validate",
                "method": "POST",
                "body": {"code": "TEST123"},
                "expected_limit": 30,
                "window_seconds": 60
            },
            {
                "endpoint": "/api/v1/payments/history",
                "method": "GET",
                "expected_limit": 20,
                "window_seconds": 60
            },
            {
                "endpoint": "/api/v1/payments/stripe-connect/onboard",
                "method": "POST",
                "expected_limit": 5,
                "window_seconds": 3600,  # per hour
                "use_admin": False  # Barber only endpoint
            }
        ]
        
        # Run standard rate limit tests
        for test_case in test_cases:
            result = await self.test_endpoint_rate_limit(**test_case)
            self.results["rate_limits"].append(result)
        
        # Run velocity and pattern tests
        await self.test_velocity_checks()
        await self.test_amount_patterns()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        if "rate_limits" in self.results:
            passed = sum(1 for r in self.results["rate_limits"] if r["passed"])
            total = len(self.results["rate_limits"])
            
            print(f"\nRate Limit Tests: {passed}/{total} passed")
            
            for result in self.results["rate_limits"]:
                status = "✅" if result["passed"] else "❌"
                print(f"{status} {result['method']} {result['endpoint']}")
                if result["errors"]:
                    print(f"   Errors: {len(result['errors'])}")
        
        print("\n" + "=" * 60)
        print("✅ TEST SUITE COMPLETE")
        print("=" * 60)
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()


async def main():
    """Main test runner"""
    tester = FinancialRateLimitTester()
    
    try:
        await tester.run_all_tests()
    finally:
        await tester.cleanup()


if __name__ == "__main__":
    asyncio.run(main())