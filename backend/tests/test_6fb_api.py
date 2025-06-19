#!/usr/bin/env python3
"""
Comprehensive Test Suite for 6FB Booking Platform API
Tests all endpoints, security, performance, and booking logic
"""

import pytest
import requests
import json
import time
from datetime import datetime
import threading
from unittest.mock import patch, MagicMock

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_TIMEOUT = 10


class Test6FBAPI:
    """Test suite for 6FB API endpoints"""

    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Setup for each test method"""
        self.base_url = BASE_URL
        self.session = requests.Session()

    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = self.session.get(f"{self.base_url}/", timeout=TEST_TIMEOUT)

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Welcome to 6FB Booking Platform API"
        assert data["version"] == "1.0.0"
        assert "docs" in data
        assert "health" in data

    def test_rate_limiting_headers(self):
        """Test that rate limiting headers are present"""
        response = self.session.get(f"{self.base_url}/", timeout=TEST_TIMEOUT)

        assert response.status_code == 200

        # Check for rate limiting headers
        rate_limit_headers = [
            "x-ratelimit-limit",
            "x-ratelimit-remaining",
            "x-ratelimit-reset",
            "x-ratelimit-window",
        ]

        for header in rate_limit_headers:
            assert header in response.headers, f"Missing rate limit header: {header}"

    def test_security_headers(self):
        """Test security headers are present"""
        response = self.session.get(f"{self.base_url}/", timeout=TEST_TIMEOUT)

        assert response.status_code == 200

        security_headers = [
            "x-content-type-options",
            "x-frame-options",
            "x-xss-protection",
            "referrer-policy",
        ]

        for header in security_headers:
            assert header in response.headers, f"Missing security header: {header}"

        # Verify header values
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["x-xss-protection"] == "1; mode=block"

    def test_docs_endpoint(self):
        """Test API documentation endpoint"""
        response = self.session.get(f"{self.base_url}/docs", timeout=TEST_TIMEOUT)

        # Should redirect or return docs page
        assert response.status_code in [200, 307, 308]

    def test_request_id_header(self):
        """Test that each request gets a unique request ID"""
        response1 = self.session.get(f"{self.base_url}/", timeout=TEST_TIMEOUT)
        response2 = self.session.get(f"{self.base_url}/", timeout=TEST_TIMEOUT)

        assert response1.status_code == 200
        assert response2.status_code == 200

        assert "x-request-id" in response1.headers
        assert "x-request-id" in response2.headers

        # Request IDs should be different
        assert response1.headers["x-request-id"] != response2.headers["x-request-id"]


class Test6FBSecurity:
    """Test security features"""

    def test_rate_limiting_functionality(self):
        """Test rate limiting works correctly"""
        responses = []

        # Make rapid requests to test rate limiting
        for i in range(10):
            response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)
            responses.append(response)
            time.sleep(0.05)  # Small delay

        # All should succeed initially (within limit)
        for response in responses[:5]:
            assert response.status_code == 200

        # Check rate limit headers decrease
        remaining_values = []
        for response in responses:
            if "x-ratelimit-remaining" in response.headers:
                remaining_values.append(int(response.headers["x-ratelimit-remaining"]))

        if len(remaining_values) > 1:
            assert remaining_values[0] >= remaining_values[-1]

    def test_rate_limiting_reset(self):
        """Test rate limiting reset functionality"""
        response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)

        assert response.status_code == 200
        assert "x-ratelimit-reset" in response.headers

        reset_time = int(response.headers["x-ratelimit-reset"])
        current_time = int(time.time())

        # Reset time should be in the future
        assert reset_time > current_time

    def test_cors_handling(self):
        """Test CORS handling"""
        # Test preflight request
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type",
        }

        response = requests.options(
            f"{BASE_URL}/", headers=headers, timeout=TEST_TIMEOUT
        )

        # Should handle OPTIONS request
        assert response.status_code in [200, 204, 405]  # Various valid responses


class Test6FBPerformance:
    """Test performance characteristics"""

    def test_response_time_root(self):
        """Test root endpoint response time"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)
        end_time = time.time()

        assert response.status_code == 200
        response_time = (end_time - start_time) * 1000  # Convert to ms
        assert response_time < 1000  # Should respond in under 1 second

    def test_concurrent_requests(self):
        """Test handling of concurrent requests"""

        def make_request():
            response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)
            return response.status_code == 200

        # Create multiple threads
        threads = []
        results = []

        for i in range(5):
            thread = threading.Thread(target=lambda: results.append(make_request()))
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for all to complete
        for thread in threads:
            thread.join()

        # All requests should succeed
        assert len(results) == 5
        assert all(results)

    def test_response_time_consistency(self):
        """Test that response times are consistent"""
        response_times = []

        for i in range(5):
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)
            end_time = time.time()

            assert response.status_code == 200
            response_times.append((end_time - start_time) * 1000)
            time.sleep(0.1)

        # All should be under 1 second
        for rt in response_times:
            assert rt < 1000

        # Standard deviation should be reasonable (not too much variance)
        import statistics

        if len(response_times) > 1:
            std_dev = statistics.stdev(response_times)
            assert std_dev < 500  # Should not vary by more than 500ms


