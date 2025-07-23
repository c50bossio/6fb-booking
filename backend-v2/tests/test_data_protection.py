"""
Comprehensive tests for Data Protection Service.

Tests GDPR, CCPA, and privacy compliance including:
- Consent management and tracking
- Data subject rights (access, deletion, portability)
- Data retention and automated cleanup
- Privacy by design principles
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock, patch
from sqlalchemy.orm import Session

from services.data_protection import (
    DataProtectionService, ConsentType, DataProcessingPurpose,
    DataCategory, DataSubjectRequest, ConsentRecord, DataRetentionPolicy,
    PersonalDataInventory, get_data_protection_service
)
from models import User, Payment, Appointment
from tests.factories import UserFactory, PaymentFactory, AppointmentFactory


@pytest.fixture
def mock_db():
    """Create mock database session."""
    return MagicMock(spec=Session)


@pytest.fixture
def data_protection_service(mock_db):
    """Create data protection service instance."""
    return DataProtectionService(mock_db)


@pytest.fixture
def test_user():
    """Create test user."""
    return UserFactory.create_user(
        id=123,
        email="test@example.com",
        name="Test User",
        phone_number="+1234567890"
    )


class TestDataProtectionServiceInitialization:
    """Test data protection service initialization."""
    
    def test_service_initialization(self, data_protection_service):
        """Test service initializes with correct defaults."""
        assert isinstance(data_protection_service.consent_records, list)
        assert isinstance(data_protection_service.data_subject_requests, list)
        assert isinstance(data_protection_service.retention_policies, list)
        assert isinstance(data_protection_service.data_inventory, list)
        
        # Verify retention policies are loaded
        assert len(data_protection_service.retention_policies) > 0
        
        # Verify data inventory is loaded
        assert len(data_protection_service.data_inventory) > 0
    
    def test_retention_policies_initialization(self, data_protection_service):
        """Test retention policies are properly initialized."""
        policies = data_protection_service.retention_policies
        
        # Check for key policies
        policy_categories = [p.data_category for p in policies]
        assert DataCategory.PERSONAL_IDENTIFIERS in policy_categories
        assert DataCategory.FINANCIAL_DATA in policy_categories
        assert DataCategory.BEHAVIORAL_DATA in policy_categories
        
        # Verify policy structure
        for policy in policies:
            assert isinstance(policy, DataRetentionPolicy)
            assert policy.retention_period_days > 0
            assert policy.legal_basis is not None
            assert isinstance(policy.auto_deletion_enabled, bool)
    
    def test_data_inventory_initialization(self, data_protection_service):
        """Test personal data inventory is properly initialized."""
        inventory = data_protection_service.data_inventory
        
        # Check for key data types
        data_types = [item.data_type for item in inventory]
        assert "User Account Information" in data_types
        assert "Payment Information" in data_types
        assert "Appointment History" in data_types
        
        # Verify inventory structure
        for item in inventory:
            assert isinstance(item, PersonalDataInventory)
            assert isinstance(item.data_category, DataCategory)
            assert isinstance(item.processing_purpose, DataProcessingPurpose)
            assert item.legal_basis is not None


class TestConsentManagement:
    """Test GDPR consent management (Article 7)."""
    
    @pytest.mark.asyncio
    async def test_record_consent(self, data_protection_service):
        """Test recording user consent."""
        user_id = "user_123"
        consent_type = ConsentType.MARKETING
        purpose = "Email marketing campaigns"
        
        consent = await data_protection_service.record_consent(
            user_id=user_id,
            consent_type=consent_type,
            purpose=purpose
        )
        
        assert isinstance(consent, ConsentRecord)
        assert consent.user_id == user_id
        assert consent.consent_type == consent_type
        assert consent.purpose == purpose
        assert consent.is_active is True
        assert consent.given_date is not None
        assert consent.consent_id is not None
        
        # Verify consent is stored
        assert len(data_protection_service.consent_records) == 1
        assert data_protection_service.consent_records[0] == consent
    
    @pytest.mark.asyncio
    async def test_record_consent_with_context(self, data_protection_service):
        """Test recording consent with processing context."""
        user_id = "user_456"
        consent_type = ConsentType.PERSONALIZATION
        purpose = "Personalized service recommendations"
        context = {
            "source": "profile_settings",
            "ip_address": "192.168.1.1",
            "user_agent": "Mozilla/5.0..."
        }
        
        consent = await data_protection_service.record_consent(
            user_id=user_id,
            consent_type=consent_type,
            purpose=purpose,
            processing_context=context
        )
        
        assert consent.processing_context == context
    
    @pytest.mark.asyncio
    async def test_withdraw_consent(self, data_protection_service):
        """Test withdrawing user consent (GDPR Article 7.3)."""
        user_id = "user_789"
        consent_type = ConsentType.ANALYTICS
        
        # First record consent
        await data_protection_service.record_consent(
            user_id=user_id,
            consent_type=consent_type,
            purpose="Usage analytics"
        )
        
        # Then withdraw it
        success = await data_protection_service.withdraw_consent(
            user_id=user_id,
            consent_type=consent_type
        )
        
        assert success is True
        
        # Verify consent is marked as withdrawn
        consent = data_protection_service.consent_records[0]
        assert consent.is_active is False
        assert consent.withdrawn_date is not None
    
    @pytest.mark.asyncio
    async def test_withdraw_nonexistent_consent(self, data_protection_service):
        """Test withdrawing consent that doesn't exist."""
        success = await data_protection_service.withdraw_consent(
            user_id="nonexistent_user",
            consent_type=ConsentType.MARKETING
        )
        
        assert success is False
    
    def test_check_consent_status(self, data_protection_service):
        """Test checking user consent status."""
        user_id = "user_consent_check"
        
        # Initially no consent
        has_consent = data_protection_service.check_consent_status(
            user_id, ConsentType.MARKETING
        )
        assert has_consent is False
        
        # Add active consent
        consent = ConsentRecord(
            consent_id="test_consent",
            user_id=user_id,
            consent_type=ConsentType.MARKETING,
            purpose="Test marketing",
            given_date=datetime.utcnow(),
            is_active=True
        )
        data_protection_service.consent_records.append(consent)
        
        # Should now have consent
        has_consent = data_protection_service.check_consent_status(
            user_id, ConsentType.MARKETING
        )
        assert has_consent is True
        
        # Withdraw consent
        consent.is_active = False
        consent.withdrawn_date = datetime.utcnow()
        
        # Should no longer have consent
        has_consent = data_protection_service.check_consent_status(
            user_id, ConsentType.MARKETING
        )
        assert has_consent is False


