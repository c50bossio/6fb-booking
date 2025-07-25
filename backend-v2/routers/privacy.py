"""
API router for GDPR compliance and privacy management.
Handles user consents, cookie preferences, data exports, and account deletion.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import logging

from db import get_db
from dependencies import get_current_user
from models import User
from models.consent import (
    UserConsent, CookieConsent, DataProcessingLog, DataExportRequest, LegalConsentAudit,
    ConsentType as ConsentTypeModel, ConsentStatus as ConsentStatusModel,
    DataProcessingPurpose, ExportStatus as ExportStatusModel
)
from schemas_new.privacy import (
    CookiePreferences, CookieConsentRequest, CookieConsentResponse,
    ConsentUpdate, ConsentResponse, BulkConsentUpdate,
    DataExportResponse, DataExportStatusResponse,
    AccountDeletionRequest, AccountDeletionResponse, PrivacySettings,
    ConsentAuditEntry, ConsentAuditLog, ConsentType,
    ConsentStatus, ExportStatus
)
from utils.error_handling import AppError

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/privacy",
    tags=["privacy", "gdpr"],
)

def log_consent_audit(
    db: Session,
    user_id: int,
    action: str,
    consent_type: Optional[str] = None,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    reason: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    performed_by: Optional[int] = None
):
    """Helper function to create consent audit logs"""
    audit = LegalConsentAudit(
        user_id=user_id,
        action=action,
        consent_type=consent_type,
        old_status=old_status,
        new_status=new_status,
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
        performed_by=performed_by or user_id
    )
    db.add(audit)
    db.commit()

def log_data_processing(
    db: Session,
    user_id: int,
    purpose: DataProcessingPurpose,
    operation: str,
    data_categories: List[str],
    legal_basis: str = "consent",
    third_party_involved: bool = False,
    third_party_details: Optional[Dict] = None,
    ip_address: Optional[str] = None
):
    """Helper function to log data processing activities"""
    log = DataProcessingLog(
        user_id=user_id,
        purpose=purpose,
        operation=operation,
        data_categories=data_categories,
        legal_basis=legal_basis,
        third_party_involved=third_party_involved,
        third_party_details=third_party_details,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()

@router.post("/cookie-consent", response_model=CookieConsentResponse)
async def save_cookie_preferences(
    request: CookieConsentRequest,
    req: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Save or update cookie consent preferences.
    Can be used by both authenticated and anonymous users.
    """
    try:
        # Get session ID or generate one
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get client info
        ip_address = req.client.host if req.client else None
        user_agent = req.headers.get("user-agent")
        
        # Check if consent already exists
        existing_consent = db.query(CookieConsent).filter(
            and_(
                CookieConsent.session_id == session_id,
                CookieConsent.user_id == (current_user.id if current_user else None)
            )
        ).first()
        
        if existing_consent:
            # Update existing consent
            existing_consent.functional = request.preferences.functional
            existing_consent.analytics = request.preferences.analytics
            existing_consent.marketing = request.preferences.marketing
            existing_consent.preferences = request.preferences.preferences
            existing_consent.consent_date = datetime.utcnow()
            existing_consent.expiry_date = datetime.utcnow() + timedelta(days=365)
            existing_consent.ip_address = ip_address
            existing_consent.user_agent = user_agent
        else:
            # Create new consent
            existing_consent = CookieConsent(
                user_id=current_user.id if current_user else None,
                session_id=session_id,
                functional=request.preferences.functional,
                analytics=request.preferences.analytics,
                marketing=request.preferences.marketing,
                preferences=request.preferences.preferences,
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(existing_consent)
        
        db.commit()
        db.refresh(existing_consent)
        
        # Log audit entry if user is authenticated
        if current_user:
            log_consent_audit(
                db=db,
                user_id=current_user.id,
                action="cookie_consent_updated",
                reason=f"Analytics: {request.preferences.analytics}, Marketing: {request.preferences.marketing}",
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Log data processing
            log_data_processing(
                db=db,
                user_id=current_user.id,
                purpose=DataProcessingPurpose.CONSENT_MANAGEMENT,
                operation="cookie_consent_update",
                data_categories=["cookie_preferences"],
                legal_basis="consent",
                ip_address=ip_address
            )
        
        logger.info(f"Cookie consent updated for session {session_id}")
        
        return CookieConsentResponse(
            id=existing_consent.id,
            user_id=existing_consent.user_id,
            session_id=existing_consent.session_id,
            preferences=CookiePreferences(
                functional=existing_consent.functional,
                analytics=existing_consent.analytics,
                marketing=existing_consent.marketing,
                preferences=existing_consent.preferences
            ),
            consent_date=existing_consent.consent_date,
            expiry_date=existing_consent.expiry_date
        )
        
    except Exception as e:
        logger.error(f"Error saving cookie preferences: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/cookie-consent", response_model=Optional[CookieConsentResponse])
async def get_cookie_preferences(
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Get current cookie consent preferences.
    Returns preferences for the current user or session.
    """
    try:
        # Try to find consent by user ID first
        consent = None
        if current_user:
            consent = db.query(CookieConsent).filter(
                CookieConsent.user_id == current_user.id
            ).order_by(CookieConsent.created_at.desc()).first()
        
        # Fall back to session ID
        if not consent and session_id:
            consent = db.query(CookieConsent).filter(
                CookieConsent.session_id == session_id
            ).order_by(CookieConsent.created_at.desc()).first()
        
        if not consent:
            return None
        
        # Check if consent is expired
        if consent.is_expired():
            return None
        
        return CookieConsentResponse(
            id=consent.id,
            user_id=consent.user_id,
            session_id=consent.session_id,
            preferences=CookiePreferences(
                functional=consent.functional,
                analytics=consent.analytics,
                marketing=consent.marketing,
                preferences=consent.preferences
            ),
            consent_date=consent.consent_date,
            expiry_date=consent.expiry_date
        )
        
    except Exception as e:
        logger.error(f"Error retrieving cookie preferences: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.post("/consent/terms", response_model=ConsentResponse, dependencies=[Depends(get_current_user)])
async def accept_terms_and_privacy(
    consent_update: ConsentUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accept or update consent for terms of service and privacy policy.
    Requires authentication.
    """
    try:
        # Get client info
        ip_address = req.client.host if req.client else None
        user_agent = req.headers.get("user-agent")
        
        # Convert schema enum to model enum
        consent_type = ConsentTypeModel(consent_update.consent_type.value)
        consent_status = ConsentStatusModel(consent_update.status.value)
        
        # Check if consent already exists
        existing_consent = db.query(UserConsent).filter(
            and_(
                UserConsent.user_id == current_user.id,
                UserConsent.consent_type == consent_type
            )
        ).first()
        
        old_status = None
        if existing_consent:
            old_status = existing_consent.status.value
            # Update existing consent
            if consent_status == ConsentStatusModel.GRANTED:
                existing_consent.grant(ip_address, user_agent)
            elif consent_status == ConsentStatusModel.WITHDRAWN:
                existing_consent.withdraw(ip_address, user_agent)
            else:
                existing_consent.status = consent_status
                existing_consent.updated_at = datetime.utcnow()
            
            if consent_update.version:
                existing_consent.version = consent_update.version
            if consent_update.notes:
                existing_consent.notes = consent_update.notes
        else:
            # Create new consent
            existing_consent = UserConsent(
                user_id=current_user.id,
                consent_type=consent_type,
                status=consent_status,
                ip_address=ip_address,
                user_agent=user_agent,
                version=consent_update.version,
                notes=consent_update.notes
            )
            db.add(existing_consent)
        
        db.commit()
        db.refresh(existing_consent)
        
        # Log audit entry
        log_consent_audit(
            db=db,
            user_id=current_user.id,
            action=f"consent_{consent_status.value}",
            consent_type=consent_type.value,
            old_status=old_status,
            new_status=consent_status.value,
            reason=consent_update.notes,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Log data processing
        log_data_processing(
            db=db,
            user_id=current_user.id,
            purpose=DataProcessingPurpose.CONSENT_MANAGEMENT,
            operation=f"consent_update_{consent_type.value}",
            data_categories=["consent_status", "consent_metadata"],
            legal_basis="consent" if consent_status == ConsentStatusModel.GRANTED else "legitimate_interest",
            ip_address=ip_address
        )
        
        logger.info(f"Consent updated for user {current_user.id}: {consent_type.value} = {consent_status.value}")
        
        return ConsentResponse(
            id=existing_consent.id,
            user_id=existing_consent.user_id,
            consent_type=ConsentType(existing_consent.consent_type.value),
            status=ConsentStatus(existing_consent.status.value),
            consent_date=existing_consent.consent_date,
            withdrawal_date=existing_consent.withdrawal_date,
            version=existing_consent.version,
            created_at=existing_consent.created_at,
            updated_at=existing_consent.updated_at
        )
        
    except Exception as e:
        logger.error(f"Error updating consent: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.post("/consent/bulk", response_model=List[ConsentResponse], dependencies=[Depends(get_current_user)])
async def update_bulk_consents(
    bulk_update: BulkConsentUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update multiple consents at once.
    Useful for initial consent collection or preference centers.
    """
    try:
        responses = []
        
        # If accept_all is true, update all consents to granted
        if bulk_update.accept_all:
            consent_types = [ct for ct in ConsentType]
            for consent_type in consent_types:
                consent_update = ConsentUpdate(
                    consent_type=consent_type,
                    status=ConsentStatus.GRANTED
                )
                response = await accept_terms_and_privacy(consent_update, req, db, current_user)
                responses.append(response)
        else:
            # Process individual consent updates
            for consent_update in bulk_update.consents:
                response = await accept_terms_and_privacy(consent_update, req, db, current_user)
                responses.append(response)
        
        return responses
        
    except Exception as e:
        logger.error(f"Error updating bulk consents: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/export", response_model=DataExportResponse, dependencies=[Depends(get_current_user)])
async def request_data_export(
    format: str = "json",
    background_tasks: BackgroundTasks = BackgroundTasks(),
    req: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request a complete export of user data (GDPR Article 20).
    Returns a request ID for tracking the export status.
    """
    try:
        # Get client info
        ip_address = req.client.host if req.client else None
        
        # Check if there's already a pending export
        pending_export = db.query(DataExportRequest).filter(
            and_(
                DataExportRequest.user_id == current_user.id,
                DataExportRequest.status.in_([ExportStatusModel.PENDING, ExportStatusModel.PROCESSING])
            )
        ).first()
        
        if pending_export:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Export request {pending_export.request_id} is already in progress"
            )
        
        # Create export request
        export_request = DataExportRequest(
            user_id=current_user.id,
            format=format,
            ip_address=ip_address,
            data_categories=["profile", "appointments", "payments", "consents", "preferences"]
        )
        db.add(export_request)
        db.commit()
        db.refresh(export_request)
        
        # Log audit entry
        log_consent_audit(
            db=db,
            user_id=current_user.id,
            action="data_export_requested",
            reason=f"Format: {format}",
            ip_address=ip_address,
            audit_metadata={"request_id": export_request.request_id}
        )
        
        # Log data processing
        log_data_processing(
            db=db,
            user_id=current_user.id,
            purpose=DataProcessingPurpose.DATA_EXPORT,
            operation="data_export_request",
            data_categories=export_request.data_categories,
            legal_basis="consent",
            ip_address=ip_address
        )
        
        # TODO: Add background task to process the export
        # background_tasks.add_task(process_data_export, export_request.id)
        
        logger.info(f"Data export requested for user {current_user.id}: {export_request.request_id}")
        
        return DataExportResponse(
            request_id=export_request.request_id,
            status=ExportStatus(export_request.status.value),
            requested_at=export_request.requested_at,
            format=export_request.format,
            message="Your data export request has been received and will be processed within 30 days as per GDPR requirements."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting data export: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/export/{request_id}", response_model=DataExportStatusResponse, dependencies=[Depends(get_current_user)])
async def check_export_status(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check the status of a data export request.
    """
    try:
        export_request = db.query(DataExportRequest).filter(
            and_(
                DataExportRequest.request_id == request_id,
                DataExportRequest.user_id == current_user.id
            )
        ).first()
        
        if not export_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Export request {request_id} not found"
            )
        
        # Calculate progress (mock for now)
        progress = 0
        if export_request.status == ExportStatusModel.PROCESSING:
            progress = 50
        elif export_request.status == ExportStatusModel.COMPLETED:
            progress = 100
        
        return DataExportStatusResponse(
            request_id=export_request.request_id,
            status=ExportStatus(export_request.status.value),
            progress_percentage=progress,
            estimated_completion=export_request.requested_at + timedelta(hours=24) if export_request.status == ExportStatusModel.PROCESSING else None,
            error_message=export_request.error_message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking export status: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.delete("/account", response_model=AccountDeletionResponse, dependencies=[Depends(get_current_user)])
async def request_account_deletion(
    deletion_request: AccountDeletionRequest,
    req: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request account deletion (GDPR Article 17 - Right to erasure).
    Account will be deactivated immediately and deleted after retention period.
    """
    try:
        # Get client info
        ip_address = req.client.host if req.client else None
        user_agent = req.headers.get("user-agent")
        
        # Mark user as inactive (soft delete)
        current_user.is_active = False
        current_user.deactivated_at = datetime.utcnow()
        
        # Log audit entry
        log_consent_audit(
            db=db,
            user_id=current_user.id,
            action="account_deletion_requested",
            reason=deletion_request.reason,
            ip_address=ip_address,
            user_agent=user_agent,
            audit_metadata={
                "feedback": deletion_request.feedback,
                "scheduled_deletion": (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
        )
        
        # Withdraw all consents
        user_consents = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id
        ).all()
        
        for consent in user_consents:
            if consent.status == ConsentStatusModel.GRANTED:
                consent.withdraw(ip_address, user_agent)
        
        db.commit()
        
        # TODO: Add background task to schedule permanent deletion
        # background_tasks.add_task(schedule_account_deletion, current_user.id, days=30)
        
        logger.info(f"Account deletion requested for user {current_user.id}")
        
        return AccountDeletionResponse(
            success=True,
            message="Your account has been deactivated and will be permanently deleted in 30 days. You can contact support to cancel this request.",
            deletion_date=datetime.utcnow() + timedelta(days=30),
            data_retention_days=30
        )
        
    except Exception as e:
        logger.error(f"Error requesting account deletion: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/status", response_model=PrivacySettings, dependencies=[Depends(get_current_user)])
async def get_privacy_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive privacy status for the current user.
    Includes all consents, preferences, and pending requests.
    """
    try:
        # Get all user consents
        user_consents = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id
        ).all()
        
        # Build consent status dictionary
        consent_dict = {}
        for consent in user_consents:
            consent_dict[consent.consent_type.value] = consent.status.value
        
        # Get latest cookie preferences
        cookie_consent = db.query(CookieConsent).filter(
            CookieConsent.user_id == current_user.id
        ).order_by(CookieConsent.created_at.desc()).first()
        
        cookie_prefs = None
        if cookie_consent and not cookie_consent.is_expired():
            cookie_prefs = CookiePreferences(
                functional=cookie_consent.functional,
                analytics=cookie_consent.analytics,
                marketing=cookie_consent.marketing,
                preferences=cookie_consent.preferences
            )
        
        # Check for pending export request
        pending_export = db.query(DataExportRequest).filter(
            and_(
                DataExportRequest.user_id == current_user.id,
                DataExportRequest.status.in_([ExportStatusModel.PENDING, ExportStatusModel.PROCESSING])
            )
        ).first()
        
        # Check GDPR compliance
        required_consents = [ConsentTypeModel.TERMS_OF_SERVICE, ConsentTypeModel.PRIVACY_POLICY]
        gdpr_compliant = all(
            consent_dict.get(ct.value) == ConsentStatusModel.GRANTED.value
            for ct in required_consents
        )
        
        # Get last privacy review date
        last_review = db.query(LegalConsentAudit).filter(
            and_(
                LegalConsentAudit.user_id == current_user.id,
                LegalConsentAudit.action == "privacy_review_completed"
            )
        ).order_by(LegalConsentAudit.timestamp.desc()).first()
        
        return PrivacySettings(
            user_id=current_user.id,
            email=current_user.email,
            consents=consent_dict,
            cookie_preferences=cookie_prefs,
            data_export_available=not bool(pending_export),
            pending_export_request=pending_export.request_id if pending_export else None,
            last_privacy_review=last_review.timestamp if last_review else None,
            gdpr_compliant=gdpr_compliant
        )
        
    except Exception as e:
        logger.error(f"Error getting privacy status: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/audit-log", response_model=ConsentAuditLog, dependencies=[Depends(get_current_user)])
async def get_consent_audit_log(
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit log of all consent-related activities for the current user.
    """
    try:
        # Calculate offset
        offset = (page - 1) * per_page
        
        # Get total count
        total = db.query(LegalConsentAudit).filter(
            LegalConsentAudit.user_id == current_user.id
        ).count()
        
        # Get audit entries
        entries = db.query(LegalConsentAudit).filter(
            LegalConsentAudit.user_id == current_user.id
        ).order_by(
            LegalConsentAudit.timestamp.desc()
        ).offset(offset).limit(per_page).all()
        
        # Convert to response schema
        audit_entries = [
            ConsentAuditEntry(
                id=entry.id,
                user_id=entry.user_id,
                action=entry.action,
                consent_type=entry.consent_type,
                old_status=entry.old_status,
                new_status=entry.new_status,
                reason=entry.reason,
                ip_address=entry.ip_address,
                performed_by=entry.performed_by,
                timestamp=entry.timestamp
            )
            for entry in entries
        ]
        
        return ConsentAuditLog(
            entries=audit_entries,
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error(f"Error getting audit log: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)