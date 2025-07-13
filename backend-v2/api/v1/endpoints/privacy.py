"""
Privacy and GDPR Compliance API Endpoints.

Implements user data export requests, consent management,
and other privacy-related functionality as required by GDPR.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from database import get_db
from auth import get_current_user
from models import User
from models.consent import (
    DataExportRequest, ExportStatus, ConsentType, ConsentStatus,
    UserConsent, CookieConsent, LegalConsentAudit
)
from services.privacy_data_export_service import PrivacyDataExportService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/privacy", tags=["privacy"])


# Request/Response Models
class DataExportRequestCreate(BaseModel):
    format: str = Field(default="json", regex="^(json|csv|xml)$")
    
    class Config:
        schema_extra = {
            "example": {
                "format": "json"
            }
        }


class DataExportRequestResponse(BaseModel):
    request_id: str
    status: str
    requested_at: datetime
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    file_size_bytes: Optional[int] = None
    format: str
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConsentUpdateRequest(BaseModel):
    consent_type: str
    granted: bool
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class CookieConsentRequest(BaseModel):
    session_id: str
    analytics: bool = False
    marketing: bool = False
    preferences: bool = False
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ConsentResponse(BaseModel):
    consent_type: str
    status: str
    consent_date: Optional[datetime] = None
    withdrawal_date: Optional[datetime] = None
    version: Optional[str] = None
    
    class Config:
        from_attributes = True


class PrivacyDashboardResponse(BaseModel):
    """User's privacy dashboard with consent status and data export history"""
    user_id: int
    consents: List[ConsentResponse]
    active_export_requests: List[DataExportRequestResponse]
    data_processing_summary: dict
    cookie_consent_status: Optional[dict] = None


# API Endpoints

