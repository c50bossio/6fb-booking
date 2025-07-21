"""
Compliance API endpoints for PCI DSS, GDPR, and data protection.

Provides secure endpoints for:
- PCI DSS compliance monitoring and reporting
- GDPR data subject rights (access, deletion, portability)
- Privacy controls and consent management
- Security monitoring and audit trails
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from dependencies import get_db, get_current_user
from models import User
from services.pci_compliance import pci_compliance_service, validate_pci_access
from services.data_protection import get_data_protection_service, ConsentType
from utils.payment_errors import payment_error_handler, PaymentErrorCode
from utils.decorators import financial_endpoint_security, admin_required

router = APIRouter(prefix="/compliance", tags=["Compliance"])


# Request/Response Models
class ConsentRequest(BaseModel):
    consent_type: str
    purpose: str
    processing_context: Optional[Dict[str, Any]] = None


class DataSubjectRightsRequest(BaseModel):
    request_type: str  # access, rectification, erasure, portability
    verification_email: Optional[EmailStr] = None
    additional_info: Optional[Dict[str, Any]] = None


class ComplianceHealthResponse(BaseModel):
    status: str
    pci_compliance: Dict[str, Any]
    data_protection: Dict[str, Any]
    security_events: Dict[str, Any]
    recommendations: List[str]
    last_assessment: str


# PCI DSS Compliance Endpoints
@router.get("/pci/health")
@financial_endpoint_security
async def get_pci_compliance_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get PCI DSS compliance status and health metrics.
    
    Requires admin or manager permissions.
    Returns comprehensive compliance assessment.
    """
    # Validate access to PCI compliance data
    if not validate_pci_access(str(current_user.id), "compliance_reports", "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for PCI compliance data"
        )
    
    try:
        # Get compliance assessment
        assessment = pci_compliance_service.run_compliance_assessment()
        
        return {
            "status": "success",
            "data": assessment,
            "message": "PCI compliance status retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve compliance status: {str(e)}"
        )


