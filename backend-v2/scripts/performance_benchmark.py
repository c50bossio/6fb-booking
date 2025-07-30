#!/usr/bin/env python3
"""
Performance Benchmark Script
Comprehensive performance testing for all implemented optimizations
"""

import asyncio
import aiohttp
import time
import statistics
import json
import logging
from typing import Dict, List, Any
from dataclasses import dataclass
from pathlib import Path
import concurrent.futures
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BenchmarkResult:
    """Individual benchmark test result"""
    test_name: str
    success_rate: float
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    requests_per_second: float
    total_requests: int
    failed_requests: int
    errors: List[str]

class PerformanceBenchmark:
    """Comprehensive performance benchmark suite"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
        
    async def run_all_benchmarks(self) -> Dict[str, Any]:
        """Run all performance benchmarks"""
        logger.info("🚀 Starting comprehensive performance benchmarks...")
        
        # Test different aspects of the application
        await self.benchmark_health_endpoint()
        await self.benchmark_api_compression()
        await self.benchmark_rate_limiting()
        await self.benchmark_caching_performance()
        await self.benchmark_database_performance()
        await self.benchmark_concurrent_load()
        await self.benchmark_large_payload_handling()
        
        return self.generate_benchmark_report()
    
    async def benchmark_health_endpoint(self):
        """Benchmark the health check endpoint"""
        logger.info("🏥 Benchmarking health endpoint...")
        
        response_times = []
        errors = []
        successful_requests = 0
        total_requests = 100
        
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for _ in range(total_requests):
                tasks.append(self._make_request(session, "/api/v2/monitoring/health"))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    errors.append(str(result))
                elif isinstance(result, dict) and 'response_time' in result:
                    response_times.append(result['response_time'])
                    if result['status'] == 200:
                        successful_requests += 1
                else:
                    errors.append("Unknown error")
        
        end_time = time.time()
        total_time = end_time - start_time
        
        if response_times:
            benchmark_result = BenchmarkResult(
                test_name="Health Endpoint",
                success_rate=successful_requests / total_requests,
                avg_response_time=statistics.mean(response_times),
                min_response_time=min(response_times),
                max_response_time=max(response_times),
                p95_response_time=self._calculate_percentile(response_times, 95),
                requests_per_second=total_requests / total_time,
                total_requests=total_requests,
                failed_requests=total_requests - successful_requests,
                errors=errors[:5]  # Keep first 5 errors
            )
        else:
            benchmark_result = BenchmarkResult(
                test_name="Health Endpoint",
                success_rate=0.0,
                avg_response_time=0.0,
                min_response_time=0.0,
                max_response_time=0.0,
                p95_response_time=0.0,
                requests_per_second=0.0,
                total_requests=total_requests,
                failed_requests=total_requests,
                errors=errors[:5]
            )
        
        self.results.append(benchmark_result)
        logger.info(f"✅ Health endpoint: {benchmark_result.success_rate:.1%} success, {benchmark_result.avg_response_time:.3f}s avg")
    
    async def benchmark_api_compression(self):
        """Benchmark API response compression"""
        logger.info("📦 Benchmarking API compression...")
        
        response_times = []
        compression_ratios = []
        errors = []
        successful_requests = 0
        total_requests = 50
        
        async with aiohttp.ClientSession() as session:
            for _ in range(total_requests):
                try:
                    # Request with compression
                    headers = {'Accept-Encoding': 'gzip, deflate'}
                    start = time.time()
                    async with session.get(f"{self.base_url}/api/v2/monitoring/metrics/system", headers=headers) as response:
                        content = await response.read()
                        end = time.time()
                        
                        response_times.append(end - start)
                        
                        if response.status == 200:
                            successful_requests += 1
                            
                            # Check if compression was applied
                            content_encoding = response.headers.get('content-encoding', '')
                            if content_encoding:
                                # Estimate compression ratio (simplified)
                                original_size = len(await response.text())
                                compressed_size = len(content)
                                if compressed_size > 0:
                                    compression_ratios.append(original_size / compressed_size)
                        
                except Exception as e:
                    errors.append(str(e))
        
        if response_times:
            avg_compression_ratio = statistics.mean(compression_ratios) if compression_ratios else 1.0
            
            benchmark_result = BenchmarkResult(
                test_name=f"API Compression (ratio: {avg_compression_ratio:.2f}x)",
                success_rate=successful_requests / total_requests,
                avg_response_time=statistics.mean(response_times),
                min_response_time=min(response_times),
                max_response_time=max(response_times),
                p95_response_time=self._calculate_percentile(response_times, 95),
                requests_per_second=total_requests / sum(response_times),
                total_requests=total_requests,
                failed_requests=total_requests - successful_requests,
                errors=errors[:5]
            )
        else:
            benchmark_result = BenchmarkResult(
                test_name="API Compression",
                success_rate=0.0,
                avg_response_time=0.0,
                min_response_time=0.0,
                max_response_time=0.0,
                p95_response_time=0.0,
                requests_per_second=0.0,
                total_requests=total_requests,
                failed_requests=total_requests,
                errors=errors[:5]
            )
        
        self.results.append(benchmark_result)
        logger.info(f"✅ API compression: {benchmark_result.success_rate:.1%} success, {benchmark_result.avg_response_time:.3f}s avg")
    
    async def benchmark_rate_limiting(self):
        """Benchmark rate limiting functionality"""
        logger.info("🚦 Benchmarking rate limiting...")
        
        response_times = []
        rate_limited_requests = 0
        successful_requests = 0
        total_requests = 250  # Should trigger rate limiting
        errors = []
        
        async with aiohttp.ClientSession() as session:
            # Send rapid requests to trigger rate limiting
            start_time = time.time()
            tasks = []
            
            for _ in range(total_requests):
                tasks.append(self._make_request(session, "/api/v2/monitoring/live-metrics"))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    errors.append(str(result))
                elif isinstance(result, dict):
                    if 'response_time' in result:
                        response_times.append(result['response_time'])
                    
                    if result['status'] == 200:
                        successful_requests += 1
                    elif result['status'] == 429:
                        rate_limited_requests += 1
                else:
                    errors.append("Unknown error")
        
        total_time = time.time() - start_time
        
        benchmark_result = BenchmarkResult(
            test_name=f"Rate Limiting ({rate_limited_requests} rate-limited)",
            success_rate=successful_requests / total_requests,
            avg_response_time=statistics.mean(response_times) if response_times else 0.0,
            min_response_time=min(response_times) if response_times else 0.0,
            max_response_time=max(response_times) if response_times else 0.0,
            p95_response_time=self._calculate_percentile(response_times, 95) if response_times else 0.0,
            requests_per_second=total_requests / total_time,
            total_requests=total_requests,
            failed_requests=total_requests - successful_requests - rate_limited_requests,
            errors=errors[:5]
        )
        
        self.results.append(benchmark_result)
        logger.info(f"✅ Rate limiting: {rate_limited_requests}/{total_requests} rate-limited, {benchmark_result.avg_response_time:.3f}s avg")
    
    async def benchmark_caching_performance(self):
        """Benchmark caching performance (if cache is available)"""
        logger.info("💾 Benchmarking caching performance...")
        
        cache_hit_times = []
        cache_miss_times = []
        errors = []
        total_requests = 100
        
        async with aiohttp.ClientSession() as session:
            # First, make requests to populate cache
            for _ in range(10):
                try:
                    await self._make_request(session, "/api/v2/monitoring/metrics/cache")
                except:
                    pass
            
            # Now benchmark cache performance
            for i in range(total_requests):
                try:
                    start = time.time()
                    result = await self._make_request(session, "/api/v2/monitoring/metrics/cache")
                    end = time.time()
                    
                    response_time = end - start
                    
                    # Assume first few requests are cache misses, later ones are hits
                    if i < 20:
                        cache_miss_times.append(response_time)
                    else:
                        cache_hit_times.append(response_time)
                        
                except Exception as e:
                    errors.append(str(e))
        
        # Calculate cache performance improvement
        cache_improvement_factor = 1.0
        if cache_hit_times and cache_miss_times:
            avg_miss_time = statistics.mean(cache_miss_times)
            avg_hit_time = statistics.mean(cache_hit_times)
            cache_improvement_factor = avg_miss_time / avg_hit_time if avg_hit_time > 0 else 1.0
        
        all_times = cache_hit_times + cache_miss_times
        
        if all_times:
            benchmark_result = BenchmarkResult(
                test_name=f"Caching Performance ({cache_improvement_factor:.2f}x improvement)",
                success_rate=(len(all_times) - len(errors)) / total_requests,
                avg_response_time=statistics.mean(all_times),
                min_response_time=min(all_times),
                max_response_time=max(all_times),
                p95_response_time=self._calculate_percentile(all_times, 95),
                requests_per_second=len(all_times) / sum(all_times),
                total_requests=total_requests,
                failed_requests=len(errors),
                errors=errors[:5]
            )
        else:
            benchmark_result = BenchmarkResult(
                test_name="Caching Performance",
                success_rate=0.0,
                avg_response_time=0.0,
                min_response_time=0.0,
                max_response_time=0.0,
                p95_response_time=0.0,
                requests_per_second=0.0,
                total_requests=total_requests,
                failed_requests=total_requests,
                errors=errors[:5]
            )
        
        self.results.append(benchmark_result)
        logger.info(f"✅ Caching: {benchmark_result.success_rate:.1%} success, {cache_improvement_factor:.2f}x improvement")
    
    async def benchmark_database_performance(self):
        """Benchmark database performance"""
        logger.info("🗄️ Benchmarking database performance...")
        
        response_times = []
        errors = []
        successful_requests = 0
        total_requests = 50
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for _ in range(total_requests):
                tasks.append(self._make_request(session, "/api/v2/monitoring/metrics/database"))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    errors.append(str(result))
                elif isinstance(result, dict) and 'response_time' in result:
                    response_times.append(result['response_time'])
                    if result['status'] == 200:
                        successful_requests += 1
                else:
                    errors.append("Unknown error")
        
        if response_times:
            benchmark_result = BenchmarkResult(
                test_name="Database Performance",
                success_rate=successful_requests / total_requests,
                avg_response_time=statistics.mean(response_times),
                min_response_time=min(response_times),
                max_response_time=max(response_times),
                p95_response_time=self._calculate_percentile(response_times, 95),
                requests_per_second=total_requests / sum(response_times),
                total_requests=total_requests,
                failed_requests=total_requests - successful_requests,
                errors=errors[:5]
            )
        else:
            benchmark_result = BenchmarkResult(
                test_name="Database Performance",
                success_rate=0.0,
                avg_response_time=0.0,
                min_response_time=0.0,
                max_response_time=0.0,
                p95_response_time=0.0,
                requests_per_second=0.0,
                total_requests=total_requests,
                failed_requests=total_requests,
                errors=errors[:5]
            )
        
        self.results.append(benchmark_result)
        logger.info(f"✅ Database: {benchmark_result.success_rate:.1%} success, {benchmark_result.avg_response_time:.3f}s avg")
    
    async def benchmark_concurrent_load(self):
        """Benchmark system under concurrent load"""
        logger.info("🔥 Benchmarking concurrent load handling...")
        
        response_times = []
        errors = []
        successful_requests = 0
        total_requests = 200
        concurrent_level = 50
        
        async with aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(limit=concurrent_level),
            timeout=aiohttp.ClientTimeout(total=30)
        ) as session:
            
            # Create batches of concurrent requests
            for batch in range(0, total_requests, concurrent_level):
                batch_size = min(concurrent_level, total_requests - batch)
                
                tasks = []
                for _ in range(batch_size):
                    tasks.append(self._make_request(session, "/api/v2/monitoring/live-metrics"))
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        errors.append(str(result))
                    elif isinstance(result, dict) and 'response_time' in result:
                        response_times.append(result['response_time'])
                        if result['status'] == 200:
                            successful_requests += 1
                    else:
                        errors.append("Unknown error")
                
                # Small delay between batches
                await asyncio.sleep(0.1)
        
        if response_times:
            benchmark_result = BenchmarkResult(
                test_name=f"Concurrent Load ({concurrent_level} concurrent)",
                success_rate=successful_requests / total_requests,
                avg_response_time=statistics.mean(response_times),
                min_response_time=min(response_times),
                max_response_time=max(response_times),
                p95_response_time=self._calculate_percentile(response_times, 95),
                requests_per_second=total_requests / sum(response_times),
                total_requests=total_requests,
                failed_requests=total_requests - successful_requests,
                errors=errors[:5]
            )
        else:
            benchmark_result = BenchmarkResult(
                test_name="Concurrent Load",
                success_rate=0.0,
                avg_response_time=0.0,
                min_response_time=0.0,
                max_response_time=0.0,
                p95_response_time=0.0,
                requests_per_second=0.0,
                total_requests=total_requests,
                failed_requests=total_requests,
                errors=errors[:5]
            )
        
        self.results.append(benchmark_result)
        logger.info(f"✅ Concurrent load: {benchmark_result.success_rate:.1%} success, {benchmark_result.avg_response_time:.3f}s avg")
    
    async def benchmark_large_payload_handling(self):
        """Benchmark handling of large payloads"""
        logger.info("📊 Benchmarking large payload handling...")
        
        response_times = []
        errors = []
        successful_requests = 0
        total_requests = 20
        
        # Create a reasonably large payload for testing
        large_payload = {"data": "x" * 10000, "items": list(range(1000))}
        
        async with aiohttp.ClientSession() as session:
            for _ in range(total_requests):
                try:
                    start = time.time()
                    async with session.post(
                        f"{self.base_url}/api/v2/monitoring/alerts/check",
                        json=large_payload,
                        headers={'Content-Type': 'application/json'}
                    ) as response:
                        await response.read()  # Consume response
                        end = time.time()
                        
                        response_times.append(end - start)
                        if response.status in [200, 422]:  # 422 is OK for this test
                            successful_requests += 1
                            
                except Exception as e:
                    errors.append(str(e))
        
        if response_times:
            benchmark_result = BenchmarkResult(
                test_name="Large Payload Handling",
                success_rate=successful_requests / total_requests,
                avg_response_time=statistics.mean(response_times),
                min_response_time=min(response_times),
                max_response_time=max(response_times),
                p95_response_time=self._calculate_percentile(response_times, 95),
                requests_per_second=total_requests / sum(response_times),
                total_requests=total_requests,
                failed_requests=total_requests - successful_requests,
                errors=errors[:5]
            )
        else:
            benchmark_result = BenchmarkResult(
                test_name="Large Payload Handling",
                success_rate=0.0,
                avg_response_time=0.0,
                min_response_time=0.0,
                max_response_time=0.0,
                p95_response_time=0.0,
                requests_per_second=0.0,
                total_requests=total_requests,
                failed_requests=total_requests,
                errors=errors[:5]
            )
        
        self.results.append(benchmark_result)
        logger.info(f"✅ Large payloads: {benchmark_result.success_rate:.1%} success, {benchmark_result.avg_response_time:.3f}s avg")
    
    async def _make_request(self, session: aiohttp.ClientSession, endpoint: str) -> Dict[str, Any]:
        """Make a single HTTP request and measure performance"""
        start_time = time.time()
        try:
            async with session.get(f"{self.base_url}{endpoint}") as response:
                await response.read()  # Consume response body
                end_time = time.time()
                
                return {
                    'status': response.status,
                    'response_time': end_time - start_time,
                    'size': len(await response.read()) if response.status == 200 else 0
                }
        except Exception as e:
            end_time = time.time()
            return {
                'status': 0,
                'response_time': end_time - start_time,
                'error': str(e),
                'size': 0
            }
    
    def _calculate_percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        lower_index = int(index)
        upper_index = min(lower_index + 1, len(sorted_data) - 1)
        
        if lower_index == upper_index:
            return sorted_data[lower_index]
        
        # Linear interpolation
        weight = index - lower_index
        return sorted_data[lower_index] * (1 - weight) + sorted_data[upper_index] * weight
    
    def generate_benchmark_report(self) -> Dict[str, Any]:
        """Generate comprehensive benchmark report"""
        logger.info("📋 Generating benchmark report...")
        
        # Calculate overall metrics
        total_requests = sum(result.total_requests for result in self.results)
        total_successful = sum(result.total_requests - result.failed_requests for result in self.results)
        overall_success_rate = total_successful / total_requests if total_requests > 0 else 0
        
        # Average performance metrics
        avg_response_times = [result.avg_response_time for result in self.results if result.avg_response_time > 0]
        overall_avg_response_time = statistics.mean(avg_response_times) if avg_response_times else 0
        
        # Calculate performance score (0-100)
        performance_score = self._calculate_performance_score()
        
        report = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'performance_score': performance_score,
            'overall_metrics': {
                'total_requests': total_requests,
                'success_rate': overall_success_rate,
                'avg_response_time': overall_avg_response_time,
                'total_tests': len(self.results)
            },
            'detailed_results': [
                {
                    'test_name': result.test_name,
                    'success_rate': result.success_rate,
                    'avg_response_time': result.avg_response_time,
                    'p95_response_time': result.p95_response_time,
                    'requests_per_second': result.requests_per_second,
                    'total_requests': result.total_requests,
                    'failed_requests': result.failed_requests,
                    'errors': result.errors
                }
                for result in self.results
            ],
            'recommendations': self._generate_performance_recommendations()
        }
        
        # Print summary
        status_emoji = "🚀" if performance_score >= 80 else "⚠️" if performance_score >= 60 else "🐌"
        logger.info(f"\n{status_emoji} Performance Benchmark Complete!")
        logger.info(f"📊 Performance Score: {performance_score:.1f}/100")
        logger.info(f"📈 Overall Success Rate: {overall_success_rate:.1%}")
        logger.info(f"⏱️ Average Response Time: {overall_avg_response_time:.3f}s")
        
        return report
    
    def _calculate_performance_score(self) -> float:
        """Calculate overall performance score (0-100)"""
        if not self.results:
            return 0.0
        
        score = 100.0
        
        for result in self.results:
            # Penalize low success rates
            if result.success_rate < 0.95:
                score -= (0.95 - result.success_rate) * 30
            
            # Penalize slow response times
            if result.avg_response_time > 1.0:
                score -= min(20, (result.avg_response_time - 1.0) * 10)
            
            # Penalize high P95 response times
            if result.p95_response_time > 2.0:
                score -= min(15, (result.p95_response_time - 2.0) * 5)
        
        return max(0, score)
    
    def _generate_performance_recommendations(self) -> List[str]:
        """Generate performance recommendations based on benchmark results"""
        recommendations = []
        
        for result in self.results:
            if result.success_rate < 0.9:
                recommendations.append(f"Improve reliability for {result.test_name} (success rate: {result.success_rate:.1%})")
            
            if result.avg_response_time > 2.0:
                recommendations.append(f"Optimize response time for {result.test_name} (avg: {result.avg_response_time:.3f}s)")
            
            if result.p95_response_time > 5.0:
                recommendations.append(f"Address high P95 response time for {result.test_name} ({result.p95_response_time:.3f}s)")
            
            if result.failed_requests > result.total_requests * 0.1:
                recommendations.append(f"Investigate high failure rate for {result.test_name}")
        
        # Add general recommendations
        if not any("Concurrent Load" in result.test_name for result in self.results):
            recommendations.append("Test system under higher concurrent load")
        
        return list(set(recommendations))  # Remove duplicates

async def main():
    """Main benchmark function"""
    benchmark = PerformanceBenchmark()
    
    try:
        report = await benchmark.run_all_benchmarks()
        
        # Save report to file
        report_path = Path(__file__).parent.parent / "performance_benchmark_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"📄 Detailed report saved to: {report_path}")
        
        # Print recommendations
        if report['recommendations']:
            logger.info("\n💡 Recommendations:")
            for i, rec in enumerate(report['recommendations'], 1):
                logger.info(f"   {i}. {rec}")
        
        # Exit with appropriate code
        sys.exit(0 if report['performance_score'] >= 70 else 1)
        
    except Exception as e:
        logger.error(f"❌ Benchmark failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())