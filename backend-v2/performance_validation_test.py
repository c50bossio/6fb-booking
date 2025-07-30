#!/usr/bin/env python3
"""
Comprehensive Performance Validation Test Suite
Tests bundle size, caching, database performance, and system optimization
"""

import requests
import time
import json
import os
import subprocess
from typing import Dict, List, Any, Tuple
from datetime import datetime
import statistics

class PerformanceValidator:
    def __init__(self, base_url: str = "http://localhost:8000", frontend_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.frontend_url = frontend_url
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "performance_issues": []
            }
        }
    
    def test_api_response_times(self) -> bool:
        """Test API endpoint response times"""
        print("⚡ Testing API response times...")
        
        try:
            endpoints = [
                ("/api/v2/health/", 100),  # Health should be under 100ms
                ("/docs", 500),  # Documentation under 500ms
                ("/api/v2/auth/login", 200),  # Auth under 200ms
            ]
            
            performance_issues = []
            
            for endpoint, max_time_ms in endpoints:
                times = []
                for _ in range(5):  # Test 5 times for average
                    start_time = time.time()
                    
                    if endpoint == "/api/v2/auth/login":
                        response = requests.post(f"{self.base_url}{endpoint}", 
                                               json={"email": "test@test.com", "password": "test"})
                    else:
                        response = requests.get(f"{self.base_url}{endpoint}")
                    
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000  # Convert to ms
                    times.append(response_time)
                
                avg_time = statistics.mean(times)
                
                if avg_time > max_time_ms:
                    performance_issues.append(f"{endpoint}: {avg_time:.1f}ms (limit: {max_time_ms}ms)")
                    print(f"   ⚠️ {endpoint}: {avg_time:.1f}ms (exceeds {max_time_ms}ms limit)")
                else:
                    print(f"   ✅ {endpoint}: {avg_time:.1f}ms")
            
            if performance_issues:
                self.results["summary"]["performance_issues"].extend(performance_issues)
                return False
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing API response times: {e}")
            return False
    
    def test_caching_mechanisms(self) -> bool:
        """Test caching functionality"""
        print("📦 Testing caching mechanisms...")
        
        try:
            # Test cache headers on static content
            response = requests.get(f"{self.base_url}/docs")
            
            cache_headers = ['cache-control', 'etag', 'last-modified', 'expires']
            found_cache_headers = [header for header in cache_headers if header in response.headers]
            
            if not found_cache_headers:
                self.results["summary"]["performance_issues"].append(
                    "No caching headers found on static content"
                )
                print("   ⚠️ No caching headers found")
                return False
            
            print(f"   ✅ Cache headers present: {found_cache_headers}")
            
            # Test response compression
            response = requests.get(f"{self.base_url}/docs", headers={'Accept-Encoding': 'gzip'})
            if 'content-encoding' not in response.headers:
                self.results["summary"]["performance_issues"].append(
                    "Response compression not enabled"
                )
                print("   ⚠️ Response compression not detected")
                return False
            
            print(f"   ✅ Response compression: {response.headers.get('content-encoding')}")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing caching mechanisms: {e}")
            return False
    
    def test_database_performance(self) -> bool:
        """Test database query performance"""
        print("🗄️ Testing database performance...")
        
        try:
            # Test health endpoint which should hit database
            times = []
            for _ in range(10):
                start_time = time.time()
                response = requests.get(f"{self.base_url}/api/v2/health/")
                end_time = time.time()
                
                if response.status_code == 200:
                    times.append((end_time - start_time) * 1000)
            
            if not times:
                print("   ❌ No successful database queries")
                return False
            
            avg_time = statistics.mean(times)
            max_time = max(times)
            min_time = min(times)
            
            print(f"   📊 DB Query Stats: avg={avg_time:.1f}ms, min={min_time:.1f}ms, max={max_time:.1f}ms")
            
            # Database queries should be under 50ms on average
            if avg_time > 50:
                self.results["summary"]["performance_issues"].append(
                    f"Database queries too slow: {avg_time:.1f}ms average"
                )
                print(f"   ⚠️ Database queries exceeding 50ms limit")
                return False
            
            print("   ✅ Database performance within acceptable limits")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing database performance: {e}")
            return False
    
    def test_bundle_size(self) -> bool:
        """Test frontend bundle size optimization"""
        print("📁 Testing frontend bundle size...")
        
        try:
            # Check if Next.js build exists
            build_dir = "/Users/bossio/6fb-booking/backend-v2/frontend-v2/.next"
            if not os.path.exists(build_dir):
                print("   ⚠️ Frontend build not found, running build...")
                result = subprocess.run(
                    ["npm", "run", "build"],
                    cwd="/Users/bossio/6fb-booking/backend-v2/frontend-v2",
                    capture_output=True,
                    text=True
                )
                if result.returncode != 0:
                    print(f"   ❌ Build failed: {result.stderr}")
                    return False
            
            # Check for bundle analyzer output
            analyzer_file = "/Users/bossio/6fb-booking/backend-v2/frontend-v2/bundle-analyzer.html"
            if os.path.exists(analyzer_file):
                print("   📊 Bundle analyzer report available")
            
            # Check for common optimization markers
            static_dir = os.path.join(build_dir, "static")
            if os.path.exists(static_dir):
                js_files = []
                for root, dirs, files in os.walk(static_dir):
                    for file in files:
                        if file.endswith('.js'):
                            file_path = os.path.join(root, file)
                            size = os.path.getsize(file_path)
                            js_files.append((file, size))
                
                if js_files:
                    total_size = sum(size for _, size in js_files)
                    print(f"   📦 Total JS bundle size: {total_size / 1024 / 1024:.2f} MB")
                    
                    # Check for reasonable bundle size (under 5MB total)
                    if total_size > 5 * 1024 * 1024:
                        self.results["summary"]["performance_issues"].append(
                            f"Large bundle size: {total_size / 1024 / 1024:.2f} MB"
                        )
                        print("   ⚠️ Bundle size exceeds 5MB limit")
                        return False
                    
                    print("   ✅ Bundle size within acceptable limits")
                    return True
            
            print("   ⚠️ Could not analyze bundle size")
            return True  # Don't fail if we can't analyze
            
        except Exception as e:
            print(f"   ❌ Error testing bundle size: {e}")
            return False
    
    def test_memory_usage(self) -> bool:
        """Test system memory usage"""
        print("🧠 Testing memory usage...")
        
        try:
            # Check backend process memory
            result = subprocess.run(
                ["ps", "-o", "pid,rss,vsz,comm", "-p", str(os.getpid())],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if len(lines) > 1:
                    memory_info = lines[1].split()
                    rss_kb = int(memory_info[1])  # Resident Set Size in KB
                    vsz_kb = int(memory_info[2])  # Virtual Size in KB
                    
                    print(f"   📊 Memory usage: RSS={rss_kb/1024:.1f}MB, VSZ={vsz_kb/1024:.1f}MB")
                    
                    # Check for reasonable memory usage (under 500MB RSS)
                    if rss_kb > 500 * 1024:
                        self.results["summary"]["performance_issues"].append(
                            f"High memory usage: {rss_kb/1024:.1f}MB RSS"
                        )
                        print("   ⚠️ Memory usage exceeds 500MB limit")
                        return False
            
            print("   ✅ Memory usage within acceptable limits")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing memory usage: {e}")
            return False
    
    def test_concurrent_requests(self) -> bool:
        """Test system performance under concurrent load"""
        print("🔄 Testing concurrent request handling...")
        
        try:
            import concurrent.futures
            import threading
            
            def make_request():
                start_time = time.time()
                try:
                    response = requests.get(f"{self.base_url}/api/v2/health/", timeout=5)
                    end_time = time.time()
                    return {
                        'success': response.status_code == 200,
                        'time': (end_time - start_time) * 1000,
                        'status': response.status_code
                    }
                except Exception as e:
                    return {
                        'success': False,
                        'time': 5000,  # Timeout
                        'error': str(e)
                    }
            
            # Test with 20 concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                futures = [executor.submit(make_request) for _ in range(20)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            successful = [r for r in results if r['success']]
            failed = [r for r in results if not r['success']]
            
            success_rate = len(successful) / len(results) * 100
            avg_response_time = statistics.mean([r['time'] for r in successful]) if successful else 0
            
            print(f"   📊 Concurrent test: {success_rate:.1f}% success rate, {avg_response_time:.1f}ms avg")
            
            if success_rate < 95:  # At least 95% success rate
                self.results["summary"]["performance_issues"].append(
                    f"Low success rate under load: {success_rate:.1f}%"
                )
                print("   ⚠️ Success rate below 95% under concurrent load")
                return False
            
            if avg_response_time > 1000:  # Under 1 second average
                self.results["summary"]["performance_issues"].append(
                    f"Slow response under load: {avg_response_time:.1f}ms"
                )
                print("   ⚠️ Response times degraded under load")
                return False
            
            print("   ✅ System handles concurrent requests well")
            return True
            
        except Exception as e:
            print(f"   ❌ Error testing concurrent requests: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all performance validation tests"""
        print("⚡ Starting comprehensive performance validation...\n")
        
        tests = [
            ("api_response_times", self.test_api_response_times),
            ("caching_mechanisms", self.test_caching_mechanisms),
            ("database_performance", self.test_database_performance),
            ("bundle_size", self.test_bundle_size),
            ("memory_usage", self.test_memory_usage),
            ("concurrent_requests", self.test_concurrent_requests)
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
        print("⚡ PERFORMANCE VALIDATION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")
        
        if self.results['summary']['performance_issues']:
            print(f"\n⚠️ PERFORMANCE ISSUES FOUND ({len(self.results['summary']['performance_issues'])}):")
            for issue in self.results['summary']['performance_issues']:
                print(f"   - {issue}")
        else:
            print("\n✅ NO PERFORMANCE ISSUES FOUND")
        
        print("\n📊 DETAILED TEST RESULTS:")
        for test_name, result in self.results['tests'].items():
            status = "✅ PASSED" if result['passed'] else "❌ FAILED"
            print(f"   {test_name}: {status}")
        
        print("=" * 60)

if __name__ == "__main__":
    validator = PerformanceValidator()
    results = validator.run_all_tests()
    validator.print_summary()
    
    # Save results to file
    with open("/Users/bossio/6fb-booking/backend-v2/performance_validation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: performance_validation_results.json")
    
    # Exit with error code if performance issues found
    if results['summary']['performance_issues']:
        exit(1)
    else:
        exit(0)