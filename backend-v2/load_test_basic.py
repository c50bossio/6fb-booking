#!/usr/bin/env python3
"""
Basic load test for BookedBarber V2 appointment booking system.
Tests concurrent user access to validate production readiness.
"""

import asyncio
import aiohttp
import time
import json
from datetime import datetime, timedelta
import statistics


class LoadTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.auth_token = None
        self.results = []
    
    async def authenticate(self, session):
        """Get authentication token."""
        login_data = {
            "email": "admin.test@bookedbarber.com",
            "password": "AdminTest123"
        }
        
        try:
            async with session.post(f"{self.base_url}/api/v2/auth/login", json=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data.get("access_token")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Auth error: {e}")
            return False
    
    async def test_endpoint(self, session, endpoint, test_name, headers=None):
        """Test a single endpoint and record timing."""
        start_time = time.time()
        
        try:
            async with session.get(f"{self.base_url}{endpoint}", headers=headers) as response:
                end_time = time.time()
                duration = end_time - start_time
                
                result = {
                    "test": test_name,
                    "endpoint": endpoint,
                    "status": response.status,
                    "duration": duration,
                    "success": 200 <= response.status < 300
                }
                
                return result
                
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                "test": test_name,
                "endpoint": endpoint,
                "status": 0,
                "duration": duration,
                "success": False,
                "error": str(e)
            }
    
    async def run_user_simulation(self, user_id):
        """Simulate a single user's typical journey."""
        user_results = []
        
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else None
            
            # Test sequence simulating typical user behavior
            test_sequence = [
                ("/api/v2/appointments/", "Get user appointments"),
                ("/api/v2/appointments/all/list", "Get all appointments"),
                (f"/api/v2/appointments/slots?appointment_date={(datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')}", "Get available slots"),
                ("/api/v2/appointments/1", "Get specific appointment"),
            ]
            
            for endpoint, test_name in test_sequence:
                result = await self.test_endpoint(session, endpoint, f"User{user_id}: {test_name}", headers)
                user_results.append(result)
                
                # Small delay between requests to simulate real user behavior
                await asyncio.sleep(0.1)
        
        return user_results
    
    async def run_load_test(self, concurrent_users=50):
        """Run load test with specified number of concurrent users."""
        print(f"🚀 Starting load test with {concurrent_users} concurrent users...")
        
        # First, authenticate to get token
        async with aiohttp.ClientSession() as session:
            auth_success = await self.authenticate(session)
            if not auth_success:
                print("❌ Failed to authenticate - aborting load test")
                return False
        
        print("✅ Authentication successful, starting user simulations...")
        
        # Create tasks for all concurrent users
        start_time = time.time()
        tasks = [self.run_user_simulation(i) for i in range(concurrent_users)]
        
        # Run all user simulations concurrently
        try:
            all_results = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = time.time()
            total_duration = end_time - start_time
            
            print(f"⏱️  Load test completed in {total_duration:.2f} seconds")
            
            # Process results
            successful_users = 0
            all_test_results = []
            
            for user_results in all_results:
                if isinstance(user_results, Exception):
                    print(f"⚠️  User simulation failed: {user_results}")
                    continue
                
                user_success = all(result.get("success", False) for result in user_results)
                if user_success:
                    successful_users += 1
                
                all_test_results.extend(user_results)
            
            self.analyze_results(all_test_results, concurrent_users, successful_users, total_duration)
            return True
            
        except Exception as e:
            print(f"❌ Load test failed: {e}")
            return False
    
    def analyze_results(self, results, total_users, successful_users, total_duration):
        """Analyze and report load test results."""
        print("\n📊 Load Test Results:")
        print("=" * 50)
        
        # Overall stats
        print(f"👥 Total Users: {total_users}")
        print(f"✅ Successful Users: {successful_users} ({successful_users/total_users*100:.1f}%)")
        print(f"⏱️  Total Duration: {total_duration:.2f} seconds")
        print(f"📈 User Throughput: {total_users/total_duration:.2f} users/second")
        
        # Response time analysis
        successful_results = [r for r in results if r.get("success", False)]
        if successful_results:
            durations = [r["duration"] for r in successful_results]
            
            print(f"\n🕒 Response Time Analysis:")
            print(f"  Average: {statistics.mean(durations):.3f}s")
            print(f"  Median: {statistics.median(durations):.3f}s")
            print(f"  Min: {min(durations):.3f}s")
            print(f"  Max: {max(durations):.3f}s")
            
            if len(durations) > 1:
                print(f"  Std Dev: {statistics.stdev(durations):.3f}s")
        
        # Endpoint-specific analysis
        endpoint_stats = {}
        for result in results:
            endpoint = result.get("endpoint", "unknown")
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {"success": 0, "total": 0, "durations": []}
            
            endpoint_stats[endpoint]["total"] += 1
            if result.get("success", False):
                endpoint_stats[endpoint]["success"] += 1
                endpoint_stats[endpoint]["durations"].append(result["duration"])
        
        print(f"\n🎯 Endpoint Performance:")
        for endpoint, stats in endpoint_stats.items():
            success_rate = stats["success"] / stats["total"] * 100
            avg_duration = statistics.mean(stats["durations"]) if stats["durations"] else 0
            print(f"  {endpoint[:40]:40} | {success_rate:5.1f}% | {avg_duration:.3f}s avg")
        
        # Production readiness assessment
        print(f"\n🏆 Production Readiness Assessment:")
        overall_success_rate = successful_users / total_users * 100
        avg_response_time = statistics.mean([r["duration"] for r in successful_results]) if successful_results else 999
        
        if overall_success_rate >= 95 and avg_response_time < 0.5:
            print("✅ EXCELLENT - Ready for production")
        elif overall_success_rate >= 90 and avg_response_time < 1.0:
            print("✅ GOOD - Production ready with minor optimizations")
        elif overall_success_rate >= 80 and avg_response_time < 2.0:
            print("⚠️  NEEDS WORK - Some optimization required before production")
        else:
            print("❌ NOT READY - Significant issues need addressing")
        
        print(f"   Success Rate: {overall_success_rate:.1f}% (target: >95%)")
        print(f"   Avg Response: {avg_response_time:.3f}s (target: <0.5s)")


async def main():
    """Run the load test."""
    tester = LoadTester()
    
    print("🔧 BookedBarber V2 Load Test")
    print("=" * 40)
    
    # Start with a smaller test
    print("Starting basic load test...")
    success = await tester.run_load_test(concurrent_users=10)
    
    if success:
        print("\n🚀 Basic test passed! Running full load test...")
        await tester.run_load_test(concurrent_users=50)
    else:
        print("❌ Basic test failed - check system before running full load test")


if __name__ == "__main__":
    asyncio.run(main())