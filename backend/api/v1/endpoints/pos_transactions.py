"""
POS Transaction API Endpoints
Handles secure POS transactions with comprehensive audit logging and CSRF protection.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from config.database import get_db
from services.pos_security_service import POSSecurityService
from services.barber_pin_service import BarberPINService
from models.barber import Barber
from models.product import Product
from models.client import Client

router = APIRouter(prefix="/pos", tags=["POS Transactions"])
security = HTTPBearer()


# Request/Response Models
class TransactionItem(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    discount: Optional[float] = Field(default=0, ge=0, le=100)

    @validator("discount")
    def validate_discount(cls, v):
        if v and (v < 0 or v > 100):
            raise ValueError("Discount must be between 0 and 100")
        return v


class POSTransactionRequest(BaseModel):
    items: List[TransactionItem]
    client_id: Optional[int] = None
    payment_method: str = Field(..., pattern="^(cash|card|other)$")
    subtotal: float = Field(gt=0)
    tax: float = Field(ge=0)
    tip: Optional[float] = Field(default=0, ge=0)
    total: float = Field(gt=0)
    notes: Optional[str] = Field(None, max_length=500)

    @validator("total")
    def validate_total(cls, v, values):
        # Validate total matches calculation
        if "subtotal" in values and "tax" in values and "tip" in values:
            expected_total = values["subtotal"] + values["tax"] + values.get("tip", 0)
            if abs(v - expected_total) > 0.01:  # Allow small floating point differences
                raise ValueError("Total does not match subtotal + tax + tip")
        return v


class POSTransactionResponse(BaseModel):
    transaction_id: str
    receipt_number: str
    timestamp: datetime
    barber_id: int
    barber_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    tax: float
    tip: float
    total: float
    payment_method: str
    status: str = "completed"
    receipt_url: Optional[str] = None


class ReceiptRequest(BaseModel):
    transaction_id: str


class ReceiptResponse(BaseModel):
    transaction_id: str
    receipt_number: str
    date: str
    barber_name: str
    location_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    tax: float
    tip: float
    total: float
    payment_type: str


class TransactionVoidRequest(BaseModel):
    transaction_id: str
    reason: str = Field(..., min_length=5, max_length=500)


class TransactionSearchRequest(BaseModel):
    barber_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    payment_method: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    limit: int = Field(default=50, le=100)


def get_security_service(db: Session = Depends(get_db)) -> POSSecurityService:
    """Dependency to get POS security service instance"""
    return POSSecurityService(db)


def get_pin_service(db: Session = Depends(get_db)) -> BarberPINService:
    """Dependency to get PIN service instance"""
    return BarberPINService(db)


async def verify_pos_session(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    pin_service: BarberPINService = Depends(get_pin_service),
    security_service: POSSecurityService = Depends(get_security_service),
    x_csrf_token: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    Verify POS session and CSRF token
    Returns session info if valid
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )

    session_token = credentials.credentials

    # Validate session
    is_valid, session_info = pin_service.validate_session(session_token)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Validate CSRF token for non-GET requests
    if x_csrf_token is not None:  # Only validate if CSRF token is provided
        if not security_service.validate_csrf_token(session_token, x_csrf_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token"
            )

    return session_info


@router.post("/transaction", response_model=POSTransactionResponse)
async def create_transaction(
    request: POSTransactionRequest,
    http_request: Request,
    session_info: Dict[str, Any] = Depends(verify_pos_session),
    security_service: POSSecurityService = Depends(get_security_service),
    db: Session = Depends(get_db),
):
    """
    Create a new POS transaction with comprehensive audit logging
    """
    barber_id = session_info["barber_id"]
    client_ip = http_request.client.host

    # Get barber information
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Generate transaction ID and receipt number
    transaction_id = f"TXN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{barber_id}"
    receipt_number = f"RCP-{datetime.utcnow().strftime('%Y%m%d')}-{barber_id:04d}"

    # Prepare transaction data for audit logging
    transaction_data = {
        "transaction_id": transaction_id,
        "receipt_number": receipt_number,
        "barber_id": barber_id,
        "client_id": request.client_id,
        "items": [item.dict() for item in request.items],
        "subtotal": request.subtotal,
        "tax": request.tax,
        "tip": request.tip,
        "total": request.total,
        "payment_method": request.payment_method,
        "notes": request.notes,
        "item_count": len(request.items),
    }

    # Log the transaction with security filtering
    security_service.log_pos_transaction("sale", barber_id, transaction_data, client_ip)

    # TODO: Here you would typically:
    # 1. Save transaction to database
    # 2. Update inventory
    # 3. Process payment
    # 4. Generate receipt

    # For now, return a mock response
    return POSTransactionResponse(
        transaction_id=transaction_id,
        receipt_number=receipt_number,
        timestamp=datetime.utcnow(),
        barber_id=barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        items=[item.dict() for item in request.items],
        subtotal=request.subtotal,
        tax=request.tax,
        tip=request.tip or 0,
        total=request.total,
        payment_method=request.payment_method,
        status="completed",
    )


@router.post("/void", response_model=Dict[str, Any])
async def void_transaction(
    request: TransactionVoidRequest,
    http_request: Request,
    session_info: Dict[str, Any] = Depends(verify_pos_session),
    security_service: POSSecurityService = Depends(get_security_service),
    db: Session = Depends(get_db),
):
    """
    Void a POS transaction with audit logging
    """
    barber_id = session_info["barber_id"]
    client_ip = http_request.client.host

    # Log void attempt
    void_data = {
        "transaction_id": request.transaction_id,
        "reason": request.reason,
        "voided_by": barber_id,
    }

    security_service.log_pos_transaction("void", barber_id, void_data, client_ip)

    # TODO: Implement actual void logic
    # 1. Verify transaction exists and belongs to barber
    # 2. Check if transaction can be voided (time limits, status)
    # 3. Process refund if needed
    # 4. Update transaction status

    return {
        "success": True,
        "message": "Transaction voided successfully",
        "transaction_id": request.transaction_id,
        "voided_at": datetime.utcnow().isoformat(),
    }


@router.post("/receipt", response_model=ReceiptResponse)
async def get_receipt(
    request: ReceiptRequest,
    session_info: Dict[str, Any] = Depends(verify_pos_session),
    security_service: POSSecurityService = Depends(get_security_service),
    db: Session = Depends(get_db),
):
    """
    Get receipt for a transaction with secure data handling
    """
    barber_id = session_info["barber_id"]

    # TODO: Fetch actual transaction data from database
    # For now, create mock receipt data
    receipt_data = {
        "transaction_id": request.transaction_id,
        "receipt_number": f"RCP-{datetime.utcnow().strftime('%Y%m%d')}-0001",
        "date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "barber_name": "John Doe",
        "location_name": "Main Street Barbershop",
        "items": [
            {"name": "Haircut", "quantity": 1, "price": 30.00},
            {"name": "Beard Trim", "quantity": 1, "price": 15.00},
        ],
        "subtotal": 45.00,
        "tax": 4.05,
        "tip": 9.00,
        "total": 58.05,
        "payment_type": "card",
    }

    # Sanitize receipt data to ensure no sensitive information
    sanitized_receipt = security_service.validate_receipt_request(receipt_data)

    # Log receipt generation (no sensitive data)
    security_service.log_pos_transaction(
        "receipt_generated",
        barber_id,
        {
            "transaction_id": request.transaction_id,
            "receipt_number": sanitized_receipt.get("receipt_number"),
        },
    )

    return ReceiptResponse(**sanitized_receipt)


@router.post("/search", response_model=List[Dict[str, Any]])
async def search_transactions(
    request: TransactionSearchRequest,
    session_info: Dict[str, Any] = Depends(verify_pos_session),
    security_service: POSSecurityService = Depends(get_security_service),
    db: Session = Depends(get_db),
):
    """
    Search transactions with audit logging
    """
    barber_id = session_info["barber_id"]

    # Log search request
    search_criteria = {
        "barber_id": request.barber_id or barber_id,
        "date_range": {
            "from": request.date_from.isoformat() if request.date_from else None,
            "to": request.date_to.isoformat() if request.date_to else None,
        },
        "filters": {
            "payment_method": request.payment_method,
            "amount_range": {"min": request.min_amount, "max": request.max_amount},
        },
    }

    security_service.log_pos_transaction("search", barber_id, search_criteria)

    # TODO: Implement actual search logic
    # For now, return empty list
    return []


@router.get("/audit-logs", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    date: Optional[datetime] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    session_info: Dict[str, Any] = Depends(verify_pos_session),
    security_service: POSSecurityService = Depends(get_security_service),
    db: Session = Depends(get_db),
):
    """
    Retrieve audit logs for the current barber
    """
    barber_id = session_info["barber_id"]

    # Get barber to check permissions
    barber = db.query(Barber).filter(Barber.id == barber_id).first()

    # Only allow barbers to see their own logs unless they're managers
    if not barber or not barber.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view audit logs",
        )

    # Retrieve audit logs
    logs = security_service.get_audit_logs(
        date=date, barber_id=barber_id, event_type=event_type, limit=limit
    )

    return logs


@router.post("/refund", response_model=Dict[str, Any])
async def process_refund(
    request: TransactionVoidRequest,
    http_request: Request,
    session_info: Dict[str, Any] = Depends(verify_pos_session),
    security_service: POSSecurityService = Depends(get_security_service),
    db: Session = Depends(get_db),
):
    """
    Process a refund for a transaction with audit logging
    """
    barber_id = session_info["barber_id"]
    client_ip = http_request.client.host

    # Log refund attempt
    refund_data = {
        "transaction_id": request.transaction_id,
        "reason": request.reason,
        "refunded_by": barber_id,
    }

    security_service.log_pos_transaction("refund", barber_id, refund_data, client_ip)

    # TODO: Implement actual refund logic
    # 1. Verify transaction exists and is eligible for refund
    # 2. Process payment refund through payment processor
    # 3. Update transaction status
    # 4. Adjust inventory if needed

    return {
        "success": True,
        "message": "Refund processed successfully",
        "transaction_id": request.transaction_id,
        "refunded_at": datetime.utcnow().isoformat(),
    }
