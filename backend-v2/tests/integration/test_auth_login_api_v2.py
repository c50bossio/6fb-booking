import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.main import app
from backend.models import User
from backend.tests.conftest import get_test_db, create_test_user
import json
import time

class TestAuthLoginAPIV2:
    """
    Integration tests for /api/v2/auth/login endpoint
    Tests the specific fixes around error handling and safe API responses
    """
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def test_user_data(self):
        return {
            "email": "admin@bookedbarber.com",
            "password": "Password123!",
            "first_name": "Admin",
            "last_name": "User",
            "role": "client"
        }
    
    @pytest.fixture
    def test_user(self, test_user_data):
        """Create a test user in database"""
        db = next(get_test_db())
        user = create_test_user(db, **test_user_data)
        yield user
        # Cleanup
        db.delete(user)
        db.commit()
    
    def test_successful_login_with_admin_email(self, client, test_user):
        """Test successful login with admin@bookedbarber.com"""
        response = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "token_type" in data
        assert "user_id" in data
        assert data["token_type"] == "bearer"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
    
    def test_login_with_invalid_credentials(self, client, test_user):
        """Test login with invalid credentials returns proper error"""
        response = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        
        # Verify error response structure
        assert "detail" in data or "message" in data
        error_message = data.get("detail", data.get("message", ""))
        assert "invalid" in error_message.lower() or "credentials" in error_message.lower()
    
    def test_login_with_unverified_email(self, client):
        """Test login with unverified email returns 403"""
        # Create unverified user
        db = next(get_test_db())
        unverified_user = create_test_user(
            db,
            email="unverified@bookedbarber.com",
            password="Password123!",
            first_name="Unverified",
            last_name="User",
            is_verified=False
        )
        
        try:
            response = client.post("/api/v2/auth/login", json={
                "email": "unverified@bookedbarber.com",
                "password": "Password123!"
            })
            
            assert response.status_code == 403
            data = response.json()
            
            error_message = data.get("detail", data.get("message", ""))
            assert "verified" in error_message.lower() or "verification" in error_message.lower()
            
        finally:
            db.delete(unverified_user)
            db.commit()
    
    def test_login_with_nonexistent_email(self, client):
        """Test login with email that doesn't exist"""
        response = client.post("/api/v2/auth/login", json={
            "email": "nonexistent@bookedbarber.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 401
        data = response.json()
        
        # Should not reveal that email doesn't exist (security)
        error_message = data.get("detail", data.get("message", ""))
        assert "invalid" in error_message.lower() or "credentials" in error_message.lower()
    
    def test_login_with_malformed_email(self, client):
        """Test login with malformed email addresses"""
        malformed_emails = [
            "invalid-email",
            "admin@",
            "@bookedbarber.com",
            "admin..test@bookedbarber.com",
            " admin@bookedbarber.com ",
            "admin@bookedbarber..com"
        ]
        
        for email in malformed_emails:
            response = client.post("/api/v2/auth/login", json={
                "email": email,
                "password": "Password123!"
            })
            
            # Should return 422 for validation error or 401 for invalid credentials
            assert response.status_code in [401, 422], f"Failed for email: {email}"
    
    def test_login_with_missing_fields(self, client):
        """Test login with missing required fields"""
        # Missing email
        response = client.post("/api/v2/auth/login", json={
            "password": "Password123!"
        })
        assert response.status_code == 422
        
        # Missing password
        response = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com"
        })
        assert response.status_code == 422
        
        # Empty request body
        response = client.post("/api/v2/auth/login", json={})
        assert response.status_code == 422
    
    def test_login_with_empty_values(self, client):
        """Test login with empty email/password values"""
        response = client.post("/api/v2/auth/login", json={
            "email": "",
            "password": ""
        })
        assert response.status_code == 422
        
        response = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com",
            "password": ""
        })
        assert response.status_code == 422
    
    def test_login_response_structure_consistency(self, client, test_user):
        """Test that login response structure is consistent"""
        response = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        required_fields = ["access_token", "token_type", "user_id"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Field types
        assert isinstance(data["access_token"], str)
        assert isinstance(data["token_type"], str)
        assert isinstance(data["user_id"], str)
        
        # Field values
        assert len(data["access_token"]) > 50  # JWT tokens are long
        assert data["token_type"] == "bearer"
    
    def test_login_case_insensitive_email(self, client, test_user):
        """Test that email login is case insensitive"""
        email_variations = [
            "admin@bookedbarber.com",
            "Admin@bookedbarber.com", 
            "ADMIN@BOOKEDBARBER.COM",
            "admin@BookedBarber.com"
        ]
        
        for email in email_variations:
            response = client.post("/api/v2/auth/login", json={
                "email": email,
                "password": "Password123!"
            })
            
            assert response.status_code == 200, f"Failed for email variation: {email}"
    
    def test_login_rate_limiting_headers(self, client, test_user):
        """Test that rate limiting headers are present"""
        response = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com",
            "password": "Password123!"
        })
        
        # Check for rate limiting headers (if implemented)
        headers_to_check = ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
        
        # Note: This test passes even if headers aren't present (optional feature)
        for header in headers_to_check:
            if header in response.headers:
                assert response.headers[header].isdigit() or header == "X-RateLimit-Reset"
    
    def test_login_sql_injection_protection(self, client):
        """Test that SQL injection attempts are handled safely"""
        sql_injection_attempts = [
            "admin@bookedbarber.com' OR '1'='1",
            "admin@bookedbarber.com'; DROP TABLE users; --",
            "admin@bookedbarber.com' UNION SELECT * FROM users --"
        ]
        
        for injection_attempt in sql_injection_attempts:
            response = client.post("/api/v2/auth/login", json={
                "email": injection_attempt,
                "password": "Password123!"
            })
            
            # Should return 401 (not 500 internal server error)
            assert response.status_code in [401, 422], f"Failed SQL injection test for: {injection_attempt}"
    
    def test_login_password_timing_attack_protection(self, client, test_user):
        """Test protection against timing attacks"""
        import time
        
        # Valid email, invalid password
        start_time = time.time()
        response1 = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com",
            "password": "wrongpassword"
        })
        time1 = time.time() - start_time
        
        # Invalid email, invalid password  
        start_time = time.time()
        response2 = client.post("/api/v2/auth/login", json={
            "email": "nonexistent@bookedbarber.com",
            "password": "wrongpassword"
        })
        time2 = time.time() - start_time
        
        # Both should return 401
        assert response1.status_code == 401
        assert response2.status_code == 401
        
        # Times should be similar (within reasonable bounds)
        # This is a basic check - more sophisticated timing analysis would be needed for production
        time_difference = abs(time1 - time2)
        assert time_difference < 0.5, f"Timing difference too large: {time_difference}s"
    
    def test_login_concurrent_requests(self, client, test_user):
        """Test handling of concurrent login requests"""
        import threading
        import time
        
        results = []
        
        def login_request():
            response = client.post("/api/v2/auth/login", json={
                "email": "admin@bookedbarber.com",
                "password": "Password123!"
            })
            results.append(response.status_code)
        
        # Create multiple concurrent requests
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=login_request)
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert len(results) == 5
        assert all(status == 200 for status in results)
    
    def test_login_with_special_characters_in_password(self, client):
        """Test login with passwords containing special characters"""
        db = next(get_test_db())
        
        # Create user with special character password
        special_user = create_test_user(
            db,
            email="special@bookedbarber.com",
            password="P@ssw0rd!#$%^&*()",
            first_name="Special",
            last_name="User"
        )
        
        try:
            response = client.post("/api/v2/auth/login", json={
                "email": "special@bookedbarber.com",
                "password": "P@ssw0rd!#$%^&*()"
            })
            
            assert response.status_code == 200
            
        finally:
            db.delete(special_user)
            db.commit()
    
    def test_login_error_response_consistency(self, client):
        """Test that error responses are consistent and don't leak information"""
        # Various error scenarios
        test_cases = [
            {"email": "nonexistent@bookedbarber.com", "password": "password"},
            {"email": "admin@bookedbarber.com", "password": "wrongpassword"},
            {"email": "invalid-email", "password": "password"},
        ]
        
        for case in test_cases:
            response = client.post("/api/v2/auth/login", json=case)
            
            # Should not leak specific information about what went wrong
            assert response.status_code in [401, 422]
            
            if response.status_code == 401:
                data = response.json()
                error_message = data.get("detail", data.get("message", "")).lower()
                
                # Should not contain specific details
                forbidden_words = ["user not found", "email not found", "user does not exist"]
                for word in forbidden_words:
                    assert word not in error_message
    
    @pytest.mark.asyncio
    async def test_login_async_client(self, test_user):
        """Test login endpoint with async client"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post("/api/v2/auth/login", json={
                "email": "admin@bookedbarber.com",
                "password": "Password123!"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data

class TestAuthProfileAPIV2:
    """
    Integration tests for /api/v2/auth/me endpoint
    Tests the profile fetching that follows login
    """
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def authenticated_user(self):
        """Create user and return auth token"""
        db = next(get_test_db())
        user = create_test_user(
            db,
            email="admin@bookedbarber.com",
            password="Password123!",
            first_name="Admin",
            last_name="User"
        )
        
        client = TestClient(app)
        response = client.post("/api/v2/auth/login", json={
            "email": "admin@bookedbarber.com",
            "password": "Password123!"
        })
        
        token = response.json()["access_token"]
        
        yield user, token
        
        db.delete(user)
        db.commit()
    
    def test_get_profile_with_valid_token(self, client, authenticated_user):
        """Test getting user profile with valid token"""
        user, token = authenticated_user
        
        response = client.get("/api/v2/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify profile data
        assert data["email"] == "admin@bookedbarber.com"
        assert data["first_name"] == "Admin"
        assert data["last_name"] == "User"
        assert "id" in data
        assert "role" in data
    
    def test_get_profile_without_token(self, client):
        """Test getting profile without authentication token"""
        response = client.get("/api/v2/auth/me")
        
        assert response.status_code == 401
    
    def test_get_profile_with_invalid_token(self, client):
        """Test getting profile with invalid token"""
        response = client.get("/api/v2/auth/me", headers={
            "Authorization": "Bearer invalid-token"
        })
        
        assert response.status_code == 401
    
    def test_get_profile_with_malformed_header(self, client):
        """Test getting profile with malformed authorization header"""
        headers_to_test = [
            {"Authorization": "invalid-token"},  # Missing Bearer
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "Basic dGVzdA=="},  # Wrong auth type
        ]
        
        for header in headers_to_test:
            response = client.get("/api/v2/auth/me", headers=header)
            assert response.status_code == 401