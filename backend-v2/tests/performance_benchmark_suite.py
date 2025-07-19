#!/usr/bin/env python3
"""
BookedBarber V2 Performance Benchmarking Suite
Comprehensive performance testing for frontend, backend, and system integration
"""

import asyncio
import aiohttp
import json
import time
import statistics
import psutil
import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

@dataclass
class PerformanceMetrics:
    """Container for performance metrics"""
    endpoint: str
    response_time_ms: float
    status_code: int
    memory_usage_mb: float
    cpu_percent: float
    timestamp: datetime
    error: Optional[str] = None

@dataclass
class LoadTestResult:
    """Container for load test results"""
    concurrent_users: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    errors: List[str]

class PerformanceBenchmarkSuite:
    def __init__(self, backend_url: str = "http://localhost:8000", frontend_url: str = "http://localhost:3000"):
        self.backend_url = backend_url.rstrip('/')
        self.frontend_url = frontend_url.rstrip('/')
        self.test_results = []
        self.start_time = datetime.now()
        
        # Test endpoints
        self.api_endpoints = [
            "/api/v2/health",
            "/api/v2/auth/verify",
            "/api/v2/appointments",
            "/api/v2/barbers",
            "/api/v2/services",
            "/api/v2/analytics/dashboard",
            "/api/v2/calendar/availability",
            "/api/v2/clients",
            "/api/v2/payments/status"
        ]
        
        self.frontend_routes = [
            "/",
            "/dashboard",
            "/calendar",
            "/analytics",
            "/booking",
            "/login",
            "/register"
        ]
        
        # Performance thresholds
        self.thresholds = {
            "api_response_time_ms": 200,  # 95th percentile
            "frontend_load_time_ms": 2000,
            "database_query_time_ms": 50,
            "memory_usage_mb": 512,
            "cpu_percent": 80
        }

    async def test_api_endpoint(self, session: aiohttp.ClientSession, endpoint: str) -> PerformanceMetrics:
        """Test single API endpoint performance"""
        start_time = time.time()
        start_memory = psutil.virtual_memory().used / 1024 / 1024
        start_cpu = psutil.cpu_percent()
        
        try:
            async with session.get(f"{self.backend_url}{endpoint}") as response:
                await response.text()  # Read response body
                end_time = time.time()
                
                return PerformanceMetrics(
                    endpoint=endpoint,
                    response_time_ms=(end_time - start_time) * 1000,
                    status_code=response.status,
                    memory_usage_mb=psutil.virtual_memory().used / 1024 / 1024 - start_memory,
                    cpu_percent=psutil.cpu_percent() - start_cpu,
                    timestamp=datetime.now()
                )
        except Exception as e:
            return PerformanceMetrics(
                endpoint=endpoint,
                response_time_ms=(time.time() - start_time) * 1000,
                status_code=0,
                memory_usage_mb=0,
                cpu_percent=0,
                timestamp=datetime.now(),
                error=str(e)
            )

    async def run_api_performance_tests(self) -> List[PerformanceMetrics]:
        """Run performance tests on all API endpoints"""
        print("🚀 Running API Performance Tests...")
        
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            tasks = []
            
            # Test each endpoint multiple times for statistical accuracy
            for endpoint in self.api_endpoints:
                for _ in range(10):  # 10 requests per endpoint
                    tasks.append(self.test_api_endpoint(session, endpoint))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            valid_results = [r for r in results if isinstance(r, PerformanceMetrics)]
            
            print(f"✅ Completed {len(valid_results)} API performance tests")
            return valid_results

    def test_database_performance(self) -> Dict[str, Any]:
        """Test database query performance"""
        print("🗄️  Running Database Performance Tests...")
        
        db_path = "6fb_booking.db"
        if not Path(db_path).exists():
            print(f"⚠️  Database not found at {db_path}")
            return {"error": "Database not found"}
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Test queries with timing
            test_queries = [
                "SELECT COUNT(*) FROM appointments",
                "SELECT COUNT(*) FROM users",
                "SELECT COUNT(*) FROM barbers",
                "SELECT COUNT(*) FROM services",
                "SELECT * FROM appointments ORDER BY created_at DESC LIMIT 10",
                "SELECT b.name, COUNT(a.id) as appointment_count FROM barbers b LEFT JOIN appointments a ON b.id = a.barber_id GROUP BY b.id",
            ]
            
            query_results = []
            
            for query in test_queries:
                start_time = time.time()
                try:
                    cursor.execute(query)
                    results = cursor.fetchall()
                    end_time = time.time()
                    
                    query_results.append({
                        "query": query,
                        "execution_time_ms": (end_time - start_time) * 1000,
                        "rows_returned": len(results),
                        "status": "success"
                    })
                except Exception as e:
                    query_results.append({
                        "query": query,
                        "execution_time_ms": 0,
                        "rows_returned": 0,
                        "status": "error",
                        "error": str(e)
                    })
            
            conn.close()
            
            avg_query_time = statistics.mean([q["execution_time_ms"] for q in query_results if q["status"] == "success"])
            
            print(f"✅ Database tests completed. Average query time: {avg_query_time:.2f}ms")
            
            return {
                "average_query_time_ms": avg_query_time,
                "queries_tested": len(test_queries),
                "successful_queries": len([q for q in query_results if q["status"] == "success"]),
                "detailed_results": query_results
            }
            
        except Exception as e:
            print(f"❌ Database test error: {e}")
            return {"error": str(e)}

    def test_frontend_performance(self) -> Dict[str, Any]:
        """Test frontend page load performance using Node.js/Puppeteer"""
        print("🌐 Running Frontend Performance Tests...")
        
        # Create Node.js script for frontend testing
        frontend_test_script = f"""
const puppeteer = require('puppeteer');
const fs = require('fs');

async function testPagePerformance(url) {{
    const browser = await puppeteer.launch({{ headless: true }});
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.tracing.start({{ path: 'trace.json', screenshots: true }});
    
    const startTime = Date.now();
    
    try {{
        await page.goto(url, {{ waitUntil: 'networkidle2', timeout: 30000 }});
        const endTime = Date.now();
        
        // Get performance metrics
        const metrics = await page.metrics();
        
        // Get bundle size information
        const resourceSizes = await page.evaluate(() => {{
            const entries = performance.getEntriesByType('resource');
            return entries.map(entry => ({{
                name: entry.name,
                size: entry.transferSize || 0,
                type: entry.initiatorType
            }}));
        }});
        
        await page.tracing.stop();
        await browser.close();
        
        return {{
            url: url,
            loadTime: endTime - startTime,
            metrics: metrics,
            resourceSizes: resourceSizes,
            status: 'success'
        }};
    }} catch (error) {{
        await browser.close();
        return {{
            url: url,
            loadTime: Date.now() - startTime,
            error: error.message,
            status: 'error'
        }};
    }}
}}

async function runAllTests() {{
    const routes = {json.dumps(self.frontend_routes)};
    const baseUrl = '{self.frontend_url}';
    const results = [];
    
    for (const route of routes) {{
        console.log(`Testing ${{baseUrl}}${{route}}`);
        const result = await testPagePerformance(`${{baseUrl}}${{route}}`);
        results.push(result);
    }}
    
    // Write results to file
    fs.writeFileSync('frontend_perf_results.json', JSON.stringify(results, null, 2));
    console.log('Frontend performance tests completed');
}}

runAllTests().catch(console.error);
"""
        
        # Write and execute the script
        script_path = "frontend_perf_test.js"
        with open(script_path, 'w') as f:
            f.write(frontend_test_script)
        
        try:
            # Check if puppeteer is available
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            if result.returncode != 0:
                print("⚠️  Node.js not available, skipping frontend tests")
                return {"error": "Node.js not available"}
            
            # Run the frontend test
            result = subprocess.run(['node', script_path], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                # Read results
                if Path('frontend_perf_results.json').exists():
                    with open('frontend_perf_results.json', 'r') as f:
                        results = json.load(f)
                    
                    # Clean up
                    Path(script_path).unlink(missing_ok=True)
                    Path('frontend_perf_results.json').unlink(missing_ok=True)
                    Path('trace.json').unlink(missing_ok=True)
                    
                    print(f"✅ Frontend tests completed for {len(results)} routes")
                    return {"results": results}
                else:
                    return {"error": "No results file generated"}
            else:
                print(f"❌ Frontend test failed: {result.stderr}")
                return {"error": result.stderr}
                
        except subprocess.TimeoutExpired:
            print("⚠️  Frontend tests timed out")
            return {"error": "Tests timed out"}
        except Exception as e:
            print(f"❌ Frontend test error: {e}")
            return {"error": str(e)}
        finally:
            # Clean up files
            Path(script_path).unlink(missing_ok=True)

    async def run_load_test(self, concurrent_users: int, duration_seconds: int = 60) -> LoadTestResult:
        """Run load test with specified concurrent users"""
        print(f"⚡ Running load test: {concurrent_users} concurrent users for {duration_seconds}s")
        
        results = []
        errors = []
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        async def user_simulation(session: aiohttp.ClientSession, user_id: int):
            """Simulate a single user's behavior"""
            user_results = []
            
            while time.time() < end_time:
                # Simulate user journey: login -> dashboard -> calendar -> booking
                endpoints = [
                    "/api/v2/health",
                    "/api/v2/barbers",
                    "/api/v2/appointments",
                    "/api/v2/services"
                ]
                
                for endpoint in endpoints:
                    try:
                        request_start = time.time()
                        async with session.get(f"{self.backend_url}{endpoint}") as response:
                            await response.text()
                            request_end = time.time()
                            
                            user_results.append({
                                "response_time": (request_end - request_start) * 1000,
                                "status_code": response.status,
                                "success": response.status < 400
                            })
                    except Exception as e:
                        errors.append(f"User {user_id}: {str(e)}")
                        user_results.append({
                            "response_time": 0,
                            "status_code": 0,
                            "success": False
                        })
                
                # Wait between requests (simulate user thinking time)
                await asyncio.sleep(1)
            
            return user_results
        
        # Create concurrent user sessions
        connector = aiohttp.TCPConnector(limit=concurrent_users * 2)
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            tasks = [user_simulation(session, i) for i in range(concurrent_users)]
            user_results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Aggregate results
        all_results = []
        for user_results in user_results_list:
            if isinstance(user_results, list):
                all_results.extend(user_results)
        
        successful_requests = [r for r in all_results if r["success"]]
        failed_requests = [r for r in all_results if not r["success"]]
        
        if successful_requests:
            response_times = [r["response_time"] for r in successful_requests]
            avg_response_time = statistics.mean(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            p99_response_time = statistics.quantiles(response_times, n=100)[98]  # 99th percentile
        else:
            avg_response_time = p95_response_time = p99_response_time = 0
        
        total_requests = len(all_results)
        actual_duration = time.time() - start_time
        requests_per_second = total_requests / actual_duration if actual_duration > 0 else 0
        
        result = LoadTestResult(
            concurrent_users=concurrent_users,
            total_requests=total_requests,
            successful_requests=len(successful_requests),
            failed_requests=len(failed_requests),
            avg_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            requests_per_second=requests_per_second,
            errors=errors[:10]  # Limit error list
        )
        
        print(f"✅ Load test completed: {len(successful_requests)}/{total_requests} successful requests")
        return result

    def analyze_scalability(self, load_test_results: List[LoadTestResult]) -> Dict[str, Any]:
        """Analyze scalability based on load test results"""
        print("📊 Analyzing scalability projections...")
        
        if not load_test_results:
            return {"error": "No load test results to analyze"}
        
        # Extract metrics for analysis
        user_counts = [r.concurrent_users for r in load_test_results]
        response_times = [r.avg_response_time for r in load_test_results]
        success_rates = [r.successful_requests / r.total_requests if r.total_requests > 0 else 0 for r in load_test_results]
        rps_values = [r.requests_per_second for r in load_test_results]
        
        # Find breaking points
        breaking_point_users = None
        for i, success_rate in enumerate(success_rates):
            if success_rate < 0.95:  # 95% success rate threshold
                breaking_point_users = user_counts[i]
                break
        
        # Project capacity for different user loads
        projections = {}
        target_loads = [100, 1000, 10000]
        
        for target in target_loads:
            if not load_test_results:
                projections[f"{target}_users"] = {"status": "no_data"}
                continue
                
            # Simple linear extrapolation (in reality, this would be more sophisticated)
            if target <= max(user_counts):
                # Interpolate based on existing data
                closest_result = min(load_test_results, key=lambda x: abs(x.concurrent_users - target))
                projections[f"{target}_users"] = {
                    "projected_response_time_ms": closest_result.avg_response_time * (target / closest_result.concurrent_users),
                    "projected_success_rate": max(0.0, closest_result.successful_requests / closest_result.total_requests - 0.1 * (target / closest_result.concurrent_users - 1)),
                    "recommendation": "monitor_closely" if target > closest_result.concurrent_users else "should_handle_well"
                }
            else:
                # Extrapolate beyond tested range
                scaling_factor = target / max(user_counts)
                max_result = max(load_test_results, key=lambda x: x.concurrent_users)
                
                projections[f"{target}_users"] = {
                    "projected_response_time_ms": max_result.avg_response_time * scaling_factor,
                    "projected_success_rate": max(0.0, (max_result.successful_requests / max_result.total_requests) / scaling_factor),
                    "recommendation": "requires_optimization" if scaling_factor > 2 else "may_need_monitoring"
                }
        
        return {
            "breaking_point_users": breaking_point_users,
            "max_tested_users": max(user_counts) if user_counts else 0,
            "peak_rps": max(rps_values) if rps_values else 0,
            "projections": projections,
            "recommendations": self.generate_optimization_recommendations(load_test_results)
        }

    def generate_optimization_recommendations(self, load_test_results: List[LoadTestResult]) -> List[str]:
        """Generate specific optimization recommendations"""
        recommendations = []
        
        if not load_test_results:
            return ["No load test data available for recommendations"]
        
        # Analyze performance patterns
        avg_response_times = [r.avg_response_time for r in load_test_results]
        success_rates = [r.successful_requests / r.total_requests if r.total_requests > 0 else 0 for r in load_test_results]
        
        avg_response_time = statistics.mean(avg_response_times) if avg_response_times else 0
        avg_success_rate = statistics.mean(success_rates) if success_rates else 0
        
        # Generate recommendations based on thresholds
        if avg_response_time > self.thresholds["api_response_time_ms"]:
            recommendations.append(f"🔧 API response time ({avg_response_time:.1f}ms) exceeds target ({self.thresholds['api_response_time_ms']}ms). Consider: database indexing, caching, query optimization")
        
        if avg_success_rate < 0.99:
            recommendations.append(f"⚠️  Success rate ({avg_success_rate:.1%}) below 99%. Consider: connection pooling, timeout optimization, error handling improvements")
        
        # Database recommendations
        recommendations.extend([
            "🗄️  Database Optimization: Add indexes on frequently queried columns (user_id, barber_id, appointment_date)",
            "⚡ Caching: Implement Redis for session storage and frequently accessed data",
            "📊 Connection Pooling: Configure PostgreSQL connection pooling for production",
            "🔄 Load Balancing: Consider multiple backend instances behind load balancer for >1000 concurrent users"
        ])
        
        # Frontend recommendations
        recommendations.extend([
            "🌐 Frontend: Implement code splitting and lazy loading for better initial load times",
            "📦 Bundle Optimization: Use webpack bundle analyzer to identify and reduce large dependencies",
            "🖼️  Asset Optimization: Compress images and implement CDN for static assets",
            "🔄 Service Worker: Implement service worker for offline capabilities and caching"
        ])
        
        return recommendations

    async def run_comprehensive_benchmark(self) -> Dict[str, Any]:
        """Run the complete performance benchmark suite"""
        print("🚀 Starting Comprehensive Performance Benchmark...")
        print(f"Backend URL: {self.backend_url}")
        print(f"Frontend URL: {self.frontend_url}")
        print("=" * 60)
        
        results = {
            "test_info": {
                "start_time": self.start_time.isoformat(),
                "backend_url": self.backend_url,
                "frontend_url": self.frontend_url,
                "system_info": {
                    "cpu_count": psutil.cpu_count(),
                    "memory_total_gb": psutil.virtual_memory().total / 1024 / 1024 / 1024,
                    "platform": sys.platform
                }
            }
        }
        
        # 1. API Performance Tests
        api_results = await self.run_api_performance_tests()
        results["api_performance"] = self.analyze_api_results(api_results)
        
        # 2. Database Performance Tests
        db_results = self.test_database_performance()
        results["database_performance"] = db_results
        
        # 3. Frontend Performance Tests
        frontend_results = self.test_frontend_performance()
        results["frontend_performance"] = frontend_results
        
        # 4. Load Tests with increasing concurrent users
        load_test_results = []
        for concurrent_users in [1, 5, 10, 25, 50]:
            try:
                load_result = await self.run_load_test(concurrent_users, duration_seconds=30)
                load_test_results.append(load_result)
            except Exception as e:
                print(f"❌ Load test failed for {concurrent_users} users: {e}")
        
        results["load_tests"] = {
            "results": [self.load_result_to_dict(r) for r in load_test_results],
            "summary": self.analyze_load_test_summary(load_test_results)
        }
        
        # 5. Scalability Analysis
        scalability_analysis = self.analyze_scalability(load_test_results)
        results["scalability_analysis"] = scalability_analysis
        
        # 6. Generate final recommendations
        results["optimization_recommendations"] = self.generate_optimization_recommendations(load_test_results)
        
        results["test_info"]["end_time"] = datetime.now().isoformat()
        results["test_info"]["duration_minutes"] = (datetime.now() - self.start_time).total_seconds() / 60
        
        return results

    def analyze_api_results(self, api_results: List[PerformanceMetrics]) -> Dict[str, Any]:
        """Analyze API performance results"""
        if not api_results:
            return {"error": "No API results to analyze"}
        
        # Group by endpoint
        endpoint_results = {}
        for result in api_results:
            if result.endpoint not in endpoint_results:
                endpoint_results[result.endpoint] = []
            endpoint_results[result.endpoint].append(result)
        
        # Calculate statistics for each endpoint
        endpoint_stats = {}
        for endpoint, results in endpoint_results.items():
            response_times = [r.response_time_ms for r in results if r.error is None]
            if response_times:
                endpoint_stats[endpoint] = {
                    "avg_response_time_ms": statistics.mean(response_times),
                    "p95_response_time_ms": statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max(response_times),
                    "min_response_time_ms": min(response_times),
                    "max_response_time_ms": max(response_times),
                    "success_rate": len([r for r in results if r.error is None]) / len(results),
                    "total_requests": len(results)
                }
        
        # Overall statistics
        all_response_times = [r.response_time_ms for r in api_results if r.error is None]
        if all_response_times:
            overall_stats = {
                "total_requests": len(api_results),
                "successful_requests": len(all_response_times),
                "avg_response_time_ms": statistics.mean(all_response_times),
                "p95_response_time_ms": statistics.quantiles(all_response_times, n=20)[18] if len(all_response_times) >= 20 else max(all_response_times),
                "success_rate": len(all_response_times) / len(api_results)
            }
        else:
            overall_stats = {"error": "No successful API requests"}
        
        return {
            "overall": overall_stats,
            "by_endpoint": endpoint_stats
        }

    def load_result_to_dict(self, result: LoadTestResult) -> Dict[str, Any]:
        """Convert LoadTestResult to dictionary"""
        return {
            "concurrent_users": result.concurrent_users,
            "total_requests": result.total_requests,
            "successful_requests": result.successful_requests,
            "failed_requests": result.failed_requests,
            "avg_response_time_ms": result.avg_response_time,
            "p95_response_time_ms": result.p95_response_time,
            "p99_response_time_ms": result.p99_response_time,
            "requests_per_second": result.requests_per_second,
            "success_rate": result.successful_requests / result.total_requests if result.total_requests > 0 else 0,
            "error_count": len(result.errors)
        }

    def analyze_load_test_summary(self, load_test_results: List[LoadTestResult]) -> Dict[str, Any]:
        """Analyze load test results summary"""
        if not load_test_results:
            return {"error": "No load test results"}
        
        # Find optimal performance point
        optimal_result = max(load_test_results, key=lambda x: x.requests_per_second * (x.successful_requests / x.total_requests if x.total_requests > 0 else 0))
        
        # Find degradation point
        degradation_point = None
        for result in sorted(load_test_results, key=lambda x: x.concurrent_users):
            success_rate = result.successful_requests / result.total_requests if result.total_requests > 0 else 0
            if success_rate < 0.95:  # 95% success rate threshold
                degradation_point = result.concurrent_users
                break
        
        return {
            "optimal_concurrent_users": optimal_result.concurrent_users,
            "peak_requests_per_second": optimal_result.requests_per_second,
            "degradation_starts_at_users": degradation_point,
            "max_tested_users": max([r.concurrent_users for r in load_test_results]),
            "recommendation": self.get_load_test_recommendation(load_test_results)
        }

    def get_load_test_recommendation(self, load_test_results: List[LoadTestResult]) -> str:
        """Get recommendation based on load test results"""
        if not load_test_results:
            return "No data available for recommendations"
        
        max_users = max([r.concurrent_users for r in load_test_results])
        avg_success_rate = statistics.mean([r.successful_requests / r.total_requests if r.total_requests > 0 else 0 for r in load_test_results])
        
        if avg_success_rate > 0.99 and max_users >= 50:
            return "System shows good performance under load. Ready for production scaling."
        elif avg_success_rate > 0.95:
            return "System handles moderate load well. Consider optimization for higher concurrency."
        else:
            return "System shows performance degradation under load. Optimization required before production."

    def save_results(self, results: Dict[str, Any], filename: str = None) -> str:
        """Save benchmark results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_benchmark_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        return filename

async def main():
    """Main execution function"""
    # Check if servers are running
    backend_url = "http://localhost:8000"
    frontend_url = "http://localhost:3000"
    
    print("🔍 Checking server availability...")
    try:
        response = requests.get(f"{backend_url}/api/v2/health", timeout=5)
        if response.status_code != 200:
            print(f"⚠️  Backend server not responding properly at {backend_url}")
    except:
        print(f"❌ Backend server not available at {backend_url}")
        print("Please start the backend server and try again.")
        return
    
    try:
        response = requests.get(frontend_url, timeout=5)
        if response.status_code != 200:
            print(f"⚠️  Frontend server not responding properly at {frontend_url}")
    except:
        print(f"⚠️  Frontend server not available at {frontend_url} (continuing with backend tests only)")
    
    # Run benchmark suite
    benchmark = PerformanceBenchmarkSuite(backend_url, frontend_url)
    results = await benchmark.run_comprehensive_benchmark()
    
    # Save results
    filename = benchmark.save_results(results)
    print(f"\n📊 Performance benchmark completed!")
    print(f"📄 Results saved to: {filename}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("PERFORMANCE BENCHMARK SUMMARY")
    print("=" * 60)
    
    if "api_performance" in results and "overall" in results["api_performance"]:
        api_stats = results["api_performance"]["overall"]
        if "avg_response_time_ms" in api_stats:
            print(f"📡 API Average Response Time: {api_stats['avg_response_time_ms']:.2f}ms")
            print(f"📡 API Success Rate: {api_stats['success_rate']:.1%}")
    
    if "database_performance" in results and "average_query_time_ms" in results["database_performance"]:
        db_stats = results["database_performance"]
        print(f"🗄️  Database Average Query Time: {db_stats['average_query_time_ms']:.2f}ms")
    
    if "load_tests" in results and "summary" in results["load_tests"]:
        load_summary = results["load_tests"]["summary"]
        if "peak_requests_per_second" in load_summary:
            print(f"⚡ Peak Requests/Second: {load_summary['peak_requests_per_second']:.1f}")
            print(f"👥 Optimal Concurrent Users: {load_summary['optimal_concurrent_users']}")
    
    print("\n📋 Key Recommendations:")
    if "optimization_recommendations" in results:
        for i, rec in enumerate(results["optimization_recommendations"][:5], 1):
            print(f"{i}. {rec}")
    
    print(f"\n📄 Full report: {filename}")

if __name__ == "__main__":
    asyncio.run(main())