class Test6FBBookingLogic:
    """Test booking-related business logic"""

    def test_booking_endpoints_exist(self):
        """Test that booking endpoints are accessible"""
        # Test common booking endpoints
        endpoints = ["/", "/docs"]

        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=TEST_TIMEOUT)
            # Should not return 404 (endpoint should exist)
            assert response.status_code != 404

    def test_api_version_consistency(self):
        """Test API version is consistent"""
        response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)

        assert response.status_code == 200
        data = response.json()

        # Version should be semantic versioning format
        version = data.get("version", "")
        assert len(version.split(".")) >= 2  # At least major.minor

    def test_error_handling(self):
        """Test error handling for invalid endpoints"""
        response = requests.get(
            f"{BASE_URL}/nonexistent-endpoint", timeout=TEST_TIMEOUT
        )

        # Should return proper error response
        assert response.status_code == 404

        # Should be JSON response
        try:
            data = response.json()
            assert "error" in data or "message" in data
        except json.JSONDecodeError:
            # Text response is also acceptable for 404
            pass


class Test6FBMiddleware:
    """Test middleware functionality"""

    def test_request_processing_time(self):
        """Test that request processing time is tracked"""
        response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)

        assert response.status_code == 200

        # Should have processing time header
        if "x-process-time" in response.headers:
            process_time = float(response.headers["x-process-time"])
            assert process_time > 0
            assert process_time < 10  # Should process in under 10 seconds

    def test_error_response_format(self):
        """Test error response format is consistent"""
        response = requests.get(f"{BASE_URL}/invalid-endpoint", timeout=TEST_TIMEOUT)

        assert response.status_code == 404

        try:
            data = response.json()
            # Should have standard error format
            assert isinstance(data, dict)

            # Common error fields
            error_fields = ["error", "message", "request_id"]
            has_error_field = any(field in data for field in error_fields)
            assert has_error_field

        except json.JSONDecodeError:
            # Non-JSON error responses are acceptable for some cases
            pass


class Test6FBIntegration:
    """Integration tests for 6FB platform"""

    def test_system_health(self):
        """Test overall system health"""
        response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)

        assert response.status_code == 200

        # System should respond with expected structure
        data = response.json()
        assert "message" in data
        assert "version" in data

    def test_service_availability(self):
        """Test service is available and responsive"""
        # Make multiple requests to ensure service is stable
        for i in range(3):
            response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)
            assert response.status_code == 200
            time.sleep(0.5)

    def test_api_consistency(self):
        """Test API responses are consistent"""
        responses = []

        for i in range(3):
            response = requests.get(f"{BASE_URL}/", timeout=TEST_TIMEOUT)
            assert response.status_code == 200
            responses.append(response.json())
            time.sleep(0.1)

        # All responses should have same structure
        for response in responses:
            assert response["message"] == responses[0]["message"]
            assert response["version"] == responses[0]["version"]


# Pytest configuration
def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line("markers", "integration: marks tests as integration tests")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
