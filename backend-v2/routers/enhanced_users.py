"""
Enhanced user management API with comprehensive timezone support.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging

import models
import schemas
from db import get_db
from dependencies import get_current_user
from services.timezone_service import timezone_service
from utils.timezone import validate_timezone, get_common_timezones

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users", "timezone"])


@router.get("/me/timezone", response_model=schemas.TimezoneInfo)
def get_my_timezone(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's timezone information."""
    
    user_timezone = timezone_service.get_user_timezone(current_user)
    timezone_info = timezone_service.get_timezone_info(user_timezone)
    
    return schemas.TimezoneInfo(
        name=timezone_info['timezone_name'],
        offset=timezone_info['current_offset'],
        display_name=timezone_info['display_name']
    )


@router.put("/me/timezone")
def update_my_timezone(
    timezone_request: schemas.TimezoneUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's timezone preference."""
    
    # Validate timezone
    if not validate_timezone(timezone_request.timezone):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timezone: {timezone_request.timezone}"
        )
    
    # Check if timezone is allowed by business settings
    if not timezone_service.is_timezone_allowed(db, timezone_request.timezone):
        raise HTTPException(
            status_code=400,
            detail=f"Timezone {timezone_request.timezone} is not allowed by business settings"
        )
    
    # Update user timezone
    success = timezone_service.update_user_timezone(
        db=db,
        user_id=current_user.id,
        timezone_str=timezone_request.timezone,
        auto_detected=getattr(timezone_request, 'auto_detected', False)
    )
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to update timezone preference"
        )
    
    return {"message": "Timezone updated successfully"}


