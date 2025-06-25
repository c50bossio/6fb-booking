"""Pydantic schemas for Gift Certificates."""

from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field, validator

from models.gift_certificate import GiftCertificateStatus


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


class GiftCertificateBase(BaseModel):
    """Base model for gift certificate."""

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
    expiry_date: datetime

    @validator("original_amount", "remaining_balance", pre=False)
    def convert_cents_to_dollars(cls, v):
        if isinstance(v, int):
            return float(v) / 100
        return v


class GiftCertificateResponse(GiftCertificateBase):
    """Response model for gift certificate."""

    id: int
    created_at: datetime
    used_date: Optional[datetime]

    class Config:
        orm_mode = True


class GiftCertificateListResponse(BaseModel):
    """Response model for list of gift certificates."""

    gift_certificates: List[GiftCertificateResponse]
    total_count: int
    total_value: float
    total_remaining: float


class GiftCertificateValidationRequest(BaseModel):
    """Request model for validating a gift certificate."""

    code: str = Field(..., min_length=1)
    amount_to_use: Optional[float] = Field(
        None, gt=0, description="Amount to use in dollars"
    )


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


class GiftCertificateRedemptionRequest(BaseModel):
    """Request model for redeeming a gift certificate."""

    code: str = Field(..., min_length=1)
    appointment_id: int = Field(..., gt=0)
    amount_to_use: float = Field(..., gt=0, description="Amount to use in dollars")


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


class GiftCertificateStatistics(BaseModel):
    """Response model for gift certificate statistics."""

    counts: dict = Field(..., description="Counts by status")
    values: dict = Field(..., description="Value totals")
    trends: Optional[dict] = Field(None, description="Trend data")


class GiftCertificateCancellationRequest(BaseModel):
    """Request model for cancelling a gift certificate."""

    reason: str = Field(..., min_length=1, max_length=500)
