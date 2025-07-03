"""
Comprehensive unit tests for GDPR compliance and privacy API endpoints.
Tests cookie consent, data export, consent tracking, and privacy status functionality.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from httpx import AsyncClient
from sqlalchemy.orm import Session

from models.consent import (
    UserConsent, CookieConsent, DataProcessingLog, DataExportRequest, LegalConsentAudit,
    ConsentType, ConsentStatus, DataProcessingPurpose, ExportStatus
)
from schemas_new.privacy import (
    CookiePreferences, CookieConsentRequest, ConsentUpdate, ConsentType as ConsentTypeSchema,
    ConsentStatus as ConsentStatusSchema, DataExportRequest as DataExportRequestSchema,
    AccountDeletionRequest, BulkConsentUpdate
)


class TestCookieConsentAPI:
    """Test cookie consent endpoints"""
    
    @pytest.mark.asyncio
    async def test_save_cookie_preferences_anonymous(self, async_client: AsyncClient, db: Session):
        """Test saving cookie preferences for anonymous user"""
        cookie_request = {
            "session_id": "test-session-123",
            "preferences": {
                "functional": True,
                "analytics": False,
                "marketing": True,
                "preferences": True
            }
        }
        
        response = await async_client.post("/api/v1/privacy/cookie-consent", json=cookie_request)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_id"] == "test-session-123"
        assert data["preferences"]["functional"] is True
        assert data["preferences"]["analytics"] is False
        assert data["preferences"]["marketing"] is True
        assert data["preferences"]["preferences"] is True
        assert "id" in data
        assert "consent_date" in data
        assert "expiry_date" in data
        
        # Verify database record
        consent = db.query(CookieConsent).filter(CookieConsent.session_id == "test-session-123").first()
        assert consent is not None
        assert consent.user_id is None
        assert consent.analytics is False
        assert consent.marketing is True
    
    @pytest.mark.asyncio
    async def test_save_cookie_preferences_authenticated(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test saving cookie preferences for authenticated user"""
        cookie_request = {
            "session_id": "auth-session-456",
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": False,
                "preferences": True
            }
        }
        
        response = await async_client.post(
            "/api/v1/privacy/cookie-consent",
            json=cookie_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == test_user.id
        assert data["session_id"] == "auth-session-456"
        assert data["preferences"]["analytics"] is True
        assert data["preferences"]["marketing"] is False
        
        # Verify audit log was created
        audit = db.query(LegalConsentAudit).filter(
            LegalConsentAudit.user_id == test_user.id,
            LegalConsentAudit.action == "cookie_consent_updated"
        ).first()
        assert audit is not None
        assert "Analytics: True" in audit.reason
        assert "Marketing: False" in audit.reason
    
    @pytest.mark.asyncio
    async def test_update_existing_cookie_preferences(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test updating existing cookie preferences"""
        # Create initial consent
        initial_consent = CookieConsent(
            user_id=test_user.id,
            session_id="update-session",
            functional=True,
            analytics=False,
            marketing=False,
            preferences=True
        )
        db.add(initial_consent)
        db.commit()
        
        # Update preferences
        cookie_request = {
            "session_id": "update-session",
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": True,
                "preferences": False
            }
        }
        
        response = await async_client.post(
            "/api/v1/privacy/cookie-consent",
            json=cookie_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should be same record ID (updated, not new)
        assert data["id"] == initial_consent.id
        assert data["preferences"]["analytics"] is True
        assert data["preferences"]["marketing"] is True
        assert data["preferences"]["preferences"] is False
    
    @pytest.mark.asyncio
    async def test_get_cookie_preferences_authenticated(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test retrieving cookie preferences for authenticated user"""
        # Create consent record
        consent = CookieConsent(
            user_id=test_user.id,
            session_id="get-session",
            functional=True,
            analytics=True,
            marketing=False,
            preferences=True
        )
        db.add(consent)
        db.commit()
        
        response = await async_client.get("/api/v1/privacy/cookie-consent", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == test_user.id
        assert data["preferences"]["analytics"] is True
        assert data["preferences"]["marketing"] is False
    
    @pytest.mark.asyncio
    async def test_get_cookie_preferences_by_session(self, async_client: AsyncClient, db: Session):
        """Test retrieving cookie preferences by session ID"""
        # Create consent record
        consent = CookieConsent(
            session_id="session-lookup",
            functional=True,
            analytics=False,
            marketing=True,
            preferences=False
        )
        db.add(consent)
        db.commit()
        
        response = await async_client.get("/api/v1/privacy/cookie-consent?session_id=session-lookup")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_id"] == "session-lookup"
        assert data["user_id"] is None
        assert data["preferences"]["marketing"] is True
    
    @pytest.mark.asyncio
    async def test_get_expired_cookie_preferences(self, async_client: AsyncClient, db: Session):
        """Test that expired cookie preferences return None"""
        # Create expired consent
        expired_date = datetime.utcnow() - timedelta(days=1)
        consent = CookieConsent(
            session_id="expired-session",
            functional=True,
            analytics=True,
            marketing=True,
            preferences=True,
            expiry_date=expired_date
        )
        db.add(consent)
        db.commit()
        
        response = await async_client.get("/api/v1/privacy/cookie-consent?session_id=expired-session")
        
        assert response.status_code == 200
        assert response.json() is None
    
    @pytest.mark.asyncio
    async def test_cookie_consent_without_session_id(self, async_client: AsyncClient):
        """Test that cookie consent creates session ID if not provided"""
        cookie_request = {
            "preferences": {
                "functional": True,
                "analytics": False,
                "marketing": False,
                "preferences": True
            }
        }
        
        response = await async_client.post("/api/v1/privacy/cookie-consent", json=cookie_request)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "session_id" in data
        assert len(data["session_id"]) > 0  # Session ID was generated


class TestConsentAPI:
    """Test consent management endpoints"""
    
    @pytest.mark.asyncio
    async def test_accept_terms_consent(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test accepting terms of service consent"""
        consent_request = {
            "consent_type": "terms_of_service",
            "status": "granted",
            "version": "1.0",
            "notes": "Accepted during registration"
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=consent_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == test_user.id
        assert data["consent_type"] == "terms_of_service"
        assert data["status"] == "granted"
        assert data["version"] == "1.0"
        assert "consent_date" in data
        assert data["withdrawal_date"] is None
        
        # Verify database record
        consent = db.query(UserConsent).filter(
            UserConsent.user_id == test_user.id,
            UserConsent.consent_type == ConsentType.TERMS_OF_SERVICE
        ).first()
        assert consent is not None
        assert consent.status == ConsentStatus.GRANTED
    
    @pytest.mark.asyncio
    async def test_withdraw_consent(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test withdrawing previously granted consent"""
        # Create initial consent
        initial_consent = UserConsent(
            user_id=test_user.id,
            consent_type=ConsentType.MARKETING_EMAILS,
            status=ConsentStatus.GRANTED
        )
        db.add(initial_consent)
        db.commit()
        
        # Withdraw consent
        consent_request = {
            "consent_type": "marketing_emails",
            "status": "withdrawn",
            "notes": "User opted out"
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=consent_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "withdrawn"
        assert "withdrawal_date" in data
        assert data["withdrawal_date"] is not None
        
        # Verify audit log
        audit = db.query(LegalConsentAudit).filter(
            LegalConsentAudit.user_id == test_user.id,
            LegalConsentAudit.action == "consent_withdrawn"
        ).first()
        assert audit is not None
        assert audit.old_status == "granted"
        assert audit.new_status == "withdrawn"
    
    @pytest.mark.asyncio
    async def test_bulk_consent_update(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test updating multiple consents at once"""
        bulk_request = {
            "consents": [
                {
                    "consent_type": "terms_of_service",
                    "status": "granted",
                    "version": "2.0"
                },
                {
                    "consent_type": "privacy_policy",
                    "status": "granted",
                    "version": "2.0"
                },
                {
                    "consent_type": "marketing_emails",
                    "status": "denied"
                }
            ]
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/bulk",
            json=bulk_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3
        
        # Verify all consents
        consent_types = [item["consent_type"] for item in data]
        assert "terms_of_service" in consent_types
        assert "privacy_policy" in consent_types
        assert "marketing_emails" in consent_types
        
        # Check specific consent status
        marketing_consent = next(item for item in data if item["consent_type"] == "marketing_emails")
        assert marketing_consent["status"] == "denied"
    
    @pytest.mark.asyncio
    async def test_bulk_accept_all_consents(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test accepting all consents with accept_all flag"""
        bulk_request = {
            "accept_all": True
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/bulk",
            json=bulk_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have consents for all types
        assert len(data) > 0
        
        # All should be granted
        for consent in data:
            assert consent["status"] == "granted"
    
    @pytest.mark.asyncio
    async def test_consent_requires_authentication(self, async_client: AsyncClient):
        """Test that consent endpoints require authentication"""
        consent_request = {
            "consent_type": "terms_of_service",
            "status": "granted"
        }
        
        response = await async_client.post("/api/v1/privacy/consent/terms", json=consent_request)
        
        assert response.status_code == 401


class TestDataExportAPI:
    """Test data export functionality"""
    
    @pytest.mark.asyncio
    async def test_request_data_export(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test requesting a data export"""
        response = await async_client.get(
            "/api/v1/privacy/export?format=json",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "request_id" in data
        assert data["status"] == "pending"
        assert data["format"] == "json"
        assert "message" in data
        assert "GDPR requirements" in data["message"]
        
        # Verify database record
        export_request = db.query(DataExportRequest).filter(
            DataExportRequest.user_id == test_user.id
        ).first()
        assert export_request is not None
        assert export_request.status == ExportStatus.PENDING
        assert export_request.format == "json"
    
    @pytest.mark.asyncio
    async def test_duplicate_export_request_conflict(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test that duplicate export requests are rejected"""
        # Create pending export request
        existing_request = DataExportRequest(
            user_id=test_user.id,
            format="json",
            status=ExportStatus.PENDING
        )
        db.add(existing_request)
        db.commit()
        
        response = await async_client.get(
            "/api/v1/privacy/export?format=csv",
            headers=auth_headers
        )
        
        assert response.status_code == 409
        assert "already in progress" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_check_export_status(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test checking export status"""
        # Create export request
        export_request = DataExportRequest(
            user_id=test_user.id,
            request_id="TEST-12345678-20250703",
            format="json",
            status=ExportStatus.PROCESSING
        )
        db.add(export_request)
        db.commit()
        
        response = await async_client.get(
            f"/api/v1/privacy/export/{export_request.request_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["request_id"] == export_request.request_id
        assert data["status"] == "processing"
        assert data["progress_percentage"] == 50  # Processing = 50%
        assert "estimated_completion" in data
    
    @pytest.mark.asyncio
    async def test_check_nonexistent_export_status(self, async_client: AsyncClient, auth_headers: dict):
        """Test checking status of non-existent export"""
        response = await async_client.get(
            "/api/v1/privacy/export/NONEXISTENT-12345678-20250703",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_check_other_user_export_status(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_admin):
        """Test that users can't access other users' exports"""
        # Create export request for different user
        export_request = DataExportRequest(
            user_id=test_admin.id,
            request_id="ADMIN-12345678-20250703",
            format="json",
            status=ExportStatus.PENDING
        )
        db.add(export_request)
        db.commit()
        
        response = await async_client.get(
            f"/api/v1/privacy/export/{export_request.request_id}",
            headers=auth_headers  # test_user headers, not admin
        )
        
        assert response.status_code == 404


class TestAccountDeletionAPI:
    """Test account deletion functionality"""
    
    @pytest.mark.asyncio
    async def test_request_account_deletion(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test requesting account deletion"""
        deletion_request = {
            "reason": "No longer need service",
            "feedback": "Great service, just don't need it anymore"
        }
        
        response = await async_client.delete(
            "/api/v1/privacy/account",
            json=deletion_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "30 days" in data["message"]
        assert "deletion_date" in data
        assert data["data_retention_days"] == 30
        
        # Verify user is deactivated
        db.refresh(test_user)
        assert test_user.is_active is False
        assert test_user.deactivated_at is not None
        
        # Verify audit log
        audit = db.query(LegalConsentAudit).filter(
            LegalConsentAudit.user_id == test_user.id,
            LegalConsentAudit.action == "account_deletion_requested"
        ).first()
        assert audit is not None
        assert audit.reason == deletion_request["reason"]
    
    @pytest.mark.asyncio
    async def test_account_deletion_withdraws_consents(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test that account deletion withdraws all granted consents"""
        # Create some granted consents
        consents = [
            UserConsent(
                user_id=test_user.id,
                consent_type=ConsentType.MARKETING_EMAILS,
                status=ConsentStatus.GRANTED
            ),
            UserConsent(
                user_id=test_user.id,
                consent_type=ConsentType.MARKETING_SMS,
                status=ConsentStatus.GRANTED
            )
        ]
        for consent in consents:
            db.add(consent)
        db.commit()
        
        deletion_request = {
            "reason": "Privacy concerns"
        }
        
        response = await async_client.delete(
            "/api/v1/privacy/account",
            json=deletion_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify consents were withdrawn
        updated_consents = db.query(UserConsent).filter(
            UserConsent.user_id == test_user.id
        ).all()
        
        for consent in updated_consents:
            assert consent.status == ConsentStatus.WITHDRAWN
            assert consent.withdrawal_date is not None


class TestPrivacyStatusAPI:
    """Test privacy status and audit endpoints"""
    
    @pytest.mark.asyncio
    async def test_get_privacy_status(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test getting comprehensive privacy status"""
        # Create some test data
        consents = [
            UserConsent(
                user_id=test_user.id,
                consent_type=ConsentType.TERMS_OF_SERVICE,
                status=ConsentStatus.GRANTED
            ),
            UserConsent(
                user_id=test_user.id,
                consent_type=ConsentType.PRIVACY_POLICY,
                status=ConsentStatus.GRANTED
            ),
            UserConsent(
                user_id=test_user.id,
                consent_type=ConsentType.MARKETING_EMAILS,
                status=ConsentStatus.DENIED
            )
        ]
        for consent in consents:
            db.add(consent)
        
        # Create cookie consent
        cookie_consent = CookieConsent(
            user_id=test_user.id,
            session_id="status-test",
            functional=True,
            analytics=True,
            marketing=False,
            preferences=True
        )
        db.add(cookie_consent)
        db.commit()
        
        response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["gdpr_compliant"] is True  # Has required consents
        assert data["data_export_available"] is True
        assert data["pending_export_request"] is None
        
        # Check consents
        assert data["consents"]["terms_of_service"] == "granted"
        assert data["consents"]["privacy_policy"] == "granted"
        assert data["consents"]["marketing_emails"] == "denied"
        
        # Check cookie preferences
        assert data["cookie_preferences"]["functional"] is True
        assert data["cookie_preferences"]["analytics"] is True
        assert data["cookie_preferences"]["marketing"] is False
    
    @pytest.mark.asyncio
    async def test_privacy_status_non_compliant(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test privacy status when user is not GDPR compliant"""
        # Only create marketing consent, missing required ones
        consent = UserConsent(
            user_id=test_user.id,
            consent_type=ConsentType.MARKETING_EMAILS,
            status=ConsentStatus.GRANTED
        )
        db.add(consent)
        db.commit()
        
        response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["gdpr_compliant"] is False  # Missing required consents
    
    @pytest.mark.asyncio
    async def test_privacy_status_with_pending_export(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test privacy status with pending export request"""
        # Create pending export
        export_request = DataExportRequest(
            user_id=test_user.id,
            request_id="PENDING-12345678-20250703",
            status=ExportStatus.PROCESSING
        )
        db.add(export_request)
        db.commit()
        
        response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["data_export_available"] is False
        assert data["pending_export_request"] == export_request.request_id
    
    @pytest.mark.asyncio
    async def test_get_consent_audit_log(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test getting consent audit log"""
        # Create some audit entries
        audit_entries = [
            LegalConsentAudit(
                user_id=test_user.id,
                action="consent_granted",
                consent_type="terms_of_service",
                new_status="granted",
                reason="User registration"
            ),
            LegalConsentAudit(
                user_id=test_user.id,
                action="consent_withdrawn",
                consent_type="marketing_emails",
                old_status="granted",
                new_status="withdrawn",
                reason="User request"
            )
        ]
        for entry in audit_entries:
            db.add(entry)
        db.commit()
        
        response = await async_client.get("/api/v1/privacy/audit-log", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 2
        assert data["page"] == 1
        assert data["per_page"] == 50
        assert len(data["entries"]) == 2
        
        # Check entries are sorted by timestamp desc (most recent first)
        entries = data["entries"]
        assert entries[0]["action"] == "consent_withdrawn"
        assert entries[1]["action"] == "consent_granted"
    
    @pytest.mark.asyncio
    async def test_audit_log_pagination(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test audit log pagination"""
        # Create multiple audit entries
        for i in range(25):
            audit = LegalConsentAudit(
                user_id=test_user.id,
                action=f"test_action_{i}",
                reason=f"Test reason {i}"
            )
            db.add(audit)
        db.commit()
        
        # Test first page
        response = await async_client.get("/api/v1/privacy/audit-log?page=1&per_page=10", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 25
        assert data["page"] == 1
        assert data["per_page"] == 10
        assert len(data["entries"]) == 10
        
        # Test second page
        response = await async_client.get("/api/v1/privacy/audit-log?page=2&per_page=10", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 2
        assert len(data["entries"]) == 10


class TestDataProcessingLogging:
    """Test data processing activity logging"""
    
    @pytest.mark.asyncio
    async def test_cookie_consent_logs_processing(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test that cookie consent creates data processing log"""
        cookie_request = {
            "session_id": "logging-test",
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": False,
                "preferences": True
            }
        }
        
        response = await async_client.post(
            "/api/v1/privacy/cookie-consent",
            json=cookie_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify data processing log was created
        log = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == test_user.id,
            DataProcessingLog.purpose == DataProcessingPurpose.CONSENT_MANAGEMENT,
            DataProcessingLog.operation == "cookie_consent_update"
        ).first()
        
        assert log is not None
        assert "cookie_preferences" in log.data_categories
        assert log.legal_basis == "consent"
    
    @pytest.mark.asyncio
    async def test_consent_update_logs_processing(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test that consent updates create data processing logs"""
        consent_request = {
            "consent_type": "terms_of_service",
            "status": "granted",
            "version": "1.0"
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=consent_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify data processing log
        log = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == test_user.id,
            DataProcessingLog.purpose == DataProcessingPurpose.CONSENT_MANAGEMENT,
            DataProcessingLog.operation == "consent_update_terms_of_service"
        ).first()
        
        assert log is not None
        assert "consent_status" in log.data_categories
        assert "consent_metadata" in log.data_categories
    
    @pytest.mark.asyncio
    async def test_export_request_logs_processing(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user):
        """Test that export requests create data processing logs"""
        response = await async_client.get("/api/v1/privacy/export", headers=auth_headers)
        
        assert response.status_code == 200
        
        # Verify data processing log
        log = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == test_user.id,
            DataProcessingLog.purpose == DataProcessingPurpose.DATA_EXPORT,
            DataProcessingLog.operation == "data_export_request"
        ).first()
        
        assert log is not None
        assert "profile" in log.data_categories
        assert "appointments" in log.data_categories
        assert "payments" in log.data_categories
        assert "consents" in log.data_categories
        assert "preferences" in log.data_categories


class TestPrivacyAPIErrorHandling:
    """Test error handling and edge cases"""
    
    @pytest.mark.asyncio
    async def test_invalid_consent_type(self, async_client: AsyncClient, auth_headers: dict):
        """Test handling of invalid consent type"""
        consent_request = {
            "consent_type": "invalid_type",
            "status": "granted"
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=consent_request,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_invalid_consent_status(self, async_client: AsyncClient, auth_headers: dict):
        """Test handling of invalid consent status"""
        consent_request = {
            "consent_type": "terms_of_service",
            "status": "invalid_status"
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=consent_request,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_invalid_export_format(self, async_client: AsyncClient, auth_headers: dict):
        """Test handling of invalid export format"""
        response = await async_client.get(
            "/api/v1/privacy/export?format=invalid_format",
            headers=auth_headers
        )
        
        # Should still work, format is not strictly validated in current implementation
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_malformed_cookie_preferences(self, async_client: AsyncClient):
        """Test handling of malformed cookie preferences"""
        cookie_request = {
            "preferences": {
                "functional": "not_a_boolean",
                "analytics": None,
                "marketing": True
            }
        }
        
        response = await async_client.post("/api/v1/privacy/cookie-consent", json=cookie_request)
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_missing_required_fields(self, async_client: AsyncClient, auth_headers: dict):
        """Test handling of missing required fields"""
        # Missing consent_type
        consent_request = {
            "status": "granted"
        }
        
        response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=consent_request,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error