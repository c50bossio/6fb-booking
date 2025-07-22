"""
Hybrid Payments API
Unified payment processing endpoints for both centralized and decentralized payment modes
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from database import get_db
from utils.auth import get_current_user
from models import User
from models.hybrid_payment import PaymentMode
from services.hybrid_payment_router import HybridPaymentRouter, PaymentRoutingDecision, PaymentRoutingError

router = APIRouter(prefix="/hybrid-payments", tags=["Hybrid Payments"])


# Request/Response Models

class PaymentRequest(BaseModel):
    """Request model for processing hybrid payments."""
    appointment_id: int
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="USD", description="Currency code")
    payment_method_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Payment method information (card, bank account, etc.)"
    )
    client_preference: Optional[str] = Field(
        None,
        description="Client's preferred payment method (platform, external)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional payment metadata"
    )
    
    @validator('currency')
    def validate_currency(cls, v):
        """Validate currency code."""
        allowed_currencies = ['USD', 'CAD', 'GBP', 'EUR', 'AUD']
        if v.upper() not in allowed_currencies:
            raise ValueError(f"Currency must be one of: {', '.join(allowed_currencies)}")
        return v.upper()


class PaymentResponse(BaseModel):
    """Response model for payment processing."""
    payment_id: str
    payment_type: str  # 'centralized' or 'external'
    status: str
    amount: Decimal
    currency: str
    processing_fee: Decimal
    net_amount: Decimal
    commission_amount: Optional[Decimal] = None
    commission_collected: Optional[bool] = None
    routing_decision: str
    external_processor: Optional[str] = None
    processed_at: Optional[str] = None
    routing_details: Dict[str, Any]
    
    class Config:
        from_attributes = True


class PaymentRoutingResponse(BaseModel):
    """Response model for payment routing information."""
    routing_decision: str
    recommended_processor: str
    routing_details: Dict[str, Any]
    estimated_fees: Dict[str, Any]
    processing_time_estimate: str
    
    class Config:
        from_attributes = True


class PaymentOptionsResponse(BaseModel):
    """Response model for available payment options."""
    barber_id: int
    payment_mode: str
    available_methods: List[Dict[str, Any]]
    default_method: str
    fallback_enabled: bool
    external_connections: List[Dict[str, Any]]
    fee_breakdown: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


# API Endpoints

@router.post("/process", response_model=PaymentResponse)
def process_hybrid_payment(
    request: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process a payment using hybrid payment routing.
    
    This endpoint automatically determines whether to use centralized
    platform payment processing or the barber's external payment processor
    based on the barber's payment mode and configuration.
    """
    
    try:
        payment_router = HybridPaymentRouter(db)
        
        # Route the payment
        routing_decision, routing_details = payment_router.route_payment(
            appointment_id=request.appointment_id,
            amount=request.amount,
            currency=request.currency,
            payment_method_data=request.payment_method_data,
            metadata=request.metadata,
            client_preference=request.client_preference
        )
        
        # Process the payment using the routing decision
        payment_result = payment_router.process_routed_payment(
            routing_decision=routing_decision,
            routing_details=routing_details,
            appointment_id=request.appointment_id,
            amount=request.amount,
            currency=request.currency,
            payment_method_data=request.payment_method_data,
            metadata=request.metadata
        )
        
        # Create response
        response_data = {
            "payment_id": payment_result.get("platform_payment_id") or payment_result.get("external_transaction_id"),
            "payment_type": payment_result["payment_type"],
            "status": payment_result["status"],
            "amount": payment_result["amount"],
            "currency": payment_result["currency"],
            "processing_fee": payment_result["processing_fee"],
            "net_amount": payment_result["net_amount"],
            "routing_decision": routing_decision.value,
            "routing_details": payment_result["routing_details"],
            "processed_at": payment_result.get("processed_at")
        }
        
        # Add external-specific fields
        if payment_result["payment_type"] == "external":
            response_data.update({
                "commission_amount": payment_result.get("commission_amount"),
                "commission_collected": payment_result.get("commission_collected"),
                "external_processor": payment_result.get("external_processor")
            })
        
        return PaymentResponse(**response_data)
        
    except PaymentRoutingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing failed: {str(e)}"
        )