@router.post("/me/timezone/detect")
def detect_and_set_timezone(
    timezone_request: schemas.TimezoneDetectionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Auto-detect and set user timezone from browser."""
    
    detected_timezone = timezone_request.detected_timezone
    
    # Validate detected timezone
    if not validate_timezone(detected_timezone):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid detected timezone: {detected_timezone}"
        )
    
    # Check if auto-detection is enabled for this user
    if hasattr(current_user, 'auto_detect_timezone') and not current_user.auto_detect_timezone:
        raise HTTPException(
            status_code=400,
            detail="Timezone auto-detection is disabled for this user"
        )
    
    # Check if timezone is allowed
    if not timezone_service.is_timezone_allowed(db, detected_timezone):
        # If detected timezone is not allowed, suggest the closest allowed timezone
        common_timezones = get_common_timezones()
        timezone_info = timezone_service.get_timezone_info(detected_timezone)
        
        # Find timezone with similar offset
        current_offset = timezone_info['current_offset']
        closest_timezone = None
        
        for tz in common_timezones:
            if timezone_service.is_timezone_allowed(db, tz):
                tz_info = timezone_service.get_timezone_info(tz)
                if tz_info['current_offset'] == current_offset:
                    closest_timezone = tz
                    break
        
        if closest_timezone:
            return {
                "detected_timezone": detected_timezone,
                "suggested_timezone": closest_timezone,
                "message": f"Detected timezone {detected_timezone} is not allowed. Consider using {closest_timezone} instead."
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Detected timezone {detected_timezone} is not allowed and no suitable alternative found"
            )
    
    # Update user timezone with auto-detected flag
    success = timezone_service.update_user_timezone(
        db=db,
        user_id=current_user.id,
        timezone_str=detected_timezone,
        auto_detected=True
    )
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to set detected timezone"
        )
    
    timezone_info = timezone_service.get_timezone_info(detected_timezone)
    
    return {
        "timezone": detected_timezone,
        "display_name": timezone_info['display_name'],
        "offset": timezone_info['current_offset'],
        "auto_detected": True,
        "message": "Timezone auto-detected and set successfully"
    }


@router.get("/me/timezone/business-hours")
def get_business_hours_in_my_timezone(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get business hours converted to user's timezone."""
    
    from datetime import date as date_obj, datetime
    
    # Parse date or use today
    target_date = date_obj.today()
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    user_timezone = timezone_service.get_user_timezone(current_user)
    business_start, business_end = timezone_service.get_business_hours_in_timezone(
        db=db,
        target_timezone=user_timezone,
        location_id=getattr(current_user, 'location_id', None),
        date_obj=target_date
    )
    
    if not business_start or not business_end:
        raise HTTPException(
            status_code=404,
            detail="Business hours not configured"
        )
    
    return {
        "date": target_date.isoformat(),
        "business_hours": {
            "start": business_start.strftime("%H:%M"),
            "end": business_end.strftime("%H:%M"),
            "start_datetime": business_start.isoformat(),
            "end_datetime": business_end.isoformat()
        },
        "timezone": user_timezone,
        "timezone_info": timezone_service.get_timezone_info(user_timezone)
    }


@router.get("/me/timezone/conversion-log")
def get_my_timezone_conversions(
    limit: int = Query(50, ge=1, le=100, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    conversion_type: Optional[str] = Query(None, description="Filter by conversion type"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get user's timezone conversion log for debugging."""
    
    query = db.query(models.TimezoneConversionLog).filter(
        models.TimezoneConversionLog.user_id == current_user.id
    )
    
    if conversion_type:
        query = query.filter(models.TimezoneConversionLog.conversion_type == conversion_type)
    
    total = query.count()
    conversions = query.order_by(
        models.TimezoneConversionLog.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return {
        "conversions": [
            {
                "id": conv.id,
                "source_timezone": conv.source_timezone,
                "target_timezone": conv.target_timezone,
                "source_datetime": conv.source_datetime.isoformat(),
                "target_datetime": conv.target_datetime.isoformat(),
                "conversion_type": conv.conversion_type,
                "appointment_id": conv.appointment_id,
                "context": conv.context,
                "created_at": conv.created_at.isoformat()
            }
            for conv in conversions
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/timezone/allowed")
def get_allowed_timezones(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get list of timezones allowed by business settings."""
    
    try:
        settings = db.query(models.BookingSettings).filter(
            models.BookingSettings.business_id == 1
        ).first()
        
        if not settings or not hasattr(settings, 'allowed_timezones') or not settings.allowed_timezones:
            # Return all common timezones if no restrictions
            common_timezones = get_common_timezones()
            timezone_infos = [timezone_service.get_timezone_info(tz) for tz in common_timezones]
        else:
            allowed_timezones = settings.allowed_timezones
            if isinstance(allowed_timezones, str):
                import json
                allowed_timezones = json.loads(allowed_timezones)
            
            timezone_infos = [timezone_service.get_timezone_info(tz) for tz in allowed_timezones]
        
        return {
            "allowed_timezones": [
                {
                    "name": info['timezone_name'],
                    "display_name": info['display_name'],
                    "offset": info['current_offset'],
                    "region": info['region'],
                    "is_common": info['is_common']
                }
                for info in timezone_infos
            ],
            "auto_detect_enabled": getattr(settings, 'timezone_auto_detect', True) if settings else True
        }
        
    except Exception as e:
        logger.error(f"Failed to get allowed timezones: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get allowed timezones"
        )


@router.post("/timezone/sync-cache")
def sync_timezone_cache(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Sync timezone cache (admin only)."""
    
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    success = timezone_service.sync_timezone_cache(db)
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to sync timezone cache"
        )
    
    return {"message": "Timezone cache synchronized successfully"}


@router.get("/timezone/cache")
def get_timezone_cache(
    search: Optional[str] = Query(None, description="Search timezone names"),
    region: Optional[str] = Query(None, description="Filter by region"),
    is_common: Optional[bool] = Query(None, description="Filter by common timezones"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get cached timezone information."""
    
    query = db.query(models.TimezoneCache)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            models.TimezoneCache.timezone_name.ilike(search_term) |
            models.TimezoneCache.display_name.ilike(search_term)
        )
    
    if region:
        query = query.filter(models.TimezoneCache.region == region)
    
    if is_common is not None:
        query = query.filter(models.TimezoneCache.is_common == is_common)
    
    total = query.count()
    timezones = query.order_by(
        models.TimezoneCache.region,
        models.TimezoneCache.timezone_name
    ).offset(offset).limit(limit).all()
    
    return {
        "timezones": [
            {
                "timezone_name": tz.timezone_name,
                "display_name": tz.display_name,
                "utc_offset": tz.utc_offset,
                "dst_offset": tz.dst_offset,
                "is_dst_active": tz.is_dst_active,
                "is_common": tz.is_common,
                "region": tz.region,
                "country": tz.country,
                "last_updated": tz.last_updated.isoformat()
            }
            for tz in timezones
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }