from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import base64
import logging
from pydantic import BaseModel, Field

from db import get_db
from utils.auth import get_current_user, require_admin_role
from services.export_service import export_service
import models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exports", tags=["exports"])

# Pydantic models for request/response
class ExportFilters(BaseModel):
    """Base filters for exports"""
    date_from: Optional[date] = None
    date_to: Optional[date] = None

class ClientExportFilters(ExportFilters):
    """Filters specific to client exports"""
    customer_type: Optional[str] = None
    preferred_barber_id: Optional[int] = None
    tags: Optional[str] = None
    min_visits: Optional[int] = None
    min_spent: Optional[float] = None

class AppointmentExportFilters(ExportFilters):
    """Filters specific to appointment exports"""
    status: Optional[List[str]] = None
    barber_id: Optional[int] = None
    service_name: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

class CustomExportConfig(BaseModel):
    """Configuration for custom exports"""
    table: str = Field(..., description="Table to export from (clients, appointments)")
    fields: List[str] = Field(..., description="Fields to include in export")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Filter criteria")
    joins: List[str] = Field(default_factory=list, description="Tables to join")
    order_by: Optional[str] = Field(default="created_at", description="Field to order by")
    limit: Optional[int] = Field(default=1000, description="Maximum number of records")

class ExportResponse(BaseModel):
    """Response model for exports"""
    content: str = Field(..., description="Base64 encoded content")
    filename: str = Field(..., description="Suggested filename")
    mime_type: str = Field(..., description="MIME type")
    encoding: str = Field(default="base64", description="Content encoding")
    size_bytes: Optional[int] = Field(None, description="File size in bytes")
    record_count: Optional[int] = Field(None, description="Number of records exported")

class ExportProgress(BaseModel):
    """Progress tracking for large exports"""
    export_id: str
    status: str = Field(..., description="pending, processing, completed, failed")
    progress_percent: int = Field(default=0, description="Progress percentage")
    message: Optional[str] = Field(None, description="Status message")
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = Field(None, description="URL to download completed export")

# In-memory progress tracking (in production, use Redis or database)
export_progress: Dict[str, ExportProgress] = {}

