"""
Trial monitoring API endpoints.

These endpoints handle trial expiration monitoring and notifications.
Designed to be called by cron jobs or background tasks.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
import logging

from db import get_db
from services.trial_monitoring_service import TrialMonitoringService
from utils.auth import get_current_user
from models import User
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trial-monitoring", tags=["trial-monitoring"])


def verify_cron_token(x_cron_token: Optional[str] = Header(None)):
    """
    Verify cron job token for automated trial monitoring.
    
    This prevents unauthorized access to trial monitoring endpoints.
    """
    expected_token = getattr(settings, 'cron_token', 'dev-cron-token')
    
    if not x_cron_token or x_cron_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing cron token"
        )
    return True


@router.post("/send-expiration-warnings")
async def send_expiration_warnings(
    days_ahead: int = 3,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_cron_token)
):
    """
    Send trial expiration warnings to organizations.
    
    This endpoint is designed to be called by a cron job daily.
    
    Args:
        days_ahead: Send warnings for trials expiring within this many days
    """
    try:
        monitoring_service = TrialMonitoringService(db)
        result = monitoring_service.send_expiration_warnings(days_ahead)
        
        logger.info(f"Trial expiration warnings processed: {result}")
        
        return {
            "success": True,
            "message": f"Processed {result['total_trials_expiring']} expiring trials",
            "details": result
        }
        
    except Exception as e:
        logger.error(f"Failed to send trial expiration warnings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process trial warnings: {str(e)}"
        )


@router.post("/process-expired-trials")
async def process_expired_trials(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_cron_token)
):
    """
    Process expired trials by updating status and sending notifications.
    
    This endpoint is designed to be called by a cron job daily.
    """
    try:
        monitoring_service = TrialMonitoringService(db)
        result = monitoring_service.process_expired_trials()
        
        logger.info(f"Expired trials processed: {result}")
        
        return {
            "success": True,
            "message": f"Processed {result['total_trials_expired']} expired trials",
            "details": result
        }
        
    except Exception as e:
        logger.error(f"Failed to process expired trials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process expired trials: {str(e)}"
        )


@router.get("/statistics")
async def get_trial_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get trial usage statistics across the platform.
    
    Requires admin access.
    """
    # Check if user is admin
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        monitoring_service = TrialMonitoringService(db)
        stats = monitoring_service.get_trial_statistics()
        
        return {
            "success": True,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get trial statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trial statistics: {str(e)}"
        )


@router.get("/expiring-soon")
async def get_trials_expiring_soon(
    days_ahead: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of trials expiring soon.
    
    Requires admin access.
    """
    # Check if user is admin
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        monitoring_service = TrialMonitoringService(db)
        trials = monitoring_service.get_trials_expiring_soon(days_ahead)
        
        # Format response to avoid circular references
        formatted_trials = []
        for trial in trials:
            formatted_trials.append({
                "organization_id": trial['organization'].id,
                "organization_name": trial['organization'].name,
                "owner_email": trial['owner'].email,
                "owner_name": trial['owner'].name,
                "days_remaining": trial['days_remaining'],
                "chairs_count": trial['organization'].chairs_count,
                "expires_at": trial['organization'].subscription_expires_at.isoformat() if trial['organization'].subscription_expires_at else None
            })
        
        return {
            "success": True,
            "trials_expiring_soon": formatted_trials,
            "total_count": len(formatted_trials)
        }
        
    except Exception as e:
        logger.error(f"Failed to get expiring trials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get expiring trials: {str(e)}"
        )


@router.get("/expired")
async def get_expired_trials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of expired trials.
    
    Requires admin access.
    """
    # Check if user is admin
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        monitoring_service = TrialMonitoringService(db)
        trials = monitoring_service.get_expired_trials()
        
        # Format response to avoid circular references
        formatted_trials = []
        for trial in trials:
            formatted_trials.append({
                "organization_id": trial['organization'].id,
                "organization_name": trial['organization'].name,
                "owner_email": trial['owner'].email,
                "owner_name": trial['owner'].name,
                "expired_date": trial['expired_date'].isoformat() if trial['expired_date'] else None,
                "chairs_count": trial['organization'].chairs_count
            })
        
        return {
            "success": True,
            "expired_trials": formatted_trials,
            "total_count": len(formatted_trials)
        }
        
    except Exception as e:
        logger.error(f"Failed to get expired trials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get expired trials: {str(e)}"
        )