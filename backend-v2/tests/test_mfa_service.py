"""
Test cases for MFA Service
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import pyotp
import hashlib

from services.mfa_service import MFAService
from models.mfa import UserMFASecret, MFABackupCode, MFADeviceTrust
from models import User


class TestMFAService:
    """Test cases for MFA Service"""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database session"""
        db = Mock()
        db.query = Mock()
        db.add = Mock()
        db.commit = Mock()
        db.rollback = Mock()
        return db
    
    @pytest.fixture
    def mock_user(self):
        """Create a mock user"""
        user = Mock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        return user
    
    def test_generate_totp_secret(self):
        """Test TOTP secret generation"""
        secret = MFAService.generate_totp_secret()
        
        # Should be a valid base32 string
        assert isinstance(secret, str)
        assert len(secret) == 32
        
        # Should be valid for pyotp
        totp = pyotp.TOTP(secret)
        assert totp.now() is not None
    
    def test_create_qr_code(self):
        """Test QR code generation"""
        email = "test@example.com"
        secret = MFAService.generate_totp_secret()
        
        qr_code = MFAService.create_qr_code(email, secret)
        
        # Should return base64 encoded image
        assert qr_code.startswith("data:image/png;base64,")
        assert len(qr_code) > 100
    
    @patch('services.mfa_service.encrypt_data')
    def test_setup_mfa_new_user(self, mock_encrypt, mock_db, mock_user):
        """Test MFA setup for new user"""
        # Setup mocks
        mock_encrypt.return_value = "encrypted_secret"
        mock_db.query().filter().first.side_effect = [None, mock_user]  # No existing MFA, then user
        
        # Test setup
        result = MFAService.setup_mfa(user_id=1, db=mock_db)
        
        # Verify results
        assert "secret" in result
        assert "qr_code" in result
        assert "backup_codes" in result
        assert "totp_uri" in result
        assert len(result["backup_codes"]) == MFAService.BACKUP_CODES_COUNT
    
    def test_verify_totp_code_success(self, mock_db):
        """Test successful TOTP verification"""
        # Create real secret for testing
        secret = MFAService.generate_totp_secret()
        totp = pyotp.TOTP(secret)
        current_code = totp.now()
        
        # Mock MFA secret
        mock_mfa = Mock(spec=UserMFASecret)
        mock_mfa.is_enabled = True
        mock_mfa.failed_attempts = 0
        mock_mfa.last_failed_at = None
        
        mock_db.query().filter().first.return_value = mock_mfa
        
        # Mock decrypt to return our test secret
        with patch('services.mfa_service.decrypt_data', return_value=secret):
            success, error = MFAService.verify_totp_code(
                user_id=1,
                code=current_code,
                db=mock_db
            )
        
        assert success is True
        assert error is None
        assert mock_mfa.failed_attempts == 0
        assert mock_mfa.last_used_at is not None
    
    def test_verify_totp_code_invalid(self, mock_db):
        """Test TOTP verification with invalid code"""
        secret = MFAService.generate_totp_secret()
        
        # Mock MFA secret
        mock_mfa = Mock(spec=UserMFASecret)
        mock_mfa.is_enabled = True
        mock_mfa.failed_attempts = 0
        mock_mfa.last_failed_at = None
        
        mock_db.query().filter().first.return_value = mock_mfa
        
        # Mock decrypt to return our test secret
        with patch('services.mfa_service.decrypt_data', return_value=secret):
            success, error = MFAService.verify_totp_code(
                user_id=1,
                code="000000",  # Invalid code
                db=mock_db
            )
        
        assert success is False
        assert error == "Invalid code"
        assert mock_mfa.failed_attempts == 1
    
    def test_verify_backup_code_success(self, mock_db):
        """Test successful backup code verification"""
        # Generate a test backup code
        test_code = "ABCD-EFGH"
        normalized_code = test_code.upper().replace(' ', '').replace('-', '')
        code_hash = hashlib.sha256(normalized_code.encode()).hexdigest()
        
        # Mock backup code
        mock_backup = Mock(spec=MFABackupCode)
        mock_backup.id = 1
        mock_backup.is_used = False
        
        mock_db.query().filter().first.return_value = mock_backup
        
        success, error = MFAService.verify_backup_code(
            user_id=1,
            code=test_code,
            db=mock_db
        )
        
        assert success is True
        assert error is None
        assert mock_backup.is_used is True
        assert mock_backup.used_at is not None
    
    def test_trust_device(self, mock_db):
        """Test device trust creation"""
        trust_token = MFAService.trust_device(
            user_id=1,
            device_fingerprint="test_fingerprint",
            device_name="Test Device",
            browser="Chrome",
            platform="Windows",
            ip_address="127.0.0.1",
            db=mock_db
        )
        
        # Should return a trust token
        assert isinstance(trust_token, str)
        assert len(trust_token) > 20
        
        # Should add device trust to database
        assert mock_db.add.called
        assert mock_db.commit.called
    
    def test_verify_device_trust_valid(self, mock_db):
        """Test valid device trust verification"""
        # Mock device trust
        mock_device = Mock(spec=MFADeviceTrust)
        mock_device.is_valid = True
        mock_device.last_used_at = None
        mock_device.usage_count = 0
        
        mock_db.query().filter().first.return_value = mock_device
        
        is_valid = MFAService.verify_device_trust(
            user_id=1,
            trust_token="test_token",
            device_fingerprint="test_fingerprint",
            db=mock_db
        )
        
        assert is_valid is True
        assert mock_device.usage_count == 1
        assert mock_device.last_used_at is not None
    
    def test_disable_mfa(self, mock_db):
        """Test MFA disabling"""
        # Mock MFA secret
        mock_mfa = Mock(spec=UserMFASecret)
        mock_mfa.is_enabled = True
        
        mock_db.query().filter().first.return_value = mock_mfa
        mock_db.query().filter().delete.return_value = None
        
        success = MFAService.disable_mfa(
            user_id=1,
            reason="User requested",
            db=mock_db
        )
        
        assert success is True
        assert mock_mfa.is_enabled is False
        assert mock_mfa.disabled_at is not None
    
    def test_get_mfa_status(self, mock_db):
        """Test getting MFA status"""
        # Mock MFA secret
        mock_mfa = Mock(spec=UserMFASecret)
        mock_mfa.is_enabled = True
        mock_mfa.is_verified = True
        mock_mfa.last_used_at = datetime.utcnow()
        mock_mfa.recovery_email = "recovery@example.com"
        mock_mfa.recovery_phone = None
        
        mock_db.query().filter().first.return_value = mock_mfa
        mock_db.query().filter().count.side_effect = [5, 2]  # backup codes, trusted devices
        
        status = MFAService.get_mfa_status(user_id=1, db=mock_db)
        
        assert status["enabled"] is True
        assert status["verified"] is True
        assert status["setup_required"] is False
        assert status["backup_codes_remaining"] == 5
        assert status["trusted_devices"] == 2
        assert status["recovery_email"] == "recovery@example.com"
    
    def test_account_lockout(self, mock_db):
        """Test account lockout after max failed attempts"""
        secret = MFAService.generate_totp_secret()
        
        # Mock MFA secret with max failed attempts
        mock_mfa = Mock(spec=UserMFASecret)
        mock_mfa.is_enabled = True
        mock_mfa.failed_attempts = MFAService.MAX_FAILED_ATTEMPTS
        mock_mfa.last_failed_at = datetime.utcnow()
        
        mock_db.query().filter().first.return_value = mock_mfa
        
        with patch('services.mfa_service.decrypt_data', return_value=secret):
            success, error = MFAService.verify_totp_code(
                user_id=1,
                code="000000",
                db=mock_db
            )
        
        assert success is False
        assert "Account locked" in error
    
    def test_cleanup_expired_devices(self, mock_db):
        """Test cleanup of expired device trusts"""
        # Mock expired devices
        expired_device1 = Mock(spec=MFADeviceTrust)
        expired_device1.trusted_until = datetime.utcnow() - timedelta(days=1)
        expired_device1.revoked_at = None
        
        expired_device2 = Mock(spec=MFADeviceTrust)
        expired_device2.trusted_until = datetime.utcnow() - timedelta(days=2)
        expired_device2.revoked_at = None
        
        mock_db.query().filter().all.return_value = [expired_device1, expired_device2]
        
        count = MFAService.cleanup_expired_devices(db=mock_db)
        
        assert count == 2
        assert expired_device1.revoked_at is not None
        assert expired_device1.revoked_reason == "Expired"
        assert expired_device2.revoked_at is not None
        assert expired_device2.revoked_reason == "Expired"