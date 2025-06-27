"""
Test POS Security Features
Tests for rate limiting, session timeout, audit logging, and CSRF protection
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import time
import json

from main import app
from config.database import get_db
from services.pos_security_service import POSSecurityService
from services.barber_pin_service import BarberPINService
from models.barber import Barber
from models.pos_session import POSSession


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create test database session"""
    from config.database import SessionLocal

    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def test_barber(db_session):
    """Create test barber with PIN"""
    barber = Barber(
        first_name="Test", last_name="Barber", email="test@example.com", is_active=True
    )
    db_session.add(barber)
    db_session.commit()

    # Set PIN
    pin_service = BarberPINService(db_session)
    pin_service.set_pin(barber.id, "1234")

    yield barber

    # Cleanup
    db_session.delete(barber)
    db_session.commit()


class TestRateLimiting:
    """Test PIN login rate limiting"""

    def test_rate_limit_enforcement(self, client, test_barber):
        """Test that rate limiting blocks after max attempts"""
        # Make 5 failed attempts (should succeed)
        for i in range(5):
            response = client.post(
                "/api/v1/barber-pin/authenticate",
                json={
                    "barber_id": test_barber.id,
                    "pin": "wrong",
                    "device_info": "test-device",
                },
            )
            assert response.status_code == 200
            assert response.json()["success"] is False

        # 6th attempt should be rate limited
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "wrong",
                "device_info": "test-device",
            },
        )
        assert response.status_code == 429
        assert "Too many login attempts" in response.json()["detail"]

        # Check rate limit headers
        assert "Retry-After" in response.headers
        assert "X-RateLimit-Limit" in response.headers
        assert response.headers["X-RateLimit-Limit"] == "5"
        assert response.headers["X-RateLimit-Remaining"] == "0"

    def test_rate_limit_reset_on_success(self, client, test_barber):
        """Test that successful login resets rate limit"""
        # Make 3 failed attempts
        for i in range(3):
            client.post(
                "/api/v1/barber-pin/authenticate",
                json={
                    "barber_id": test_barber.id,
                    "pin": "wrong",
                    "device_info": "test-device",
                },
            )

        # Successful login should reset counter
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "1234",
                "device_info": "test-device",
            },
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

        # Should be able to make 5 more attempts
        for i in range(5):
            response = client.post(
                "/api/v1/barber-pin/authenticate",
                json={
                    "barber_id": test_barber.id,
                    "pin": "wrong",
                    "device_info": "test-device",
                },
            )
            assert response.status_code == 200


class TestSessionTimeout:
    """Test session timeout management"""

    def test_session_timeout_check(self, client, test_barber, db_session):
        """Test session timeout status checking"""
        # Login to get session
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "1234",
                "device_info": "test-device",
            },
        )
        assert response.status_code == 200
        session_token = response.json()["session_token"]

        # Check timeout status
        response = client.post(
            "/api/v1/barber-pin/check-timeout",
            headers={"Authorization": f"Bearer {session_token}"},
            json={"session_token": session_token},
        )
        assert response.status_code == 200

        status = response.json()
        assert status["valid"] is True
        assert status["expired"] is False
        assert status["warning"] is False
        assert status["remaining_minutes"] >= 29  # Should be close to 30

    def test_session_warning_threshold(self, client, test_barber, db_session):
        """Test session warning at 25 minutes"""
        # Create session that's about to expire
        security_service = POSSecurityService(db_session)

        # Login first
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "1234",
                "device_info": "test-device",
            },
        )
        session_token = response.json()["session_token"]

        # Manually update session to be near expiry
        session = (
            db_session.query(POSSession)
            .filter(POSSession.session_token == session_token)
            .first()
        )
        session.expires_at = datetime.utcnow() + timedelta(minutes=24)
        db_session.commit()

        # Check should show warning
        response = client.post(
            "/api/v1/barber-pin/check-timeout",
            headers={"Authorization": f"Bearer {session_token}"},
            json={"session_token": session_token},
        )

        status = response.json()
        assert status["valid"] is True
        assert status["expired"] is False
        assert status["warning"] is True
        assert status["remaining_minutes"] <= 24


