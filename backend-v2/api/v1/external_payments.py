"""
External Payments API
Endpoints for managing external payment processor connections in hybrid payment system
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from models.hybrid_payment import (
    PaymentMode, ExternalPaymentProcessor, ConnectionStatus,
    PaymentProcessorConnection, ExternalTransaction
)
from services.external_payment_service import ExternalPaymentService, PaymentProcessingError

router = APIRouter(prefix="/external-payments", tags=["External Payments"])


# Request/Response Models

class PaymentProcessorConnectionRequest(BaseModel):
    """Request model for connecting a payment processor."""
    processor_type: ExternalPaymentProcessor
    account_name: Optional[str] = None
    connection_config: Dict[str, Any] = Field(
        ...,
        description="Configuration data for the payment processor connection"
    )
    
    @validator('connection_config')
    def validate_connection_config(cls, v, values):
        """Validate connection configuration based on processor type."""
        processor_type = values.get('processor_type')
        
        if processor_type == ExternalPaymentProcessor.STRIPE:
            required_fields = ['api_key', 'publishable_key']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f"Missing required field for Stripe: {field}")
        
        elif processor_type == ExternalPaymentProcessor.SQUARE:
            required_fields = ['access_token', 'application_id', 'location_id']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f"Missing required field for Square: {field}")
        
        elif processor_type == ExternalPaymentProcessor.PAYPAL:
            required_fields = ['client_id', 'client_secret']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f"Missing required field for PayPal: {field}")
        
        return v


class PaymentProcessorConnectionResponse(BaseModel):
    """Response model for payment processor connection."""
    id: int
    processor_type: ExternalPaymentProcessor
    account_id: str
    account_name: str
    status: ConnectionStatus
    supports_payments: bool
    supports_refunds: bool
    supports_recurring: bool
    default_currency: str
    connected_at: Optional[str] = None
    disconnected_at: Optional[str] = None
    total_transactions: int
    total_volume: Decimal
    last_transaction_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class ExternalPaymentRequest(BaseModel):
    """Request model for processing external payment."""
    appointment_id: int
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="USD", description="Currency code")
    payment_method_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class ExternalTransactionResponse(BaseModel):
    """Response model for external transaction."""
    id: int
    external_transaction_id: str
    appointment_id: Optional[int] = None
    amount: Decimal
    currency: str
    processing_fee: Decimal
    net_amount: Decimal
    payment_method: Optional[str] = None
    last_four: Optional[str] = None
    brand: Optional[str] = None
    status: str
    processed_at: Optional[str] = None
    commission_rate: Optional[Decimal] = None
    commission_amount: Decimal
    commission_collected: bool
    created_at: str
    
    class Config:
        from_attributes = True


class PaymentModeUpdateRequest(BaseModel):
    """Request model for updating payment mode."""
    payment_mode: PaymentMode
    reason: Optional[str] = "User requested change"


# API Endpoints

@router.post("/connections", response_model=PaymentProcessorConnectionResponse)
def connect_payment_processor(
    request: PaymentProcessorConnectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connect a barber to an external payment processor.
    
    This endpoint allows barbers to connect their own payment processors
    (Stripe, Square, PayPal, etc.) for decentralized payment processing.
    """
    
    # Ensure user has barber role
    if current_user.role not in ['barber', 'shop_owner', 'enterprise_owner']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can connect external payment processors"
        )
    
    try:
        external_payment_service = ExternalPaymentService(db)
        
        connection = external_payment_service.connect_payment_processor(
            barber_id=current_user.id,
            processor_type=request.processor_type,
            connection_config=request.connection_config,
            account_name=request.account_name
        )
        
        return PaymentProcessorConnectionResponse.from_orm(connection)
        
    except PaymentProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect payment processor: {str(e)}"
        )


