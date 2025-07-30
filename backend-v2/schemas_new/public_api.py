"""
Pydantic schemas for Public API endpoints.

These schemas define the request/response models for the public API,
ensuring consistent data validation and documentation.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, time
import datetime as dt
from decimal import Decimal
from enum import Enum


# Base Models

class PublicPaginationResponse(BaseModel):
    """Pagination metadata for list responses."""
    total: int = Field(..., description="Total number of items")
    limit: int = Field(..., description="Number of items per page")
    offset: int = Field(..., description="Number of items skipped")
    has_next: bool = Field(..., description="Whether there are more items")


# Appointment Models

class AppointmentStatus(str, Enum):
    """Appointment status enumeration."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PublicAppointmentCreate(BaseModel):
    """Schema for creating appointments via public API."""
    client_id: int = Field(..., description="ID of the client")
    service_id: int = Field(..., description="ID of the service")
    appointment_datetime: datetime = Field(..., description="Appointment date and time (UTC)")
    duration_minutes: Optional[int] = Field(None, description="Duration in minutes (overrides service default)")
    notes: Optional[str] = Field(None, max_length=1000, description="Appointment notes")
    
    @validator('appointment_datetime')
    def validate_future_datetime(cls, v):
        if v <= datetime.utcnow():
            raise ValueError("Appointment datetime must be in the future")
        return v


class PublicAppointmentUpdate(BaseModel):
    """Schema for updating appointments via public API."""
    appointment_datetime: Optional[datetime] = Field(None, description="New appointment date and time (UTC)")
    duration_minutes: Optional[int] = Field(None, description="New duration in minutes")
    notes: Optional[str] = Field(None, max_length=1000, description="Updated appointment notes")
    status: Optional[AppointmentStatus] = Field(None, description="Updated appointment status")
    
    @validator('appointment_datetime')
    def validate_future_datetime(cls, v):
        if v and v <= datetime.utcnow():
            raise ValueError("Appointment datetime must be in the future")
        return v


class PublicAppointmentResponse(BaseModel):
    """Schema for appointment responses from public API."""
    id: int = Field(..., description="Unique appointment ID")
    client_id: int = Field(..., description="Client ID")
    client_name: Optional[str] = Field(None, description="Client name")
    client_email: Optional[str] = Field(None, description="Client email")
    client_phone: Optional[str] = Field(None, description="Client phone")
    service_id: int = Field(..., description="Service ID")
    service_name: str = Field(..., description="Service name")
    service_price: Optional[Decimal] = Field(None, description="Service price")
    barber_id: int = Field(..., description="Barber ID")
    barber_name: str = Field(..., description="Barber name")
    appointment_datetime: datetime = Field(..., description="Appointment date and time (UTC)")
    duration_minutes: int = Field(..., description="Duration in minutes")
    status: AppointmentStatus = Field(..., description="Current appointment status")
    notes: Optional[str] = Field(None, description="Appointment notes")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    @classmethod
    def from_appointment(cls, appointment) -> "PublicAppointmentResponse":
        """Create response from appointment model."""
        return cls(
            id=appointment.id,
            client_id=appointment.client_id,
            client_name=appointment.client.name if appointment.client else None,
            client_email=appointment.client.email if appointment.client else None,
            client_phone=appointment.client.phone if appointment.client else None,
            service_id=appointment.service_id,
            service_name=appointment.service.name if appointment.service else "Unknown Service",
            service_price=appointment.service.price if appointment.service else None,
            barber_id=appointment.barber_id,
            barber_name=appointment.barber.name if appointment.barber else "Unknown Barber",
            appointment_datetime=appointment.appointment_datetime,
            duration_minutes=appointment.duration_minutes,
            status=appointment.status,
            notes=appointment.notes,
            created_at=appointment.created_at,
            updated_at=appointment.updated_at
        )

    class Config:
        json_encoders = {
            Decimal: str
        }


class PublicAppointmentListResponse(BaseModel):
    """Schema for appointment list responses."""
    appointments: List[PublicAppointmentResponse] = Field(..., description="List of appointments")
    pagination: PublicPaginationResponse = Field(..., description="Pagination information")


# Client Models

class PublicClientCreate(BaseModel):
    """Schema for creating clients via public API."""
    name: str = Field(..., min_length=1, max_length=100, description="Client full name")
    email: Optional[str] = Field(None, max_length=255, description="Client email address")
    phone: Optional[str] = Field(None, max_length=20, description="Client phone number")
    notes: Optional[str] = Field(None, max_length=1000, description="Client notes")
    
    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError("Invalid email format")
        return v


