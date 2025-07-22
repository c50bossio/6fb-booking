"""
Walk-in Queue API endpoints for BookedBarber V2
Manages walk-in customers and queue operations
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import logging

from database import get_db
from models import User
from utils.auth import get_current_user, get_current_user_optional
from services.walkin_queue_service import get_walkin_queue_service
from utils.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/walkin-queue", tags=["walk-in-queue"])

# Request/Response Models

class WalkInQueueEntry(BaseModel):
    """Walk-in queue entry model"""
    id: str
    name: str
    phone: Optional[str] = None
    preferred_barber_id: Optional[int] = None
    service_type: str = "Haircut"
    estimated_duration: int = 30
    added_at: str
    status: str = "waiting"
    estimated_wait_minutes: int
    position: int

class AddToQueueRequest(BaseModel):
    """Request to add customer to walk-in queue"""
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    preferred_barber_id: Optional[int] = None
    service_type: str = Field("Haircut", max_length=50)
    estimated_duration: int = Field(30, ge=15, le=120)

class ConvertToAppointmentRequest(BaseModel):
    """Request to convert queue entry to appointment"""
    queue_id: str
    barber_id: int
    user_id: Optional[int] = None

class UpdateQueuePositionRequest(BaseModel):
    """Request to update queue position"""
    queue_id: str
    new_position: int = Field(..., ge=1)

class QueueStatusResponse(BaseModel):
    """Queue status response"""
    queue_length: int
    estimated_total_wait: int
    entries: List[WalkInQueueEntry]
    last_updated: str

class BarberAvailabilityWithQueue(BaseModel):
    """Barber availability including walk-in queue"""
    barber_id: int
    scheduled_slots: int
    available_slots: int
    walk_in_queue_count: int
    estimated_queue_time_minutes: int
    next_available_appointment: Optional[str] = None
    recommended_walk_in_wait: int

# API Endpoints

@router.post("/add", response_model=WalkInQueueEntry)
@limiter.limit("10/minute")
async def add_to_queue(
    request: Request,
    queue_request: AddToQueueRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Add a customer to the walk-in queue
    
    This endpoint allows barbershops to manage walk-in customers
    who don't have appointments scheduled.
    """
    try:
        queue_service = get_walkin_queue_service(db)
        
        # Add to queue
        entry = queue_service.add_to_queue(
            name=queue_request.name,
            phone=queue_request.phone,
            preferred_barber_id=queue_request.preferred_barber_id,
            service_type=queue_request.service_type,
            estimated_duration=queue_request.estimated_duration
        )
        
        return WalkInQueueEntry(**entry)
        
    except Exception as e:
        logger.error(f"Error adding to walk-in queue: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to add customer to queue"
        )

@router.get("/status", response_model=QueueStatusResponse)
@limiter.limit("30/minute")
async def get_queue_status(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get current walk-in queue status
    
    Returns all customers currently waiting in the walk-in queue
    with their estimated wait times and positions.
    """
    try:
        queue_service = get_walkin_queue_service(db)
        
        entries = queue_service.get_queue_status()
        
        queue_entries = [WalkInQueueEntry(**entry) for entry in entries]
        estimated_total_wait = sum(entry.estimated_wait_minutes for entry in queue_entries)
        
        return QueueStatusResponse(
            queue_length=len(queue_entries),
            estimated_total_wait=estimated_total_wait,
            entries=queue_entries,
            last_updated=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve queue status"
        )

@router.post("/convert-to-appointment")
@limiter.limit("20/minute")
async def convert_to_appointment(
    request: Request,
    convert_request: ConvertToAppointmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Convert a walk-in queue entry to a scheduled appointment
    
    This moves a customer from the walk-in queue into a confirmed
    appointment slot with the specified barber.
    """
    try:
        queue_service = get_walkin_queue_service(db)
        
        # Convert to appointment
        appointment = queue_service.convert_to_appointment(
            queue_id=convert_request.queue_id,
            barber_id=convert_request.barber_id,
            user_id=convert_request.user_id
        )
        
        if not appointment:
            raise HTTPException(
                status_code=400,
                detail="Failed to convert walk-in to appointment. No available slots."
            )
        
        # Send notification in background
        background_tasks.add_task(
            send_appointment_confirmation,
            appointment.id,
            appointment.user_id
        )
        
        return {
            "success": True,
            "appointment_id": appointment.id,
            "confirmation_number": f"BB{appointment.id:06d}",
            "start_time": appointment.start_time.isoformat(),
            "message": "Walk-in successfully converted to appointment"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting walk-in to appointment: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to convert walk-in to appointment"
        )

@router.put("/position")
@limiter.limit("20/minute")
async def update_queue_position(
    request: Request,
    position_request: UpdateQueuePositionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a customer's position in the walk-in queue
    
    Allows staff to reorder the queue based on service requirements
    or customer preferences.
    """
    try:
        queue_service = get_walkin_queue_service(db)
        
        success = queue_service.update_queue_position(
            queue_id=position_request.queue_id,
            new_position=position_request.new_position
        )
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Queue entry not found"
            )
        
        return {
            "success": True,
            "message": "Queue position updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating queue position: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update queue position"
        )

@router.delete("/remove/{queue_id}")
@limiter.limit("20/minute")
async def remove_from_queue(
    request: Request,
    queue_id: str,
    reason: str = "completed",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a customer from the walk-in queue
    
    Used when a customer leaves, is served, or cancels their wait.
    """
    try:
        queue_service = get_walkin_queue_service(db)
        
        success = queue_service.remove_from_queue(queue_id, reason)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Queue entry not found"
            )
        
        return {
            "success": True,
            "message": f"Customer removed from queue (reason: {reason})"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing from queue: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to remove from queue"
        )

@router.get("/barber/{barber_id}/availability", response_model=BarberAvailabilityWithQueue)
@limiter.limit("30/minute")
async def get_barber_availability_with_queue(
    request: Request,
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get barber availability including walk-in queue considerations
    
    Provides comprehensive view of barber schedule including both
    appointments and walk-in queue status.
    """
    try:
        queue_service = get_walkin_queue_service(db)
        
        availability = queue_service.get_barber_availability_with_walkins(barber_id)
        
        return BarberAvailabilityWithQueue(**availability)
        
    except Exception as e:
        logger.error(f"Error getting barber availability with queue: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve barber availability"
        )

@router.get("/analytics")
@limiter.limit("10/minute")
async def get_queue_analytics(
    request: Request,
    days_back: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get walk-in queue analytics and performance metrics
    
    Provides insights into queue performance, wait times,
    and conversion rates for business optimization.
    """
    try:
        queue_service = get_walkin_queue_service(db)
        
        analytics = queue_service.get_queue_analytics(days_back)
        
        return {
            "analytics": analytics,
            "generated_at": datetime.now().isoformat(),
            "period_days": days_back
        }
        
    except Exception as e:
        logger.error(f"Error getting queue analytics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve queue analytics"
        )

# Background tasks

async def send_appointment_confirmation(appointment_id: int, user_id: int):
    """Send appointment confirmation notification (placeholder)"""
    # This would integrate with notification service
    logger.info(f"Sending appointment confirmation for appointment {appointment_id} to user {user_id}")
    pass