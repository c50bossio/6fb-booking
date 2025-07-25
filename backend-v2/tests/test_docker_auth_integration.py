"""
Pytest integration for Docker Authentication Tests
Integrates automated Docker auth testing with the main test suite
"""

import pytest
import asyncio
import json
import os
import sys
from pathlib import Path

# Add parent directory to path to import our test module
sys.path.insert(0, str(Path(__file__).parent.parent))

from test_docker_auth_automated import DockerAuthTester, TestResult, TestSuiteResult

# Test configuration
DOCKER_API_BASE = os.getenv("DOCKER_API_BASE", "http://localhost:8000")
DOCKER_FRONTEND_BASE = os.getenv("DOCKER_FRONTEND_BASE", "http://localhost:3000")
TEST_EMAIL = os.getenv("DOCKER_TEST_EMAIL", "pytest@example.com")
TEST_PASSWORD = os.getenv("DOCKER_TEST_PASSWORD", "PyTest123#")

@pytest.fixture(scope="session")
def docker_tester():
    """Create DockerAuthTester instance for the session"""
    return DockerAuthTester(
        api_base=DOCKER_API_BASE,
        frontend_base=DOCKER_FRONTEND_BASE,
        test_email=TEST_EMAIL,
        test_password=TEST_PASSWORD
    )

@pytest.fixture(scope="session")
async def test_user_setup(docker_tester):
    """Ensure test user exists before running tests"""
    success = await docker_tester.setup_test_user()
    return success

