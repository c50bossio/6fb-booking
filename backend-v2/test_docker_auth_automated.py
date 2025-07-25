#!/usr/bin/env python3
"""
Automated Docker Authentication Consistency Testing Suite
Comprehensive testing framework for Docker auth reliability
"""

import asyncio
import json
import logging
import time
import requests
import redis
import pytest
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import subprocess
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    """Individual test result"""
    test_name: str
    success: bool
    duration_ms: float
    error_message: Optional[str] = None
    response_data: Optional[Dict] = None
    status_code: Optional[int] = None

@dataclass
class TestSuiteResult:
    """Complete test suite result"""
    timestamp: datetime
    total_tests: int
    successful_tests: int
    failed_tests: int
    success_rate: float
    average_duration_ms: float
    test_results: List[TestResult]
    environment_info: Dict
    
class DockerAuthTester:
    """Automated Docker authentication testing framework"""
    
    def __init__(self, 
                 api_base: str = "http://localhost:8000",
                 frontend_base: str = "http://localhost:3000",
                 test_email: str = "autotest@example.com",
                 test_password: str = "AutoTest123#"):
        self.api_base = api_base
        self.frontend_base = frontend_base
        self.test_email = test_email
        self.test_password = test_password
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        })
        
    def get_environment_info(self) -> Dict:
        """Get current environment information"""
        try:
            # Docker container status
            docker_ps = subprocess.run(
                ['docker-compose', 'ps', '--format', 'json'],
                capture_output=True, text=True, cwd='/Users/bossio/6fb-booking/backend-v2'
            )
            containers = []
            if docker_ps.returncode == 0:
                for line in docker_ps.stdout.strip().split('\n'):
                    if line:
                        containers.append(json.loads(line))
            
            # System info
            env_info = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'containers': containers,
                'docker_available': docker_ps.returncode == 0,
                'api_base': self.api_base,
                'frontend_base': self.frontend_base,
                'python_version': sys.version,
                'working_directory': os.getcwd()
            }
            
            # Health check
            try:
                health_response = self.session.get(f"{self.api_base}/health", timeout=5)
                env_info['backend_health'] = {
                    'status_code': health_response.status_code,
                    'response_time_ms': health_response.elapsed.total_seconds() * 1000,
                    'data': health_response.json() if health_response.status_code == 200 else None
                }
            except Exception as e:
                env_info['backend_health'] = {'error': str(e)}
            
            return env_info
            
        except Exception as e:
            logger.error(f"Failed to get environment info: {e}")
            return {'error': str(e), 'timestamp': datetime.now(timezone.utc).isoformat()}
    
    async def setup_test_user(self) -> bool:
        """Ensure test user exists"""
        try:
            user_data = {
                "email": self.test_email,
                "first_name": "Auto",
                "last_name": "Test",
                "password": self.test_password,
                "marketing_consent": False
            }
            
            response = self.session.post(
                f"{self.api_base}/api/v2/auth/register-client",
                json=user_data,
                timeout=10
            )
            
            # User creation successful or user already exists
            if response.status_code in [200, 201, 400]:
                logger.info(f"Test user setup: {response.status_code}")
                return True
            else:
                logger.warning(f"Test user setup failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Test user setup error: {e}")
            return False
    
    def test_single_login(self) -> TestResult:
        """Test a single login attempt"""
        start_time = time.time()
        
        try:
            login_data = {
                "email": self.test_email,
                "password": self.test_password
            }
            
            response = self.session.post(
                f"{self.api_base}/api/v2/auth/login",
                json=login_data,
                timeout=10
            )
            
            duration_ms = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get('access_token', '')
                token_type = data.get('token_type', '')
                
                if access_token and token_type == 'bearer':
                    return TestResult(
                        test_name="single_login",
                        success=True,
                        duration_ms=duration_ms,
                        response_data={'token_length': len(access_token)},
                        status_code=response.status_code
                    )
                else:
                    return TestResult(
                        test_name="single_login",
                        success=False,
                        duration_ms=duration_ms,
                        error_message="Invalid token response",
                        status_code=response.status_code
                    )
            else:
                return TestResult(
                    test_name="single_login",
                    success=False,
                    duration_ms=duration_ms,
                    error_message=f"HTTP {response.status_code}: {response.text}",
                    status_code=response.status_code
                )
                
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return TestResult(
                test_name="single_login",
                success=False,
                duration_ms=duration_ms,
                error_message=str(e)
            )
    
    def test_auth_me_endpoint(self, token: str) -> TestResult:
        """Test authentication validation endpoint"""
        start_time = time.time()
        
        try:
            headers = {'Authorization': f'Bearer {token}'}
            response = self.session.get(
                f"{self.api_base}/api/v2/auth/me",
                headers=headers,
                timeout=10
            )
            
            duration_ms = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                return TestResult(
                    test_name="auth_me",
                    success=True,
                    duration_ms=duration_ms,
                    response_data={'user_email': data.get('email')},
                    status_code=response.status_code
                )
            else:
                return TestResult(
                    test_name="auth_me",
                    success=False,
                    duration_ms=duration_ms,
                    error_message=f"HTTP {response.status_code}: {response.text}",
                    status_code=response.status_code
                )
                
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return TestResult(
                test_name="auth_me",
                success=False,
                duration_ms=duration_ms,
                error_message=str(e)
            )
    
    def test_health_endpoints(self) -> List[TestResult]:
        """Test all health endpoints"""
        results = []
        endpoints = [
            "/health",
            "/health/detailed", 
            "/health/docker",
            "/health/ready",
            "/health/live"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            try:
                response = self.session.get(f"{self.api_base}{endpoint}", timeout=10)
                duration_ms = (time.time() - start_time) * 1000
                
                success = response.status_code in [200, 206]  # 206 = degraded but OK
                
                results.append(TestResult(
                    test_name=f"health_{endpoint.replace('/', '_').replace('__', '_').strip('_')}",
                    success=success,
                    duration_ms=duration_ms,
                    error_message=None if success else f"HTTP {response.status_code}",
                    status_code=response.status_code
                ))
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                results.append(TestResult(
                    test_name=f"health_{endpoint.replace('/', '_').replace('__', '_').strip('_')}",
                    success=False,
                    duration_ms=duration_ms,
                    error_message=str(e)
                ))
        
        return results
    
    def test_redis_connectivity(self) -> TestResult:
        """Test Redis connectivity and session storage"""
        start_time = time.time()
        
        try:
            # Connect to Redis
            redis_client = redis.from_url("redis://localhost:6379/0", decode_responses=True)
            
            # Test basic operations
            test_key = f"auth_test_{int(time.time())}"
            test_value = "test_value"
            
            # SET operation
            redis_client.set(test_key, test_value, ex=10)
            
            # GET operation
            retrieved_value = redis_client.get(test_key)
            
            # DELETE operation
            redis_client.delete(test_key)
            
            duration_ms = (time.time() - start_time) * 1000
            
            if retrieved_value == test_value:
                return TestResult(
                    test_name="redis_connectivity",
                    success=True,
                    duration_ms=duration_ms,
                    response_data={'test_key': test_key, 'operations': 'set_get_delete'}
                )
            else:
                return TestResult(
                    test_name="redis_connectivity",
                    success=False,
                    duration_ms=duration_ms,
                    error_message="Redis operation failed"
                )
                
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return TestResult(
                test_name="redis_connectivity",
                success=False,
                duration_ms=duration_ms,
                error_message=str(e)
            )
    
    async def run_consistency_test(self, num_attempts: int = 10) -> List[TestResult]:
        """Run multiple login attempts to test consistency"""
        results = []
        
        for i in range(num_attempts):
            result = self.test_single_login()
            result.test_name = f"consistency_test_{i+1}"
            results.append(result)
            
            # Small delay between tests
            await asyncio.sleep(0.1)
        
        return results
    
    async def run_full_test_suite(self) -> TestSuiteResult:
        """Run complete automated test suite"""
        logger.info("Starting automated Docker auth test suite...")
        start_time = time.time()
        
        # Get environment info
        env_info = self.get_environment_info()
        
        # Setup test user
        user_setup_success = await self.setup_test_user()
        if not user_setup_success:
            logger.warning("Test user setup failed, but continuing with tests...")
        
        all_results = []
        
        # Test 1: Health endpoints
        logger.info("Testing health endpoints...")
        health_results = self.test_health_endpoints()
        all_results.extend(health_results)
        
        # Test 2: Redis connectivity
        logger.info("Testing Redis connectivity...")
        redis_result = self.test_redis_connectivity()
        all_results.append(redis_result)
        
        # Test 3: Single login
        logger.info("Testing single login...")
        login_result = self.test_single_login()
        all_results.append(login_result)
        
        # Test 4: Auth me endpoint (if login successful)
        if login_result.success and login_result.response_data:
            # Need to get token from a fresh login
            fresh_login = self.test_single_login()
            if fresh_login.success:
                try:
                    fresh_response = self.session.post(
                        f"{self.api_base}/api/v2/auth/login",
                        json={"email": self.test_email, "password": self.test_password}
                    )
                    if fresh_response.status_code == 200:
                        token = fresh_response.json().get('access_token')
                        if token:
                            logger.info("Testing auth me endpoint...")
                            auth_me_result = self.test_auth_me_endpoint(token)
                            all_results.append(auth_me_result)
                except Exception as e:
                    logger.warning(f"Could not test auth me endpoint: {e}")
        
        # Test 5: Consistency test
        logger.info("Running consistency test...")
        consistency_results = await self.run_consistency_test(10)
        all_results.extend(consistency_results)
        
        # Calculate overall results
        total_tests = len(all_results)
        successful_tests = sum(1 for r in all_results if r.success)
        failed_tests = total_tests - successful_tests
        success_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
        
        durations = [r.duration_ms for r in all_results if r.duration_ms > 0]
        average_duration = sum(durations) / len(durations) if durations else 0
        
        total_duration = time.time() - start_time
        logger.info(f"Test suite completed in {total_duration:.2f}s")
        
        return TestSuiteResult(
            timestamp=datetime.now(timezone.utc),
            total_tests=total_tests,
            successful_tests=successful_tests,
            failed_tests=failed_tests,
            success_rate=success_rate,
            average_duration_ms=average_duration,
            test_results=all_results,
            environment_info=env_info
        )
    
    def save_results(self, results: TestSuiteResult, output_file: str = None) -> str:
        """Save test results to JSON file"""
        if not output_file:
            timestamp = results.timestamp.strftime("%Y%m%d_%H%M%S")
            output_file = f"/tmp/docker_auth_test_results_{timestamp}.json"
        
        # Convert to serializable format
        results_dict = {
            'timestamp': results.timestamp.isoformat(),
            'summary': {
                'total_tests': results.total_tests,
                'successful_tests': results.successful_tests,
                'failed_tests': results.failed_tests,
                'success_rate': results.success_rate,
                'average_duration_ms': results.average_duration_ms
            },
            'test_results': [
                {
                    'test_name': r.test_name,
                    'success': r.success,
                    'duration_ms': r.duration_ms,
                    'error_message': r.error_message,
                    'response_data': r.response_data,
                    'status_code': r.status_code
                } for r in results.test_results
            ],
            'environment_info': results.environment_info
        }
        
        with open(output_file, 'w') as f:
            json.dump(results_dict, f, indent=2)
        
        logger.info(f"Test results saved to: {output_file}")
        return output_file
    
    def print_summary(self, results: TestSuiteResult):
        """Print human-readable test summary"""
        print("\n" + "="*60)
        print("🐳 DOCKER AUTH AUTOMATED TEST RESULTS")
        print("="*60)
        print(f"📅 Timestamp: {results.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"📊 Total Tests: {results.total_tests}")
        print(f"✅ Successful: {results.successful_tests}")
        print(f"❌ Failed: {results.failed_tests}")
        print(f"📈 Success Rate: {results.success_rate:.1f}%")
        print(f"⏱️  Average Duration: {results.average_duration_ms:.1f}ms")
        
        if results.success_rate == 100:
            print("🎉 PERFECT SCORE! All tests passed!")
        elif results.success_rate >= 90:
            print("✅ EXCELLENT! High success rate.")
        elif results.success_rate >= 75:
            print("⚠️  GOOD but needs attention.")
        else:
            print("🚨 CRITICAL! Many tests failing.")
        
        print("\n📋 Individual Test Results:")
        print("-" * 60)
        
        for result in results.test_results:
            status = "✅" if result.success else "❌"
            duration = f"{result.duration_ms:.1f}ms" if result.duration_ms else "N/A"
            print(f"{status} {result.test_name:<30} {duration:>8}")
            if not result.success and result.error_message:
                print(f"   └─ Error: {result.error_message}")
        
        print("\n" + "="*60)


async def main():
    """Main test execution"""
    tester = DockerAuthTester()
    
    try:
        results = await tester.run_full_test_suite()
        tester.print_summary(results)
        output_file = tester.save_results(results)
        
        # Exit with appropriate code
        if results.success_rate >= 90:
            print(f"\n🎯 Tests completed successfully! Results: {output_file}")
            sys.exit(0)
        else:
            print(f"\n⚠️  Some tests failed. Results: {output_file}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Test suite failed: {e}")
        print(f"\n🚨 Test suite execution failed: {e}")
        sys.exit(2)


if __name__ == "__main__":
    # For pytest compatibility
    if len(sys.argv) > 1 and 'pytest' in sys.argv[0]:
        pytest.main(sys.argv[1:])
    else:
        asyncio.run(main())