class TestAuditLogging:
    """Test audit logging functionality"""

    def test_transaction_audit_log(self, client, test_barber, db_session):
        """Test that POS transactions are logged"""
        # Login first
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "1234",
                "device_info": "test-device",
            },
        )
        session_token = response.json()["session_token"]
        csrf_token = response.json()["csrf_token"]

        # Create transaction
        response = client.post(
            "/api/v1/pos/transaction",
            headers={
                "Authorization": f"Bearer {session_token}",
                "X-CSRF-Token": csrf_token,
            },
            json={
                "items": [{"product_id": 1, "quantity": 1, "price": 30.00}],
                "client_id": None,
                "payment_method": "cash",
                "subtotal": 30.00,
                "tax": 2.70,
                "tip": 5.00,
                "total": 37.70,
                "notes": "Test transaction",
            },
        )
        assert response.status_code == 200

        # Check audit logs
        response = client.get(
            "/api/v1/pos/audit-logs",
            headers={"Authorization": f"Bearer {session_token}"},
            params={"event_type": "pos_transaction_sale"},
        )
        assert response.status_code == 200

        logs = response.json()
        assert len(logs) > 0
        assert logs[0]["event_type"] == "pos_transaction_sale"
        assert logs[0]["barber_id"] == test_barber.id

    def test_sensitive_data_filtering(self, client, test_barber, db_session):
        """Test that sensitive data is filtered from logs"""
        security_service = POSSecurityService(db_session)

        # Test data with sensitive fields
        sensitive_data = {
            "transaction_id": "TXN-123",
            "amount": 50.00,
            "card_number": "4111111111111111",
            "cvv": "123",
            "customer_email": "customer@example.com",
            "customer_phone": "555-1234",
            "items": [{"name": "Haircut", "price": 50.00}],
        }

        # Filter data
        filtered = security_service._filter_sensitive_data(sensitive_data)

        # Check sensitive fields are masked
        assert filtered["card_number"] == "***1111"
        assert filtered["cvv"] == "***"
        assert filtered["customer_email"] == "***ple.com"
        assert filtered["customer_phone"] == "***1234"
        assert filtered["amount"] == 50.00  # Non-sensitive field preserved


class TestCSRFProtection:
    """Test CSRF protection"""

    def test_csrf_token_generation(self, client, test_barber):
        """Test that CSRF token is generated on login"""
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "1234",
                "device_info": "test-device",
            },
        )
        assert response.status_code == 200
        assert "csrf_token" in response.json()
        assert len(response.json()["csrf_token"]) > 20

    def test_csrf_validation_required(self, client, test_barber):
        """Test that CSRF token is validated on protected endpoints"""
        # Login first
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "1234",
                "device_info": "test-device",
            },
        )
        session_token = response.json()["session_token"]
        csrf_token = response.json()["csrf_token"]

        # Try transaction without CSRF token (should work in non-strict mode)
        response = client.post(
            "/api/v1/pos/transaction",
            headers={"Authorization": f"Bearer {session_token}"},
            json={
                "items": [],
                "payment_method": "cash",
                "subtotal": 0,
                "tax": 0,
                "total": 0,
            },
        )
        # In non-strict mode, this should pass
        assert response.status_code in [200, 403]

        # Try with invalid CSRF token
        response = client.post(
            "/api/v1/pos/transaction",
            headers={
                "Authorization": f"Bearer {session_token}",
                "X-CSRF-Token": "invalid-token",
            },
            json={
                "items": [],
                "payment_method": "cash",
                "subtotal": 0,
                "tax": 0,
                "total": 0,
            },
        )
        assert response.status_code == 403

        # Try with valid CSRF token
        response = client.post(
            "/api/v1/pos/transaction",
            headers={
                "Authorization": f"Bearer {session_token}",
                "X-CSRF-Token": csrf_token,
            },
            json={
                "items": [],
                "payment_method": "cash",
                "subtotal": 0,
                "tax": 0,
                "total": 0,
            },
        )
        assert response.status_code == 200


class TestReceiptSecurity:
    """Test secure receipt handling"""

    def test_receipt_data_sanitization(self, client, test_barber):
        """Test that receipt data is sanitized"""
        # Login first
        response = client.post(
            "/api/v1/barber-pin/authenticate",
            json={
                "barber_id": test_barber.id,
                "pin": "1234",
                "device_info": "test-device",
            },
        )
        session_token = response.json()["session_token"]
        csrf_token = response.json()["csrf_token"]

        # Get receipt
        response = client.post(
            "/api/v1/pos/receipt",
            headers={
                "Authorization": f"Bearer {session_token}",
                "X-CSRF-Token": csrf_token,
            },
            json={"transaction_id": "TXN-123"},
        )
        assert response.status_code == 200

        receipt = response.json()
        # Check that only allowed fields are present
        allowed_fields = {
            "transaction_id",
            "amount",
            "date",
            "items",
            "barber_name",
            "location_name",
            "receipt_number",
            "payment_type",
            "subtotal",
            "tax",
            "tip",
            "total",
        }
        assert set(receipt.keys()).issubset(allowed_fields)

        # Ensure no sensitive fields
        assert "card_number" not in receipt
        assert "customer_email" not in receipt
        assert "customer_phone" not in receipt


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
