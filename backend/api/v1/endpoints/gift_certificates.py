"""Gift Certificate API endpoints."""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, validator

from config.database import get_db
from models.user import User
from models.gift_certificate import GiftCertificate, GiftCertificateStatus
from services.gift_certificate_service import GiftCertificateService
from api.v1.auth import get_current_user
from utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/gift-certificates", tags=["gift-certificates"])


# Pydantic models for request/response
class GiftCertificatePurchaseRequest(BaseModel):
    """Request model for purchasing a gift certificate."""

    recipient_name: str = Field(..., min_length=1, max_length=200)
    recipient_email: EmailStr
    amount: float = Field(..., gt=0, description="Amount in dollars")
    payment_method_id: str = Field(..., description="Stripe payment method ID")
    message: Optional[str] = Field(None, max_length=1000)
    sender_name: Optional[str] = Field(None, min_length=1, max_length=200)
    sender_email: Optional[EmailStr] = None

    @validator("amount")
    def validate_amount(cls, v):
        # Convert to cents and ensure it's a valid amount
        cents = int(v * 100)
        if cents < 500:  # Minimum $5
            raise ValueError("Minimum gift certificate amount is $5.00")
        if cents > 100000:  # Maximum $1000
            raise ValueError("Maximum gift certificate amount is $1000.00")
        return v


class GiftCertificateValidateRequest(BaseModel):
    """Request model for validating a gift certificate."""

    code: str = Field(..., min_length=1)
    amount_to_use: Optional[float] = Field(
        None, gt=0, description="Amount to use in dollars"
    )


class GiftCertificateRedeemRequest(BaseModel):
    """Request model for redeeming a gift certificate."""

    code: str = Field(..., min_length=1)
    appointment_id: int = Field(..., gt=0)
    amount_to_use: float = Field(..., gt=0, description="Amount to use in dollars")


class GiftCertificateResponse(BaseModel):
    """Response model for gift certificate."""

    id: int
    code: str
    original_amount: float
    remaining_balance: float
    currency: str
    sender_name: str
    sender_email: str
    recipient_name: str
    recipient_email: str
    message: Optional[str]
    status: GiftCertificateStatus
    is_active: bool
    created_at: datetime
    expiry_date: datetime
    used_date: Optional[datetime]

    class Config:
        orm_mode = True

    @validator("original_amount", "remaining_balance", pre=False)
    def convert_cents_to_dollars(cls, v):
        if isinstance(v, int):
            return float(v) / 100
        return v


class GiftCertificateValidationResponse(BaseModel):
    """Response model for gift certificate validation."""

    valid: bool
    error: Optional[str] = None
    gift_certificate_id: Optional[int] = None
    code: Optional[str] = None
    original_amount: Optional[float] = None
    remaining_balance: Optional[float] = None
    expiry_date: Optional[datetime] = None
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None

    @validator("original_amount", "remaining_balance", pre=False)
    def convert_cents_to_dollars(cls, v):
        if isinstance(v, int):
            return float(v) / 100
        return v


class GiftCertificateRedemptionResponse(BaseModel):
    """Response model for gift certificate redemption."""

    id: int
    gift_certificate_id: int
    appointment_id: int
    amount_used: float
    balance_before: float
    balance_after: float
    created_at: datetime

    class Config:
        orm_mode = True

    @validator("amount_used", "balance_before", "balance_after", pre=False)
    def convert_cents_to_dollars(cls, v):
        if isinstance(v, int):
            return float(v) / 100
        return v


