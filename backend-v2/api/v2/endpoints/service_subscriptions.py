"""
Service Subscription API Endpoints

Provides REST API endpoints for:
- Barbers creating subscription templates
- Clients subscribing to service packages
- Managing subscription usage and billing
- Tracking subscription analytics
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, date

from database import get_db
from routers.auth import get_current_user
from models import User
from models.service_subscription import (
    ServiceSubscriptionTemplate,
    ServiceSubscription,
    SubscriptionType,
    SubscriptionStatus,
    BillingInterval
)
from services.service_subscription_service import service_subscription_service

router = APIRouter(prefix="/service-subscriptions", tags=["Service Subscriptions"])


# Pydantic Models for Request/Response

class ServiceInclusionRequest(BaseModel):
    service_id: int
    quantity_per_period: int = Field(default=1, ge=1)


class SubscriptionTemplateRequest(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    subscription_type: SubscriptionType
    price: float = Field(..., gt=0)
    original_price: Optional[float] = Field(None, gt=0)
    billing_interval: BillingInterval
    services_per_period: int = Field(default=1, ge=1)
    rollover_unused: bool = Field(default=False)
    max_rollover: Optional[int] = Field(None, ge=0)
    duration_months: Optional[int] = Field(None, ge=1)
    min_commitment_months: int = Field(default=1, ge=1)
    early_cancellation_fee: float = Field(default=0.0, ge=0)
    min_days_between_services: int = Field(default=1, ge=1)
    max_advance_booking_days: int = Field(default=90, ge=1)
    blackout_dates: Optional[List[str]] = None  # ISO date strings
    priority_booking: bool = Field(default=False)
    discount_on_additional: float = Field(default=0.0, ge=0, le=100)
    free_product_samples: bool = Field(default=False)
    vip_perks: Optional[Dict[str, Any]] = None
    max_subscribers: Optional[int] = Field(None, ge=1)
    requires_approval: bool = Field(default=False)
    location_id: Optional[int] = None
    services: List[ServiceInclusionRequest] = Field(..., min_items=1)


class SubscriptionTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    subscription_type: SubscriptionType
    price: float
    original_price: Optional[float]
    billing_interval: BillingInterval
    services_per_period: int
    rollover_unused: bool
    max_rollover: Optional[int]
    duration_months: Optional[int]
    min_commitment_months: int
    early_cancellation_fee: float
    priority_booking: bool
    discount_on_additional: float
    free_product_samples: bool
    max_subscribers: Optional[int]
    requires_approval: bool
    is_active: bool
    barber_id: int
    barber_name: str
    subscriber_count: int
    total_value: float
    savings_amount: float
    savings_percentage: float
    created_at: datetime

    class Config:
        from_attributes = True


class ClientSubscriptionRequest(BaseModel):
    template_id: int
    payment_method_id: Optional[str] = None
    custom_price: Optional[float] = Field(None, gt=0)
    custom_services_per_period: Optional[int] = Field(None, ge=1)
    custom_notes: Optional[str] = Field(None, max_length=500)


class SubscriptionResponse(BaseModel):
    subscription_id: int
    client_id: int
    barber_id: int
    barber_name: str
    template_name: str
    status: SubscriptionStatus
    price: float
    billing_interval: BillingInterval
    services_per_period: int
    services_used_current_period: int
    services_remaining: int
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    next_billing_date: Optional[datetime]
    expires_at: Optional[datetime]
    stripe_subscription_id: Optional[str]

    class Config:
        from_attributes = True


class SubscriptionUsageResponse(BaseModel):
    can_book: bool
    subscription_id: Optional[int]
    reason: str
    services_remaining: Optional[int]
    services_used: Optional[int]
    services_per_period: Optional[int]


# Template Management Endpoints (Barber)

@router.post("/templates", response_model=SubscriptionTemplateResponse)
async def create_subscription_template(
    template_data: SubscriptionTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subscription template that can be offered to clients"""
    
    # Check if user is a barber
    if current_user.role not in ['barber', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can create subscription templates"
        )
    
    try:
        template = await service_subscription_service.create_subscription_template(
            db=db,
            barber_id=current_user.id,
            template_data=template_data.model_dump()
        )
        
        # Get template details for response
        template_details = service_subscription_service.get_template_details(db, template.id)
        
        return SubscriptionTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            subscription_type=template.subscription_type,
            price=template.price,
            original_price=template.original_price,
            billing_interval=template.billing_interval,
            services_per_period=template.services_per_period,
            rollover_unused=template.rollover_unused,
            max_rollover=template.max_rollover,
            duration_months=template.duration_months,
            min_commitment_months=template.min_commitment_months,
            early_cancellation_fee=template.early_cancellation_fee,
            priority_booking=template.priority_booking,
            discount_on_additional=template.discount_on_additional,
            free_product_samples=template.free_product_samples,
            max_subscribers=template.max_subscribers,
            requires_approval=template.requires_approval,
            is_active=template.is_active,
            barber_id=template.barber_id,
            barber_name=template.barber.name,
            subscriber_count=template_details['subscriber_count'],
            total_value=template_details['total_value'],
            savings_amount=template_details['savings_amount'],
            savings_percentage=template_details['savings_percentage'],
            created_at=template.created_at
        )
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create template")