class TestDockerAuthIntegration:
    """Docker Authentication Integration Tests"""
    
    @pytest.mark.asyncio
    async def test_environment_info(self, docker_tester):
        """Test that we can get environment information"""
        env_info = docker_tester.get_environment_info()
        
        assert "timestamp" in env_info
        assert "docker_available" in env_info
        assert "api_base" in env_info
        assert env_info["api_base"] == DOCKER_API_BASE
        
    @pytest.mark.asyncio
    async def test_user_setup(self, docker_tester):
        """Test that test user can be created/verified"""
        success = await docker_tester.setup_test_user()
        assert success, "Test user setup should succeed or user should already exist"
    
    def test_health_endpoints(self, docker_tester):
        """Test all health endpoints are responding"""
        results = docker_tester.test_health_endpoints()
        
        assert len(results) > 0, "Should have health endpoint results"
        
        # Check that basic health endpoint works
        basic_health = next((r for r in results if r.test_name == "health"), None)
        assert basic_health is not None, "Basic health endpoint should be tested"
        assert basic_health.success, f"Basic health should succeed: {basic_health.error_message}"
        
        # Check that Docker health endpoint works  
        docker_health = next((r for r in results if r.test_name == "health_docker"), None)
        assert docker_health is not None, "Docker health endpoint should be tested"
        assert docker_health.success, f"Docker health should succeed: {docker_health.error_message}"
    
    def test_redis_connectivity(self, docker_tester):
        """Test Redis connectivity and operations"""
        result = docker_tester.test_redis_connectivity()
        
        assert result.test_name == "redis_connectivity"
        assert result.success, f"Redis connectivity should work: {result.error_message}"
        assert result.duration_ms > 0, "Test should have measurable duration"
        
        if result.response_data:
            assert "test_key" in result.response_data
            assert "operations" in result.response_data
    
    @pytest.mark.asyncio 
    async def test_single_login(self, docker_tester, test_user_setup):
        """Test a single login attempt"""
        assert test_user_setup, "Test user should be set up before login test"
        
        result = docker_tester.test_single_login()
        
        assert result.test_name == "single_login"
        assert result.success, f"Single login should succeed: {result.error_message}"
        assert result.status_code == 200, f"Should get 200 status code, got {result.status_code}"
        assert result.duration_ms > 0, "Login should have measurable duration"
        
        if result.response_data:
            assert "token_length" in result.response_data
            assert result.response_data["token_length"] > 0, "Should get a valid token"
    
    @pytest.mark.asyncio
    async def test_auth_me_endpoint(self, docker_tester, test_user_setup):
        """Test the auth me endpoint with valid token"""
        assert test_user_setup, "Test user should be set up before auth me test"
        
        # First get a token
        login_result = docker_tester.test_single_login()
        assert login_result.success, "Need successful login to test auth me"
        
        # Get fresh token by making direct request
        import requests
        login_response = requests.post(
            f"{DOCKER_API_BASE}/api/v2/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200, "Should get valid login response"
        
        token = login_response.json().get("access_token")
        assert token, "Should get access token from login"
        
        # Test auth me endpoint
        result = docker_tester.test_auth_me_endpoint(token)
        
        assert result.test_name == "auth_me"
        assert result.success, f"Auth me should succeed: {result.error_message}"
        assert result.status_code == 200, f"Should get 200 status code, got {result.status_code}"
        
        if result.response_data:
            assert "user_email" in result.response_data
            assert result.response_data["user_email"] == TEST_EMAIL
    
    @pytest.mark.asyncio
    async def test_consistency_batch(self, docker_tester, test_user_setup):
        """Test authentication consistency with multiple attempts"""
        assert test_user_setup, "Test user should be set up before consistency test"
        
        results = await docker_tester.run_consistency_test(5)  # Smaller batch for pytest
        
        assert len(results) == 5, "Should have 5 consistency test results"
        
        successful_tests = sum(1 for r in results if r.success)
        success_rate = (successful_tests / len(results)) * 100
        
        assert success_rate >= 80, f"Consistency test should have >=80% success rate, got {success_rate}%"
        
        # Check that all results have proper structure
        for i, result in enumerate(results):
            assert result.test_name == f"consistency_test_{i+1}"
            assert result.duration_ms > 0, f"Test {i+1} should have duration"
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_full_test_suite(self, docker_tester):
        """Test the complete automated test suite"""
        results = await docker_tester.run_full_test_suite()
        
        assert isinstance(results, TestSuiteResult)
        assert results.total_tests > 0, "Should have run some tests"
        assert results.success_rate >= 70, f"Test suite should have >=70% success rate, got {results.success_rate}%"
        assert len(results.test_results) == results.total_tests
        assert results.environment_info is not None
        
        # Check key test categories are included
        test_names = [r.test_name for r in results.test_results]
        
        # Should have health tests
        health_tests = [name for name in test_names if "health" in name]
        assert len(health_tests) > 0, "Should have health endpoint tests"
        
        # Should have redis test
        redis_tests = [name for name in test_names if "redis" in name]
        assert len(redis_tests) > 0, "Should have Redis connectivity test"
        
        # Should have consistency tests
        consistency_tests = [name for name in test_names if "consistency" in name]
        assert len(consistency_tests) > 0, "Should have consistency tests"
    
    @pytest.mark.parametrize("endpoint", [
        "/health",
        "/health/detailed",
        "/health/docker",
        "/health/ready", 
        "/health/live"
    ])
    def test_individual_health_endpoints(self, docker_tester, endpoint):
        """Test individual health endpoints"""
        import requests
        
        response = requests.get(f"{DOCKER_API_BASE}{endpoint}", timeout=10)
        
        # Allow 200 (healthy) or 206 (degraded but functional)
        assert response.status_code in [200, 206], f"Health endpoint {endpoint} should respond with 200 or 206, got {response.status_code}"
        
        try:
            data = response.json()
            assert "status" in data or "timestamp" in data, f"Health endpoint {endpoint} should return status information"
        except json.JSONDecodeError:
            pytest.fail(f"Health endpoint {endpoint} should return valid JSON")
    
    @pytest.mark.integration
    def test_results_serialization(self, docker_tester):
        """Test that test results can be properly serialized"""
        # Create a sample result
        result = TestResult(
            test_name="serialization_test",
            success=True,
            duration_ms=123.45,
            response_data={"test": "data"},
            status_code=200
        )
        
        # Test that it can be converted to dict for JSON serialization
        result_dict = {
            'test_name': result.test_name,
            'success': result.success,
            'duration_ms': result.duration_ms,
            'error_message': result.error_message,
            'response_data': result.response_data,
            'status_code': result.status_code
        }
        
        # Test JSON serialization
        json_str = json.dumps(result_dict)
        assert json_str, "Result should be JSON serializable"
        
        # Test deserialization
        loaded_data = json.loads(json_str)
        assert loaded_data['test_name'] == "serialization_test"
        assert loaded_data['success'] is True
        assert loaded_data['duration_ms'] == 123.45

# Pytest configuration and markers
pytestmark = pytest.mark.docker_auth

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "docker_auth: marks tests as Docker authentication tests"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )

# Custom test collection
def pytest_collection_modifyitems(config, items):
    """Modify test collection to add appropriate markers"""
    for item in items:
        # Mark all tests in this file as docker_auth tests
        if "test_docker_auth_integration" in str(item.fspath):
            item.add_marker(pytest.mark.docker_auth)
            
        # Mark slow tests
        if "full_test_suite" in item.name:
            item.add_marker(pytest.mark.slow)
            
        # Mark integration tests
        if any(keyword in item.name for keyword in ["integration", "full_test_suite", "consistency"]):
            item.add_marker(pytest.mark.integration)

# Fixtures for environment setup
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up test environment before running Docker auth tests"""
    # Check if Docker is available
    import subprocess
    try:
        subprocess.run(["docker", "info"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pytest.skip("Docker is not available")
    
    # Check if containers are running
    try:
        result = subprocess.run(
            ["docker-compose", "ps"], 
            check=True, 
            capture_output=True, 
            text=True,
            cwd=Path(__file__).parent.parent
        )
        if "Up" not in result.stdout:
            pytest.skip("Docker containers are not running")
    except subprocess.CalledProcessError:
        pytest.skip("Docker compose is not available or containers not running")

@pytest.fixture(scope="session")
def test_results_directory(tmp_path_factory):
    """Create temporary directory for test results"""
    return tmp_path_factory.mktemp("docker_auth_test_results")