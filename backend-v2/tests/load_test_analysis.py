#!/usr/bin/env python3
"""
Load Testing and Performance Analysis for BookedBarber V2 API
"""

import requests
import threading
import time
import statistics
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import sqlite3

class LoadTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.results = {
            "concurrent_tests": [],
            "endpoint_performance": {},
            "error_analysis": [],
            "recommendations": []
        }
    
    def test_endpoint_load(self, endpoint, method="GET", data=None, concurrent_users=5, requests_per_user=10):
        """Test endpoint under load"""
        print(f"🔥 Load testing {endpoint} with {concurrent_users} users, {requests_per_user} requests each...")
        
        response_times = []
        errors = []
        success_count = 0
        
        def make_request():
            try:
                start_time = time.time()
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                elif method == "POST":
                    response = requests.post(f"{self.base_url}{endpoint}", json=data, timeout=10)
                
                elapsed = time.time() - start_time
                
                if response.status_code in [200, 201]:
                    return {"success": True, "time": elapsed, "status": response.status_code}
                else:
                    return {"success": False, "time": elapsed, "status": response.status_code, "error": response.text[:100]}
                    
            except Exception as e:
                return {"success": False, "time": None, "error": str(e)}
        
        # Run concurrent requests
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = []
            
            for user in range(concurrent_users):
                for req in range(requests_per_user):
                    futures.append(executor.submit(make_request))
            
            for future in as_completed(futures):
                result = future.result()
                if result["success"]:
                    success_count += 1
                    if result["time"]:
                        response_times.append(result["time"])
                else:
                    errors.append(result)
        
        # Analyze results
        total_requests = concurrent_users * requests_per_user
        success_rate = (success_count / total_requests) * 100
        
        analysis = {
            "endpoint": endpoint,
            "total_requests": total_requests,
            "successful_requests": success_count,
            "success_rate": success_rate,
            "errors": len(errors),
            "avg_response_time": statistics.mean(response_times) if response_times else 0,
            "median_response_time": statistics.median(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "min_response_time": min(response_times) if response_times else 0
        }
        
        print(f"   📊 Success Rate: {success_rate:.1f}% ({success_count}/{total_requests})")
        print(f"   ⏱️  Avg Response: {analysis['avg_response_time']*1000:.0f}ms")
        print(f"   🔺 Max Response: {analysis['max_response_time']*1000:.0f}ms")
        
        if errors:
            print(f"   ❌ Errors: {len(errors)}")
            for error in errors[:3]:  # Show first 3 errors
                print(f"      - {error.get('error', error.get('status', 'Unknown'))}")
        
        self.results["endpoint_performance"][endpoint] = analysis
        
        return analysis
    
    def test_database_performance(self):
        """Test database performance under load"""
        print("🗄️ Database Performance Testing...")
        
        queries = [
            ("User count", "SELECT COUNT(*) FROM users;"),
            ("Recent appointments", "SELECT COUNT(*) FROM appointments WHERE created_at > datetime('now', '-1 day');"),
            ("Active services", "SELECT COUNT(*) FROM services WHERE is_active = 1;"),
            ("Completed payments", "SELECT COUNT(*) FROM payments WHERE status = 'completed';")
        ]
        
        for name, query in queries:
            times = []
            errors = 0
            
            for i in range(10):  # Run each query 10 times
                try:
                    start_time = time.time()
                    conn = sqlite3.connect("6fb_booking.db")
                    cursor = conn.cursor()
                    cursor.execute(query)
                    result = cursor.fetchone()
                    conn.close()
                    elapsed = time.time() - start_time
                    times.append(elapsed)
                except Exception as e:
                    errors += 1
            
            if times:
                avg_time = statistics.mean(times) * 1000
                max_time = max(times) * 1000
                print(f"   ✅ {name}: {avg_time:.1f}ms avg, {max_time:.1f}ms max")
            
            if errors:
                print(f"   ❌ {name}: {errors} errors")
    
    def analyze_rate_limiting(self):
        """Test rate limiting behavior"""
        print("🚦 Rate Limiting Analysis...")
        
        # Test rapid requests to see if rate limiting works
        endpoint = "/api/v1/services"
        rapid_requests = 50
        
        response_codes = []
        start_time = time.time()
        
        for i in range(rapid_requests):
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=2)
                response_codes.append(response.status_code)
            except:
                response_codes.append(0)  # Timeout/error
        
        elapsed = time.time() - start_time
        
        rate_limited = response_codes.count(429)  # Too Many Requests
        successful = response_codes.count(200)
        errors = response_codes.count(0)
        
        print(f"   📊 {rapid_requests} requests in {elapsed:.1f}s")
        print(f"   ✅ Successful: {successful}")
        print(f"   🚦 Rate limited: {rate_limited}")
        print(f"   ❌ Errors/timeouts: {errors}")
        
        # Rate limiting is working if we get 429 responses
        rate_limiting_active = rate_limited > 0
        print(f"   🔒 Rate limiting {'✅ ACTIVE' if rate_limiting_active else '❌ INACTIVE'}")
        
        return rate_limiting_active
    
    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("🛡️ Error Handling Tests...")
        
        error_tests = [
            ("Invalid JSON", "/api/v1/auth/login", "POST", "invalid json"),
            ("Missing fields", "/api/v1/auth/login", "POST", {}),
            ("Invalid endpoint", "/api/v1/nonexistent", "GET", None),
            ("SQL injection attempt", "/api/v1/services?id=1'; DROP TABLE users; --", "GET", None)
        ]
        
        for test_name, endpoint, method, data in error_tests:
            try:
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                elif method == "POST":
                    if isinstance(data, str):
                        response = requests.post(f"{self.base_url}{endpoint}", data=data, timeout=5)
                    else:
                        response = requests.post(f"{self.base_url}{endpoint}", json=data, timeout=5)
                
                # Proper error handling should return appropriate status codes
                expected_codes = [400, 401, 404, 422, 500]
                if response.status_code in expected_codes:
                    print(f"   ✅ {test_name}: Properly handled ({response.status_code})")
                else:
                    print(f"   ⚠️  {test_name}: Unexpected response ({response.status_code})")
                    
            except Exception as e:
                print(f"   ❌ {test_name}: Exception - {e}")
    
    def generate_performance_report(self):
        """Generate comprehensive performance report"""
        print("\n📋 Performance Analysis Summary")
        print("="*60)
        
        # Overall health assessment
        healthy_endpoints = 0
        total_endpoints = len(self.results["endpoint_performance"])
        
        for endpoint, data in self.results["endpoint_performance"].items():
            if data["success_rate"] > 90 and data["avg_response_time"] < 1.0:
                healthy_endpoints += 1
        
        health_score = (healthy_endpoints / total_endpoints * 100) if total_endpoints > 0 else 0
        
        print(f"🎯 Overall Health Score: {health_score:.1f}%")
        print(f"📊 Healthy Endpoints: {healthy_endpoints}/{total_endpoints}")
        
        # Performance breakdown
        print(f"\n📈 Performance Breakdown:")
        for endpoint, data in self.results["endpoint_performance"].items():
            status = "✅" if data["success_rate"] > 90 else "⚠️" if data["success_rate"] > 70 else "❌"
            print(f"   {status} {endpoint}: {data['success_rate']:.1f}% success, {data['avg_response_time']*1000:.0f}ms avg")
        
        # Recommendations
        recommendations = []
        
        for endpoint, data in self.results["endpoint_performance"].items():
            if data["success_rate"] < 90:
                recommendations.append(f"🔧 Fix reliability issues with {endpoint} ({data['success_rate']:.1f}% success rate)")
            
            if data["avg_response_time"] > 1.0:
                recommendations.append(f"⚡ Optimize {endpoint} performance ({data['avg_response_time']*1000:.0f}ms avg response)")
        
        if not recommendations:
            recommendations.append("✅ All tested endpoints performing well")
        
        print(f"\n💡 Recommendations:")
        for rec in recommendations:
            print(f"   {rec}")
        
        return health_score
    
    def run_comprehensive_load_test(self):
        """Run all load tests"""
        print("🚀 Comprehensive Load Testing - BookedBarber V2")
        print("="*60)
        
        start_time = time.time()
        
        # Test key endpoints under load
        endpoints_to_test = [
            ("/", "GET", None),
            ("/api/v1/services", "GET", None),
            ("/openapi.json", "GET", None)
        ]
        
        for endpoint, method, data in endpoints_to_test:
            self.test_endpoint_load(endpoint, method, data, concurrent_users=3, requests_per_user=5)
        
        # Test database performance
        self.test_database_performance()
        
        # Test rate limiting
        self.analyze_rate_limiting()
        
        # Test error handling
        self.test_error_handling()
        
        # Generate final report
        health_score = self.generate_performance_report()
        
        total_time = time.time() - start_time
        print(f"\n⏱️  Total testing time: {total_time:.2f} seconds")
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"load_test_report_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"📄 Load test report saved: {report_file}")
        
        return health_score

def main():
    tester = LoadTester()
    health_score = tester.run_comprehensive_load_test()
    
    print(f"\n🏆 Final Health Score: {health_score:.1f}%")
    
    if health_score >= 90:
        print("🟢 System Status: EXCELLENT")
    elif health_score >= 70:
        print("🟡 System Status: GOOD")
    elif health_score >= 50:
        print("🟠 System Status: NEEDS ATTENTION")
    else:
        print("🔴 System Status: CRITICAL ISSUES")

if __name__ == "__main__":
    main()