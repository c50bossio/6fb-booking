"""
Meta Pixel and Conversions API tracking endpoints for BookedBarber V2
Handles server-side conversion tracking with privacy compliance and deduplication
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator

from db import get_db
from models.integration import Integration, IntegrationType
from models import User
from services.meta_business_service import meta_business_service
try:
    from auth.dependencies import get_current_user
except ImportError:
    from dependencies import get_current_user
try:
    from utils.rate_limiting import rate_limit
except ImportError:
    pass
    # Create a simple rate limit decorator if not available
    def rate_limit(calls: int, period: int):
        def decorator(func):
            return func
        return decorator

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tracking", tags=["meta-tracking"])

# Pydantic models for request/response
class UserDataModel(BaseModel):
    """User data for Meta Conversions API (will be hashed server-side)"""
    email: Optional[str] = Field(None, alias="em")
    phone: Optional[str] = Field(None, alias="ph")
    first_name: Optional[str] = Field(None, alias="fn")
    last_name: Optional[str] = Field(None, alias="ln")
    date_of_birth: Optional[str] = Field(None, alias="db")
    gender: Optional[str] = Field(None, alias="ge")
    city: Optional[str] = Field(None, alias="ct")
    state: Optional[str] = Field(None, alias="st")
    zip_code: Optional[str] = Field(None, alias="zp")
    country: Optional[str] = Field(None, alias="country")
    external_id: Optional[str] = Field(None, alias="external_id")
    client_ip_address: Optional[str] = Field(None, alias="client_ip_address")
    client_user_agent: Optional[str] = Field(None, alias="client_user_agent")
    fbc: Optional[str] = Field(None, alias="fbc")  # Facebook click ID
    fbp: Optional[str] = Field(None, alias="fbp")  # Facebook browser ID

    class Config:
        allow_population_by_field_name = True

class CustomDataModel(BaseModel):
    """Custom data for Meta conversion events"""
    currency: Optional[str] = "USD"
    value: Optional[float] = None
    content_ids: Optional[List[str]] = None
    content_type: Optional[str] = None
    content_name: Optional[str] = None
    content_category: Optional[str] = None
    num_items: Optional[int] = None
    order_id: Optional[str] = None
    predicted_ltv: Optional[float] = None
    search_string: Optional[str] = None
    status: Optional[bool] = None
    
    # Custom barbershop fields
    appointment_id: Optional[str] = None
    barber_id: Optional[str] = None
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    duration_minutes: Optional[int] = None
    location_id: Optional[str] = None
    user_role: Optional[str] = None
    payment_method: Optional[str] = None

class ConversionEventModel(BaseModel):
    """Single conversion event for Meta Conversions API"""
    event_name: str = Field(..., description="Name of the event (e.g., Purchase, Lead)")
    event_id: Optional[str] = Field(None, description="Unique event ID for deduplication")
    event_time: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_data: UserDataModel
    custom_data: Optional[CustomDataModel] = None
    action_source: str = Field(default="website", description="Source of the action")
    test_event_code: Optional[str] = Field(None, description="Test event code for debugging")

    @validator('event_time', pre=True)
    def parse_event_time(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                return datetime.now(timezone.utc)
        elif isinstance(v, (int, float)):
            return datetime.fromtimestamp(v, tz=timezone.utc)
        return v or datetime.now(timezone.utc)

class BatchConversionEventsModel(BaseModel):
    """Batch of conversion events"""
    events: List[ConversionEventModel] = Field(..., max_items=1000)
    test_event_code: Optional[str] = Field(None, description="Test event code for all events")

class ConversionEventResponse(BaseModel):
    """Response for conversion event tracking"""
    success: bool
    message: str
    event_id: Optional[str] = None
    events_processed: Optional[int] = None
    debug_info: Optional[Dict[str, Any]] = None

class MetaPixelConfigModel(BaseModel):
    """Meta Pixel configuration"""
    pixel_id: str
    app_id: Optional[str] = None
    debug_mode: bool = False
    test_event_code: Optional[str] = None

# Utility functions
def get_meta_integration(db: Session, user: User) -> Integration:
    """Get Meta Business integration for the current user"""
    integration = db.query(Integration).filter(
        Integration.user_id == user.id,
        Integration.integration_type == IntegrationType.META_BUSINESS,
        Integration.is_active == True
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=404,
            detail="Meta Business integration not found. Please connect your Meta Business account first."
        )
    
    return integration

def get_pixel_id_from_env_or_integration(integration: Integration) -> str:
    """Get Meta Pixel ID from environment or integration settings"""
    # First try environment variable
    pixel_id = os.getenv("META_PIXEL_ID")
    if pixel_id:
        return pixel_id
    
    # Then try integration settings
    if integration.settings and "pixel_id" in integration.settings:
        return integration.settings["pixel_id"]
    
    raise HTTPException(
        status_code=400,
        detail="Meta Pixel ID not configured. Please set META_PIXEL_ID environment variable or configure it in your Meta Business integration."
    )

def extract_client_info(request: Request) -> Dict[str, str]:
    """Extract client IP and user agent from request"""
    client_ip = request.client.host
    
    # Try to get real IP from headers (if behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        client_ip = real_ip
    
    user_agent = request.headers.get("User-Agent", "")
    
    return {
        "client_ip_address": client_ip,
        "client_user_agent": user_agent
    }

# Endpoints
@router.post(
    "/meta-conversions",
    response_model=ConversionEventResponse,
    summary="Send single conversion event to Meta",
    description="Send a single conversion event to Meta Conversions API for server-side tracking"
)
@rate_limit(calls=100, period=3600)  # 100 calls per hour
async def send_meta_conversion_event(
    event: ConversionEventModel,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a single conversion event to Meta Conversions API"""
    try:
        # Get Meta integration
        integration = get_meta_integration(db, current_user)
        
        # Get Pixel ID
        pixel_id = get_pixel_id_from_env_or_integration(integration)
        
        # Extract client information
        client_info = extract_client_info(request)
        
        # Merge client info with user data
        user_data_dict = event.user_data.dict(by_alias=True, exclude_none=True)
        user_data_dict.update(client_info)
        
        # Prepare custom data
        custom_data_dict = None
        if event.custom_data:
            custom_data_dict = event.custom_data.dict(exclude_none=True)
        
        # Get test event code
        test_event_code = event.test_event_code or os.getenv("META_TEST_EVENT_CODE")
        
        # Send conversion event
        result = await meta_business_service.send_conversion_event(
            integration=integration,
            pixel_id=pixel_id,
            event_name=event.event_name,
            event_time=event.event_time,
            user_data=user_data_dict,
            custom_data=custom_data_dict,
            event_id=event.event_id,
            action_source=event.action_source,
            test_event_code=test_event_code
        )
        
        # Log success
        logger.info(f"Meta conversion event sent successfully: {event.event_name} (User: {current_user.id})")
        
        # Return response
        response = ConversionEventResponse(
            success=True,
            message="Conversion event sent successfully",
            event_id=event.event_id
        )
        
        # Add debug info in debug mode
        if os.getenv("META_CONVERSIONS_API_DEBUG", "false").lower() == "true":
            response.debug_info = {
                "meta_response": result,
                "pixel_id": pixel_id,
                "event_name": event.event_name,
                "test_mode": bool(test_event_code)
            }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending Meta conversion event: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send conversion event: {str(e)}"
        )

