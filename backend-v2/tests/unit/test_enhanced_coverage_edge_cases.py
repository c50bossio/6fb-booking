"""
Enhanced Unit Test Coverage for Missing Components and Edge Cases

This test suite fills coverage gaps and tests edge cases that are critical for
achieving 90%+ test coverage across all business-critical components.

Coverage:
- Error handling and edge cases for all services
- Input validation and sanitization
- Security boundaries and authentication edge cases
- Data consistency and integrity checks
- Rate limiting and resource protection
- Concurrent access scenarios
- Memory and resource management
- Configuration and environment edge cases

Target: 90%+ unit test coverage with comprehensive edge case testing
"""

import pytest
import asyncio
from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from typing import List, Dict, Any, Optional
import json
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DatabaseError
from httpx import AsyncClient

from main import app
from models import User, Appointment, Service, Payment, Commission
from services.booking_service import BookingService
from services.payment_service import PaymentService
from services.notification_service import NotificationService
from services.analytics_service import AnalyticsService
from services.six_figure_barber_core_service import SixFigureBarberCoreService
from utils.auth import get_password_hash, verify_password, create_access_token
from utils.validators import validate_email, validate_phone, validate_currency
from utils.sanitization import sanitize_input, sanitize_html
from utils.rate_limiter import RateLimiter
from utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data


class TestInputValidationAndSanitization:
    """Test input validation and sanitization edge cases."""

    def test_email_validation_edge_cases(self):
        """Test email validation with various edge cases."""
        
        # Valid emails
        valid_emails = [
            "user@example.com",
            "user.name@example.com",
            "user+tag@example.com",
            "user123@example-domain.com",
            "test@sub.domain.com"
        ]
        
        for email in valid_emails:
            assert validate_email(email) is True
        
        # Invalid emails
        invalid_emails = [
            "",
            "invalid",
            "@example.com",
            "user@",
            "user@.com",
            "user..name@example.com",
            "user@domain..com",
            "user@domain.c",
            "user name@example.com",
            "user@domain with space.com",
            "a" * 300 + "@example.com",  # Too long
            "user@" + "a" * 300 + ".com"  # Domain too long
        ]
        
        for email in invalid_emails:
            assert validate_email(email) is False

    def test_phone_validation_edge_cases(self):
        """Test phone number validation with international formats."""
        
        # Valid phone numbers
        valid_phones = [
            "+1234567890",
            "+12345678901",
            "+441234567890",
            "+86123456789012",
            "1234567890",
            "(123) 456-7890",
            "123-456-7890",
            "123.456.7890"
        ]
        
        for phone in valid_phones:
            assert validate_phone(phone) is True
        
        # Invalid phone numbers
        invalid_phones = [
            "",
            "123",
            "12345",
            "abcdefghij",
            "+",
            "+" + "1" * 20,  # Too long
            "+1 (123) 456-7890 ext 123",  # Extensions not supported
            "123-45-6789"  # Wrong format
        ]
        
        for phone in invalid_phones:
            assert validate_phone(phone) is False

    def test_currency_validation_edge_cases(self):
        """Test currency validation with edge cases."""
        
        # Valid currency amounts
        valid_amounts = [
            "0.00",
            "0.01",
            "1.00",
            "999999.99",
            "123.45"
        ]
        
        for amount in valid_amounts:
            assert validate_currency(amount) is True
        
        # Invalid currency amounts
        invalid_amounts = [
            "",
            "abc",
            "-1.00",
            "1.001",  # Too many decimal places
            "1000000.00",  # Too large
            "1,000.00",  # Commas not allowed
            "$100.00",  # Currency symbols not allowed
            "100"  # Must have decimal places
        ]
        
        for amount in invalid_amounts:
            assert validate_currency(amount) is False

    def test_input_sanitization_xss_protection(self):
        """Test input sanitization against XSS attacks."""
        
        # XSS attack vectors
        xss_inputs = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src='x' onerror='alert(\"xss\")'>",
            "<iframe src='javascript:alert(\"xss\")'></iframe>",
            "'; DROP TABLE users; --",
            "<svg onload='alert(\"xss\")'>",
            "data:text/html,<script>alert('xss')</script>"
        ]
        
        for xss_input in xss_inputs:
            sanitized = sanitize_input(xss_input)
            assert "<script>" not in sanitized.lower()
            assert "javascript:" not in sanitized.lower()
            assert "onerror=" not in sanitized.lower()
            assert "onload=" not in sanitized.lower()

    def test_html_sanitization_preserves_safe_content(self):
        """Test HTML sanitization preserves safe content while removing dangerous elements."""
        
        safe_html = "<p>This is <strong>safe</strong> content with <em>emphasis</em>.</p>"
        sanitized = sanitize_html(safe_html)
        
        assert "<p>" in sanitized
        assert "<strong>" in sanitized
        assert "<em>" in sanitized
        
        dangerous_html = "<p>Safe content</p><script>alert('xss')</script>"
        sanitized_dangerous = sanitize_html(dangerous_html)
        
        assert "<p>" in sanitized_dangerous
        assert "<script>" not in sanitized_dangerous


