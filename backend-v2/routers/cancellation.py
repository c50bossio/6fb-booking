from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from db import get_db
from auth import get_current_user, get_current_admin_user
from models import User, Appointment
from models.cancellation import (
    CancellationPolicy, AppointmentCancellation, WaitlistEntry,
    CancellationReason, RefundType
)
from services.cancellation_service import CancellationPolicyService

router = APIRouter(prefix="/api/v1/cancellation", tags=["cancellation"])

# Pydantic models for API
class CancellationPolicyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    service_id: Optional[int] = None
    location_id: Optional[int] = None
    immediate_cancellation_hours: int = Field(0, ge=0)
    short_notice_hours: int = Field(24, ge=0)
    advance_notice_hours: int = Field(48, ge=0)
    immediate_refund_percentage: float = Field(0.0, ge=0.0, le=1.0)
    short_notice_refund_percentage: float = Field(0.5, ge=0.0, le=1.0)
    advance_refund_percentage: float = Field(1.0, ge=0.0, le=1.0)
    immediate_cancellation_fee: float = Field(0.0, ge=0.0)
    short_notice_cancellation_fee: float = Field(0.0, ge=0.0)
    advance_cancellation_fee: float = Field(0.0, ge=0.0)
    no_show_fee: float = Field(0.0, ge=0.0)
    no_show_refund_percentage: float = Field(0.0, ge=0.0, le=1.0)
    allow_emergency_exception: bool = True
    emergency_refund_percentage: float = Field(1.0, ge=0.0, le=1.0)
    emergency_requires_approval: bool = True
    first_time_client_grace: bool = True
    first_time_client_hours: int = Field(24, ge=0)
    first_time_client_refund_percentage: float = Field(1.0, ge=0.0, le=1.0)
    auto_offer_to_waitlist: bool = True
    waitlist_notification_hours: int = Field(2, ge=0)
    is_default: bool = False

class CancellationPolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    immediate_cancellation_hours: Optional[int] = Field(None, ge=0)
    short_notice_hours: Optional[int] = Field(None, ge=0)
    advance_notice_hours: Optional[int] = Field(None, ge=0)
    immediate_refund_percentage: Optional[float] = Field(None, ge=0.0, le=1.0)
    short_notice_refund_percentage: Optional[float] = Field(None, ge=0.0, le=1.0)
    advance_refund_percentage: Optional[float] = Field(None, ge=0.0, le=1.0)
    immediate_cancellation_fee: Optional[float] = Field(None, ge=0.0)
    short_notice_cancellation_fee: Optional[float] = Field(None, ge=0.0)
    advance_cancellation_fee: Optional[float] = Field(None, ge=0.0)
    no_show_fee: Optional[float] = Field(None, ge=0.0)
    no_show_refund_percentage: Optional[float] = Field(None, ge=0.0, le=1.0)
    allow_emergency_exception: Optional[bool] = None
    emergency_refund_percentage: Optional[float] = Field(None, ge=0.0, le=1.0)
    emergency_requires_approval: Optional[bool] = None
    first_time_client_grace: Optional[bool] = None
    first_time_client_hours: Optional[int] = Field(None, ge=0)
    first_time_client_refund_percentage: Optional[float] = Field(None, ge=0.0, le=1.0)
    auto_offer_to_waitlist: Optional[bool] = None
    waitlist_notification_hours: Optional[int] = Field(None, ge=0)

class CancellationPolicyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    is_default: bool
    service_id: Optional[int]
    location_id: Optional[int]
    immediate_cancellation_hours: int
    short_notice_hours: int
    advance_notice_hours: int
    immediate_refund_percentage: float
    short_notice_refund_percentage: float
    advance_refund_percentage: float
    immediate_cancellation_fee: float
    short_notice_cancellation_fee: float
    advance_cancellation_fee: float
    no_show_fee: float
    no_show_refund_percentage: float
    allow_emergency_exception: bool
    emergency_refund_percentage: float
    emergency_requires_approval: bool
    first_time_client_grace: bool
    first_time_client_hours: int
    first_time_client_refund_percentage: float
    auto_offer_to_waitlist: bool
    waitlist_notification_hours: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BookingCancellationRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)
    is_emergency: bool = False
    reason_details: Optional[str] = Field(None, max_length=1000)

class CancellationDetailsResponse(BaseModel):
    policy_id: Optional[int]
    refund_type: RefundType
    refund_percentage: float
    refund_amount: float
    cancellation_fee: float
    net_refund_amount: float
    hours_before_appointment: float
    policy_rule_applied: str
    is_emergency_exception: bool
    is_first_time_client_grace: bool
    requires_manual_approval: bool = False