@router.get("/pci/report")
@admin_required
async def generate_pci_compliance_report(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate detailed PCI DSS compliance report.
    
    Admin-only endpoint for comprehensive compliance documentation.
    """
    try:
        report = pci_compliance_service.generate_compliance_report()
        
        return {
            "status": "success",
            "report": report,
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": current_user.name or current_user.email
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate compliance report: {str(e)}"
        )


@router.get("/pci/requirements")
@financial_endpoint_security
async def get_pci_requirements(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get PCI DSS requirements and implementation status.
    
    Returns detailed breakdown of compliance requirements.
    """
    if not validate_pci_access(str(current_user.id), "compliance_requirements", "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for PCI requirements data"
        )
    
    try:
        requirements = pci_compliance_service.get_compliance_requirements()
        
        return {
            "status": "success",
            "requirements": [
                {
                    "requirement_id": req.requirement_id,
                    "title": req.title,
                    "description": req.description,
                    "compliance_level": req.compliance_level.value,
                    "implementation_status": req.implementation_status,
                    "evidence_required": req.evidence_required,
                    "last_validated": req.last_validated.isoformat() if req.last_validated else None,
                    "next_review": req.next_review.isoformat() if req.next_review else None
                } for req in requirements
            ],
            "total_requirements": len(requirements)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve PCI requirements: {str(e)}"
        )


# GDPR & Data Protection Endpoints
@router.post("/privacy/consent")
@payment_error_handler()
async def record_user_consent(
    consent_request: ConsentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Record user consent for data processing.
    
    GDPR Article 7: Conditions for consent
    """
    try:
        data_protection = get_data_protection_service(db)
        
        # Validate consent type
        try:
            consent_type = ConsentType(consent_request.consent_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid consent type: {consent_request.consent_type}"
            )
        
        consent_record = await data_protection.record_consent(
            user_id=str(current_user.id),
            consent_type=consent_type,
            purpose=consent_request.purpose,
            processing_context=consent_request.processing_context
        )
        
        return {
            "status": "success",
            "consent_id": consent_record.consent_id,
            "consent_type": consent_record.consent_type.value,
            "given_date": consent_record.given_date.isoformat(),
            "message": "Consent recorded successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record consent: {str(e)}"
        )


@router.delete("/privacy/consent/{consent_type}")
@payment_error_handler()
async def withdraw_user_consent(
    consent_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Withdraw user consent for data processing.
    
    GDPR Article 7(3): Right to withdraw consent
    """
    try:
        data_protection = get_data_protection_service(db)
        
        # Validate consent type
        try:
            consent_enum = ConsentType(consent_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid consent type: {consent_type}"
            )
        
        success = await data_protection.withdraw_consent(
            user_id=str(current_user.id),
            consent_type=consent_enum
        )
        
        if success:
            return {
                "status": "success",
                "consent_type": consent_type,
                "withdrawn_at": datetime.utcnow().isoformat(),
                "message": "Consent withdrawn successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active consent found for withdrawal"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to withdraw consent: {str(e)}"
        )


@router.post("/privacy/data-access")
@payment_error_handler()
async def request_data_access(
    request_data: DataSubjectRightsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Process data access request under GDPR Article 15.
    
    Provides comprehensive export of user's personal data.
    """
    try:
        data_protection = get_data_protection_service(db)
        
        # Verify email matches user account for additional security
        verification_email = request_data.verification_email or current_user.email
        if verification_email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification email must match your account email"
            )
        
        access_request = await data_protection.process_data_access_request(
            user_id=str(current_user.id),
            requester_email=verification_email
        )
        
        return {
            "status": "success",
            "request_id": access_request.request_id,
            "request_type": access_request.request_type,
            "processing_status": access_request.processing_status,
            "request_date": access_request.request_date.isoformat(),
            "completion_date": access_request.completion_date.isoformat() if access_request.completion_date else None,
            "data": access_request.response_data if access_request.processing_status == "completed" else None,
            "message": "Data access request processed successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process data access request: {str(e)}"
        )


@router.post("/privacy/data-deletion")
@payment_error_handler()
async def request_data_deletion(
    request_data: DataSubjectRightsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Process data deletion request under GDPR Article 17.
    
    Implements right to erasure with legal basis considerations.
    """
    try:
        data_protection = get_data_protection_service(db)
        
        # Verify email for additional security
        verification_email = request_data.verification_email or current_user.email
        if verification_email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification email must match your account email"
            )
        
        # Check for retention override (admin only)
        retention_override = (
            request_data.additional_info and 
            request_data.additional_info.get("retention_override", False) and
            current_user.unified_role in ["platform_admin", "shop_manager"]
        )
        
        deletion_request = await data_protection.process_data_deletion_request(
            user_id=str(current_user.id),
            retention_override=retention_override
        )
        
        return {
            "status": "success",
            "request_id": deletion_request.request_id,
            "request_type": deletion_request.request_type,
            "processing_status": deletion_request.processing_status,
            "request_date": deletion_request.request_date.isoformat(),
            "completion_date": deletion_request.completion_date.isoformat() if deletion_request.completion_date else None,
            "deletion_summary": deletion_request.response_data if deletion_request.processing_status == "completed" else None,
            "rejection_reason": deletion_request.rejection_reason,
            "message": "Data deletion request processed"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process data deletion request: {str(e)}"
        )


@router.post("/privacy/data-export")
@payment_error_handler()
async def request_data_portability(
    request_data: DataSubjectRightsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Process data portability request under GDPR Article 20.
    
    Provides structured, machine-readable export of user data.
    """
    try:
        data_protection = get_data_protection_service(db)
        
        portability_request = await data_protection.process_data_portability_request(
            user_id=str(current_user.id)
        )
        
        return {
            "status": "success",
            "request_id": portability_request.request_id,
            "request_type": portability_request.request_type,
            "processing_status": portability_request.processing_status,
            "request_date": portability_request.request_date.isoformat(),
            "completion_date": portability_request.completion_date.isoformat() if portability_request.completion_date else None,
            "portable_data": portability_request.response_data if portability_request.processing_status == "completed" else None,
            "rejection_reason": portability_request.rejection_reason,
            "message": "Data portability request processed successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process data portability request: {str(e)}"
        )


@router.get("/privacy/dashboard")
@payment_error_handler()
async def get_privacy_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get user privacy dashboard data.
    
    Shows consent status, data usage, and available privacy actions.
    """
    try:
        data_protection = get_data_protection_service(db)
        
        dashboard_data = data_protection.get_privacy_dashboard_data(str(current_user.id))
        
        return {
            "status": "success",
            "data": dashboard_data,
            "message": "Privacy dashboard data retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve privacy dashboard: {str(e)}"
        )


@router.get("/privacy/notice")
async def get_privacy_notice(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive privacy notice for users.
    
    Public endpoint providing privacy policy and data processing information.
    """
    try:
        data_protection = get_data_protection_service(db)
        
        privacy_notice = data_protection.generate_privacy_notice()
        
        return {
            "status": "success",
            "privacy_notice": privacy_notice,
            "generated_at": datetime.utcnow().isoformat(),
            "message": "Privacy notice retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve privacy notice: {str(e)}"
        )


# Security and Audit Endpoints
@router.get("/security/events")
@admin_required
async def get_security_events(
    days_back: int = 30,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get security events for monitoring and audit.
    
    Admin-only endpoint for security monitoring.
    """
    try:
        # Filter security events
        filtered_events = []
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        for event in pci_compliance_service.security_events:
            if event.timestamp < cutoff_date:
                continue
                
            if severity and event.severity != severity:
                continue
                
            if event_type and event.event_type != event_type:
                continue
                
            filtered_events.append({
                "event_id": event.event_id,
                "event_type": event.event_type,
                "severity": event.severity,
                "timestamp": event.timestamp.isoformat(),
                "user_id": event.user_id,
                "ip_address": event.ip_address,
                "details": event.details,
                "investigated": event.investigated,
                "resolution": event.resolution
            })
        
        return {
            "status": "success",
            "events": filtered_events,
            "total_events": len(filtered_events),
            "filters_applied": {
                "days_back": days_back,
                "severity": severity,
                "event_type": event_type
            },
            "message": "Security events retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve security events: {str(e)}"
        )


@router.get("/health")
@financial_endpoint_security
async def get_compliance_health(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ComplianceHealthResponse:
    """
    Get comprehensive compliance health status.
    
    Provides overview of PCI DSS, GDPR, and security compliance.
    """
    try:
        # Get PCI compliance status
        pci_assessment = pci_compliance_service.run_compliance_assessment()
        
        # Get data protection status
        data_protection = get_data_protection_service(db)
        retention_cleanup = await data_protection.run_data_retention_cleanup()
        
        # Get security events summary
        recent_events = [
            e for e in pci_compliance_service.security_events
            if e.timestamp > datetime.utcnow() - timedelta(days=7)
        ]
        
        overall_status = "healthy"
        if pci_assessment["certification_status"] == "non_compliant":
            overall_status = "critical"
        elif len([e for e in recent_events if e.severity in ["high", "critical"]]) > 0:
            overall_status = "warning"
        
        recommendations = []
        recommendations.extend(pci_assessment["recommendations"])
        
        if retention_cleanup["records_identified"] > retention_cleanup["records_deleted"]:
            recommendations.append("Review data retention cleanup - pending deletions identified")
        
        return ComplianceHealthResponse(
            status=overall_status,
            pci_compliance={
                "compliance_percentage": pci_assessment["overall_status"]["compliance_percentage"],
                "certification_status": pci_assessment["certification_status"],
                "critical_gaps": len(pci_assessment["critical_gaps"])
            },
            data_protection={
                "retention_cleanup_status": "active",
                "records_processed": retention_cleanup["records_deleted"],
                "policies_active": len(data_protection.retention_policies)
            },
            security_events={
                "last_7_days": len(recent_events),
                "high_severity": len([e for e in recent_events if e.severity in ["high", "critical"]]),
                "unresolved": len([e for e in recent_events if not e.investigated])
            },
            recommendations=recommendations[:5],  # Top 5 recommendations
            last_assessment=pci_assessment["assessment_date"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve compliance health: {str(e)}"
        )