@router.post("/purchase", response_model=GiftCertificateResponse)
async def purchase_gift_certificate(
    request: GiftCertificatePurchaseRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Purchase a gift certificate with Stripe payment.

    - **recipient_name**: Name of the gift certificate recipient
    - **recipient_email**: Email of the recipient
    - **amount**: Amount in dollars (minimum $5, maximum $1000)
    - **payment_method_id**: Stripe payment method ID
    - **message**: Optional personal message
    - **sender_name**: Optional sender name (uses current user's name if not provided)
    - **sender_email**: Optional sender email (uses current user's email if not provided)
    """
    try:
        service = GiftCertificateService(db)

        # Convert amount to cents
        amount_cents = int(request.amount * 100)

        # Use current user's info if sender info not provided
        sender_name = request.sender_name or (
            current_user.full_name if current_user else "Anonymous"
        )
        sender_email = request.sender_email or (
            current_user.email if current_user else "noreply@6fbplatform.com"
        )

        # Purchase gift certificate
        gift_certificate, payment = await service.purchase_gift_certificate(
            sender_name=sender_name,
            sender_email=sender_email,
            recipient_name=request.recipient_name,
            recipient_email=request.recipient_email,
            amount=amount_cents,
            payment_method_id=request.payment_method_id,
            message=request.message,
            sender_user=current_user,
        )

        return gift_certificate

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error purchasing gift certificate: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to purchase gift certificate"
        )


@router.post("/validate", response_model=GiftCertificateValidationResponse)
async def validate_gift_certificate(
    request: GiftCertificateValidateRequest, db: Session = Depends(get_db)
):
    """
    Validate a gift certificate code.

    - **code**: Gift certificate code to validate
    - **amount_to_use**: Optional amount to check if available (in dollars)
    """
    try:
        service = GiftCertificateService(db)

        # Convert amount to cents if provided
        amount_cents = None
        if request.amount_to_use:
            amount_cents = int(request.amount_to_use * 100)

        # Validate gift certificate
        result = await service.validate_gift_certificate(
            code=request.code, amount_to_use=amount_cents
        )

        return GiftCertificateValidationResponse(**result)

    except Exception as e:
        logger.error(f"Error validating gift certificate: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to validate gift certificate"
        )


@router.get("/validate/{code}", response_model=GiftCertificateValidationResponse)
async def validate_gift_certificate_by_code(
    code: str,
    amount_to_use: Optional[float] = Query(
        None, gt=0, description="Amount to use in dollars"
    ),
    db: Session = Depends(get_db),
):
    """
    Validate a gift certificate by code (GET method for easy integration).

    - **code**: Gift certificate code to validate
    - **amount_to_use**: Optional amount to check if available (in dollars)
    """
    try:
        service = GiftCertificateService(db)

        # Convert amount to cents if provided
        amount_cents = None
        if amount_to_use:
            amount_cents = int(amount_to_use * 100)

        # Validate gift certificate
        result = await service.validate_gift_certificate(
            code=code, amount_to_use=amount_cents
        )

        return GiftCertificateValidationResponse(**result)

    except Exception as e:
        logger.error(f"Error validating gift certificate: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to validate gift certificate"
        )


@router.post("/redeem", response_model=GiftCertificateRedemptionResponse)
async def redeem_gift_certificate(
    request: GiftCertificateRedeemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Redeem a gift certificate for a booking.

    - **code**: Gift certificate code to redeem
    - **appointment_id**: ID of the appointment to apply the gift certificate to
    - **amount_to_use**: Amount to use from the gift certificate (in dollars)
    """
    try:
        service = GiftCertificateService(db)

        # Convert amount to cents
        amount_cents = int(request.amount_to_use * 100)

        # Redeem gift certificate
        redemption = await service.redeem_gift_certificate(
            code=request.code,
            appointment_id=request.appointment_id,
            amount_to_use=amount_cents,
            user=current_user,
        )

        return redemption

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error redeeming gift certificate: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to redeem gift certificate")


@router.get("/my-certificates", response_model=List[GiftCertificateResponse])
async def get_my_gift_certificates(
    include_sent: bool = Query(True, description="Include gift certificates I've sent"),
    include_received: bool = Query(
        True, description="Include gift certificates I've received"
    ),
    active_only: bool = Query(False, description="Only show active gift certificates"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all gift certificates for the current user.

    - **include_sent**: Include gift certificates sent by the user
    - **include_received**: Include gift certificates received by the user
    - **active_only**: Only show active (usable) gift certificates
    """
    try:
        service = GiftCertificateService(db)

        # Get user's gift certificates
        certificates = await service.get_user_gift_certificates(
            user=current_user,
            include_sent=include_sent,
            include_received=include_received,
            active_only=active_only,
        )

        return certificates

    except Exception as e:
        logger.error(f"Error getting user gift certificates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get gift certificates")


# Admin endpoints
@router.get("/admin/all", response_model=List[GiftCertificateResponse])
async def get_all_gift_certificates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[GiftCertificateStatus] = Query(None),
    admin_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all gift certificates (admin only).

    - **skip**: Number of records to skip
    - **limit**: Maximum number of records to return
    - **status**: Filter by status
    """
    try:
        query = db.query(GiftCertificate)

        if status:
            query = query.filter(GiftCertificate.status == status)

        certificates = query.offset(skip).limit(limit).all()
        return certificates

    except Exception as e:
        logger.error(f"Error getting all gift certificates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get gift certificates")


@router.post("/admin/{gift_certificate_id}/cancel")
async def cancel_gift_certificate(
    gift_certificate_id: int,
    reason: str = Body(..., embed=True),
    admin_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a gift certificate (admin only).

    - **gift_certificate_id**: ID of the gift certificate to cancel
    - **reason**: Reason for cancellation
    """
    try:
        service = GiftCertificateService(db)

        # Cancel gift certificate
        gift_certificate = await service.cancel_gift_certificate(
            gift_certificate_id=gift_certificate_id,
            admin_user=admin_user,
            reason=reason,
        )

        return {
            "message": "Gift certificate cancelled successfully",
            "code": gift_certificate.code,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling gift certificate: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel gift certificate")


@router.get("/admin/statistics")
async def get_gift_certificate_statistics(
    admin_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get gift certificate statistics (admin only).
    """
    try:
        # Get total counts by status
        total_active = (
            db.query(GiftCertificate)
            .filter(GiftCertificate.status == GiftCertificateStatus.ACTIVE)
            .count()
        )

        total_partially_used = (
            db.query(GiftCertificate)
            .filter(GiftCertificate.status == GiftCertificateStatus.PARTIALLY_USED)
            .count()
        )

        total_fully_used = (
            db.query(GiftCertificate)
            .filter(GiftCertificate.status == GiftCertificateStatus.FULLY_USED)
            .count()
        )

        total_expired = (
            db.query(GiftCertificate)
            .filter(GiftCertificate.status == GiftCertificateStatus.EXPIRED)
            .count()
        )

        total_cancelled = (
            db.query(GiftCertificate)
            .filter(GiftCertificate.status == GiftCertificateStatus.CANCELLED)
            .count()
        )

        # Get total amounts
        all_certificates = db.query(GiftCertificate).all()
        total_value_issued = (
            sum(cert.original_amount for cert in all_certificates) / 100
        )
        total_value_remaining = (
            sum(cert.remaining_balance for cert in all_certificates) / 100
        )
        total_value_used = total_value_issued - total_value_remaining

        return {
            "counts": {
                "active": total_active,
                "partially_used": total_partially_used,
                "fully_used": total_fully_used,
                "expired": total_expired,
                "cancelled": total_cancelled,
                "total": len(all_certificates),
            },
            "values": {
                "total_issued": total_value_issued,
                "total_used": total_value_used,
                "total_remaining": total_value_remaining,
            },
        }

    except Exception as e:
        logger.error(f"Error getting gift certificate statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")