class TestDataSubjectRights:
    """Test GDPR data subject rights implementation."""
    
    @pytest.mark.asyncio
    async def test_process_data_access_request(self, data_protection_service, test_user):
        """Test data access request (GDPR Article 15)."""
        user_id = str(test_user.id)
        requester_email = test_user.email
        
        # Mock user data collection
        with patch.object(data_protection_service, '_collect_user_personal_data') as mock_collect:
            mock_collect.return_value = {
                "profile": {"id": test_user.id, "email": test_user.email},
                "appointments": [],
                "payments": []
            }
            
            request = await data_protection_service.process_data_access_request(
                user_id=user_id,
                requester_email=requester_email
            )
        
        assert isinstance(request, DataSubjectRequest)
        assert request.user_id == user_id
        assert request.request_type == "access"
        assert request.processing_status == "completed"
        assert request.response_data is not None
        
        # Verify response data structure
        response = request.response_data
        assert "personal_data" in response
        assert "consent_records" in response
        assert "processing_information" in response
        assert "export_date" in response
        
        # Request should be stored
        assert len(data_protection_service.data_subject_requests) == 1
    
    @pytest.mark.asyncio
    async def test_process_data_deletion_request(self, data_protection_service, test_user):
        """Test data deletion request (GDPR Article 17)."""
        user_id = str(test_user.id)
        
        # Mock legal holds check (no holds)
        with patch.object(data_protection_service, '_check_legal_holds') as mock_holds:
            with patch.object(data_protection_service, '_execute_user_data_deletion') as mock_delete:
                mock_holds.return_value = []
                mock_delete.return_value = {
                    "user_profile": True,
                    "appointments": True,
                    "payments": "anonymized"
                }
                
                request = await data_protection_service.process_data_deletion_request(
                    user_id=user_id
                )
        
        assert request.request_type == "erasure"
        assert request.processing_status == "completed"
        assert request.response_data is not None
        assert "deletion_summary" in request.response_data
    
    @pytest.mark.asyncio
    async def test_process_data_deletion_with_legal_holds(self, data_protection_service, test_user):
        """Test data deletion request with legal holds preventing deletion."""
        user_id = str(test_user.id)
        
        # Mock legal holds check (has holds)
        with patch.object(data_protection_service, '_check_legal_holds') as mock_holds:
            mock_holds.return_value = ["Financial record retention (7 years)"]
            
            request = await data_protection_service.process_data_deletion_request(
                user_id=user_id
            )
        
        assert request.processing_status == "rejected"
        assert "Financial record retention" in request.rejection_reason
    
    @pytest.mark.asyncio
    async def test_process_data_portability_request(self, data_protection_service, test_user):
        """Test data portability request (GDPR Article 20)."""
        user_id = str(test_user.id)
        
        # Mock portable data collection
        with patch.object(data_protection_service, '_collect_portable_user_data') as mock_collect:
            mock_collect.return_value = {
                "profile": {"email": test_user.email, "name": test_user.name},
                "preferences": {}
            }
            
            request = await data_protection_service.process_data_portability_request(
                user_id=user_id
            )
        
        assert request.request_type == "portability"
        assert request.processing_status == "completed"
        assert request.response_data is not None
        
        # Verify portable data structure
        response = request.response_data
        assert "portable_data" in response
        assert "export_format" in response
        assert response["export_format"] == "JSON"


