"""
Comprehensive integration tests for GDPR compliance and cookie consent system.
Tests complete GDPR flows, cookie preference persistence, data export generation,
and consent audit trail across the entire system.
"""

import pytest
import asyncio
import json
import tempfile
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from main import app
from models.consent import (
    UserConsent, CookieConsent, DataProcessingLog, DataExportRequest, LegalConsentAudit,
    ConsentType, ConsentStatus, DataProcessingPurpose, ExportStatus
)
from models import User


class TestGDPRComplianceIntegration:
    """Test complete GDPR compliance flows"""
    
    @pytest.mark.asyncio
    async def test_complete_consent_flow(self, async_client: AsyncClient, db: Session, test_user: User, auth_headers: dict):
        """Test complete user consent flow from registration to full consent"""
        
        # Step 1: Initial registration should create minimal consent records
        registration_data = {
            "name": "GDPR Test User",
            "email": "gdpr@example.com", 
            "password": "testpass123",
            "consent_terms": True,
            "consent_privacy": True
        }
        
        registration_response = await async_client.post("/api/v1/auth/register", json=registration_data)
        assert registration_response.status_code == 201
        
        # Step 2: Cookie consent flow (anonymous first)
        cookie_consent_data = {
            "session_id": "integration-test-session",
            "preferences": {
                "functional": True,
                "analytics": False,
                "marketing": False,
                "preferences": True
            }
        }
        
        cookie_response = await async_client.post("/api/v1/privacy/cookie-consent", json=cookie_consent_data)
        assert cookie_response.status_code == 200
        cookie_data = cookie_response.json()
        assert cookie_data["session_id"] == "integration-test-session"
        assert cookie_data["preferences"]["analytics"] is False
        
        # Step 3: Update cookie consent after authentication
        authenticated_cookie_data = {
            "session_id": "integration-test-session",
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": False,
                "preferences": True
            }
        }
        
        auth_cookie_response = await async_client.post(
            "/api/v1/privacy/cookie-consent", 
            json=authenticated_cookie_data,
            headers=auth_headers
        )
        assert auth_cookie_response.status_code == 200
        
        # Step 4: Add marketing consent
        marketing_consent = {
            "consent_type": "marketing_emails",
            "status": "granted",
            "version": "1.0",
            "notes": "User opted in to email marketing"
        }
        
        consent_response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=marketing_consent,
            headers=auth_headers
        )
        assert consent_response.status_code == 200
        
        # Step 5: Verify complete privacy status
        status_response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        
        # Should be GDPR compliant with all required consents
        assert status_data["gdpr_compliant"] is True
        assert status_data["consents"]["marketing_emails"] == "granted"
        assert status_data["cookie_preferences"]["analytics"] is True
        
        # Step 6: Verify audit trail exists
        audit_response = await async_client.get("/api/v1/privacy/audit-log", headers=auth_headers)
        assert audit_response.status_code == 200
        audit_data = audit_response.json()
        
        assert audit_data["total"] >= 3  # At least cookie consent, terms consent, marketing consent
        assert any(entry["action"] == "cookie_consent_updated" for entry in audit_data["entries"])
        assert any(entry["action"] == "consent_granted" for entry in audit_data["entries"])
    
    @pytest.mark.asyncio
    async def test_consent_withdrawal_flow(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test complete consent withdrawal and its effects"""
        
        # Step 1: Grant all consents first
        bulk_consent = {
            "accept_all": True
        }
        
        grant_response = await async_client.post(
            "/api/v1/privacy/consent/bulk",
            json=bulk_consent,
            headers=auth_headers
        )
        assert grant_response.status_code == 200
        
        # Step 2: Verify all consents are granted
        status_response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        status_data = status_response.json()
        assert status_data["gdpr_compliant"] is True
        
        # Step 3: Withdraw marketing consent
        withdraw_consent = {
            "consent_type": "marketing_emails",
            "status": "withdrawn",
            "notes": "User requested withdrawal"
        }
        
        withdraw_response = await async_client.post(
            "/api/v1/privacy/consent/terms",
            json=withdraw_consent,
            headers=auth_headers
        )
        assert withdraw_response.status_code == 200
        
        # Step 4: Verify consent status updated
        updated_status = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        updated_data = updated_status.json()
        assert updated_data["consents"]["marketing_emails"] == "withdrawn"
        
        # Step 5: Verify audit trail records withdrawal
        audit_response = await async_client.get("/api/v1/privacy/audit-log", headers=auth_headers)
        audit_data = audit_response.json()
        
        withdrawal_entry = next((entry for entry in audit_data["entries"] 
                               if entry["action"] == "consent_withdrawn"), None)
        assert withdrawal_entry is not None
        assert withdrawal_entry["old_status"] == "granted"
        assert withdrawal_entry["new_status"] == "withdrawn"
        
        # Step 6: Verify data processing logs reflect withdrawal
        processing_logs = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == test_user.id,
            DataProcessingLog.operation.contains("consent_update")
        ).all()
        assert len(processing_logs) >= 2  # Grant and withdrawal
    
    @pytest.mark.asyncio
    async def test_data_export_complete_flow(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test complete data export request and processing flow"""
        
        # Step 1: Create some user data first
        # Add consents
        bulk_consent = {"accept_all": True}
        await async_client.post("/api/v1/privacy/consent/bulk", json=bulk_consent, headers=auth_headers)
        
        # Add cookie preferences
        cookie_data = {
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": True,
                "preferences": True
            }
        }
        await async_client.post("/api/v1/privacy/cookie-consent", json=cookie_data, headers=auth_headers)
        
        # Step 2: Request data export
        export_response = await async_client.get("/api/v1/privacy/export?format=json", headers=auth_headers)
        assert export_response.status_code == 200
        export_data = export_response.json()
        
        assert "request_id" in export_data
        assert export_data["status"] == "pending"
        assert export_data["format"] == "json"
        request_id = export_data["request_id"]
        
        # Step 3: Check export status
        status_response = await async_client.get(f"/api/v1/privacy/export/{request_id}", headers=auth_headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        
        assert status_data["request_id"] == request_id
        assert status_data["status"] == "pending"
        assert status_data["progress_percentage"] == 0
        
        # Step 4: Verify export request created audit log
        audit_response = await async_client.get("/api/v1/privacy/audit-log", headers=auth_headers)
        audit_data = audit_response.json()
        
        export_entry = next((entry for entry in audit_data["entries"] 
                           if entry["action"] == "data_export_requested"), None)
        assert export_entry is not None
        
        # Step 5: Verify data processing log for export
        processing_logs = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == test_user.id,
            DataProcessingLog.purpose == DataProcessingPurpose.DATA_EXPORT
        ).all()
        assert len(processing_logs) >= 1
        
        export_log = processing_logs[0]
        assert export_log.operation == "data_export_request"
        assert "profile" in export_log.data_categories
        assert "consents" in export_log.data_categories
        
        # Step 6: Test duplicate export request prevention
        duplicate_response = await async_client.get("/api/v1/privacy/export?format=csv", headers=auth_headers)
        assert duplicate_response.status_code == 409
        assert "already in progress" in duplicate_response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_account_deletion_complete_flow(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test complete account deletion flow"""
        
        # Step 1: Set up user with consents and data
        bulk_consent = {"accept_all": True}
        await async_client.post("/api/v1/privacy/consent/bulk", json=bulk_consent, headers=auth_headers)
        
        # Step 2: Request account deletion
        deletion_request = {
            "reason": "Privacy concerns",
            "feedback": "Integration test account deletion"
        }
        
        deletion_response = await async_client.delete(
            "/api/v1/privacy/account",
            json=deletion_request,
            headers=auth_headers
        )
        assert deletion_response.status_code == 200
        deletion_data = deletion_response.json()
        
        assert deletion_data["success"] is True
        assert "30 days" in deletion_data["message"]
        assert deletion_data["data_retention_days"] == 30
        
        # Step 3: Verify user is deactivated
        db.refresh(test_user)
        assert test_user.is_active is False
        assert test_user.deactivated_at is not None
        
        # Step 4: Verify all consents are withdrawn
        user_consents = db.query(UserConsent).filter(UserConsent.user_id == test_user.id).all()
        for consent in user_consents:
            assert consent.status == ConsentStatus.WITHDRAWN
            assert consent.withdrawal_date is not None
        
        # Step 5: Verify audit trail
        audit_entry = db.query(LegalConsentAudit).filter(
            LegalConsentAudit.user_id == test_user.id,
            LegalConsentAudit.action == "account_deletion_requested"
        ).first()
        assert audit_entry is not None
        assert audit_entry.reason == deletion_request["reason"]
        assert "feedback" in audit_entry.audit_metadata
        assert audit_entry.audit_metadata["feedback"] == deletion_request["feedback"]


class TestCookiePreferencePersistence:
    """Test cookie preference persistence across sessions"""
    
    @pytest.mark.asyncio
    async def test_anonymous_cookie_persistence(self, async_client: AsyncClient, db: Session):
        """Test that anonymous cookie preferences persist across requests"""
        
        session_id = "persistence-test-anonymous"
        
        # Step 1: Set initial preferences
        initial_prefs = {
            "session_id": session_id,
            "preferences": {
                "functional": True,
                "analytics": False,
                "marketing": True,
                "preferences": False
            }
        }
        
        set_response = await async_client.post("/api/v1/privacy/cookie-consent", json=initial_prefs)
        assert set_response.status_code == 200
        
        # Step 2: Retrieve preferences by session ID
        get_response = await async_client.get(f"/api/v1/privacy/cookie-consent?session_id={session_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        assert get_data["session_id"] == session_id
        assert get_data["user_id"] is None
        assert get_data["preferences"]["analytics"] is False
        assert get_data["preferences"]["marketing"] is True
        
        # Step 3: Update preferences
        updated_prefs = {
            "session_id": session_id,
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": True,
                "preferences": True
            }
        }
        
        update_response = await async_client.post("/api/v1/privacy/cookie-consent", json=updated_prefs)
        assert update_response.status_code == 200
        
        # Step 4: Verify update persisted
        final_response = await async_client.get(f"/api/v1/privacy/cookie-consent?session_id={session_id}")
        final_data = final_response.json()
        
        assert final_data["preferences"]["analytics"] is True
        assert final_data["preferences"]["marketing"] is True
        
        # Should be same record ID (updated, not new)
        assert final_data["id"] == get_data["id"]
    
    @pytest.mark.asyncio
    async def test_authenticated_cookie_persistence(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test that authenticated user cookie preferences persist"""
        
        # Step 1: Set preferences as authenticated user
        auth_prefs = {
            "session_id": "auth-persistence-test",
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": False,
                "preferences": True
            }
        }
        
        set_response = await async_client.post(
            "/api/v1/privacy/cookie-consent", 
            json=auth_prefs,
            headers=auth_headers
        )
        assert set_response.status_code == 200
        
        # Step 2: Retrieve without session ID (should find by user)
        get_response = await async_client.get("/api/v1/privacy/cookie-consent", headers=auth_headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        assert get_data["user_id"] == test_user.id
        assert get_data["preferences"]["analytics"] is True
        assert get_data["preferences"]["marketing"] is False
        
        # Step 3: Test session takeover (anonymous -> authenticated)
        # First create anonymous consent
        anon_prefs = {
            "session_id": "takeover-session",
            "preferences": {
                "functional": True,
                "analytics": False,
                "marketing": False,
                "preferences": False
            }
        }
        await async_client.post("/api/v1/privacy/cookie-consent", json=anon_prefs)
        
        # Then update as authenticated user with same session
        auth_takeover = {
            "session_id": "takeover-session",
            "preferences": {
                "functional": True,
                "analytics": True,
                "marketing": true,
                "preferences": True
            }
        }
        
        takeover_response = await async_client.post(
            "/api/v1/privacy/cookie-consent",
            json=auth_takeover,
            headers=auth_headers
        )
        assert takeover_response.status_code == 200
        takeover_data = takeover_response.json()
        
        assert takeover_data["user_id"] == test_user.id
        assert takeover_data["session_id"] == "takeover-session"
    
    @pytest.mark.asyncio
    async def test_cookie_expiry_handling(self, async_client: AsyncClient, db: Session):
        """Test that expired cookie consents are handled correctly"""
        
        # Create expired consent directly in database
        expired_consent = CookieConsent(
            session_id="expired-session",
            functional=True,
            analytics=True,
            marketing=True,
            preferences=True,
            expiry_date=datetime.utcnow() - timedelta(days=1)  # Expired yesterday
        )
        db.add(expired_consent)
        db.commit()
        
        # Try to retrieve expired consent
        response = await async_client.get("/api/v1/privacy/cookie-consent?session_id=expired-session")
        assert response.status_code == 200
        assert response.json() is None  # Should return None for expired consent


class TestConsentAuditTrail:
    """Test comprehensive audit trail functionality"""
    
    @pytest.mark.asyncio
    async def test_complete_audit_trail(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test that all GDPR operations create proper audit trail"""
        
        # Step 1: Cookie consent
        cookie_data = {
            "preferences": {
                "functional": True,
                "analytics": true,
                "marketing": False,
                "preferences": True
            }
        }
        await async_client.post("/api/v1/privacy/cookie-consent", json=cookie_data, headers=auth_headers)
        
        # Step 2: Terms consent
        terms_consent = {
            "consent_type": "terms_of_service",
            "status": "granted",
            "version": "2.0"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=terms_consent, headers=auth_headers)
        
        # Step 3: Marketing consent
        marketing_consent = {
            "consent_type": "marketing_emails",
            "status": "granted"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=marketing_consent, headers=auth_headers)
        
        # Step 4: Withdraw marketing consent
        withdraw_consent = {
            "consent_type": "marketing_emails",
            "status": "withdrawn",
            "notes": "User requested withdrawal"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=withdraw_consent, headers=auth_headers)
        
        # Step 5: Data export request
        await async_client.get("/api/v1/privacy/export", headers=auth_headers)
        
        # Step 6: Retrieve complete audit log
        audit_response = await async_client.get("/api/v1/privacy/audit-log?per_page=100", headers=auth_headers)
        assert audit_response.status_code == 200
        audit_data = audit_response.json()
        
        # Verify all operations are logged
        actions = [entry["action"] for entry in audit_data["entries"]]
        assert "cookie_consent_updated" in actions
        assert "consent_granted" in actions
        assert "consent_withdrawn" in actions
        assert "data_export_requested" in actions
        
        # Step 7: Verify audit entries have proper details
        withdrawal_entry = next(entry for entry in audit_data["entries"] 
                              if entry["action"] == "consent_withdrawn")
        assert withdrawal_entry["consent_type"] == "marketing_emails"
        assert withdrawal_entry["old_status"] == "granted"
        assert withdrawal_entry["new_status"] == "withdrawn"
        assert withdrawal_entry["reason"] == "User requested withdrawal"
        
        # Step 8: Verify data processing logs exist
        processing_logs = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == test_user.id
        ).all()
        assert len(processing_logs) >= 4  # Cookie, terms, marketing, export
        
        purposes = [log.purpose for log in processing_logs]
        assert DataProcessingPurpose.CONSENT_MANAGEMENT in purposes
        assert DataProcessingPurpose.DATA_EXPORT in purposes
    
    @pytest.mark.asyncio
    async def test_audit_pagination_and_filtering(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test audit log pagination and filtering"""
        
        # Create multiple audit entries
        for i in range(15):
            consent_data = {
                "consent_type": "marketing_emails",
                "status": "granted" if i % 2 == 0 else "withdrawn",
                "notes": f"Test action {i}"
            }
            await async_client.post("/api/v1/privacy/consent/terms", json=consent_data, headers=auth_headers)
        
        # Test pagination - first page
        page1_response = await async_client.get("/api/v1/privacy/audit-log?page=1&per_page=10", headers=auth_headers)
        page1_data = page1_response.json()
        
        assert page1_data["page"] == 1
        assert page1_data["per_page"] == 10
        assert len(page1_data["entries"]) == 10
        assert page1_data["total"] >= 15
        
        # Test pagination - second page
        page2_response = await async_client.get("/api/v1/privacy/audit-log?page=2&per_page=10", headers=auth_headers)
        page2_data = page2_response.json()
        
        assert page2_data["page"] == 2
        assert len(page2_data["entries"]) >= 5
        
        # Verify entries are sorted by timestamp desc (most recent first)
        timestamps = [entry["timestamp"] for entry in page1_data["entries"]]
        assert timestamps == sorted(timestamps, reverse=True)


class TestGDPRComplianceValidation:
    """Test GDPR compliance validation and requirements"""
    
    @pytest.mark.asyncio
    async def test_gdpr_compliance_requirements(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test GDPR compliance status calculation"""
        
        # Step 1: User with no consents - not compliant
        status_response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        status_data = status_response.json()
        assert status_data["gdpr_compliant"] is False
        
        # Step 2: Add only terms consent - still not compliant
        terms_consent = {
            "consent_type": "terms_of_service",
            "status": "granted"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=terms_consent, headers=auth_headers)
        
        status_response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        status_data = status_response.json()
        assert status_data["gdpr_compliant"] is False  # Missing privacy policy consent
        
        # Step 3: Add privacy policy consent - now compliant
        privacy_consent = {
            "consent_type": "privacy_policy",
            "status": "granted"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=privacy_consent, headers=auth_headers)
        
        status_response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        status_data = status_response.json()
        assert status_data["gdpr_compliant"] is True
        
        # Step 4: Withdraw required consent - no longer compliant
        withdraw_privacy = {
            "consent_type": "privacy_policy",
            "status": "withdrawn"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=withdraw_privacy, headers=auth_headers)
        
        status_response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        status_data = status_response.json()
        assert status_data["gdpr_compliant"] is False
    
    @pytest.mark.asyncio
    async def test_data_processing_legal_basis_tracking(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test that all data processing has proper legal basis tracking"""
        
        # Grant consent
        consent_data = {
            "consent_type": "marketing_emails",
            "status": "granted"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=consent_data, headers=auth_headers)
        
        # Withdraw consent
        withdraw_data = {
            "consent_type": "marketing_emails",
            "status": "withdrawn"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=withdraw_data, headers=auth_headers)
        
        # Check processing logs have correct legal basis
        processing_logs = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == test_user.id,
            DataProcessingLog.purpose == DataProcessingPurpose.CONSENT_MANAGEMENT
        ).all()
        
        for log in processing_logs:
            assert log.legal_basis in ["consent", "legitimate_interest"]
            assert log.data_categories is not None
            assert len(log.data_categories) > 0
    
    @pytest.mark.asyncio
    async def test_consent_version_tracking(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test that consent versions are properly tracked"""
        
        # Grant consent with version 1.0
        v1_consent = {
            "consent_type": "terms_of_service",
            "status": "granted",
            "version": "1.0"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=v1_consent, headers=auth_headers)
        
        # Update consent with version 2.0
        v2_consent = {
            "consent_type": "terms_of_service",
            "status": "granted",
            "version": "2.0"
        }
        await async_client.post("/api/v1/privacy/consent/terms", json=v2_consent, headers=auth_headers)
        
        # Verify latest consent has correct version
        consent_record = db.query(UserConsent).filter(
            UserConsent.user_id == test_user.id,
            UserConsent.consent_type == ConsentType.TERMS_OF_SERVICE
        ).first()
        
        assert consent_record.version == "2.0"
        
        # Verify audit trail shows version changes
        audit_response = await async_client.get("/api/v1/privacy/audit-log", headers=auth_headers)
        audit_data = audit_response.json()
        
        consent_entries = [entry for entry in audit_data["entries"] 
                          if entry["consent_type"] == "terms_of_service"]
        assert len(consent_entries) >= 2  # At least two consent actions


class TestConcurrentOperations:
    """Test concurrent GDPR operations and race conditions"""
    
    @pytest.mark.asyncio
    async def test_concurrent_consent_updates(self, async_client: AsyncClient, db: Session, auth_headers: dict, test_user: User):
        """Test concurrent consent updates don't cause data corruption"""
        
        async def update_consent(consent_type: str, status: str):
            consent_data = {
                "consent_type": consent_type,
                "status": status
            }
            return await async_client.post("/api/v1/privacy/consent/terms", json=consent_data, headers=auth_headers)
        
        # Run multiple concurrent consent updates
        tasks = [
            update_consent("marketing_emails", "granted"),
            update_consent("marketing_sms", "granted"),
            update_consent("data_processing", "granted"),
            update_consent("third_party_sharing", "denied"),
        ]
        
        responses = await asyncio.gather(*tasks)
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200
        
        # Verify final state is consistent
        status_response = await async_client.get("/api/v1/privacy/status", headers=auth_headers)
        status_data = status_response.json()
        
        assert status_data["consents"]["marketing_emails"] == "granted"
        assert status_data["consents"]["marketing_sms"] == "granted"
        assert status_data["consents"]["data_processing"] == "granted"
        assert status_data["consents"]["third_party_sharing"] == "denied"
    
    @pytest.mark.asyncio
    async def test_concurrent_cookie_updates(self, async_client: AsyncClient, db: Session, auth_headers: dict):
        """Test concurrent cookie consent updates"""
        
        session_id = "concurrent-test"
        
        async def update_cookies(analytics: bool, marketing: bool):
            cookie_data = {
                "session_id": session_id,
                "preferences": {
                    "functional": True,
                    "analytics": analytics,
                    "marketing": marketing,
                    "preferences": True
                }
            }
            return await async_client.post("/api/v1/privacy/cookie-consent", json=cookie_data, headers=auth_headers)
        
        # Run concurrent updates
        tasks = [
            update_cookies(True, False),
            update_cookies(False, True),
            update_cookies(True, True),
        ]
        
        responses = await asyncio.gather(*tasks)
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200
        
        # Final state should be consistent (last update wins)
        final_response = await async_client.get(f"/api/v1/privacy/cookie-consent?session_id={session_id}", headers=auth_headers)
        final_data = final_response.json()
        
        # Should have one of the valid combinations
        analytics = final_data["preferences"]["analytics"]
        marketing = final_data["preferences"]["marketing"]
        assert (analytics, marketing) in [(True, False), (False, True), (True, True)]