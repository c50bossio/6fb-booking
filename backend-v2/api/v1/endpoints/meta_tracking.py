"""
Meta tracking API endpoints for BookedBarber V2.
Integrates Meta Business API, Conversions API, and deduplication services.
Provides endpoints for frontend Meta tracking hooks and admin management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from database import get_db
from dependencies import get_current_user
from models import User
from models.integration import Integration, IntegrationType
from services.meta_business_service import MetaBusinessService
from services.meta_deduplication_service import MetaDeduplicationService
from services.conversion_tracking_service import ConversionTrackingService
from utils.rate_limiter import RateLimiter
from utils.logging_config import get_audit_logger
import logging

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()

router = APIRouter(
    prefix="/meta",
    tags=["meta-tracking"],
    responses={404: {"description": "Not found"}},
)

# Initialize services
meta_business_service = MetaBusinessService()
deduplication_service = MetaDeduplicationService()
conversion_tracking_service = ConversionTrackingService()
rate_limiter = RateLimiter(requests_per_minute=200)  # Higher limit for tracking


# Pydantic models for Meta tracking endpoints

class MetaUserData(BaseModel):
    """User data for Meta Conversions API"""
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    external_id: Optional[str] = None
    fb_login_id: Optional[str] = None
    lead_id: Optional[str] = None
    fbp: Optional[str] = None  # Facebook browser ID
    fbc: Optional[str] = None  # Facebook click ID


class MetaCustomData(BaseModel):
    """Custom data for Meta conversion events"""
    value: Optional[float] = None
    currency: Optional[str] = "USD"
    content_name: Optional[str] = None
    content_category: Optional[str] = None
    content_ids: Optional[List[str]] = None
    content_type: Optional[str] = None
    order_id: Optional[str] = None
    predicted_ltv: Optional[float] = None
    num_items: Optional[int] = None
    search_string: Optional[str] = None
    status: Optional[str] = None
    item_number: Optional[str] = None
    delivery_category: Optional[str] = None
    custom_properties: Optional[Dict[str, Any]] = None


class MetaConversionEvent(BaseModel):
    """Meta conversion event data"""
    event_name: str = Field(..., description="Standard Meta event name (e.g., 'Purchase', 'Lead', 'CompleteRegistration')")
    event_id: str = Field(..., description="Unique event ID for deduplication")
    event_time: int = Field(..., description="Unix timestamp of the event")
    user_data: MetaUserData
    custom_data: MetaCustomData
    action_source: str = Field(default="website", description="Source of the action")
    event_source_url: Optional[str] = None
    opt_out: Optional[bool] = False
    test_event_code: Optional[str] = None


class MetaBatchEventsRequest(BaseModel):
    """Batch Meta conversion events request"""
    events: List[MetaConversionEvent] = Field(..., max_items=1000)
    test_event_code: Optional[str] = None


class MetaTrackingResponse(BaseModel):
    """Meta tracking API response"""
    success: bool
    events_received: int
    events_processed: int
    events_skipped: int
    messages: List[str] = []
    diagnostics: Optional[Dict[str, Any]] = None


class MetaDiagnosticsResponse(BaseModel):
    """Meta integration diagnostics response"""
    pixel_configured: bool
    conversions_api_configured: bool
    business_api_configured: bool
    deduplication_enabled: bool
    integration_status: str
    last_event_time: Optional[datetime] = None
    events_last_24h: int
    deduplication_stats: Dict[str, Any]
    pixel_id: Optional[str] = None
    ad_account_id: Optional[str] = None


# API Endpoints

@router.post("/conversions", response_model=MetaTrackingResponse)
async def track_meta_conversion(
    event: MetaConversionEvent,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track a single Meta conversion event via Conversions API.
    Handles deduplication and integrates with existing tracking system.
    """
    # Rate limiting
    await rate_limiter.check_rate_limit(request, str(current_user.id))
    
    try:
        # Get user's Meta integration
        integration = db.query(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.integration_type == IntegrationType.META_BUSINESS
        ).first()
        
        if not integration or not integration.is_active:
            # Log for admin visibility but don't fail - allow pixel-only tracking
            logger.info(f"Meta Conversions API not configured for user {current_user.id}, using pixel-only tracking")
            
            # Track in unified system for analytics
            background_tasks.add_task(
                _track_in_unified_system,
                current_user.id,
                event.dict(),
                "meta_pixel_only"
            )
            
            return MetaTrackingResponse(
                success=True,
                events_received=1,
                events_processed=0,
                events_skipped=1,
                messages=["Meta Conversions API not configured, relying on client-side tracking"]
            )
        
        # Check for event deduplication
        deduplication_result = None
        if deduplication_service.deduplication_enabled:
            deduplication_result = deduplication_service.check_and_record_event(
                event_id=event.event_id,
                event_name=event.event_name,
                user_data=event.user_data.dict(),
                custom_data=event.custom_data.dict(),
                user_id=current_user.id,
                source="conversions_api"
            )
            
            if deduplication_result and deduplication_result.get("is_duplicate"):
                logger.info(f"Skipping duplicate Meta event {event.event_id} for user {current_user.id}")
                return MetaTrackingResponse(
                    success=True,
                    events_received=1,
                    events_processed=0,
                    events_skipped=1,
                    messages=["Event skipped due to deduplication"]
                )
        
        # Send to Meta Conversions API
        conversion_result = await meta_business_service.send_conversion_event(
            integration=integration,
            event_data=event.dict()
        )
        
        # Track in unified conversion tracking system
        background_tasks.add_task(
            _track_in_unified_system,
            current_user.id,
            event.dict(),
            "meta_conversions_api"
        )
        
        # Log successful tracking
        logger.info(f"Successfully tracked Meta conversion event {event.event_id} for user {current_user.id}")
        
        return MetaTrackingResponse(
            success=True,
            events_received=1,
            events_processed=1,
            events_skipped=0,
            messages=["Event successfully tracked"],
            diagnostics=conversion_result if meta_business_service.debug_mode else None
        )
        
    except Exception as e:
        logger.error(f"Error tracking Meta conversion event: {str(e)}")
        
        # Log failed tracking
        logger.error(f"Failed to track Meta conversion event {event.event_id} for user {current_user.id}: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track Meta conversion: {str(e)}"
        )


