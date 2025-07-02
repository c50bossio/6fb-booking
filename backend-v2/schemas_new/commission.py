"""
Secure DTOs for commission data with role-based field filtering
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from utils.validators import financial_amount_validator


class CommissionItemBase(BaseModel):
    """Base commission item without sensitive data"""
    id: int
    order_id: Optional[int] = None
    transaction_id: Optional[int] = None
    title: str
    commission_paid: bool = False
    commission_paid_at: Optional[datetime] = None


class CommissionItemBarber(CommissionItemBase):
    """Commission item view for barbers - includes their own amounts"""
    commission_amount: Decimal = Field(..., description="Commission amount for this item")
    commission_rate: Decimal = Field(..., description="Commission rate applied")
    line_total: Decimal = Field(..., description="Total amount for this line item")
    
    _validate_commission_amount = validator('commission_amount', allow_reuse=True)(financial_amount_validator)
    _validate_line_total = validator('line_total', allow_reuse=True)(financial_amount_validator)


class CommissionItemAdmin(CommissionItemBarber):
    """Commission item view for admins - includes all details"""
    barber_id: int
    barber_name: Optional[str] = None


class CommissionSummaryBase(BaseModel):
    """Base commission summary without amounts"""
    barber_id: int
    period_start: datetime
    period_end: datetime
    items_count: int = 0
    
    class Config:
        orm_mode = True


class CommissionSummaryBarber(CommissionSummaryBase):
    """Commission summary for barbers - includes their totals"""
    total_commission: Decimal = Field(..., description="Total commission for period")
    service_commission: Decimal = Field(default=Decimal("0.00"), description="Commission from services")
    retail_commission: Decimal = Field(default=Decimal("0.00"), description="Commission from retail sales")
    paid_amount: Decimal = Field(default=Decimal("0.00"), description="Amount already paid out")
    pending_amount: Decimal = Field(default=Decimal("0.00"), description="Amount pending payout")
    
    _validate_total_commission = validator('total_commission', allow_reuse=True)(financial_amount_validator)
    _validate_service_commission = validator('service_commission', allow_reuse=True)(financial_amount_validator)
    _validate_retail_commission = validator('retail_commission', allow_reuse=True)(financial_amount_validator)
    _validate_paid_amount = validator('paid_amount', allow_reuse=True)(financial_amount_validator)
    _validate_pending_amount = validator('pending_amount', allow_reuse=True)(financial_amount_validator)


class CommissionSummaryAdmin(CommissionSummaryBarber):
    """Commission summary for admins - includes additional details"""
    barber_name: str
    barber_email: Optional[str] = None
    location_id: Optional[int] = None
    location_name: Optional[str] = None


class CommissionReportBase(BaseModel):
    """Base commission report structure"""
    barber_id: int
    period_start: Optional[datetime]
    period_end: Optional[datetime]
    unpaid_only: bool = False
    
    class Config:
        orm_mode = True


class CommissionReportBarber(CommissionReportBase):
    """Commission report for barbers - filtered data"""
    retail_commission: Decimal
    service_commission: Decimal
    total_commission: Decimal
    
    _validate_retail_commission = validator('retail_commission', allow_reuse=True)(financial_amount_validator)
    _validate_service_commission = validator('service_commission', allow_reuse=True)(financial_amount_validator)
    _validate_total_commission = validator('total_commission', allow_reuse=True)(financial_amount_validator)
    items: List[CommissionItemBarber] = []


class CommissionReportAdmin(CommissionReportBase):
    """Commission report for admins - full data"""
    retail_commission: Decimal
    service_commission: Decimal
    total_commission: Decimal
    
    _validate_retail_commission = validator('retail_commission', allow_reuse=True)(financial_amount_validator)
    _validate_service_commission = validator('service_commission', allow_reuse=True)(financial_amount_validator)
    _validate_total_commission = validator('total_commission', allow_reuse=True)(financial_amount_validator)
    
    items: List[CommissionItemAdmin] = []
    barber_details: dict = {}  # Additional barber information


class PayoutPreviewBase(BaseModel):
    """Base payout preview structure"""
    barber_id: int
    include_retail: bool = True
    
    class Config:
        orm_mode = True


class PayoutPreviewBarber(PayoutPreviewBase):
    """Payout preview for barbers - limited to totals"""
    total_payout: Decimal
    
    _validate_total_payout = validator('total_payout', allow_reuse=True)(financial_amount_validator)
    message: str = "Contact admin for payout details"


class PayoutPreviewAdmin(PayoutPreviewBase):
    """Payout preview for admins - full breakdown"""
    service_amount: Decimal
    retail_amount: Decimal
    total_payout: Decimal
    
    _validate_service_amount = validator('service_amount', allow_reuse=True)(financial_amount_validator)
    _validate_retail_amount = validator('retail_amount', allow_reuse=True)(financial_amount_validator)
    _validate_total_payout = validator('total_payout', allow_reuse=True)(financial_amount_validator)
    service_payments_count: int
    retail_items_count: int
    retail_breakdown: Optional[dict] = None


def filter_commission_response(data: dict, user_role: str, user_id: int, barber_id: int) -> dict:
    """
    Filter commission response based on user role and ownership.
    
    Args:
        data: Raw commission data
        user_role: Role of the requesting user
        user_id: ID of the requesting user
        barber_id: ID of the barber whose data is being accessed
        
    Returns:
        Filtered data appropriate for the user's role
    """
    # Admins get everything
    if user_role in ["admin", "super_admin"]:
        return data
    
    # Barbers only get their own data
    if user_id == barber_id:
        # Remove sensitive fields that barbers shouldn't see
        filtered_data = data.copy()
        
        # Remove other barbers' information if present
        if "other_barbers" in filtered_data:
            del filtered_data["other_barbers"]
        
        # Remove system-level information
        for field in ["system_totals", "platform_fees", "internal_notes"]:
            if field in filtered_data:
                del filtered_data[field]
        
        return filtered_data
    
    # No access for others
    return {"error": "Unauthorized access to commission data"}