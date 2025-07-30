#!/usr/bin/env python3
"""
6FB Booking Platform - API Performance Profiler
============================================

Comprehensive API endpoint performance monitoring and profiling tool.
Measures response times, throughput, error rates, and identifies bottlenecks.

Author: Claude Code Performance Engineer
Date: 2025-07-30
"""

import asyncio
import aiohttp
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import statistics
import psutil
import os
import sys
from urllib.parse import urljoin
import concurrent.futures
from collections import defaultdict

@dataclass
class APIMetrics:
    """Container for API endpoint performance metrics"""
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    payload_size_bytes: int
    response_size_bytes: int
    cpu_usage_percent: Optional[float]
    memory_usage_mb: Optional[float]
    timestamp: datetime
    error_message: Optional[str] = None
    user_type: Optional[str] = None
    concurrent_requests: int = 1

@dataclass
class EndpointStats:
    """Container for endpoint statistics"""
    endpoint: str
    method: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    median_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    error_rate_percent: float
    throughput_rps: float
    avg_payload_size_bytes: float
    avg_response_size_bytes: float

@dataclass
class LoadTestResults:
    """Container for load test results"""
    test_name: str
    duration_seconds: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    requests_per_second: float
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    error_rate_percent: float
    peak_cpu_usage_percent: float
    peak_memory_usage_mb: float
    bottleneck_endpoints: List[str]

