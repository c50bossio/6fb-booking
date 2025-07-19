from decimal import Decimal
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Path
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime
from database import get_db
from services.payment_service import PaymentService
from utils.rate_limit import payment_intent_rate_limit, payment_confirm_rate_limit, refund_rate_limit, payout_rate_limit
from utils.financial_rate_limit import (
    gift_certificate_create_limit, gift_certificate_validate_limit,
    stripe_connect_limit, payment_history_limit, payment_report_limit,
    financial_rate_limit, financial_endpoint_security
)
from utils.input_validation import validate_decimal, ValidationError as InputValidationError
from schemas_new.validation import PaymentIntentRequest

logger = logging.getLogger(__name__)
from utils.idempotency import idempotent_operation, get_current_user_id
from schemas import (
    PaymentIntentCreate, PaymentIntentResponse, PaymentConfirm, PaymentResponse,
    RefundCreate, RefundResponse, GiftCertificateCreate, GiftCertificateResponse,
    GiftCertificateValidate, PaymentHistoryResponse, PaymentReportRequest,
    PaymentReportResponse, PayoutCreate, PayoutResponse, StripeConnectOnboardingResponse,
    StripeConnectStatusResponse
)
from dependencies import get_current_user
from models import User, Payment, Payout
from utils.logging_config import get_audit_logger
from services.cache_invalidation import cache_invalidator

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
        
        # Get idempotency key from request header
        idempotency_key = request.headers.get("Idempotency-Key")
        
        # Create payment intent
        result = PaymentService.create_payment_intent(
            amount=appointment.price,
            booking_id=payment_data.booking_id,
            db=db,
            gift_certificate_code=payment_data.gift_certificate_code,
            user_id=current_user.id,
            idempotency_key=idempotency_key
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

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
        
        # Get idempotency key from request header
        idempotency_key = request.headers.get("Idempotency-Key")
        
        # Confirm the payment
        result = PaymentService.confirm_payment(
            payment_intent_id=payment_data.payment_intent_id,
            booking_id=payment_data.booking_id,
            db=db,
            idempotency_key=idempotency_key
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
        
        # Invalidate cache after successful payment
        cache_invalidator.invalidate_payment_data(
            payment_id=result["payment_id"],
            user_id=current_user.id,
            appointment_id=result["appointment_id"]
        )
        
        return {
            "message": "Payment confirmed successfully",
            "booking_id": result["appointment_id"],
            "payment_id": result["payment_id"],
            "amount_charged": result["amount_charged"],
            "gift_certificate_used": result["gift_certificate_used"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

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
        # Get idempotency key from request header
        idempotency_key = request.headers.get("Idempotency-Key")
        
        result = PaymentService.process_refund(
            payment_id=refund_data.payment_id,
            amount=refund_data.amount,
            reason=refund_data.reason,
            initiated_by_id=current_user.id,
            db=db,
            idempotency_key=idempotency_key
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
        
        # Invalidate cache after successful refund
        cache_invalidator.invalidate_payment_data(
            payment_id=refund_data.payment_id,
            user_id=current_user.id
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

@router.post("/gift-certificates", response_model=GiftCertificateResponse)
@gift_certificate_create_limit
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
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

@router.post("/gift-certificates/validate")
@gift_certificate_validate_limit
def validate_gift_certificate(
    request: Request,
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
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/history", response_model=PaymentHistoryResponse)
@payment_history_limit
def get_payment_history(
    request: Request,
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    barber_id: Optional[int] = Query(None, description="Filter by barber ID"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    payment_status: Optional[str] = Query(None, description="Payment status filter"),
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
            status=payment_status,
            page=page,
            page_size=page_size,
            db=db
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

@router.post("/reports", response_model=PaymentReportResponse)
@payment_report_limit
def generate_payment_report(
    request: Request,
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
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

@router.get("/gift-certificates", response_model=List[GiftCertificateResponse])
@payment_history_limit
def list_gift_certificates(
    request: Request,
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
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

@router.post("/stripe-connect/onboard", response_model=StripeConnectOnboardingResponse)
@stripe_connect_limit
def create_stripe_connect_account(
    request: Request,
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

@router.get("/stripe-connect/status", response_model=StripeConnectStatusResponse)
@payment_history_limit
def get_stripe_connect_status(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Get Stripe Connect account status for current user"""
    try:
        result = PaymentService.get_stripe_connect_status(current_user)
        return result
        
    except Exception as e:
        logger.error(f"Exception in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred")

@router.get("/payouts/summary")
@payment_history_limit
def get_payout_summary(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payout summary showing pending amounts from all sources"""
    # Check authorization - barbers can see their own, admins can see any
    if current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view payout summary"
        )
    
    barber_id = current_user.id if current_user.role == "barber" else None
    
    try:
        # Get service payment summary
        service_payments = db.query(Payment).filter(
            Payment.status == "completed"
        )
        if barber_id:
            service_payments = service_payments.filter(Payment.barber_id == barber_id)
        
        # Get unpaid service payments
        unpaid_service_payments = service_payments.filter(
            ~Payment.id.in_(
                db.query(Payment.id).join(Payout, Payment.created_at.between(
                    Payout.period_start, Payout.period_end
                )).filter(Payout.barber_id == Payment.barber_id)
            )
        ).all()
        
        service_amount = sum(p.barber_amount or 0 for p in unpaid_service_payments)
        
        # Get retail commission summary
        retail_amount = 0
        retail_breakdown = None
        try:
            from services.commission_service import CommissionService
            commission_service = CommissionService(db)
            if barber_id:
                retail_breakdown = commission_service.get_barber_retail_commissions(
                    barber_id, unpaid_only=True
                )
                retail_amount = float(retail_breakdown["total_retail_commission"])
        except ImportError:
            logger.warning("CommissionService not available")
        
        # Get last payout info
        last_payout = None
        if barber_id:
            last_payout_record = db.query(Payout).filter(
                Payout.barber_id == barber_id,
                Payout.status == "completed"
            ).order_by(Payout.processed_at.desc()).first()
            
            if last_payout_record:
                last_payout = {
                    "id": last_payout_record.id,
                    "amount": float(last_payout_record.amount),
                    "date": last_payout_record.processed_at.isoformat(),
                    "payment_count": last_payout_record.payment_count
                }
        
        # Calculate total pending
        total_pending = service_amount + retail_amount
        
        # Get barber info if specific barber
        barber_info = None
        if barber_id:
            barber = db.query(User).filter(User.id == barber_id).first()
            if barber:
                barber_info = {
                    "id": barber.id,
                    "name": barber.name,
                    "email": barber.email,
                    "commission_rate": barber.commission_rate
                }
        
        return {
            "barber": barber_info,
            "pending_amounts": {
                "service_payments": float(service_amount),
                "retail_commissions": float(retail_amount),
                "total": float(total_pending)
            },
            "pending_counts": {
                "service_payments": len(unpaid_service_payments),
                "retail_items": retail_breakdown["order_items_count"] if retail_breakdown else 0,
                "pos_transactions": retail_breakdown["pos_transactions_count"] if retail_breakdown else 0
            },
            "last_payout": last_payout,
            "retail_breakdown": retail_breakdown,
            "can_process_payout": total_pending > 0,
            "minimum_payout_amount": 10.00,  # Could be configurable
            "meets_minimum": total_pending >= 10.00
        }
        
    except Exception as e:
        logger.error(f"Error getting payout summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while calculating payout summary"
        )

@router.get("/payouts/history")
@payment_history_limit
def get_payout_history(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payout history with optional date filtering"""
    # Check authorization
    if current_user.role == "barber":
        barber_id = current_user.id
    elif current_user.role in ["admin", "super_admin"]:
        barber_id = None  # Admins can see all
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view payout history"
        )
    
    try:
        # Build query
        query = db.query(Payout)
        
        if barber_id:
            query = query.filter(Payout.barber_id == barber_id)
        if start_date:
            query = query.filter(Payout.created_at >= start_date)
        if end_date:
            query = query.filter(Payout.created_at <= end_date)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        payouts = query.order_by(Payout.created_at.desc()).offset(offset).limit(page_size).all()
        
        # Format response
        payout_list = []
        for payout in payouts:
            # Get barber info
            barber = db.query(User).filter(User.id == payout.barber_id).first()
            
            # Try to get breakdown if available (for newer payouts)
            service_amount = payout.amount  # Default to total
            retail_amount = 0
            
            # Check if this was an enhanced payout by looking at Stripe metadata
            # (This would require storing metadata in payout record)
            
            payout_list.append({
                "id": payout.id,
                "barber": {
                    "id": barber.id,
                    "name": barber.name,
                    "email": barber.email
                } if barber else None,
                "amount": float(payout.amount),
                "service_amount": float(service_amount),
                "retail_amount": float(retail_amount),
                "status": payout.status,
                "period_start": payout.period_start.isoformat(),
                "period_end": payout.period_end.isoformat(),
                "payment_count": payout.payment_count,
                "stripe_transfer_id": payout.stripe_transfer_id,
                "created_at": payout.created_at.isoformat(),
                "processed_at": payout.processed_at.isoformat() if payout.processed_at else None
            })
        
        return {
            "payouts": payout_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": page * page_size < total,
            "has_previous": page > 1
        }
        
    except Exception as e:
        logger.error(f"Error getting payout history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving payout history"
        )