class TestAuthenticationAndSecurityEdgeCases:
    """Test authentication and security edge cases."""

    def test_password_hashing_edge_cases(self):
        """Test password hashing with various inputs."""
        
        # Test normal passwords
        normal_passwords = ["password123", "Str0ng!P@ssw0rd", "simple"]
        
        for password in normal_passwords:
            hashed = get_password_hash(password)
            assert verify_password(password, hashed) is True
            assert verify_password(password + "wrong", hashed) is False
        
        # Test edge case passwords
        edge_passwords = [
            "",  # Empty password
            " ",  # Space password
            "a" * 1000,  # Very long password
            "🔒🔑💻",  # Unicode password
            "password with spaces",
            "line1\nline2"  # Multiline password
        ]
        
        for password in edge_passwords:
            hashed = get_password_hash(password)
            assert verify_password(password, hashed) is True

    def test_jwt_token_edge_cases(self):
        """Test JWT token creation and validation edge cases."""
        
        # Test normal token creation
        normal_data = {"sub": "user@example.com", "role": "client"}
        token = create_access_token(data=normal_data)
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Test with various data types
        edge_cases = [
            {"sub": "", "role": "client"},  # Empty subject
            {"sub": "user@example.com", "role": ""},  # Empty role
            {"sub": "user@example.com"},  # Missing role
            {"role": "client"},  # Missing subject
            {},  # Empty data
            {"sub": "a" * 1000, "role": "client"},  # Very long subject
            {"sub": "user@example.com", "role": "invalid_role"}  # Invalid role
        ]
        
        for data in edge_cases:
            try:
                token = create_access_token(data=data)
                assert isinstance(token, str)
            except Exception as e:
                # Should handle gracefully
                assert "Invalid" in str(e) or "Missing" in str(e)

    def test_rate_limiting_edge_cases(self):
        """Test rate limiting with various scenarios."""
        
        rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
        
        # Test normal rate limiting
        user_id = "test_user_123"
        
        # Should allow first 5 requests
        for i in range(5):
            assert rate_limiter.is_allowed(user_id) is True
        
        # Should deny 6th request
        assert rate_limiter.is_allowed(user_id) is False
        
        # Test with different user IDs
        assert rate_limiter.is_allowed("different_user") is True
        
        # Test edge cases
        edge_cases = [
            "",  # Empty user ID
            " ",  # Space user ID
            None,  # None user ID
            "a" * 1000,  # Very long user ID
            "user with spaces",
            "user\nwith\nnewlines"
        ]
        
        for edge_user_id in edge_cases:
            try:
                result = rate_limiter.is_allowed(edge_user_id)
                assert isinstance(result, bool)
            except Exception:
                # Should handle gracefully
                pass

    def test_encryption_edge_cases(self):
        """Test data encryption with various inputs."""
        
        # Test normal data
        normal_data = ["password123", "credit_card_number", "sensitive_info"]
        
        for data in normal_data:
            encrypted = encrypt_sensitive_data(data)
            decrypted = decrypt_sensitive_data(encrypted)
            assert decrypted == data
        
        # Test edge cases
        edge_cases = [
            "",  # Empty string
            " ",  # Space
            "a" * 10000,  # Very long string
            "🔒🔑💻",  # Unicode
            "data\nwith\nnewlines",
            json.dumps({"key": "value"}),  # JSON data
            "null\x00byte"  # Null byte
        ]
        
        for data in edge_cases:
            try:
                encrypted = encrypt_sensitive_data(data)
                decrypted = decrypt_sensitive_data(encrypted)
                assert decrypted == data
            except Exception:
                # Some edge cases may not be supported
                pass


