#!/usr/bin/env python3
"""
Comprehensive Performance Assessment for BookedBarber V2
Evaluates system readiness for real barbershop operational loads
"""

import asyncio
import aiohttp
import time
import json
import sqlite3
import psutil
import statistics
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import logging
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PerformanceAssessment:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.db_path = "6fb_booking.db"
        self.results = {
            "baseline_metrics": {},
            "load_test_results": {},
            "resource_utilization": {},
            "bottlenecks": [],
            "recommendations": []
        }
        
    async def run_comprehensive_assessment(self):
        """Run complete performance assessment"""
        logger.info("🚀 Starting comprehensive performance assessment for BookedBarber V2")
        
        # Check server availability
        if not await self._check_server_health():
            logger.error("❌ Backend server is not accessible")
            return self.results
            
        # 1. Baseline Performance Metrics
        logger.info("📊 Establishing baseline performance metrics...")
        await self._establish_baseline_metrics()
        
        # 2. Database Performance Analysis
        logger.info("🗄️ Analyzing database performance...")
        await self._analyze_database_performance()
        
        # 3. Load Testing for Barbershop Operations
        logger.info("⚡ Running load tests for typical barbershop operations...")
        await self._run_barbershop_load_tests()
        
        # 4. Concurrent User Testing
        logger.info("👥 Testing concurrent user scenarios...")
        await self._test_concurrent_users()
        
        # 5. Resource Utilization Analysis
        logger.info("💾 Analyzing resource utilization...")
        await self._analyze_resource_utilization()
        
        # 6. Bottleneck Identification
        logger.info("🔍 Identifying performance bottlenecks...")
        await self._identify_bottlenecks()
        
        # 7. Real-world Scenarios
        logger.info("🏪 Testing real-world barbershop scenarios...")
        await self._test_barbershop_scenarios()
        
        # 8. Generate Report
        logger.info("📋 Generating performance assessment report...")
        self._generate_performance_report()
        
        return self.results
    
    async def _check_server_health(self) -> bool:
        """Check if backend server is running and healthy"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/health", timeout=10) as response:
                    if response.status == 200:
                        health_data = await response.json()
                        logger.info(f"✅ Server is healthy: {health_data}")
                        return True
        except Exception as e:
            logger.error(f"Server health check failed: {e}")
        return False
    
    async def _establish_baseline_metrics(self):
        """Establish baseline API response times and database query performance"""
        endpoints = [
            "/health",
            "/api/v2/auth/me",
            "/api/v2/appointments/",
            "/api/v2/barbers/",
            "/api/v2/services/",
            "/api/v2/clients/",
            "/api/v2/dashboard/"
        ]
        
        baseline_metrics = {}
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints:
                response_times = []
                errors = 0
                
                for _ in range(10):  # Test each endpoint 10 times
                    start_time = time.time()
                    try:
                        async with session.get(
                            f"{self.base_url}{endpoint}",
                            timeout=30
                        ) as response:
                            await response.text()  # Read response body
                            response_time = (time.time() - start_time) * 1000  # Convert to ms
                            response_times.append(response_time)
                            
                            if response.status >= 400:
                                errors += 1
                                
                    except Exception as e:
                        errors += 1
                        logger.warning(f"Error testing {endpoint}: {e}")
                    
                    await asyncio.sleep(0.1)  # Small delay between requests
                
                if response_times:
                    baseline_metrics[endpoint] = {
                        "avg_response_time_ms": statistics.mean(response_times),
                        "min_response_time_ms": min(response_times),
                        "max_response_time_ms": max(response_times),
                        "median_response_time_ms": statistics.median(response_times),
                        "p95_response_time_ms": sorted(response_times)[int(0.95 * len(response_times))],
                        "error_rate": errors / 10,
                        "total_requests": 10,
                        "errors": errors
                    }
        
        self.results["baseline_metrics"] = baseline_metrics
        logger.info("✅ Baseline metrics established")
    
    async def _analyze_database_performance(self):
        """Analyze SQLite database performance and query execution times"""
        db_metrics = {}
        
        try:
            # Connect to SQLite database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Test common queries with timing
            queries = {
                "count_appointments": "SELECT COUNT(*) FROM appointments",
                "count_users": "SELECT COUNT(*) FROM users",
                "count_barbers": "SELECT COUNT(*) FROM barbers",
                "count_services": "SELECT COUNT(*) FROM services",
                "recent_appointments": "SELECT * FROM appointments ORDER BY created_at DESC LIMIT 10",
                "user_with_appointments": """
                    SELECT u.*, COUNT(a.id) as appointment_count 
                    FROM users u 
                    LEFT JOIN appointments a ON u.id = a.user_id 
                    GROUP BY u.id 
                    LIMIT 10
                """
            }
            
            for query_name, query in queries.items():
                times = []
                for _ in range(5):  # Run each query 5 times
                    start_time = time.time()
                    try:
                        cursor.execute(query)
                        results = cursor.fetchall()
                        query_time = (time.time() - start_time) * 1000  # Convert to ms
                        times.append(query_time)
                    except Exception as e:
                        logger.warning(f"Query {query_name} failed: {e}")
                        continue
                
                if times:
                    db_metrics[query_name] = {
                        "avg_time_ms": statistics.mean(times),
                        "min_time_ms": min(times),
                        "max_time_ms": max(times),
                        "result_count": len(results) if 'results' in locals() else 0
                    }
            
            # Database size and structure analysis
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            table_info = {}
            for table in tables:
                table_name = table[0]
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                table_info[table_name] = {"row_count": count}
            
            db_metrics["database_info"] = {
                "table_count": len(tables),
                "tables": table_info,
                "file_size_mb": psutil.disk_usage('.').used / 1024 / 1024  # Approximate
            }
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Database analysis failed: {e}")
            db_metrics["error"] = str(e)
        
        self.results["database_performance"] = db_metrics
        logger.info("✅ Database performance analysis completed")
    
    async def _run_barbershop_load_tests(self):
        """Test system under typical barbershop operational loads"""
        load_scenarios = [
            {
                "name": "light_load",
                "description": "10 bookings over 5 minutes (typical quiet day)",
                "concurrent_users": 2,
                "total_requests": 10,
                "duration_seconds": 300
            },
            {
                "name": "moderate_load", 
                "description": "30 bookings over 10 minutes (typical busy day)",
                "concurrent_users": 5,
                "total_requests": 30,
                "duration_seconds": 600
            },
            {
                "name": "peak_load",
                "description": "50 bookings over 30 minutes (peak hours)",
                "concurrent_users": 8,
                "total_requests": 50,
                "duration_seconds": 1800
            }
        ]
        
        load_results = {}
        
        for scenario in load_scenarios:
            logger.info(f"Running load test: {scenario['name']}")
            
            start_time = time.time()
            response_times = []
            errors = 0
            
            # Create a semaphore to limit concurrent requests
            semaphore = asyncio.Semaphore(scenario['concurrent_users'])
            
            async def make_request(session, endpoint="/health"):
                async with semaphore:
                    request_start = time.time()
                    try:
                        async with session.get(f"{self.base_url}{endpoint}", timeout=30) as response:
                            await response.text()
                            request_time = (time.time() - request_start) * 1000
                            response_times.append(request_time)
                            
                            if response.status >= 400:
                                return False
                            return True
                    except Exception as e:
                        logger.warning(f"Request failed: {e}")
                        return False
            
            # Run load test
            async with aiohttp.ClientSession() as session:
                tasks = []
                for i in range(scenario['total_requests']):
                    # Vary endpoints to simulate real usage
                    endpoints = ["/health", "/api/v2/appointments/", "/api/v2/barbers/", "/api/v2/services/"]
                    endpoint = endpoints[i % len(endpoints)]
                    task = make_request(session, endpoint)
                    tasks.append(task)
                    
                    # Add small delay to spread requests over time
                    if i > 0:
                        await asyncio.sleep(scenario['duration_seconds'] / scenario['total_requests'])
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                errors = sum(1 for r in results if r is False or isinstance(r, Exception))
            
            total_time = time.time() - start_time
            
            if response_times:
                load_results[scenario['name']] = {
                    "scenario": scenario,
                    "total_time_seconds": total_time,
                    "avg_response_time_ms": statistics.mean(response_times),
                    "p95_response_time_ms": sorted(response_times)[int(0.95 * len(response_times))],
                    "max_response_time_ms": max(response_times),
                    "success_rate": (len(response_times) - errors) / len(response_times),
                    "requests_per_second": len(response_times) / total_time,
                    "errors": errors
                }
        
        self.results["load_test_results"] = load_results
        logger.info("✅ Load testing completed")
    
    async def _test_concurrent_users(self):
        """Test system behavior with multiple concurrent users"""
        concurrent_scenarios = [5, 10, 15, 20]  # Number of concurrent users
        
        concurrent_results = {}
        
        for user_count in concurrent_scenarios:
            logger.info(f"Testing {user_count} concurrent users")
            
            async def simulate_user_session(session, user_id):
                """Simulate a typical user session"""
                actions = [
                    "/health",
                    "/api/v2/barbers/",
                    "/api/v2/services/",
                    "/api/v2/appointments/"
                ]
                
                session_times = []
                session_errors = 0
                
                for action in actions:
                    start_time = time.time()
                    try:
                        async with session.get(f"{self.base_url}{action}", timeout=30) as response:
                            await response.text()
                            action_time = (time.time() - start_time) * 1000
                            session_times.append(action_time)
                            
                            if response.status >= 400:
                                session_errors += 1
                                
                    except Exception as e:
                        session_errors += 1
                        logger.debug(f"User {user_id} action {action} failed: {e}")
                    
                    await asyncio.sleep(0.5)  # Small delay between actions
                
                return {
                    "user_id": user_id,
                    "session_times": session_times,
                    "session_errors": session_errors,
                    "total_session_time": sum(session_times)
                }
            
            # Run concurrent user sessions
            start_time = time.time()
            async with aiohttp.ClientSession() as session:
                tasks = [simulate_user_session(session, i) for i in range(user_count)]
                user_results = await asyncio.gather(*tasks)
            
            total_test_time = time.time() - start_time
            
            # Aggregate results
            all_response_times = []
            total_errors = 0
            
            for user_result in user_results:
                all_response_times.extend(user_result["session_times"])
                total_errors += user_result["session_errors"]
            
            if all_response_times:
                concurrent_results[f"{user_count}_users"] = {
                    "concurrent_users": user_count,
                    "total_test_time_seconds": total_test_time,
                    "avg_response_time_ms": statistics.mean(all_response_times),
                    "p95_response_time_ms": sorted(all_response_times)[int(0.95 * len(all_response_times))],
                    "max_response_time_ms": max(all_response_times),
                    "total_requests": len(all_response_times),
                    "total_errors": total_errors,
                    "error_rate": total_errors / len(all_response_times) if all_response_times else 0,
                    "throughput_rps": len(all_response_times) / total_test_time
                }
        
        self.results["concurrent_user_results"] = concurrent_results
        logger.info("✅ Concurrent user testing completed")
    
    async def _analyze_resource_utilization(self):
        """Monitor CPU, memory, and system resource usage during operations"""
        
        # Get current process (assuming the backend is running)
        current_process = psutil.Process()
        
        # Monitor system resources over a period
        resource_samples = []
        monitoring_duration = 30  # seconds
        sample_interval = 1  # second
        
        logger.info(f"Monitoring system resources for {monitoring_duration} seconds...")
        
        for i in range(monitoring_duration):
            try:
                # System-wide metrics
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('.')
                
                # Network I/O
                network = psutil.net_io_counters()
                
                sample = {
                    "timestamp": time.time(),
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "memory_available_mb": memory.available / 1024 / 1024,
                    "memory_used_mb": memory.used / 1024 / 1024,
                    "disk_usage_percent": (disk.used / disk.total) * 100,
                    "disk_free_gb": disk.free / 1024 / 1024 / 1024,
                    "network_bytes_sent": network.bytes_sent,
                    "network_bytes_recv": network.bytes_recv
                }
                
                # Try to get process-specific metrics (if backend is running as child process)
                try:
                    process_cpu = current_process.cpu_percent()
                    process_memory = current_process.memory_info()
                    sample.update({
                        "process_cpu_percent": process_cpu,
                        "process_memory_mb": process_memory.rss / 1024 / 1024,
                        "process_memory_vms_mb": process_memory.vms / 1024 / 1024
                    })
                except:
                    # Process might not be accessible
                    pass
                
                resource_samples.append(sample)
                
            except Exception as e:
                logger.warning(f"Error collecting resource sample: {e}")
            
            await asyncio.sleep(sample_interval)
        
        # Calculate resource utilization statistics
        if resource_samples:
            cpu_values = [s["cpu_percent"] for s in resource_samples]
            memory_values = [s["memory_percent"] for s in resource_samples]
            
            resource_stats = {
                "monitoring_duration_seconds": monitoring_duration,
                "sample_count": len(resource_samples),
                "cpu_utilization": {
                    "avg_percent": statistics.mean(cpu_values),
                    "max_percent": max(cpu_values),
                    "min_percent": min(cpu_values)
                },
                "memory_utilization": {
                    "avg_percent": statistics.mean(memory_values),
                    "max_percent": max(memory_values),
                    "min_percent": min(memory_values),
                    "avg_used_mb": statistics.mean([s["memory_used_mb"] for s in resource_samples])
                },
                "disk_utilization": {
                    "usage_percent": resource_samples[-1]["disk_usage_percent"],
                    "free_gb": resource_samples[-1]["disk_free_gb"]
                }
            }
            
            # Add process-specific stats if available
            process_cpu_values = [s.get("process_cpu_percent", 0) for s in resource_samples if "process_cpu_percent" in s]
            if process_cpu_values:
                resource_stats["process_utilization"] = {
                    "avg_cpu_percent": statistics.mean(process_cpu_values),
                    "max_cpu_percent": max(process_cpu_values),
                    "avg_memory_mb": statistics.mean([s.get("process_memory_mb", 0) for s in resource_samples if "process_memory_mb" in s])
                }
        
        self.results["resource_utilization"] = resource_stats
        logger.info("✅ Resource utilization analysis completed")
    
    async def _identify_bottlenecks(self):
        """Identify performance bottlenecks and stress test system limits"""
        bottlenecks = []
        
        # Analyze baseline metrics for slow endpoints
        baseline = self.results.get("baseline_metrics", {})
        for endpoint, metrics in baseline.items():
            avg_time = metrics.get("avg_response_time_ms", 0)
            p95_time = metrics.get("p95_response_time_ms", 0)
            error_rate = metrics.get("error_rate", 0)
            
            if avg_time > 1000:  # Slower than 1 second
                bottlenecks.append({
                    "type": "slow_endpoint",
                    "endpoint": endpoint,
                    "avg_response_time_ms": avg_time,
                    "severity": "high" if avg_time > 2000 else "medium"
                })
            
            if p95_time > 2000:  # 95th percentile slower than 2 seconds
                bottlenecks.append({
                    "type": "p95_performance",
                    "endpoint": endpoint,
                    "p95_response_time_ms": p95_time,
                    "severity": "high"
                })
            
            if error_rate > 0.1:  # More than 10% error rate
                bottlenecks.append({
                    "type": "high_error_rate",
                    "endpoint": endpoint,
                    "error_rate": error_rate,
                    "severity": "critical"
                })
        
        # Analyze load test results for degradation
        load_results = self.results.get("load_test_results", {})
        for scenario_name, results in load_results.items():
            if results.get("success_rate", 1) < 0.95:  # Less than 95% success rate
                bottlenecks.append({
                    "type": "load_test_failures",
                    "scenario": scenario_name,
                    "success_rate": results["success_rate"],
                    "severity": "high"
                })
            
            if results.get("p95_response_time_ms", 0) > 3000:  # P95 slower than 3 seconds under load
                bottlenecks.append({
                    "type": "load_performance_degradation",
                    "scenario": scenario_name,
                    "p95_response_time_ms": results["p95_response_time_ms"],
                    "severity": "medium"
                })
        
        # Analyze resource utilization for constraints
        resource_stats = self.results.get("resource_utilization", {})
        cpu_max = resource_stats.get("cpu_utilization", {}).get("max_percent", 0)
        memory_max = resource_stats.get("memory_utilization", {}).get("max_percent", 0)
        
        if cpu_max > 80:
            bottlenecks.append({
                "type": "high_cpu_usage",
                "max_cpu_percent": cpu_max,
                "severity": "high" if cpu_max > 90 else "medium"
            })
        
        if memory_max > 80:
            bottlenecks.append({
                "type": "high_memory_usage",
                "max_memory_percent": memory_max,
                "severity": "high" if memory_max > 90 else "medium"
            })
        
        self.results["bottlenecks"] = bottlenecks
        logger.info(f"✅ Identified {len(bottlenecks)} potential bottlenecks")
    
    async def _test_barbershop_scenarios(self):
        """Test real-world barbershop scenarios"""
        scenarios = {
            "morning_rush": {
                "description": "Morning rush hour - multiple bookings in short time",
                "concurrent_requests": 10,
                "endpoints": ["/api/v2/appointments/", "/api/v2/barbers/", "/api/v2/services/"]
            },
            "schedule_changes": {
                "description": "Multiple schedule changes and cancellations",
                "concurrent_requests": 5,
                "endpoints": ["/api/v2/appointments/"]
            },
            "payment_processing": {
                "description": "Payment processing load",
                "concurrent_requests": 3,
                "endpoints": ["/api/v2/payments/"]
            }
        }
        
        scenario_results = {}
        
        for scenario_name, config in scenarios.items():
            logger.info(f"Testing scenario: {scenario_name}")
            
            response_times = []
            errors = 0
            
            async with aiohttp.ClientSession() as session:
                tasks = []
                
                for i in range(config["concurrent_requests"]):
                    endpoint = config["endpoints"][i % len(config["endpoints"])]
                    task = self._make_timed_request(session, f"{self.base_url}{endpoint}")
                    tasks.append(task)
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        errors += 1
                    elif isinstance(result, tuple) and len(result) == 2:
                        success, response_time = result
                        if success:
                            response_times.append(response_time)
                        else:
                            errors += 1
            
            if response_times:
                scenario_results[scenario_name] = {
                    "description": config["description"],
                    "avg_response_time_ms": statistics.mean(response_times),
                    "max_response_time_ms": max(response_times),
                    "success_rate": len(response_times) / (len(response_times) + errors),
                    "total_requests": len(response_times) + errors,
                    "errors": errors
                }
        
        self.results["barbershop_scenarios"] = scenario_results
        logger.info("✅ Real-world scenario testing completed")
    
    async def _make_timed_request(self, session, url):
        """Make a timed HTTP request"""
        start_time = time.time()
        try:
            async with session.get(url, timeout=30) as response:
                await response.text()
                response_time = (time.time() - start_time) * 1000
                return (response.status < 400, response_time)
        except Exception as e:
            return (False, (time.time() - start_time) * 1000)
    
    def _generate_performance_report(self):
        """Generate comprehensive performance assessment report and recommendations"""
        
        # Performance assessment summary
        baseline = self.results.get("baseline_metrics", {})
        load_results = self.results.get("load_test_results", {})
        concurrent_results = self.results.get("concurrent_user_results", {})
        bottlenecks = self.results.get("bottlenecks", [])
        
        # Generate recommendations based on findings
        recommendations = []
        
        # Analyze baseline performance
        slow_endpoints = [ep for ep, metrics in baseline.items() 
                         if metrics.get("avg_response_time_ms", 0) > 500]
        
        if slow_endpoints:
            recommendations.append({
                "category": "API Performance",
                "priority": "high",
                "issue": f"{len(slow_endpoints)} endpoints have slow response times",
                "endpoints": slow_endpoints,
                "recommendation": "Consider adding caching, query optimization, or connection pooling"
            })
        
        # Analyze load test results
        failed_load_tests = [name for name, results in load_results.items() 
                            if results.get("success_rate", 1) < 0.95]
        
        if failed_load_tests:
            recommendations.append({
                "category": "Load Handling",
                "priority": "critical",
                "issue": f"Load tests failed: {failed_load_tests}",
                "recommendation": "System cannot handle expected barbershop load. Consider scaling or optimization."
            })
        
        # Analyze concurrent user performance
        concurrent_degradation = []
        prev_rps = None
        for users, results in sorted(concurrent_results.items(), key=lambda x: int(x[0].split('_')[0])):
            current_rps = results.get("throughput_rps", 0)
            if prev_rps and current_rps < prev_rps * 0.8:  # More than 20% degradation
                concurrent_degradation.append(users)
            prev_rps = current_rps
        
        if concurrent_degradation:
            recommendations.append({
                "category": "Concurrency",
                "priority": "medium",
                "issue": f"Performance degrades significantly with concurrent users: {concurrent_degradation}",
                "recommendation": "Implement connection pooling, async processing, or horizontal scaling"
            })
        
        # Database recommendations
        db_performance = self.results.get("database_performance", {})
        slow_queries = {name: metrics for name, metrics in db_performance.items() 
                       if isinstance(metrics, dict) and metrics.get("avg_time_ms", 0) > 100}
        
        if slow_queries:
            recommendations.append({
                "category": "Database",
                "priority": "medium",
                "issue": f"Slow database queries detected: {list(slow_queries.keys())}",
                "recommendation": "Add database indexes, optimize queries, or consider migrating to PostgreSQL"
            })
        
        # Resource utilization recommendations
        resource_stats = self.results.get("resource_utilization", {})
        high_cpu = resource_stats.get("cpu_utilization", {}).get("max_percent", 0) > 70
        high_memory = resource_stats.get("resource_utilization", {}).get("max_percent", 0) > 70
        
        if high_cpu or high_memory:
            recommendations.append({
                "category": "Resource Utilization",
                "priority": "medium",
                "issue": "High CPU or memory usage detected",
                "recommendation": "Monitor resource usage in production, consider upgrading server specifications"
            })
        
        # Overall readiness assessment
        critical_issues = len([r for r in recommendations if r.get("priority") == "critical"])
        high_issues = len([r for r in recommendations if r.get("priority") == "high"])
        
        if critical_issues > 0:
            readiness_status = "NOT READY"
            readiness_color = "🔴"
        elif high_issues > 2:
            readiness_status = "NEEDS OPTIMIZATION"
            readiness_color = "🟡"
        else:
            readiness_status = "PRODUCTION READY"
            readiness_color = "🟢"
        
        self.results["assessment_summary"] = {
            "readiness_status": readiness_status,
            "readiness_color": readiness_color,
            "critical_issues": critical_issues,
            "high_priority_issues": high_issues,
            "total_recommendations": len(recommendations),
            "test_completion_time": datetime.now().isoformat()
        }
        
        self.results["recommendations"] = recommendations
        
        logger.info(f"{readiness_color} System readiness: {readiness_status}")
        logger.info(f"📊 Generated {len(recommendations)} performance recommendations")

async def main():
    """Main function to run performance assessment"""
    
    # Create performance assessment instance
    assessment = PerformanceAssessment()
    
    # Run comprehensive assessment
    results = await assessment.run_comprehensive_assessment()
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"performance_assessment_report_{timestamp}.json"
    
    with open(report_filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Print summary
    summary = results.get("assessment_summary", {})
    print(f"\n{'='*60}")
    print(f"📊 BOOKEDBARBER V2 PERFORMANCE ASSESSMENT COMPLETE")
    print(f"{'='*60}")
    print(f"{summary.get('readiness_color', '⚪')} Status: {summary.get('readiness_status', 'UNKNOWN')}")
    print(f"🔍 Critical Issues: {summary.get('critical_issues', 0)}")
    print(f"⚠️  High Priority Issues: {summary.get('high_priority_issues', 0)}")
    print(f"💡 Total Recommendations: {summary.get('total_recommendations', 0)}")
    print(f"📋 Full Report: {report_filename}")
    print(f"{'='*60}\n")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())