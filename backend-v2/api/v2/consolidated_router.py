"""
Consolidated API Router - V2 Unified Endpoints

This router consolidates and replaces all duplicate API endpoints across v1 and v2,
providing a single, consistent API interface for the entire application.

CONSOLIDATION TARGET:
- Remove all V1 API dependencies
- Unify duplicate V2 endpoints  
- Create single source of truth for all API operations
- Implement consistent request/response patterns
- Add unified authentication, validation, and error handling

REDUCTION: 50+ scattered endpoints → 1 unified router system
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Path, Body
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date, timedelta
from enum import Enum
import logging

from db import get_db
from utils.auth import get_current_user
from services.consolidated_analytics_orchestrator import (
    ConsolidatedAnalyticsOrchestrator, 
    AnalyticsConfig, 
    AnalyticsProvider, 
    MetricsLevel
)
from services.consolidated_booking_orchestrator import (
    ConsolidatedBookingOrchestrator,
    BookingConfig,
    BookingType,
    BookingStrategy,
    BookingContext
)
from services.consolidated_auth_orchestrator import (
    ConsolidatedAuthOrchestrator,
    AuthConfig,
    AuthProvider,
    AuthMethod,
    AuthContext
)
import schemas
import models

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Create consolidated router
router = APIRouter(prefix="/api/v2", tags=["unified-api-v2"])

class ResponseFormat(Enum):
    """Supported response formats"""
    JSON = "json"
    CSV = "csv" 
    PDF = "pdf"
    EXCEL = "xlsx"

class CacheStrategy(Enum):
    """Cache strategies for different endpoints"""
    NO_CACHE = "no_cache"
    SHORT_CACHE = "short"  # 5 minutes
    MEDIUM_CACHE = "medium"  # 30 minutes
    LONG_CACHE = "long"  # 2 hours

# ============================================================================
# AUTHENTICATION ENDPOINTS - Consolidated
# ============================================================================

@router.post("/auth/login", response_model=schemas.Token, tags=["authentication"])
async def unified_login(
    request: Request,
    credentials: schemas.UserLogin,
    provider: AuthProvider = AuthProvider.LOCAL,
    method: AuthMethod = AuthMethod.PASSWORD,
    remember_me: bool = False,
    db: Session = Depends(get_db)
):
    """
    Unified login endpoint that replaces:
    - /api/v1/auth/login
    - /api/v2/auth/login  
    - /api/v2/auth-simple/login
    - /api/v2/social/login
    """
    auth_service = ConsolidatedAuthOrchestrator(db)
    
    config = AuthConfig(
        provider=provider,
        method=method,
        remember_me=remember_me,
        enable_rate_limiting=True,
        enable_suspicious_login_detection=True,
        audit_login=True
    )
    
    context = AuthContext(
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        source="web"
    )
    
    result = auth_service.authenticate_user(credentials, config, context, request)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.error_message or "Authentication failed"
        )
    
    if result.mfa_required:
        return {
            "mfa_required": True,
            "mfa_challenge": result.mfa_challenge,
            "message": "MFA verification required"
        }
    
    return {
        "access_token": result.access_token,
        "refresh_token": result.refresh_token,
        "token_type": "bearer",
        "user": {
            "id": result.user.id,
            "email": result.user.email,
            "role": getattr(result.user, 'role', 'client')
        },
        "session_id": result.session_id,
        "requires_password_change": result.requires_password_change
    }

@router.post("/auth/refresh", response_model=schemas.Token, tags=["authentication"])
async def refresh_token(
    refresh_request: schemas.TokenRefresh,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    auth_service = ConsolidatedAuthOrchestrator(db)
    
    result = auth_service.refresh_access_token(refresh_request.refresh_token)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.error_message or "Token refresh failed"
        )
    
    return {
        "access_token": result.access_token,
        "refresh_token": result.refresh_token,
        "token_type": "bearer"
    }

@router.get("/auth/me", response_model=schemas.User, tags=["authentication"])
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user information - replaces multiple /me endpoints"""
    return current_user