@router.post(
    "/meta-conversions-batch",
    response_model=ConversionEventResponse,
    summary="Send batch of conversion events to Meta",
    description="Send multiple conversion events to Meta Conversions API in a single batch for better performance"
)
@rate_limit(calls=20, period=3600)  # 20 batch calls per hour
async def send_meta_conversion_events_batch(
    batch: BatchConversionEventsModel,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send multiple conversion events to Meta Conversions API in a batch"""
    try:
        # Validate batch size
        if len(batch.events) > 1000:
            raise HTTPException(
                status_code=400,
                detail="Batch size cannot exceed 1000 events"
            )
        
        # Get Meta integration
        integration = get_meta_integration(db, current_user)
        
        # Get Pixel ID
        pixel_id = get_pixel_id_from_env_or_integration(integration)
        
        # Extract client information
        client_info = extract_client_info(request)
        
        # Prepare events for batch processing
        processed_events = []
        for event in batch.events:
            # Merge client info with user data
            user_data_dict = event.user_data.dict(by_alias=True, exclude_none=True)
            user_data_dict.update(client_info)
            
            # Prepare custom data
            custom_data_dict = None
            if event.custom_data:
                custom_data_dict = event.custom_data.dict(exclude_none=True)
            
            processed_event = {
                "event_name": event.event_name,
                "event_time": event.event_time,
                "user_data": user_data_dict,
                "custom_data": custom_data_dict,
                "event_id": event.event_id,
                "action_source": event.action_source
            }
            processed_events.append(processed_event)
        
        # Get test event code
        test_event_code = batch.test_event_code or os.getenv("META_TEST_EVENT_CODE")
        
        # Send batch conversion events
        result = await meta_business_service.send_conversion_events_batch(
            integration=integration,
            pixel_id=pixel_id,
            events=processed_events,
            test_event_code=test_event_code
        )
        
        # Log success
        logger.info(f"Meta conversion events batch sent successfully: {len(batch.events)} events (User: {current_user.id})")
        
        # Return response
        response = ConversionEventResponse(
            success=True,
            message=f"Batch of {len(batch.events)} conversion events sent successfully",
            events_processed=len(batch.events)
        )
        
        # Add debug info in debug mode
        if os.getenv("META_CONVERSIONS_API_DEBUG", "false").lower() == "true":
            response.debug_info = {
                "meta_response": result,
                "pixel_id": pixel_id,
                "events_count": len(batch.events),
                "test_mode": bool(test_event_code)
            }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending Meta conversion events batch: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send conversion events batch: {str(e)}"
        )

@router.post(
    "/meta-validate",
    response_model=Dict[str, Any],
    summary="Validate Meta conversion event",
    description="Validate a conversion event using Meta's validation endpoint"
)
@rate_limit(calls=50, period=3600)  # 50 validation calls per hour
async def validate_meta_conversion_event(
    event: ConversionEventModel,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate a conversion event using Meta's validation endpoint"""
    try:
        # Get Meta integration
        integration = get_meta_integration(db, current_user)
        
        # Get Pixel ID
        pixel_id = get_pixel_id_from_env_or_integration(integration)
        
        # Extract client information
        client_info = extract_client_info(request)
        
        # Merge client info with user data
        user_data_dict = event.user_data.dict(by_alias=True, exclude_none=True)
        user_data_dict.update(client_info)
        
        # Prepare custom data
        custom_data_dict = None
        if event.custom_data:
            custom_data_dict = event.custom_data.dict(exclude_none=True)
        
        # Build event data for validation
        event_data = {
            "event_name": event.event_name,
            "event_time": int(event.event_time.timestamp()),
            "action_source": event.action_source,
            "user_data": user_data_dict,
        }
        
        if custom_data_dict:
            event_data["custom_data"] = custom_data_dict
        
        if event.event_id:
            event_data["event_id"] = event.event_id
        
        # Validate the event
        validation_result = await meta_business_service.validate_conversion_event(
            integration=integration,
            pixel_id=pixel_id,
            event_data=event_data
        )
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating Meta conversion event: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate conversion event: {str(e)}"
        )