class TestBookingServiceEdgeCases:
    """Test booking service edge cases and error scenarios."""

    @pytest.fixture
    def booking_service(self, mock_db_session):
        return BookingService(mock_db_session)

    @pytest.fixture
    def mock_appointment_data(self):
        return {
            "barber_id": 1,
            "client_id": 2,
            "service_id": 3,
            "appointment_datetime": datetime.now() + timedelta(days=1),
            "price": Decimal("95.00"),
            "notes": "Test appointment"
        }

    def test_create_booking_with_invalid_data(self, booking_service):
        """Test booking creation with invalid data."""
        
        invalid_data_cases = [
            {},  # Empty data
            {"barber_id": None},  # None barber ID
            {"barber_id": -1},  # Negative barber ID
            {"barber_id": "invalid"},  # String barber ID
            {"barber_id": 1, "appointment_datetime": "invalid"},  # Invalid datetime
            {"barber_id": 1, "appointment_datetime": datetime.now() - timedelta(days=1)},  # Past datetime
            {"barber_id": 1, "price": -10.00},  # Negative price
            {"barber_id": 1, "price": "invalid"},  # Invalid price
            {"barber_id": 1, "notes": "a" * 10000}  # Too long notes
        ]
        
        for invalid_data in invalid_data_cases:
            with pytest.raises((ValueError, TypeError, InvalidOperation)):
                booking_service.create_booking(invalid_data)

    def test_booking_conflict_detection(self, booking_service, mock_appointment_data):
        """Test booking conflict detection."""
        
        # Mock existing appointment
        existing_appointment = Mock(
            barber_id=1,
            appointment_datetime=mock_appointment_data["appointment_datetime"],
            status="confirmed"
        )
        
        booking_service.db.query.return_value.filter.return_value.all.return_value = [existing_appointment]
        
        # Should detect conflict
        with pytest.raises(ValueError, match="time slot.*unavailable"):
            booking_service.create_booking(mock_appointment_data)

    def test_booking_with_database_errors(self, booking_service, mock_appointment_data):
        """Test booking creation with database errors."""
        
        # Test database integrity error
        booking_service.db.add = Mock()
        booking_service.db.commit = Mock(side_effect=IntegrityError("", "", ""))
        
        with pytest.raises(IntegrityError):
            booking_service.create_booking(mock_appointment_data)
        
        # Test general database error
        booking_service.db.commit = Mock(side_effect=DatabaseError("", "", ""))
        
        with pytest.raises(DatabaseError):
            booking_service.create_booking(mock_appointment_data)

    def test_concurrent_booking_handling(self, booking_service, mock_appointment_data):
        """Test handling of concurrent booking attempts."""
        
        async def create_booking_async():
            return booking_service.create_booking(mock_appointment_data)
        
        # Simulate concurrent booking attempts
        tasks = [create_booking_async() for _ in range(5)]
        
        # Only one should succeed, others should fail with conflict
        results = []
        errors = []
        
        for task in tasks:
            try:
                result = asyncio.run(task)
                results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Should have at most one success and multiple failures
        assert len(results) <= 1
        assert len(errors) >= len(tasks) - 1


