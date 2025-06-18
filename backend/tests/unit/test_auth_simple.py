"""
Simple unit tests for authentication
"""
import pytest
from api.v1.auth import get_password_hash, verify_password


class TestPasswordHashing:
    """Test password hashing functions"""
    
    def test_password_hash_and_verify(self):
        """Test that password hashing works correctly"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        # Hash should be different from original
        assert hashed != password
        
        # Should verify correctly
        assert verify_password(password, hashed)
        
        # Wrong password should not verify
        assert not verify_password("wrongpassword", hashed)
    
    def test_different_hashes_for_same_password(self):
        """Test that same password produces different hashes"""
        password = "testpassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different (due to salt)
        assert hash1 != hash2
        
        # But both should verify
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_endpoint_exists(self, client):
        """Test that login endpoint exists"""
        response = client.post("/api/v1/auth/token", data={})
        # Should get 422 (validation error) not 404
        assert response.status_code == 422
    
    def test_me_endpoint_requires_auth(self, client):
        """Test that /me endpoint requires authentication"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401