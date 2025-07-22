"""
Comprehensive Load Testing Suite for BookedBarber V2
Tests the optimized system under realistic barbershop loads
"""

import asyncio
import aiohttp
import time
import random
from datetime import datetime, timedelta, date
from typing import List, Dict, Any
import json
import logging
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import statistics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LoadTestResult:
    """Load test result data"""
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    success: bool
    error_message: str = ""
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class LoadTestSuite:
    """Comprehensive load testing for optimized BookedBarber V2"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[LoadTestResult] = []
        self.session = None
        
    async def setup_session(self):
        """Setup HTTP session for testing"""
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=50)
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={'Content-Type': 'application/json'}
        )
    
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
    
    async def make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Dict = None,
        auth_token: str = None
    ) -> LoadTestResult:
        """Make HTTP request and measure performance"""
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        if auth_token:
            headers['Authorization'] = f"Bearer {auth_token}"
        
        start_time = time.time()
        
        try:
            if method.upper() == 'GET':
                async with self.session.get(url, headers=headers) as response:
                    await response.text()
                    response_time = (time.time() - start_time) * 1000
                    
                    return LoadTestResult(
                        endpoint=endpoint,
                        method=method,
                        response_time_ms=response_time,
                        status_code=response.status,
                        success=200 <= response.status < 400
                    )
            
            elif method.upper() == 'POST':
                async with self.session.post(url, json=data, headers=headers) as response:
                    await response.text()
                    response_time = (time.time() - start_time) * 1000
                    
                    return LoadTestResult(
                        endpoint=endpoint,
                        method=method,
                        response_time_ms=response_time,
                        status_code=response.status,
                        success=200 <= response.status < 400
                    )
                    
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return LoadTestResult(
                endpoint=endpoint,
                method=method,
                response_time_ms=response_time,
                status_code=0,
                success=False,
                error_message=str(e)
            )
    
    async def test_real_time_availability_load(self, concurrent_users: int = 50):
        """Test real-time availability under load"""
        logger.info(f"🔍 Testing real-time availability with {concurrent_users} concurrent users")
        
        # Test different dates and barbers
        test_dates = [
            (datetime.now() + timedelta(days=i)).date() 
            for i in range(7)  # Next 7 days
        ]
        
        barber_ids = [1, 2, 3, None]  # Including 'any barber'
        
        tasks = []
        for _ in range(concurrent_users):
            test_date = random.choice(test_dates)
            barber_id = random.choice(barber_ids)
            
            endpoint = f"/api/v1/realtime-availability/slots?date={test_date.isoformat()}"
            if barber_id:
                endpoint += f"&barber_id={barber_id}"
            
            task = self.make_request('GET', endpoint)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        self.results.extend(results)
        
        # Analyze results
        successful = [r for r in results if r.success]
        avg_response_time = statistics.mean([r.response_time_ms for r in successful]) if successful else 0
        
        logger.info(f"✅ Availability Load Test: {len(successful)}/{len(results)} successful, {avg_response_time:.1f}ms avg")
        return results
    
    async def test_booking_creation_load(self, concurrent_bookings: int = 20):
        """Test booking creation under load (simulated conflict scenarios)"""
        logger.info(f"📅 Testing booking creation with {concurrent_bookings} concurrent requests")
        
        # Create realistic booking requests
        booking_data_templates = [
            {
                "barber_id": 1,
                "start_time": (datetime.now() + timedelta(hours=2)).isoformat(),
                "duration": 30,
                "notes": "Load test booking"
            },
            {
                "barber_id": 2, 
                "start_time": (datetime.now() + timedelta(hours=3)).isoformat(),
                "duration": 45,
                "notes": "Load test booking - long service"
            },
            {
                "barber_id": 3,
                "start_time": (datetime.now() + timedelta(hours=1)).isoformat(), 
                "duration": 30,
                "notes": "Load test booking - same time conflict"
            }
        ]
        
        tasks = []
        for i in range(concurrent_bookings):
            # Use different time slots to reduce conflicts
            template = random.choice(booking_data_templates)
            booking_data = template.copy()
            
            # Vary the start time slightly
            base_time = datetime.fromisoformat(booking_data["start_time"].replace('Z', '+00:00'))
            varied_time = base_time + timedelta(minutes=random.randint(0, 120))
            booking_data["start_time"] = varied_time.isoformat()
            
            task = self.make_request('POST', '/api/v1/realtime-availability/book-slot', booking_data)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        self.results.extend(results)
        
        # Analyze booking results
        successful = [r for r in results if r.success]
        conflicts = [r for r in results if r.status_code == 409]  # Conflict responses
        
        logger.info(f"✅ Booking Load Test: {len(successful)} successful, {len(conflicts)} conflicts, {len(results) - len(successful) - len(conflicts)} errors")
        return results
    
    async def test_walk_in_queue_load(self, concurrent_operations: int = 30):
        """Test walk-in queue operations under load"""
        logger.info(f"🚶 Testing walk-in queue with {concurrent_operations} concurrent operations")
        
        # Mix of queue operations
        operations = [
            ('GET', '/api/v1/walkin-queue/status', None),
            ('POST', '/api/v1/walkin-queue/add', {
                'name': f'Customer {random.randint(1000, 9999)}',
                'phone': f'+1555{random.randint(1000000, 9999999)}',
                'service_type': random.choice(['Haircut', 'Shave', 'Haircut & Shave']),
                'estimated_duration': random.choice([30, 45, 60])
            }),
            ('GET', '/api/v1/walkin-queue/analytics', None),
            ('GET', '/api/v1/walkin-queue/barber/1/availability', None)
        ]
        
        tasks = []
        for _ in range(concurrent_operations):
            method, endpoint, data = random.choice(operations)
            task = self.make_request(method, endpoint, data)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        self.results.extend(results)
        
        successful = [r for r in results if r.success]
        avg_response_time = statistics.mean([r.response_time_ms for r in successful]) if successful else 0
        
        logger.info(f"✅ Walk-in Queue Load Test: {len(successful)}/{len(results)} successful, {avg_response_time:.1f}ms avg")
        return results
    
    async def test_database_performance_load(self, query_load: int = 100):
        """Test database performance under query load"""
        logger.info(f"🗄️ Testing database performance with {query_load} concurrent queries")
        
        # Mix of database-intensive endpoints
        db_endpoints = [
            '/api/v1/realtime-availability/slots?date=' + (datetime.now() + timedelta(days=1)).date().isoformat(),
            '/api/v1/realtime-availability/quick-rebook?limit=5',
            '/api/v1/realtime-availability/mobile-stats',
            '/api/v1/walkin-queue/status',
            '/api/v1/walkin-queue/analytics'
        ]
        
        tasks = []
        for _ in range(query_load):
            endpoint = random.choice(db_endpoints)
            task = self.make_request('GET', endpoint)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        self.results.extend(results)
        
        successful = [r for r in results if r.success]
        response_times = [r.response_time_ms for r in successful]
        
        if response_times:
            avg_time = statistics.mean(response_times)
            p95_time = sorted(response_times)[int(len(response_times) * 0.95)]
            p99_time = sorted(response_times)[int(len(response_times) * 0.99)]
            
            logger.info(f"✅ Database Performance: {len(successful)}/{len(results)} successful")
            logger.info(f"   📊 Response times - Avg: {avg_time:.1f}ms, P95: {p95_time:.1f}ms, P99: {p99_time:.1f}ms")
        
        return results
    
    async def test_mobile_booking_flow_load(self, concurrent_flows: int = 25):
        """Test complete mobile booking flow under load"""
        logger.info(f"📱 Testing mobile booking flow with {concurrent_flows} concurrent users")
        
        # Simulate complete mobile booking flow
        flow_tasks = []
        
        for user_id in range(concurrent_flows):
            async def mobile_booking_flow():
                flow_results = []
                
                # Step 1: Get availability
                result1 = await self.make_request(
                    'GET', 
                    f'/api/v1/realtime-availability/slots?date={(datetime.now() + timedelta(days=1)).date().isoformat()}'
                )
                flow_results.append(result1)
                
                # Step 2: Get mobile stats
                result2 = await self.make_request('GET', '/api/v1/realtime-availability/mobile-stats')
                flow_results.append(result2)
                
                # Step 3: Check walk-in queue
                result3 = await self.make_request('GET', '/api/v1/walkin-queue/status')
                flow_results.append(result3)
                
                # Step 4: Simulate booking attempt
                booking_data = {
                    "barber_id": random.randint(1, 3),
                    "start_time": (datetime.now() + timedelta(hours=random.randint(2, 8))).isoformat(),
                    "duration": 30,
                    "notes": f"Mobile booking flow test {user_id}"
                }
                result4 = await self.make_request('POST', '/api/v1/realtime-availability/book-slot', booking_data)
                flow_results.append(result4)
                
                return flow_results
            
            flow_tasks.append(mobile_booking_flow())
        
        flow_results = await asyncio.gather(*flow_tasks)
        
        # Flatten results
        all_flow_results = []
        for flow in flow_results:
            all_flow_results.extend(flow)
        
        self.results.extend(all_flow_results)
        
        successful_flows = sum(1 for flow in flow_results if all(r.success for r in flow))
        logger.info(f"✅ Mobile Booking Flow: {successful_flows}/{len(flow_results)} complete flows successful")
        
        return all_flow_results
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        if not self.results:
            return {"error": "No test results available"}
        
        # Overall statistics
        total_requests = len(self.results)
        successful_requests = len([r for r in self.results if r.success])
        success_rate = (successful_requests / total_requests) * 100
        
        response_times = [r.response_time_ms for r in self.results if r.success]
        
        # Response time statistics
        if response_times:
            avg_response_time = statistics.mean(response_times)
            median_response_time = statistics.median(response_times)
            p95_response_time = sorted(response_times)[int(len(response_times) * 0.95)]
            p99_response_time = sorted(response_times)[int(len(response_times) * 0.99)]
            min_response_time = min(response_times)
            max_response_time = max(response_times)
        else:
            avg_response_time = median_response_time = p95_response_time = p99_response_time = 0
            min_response_time = max_response_time = 0
        
        # Endpoint-specific statistics
        endpoint_stats = {}
        for result in self.results:
            if result.endpoint not in endpoint_stats:
                endpoint_stats[result.endpoint] = []
            endpoint_stats[result.endpoint].append(result)
        
        endpoint_performance = {}
        for endpoint, results in endpoint_stats.items():
            successful = [r for r in results if r.success]
            if successful:
                endpoint_performance[endpoint] = {
                    'total_requests': len(results),
                    'successful_requests': len(successful),
                    'success_rate': (len(successful) / len(results)) * 100,
                    'avg_response_time': statistics.mean([r.response_time_ms for r in successful]),
                    'p95_response_time': sorted([r.response_time_ms for r in successful])[int(len(successful) * 0.95)] if len(successful) > 1 else successful[0].response_time_ms
                }
        
        return {
            'test_summary': {
                'total_requests': total_requests,
                'successful_requests': successful_requests,
                'failed_requests': total_requests - successful_requests,
                'success_rate_percent': round(success_rate, 2)
            },
            'response_time_stats': {
                'average_ms': round(avg_response_time, 2),
                'median_ms': round(median_response_time, 2),
                'p95_ms': round(p95_response_time, 2),
                'p99_ms': round(p99_response_time, 2),
                'min_ms': round(min_response_time, 2),
                'max_ms': round(max_response_time, 2)
            },
            'endpoint_performance': endpoint_performance,
            'performance_targets': {
                'success_rate_target': 95.0,
                'avg_response_time_target': 200.0,
                'p95_response_time_target': 500.0
            },
            'test_timestamp': datetime.now().isoformat()
        }
    
    async def run_comprehensive_load_test(self):
        """Run all load tests in sequence"""
        logger.info("🚀 Starting Comprehensive Load Testing Suite for BookedBarber V2")
        
        await self.setup_session()
        
        try:
            # Test 1: Real-time availability under load
            await self.test_real_time_availability_load(concurrent_users=50)
            await asyncio.sleep(2)  # Brief pause between tests
            
            # Test 2: Booking creation under load
            await self.test_booking_creation_load(concurrent_bookings=20)
            await asyncio.sleep(2)
            
            # Test 3: Walk-in queue operations
            await self.test_walk_in_queue_load(concurrent_operations=30)
            await asyncio.sleep(2)
            
            # Test 4: Database performance
            await self.test_database_performance_load(query_load=100)
            await asyncio.sleep(2)
            
            # Test 5: Mobile booking flow
            await self.test_mobile_booking_flow_load(concurrent_flows=25)
            
            # Generate and display report
            report = self.generate_performance_report()
            self.print_performance_report(report)
            
            return report
            
        finally:
            await self.cleanup_session()
    
    def print_performance_report(self, report: Dict[str, Any]):
        """Print formatted performance report"""
        print("\n" + "="*80)
        print("📊 BOOKEDBARBER V2 LOAD TESTING REPORT")
        print("="*80)
        
        summary = report['test_summary']
        response_stats = report['response_time_stats']
        targets = report['performance_targets']
        
        print(f"\n🎯 Test Summary:")
        print(f"   Total Requests: {summary['total_requests']}")
        print(f"   Successful: {summary['successful_requests']}")
        print(f"   Failed: {summary['failed_requests']}")
        print(f"   Success Rate: {summary['success_rate_percent']}% (Target: {targets['success_rate_target']}%)")
        
        success_status = "✅" if summary['success_rate_percent'] >= targets['success_rate_target'] else "❌"
        print(f"   Status: {success_status}")
        
        print(f"\n⚡ Response Time Performance:")
        print(f"   Average: {response_stats['average_ms']}ms (Target: <{targets['avg_response_time_target']}ms)")
        print(f"   Median: {response_stats['median_ms']}ms")
        print(f"   95th Percentile: {response_stats['p95_ms']}ms (Target: <{targets['p95_response_time_target']}ms)")
        print(f"   99th Percentile: {response_stats['p99_ms']}ms")
        print(f"   Range: {response_stats['min_ms']}ms - {response_stats['max_ms']}ms")
        
        avg_status = "✅" if response_stats['average_ms'] <= targets['avg_response_time_target'] else "❌"
        p95_status = "✅" if response_stats['p95_ms'] <= targets['p95_response_time_target'] else "❌"
        print(f"   Average Status: {avg_status}")
        print(f"   P95 Status: {p95_status}")
        
        print(f"\n🔍 Top Endpoint Performance:")
        endpoint_perf = report['endpoint_performance']
        sorted_endpoints = sorted(
            endpoint_perf.items(), 
            key=lambda x: x[1]['avg_response_time']
        )
        
        for endpoint, stats in sorted_endpoints[:10]:  # Top 10
            print(f"   {endpoint}")
            print(f"     Requests: {stats['total_requests']}, Success: {stats['success_rate']:.1f}%")
            print(f"     Avg Response: {stats['avg_response_time']:.1f}ms, P95: {stats['p95_response_time']:.1f}ms")
        
        # Overall assessment
        overall_pass = (
            summary['success_rate_percent'] >= targets['success_rate_target'] and
            response_stats['average_ms'] <= targets['avg_response_time_target'] and
            response_stats['p95_ms'] <= targets['p95_response_time_target']
        )
        
        print(f"\n🏆 OVERALL ASSESSMENT: {'✅ PASS' if overall_pass else '❌ NEEDS OPTIMIZATION'}")
        
        if not overall_pass:
            print("\n💡 Optimization Recommendations:")
            if summary['success_rate_percent'] < targets['success_rate_target']:
                print("   • Investigate failed requests and improve error handling")
            if response_stats['average_ms'] > targets['avg_response_time_target']:
                print("   • Review database queries and add more indexes")
            if response_stats['p95_ms'] > targets['p95_response_time_target']:
                print("   • Optimize slowest endpoints and add caching")
        
        print("="*80)

async def main():
    """Run the load testing suite"""
    load_tester = LoadTestSuite()
    report = await load_tester.run_comprehensive_load_test()
    
    # Save detailed report
    with open('/tmp/bookedbarber_load_test_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: /tmp/bookedbarber_load_test_report.json")

if __name__ == "__main__":
    asyncio.run(main())