@router.get("/connections", response_model=List[PaymentProcessorConnectionResponse])
def get_payment_processor_connections(
    active_only: bool = Query(True, description="Return only active connections"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all payment processor connections for the current barber.
    
    Returns a list of all payment processor connections, optionally
    filtered to show only active connections.
    """
    
    try:
        external_payment_service = ExternalPaymentService(db)
        
        connections = external_payment_service.get_barber_connections(
            barber_id=current_user.id,
            active_only=active_only
        )
        
        return [PaymentProcessorConnectionResponse.from_orm(conn) for conn in connections]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve connections: {str(e)}"
        )


@router.delete("/connections/{processor_type}")
def disconnect_payment_processor(
    processor_type: ExternalPaymentProcessor,
    reason: Optional[str] = Query(None, description="Reason for disconnection"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect a barber from an external payment processor.
    
    This will disable the specified payment processor connection
    and may revert the barber to centralized payment mode if
    no other connections remain.
    """
    
    try:
        external_payment_service = ExternalPaymentService(db)
        
        success = external_payment_service.disconnect_payment_processor(
            barber_id=current_user.id,
            processor_type=processor_type,
            reason=reason
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active {processor_type.value} connection found"
            )
        
        return {"message": f"Successfully disconnected {processor_type.value} payment processor"}
        
    except PaymentProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect payment processor: {str(e)}"
        )


@router.post("/process", response_model=ExternalTransactionResponse)
def process_external_payment(
    request: ExternalPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process a payment through a barber's external payment processor.
    
    This endpoint processes payments using the barber's connected
    external payment processor (Stripe, Square, etc.) for
    decentralized payment mode.
    """
    
    try:
        external_payment_service = ExternalPaymentService(db)
        
        transaction = external_payment_service.process_external_payment(
            appointment_id=request.appointment_id,
            amount=request.amount,
            currency=request.currency,
            payment_method_data=request.payment_method_data,
            metadata=request.metadata
        )
        
        return ExternalTransactionResponse.from_orm(transaction)
        
    except PaymentProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process external payment: {str(e)}"
        )


@router.get("/transactions", response_model=List[ExternalTransactionResponse])
def get_external_transactions(
    appointment_id: Optional[int] = Query(None, description="Filter by appointment ID"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of transactions to return"),
    offset: int = Query(0, ge=0, description="Number of transactions to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get external transactions for the current barber.
    
    Returns a paginated list of external transactions processed
    through the barber's connected payment processors.
    """
    
    try:
        external_payment_service = ExternalPaymentService(db)
        
        transactions = external_payment_service.get_external_transactions(
            barber_id=current_user.id,
            appointment_id=appointment_id,
            limit=limit,
            offset=offset
        )
        
        return [ExternalTransactionResponse.from_orm(tx) for tx in transactions]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve transactions: {str(e)}"
        )


@router.post("/transactions/{transaction_id}/sync", response_model=ExternalTransactionResponse)
def sync_external_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync an external transaction with the payment processor.
    
    This endpoint fetches the latest status and details of a transaction
    from the external payment processor to ensure data consistency.
    """
    
    try:
        external_payment_service = ExternalPaymentService(db)
        
        transaction = external_payment_service.sync_external_transaction(
            external_transaction_id=transaction_id
        )
        
        return ExternalTransactionResponse.from_orm(transaction)
        
    except PaymentProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync transaction: {str(e)}"
        )


@router.get("/supported-processors")
def get_supported_processors():
    """
    Get list of supported external payment processors.
    
    Returns information about all supported payment processors
    including their capabilities and configuration requirements.
    """
    
    processors = []
    
    for processor in ExternalPaymentProcessor:
        processor_info = {
            "type": processor.value,
            "display_name": processor.value.title(),
            "features": {
                "payments": True,
                "refunds": True,
                "recurring": processor in [ExternalPaymentProcessor.STRIPE, ExternalPaymentProcessor.SQUARE],
                "webhooks": True,
                "multi_currency": processor != ExternalPaymentProcessor.CLOVER,
            }
        }
        
        # Add processor-specific configuration requirements
        if processor == ExternalPaymentProcessor.STRIPE:
            processor_info["required_config"] = ["api_key", "publishable_key", "webhook_secret"]
            processor_info["optional_config"] = ["connect_client_id"]
        elif processor == ExternalPaymentProcessor.SQUARE:
            processor_info["required_config"] = ["access_token", "application_id", "location_id"]
            processor_info["optional_config"] = ["webhook_signature_key", "environment"]
        elif processor == ExternalPaymentProcessor.PAYPAL:
            processor_info["required_config"] = ["client_id", "client_secret", "webhook_id"]
            processor_info["optional_config"] = ["environment"]
        elif processor == ExternalPaymentProcessor.CLOVER:
            processor_info["required_config"] = ["api_token", "merchant_id", "app_id"]
            processor_info["optional_config"] = ["environment"]
        
        processors.append(processor_info)
    
    return {
        "supported_processors": processors,
        "total_count": len(processors)
    }


@router.patch("/payment-mode", response_model=Dict[str, Any])
def update_payment_mode(
    request: PaymentModeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update barber's payment mode.
    
    Allows switching between centralized, decentralized, and hybrid
    payment modes based on business needs.
    """
    
    # Ensure user has barber role
    if current_user.role not in ['barber', 'shop_owner', 'enterprise_owner']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can update payment mode"
        )
    
    try:
        external_payment_service = ExternalPaymentService(db)
        
        # Validate payment mode change is possible
        connections = external_payment_service.get_barber_connections(
            barber_id=current_user.id,
            active_only=True
        )
        
        if request.payment_mode == PaymentMode.DECENTRALIZED and not connections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot switch to decentralized mode without active payment processor connections"
            )
        
        # Update payment mode through the service
        external_payment_service._update_barber_payment_mode(
            barber_id=current_user.id,
            new_mode=request.payment_mode,
            reason=request.reason
        )
        
        db.commit()
        
        return {
            "message": f"Payment mode updated to {request.payment_mode.value}",
            "new_mode": request.payment_mode.value,
            "active_connections": len(connections)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update payment mode: {str(e)}"
        )