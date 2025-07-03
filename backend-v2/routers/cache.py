"""
API endpoints for cache management and monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date, datetime, timedelta

from database import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role
from services.cached_booking_service import cached_booking_service
from services.cache_health_service import cache_monitoring_service, cache_health_checker
from services.cache_invalidation_service import cache_invalidation_manager
import models

router = APIRouter(prefix="/api/v1/cache", tags=["cache"])

@router.get("/health")
async def get_cache_health(
    current_user: models.User = Depends(get_current_user)
):
    """Get current cache health status."""
    try:
        health_result = cache_health_checker.perform_health_check()
        
        return {
            "status": health_result.overall_status.value,
            "timestamp": health_result.timestamp,
            "duration_ms": health_result.duration_ms,
            "metrics": [
                {
                    "name": metric.name,
                    "value": metric.value,
                    "status": metric.status.value,
                    "threshold": metric.threshold,
                    "message": metric.message
                }
                for metric in health_result.metrics
            ],
            "summary": health_result.summary,
            "recommendations": health_result.recommendations
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache health: {str(e)}"
        )

@router.get("/stats")
async def get_cache_stats(
    current_user: models.User = Depends(require_admin_role)
):
    """Get detailed cache statistics."""
    try:
        return cached_booking_service.get_cache_health()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache stats: {str(e)}"
        )

@router.get("/monitoring/trends")
async def get_cache_trends(
    hours: int = Query(24, ge=1, le=168, description="Number of hours to look back"),
    current_user: models.User = Depends(require_admin_role)
):
    """Get cache health trends over specified time period."""
    try:
        trends = cache_monitoring_service.get_health_trends(hours)
        return trends
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache trends: {str(e)}"
        )

@router.get("/monitoring/utilization")
async def get_cache_utilization(
    current_user: models.User = Depends(require_admin_role)
):
    """Get cache utilization metrics."""
    try:
        utilization = cache_monitoring_service.get_cache_utilization()
        return utilization
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache utilization: {str(e)}"
        )

@router.get("/monitoring/report")
async def generate_cache_report(
    current_user: models.User = Depends(require_admin_role)
):
    """Generate comprehensive cache health report."""
    try:
        report = cache_monitoring_service.generate_health_report()
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cache report: {str(e)}"
        )

@router.post("/warm-up")
async def warm_up_cache(
    start_date: date = Query(..., description="Start date for cache warm-up"),
    end_date: date = Query(..., description="End date for cache warm-up"),
    barber_ids: Optional[List[int]] = Query(None, description="Specific barber IDs to warm up"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin_role)
):
    """Warm up cache for specified date range and barbers."""
    try:
        # Validate date range
        if end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be after start date"
            )
        
        # Limit date range to prevent abuse
        max_days = 30
        if (end_date - start_date).days > max_days:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Date range cannot exceed {max_days} days"
            )
        
        # Validate barber IDs if provided
        if barber_ids:
            existing_barbers = db.query(models.User).filter(
                models.User.id.in_(barber_ids),
                models.User.role.in_(["barber", "admin", "super_admin"]),
                models.User.is_active == True
            ).all()
            
            if len(existing_barbers) != len(barber_ids):
                invalid_ids = set(barber_ids) - {b.id for b in existing_barbers}
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid barber IDs: {list(invalid_ids)}"
                )
        
        # Perform cache warm-up
        stats = cached_booking_service.warm_up_cache_for_date_range(
            db, start_date, end_date, barber_ids
        )
        
        return {
            "message": "Cache warm-up completed",
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days + 1
            },
            "barber_ids": barber_ids,
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cache warm-up failed: {str(e)}"
        )

@router.post("/invalidate/all-slots")
async def invalidate_all_slots(
    current_user: models.User = Depends(require_admin_role)
):
    """Invalidate all slot-related cache entries."""
    try:
        deleted_count = cache_invalidation_manager.invalidate_all_slots()
        
        return {
            "message": "All slot caches invalidated",
            "deleted_keys": deleted_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate slot caches: {str(e)}"
        )

@router.post("/invalidate/barber/{barber_id}")
async def invalidate_barber_cache(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin_role)
):
    """Invalidate all cache entries for a specific barber."""
    try:
        # Verify barber exists
        barber = db.query(models.User).filter(
            models.User.id == barber_id,
            models.User.role.in_(["barber", "admin", "super_admin"])
        ).first()
        
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Barber with ID {barber_id} not found"
            )
        
        deleted_count = cached_booking_service.invalidate_cache_for_barber(barber_id)
        
        return {
            "message": f"Cache invalidated for barber {barber.name}",
            "barber_id": barber_id,
            "barber_name": barber.name,
            "deleted_keys": deleted_count,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate barber cache: {str(e)}"
        )

@router.post("/invalidate/date-range")
async def invalidate_date_range_cache(
    start_date: date = Query(..., description="Start date for cache invalidation"),
    end_date: date = Query(..., description="End date for cache invalidation"),
    current_user: models.User = Depends(require_admin_role)
):
    """Invalidate cache entries for a date range."""
    try:
        # Validate date range
        if end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be after start date"
            )
        
        # Limit date range to prevent abuse
        max_days = 90
        if (end_date - start_date).days > max_days:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Date range cannot exceed {max_days} days"
            )
        
        deleted_count = cached_booking_service.invalidate_cache_for_date_range(start_date, end_date)
        
        return {
            "message": "Cache invalidated for date range",
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": (end_date - start_date).days + 1
            },
            "deleted_keys": deleted_count,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate date range cache: {str(e)}"
        )

@router.post("/invalidate/business-settings")
async def invalidate_business_settings_cache(
    current_user: models.User = Depends(require_admin_role)
):
    """Invalidate business settings cache."""
    try:
        deleted_count = cache_invalidation_manager.invalidate_business_settings()
        
        return {
            "message": "Business settings cache invalidated",
            "deleted_keys": deleted_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate business settings cache: {str(e)}"
        )

@router.post("/preload")
async def preload_common_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin_role)
):
    """Preload commonly accessed data into cache."""
    try:
        results = cached_booking_service.preload_common_data(db)
        
        return {
            "message": "Common data preloaded",
            "results": results,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preload common data: {str(e)}"
        )

@router.get("/keys/summary")
async def get_cache_keys_summary(
    current_user: models.User = Depends(require_admin_role)
):
    """Get summary of cache key patterns and what they're used for."""
    try:
        summary = cache_invalidation_manager.get_invalidation_summary()
        
        # Add key pattern descriptions
        key_descriptions = {
            "slots": "Available time slots for booking",
            "barber_avail": "Barber availability schedules",
            "business_hours": "Business hours configuration",
            "user_tz": "User timezone preferences",
            "booking_settings": "Booking system settings",
            "next_avail": "Next available slot lookups",
            "barber_schedule": "Barber schedule data",
            "appt_conflicts": "Appointment conflict checks"
        }
        
        return {
            "key_descriptions": key_descriptions,
            "invalidation_patterns": summary,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache keys summary: {str(e)}"
        )

@router.get("/availability")
async def check_cache_availability():
    """Check if caching is available (public endpoint for health checks)."""
    try:
        is_available = cached_booking_service.cache.is_available()
        
        return {
            "cache_available": is_available,
            "redis_connection": cached_booking_service.cache.cache.redis_manager.is_available(),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "cache_available": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )