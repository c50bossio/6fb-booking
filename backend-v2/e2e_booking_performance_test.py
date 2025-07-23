#!/usr/bin/env python3
"""
BookedBarber V2 End-to-End Booking Flow Performance Test
Tests the complete booking workflow performance from start to finish
"""

import asyncio
import aiohttp
import json
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging
from pathlib import Path
import subprocess
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BookingFlowStep:
    """Represents a single step in the booking flow"""
    name: str
    endpoint: str
    method: str
    payload: Optional[Dict] = None
    expected_status: int = 200
    timeout: float = 10.0

@dataclass
class BookingFlowResult:
    """Results from a complete booking flow test"""
    total_time_ms: float
    steps: List[Dict[str, Any]]
    success: bool
    user_id: Optional[str] = None
    appointment_id: Optional[str] = None
    errors: List[str] = None

class E2EBookingPerformanceTest:
    def __init__(self, backend_url: str = "http://localhost:8000", frontend_url: str = "http://localhost:3000"):
        self.backend_url = backend_url.rstrip('/')
        self.frontend_url = frontend_url.rstrip('/')
        self.test_results = []
        
        # Define the complete booking flow
        self.booking_flow_steps = [
            BookingFlowStep(
                name="Health Check",
                endpoint="/api/v2/health",
                method="GET"
            ),
            BookingFlowStep(
                name="Get Available Services",
                endpoint="/api/v1/services",
                method="GET"
            ),
            BookingFlowStep(
                name="Get Available Barbers",
                endpoint="/api/v1/barbers",
                method="GET"
            ),
            BookingFlowStep(
                name="Check Calendar Availability",
                endpoint="/api/v1/calendar/availability",
                method="GET"
            ),
            BookingFlowStep(
                name="Create Guest User",
                endpoint="/api/v1/auth/register",
                method="POST",
                payload={
                    "email": "test@performance.test",
                    "password": "TestPassword123!",
                    "first_name": "Performance",
                    "last_name": "Test",
                    "phone": "+1234567890"
                }
            ),
            BookingFlowStep(
                name="Login User",
                endpoint="/api/v1/auth/login",
                method="POST",
                payload={
                    "email": "test@performance.test",
                    "password": "TestPassword123!"
                }
            ),
            BookingFlowStep(
                name="Create Appointment",
                endpoint="/api/v1/appointments",
                method="POST",
                payload={
                    "service_id": 1,
                    "barber_id": 1,
                    "appointment_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
                    "duration_minutes": 60,
                    "notes": "Performance test appointment"
                }
            ),
            BookingFlowStep(
                name="Confirm Appointment",
                endpoint="/api/v1/appointments/{appointment_id}/confirm",
                method="PUT",
                payload={"confirmed": True}
            ),
            BookingFlowStep(
                name="Get Appointment Details",
                endpoint="/api/v1/appointments/{appointment_id}",
                method="GET"
            )
        ]
        
        # Performance thresholds
        self.thresholds = {
            "total_booking_flow_ms": 5000,  # Complete flow should take < 5 seconds
            "individual_api_call_ms": 1000, # Each API call should take < 1 second
            "database_operations_ms": 500,  # Database operations < 500ms
            "auth_operations_ms": 2000      # Auth operations < 2 seconds
        }

    async def execute_booking_flow(self, session: aiohttp.ClientSession, flow_id: str) -> BookingFlowResult:
        """Execute a complete booking flow and measure performance"""
        logger.info(f"🚀 Starting booking flow {flow_id}")
        
        start_time = time.time()
        steps_results = []
        errors = []
        auth_token = None
        appointment_id = None
        user_id = None
        
        try:
            for step in self.booking_flow_steps:
                step_start = time.time()
                
                # Prepare request
                url = f"{self.backend_url}{step.endpoint}"
                headers = {'Content-Type': 'application/json'}
                
                # Add auth token if available
                if auth_token and step.name != "Create Guest User" and step.name != "Login User":
                    headers['Authorization'] = f"Bearer {auth_token}"
                
                # Handle dynamic URL placeholders
                if '{appointment_id}' in url and appointment_id:
                    url = url.replace('{appointment_id}', str(appointment_id))
                elif '{appointment_id}' in url and not appointment_id:
                    # Skip steps that require appointment_id if we don't have one
                    steps_results.append({
                        "name": step.name,
                        "status": "skipped",
                        "reason": "No appointment_id available",
                        "duration_ms": 0
                    })
                    continue
                
                # Make request
                try:
                    if step.method == "GET":
                        async with session.get(url, headers=headers, timeout=step.timeout) as response:
                            response_data = await response.json()
                            status_code = response.status
                    elif step.method == "POST":
                        async with session.post(url, json=step.payload, headers=headers, timeout=step.timeout) as response:
                            response_data = await response.json()
                            status_code = response.status
                    elif step.method == "PUT":
                        async with session.put(url, json=step.payload, headers=headers, timeout=step.timeout) as response:
                            response_data = await response.json()
                            status_code = response.status
                    else:
                        raise ValueError(f"Unsupported HTTP method: {step.method}")
                    
                    step_end = time.time()
                    duration_ms = (step_end - step_start) * 1000
                    
                    # Process response
                    success = status_code == step.expected_status
                    
                    # Extract important data from responses
                    if step.name == "Login User" and success and "access_token" in response_data:
                        auth_token = response_data["access_token"]
                        if "user_id" in response_data:
                            user_id = response_data["user_id"]
                    
                    if step.name == "Create Appointment" and success and "id" in response_data:
                        appointment_id = response_data["id"]
                    
                    # Record step result
                    step_result = {
                        "name": step.name,
                        "endpoint": step.endpoint,
                        "method": step.method,
                        "duration_ms": duration_ms,
                        "status_code": status_code,
                        "success": success,
                        "response_size_bytes": len(json.dumps(response_data)) if response_data else 0,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    if not success:
                        step_result["error"] = f"Expected status {step.expected_status}, got {status_code}"
                        step_result["response_data"] = response_data
                        errors.append(f"{step.name}: {step_result['error']}")
                    
                    steps_results.append(step_result)
                    
                    # Log step completion
                    status_emoji = "✅" if success else "❌"
                    logger.info(f"{status_emoji} {step.name}: {duration_ms:.1f}ms")
                    
                except asyncio.TimeoutError:
                    duration_ms = step.timeout * 1000
                    error_msg = f"Timeout after {step.timeout}s"
                    steps_results.append({
                        "name": step.name,
                        "endpoint": step.endpoint,
                        "method": step.method,
                        "duration_ms": duration_ms,
                        "status_code": 0,
                        "success": False,
                        "error": error_msg,
                        "timestamp": datetime.now().isoformat()
                    })
                    errors.append(f"{step.name}: {error_msg}")
                    logger.error(f"❌ {step.name}: {error_msg}")
                    
                except Exception as e:
                    duration_ms = (time.time() - step_start) * 1000
                    error_msg = str(e)
                    steps_results.append({
                        "name": step.name,
                        "endpoint": step.endpoint,
                        "method": step.method,
                        "duration_ms": duration_ms,
                        "status_code": 0,
                        "success": False,
                        "error": error_msg,
                        "timestamp": datetime.now().isoformat()
                    })
                    errors.append(f"{step.name}: {error_msg}")
                    logger.error(f"❌ {step.name}: {error_msg}")
                
                # Add delay between requests to simulate real user behavior
                await asyncio.sleep(0.1)
            
            total_time_ms = (time.time() - start_time) * 1000
            overall_success = len(errors) == 0 and appointment_id is not None
            
            logger.info(f"🏁 Booking flow {flow_id} completed in {total_time_ms:.1f}ms - {'✅ Success' if overall_success else '❌ Failed'}")
            
            return BookingFlowResult(
                total_time_ms=total_time_ms,
                steps=steps_results,
                success=overall_success,
                user_id=user_id,
                appointment_id=appointment_id,
                errors=errors
            )
            
        except Exception as e:
            total_time_ms = (time.time() - start_time) * 1000
            logger.error(f"❌ Critical error in booking flow {flow_id}: {e}")
            
            return BookingFlowResult(
                total_time_ms=total_time_ms,
                steps=steps_results,
                success=False,
                errors=[f"Critical error: {str(e)}"]
            )

    async def run_concurrent_booking_flows(self, concurrent_flows: int = 5) -> List[BookingFlowResult]:
        """Run multiple booking flows concurrently to test system load"""
        logger.info(f"🔄 Running {concurrent_flows} concurrent booking flows")
        
        connector = aiohttp.TCPConnector(limit=concurrent_flows * 2)
        timeout = aiohttp.ClientTimeout(total=60)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Create tasks for concurrent flows
            tasks = []
            for i in range(concurrent_flows):
                # Use unique email for each flow to avoid conflicts
                modified_steps = []
                for step in self.booking_flow_steps:
                    if step.payload and "email" in step.payload:
                        modified_step = BookingFlowStep(
                            name=step.name,
                            endpoint=step.endpoint,
                            method=step.method,
                            payload={**step.payload, "email": f"test{i}@performance.test"},
                            expected_status=step.expected_status,
                            timeout=step.timeout
                        )
                        modified_steps.append(modified_step)
                    else:
                        modified_steps.append(step)
                
                # Temporarily modify the steps for this flow
                original_steps = self.booking_flow_steps
                self.booking_flow_steps = modified_steps
                
                task = asyncio.create_task(self.execute_booking_flow(session, f"flow_{i}"))
                tasks.append(task)
                
                # Restore original steps
                self.booking_flow_steps = original_steps
            
            # Execute all flows concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            valid_results = []
            for i, result in enumerate(results):
                if isinstance(result, BookingFlowResult):
                    valid_results.append(result)
                else:
                    logger.error(f"Flow {i} failed with exception: {result}")
            
            return valid_results

    def analyze_booking_performance(self, results: List[BookingFlowResult]) -> Dict[str, Any]:
        """Analyze booking flow performance results"""
        if not results:
            return {"error": "No results to analyze"}
        
        # Overall statistics
        total_times = [r.total_time_ms for r in results]
        successful_flows = [r for r in results if r.success]
        failed_flows = [r for r in results if not r.success]
        
        analysis = {
            "overview": {
                "total_flows": len(results),
                "successful_flows": len(successful_flows),
                "failed_flows": len(failed_flows),
                "success_rate": len(successful_flows) / len(results) if results else 0,
                "avg_total_time_ms": statistics.mean(total_times) if total_times else 0,
                "min_total_time_ms": min(total_times) if total_times else 0,
                "max_total_time_ms": max(total_times) if total_times else 0
            }
        }
        
        if total_times:
            analysis["overview"]["p95_total_time_ms"] = statistics.quantiles(total_times, n=20)[18] if len(total_times) >= 20 else max(total_times)
        
        # Step-by-step analysis
        step_analysis = {}
        if successful_flows:
            # Get all unique step names
            all_step_names = set()
            for flow in successful_flows:
                for step in flow.steps:
                    if step.get("success", False):
                        all_step_names.add(step["name"])
            
            # Analyze each step
            for step_name in all_step_names:
                step_times = []
                for flow in successful_flows:
                    for step in flow.steps:
                        if step["name"] == step_name and step.get("success", False):
                            step_times.append(step["duration_ms"])
                
                if step_times:
                    step_analysis[step_name] = {
                        "avg_duration_ms": statistics.mean(step_times),
                        "min_duration_ms": min(step_times),
                        "max_duration_ms": max(step_times),
                        "sample_size": len(step_times)
                    }
                    
                    if len(step_times) >= 5:
                        step_analysis[step_name]["p95_duration_ms"] = statistics.quantiles(step_times, n=20)[18] if len(step_times) >= 20 else max(step_times)
        
        analysis["step_analysis"] = step_analysis
        
        # Performance threshold analysis
        threshold_analysis = {
            "total_flow_threshold_violations": len([r for r in results if r.total_time_ms > self.thresholds["total_booking_flow_ms"]]),
            "slow_api_calls": []
        }
        
        for step_name, step_stats in step_analysis.items():
            if step_stats["avg_duration_ms"] > self.thresholds["individual_api_call_ms"]:
                threshold_analysis["slow_api_calls"].append({
                    "step": step_name,
                    "avg_duration_ms": step_stats["avg_duration_ms"],
                    "threshold_ms": self.thresholds["individual_api_call_ms"]
                })
        
        analysis["threshold_analysis"] = threshold_analysis
        
        # Error analysis
        if failed_flows:
            error_analysis = {}
            for flow in failed_flows:
                for error in flow.errors or []:
                    if error not in error_analysis:
                        error_analysis[error] = 0
                    error_analysis[error] += 1
            
            analysis["error_analysis"] = error_analysis
        
        return analysis

    def generate_performance_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate specific performance recommendations based on analysis"""
        recommendations = []
        
        if "overview" not in analysis:
            return ["No analysis data available for recommendations"]
        
        overview = analysis["overview"]
        
        # Overall performance recommendations
        if overview["success_rate"] < 0.95:
            recommendations.append(f"🚨 Success rate ({overview['success_rate']:.1%}) is below 95%. Investigate error causes and improve system reliability.")
        
        if overview["avg_total_time_ms"] > self.thresholds["total_booking_flow_ms"]:
            recommendations.append(f"⏰ Average booking flow time ({overview['avg_total_time_ms']:.1f}ms) exceeds target ({self.thresholds['total_booking_flow_ms']}ms). Focus on optimizing slowest steps.")
        
        # Step-specific recommendations
        if "step_analysis" in analysis:
            slow_steps = []
            for step_name, step_stats in analysis["step_analysis"].items():
                if step_stats["avg_duration_ms"] > self.thresholds["individual_api_call_ms"]:
                    slow_steps.append((step_name, step_stats["avg_duration_ms"]))
            
            if slow_steps:
                slow_steps.sort(key=lambda x: x[1], reverse=True)
                recommendations.append(f"🐌 Slow API calls detected: {', '.join([f'{name} ({time:.1f}ms)' for name, time in slow_steps[:3]])}. Optimize these endpoints first.")
        
        # Specific optimization recommendations
        recommendations.extend([
            "🗄️  Database Optimization: Ensure proper indexing on user_id, appointment_id, and datetime columns",
            "🔐 Auth Optimization: Consider JWT token caching and shorter-lived tokens with refresh mechanism",
            "⚡ Caching Strategy: Implement Redis caching for barber availability and service listings",
            "🔄 Connection Pooling: Configure database connection pooling for better concurrent request handling",
            "📊 Monitoring: Set up APM tools (e.g., New Relic, DataDog) for real-time performance monitoring"
        ])
        
        # Scalability recommendations
        if overview["total_flows"] >= 5:
            recommendations.append("🚀 Scalability: Consider implementing API rate limiting and request queuing for production load")
        
        return recommendations

    async def run_memory_usage_test(self) -> Dict[str, Any]:
        """Test memory usage during booking flows"""
        try:
            import psutil
            process = psutil.Process()
            
            # Baseline memory
            baseline_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Run booking flows
            results = await self.run_concurrent_booking_flows(concurrent_flows=3)
            
            # Peak memory
            peak_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            return {
                "baseline_memory_mb": baseline_memory,
                "peak_memory_mb": peak_memory,
                "memory_increase_mb": peak_memory - baseline_memory,
                "memory_per_flow_mb": (peak_memory - baseline_memory) / len(results) if results else 0
            }
        except ImportError:
            return {"error": "psutil not available for memory testing"}
        except Exception as e:
            return {"error": f"Memory test failed: {str(e)}"}

    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive booking flow performance test"""
        logger.info("🎯 Starting Comprehensive E2E Booking Performance Test")
        logger.info(f"Backend: {self.backend_url}")
        logger.info(f"Frontend: {self.frontend_url}")
        logger.info("=" * 60)
        
        start_time = datetime.now()
        
        results = {
            "test_info": {
                "start_time": start_time.isoformat(),
                "backend_url": self.backend_url,
                "frontend_url": self.frontend_url,
                "thresholds": self.thresholds
            }
        }
        
        # 1. Single booking flow test
        logger.info("📋 Testing single booking flow...")
        single_flow_results = await self.run_concurrent_booking_flows(concurrent_flows=1)
        results["single_flow"] = single_flow_results[0] if single_flow_results else {"error": "Single flow test failed"}
        
        # 2. Concurrent booking flows test
        logger.info("🔄 Testing concurrent booking flows...")
        concurrent_results = await self.run_concurrent_booking_flows(concurrent_flows=5)
        results["concurrent_flows"] = {
            "results": [self.flow_result_to_dict(r) for r in concurrent_results],
            "count": len(concurrent_results)
        }
        
        # 3. Performance analysis
        logger.info("📊 Analyzing performance...")
        all_results = single_flow_results + concurrent_results
        analysis = self.analyze_booking_performance(all_results)
        results["performance_analysis"] = analysis
        
        # 4. Memory usage test
        logger.info("🧠 Testing memory usage...")
        memory_results = await self.run_memory_usage_test()
        results["memory_usage"] = memory_results
        
        # 5. Generate recommendations
        recommendations = self.generate_performance_recommendations(analysis)
        results["recommendations"] = recommendations
        
        # Test completion
        end_time = datetime.now()
        results["test_info"]["end_time"] = end_time.isoformat()
        results["test_info"]["duration_seconds"] = (end_time - start_time).total_seconds()
        
        return results

    def flow_result_to_dict(self, result: BookingFlowResult) -> Dict[str, Any]:
        """Convert BookingFlowResult to dictionary"""
        return {
            "total_time_ms": result.total_time_ms,
            "success": result.success,
            "user_id": result.user_id,
            "appointment_id": result.appointment_id,
            "errors": result.errors or [],
            "steps_count": len(result.steps),
            "successful_steps": len([s for s in result.steps if s.get("success", False)])
        }

    def save_results(self, results: Dict[str, Any], filename: str = None) -> str:
        """Save test results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"e2e_booking_performance_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        return filename

async def main():
    """Main execution function"""
    import requests
    
    # Check backend availability
    backend_url = "http://localhost:8000"
    try:
        response = requests.get(f"{backend_url}/api/v2/health", timeout=5)
        if response.status_code != 200:
            logger.error(f"Backend server not responding properly at {backend_url}")
            return
    except:
        logger.error(f"Backend server not available at {backend_url}")
        logger.error("Please start the backend server and try again.")
        return
    
    # Run E2E booking performance test
    test = E2EBookingPerformanceTest(backend_url)
    results = await test.run_comprehensive_test()
    
    # Save results
    filename = test.save_results(results)
    logger.info(f"\n📊 E2E Booking Performance Test Completed!")
    logger.info(f"📄 Results saved to: {filename}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("E2E BOOKING PERFORMANCE SUMMARY")
    print("=" * 60)
    
    if "single_flow" in results and isinstance(results["single_flow"], dict) and "total_time_ms" in results["single_flow"]:
        single_flow = results["single_flow"]
        print(f"🔄 Single Booking Flow: {single_flow['total_time_ms']:.1f}ms ({'✅ Success' if single_flow['success'] else '❌ Failed'})")
    
    if "performance_analysis" in results and "overview" in results["performance_analysis"]:
        overview = results["performance_analysis"]["overview"]
        print(f"👥 Concurrent Flows: {overview['successful_flows']}/{overview['total_flows']} successful")
        print(f"⏱️  Average Flow Time: {overview['avg_total_time_ms']:.1f}ms")
        print(f"📊 Success Rate: {overview['success_rate']:.1%}")
    
    if "memory_usage" in results and "memory_increase_mb" in results["memory_usage"]:
        memory = results["memory_usage"]
        print(f"🧠 Memory Usage: +{memory['memory_increase_mb']:.1f}MB ({memory['memory_per_flow_mb']:.1f}MB per flow)")
    
    print("\n📋 Key Recommendations:")
    if "recommendations" in results:
        for i, rec in enumerate(results["recommendations"][:5], 1):
            print(f"{i}. {rec}")
    
    print(f"\n📄 Full report: {filename}")

if __name__ == "__main__":
    asyncio.run(main())