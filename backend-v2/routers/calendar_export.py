"""
Calendar Export and Sync API Endpoints

Comprehensive API endpoints for calendar export and synchronization features:
- Multiple export formats (iCal, CSV, JSON, Google Calendar, Outlook)
- Calendar subscription management
- Two-way synchronization setup and management
- Conflict resolution
- Analytics and monitoring
"""

import io
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from dependencies import get_db, get_current_user
from models import User
from services.calendar_export_service import (
    CalendarExportService, 
    ExportFormat, 
    PrivacyLevel, 
    ExportOptions,
    SyncProvider,
    SyncOptions
)
from services.calendar_sync_service import (
    CalendarSyncService,
    SyncDirection,
    ConflictResolution
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/calendar", tags=["calendar-export"])


# Request Models
class CalendarExportRequest(BaseModel):
    """Request model for calendar export."""
    format: str = Field(..., description="Export format: ical, csv, json, google_calendar, outlook")
    privacy_level: str = Field(default="business", description="Privacy level: full, business, minimal, anonymous")
    start_date: datetime = Field(..., description="Start date for export")
    end_date: datetime = Field(..., description="End date for export")
    barber_ids: Optional[List[int]] = Field(None, description="Specific barber IDs to include")
    service_ids: Optional[List[int]] = Field(None, description="Specific service IDs to include")
    include_cancelled: bool = Field(default=False, description="Include cancelled appointments")
    include_completed: bool = Field(default=True, description="Include completed appointments")
    timezone: str = Field(default="UTC", description="Timezone for export")
    custom_title: Optional[str] = Field(None, description="Custom calendar title")
    include_client_contact: bool = Field(default=False, description="Include client contact info")
    include_pricing: bool = Field(default=False, description="Include pricing information")


class BulkExportRequest(BaseModel):
    """Request model for bulk export of multiple barbers."""
    barber_ids: List[int] = Field(..., description="List of barber IDs to export")
    export_options: CalendarExportRequest = Field(..., description="Export options to apply")


class SyncSetupRequest(BaseModel):
    """Request model for setting up calendar synchronization."""
    provider: str = Field(..., description="Sync provider: google_calendar, outlook, apple_calendar, caldav")
    external_calendar_id: str = Field(..., description="External calendar ID")
    sync_direction: str = Field(default="bidirectional", description="Sync direction: export_only, import_only, bidirectional")
    conflict_resolution: str = Field(default="prompt", description="Conflict resolution: prompt, local_wins, remote_wins, newest_wins, merge")
    sync_frequency: int = Field(default=15, description="Sync frequency in minutes")
    privacy_level: str = Field(default="business", description="Privacy level for sync")
    auto_create_calendar: bool = Field(default=True, description="Auto-create calendar if not exists")
    webhook_enabled: bool = Field(default=True, description="Enable webhook notifications")


class ConflictResolutionRequest(BaseModel):
    """Request model for conflict resolution."""
    conflict_ids: List[str] = Field(..., description="List of conflict IDs to resolve")
    resolution_strategy: str = Field(..., description="Resolution strategy")
    user_choices: Optional[Dict[str, Any]] = Field(None, description="User choices for manual resolution")


class SubscriptionCreateRequest(BaseModel):
    """Request model for creating calendar subscription."""
    name: str = Field(..., description="Subscription name")
    description: str = Field(..., description="Subscription description")
    privacy_level: str = Field(default="business", description="Privacy level")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Calendar filters")
    expires_in_days: Optional[int] = Field(None, description="Expiration in days")


# Response Models
class ExportResponse(BaseModel):
    """Response model for calendar export."""
    success: bool
    format: str
    filename: str
    size_bytes: int
    export_count: int
    export_id: str
    subscription_url: Optional[str] = None
    download_url: Optional[str] = None
    errors: List[str] = []
    warnings: List[str] = []


class BulkExportResponse(BaseModel):
    """Response model for bulk export."""
    success: bool
    total_exports: int
    successful_exports: int
    failed_exports: int
    results: List[ExportResponse]


class SyncStatusResponse(BaseModel):
    """Response model for sync status."""
    total_configurations: int
    active_configurations: int
    last_sync_times: Dict[str, Optional[str]]
    next_sync_times: Dict[str, Optional[str]]
    sync_errors: Dict[str, List[str]]
    sync_health: Dict[str, Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


class ConflictResponse(BaseModel):
    """Response model for sync conflicts."""
    total_conflicts: int
    pending_conflicts: int
    resolved_conflicts: int
    conflicts: List[Dict[str, Any]]


# API Endpoints

@router.post("/export", response_model=ExportResponse)
async def export_calendar(
    request: CalendarExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export calendar in specified format with privacy controls."""
    try:
        # Validate export format
        try:
            export_format = ExportFormat(request.format.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export format: {request.format}"
            )
        
        # Validate privacy level
        try:
            privacy_level = PrivacyLevel(request.privacy_level.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid privacy level: {request.privacy_level}"
            )
        
        # Create export options
        export_options = ExportOptions(
            format=export_format,
            privacy_level=privacy_level,
            start_date=request.start_date,
            end_date=request.end_date,
            barber_ids=request.barber_ids,
            service_ids=request.service_ids,
            include_cancelled=request.include_cancelled,
            include_completed=request.include_completed,
            timezone=request.timezone,
            custom_title=request.custom_title,
            include_client_contact=request.include_client_contact,
            include_pricing=request.include_pricing
        )
        
        # Perform export
        export_service = CalendarExportService(db)
        result = export_service.export_calendar(current_user, export_options)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Export failed: {'; '.join(result.errors)}"
            )
        
        # Store export data temporarily for download
        download_url = f"/api/v2/calendar/download/{result.export_id}"
        background_tasks.add_task(_store_export_data, result.export_id, result.content, result.filename)
        
        return ExportResponse(
            success=result.success,
            format=result.format.value,
            filename=result.filename,
            size_bytes=result.size_bytes,
            export_count=result.export_count,
            export_id=result.export_id,
            subscription_url=result.subscription_url,
            download_url=download_url,
            errors=result.errors or [],
            warnings=result.warnings or []
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calendar export failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.get("/download/{export_id}")
async def download_export(
    export_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download exported calendar file."""
    try:
        # Retrieve stored export data
        export_data = _get_export_data(export_id)
        
        if not export_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export not found or expired"
            )
        
        content, filename, content_type = export_data
        
        # Determine content type based on file extension
        if filename.endswith('.ics'):
            media_type = "text/calendar"
        elif filename.endswith('.csv'):
            media_type = "text/csv"
        elif filename.endswith('.json'):
            media_type = "application/json"
        else:
            media_type = "application/octet-stream"
        
        # Create streaming response
        return StreamingResponse(
            io.BytesIO(content.encode() if isinstance(content, str) else content),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download failed for export {export_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Download failed"
        )


@router.post("/bulk-export", response_model=BulkExportResponse)
async def bulk_export_multiple_barbers(
    request: BulkExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export calendars for multiple barbers."""
    try:
        # Validate export format and privacy level
        export_format = ExportFormat(request.export_options.format.lower())
        privacy_level = PrivacyLevel(request.export_options.privacy_level.lower())
        
        # Create base export options
        base_options = ExportOptions(
            format=export_format,
            privacy_level=privacy_level,
            start_date=request.export_options.start_date,
            end_date=request.export_options.end_date,
            service_ids=request.export_options.service_ids,
            include_cancelled=request.export_options.include_cancelled,
            include_completed=request.export_options.include_completed,
            timezone=request.export_options.timezone,
            custom_title=request.export_options.custom_title,
            include_client_contact=request.export_options.include_client_contact,
            include_pricing=request.export_options.include_pricing
        )
        
        # Perform bulk export
        export_service = CalendarExportService(db)
        results = export_service.bulk_export_multiple_barbers(
            current_user, 
            request.barber_ids, 
            base_options
        )
        
        # Convert results to response format
        export_responses = []
        successful_exports = 0
        
        for result in results:
            if result.success:
                successful_exports += 1
                download_url = f"/api/v2/calendar/download/{result.export_id}"
                background_tasks.add_task(_store_export_data, result.export_id, result.content, result.filename)
            else:
                download_url = None
            
            export_responses.append(ExportResponse(
                success=result.success,
                format=result.format.value,
                filename=result.filename,
                size_bytes=result.size_bytes,
                export_count=result.export_count,
                export_id=result.export_id,
                subscription_url=result.subscription_url,
                download_url=download_url,
                errors=result.errors or [],
                warnings=result.warnings or []
            ))
        
        return BulkExportResponse(
            success=successful_exports > 0,
            total_exports=len(results),
            successful_exports=successful_exports,
            failed_exports=len(results) - successful_exports,
            results=export_responses
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk export failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk export failed: {str(e)}"
        )


@router.post("/sync/setup")
async def setup_calendar_sync(
    request: SyncSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set up calendar synchronization with external provider."""
    try:
        # Validate provider
        try:
            provider = SyncProvider(request.provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported sync provider: {request.provider}"
            )
        
        # Create sync options
        sync_options = SyncOptions(
            provider=provider,
            calendar_id=request.external_calendar_id,
            sync_direction=request.sync_direction,
            conflict_resolution=request.conflict_resolution,
            sync_frequency=request.sync_frequency,
            privacy_level=PrivacyLevel(request.privacy_level.lower()),
            auto_create_calendar=request.auto_create_calendar,
            webhook_enabled=request.webhook_enabled
        )
        
        # Set up sync
        sync_service = CalendarSyncService(db)
        result = await sync_service.setup_sync_configuration(
            current_user,
            provider,
            request.external_calendar_id,
            sync_options
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Sync setup failed")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sync setup failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync setup failed: {str(e)}"
        )


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive sync status for user."""
    try:
        sync_service = CalendarSyncService(db)
        status_data = await sync_service.get_sync_status(current_user)
        
        return SyncStatusResponse(**status_data)
        
    except Exception as e:
        logger.error(f"Failed to get sync status for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sync status: {str(e)}"
        )


@router.post("/sync/{config_id}/trigger")
async def trigger_sync(
    config_id: str,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger calendar synchronization."""
    try:
        sync_service = CalendarSyncService(db)
        result = await sync_service.perform_sync(config_id, force=force)
        
        return {
            "success": result.success,
            "sync_id": result.sync_id,
            "events_processed": result.events_processed,
            "events_created": result.events_created,
            "events_updated": result.events_updated,
            "conflicts_detected": result.conflicts_detected,
            "conflicts_resolved": result.conflicts_resolved,
            "duration_seconds": (result.completed_at - result.started_at).total_seconds(),
            "errors": result.errors,
            "warnings": result.warnings,
            "next_sync_at": result.next_sync_at.isoformat() if result.next_sync_at else None
        }
        
    except Exception as e:
        logger.error(f"Manual sync failed for config {config_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )


@router.post("/sync/{config_id}/pause")
async def pause_sync(
    config_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause calendar synchronization."""
    try:
        sync_service = CalendarSyncService(db)
        result = await sync_service.pause_sync(config_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to pause sync")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to pause sync {config_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pause sync: {str(e)}"
        )


@router.post("/sync/{config_id}/resume")
async def resume_sync(
    config_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume calendar synchronization."""
    try:
        sync_service = CalendarSyncService(db)
        result = await sync_service.resume_sync(config_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to resume sync")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resume sync {config_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume sync: {str(e)}"
        )


@router.get("/sync/conflicts", response_model=ConflictResponse)
async def get_sync_conflicts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending sync conflicts for user."""
    try:
        # This would query conflicts from database
        conflicts_data = {
            "total_conflicts": 0,
            "pending_conflicts": 0,
            "resolved_conflicts": 0,
            "conflicts": []
        }
        
        return ConflictResponse(**conflicts_data)
        
    except Exception as e:
        logger.error(f"Failed to get conflicts for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conflicts: {str(e)}"
        )


@router.post("/sync/conflicts/resolve")
async def resolve_sync_conflicts(
    request: ConflictResolutionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve sync conflicts."""
    try:
        sync_service = CalendarSyncService(db)
        
        # This would resolve conflicts based on the request
        results = {
            "resolved_count": 0,
            "pending_count": 0,
            "error_count": 0,
            "resolutions": []
        }
        
        return results
        
    except Exception as e:
        logger.error(f"Conflict resolution failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conflict resolution failed: {str(e)}"
        )


@router.post("/subscription", response_model=Dict[str, Any])
async def create_calendar_subscription(
    request: SubscriptionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a shareable calendar subscription."""
    try:
        privacy_level = PrivacyLevel(request.privacy_level.lower())
        
        export_service = CalendarExportService(db)
        subscription = export_service.create_subscription_calendar(
            current_user,
            request.name,
            request.description,
            privacy_level,
            request.filters,
            request.expires_in_days
        )
        
        return {
            "success": True,
            "subscription_id": subscription.id,
            "name": subscription.name,
            "url": subscription.url,
            "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
            "created_at": subscription.created_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Subscription creation failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Subscription creation failed: {str(e)}"
        )


@router.get("/subscription/{subscription_id}.ics")
async def get_subscription_calendar(
    subscription_id: str,
    response: Response
):
    """Get calendar data for subscription URL."""
    try:
        export_service = CalendarExportService(None)  # No DB session needed for subscription
        calendar_data = export_service.get_subscription_calendar(subscription_id)
        
        response.headers["Content-Type"] = "text/calendar; charset=utf-8"
        response.headers["Content-Disposition"] = f"attachment; filename=calendar-{subscription_id}.ics"
        
        return PlainTextResponse(calendar_data, media_type="text/calendar")
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Subscription calendar failed for {subscription_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate subscription calendar"
        )


@router.get("/analytics")
async def get_export_analytics(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get calendar export and sync analytics."""
    try:
        export_service = CalendarExportService(db)
        sync_service = CalendarSyncService(db)
        
        export_analytics = export_service.get_export_analytics(current_user, days)
        sync_analytics = await sync_service.get_sync_analytics(current_user, days)
        
        return {
            "export_analytics": export_analytics,
            "sync_analytics": sync_analytics,
            "period_days": days,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Analytics failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics failed: {str(e)}"
        )


@router.post("/webhooks/{provider}/{user_id}")
async def handle_calendar_webhook(
    provider: str,
    user_id: int,
    webhook_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Handle webhook notifications from external calendar providers."""
    try:
        sync_provider = SyncProvider(provider.lower())
        
        sync_service = CalendarSyncService(db)
        result = await sync_service.handle_webhook(sync_provider, user_id, webhook_data)
        
        return result
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}"
        )
    except Exception as e:
        logger.error(f"Webhook handling failed for {provider}/{user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


# Helper functions

def _store_export_data(export_id: str, content: str, filename: str):
    """Store export data temporarily for download."""
    # This would store in Redis or temporary file system
    # For now, we'll just log it
    logger.info(f"Stored export data for {export_id}: {filename}")


def _get_export_data(export_id: str) -> Optional[Tuple[str, str, str]]:
    """Retrieve stored export data."""
    # This would retrieve from Redis or temporary file system
    # For now, return None (not found)
    return None