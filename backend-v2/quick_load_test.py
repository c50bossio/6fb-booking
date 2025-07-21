#!/usr/bin/env python3
"""
Quick load test for immediate production readiness validation.
"""

import requests
import time
import threading
from datetime import datetime, timedelta
import statistics


class QuickLoadTest:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.results = []
        self.auth_token = None
    
    def authenticate(self):
        """Get auth token."""
        login_data = {
            "email": "admin.test@bookedbarber.com",
            "password": "AdminTest123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/v2/auth/login", json=login_data, timeout=10)
            if response.status_code == 200:
                self.auth_token = response.json().get("access_token")
                return True
        except:
            pass
        return False
    
    def test_user_session(self, user_id):
        """Simulate one user's session."""
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        session_results = []
        
        endpoints = [
            "/api/v2/appointments/",
            "/api/v2/appointments/all/list",
            "/api/v2/appointments/1"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            try:
                response = requests.get(f"{self.base_url}{endpoint}", headers=headers, timeout=5)
                duration = time.time() - start_time
                
                session_results.append({
                    "user": user_id,
                    "endpoint": endpoint,
                    "status": response.status_code,
                    "duration": duration,
                    "success": 200 <= response.status_code < 300
                })
            except Exception as e:
                duration = time.time() - start_time
                session_results.append({
                    "user": user_id,
                    "endpoint": endpoint,
                    "status": 0,
                    "duration": duration,
                    "success": False,
                    "error": str(e)
                })
        
        return session_results
    
    def run_concurrent_test(self, num_users=20):
        """Run concurrent user test."""
        print(f"🔧 Quick Load Test - {num_users} concurrent users")
        
        if not self.authenticate():
            print("❌ Authentication failed")
            return False
        
        print("✅ Authentication successful")
        
        # Run concurrent users
        threads = []
        start_time = time.time()
        
        for i in range(num_users):
            thread = threading.Thread(target=self._user_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        total_time = time.time() - start_time
        
        # Analyze results
        self.analyze_quick_results(num_users, total_time)
        return True
    
    def _user_worker(self, user_id):
        """Worker function for threading."""
        session_results = self.test_user_session(user_id)
        self.results.extend(session_results)
    
    def analyze_quick_results(self, num_users, total_time):
        """Quick analysis of results."""
        print(f"\n📊 Load Test Results ({num_users} users in {total_time:.1f}s):")
        
        successful_requests = [r for r in self.results if r.get("success", False)]
        total_requests = len(self.results)
        success_rate = len(successful_requests) / total_requests * 100 if total_requests > 0 else 0
        
        print(f"✅ Success Rate: {success_rate:.1f}% ({len(successful_requests)}/{total_requests})")
        
        if successful_requests:
            durations = [r["duration"] for r in successful_requests]
            avg_duration = statistics.mean(durations)
            max_duration = max(durations)
            
            print(f"⏱️  Avg Response Time: {avg_duration:.3f}s")
            print(f"🐌 Max Response Time: {max_duration:.3f}s")
            
            # Production assessment
            if success_rate >= 95 and avg_duration < 0.5:
                print("🏆 PRODUCTION READY - Excellent performance!")
            elif success_rate >= 90 and avg_duration < 1.0:
                print("✅ PRODUCTION READY - Good performance")
            else:
                print("⚠️  NEEDS OPTIMIZATION - Performance issues detected")
        
        return success_rate >= 90


if __name__ == "__main__":
    tester = QuickLoadTest()
    tester.run_concurrent_test(20)