@router.get("/clients", response_model=ExportResponse)
async def export_clients(
    format: str = Query("csv", description="Export format: csv, excel, json, pdf"),
    include_pii: bool = Query(False, description="Include personally identifiable information"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    customer_type: Optional[str] = Query(None, description="Filter by customer type"),
    preferred_barber_id: Optional[int] = Query(None, description="Filter by preferred barber"),
    tags: Optional[str] = Query(None, description="Filter by tags (contains)"),
    min_visits: Optional[int] = Query(None, description="Minimum number of visits"),
    min_spent: Optional[float] = Query(None, description="Minimum amount spent"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Export client data in various formats
    
    Supports filtering by date range, customer type, barber, tags, visits, and spending.
    PII (personally identifiable information) is redacted by default for privacy compliance.
    """
    try:
        # Check permissions - only barbers and admins can export client data
        if current_user.role not in ["barber", "admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to export client data")
        
        # Only super_admins can include PII
        if include_pii and current_user.role != "super_admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions to export PII data")
        
        # Build filters
        filters = {}
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        if customer_type:
            filters['customer_type'] = customer_type
        if preferred_barber_id:
            filters['preferred_barber_id'] = preferred_barber_id
        if tags:
            filters['tags'] = tags
        if min_visits is not None:
            filters['min_visits'] = min_visits
        if min_spent is not None:
            filters['min_spent'] = min_spent
        
        # Validate format
        if format.lower() not in export_service.supported_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported format. Supported formats: {', '.join(export_service.supported_formats)}"
            )
        
        logger.info(f"Client export requested by user {current_user.id}: format={format}, filters={filters}")
        
        # Perform export
        result = await export_service.export_clients(
            db=db,
            format=format,
            filters=filters,
            include_pii=include_pii,
            user_id=current_user.id
        )
        
        # Calculate additional metadata
        try:
            content_bytes = base64.b64decode(result['content'])
            result['size_bytes'] = len(content_bytes)
        except:
            pass
        
        logger.info(f"Client export completed for user {current_user.id}: {result['filename']}")
        
        return ExportResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Client export failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Export failed. Please try again later.")

@router.get("/appointments", response_model=ExportResponse)
async def export_appointments(
    format: str = Query("csv", description="Export format: csv, excel, json, pdf"),
    include_details: bool = Query(True, description="Include detailed information"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    status: Optional[List[str]] = Query(None, description="Filter by status"),
    barber_id: Optional[int] = Query(None, description="Filter by barber"),
    service_name: Optional[str] = Query(None, description="Filter by service"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Export appointment data in various formats
    
    Supports filtering by date range, status, barber, service, and price range.
    Regular users can only export their own appointments.
    """
    try:
        # Check permissions
        if current_user.role not in ["barber", "admin", "super_admin"]:
            # Regular users can only export their own appointments
            filters = {'user_id': current_user.id}
        else:
            filters = {}
        
        # Add query filters
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        if status:
            filters['status'] = status
        if barber_id:
            filters['barber_id'] = barber_id
        if service_name:
            filters['service_name'] = service_name
        if min_price is not None:
            filters['min_price'] = min_price
        if max_price is not None:
            filters['max_price'] = max_price
        
        # Validate format
        if format.lower() not in export_service.supported_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported format. Supported formats: {', '.join(export_service.supported_formats)}"
            )
        
        logger.info(f"Appointment export requested by user {current_user.id}: format={format}, filters={filters}")
        
        # Perform export
        result = await export_service.export_appointments(
            db=db,
            format=format,
            filters=filters,
            include_details=include_details,
            user_id=current_user.id
        )
        
        # Calculate additional metadata
        try:
            content_bytes = base64.b64decode(result['content'])
            result['size_bytes'] = len(content_bytes)
        except:
            pass
        
        logger.info(f"Appointment export completed for user {current_user.id}: {result['filename']}")
        
        return ExportResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Appointment export failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Export failed. Please try again later.")

@router.get("/analytics", response_model=ExportResponse)
async def export_analytics(
    format: str = Query("excel", description="Export format: excel, json, pdf"),
    include_charts: bool = Query(True, description="Include charts (Excel only)"),
    date_from: Optional[date] = Query(None, description="Analytics start date"),
    date_to: Optional[date] = Query(None, description="Analytics end date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Export analytics data with charts and summaries
    
    Excel format is recommended for best chart support.
    Requires barber or admin permissions.
    """
    try:
        # Check permissions - only barbers and admins can export analytics
        if current_user.role not in ["barber", "admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to export analytics")
        
        # Set date range
        date_range = None
        if date_from or date_to:
            date_range = {}
            if date_from:
                date_range['start_date'] = date_from
            if date_to:
                date_range['end_date'] = date_to
        
        # Validate format
        supported_analytics_formats = ['excel', 'json', 'pdf']
        if format.lower() not in supported_analytics_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported format for analytics. Supported formats: {', '.join(supported_analytics_formats)}"
            )
        
        logger.info(f"Analytics export requested by user {current_user.id}: format={format}, date_range={date_range}")
        
        # Perform export
        result = await export_service.export_analytics(
            db=db,
            format=format,
            date_range=date_range,
            include_charts=include_charts,
            user_id=current_user.id
        )
        
        # Calculate additional metadata
        try:
            content_bytes = base64.b64decode(result['content'])
            result['size_bytes'] = len(content_bytes)
        except:
            pass
        
        logger.info(f"Analytics export completed for user {current_user.id}: {result['filename']}")
        
        return ExportResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analytics export failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Export failed. Please try again later.")

@router.post("/custom", response_model=ExportResponse)
async def custom_export(
    config: CustomExportConfig,
    format: str = Query("csv", description="Export format: csv, excel, json"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a custom export based on user-defined configuration
    
    Allows advanced users to define exactly what data to export.
    Requires admin permissions for security.
    """
    try:
        # Check permissions - only admins can do custom exports
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions for custom exports")
        
        # Validate format
        if format.lower() not in export_service.supported_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported format. Supported formats: {', '.join(export_service.supported_formats)}"
            )
        
        # Validate table access
        allowed_tables = ['clients', 'appointments']
        if config.table not in allowed_tables:
            raise HTTPException(
                status_code=400, 
                detail=f"Table not allowed for export. Allowed tables: {', '.join(allowed_tables)}"
            )
        
        logger.info(f"Custom export requested by user {current_user.id}: table={config.table}, format={format}")
        
        # Perform export
        result = await export_service.custom_export(
            db=db,
            query_config=config.dict(),
            format=format,
            user_id=current_user.id
        )
        
        # Calculate additional metadata
        try:
            content_bytes = base64.b64decode(result['content'])
            result['size_bytes'] = len(content_bytes)
        except:
            pass
        
        logger.info(f"Custom export completed for user {current_user.id}: {result['filename']}")
        
        return ExportResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Custom export failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Export failed. Please try again later.")

@router.get("/download/{export_id}")
async def download_export(
    export_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Download a completed export file
    
    Used for large exports that are processed asynchronously.
    """
    try:
        # Check if export exists and belongs to user
        if export_id not in export_progress:
            raise HTTPException(status_code=404, detail="Export not found")
        
        progress = export_progress[export_id]
        
        # For now, we don't have user ownership tracking in progress
        # In production, you'd check if the export belongs to the current user
        
        if progress.status != "completed":
            raise HTTPException(status_code=400, detail=f"Export not ready. Status: {progress.status}")
        
        if not progress.download_url:
            raise HTTPException(status_code=404, detail="Export file not available")
        
        # In a real implementation, you'd fetch the file from storage
        # For now, return the progress info
        return progress
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download failed for export {export_id}: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

@router.get("/progress/{export_id}", response_model=ExportProgress)
async def get_export_progress(
    export_id: str,
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the progress status of an export
    
    Used to check the status of long-running exports.
    """
    if export_id not in export_progress:
        raise HTTPException(status_code=404, detail="Export not found")
    
    return export_progress[export_id]

@router.get("/formats")
async def get_supported_formats(
    current_user: models.User = Depends(get_current_user)
):
    """
    Get list of supported export formats
    
    Returns format information and capabilities.
    """
    return {
        "formats": [
            {
                "name": "csv",
                "display_name": "CSV",
                "description": "Comma-separated values, compatible with Excel and other tools",
                "mime_type": "text/csv",
                "supports_charts": False,
                "max_records": export_service.max_export_records
            },
            {
                "name": "excel",
                "display_name": "Excel",
                "description": "Microsoft Excel format with formatting and charts",
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "supports_charts": True,
                "max_records": export_service.max_export_records
            },
            {
                "name": "json",
                "display_name": "JSON",
                "description": "JavaScript Object Notation, ideal for API consumption",
                "mime_type": "application/json",
                "supports_charts": False,
                "max_records": export_service.max_export_records
            },
            {
                "name": "pdf",
                "display_name": "PDF",
                "description": "Portable Document Format, ideal for reports and presentations",
                "mime_type": "application/pdf",
                "supports_charts": True,
                "max_records": 5000  # PDFs have lower limits
            }
        ],
        "max_export_records": export_service.max_export_records
    }

@router.delete("/cache")
async def clear_export_cache(
    current_user: models.User = Depends(require_admin_role)
):
    """
    Clear export cache and temporary files
    
    Admin-only endpoint for maintenance.
    """
    try:
        # Clear in-memory progress tracking
        global export_progress
        export_progress.clear()
        
        # In production, you'd also clear file storage, database records, etc.
        
        logger.info(f"Export cache cleared by admin user {current_user.id}")
        
        return {"message": "Export cache cleared successfully"}
        
    except Exception as e:
        logger.error(f"Failed to clear export cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")

# Helper function for converting export response to file download
def create_file_response(export_result: Dict[str, Any]) -> Response:
    """
    Convert export result to FastAPI file response
    
    Useful for direct file downloads instead of base64 responses.
    """
    content = base64.b64decode(export_result['content'])
    
    return Response(
        content=content,
        media_type=export_result['mime_type'],
        headers={
            "Content-Disposition": f"attachment; filename={export_result['filename']}"
        }
    )