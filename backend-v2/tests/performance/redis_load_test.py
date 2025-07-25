#!/usr/bin/env python3
"""
Redis Load Testing Suite
========================

Comprehensive load testing for BookedBarber's Redis infrastructure.
Tests various scenarios including normal operation, burst traffic,
and failure conditions.

Features:
- Multi-threaded concurrent testing
- Realistic booking application workloads
- Performance metrics collection
- AWS ElastiCache specific tests
- Scalability analysis
- Failure scenario testing

Usage:
    python tests/performance/redis_load_test.py --redis-url redis://localhost:6379 --concurrent-users 100
    
Requirements:
    pip install redis click colorama threading concurrent.futures
"""

import redis
import click
import time
import json
import statistics
import random
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict
from colorama import init, Fore, Style
from dataclasses import dataclass

# Initialize colorama
init(autoreset=True)

# Test result structures
@dataclass
class OperationResult:
    """Result of a single Redis operation."""
    operation: str
    success: bool
    response_time: float
    error: Optional[str] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

@dataclass
class LoadTestResult:
    """Results of a complete load test."""
    test_name: str
    duration_seconds: float
    total_operations: int
    successful_operations: int
    failed_operations: int
    operations_per_second: float
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float
    concurrent_users: int
    test_config: Dict[str, Any]


