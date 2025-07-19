"""
Blackout Dates API Router
Handles time slot blocking and availability management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import schemas
import models
from database import get_db
from services.blackout_service import BlackoutDateService
from dependencies import get_current_user, require_role
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/blackouts", tags=["blackouts"])

@router.post("", response_model=schemas.BlackoutDateResponse)
async def create_blackout_date(
    blackout_data: schemas.BlackoutDateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new blackout date/time slot block"""
    
    # Only barbers, admins, and owners can create blackouts
    if current_user.role not in ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create blackout dates"
        )
    
    try:
        # If user is a barber, set barber_id to their own ID
        if current_user.role == 'barber':
            blackout_data.barber_id = current_user.id
        
        blackout = BlackoutDateService.create_blackout_date(
            db=db,
            blackout_data=blackout_data,
            created_by_id=current_user.id
        )
        
        logger.info(f"Created blackout date {blackout.id} by user {current_user.id}")
        return blackout
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create blackout date: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create blackout date"
        )

@router.get("", response_model=List[schemas.BlackoutDateResponse])
async def get_blackout_dates(
    location_id: Optional[int] = None,
    barber_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    include_recurring: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get blackout dates based on filters"""
    
    try:
        # If user is a barber, only show their own blackouts
        if current_user.role == 'barber':
            barber_id = current_user.id
        
        blackouts = BlackoutDateService.get_blackout_dates(
            db=db,
            location_id=location_id,
            barber_id=barber_id,
            start_date=start_date,
            end_date=end_date,
            include_recurring=include_recurring
        )
        
        return blackouts
        
    except Exception as e:
        logger.error(f"Failed to get blackout dates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve blackout dates"
        )

@router.put("/{blackout_id}", response_model=schemas.BlackoutDateResponse)
async def update_blackout_date(
    blackout_id: int,
    update_data: schemas.BlackoutDateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update an existing blackout date"""
    
    try:
        blackout = BlackoutDateService.update_blackout_date(
            db=db,
            blackout_id=blackout_id,
            update_data=update_data,
            user_id=current_user.id
        )
        
        logger.info(f"Updated blackout date {blackout_id} by user {current_user.id}")
        return blackout
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update blackout date: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update blackout date"
        )

@router.delete("/{blackout_id}")
async def delete_blackout_date(
    blackout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete (deactivate) a blackout date"""
    
    try:
        success = BlackoutDateService.delete_blackout_date(
            db=db,
            blackout_id=blackout_id,
            user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blackout date not found"
            )
        
        logger.info(f"Deleted blackout date {blackout_id} by user {current_user.id}")
        return {"message": "Blackout date deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete blackout date: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete blackout date"
        )

@router.get("/{blackout_id}/impact")
async def get_blackout_impact(
    blackout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get impact report for a blackout date"""
    
    try:
        impact_report = BlackoutDateService.get_blackout_impact_report(
            db=db,
            blackout_id=blackout_id,
            user_id=current_user.id
        )
        
        return impact_report
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get blackout impact: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get blackout impact report"
        )

@router.post("/check")
async def check_slot_availability(
    check_date: date,
    check_time: Optional[str] = None,
    location_id: Optional[int] = None,
    barber_id: Optional[int] = None,
    duration_minutes: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Check if a specific date/time slot is blocked"""
    
    try:
        from datetime import time as dt_time
        
        parsed_time = None
        if check_time:
            hour, minute = map(int, check_time.split(':'))
            parsed_time = dt_time(hour, minute)
        
        is_blocked, blackout, reason = BlackoutDateService.is_date_time_blocked(
            db=db,
            check_date=check_date,
            check_time=parsed_time,
            location_id=location_id,
            barber_id=barber_id,
            duration_minutes=duration_minutes
        )
        
        return {
            "is_blocked": is_blocked,
            "reason": reason,
            "blackout_id": blackout.id if blackout else None
        }
        
    except Exception as e:
        logger.error(f"Failed to check slot availability: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check slot availability"
        )