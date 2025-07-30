"""
Comprehensive API Validation Test Suite for 6FB Booking Platform
Tests V2 API endpoints, validation, error handling, and API contracts
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import json

from main import app
from models.user import User, UserRole
from models.appointment import Appointment
from models.service import Service
from models.barber import Barber

client = TestClient(app)

class TestAPIVersioning:
    """Test API versioning and V2 endpoint migration"""
    
    def test_v2_api_endpoints_available(self):
        """Test that all critical V2 endpoints are available"""
        v2_endpoints = [
            ("/api/v2/health", "GET"),
            ("/api/v2/auth/login", "POST"),
            ("/api/v2/auth/me", "GET"),
            ("/api/v2/appointments", "GET"),
            ("/api/v2/appointments", "POST"),
            ("/api/v2/services", "GET"),
            ("/api/v2/barbers", "GET"),
            ("/api/v2/clients", "GET"),
            ("/api/v2/payments", "POST"),
            ("/api/v2/analytics", "GET"),
            ("/api/v2/ai-dashboard/unified", "GET")
        ]
        
        for endpoint, method in v2_endpoints:
            if method == "GET":
                response = client.get(
                    endpoint,
                    headers={"Authorization": "Bearer dev-token-bypass"}
                )
            else:
                response = client.request(
                    method,
                    endpoint,
                    json={},
                    headers={"Authorization": "Bearer dev-token-bypass"}
                )
            
            # Should not return 404 (endpoint exists)
            assert response.status_code != 404, f"V2 endpoint {endpoint} not found"
            # Should not return 405 (method allowed)
            assert response.status_code != 405, f"Method {method} not allowed for {endpoint}"
    
    def test_v1_api_deprecated_warnings(self):
        """Test that V1 API endpoints return deprecation warnings"""
        v1_endpoints = [
            "/api/v1/auth/login",
            "/api/v1/appointments",
            "/api/v1/services"
        ]
        
        for endpoint in v1_endpoints:
            response = client.get(endpoint)
            
            # V1 endpoints should either be redirected or return deprecation warning
            if response.status_code == 200:
                # Check for deprecation warning in headers or response
                deprecation_header = response.headers.get("Deprecation")
                warning_header = response.headers.get("Warning")
                
                assert (deprecation_header is not None or 
                       warning_header is not None or
                       "deprecated" in response.text.lower()), f"No deprecation warning for {endpoint}"
    
    def test_api_consistency_across_versions(self):
        """Test API response consistency between V1 and V2 where applicable"""
        # Test services endpoint consistency
        v1_response = client.get("/api/v1/services")
        v2_response = client.get(
            "/api/v2/services",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        
        if v1_response.status_code == 200 and v2_response.status_code == 200:
            v1_data = v1_response.json()
            v2_data = v2_response.json()
            
            # Basic structure should be similar
            if isinstance(v1_data, list) and isinstance(v2_data, list):
                if len(v1_data) > 0 and len(v2_data) > 0:
                    v1_keys = set(v1_data[0].keys())
                    v2_keys = set(v2_data[0].keys())
                    
                    # V2 should have at least the same keys as V1 (can have more)
                    missing_keys = v1_keys - v2_keys
                    assert len(missing_keys) == 0, f"V2 missing keys from V1: {missing_keys}"


class TestAuthenticationAPI:
    """Test authentication API endpoints and security"""
    
    def test_login_endpoint_validation(self):
        """Test login endpoint input validation"""
        # Test valid login
        valid_login = {
            "email": "test@example.com",
            "password": "validpassword123"
        }
        
        response = client.post("/api/v2/auth/login", json=valid_login)
        assert response.status_code in [200, 401], "Login endpoint should handle valid input"
        
        # Test invalid email format
        invalid_email = {
            "email": "notanemail",
            "password": "validpassword123"
        }
        
        response = client.post("/api/v2/auth/login", json=invalid_email)
        assert response.status_code == 422, "Should reject invalid email format"
        
        # Test missing password
        missing_password = {
            "email": "test@example.com"
        }
        
        response = client.post("/api/v2/auth/login", json=missing_password)
        assert response.status_code == 422, "Should reject missing password"
        
        # Test empty password
        empty_password = {
            "email": "test@example.com",
            "password": ""
        }
        
        response = client.post("/api/v2/auth/login", json=empty_password)
        assert response.status_code == 422, "Should reject empty password"
    
    def test_registration_endpoint_validation(self):
        """Test user registration endpoint validation"""
        # Test valid registration
        valid_registration = {
            "email": "newuser@example.com",
            "password": "StrongPassword123!",
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+1234567890",
            "role": "CLIENT"
        }
        
        response = client.post("/api/v2/auth/register", json=valid_registration)
        assert response.status_code in [201, 409], "Registration should handle valid input"
        
        # Test weak password
        weak_password = valid_registration.copy()
        weak_password["password"] = "123"
        
        response = client.post("/api/v2/auth/register", json=weak_password)
        assert response.status_code == 422, "Should reject weak password"
        
        # Test invalid phone format
        invalid_phone = valid_registration.copy()
        invalid_phone["phone"] = "notaphone"
        
        response = client.post("/api/v2/auth/register", json=invalid_phone)
        assert response.status_code == 422, "Should reject invalid phone format"
    
    def test_token_validation_endpoint(self):
        """Test token validation and user info endpoint"""
        # Test with valid dev token
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "email" in data
        assert "role" in data
        assert "user_id" in data
        
        # Test with invalid token
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401
        
        # Test without authorization header
        response = client.get("/api/v2/auth/me")
        assert response.status_code == 401


class TestAppointmentsAPI:
    """Test appointments API endpoints and business logic"""
    
    def test_appointments_list_endpoint(self):
        """Test appointments listing with filtering and pagination"""
        # Test basic appointments list
        response = client.get(
            "/api/v2/appointments",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, (list, dict)), "Response should be list or paginated object"
        
        # Test date filtering
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = client.get(
            f"/api/v2/appointments?date={tomorrow}",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        # Test status filtering
        response = client.get(
            "/api/v2/appointments?status=confirmed",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        # Test pagination
        response = client.get(
            "/api/v2/appointments?page=1&limit=10",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
    
    def test_appointment_creation_validation(self):
        """Test appointment creation with comprehensive validation"""
        # Test valid appointment creation
        valid_appointment = {
            "client_email": "client@example.com",
            "service_id": 1,
            "barber_id": 1,
            "appointment_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "duration_minutes": 60,
            "notes": "First time client"
        }
        
        response = client.post(
            "/api/v2/appointments",
            json=valid_appointment,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code in [201, 409], "Should handle valid appointment creation"
        
        # Test past date rejection
        past_appointment = valid_appointment.copy()
        past_appointment["appointment_date"] = (datetime.now() - timedelta(days=1)).isoformat()
        
        response = client.post(
            "/api/v2/appointments",
            json=past_appointment,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 422, "Should reject past appointment dates"
        
        # Test invalid email format
        invalid_email = valid_appointment.copy()
        invalid_email["client_email"] = "notanemail"
        
        response = client.post(
            "/api/v2/appointments",
            json=invalid_email,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 422, "Should reject invalid email format"
        
        # Test negative duration
        negative_duration = valid_appointment.copy()
        negative_duration["duration_minutes"] = -30
        
        response = client.post(
            "/api/v2/appointments",
            json=negative_duration,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 422, "Should reject negative duration"
    
    def test_appointment_time_conflict_detection(self):
        """Test detection of appointment time conflicts"""
        base_time = datetime.now() + timedelta(days=1)
        base_appointment = {
            "client_email": "client1@example.com",
            "service_id": 1,
            "barber_id": 1,
            "appointment_date": base_time.isoformat(),
            "duration_minutes": 60
        }
        
        # Create first appointment
        response1 = client.post(
            "/api/v2/appointments",
            json=base_appointment,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        
        # Try to create overlapping appointment
        overlapping_appointment = base_appointment.copy()
        overlapping_appointment["client_email"] = "client2@example.com"
        overlapping_appointment["appointment_date"] = (base_time + timedelta(minutes=30)).isoformat()
        
        response2 = client.post(
            "/api/v2/appointments",
            json=overlapping_appointment,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        
        # Should detect conflict (if first appointment was created successfully)
        if response1.status_code == 201:
            assert response2.status_code == 409, "Should detect appointment time conflict"
    
    def test_appointment_cancellation(self):
        """Test appointment cancellation workflow"""
        # First, try to create an appointment to cancel
        appointment_data = {
            "client_email": "cancel_test@example.com",
            "service_id": 1,
            "barber_id": 1,
            "appointment_date": (datetime.now() + timedelta(days=2)).isoformat(),
            "duration_minutes": 45
        }
        
        create_response = client.post(
            "/api/v2/appointments",
            json=appointment_data,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        
        if create_response.status_code == 201:
            appointment_id = create_response.json()["id"]
            
            # Test cancellation
            cancel_response = client.patch(
                f"/api/v2/appointments/{appointment_id}/cancel",
                json={"reason": "Client requested cancellation"},
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            assert cancel_response.status_code == 200, "Should allow appointment cancellation"
            
            # Test cancellation of already cancelled appointment
            second_cancel = client.patch(
                f"/api/v2/appointments/{appointment_id}/cancel",
                json={"reason": "Already cancelled"},
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            assert second_cancel.status_code == 409, "Should prevent double cancellation"


class TestPaymentsAPI:
    """Test payment processing API endpoints"""
    
    def test_payment_intent_creation(self):
        """Test payment intent creation for appointments"""
        payment_data = {
            "appointment_id": 123,
            "amount": 7500,  # $75.00
            "currency": "usd",
            "payment_method_types": ["card"],
            "capture_method": "automatic"
        }
        
        with patch('services.stripe_integration_service.StripeIntegrationService.create_payment_intent') as mock_create:
            mock_create.return_value = {
                "success": True,
                "payment_intent_id": "pi_test_123",
                "client_secret": "pi_test_123_secret"
            }
            
            response = client.post(
                "/api/v2/payments/create-intent",
                json=payment_data,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "client_secret" in data
            assert "payment_intent_id" in data
    
    def test_payment_validation(self):
        """Test payment amount and currency validation"""
        # Test invalid amount (too small)
        invalid_small = {
            "appointment_id": 123,
            "amount": 10,  # Less than $0.50 minimum
            "currency": "usd"
        }
        
        response = client.post(
            "/api/v2/payments/create-intent",
            json=invalid_small,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 422, "Should reject amounts below minimum"
        
        # Test invalid amount (too large)
        invalid_large = {
            "appointment_id": 123,
            "amount": 1000000,  # $10,000 - suspiciously high
            "currency": "usd"
        }
        
        response = client.post(
            "/api/v2/payments/create-intent",
            json=invalid_large,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code in [422, 400], "Should validate reasonable payment amounts"
        
        # Test invalid currency
        invalid_currency = {
            "appointment_id": 123,
            "amount": 7500,
            "currency": "invalid"
        }
        
        response = client.post(
            "/api/v2/payments/create-intent",
            json=invalid_currency,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 422, "Should reject invalid currency codes"
    
    def test_refund_processing(self):
        """Test payment refund processing"""
        refund_data = {
            "payment_intent_id": "pi_test_123",
            "amount": 7500,
            "reason": "requested_by_customer"
        }
        
        with patch('services.stripe_integration_service.StripeIntegrationService.process_refund') as mock_refund:
            mock_refund.return_value = {
                "success": True,
                "refund_id": "re_test_123",
                "amount": 7500,
                "status": "succeeded"
            }
            
            response = client.post(
                "/api/v2/payments/refund",
                json=refund_data,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "refund_id" in data


class TestAnalyticsAPI:
    """Test analytics and reporting API endpoints"""
    
    def test_revenue_analytics_endpoint(self):
        """Test revenue analytics with date filtering"""
        # Test basic revenue analytics
        response = client.get(
            "/api/v2/analytics/revenue",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        expected_keys = ["total_revenue", "period", "breakdown"]
        for key in expected_keys:
            assert key in data, f"Missing key {key} in revenue analytics"
        
        # Test date range filtering
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = client.get(
            f"/api/v2/analytics/revenue?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        # Test period grouping
        response = client.get(
            "/api/v2/analytics/revenue?period=weekly",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
    
    def test_appointment_analytics_endpoint(self):
        """Test appointment analytics and metrics"""
        response = client.get(
            "/api/v2/analytics/appointments",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        expected_metrics = ["total_appointments", "completion_rate", "no_show_rate", "cancellation_rate"]
        
        for metric in expected_metrics:
            assert metric in data, f"Missing metric {metric} in appointment analytics"
        
        # Validate metric ranges
        if "completion_rate" in data:
            assert 0 <= data["completion_rate"] <= 1, "Completion rate should be between 0 and 1"
        if "no_show_rate" in data:
            assert 0 <= data["no_show_rate"] <= 1, "No-show rate should be between 0 and 1"
    
    def test_client_analytics_endpoint(self):
        """Test client analytics and segmentation"""
        response = client.get(
            "/api/v2/analytics/clients",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        expected_segments = ["new_clients", "returning_clients", "lifetime_value", "retention_rate"]
        
        for segment in expected_segments:
            assert segment in data, f"Missing segment {segment} in client analytics"


class TestAIDashboardAPI:
    """Test AI Dashboard API endpoints"""
    
    def test_unified_dashboard_endpoint(self):
        """Test unified AI dashboard data endpoint"""
        response = client.get(
            "/api/v2/ai-dashboard/unified",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        expected_sections = [
            "business_overview",
            "ai_insights",
            "recommended_actions",
            "performance_metrics",
            "roi_tracking"
        ]
        
        for section in expected_sections:
            assert section in data, f"Missing section {section} in AI dashboard"
    
    def test_conversational_ai_endpoint(self):
        """Test conversational AI interface"""
        query_data = {
            "message": "How can I increase my revenue this month?",
            "context": {
                "timeframe": "monthly",
                "current_revenue": 8500,
                "target_revenue": 10000
            }
        }
        
        response = client.post(
            "/api/v2/ai-dashboard/chat",
            json=query_data,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "confidence" in data
        assert "sources" in data
        assert isinstance(data["confidence"], (int, float))
        assert 0 <= data["confidence"] <= 1
    
    def test_ai_insights_generation(self):
        """Test AI insights generation endpoint"""
        response = client.get(
            "/api/v2/ai-dashboard/insights",
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "insights" in data
        assert isinstance(data["insights"], list)
        
        if len(data["insights"]) > 0:
            insight = data["insights"][0]
            required_fields = ["title", "description", "priority", "action_required"]
            for field in required_fields:
                assert field in insight, f"Missing field {field} in AI insight"


class TestAPIErrorHandling:
    """Test API error handling and response consistency"""
    
    def test_404_error_handling(self):
        """Test 404 error responses are consistent"""
        non_existent_endpoints = [
            "/api/v2/nonexistent",
            "/api/v2/appointments/999999",
            "/api/v2/clients/999999",
            "/api/v2/services/999999"
        ]
        
        for endpoint in non_existent_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            if response.status_code == 404:
                data = response.json()
                assert "detail" in data, "404 responses should include detail message"
                assert isinstance(data["detail"], str), "Detail should be a string"
    
    def test_422_validation_error_handling(self):
        """Test 422 validation error responses"""
        # Test with invalid JSON structure
        invalid_appointment = {
            "client_email": "notanemail",  # Invalid email
            "appointment_date": "notadate",  # Invalid date
            "duration_minutes": "notanumber"  # Invalid type
        }
        
        response = client.post(
            "/api/v2/appointments",
            json=invalid_appointment,
            headers={"Authorization": "Bearer dev-token-bypass"}
        )
        
        if response.status_code == 422:
            data = response.json()
            assert "detail" in data, "422 responses should include validation details"
            
            # Check if using FastAPI standard format
            if isinstance(data["detail"], list):
                for error in data["detail"]:
                    assert "loc" in error, "Validation errors should include field location"
                    assert "msg" in error, "Validation errors should include message"
                    assert "type" in error, "Validation errors should include error type"
    
    def test_401_authentication_error_handling(self):
        """Test 401 authentication error responses"""
        protected_endpoints = [
            "/api/v2/auth/me",
            "/api/v2/appointments",
            "/api/v2/analytics",
            "/api/v2/ai-dashboard/unified"
        ]
        
        for endpoint in protected_endpoints:
            # Test without authentication
            response = client.get(endpoint)
            
            if response.status_code == 401:
                data = response.json()
                assert "detail" in data, "401 responses should include detail message"
                assert "authentication" in data["detail"].lower() or "token" in data["detail"].lower()
    
    def test_500_error_handling(self):
        """Test 500 internal server error handling"""
        # Test with endpoint that might cause server error
        with patch('services.ai_orchestrator_service.AIOrchestrator.process_user_query') as mock_query:
            mock_query.side_effect = Exception("Simulated server error")
            
            response = client.post(
                "/api/v2/ai-dashboard/chat",
                json={"message": "test"},
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            # Should not return 500, should be handled gracefully
            assert response.status_code != 500, "Server errors should be handled gracefully"
            
            if response.status_code >= 400:
                data = response.json()
                assert "detail" in data, "Error responses should include detail message"


class TestAPIPerformanceAndCaching:
    """Test API performance optimization and caching"""
    
    def test_response_time_requirements(self):
        """Test API response time requirements"""
        fast_endpoints = [
            ("/api/v2/health", 100),  # 100ms
            ("/api/v2/services", 300),  # 300ms
            ("/api/v2/appointments", 400),  # 400ms
        ]
        
        import time
        
        for endpoint, max_time_ms in fast_endpoints:
            start_time = time.time()
            response = client.get(
                endpoint,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                assert response_time < max_time_ms, f"{endpoint} took {response_time:.2f}ms (max: {max_time_ms}ms)"
    
    def test_caching_headers(self):
        """Test appropriate caching headers on API responses"""
        # Test static/cacheable endpoints
        cacheable_endpoints = [
            "/api/v2/services",
            "/api/v2/timezones"
        ]
        
        for endpoint in cacheable_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            if response.status_code == 200:
                # Should have appropriate cache headers
                cache_control = response.headers.get("cache-control")
                etag = response.headers.get("etag")
                
                # At least one caching mechanism should be present
                assert (cache_control is not None or etag is not None), \
                    f"Endpoint {endpoint} should have caching headers"
        
        # Test non-cacheable endpoints
        non_cacheable_endpoints = [
            "/api/v2/auth/me",
            "/api/v2/analytics",
            "/api/v2/ai-dashboard/unified"
        ]
        
        for endpoint in non_cacheable_endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            if response.status_code == 200:
                cache_control = response.headers.get("cache-control")
                if cache_control:
                    # Should prevent caching of sensitive data
                    assert ("no-cache" in cache_control or 
                           "no-store" in cache_control or
                           "private" in cache_control), \
                        f"Sensitive endpoint {endpoint} should prevent caching"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])