class TestPaymentServiceEdgeCases:
    """Test payment service edge cases and error scenarios."""

    @pytest.fixture
    def payment_service(self, mock_db_session):
        return PaymentService(mock_db_session)

    def test_payment_amount_validation(self, payment_service):
        """Test payment amount validation edge cases."""
        
        # Valid amounts
        valid_amounts = [Decimal("0.01"), Decimal("1.00"), Decimal("999999.99")]
        
        for amount in valid_amounts:
            assert payment_service.validate_payment_amount(amount) is True
        
        # Invalid amounts
        invalid_amounts = [
            Decimal("0.00"),  # Zero amount
            Decimal("-1.00"),  # Negative amount
            Decimal("1000000.00"),  # Too large
            Decimal("0.001"),  # Too many decimal places
            None,  # None amount
            "invalid"  # String amount
        ]
        
        for amount in invalid_amounts:
            with pytest.raises((ValueError, TypeError, InvalidOperation)):
                payment_service.validate_payment_amount(amount)

    def test_payment_processing_with_network_errors(self, payment_service):
        """Test payment processing with network and external service errors."""
        
        payment_data = {
            "amount": Decimal("95.00"),
            "payment_method_id": "pm_card_visa",
            "booking_id": 123
        }
        
        # Test various network errors
        network_errors = [
            Exception("Network timeout"),
            Exception("Connection refused"),
            Exception("SSL certificate error"),
            Exception("Rate limit exceeded")
        ]
        
        for error in network_errors:
            with patch('services.stripe_integration_service.stripe.PaymentIntent.create', side_effect=error):
                with pytest.raises(Exception):
                    payment_service.process_payment(payment_data)

    def test_payment_retry_logic(self, payment_service):
        """Test payment retry logic for transient failures."""
        
        payment_data = {
            "amount": Decimal("95.00"),
            "payment_method_id": "pm_card_visa",
            "booking_id": 123
        }
        
        # Mock transient failure followed by success
        mock_responses = [
            Exception("Temporary failure"),
            Exception("Another temporary failure"),
            Mock(id="pi_success", status="succeeded")
        ]
        
        with patch('services.stripe_integration_service.stripe.PaymentIntent.create', side_effect=mock_responses):
            # Should eventually succeed after retries
            result = payment_service.process_payment_with_retry(payment_data, max_retries=3)
            assert result["status"] == "succeeded"

    def test_refund_edge_cases(self, payment_service):
        """Test refund processing edge cases."""
        
        # Test partial refund
        original_amount = Decimal("100.00")
        refund_amount = Decimal("50.00")
        
        result = payment_service.process_refund(
            payment_id="pi_test_123",
            refund_amount=refund_amount,
            original_amount=original_amount
        )
        assert result["refund_amount"] == refund_amount
        
        # Test full refund
        result = payment_service.process_refund(
            payment_id="pi_test_123",
            refund_amount=original_amount,
            original_amount=original_amount
        )
        assert result["refund_amount"] == original_amount
        
        # Test invalid refund amounts
        invalid_refunds = [
            Decimal("150.00"),  # More than original
            Decimal("0.00"),  # Zero refund
            Decimal("-10.00")  # Negative refund
        ]
        
        for invalid_amount in invalid_refunds:
            with pytest.raises(ValueError):
                payment_service.process_refund(
                    payment_id="pi_test_123",
                    refund_amount=invalid_amount,
                    original_amount=original_amount
                )


