#!/usr/bin/env python3
"""
Comprehensive Load Testing Suite
Tests API endpoints, database performance, and system stability under load
"""

import requests
import time
import json
import threading
import concurrent.futures
from typing import Dict, List, Any, Tuple
from datetime import datetime
import statistics
import queue

class LoadTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "load_issues": []
            }
        }
    
    def make_request(self, method: str, endpoint: str, data: dict = None, timeout: int = 10) -> Dict[str, Any]:
        """Make a single request and return performance metrics"""
        start_time = time.time()
        try:
            if method.upper() == "GET":
                response = requests.get(f"{self.base_url}{endpoint}", timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(f"{self.base_url}{endpoint}", json=data, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            end_time = time.time()
            return {
                "success": True,
                "status_code": response.status_code,
                "response_time": (end_time - start_time) * 1000,  # ms
                "content_length": len(response.content) if response.content else 0
            }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "timeout",
                "response_time": timeout * 1000
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": str(e),
                "response_time": (time.time() - start_time) * 1000
            }
    
    def test_basic_load(self) -> bool:
        """Test basic load handling with multiple concurrent requests"""
        print("🚀 Testing basic load handling...")
        
        try:
            # Test parameters
            num_requests = 50
            max_workers = 10
            endpoint = "/api/v2/health/"
            
            print(f"   📊 Running {num_requests} requests with {max_workers} concurrent workers")
            
            # Execute requests concurrently
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(self.make_request, "GET", endpoint)
                    for _ in range(num_requests)
                ]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            # Analyze results
            successful = [r for r in results if r.get("success", False)]
            failed = [r for r in results if not r.get("success", False)]
            
            success_rate = len(successful) / len(results) * 100
            avg_response_time = statistics.mean([r["response_time"] for r in successful]) if successful else 0
            max_response_time = max([r["response_time"] for r in successful]) if successful else 0
            min_response_time = min([r["response_time"] for r in successful]) if successful else 0
            
            print(f"   📈 Success Rate: {success_rate:.1f}%")
            print(f"   ⏱️ Response Times: avg={avg_response_time:.1f}ms, min={min_response_time:.1f}ms, max={max_response_time:.1f}ms")
            print(f"   ❌ Failed Requests: {len(failed)}")
            
            # Performance thresholds
            if success_rate < 95:
                self.results["summary"]["load_issues"].append(
                    f"Low success rate under basic load: {success_rate:.1f}%"
                )
                print("   ❌ Success rate below 95%")
                return False
            
            if avg_response_time > 1000:  # 1 second
                self.results["summary"]["load_issues"].append(
                    f"High response time under load: {avg_response_time:.1f}ms"
                )
                print("   ❌ Average response time exceeds 1 second")
                return False
            
            print("   ✅ Basic load test passed")
            return True
            
        except Exception as e:
            print(f"   ❌ Error in basic load test: {e}")
            return False
    
    def test_sustained_load(self) -> bool:
        """Test system under sustained load over time"""
        print("⏰ Testing sustained load...")
        
        try:
            # Test parameters
            duration_seconds = 30
            requests_per_second = 5
            endpoint = "/api/v2/health/"
            
            print(f"   📊 Running sustained load for {duration_seconds}s at {requests_per_second} req/s")
            
            results = []
            start_time = time.time()
            
            def make_timed_requests():
                while time.time() - start_time < duration_seconds:
                    result = self.make_request("GET", endpoint, timeout=5)
                    result["timestamp"] = time.time() - start_time
                    results.append(result)
                    time.sleep(1 / requests_per_second)  # Rate limiting
            
            # Run requests in background thread
            thread = threading.Thread(target=make_timed_requests)
            thread.start()
            thread.join()
            
            if not results:
                print("   ❌ No requests completed during sustained load test")
                return False
            
            # Analyze results over time
            successful = [r for r in results if r.get("success", False)]
            success_rate = len(successful) / len(results) * 100
            
            # Check for performance degradation over time
            first_half = [r for r in successful if r["timestamp"] < duration_seconds / 2]
            second_half = [r for r in successful if r["timestamp"] >= duration_seconds / 2]
            
            if first_half and second_half:
                first_half_avg = statistics.mean([r["response_time"] for r in first_half])
                second_half_avg = statistics.mean([r["response_time"] for r in second_half])
                
                degradation = ((second_half_avg - first_half_avg) / first_half_avg) * 100
                
                print(f"   📈 Success Rate: {success_rate:.1f}%")
                print(f"   📊 Performance Change: {degradation:+.1f}% from first half to second half")
                
                if degradation > 50:  # More than 50% performance degradation
                    self.results["summary"]["load_issues"].append(
                        f"Performance degradation under sustained load: {degradation:.1f}%"
                    )
                    print("   ❌ Significant performance degradation detected")
                    return False
            
            if success_rate < 90:
                self.results["summary"]["load_issues"].append(
                    f"Low success rate during sustained load: {success_rate:.1f}%"
                )
                print("   ❌ Success rate below 90% during sustained load")
                return False
            
            print("   ✅ Sustained load test passed")
            return True
            
        except Exception as e:
            print(f"   ❌ Error in sustained load test: {e}")
            return False
    
    def test_spike_load(self) -> bool:
        """Test system response to sudden load spikes"""
        print("📈 Testing spike load handling...")
        
        try:
            # Test parameters
            normal_load = 2  # requests per second
            spike_load = 20   # requests per second
            spike_duration = 10  # seconds
            endpoint = "/api/v2/health/"
            
            print(f"   📊 Testing spike from {normal_load} to {spike_load} req/s for {spike_duration}s")
            
            results = []
            
            # Phase 1: Normal load for 5 seconds
            print("   📊 Phase 1: Normal load")
            start_time = time.time()
            while time.time() - start_time < 5:
                result = self.make_request("GET", endpoint, timeout=5)
                result["phase"] = "normal"
                results.append(result)
                time.sleep(1 / normal_load)
            
            # Phase 2: Spike load
            print("   📊 Phase 2: Spike load")
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                spike_futures = [
                    executor.submit(self.make_request, "GET", endpoint, 5)
                    for _ in range(spike_load * spike_duration)
                ]
                spike_results = [future.result() for future in concurrent.futures.as_completed(spike_futures)]
                for result in spike_results:
                    result["phase"] = "spike"
                    results.append(result)
            
            # Phase 3: Recovery
            print("   📊 Phase 3: Recovery load")
            start_time = time.time()
            while time.time() - start_time < 5:
                result = self.make_request("GET", endpoint, timeout=5)
                result["phase"] = "recovery"
                results.append(result)
                time.sleep(1 / normal_load)
            
            # Analyze results by phase
            phases = {}
            for phase in ["normal", "spike", "recovery"]:
                phase_results = [r for r in results if r.get("phase") == phase]
                successful = [r for r in phase_results if r.get("success", False)]
                
                phases[phase] = {
                    "total": len(phase_results),
                    "successful": len(successful),
                    "success_rate": len(successful) / len(phase_results) * 100 if phase_results else 0,
                    "avg_response_time": statistics.mean([r["response_time"] for r in successful]) if successful else 0
                }
            
            print(f"   📊 Normal: {phases['normal']['success_rate']:.1f}% success, {phases['normal']['avg_response_time']:.1f}ms avg")
            print(f"   📊 Spike: {phases['spike']['success_rate']:.1f}% success, {phases['spike']['avg_response_time']:.1f}ms avg")
            print(f"   📊 Recovery: {phases['recovery']['success_rate']:.1f}% success, {phases['recovery']['avg_response_time']:.1f}ms avg")
            
            # Check spike handling
            if phases['spike']['success_rate'] < 80:
                self.results["summary"]["load_issues"].append(
                    f"Poor spike handling: {phases['spike']['success_rate']:.1f}% success rate"
                )
                print("   ❌ System struggled with spike load")
                return False
            
            # Check recovery
            recovery_vs_normal = abs(phases['recovery']['avg_response_time'] - phases['normal']['avg_response_time'])
            if recovery_vs_normal > phases['normal']['avg_response_time'] * 0.5:  # 50% difference
                self.results["summary"]["load_issues"].append(
                    f"Poor recovery after spike: {recovery_vs_normal:.1f}ms difference"
                )
                print("   ❌ System did not recover well after spike")
                return False
            
            print("   ✅ Spike load test passed")
            return True
            
        except Exception as e:
            print(f"   ❌ Error in spike load test: {e}")
            return False
    
    def test_memory_leak_detection(self) -> bool:
        """Test for memory leaks under repeated requests"""
        print("🧠 Testing for memory leaks...")
        
        try:
            # Test parameters
            num_cycles = 10
            requests_per_cycle = 50
            endpoint = "/api/v2/health/"
            
            print(f"   📊 Running {num_cycles} cycles of {requests_per_cycle} requests each")
            
            cycle_stats = []
            
            for cycle in range(num_cycles):
                cycle_start = time.time()
                
                # Make requests for this cycle
                with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                    futures = [
                        executor.submit(self.make_request, "GET", endpoint, None, 5)
                        for _ in range(requests_per_cycle)
                    ]
                    cycle_results = [future.result() for future in concurrent.futures.as_completed(futures)]
                
                successful = [r for r in cycle_results if r.get("success", False)]
                cycle_end = time.time()
                
                cycle_stats.append({
                    "cycle": cycle + 1,
                    "success_rate": len(successful) / len(cycle_results) * 100,
                    "avg_response_time": statistics.mean([r["response_time"] for r in successful]) if successful else 0,
                    "cycle_duration": cycle_end - cycle_start
                })
                
                if cycle % 3 == 0:  # Print progress every 3 cycles
                    print(f"   📊 Cycle {cycle + 1}: {cycle_stats[-1]['success_rate']:.1f}% success, {cycle_stats[-1]['avg_response_time']:.1f}ms avg")
            
            # Analyze for degradation over time
            first_three = cycle_stats[:3]
            last_three = cycle_stats[-3:]
            
            first_avg_time = statistics.mean([c["avg_response_time"] for c in first_three])
            last_avg_time = statistics.mean([c["avg_response_time"] for c in last_three])
            
            first_success_rate = statistics.mean([c["success_rate"] for c in first_three])
            last_success_rate = statistics.mean([c["success_rate"] for c in last_three])
            
            time_degradation = ((last_avg_time - first_avg_time) / first_avg_time) * 100 if first_avg_time > 0 else 0
            success_degradation = first_success_rate - last_success_rate
            
            print(f"   📊 Performance change: {time_degradation:+.1f}% response time")
            print(f"   📊 Success rate change: {success_degradation:+.1f}%")
            
            # Check for significant degradation (potential memory leak)
            if time_degradation > 100:  # More than 100% increase in response time
                self.results["summary"]["load_issues"].append(
                    f"Possible memory leak: {time_degradation:.1f}% response time increase"
                )
                print("   ❌ Significant performance degradation suggests memory leak")
                return False
            
            if success_degradation > 10:  # More than 10% drop in success rate
                self.results["summary"]["load_issues"].append(
                    f"Possible stability issue: {success_degradation:.1f}% success rate drop"
                )
                print("   ❌ Success rate degradation suggests stability issues")
                return False
            
            print("   ✅ No memory leaks or stability issues detected")
            return True
            
        except Exception as e:
            print(f"   ❌ Error in memory leak test: {e}")
            return False
    
    def test_error_rate_under_load(self) -> bool:
        """Test error handling under load conditions"""
        print("⚠️ Testing error handling under load...")
        
        try:
            # Test parameters
            total_requests = 100
            max_workers = 15
            
            # Mix of valid and invalid requests
            test_cases = [
                ("GET", "/api/v2/health/", None, True),  # Should succeed
                ("GET", "/api/v2/nonexistent", None, False),  # Should fail with 404
                ("POST", "/api/v2/auth/login", {"invalid": "data"}, False),  # Should fail with 422
            ]
            
            print(f"   📊 Running {total_requests} mixed requests with {max_workers} workers")
            
            # Create request queue
            request_queue = []
            for i in range(total_requests):
                test_case = test_cases[i % len(test_cases)]
                request_queue.append(test_case)
            
            # Execute mixed requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = []
                for method, endpoint, data, should_succeed in request_queue:
                    future = executor.submit(self.make_request, method, endpoint, data, 10)
                    future.should_succeed = should_succeed
                    futures.append(future)
                
                results = []
                for future in concurrent.futures.as_completed(futures):
                    result = future.result()
                    result["should_succeed"] = future.should_succeed
                    results.append(result)
            
            # Analyze error handling
            correct_responses = 0
            incorrect_responses = 0
            
            for result in results:
                is_success = result.get("success", False) and result.get("status_code", 0) == 200
                should_succeed = result.get("should_succeed", True)
                
                if is_success == should_succeed:
                    correct_responses += 1
                else:
                    incorrect_responses += 1
            
            accuracy = correct_responses / len(results) * 100
            
            print(f"   📊 Error handling accuracy: {accuracy:.1f}%")
            print(f"   ✅ Correct responses: {correct_responses}")
            print(f"   ❌ Incorrect responses: {incorrect_responses}")
            
            if accuracy < 90:
                self.results["summary"]["load_issues"].append(
                    f"Poor error handling under load: {accuracy:.1f}% accuracy"
                )
                print("   ❌ Error handling degraded under load")
                return False
            
            print("   ✅ Error handling remained consistent under load")
            return True
            
        except Exception as e:
            print(f"   ❌ Error in error rate test: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all load tests"""
        print("🏋️ Starting comprehensive load testing...\n")
        
        tests = [
            ("basic_load", self.test_basic_load),
            ("sustained_load", self.test_sustained_load),
            ("spike_load", self.test_spike_load),
            ("memory_leak_detection", self.test_memory_leak_detection),
            ("error_rate_under_load", self.test_error_rate_under_load)
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
        print("🏋️ LOAD TESTING SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")
        
        if self.results['summary']['load_issues']:
            print(f"\n❌ LOAD ISSUES FOUND ({len(self.results['summary']['load_issues'])}):")
            for issue in self.results['summary']['load_issues']:
                print(f"   - {issue}")
        else:
            print("\n✅ NO LOAD ISSUES FOUND")
        
        print("\n📊 DETAILED TEST RESULTS:")
        for test_name, result in self.results['tests'].items():
            status = "✅ PASSED" if result['passed'] else "❌ FAILED"
            print(f"   {test_name}: {status}")
        
        print("=" * 60)

if __name__ == "__main__":
    tester = LoadTester()
    results = tester.run_all_tests()
    tester.print_summary()
    
    # Save results to file
    with open("/Users/bossio/6fb-booking/backend-v2/load_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: load_test_results.json")
    
    # Exit with error code if load issues found
    if results['summary']['load_issues']:
        exit(1)
    else:
        exit(0)