@router.get(
    "/meta-config",
    response_model=MetaPixelConfigModel,
    summary="Get Meta Pixel configuration",
    description="Get Meta Pixel configuration for client-side tracking"
)
async def get_meta_pixel_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get Meta Pixel configuration for client-side tracking"""
    try:
        # Get Meta integration
        integration = get_meta_integration(db, current_user)
        
        # Get configuration from environment or integration
        pixel_id = get_pixel_id_from_env_or_integration(integration)
        app_id = os.getenv("META_APP_ID")
        debug_mode = os.getenv("META_PIXEL_DEBUG_MODE", "false").lower() == "true"
        test_event_code = os.getenv("META_TEST_EVENT_CODE")
        
        return MetaPixelConfigModel(
            pixel_id=pixel_id,
            app_id=app_id,
            debug_mode=debug_mode,
            test_event_code=test_event_code
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Meta Pixel config: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get Meta Pixel configuration: {str(e)}"
        )

@router.get(
    "/meta-debug",
    response_model=Dict[str, Any],
    summary="Get Meta tracking debug information",
    description="Get debug information for Meta Pixel and Conversions API (debug mode only)"
)
async def get_meta_debug_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get debug information for Meta tracking"""
    # Only allow in debug mode
    if os.getenv("META_CONVERSIONS_API_DEBUG", "false").lower() != "true":
        raise HTTPException(
            status_code=403,
            detail="Debug information only available in debug mode"
        )
    
    try:
        # Get Meta integration
        integration = get_meta_integration(db, current_user)
        
        # Get configuration
        pixel_id = get_pixel_id_from_env_or_integration(integration)
        
        # Test connection
        connection_test = await meta_business_service.test_connection(integration)
        
        return {
            "integration_id": integration.id,
            "integration_status": integration.status.value,
            "pixel_id": pixel_id,
            "app_id": os.getenv("META_APP_ID"),
            "debug_mode": True,
            "test_mode": os.getenv("META_TEST_MODE", "false").lower() == "true",
            "connection_test": connection_test,
            "environment_config": {
                "pixel_debug_mode": os.getenv("META_PIXEL_DEBUG_MODE"),
                "conversions_api_debug": os.getenv("META_CONVERSIONS_API_DEBUG"),
                "test_event_code": os.getenv("META_TEST_EVENT_CODE"),
                "enable_deduplication": os.getenv("META_ENABLE_DEDUPLICATION"),
                "batch_events": os.getenv("META_BATCH_EVENTS"),
                "api_rate_limit": os.getenv("META_API_RATE_LIMIT_PER_HOUR")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Meta debug info: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get debug information: {str(e)}"
        )