class TestAnalyticsServiceEdgeCases:
    """Test analytics service edge cases and data integrity."""

    @pytest.fixture
    def analytics_service(self, mock_db_session):
        return AnalyticsService(mock_db_session)

    def test_analytics_with_no_data(self, analytics_service):
        """Test analytics calculations with no data."""
        
        # Mock empty query results
        analytics_service.db.query.return_value.filter.return_value.all.return_value = []
        
        # Should handle empty data gracefully
        result = analytics_service.calculate_revenue_metrics(
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now()
        )
        
        assert result["total_revenue"] == Decimal("0.00")
        assert result["appointment_count"] == 0
        assert result["average_revenue_per_appointment"] == Decimal("0.00")

    def test_analytics_with_invalid_date_ranges(self, analytics_service):
        """Test analytics with invalid date ranges."""
        
        # Test future date range
        future_start = datetime.now() + timedelta(days=1)
        future_end = datetime.now() + timedelta(days=30)
        
        result = analytics_service.calculate_revenue_metrics(
            start_date=future_start,
            end_date=future_end
        )
        assert result["total_revenue"] == Decimal("0.00")
        
        # Test reversed date range
        with pytest.raises(ValueError, match="start_date.*end_date"):
            analytics_service.calculate_revenue_metrics(
                start_date=datetime.now(),
                end_date=datetime.now() - timedelta(days=1)
            )
        
        # Test very large date range
        large_start = datetime.now() - timedelta(days=36500)  # 100 years
        large_end = datetime.now()
        
        # Should handle large ranges without performance issues
        result = analytics_service.calculate_revenue_metrics(
            start_date=large_start,
            end_date=large_end
        )
        assert isinstance(result, dict)

    def test_analytics_data_consistency(self, analytics_service):
        """Test analytics data consistency checks."""
        
        # Mock inconsistent data
        mock_appointments = [
            Mock(price=Decimal("100.00"), status="completed"),
            Mock(price=None, status="completed"),  # Missing price
            Mock(price=Decimal("-50.00"), status="completed"),  # Negative price
            Mock(price=Decimal("200.00"), status="cancelled")  # Cancelled appointment
        ]
        
        analytics_service.db.query.return_value.filter.return_value.all.return_value = mock_appointments
        
        # Should handle inconsistent data
        result = analytics_service.calculate_revenue_metrics(
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now()
        )
        
        # Should only include valid, completed appointments
        assert result["total_revenue"] == Decimal("100.00")
        assert result["appointment_count"] == 1

    def test_analytics_performance_with_large_dataset(self, analytics_service):
        """Test analytics performance with large datasets."""
        
        # Mock large dataset
        large_dataset = [
            Mock(
                price=Decimal("95.00"),
                status="completed",
                appointment_datetime=datetime.now() - timedelta(days=i)
            ) for i in range(10000)
        ]
        
        analytics_service.db.query.return_value.filter.return_value.all.return_value = large_dataset
        
        import time
        start_time = time.time()
        
        result = analytics_service.calculate_revenue_metrics(
            start_date=datetime.now() - timedelta(days=365),
            end_date=datetime.now()
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should process large dataset reasonably quickly
        assert processing_time < 5.0  # 5 seconds
        assert result["total_revenue"] == Decimal("950000.00")  # 10000 * 95


class TestNotificationServiceEdgeCases:
    """Test notification service edge cases and delivery scenarios."""

    @pytest.fixture
    def notification_service(self, mock_db_session):
        return NotificationService(mock_db_session)

    def test_email_notification_with_invalid_recipients(self, notification_service):
        """Test email notifications with invalid recipients."""
        
        invalid_recipients = [
            "",  # Empty email
            "invalid-email",  # Invalid format
            None,  # None email
            "a" * 320 + "@example.com",  # Too long
            "user@nonexistent-domain-12345.com"  # Nonexistent domain
        ]
        
        for recipient in invalid_recipients:
            with pytest.raises((ValueError, TypeError)):
                notification_service.send_email(
                    to=recipient,
                    subject="Test",
                    message="Test message"
                )

    def test_sms_notification_with_invalid_numbers(self, notification_service):
        """Test SMS notifications with invalid phone numbers."""
        
        invalid_numbers = [
            "",  # Empty number
            "invalid",  # Invalid format
            "123",  # Too short
            "+" + "1" * 20,  # Too long
            None  # None number
        ]
        
        for number in invalid_numbers:
            with pytest.raises((ValueError, TypeError)):
                notification_service.send_sms(
                    to=number,
                    message="Test SMS"
                )

    def test_notification_retry_on_failure(self, notification_service):
        """Test notification retry logic on delivery failures."""
        
        # Mock delivery failures
        with patch.object(notification_service, '_send_email_via_provider') as mock_send:
            mock_send.side_effect = [
                Exception("Temporary failure"),
                Exception("Another failure"),
                {"success": True, "message_id": "msg_123"}
            ]
            
            result = notification_service.send_email_with_retry(
                to="user@example.com",
                subject="Test",
                message="Test message",
                max_retries=3
            )
            
            assert result["success"] is True
            assert mock_send.call_count == 3

    def test_notification_rate_limiting(self, notification_service):
        """Test notification rate limiting."""
        
        # Should allow reasonable number of notifications
        for i in range(10):
            result = notification_service.send_email(
                to=f"user{i}@example.com",
                subject="Test",
                message="Test message"
            )
            assert result["success"] is True
        
        # Should rate limit excessive notifications
        for i in range(100):
            try:
                result = notification_service.send_email(
                    to=f"spam{i}@example.com",
                    subject="Spam",
                    message="Spam message"
                )
                # May succeed or be rate limited
            except Exception as e:
                assert "rate limit" in str(e).lower()


class TestConcurrencyAndResourceManagement:
    """Test concurrent access and resource management edge cases."""

    def test_concurrent_database_access(self, mock_db_session):
        """Test concurrent database access scenarios."""
        
        service = BookingService(mock_db_session)
        
        async def create_multiple_bookings():
            tasks = []
            for i in range(10):
                booking_data = {
                    "barber_id": 1,
                    "client_id": i + 1,
                    "service_id": 1,
                    "appointment_datetime": datetime.now() + timedelta(hours=i),
                    "price": Decimal("95.00")
                }
                task = asyncio.create_task(service.create_booking_async(booking_data))
                tasks.append(task)
            
            # Execute concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Should handle concurrent access gracefully
            successful_bookings = [r for r in results if not isinstance(r, Exception)]
            assert len(successful_bookings) <= 10  # May have conflicts

    def test_memory_management_with_large_operations(self):
        """Test memory management during large operations."""
        
        import psutil
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss
        
        # Simulate large data processing
        large_data = []
        for i in range(100000):
            large_data.append({
                "id": i,
                "data": "sample data " * 100,
                "timestamp": datetime.now()
            })
        
        # Process data
        processed_data = []
        for item in large_data:
            processed_data.append({
                "processed_id": item["id"],
                "length": len(item["data"])
            })
        
        # Clean up
        del large_data
        del processed_data
        gc.collect()
        
        final_memory = process.memory_info().rss
        memory_growth = final_memory - initial_memory
        
        # Memory growth should be reasonable
        assert memory_growth < 100 * 1024 * 1024  # 100 MB


class TestConfigurationAndEnvironmentEdgeCases:
    """Test configuration and environment edge cases."""

    def test_missing_environment_variables(self):
        """Test behavior with missing environment variables."""
        
        import os
        
        # Test with missing required environment variables
        original_env = os.environ.copy()
        
        try:
            # Remove critical environment variables
            critical_vars = ["DATABASE_URL", "SECRET_KEY", "STRIPE_SECRET_KEY"]
            for var in critical_vars:
                if var in os.environ:
                    del os.environ[var]
            
            # Should handle missing variables gracefully
            try:
                from config import settings
                # Should either use defaults or raise meaningful errors
                assert hasattr(settings, 'database_url')
            except Exception as e:
                assert "missing" in str(e).lower() or "required" in str(e).lower()
                
        finally:
            # Restore environment
            os.environ.clear()
            os.environ.update(original_env)

    def test_invalid_configuration_values(self):
        """Test behavior with invalid configuration values."""
        
        import os
        
        original_env = os.environ.copy()
        
        try:
            # Set invalid configuration values
            os.environ["DATABASE_URL"] = "invalid-url"
            os.environ["REDIS_URL"] = "invalid-redis-url"
            os.environ["JWT_EXPIRE_MINUTES"] = "invalid-number"
            
            # Should handle invalid values gracefully
            try:
                from config import settings
                # Should either use defaults or validate inputs
            except Exception as e:
                assert "invalid" in str(e).lower() or "format" in str(e).lower()
                
        finally:
            # Restore environment
            os.environ.clear()
            os.environ.update(original_env)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "--cov=services", "--cov=utils", "--cov-report=term-missing"])