@router.get("/templates", response_model=List[SubscriptionTemplateResponse])
async def get_my_templates(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subscription templates for the current barber"""
    
    if current_user.role not in ['barber', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can view their templates"
        )
    
    templates = service_subscription_service.get_barber_templates(
        db=db,
        barber_id=current_user.id,
        active_only=active_only
    )
    
    response = []
    for template in templates:
        template_details = service_subscription_service.get_template_details(db, template.id)
        
        response.append(SubscriptionTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            subscription_type=template.subscription_type,
            price=template.price,
            original_price=template.original_price,
            billing_interval=template.billing_interval,
            services_per_period=template.services_per_period,
            rollover_unused=template.rollover_unused,
            max_rollover=template.max_rollover,
            duration_months=template.duration_months,
            min_commitment_months=template.min_commitment_months,
            early_cancellation_fee=template.early_cancellation_fee,
            priority_booking=template.priority_booking,
            discount_on_additional=template.discount_on_additional,
            free_product_samples=template.free_product_samples,
            max_subscribers=template.max_subscribers,
            requires_approval=template.requires_approval,
            is_active=template.is_active,
            barber_id=template.barber_id,
            barber_name=template.barber.name,
            subscriber_count=template_details['subscriber_count'],
            total_value=template_details['total_value'],
            savings_amount=template_details['savings_amount'],
            savings_percentage=template_details['savings_percentage'],
            created_at=template.created_at
        ))
    
    return response


@router.get("/templates/{template_id}", response_model=Dict[str, Any])
async def get_template_details(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific subscription template"""
    
    template_details = service_subscription_service.get_template_details(db, template_id)
    
    if not template_details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    
    template = template_details['template']
    
    # Check permissions - barber can view their own, clients can view active templates
    if current_user.role == 'barber' and template.barber_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view other barber's templates")
    elif current_user.role == 'client' and not template.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not available")
    
    return template_details


# Client Subscription Endpoints

@router.post("/subscribe", response_model=Dict[str, Any])
async def subscribe_to_template(
    subscription_request: ClientSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe to a service template"""
    
    try:
        # Prepare custom pricing if provided
        custom_pricing = None
        if any([subscription_request.custom_price, 
                subscription_request.custom_services_per_period,
                subscription_request.custom_notes]):
            custom_pricing = {
                'price': subscription_request.custom_price,
                'services_per_period': subscription_request.custom_services_per_period,
                'notes': subscription_request.custom_notes
            }
        
        result = await service_subscription_service.create_client_subscription(
            db=db,
            client_id=current_user.id,
            template_id=subscription_request.template_id,
            payment_method_id=subscription_request.payment_method_id,
            custom_pricing=custom_pricing
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create subscription")


@router.get("/my-subscriptions", response_model=List[Dict[str, Any]])
async def get_my_subscriptions(
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subscriptions for the current client"""
    
    return service_subscription_service.get_client_subscription_status(
        db=db,
        client_id=current_user.id,
        barber_id=barber_id
    )


@router.get("/check-booking/{barber_id}/{service_id}", response_model=SubscriptionUsageResponse)
async def check_subscription_booking(
    barber_id: int,
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if client can book a service using their subscription"""
    
    can_book, subscription, reason = service_subscription_service.can_client_book_service(
        db=db,
        client_id=current_user.id,
        barber_id=barber_id,
        service_id=service_id
    )
    
    response = SubscriptionUsageResponse(
        can_book=can_book,
        reason=reason,
        subscription_id=subscription.id if subscription else None
    )
    
    if subscription:
        response.services_remaining = subscription.services_remaining_current_period
        response.services_used = subscription.services_used_current_period
        response.services_per_period = subscription.effective_services_per_period
    
    return response


@router.post("/use-service")
async def use_subscription_service(
    subscription_id: int,
    service_id: int,
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record usage of a service from a subscription"""
    
    try:
        # Verify subscription belongs to current user
        subscription = db.query(ServiceSubscription).filter_by(id=subscription_id).first()
        if not subscription:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        
        if subscription.client_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your subscription")
        
        usage_record = service_subscription_service.use_subscription_service(
            db=db,
            subscription_id=subscription_id,
            service_id=service_id,
            appointment_id=appointment_id
        )
        
        return {
            'success': True,
            'usage_record_id': usage_record.id,
            'services_remaining': subscription.services_remaining_current_period,
            'services_used': subscription.services_used_current_period
        }
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/cancel/{subscription_id}")
async def cancel_subscription(
    subscription_id: int,
    reason: Optional[str] = None,
    immediate: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a subscription"""
    
    try:
        # Verify subscription belongs to current user
        subscription = db.query(ServiceSubscription).filter_by(id=subscription_id).first()
        if not subscription:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        
        if subscription.client_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your subscription")
        
        result = await service_subscription_service.cancel_subscription(
            db=db,
            subscription_id=subscription_id,
            reason=reason,
            immediate=immediate
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Admin/Analytics Endpoints

@router.get("/analytics/barber-subscriptions")
async def get_barber_subscription_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get subscription analytics for the current barber"""
    
    if current_user.role not in ['barber', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can view subscription analytics"
        )
    
    # Get all subscriptions for this barber
    subscriptions = db.query(ServiceSubscription).filter_by(barber_id=current_user.id).all()
    
    # Calculate analytics
    total_subscriptions = len(subscriptions)
    active_subscriptions = len([s for s in subscriptions if s.status == SubscriptionStatus.ACTIVE])
    monthly_recurring_revenue = sum([s.effective_price for s in subscriptions 
                                   if s.status == SubscriptionStatus.ACTIVE and 
                                   s.template.billing_interval == BillingInterval.MONTHLY])
    
    # Get template performance
    templates = service_subscription_service.get_barber_templates(db, current_user.id, active_only=False)
    template_performance = []
    
    for template in templates:
        template_subs = [s for s in subscriptions if s.template_id == template.id]
        active_subs = [s for s in template_subs if s.status == SubscriptionStatus.ACTIVE]
        
        template_performance.append({
            'template_id': template.id,
            'template_name': template.name,
            'total_subscribers': len(template_subs),
            'active_subscribers': len(active_subs),
            'monthly_revenue': sum([s.effective_price for s in active_subs 
                                  if s.template.billing_interval == BillingInterval.MONTHLY]),
            'conversion_rate': (len(active_subs) / len(template_subs)) * 100 if template_subs else 0
        })
    
    return {
        'total_subscriptions': total_subscriptions,
        'active_subscriptions': active_subscriptions,
        'monthly_recurring_revenue': monthly_recurring_revenue,
        'average_subscription_value': monthly_recurring_revenue / active_subscriptions if active_subscriptions else 0,
        'template_performance': template_performance
    }