class TestDataCollection:
    """Test personal data collection methods."""
    
    @pytest.mark.asyncio
    async def test_collect_user_personal_data(self, data_protection_service, mock_db, test_user):
        """Test comprehensive personal data collection."""
        user_id = str(test_user.id)
        
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = test_user
        mock_db.query.return_value.filter.return_value.all.return_value = []
        
        personal_data = await data_protection_service._collect_user_personal_data(user_id)
        
        assert "profile" in personal_data
        assert "appointments" in personal_data
        assert "payments" in personal_data
        
        # Verify profile data
        profile = personal_data["profile"]
        assert profile["email"] == test_user.email
        assert profile["name"] == test_user.name
        assert profile["id"] == test_user.id
    
    @pytest.mark.asyncio
    async def test_collect_user_personal_data_with_history(self, data_protection_service, mock_db, test_user):
        """Test personal data collection with appointment and payment history."""
        user_id = str(test_user.id)
        
        # Create mock appointments and payments
        mock_appointment = MagicMock()
        mock_appointment.id = 1
        mock_appointment.service_name = "Haircut"
        mock_appointment.start_time = datetime.utcnow()
        mock_appointment.duration_minutes = 30
        mock_appointment.price = 25.00
        mock_appointment.status = "completed"
        mock_appointment.notes = "Regular cut"
        
        mock_payment = MagicMock()
        mock_payment.id = 1
        mock_payment.amount = 25.00
        mock_payment.currency = "USD"
        mock_payment.status = "completed"
        mock_payment.created_at = datetime.utcnow()
        mock_payment.description = "Haircut payment"
        mock_payment.stripe_payment_id = "pi_test"
        
        # Mock database responses
        def mock_query_side_effect(model):
            mock_query = MagicMock()
            if model == User:
                mock_query.filter.return_value.first.return_value = test_user
            elif model == Appointment:
                mock_query.filter.return_value.all.return_value = [mock_appointment]
            elif model == Payment:
                mock_query.filter.return_value.all.return_value = [mock_payment]
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        
        personal_data = await data_protection_service._collect_user_personal_data(user_id)
        
        # Verify appointment data
        appointments = personal_data["appointments"]
        assert len(appointments) == 1
        assert appointments[0]["service_name"] == "Haircut"
        assert appointments[0]["price"] == 25.00
        
        # Verify payment data (should be masked)
        payments = personal_data["payments"]
        assert len(payments) == 1
        assert payments[0]["amount"] == 25.00
        assert payments[0]["payment_method"] == "****"  # Masked
    
    @pytest.mark.asyncio
    async def test_collect_portable_user_data(self, data_protection_service):
        """Test collection of portable user data (GDPR Article 20)."""
        user_id = "test_user"
        
        # Mock full data collection
        full_data = {
            "profile": {
                "email": "test@example.com",
                "name": "Test User",
                "id": 123,
                "internal_notes": "Internal system data"
            },
            "appointments": [{"id": 1, "service": "Haircut"}],
            "system_logs": "Internal system logs"
        }
        
        with patch.object(data_protection_service, '_collect_user_personal_data') as mock_collect:
            mock_collect.return_value = full_data
            
            portable_data = await data_protection_service._collect_portable_user_data(user_id)
        
        # Should only include portable data
        assert "profile" in portable_data
        assert "appointments" in portable_data
        assert "preferences" in portable_data
        assert "system_logs" not in portable_data
        
        # Profile should exclude internal data
        profile = portable_data["profile"]
        assert "email" in profile
        assert "name" in profile
        assert "id" not in profile  # Internal ID not portable