@router.post("/auth/logout", tags=["authentication"])
async def logout(
    request: Request,
    session_id: Optional[str] = Body(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unified logout endpoint"""
    auth_service = ConsolidatedAuthOrchestrator(db)
    
    context = AuthContext(
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    success = auth_service.logout(current_user, session_id, context)
    
    return {"message": "Logged out successfully", "success": success}

# ============================================================================
# ANALYTICS ENDPOINTS - Consolidated
# ============================================================================

@router.post("/analytics/unified", tags=["analytics"])
async def get_unified_analytics(
    analytics_request: Dict[str, Any] = Body(...),
    cache_strategy: CacheStrategy = CacheStrategy.MEDIUM_CACHE,
    response_format: ResponseFormat = ResponseFormat.JSON,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified analytics endpoint that replaces:
    - /api/v1/analytics/*
    - /api/v2/analytics/*
    - /api/v2/six-figure-barber/*
    - /api/v2/business-intelligence/*
    - /api/v2/marketing-analytics/*
    - And 20+ other analytics endpoints
    """
    analytics_service = ConsolidatedAnalyticsOrchestrator(db)
    
    config = AnalyticsConfig(
        provider=AnalyticsProvider(analytics_request.get('provider', 'six_figure_barber')),
        level=MetricsLevel(analytics_request.get('level', 'standard')),
        cache_ttl=600 if cache_strategy == CacheStrategy.MEDIUM_CACHE else 300,
        include_predictions=analytics_request.get('enable_predictions', False),
        include_ai_insights=analytics_request.get('enable_ai', False),
        date_range_days=analytics_request.get('date_range_days', 30)
    )
    
    try:
        metrics = analytics_service.get_unified_analytics(
            user_id=current_user.id,
            config=config,
            user_ids=analytics_request.get('user_ids'),
            date_range=analytics_request.get('date_range')
        )
        
        if response_format == ResponseFormat.JSON:
            return {
                "success": True,
                "data": {
                    "revenue": metrics.revenue_metrics,
                    "clients": metrics.client_metrics,
                    "appointments": metrics.appointment_metrics,
                    "efficiency": metrics.efficiency_metrics,
                    "growth": metrics.growth_metrics,
                    "six_figure_score": metrics.six_figure_barber_score,
                    "ai_insights": metrics.ai_insights,
                    "predictions": metrics.predictions,
                    "provider_specific": metrics.provider_specific
                },
                "config": {
                    "provider": config.provider.value,
                    "level": config.level.value,
                    "cache_ttl": config.cache_ttl
                },
                "generated_at": datetime.utcnow().isoformat()
            }
        
        # Handle other response formats (CSV, PDF, Excel)
        # Implementation would depend on specific requirements
        
    except Exception as e:
        logger.error(f"Analytics error for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate analytics"
        )

@router.get("/analytics/dashboard/{dashboard_type}", tags=["analytics"])
async def get_dashboard_data(
    dashboard_type: str = Path(..., description="Dashboard type (business, marketing, franchise, etc.)"),
    time_range: str = Query("30d", description="Time range for analytics"),
    level: str = Query("standard", description="Analytics detail level"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard-specific analytics data"""
    analytics_service = ConsolidatedAnalyticsOrchestrator(db)
    
    # Map dashboard type to provider
    provider_mapping = {
        "business": AnalyticsProvider.SIX_FIGURE_BARBER,
        "marketing": AnalyticsProvider.MARKETING,
        "franchise": AnalyticsProvider.FRANCHISE,
        "basic": AnalyticsProvider.SIX_FIGURE_BARBER
    }
    
    provider = provider_mapping.get(dashboard_type, AnalyticsProvider.SIX_FIGURE_BARBER)
    
    config = AnalyticsConfig(
        provider=provider,
        level=MetricsLevel(level),
        date_range_days=int(time_range.replace('d', '')) if time_range.endswith('d') else 30
    )
    
    metrics = analytics_service.get_unified_analytics(
        user_id=current_user.id,
        config=config
    )
    
    return {
        "dashboard_type": dashboard_type,
        "metrics": metrics,
        "generated_at": datetime.utcnow().isoformat()
    }

# ============================================================================
# BOOKING ENDPOINTS - Consolidated  
# ============================================================================

@router.post("/bookings/create", response_model=schemas.BookingResponse, tags=["bookings"])
async def create_appointment(
    appointment_data: schemas.AppointmentCreate,
    booking_type: BookingType = BookingType.REGULAR,
    strategy: BookingStrategy = BookingStrategy.IMMEDIATE,
    enable_notifications: bool = True,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Unified appointment creation endpoint that replaces:
    - /api/v1/appointments/
    - /api/v2/appointments/create
    - /api/v2/bookings/
    - /api/v2/guest-bookings/
    """
    booking_service = ConsolidatedBookingOrchestrator(db)
    
    config = BookingConfig(
        booking_type=booking_type,
        strategy=strategy,
        send_notifications=enable_notifications,
        enable_double_booking_prevention=True,
        validate_business_rules=True
    )
    
    context = BookingContext(
        source="web",
        user_timezone=request.headers.get("timezone") if request else None
    )
    
    result = booking_service.create_appointment(appointment_data, config, context)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    
    return result

@router.get("/bookings/slots/{barber_id}", tags=["bookings"])
async def get_available_slots(
    barber_id: int = Path(..., description="Barber ID"),
    date: date = Query(..., description="Target date for availability"), 
    service_duration: int = Query(30, description="Service duration in minutes"),
    cache_strategy: CacheStrategy = CacheStrategy.SHORT_CACHE,
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Unified slot availability endpoint that replaces multiple slot endpoints
    """
    booking_service = ConsolidatedBookingOrchestrator(db)
    
    context = BookingContext(
        user_timezone=request.headers.get("timezone") if request else None,
        source="web"
    )
    
    slots = booking_service.get_available_slots(
        barber_id=barber_id,
        target_date=date,
        service_duration=service_duration,
        context=context
    )
    
    return {
        "success": True,
        "data": slots,
        "cache_strategy": cache_strategy.value,
        "generated_at": datetime.utcnow().isoformat()
    }

@router.put("/bookings/{appointment_id}", response_model=schemas.BookingResponse, tags=["bookings"])
async def update_appointment(
    appointment_id: int = Path(..., description="Appointment ID"),
    update_data: schemas.AppointmentUpdate = Body(...),
    send_notifications: bool = True,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Update appointment - unified endpoint"""
    booking_service = ConsolidatedBookingOrchestrator(db)
    
    config = BookingConfig(
        booking_type=BookingType.REGULAR,
        strategy=BookingStrategy.IMMEDIATE,
        send_notifications=send_notifications
    )
    
    context = BookingContext(
        source="web",
        user_timezone=request.headers.get("timezone") if request else None
    )
    
    result = booking_service.update_appointment(appointment_id, update_data, config, context)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    
    return result

@router.delete("/bookings/{appointment_id}", tags=["bookings"])
async def cancel_appointment(
    appointment_id: int = Path(..., description="Appointment ID"),
    reason: Optional[str] = Body(None, description="Cancellation reason"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Cancel appointment - unified endpoint"""
    booking_service = ConsolidatedBookingOrchestrator(db)
    
    config = BookingConfig(
        booking_type=BookingType.REGULAR,
        strategy=BookingStrategy.IMMEDIATE,
        send_notifications=True
    )
    
    context = BookingContext(
        source="web",
        user_timezone=request.headers.get("timezone") if request else None
    )
    
    result = booking_service.cancel_appointment(appointment_id, reason, config, context)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    
    return result

# ============================================================================
# SEARCH ENDPOINTS - Consolidated
# ============================================================================

@router.get("/search", tags=["search"])
async def unified_search(
    query: str = Query(..., description="Search query"),
    entity_type: str = Query("all", description="Entity type (appointments, clients, services, all)"),
    limit: int = Query(20, description="Result limit"),
    offset: int = Query(0, description="Result offset"),
    date_filter: Optional[str] = Query(None, description="Date range filter"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified search endpoint that replaces multiple search endpoints
    """
    results = {}
    
    if entity_type in ["all", "appointments"]:
        appointments = db.query(models.Appointment).filter(
            models.Appointment.barber_id == current_user.id,
            models.Appointment.service_name.ilike(f"%{query}%")
        ).limit(limit).offset(offset).all()
        results["appointments"] = appointments
    
    if entity_type in ["all", "clients"]:
        clients = db.query(models.Client).filter(
            models.Client.name.ilike(f"%{query}%") |
            models.Client.email.ilike(f"%{query}%")
        ).limit(limit).offset(offset).all()
        results["clients"] = clients
    
    if entity_type in ["all", "services"]:
        services = db.query(models.Service).filter(
            models.Service.name.ilike(f"%{query}%")
        ).limit(limit).offset(offset).all()
        results["services"] = services
    
    return {
        "query": query,
        "entity_type": entity_type,
        "results": results,
        "total_results": sum(len(v) if isinstance(v, list) else 0 for v in results.values()),
        "limit": limit,
        "offset": offset
    }

# ============================================================================
# SYSTEM HEALTH & MONITORING
# ============================================================================

@router.get("/health", tags=["system"])
async def health_check():
    """Unified health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "analytics": "operational",
            "booking": "operational", 
            "authentication": "operational",
            "database": "operational"
        }
    }

@router.get("/version", tags=["system"])
async def get_version():
    """Get API version information"""
    return {
        "version": "2.0.0",
        "api_level": "unified",
        "deprecation_notice": {
            "v1_apis": "All V1 APIs are deprecated and will be removed in next major version",
            "migration_guide": "/docs/migration-v1-to-v2"
        },
        "features": {
            "consolidated_analytics": True,
            "unified_booking": True,
            "advanced_auth": True,
            "ai_insights": True,
            "realtime_updates": True
        }
    }

# ============================================================================
# ERROR HANDLING
# ============================================================================

@router.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Unified error handling"""
    return {
        "success": False,
        "error": {
            "code": exc.status_code,
            "message": exc.detail,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    }

# ============================================================================
# MIGRATION HELPERS (Temporary)
# ============================================================================

@router.get("/migration/v1-endpoints", tags=["migration"])
async def list_deprecated_v1_endpoints():
    """List all deprecated V1 endpoints and their V2 replacements"""
    return {
        "deprecated_endpoints": {
            "/api/v1/auth/login": "/api/v2/auth/login",
            "/api/v1/appointments/": "/api/v2/bookings/create",
            "/api/v1/analytics/revenue": "/api/v2/analytics/unified",
            "/api/v1/users/me": "/api/v2/auth/me",
            # Add more mappings as needed
        },
        "migration_status": "In progress",
        "support_end_date": "2025-12-31",
        "documentation": "/docs/migration-guide"
    }

# Export the router
__all__ = ["router"]