@router.post("/export-request", response_model=DataExportRequestResponse)
async def create_data_export_request(
    request: DataExportRequestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new data export request (GDPR Article 20 - Right to data portability).
    
    The export will be processed in the background and the user will be notified
    when it's ready for download.
    """
    try:
        # Check if user has an active export request
        existing_request = db.query(DataExportRequest).filter(
            DataExportRequest.user_id == current_user.id,
            DataExportRequest.status.in_([ExportStatus.PENDING, ExportStatus.PROCESSING])
        ).first()
        
        if existing_request:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"You already have an active export request: {existing_request.request_id}"
            )
        
        # Create new export request
        export_request = DataExportRequest(
            user_id=current_user.id,
            format=request.format,
            status=ExportStatus.PENDING,
            requested_at=datetime.utcnow()
        )
        
        db.add(export_request)
        db.commit()
        db.refresh(export_request)
        
        # Start background processing
        privacy_service = PrivacyDataExportService(db)
        background_tasks.add_task(
            privacy_service.process_export_request,
            export_request.request_id
        )
        
        # Log consent audit
        audit_log = LegalConsentAudit(
            user_id=current_user.id,
            action="data_export_requested",
            audit_metadata={
                "request_id": export_request.request_id,
                "format": request.format
            },
            timestamp=datetime.utcnow()
        )
        db.add(audit_log)
        db.commit()
        
        logger.info(f"Data export request created: {export_request.request_id} for user {current_user.id}")
        
        return DataExportRequestResponse(
            request_id=export_request.request_id,
            status=export_request.status.value,
            requested_at=export_request.requested_at,
            completed_at=export_request.completed_at,
            expires_at=export_request.expires_at,
            file_size_bytes=export_request.file_size_bytes,
            format=export_request.format,
            download_url=export_request.file_url,
            error_message=export_request.error_message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating data export request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create data export request"
        )


@router.get("/export-requests", response_model=List[DataExportRequestResponse])
async def get_user_export_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all data export requests for the current user."""
    try:
        export_requests = db.query(DataExportRequest).filter(
            DataExportRequest.user_id == current_user.id
        ).order_by(DataExportRequest.requested_at.desc()).all()
        
        return [
            DataExportRequestResponse(
                request_id=req.request_id,
                status=req.status.value,
                requested_at=req.requested_at,
                completed_at=req.completed_at,
                expires_at=req.expires_at,
                file_size_bytes=req.file_size_bytes,
                format=req.format,
                download_url=req.file_url if not req.is_expired() else None,
                error_message=req.error_message
            )
            for req in export_requests
        ]
        
    except Exception as e:
        logger.error(f"Error getting export requests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get export requests"
        )


@router.get("/export-status/{request_id}", response_model=DataExportRequestResponse)
async def get_export_status(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of a specific data export request."""
    try:
        export_request = db.query(DataExportRequest).filter(
            DataExportRequest.request_id == request_id,
            DataExportRequest.user_id == current_user.id
        ).first()
        
        if not export_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export request not found"
            )
        
        return DataExportRequestResponse(
            request_id=export_request.request_id,
            status=export_request.status.value,
            requested_at=export_request.requested_at,
            completed_at=export_request.completed_at,
            expires_at=export_request.expires_at,
            file_size_bytes=export_request.file_size_bytes,
            format=export_request.format,
            download_url=export_request.file_url if not export_request.is_expired() else None,
            error_message=export_request.error_message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting export status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get export status"
        )


@router.post("/consent", response_model=ConsentResponse)
async def update_user_consent(
    request: ConsentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user consent for a specific consent type."""
    try:
        # Validate consent type
        try:
            consent_type = ConsentType(request.consent_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid consent type: {request.consent_type}"
            )
        
        # Find or create consent record
        consent = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type == consent_type
        ).first()
        
        if not consent:
            consent = UserConsent(
                user_id=current_user.id,
                consent_type=consent_type,
                status=ConsentStatus.PENDING
            )
            db.add(consent)
        
        # Update consent status
        old_status = consent.status.value
        
        if request.granted:
            consent.grant(ip_address=request.ip_address, user_agent=request.user_agent)
        else:
            consent.withdraw(ip_address=request.ip_address, user_agent=request.user_agent)
        
        db.commit()
        
        # Log audit trail
        audit_log = LegalConsentAudit(
            user_id=current_user.id,
            consent_id=consent.id,
            action="consent_updated",
            consent_type=consent_type.value,
            old_status=old_status,
            new_status=consent.status.value,
            ip_address=request.ip_address,
            user_agent=request.user_agent,
            timestamp=datetime.utcnow()
        )
        db.add(audit_log)
        db.commit()
        
        logger.info(f"Consent updated for user {current_user.id}: {consent_type.value} = {consent.status.value}")
        
        return ConsentResponse(
            consent_type=consent.consent_type.value,
            status=consent.status.value,
            consent_date=consent.consent_date,
            withdrawal_date=consent.withdrawal_date,
            version=consent.version
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating consent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update consent"
        )


@router.get("/consents", response_model=List[ConsentResponse])
async def get_user_consents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all consent records for the current user."""
    try:
        consents = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id
        ).all()
        
        return [
            ConsentResponse(
                consent_type=consent.consent_type.value,
                status=consent.status.value,
                consent_date=consent.consent_date,
                withdrawal_date=consent.withdrawal_date,
                version=consent.version
            )
            for consent in consents
        ]
        
    except Exception as e:
        logger.error(f"Error getting user consents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get consents"
        )


@router.post("/cookie-consent")
async def update_cookie_consent(
    request: CookieConsentRequest,
    db: Session = Depends(get_db)
):
    """Update cookie consent preferences. Can be called anonymously with session ID."""
    try:
        # Find existing cookie consent by session
        cookie_consent = db.query(CookieConsent).filter(
            CookieConsent.session_id == request.session_id
        ).first()
        
        if not cookie_consent:
            cookie_consent = CookieConsent(
                session_id=request.session_id,
                ip_address=request.ip_address,
                user_agent=request.user_agent
            )
            db.add(cookie_consent)
        
        # Update preferences
        cookie_consent.update_preferences(
            analytics=request.analytics,
            marketing=request.marketing,
            preferences=request.preferences
        )
        
        if request.ip_address:
            cookie_consent.ip_address = request.ip_address
        if request.user_agent:
            cookie_consent.user_agent = request.user_agent
        
        db.commit()
        
        logger.info(f"Cookie consent updated for session {request.session_id}")
        
        return {
            "message": "Cookie consent updated successfully",
            "session_id": request.session_id,
            "preferences": {
                "functional": cookie_consent.functional,
                "analytics": cookie_consent.analytics,
                "marketing": cookie_consent.marketing,
                "preferences": cookie_consent.preferences
            }
        }
        
    except Exception as e:
        logger.error(f"Error updating cookie consent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update cookie consent"
        )


@router.get("/dashboard", response_model=PrivacyDashboardResponse)
async def get_privacy_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's complete privacy dashboard with consent status and data export history."""
    try:
        # Get all consents
        consents = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id
        ).all()
        
        consent_responses = [
            ConsentResponse(
                consent_type=consent.consent_type.value,
                status=consent.status.value,
                consent_date=consent.consent_date,
                withdrawal_date=consent.withdrawal_date,
                version=consent.version
            )
            for consent in consents
        ]
        
        # Get active export requests
        active_exports = db.query(DataExportRequest).filter(
            DataExportRequest.user_id == current_user.id,
            DataExportRequest.status.in_([ExportStatus.PENDING, ExportStatus.PROCESSING, ExportStatus.COMPLETED])
        ).order_by(DataExportRequest.requested_at.desc()).limit(5).all()
        
        export_responses = [
            DataExportRequestResponse(
                request_id=req.request_id,
                status=req.status.value,
                requested_at=req.requested_at,
                completed_at=req.completed_at,
                expires_at=req.expires_at,
                file_size_bytes=req.file_size_bytes,
                format=req.format,
                download_url=req.file_url if not req.is_expired() else None,
                error_message=req.error_message
            )
            for req in active_exports
        ]
        
        # Get data processing summary
        from models.consent import DataProcessingLog
        recent_processing = db.query(DataProcessingLog).filter(
            DataProcessingLog.user_id == current_user.id
        ).order_by(DataProcessingLog.created_at.desc()).limit(10).all()
        
        processing_summary = {
            "total_processing_events": len(recent_processing),
            "recent_purposes": list(set(log.purpose.value for log in recent_processing)),
            "third_party_involved": any(log.third_party_involved for log in recent_processing),
            "last_processing_date": recent_processing[0].processing_date.isoformat() if recent_processing else None
        }
        
        # Get latest cookie consent
        latest_cookie_consent = db.query(CookieConsent).filter(
            CookieConsent.user_id == current_user.id
        ).order_by(CookieConsent.created_at.desc()).first()
        
        cookie_status = None
        if latest_cookie_consent:
            cookie_status = {
                "functional": latest_cookie_consent.functional,
                "analytics": latest_cookie_consent.analytics,
                "marketing": latest_cookie_consent.marketing,
                "preferences": latest_cookie_consent.preferences,
                "last_updated": latest_cookie_consent.consent_date.isoformat(),
                "expires": latest_cookie_consent.expiry_date.isoformat()
            }
        
        return PrivacyDashboardResponse(
            user_id=current_user.id,
            consents=consent_responses,
            active_export_requests=export_responses,
            data_processing_summary=processing_summary,
            cookie_consent_status=cookie_status
        )
        
    except Exception as e:
        logger.error(f"Error getting privacy dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get privacy dashboard"
        )


