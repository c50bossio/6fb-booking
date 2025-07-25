"""
API router for managing third-party integrations.
Handles OAuth flows, health checks, and integration CRUD operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db import get_db
from dependencies import get_current_user
from models import User
from utils.error_handling import AppError, ValidationError
from models.integration import IntegrationType as IntegrationTypeModel, IntegrationStatus
from schemas_new.integration import (
    IntegrationUpdate,
    IntegrationResponse,
    OAuthInitiateRequest,
    OAuthCallbackResponse,
    IntegrationHealthCheck,
    IntegrationHealthSummary,
    IntegrationDisconnectResponse,
    IntegrationTokenRefreshRequest,
    IntegrationTokenRefreshResponse,
    IntegrationType
)
from services.integration_service import IntegrationServiceFactory
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/integrations",
    tags=["integrations"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/connect", response_model=dict)
async def initiate_oauth_connection(
    request: OAuthInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate OAuth connection flow for a third-party integration.
    Returns the authorization URL to redirect the user to.
    """
    try:
        # Convert schema enum to model enum
        integration_type = IntegrationTypeModel(request.integration_type.value)
        
        # Get the appropriate service
        service = IntegrationServiceFactory.create(integration_type, db)
        
        # Generate state parameter
        state = service.generate_oauth_state(current_user.id)
        
        # Build authorization URL
        auth_url = service.oauth_authorize_url
        scopes = service.required_scopes + (request.scopes or [])
        
        # Add query parameters
        params = {
            "client_id": service.client_id,
            "redirect_uri": request.redirect_uri or service.default_redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "access_type": "offline",  # For refresh tokens
            "prompt": "consent"  # Force consent to get refresh token
        }
        
        # Build full URL
        from urllib.parse import urlencode
        full_url = f"{auth_url}?{urlencode(params)}"
        
        logger.info(f"Initiating OAuth flow for {integration_type.value} for user {current_user.id}")
        
        return {
            "authorization_url": full_url,
            "state": state
        }
        
    except ValueError as e:
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise ValidationError("Request validation failed")
    except Exception as e:
        logger.error(f"Error initiating OAuth flow: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.get("/callback", response_model=OAuthCallbackResponse)
async def handle_oauth_callback(
    code: str = Query(..., description="Authorization code from OAuth provider"),
    state: str = Query(..., description="State parameter for validation"),
    error: Optional[str] = Query(None, description="Error from OAuth provider"),
    error_description: Optional[str] = Query(None, description="Error description"),
    integration_type: IntegrationType = Query(..., description="Type of integration"),
    db: Session = Depends(get_db)
):
    """
    Handle OAuth callback from third-party service.
    Exchanges authorization code for access tokens and stores them securely.
    """
    # Handle OAuth errors
    if error:
        logger.error(f"OAuth error: {error} - {error_description}")
        return OAuthCallbackResponse(
            success=False,
            message=f"OAuth authorization failed: {error_description or error}"
        )
    
    try:
        # Convert schema enum to model enum
        integration_type_model = IntegrationTypeModel(integration_type.value)
        
        # Get the appropriate service
        service = IntegrationServiceFactory.create(integration_type_model, db)
        
        # Get redirect URI from state or use default
        state_data = service.verify_oauth_state(state)
        redirect_uri = state_data.get("redirect_uri", service.default_redirect_uri)
        
        # Handle the callback
        integration = await service.handle_oauth_callback(code, state, redirect_uri)
        
        # Determine where to redirect the user
        redirect_url = f"/integrations/{integration.id}/success"
        
        return OAuthCallbackResponse(
            success=True,
            integration_id=integration.id,
            message="Integration connected successfully",
            redirect_url=redirect_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        return OAuthCallbackResponse(
            success=False,
            message=f"Failed to complete OAuth flow: {str(e)}"
        )


@router.get("/available", response_model=List[dict])
async def get_available_integrations(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of all available integration types that can be connected.
    Returns basic information about each integration type.
    """
    available = []
    
    # List all available integration types
    for integration_type in IntegrationType:
        available.append({
            "type": integration_type.value,
            "name": integration_type.value.replace("_", " ").title(),
            "description": f"Connect your {integration_type.value.replace('_', ' ').title()} account",
            "requires_oauth": integration_type in [
                IntegrationType.GOOGLE_CALENDAR,
                IntegrationType.GOOGLE_MY_BUSINESS,
                IntegrationType.STRIPE
            ],
            "requires_api_key": integration_type in [
                IntegrationType.SENDGRID,
                IntegrationType.TWILIO
            ]
        })
    
    return available


@router.get("/status", response_model=List[IntegrationResponse])
async def get_integration_status(
    integration_type: Optional[IntegrationType] = Query(None, description="Filter by integration type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get status of all integrations for the current user.
    Optionally filter by integration type.
    """
    # Convert schema enum to model enum if provided
    type_filter = IntegrationTypeModel(integration_type.value) if integration_type else None
    
    # Query integrations directly
    from models.integration import Integration
    query = db.query(Integration).filter(Integration.user_id == current_user.id)
    
    if type_filter:
        query = query.filter(Integration.integration_type == type_filter)
        
    integrations = query.all()
    
    return [IntegrationResponse.from_orm(integration) for integration in integrations]


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific integration."""
    from models.integration import Integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    return IntegrationResponse.from_orm(integration)


@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: int,
    update_data: IntegrationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an integration's configuration."""
    from models.integration import Integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Update fields
    if update_data.name is not None:
        integration.name = update_data.name
    if update_data.config is not None:
        integration.config = update_data.config
    if update_data.is_active is not None:
        integration.is_active = update_data.is_active
    if update_data.webhook_url is not None:
        integration.webhook_url = str(update_data.webhook_url)
    
    try:
        db.commit()
        db.refresh(integration)
        return IntegrationResponse.from_orm(integration)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating integration {integration_id}: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.delete("/{integration_id}", response_model=IntegrationDisconnectResponse)
async def disconnect_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect and remove an integration.
    This will delete all stored tokens and configuration.
    """
    from models.integration import Integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    try:
        db.delete(integration)
        db.commit()
        logger.info(f"Deleted integration {integration_id} for user {current_user.id}")
        
        return IntegrationDisconnectResponse(
            success=True,
            message="Integration disconnected successfully",
            integration_id=integration_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting integration {integration_id}: {str(e)}")
        raise AppError("An error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.get("/health/all", response_model=IntegrationHealthSummary)
async def check_all_integrations_health(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check health status of all user's integrations.
    Performs connectivity tests and token validation.
    """
    # Get all user integrations
    from models.integration import Integration
    integrations = db.query(Integration).filter(Integration.user_id == current_user.id).all()
    
    health_checks = []
    healthy_count = 0
    error_count = 0
    inactive_count = 0
    
    for integration in integrations:
        if not integration.is_active:
            inactive_count += 1
            health_checks.append(IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=integration.integration_type,
                name=integration.name,
                status=IntegrationStatus.INACTIVE,
                healthy=False,
                last_check=datetime.utcnow(),
                details={"message": "Integration is disabled"},
                error="Integration is disabled"
            ))
            continue
        
        try:
            # Get the appropriate service for this integration type
            specific_service = IntegrationServiceFactory.create(integration.integration_type, db)
            health_check = await specific_service.perform_health_check(integration)
            health_checks.append(health_check)
            
            if health_check.healthy:
                healthy_count += 1
            else:
                error_count += 1
                
        except Exception as e:
            logger.error(f"Health check failed for integration {integration.id}: {str(e)}")
            error_count += 1
            health_checks.append(IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=integration.integration_type,
                name=integration.name,
                status=IntegrationStatus.ERROR,
                healthy=False,
                last_check=datetime.utcnow(),
                details={"error": str(e)},
                error=str(e)
            ))
    
    return IntegrationHealthSummary(
        total_integrations=len(integrations),
        healthy_count=healthy_count,
        error_count=error_count,
        inactive_count=inactive_count,
        integrations=health_checks
    )


@router.get("/health/{integration_id}", response_model=IntegrationHealthCheck)
async def check_integration_health(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check health status of a specific integration.
    Performs connectivity test and token validation.
    """
    from models.integration import Integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    if not integration.is_active:
        return IntegrationHealthCheck(
            integration_id=integration.id,
            integration_type=integration.integration_type,
            name=integration.name,
            status=IntegrationStatus.INACTIVE,
            healthy=False,
            last_check=datetime.utcnow(),
            details={"message": "Integration is disabled"},
            error="Integration is disabled"
        )
    
    try:
        # Get the appropriate service for this integration type
        specific_service = IntegrationServiceFactory.create(integration.integration_type, db)
        return await specific_service.perform_health_check(integration)
        
    except Exception as e:
        logger.error(f"Health check failed for integration {integration_id}: {str(e)}")
        return IntegrationHealthCheck(
            integration_id=integration.id,
            integration_type=integration.integration_type,
            name=integration.name,
            status=IntegrationStatus.ERROR,
            healthy=False,
            last_check=datetime.utcnow(),
            details={"error": str(e)},
            error=str(e)
        )


@router.post("/{integration_id}/refresh-token", response_model=IntegrationTokenRefreshResponse)
async def refresh_integration_token(
    integration_id: int,
    request: IntegrationTokenRefreshRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually refresh OAuth tokens for an integration.
    Use this if tokens are expired or about to expire.
    """
    from models.integration import Integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    if not integration.refresh_token:
        return IntegrationTokenRefreshResponse(
            success=False,
            message="No refresh token available for this integration"
        )
    
    try:
        # Get the appropriate service for this integration type
        specific_service = IntegrationServiceFactory.create(integration.integration_type, db)
        
        # Force refresh if requested or if token is expired
        if request.force or integration.is_token_expired():
            success = await specific_service.refresh_token_if_needed(integration)
            
            if success:
                db.refresh(integration)
                return IntegrationTokenRefreshResponse(
                    success=True,
                    message="Token refreshed successfully",
                    expires_at=integration.token_expires_at
                )
            else:
                return IntegrationTokenRefreshResponse(
                    success=False,
                    message="Failed to refresh token"
                )
        else:
            return IntegrationTokenRefreshResponse(
                success=True,
                message="Token is still valid",
                expires_at=integration.token_expires_at
            )
            
    except Exception as e:
        logger.error(f"Token refresh failed for integration {integration_id}: {str(e)}")
        return IntegrationTokenRefreshResponse(
            success=False,
            message=f"Failed to refresh token: {str(e)}"
        )


@router.post("/sync", response_model=dict)
async def sync_integration_data(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync data from an integration.
    Forces a data synchronization from the third-party service.
    """
    from models.integration import Integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    if not integration.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Integration is not active"
        )
    
    try:
        # Get the appropriate service for this integration type
        specific_service = IntegrationServiceFactory.create(integration.integration_type, db)
        
        # Perform data sync
        sync_result = await specific_service.sync_data(integration)
        
        return {
            "success": True,
            "message": "Data sync completed successfully",
            "integration_id": integration.id,
            "synced_records": sync_result.get("records_synced", 0),
            "last_sync": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Data sync failed for integration {integration_id}: {str(e)}")
        return {
            "success": False,
            "message": f"Data sync failed: {str(e)}",
            "integration_id": integration.id
        }


@router.post("/{integration_id}/test", response_model=dict)
async def test_integration_connection(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test the connection to an integration.
    Verifies that the integration is properly configured and accessible.
    """
    from models.integration import Integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    try:
        # Get the appropriate service for this integration type
        specific_service = IntegrationServiceFactory.create(integration.integration_type, db)
        
        # Test the connection
        test_result = await specific_service.test_connection(integration)
        
        return {
            "success": test_result.get("success", False),
            "message": test_result.get("message", "Connection test completed"),
            "integration_id": integration.id,
            "response_time_ms": test_result.get("response_time_ms"),
            "details": test_result.get("details", {})
        }
        
    except Exception as e:
        logger.error(f"Connection test failed for integration {integration_id}: {str(e)}")
        return {
            "success": False,
            "message": f"Connection test failed: {str(e)}",
            "integration_id": integration.id
        }


# Admin-only endpoints
@router.get("/admin/all", response_model=List[IntegrationResponse], dependencies=[Depends(get_current_user)])
async def get_all_integrations(
    current_user: User = Depends(get_current_user),
    integration_type: Optional[IntegrationType] = Query(None),
    status: Optional[IntegrationStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    [Admin Only] Get all integrations across all users.
    Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    query = db.query(Integration)
    
    if integration_type:
        query = query.filter(Integration.integration_type == IntegrationTypeModel(integration_type.value))
    if status:
        query = query.filter(Integration.status == status)
    
    integrations = query.offset(skip).limit(limit).all()
    
    return [IntegrationResponse.from_orm(integration) for integration in integrations]