class TestLegalHoldsAndDeletion:
    """Test legal holds and data deletion logic."""
    
    @pytest.mark.asyncio
    async def test_check_legal_holds_recent_payments(self, data_protection_service, mock_db):
        """Test legal holds check with recent payments."""
        user_id = "user_with_payments"
        
        # Mock recent payment
        recent_payment = MagicMock()
        recent_payment.created_at = datetime.utcnow() - timedelta(days=30)
        
        mock_db.query.return_value.filter.return_value.first.return_value = recent_payment
        
        holds = await data_protection_service._check_legal_holds(user_id)
        
        assert len(holds) > 0
        assert any("Financial record retention" in hold for hold in holds)
    
    @pytest.mark.asyncio
    async def test_check_legal_holds_pending_appointments(self, data_protection_service, mock_db):
        """Test legal holds check with pending appointments."""
        user_id = "user_with_appointments"
        
        # Mock query side effects
        def mock_query_side_effect(model):
            mock_query = MagicMock()
            if model == Payment:
                mock_query.filter.return_value.first.return_value = None
            elif model == Appointment:
                # Mock pending appointment
                future_appointment = MagicMock()
                future_appointment.start_time = datetime.utcnow() + timedelta(days=7)
                future_appointment.status = "confirmed"
                mock_query.filter.return_value.first.return_value = future_appointment
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        
        holds = await data_protection_service._check_legal_holds(user_id)
        
        assert len(holds) > 0
        assert any("Pending appointments" in hold for hold in holds)
    
    @pytest.mark.asyncio
    async def test_execute_user_data_deletion(self, data_protection_service, mock_db, test_user):
        """Test user data deletion execution."""
        user_id = str(test_user.id)
        
        # Mock database objects
        mock_appointment = MagicMock()
        mock_appointment.notes = "Customer notes"
        mock_appointment.special_requests = "Special request"
        
        mock_payment = MagicMock()
        mock_payment.description = "Payment description"
        
        def mock_query_side_effect(model):
            mock_query = MagicMock()
            if model == User:
                mock_query.filter.return_value.first.return_value = test_user
            elif model == Appointment:
                mock_query.filter.return_value.all.return_value = [mock_appointment]
            elif model == Payment:
                mock_query.filter.return_value.all.return_value = [mock_payment]
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Mock third-party deletion requests
        with patch.object(data_protection_service, '_request_third_party_deletions') as mock_third_party:
            mock_third_party.return_value = [{"service": "Stripe", "status": "requested"}]
            
            deletion_summary = await data_protection_service._execute_user_data_deletion(
                user_id=user_id, 
                retention_override=True
            )
        
        # Verify deletion summary
        assert deletion_summary["user_profile"] is True
        assert deletion_summary["appointments"] is True
        assert deletion_summary["payments"] == "anonymized"
        
        # Verify user profile was anonymized
        assert test_user.email.startswith("deleted_user_")
        assert test_user.name == "Deleted User"
        assert test_user.phone_number is None
        assert test_user.is_active is False
        
        # Verify appointments were anonymized
        assert mock_appointment.notes == "[DELETED]"
        assert mock_appointment.special_requests == "[DELETED]"
        
        # Verify payments were anonymized
        assert mock_payment.description == "[DELETED]"
    
    @pytest.mark.asyncio
    async def test_request_third_party_deletions(self, data_protection_service):
        """Test requesting deletion from third-party services."""
        user_id = "test_user"
        
        results = await data_protection_service._request_third_party_deletions(user_id)
        
        assert isinstance(results, list)
        assert len(results) > 0
        
        # Check expected services
        service_names = [result["service"] for result in results]
        assert "Stripe" in service_names
        assert "SendGrid" in service_names
        assert "Twilio" in service_names
        
        # All should have requested date
        for result in results:
            assert "requested_date" in result
            assert "deletion_status" in result


