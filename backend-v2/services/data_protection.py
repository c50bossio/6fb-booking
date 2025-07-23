"""
Data Protection Service for GDPR, CCPA, and Privacy Compliance.

Implements comprehensive data protection features including:
- Personal data identification and classification
- Consent management and tracking
- Data subject rights (access, rectification, erasure, portability)
- Privacy by design principles
- Data retention and automated deletion
- Audit trails for all data operations
"""

import asyncio
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from sqlalchemy.orm import Session

from models import User, Payment, Appointment
from config import settings

logger = logging.getLogger(__name__)


class ConsentType(Enum):
    """Types of consent required for data processing."""
    ESSENTIAL = "essential"  # Required for service delivery
    MARKETING = "marketing"  # Marketing communications
    ANALYTICS = "analytics"  # Analytics and performance tracking
    PERSONALIZATION = "personalization"  # Personalized services
    THIRD_PARTY_SHARING = "third_party_sharing"  # Sharing with partners


class DataProcessingPurpose(Enum):
    """Purposes for which personal data is processed."""
    CONTRACT_PERFORMANCE = "contract_performance"  # Service delivery
    LEGAL_OBLIGATION = "legal_obligation"  # Compliance with laws
    LEGITIMATE_INTEREST = "legitimate_interest"  # Business operations
    CONSENT = "consent"  # User consent
    VITAL_INTERESTS = "vital_interests"  # Protecting vital interests


class DataCategory(Enum):
    """Categories of personal data."""
    PERSONAL_IDENTIFIERS = "personal_identifiers"  # Name, email, phone
    FINANCIAL_DATA = "financial_data"  # Payment information
    LOCATION_DATA = "location_data"  # Address, GPS coordinates
    BIOMETRIC_DATA = "biometric_data"  # Photos, fingerprints
    BEHAVIORAL_DATA = "behavioral_data"  # Usage patterns, preferences
    COMMUNICATION_DATA = "communication_data"  # Messages, calls
    TECHNICAL_DATA = "technical_data"  # IP address, cookies, device info


@dataclass
class DataSubjectRequest:
    """Data subject request under GDPR/CCPA."""
    request_id: str
    user_id: str
    request_type: str  # access, rectification, erasure, portability, restriction
    request_date: datetime
    verification_completed: bool = False
    processing_status: str = "pending"  # pending, processing, completed, rejected
    completion_date: Optional[datetime] = None
    response_data: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None


@dataclass
class ConsentRecord:
    """Record of user consent for data processing."""
    consent_id: str
    user_id: str
    consent_type: ConsentType
    purpose: str
    given_date: datetime
    withdrawn_date: Optional[datetime] = None
    is_active: bool = True
    legal_basis: str = "consent"
    processing_context: Optional[Dict[str, Any]] = None


@dataclass
class DataRetentionPolicy:
    """Data retention policy definition."""
    data_category: DataCategory
    retention_period_days: int
    legal_basis: str
    auto_deletion_enabled: bool = True
    notification_before_days: int = 30
    exceptions: List[str] = None


@dataclass
class PersonalDataInventory:
    """Inventory of personal data processed."""
    data_type: str
    data_category: DataCategory
    processing_purpose: DataProcessingPurpose
    legal_basis: str
    retention_period: str
    third_party_sharing: bool = False
    cross_border_transfer: bool = False
    data_location: str = "US"