@router.post("/route", response_model=PaymentRoutingResponse)
def route_payment(
    request: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment routing information without processing the payment.
    
    This endpoint returns how a payment would be routed and processed
    without actually executing the payment. Useful for showing
    fee estimates and processing information to users.
    """
    
    try:
        payment_router = HybridPaymentRouter(db)
        
        # Get routing decision
        routing_decision, routing_details = payment_router.route_payment(
            appointment_id=request.appointment_id,
            amount=request.amount,
            currency=request.currency,
            payment_method_data=request.payment_method_data,
            metadata=request.metadata,
            client_preference=request.client_preference
        )
        
        # Determine recommended processor
        if routing_decision == PaymentRoutingDecision.CENTRALIZED:
            recommended_processor = "platform"
        elif routing_decision in [PaymentRoutingDecision.EXTERNAL, PaymentRoutingDecision.FALLBACK_TO_PLATFORM]:
            recommended_processor = routing_details.get("external_processor", "external")
        else:
            recommended_processor = "hybrid"
        
        # Estimate processing time
        if routing_decision == PaymentRoutingDecision.CENTRALIZED:
            processing_time = "Instant (real-time)"
        elif routing_decision == PaymentRoutingDecision.EXTERNAL:
            processing_time = "1-3 seconds (external processor)"
        else:
            processing_time = "1-5 seconds (with fallback)"
        
        # Calculate estimated fees
        estimated_fees = {
            "processing_fee": routing_details.get("processing_fee", 0),
            "commission_fee": routing_details.get("commission_amount", 0),
            "total_fees": routing_details.get("processing_fee", 0) + routing_details.get("commission_amount", 0),
            "net_amount": routing_details.get("net_amount", request.amount)
        }
        
        return PaymentRoutingResponse(
            routing_decision=routing_decision.value,
            recommended_processor=recommended_processor,
            routing_details=routing_details,
            estimated_fees=estimated_fees,
            processing_time_estimate=processing_time
        )
        
    except PaymentRoutingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment routing failed: {str(e)}"
        )


@router.get("/options/{barber_id}", response_model=PaymentOptionsResponse)
def get_payment_options(
    barber_id: int,
    appointment_id: Optional[int] = Query(None, description="Appointment ID for context"),
    amount: Optional[Decimal] = Query(None, description="Amount for fee calculations"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get available payment options for a barber.
    
    Returns information about all available payment processors,
    their capabilities, and fee structures for the specified barber.
    """
    
    # Check if user can access this barber's payment options
    if current_user.id != barber_id and current_user.role not in ['shop_owner', 'enterprise_owner', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot view payment options for other barbers"
        )
    
    try:
        payment_router = HybridPaymentRouter(db)
        
        payment_options = payment_router.get_payment_options(
            barber_id=barber_id,
            appointment_id=appointment_id,
            amount=amount
        )
        
        return PaymentOptionsResponse(**payment_options)
        
    except PaymentRoutingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment options: {str(e)}"
        )


@router.get("/my-options", response_model=PaymentOptionsResponse)
def get_my_payment_options(
    appointment_id: Optional[int] = Query(None, description="Appointment ID for context"),
    amount: Optional[Decimal] = Query(None, description="Amount for fee calculations"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment options for the current user (if they are a barber).
    
    Convenience endpoint for barbers to check their own payment configuration.
    """
    
    # Ensure user has barber role
    if current_user.role not in ['barber', 'shop_owner', 'enterprise_owner']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can access payment options"
        )
    
    try:
        payment_router = HybridPaymentRouter(db)
        
        payment_options = payment_router.get_payment_options(
            barber_id=current_user.id,
            appointment_id=appointment_id,
            amount=amount
        )
        
        return PaymentOptionsResponse(**payment_options)
        
    except PaymentRoutingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment options: {str(e)}"
        )


@router.get("/routing-stats/{barber_id}")
def get_routing_statistics(
    barber_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment routing statistics for a barber.
    
    Returns analytics about how payments have been routed over time,
    including success rates, processing times, and fee comparisons.
    """
    
    # Check if user can access this barber's statistics
    if current_user.id != barber_id and current_user.role not in ['shop_owner', 'enterprise_owner', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot view routing statistics for other barbers"
        )
    
    try:
        # This would integrate with the analytics service to provide:
        # - Payment routing decision breakdown
        # - Success rates by processor type
        # - Average processing times
        # - Fee comparisons
        # - Volume by payment method
        
        # Mock implementation for now
        routing_stats = {
            "barber_id": barber_id,
            "period_days": days,
            "total_payments": 0,
            "routing_breakdown": {
                "centralized": {"count": 0, "percentage": 0, "total_volume": 0},
                "external": {"count": 0, "percentage": 0, "total_volume": 0},
                "fallback": {"count": 0, "percentage": 0, "total_volume": 0}
            },
            "success_rates": {
                "centralized": 0.0,
                "external": 0.0,
                "overall": 0.0
            },
            "average_processing_times": {
                "centralized": "1.2s",
                "external": "2.1s"
            },
            "fee_comparison": {
                "total_fees_saved": 0.0,
                "average_processing_fee": 0.0,
                "commission_collected": 0.0
            }
        }
        
        return routing_stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get routing statistics: {str(e)}"
        )


@router.post("/test-routing")
def test_payment_routing(
    request: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test payment routing without processing actual payment.
    
    Development and testing endpoint to validate routing logic
    with different scenarios and configurations.
    """
    
    # Only allow for development/testing environments
    from config import get_settings
    settings = get_settings()
    
    if hasattr(settings, 'environment') and settings.environment == 'production':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test routing is not available in production"
        )
    
    try:
        payment_router = HybridPaymentRouter(db)
        
        # Get routing decision
        routing_decision, routing_details = payment_router.route_payment(
            appointment_id=request.appointment_id,
            amount=request.amount,
            currency=request.currency,
            payment_method_data=request.payment_method_data,
            metadata=request.metadata,
            client_preference=request.client_preference
        )
        
        # Return detailed test results
        test_results = {
            "test_timestamp": "2024-07-22T12:00:00Z",
            "input_parameters": {
                "appointment_id": request.appointment_id,
                "amount": request.amount,
                "currency": request.currency,
                "client_preference": request.client_preference,
                "metadata": request.metadata
            },
            "routing_decision": routing_decision.value,
            "routing_details": routing_details,
            "would_succeed": True,  # Simulation
            "estimated_processing_time": "2.1 seconds",
            "estimated_fees": {
                "processing_fee": routing_details.get("commission_amount", 0) * 0.029,
                "commission_fee": routing_details.get("commission_amount", 0),
                "total_cost": routing_details.get("commission_amount", 0) * 1.029
            }
        }
        
        return test_results
        
    except PaymentRoutingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test routing failed: {str(e)}"
        )