class TestDataRetention:
    """Test automated data retention and cleanup."""
    
    @pytest.mark.asyncio
    async def test_run_data_retention_cleanup(self, data_protection_service):
        """Test automated data retention cleanup."""
        cleanup_summary = await data_protection_service.run_data_retention_cleanup()
        
        assert "scan_date" in cleanup_summary
        assert "policies_checked" in cleanup_summary
        assert "records_identified" in cleanup_summary
        assert "records_deleted" in cleanup_summary
        assert "errors" in cleanup_summary
        
        # Should have checked all retention policies
        assert cleanup_summary["policies_checked"] == len(data_protection_service.retention_policies)
        
        # Should have processed some records
        assert cleanup_summary["records_identified"] >= 0
        assert cleanup_summary["records_deleted"] >= 0
    
    def test_retention_policy_configuration(self, data_protection_service):
        """Test retention policy configuration."""
        policies = data_protection_service.retention_policies
        
        # Financial data should have long retention
        financial_policy = next(
            (p for p in policies if p.data_category == DataCategory.FINANCIAL_DATA),
            None
        )
        assert financial_policy is not None
        assert financial_policy.retention_period_days == 2555  # 7 years
        assert financial_policy.auto_deletion_enabled is False  # Manual review required
        
        # Behavioral data should have shorter retention
        behavioral_policy = next(
            (p for p in policies if p.data_category == DataCategory.BEHAVIORAL_DATA),
            None
        )
        assert behavioral_policy is not None
        assert behavioral_policy.retention_period_days == 365  # 1 year
        assert behavioral_policy.auto_deletion_enabled is True


