"""
Payout processing endpoints for batch commission payouts.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from database import get_db
from dependencies import get_current_user
from models import User
from services.payment_service import PaymentService
from services.commission_service import CommissionService
from utils.rate_limit import payout_rate_limit
from utils.idempotency import idempotent_operation, get_current_user_id
from utils.logging_config import get_audit_logger
from pydantic import BaseModel

router = APIRouter(
    prefix="/payouts",
    tags=["payouts"]
)

financial_audit_logger = get_audit_logger()


class BatchPayoutRequest(BaseModel):
    barber_ids: List[int]
    include_retail: bool = True
    period_start: str
    period_end: str
    notes: str = ""


class BatchPayoutResponse(BaseModel):
    processed_count: int
    failed_count: int
    total_amount: float
    processed_payouts: List[Dict[str, Any]]
    failed_payouts: List[Dict[str, Any]]
    batch_id: str


@router.post("/process", response_model=BatchPayoutResponse)
@payout_rate_limit
@idempotent_operation(
    operation_type="batch_payout",
    ttl_hours=72,  # Longer TTL for payouts
    extract_user_id=get_current_user_id
)
def process_batch_payouts(
    request: Request,
    batch_request: BatchPayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process multiple payouts in batch.
    Admin only endpoint for processing multiple barber payouts at once.
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to process batch payouts"
        )
    
    if not batch_request.barber_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No barber IDs provided for batch processing"
        )
    
    try:
        start_date = datetime.fromisoformat(batch_request.period_start)
        end_date = datetime.fromisoformat(batch_request.period_end)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use ISO format (YYYY-MM-DD)"
        )
    
    processed_payouts = []
    failed_payouts = []
    total_amount = 0.0
    batch_id = f"batch_{int(datetime.utcnow().timestamp())}"
    
    # Log batch processing start
    financial_audit_logger.log_admin_event(
        event_type="batch_payout_started",
        admin_user_id=str(current_user.id),
        target_user_id="multiple",
        action="process_batch_payouts",
        details={
            "batch_id": batch_id,
            "barber_count": len(batch_request.barber_ids),
            "barber_ids": batch_request.barber_ids,
            "include_retail": batch_request.include_retail,
            "period_start": batch_request.period_start,
            "period_end": batch_request.period_end,
            "notes": batch_request.notes,
            "initiated_by_role": current_user.role
        }
    )
    
    try:
        for barber_id in batch_request.barber_ids:
            try:
                # Validate barber exists
                barber = db.query(User).filter(
                    User.id == barber_id, 
                    User.role == "barber"
                ).first()
                
                if not barber:
                    failed_payouts.append({
                        "barber_id": barber_id,
                        "error": "Barber not found",
                        "barber_name": f"ID {barber_id}"
                    })
                    continue
                
                # Process individual payout
                payout_result = PaymentService.process_barber_payout(
                    barber_id=barber_id,
                    start_date=start_date,
                    end_date=end_date,
                    db=db,
                    include_retail=batch_request.include_retail
                )
                
                processed_payouts.append({
                    "barber_id": barber_id,
                    "barber_name": barber.name,
                    "payout_id": payout_result["payout_id"],
                    "amount": payout_result["amount"],
                    "service_amount": payout_result.get("service_amount", 0),
                    "retail_amount": payout_result.get("retail_amount", 0),
                    "stripe_transfer_id": payout_result.get("stripe_transfer_id"),
                    "payment_count": payout_result.get("payment_count", 0)
                })
                
                total_amount += payout_result["amount"]
                
                # Log individual payout success
                financial_audit_logger.log_payout_processing(
                    user_id=str(barber_id),
                    payout_id=str(payout_result["payout_id"]),
                    amount=float(payout_result["amount"]),
                    currency="USD",
                    payment_method="stripe_transfer",
                    status="completed",
                    processing_fee=0.0,
                    success=True,
                    details={
                        "batch_id": batch_id,
                        "batch_processing": True,
                        "initiated_by_admin": current_user.id,
                        "include_retail": batch_request.include_retail,
                        "stripe_transfer_id": payout_result.get("stripe_transfer_id", ""),
                        "period_start": batch_request.period_start,
                        "period_end": batch_request.period_end,
                        "barber_name": barber.name
                    }
                )
                
            except Exception as e:
                error_message = str(e)
                failed_payouts.append({
                    "barber_id": barber_id,
                    "error": error_message,
                    "barber_name": barber.name if 'barber' in locals() else f"ID {barber_id}"
                })
                
                # Log individual payout failure
                financial_audit_logger.log_payout_processing(
                    user_id=str(barber_id),
                    payout_id="failed",
                    amount=0.0,
                    currency="USD",
                    payment_method="stripe_transfer",
                    status="failed",
                    processing_fee=0.0,
                    success=False,
                    details={
                        "batch_id": batch_id,
                        "batch_processing": True,
                        "initiated_by_admin": current_user.id,
                        "error": error_message,
                        "barber_name": barber.name if 'barber' in locals() else f"ID {barber_id}"
                    }
                )
                
                continue
        
        # Log batch processing completion
        financial_audit_logger.log_admin_event(
            event_type="batch_payout_completed",
            admin_user_id=str(current_user.id),
            target_user_id="multiple",
            action="process_batch_payouts",
            details={
                "batch_id": batch_id,
                "processed_count": len(processed_payouts),
                "failed_count": len(failed_payouts),
                "total_amount": total_amount,
                "total_barbers": len(batch_request.barber_ids),
                "success_rate": len(processed_payouts) / len(batch_request.barber_ids) if batch_request.barber_ids else 0,
                "include_retail": batch_request.include_retail,
                "notes": batch_request.notes
            }
        )
        
        return BatchPayoutResponse(
            processed_count=len(processed_payouts),
            failed_count=len(failed_payouts),
            total_amount=total_amount,
            processed_payouts=processed_payouts,
            failed_payouts=failed_payouts,
            batch_id=batch_id
        )
        
    except Exception as e:
        # Log batch processing failure
        financial_audit_logger.log_admin_event(
            event_type="batch_payout_failed",
            admin_user_id=str(current_user.id),
            target_user_id="multiple",
            action="process_batch_payouts",
            details={
                "batch_id": batch_id,
                "error": str(e),
                "barber_ids": batch_request.barber_ids,
                "partial_success_count": len(processed_payouts)
            }
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch payout processing failed: {str(e)}"
        )


@router.get("/", response_model=List[Dict[str, Any]])
@payout_rate_limit
def get_payout_history(
    request: Request,
    barber_id: int = None,
    start_date: datetime = None,
    end_date: datetime = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payout history with optional filters.
    Barbers can see their own payouts, admins can see all payouts.
    """
    # Permission check
    if current_user.role == "barber":
        barber_id = current_user.id
    elif current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view payout history"
        )
    
    try:
        from models import Payout
        
        # Build query
        query = db.query(Payout)
        
        if barber_id:
            query = query.filter(Payout.barber_id == barber_id)
        
        if start_date:
            query = query.filter(Payout.period_start >= start_date)
        
        if end_date:
            query = query.filter(Payout.period_end <= end_date)
        
        payouts = query.order_by(Payout.processed_at.desc()).all()
        
        # Format response
        payout_history = []
        for payout in payouts:
            barber = db.query(User).filter(User.id == payout.barber_id).first()
            
            payout_history.append({
                "id": payout.id,
                "barber_id": payout.barber_id,
                "barber_name": barber.name if barber else f"ID {payout.barber_id}",
                "amount": float(payout.amount),
                "service_amount": float(getattr(payout, 'service_amount', 0)),
                "retail_amount": float(getattr(payout, 'retail_amount', 0)),
                "status": payout.status,
                "period_start": payout.period_start.isoformat() if payout.period_start else None,
                "period_end": payout.period_end.isoformat() if payout.period_end else None,
                "processed_at": payout.processed_at.isoformat() if payout.processed_at else None,
                "stripe_transfer_id": payout.stripe_transfer_id,
                "payment_count": payout.payment_count
            })
        
        return payout_history
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching payout history: {str(e)}"
        )