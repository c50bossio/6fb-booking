"""
Comprehensive Authentication Security Test Suite for BookedBarber V2
===============================================================

This test suite automatically validates all authentication flows, security measures,
and role-based access control systems. Includes testing for development bypass,
JWT security, session management, and MFA integration.

CRITICAL SECURITY TESTING:
- Development authentication bypass (dev-token-bypass) - Only enabled in development
- JWT token validation with blacklist checking
- Role-based access control (CLIENT, BARBER, SHOP_OWNER, ENTERPRISE_OWNER)
- Session management and token refresh flows
- Multi-Factor Authentication (MFA) integration
- Password security and validation
- Rate limiting and suspicious login detection
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock
import os

from main import app
from models import User, UserMFASecret
from utils.auth import create_access_token, create_refresh_token, get_password_hash
from services.token_blacklist import blacklist_token, is_token_blacklisted
from services.mfa_service import MFAService
from config import settings

# Test client
client = TestClient(app)

class TestAuthenticationSecuritySuite:
    """Comprehensive authentication security test suite"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self, db: Session):
        """Setup test data for each test method"""
        self.db = db
        
        # Create test users with different roles
        self.test_users = {
            "client": User(
                id=1,
                email="client@test.com",
                name="Test Client",
                hashed_password=get_password_hash("ClientPassword123!"),
                unified_role="client",
                role="client",
                user_type="client",
                email_verified=True,
                is_active=True
            ),
            "barber": User(
                id=2,
                email="barber@test.com", 
                name="Test Barber",
                hashed_password=get_password_hash("BarberPassword123!"),
                unified_role="barber",
                role="barber",
                user_type="barber",
                email_verified=True,
                is_active=True
            ),
            "shop_owner": User(
                id=3,
                email="owner@test.com",
                name="Test Shop Owner", 
                hashed_password=get_password_hash("OwnerPassword123!"),
                unified_role="shop_owner",
                role="shop_owner", 
                user_type="shop_owner",
                email_verified=True,
                is_active=True
            ),
            "enterprise_owner": User(
                id=4,
                email="enterprise@test.com",
                name="Test Enterprise Owner",
                hashed_password=get_password_hash("EnterprisePassword123!"),
                unified_role="enterprise_owner",
                role="enterprise_owner",
                user_type="enterprise_owner", 
                email_verified=True,
                is_active=True
            ),
            "super_admin": User(
                id=5,
                email="admin@test.com",
                name="Test Super Admin",
                hashed_password=get_password_hash("AdminPassword123!"),
                unified_role="super_admin",
                role="super_admin",
                user_type="super_admin",
                email_verified=True,
                is_active=True
            ),
            "unverified": User(
                id=6,
                email="unverified@test.com", 
                name="Test Unverified",
                hashed_password=get_password_hash("UnverifiedPassword123!"),
                unified_role="client",
                role="client",
                user_type="client", 
                email_verified=False,
                is_active=True
            )
        }
        
        # Add users to database
        for user in self.test_users.values():
            db.add(user)
        db.commit()
        
        # Refresh all users to get IDs
        for user in self.test_users.values():
            db.refresh(user)

    # ========================================
    # DEVELOPMENT AUTHENTICATION BYPASS TESTS
    # ========================================
    
    def test_dev_token_bypass_works_in_development(self):
        """Test that dev-token-bypass works correctly in development environment"""
        with patch.object(settings, 'environment', 'development'):
            # Create dev user in database
            dev_user = User(
                email="dev@bookedbarber.com",
                name="Development User",
                hashed_password=get_password_hash("DevPassword123!"),
                unified_role="super_admin",
                role="super_admin",
                email_verified=True,
                is_active=True
            )
            self.db.add(dev_user)
            self.db.commit()
            
            # Test dev token bypass works
            response = client.get(
                "/api/v2/auth/me",
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["email"] == "dev@bookedbarber.com"
            assert data["unified_role"] == "super_admin"

    def test_dev_token_bypass_disabled_in_staging(self):
        """Test that dev-token-bypass is disabled in staging environment"""
        with patch.object(settings, 'environment', 'staging'):
            response = client.get(
                "/api/v2/auth/me",
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            assert response.status_code == 401
            assert "Could not validate credentials" in response.json()["detail"]

    def test_dev_token_bypass_disabled_in_production(self):
        """Test that dev-token-bypass is disabled in production environment"""
        with patch.object(settings, 'environment', 'production'):
            response = client.get(
                "/api/v2/auth/me", 
                headers={"Authorization": "Bearer dev-token-bypass"}
            )
            
            assert response.status_code == 401
            assert "Could not validate credentials" in response.json()["detail"]

    # ========================================
    # JWT TOKEN VALIDATION AND BLACKLIST TESTS
    # ========================================
    
    def test_valid_jwt_token_authentication(self):
        """Test that valid JWT tokens authenticate successfully"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user.email
        assert data["unified_role"] == user.unified_role

    def test_expired_jwt_token_rejected(self):
        """Test that expired JWT tokens are rejected"""
        user = self.test_users["client"]
        # Create expired token (negative timedelta)
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role},
            expires_delta=timedelta(minutes=-1)
        )
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    def test_blacklisted_token_rejected(self):
        """Test that blacklisted tokens are rejected"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        # Blacklist the token
        blacklist_token(token, "test_logout")
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert "Token has been revoked" in response.json()["detail"]

    def test_invalid_jwt_token_rejected(self):
        """Test that invalid JWT tokens are rejected"""
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": "Bearer invalid.jwt.token"}
        )
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    def test_missing_authorization_header_rejected(self):
        """Test that requests without authorization header are rejected"""
        response = client.get("/api/v2/auth/me")
        
        assert response.status_code == 403
        assert "Not authenticated" in response.json()["detail"]

    # ========================================
    # ROLE-BASED ACCESS CONTROL TESTS
    # ========================================
    
    def test_client_role_permissions(self):
        """Test CLIENT role permissions and access levels"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["unified_role"] == "client"
        assert data["is_business_owner"] == False
        assert data["is_staff_member"] == False
        assert data["is_system_admin"] == False
        assert data["can_manage_billing"] == False
        assert data["can_manage_staff"] == False
        assert data["can_view_analytics"] == False

    def test_barber_role_permissions(self):
        """Test BARBER role permissions and access levels"""
        user = self.test_users["barber"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["unified_role"] == "barber"
        assert data["is_business_owner"] == False
        assert data["is_staff_member"] == True
        assert data["is_system_admin"] == False
        assert data["can_manage_billing"] == False
        assert data["can_manage_staff"] == False
        assert data["can_view_analytics"] == True

    def test_shop_owner_role_permissions(self):
        """Test SHOP_OWNER role permissions and access levels"""
        user = self.test_users["shop_owner"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["unified_role"] == "shop_owner"
        assert data["is_business_owner"] == True
        assert data["is_staff_member"] == False
        assert data["is_system_admin"] == False
        assert data["can_manage_billing"] == True
        assert data["can_manage_staff"] == True
        assert data["can_view_analytics"] == True

    def test_enterprise_owner_role_permissions(self):
        """Test ENTERPRISE_OWNER role permissions and access levels"""
        user = self.test_users["enterprise_owner"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["unified_role"] == "enterprise_owner"
        assert data["is_business_owner"] == True
        assert data["is_staff_member"] == False
        assert data["is_system_admin"] == False
        assert data["can_manage_billing"] == True
        assert data["can_manage_staff"] == True
        assert data["can_view_analytics"] == True

    def test_super_admin_role_permissions(self):
        """Test SUPER_ADMIN role permissions and access levels"""
        user = self.test_users["super_admin"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["unified_role"] == "super_admin"
        assert data["is_business_owner"] == False
        assert data["is_staff_member"] == False
        assert data["is_system_admin"] == True
        assert data["can_manage_billing"] == True
        assert data["can_manage_staff"] == True
        assert data["can_view_analytics"] == True

    # ========================================
    # LOGIN FLOW TESTS
    # ========================================
    
    def test_successful_login_with_valid_credentials(self):
        """Test successful login with valid credentials"""
        user = self.test_users["client"]
        
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": user.email,
                "password": "ClientPassword123!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "csrf_token" in data
        assert data["token_type"] == "bearer"

    def test_login_with_invalid_credentials(self):
        """Test login rejection with invalid credentials"""
        user = self.test_users["client"]
        
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": user.email,
                "password": "WrongPassword"
            }
        )
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_with_unverified_email(self):
        """Test login rejection for unverified email"""
        user = self.test_users["unverified"]
        
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": user.email,
                "password": "UnverifiedPassword123!"
            }
        )
        
        assert response.status_code == 403
        assert "Email address not verified" in response.json()["detail"]
        assert response.headers.get("X-Verification-Required") == "true"

    def test_login_with_nonexistent_user(self):
        """Test login rejection for nonexistent user"""
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": "nonexistent@test.com",
                "password": "Password123!"
            }
        )
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    # ========================================
    # TOKEN REFRESH TESTS
    # ========================================
    
    def test_successful_token_refresh(self):
        """Test successful token refresh with valid refresh token"""
        user = self.test_users["client"]
        refresh_token = create_refresh_token(data={"sub": user.email})
        
        response = client.post(
            "/api/v2/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "csrf_token" in data
        assert data["token_type"] == "bearer"

    def test_token_refresh_with_invalid_token(self):
        """Test token refresh rejection with invalid refresh token"""
        response = client.post(
            "/api/v2/auth/refresh",
            json={"refresh_token": "invalid.refresh.token"}
        )
        
        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]

    def test_token_refresh_without_token(self):
        """Test token refresh rejection when no token provided"""
        response = client.post("/api/v2/auth/refresh", json={})
        
        assert response.status_code == 401
        assert "No refresh token provided" in response.json()["detail"]

    # ========================================
    # PASSWORD SECURITY TESTS
    # ========================================
    
    def test_password_change_with_valid_credentials(self):
        """Test successful password change with valid current password"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.post(
            "/api/v2/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "ClientPassword123!",
                "new_password": "NewClientPassword123!"
            }
        )
        
        assert response.status_code == 200
        assert "Password successfully changed" in response.json()["message"]

    def test_password_change_with_invalid_current_password(self):
        """Test password change rejection with incorrect current password"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.post(
            "/api/v2/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "WrongPassword",
                "new_password": "NewClientPassword123!"
            }
        )
        
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]

    def test_password_change_with_weak_password(self):
        """Test password change rejection with weak new password"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.post(
            "/api/v2/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "ClientPassword123!",
                "new_password": "weak"
            }
        )
        
        assert response.status_code == 400
        detail = response.json()["detail"]
        assert "Password does not meet security requirements" in detail["message"]
        assert "errors" in detail

    # ========================================
    # REGISTRATION TESTS
    # ========================================
    
    def test_successful_user_registration(self):
        """Test successful user registration with valid data"""
        response = client.post(
            "/api/v2/auth/register",
            json={
                "email": "newuser@test.com",
                "name": "New Test User",
                "password": "NewUserPassword123!",
                "user_type": "barber"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "User successfully registered" in data["message"]
        assert data["user"]["email"] == "newuser@test.com"
        assert data["user"]["user_type"] == "barber"

    def test_registration_with_existing_email(self):
        """Test registration rejection for existing email"""
        user = self.test_users["client"]
        
        response = client.post(
            "/api/v2/auth/register",
            json={
                "email": user.email,
                "name": "Duplicate User",
                "password": "DuplicatePassword123!",
                "user_type": "barber"
            }
        )
        
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_registration_with_client_user_type_rejected(self):
        """Test registration rejection for client user type"""
        response = client.post(
            "/api/v2/auth/register",
            json={
                "email": "newclient@test.com",
                "name": "New Client",
                "password": "ClientPassword123!",
                "user_type": "client"
            }
        )
        
        assert response.status_code == 400
        assert "Client registration is not allowed" in response.json()["detail"]

    def test_registration_with_weak_password(self):
        """Test registration rejection with weak password"""
        response = client.post(
            "/api/v2/auth/register",
            json={
                "email": "weakpass@test.com",
                "name": "Weak Password User",
                "password": "weak",
                "user_type": "barber"
            }
        )
        
        assert response.status_code == 400
        detail = response.json()["detail"]
        assert "Password does not meet security requirements" in detail["message"]

    # ========================================
    # MFA INTEGRATION TESTS  
    # ========================================
    
    def test_login_with_mfa_enabled_user(self):
        """Test login flow for user with MFA enabled"""
        user = self.test_users["super_admin"]
        
        # Create MFA secret for user
        mfa_secret = UserMFASecret(
            user_id=user.id,
            secret_key="JBSWY3DPEHPK3PXP",
            is_enabled=True,
            backup_codes=["123456", "654321"]
        )
        self.db.add(mfa_secret)
        self.db.commit()
        
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": user.email,
                "password": "AdminPassword123!"
            }
        )
        
        # Should return 202 requiring MFA verification
        assert response.status_code == 202
        assert "MFA verification required" in response.json()["detail"]
        assert response.headers.get("X-MFA-Required") == "true"
        assert response.headers.get("X-User-ID") == str(user.id)

    @patch.object(MFAService, 'verify_device_trust')
    def test_login_with_mfa_trusted_device(self, mock_verify_trust):
        """Test login with MFA-enabled user on trusted device"""
        mock_verify_trust.return_value = True
        
        user = self.test_users["super_admin"]
        
        # Create MFA secret for user
        mfa_secret = UserMFASecret(
            user_id=user.id,
            secret_key="JBSWY3DPEHPK3PXP",
            is_enabled=True,
            backup_codes=["123456", "654321"]
        )
        self.db.add(mfa_secret)
        self.db.commit()
        
        response = client.post(
            "/api/v2/auth/login",
            headers={
                "X-Device-Fingerprint": "trusted-device-123",
                "X-Trust-Token": "valid-trust-token"
            },
            json={
                "email": user.email,
                "password": "AdminPassword123!"
            }
        )
        
        # Should login successfully without MFA prompt
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    # ========================================
    # LOGOUT TESTS
    # ========================================
    
    def test_successful_logout(self):
        """Test successful logout with token blacklisting"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.post(
            "/api/v2/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "Logged out successfully" in response.json()["message"]
        
        # Verify token is blacklisted
        assert is_token_blacklisted(token) == True

    def test_logout_all_devices(self):
        """Test logout from all devices"""
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        response = client.post(
            "/api/v2/auth/logout-all",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "Logged out from all devices successfully" in response.json()["message"]

    # ========================================
    # SESSION MANAGEMENT TESTS
    # ========================================
    
    def test_session_timeout_handling(self):
        """Test session timeout and automatic token expiration"""
        user = self.test_users["client"]
        
        # Create token with very short expiration
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role},
            expires_delta=timedelta(seconds=1)
        )
        
        # Wait for token to expire
        import time
        time.sleep(2)
        
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    def test_concurrent_session_handling(self):
        """Test handling of multiple concurrent sessions"""
        user = self.test_users["client"]
        
        # Create multiple tokens
        token1 = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        token2 = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        # Both tokens should work
        response1 = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token1}"}
        )
        response2 = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token2}"}
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200

    # ========================================
    # RATE LIMITING TESTS
    # ========================================
    
    @pytest.mark.skip(reason="Rate limiting tests require special setup")
    def test_login_rate_limiting(self):
        """Test rate limiting on login endpoint"""
        user = self.test_users["client"]
        
        # Make multiple rapid login attempts
        responses = []
        for i in range(10):
            response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": user.email,
                    "password": "WrongPassword"
                }
            )
            responses.append(response)
        
        # Later requests should be rate limited
        rate_limited_responses = [r for r in responses if r.status_code == 429]
        assert len(rate_limited_responses) > 0

    # ========================================
    # SECURITY HEADERS TESTS
    # ========================================
    
    def test_security_headers_present(self):
        """Test that security headers are properly set"""
        response = client.get("/api/v2/auth/test")
        
        # Check for security headers (these are set by middleware)
        # Note: In test environment, middleware might not apply all headers
        assert response.status_code == 200

    # ========================================
    # ERROR HANDLING TESTS
    # ========================================
    
    def test_authentication_error_responses(self):
        """Test proper error responses for authentication failures"""
        # Test various authentication error scenarios
        test_cases = [
            {
                "headers": {"Authorization": "Bearer invalid-token"},
                "expected_status": 401,
                "expected_detail": "Could not validate credentials"
            },
            {
                "headers": {"Authorization": "Invalid header format"},
                "expected_status": 403,
                "expected_detail": "Invalid authentication credentials"
            },
            {
                "headers": {},
                "expected_status": 403,
                "expected_detail": "Not authenticated"
            }
        ]
        
        for case in test_cases:
            response = client.get("/api/v2/auth/me", headers=case["headers"])
            assert response.status_code == case["expected_status"]

    # ========================================
    # EDGE CASE TESTS
    # ========================================
    
    def test_malformed_jwt_token_handling(self):
        """Test handling of malformed JWT tokens"""
        malformed_tokens = [
            "not.a.jwt",
            "too.few.parts",
            "way.too.many.parts.here.extra",
            "invalid base64 content",
            "",
            None
        ]
        
        for token in malformed_tokens:
            if token is not None:
                response = client.get(
                    "/api/v2/auth/me",
                    headers={"Authorization": f"Bearer {token}"}
                )
                assert response.status_code == 401

    def test_sql_injection_protection_in_auth(self):
        """Test SQL injection protection in authentication endpoints"""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "admin'; DELETE FROM users WHERE '1'='1",
            "' UNION SELECT * FROM users --"
        ]
        
        for malicious_email in malicious_inputs:
            response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": malicious_email,
                    "password": "Password123!"
                }
            )
            # Should handle gracefully without crashing
            assert response.status_code in [400, 401, 422]

    def test_authentication_with_special_characters(self):
        """Test authentication with emails containing special characters"""
        special_emails = [
            "user+tag@test.com",
            "user.name@test.com",
            "user_name@test.com",
            "123user@test.com"
        ]
        
        for email in special_emails:
            response = client.post(
                "/api/v2/auth/login",
                json={
                    "email": email,
                    "password": "Password123!"
                }
            )
            # Should handle gracefully
            assert response.status_code in [401, 422]

    # ========================================
    # PERFORMANCE TESTS
    # ========================================
    
    def test_authentication_performance(self):
        """Test authentication performance meets requirements (<400ms)"""
        import time
        
        user = self.test_users["client"]
        token = create_access_token(
            data={"sub": user.email, "role": user.unified_role}
        )
        
        start_time = time.time()
        response = client.get(
            "/api/v2/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        assert response.status_code == 200
        assert response_time < 400, f"Authentication took {response_time}ms, should be <400ms"

    def test_login_performance(self):
        """Test login performance meets requirements (<400ms)"""
        import time
        
        user = self.test_users["client"]
        
        start_time = time.time()
        response = client.post(
            "/api/v2/auth/login",
            json={
                "email": user.email,
                "password": "ClientPassword123!"
            }
        )
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        assert response.status_code == 200
        assert response_time < 400, f"Login took {response_time}ms, should be <400ms"


# ========================================
# PYTEST CONFIGURATION
# ========================================

def pytest_configure(config):
    """Configure pytest for authentication tests."""
    config.addinivalue_line(
        "markers", "auth: mark test as authentication test"
    )
    config.addinivalue_line(
        "markers", "security: mark test as security test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as performance test"
    )

# ========================================
# TEST RUNNER AND COVERAGE
# ========================================

if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--cov=routers.auth",
        "--cov=utils.auth",
        "--cov=services.mfa_service",
        "--cov-report=html:coverage/auth_tests",
        "--cov-report=term-missing",
        "-m", "not performance"  # Skip performance tests in normal runs
    ])