class BookingWorkloadSimulator:
    """Simulates realistic booking application workloads."""
    
    def __init__(self, redis_client: redis.Redis):
        """Initialize workload simulator."""
        self.redis = redis_client
        self.user_sessions = {}
        self.booking_cache_keys = []
        self.analytics_keys = []
        
        # Workload patterns
        self.operations = {
            'cache_booking_slots': 0.25,      # 25% - Cache available time slots
            'get_booking_slots': 0.30,        # 30% - Retrieve available slots
            'cache_user_session': 0.15,       # 15% - Cache user session data
            'get_user_session': 0.20,         # 20% - Get user session
            'rate_limit_check': 0.05,         # 5% - Rate limiting operations
            'analytics_increment': 0.05       # 5% - Analytics counters
        }
    
    def generate_realistic_data(self) -> Dict[str, Any]:
        """Generate realistic booking data."""
        user_id = random.randint(1000, 9999)
        barber_id = random.randint(1, 20)
        date_str = (datetime.now() + timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d')
        
        return {
            'user_id': user_id,
            'barber_id': barber_id,
            'date': date_str,
            'time_slot': f"{random.randint(9, 17)}:00",
            'service_type': random.choice(['haircut', 'beard', 'style', 'wash']),
            'duration': random.choice([30, 45, 60, 90]),
            'price': random.randint(25, 150)
        }
    
    def cache_booking_slots(self) -> OperationResult:
        """Simulate caching available booking slots."""
        try:
            data = self.generate_realistic_data()
            key = f"slots:{data['barber_id']}:{data['date']}"
            
            # Generate time slots for the day
            slots = []
            for hour in range(9, 18):  # 9 AM to 6 PM
                for minute in [0, 30]:
                    slot_time = f"{hour:02d}:{minute:02d}"
                    slots.append({
                        'time': slot_time,
                        'available': random.choice([True, False]),
                        'price': data['price']
                    })
            
            start_time = time.time()
            self.redis.setex(key, 300, json.dumps(slots))  # 5 minute TTL
            response_time = (time.time() - start_time) * 1000
            
            self.booking_cache_keys.append(key)
            
            return OperationResult(
                operation='cache_booking_slots',
                success=True,
                response_time=response_time
            )
            
        except Exception as e:
            return OperationResult(
                operation='cache_booking_slots',
                success=False,
                response_time=0,
                error=str(e)
            )
    
    def get_booking_slots(self) -> OperationResult:
        """Simulate retrieving booking slots."""
        try:
            if not self.booking_cache_keys:
                # Create a key if none exist
                self.cache_booking_slots()
            
            key = random.choice(self.booking_cache_keys)
            
            start_time = time.time()
            result = self.redis.get(key)
            response_time = (time.time() - start_time) * 1000
            
            success = result is not None
            
            return OperationResult(
                operation='get_booking_slots',
                success=success,
                response_time=response_time
            )
            
        except Exception as e:
            return OperationResult(
                operation='get_booking_slots',
                success=False,
                response_time=0,
                error=str(e)
            )
    
    def cache_user_session(self) -> OperationResult:
        """Simulate caching user session data."""
        try:
            data = self.generate_realistic_data()
            user_id = data['user_id']
            
            session_data = {
                'user_id': user_id,
                'login_time': datetime.now().isoformat(),
                'preferences': {
                    'timezone': random.choice(['EST', 'PST', 'CST', 'MST']),
                    'notification_preferences': random.choice(['email', 'sms', 'both'])
                },
                'last_booking': data
            }
            
            key = f"session:{user_id}"
            
            start_time = time.time()
            self.redis.setex(key, 3600, json.dumps(session_data))  # 1 hour TTL
            response_time = (time.time() - start_time) * 1000
            
            self.user_sessions[user_id] = key
            
            return OperationResult(
                operation='cache_user_session',
                success=True,
                response_time=response_time
            )
            
        except Exception as e:
            return OperationResult(
                operation='cache_user_session',
                success=False,
                response_time=0,
                error=str(e)
            )
    
    def get_user_session(self) -> OperationResult:
        """Simulate retrieving user session."""
        try:
            if not self.user_sessions:
                # Create a session if none exist
                self.cache_user_session()
            
            user_id = random.choice(list(self.user_sessions.keys()))
            key = self.user_sessions[user_id]
            
            start_time = time.time()
            result = self.redis.get(key)
            response_time = (time.time() - start_time) * 1000
            
            success = result is not None
            
            return OperationResult(
                operation='get_user_session',
                success=success,
                response_time=response_time
            )
            
        except Exception as e:
            return OperationResult(
                operation='get_user_session',
                success=False,
                response_time=0,
                error=str(e)
            )
    
    def rate_limit_check(self) -> OperationResult:
        """Simulate rate limiting check."""
        try:
            data = self.generate_realistic_data()
            user_id = data['user_id']
            
            # Simulate rate limiting keys
            minute_key = f"rate:minute:{user_id}:{int(time.time() // 60)}"
            hour_key = f"rate:hour:{user_id}:{int(time.time() // 3600)}"
            
            start_time = time.time()
            
            # Increment counters
            pipe = self.redis.pipeline()
            pipe.incr(minute_key)
            pipe.expire(minute_key, 60)
            pipe.incr(hour_key)
            pipe.expire(hour_key, 3600)
            results = pipe.execute()
            
            response_time = (time.time() - start_time) * 1000
            
            # Check if rate limits exceeded (simplified)
            minute_count = results[0]
            hour_count = results[2]
            
            success = minute_count <= 60 and hour_count <= 1000
            
            return OperationResult(
                operation='rate_limit_check',
                success=success,
                response_time=response_time
            )
            
        except Exception as e:
            return OperationResult(
                operation='rate_limit_check',
                success=False,
                response_time=0,
                error=str(e)
            )
    
    def analytics_increment(self) -> OperationResult:
        """Simulate analytics counter increments."""
        try:
            data = self.generate_realistic_data()
            
            # Analytics keys
            daily_key = f"analytics:bookings:{data['date']}"
            barber_key = f"analytics:barber:{data['barber_id']}:{data['date']}"
            service_key = f"analytics:service:{data['service_type']}:{data['date']}"
            
            start_time = time.time()
            
            pipe = self.redis.pipeline()
            pipe.incr(daily_key)
            pipe.expire(daily_key, 86400 * 7)  # 7 days
            pipe.incr(barber_key)
            pipe.expire(barber_key, 86400 * 7)
            pipe.incr(service_key)
            pipe.expire(service_key, 86400 * 7)
            pipe.execute()
            
            response_time = (time.time() - start_time) * 1000
            
            self.analytics_keys.extend([daily_key, barber_key, service_key])
            
            return OperationResult(
                operation='analytics_increment',
                success=True,
                response_time=response_time
            )
            
        except Exception as e:
            return OperationResult(
                operation='analytics_increment',
                success=False,
                response_time=0,
                error=str(e)
            )
    
    def execute_random_operation(self) -> OperationResult:
        """Execute a random operation based on workload distribution."""
        rand_val = random.random()
        cumulative = 0
        
        for operation, probability in self.operations.items():
            cumulative += probability
            if rand_val <= cumulative:
                return getattr(self, operation)()
        
        # Fallback
        return self.get_booking_slots()


class RedisLoadTester:
    """Comprehensive Redis load testing framework."""
    
    def __init__(self, redis_url: str, password: Optional[str] = None):
        """Initialize load tester."""
        self.redis_url = redis_url
        self.password = password
        self.results = []
        self.test_data = defaultdict(list)
        
        # Test connection
        self._validate_connection()
        
        click.echo(f"{Fore.GREEN}✅ Connected to Redis: {redis_url}")
    
    def _validate_connection(self) -> None:
        """Validate Redis connection."""
        try:
            client = self._create_redis_client()
            client.ping()
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Redis connection failed: {e}")
            raise
    
    def _create_redis_client(self) -> redis.Redis:
        """Create Redis client."""
        client = redis.from_url(self.redis_url, decode_responses=True)
        if self.password:
            client.auth(self.password)
        return client
    
    def _calculate_percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int((percentile / 100.0) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def run_single_user_test(self, duration_seconds: int, operations_per_second: int = 10) -> List[OperationResult]:
        """Run single-user load test."""
        results = []
        redis_client = self._create_redis_client()
        simulator = BookingWorkloadSimulator(redis_client)
        
        start_time = time.time()
        operation_interval = 1.0 / operations_per_second
        
        while (time.time() - start_time) < duration_seconds:
            operation_start = time.time()
            
            # Execute operation
            result = simulator.execute_random_operation()
            results.append(result)
            
            # Maintain target operations per second
            elapsed = time.time() - operation_start
            sleep_time = max(0, operation_interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)
        
        return results
    
    def run_concurrent_user_test(self, concurrent_users: int, duration_seconds: int,
                               operations_per_second: int = 10) -> LoadTestResult:
        """Run concurrent multi-user load test."""
        click.echo(f"{Fore.BLUE}🚀 Starting concurrent test: {concurrent_users} users for {duration_seconds}s")
        
        start_time = time.time()
        all_results = []
        
        # Use ThreadPoolExecutor for concurrent users
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            # Submit tasks for each user
            futures = []
            for user_id in range(concurrent_users):
                future = executor.submit(
                    self.run_single_user_test,
                    duration_seconds,
                    operations_per_second
                )
                futures.append(future)
            
            # Collect results
            for future in as_completed(futures):
                try:
                    user_results = future.result()
                    all_results.extend(user_results)
                except Exception as e:
                    click.echo(f"{Fore.YELLOW}⚠️  User thread error: {e}")
        
        actual_duration = time.time() - start_time
        
        # Analyze results
        return self._analyze_results(
            test_name=f"concurrent_{concurrent_users}_users",
            results=all_results,
            duration=actual_duration,
            concurrent_users=concurrent_users,
            test_config={
                'concurrent_users': concurrent_users,
                'target_duration': duration_seconds,
                'operations_per_second': operations_per_second
            }
        )
    
    def run_burst_test(self, peak_users: int, burst_duration: int = 30,
                      ramp_up_seconds: int = 10) -> LoadTestResult:
        """Run burst traffic test."""
        click.echo(f"{Fore.BLUE}💥 Starting burst test: {peak_users} peak users")
        
        start_time = time.time()
        all_results = []
        
        # Ramp up phase
        click.echo(f"{Fore.BLUE}📈 Ramping up to {peak_users} users over {ramp_up_seconds}s")
        
        ramp_futures = []
        with ThreadPoolExecutor(max_workers=peak_users) as executor:
            for i in range(peak_users):
                # Stagger user starts during ramp-up
                delay = (i / peak_users) * ramp_up_seconds
                time.sleep(delay / peak_users)  # Spread out the delays
                
                future = executor.submit(
                    self.run_single_user_test,
                    burst_duration,
                    20  # Higher ops/sec during burst
                )
                ramp_futures.append(future)
            
            # Collect results
            for future in as_completed(ramp_futures):
                try:
                    user_results = future.result()
                    all_results.extend(user_results)
                except Exception as e:
                    click.echo(f"{Fore.YELLOW}⚠️  Burst user error: {e}")
        
        actual_duration = time.time() - start_time
        
        return self._analyze_results(
            test_name=f"burst_{peak_users}_users",
            results=all_results,
            duration=actual_duration,
            concurrent_users=peak_users,
            test_config={
                'peak_users': peak_users,
                'burst_duration': burst_duration,
                'ramp_up_seconds': ramp_up_seconds
            }
        )
    
    def run_sustained_load_test(self, users: int, duration_minutes: int) -> LoadTestResult:
        """Run sustained load test."""
        duration_seconds = duration_minutes * 60
        click.echo(f"{Fore.BLUE}⏱️  Starting sustained test: {users} users for {duration_minutes} minutes")
        
        return self.run_concurrent_user_test(users, duration_seconds, 5)  # Lower ops/sec for sustained
    
    def run_scalability_test(self, max_users: int = 200, step_size: int = 25,
                           test_duration: int = 60) -> List[LoadTestResult]:
        """Run scalability test with increasing user counts."""
        click.echo(f"{Fore.BLUE}📊 Starting scalability test: 1 to {max_users} users")
        
        scalability_results = []
        
        for user_count in range(step_size, max_users + 1, step_size):
            click.echo(f"\n{Fore.CYAN}Testing {user_count} concurrent users...")
            
            result = self.run_concurrent_user_test(user_count, test_duration, 10)
            scalability_results.append(result)
            
            # Display intermediate results
            click.echo(f"  Ops/sec: {result.operations_per_second:.1f}")
            click.echo(f"  Avg response: {result.avg_response_time:.2f}ms")
            click.echo(f"  Error rate: {result.error_rate:.2f}%")
            
            # Brief pause between tests
            time.sleep(5)
        
        return scalability_results
    
    def run_failure_scenario_test(self) -> Dict[str, LoadTestResult]:
        """Run failure scenario tests."""
        click.echo(f"{Fore.BLUE}💥 Running failure scenario tests...")
        
        failure_results = {}
        
        # Test 1: Connection exhaustion simulation
        click.echo(f"{Fore.YELLOW}Testing connection exhaustion...")
        try:
            result = self.run_concurrent_user_test(150, 30, 20)  # High load
            failure_results['connection_exhaustion'] = result
        except Exception as e:
            click.echo(f"{Fore.RED}Connection exhaustion test failed: {e}")
        
        # Test 2: Memory pressure simulation
        click.echo(f"{Fore.YELLOW}Testing memory pressure...")
        try:
            # Create large values to simulate memory pressure
            redis_client = self._create_redis_client()
            large_data = 'x' * 10000  # 10KB strings
            
            start_time = time.time()
            results = []
            
            for i in range(1000):  # Create 1000 large keys
                try:
                    op_start = time.time()
                    redis_client.setex(f"large_key_{i}", 300, large_data)
                    response_time = (time.time() - op_start) * 1000
                    
                    results.append(OperationResult(
                        operation='large_set',
                        success=True,
                        response_time=response_time
                    ))
                except Exception as e:
                    results.append(OperationResult(
                        operation='large_set',
                        success=False,
                        response_time=0,
                        error=str(e)
                    ))
            
            duration = time.time() - start_time
            memory_result = self._analyze_results(
                test_name="memory_pressure",
                results=results,
                duration=duration,
                concurrent_users=1,
                test_config={'large_keys': 1000, 'key_size': '10KB'}
            )
            failure_results['memory_pressure'] = memory_result
            
            # Cleanup
            for i in range(1000):
                redis_client.delete(f"large_key_{i}")
                
        except Exception as e:
            click.echo(f"{Fore.RED}Memory pressure test failed: {e}")
        
        return failure_results
    
    def _analyze_results(self, test_name: str, results: List[OperationResult],
                        duration: float, concurrent_users: int,
                        test_config: Dict[str, Any]) -> LoadTestResult:
        """Analyze test results and create summary."""
        
        if not results:
            return LoadTestResult(
                test_name=test_name,
                duration_seconds=duration,
                total_operations=0,
                successful_operations=0,
                failed_operations=0,
                operations_per_second=0,
                avg_response_time=0,
                min_response_time=0,
                max_response_time=0,
                p95_response_time=0,
                p99_response_time=0,
                error_rate=100,
                concurrent_users=concurrent_users,
                test_config=test_config
            )
        
        # Calculate metrics
        total_ops = len(results)
        successful_ops = len([r for r in results if r.success])
        failed_ops = total_ops - successful_ops
        
        response_times = [r.response_time for r in results if r.success]
        
        if response_times:
            avg_response = statistics.mean(response_times)
            min_response = min(response_times)
            max_response = max(response_times)
            p95_response = self._calculate_percentile(response_times, 95)
            p99_response = self._calculate_percentile(response_times, 99)
        else:
            avg_response = min_response = max_response = p95_response = p99_response = 0
        
        ops_per_second = total_ops / duration if duration > 0 else 0
        error_rate = (failed_ops / total_ops * 100) if total_ops > 0 else 0
        
        return LoadTestResult(
            test_name=test_name,
            duration_seconds=duration,
            total_operations=total_ops,
            successful_operations=successful_ops,
            failed_operations=failed_ops,
            operations_per_second=ops_per_second,
            avg_response_time=avg_response,
            min_response_time=min_response,
            max_response_time=max_response,
            p95_response_time=p95_response,
            p99_response_time=p99_response,
            error_rate=error_rate,
            concurrent_users=concurrent_users,
            test_config=test_config
        )
    
    def create_load_test_report(self, results: List[LoadTestResult], 
                              output_file: Optional[str] = None) -> str:
        """Create comprehensive load test report."""
        report_lines = []
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        report_lines.extend([
            "Redis Load Test Report - BookedBarber V2",
            "=" * 50,
            f"Generated: {timestamp}",
            f"Redis URL: {self.redis_url}",
            ""
        ])
        
        # Test Summary
        if results:
            report_lines.extend([
                "📊 TEST SUMMARY",
                "-" * 30
            ])
            
            for result in results:
                report_lines.extend([
                    f"Test: {result.test_name}",
                    f"  Duration: {result.duration_seconds:.1f}s",
                    f"  Concurrent Users: {result.concurrent_users}",
                    f"  Total Operations: {result.total_operations:,}",
                    f"  Operations/sec: {result.operations_per_second:.1f}",
                    f"  Success Rate: {((result.successful_operations/result.total_operations)*100):.1f}%",
                    f"  Avg Response Time: {result.avg_response_time:.2f}ms",
                    f"  95th Percentile: {result.p95_response_time:.2f}ms",
                    f"  Error Rate: {result.error_rate:.2f}%",
                    ""
                ])
        
        # Performance Analysis
        report_lines.extend([
            "📈 PERFORMANCE ANALYSIS",
            "-" * 30
        ])
        
        if results:
            # Find best performing test
            best_throughput = max(results, key=lambda r: r.operations_per_second)
            lowest_latency = min(results, key=lambda r: r.avg_response_time)
            
            report_lines.extend([
                f"Best Throughput: {best_throughput.test_name}",
                f"  {best_throughput.operations_per_second:.1f} ops/sec",
                f"",
                f"Lowest Latency: {lowest_latency.test_name}",
                f"  {lowest_latency.avg_response_time:.2f}ms average",
                ""
            ])
            
            # Error analysis
            high_error_tests = [r for r in results if r.error_rate > 5.0]
            if high_error_tests:
                report_lines.extend([
                    "⚠️ HIGH ERROR RATE TESTS:",
                    ""
                ])
                for test in high_error_tests:
                    report_lines.append(f"  {test.test_name}: {test.error_rate:.1f}% errors")
                report_lines.append("")
        
        # Recommendations
        report_lines.extend([
            "💡 RECOMMENDATIONS",
            "-" * 30
        ])
        
        if results:
            max_successful_users = max([r.concurrent_users for r in results if r.error_rate < 5.0], default=0)
            max_ops_per_sec = max([r.operations_per_second for r in results], default=0)
            
            report_lines.extend([
                f"Maximum Stable Users: {max_successful_users}",
                f"Peak Operations/sec: {max_ops_per_sec:.1f}",
                ""
            ])
            
            # Performance recommendations
            if any(r.error_rate > 10 for r in results):
                report_lines.append("- High error rates detected - consider scaling Redis infrastructure")
            
            if any(r.avg_response_time > 50 for r in results):
                report_lines.append("- High latency detected - optimize connection pooling")
            
            if max_ops_per_sec < 1000:
                report_lines.append("- Low throughput - consider upgrading Redis instance")
            
            report_lines.extend([
                "- Monitor Redis memory usage during peak loads",
                "- Set up CloudWatch alerts for performance metrics",
                "- Consider connection pooling optimization",
                ""
            ])
        
        report_content = "\n".join(report_lines)
        
        # Save to file if requested
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    f.write(report_content)
                click.echo(f"{Fore.GREEN}✅ Load test report saved to: {output_file}")
            except Exception as e:
                click.echo(f"{Fore.RED}❌ Error saving report: {e}")
        
        return report_content


@click.command()
@click.option('--redis-url', required=True, help='Redis connection URL')
@click.option('--password', help='Redis password (if required)')
@click.option('--concurrent-users', default=50, help='Number of concurrent users')
@click.option('--duration', default=60, help='Test duration in seconds')
@click.option('--test-type', type=click.Choice(['basic', 'burst', 'sustained', 'scalability', 'failure']),
              default='basic', help='Type of load test to run')
@click.option('--max-users', default=200, help='Maximum users for scalability test')
@click.option('--output-report', help='Save report to file')
@click.option('--quick', is_flag=True, help='Run quick test with reduced duration')
def main(redis_url: str, password: str, concurrent_users: int, duration: int,
         test_type: str, max_users: int, output_report: str, quick: bool):
    """Run Redis load tests for BookedBarber infrastructure."""
    
    try:
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🚀 Redis Load Testing Suite")
        click.echo(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
        
        # Adjust duration for quick tests
        if quick:
            duration = min(duration, 30)
            click.echo(f"{Fore.YELLOW}⚡ Quick test mode: {duration}s duration")
        
        # Initialize load tester
        tester = RedisLoadTester(redis_url, password)
        
        results = []
        
        if test_type == 'basic':
            click.echo(f"\n{Fore.BLUE}🧪 Running basic load test...")
            result = tester.run_concurrent_user_test(concurrent_users, duration)
            results.append(result)
            
        elif test_type == 'burst':
            click.echo(f"\n{Fore.BLUE}💥 Running burst load test...")
            result = tester.run_burst_test(concurrent_users, duration, 10)
            results.append(result)
            
        elif test_type == 'sustained':
            duration_minutes = max(1, duration // 60)
            click.echo(f"\n{Fore.BLUE}⏱️  Running sustained load test...")
            result = tester.run_sustained_load_test(concurrent_users, duration_minutes)
            results.append(result)
            
        elif test_type == 'scalability':
            click.echo(f"\n{Fore.BLUE}📊 Running scalability test...")
            step_size = max(10, max_users // 10)
            test_duration = duration if not quick else 30
            results = tester.run_scalability_test(max_users, step_size, test_duration)
            
        elif test_type == 'failure':
            click.echo(f"\n{Fore.BLUE}💥 Running failure scenario tests...")
            failure_results = tester.run_failure_scenario_test()
            results = list(failure_results.values())
        
        # Display results
        click.echo(f"\n{Fore.CYAN}📊 Test Results Summary:")
        click.echo("-" * 40)
        
        for result in results:
            success_rate = (result.successful_operations / result.total_operations * 100) if result.total_operations > 0 else 0
            
            # Color code based on performance
            if result.error_rate < 1 and result.avg_response_time < 20:
                color = Fore.GREEN
                status = "EXCELLENT"
            elif result.error_rate < 5 and result.avg_response_time < 50:
                color = Fore.CYAN
                status = "GOOD"
            elif result.error_rate < 10:
                color = Fore.YELLOW
                status = "ACCEPTABLE"
            else:
                color = Fore.RED
                status = "POOR"
            
            click.echo(f"{color}{result.test_name.upper()}: {status}")
            click.echo(f"  Operations/sec: {result.operations_per_second:.1f}")
            click.echo(f"  Success rate: {success_rate:.1f}%")
            click.echo(f"  Avg response: {result.avg_response_time:.2f}ms")
            click.echo(f"  95th percentile: {result.p95_response_time:.2f}ms")
            click.echo(f"  Error rate: {result.error_rate:.2f}%")
            click.echo()
        
        # Performance recommendations
        if results:
            best_result = min(results, key=lambda r: r.error_rate)
            
            click.echo(f"{Fore.BLUE}💡 Performance Summary:")
            click.echo(f"  Recommended max users: {best_result.concurrent_users}")
            click.echo(f"  Peak throughput: {max(r.operations_per_second for r in results):.1f} ops/sec")
            
            if any(r.error_rate > 5 for r in results):
                click.echo(f"{Fore.YELLOW}⚠️  High error rates detected - consider infrastructure scaling")
            else:
                click.echo(f"{Fore.GREEN}✅ System performed well under load")
        
        # Create report
        if output_report:
            tester.create_load_test_report(results, output_report)
        
        click.echo(f"\n{Fore.GREEN}🎉 Load testing complete!")
        
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}⚠️  Load test interrupted by user")
    except Exception as e:
        click.echo(f"\n{Fore.RED}❌ Load test failed: {e}")


if __name__ == '__main__':
    main()