"""
Comprehensive tests for PCI DSS Compliance Service.

Tests PCI DSS Level 1 compliance requirements including:
- Data encryption and protection
- Access control validation  
- Security monitoring and logging
- Compliance assessment and reporting
"""

import pytest
import os
import tempfile
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from cryptography.fernet import Fernet

from services.pci_compliance import (
    PCIComplianceService, ComplianceLevel, DataClassification,
    ComplianceRequirement, SecurityEvent, pci_compliant_log,
    secure_card_number_display, validate_pci_access, log_security_event
)


@pytest.fixture
def temp_data_dir():
    """Create temporary directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def pci_service(temp_data_dir):
    """Create PCI compliance service instance for testing."""
    with patch('services.pci_compliance.settings') as mock_settings:
        mock_settings.data_dir = temp_data_dir
        service = PCIComplianceService()
        yield service


class TestPCIComplianceServiceInitialization:
    """Test PCI compliance service initialization."""
    
    def test_service_initialization(self, pci_service):
        """Test service initializes with correct defaults."""
        assert pci_service.compliance_level == ComplianceLevel.LEVEL_1
        assert pci_service.encryption_key is not None
        assert pci_service.cipher_suite is not None
        assert isinstance(pci_service.security_events, list)
        assert len(pci_service.security_events) == 0
    
    def test_encryption_key_generation(self, temp_data_dir):
        """Test encryption key generation and storage."""
        with patch('services.pci_compliance.settings') as mock_settings:
            mock_settings.data_dir = temp_data_dir
            
            # First initialization should create new key
            service1 = PCIComplianceService()
            key1 = service1.encryption_key
            
            # Second initialization should load existing key
            service2 = PCIComplianceService()
            key2 = service2.encryption_key
            
            assert key1 == key2
            
            # Verify key file exists and has correct permissions
            key_file = os.path.join(temp_data_dir, ".pci_key")
            assert os.path.exists(key_file)
            
            # Check file permissions (should be readable by owner only)
            file_stat = os.stat(key_file)
            assert oct(file_stat.st_mode)[-3:] == '600'


class TestDataEncryptionAndProtection:
    """Test PCI DSS Requirement 3: Protect stored cardholder data."""
    
    def test_encrypt_cardholder_data(self, pci_service):
        """Test encryption of cardholder data."""
        sensitive_data = "4242424242424242"  # Test card number
        
        encrypted = pci_service.encrypt_cardholder_data(sensitive_data)
        
        assert encrypted is not None
        assert encrypted != sensitive_data
        assert isinstance(encrypted, str)
        
        # Verify it's base64 encoded
        import base64
        try:
            base64.b64decode(encrypted)
        except Exception:
            pytest.fail("Encrypted data should be base64 encoded")
    
    def test_decrypt_cardholder_data(self, pci_service):
        """Test decryption of cardholder data."""
        original_data = "4242424242424242"
        
        encrypted = pci_service.encrypt_cardholder_data(original_data)
        decrypted = pci_service.decrypt_cardholder_data(encrypted)
        
        assert decrypted == original_data
    
    def test_encryption_roundtrip_multiple_values(self, pci_service):
        """Test encryption/decryption with various data types."""
        test_data = [
            "4242424242424242",
            "John Doe",
            "12/2025",
            "123",
            "john.doe@example.com"
        ]
        
        for data in test_data:
            encrypted = pci_service.encrypt_cardholder_data(data)
            decrypted = pci_service.decrypt_cardholder_data(encrypted)
            
            assert decrypted == data
            assert encrypted != data
    
    def test_encryption_error_handling(self, pci_service):
        """Test encryption error handling."""
        # Test with invalid data type
        with pytest.raises(AttributeError):
            pci_service.encrypt_cardholder_data(None)
        
        # Verify security event is logged
        assert len(pci_service.security_events) > 0
        assert any(e.event_type == "encryption_error" for e in pci_service.security_events)
    
    def test_decryption_error_handling(self, pci_service):
        """Test decryption error handling."""
        # Test with invalid encrypted data
        with pytest.raises(Exception):
            pci_service.decrypt_cardholder_data("invalid_encrypted_data")
        
        # Verify security event is logged
        assert any(e.event_type == "decryption_error" for e in pci_service.security_events)
    
    def test_mask_payment_card_number(self, pci_service):
        """Test PAN masking (PCI DSS Requirement 3.3)."""
        test_cases = [
            ("4242424242424242", "424242XXXXXXX4242"),
            ("4111 1111 1111 1111", "411111XXXXXXX1111"),
            ("4000-0000-0000-0002", "400000XXXXXXX0002"),
            ("", "XXXX-XXXX-XXXX-XXXX"),
            ("123", "XXXX-XXXX-XXXX-XXXX"),  # Too short
            ("37144963539843", "371449XXXXX9843"),  # Amex format
        ]
        
        for card_number, expected_mask in test_cases:
            masked = pci_service.mask_payment_card_number(card_number)
            assert len(masked) >= len("XXXX-XXXX-XXXX-XXXX")
            
            # For valid cards, verify first 6 and last 4 are shown
            if len(card_number) >= 10 and card_number.replace(" ", "").replace("-", "").isdigit():
                digits = ''.join(filter(str.isdigit, card_number))
                assert digits[:6] in masked
                assert digits[-4:] in masked


class TestAccessControls:
    """Test PCI DSS Requirement 7: Restrict access to cardholder data."""
    
    def test_validate_access_controls(self, pci_service):
        """Test access control validation."""
        user_id = "test_user_123"
        
        # Test access to sensitive resource
        sensitive_access = pci_service.validate_access_controls(
            user_id, "cardholder_data", "read"
        )
        
        # Should return True (simplified implementation)
        assert sensitive_access is True
        
        # Verify access attempt is logged
        access_events = [
            e for e in pci_service.security_events 
            if e.event_type == "access_attempt" and e.user_id == user_id
        ]
        assert len(access_events) > 0
        assert access_events[0].details["resource"] == "cardholder_data"
        assert access_events[0].details["action"] == "read"
    
    def test_access_logging_for_sensitive_resources(self, pci_service):
        """Test that access to sensitive resources is logged."""
        user_id = "test_user_456"
        sensitive_resources = [
            "cardholder_data", "payment_processing", "security_logs",
            "encryption_keys", "compliance_reports"
        ]
        
        for resource in sensitive_resources:
            pci_service.validate_access_controls(user_id, resource, "read")
        
        # All access attempts should be logged
        logged_resources = [
            e.details["resource"] for e in pci_service.security_events 
            if e.event_type == "access_attempt" and e.user_id == user_id
        ]
        
        for resource in sensitive_resources:
            assert resource in logged_resources
    
    def test_access_control_error_handling(self, pci_service):
        """Test access control error handling."""
        with patch.object(pci_service, '_log_security_event') as mock_log:
            # Simulate error in access validation
            with patch('builtins.len', side_effect=Exception("Database error")):
                result = pci_service.validate_access_controls("user", "resource", "read")
                
                assert result is False
                mock_log.assert_called_with(
                    event_type="access_control_error",
                    severity="high", 
                    details={"error": "Database error", "user_id": "user"}
                )


class TestSessionManagement:
    """Test PCI DSS Requirement 6.5.10: Proper session management."""
    
    def test_generate_secure_session_id(self, pci_service):
        """Test secure session ID generation."""
        session_id = pci_service.generate_secure_session_id()
        
        assert session_id is not None
        assert isinstance(session_id, str)
        assert len(session_id) >= 32  # Should be sufficiently long
        
        # Generate multiple IDs to ensure uniqueness
        session_ids = [pci_service.generate_secure_session_id() for _ in range(10)]
        assert len(set(session_ids)) == 10  # All should be unique


class TestPasswordSecurity:
    """Test PCI DSS Requirement 8.2.3: Passwords must be rendered unreadable."""
    
    def test_hash_password_securely(self, pci_service):
        """Test secure password hashing."""
        password = "test_password_123"
        
        result = pci_service.hash_password_securely(password)
        
        assert "hash" in result
        assert "salt" in result
        assert "algorithm" in result
        assert "iterations" in result
        
        assert result["algorithm"] == "pbkdf2_sha256"
        assert result["iterations"] == 100000
        assert result["hash"] != password
        assert len(result["salt"]) == 64  # 32 bytes hex encoded
    
    def test_hash_password_with_custom_salt(self, pci_service):
        """Test password hashing with custom salt."""
        password = "test_password"
        custom_salt = "custom_salt_value"
        
        result = pci_service.hash_password_securely(password, custom_salt)
        
        assert result["salt"] == custom_salt
    
    def test_verify_password_correct(self, pci_service):
        """Test password verification with correct password."""
        password = "correct_password"
        hash_result = pci_service.hash_password_securely(password)
        
        is_valid = pci_service.verify_password(
            password, hash_result["hash"], hash_result["salt"]
        )
        
        assert is_valid is True
    
    def test_verify_password_incorrect(self, pci_service):
        """Test password verification with incorrect password."""
        correct_password = "correct_password"
        wrong_password = "wrong_password"
        hash_result = pci_service.hash_password_securely(correct_password)
        
        is_valid = pci_service.verify_password(
            wrong_password, hash_result["hash"], hash_result["salt"]
        )
        
        assert is_valid is False
    
    def test_password_verification_error_handling(self, pci_service):
        """Test password verification error handling."""
        # Test with invalid hash data
        is_valid = pci_service.verify_password(
            "password", "invalid_hash", "invalid_salt"
        )
        
        assert is_valid is False
        
        # Verify error is logged
        assert any(e.event_type == "password_verification_error" for e in pci_service.security_events)


class TestSecurityEventLogging:
    """Test PCI DSS Requirement 10: Track and monitor all access."""
    
    def test_log_security_event(self, pci_service):
        """Test security event logging."""
        event_details = {
            "operation": "payment_processing",
            "amount": 100.00,
            "user_id": "test_user"
        }
        
        pci_service._log_security_event(
            event_type="payment_attempt",
            severity="medium",
            details=event_details,
            user_id="test_user",
            ip_address="192.168.1.1"
        )
        
        assert len(pci_service.security_events) == 1
        event = pci_service.security_events[0]
        
        assert event.event_type == "payment_attempt"
        assert event.severity == "medium"
        assert event.user_id == "test_user"
        assert event.ip_address == "192.168.1.1"
        assert event.details["operation"] == "payment_processing"
        assert event.details["amount"] == 100.00
        assert event.event_id is not None
        assert event.timestamp is not None
    
    def test_sanitize_log_data(self, pci_service):
        """Test sensitive data sanitization in logs."""
        sensitive_data = {
            "card_number": "4242424242424242",
            "cvv": "123",
            "password": "secret_password",
            "user_name": "John Doe",
            "safe_field": "safe_value"
        }
        
        sanitized = pci_service.sanitize_log_data(sensitive_data)
        
        assert sanitized["card_number"] == "[REDACTED]"
        assert sanitized["cvv"] == "[REDACTED]"
        assert sanitized["password"] == "[REDACTED]"
        assert sanitized["user_name"] == "John Doe"  # Not sensitive
        assert sanitized["safe_field"] == "safe_value"
    
    def test_sanitize_nested_log_data(self, pci_service):
        """Test sanitization of nested data structures."""
        nested_data = {
            "payment_info": {
                "pan": "4111111111111111",
                "amount": 50.00
            },
            "user_info": {
                "name": "Jane Smith",
                "track_data": "sensitive_magnetic_stripe_data"
            }
        }
        
        sanitized = pci_service.sanitize_log_data(nested_data)
        
        assert sanitized["payment_info"]["pan"] == "[REDACTED]"
        assert sanitized["payment_info"]["amount"] == 50.00
        assert sanitized["user_info"]["name"] == "Jane Smith"
        assert sanitized["user_info"]["track_data"] == "[REDACTED]"
    
    def test_pan_detection_in_strings(self, pci_service):
        """Test PAN detection and masking in string values."""
        data_with_pan = {
            "description": "Payment with card 4242424242424242",
            "normal_text": "This is normal text",
            "formatted_pan": "4111-1111-1111-1111"
        }
        
        sanitized = pci_service.sanitize_log_data(data_with_pan)
        
        assert "4242XXXXXXX4242" in sanitized["description"]
        assert "4242424242424242" not in sanitized["description"]
        assert "4111XXXXXXX1111" in sanitized["formatted_pan"]
        assert sanitized["normal_text"] == "This is normal text"


class TestComplianceRequirements:
    """Test PCI DSS compliance requirements management."""
    
    def test_get_compliance_requirements(self, pci_service):
        """Test retrieval of compliance requirements."""
        requirements = pci_service.get_compliance_requirements()
        
        assert isinstance(requirements, list)
        assert len(requirements) > 0
        
        # Check for key requirements
        requirement_ids = [req.requirement_id for req in requirements]
        assert "1.1.1" in requirement_ids  # Firewall configuration
        assert "3.4" in requirement_ids    # Render PAN unreadable
        assert "4.1" in requirement_ids    # Strong cryptography
        assert "8.1" in requirement_ids    # User identification
        assert "10.1" in requirement_ids   # Audit trail links
        
        # Verify requirement structure
        for req in requirements:
            assert isinstance(req, ComplianceRequirement)
            assert req.requirement_id is not None
            assert req.title is not None
            assert req.description is not None
            assert req.compliance_level == ComplianceLevel.LEVEL_1
            assert req.implementation_status is not None
            assert isinstance(req.evidence_required, list)
    
    def test_run_compliance_assessment(self, pci_service):
        """Test comprehensive compliance assessment."""
        assessment = pci_service.run_compliance_assessment()
        
        assert "assessment_date" in assessment
        assert "compliance_level" in assessment
        assert "overall_status" in assessment
        assert "critical_gaps" in assessment
        assert "security_events" in assessment
        assert "recommendations" in assessment
        assert "certification_status" in assessment
        
        # Check overall status structure
        overall_status = assessment["overall_status"]
        assert "compliance_percentage" in overall_status
        assert "total_requirements" in overall_status
        assert "implemented" in overall_status
        
        # Compliance percentage should be calculated correctly
        total = overall_status["total_requirements"]
        implemented = overall_status["implemented"]
        expected_percentage = (implemented / total) * 100
        assert assessment["overall_status"]["compliance_percentage"] == expected_percentage
    
    def test_generate_compliance_recommendations(self, pci_service):
        """Test compliance recommendation generation."""
        # Add some security events to test recommendations
        pci_service._log_security_event(
            event_type="high_value_transaction",
            severity="high",
            details={"amount": 1000}
        )
        
        assessment = pci_service.run_compliance_assessment()
        recommendations = assessment["recommendations"]
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        
        # Should include standard recommendations
        rec_text = " ".join(recommendations)
        assert "vulnerability" in rec_text.lower() or "scan" in rec_text.lower()
        assert "security" in rec_text.lower()
    
    def test_generate_compliance_report(self, pci_service):
        """Test compliance report generation."""
        report = pci_service.generate_compliance_report()
        
        assert isinstance(report, str)
        assert "PCI DSS Compliance Report" in report
        assert "Executive Summary" in report
        assert "Implementation Status" in report
        assert "Recommendations" in report
        
        # Report should contain assessment data
        assert "LEVEL_1" in report
        assert "%" in report  # Should contain percentage


class TestUtilityFunctions:
    """Test utility functions and decorators."""
    
    def test_secure_card_number_display(self):
        """Test secure card number display utility."""
        test_cases = [
            ("4242424242424242", True),
            ("4111111111111111", True),
            ("invalid", False)
        ]
        
        for card_number, should_be_masked in test_cases:
            result = secure_card_number_display(card_number)
            
            if should_be_masked and len(card_number) >= 10:
                assert card_number[:6] in result
                assert card_number[-4:] in result
                assert "X" in result
            else:
                assert result == "XXXX-XXXX-XXXX-XXXX"
    
    def test_validate_pci_access_utility(self):
        """Test PCI access validation utility."""
        result = validate_pci_access("user_123", "cardholder_data", "read")
        
        # Should use the global service instance
        assert isinstance(result, bool)
    
    def test_log_security_event_utility(self):
        """Test security event logging utility."""
        log_security_event(
            "test_event", 
            severity="low",
            user_id="test_user",
            action="test_action"
        )
        
        # Should add event to global service
        from services.pci_compliance import pci_compliance_service
        recent_events = [
            e for e in pci_compliance_service.security_events
            if e.event_type == "test_event"
        ]
        assert len(recent_events) > 0
    
    def test_pci_compliant_log_decorator(self):
        """Test PCI-compliant logging decorator."""
        @pci_compliant_log
        def test_function(arg1, arg2, keyword_arg=None):
            return f"Result: {arg1} {arg2} {keyword_arg}"
        
        result = test_function("hello", "world", keyword_arg="test")
        
        assert result == "Result: hello world test"
        
        # Should log function execution
        from services.pci_compliance import pci_compliance_service
        function_events = [
            e for e in pci_compliance_service.security_events
            if e.event_type == "function_execution"
        ]
        assert len(function_events) > 0
    
    def test_pci_compliant_log_decorator_error(self):
        """Test PCI-compliant logging decorator error handling."""
        @pci_compliant_log
        def failing_function():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            failing_function()
        
        # Should log function error
        from services.pci_compliance import pci_compliance_service
        error_events = [
            e for e in pci_compliance_service.security_events
            if e.event_type == "function_error"
        ]
        assert len(error_events) > 0
        assert error_events[-1].details["error"] == "Test error"


class TestComplianceIntegration:
    """Test integration aspects of PCI compliance."""
    
    def test_compliance_with_multiple_events(self, pci_service):
        """Test compliance assessment with various security events."""
        # Generate various types of security events
        event_types = [
            ("login_attempt", "low"),
            ("payment_processing", "medium"),
            ("access_denied", "high"),
            ("encryption_error", "critical"),
            ("fraud_detection", "high")
        ]
        
        for event_type, severity in event_types:
            pci_service._log_security_event(
                event_type=event_type,
                severity=severity,
                details={"test": "data"}
            )
        
        assessment = pci_service.run_compliance_assessment()
        
        # Security events should be reflected in assessment
        security_events = assessment["security_events"]
        assert security_events["last_30_days"] == len(event_types)
        assert security_events["high_severity"] == 3  # high and critical events
    
    def test_performance_with_large_event_volume(self, pci_service):
        """Test performance with large number of security events."""
        import time
        
        # Generate large number of events
        start_time = time.time()
        for i in range(1000):
            pci_service._log_security_event(
                event_type="performance_test",
                severity="low",
                details={"event_number": i}
            )
        
        # Run assessment
        assessment = pci_service.run_compliance_assessment()
        end_time = time.time()
        
        # Should complete in reasonable time (< 5 seconds)
        assert end_time - start_time < 5.0
        assert len(pci_service.security_events) == 1000
        assert assessment["security_events"]["last_30_days"] == 1000


# Integration tests with payment system
class TestPCIPaymentIntegration:
    """Test PCI compliance integration with payment processing."""
    
    def test_payment_data_encryption_flow(self, pci_service):
        """Test complete payment data encryption flow."""
        # Simulate payment processing flow
        card_data = {
            "number": "4242424242424242",
            "expiry": "12/25",
            "cvv": "123",
            "name": "John Doe"
        }
        
        # Encrypt sensitive fields
        encrypted_card = {}
        for key, value in card_data.items():
            if key in ["number", "cvv"]:
                encrypted_card[f"encrypted_{key}"] = pci_service.encrypt_cardholder_data(value)
            else:
                encrypted_card[key] = value
        
        # Verify sensitive data is encrypted
        assert "encrypted_number" in encrypted_card
        assert "encrypted_cvv" in encrypted_card
        assert encrypted_card["encrypted_number"] != card_data["number"]
        assert encrypted_card["encrypted_cvv"] != card_data["cvv"]
        
        # Verify non-sensitive data is preserved
        assert encrypted_card["name"] == card_data["name"]
        assert encrypted_card["expiry"] == card_data["expiry"]
        
        # Verify decryption works
        decrypted_number = pci_service.decrypt_cardholder_data(encrypted_card["encrypted_number"])
        assert decrypted_number == card_data["number"]
    
    def test_payment_logging_compliance(self, pci_service):
        """Test that payment operations are logged compliantly."""
        # Simulate payment operation
        payment_data = {
            "amount": 100.00,
            "currency": "USD",
            "card_number": "4242424242424242",
            "cvv": "123"
        }
        
        pci_service._log_security_event(
            event_type="payment_processing",
            severity="medium",
            details=payment_data,
            user_id="customer_123"
        )
        
        # Verify event was logged
        payment_events = [e for e in pci_service.security_events if e.event_type == "payment_processing"]
        assert len(payment_events) == 1
        
        event = payment_events[0]
        
        # Verify sensitive data was sanitized in log
        assert event.details["card_number"] == "[REDACTED]"
        assert event.details["cvv"] == "[REDACTED]"
        
        # Verify non-sensitive data was preserved
        assert event.details["amount"] == 100.00
        assert event.details["currency"] == "USD"


# Performance and stress tests
class TestPCICompliancePerformance:
    """Test performance aspects of PCI compliance service."""
    
    def test_encryption_performance(self, pci_service):
        """Test encryption performance with multiple operations."""
        import time
        
        test_data = ["4242424242424242"] * 100
        
        start_time = time.time()
        encrypted_data = [pci_service.encrypt_cardholder_data(data) for data in test_data]
        encryption_time = time.time() - start_time
        
        start_time = time.time()
        decrypted_data = [pci_service.decrypt_cardholder_data(data) for data in encrypted_data]
        decryption_time = time.time() - start_time
        
        # Should complete operations quickly
        assert encryption_time < 2.0  # Less than 2 seconds for 100 operations
        assert decryption_time < 2.0
        
        # Verify data integrity
        assert all(original == decrypted for original, decrypted in zip(test_data, decrypted_data))
    
    def test_compliance_assessment_performance(self, pci_service):
        """Test compliance assessment performance."""
        import time
        
        # Add many security events
        for i in range(500):
            pci_service._log_security_event(
                event_type=f"test_event_{i % 10}",
                severity=["low", "medium", "high"][i % 3],
                details={"event_id": i}
            )
        
        # Run assessment and measure time
        start_time = time.time()
        assessment = pci_service.run_compliance_assessment()
        assessment_time = time.time() - start_time
        
        # Should complete quickly even with many events
        assert assessment_time < 3.0  # Less than 3 seconds
        
        # Assessment should be complete
        assert "overall_status" in assessment
        assert assessment["security_events"]["last_30_days"] == 500