@router.post("/conversions-batch", response_model=MetaTrackingResponse)
async def track_meta_conversions_batch(
    batch_request: MetaBatchEventsRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track multiple Meta conversion events in batch via Conversions API.
    More efficient for high-volume tracking with deduplication support.
    """
    # Rate limiting (count as multiple requests based on batch size)
    await rate_limiter.check_rate_limit(request, str(current_user.id), count=len(batch_request.events))
    
    if not batch_request.events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No events provided in batch"
        )
    
    if len(batch_request.events) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size too large (max 1000 events)"
        )
    
    try:
        # Get user's Meta integration
        integration = db.query(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.integration_type == IntegrationType.META_BUSINESS
        ).first()
        
        events_processed = 0
        events_skipped = 0
        events_received = len(batch_request.events)
        messages = []
        
        if not integration or not integration.is_active:
            logger.info(f"Meta Conversions API not configured for user {current_user.id}, batch tracking via pixel only")
            
            # Track all events in unified system for analytics
            for event in batch_request.events:
                background_tasks.add_task(
                    _track_in_unified_system,
                    current_user.id,
                    event.dict(),
                    "meta_pixel_only"
                )
            
            return MetaTrackingResponse(
                success=True,
                events_received=events_received,
                events_processed=0,
                events_skipped=events_received,
                messages=["Meta Conversions API not configured, relying on client-side tracking"]
            )
        
        # Process events with deduplication
        valid_events = []
        
        for event in batch_request.events:
            # Check for deduplication
            if deduplication_service.deduplication_enabled:
                deduplication_result = deduplication_service.check_and_record_event(
                    event_id=event.event_id,
                    event_name=event.event_name,
                    user_data=event.user_data.dict(),
                    custom_data=event.custom_data.dict(),
                    user_id=current_user.id,
                    source="conversions_api"
                )
                
                if deduplication_result and deduplication_result.get("is_duplicate"):
                    events_skipped += 1
                    continue
            
            valid_events.append(event)
        
        # Send batch to Meta Conversions API
        if valid_events:
            batch_data = {
                "events": [event.dict() for event in valid_events],
                "test_event_code": batch_request.test_event_code
            }
            
            conversion_result = await meta_business_service.send_conversion_events_batch(
                integration=integration,
                batch_data=batch_data
            )
            
            events_processed = len(valid_events)
            
            # Track each event in unified system
            for event in valid_events:
                background_tasks.add_task(
                    _track_in_unified_system,
                    current_user.id,
                    event.dict(),
                    "meta_conversions_api"
                )
        
        # Log batch tracking
        logger.info(f"Processed Meta conversion batch for user {current_user.id}: {events_processed} processed, {events_skipped} skipped")
        
        return MetaTrackingResponse(
            success=True,
            events_received=events_received,
            events_processed=events_processed,
            events_skipped=events_skipped,
            messages=[f"Processed {events_processed} events, skipped {events_skipped} duplicates"]
        )
        
    except Exception as e:
        logger.error(f"Error tracking Meta conversion batch: {str(e)}")
        
        # Log failed batch tracking
        logger.error(f"Failed to process Meta conversion batch for user {current_user.id}: {str(e)}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track Meta conversion batch: {str(e)}"
        )


@router.get("/diagnostics", response_model=MetaDiagnosticsResponse)
async def get_meta_diagnostics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive Meta tracking integration diagnostics.
    Shows configuration status, recent activity, and deduplication stats.
    """
    try:
        # Check Meta Business integration
        integration = db.query(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.integration_type == IntegrationType.META_BUSINESS
        ).first()
        
        # Get organization for pixel configuration
        from models.organization import Organization
        org = db.query(Organization).filter(Organization.owner_id == current_user.id).first()
        
        # Get deduplication stats
        dedup_stats = {}
        if deduplication_service.deduplication_enabled:
            try:
                dedup_stats = deduplication_service.get_deduplication_stats(
                    user_id=current_user.id,
                    days=7
                )
            except Exception as e:
                logger.warning(f"Failed to get deduplication stats: {e}")
                dedup_stats = {"error": "Could not retrieve stats"}
        
        # Get recent tracking activity
        from models.tracking import ConversionEvent
        recent_events = db.query(ConversionEvent).filter(
            ConversionEvent.user_id == current_user.id,
            ConversionEvent.created_at >= datetime.utcnow() - timedelta(hours=24),
            ConversionEvent.platform == "meta"
        ).count()
        
        last_event = db.query(ConversionEvent).filter(
            ConversionEvent.user_id == current_user.id,
            ConversionEvent.platform == "meta"
        ).order_by(ConversionEvent.created_at.desc()).first()
        
        # Determine overall integration status
        pixel_configured = bool(org and org.meta_pixel_id)
        conversions_api_configured = bool(integration and integration.is_active)
        business_api_configured = bool(integration and integration.configuration.get("access_token"))
        
        if pixel_configured and conversions_api_configured:
            integration_status = "fully_configured"
        elif pixel_configured or conversions_api_configured:
            integration_status = "partially_configured"
        else:
            integration_status = "not_configured"
        
        return MetaDiagnosticsResponse(
            pixel_configured=pixel_configured,
            conversions_api_configured=conversions_api_configured,
            business_api_configured=business_api_configured,
            deduplication_enabled=deduplication_service.deduplication_enabled,
            integration_status=integration_status,
            last_event_time=last_event.created_at if last_event else None,
            events_last_24h=recent_events,
            deduplication_stats=dedup_stats,
            pixel_id=org.meta_pixel_id if org else None,
            ad_account_id=integration.configuration.get("ad_account_id") if integration else None
        )
        
    except Exception as e:
        logger.error(f"Error getting Meta diagnostics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Meta diagnostics: {str(e)}"
        )


@router.get("/deduplication-stats")
async def get_deduplication_stats(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed Meta event deduplication statistics.
    Shows client-side vs server-side tracking effectiveness.
    """
    if not deduplication_service.deduplication_enabled:
        return {
            "enabled": False,
            "message": "Deduplication not enabled"
        }
    
    try:
        stats = deduplication_service.get_deduplication_stats(
            user_id=current_user.id,
            days=days
        )
        
        return {
            "enabled": True,
            "period_days": days,
            **stats
        }
        
    except Exception as e:
        logger.error(f"Error getting deduplication stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get deduplication stats: {str(e)}"
        )


@router.post("/validate-event")
async def validate_meta_event(
    event: MetaConversionEvent,
    current_user: User = Depends(get_current_user)
):
    """
    Validate Meta conversion event structure without sending it.
    Useful for testing and debugging event tracking.
    """
    try:
        # Validate event structure
        validation_result = {
            "valid": True,
            "event_name": event.event_name,
            "event_id": event.event_id,
            "warnings": [],
            "recommendations": []
        }
        
        # Check event name
        standard_events = [
            "PageView", "ViewContent", "Search", "AddToCart", "AddToWishlist",
            "InitiateCheckout", "AddPaymentInfo", "Purchase", "Lead", "CompleteRegistration",
            "Subscribe", "StartTrial", "Contact", "CustomizeProduct", "Donate",
            "FindLocation", "Schedule", "SubmitApplication", "Achievement"
        ]
        
        if event.event_name not in standard_events:
            validation_result["warnings"].append(f"'{event.event_name}' is not a standard Meta event")
        
        # Check required fields for Purchase events
        if event.event_name == "Purchase":
            if not event.custom_data.value:
                validation_result["warnings"].append("Purchase events should include a value")
            if not event.custom_data.currency:
                validation_result["warnings"].append("Purchase events should specify currency")
            if not event.custom_data.order_id:
                validation_result["recommendations"].append("Consider adding order_id for better tracking")
        
        # Check user data completeness
        user_data_fields = [f for f, v in event.user_data.dict().items() if v is not None]
        if len(user_data_fields) < 2:
            validation_result["recommendations"].append("More user data fields improve matching accuracy")
        
        # Check event ID format
        if not event.event_id.startswith(deduplication_service.event_id_prefix):
            validation_result["recommendations"].append(
                f"Event IDs should start with '{deduplication_service.event_id_prefix}' for consistency"
            )
        
        return validation_result
        
    except Exception as e:
        logger.error(f"Error validating Meta event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate event: {str(e)}"
        )


# Helper functions

async def _track_in_unified_system(user_id: int, event_data: dict, source: str):
    """Track event in unified conversion tracking system"""
    try:
        from database import get_db
        db = next(get_db())
        
        # Create conversion event record
        from models.tracking import ConversionEvent
        conversion_event = ConversionEvent(
            user_id=user_id,
            event_name=event_data["event_name"],
            event_id=event_data["event_id"],
            platform="meta",
            source=source,
            value=event_data.get("custom_data", {}).get("value"),
            currency=event_data.get("custom_data", {}).get("currency", "USD"),
            properties=event_data,
            created_at=datetime.utcnow()
        )
        
        db.add(conversion_event)
        db.commit()
        
    except Exception as e:
        logger.error(f"Failed to track in unified system: {e}")
    finally:
        if 'db' in locals():
            db.close()