class AppointmentCancellationResponse(BaseModel):
    id: int
    appointment_id: int
    cancelled_at: datetime
    reason: CancellationReason
    reason_details: Optional[str]
    hours_before_appointment: float
    original_amount: float
    refund_type: RefundType
    refund_percentage: float
    refund_amount: float
    cancellation_fee: float
    net_refund_amount: float
    refund_processed: bool
    refund_processed_at: Optional[datetime]
    policy_rule_applied: Optional[str]
    is_emergency_exception: bool
    is_first_time_client_grace: bool

    class Config:
        from_attributes = True

class WaitlistEntryCreate(BaseModel):
    service_id: Optional[int] = None
    barber_id: Optional[int] = None
    location_id: Optional[int] = None
    preferred_date: Optional[datetime] = None
    earliest_acceptable_date: Optional[datetime] = None
    latest_acceptable_date: Optional[datetime] = None
    flexible_on_barber: bool = True
    flexible_on_time: bool = True
    flexible_on_date: bool = False
    notify_via_sms: bool = True
    notify_via_email: bool = True
    auto_book_if_available: bool = False

class WaitlistEntryResponse(BaseModel):
    id: int
    user_id: int
    service_id: Optional[int]
    barber_id: Optional[int]
    location_id: Optional[int]
    preferred_date: Optional[datetime]
    earliest_acceptable_date: Optional[datetime]
    latest_acceptable_date: Optional[datetime]
    flexible_on_barber: bool
    flexible_on_time: bool
    flexible_on_date: bool
    is_active: bool
    priority_score: int
    times_notified: int
    last_notified_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True

