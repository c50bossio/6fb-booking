from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict
from database import get_db
from services.payment_service import PaymentService
from schemas import PaymentIntentCreate, PaymentIntentResponse, PaymentConfirm
from dependencies import get_current_user
from models import User

router = APIRouter(
    prefix="/payments",
    tags=["payments"]
)

@router.post("/create-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
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
            db=db
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
def confirm_payment(
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
        
        return {
            "message": "Payment confirmed successfully",
            "booking_id": result["appointment_id"],
            "payment_id": result["payment_id"]
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