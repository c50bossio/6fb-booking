"""
Square API endpoints for OAuth, payments, and payouts
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from config.database import get_db
from services.square_service import square_service
from models.square_payment import SquareAccount, SquarePayment, SquarePayout
from models.barber import Barber
from models.user import User
from api.v1.auth import get_current_user
from utils.security import verify_square_webhook


router = APIRouter()


# Pydantic models for request/response
class SquareOAuthInitRequest(BaseModel):
    barber_id: int


class SquareOAuthCallbackRequest(BaseModel):
    code: str
    state: str


class SquarePaymentRequest(BaseModel):
    appointment_id: int
    source_id: str  # Payment nonce from Square Web Payments SDK
    amount: float  # Amount in dollars
    customer_email: Optional[str] = None


class SquareAccountResponse(BaseModel):
    id: int
    barber_id: int
    merchant_name: str
    merchant_email: str
    square_merchant_id: str
    is_active: bool
    is_verified: bool
    can_receive_payments: bool
    can_make_payouts: bool
    connected_at: str

    class Config:
        from_attributes = True


class SquarePaymentResponse(BaseModel):
    id: int
    square_payment_id: str
    amount_money: float
    status: str
    receipt_url: Optional[str]
    appointment_id: int
    created_at: str

    class Config:
        from_attributes = True


class SquarePayoutResponse(BaseModel):
    id: int
    amount_money: float
    status: str
    commission_rate: float
    commission_amount: float
    net_amount: float
    scheduled_at: Optional[str]
    sent_at: Optional[str]
    paid_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.post("/oauth/init", response_model=Dict[str, str])
async def init_square_oauth(
    request: SquareOAuthInitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize Square OAuth flow for a barber"""
    
    # Verify user has permission to connect Square account
    if current_user.role not in ["super_admin", "admin"] and current_user.id != request.barber_id:
        # Check if user is the barber
        barber = db.query(Barber).filter(
            Barber.id == request.barber_id,
            Barber.user_id == current_user.id
        ).first()
        
        if not barber:
            raise HTTPException(status_code=403, detail="Not authorized to connect Square account")
    
    # Generate OAuth URL
    oauth_url = square_service.get_oauth_url(request.barber_id)
    
    return {
        "oauth_url": oauth_url,
        "message": "Redirect user to this URL to complete Square OAuth"
    }


