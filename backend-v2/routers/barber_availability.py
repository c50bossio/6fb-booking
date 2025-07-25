from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time
import schemas
import models
from db import get_db
from routers.auth import get_current_user
from utils.auth import require_barber_or_admin
from services import barber_availability_service

router = APIRouter(
    prefix="/barber-availability",
    tags=["barber-availability"]
)


@router.get("/schedule/{barber_id}", response_model=dict)
def get_barber_schedule(
    barber_id: int,
    start_date: date = Query(..., description="Start date for schedule"),
    end_date: date = Query(..., description="End date for schedule"),
    timezone: Optional[str] = Query("UTC", description="Timezone for display"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive schedule for a barber"""
    
    # Check if user is the barber or an admin
    if current_user.id != barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this barber's schedule")
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        schedule = barber_availability_service.get_barber_schedule(
            db=db,
            barber_id=barber_id,
            start_date=start_date,
            end_date=end_date,
            timezone_str=timezone or current_user.timezone or "UTC"
        )
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/availability/{barber_id}", response_model=List[schemas.BarberAvailabilityResponse])
def get_barber_availability(
    barber_id: int,
    day_of_week: Optional[int] = Query(None, ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get regular weekly availability for a barber"""
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        availability = barber_availability_service.get_barber_availability(
            db=db,
            barber_id=barber_id,
            day_of_week=day_of_week
        )
        return availability
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/availability/{barber_id}", response_model=schemas.BarberAvailabilityResponse)
def create_barber_availability(
    barber_id: int,
    availability_data: schemas.BarberAvailabilityCreate,
    current_user: models.User = Depends(require_barber_or_admin),
    db: Session = Depends(get_db)
):
    """Create or update regular availability for a barber"""
    
    # Check if user is the barber or an admin
    if current_user.id != barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this barber's availability")
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        availability = barber_availability_service.create_barber_availability(
            db=db,
            barber_id=barber_id,
            day_of_week=availability_data.day_of_week,
            start_time=availability_data.start_time,
            end_time=availability_data.end_time
        )
        return availability
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/availability/{availability_id}", response_model=schemas.BarberAvailabilityResponse)
def update_barber_availability(
    availability_id: int,
    availability_data: schemas.BarberAvailabilityUpdate,
    current_user: models.User = Depends(require_barber_or_admin),
    db: Session = Depends(get_db)
):
    """Update barber availability"""
    
    # Get the availability record to check ownership
    availability = db.query(models.BarberAvailability).filter(
        models.BarberAvailability.id == availability_id
    ).first()
    
    if not availability:
        raise HTTPException(status_code=404, detail="Availability record not found")
    
    # Check if user is the barber or an admin
    if current_user.id != availability.barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this availability")
    
    try:
        update_data = availability_data.dict(exclude_unset=True)
        updated_availability = barber_availability_service.update_barber_availability(
            db=db,
            availability_id=availability_id,
            barber_id=availability.barber_id,
            **update_data
        )
        
        if not updated_availability:
            raise HTTPException(status_code=404, detail="Availability record not found")
        
        return updated_availability
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/availability/{availability_id}")
def delete_barber_availability(
    availability_id: int,
    current_user: models.User = Depends(require_barber_or_admin),
    db: Session = Depends(get_db)
):
    """Delete barber availability"""
    
    # Get the availability record to check ownership
    availability = db.query(models.BarberAvailability).filter(
        models.BarberAvailability.id == availability_id
    ).first()
    
    if not availability:
        raise HTTPException(status_code=404, detail="Availability record not found")
    
    # Check if user is the barber or an admin
    if current_user.id != availability.barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this availability")
    
    try:
        success = barber_availability_service.delete_barber_availability(
            db=db,
            availability_id=availability_id,
            barber_id=availability.barber_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Availability record not found")
        
        return {"message": "Availability deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/time-off/{barber_id}", response_model=List[schemas.BarberTimeOffResponse])
def get_barber_time_off(
    barber_id: int,
    start_date: Optional[date] = Query(None, description="Filter from this date"),
    end_date: Optional[date] = Query(None, description="Filter to this date"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get time off requests for a barber"""
    
    # Check if user is the barber or an admin
    if current_user.id != barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this barber's time off")
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        time_off_requests = barber_availability_service.get_barber_time_off(
            db=db,
            barber_id=barber_id,
            start_date=start_date,
            end_date=end_date
        )
        return time_off_requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/time-off/{barber_id}", response_model=schemas.BarberTimeOffResponse)
def create_time_off_request(
    barber_id: int,
    time_off_data: schemas.BarberTimeOffCreate,
    current_user: models.User = Depends(require_barber_or_admin),
    db: Session = Depends(get_db)
):
    """Create a time off request for a barber"""
    
    # Check if user is the barber or an admin
    if current_user.id != barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create time off for this barber")
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        time_off = barber_availability_service.create_time_off_request(
            db=db,
            barber_id=barber_id,
            start_date=time_off_data.start_date,
            end_date=time_off_data.end_date,
            start_time=time_off_data.start_time,
            end_time=time_off_data.end_time,
            reason=time_off_data.reason,
            notes=time_off_data.notes
        )
        return time_off
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/special/{barber_id}", response_model=List[schemas.BarberSpecialAvailabilityResponse])
def get_special_availability(
    barber_id: int,
    date: Optional[date] = Query(None, description="Filter by specific date"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get special availability for a barber"""
    
    # Check if user is the barber or an admin
    if current_user.id != barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this barber's special availability")
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        special_availability = barber_availability_service.get_barber_special_availability(
            db=db,
            barber_id=barber_id,
            date=date
        )
        return special_availability
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/special/{barber_id}", response_model=schemas.BarberSpecialAvailabilityResponse)
def create_special_availability(
    barber_id: int,
    special_data: schemas.BarberSpecialAvailabilityCreate,
    current_user: models.User = Depends(require_barber_or_admin),
    db: Session = Depends(get_db)
):
    """Create special availability for a specific date"""
    
    # Check if user is the barber or an admin
    if current_user.id != barber_id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create special availability for this barber")
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        special_availability = barber_availability_service.create_special_availability(
            db=db,
            barber_id=barber_id,
            date=special_data.date,
            start_time=special_data.start_time,
            end_time=special_data.end_time,
            availability_type=special_data.availability_type,
            notes=special_data.notes
        )
        return special_availability
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check/{barber_id}")
def check_barber_availability(
    barber_id: int,
    check_date: date = Query(..., description="Date to check"),
    start_time: time = Query(..., description="Start time to check"),
    end_time: time = Query(..., description="End time to check"),
    exclude_appointment_id: Optional[int] = Query(None, description="Appointment ID to exclude from check"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a barber is available during a specific time slot"""
    
    # Verify barber exists
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    try:
        is_available = barber_availability_service.is_barber_available(
            db=db,
            barber_id=barber_id,
            check_date=check_date,
            start_time=start_time,
            end_time=end_time,
            exclude_appointment_id=exclude_appointment_id
        )
        
        return {
            "barber_id": barber_id,
            "date": check_date.isoformat(),
            "start_time": start_time.strftime("%H:%M"),
            "end_time": end_time.strftime("%H:%M"),
            "is_available": is_available
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available-barbers", response_model=schemas.BarberAvailabilityResponse)
def get_available_barbers(
    check_date: date = Query(..., description="Date to check"),
    start_time: time = Query(..., description="Start time"),
    end_time: time = Query(..., description="End time"),
    service_id: Optional[int] = Query(None, description="Service ID to filter barbers"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all barbers available for a specific time slot"""
    
    try:
        available_barbers = barber_availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=check_date,
            start_time=start_time,
            end_time=end_time,
            service_id=service_id
        )
        
        # Get available slots for each barber (simplified version)
        barber_data = []
        for barber in available_barbers:
            # For now, just mark the requested time as available
            # In a more sophisticated implementation, you might want to get all available slots
            barber_data.append({
                "barber_id": barber.id,
                "barber_name": barber.name,
                "available_slots": [
                    {
                        "time": start_time.strftime("%H:%M"),
                        "available": True,
                        "is_next_available": False
                    }
                ]
            })
        
        return {
            "date": check_date.isoformat(),
            "available_barbers": barber_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))