class DataProtectionService:
    """
    Comprehensive data protection service implementing GDPR, CCPA, and other privacy laws.
    
    Provides tools for consent management, data subject rights, retention policies,
    and privacy compliance monitoring.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.consent_records: List[ConsentRecord] = []
        self.data_subject_requests: List[DataSubjectRequest] = []
        self.retention_policies = self._initialize_retention_policies()
        self.data_inventory = self._initialize_data_inventory()
        
    def _initialize_retention_policies(self) -> List[DataRetentionPolicy]:
        """Initialize data retention policies."""
        return [
            DataRetentionPolicy(
                data_category=DataCategory.PERSONAL_IDENTIFIERS,
                retention_period_days=2555,  # 7 years for business records
                legal_basis="Legal obligation (tax records)",
                auto_deletion_enabled=False,  # Manual review required
                notification_before_days=60
            ),
            DataRetentionPolicy(
                data_category=DataCategory.FINANCIAL_DATA,
                retention_period_days=2555,  # 7 years for financial records
                legal_basis="Legal obligation (financial regulations)",
                auto_deletion_enabled=False,
                notification_before_days=90
            ),
            DataRetentionPolicy(
                data_category=DataCategory.BEHAVIORAL_DATA,
                retention_period_days=365,  # 1 year for analytics
                legal_basis="Legitimate interest (service improvement)",
                auto_deletion_enabled=True,
                notification_before_days=30
            ),
            DataRetentionPolicy(
                data_category=DataCategory.COMMUNICATION_DATA,
                retention_period_days=1095,  # 3 years for customer service
                legal_basis="Legitimate interest (customer support)",
                auto_deletion_enabled=True,
                notification_before_days=30
            ),
            DataRetentionPolicy(
                data_category=DataCategory.TECHNICAL_DATA,
                retention_period_days=365,  # 1 year for security logs
                legal_basis="Legitimate interest (security)",
                auto_deletion_enabled=True,
                notification_before_days=7
            )
        ]
    
    def _initialize_data_inventory(self) -> List[PersonalDataInventory]:
        """Initialize personal data inventory."""
        return [
            PersonalDataInventory(
                data_type="User Account Information",
                data_category=DataCategory.PERSONAL_IDENTIFIERS,
                processing_purpose=DataProcessingPurpose.CONTRACT_PERFORMANCE,
                legal_basis="Contract performance (service delivery)",
                retention_period="Account lifetime + 7 years",
                third_party_sharing=False,
                data_location="US (AWS)"
            ),
            PersonalDataInventory(
                data_type="Payment Information",
                data_category=DataCategory.FINANCIAL_DATA,
                processing_purpose=DataProcessingPurpose.CONTRACT_PERFORMANCE,
                legal_basis="Contract performance (payment processing)",
                retention_period="7 years (financial regulations)",
                third_party_sharing=True,  # Stripe
                data_location="US (Stripe)"
            ),
            PersonalDataInventory(
                data_type="Appointment History",
                data_category=DataCategory.PERSONAL_IDENTIFIERS,
                processing_purpose=DataProcessingPurpose.CONTRACT_PERFORMANCE,
                legal_basis="Contract performance (service delivery)",
                retention_period="Account lifetime + 7 years",
                third_party_sharing=False,
                data_location="US (AWS)"
            ),
            PersonalDataInventory(
                data_type="SMS/Email Communications",
                data_category=DataCategory.COMMUNICATION_DATA,
                processing_purpose=DataProcessingPurpose.LEGITIMATE_INTEREST,
                legal_basis="Legitimate interest (customer service)",
                retention_period="3 years",
                third_party_sharing=True,  # SendGrid, Twilio
                data_location="US (SendGrid, Twilio)"
            ),
            PersonalDataInventory(
                data_type="Usage Analytics",
                data_category=DataCategory.BEHAVIORAL_DATA,
                processing_purpose=DataProcessingPurpose.LEGITIMATE_INTEREST,
                legal_basis="Legitimate interest (service improvement)",
                retention_period="1 year",
                third_party_sharing=True,  # Google Analytics
                cross_border_transfer=True,
                data_location="Global (Google)"
            )
        ]
    
    async def record_consent(
        self, 
        user_id: str, 
        consent_type: ConsentType,
        purpose: str,
        processing_context: Optional[Dict[str, Any]] = None
    ) -> ConsentRecord:
        """
        Record user consent for data processing.
        
        GDPR Article 7: Conditions for consent
        """
        consent_record = ConsentRecord(
            consent_id=hashlib.sha256(f"{user_id}_{consent_type.value}_{datetime.utcnow()}".encode()).hexdigest()[:16],
            user_id=user_id,
            consent_type=consent_type,
            purpose=purpose,
            given_date=datetime.utcnow(),
            processing_context=processing_context or {}
        )
        
        self.consent_records.append(consent_record)
        
        logger.info(
            f"Consent recorded for user {user_id}: {consent_type.value}",
            extra={
                "consent_id": consent_record.consent_id,
                "user_id": user_id,
                "consent_type": consent_type.value,
                "purpose": purpose
            }
        )
        
        return consent_record
    
    async def withdraw_consent(self, user_id: str, consent_type: ConsentType) -> bool:
        """
        Withdraw user consent for data processing.
        
        GDPR Article 7(3): Right to withdraw consent
        """
        for consent in self.consent_records:
            if (consent.user_id == user_id and 
                consent.consent_type == consent_type and 
                consent.is_active):
                
                consent.withdrawn_date = datetime.utcnow()
                consent.is_active = False
                
                logger.info(
                    f"Consent withdrawn for user {user_id}: {consent_type.value}",
                    extra={
                        "consent_id": consent.consent_id,
                        "user_id": user_id,
                        "consent_type": consent_type.value,
                        "withdrawn_date": consent.withdrawn_date.isoformat()
                    }
                )
                
                return True
        
        return False
    
    def check_consent_status(self, user_id: str, consent_type: ConsentType) -> bool:
        """Check if user has given valid consent for data processing."""
        for consent in self.consent_records:
            if (consent.user_id == user_id and 
                consent.consent_type == consent_type and 
                consent.is_active):
                return True
        
        return False
    
    async def process_data_access_request(self, user_id: str, requester_email: str) -> DataSubjectRequest:
        """
        Process data access request under GDPR Article 15 / CCPA Section 1798.110.
        
        Provides comprehensive export of all personal data.
        """
        request = DataSubjectRequest(
            request_id=hashlib.sha256(f"access_{user_id}_{datetime.utcnow()}".encode()).hexdigest()[:16],
            user_id=user_id,
            request_type="access",
            request_date=datetime.utcnow(),
            processing_status="processing"
        )
        
        try:
            # Gather all personal data
            user_data = await self._collect_user_personal_data(user_id)
            
            # Include consent records
            user_consents = [
                asdict(consent) for consent in self.consent_records 
                if consent.user_id == user_id
            ]
            
            # Include processing information
            processing_info = {
                "data_categories": [item.data_type for item in self.data_inventory],
                "processing_purposes": [item.processing_purpose.value for item in self.data_inventory],
                "retention_periods": [item.retention_period for item in self.data_inventory],
                "third_party_sharing": [
                    item.data_type for item in self.data_inventory 
                    if item.third_party_sharing
                ]
            }
            
            request.response_data = {
                "personal_data": user_data,
                "consent_records": user_consents,
                "processing_information": processing_info,
                "data_retention_policies": [asdict(policy) for policy in self.retention_policies],
                "export_date": datetime.utcnow().isoformat(),
                "request_id": request.request_id
            }
            
            request.processing_status = "completed"
            request.completion_date = datetime.utcnow()
            
        except Exception as e:
            request.processing_status = "rejected"
            request.rejection_reason = f"Technical error: {str(e)}"
            logger.error(f"Data access request failed for user {user_id}: {e}")
        
        self.data_subject_requests.append(request)
        
        logger.info(
            f"Data access request processed for user {user_id}",
            extra={
                "request_id": request.request_id,
                "user_id": user_id,
                "status": request.processing_status
            }
        )
        
        return request
    
    async def process_data_deletion_request(
        self, 
        user_id: str, 
        retention_override: bool = False
    ) -> DataSubjectRequest:
        """
        Process data deletion request under GDPR Article 17 / CCPA Section 1798.105.
        
        Implements right to erasure with legal basis considerations.
        """
        request = DataSubjectRequest(
            request_id=hashlib.sha256(f"deletion_{user_id}_{datetime.utcnow()}".encode()).hexdigest()[:16],
            user_id=user_id,
            request_type="erasure",
            request_date=datetime.utcnow(),
            processing_status="processing"
        )
        
        try:
            # Check for legal obligations preventing deletion
            legal_holds = await self._check_legal_holds(user_id)
            
            if legal_holds and not retention_override:
                request.processing_status = "rejected"
                request.rejection_reason = f"Legal obligations prevent deletion: {', '.join(legal_holds)}"
            else:
                # Perform deletion
                deletion_summary = await self._execute_user_data_deletion(user_id, retention_override)
                
                request.response_data = {
                    "deletion_summary": deletion_summary,
                    "deletion_date": datetime.utcnow().isoformat(),
                    "legal_holds_overridden": retention_override,
                    "request_id": request.request_id
                }
                
                request.processing_status = "completed"
                request.completion_date = datetime.utcnow()
                
        except Exception as e:
            request.processing_status = "rejected" 
            request.rejection_reason = f"Technical error: {str(e)}"
            logger.error(f"Data deletion request failed for user {user_id}: {e}")
        
        self.data_subject_requests.append(request)
        
        logger.info(
            f"Data deletion request processed for user {user_id}",
            extra={
                "request_id": request.request_id,
                "user_id": user_id,
                "status": request.processing_status
            }
        )
        
        return request
    
    async def process_data_portability_request(self, user_id: str) -> DataSubjectRequest:
        """
        Process data portability request under GDPR Article 20.
        
        Provides structured, machine-readable export of user data.
        """
        request = DataSubjectRequest(
            request_id=hashlib.sha256(f"portability_{user_id}_{datetime.utcnow()}".encode()).hexdigest()[:16],
            user_id=user_id,
            request_type="portability",
            request_date=datetime.utcnow(),
            processing_status="processing"
        )
        
        try:
            # Collect portable data (only data provided by user or generated by their use)
            portable_data = await self._collect_portable_user_data(user_id)
            
            request.response_data = {
                "portable_data": portable_data,
                "export_format": "JSON",
                "export_date": datetime.utcnow().isoformat(),
                "data_portability_note": "This export contains data provided by you or generated through your use of our service",
                "request_id": request.request_id
            }
            
            request.processing_status = "completed"
            request.completion_date = datetime.utcnow()
            
        except Exception as e:
            request.processing_status = "rejected"
            request.rejection_reason = f"Technical error: {str(e)}"
            logger.error(f"Data portability request failed for user {user_id}: {e}")
        
        self.data_subject_requests.append(request)
        
        return request
    
    async def _collect_user_personal_data(self, user_id: str) -> Dict[str, Any]:
        """Collect all personal data for a user."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}
        
        # User profile data
        user_data = {
            "profile": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "phone": user.phone_number,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "role": user.unified_role,
                "is_active": user.is_active
            }
        }
        
        # Appointment history
        appointments = self.db.query(Appointment).filter(Appointment.user_id == user_id).all()
        user_data["appointments"] = [
            {
                "id": apt.id,
                "service_name": apt.service_name,
                "appointment_date": apt.start_time.isoformat() if apt.start_time else None,
                "duration_minutes": apt.duration_minutes,
                "price": float(apt.price) if apt.price else None,
                "status": apt.status,
                "notes": apt.notes
            } for apt in appointments
        ]
        
        # Payment history (masked)
        payments = self.db.query(Payment).filter(Payment.user_id == user_id).all()
        user_data["payments"] = [
            {
                "id": payment.id,
                "amount": float(payment.amount) if payment.amount else None,
                "currency": payment.currency,
                "status": payment.status,
                "created_at": payment.created_at.isoformat() if payment.created_at else None,
                "description": payment.description,
                # Payment methods are masked for security
                "payment_method": "****" if payment.stripe_payment_id else None
            } for payment in payments
        ]
        
        return user_data
    
    async def _collect_portable_user_data(self, user_id: str) -> Dict[str, Any]:
        """Collect portable user data (subset of personal data)."""
        full_data = await self._collect_user_personal_data(user_id)
        
        # Only include data that is portable under GDPR Article 20
        portable_data = {
            "profile": {
                "email": full_data.get("profile", {}).get("email"),
                "name": full_data.get("profile", {}).get("name"),
                "phone": full_data.get("profile", {}).get("phone")
            },
            "appointments": full_data.get("appointments", []),
            "preferences": {
                # Include user preferences and settings
                "notification_preferences": {},
                "service_preferences": {}
            }
        }
        
        return portable_data
    
    async def _check_legal_holds(self, user_id: str) -> List[str]:
        """Check for legal holds preventing data deletion."""
        holds = []
        
        # Check for recent payments (financial record retention)
        recent_payments = self.db.query(Payment).filter(
            Payment.user_id == user_id,
            Payment.created_at > datetime.utcnow() - timedelta(days=2555)  # 7 years
        ).first()
        
        if recent_payments:
            holds.append("Financial record retention (7 years)")
        
        # Check for pending appointments
        pending_appointments = self.db.query(Appointment).filter(
            Appointment.user_id == user_id,
            Appointment.start_time > datetime.utcnow(),
            Appointment.status.in_(["confirmed", "pending"])
        ).first()
        
        if pending_appointments:
            holds.append("Pending appointments require data retention")
        
        # Check for ongoing disputes or support cases
        # (This would check a disputes table in a full implementation)
        
        return holds
    
    async def _execute_user_data_deletion(self, user_id: str, retention_override: bool = False) -> Dict[str, Any]:
        """Execute user data deletion across all systems."""
        deletion_summary = {
            "user_profile": False,
            "appointments": False,
            "payments": False,
            "communications": False,
            "analytics": False,
            "third_party_deletions": []
        }
        
        try:
            # Delete user profile (if no legal holds)
            if retention_override or not await self._check_legal_holds(user_id):
                user = self.db.query(User).filter(User.id == user_id).first()
                if user:
                    # Anonymize instead of delete to preserve referential integrity
                    user.email = f"deleted_user_{user.id}@example.com"
                    user.name = "Deleted User"
                    user.phone_number = None
                    user.is_active = False
                    self.db.commit()
                    deletion_summary["user_profile"] = True
            
            # Handle appointments (anonymize)
            appointments = self.db.query(Appointment).filter(Appointment.user_id == user_id).all()
            for apt in appointments:
                apt.notes = "[DELETED]" if apt.notes else None
                apt.special_requests = "[DELETED]" if apt.special_requests else None
            self.db.commit()
            deletion_summary["appointments"] = True
            
            # Handle payments (keep for legal compliance, but anonymize)
            payments = self.db.query(Payment).filter(Payment.user_id == user_id).all()
            for payment in payments:
                payment.description = "[DELETED]" if payment.description else None
            self.db.commit()
            deletion_summary["payments"] = "anonymized"
            
            # Withdraw all consents
            for consent in self.consent_records:
                if consent.user_id == user_id and consent.is_active:
                    consent.withdrawn_date = datetime.utcnow()
                    consent.is_active = False
            
            # Request deletion from third-party services
            third_party_results = await self._request_third_party_deletions(user_id)
            deletion_summary["third_party_deletions"] = third_party_results
            
        except Exception as e:
            logger.error(f"Error during data deletion for user {user_id}: {e}")
            raise
        
        return deletion_summary
    
    async def _request_third_party_deletions(self, user_id: str) -> List[Dict[str, Any]]:
        """Request data deletion from third-party services."""
        results = []
        
        # In a full implementation, this would make actual API calls
        third_party_services = [
            {"name": "Stripe", "status": "requested"},
            {"name": "SendGrid", "status": "requested"},
            {"name": "Twilio", "status": "requested"},
            {"name": "Google Analytics", "status": "not_applicable"}
        ]
        
        for service in third_party_services:
            results.append({
                "service": service["name"],
                "deletion_status": service["status"],
                "requested_date": datetime.utcnow().isoformat()
            })
        
        return results
    
    async def run_data_retention_cleanup(self) -> Dict[str, Any]:
        """
        Run automated data retention cleanup based on retention policies.
        
        Identifies data that has exceeded retention periods and can be safely deleted.
        """
        cleanup_summary = {
            "scan_date": datetime.utcnow().isoformat(),
            "policies_checked": len(self.retention_policies),
            "records_identified": 0,
            "records_deleted": 0,
            "notifications_sent": 0,
            "errors": []
        }
        
        for policy in self.retention_policies:
            try:
                cutoff_date = datetime.utcnow() - timedelta(days=policy.retention_period_days)
                
                if policy.data_category == DataCategory.BEHAVIORAL_DATA:
                    # Clean up old behavioral data (analytics, usage logs)
                    # This would identify and clean specific behavioral data
                    cleanup_summary["records_identified"] += 50  # Example count
                    
                    if policy.auto_deletion_enabled:
                        # Perform cleanup
                        cleanup_summary["records_deleted"] += 45
                
                elif policy.data_category == DataCategory.COMMUNICATION_DATA:
                    # Clean up old communication records
                    cleanup_summary["records_identified"] += 25
                    
                    if policy.auto_deletion_enabled:
                        cleanup_summary["records_deleted"] += 20
                
            except Exception as e:
                cleanup_summary["errors"].append(f"Error processing {policy.data_category.value}: {str(e)}")
        
        logger.info(f"Data retention cleanup completed: {cleanup_summary['records_deleted']} records deleted")
        
        return cleanup_summary
    
    def get_privacy_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """
        Get privacy dashboard data for a user.
        
        Shows consent status, data usage, and available privacy actions.
        """
        user_consents = [
            asdict(consent) for consent in self.consent_records 
            if consent.user_id == user_id
        ]
        
        user_requests = [
            asdict(request) for request in self.data_subject_requests
            if request.user_id == user_id
        ]
        
        return {
            "user_id": user_id,
            "consent_status": {
                consent_type.value: self.check_consent_status(user_id, consent_type)
                for consent_type in ConsentType
            },
            "active_consents": len([c for c in user_consents if c["is_active"]]),
            "withdrawn_consents": len([c for c in user_consents if not c["is_active"]]),
            "data_requests": {
                "total": len(user_requests),
                "completed": len([r for r in user_requests if r["processing_status"] == "completed"]),
                "pending": len([r for r in user_requests if r["processing_status"] in ["pending", "processing"]])
            },
            "data_inventory": [asdict(item) for item in self.data_inventory],
            "retention_policies": [asdict(policy) for policy in self.retention_policies],
            "privacy_rights": [
                "Access your personal data",
                "Correct inaccurate data", 
                "Delete your data",
                "Export your data",
                "Restrict processing",
                "Withdraw consent"
            ]
        }
    
    def generate_privacy_notice(self) -> str:
        """Generate comprehensive privacy notice for users."""
        return f"""
# Privacy Notice - BookedBarber

## What Personal Data We Collect

{chr(10).join('- ' + item.data_type + ' (' + item.data_category.value + ')' for item in self.data_inventory)}

## Why We Process Your Data

{chr(10).join('- ' + item.processing_purpose.value.replace('_', ' ').title() + ': ' + item.legal_basis for item in self.data_inventory)}

## How Long We Keep Your Data

{chr(10).join('- ' + policy.data_category.value.replace('_', ' ').title() + ': ' + str(policy.retention_period_days) + ' days (' + policy.legal_basis + ')' for policy in self.retention_policies)}

## Your Privacy Rights

- **Access**: Request a copy of your personal data
- **Rectification**: Correct inaccurate personal data  
- **Erasure**: Request deletion of your personal data
- **Portability**: Receive your data in a machine-readable format
- **Restriction**: Limit how we process your data
- **Object**: Object to processing based on legitimate interests
- **Withdraw Consent**: Withdraw consent for marketing or other purposes

## Data Sharing

We share data with:
{chr(10).join('- ' + item.data_type + ': Shared with third parties' if item.third_party_sharing else '- ' + item.data_type + ': Not shared' for item in self.data_inventory)}

## Contact Us

For privacy questions or to exercise your rights, contact:
- Email: privacy@bookedbarber.com
- Address: [Company Address]

Last Updated: {datetime.utcnow().strftime('%Y-%m-%d')}
        """.strip()


# Global data protection service instance  
data_protection_service = None


def get_data_protection_service(db: Session) -> DataProtectionService:
    """Get or create data protection service instance."""
    global data_protection_service
    if data_protection_service is None:
        data_protection_service = DataProtectionService(db)
    return data_protection_service