class APIPerformanceProfiler:
    """Comprehensive API performance profiler and load tester"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.metrics: List[APIMetrics] = []
        self.logger = self._setup_logging()
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Critical endpoints for 6FB Booking platform
        self.critical_endpoints = {
            "authentication": [
                {"method": "POST", "path": "/auth/login", "payload": {"email": "test@example.com", "password": "testpass"}},
                {"method": "POST", "path": "/auth/register", "payload": {"email": "newuser@example.com", "password": "newpass", "name": "Test User"}},
                {"method": "GET", "path": "/auth/me", "headers": {"Authorization": "Bearer test_token"}},
                {"method": "POST", "path": "/auth/refresh", "payload": {"refresh_token": "test_refresh_token"}},
            ],
            "appointments": [
                {"method": "GET", "path": "/appointments", "headers": {"Authorization": "Bearer test_token"}},
                {"method": "POST", "path": "/appointments", "payload": {"barber_id": 1, "service_id": 1, "start_time": "2025-08-01T10:00:00"}},
                {"method": "GET", "path": "/appointments/1", "headers": {"Authorization": "Bearer test_token"}},
                {"method": "PUT", "path": "/appointments/1", "payload": {"status": "confirmed"}},
                {"method": "DELETE", "path": "/appointments/1", "headers": {"Authorization": "Bearer test_token"}},
            ],
            "barber_availability": [
                {"method": "GET", "path": "/barber-availability/1", "params": {"date": "2025-08-01"}},
                {"method": "POST", "path": "/barber-availability", "payload": {"barber_id": 1, "date": "2025-08-01", "start_time": "09:00", "end_time": "17:00"}},
                {"method": "GET", "path": "/barbers/1/availability", "params": {"start_date": "2025-08-01", "end_date": "2025-08-07"}},
            ],
            "payments": [
                {"method": "POST", "path": "/payments/create-intent", "payload": {"amount": 5000, "currency": "usd", "appointment_id": 1}},
                {"method": "POST", "path": "/payments/confirm", "payload": {"payment_intent_id": "pi_test_123", "appointment_id": 1}},
                {"method": "GET", "path": "/payments/appointment/1", "headers": {"Authorization": "Bearer test_token"}},
            ],
            "dashboard": [
                {"method": "GET", "path": "/dashboard/stats", "headers": {"Authorization": "Bearer test_token"}},
                {"method": "GET", "path": "/dashboard/appointments", "params": {"start_date": "2025-08-01", "end_date": "2025-08-31"}},
                {"method": "GET", "path": "/dashboard/revenue", "params": {"period": "month"}},
            ],
            "clients": [
                {"method": "GET", "path": "/clients", "headers": {"Authorization": "Bearer test_token"}},
                {"method": "POST", "path": "/clients", "payload": {"name": "John Doe", "email": "john@example.com", "phone": "+1234567890"}},
                {"method": "GET", "path": "/clients/1", "headers": {"Authorization": "Bearer test_token"}},
            ],
            "services": [
                {"method": "GET", "path": "/services", "params": {"barber_id": 1}},
                {"method": "POST", "path": "/services", "payload": {"name": "Haircut", "duration": 30, "price": 25.00}},
                {"method": "GET", "path": "/services/1", "headers": {"Authorization": "Bearer test_token"}},
            ]
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for API performance monitoring"""
        logger = logging.getLogger('api_performance')
        logger.setLevel(logging.INFO)
        
        # Create handler for performance logs
        os.makedirs('/Users/bossio/6fb-booking/backend-v2/logs', exist_ok=True)
        handler = logging.FileHandler('/Users/bossio/6fb-booking/backend-v2/logs/api_performance.log')
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def profile_endpoint(self, 
                              method: str, 
                              path: str, 
                              payload: Optional[Dict] = None,
                              headers: Optional[Dict] = None,
                              params: Optional[Dict] = None,
                              user_type: str = "anonymous") -> APIMetrics:
        """Profile a single API endpoint"""
        url = urljoin(self.base_url, path)
        
        # Capture system metrics before request
        process = psutil.Process()
        cpu_before = process.cpu_percent()
        memory_before = process.memory_info().rss / 1024 / 1024
        
        start_time = time.perf_counter()
        
        try:
            # Make HTTP request
            async with self.session.request(
                method=method.upper(),
                url=url,
                json=payload,
                headers=headers,
                params=params,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                response_data = await response.read()
                end_time = time.perf_counter()
                
                # Capture system metrics after request
                cpu_after = process.cpu_percent()
                memory_after = process.memory_info().rss / 1024 / 1024
                
                metrics = APIMetrics(
                    endpoint=path,
                    method=method.upper(),
                    response_time_ms=(end_time - start_time) * 1000,
                    status_code=response.status,
                    payload_size_bytes=len(json.dumps(payload)) if payload else 0,
                    response_size_bytes=len(response_data),
                    cpu_usage_percent=max(cpu_after, cpu_before),
                    memory_usage_mb=memory_after,
                    timestamp=datetime.now(),
                    user_type=user_type
                )
                
                if response.status >= 400:
                    metrics.error_message = f"HTTP {response.status}: {await response.text()}"
                    self.logger.warning(f"Request failed: {method} {path} - {response.status}")
                
                self.metrics.append(metrics)
                return metrics
                
        except Exception as e:
            end_time = time.perf_counter()
            
            metrics = APIMetrics(
                endpoint=path,
                method=method.upper(),
                response_time_ms=(end_time - start_time) * 1000,
                status_code=0,
                payload_size_bytes=len(json.dumps(payload)) if payload else 0,
                response_size_bytes=0,
                cpu_usage_percent=None,
                memory_usage_mb=None,
                timestamp=datetime.now(),
                error_message=str(e),
                user_type=user_type
            )
            
            self.metrics.append(metrics)
            self.logger.error(f"Request error: {method} {path} - {str(e)}")
            return metrics
    
    async def profile_critical_endpoints(self) -> Dict[str, List[APIMetrics]]:
        """Profile all critical endpoints"""
        self.logger.info("Starting critical endpoints profiling...")
        
        results = {}
        
        for category, endpoints in self.critical_endpoints.items():
            self.logger.info(f"Profiling {category} endpoints...")
            results[category] = []
            
            for endpoint_config in endpoints:
                try:
                    metrics = await self.profile_endpoint(
                        method=endpoint_config["method"],
                        path=endpoint_config["path"],
                        payload=endpoint_config.get("payload"),
                        headers=endpoint_config.get("headers"),
                        params=endpoint_config.get("params"),
                        user_type=category
                    )
                    results[category].append(metrics)
                    
                    # Small delay between requests
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    self.logger.error(f"Failed to profile {endpoint_config}: {str(e)}")
        
        return results
    
    async def run_load_test(self, 
                           concurrent_users: int = 10,
                           duration_seconds: int = 60,
                           target_endpoints: Optional[List[str]] = None) -> LoadTestResults:
        """Run load test with concurrent users"""
        self.logger.info(f"Starting load test: {concurrent_users} users for {duration_seconds}s")
        
        # Select endpoints to test
        if target_endpoints:
            test_endpoints = []
            for category, endpoints in self.critical_endpoints.items():
                for endpoint in endpoints:
                    if endpoint["path"] in target_endpoints:
                        test_endpoints.append(endpoint)
        else:
            # Use most critical endpoints
            test_endpoints = []
            for category in ["authentication", "appointments", "barber_availability"]:
                test_endpoints.extend(self.critical_endpoints.get(category, [])[:2])
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        # Track system metrics
        process = psutil.Process()
        peak_cpu = 0.0
        peak_memory = 0.0
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(concurrent_users)
        
        async def make_request(endpoint_config):
            async with semaphore:
                # Monitor system resources
                nonlocal peak_cpu, peak_memory
                cpu_usage = process.cpu_percent()
                memory_usage = process.memory_info().rss / 1024 / 1024
                
                peak_cpu = max(peak_cpu, cpu_usage)
                peak_memory = max(peak_memory, memory_usage)
                
                return await self.profile_endpoint(
                    method=endpoint_config["method"],
                    path=endpoint_config["path"],
                    payload=endpoint_config.get("payload"),
                    headers=endpoint_config.get("headers"),
                    params=endpoint_config.get("params"),
                    user_type="load_test"
                )
        
        # Run load test
        tasks = []
        request_count = 0
        
        while time.time() < end_time:
            for endpoint_config in test_endpoints:
                if time.time() >= end_time:
                    break
                
                task = asyncio.create_task(make_request(endpoint_config))
                tasks.append(task)
                request_count += 1
                
                # Control request rate
                await asyncio.sleep(0.01)
        
        # Wait for all requests to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Analyze results
        load_test_metrics = [m for m in self.metrics if m.user_type == "load_test"]
        successful_requests = len([m for m in load_test_metrics if m.status_code < 400 and m.status_code > 0])
        failed_requests = len(load_test_metrics) - successful_requests
        
        response_times = [m.response_time_ms for m in load_test_metrics if m.status_code > 0]
        
        # Identify bottleneck endpoints
        endpoint_performance = defaultdict(list)
        for metric in load_test_metrics:
            endpoint_performance[metric.endpoint].append(metric.response_time_ms)
        
        bottleneck_endpoints = []
        for endpoint, times in endpoint_performance.items():
            if times:
                avg_time = statistics.mean(times)
                if avg_time > 500:  # 500ms threshold
                    bottleneck_endpoints.append(f"{endpoint} ({avg_time:.2f}ms avg)")
        
        results = LoadTestResults(
            test_name=f"Load Test - {concurrent_users} users",
            duration_seconds=duration_seconds,
            total_requests=len(load_test_metrics),
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            requests_per_second=len(load_test_metrics) / duration_seconds,
            avg_response_time_ms=statistics.mean(response_times) if response_times else 0,
            p95_response_time_ms=self._calculate_percentile(response_times, 95) if response_times else 0,
            p99_response_time_ms=self._calculate_percentile(response_times, 99) if response_times else 0,
            error_rate_percent=(failed_requests / len(load_test_metrics) * 100) if load_test_metrics else 0,
            peak_cpu_usage_percent=peak_cpu,
            peak_memory_usage_mb=peak_memory,
            bottleneck_endpoints=bottleneck_endpoints
        )
        
        self.logger.info(f"Load test completed: {results.requests_per_second:.2f} RPS, {results.error_rate_percent:.2f}% errors")
        
        return results
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = (percentile / 100) * (len(sorted_values) - 1)
        
        if index.is_integer():
            return sorted_values[int(index)]
        else:
            lower = sorted_values[int(index)]
            upper = sorted_values[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def analyze_endpoint_stats(self) -> Dict[str, EndpointStats]:
        """Analyze statistics for each endpoint"""
        endpoint_metrics = defaultdict(list)
        
        # Group metrics by endpoint and method
        for metric in self.metrics:
            key = f"{metric.method} {metric.endpoint}"
            endpoint_metrics[key].append(metric)
        
        stats = {}
        
        for endpoint_key, metrics_list in endpoint_metrics.items():
            method, endpoint = endpoint_key.split(" ", 1)
            
            successful_metrics = [m for m in metrics_list if m.status_code < 400 and m.status_code > 0]
            failed_metrics = [m for m in metrics_list if m.status_code >= 400 or m.status_code == 0]
            
            response_times = [m.response_time_ms for m in successful_metrics]
            payload_sizes = [m.payload_size_bytes for m in metrics_list]
            response_sizes = [m.response_size_bytes for m in successful_metrics]
            
            if response_times:
                stats[endpoint_key] = EndpointStats(
                    endpoint=endpoint,
                    method=method,
                    total_requests=len(metrics_list),
                    successful_requests=len(successful_metrics),
                    failed_requests=len(failed_metrics),
                    avg_response_time_ms=statistics.mean(response_times),
                    median_response_time_ms=statistics.median(response_times),
                    p95_response_time_ms=self._calculate_percentile(response_times, 95),
                    p99_response_time_ms=self._calculate_percentile(response_times, 99),
                    min_response_time_ms=min(response_times),
                    max_response_time_ms=max(response_times),
                    error_rate_percent=(len(failed_metrics) / len(metrics_list) * 100),
                    throughput_rps=len(successful_metrics) / 60,  # Approximate
                    avg_payload_size_bytes=statistics.mean(payload_sizes) if payload_sizes else 0,
                    avg_response_size_bytes=statistics.mean(response_sizes) if response_sizes else 0
                )
        
        return stats
    
    def identify_performance_issues(self) -> Dict[str, List[str]]:
        """Identify performance issues and bottlenecks"""
        issues = {
            "slow_endpoints": [],
            "high_error_rates": [],
            "resource_intensive": [],
            "scalability_concerns": []
        }
        
        endpoint_stats = self.analyze_endpoint_stats()
        
        for endpoint_key, stats in endpoint_stats.items():
            # Slow endpoints (>500ms average)
            if stats.avg_response_time_ms > 500:
                issues["slow_endpoints"].append(
                    f"{endpoint_key}: {stats.avg_response_time_ms:.2f}ms average"
                )
            
            # High error rates (>5%)
            if stats.error_rate_percent > 5:
                issues["high_error_rates"].append(
                    f"{endpoint_key}: {stats.error_rate_percent:.2f}% error rate"
                )
            
            # High P95 response times (>1000ms)
            if stats.p95_response_time_ms > 1000:
                issues["scalability_concerns"].append(
                    f"{endpoint_key}: P95 {stats.p95_response_time_ms:.2f}ms"
                )
        
        # Analyze resource usage
        cpu_intensive = [m for m in self.metrics if m.cpu_usage_percent and m.cpu_usage_percent > 80]
        if cpu_intensive:
            unique_endpoints = set(f"{m.method} {m.endpoint}" for m in cpu_intensive)
            issues["resource_intensive"].extend(
                f"{endpoint}: High CPU usage" for endpoint in unique_endpoints
            )
        
        return issues
    
    async def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive API performance report"""
        self.logger.info("Generating comprehensive API performance report...")
        
        # Profile critical endpoints
        endpoint_results = await self.profile_critical_endpoints()
        
        # Run light load test
        load_test_results = await self.run_load_test(concurrent_users=5, duration_seconds=30)
        
        # Analyze statistics
        endpoint_stats = self.analyze_endpoint_stats()
        performance_issues = self.identify_performance_issues()
        
        # Calculate overall scores
        avg_response_times = [stats.avg_response_time_ms for stats in endpoint_stats.values()]
        overall_avg_response = statistics.mean(avg_response_times) if avg_response_times else 0
        
        error_rates = [stats.error_rate_percent for stats in endpoint_stats.values()]
        overall_error_rate = statistics.mean(error_rates) if error_rates else 0
        
        # Generate report
        report = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "test_duration_minutes": 10,  # Estimated
                "total_requests": len(self.metrics),
                "platform": "6FB Booking V2 API"
            },
            "executive_summary": {
                "overall_performance_grade": self._calculate_api_performance_grade(overall_avg_response, overall_error_rate),
                "average_response_time_ms": overall_avg_response,
                "overall_error_rate_percent": overall_error_rate,
                "throughput_requests_per_second": load_test_results.requests_per_second,
                "critical_issues_count": sum(len(issues) for issues in performance_issues.values()),
                "production_readiness_score": self._calculate_api_readiness_score(load_test_results, performance_issues)
            },
            "load_test_results": asdict(load_test_results),
            "endpoint_performance": {
                endpoint: asdict(stats) for endpoint, stats in endpoint_stats.items()
            },
            "performance_issues": performance_issues,
            "resource_utilization": {
                "peak_cpu_percent": load_test_results.peak_cpu_usage_percent,
                "peak_memory_mb": load_test_results.peak_memory_usage_mb,
                "concurrent_request_capacity": load_test_results.requests_per_second * 5  # Estimate
            },
            "recommendations": self._generate_api_recommendations(performance_issues, load_test_results),
            "endpoint_categories": {
                category: [asdict(metric) for metric in metrics]
                for category, metrics in endpoint_results.items()
            }
        }
        
        # Save report
        report_path = f"/Users/bossio/6fb-booking/backend-v2/logs/api_performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        self.logger.info(f"API performance report saved to: {report_path}")
        
        return report
    
    def _calculate_api_performance_grade(self, avg_response_ms: float, error_rate_percent: float) -> str:
        """Calculate API performance grade"""
        score = 100
        
        # Response time penalties
        if avg_response_ms > 1000:
            score -= 30
        elif avg_response_ms > 500:
            score -= 20
        elif avg_response_ms > 200:
            score -= 10
        
        # Error rate penalties
        if error_rate_percent > 10:
            score -= 40
        elif error_rate_percent > 5:
            score -= 25
        elif error_rate_percent > 1:
            score -= 10
        
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _calculate_api_readiness_score(self, load_test: LoadTestResults, issues: Dict[str, List[str]]) -> float:
        """Calculate API production readiness score"""
        score = 100.0
        
        # Load test performance
        if load_test.error_rate_percent > 5:
            score -= 25
        elif load_test.error_rate_percent > 1:
            score -= 10
        
        if load_test.avg_response_time_ms > 500:
            score -= 20
        elif load_test.avg_response_time_ms > 200:
            score -= 10
        
        if load_test.requests_per_second < 10:
            score -= 15
        
        # Performance issues
        total_issues = sum(len(issue_list) for issue_list in issues.values())
        score -= min(total_issues * 5, 30)
        
        return max(score, 0.0)
    
    def _generate_api_recommendations(self, issues: Dict[str, List[str]], load_test: LoadTestResults) -> List[str]:
        """Generate API performance recommendations"""
        recommendations = []
        
        if load_test.avg_response_time_ms > 200:
            recommendations.append("High Priority: Optimize slow API endpoints - implement caching and database optimization")
        
        if load_test.error_rate_percent > 1:
            recommendations.append("Critical: High error rate detected - review error handling and fix failing endpoints")
        
        if issues["slow_endpoints"]:
            recommendations.append("Medium Priority: Optimize identified slow endpoints with response times >500ms")
        
        if load_test.requests_per_second < 50:
            recommendations.append("Medium Priority: Low throughput - consider connection pooling and async processing")
        
        if load_test.peak_cpu_usage_percent > 80:
            recommendations.append("High Priority: High CPU usage detected - optimize computational complexity")
        
        # Standard recommendations
        recommendations.extend([
            "Implement API response caching with Redis",
            "Add comprehensive API monitoring and alerting",
            "Set up rate limiting to prevent abuse",
            "Implement request/response compression",
            "Consider API versioning for backward compatibility"
        ])
        
        return recommendations

async def main():
    """Main function to run API performance analysis"""
    print("🚀 Starting 6FB Booking API Performance Analysis...")
    print("=" * 60)
    
    async with APIPerformanceProfiler() as profiler:
        try:
            # Generate comprehensive performance report
            report = await profiler.generate_performance_report()
            
            # Display executive summary
            print("\n📊 EXECUTIVE SUMMARY")
            print("-" * 30)
            print(f"Performance Grade: {report['executive_summary']['overall_performance_grade']}")
            print(f"Production Readiness: {report['executive_summary']['production_readiness_score']:.1f}/100")
            print(f"Average Response Time: {report['executive_summary']['average_response_time_ms']:.2f}ms")
            print(f"Error Rate: {report['executive_summary']['overall_error_rate_percent']:.2f}%")
            print(f"Throughput: {report['executive_summary']['throughput_requests_per_second']:.2f} RPS")
            
            # Display load test results
            load_test = report['load_test_results']
            print(f"\n⚡ LOAD TEST RESULTS")
            print("-" * 25)
            print(f"Total Requests: {load_test['total_requests']}")
            print(f"Success Rate: {((load_test['successful_requests']/load_test['total_requests'])*100):.1f}%")
            print(f"95th Percentile: {load_test['p95_response_time_ms']:.2f}ms")
            print(f"Peak CPU: {load_test['peak_cpu_usage_percent']:.1f}%")
            print(f"Peak Memory: {load_test['peak_memory_usage_mb']:.1f}MB")
            
            # Display top recommendations
            print(f"\n🎯 TOP RECOMMENDATIONS")
            print("-" * 25)
            for i, rec in enumerate(report['recommendations'][:5], 1):
                print(f"{i}. {rec}")
            
            print(f"\n✅ Analysis Complete!")
            print(f"📋 Full report saved to logs/api_performance_report_*.json")
            
        except Exception as e:
            print(f"❌ Analysis failed: {str(e)}")
            raise

if __name__ == "__main__":
    asyncio.run(main())