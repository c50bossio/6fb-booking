from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, time
import schemas
import models
from db import get_db
from routers.auth import get_current_user
from services import recurring_appointments_service
# Temporarily disabled due to model import issues
# from services.enhanced_recurring_service import (
#     EnhancedRecurringService, 
#     RecurringSeriesService, 
#     ConflictDetectionService,
#     AppointmentGenerationResult
# )
from services.blackout_service import BlackoutDateService

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


# Enhanced Recurring Appointment Endpoints

@router.post("/patterns/{pattern_id}/generate-enhanced")
def generate_appointments_enhanced(
    pattern_id: int,
    preview_only: bool = Query(False, description="Preview appointments without creating them"),
    max_appointments: int = Query(50, ge=1, le=100, description="Maximum number of appointments to generate"),
    auto_resolve_conflicts: bool = Query(True, description="Automatically resolve conflicts where possible"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate appointments using enhanced service with conflict detection and resolution"""
    
    try:
        result = EnhancedRecurringService.generate_appointment_series(
            db=db,
            pattern_id=pattern_id,
            user_id=current_user.id,
            preview_only=preview_only,
            max_appointments=max_appointments,
            auto_resolve_conflicts=auto_resolve_conflicts
        )
        
        return {
            "pattern_id": pattern_id,
            "preview_only": preview_only,
            "total_generated": result.total_generated,
            "total_conflicts": result.total_conflicts,
            "successful_appointments": result.successful_appointments,
            "conflicts": [
                {
                    "type": conflict.conflict_type,
                    "date": conflict.conflict_date.isoformat(),
                    "time": conflict.conflict_time.strftime("%H:%M"),
                    "details": conflict.details,
                    "suggested_resolution": conflict.suggested_resolution
                }
                for conflict in result.conflicts
            ],
            "skipped_dates": [date.isoformat() for date in result.skipped_dates]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Recurring Series Management

@router.post("/series", response_model=schemas.RecurringSeriesResponse)
def create_recurring_series(
    series_data: schemas.RecurringSeriesCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new recurring appointment series"""
    
    try:
        series = RecurringSeriesService.create_series(
            db=db,
            pattern_id=series_data.pattern_id,
            user_id=current_user.id,
            series_data=series_data
        )
        return series
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/series", response_model=List[schemas.RecurringSeriesResponse])
def get_recurring_series(
    series_status: Optional[str] = Query(None, description="Filter by series status"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all recurring series for the current user"""
    
    query = db.query(models.RecurringAppointmentSeries).filter(
        models.RecurringAppointmentSeries.user_id == current_user.id
    )
    
    if series_status:
        query = query.filter(models.RecurringAppointmentSeries.series_status == series_status)
    
    return query.order_by(models.RecurringAppointmentSeries.created_at.desc()).all()


@router.get("/series/{series_id}", response_model=schemas.RecurringSeriesResponse)
def get_recurring_series_details(
    series_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific recurring series"""
    
    series = db.query(models.RecurringAppointmentSeries).filter(
        models.RecurringAppointmentSeries.id == series_id,
        models.RecurringAppointmentSeries.user_id == current_user.id
    ).first()
    
    if not series:
        raise HTTPException(status_code=404, detail="Recurring series not found")
    
    return series


@router.put("/series/{series_id}", response_model=schemas.RecurringSeriesResponse)
def update_recurring_series(
    series_id: int,
    update_data: schemas.RecurringSeriesUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a recurring series"""
    
    series = db.query(models.RecurringAppointmentSeries).filter(
        models.RecurringAppointmentSeries.id == series_id,
        models.RecurringAppointmentSeries.user_id == current_user.id
    ).first()
    
    if not series:
        raise HTTPException(status_code=404, detail="Recurring series not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(series, key, value)
    
    db.commit()
    db.refresh(series)
    
    return series


# Appointment Series Management

@router.post("/appointments/manage")
def manage_appointment_series(
    action_data: schemas.AppointmentSeriesManagement,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manage individual appointments or entire series (reschedule, cancel, etc.)"""
    
    try:
        result = EnhancedRecurringService.manage_appointment_series(
            db=db,
            action_data=action_data,
            user_id=current_user.id
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/appointments/{appointment_id}/series-info")
def get_appointment_series_info(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get series information for a specific appointment"""
    
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    series_info = {
        "appointment_id": appointment.id,
        "is_recurring_instance": appointment.is_recurring_instance,
        "recurring_pattern_id": appointment.recurring_pattern_id,
        "recurring_series_id": appointment.recurring_series_id,
        "recurrence_sequence": appointment.recurrence_sequence,
        "original_scheduled_date": appointment.original_scheduled_date.isoformat() if appointment.original_scheduled_date else None
    }
    
    # Get other appointments in the series
    if appointment.recurring_pattern_id:
        series_appointments = db.query(models.Appointment).filter(
            models.Appointment.recurring_pattern_id == appointment.recurring_pattern_id,
            models.Appointment.id != appointment.id,
            models.Appointment.status.in_(["pending", "confirmed", "completed"])
        ).order_by(models.Appointment.start_time).all()
        
        series_info["series_appointments"] = [
            {
                "appointment_id": apt.id,
                "start_time": apt.start_time.isoformat(),
                "status": apt.status,
                "sequence": apt.recurrence_sequence
            }
            for apt in series_appointments
        ]
        
        series_info["total_in_series"] = len(series_appointments) + 1
    
    return series_info


# Conflict Detection and Resolution

@router.post("/conflicts/detect")
def detect_appointment_conflicts(
    appointment_date: date = Body(...),
    appointment_time: time = Body(...),
    duration_minutes: int = Body(...),
    barber_id: Optional[int] = Body(None),
    location_id: Optional[int] = Body(None),
    exclude_appointment_id: Optional[int] = Body(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detect conflicts for a proposed appointment slot"""
    
    try:
        conflicts = ConflictDetectionService.detect_appointment_conflicts(
            db=db,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            duration_minutes=duration_minutes,
            barber_id=barber_id,
            location_id=location_id,
            exclude_appointment_id=exclude_appointment_id
        )
        
        return {
            "has_conflicts": len(conflicts) > 0,
            "conflict_count": len(conflicts),
            "conflicts": [
                {
                    "type": conflict.conflict_type,
                    "date": conflict.conflict_date.isoformat(),
                    "time": conflict.conflict_time.strftime("%H:%M"),
                    "details": conflict.details,
                    "suggested_resolution": conflict.suggested_resolution
                }
                for conflict in conflicts
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Blackout Date Management

@router.post("/blackouts", response_model=schemas.BlackoutDateResponse)
def create_blackout_date(
    blackout_data: schemas.BlackoutDateCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new blackout date"""
    
    try:
        blackout = BlackoutDateService.create_blackout_date(
            db=db,
            blackout_data=blackout_data,
            created_by_id=current_user.id
        )
        return blackout
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/blackouts", response_model=List[schemas.BlackoutDateResponse])
def get_blackout_dates(
    location_id: Optional[int] = Query(None),
    barber_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_recurring: bool = Query(True),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get blackout dates based on criteria"""
    
    try:
        blackouts = BlackoutDateService.get_blackout_dates(
            db=db,
            location_id=location_id,
            barber_id=barber_id,
            start_date=start_date,
            end_date=end_date,
            include_recurring=include_recurring
        )
        
        # Filter to only return blackouts created by current user or global ones
        user_blackouts = [
            blackout for blackout in blackouts 
            if blackout.created_by_id == current_user.id or blackout.barber_id is None
        ]
        
        return user_blackouts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/blackouts/{blackout_id}", response_model=schemas.BlackoutDateResponse)
def update_blackout_date(
    blackout_id: int,
    update_data: schemas.BlackoutDateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a blackout date"""
    
    try:
        blackout = BlackoutDateService.update_blackout_date(
            db=db,
            blackout_id=blackout_id,
            update_data=update_data,
            user_id=current_user.id
        )
        return blackout
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/blackouts/{blackout_id}")
def delete_blackout_date(
    blackout_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a blackout date"""
    
    success = BlackoutDateService.delete_blackout_date(
        db=db,
        blackout_id=blackout_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Blackout date not found")
    
    return {"message": "Blackout date deleted successfully"}


@router.get("/blackouts/{blackout_id}/impact")
def get_blackout_impact(
    blackout_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get impact report for a blackout date"""
    
    try:
        report = BlackoutDateService.get_blackout_impact_report(
            db=db,
            blackout_id=blackout_id,
            user_id=current_user.id
        )
        return report
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/blackouts/check")
def check_blackout_conflicts(
    check_date: date = Body(...),
    check_time: Optional[time] = Body(None),
    duration_minutes: int = Body(0),
    location_id: Optional[int] = Body(None),
    barber_id: Optional[int] = Body(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a date/time conflicts with blackout dates"""
    
    try:
        is_blocked, blackout, reason = BlackoutDateService.is_date_time_blocked(
            db=db,
            check_date=check_date,
            check_time=check_time,
            location_id=location_id,
            barber_id=barber_id,
            duration_minutes=duration_minutes
        )
        
        result = {
            "is_blocked": is_blocked,
            "reason": reason
        }
        
        if blackout:
            result["blackout_details"] = {
                "id": blackout.id,
                "blackout_type": blackout.blackout_type,
                "reason": blackout.reason,
                "allow_emergency_bookings": blackout.allow_emergency_bookings
            }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))