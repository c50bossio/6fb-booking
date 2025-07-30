"""
Public API Platform for BookedBarber V2

This module provides comprehensive public API endpoints for third-party integrations.
All endpoints require API key authentication and support role-based permissions.

Features:
- Full CRUD operations for appointments, clients, and services
- Real-time availability checking
- Payment processing integration
- Comprehensive analytics data
- Webhook management
- Rate limiting and usage analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal

from db import get_db
from utils.api_key_auth import require_api_key, require_permissions
from models import User, Appointment, Client, Service, Payment
from models.api_key import APIKey
from services.api_key_service import APIKeyService
from services.appointment_service import AppointmentService
import services.client_service as client_service
from services.payment_service import PaymentService
from schemas_new.public_api import (
    # Appointment schemas
    PublicAppointmentCreate,
    PublicAppointmentUpdate,
    PublicAppointmentResponse,
    PublicAppointmentListResponse,
    # Client schemas
    PublicClientCreate,
    PublicClientUpdate,
    PublicClientResponse,
    PublicClientListResponse,
    # Service schemas
    PublicServiceResponse,
    PublicServiceListResponse,
    # Payment schemas
    PublicPaymentResponse,
    PublicPaymentListResponse,
    # Analytics schemas
    PublicAnalyticsResponse,
    PublicUsageResponse,
    # Common schemas
    PublicPaginationResponse,
    PublicAvailabilityRequest,
    PublicAvailabilityResponse
)
from utils.rate_limiter import rate_limiter
from utils.audit_logger_bypass import get_audit_logger
import logging

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()

router = APIRouter(
    prefix="/public",
    tags=["public-api"],
    responses={
        401: {"description": "Invalid API key"},
        403: {"description": "Insufficient permissions"},
        429: {"description": "Rate limit exceeded"}
    }
)

# Appointments API

@router.post("/appointments", response_model=PublicAppointmentResponse)
# Rate limited by middleware
async def create_appointment(
    request: Request,
    appointment_data: PublicAppointmentCreate,
    api_key_data: dict = Depends(require_permissions(["appointments:write"])),
    db: Session = Depends(get_db)
):
    """
    Create a new appointment via public API.
    
    Requires `appointments:write` permission.
    
    Features:
    - Automatic availability checking
    - Conflict detection and resolution
    - Timezone handling
    - Automatic client creation if not exists
    - Payment integration
    """
    try:
        # Get barber (user) from API key
        barber_id = api_key_data["user_id"]
        
        # Create appointment using service
        appointment = await AppointmentService.create_appointment(
            db=db,
            barber_id=barber_id,
            client_id=appointment_data.client_id,
            service_id=appointment_data.service_id,
            appointment_datetime=appointment_data.appointment_datetime,
            duration_minutes=appointment_data.duration_minutes,
            notes=appointment_data.notes,
            created_via="public_api",
            api_key_id=api_key_data["id"]
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="appointments:create",
            resource_id=appointment.id,
            request_data=appointment_data.dict()
        )
        
        return PublicAppointmentResponse.from_appointment(appointment)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create appointment via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create appointment"
        )

@router.get("/appointments", response_model=PublicAppointmentListResponse)
# Rate limited by middleware
async def list_appointments(
    request: Request,
    start_date: Optional[date] = Query(None, description="Filter appointments from this date"),
    end_date: Optional[date] = Query(None, description="Filter appointments until this date"),
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    service_id: Optional[int] = Query(None, description="Filter by service ID"),
    status: Optional[str] = Query(None, description="Filter by appointment status"),
    limit: int = Query(50, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    api_key_data: dict = Depends(require_permissions(["appointments:read"])),
    db: Session = Depends(get_db)
):
    """
    List appointments for the authenticated barber.
    
    Requires `appointments:read` permission.
    
    Features:
    - Date range filtering
    - Client and service filtering
    - Status filtering
    - Pagination support
    - Timezone-aware results
    """
    try:
        barber_id = api_key_data["user_id"]
        
        # Build query filters
        filters = {
            "barber_id": barber_id,
            "start_date": start_date,
            "end_date": end_date,
            "client_id": client_id,
            "service_id": service_id,
            "status": status
        }
        
        # Get appointments
        appointments, total_count = await AppointmentService.list_appointments(
            db=db,
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="appointments:list",
            request_data=filters
        )
        
        return PublicAppointmentListResponse(
            appointments=[PublicAppointmentResponse.from_appointment(apt) for apt in appointments],
            pagination=PublicPaginationResponse(
                total=total_count,
                limit=limit,
                offset=offset,
                has_next=offset + limit < total_count
            )
        )
        
    except Exception as e:
        logger.error(f"Failed to list appointments via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list appointments"
        )

@router.get("/appointments/{appointment_id}", response_model=PublicAppointmentResponse)
# Rate limited by middleware
async def get_appointment(
    request: Request,
    appointment_id: int,
    api_key_data: dict = Depends(require_permissions(["appointments:read"])),
    db: Session = Depends(get_db)
):
    """
    Get a specific appointment by ID.
    
    Requires `appointments:read` permission.
    Only returns appointments owned by the authenticated barber.
    """
    try:
        barber_id = api_key_data["user_id"]
        
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.barber_id == barber_id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="appointments:get",
            resource_id=appointment_id
        )
        
        return PublicAppointmentResponse.from_appointment(appointment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get appointment via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get appointment"
        )

@router.put("/appointments/{appointment_id}", response_model=PublicAppointmentResponse)
# Rate limited by middleware
async def update_appointment(
    request: Request,
    appointment_id: int,
    appointment_data: PublicAppointmentUpdate,
    api_key_data: dict = Depends(require_permissions(["appointments:write"])),
    db: Session = Depends(get_db)
):
    """
    Update an existing appointment.
    
    Requires `appointments:write` permission.
    Only allows updating appointments owned by the authenticated barber.
    """
    try:
        barber_id = api_key_data["user_id"]
        
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.barber_id == barber_id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Update appointment using service
        updated_appointment = await AppointmentService.update_appointment(
            db=db,
            appointment=appointment,
            update_data=appointment_data.dict(exclude_unset=True),
            updated_via="public_api",
            api_key_id=api_key_data["id"]
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="appointments:update",
            resource_id=appointment_id,
            request_data=appointment_data.dict(exclude_unset=True)
        )
        
        return PublicAppointmentResponse.from_appointment(updated_appointment)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update appointment via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update appointment"
        )

@router.delete("/appointments/{appointment_id}")
# Rate limited by middleware
async def cancel_appointment(
    request: Request,
    appointment_id: int,
    reason: Optional[str] = Query(None, description="Reason for cancellation"),
    api_key_data: dict = Depends(require_permissions(["appointments:delete"])),
    db: Session = Depends(get_db)
):
    """
    Cancel an appointment.
    
    Requires `appointments:delete` permission.
    Only allows cancelling appointments owned by the authenticated barber.
    """
    try:
        barber_id = api_key_data["user_id"]
        
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.barber_id == barber_id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Cancel appointment using service
        cancelled_appointment = await AppointmentService.cancel_appointment(
            db=db,
            appointment=appointment,
            reason=reason,
            cancelled_via="public_api",
            api_key_id=api_key_data["id"]
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="appointments:cancel",
            resource_id=appointment_id,
            request_data={"reason": reason}
        )
        
        return {
            "status": "cancelled",
            "message": "Appointment cancelled successfully",
            "appointment_id": appointment_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel appointment via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel appointment"
        )

# Availability API

@router.post("/availability/check", response_model=PublicAvailabilityResponse)
# Rate limited by middleware
async def check_availability(
    request: Request,
    availability_request: PublicAvailabilityRequest,
    api_key_data: dict = Depends(require_permissions(["appointments:read"])),
    db: Session = Depends(get_db)
):
    """
    Check availability for appointment booking.
    
    Requires `appointments:read` permission.
    
    Features:
    - Real-time availability checking
    - Service duration consideration
    - Buffer time handling
    - Timezone-aware results
    """
    try:
        barber_id = api_key_data["user_id"]
        
        # Check availability using service
        availability = await AppointmentService.check_availability(
            db=db,
            barber_id=barber_id,
            date=availability_request.date,
            service_id=availability_request.service_id,
            duration_minutes=availability_request.duration_minutes
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="availability:check",
            request_data=availability_request.dict()
        )
        
        return availability
        
    except Exception as e:
        logger.error(f"Failed to check availability via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check availability"
        )

# Clients API

@router.post("/clients", response_model=PublicClientResponse)
# Rate limited by middleware
async def create_client(
    request: Request,
    client_data: PublicClientCreate,
    api_key_data: dict = Depends(require_permissions(["clients:write"])),
    db: Session = Depends(get_db)
):
    """
    Create a new client via public API.
    
    Requires `clients:write` permission.
    
    Features:
    - Duplicate prevention
    - Email and phone validation
    - Automatic profile creation
    """
    try:
        barber_id = api_key_data["user_id"]
        
        # Create client using service
        client = client_service.create_client(
            db=db,
            client_data=client_data.dict(),
            created_by_id=barber_id
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="clients:create",
            resource_id=client.id,
            request_data=client_data.dict()
        )
        
        return PublicClientResponse.from_client(client)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create client via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create client"
        )

@router.get("/clients", response_model=PublicClientListResponse)
# Rate limited by middleware
async def list_clients(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name, email, or phone"), 
    limit: int = Query(50, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    api_key_data: dict = Depends(require_permissions(["clients:read"])),
    db: Session = Depends(get_db)
):
    """
    List clients for the authenticated barber.
    
    Requires `clients:read` permission.
    
    Features:
    - Search functionality
    - Pagination support
    - Privacy-aware results
    """
    try:
        barber_id = api_key_data["user_id"]
        
        # Get clients
        # Get barber's clients
        from sqlalchemy import and_
        query = db.query(Client).filter(Client.created_by_id == barber_id)
        
        if search:
            from sqlalchemy import or_
            search_filter = or_(
                Client.name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
                Client.phone.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        total_count = query.count()
        clients = query.offset(offset).limit(limit).all()
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="clients:list",
            request_data={"search": search, "limit": limit, "offset": offset}
        )
        
        return PublicClientListResponse(
            clients=[PublicClientResponse.from_client(client) for client in clients],
            pagination=PublicPaginationResponse(
                total=total_count,
                limit=limit,
                offset=offset,
                has_next=offset + limit < total_count
            )
        )
        
    except Exception as e:
        logger.error(f"Failed to list clients via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list clients"
        )

@router.get("/clients/{client_id}", response_model=PublicClientResponse)
# Rate limited by middleware
async def get_client(
    request: Request,
    client_id: int,
    api_key_data: dict = Depends(require_permissions(["clients:read"])),
    db: Session = Depends(get_db)
):
    """
    Get a specific client by ID.
    
    Requires `clients:read` permission.
    Only returns clients associated with the authenticated barber.
    """
    try:
        barber_id = api_key_data["user_id"]
        
        client = db.query(Client).filter(
            Client.id == client_id,
            Client.created_by_id == barber_id
        ).first()
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="clients:get",
            resource_id=client_id
        )
        
        return PublicClientResponse.from_client(client)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get client via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get client"
        )

@router.put("/clients/{client_id}", response_model=PublicClientResponse)
# Rate limited by middleware
async def update_client(
    request: Request,
    client_id: int,
    client_data: PublicClientUpdate,
    api_key_data: dict = Depends(require_permissions(["clients:write"])),
    db: Session = Depends(get_db)
):
    """
    Update an existing client.
    
    Requires `clients:write` permission.
    Only allows updating clients associated with the authenticated barber.
    """
    try:
        barber_id = api_key_data["user_id"]
        
        client = db.query(Client).filter(
            Client.id == client_id,
            Client.created_by_id == barber_id
        ).first()
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        # Update client using service
        # Update client fields
        update_data = client_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(client, field):
                setattr(client, field, value)
        
        # Update timestamp
        from datetime import datetime
        client.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(client)
        updated_client = client
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="clients:update",
            resource_id=client_id,
            request_data=client_data.dict(exclude_unset=True)
        )
        
        return PublicClientResponse.from_client(updated_client)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update client via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update client"
        )

# Services API

@router.get("/services", response_model=PublicServiceListResponse)
# Rate limited by middleware
async def list_services(
    request: Request,
    active_only: bool = Query(True, description="Only return active services"),
    category: Optional[str] = Query(None, description="Filter by service category"),
    api_key_data: dict = Depends(require_permissions(["services:read"])),
    db: Session = Depends(get_db)
):
    """
    List services offered by the authenticated barber.
    
    Requires `services:read` permission.
    
    Features:
    - Active/inactive filtering
    - Category filtering
    - Pricing information
    """
    try:
        barber_id = api_key_data["user_id"]
        
        # Get services
        services = await ServiceService.list_services(
            db=db,
            barber_id=barber_id,
            active_only=active_only,
            category=category
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="services:list",
            request_data={"active_only": active_only, "category": category}
        )
        
        return PublicServiceListResponse(
            services=[PublicServiceResponse.from_service(service) for service in services]
        )
        
    except Exception as e:
        logger.error(f"Failed to list services via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list services"
        )

@router.get("/services/{service_id}", response_model=PublicServiceResponse)
# Rate limited by middleware
async def get_service(
    request: Request,
    service_id: int,
    api_key_data: dict = Depends(require_permissions(["services:read"])),
    db: Session = Depends(get_db)
):
    """
    Get a specific service by ID.
    
    Requires `services:read` permission.
    Only returns services offered by the authenticated barber.
    """
    try:
        barber_id = api_key_data["user_id"]
        
        service = db.query(Service).filter(
            Service.id == service_id,
            Service.barber_id == barber_id
        ).first()
        
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="services:get",
            resource_id=service_id
        )
        
        return PublicServiceResponse.from_service(service)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get service via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get service"
        )

# Payments API

@router.get("/payments", response_model=PublicPaymentListResponse)
# Rate limited by middleware
async def list_payments(
    request: Request,
    start_date: Optional[date] = Query(None, description="Filter payments from this date"),
    end_date: Optional[date] = Query(None, description="Filter payments until this date"),
    status: Optional[str] = Query(None, description="Filter by payment status"),
    limit: int = Query(50, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    api_key_data: dict = Depends(require_permissions(["payments:read"])),
    db: Session = Depends(get_db)
):
    """
    List payments for the authenticated barber.
    
    Requires `payments:read` permission.
    
    Features:
    - Date range filtering
    - Status filtering
    - Pagination support
    - Revenue summaries
    """
    try:
        barber_id = api_key_data["user_id"]
        
        # Build query filters
        filters = {
            "barber_id": barber_id,
            "start_date": start_date,
            "end_date": end_date,
            "status": status
        }
        
        # Get payments
        payments, total_count = await PaymentService.list_payments(
            db=db,
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="payments:list",
            request_data=filters
        )
        
        return PublicPaymentListResponse(
            payments=[PublicPaymentResponse.from_payment(payment) for payment in payments],
            pagination=PublicPaginationResponse(
                total=total_count,
                limit=limit,
                offset=offset,
                has_next=offset + limit < total_count
            )
        )
        
    except Exception as e:
        logger.error(f"Failed to list payments via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list payments"
        )

@router.get("/payments/{payment_id}", response_model=PublicPaymentResponse)
# Rate limited by middleware
async def get_payment(
    request: Request,
    payment_id: int,
    api_key_data: dict = Depends(require_permissions(["payments:read"])),
    db: Session = Depends(get_db)
):
    """
    Get a specific payment by ID.
    
    Requires `payments:read` permission.
    Only returns payments associated with the authenticated barber.
    """
    try:
        barber_id = api_key_data["user_id"]
        
        payment = db.query(Payment).filter(
            Payment.id == payment_id,
            Payment.barber_id == barber_id
        ).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="payments:get",
            resource_id=payment_id
        )
        
        return PublicPaymentResponse.from_payment(payment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get payment via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get payment"
        )

# Analytics API

@router.get("/analytics/summary", response_model=PublicAnalyticsResponse)
# Rate limited by middleware
async def get_analytics_summary(
    request: Request,
    start_date: Optional[date] = Query(None, description="Analytics start date"),
    end_date: Optional[date] = Query(None, description="Analytics end date"),
    api_key_data: dict = Depends(require_permissions(["analytics:read"])),
    db: Session = Depends(get_db)
):
    """
    Get analytics summary for the authenticated barber.
    
    Requires `analytics:read` permission.
    
    Features:
    - Revenue metrics
    - Booking statistics
    - Client metrics
    - Performance indicators
    """
    try:
        barber_id = api_key_data["user_id"]
        
        # Get analytics data
        analytics = await AnalyticsService.get_barber_summary(
            db=db,
            barber_id=barber_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Log API usage
        audit_logger.log_api_usage(
            api_key_id=api_key_data["id"],
            endpoint="analytics:summary",
            request_data={"start_date": start_date, "end_date": end_date}
        )
        
        return analytics
        
    except Exception as e:
        logger.error(f"Failed to get analytics via public API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analytics"
        )

# API Usage and Management

@router.get("/usage", response_model=PublicUsageResponse)
# Rate limited by middleware
async def get_api_usage(
    request: Request,
    api_key_data: dict = Depends(require_api_key),
    db: Session = Depends(get_db)
):
    """
    Get API usage statistics for the current API key.
    
    Features:
    - Request counts by endpoint
    - Rate limit status
    - Usage trends
    - Quota information
    """
    try:
        # Get usage statistics
        usage_stats = await APIKeyService.get_usage_statistics(
            db=db,
            api_key_id=api_key_data["id"]
        )
        
        return PublicUsageResponse(
            api_key_id=api_key_data["id"],
            current_usage=usage_stats,
            rate_limit_info={
                "limit": 1000,  # TODO: Make configurable
                "remaining": 1000 - usage_stats.get("requests_today", 0),
                "reset_time": datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to get API usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage statistics"
        )

# Health and Status

@router.get("/health")
async def public_api_health():
    """
    Health check endpoint for public API.
    
    No authentication required.
    Returns API status and version information.
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "appointments": "Available",
            "clients": "Available", 
            "services": "Available",
            "payments": "Available",
            "analytics": "Available"
        }
    }