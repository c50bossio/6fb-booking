#!/usr/bin/env python3
"""
Auth Consistency Test Tool
Tests login/logout flow multiple times to identify inconsistencies
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

class AuthConsistencyTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.test_email = "test@example.com"
        self.test_password = "TestPassword123!"
        self.results = []
        
    async def test_login(self, session, test_num):
        """Test a single login attempt"""
        start_time = time.time()
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            async with session.post(
                f"{self.base_url}/api/v1/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                duration = time.time() - start_time
                status = response.status
                
                if status == 200:
                    data = await response.json()
                    # Extract session info from headers
                    session_id = response.headers.get('X-Session-ID', 'none')
                    auth_method = response.headers.get('X-Auth-Method', 'unknown')
                    
                    result = {
                        "test": test_num,
                        "status": "SUCCESS", 
                        "duration": round(duration, 3),
                        "session_id": session_id,
                        "auth_method": auth_method,
                        "token_length": len(data.get('access_token', '')),
                        "has_refresh": bool(data.get('refresh_token'))
                    }
                else:
                    error_text = await response.text()
                    result = {
                        "test": test_num,
                        "status": "FAILED",
                        "duration": round(duration, 3),
                        "error": f"HTTP {status}: {error_text[:100]}"
                    }
                
                return result
                
        except Exception as e:
            duration = time.time() - start_time
            return {
                "test": test_num,
                "status": "ERROR",
                "duration": round(duration, 3),
                "error": str(e)
            }
    
    async def test_get_me(self, session, token):
        """Test /me endpoint with token"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            async with session.get(
                f"{self.base_url}/api/v1/auth/me",
                headers=headers
            ) as response:
                return response.status == 200
        except:
            return False
    
    async def create_test_user_if_needed(self):
        """Create test user if it doesn't exist"""
        print("🧪 Setting up test user...")
        
        # Try to create user (will fail if exists, which is fine)
        async with aiohttp.ClientSession() as session:
            user_data = {
                "email": self.test_email,
                "name": "Test User",
                "password": self.test_password,
                "user_type": "client"
            }
            
            try:
                async with session.post(
                    f"{self.base_url}/api/v1/auth/register-client",
                    json=user_data
                ) as response:
                    if response.status == 200:
                        print("✅ Test user created")
                    else:
                        print("ℹ️  Test user already exists (expected)")
            except Exception as e:
                print(f"⚠️  Could not create test user: {e}")
    
    async def run_consistency_test(self, num_tests=10):
        """Run multiple login tests to check consistency"""
        print(f"🔄 Running {num_tests} login consistency tests...")
        print("=" * 60)
        
        await self.create_test_user_if_needed()
        
        async with aiohttp.ClientSession() as session:
            # Run tests
            for i in range(1, num_tests + 1):
                result = await self.test_login(session, i)
                self.results.append(result)
                
                # Show progress
                status_icon = "✅" if result["status"] == "SUCCESS" else "❌"
                duration = result["duration"]
                print(f"{status_icon} Test {i:2d}: {result['status']:7s} ({duration:5.3f}s)")
                
                # Test token validity if login succeeded
                if result["status"] == "SUCCESS" and "token_length" in result:
                    # We don't have the actual token in this simple test
                    # In a real scenario, you'd extract and test it
                    pass
                
                # Small delay between tests
                await asyncio.sleep(0.1)
        
        self.analyze_results()
    
    def analyze_results(self):
        """Analyze test results for patterns"""
        print("\n📊 CONSISTENCY ANALYSIS")
        print("=" * 60)
        
        total_tests = len(self.results)
        successes = [r for r in self.results if r["status"] == "SUCCESS"]
        failures = [r for r in self.results if r["status"] != "SUCCESS"]
        
        success_rate = len(successes) / total_tests * 100
        
        print(f"Total tests: {total_tests}")
        print(f"Success rate: {success_rate:.1f}% ({len(successes)}/{total_tests})")
        
        if successes:
            durations = [r["duration"] for r in successes]
            avg_duration = sum(durations) / len(durations)
            min_duration = min(durations)
            max_duration = max(durations)
            
            print(f"Response times: avg={avg_duration:.3f}s, min={min_duration:.3f}s, max={max_duration:.3f}s")
            
            # Check for session consistency
            session_ids = [r.get("session_id", "none") for r in successes]
            unique_sessions = set(session_ids)
            print(f"Unique sessions: {len(unique_sessions)} (expected: {len(successes)})")
            
            # Check for token consistency
            token_lengths = [r.get("token_length", 0) for r in successes]
            if len(set(token_lengths)) == 1:
                print(f"✅ Token lengths consistent: {token_lengths[0]} chars")
            else:
                print(f"⚠️  Token lengths vary: {set(token_lengths)}")
        
        if failures:
            print(f"\n❌ FAILURES ({len(failures)}):")
            for failure in failures:
                print(f"   Test {failure['test']}: {failure.get('error', 'Unknown error')}")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if success_rate == 100:
            print("✅ Perfect consistency! No issues found.")
        elif success_rate > 90:
            print("⚠️  Minor inconsistencies. Check network or server load.")
        else:
            print("❌ Significant issues. Check:")
            print("   - Database connection stability")
            print("   - Redis connection")
            print("   - Server resource usage")
            print("   - Network connectivity")

async def main():
    tester = AuthConsistencyTester()
    await tester.run_consistency_test(num_tests=15)

if __name__ == "__main__":
    asyncio.run(main())