# Admin endpoints for policy management
@router.post("/policies", response_model=CancellationPolicyResponse)
async def create_cancellation_policy(
    policy_data: CancellationPolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new cancellation policy (admin only)"""
    try:
        policy = CancellationPolicyService.create_policy(
            db=db,
            created_by_id=current_user.id,
            **policy_data.dict()
        )
        return policy
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create policy: {str(e)}")

@router.get("/policies", response_model=List[CancellationPolicyResponse])
async def list_cancellation_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    service_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List all cancellation policies (admin only)"""
    query = db.query(CancellationPolicy)
    
    if is_active is not None:
        query = query.filter(CancellationPolicy.is_active == is_active)
    
    if service_id is not None:
        query = query.filter(CancellationPolicy.service_id == service_id)
    
    policies = query.offset(skip).limit(limit).all()
    return policies

@router.get("/policies/{policy_id}", response_model=CancellationPolicyResponse)
async def get_cancellation_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get a specific cancellation policy (admin only)"""
    policy = db.query(CancellationPolicy).filter(CancellationPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy

@router.put("/policies/{policy_id}", response_model=CancellationPolicyResponse)
async def update_cancellation_policy(
    policy_id: int,
    policy_update: CancellationPolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a cancellation policy (admin only)"""
    policy = db.query(CancellationPolicy).filter(CancellationPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Store previous config for audit
    previous_config = {
        column.name: getattr(policy, column.name) 
        for column in policy.__table__.columns
    }
    
    # Update policy fields
    update_data = policy_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(policy, field, value)
    
    # Validate hour progression if any hour fields were updated
    if any(field in update_data for field in ['immediate_cancellation_hours', 'short_notice_hours', 'advance_notice_hours']):
        if not (policy.immediate_cancellation_hours <= policy.short_notice_hours <= policy.advance_notice_hours):
            raise HTTPException(status_code=400, detail="Hour thresholds must be in ascending order")
    
    try:
        db.commit()
        db.refresh(policy)
        
        # Log the change
        CancellationPolicyService._log_policy_change(
            db, policy_id, current_user.id, "Policy updated", 
            previous_config, policy.__dict__
        )
        
        return policy
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update policy: {str(e)}")

@router.delete("/policies/{policy_id}")
async def delete_cancellation_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a cancellation policy (admin only)"""
    policy = db.query(CancellationPolicy).filter(CancellationPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Check if policy is being used
    cancellation_count = db.query(AppointmentCancellation).filter(
        AppointmentCancellation.policy_id == policy_id
    ).count()
    
    if cancellation_count > 0:
        # Soft delete by deactivating
        policy.is_active = False
        db.commit()
        return {"message": "Policy deactivated (has existing cancellations)"}
    else:
        # Hard delete if no cancellations
        db.delete(policy)
        db.commit()
        return {"message": "Policy deleted"}

@router.post("/policies/default")
async def create_default_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create default cancellation policies (admin only)"""
    try:
        policies = CancellationPolicyService.create_default_policies(db, current_user.id)
        return {
            "message": f"Created {len(policies)} default policies",
            "policies": [{"id": p.id, "name": p.name} for p in policies]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create default policies: {str(e)}")

# Client endpoints for booking cancellation
@router.post("/appointments/{appointment_id}/preview", response_model=CancellationDetailsResponse)
async def preview_cancellation(
    appointment_id: int,
    is_emergency: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview cancellation details before confirming"""
    # Get appointment and verify ownership
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")
    
    if appointment.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed appointment")
    
    try:
        from models.cancellation import CancellationReason
        
        details = CancellationPolicyService.calculate_cancellation_details(
            db=db,
            appointment=appointment,
            reason=CancellationReason.EMERGENCY if is_emergency else CancellationReason.CLIENT_REQUEST,
            is_emergency=is_emergency
        )
        
        return CancellationDetailsResponse(**details)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate cancellation details: {str(e)}")

@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentCancellationResponse)
async def cancel_appointment(
    appointment_id: int,
    cancellation_request: BookingCancellationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an appointment"""
    # Get appointment and verify ownership
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")
    
    if appointment.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed appointment")
    
    try:
        from models.cancellation import CancellationReason
        
        # Map reason to enum
        reason_mapping = {
            "emergency": CancellationReason.EMERGENCY,
            "illness": CancellationReason.ILLNESS,
            "weather": CancellationReason.WEATHER,
            "schedule_conflict": CancellationReason.SCHEDULING_CONFLICT,
            "other": CancellationReason.OTHER
        }
        
        cancellation_reason = CancellationReason.CLIENT_REQUEST
        if cancellation_request.reason:
            cancellation_reason = reason_mapping.get(
                cancellation_request.reason.lower(), 
                CancellationReason.CLIENT_REQUEST
            )
        
        if cancellation_request.is_emergency:
            cancellation_reason = CancellationReason.EMERGENCY
        
        cancellation = CancellationPolicyService.cancel_appointment(
            db=db,
            appointment_id=appointment_id,
            cancelled_by_id=current_user.id,
            reason=cancellation_reason,
            reason_details=cancellation_request.reason_details,
            is_emergency=cancellation_request.is_emergency
        )
        
        return cancellation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel appointment: {str(e)}")

# Waitlist endpoints
@router.post("/waitlist", response_model=WaitlistEntryResponse)
async def join_waitlist(
    waitlist_data: WaitlistEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join the waitlist for appointment slots"""
    try:
        # Find or create client record
        from services.booking_service import find_or_create_client_for_user
        client_id = find_or_create_client_for_user(db, current_user.id)
        
        waitlist_entry = WaitlistEntry(
            user_id=current_user.id,
            client_id=client_id,
            **waitlist_data.dict()
        )
        
        db.add(waitlist_entry)
        db.commit()
        db.refresh(waitlist_entry)
        
        return waitlist_entry
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to join waitlist: {str(e)}")

@router.get("/waitlist", response_model=List[WaitlistEntryResponse])
async def get_my_waitlist_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's waitlist entries"""
    entries = db.query(WaitlistEntry).filter(
        WaitlistEntry.user_id == current_user.id,
        WaitlistEntry.is_active == True
    ).order_by(WaitlistEntry.created_at.desc()).all()
    
    return entries

@router.delete("/waitlist/{entry_id}")
async def leave_waitlist(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Leave the waitlist"""
    entry = db.query(WaitlistEntry).filter(
        WaitlistEntry.id == entry_id,
        WaitlistEntry.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    entry.is_active = False
    db.commit()
    
    return {"message": "Left waitlist successfully"}

# Admin endpoints for managing cancellations
@router.get("/cancellations", response_model=List[AppointmentCancellationResponse])
async def list_cancellations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    appointment_id: Optional[int] = Query(None),
    reason: Optional[CancellationReason] = Query(None),
    refund_processed: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List appointment cancellations (admin only)"""
    query = db.query(AppointmentCancellation)
    
    if appointment_id:
        query = query.filter(AppointmentCancellation.appointment_id == appointment_id)
    
    if reason:
        query = query.filter(AppointmentCancellation.reason == reason)
    
    if refund_processed is not None:
        query = query.filter(AppointmentCancellation.refund_processed == refund_processed)
    
    cancellations = query.order_by(AppointmentCancellation.cancelled_at.desc()).offset(skip).limit(limit).all()
    return cancellations

@router.post("/cancellations/{cancellation_id}/process-refund")
async def process_manual_refund(
    cancellation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Process refund for a cancellation (admin only)"""
    try:
        refund = CancellationPolicyService.process_cancellation_refund(
            db=db,
            cancellation_id=cancellation_id,
            processed_by_id=current_user.id
        )
        
        return {
            "message": "Refund processed successfully",
            "refund_id": refund.id if refund else None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process refund: {str(e)}")

@router.get("/waitlist/admin", response_model=List[WaitlistEntryResponse])
async def list_waitlist_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    service_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List all waitlist entries (admin only)"""
    query = db.query(WaitlistEntry)
    
    if is_active is not None:
        query = query.filter(WaitlistEntry.is_active == is_active)
    
    if service_id:
        query = query.filter(WaitlistEntry.service_id == service_id)
    
    entries = query.order_by(WaitlistEntry.created_at.desc()).offset(skip).limit(limit).all()
    return entries