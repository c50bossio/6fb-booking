from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime
from database import get_db
from services.payment_service import PaymentService
from utils.rate_limit import payment_intent_rate_limit, payment_confirm_rate_limit, refund_rate_limit, payout_rate_limit
from utils.idempotency import idempotent_operation, get_current_user_id
from schemas import (
    PaymentIntentCreate, PaymentIntentResponse, PaymentConfirm, PaymentResponse,
    RefundCreate, RefundResponse, GiftCertificateCreate, GiftCertificateResponse,
    GiftCertificateValidate, PaymentHistoryResponse, PaymentReportRequest,
    PaymentReportResponse, PayoutCreate, PayoutResponse, StripeConnectOnboardingResponse,
    StripeConnectStatusResponse
)
from dependencies import get_current_user
from models import User
from utils.logging_config import get_audit_logger

router = APIRouter(
    prefix="/payments",
    tags=["payments"]
)

financial_audit_logger = get_audit_logger()

@router.post("/create-intent", response_model=PaymentIntentResponse)
@payment_intent_rate_limit
@idempotent_operation(
    operation_type="payment_intent",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
def create_payment_intent(
    request: Request,
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a payment intent for a booking"""
    try:
        # Get the appointment to determine the amount
        from models import Appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == payment_data.booking_id,
            Appointment.user_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        if appointment.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is not in pending status"
            )
        
        # Create payment intent
        result = PaymentService.create_payment_intent(
            amount=appointment.price,
            booking_id=payment_data.booking_id,
            db=db,
            gift_certificate_code=payment_data.gift_certificate_code,
            user_id=current_user.id
        )
        
        # Log payment API operation
        financial_audit_logger.log_payment_event(
            event_type="payment_intent_created",
            user_id=str(current_user.id),
            amount=float(appointment.price),
            payment_id=str(result.get("payment_id", "")),
            success=True,
            details={
                "booking_id": payment_data.booking_id,
                "appointment_id": appointment.id,
                "barber_id": appointment.barber_id,
                "gift_certificate_code": payment_data.gift_certificate_code,
                "client_secret": result.get("client_secret", "")[:20] + "..." if result.get("client_secret") else None,
                "payment_intent_id": result.get("payment_intent_id", ""),
                "final_amount": result.get("amount", 0),
                "gift_certificate_used": result.get("gift_certificate_used", 0)
            }
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing error: {str(e)}"
        )

@router.post("/confirm")
@payment_confirm_rate_limit
@idempotent_operation(
    operation_type="payment_confirm",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
def confirm_payment(
    request: Request,
    payment_data: PaymentConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """Confirm payment and finalize booking"""
    try:
        # Verify the booking belongs to the current user
        from models import Appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == payment_data.booking_id,
            Appointment.user_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        # Confirm the payment
        result = PaymentService.confirm_payment(
            payment_intent_id=payment_data.payment_intent_id,
            booking_id=payment_data.booking_id,
            db=db
        )
        
        # Log payment confirmation
        financial_audit_logger.log_payment_event(
            event_type="payment_confirmed",
            user_id=str(current_user.id),
            amount=float(result["amount_charged"]),
            payment_id=str(result["payment_id"]),
            success=True,
            details={
                "booking_id": payment_data.booking_id,
                "appointment_id": result["appointment_id"],
                "payment_intent_id": payment_data.payment_intent_id,
                "amount_charged": result["amount_charged"],
                "gift_certificate_used": result["gift_certificate_used"]
            }
        )
        
        return {
            "message": "Payment confirmed successfully",
            "booking_id": result["appointment_id"],
            "payment_id": result["payment_id"],
            "amount_charged": result["amount_charged"],
            "gift_certificate_used": result["gift_certificate_used"]
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment confirmation error: {str(e)}"
        )

@router.post("/refund", response_model=RefundResponse)
@refund_rate_limit
@idempotent_operation(
    operation_type="payment_refund",
    ttl_hours=48,  # Longer TTL for refunds
    extract_user_id=get_current_user_id
)
def create_refund(
    request: Request,
    refund_data: RefundCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a refund for a payment (admin/barber only)"""
    if current_user.role not in ["admin", "barber"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to process refunds"
        )
    
    try:
        result = PaymentService.process_refund(
            payment_id=refund_data.payment_id,
            amount=refund_data.amount,
            reason=refund_data.reason,
            initiated_by_id=current_user.id,
            db=db
        )
        
        # Log refund API operation
        financial_audit_logger.log_payment_event(
            event_type="refund_processed",
            user_id=str(current_user.id),
            amount=float(refund_data.amount),
            payment_id=str(refund_data.payment_id),
            success=True,
            details={
                "refund_id": result["refund_id"],
                "refund_amount": result["amount"],
                "refund_reason": refund_data.reason,
                "stripe_refund_id": result.get("stripe_refund_id", ""),
                "initiated_by_role": current_user.role
            }
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refund processing error: {str(e)}"
        )

@router.post("/gift-certificates", response_model=GiftCertificateResponse)
@idempotent_operation(
    operation_type="gift_certificate_create",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
def create_gift_certificate(
    request: Request,
    gift_cert_data: GiftCertificateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new gift certificate"""
    try:
        result = PaymentService.create_gift_certificate(
            amount=gift_cert_data.amount,
            purchaser_name=gift_cert_data.purchaser_name,
            purchaser_email=gift_cert_data.purchaser_email,
            recipient_name=gift_cert_data.recipient_name,
            recipient_email=gift_cert_data.recipient_email,
            message=gift_cert_data.message,
            validity_months=gift_cert_data.validity_months,
            created_by_id=current_user.id,
            db=db
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gift certificate creation error: {str(e)}"
        )

@router.post("/gift-certificates/validate")
def validate_gift_certificate(
    validation_data: GiftCertificateValidate,
    db: Session = Depends(get_db)
):
    """Validate a gift certificate code"""
    try:
        gift_cert = PaymentService.validate_gift_certificate(validation_data.code, db)
        
        if not gift_cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired gift certificate code"
            )
        
        return {
            "valid": True,
            "balance": gift_cert.balance,
            "amount": gift_cert.amount,
            "valid_until": gift_cert.valid_until.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gift certificate validation error: {str(e)}"
        )

@router.get("/history", response_model=PaymentHistoryResponse)
def get_payment_history(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    barber_id: Optional[int] = Query(None, description="Filter by barber ID"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    status: Optional[str] = Query(None, description="Payment status filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history with filtering and pagination"""
    # Non-admin users can only view their own payments or their barber's payments
    if current_user.role == "user":
        user_id = current_user.id
        barber_id = None
    elif current_user.role == "barber" and not user_id:
        barber_id = current_user.id
    elif current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view payment history"
        )
    
    try:
        result = PaymentService.get_payment_history(
            user_id=user_id,
            barber_id=barber_id,
            start_date=start_date,
            end_date=end_date,
            status=status,
            page=page,
            page_size=page_size,
            db=db
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving payment history: {str(e)}"
        )

@router.post("/reports", response_model=PaymentReportResponse)
def generate_payment_report(
    report_request: PaymentReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate comprehensive payment reports (admin/barber only)"""
    if current_user.role not in ["admin", "barber", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate reports"
        )
    
    # Barbers can only generate reports for themselves
    if current_user.role == "barber":
        report_request.barber_id = current_user.id
    
    try:
        result = PaymentService.get_payment_reports(
            start_date=report_request.start_date,
            end_date=report_request.end_date,
            barber_id=report_request.barber_id,
            db=db
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating payment report: {str(e)}"
        )

@router.post("/payouts", response_model=PayoutResponse)
@payout_rate_limit
@idempotent_operation(
    operation_type="barber_payout",
    ttl_hours=72,  # Longer TTL for payouts
    extract_user_id=get_current_user_id
)
def process_payout(
    request: Request,
    payout_data: PayoutCreate,
    include_retail: bool = Query(False, description="Include retail commissions in payout"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process payout for a barber with optional retail commissions (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to process payouts"
        )
    
    try:
        # Use unified payout method that handles both service and retail payouts
        result = PaymentService.process_barber_payout(
            barber_id=payout_data.barber_id,
            start_date=payout_data.start_date,
            end_date=payout_data.end_date,
            db=db,
            include_retail=include_retail
        )
        
        # Log payout API operation
        financial_audit_logger.log_admin_event(
            event_type="payout_processed_api",
            admin_user_id=str(current_user.id),
            target_user_id=str(payout_data.barber_id),
            action="process_payout",
            details={
                "payout_id": result["payout_id"],
                "amount": result["amount"],
                "payment_count": result["payment_count"],
                "stripe_transfer_id": result.get("stripe_transfer_id", ""),
                "period_start": payout_data.start_date.isoformat(),
                "period_end": payout_data.end_date.isoformat(),
                "include_retail": include_retail,
                "service_amount": result.get("service_amount", 0),
                "retail_amount": result.get("retail_amount", 0),
                "initiated_by_role": current_user.role
            }
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payout processing error: {str(e)}"
        )

@router.post("/payouts/enhanced")
@payout_rate_limit
@idempotent_operation(
    operation_type="enhanced_payout",
    ttl_hours=72,  # Longer TTL for payouts
    extract_user_id=get_current_user_id
)
def process_enhanced_payout(
    request: Request,
    payout_data: PayoutCreate,
    include_retail: bool = Query(True, description="Include retail commissions in payout"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process enhanced payout for a barber including retail commissions (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to process payouts"
        )
    
    try:
        # Use unified payout method with retail enabled by default
        result = PaymentService.process_barber_payout(
            barber_id=payout_data.barber_id,
            start_date=payout_data.start_date,
            end_date=payout_data.end_date,
            db=db,
            include_retail=include_retail
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced payout processing error: {str(e)}"
        )

@router.get("/gift-certificates", response_model=List[GiftCertificateResponse])
def list_gift_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List gift certificates (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to list gift certificates"
        )
    
    try:
        from models import GiftCertificate
        gift_certs = db.query(GiftCertificate).order_by(GiftCertificate.created_at.desc()).all()
        return gift_certs
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving gift certificates: {str(e)}"
        )

@router.post("/stripe-connect/onboard", response_model=StripeConnectOnboardingResponse)
def create_stripe_connect_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe Connect account for barber onboarding"""
    if current_user.role != "barber":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can create Stripe Connect accounts"
        )
    
    try:
        result = PaymentService.create_stripe_connect_account(current_user, db)
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating Stripe Connect account: {str(e)}"
        )

@router.get("/stripe-connect/status", response_model=StripeConnectStatusResponse)
def get_stripe_connect_status(
    current_user: User = Depends(get_current_user)
):
    """Get Stripe Connect account status for current user"""
    try:
        result = PaymentService.get_stripe_connect_status(current_user)
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving Stripe Connect status: {str(e)}"
        )