class PublicClientUpdate(BaseModel):
    """Schema for updating clients via public API."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated client name")
    email: Optional[str] = Field(None, max_length=255, description="Updated client email")
    phone: Optional[str] = Field(None, max_length=20, description="Updated client phone")
    notes: Optional[str] = Field(None, max_length=1000, description="Updated client notes")
    
    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError("Invalid email format")
        return v


class PublicClientResponse(BaseModel):
    """Schema for client responses from public API."""
    id: int = Field(..., description="Unique client ID")
    name: str = Field(..., description="Client full name")
    email: Optional[str] = Field(None, description="Client email address")
    phone: Optional[str] = Field(None, description="Client phone number")
    notes: Optional[str] = Field(None, description="Client notes")
    total_appointments: int = Field(0, description="Total number of appointments")
    last_appointment_date: Optional[datetime] = Field(None, description="Date of last appointment")
    created_at: datetime = Field(..., description="Client creation timestamp")
    
    @classmethod
    def from_client(cls, client) -> "PublicClientResponse":
        """Create response from client model."""
        return cls(
            id=client.id,
            name=client.name,
            email=client.email,
            phone=client.phone,
            notes=client.notes,
            total_appointments=len(client.appointments) if hasattr(client, 'appointments') else 0,
            last_appointment_date=max([apt.appointment_datetime for apt in client.appointments]) if hasattr(client, 'appointments') and client.appointments else None,
            created_at=client.created_at
        )


class PublicClientListResponse(BaseModel):
    """Schema for client list responses."""
    clients: List[PublicClientResponse] = Field(..., description="List of clients")
    pagination: PublicPaginationResponse = Field(..., description="Pagination information")


# Service Models

class ServiceCategory(str, Enum):
    """Service category enumeration."""
    HAIRCUT = "haircut"
    BEARD = "beard"
    STYLING = "styling"
    TREATMENT = "treatment"
    PACKAGE = "package"
    OTHER = "other"


class PublicServiceResponse(BaseModel):
    """Schema for service responses from public API."""
    id: int = Field(..., description="Unique service ID")
    name: str = Field(..., description="Service name")
    description: Optional[str] = Field(None, description="Service description")
    category: Optional[ServiceCategory] = Field(None, description="Service category")
    price: Decimal = Field(..., description="Service base price")
    duration_minutes: int = Field(..., description="Default duration in minutes")
    is_active: bool = Field(True, description="Whether service is currently offered")
    requires_booking: bool = Field(True, description="Whether service requires advance booking")
    created_at: datetime = Field(..., description="Service creation timestamp")
    
    @classmethod
    def from_service(cls, service) -> "PublicServiceResponse":
        """Create response from service model."""
        return cls(
            id=service.id,
            name=service.name,
            description=service.description,
            category=service.category if hasattr(service, 'category') else None,
            price=service.price,
            duration_minutes=service.duration_minutes,
            is_active=service.is_active if hasattr(service, 'is_active') else True,
            requires_booking=service.requires_booking if hasattr(service, 'requires_booking') else True,
            created_at=service.created_at
        )

    class Config:
        json_encoders = {
            Decimal: str
        }


class PublicServiceListResponse(BaseModel):
    """Schema for service list responses."""
    services: List[PublicServiceResponse] = Field(..., description="List of services")


# Payment Models

class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    """Payment method enumeration."""
    CARD = "card"
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"
    OTHER = "other"


class PublicPaymentResponse(BaseModel):
    """Schema for payment responses from public API."""
    id: int = Field(..., description="Unique payment ID")
    appointment_id: Optional[int] = Field(None, description="Associated appointment ID")
    client_id: Optional[int] = Field(None, description="Client ID")
    client_name: Optional[str] = Field(None, description="Client name")
    amount: Decimal = Field(..., description="Payment amount")
    currency: str = Field("USD", description="Payment currency")
    status: PaymentStatus = Field(..., description="Payment status")
    payment_method: Optional[PaymentMethod] = Field(None, description="Payment method used")
    stripe_payment_intent_id: Optional[str] = Field(None, description="Stripe payment intent ID")
    processed_at: Optional[datetime] = Field(None, description="Payment processing timestamp")
    created_at: datetime = Field(..., description="Payment creation timestamp")
    
    @classmethod
    def from_payment(cls, payment) -> "PublicPaymentResponse":
        """Create response from payment model."""
        return cls(
            id=payment.id,
            appointment_id=payment.appointment_id,
            client_id=payment.client_id,
            client_name=payment.client.name if hasattr(payment, 'client') and payment.client else None,
            amount=payment.amount,
            currency=payment.currency if hasattr(payment, 'currency') else "USD",
            status=payment.status,
            payment_method=payment.payment_method if hasattr(payment, 'payment_method') else None,
            stripe_payment_intent_id=payment.stripe_payment_intent_id if hasattr(payment, 'stripe_payment_intent_id') else None,
            processed_at=payment.processed_at if hasattr(payment, 'processed_at') else None,
            created_at=payment.created_at
        )

    class Config:
        json_encoders = {
            Decimal: str
        }


class PublicPaymentListResponse(BaseModel):
    """Schema for payment list responses."""
    payments: List[PublicPaymentResponse] = Field(..., description="List of payments")
    pagination: PublicPaginationResponse = Field(..., description="Pagination information")


# Availability Models

class PublicAvailabilityRequest(BaseModel):
    """Schema for availability check requests."""
    date: dt.date = Field(..., description="Date to check availability for")
    service_id: Optional[int] = Field(None, description="Service ID for duration calculation")
    duration_minutes: Optional[int] = Field(None, description="Duration in minutes (overrides service)")
    
    @validator('date')
    def validate_future_date(cls, v):
        if v < dt.date.today():
            raise ValueError("Date must be today or in the future")
        return v


class AvailableTimeSlot(BaseModel):
    """Available time slot information."""
    start_time: time = Field(..., description="Slot start time")
    end_time: time = Field(..., description="Slot end time")
    available: bool = Field(True, description="Whether slot is available")
    reason: Optional[str] = Field(None, description="Reason if not available")


class PublicAvailabilityResponse(BaseModel):
    """Schema for availability check responses."""
    date: dt.date = Field(..., description="Date checked")
    barber_id: int = Field(..., description="Barber ID")
    barber_name: str = Field(..., description="Barber name")
    available_slots: List[AvailableTimeSlot] = Field(..., description="Available time slots")
    total_slots: int = Field(..., description="Total possible slots")
    available_count: int = Field(..., description="Number of available slots")
    working_hours: Dict[str, str] = Field(..., description="Barber's working hours for the day")


# Analytics Models

class PublicAnalyticsResponse(BaseModel):
    """Schema for analytics summary responses."""
    period_start: dt.date = Field(..., description="Analytics period start date")
    period_end: dt.date = Field(..., description="Analytics period end date")
    
    # Revenue metrics
    total_revenue: Decimal = Field(..., description="Total revenue for period")
    average_transaction: Decimal = Field(..., description="Average transaction amount")
    revenue_growth: Optional[float] = Field(None, description="Revenue growth percentage")
    
    # Appointment metrics
    total_appointments: int = Field(..., description="Total appointments in period")
    completed_appointments: int = Field(..., description="Successfully completed appointments")
    cancelled_appointments: int = Field(..., description="Cancelled appointments")
    no_show_appointments: int = Field(..., description="No-show appointments")
    completion_rate: float = Field(..., description="Appointment completion rate")
    
    # Client metrics
    total_clients: int = Field(..., description="Total number of clients")
    new_clients: int = Field(..., description="New clients in period")
    returning_clients: int = Field(..., description="Returning clients in period")
    client_retention_rate: float = Field(..., description="Client retention rate")
    
    # Performance metrics
    average_service_time: float = Field(..., description="Average service time in minutes")
    capacity_utilization: float = Field(..., description="Schedule capacity utilization")
    popular_services: List[Dict[str, Any]] = Field(..., description="Most popular services")
    
    # Time-based metrics
    busiest_hours: List[Dict[str, Any]] = Field(..., description="Busiest hours of operation")
    busiest_days: List[Dict[str, Any]] = Field(..., description="Busiest days of week")

    class Config:
        json_encoders = {
            Decimal: str
        }


# Usage Models

class PublicUsageResponse(BaseModel):
    """Schema for API usage responses."""
    api_key_id: int = Field(..., description="API key ID")
    current_usage: Dict[str, Any] = Field(..., description="Current usage statistics")
    rate_limit_info: Dict[str, Any] = Field(..., description="Rate limit information")
    quota_info: Optional[Dict[str, Any]] = Field(None, description="Quota information if applicable")
    usage_trends: Optional[Dict[str, Any]] = Field(None, description="Usage trends over time")


# Webhook Models

class WebhookEventType(str, Enum):
    """Webhook event types."""
    APPOINTMENT_CREATED = "appointment.created"
    APPOINTMENT_UPDATED = "appointment.updated"
    APPOINTMENT_CANCELLED = "appointment.cancelled"
    APPOINTMENT_COMPLETED = "appointment.completed"
    CLIENT_CREATED = "client.created"
    CLIENT_UPDATED = "client.updated"
    PAYMENT_COMPLETED = "payment.completed"
    PAYMENT_FAILED = "payment.failed"


class PublicWebhookEvent(BaseModel):
    """Schema for webhook event payloads."""
    id: str = Field(..., description="Unique event ID")
    type: WebhookEventType = Field(..., description="Event type")
    created_at: datetime = Field(..., description="Event creation timestamp")
    data: Dict[str, Any] = Field(..., description="Event data payload")
    api_key_id: int = Field(..., description="API key that triggered the event")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Error Models

class PublicAPIError(BaseModel):
    """Schema for API error responses."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    request_id: Optional[str] = Field(None, description="Request ID for debugging")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ValidationError(PublicAPIError):
    """Schema for validation error responses."""
    error: str = Field("validation_error", description="Error type")
    field_errors: Optional[List[Dict[str, str]]] = Field(None, description="Field-specific validation errors")


class AuthenticationError(PublicAPIError):
    """Schema for authentication error responses."""
    error: str = Field("authentication_error", description="Error type")


class AuthorizationError(PublicAPIError):
    """Schema for authorization error responses."""
    error: str = Field("authorization_error", description="Error type")
    required_permissions: Optional[List[str]] = Field(None, description="Required permissions")


class RateLimitError(PublicAPIError):
    """Schema for rate limit error responses."""
    error: str = Field("rate_limit_exceeded", description="Error type")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retrying")
    limit_info: Optional[Dict[str, Any]] = Field(None, description="Rate limit information")