@router.delete("/account")
async def request_account_deletion(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request account deletion (GDPR Article 17 - Right to erasure)."""
    try:
        # Log the deletion request
        audit_log = LegalConsentAudit(
            user_id=current_user.id,
            action="account_deletion_requested",
            audit_metadata={
                "requested_by": current_user.id,
                "requested_at": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow()
        )
        db.add(audit_log)
        db.commit()
        
        logger.info(f"Account deletion requested for user {current_user.id}")
        
        # Note: Actual deletion should be handled by a separate process
        # that verifies legal requirements and retention policies
        
        return {
            "message": "Account deletion request received. You will be contacted within 30 days to confirm deletion.",
            "request_id": f"DEL-{current_user.id}-{datetime.utcnow().strftime('%Y%m%d')}",
            "contact_email": "privacy@bookedbarber.com"
        }
        
    except Exception as e:
        logger.error(f"Error requesting account deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process deletion request"
        )


# Background task endpoint for cleanup (admin only)
@router.post("/admin/cleanup-expired")
async def cleanup_expired_exports(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to manually trigger cleanup of expired exports."""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    privacy_service = PrivacyDataExportService(db)
    background_tasks.add_task(privacy_service.cleanup_expired_exports)
    
    return {"message": "Cleanup task scheduled"}