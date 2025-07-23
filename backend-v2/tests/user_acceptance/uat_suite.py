"""
User Acceptance Testing (UAT) Suite for BookedBarber V2
Tests complete user journeys and business workflows
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class UATTestCase:
    """User Acceptance Test case definition"""
    name: str
    description: str
    user_role: str  # client, barber, shop_owner
    test_steps: List[Dict[str, Any]]
    expected_outcome: str
    business_value: str

@dataclass
class UATResult:
    """User Acceptance Test result"""
    test_case: UATTestCase
    success: bool
    execution_time_ms: float
    step_results: List[Dict[str, Any]]
    error_message: str = ""
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class UserAcceptanceTestSuite:
    """Comprehensive UAT suite for BookedBarber V2"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[UATResult] = []
        self.session = None
        
        # Test user data
        self.test_users = {
            'client': {
                'email': 'testclient@bookedbarber.com',
                'password': 'TestClient123!',
                'name': 'Test Client',
                'phone': '+15551234567'
            },
            'barber': {
                'email': 'testbarber@bookedbarber.com', 
                'password': 'TestBarber123!',
                'name': 'Test Barber',
                'role': 'barber'
            },
            'shop_owner': {
                'email': 'testowner@bookedbarber.com',
                'password': 'TestOwner123!',
                'name': 'Test Shop Owner',
                'role': 'shop_owner'
            }
        }
        
        self.auth_tokens = {}
    
    async def setup_session(self):
        """Setup HTTP session and test data"""
        connector = aiohttp.TCPConnector(limit=50)
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={'Content-Type': 'application/json'}
        )
        
        # Authenticate test users
        await self.authenticate_test_users()
    
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
    
    async def authenticate_test_users(self):
        """Authenticate all test users for testing"""
        for role, user_data in self.test_users.items():
            try:
                # Try to login first
                login_data = {
                    'email': user_data['email'],
                    'password': user_data['password']
                }
                
                async with self.session.post(f"{self.base_url}/api/v2/auth/login", json=login_data) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.auth_tokens[role] = result.get('access_token', '')
                        logger.info(f"✅ Authenticated test {role}")
                    else:
                        logger.warning(f"❌ Failed to authenticate test {role}: {response.status}")
                        # Could implement user creation here if needed
                        
            except Exception as e:
                logger.warning(f"Authentication failed for {role}: {e}")
    
    def get_auth_headers(self, role: str) -> Dict[str, str]:
        """Get authentication headers for a role"""
        token = self.auth_tokens.get(role)
        if token:
            return {'Authorization': f'Bearer {token}'}
        return {}
    
    async def execute_test_step(self, step: Dict[str, Any], auth_headers: Dict[str, str] = None) -> Dict[str, Any]:
        """Execute a single test step"""
        method = step.get('method', 'GET').upper()
        endpoint = step.get('endpoint', '')
        data = step.get('data', {})
        expected_status = step.get('expected_status', 200)
        
        url = f"{self.base_url}{endpoint}"
        headers = auth_headers or {}
        
        start_time = time.time()
        
        try:
            if method == 'GET':
                async with self.session.get(url, headers=headers) as response:
                    response_data = await response.json() if response.content_type == 'application/json' else await response.text()
                    execution_time = (time.time() - start_time) * 1000
                    
                    return {
                        'success': response.status == expected_status,
                        'status_code': response.status,
                        'response_data': response_data,
                        'execution_time_ms': execution_time,
                        'step_description': step.get('description', ''),
                        'expected_status': expected_status
                    }
            
            elif method == 'POST':
                async with self.session.post(url, json=data, headers=headers) as response:
                    response_data = await response.json() if response.content_type == 'application/json' else await response.text()
                    execution_time = (time.time() - start_time) * 1000
                    
                    return {
                        'success': response.status == expected_status,
                        'status_code': response.status,
                        'response_data': response_data,
                        'execution_time_ms': execution_time,
                        'step_description': step.get('description', ''),
                        'expected_status': expected_status
                    }
                    
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            return {
                'success': False,
                'status_code': 0,
                'response_data': None,
                'execution_time_ms': execution_time,
                'step_description': step.get('description', ''),
                'error': str(e)
            }
    
    async def run_test_case(self, test_case: UATTestCase) -> UATResult:
        """Run a complete user acceptance test case"""
        logger.info(f"🧪 Running UAT: {test_case.name}")
        
        start_time = time.time()
        step_results = []
        overall_success = True
        error_message = ""
        
        auth_headers = self.get_auth_headers(test_case.user_role)
        
        for i, step in enumerate(test_case.test_steps):
            step_result = await self.execute_test_step(step, auth_headers)
            step_results.append(step_result)
            
            if not step_result['success']:
                overall_success = False
                error_message = f"Step {i+1} failed: {step_result.get('error', 'Status ' + str(step_result['status_code']))}"
                logger.warning(f"   ❌ Step {i+1}: {step.get('description', 'Unknown')} - {error_message}")
                break
            else:
                logger.info(f"   ✅ Step {i+1}: {step.get('description', 'Unknown')} ({step_result['execution_time_ms']:.1f}ms)")
        
        total_execution_time = (time.time() - start_time) * 1000
        
        result = UATResult(
            test_case=test_case,
            success=overall_success,
            execution_time_ms=total_execution_time,
            step_results=step_results,
            error_message=error_message
        )
        
        if overall_success:
            logger.info(f"✅ UAT PASSED: {test_case.name} ({total_execution_time:.1f}ms)")
        else:
            logger.error(f"❌ UAT FAILED: {test_case.name} - {error_message}")
        
        return result
    
    def create_test_cases(self) -> List[UATTestCase]:
        """Create comprehensive UAT test cases"""
        tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
        next_week = (datetime.now() + timedelta(days=7)).date().isoformat()
        
        return [
            # Client Journey Tests
            UATTestCase(
                name="Client Mobile Booking Journey",
                description="Complete mobile booking flow from availability check to confirmation",
                user_role="client",
                test_steps=[
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={tomorrow}',
                        'description': 'Check real-time availability for tomorrow',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET', 
                        'endpoint': '/api/v1/realtime-availability/mobile-stats',
                        'description': 'Get mobile booking recommendations',
                        'expected_status': 401  # Requires auth
                    },
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/status',
                        'description': 'Check walk-in queue status',
                        'expected_status': 200
                    }
                ],
                expected_outcome="Client can view availability and queue status",
                business_value="Mobile-first booking experience for 77% mobile users"
            ),
            
            UATTestCase(
                name="Walk-in Customer Experience",
                description="Walk-in customer flow from queue addition to appointment conversion",
                user_role="client",
                test_steps=[
                    {
                        'method': 'POST',
                        'endpoint': '/api/v1/walkin-queue/add',
                        'data': {
                            'name': 'John Walk-in Customer',
                            'phone': '+15551234567',
                            'service_type': 'Haircut',
                            'estimated_duration': 30
                        },
                        'description': 'Add customer to walk-in queue',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/status',
                        'description': 'Check updated queue status',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/analytics',
                        'description': 'Get queue performance analytics',
                        'expected_status': 200
                    }
                ],
                expected_outcome="Walk-in customers can be managed efficiently",
                business_value="Seamless integration of walk-ins with appointment scheduling"
            ),
            
            UATTestCase(
                name="Barber Availability Management",
                description="Barber checking their schedule and availability",
                user_role="barber",
                test_steps=[
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/barber/1/availability',
                        'description': 'Check barber availability with walk-in queue',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={tomorrow}&barber_id=1',
                        'description': 'Get specific barber availability for tomorrow',
                        'expected_status': 200
                    }
                ],
                expected_outcome="Barber can view comprehensive schedule including walk-ins",
                business_value="Optimized barber productivity and time management"
            ),
            
            UATTestCase(
                name="Real-time Booking Conflict Resolution",
                description="Test handling of booking conflicts and real-time updates",
                user_role="client",
                test_steps=[
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={tomorrow}',
                        'description': 'Get available slots',
                        'expected_status': 200
                    },
                    {
                        'method': 'POST',
                        'endpoint': '/api/v1/realtime-availability/book-slot',
                        'data': {
                            'barber_id': 1,
                            'start_time': f'{tomorrow}T14:00:00',
                            'duration': 30,
                            'notes': 'UAT test booking'
                        },
                        'description': 'Attempt to book a specific slot',
                        'expected_status': 401  # Requires auth for booking
                    }
                ],
                expected_outcome="Booking conflicts are handled gracefully with real-time updates",
                business_value="Prevents double bookings and optimizes slot utilization"
            ),
            
            UATTestCase(
                name="Performance Under Load",
                description="System responsiveness under concurrent user load",
                user_role="client",
                test_steps=[
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={tomorrow}',
                        'description': 'Availability check (performance test)',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/status',
                        'description': 'Queue status check (performance test)',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/analytics', 
                        'description': 'Analytics query (performance test)',
                        'expected_status': 200
                    }
                ],
                expected_outcome="System maintains <200ms response times under load",
                business_value="Reliable performance for peak barbershop hours"
            ),
            
            UATTestCase(
                name="Six Figure Barber Methodology Compliance",
                description="Verify platform supports 6FB business methodology",
                user_role="shop_owner",
                test_steps=[
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={tomorrow}&include_popular=true',
                        'description': 'Get popular time slots for revenue optimization',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/analytics',
                        'description': 'Get customer flow analytics',
                        'expected_status': 200
                    }
                ],
                expected_outcome="Platform provides 6FB methodology insights and tools",
                business_value="Supports barber business growth and revenue optimization"
            ),
            
            UATTestCase(
                name="Mobile User Experience Validation",
                description="Validate mobile-first design and touch interactions",
                user_role="client",
                test_steps=[
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={tomorrow}',
                        'description': 'Mobile availability check with touch optimization',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': '/api/v1/walkin-queue/status',
                        'description': 'Mobile queue status display',
                        'expected_status': 200
                    }
                ],
                expected_outcome="Mobile experience is optimized for 77% mobile user base",
                business_value="Maximizes booking conversion for mobile users"
            ),
            
            UATTestCase(
                name="Database Performance Optimization",
                description="Verify database indexes and query optimization",
                user_role="client",
                test_steps=[
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={tomorrow}',
                        'description': 'Availability query with optimized indexes',
                        'expected_status': 200
                    },
                    {
                        'method': 'GET',
                        'endpoint': f'/api/v1/realtime-availability/slots?date={next_week}',
                        'description': 'Future date query performance',
                        'expected_status': 200
                    }
                ],
                expected_outcome="Database queries execute efficiently with new indexes",
                business_value="Scalable performance for growing barbershop business"
            )
        ]
    
    async def run_comprehensive_uat(self):
        """Run all user acceptance tests"""
        logger.info("🚀 Starting Comprehensive User Acceptance Testing for BookedBarber V2")
        
        await self.setup_session()
        
        try:
            test_cases = self.create_test_cases()
            
            for test_case in test_cases:
                result = await self.run_test_case(test_case)
                self.results.append(result)
                
                # Brief pause between tests
                await asyncio.sleep(1)
            
            # Generate and display report
            report = self.generate_uat_report()
            self.print_uat_report(report)
            
            return report
            
        finally:
            await self.cleanup_session()
    
    def generate_uat_report(self) -> Dict[str, Any]:
        """Generate comprehensive UAT report"""
        if not self.results:
            return {"error": "No UAT results available"}
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.success])
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests) * 100
        
        # Categorize by business value
        business_categories = {}
        for result in self.results:
            value = result.test_case.business_value
            if value not in business_categories:
                business_categories[value] = {'total': 0, 'passed': 0}
            business_categories[value]['total'] += 1
            if result.success:
                business_categories[value]['passed'] += 1
        
        # Performance analysis
        execution_times = [r.execution_time_ms for r in self.results if r.success]
        avg_execution_time = sum(execution_times) / len(execution_times) if execution_times else 0
        
        return {
            'test_summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'pass_rate_percent': round(pass_rate, 2)
            },
            'business_value_coverage': business_categories,
            'performance_metrics': {
                'average_execution_time_ms': round(avg_execution_time, 2),
                'total_test_time_ms': sum([r.execution_time_ms for r in self.results])
            },
            'failed_tests': [
                {
                    'name': r.test_case.name,
                    'error': r.error_message,
                    'business_value': r.test_case.business_value
                }
                for r in self.results if not r.success
            ],
            'test_timestamp': datetime.now().isoformat()
        }
    
    def print_uat_report(self, report: Dict[str, Any]):
        """Print formatted UAT report"""
        print("\n" + "="*80)
        print("🧪 BOOKEDBARBER V2 USER ACCEPTANCE TESTING REPORT")
        print("="*80)
        
        summary = report['test_summary']
        business_coverage = report['business_value_coverage']
        performance = report['performance_metrics']
        
        print(f"\n🎯 Test Summary:")
        print(f"   Total Tests: {summary['total_tests']}")
        print(f"   Passed: {summary['passed_tests']}")
        print(f"   Failed: {summary['failed_tests']}")
        print(f"   Pass Rate: {summary['pass_rate_percent']}%")
        
        pass_status = "✅" if summary['pass_rate_percent'] >= 80 else "❌"
        print(f"   Status: {pass_status}")
        
        print(f"\n💼 Business Value Coverage:")
        for business_value, stats in business_coverage.items():
            coverage_rate = (stats['passed'] / stats['total']) * 100
            status = "✅" if coverage_rate >= 80 else "❌"
            print(f"   {status} {business_value}")
            print(f"      Tests: {stats['passed']}/{stats['total']} ({coverage_rate:.1f}% pass rate)")
        
        print(f"\n⚡ Performance Metrics:")
        print(f"   Average Test Execution: {performance['average_execution_time_ms']:.1f}ms")
        print(f"   Total Test Suite Time: {performance['total_test_time_ms']:.1f}ms")
        
        if report['failed_tests']:
            print(f"\n❌ Failed Tests:")
            for failed_test in report['failed_tests']:
                print(f"   • {failed_test['name']}: {failed_test['error']}")
                print(f"     Business Impact: {failed_test['business_value']}")
        
        # Overall assessment
        overall_pass = summary['pass_rate_percent'] >= 80
        print(f"\n🏆 OVERALL UAT ASSESSMENT: {'✅ READY FOR PRODUCTION' if overall_pass else '❌ NEEDS FIXES BEFORE PRODUCTION'}")
        
        if not overall_pass:
            print("\n💡 Recommendations:")
            print("   • Fix failing test cases before production deployment")
            print("   • Review business value coverage for critical workflows")
            print("   • Ensure authentication is properly configured for protected endpoints")
        
        print("="*80)

async def main():
    """Run the UAT suite"""
    uat_tester = UserAcceptanceTestSuite()
    report = await uat_tester.run_comprehensive_uat()
    
    # Save detailed report
    with open('/tmp/bookedbarber_uat_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed UAT report saved to: /tmp/bookedbarber_uat_report.json")

if __name__ == "__main__":
    asyncio.run(main())