@router.post("/oauth/callback", response_model=SquareAccountResponse)
async def handle_square_oauth_callback(
    request: SquareOAuthCallbackRequest,
    db: Session = Depends(get_db)
):
    """Handle Square OAuth callback"""
    
    try:
        # Extract barber_id from state (you might want to store this securely)
        # For now, this is a simplified implementation
        # In production, you'd store state in a temporary cache with barber_id
        
        # Exchange code for tokens
        tokens = await square_service.exchange_code_for_tokens(
            request.code, 
            request.state
        )
        
        # Get merchant information
        merchant_info = await square_service.get_merchant_info(tokens['access_token'])
        
        # Extract barber_id from state (this is simplified - implement proper state management)
        # For now, we'll expect the client to pass barber_id in the request
        # In a real implementation, you'd store the barber_id with the state
        
        # Create or update Square account
        # Note: This is a simplified version - you'll need to implement proper state handling
        # square_account = await square_service.create_square_account(
        #     db, barber_id, tokens, merchant_info
        # )
        
        return {
            "message": "OAuth callback received. Implementation needs proper state management.",
            "tokens_received": bool(tokens),
            "merchant_info_received": bool(merchant_info)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth callback failed: {str(e)}")


@router.get("/account/{barber_id}", response_model=SquareAccountResponse)
async def get_square_account(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Square account information for a barber"""
    
    # Verify user has permission to view Square account
    if current_user.role not in ["super_admin", "admin"]:
        barber = db.query(Barber).filter(
            Barber.id == barber_id,
            Barber.user_id == current_user.id
        ).first()
        
        if not barber:
            raise HTTPException(status_code=403, detail="Not authorized to view Square account")
    
    # Get Square account
    square_account = db.query(SquareAccount).filter(
        SquareAccount.barber_id == barber_id
    ).first()
    
    if not square_account:
        raise HTTPException(status_code=404, detail="Square account not found")
    
    return SquareAccountResponse(
        id=square_account.id,
        barber_id=square_account.barber_id,
        merchant_name=square_account.merchant_name or "",
        merchant_email=square_account.merchant_email or "",
        square_merchant_id=square_account.square_merchant_id,
        is_active=square_account.is_active,
        is_verified=square_account.is_verified,
        can_receive_payments=square_account.can_receive_payments,
        can_make_payouts=square_account.can_make_payouts,
        connected_at=square_account.connected_at.isoformat() if square_account.connected_at else ""
    )


@router.post("/payments", response_model=SquarePaymentResponse)
async def create_square_payment(
    request: SquarePaymentRequest,
    db: Session = Depends(get_db)
):
    """Create a Square payment for an appointment"""
    
    try:
        # Convert amount to cents
        amount_cents = int(request.amount * 100)
        
        # Get appointment to determine location
        from models.appointment import Appointment
        appointment = db.query(Appointment).filter(Appointment.id == request.appointment_id).first()
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Get barber's Square account to get location_id
        square_account = appointment.barber.square_account
        if not square_account:
            raise HTTPException(status_code=400, detail="Barber does not have Square account connected")
        
        location_id = square_account.square_location_id
        if not location_id:
            raise HTTPException(status_code=400, detail="Square location not configured")
        
        # Create customer info
        customer_info = {}
        if request.customer_email:
            customer_info['email'] = request.customer_email
        
        # Create payment
        payment = await square_service.create_payment(
            db=db,
            appointment_id=request.appointment_id,
            amount_cents=amount_cents,
            source_id=request.source_id,
            location_id=location_id,
            customer_info=customer_info
        )
        
        # Automatically create payout for commission
        await square_service.create_payout(
            db=db,
            payment_id=payment.id,
            commission_rate=0.7  # Default 70% commission
        )
        
        return SquarePaymentResponse(
            id=payment.id,
            square_payment_id=payment.square_payment_id,
            amount_money=float(payment.amount_money),
            status=payment.status,
            receipt_url=payment.square_receipt_url,
            appointment_id=payment.appointment_id,
            created_at=payment.created_at.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment creation failed: {str(e)}")


@router.get("/payments", response_model=List[SquarePaymentResponse])
async def list_square_payments(
    barber_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List Square payments"""
    
    query = db.query(SquarePayment)
    
    # Filter by barber if specified
    if barber_id:
        # Verify permission
        if current_user.role not in ["super_admin", "admin"]:
            barber = db.query(Barber).filter(
                Barber.id == barber_id,
                Barber.user_id == current_user.id
            ).first()
            
            if not barber:
                raise HTTPException(status_code=403, detail="Not authorized to view payments")
        
        query = query.filter(SquarePayment.barber_id == barber_id)
    elif current_user.role not in ["super_admin", "admin"]:
        # Non-admin users can only see their own payments
        user_barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if user_barber:
            query = query.filter(SquarePayment.barber_id == user_barber.id)
        else:
            # User has no barber profile, return empty list
            return []
    
    payments = query.order_by(SquarePayment.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        SquarePaymentResponse(
            id=payment.id,
            square_payment_id=payment.square_payment_id,
            amount_money=float(payment.amount_money),
            status=payment.status,
            receipt_url=payment.square_receipt_url,
            appointment_id=payment.appointment_id,
            created_at=payment.created_at.isoformat()
        )
        for payment in payments
    ]


@router.get("/payouts", response_model=List[SquarePayoutResponse])
async def list_square_payouts(
    barber_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List Square payouts"""
    
    query = db.query(SquarePayout)
    
    # Filter by barber if specified
    if barber_id:
        # Verify permission
        if current_user.role not in ["super_admin", "admin"]:
            barber = db.query(Barber).filter(
                Barber.id == barber_id,
                Barber.user_id == current_user.id
            ).first()
            
            if not barber:
                raise HTTPException(status_code=403, detail="Not authorized to view payouts")
        
        query = query.filter(SquarePayout.barber_id == barber_id)
    elif current_user.role not in ["super_admin", "admin"]:
        # Non-admin users can only see their own payouts
        user_barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if user_barber:
            query = query.filter(SquarePayout.barber_id == user_barber.id)
        else:
            return []
    
    # Filter by status if specified
    if status:
        query = query.filter(SquarePayout.status == status)
    
    payouts = query.order_by(SquarePayout.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        SquarePayoutResponse(
            id=payout.id,
            amount_money=float(payout.amount_money),
            status=payout.status,
            commission_rate=float(payout.commission_rate),
            commission_amount=float(payout.commission_amount),
            net_amount=float(payout.net_amount),
            scheduled_at=payout.scheduled_at.isoformat() if payout.scheduled_at else None,
            sent_at=payout.sent_at.isoformat() if payout.sent_at else None,
            paid_at=payout.paid_at.isoformat() if payout.paid_at else None,
            created_at=payout.created_at.isoformat()
        )
        for payout in payouts
    ]


@router.post("/payouts/{payout_id}/process", response_model=SquarePayoutResponse)
async def process_square_payout(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a Square payout (admin only)"""
    
    # Only admins can manually process payouts
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to process payouts")
    
    try:
        payout = await square_service.process_payout(db, payout_id)
        
        return SquarePayoutResponse(
            id=payout.id,
            amount_money=float(payout.amount_money),
            status=payout.status,
            commission_rate=float(payout.commission_rate),
            commission_amount=float(payout.commission_amount),
            net_amount=float(payout.net_amount),
            scheduled_at=payout.scheduled_at.isoformat() if payout.scheduled_at else None,
            sent_at=payout.sent_at.isoformat() if payout.sent_at else None,
            paid_at=payout.paid_at.isoformat() if payout.paid_at else None,
            created_at=payout.created_at.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payout processing failed: {str(e)}")


@router.post("/webhooks", status_code=200)
async def handle_square_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Handle Square webhook events"""
    
    try:
        # Get request body and headers
        body = await request.body()
        signature = request.headers.get("x-square-signature", "")
        
        # Verify webhook signature
        webhook_secret = square_service.settings.SQUARE_WEBHOOK_SECRET
        if not square_service.verify_webhook_signature(
            body.decode(), signature, webhook_secret
        ):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Parse webhook data
        webhook_data = await request.json()
        
        # Process webhook in background
        background_tasks.add_task(
            square_service.handle_webhook,
            db,
            webhook_data
        )
        
        return {"status": "received"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook processing failed: {str(e)}")


@router.delete("/account/{barber_id}", status_code=200)
async def disconnect_square_account(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Square account for a barber"""
    
    # Verify user has permission to disconnect Square account
    if current_user.role not in ["super_admin", "admin"]:
        barber = db.query(Barber).filter(
            Barber.id == barber_id,
            Barber.user_id == current_user.id
        ).first()
        
        if not barber:
            raise HTTPException(status_code=403, detail="Not authorized to disconnect Square account")
    
    # Get and deactivate Square account
    square_account = db.query(SquareAccount).filter(
        SquareAccount.barber_id == barber_id
    ).first()
    
    if not square_account:
        raise HTTPException(status_code=404, detail="Square account not found")
    
    square_account.is_active = False
    db.commit()
    
    return {"message": "Square account disconnected successfully"}


@router.get("/locations/{barber_id}")
async def get_square_locations(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Square locations for a barber's account"""
    
    # Verify permission
    if current_user.role not in ["super_admin", "admin"]:
        barber = db.query(Barber).filter(
            Barber.id == barber_id,
            Barber.user_id == current_user.id
        ).first()
        
        if not barber:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get Square account
    square_account = db.query(SquareAccount).filter(
        SquareAccount.barber_id == barber_id
    ).first()
    
    if not square_account:
        raise HTTPException(status_code=404, detail="Square account not found")
    
    # This would require implementing a method to fetch locations from Square API
    # For now, return the configured location
    return {
        "locations": [
            {
                "id": square_account.square_location_id,
                "name": square_account.merchant_name,
                "is_default": True
            }
        ]
    }