class TestPrivacyDashboard:
    """Test privacy dashboard and user interface features."""
    
    def test_get_privacy_dashboard_data(self, data_protection_service):
        """Test privacy dashboard data generation."""
        user_id = "dashboard_user"
        
        # Add some consent records
        consent = ConsentRecord(
            consent_id="test_consent",
            user_id=user_id,
            consent_type=ConsentType.MARKETING,
            purpose="Email marketing",
            given_date=datetime.utcnow(),
            is_active=True
        )
        data_protection_service.consent_records.append(consent)
        
        # Add a data subject request
        request = DataSubjectRequest(
            request_id="test_request",
            user_id=user_id,
            request_type="access",
            request_date=datetime.utcnow(),
            processing_status="completed"
        )
        data_protection_service.data_subject_requests.append(request)
        
        dashboard_data = data_protection_service.get_privacy_dashboard_data(user_id)
        
        assert dashboard_data["user_id"] == user_id
        assert "consent_status" in dashboard_data
        assert "active_consents" in dashboard_data
        assert "data_requests" in dashboard_data
        assert "data_inventory" in dashboard_data
        assert "privacy_rights" in dashboard_data
        
        # Verify consent status
        consent_status = dashboard_data["consent_status"]
        assert consent_status["marketing"] is True
        assert consent_status["analytics"] is False
        
        # Verify request counts
        data_requests = dashboard_data["data_requests"]
        assert data_requests["total"] == 1
        assert data_requests["completed"] == 1
    
    def test_generate_privacy_notice(self, data_protection_service):
        """Test privacy notice generation."""
        privacy_notice = data_protection_service.generate_privacy_notice()
        
        assert isinstance(privacy_notice, str)
        assert "Privacy Notice" in privacy_notice
        assert "What Personal Data We Collect" in privacy_notice
        assert "Why We Process Your Data" in privacy_notice
        assert "How Long We Keep Your Data" in privacy_notice
        assert "Your Privacy Rights" in privacy_notice
        assert "Data Sharing" in privacy_notice
        
        # Should contain current date
        current_date = datetime.utcnow().strftime('%Y-%m-%d')
        assert current_date in privacy_notice


class TestDataProtectionIntegration:
    """Test integration aspects of data protection service."""
    
    def test_global_service_instance(self, mock_db):
        """Test global service instance management."""
        service1 = get_data_protection_service(mock_db)
        service2 = get_data_protection_service(mock_db)
        
        # Should return same instance (singleton pattern)
        assert service1 is service2
    
    @pytest.mark.asyncio
    async def test_consent_workflow_integration(self, data_protection_service):
        """Test complete consent workflow."""
        user_id = "workflow_user"
        
        # Step 1: Record consent
        consent = await data_protection_service.record_consent(
            user_id=user_id,
            consent_type=ConsentType.ANALYTICS,
            purpose="Website analytics"
        )
        
        # Step 2: Check consent status
        has_consent = data_protection_service.check_consent_status(
            user_id, ConsentType.ANALYTICS
        )
        assert has_consent is True
        
        # Step 3: Withdraw consent
        success = await data_protection_service.withdraw_consent(
            user_id, ConsentType.ANALYTICS
        )
        assert success is True
        
        # Step 4: Verify withdrawal
        has_consent = data_protection_service.check_consent_status(
            user_id, ConsentType.ANALYTICS
        )
        assert has_consent is False
    
    @pytest.mark.asyncio
    async def test_data_subject_rights_workflow(self, data_protection_service, test_user):
        """Test complete data subject rights workflow."""
        user_id = str(test_user.id)
        
        # Mock data collection methods
        with patch.object(data_protection_service, '_collect_user_personal_data') as mock_collect:
            with patch.object(data_protection_service, '_check_legal_holds') as mock_holds:
                with patch.object(data_protection_service, '_execute_user_data_deletion') as mock_delete:
                    mock_collect.return_value = {"profile": {"email": test_user.email}}
                    mock_holds.return_value = []
                    mock_delete.return_value = {"user_profile": True}
                    
                    # Step 1: Data access request
                    access_request = await data_protection_service.process_data_access_request(
                        user_id=user_id,
                        requester_email=test_user.email
                    )
                    assert access_request.processing_status == "completed"
                    
                    # Step 2: Data portability request  
                    portability_request = await data_protection_service.process_data_portability_request(
                        user_id=user_id
                    )
                    assert portability_request.processing_status == "completed"
                    
                    # Step 3: Data deletion request
                    deletion_request = await data_protection_service.process_data_deletion_request(
                        user_id=user_id
                    )
                    assert deletion_request.processing_status == "completed"
        
        # All requests should be stored
        assert len(data_protection_service.data_subject_requests) == 3


