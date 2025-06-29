from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time
import schemas
import models
from database import get_db
from routers.auth import get_current_user
from services import recurring_appointments_service

router = APIRouter(
    prefix="/recurring-appointments",
    tags=["recurring-appointments"]
)


@router.post("/patterns", response_model=schemas.RecurringPatternResponse)
def create_recurring_pattern(
    pattern_data: schemas.RecurringPatternCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new recurring appointment pattern"""
    
    try:
        pattern = recurring_appointments_service.create_recurring_pattern(
            db=db,
            user_id=current_user.id,
            pattern_type=pattern_data.pattern_type,
            preferred_time=pattern_data.preferred_time,
            duration_minutes=pattern_data.duration_minutes,
            start_date=pattern_data.start_date,
            end_date=pattern_data.end_date,
            occurrences=pattern_data.occurrences,
            days_of_week=pattern_data.days_of_week,
            day_of_month=pattern_data.day_of_month,
            week_of_month=pattern_data.week_of_month,
            barber_id=pattern_data.barber_id,
            service_id=pattern_data.service_id
        )
        return pattern
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patterns", response_model=List[schemas.RecurringPatternResponse])
def get_recurring_patterns(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all recurring patterns for the current user"""
    
    try:
        patterns = recurring_appointments_service.get_recurring_patterns(
            db=db,
            user_id=current_user.id,
            is_active=is_active
        )
        return patterns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patterns/{pattern_id}", response_model=schemas.RecurringPatternResponse)
def get_recurring_pattern(
    pattern_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific recurring pattern"""
    
    pattern = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.id == pattern_id,
        models.RecurringAppointmentPattern.user_id == current_user.id
    ).first()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Recurring pattern not found")
    
    return pattern


@router.put("/patterns/{pattern_id}", response_model=schemas.RecurringPatternResponse)
def update_recurring_pattern(
    pattern_id: int,
    pattern_data: schemas.RecurringPatternUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a recurring pattern"""
    
    try:
        update_data = pattern_data.dict(exclude_unset=True)
        pattern = recurring_appointments_service.update_recurring_pattern(
            db=db,
            pattern_id=pattern_id,
            user_id=current_user.id,
            **update_data
        )
        
        if not pattern:
            raise HTTPException(status_code=404, detail="Recurring pattern not found")
        
        return pattern
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/patterns/{pattern_id}")
def delete_recurring_pattern(
    pattern_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a recurring pattern"""
    
    try:
        success = recurring_appointments_service.delete_recurring_pattern(
            db=db,
            pattern_id=pattern_id,
            user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Recurring pattern not found")
        
        return {"message": "Recurring pattern deactivated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/patterns/{pattern_id}/generate")
def generate_appointments(
    pattern_id: int,
    preview_only: bool = Query(False, description="Preview appointments without creating them"),
    max_appointments: int = Query(50, ge=1, le=100, description="Maximum number of appointments to generate"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate appointments from a recurring pattern"""
    
    # Verify pattern belongs to user
    pattern = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.id == pattern_id,
        models.RecurringAppointmentPattern.user_id == current_user.id
    ).first()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Recurring pattern not found")
    
    try:
        appointments = recurring_appointments_service.generate_appointments_from_pattern(
            db=db,
            pattern_id=pattern_id,
            preview_only=preview_only,
            max_appointments=max_appointments
        )
        
        return {
            "pattern_id": pattern_id,
            "preview_only": preview_only,
            "appointments": appointments,
            "total_generated": len([apt for apt in appointments if apt.get("status") == "created"]),
            "total_conflicts": len([apt for apt in appointments if apt.get("status") == "conflict"])
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming")
def get_upcoming_appointments(
    days_ahead: int = Query(30, ge=1, le=365, description="Number of days ahead to look"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming appointments from all recurring patterns"""
    
    try:
        upcoming = recurring_appointments_service.get_upcoming_recurring_appointments(
            db=db,
            user_id=current_user.id,
            days_ahead=days_ahead
        )
        
        return {
            "user_id": current_user.id,
            "days_ahead": days_ahead,
            "upcoming_appointments": upcoming,
            "total_upcoming": len(upcoming)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/patterns/{pattern_id}/cancel")
def cancel_recurring_series(
    pattern_id: int,
    cancel_future_only: bool = Query(True, description="Cancel only future appointments"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a recurring appointment series"""
    
    try:
        result = recurring_appointments_service.cancel_recurring_appointment_series(
            db=db,
            pattern_id=pattern_id,
            user_id=current_user.id,
            cancel_future_only=cancel_future_only
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/appointments/{appointment_id}/modify")
def modify_single_occurrence(
    appointment_id: int,
    new_date: Optional[date] = Query(None, description="New date for the appointment"),
    new_time: Optional[time] = Query(None, description="New time for the appointment"),
    new_barber_id: Optional[int] = Query(None, description="New barber for the appointment"),
    cancel: bool = Query(False, description="Cancel this single occurrence"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Modify a single occurrence of a recurring appointment"""
    
    try:
        appointment = recurring_appointments_service.modify_single_occurrence(
            db=db,
            appointment_id=appointment_id,
            user_id=current_user.id,
            new_date=new_date,
            new_time=new_time,
            new_barber_id=new_barber_id,
            cancel=cancel
        )
        
        return {
            "appointment_id": appointment.id,
            "new_start_time": appointment.start_time.isoformat(),
            "status": appointment.status,
            "barber_id": appointment.barber_id,
            "message": "Single occurrence modified successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patterns/{pattern_id}/preview")
def preview_pattern_occurrences(
    pattern_id: int,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of occurrences to preview"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview upcoming occurrences for a recurring pattern"""
    
    # Verify pattern belongs to user
    pattern = db.query(models.RecurringAppointmentPattern).filter(
        models.RecurringAppointmentPattern.id == pattern_id,
        models.RecurringAppointmentPattern.user_id == current_user.id
    ).first()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Recurring pattern not found")
    
    try:
        from services.recurring_appointments_service import calculate_next_occurrence_dates
        
        occurrence_dates = calculate_next_occurrence_dates(pattern, limit=limit)
        
        return {
            "pattern_id": pattern_id,
            "pattern_type": pattern.pattern_type,
            "occurrences": [
                {
                    "date": occ_date.isoformat(),
                    "time": pattern.preferred_time.strftime("%H:%M"),
                    "duration_minutes": pattern.duration_minutes
                }
                for occ_date in occurrence_dates
            ],
            "total_shown": len(occurrence_dates)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))