class TestDataProtectionPerformance:
    """Test performance aspects of data protection service."""
    
    @pytest.mark.asyncio
    async def test_large_consent_volume_performance(self, data_protection_service):
        """Test performance with large number of consent records."""
        import time
        
        # Record many consents
        start_time = time.time()
        
        consent_tasks = []
        for i in range(100):
            task = data_protection_service.record_consent(
                user_id=f"user_{i}",
                consent_type=ConsentType(list(ConsentType)[i % len(ConsentType)]),
                purpose=f"Purpose {i}"
            )
            consent_tasks.append(task)
        
        # Wait for all consents to be recorded
        await asyncio.gather(*consent_tasks)
        
        end_time = time.time()
        
        # Should complete in reasonable time
        assert end_time - start_time < 5.0  # Less than 5 seconds
        assert len(data_protection_service.consent_records) == 100
    
    @pytest.mark.asyncio
    async def test_data_collection_performance(self, data_protection_service, mock_db):
        """Test performance of personal data collection."""
        import time
        
        user_id = "performance_user"
        
        # Mock large dataset
        large_appointment_list = [MagicMock() for _ in range(1000)]
        large_payment_list = [MagicMock() for _ in range(500)]
        
        def mock_query_side_effect(model):
            mock_query = MagicMock()
            if model == User:
                mock_user = MagicMock()
                mock_user.id = user_id
                mock_user.email = "test@example.com"
                mock_query.filter.return_value.first.return_value = mock_user
            elif model == Appointment:
                mock_query.filter.return_value.all.return_value = large_appointment_list
            elif model == Payment:
                mock_query.filter.return_value.all.return_value = large_payment_list
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Measure performance
        start_time = time.time()
        personal_data = await data_protection_service._collect_user_personal_data(user_id)
        end_time = time.time()
        
        # Should complete quickly even with large dataset
        assert end_time - start_time < 3.0  # Less than 3 seconds
        assert len(personal_data["appointments"]) == 1000
        assert len(personal_data["payments"]) == 500


class TestDataProtectionErrorHandling:
    """Test error handling in data protection service."""
    
    @pytest.mark.asyncio
    async def test_data_access_request_error_handling(self, data_protection_service):
        """Test error handling in data access requests."""
        user_id = "error_user"
        
        # Mock data collection to raise error
        with patch.object(data_protection_service, '_collect_user_personal_data') as mock_collect:
            mock_collect.side_effect = Exception("Database error")
            
            request = await data_protection_service.process_data_access_request(
                user_id=user_id,
                requester_email="test@example.com"
            )
        
        assert request.processing_status == "rejected"
        assert "Technical error" in request.rejection_reason
    
    @pytest.mark.asyncio
    async def test_data_deletion_error_handling(self, data_protection_service):
        """Test error handling in data deletion requests."""
        user_id = "deletion_error_user"
        
        # Mock legal holds check to raise error
        with patch.object(data_protection_service, '_check_legal_holds') as mock_holds:
            mock_holds.side_effect = Exception("Check failed")
            
            request = await data_protection_service.process_data_deletion_request(
                user_id=user_id
            )
        
        assert request.processing_status == "rejected"
        assert "Technical error" in request.rejection_reason
    
    @pytest.mark.asyncio
    async def test_data_retention_cleanup_error_handling(self, data_protection_service):
        """Test error handling in data retention cleanup."""
        # Mock a policy to cause error during processing
        error_policy = DataRetentionPolicy(
            data_category=DataCategory.TECHNICAL_DATA,
            retention_period_days=30,
            legal_basis="Test error",
            auto_deletion_enabled=True
        )
        data_protection_service.retention_policies.append(error_policy)
        
        # Patch to cause error during processing
        with patch.object(data_protection_service, 'retention_policies', 
                         data_protection_service.retention_policies + [error_policy]):
            
            cleanup_summary = await data_protection_service.run_data_retention_cleanup()
        
        # Should continue processing despite errors
        assert "errors" in cleanup_summary
        assert cleanup_summary["policies_checked"] > 0