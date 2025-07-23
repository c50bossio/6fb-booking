from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import csv
import io
import uuid
from enum import Enum

import schemas
import models
from db import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role
from services.import_service import ImportService
from services import client_service
from utils.input_validation import validate_file_upload, ValidationError as InputValidationError
from schemas_new.validation import FileUploadRequest

router = APIRouter(
    prefix="/imports",
    tags=["imports"],
    dependencies=[Depends(get_current_user)]  # All import endpoints require authentication
)

class ImportSourceType(str, Enum):
    BOOKSY = "booksy"
    SQUARE = "square"
    ACUITY = "acuity"
    MINDBODY = "mindbody"
    CSV = "csv"
    JSON = "json"

# In-memory store for import jobs (in production, use Redis or database)
import_jobs: Dict[str, Dict[str, Any]] = {}

@router.post("/upload", response_model=schemas.ImportUploadResponse)
async def upload_import_file(
    file: UploadFile = File(...),
    source_type: ImportSourceType = ImportSourceType.CSV,
    import_type: str = Query(..., description="Type of data to import: clients, appointments, services"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """
    Upload a file for data import.
    
    Supported formats:
    - CSV files with proper headers
    - JSON files with structured data
    - Booksy export files
    - Square export files
    - Acuity export files
    - MindBody export files
    
    Returns an import_id for tracking progress.
    """
    # Validate file upload
    try:
        await validate_file_upload(file, max_size=50 * 1024 * 1024)  # 50MB limit
    except InputValidationError as e:
        raise HTTPException(status_code=413, detail=str(e))
    
    allowed_extensions = {".csv", ".json", ".xlsx", ".xls"}
    file_extension = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique import ID
    import_id = str(uuid.uuid4())
    
    try:
        # Read file content
        content = await file.read()
        
        # Validate import type
        valid_import_types = ["clients", "appointments", "services", "barbers", "payments"]
        if import_type not in valid_import_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid import type. Must be one of: {', '.join(valid_import_types)}"
            )
        
        # Initialize import job
        import_jobs[import_id] = {
            "id": import_id,
            "filename": file.filename,
            "source_type": source_type,
            "import_type": import_type,
            "file_size": file.size,
            "content_type": file.content_type,
            "status": "uploaded",
            "progress": 0,
            "total_records": 0,
            "processed_records": 0,
            "successful_imports": 0,
            "failed_imports": 0,
            "errors": [],
            "warnings": [],
            "uploaded_at": datetime.utcnow().isoformat(),
            "uploaded_by": current_user.id,
            "file_content": content.decode('utf-8') if file_extension in [".csv", ".json"] else None
        }
        
        # Start background processing for initial validation
        background_tasks.add_task(
            validate_import_file,
            import_id,
            content,
            source_type,
            import_type,
            file_extension
        )
        
        return {
            "import_id": import_id,
            "filename": file.filename,
            "source_type": source_type,
            "import_type": import_type,
            "file_size": file.size,
            "status": "uploaded",
            "message": "File uploaded successfully. Use the import_id to check progress and preview data.",
            "uploaded_at": import_jobs[import_id]["uploaded_at"]
        }
        
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File encoding not supported. Please ensure file is UTF-8 encoded."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {str(e)}")


@router.get("/{import_id}/status", response_model=schemas.ImportStatusResponse)
async def get_import_status(
    import_id: str,
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the current status and progress of an import job.
    
    Returns detailed progress information including:
    - Overall status (uploaded, validating, validated, importing, completed, failed)
    - Progress percentage
    - Record counts (total, processed, successful, failed)
    - Error and warning messages
    """
    if import_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Import job not found")
    
    job = import_jobs[import_id]
    
    # Check if user has permission to view this import
    if current_user.role not in ["admin", "super_admin"] and job.get("uploaded_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this import job")
    
    return {
        "import_id": import_id,
        "filename": job.get("filename"),
        "source_type": job.get("source_type"),
        "import_type": job.get("import_type"),
        "status": job.get("status"),
        "progress": job.get("progress", 0),
        "total_records": job.get("total_records", 0),
        "processed_records": job.get("processed_records", 0),
        "successful_imports": job.get("successful_imports", 0),
        "failed_imports": job.get("failed_imports", 0),
        "errors": job.get("errors", []),
        "warnings": job.get("warnings", []),
        "uploaded_at": job.get("uploaded_at"),
        "started_at": job.get("started_at"),
        "completed_at": job.get("completed_at"),
        "estimated_completion": job.get("estimated_completion")
    }


@router.post("/{import_id}/preview", response_model=schemas.ImportPreviewResponse)
async def preview_import_data(
    import_id: str,
    preview_request: schemas.ImportPreviewRequest,
    current_user: models.User = Depends(require_admin_role)
):
    """
    Preview the data that will be imported before executing the import.
    
    Shows:
    - Sample records from the file
    - Field mapping validation
    - Data validation results
    - Potential conflicts or duplicates
    - Import recommendations
    """
    if import_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Import job not found")
    
    job = import_jobs[import_id]
    
    if job["status"] not in ["uploaded", "validated", "validating"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot preview import in status: {job['status']}"
        )
    
    try:
        # Parse file content based on source type and format
        file_content = job.get("file_content")
        if not file_content:
            raise HTTPException(status_code=400, detail="File content not available for preview")
        
        import_service = ImportService()
        preview_data = import_service.generate_preview(
            content=file_content,
            source_type=job["source_type"],
            import_type=job["import_type"],
            field_mapping=preview_request.field_mapping,
            max_records=preview_request.max_preview_records
        )
        
        # Update job status
        import_jobs[import_id]["status"] = "validated"
        import_jobs[import_id]["preview_generated_at"] = datetime.utcnow().isoformat()
        
        return {
            "import_id": import_id,
            "preview_records": preview_data["sample_records"],
            "total_records": preview_data["total_records"],
            "field_mapping": preview_data["suggested_mapping"],
            "validation_results": preview_data["validation_results"],
            "potential_duplicates": preview_data["potential_duplicates"],
            "data_quality_issues": preview_data["data_quality_issues"],
            "import_recommendations": preview_data["recommendations"],
            "estimated_duration": preview_data["estimated_duration"]
        }
        
    except Exception as e:
        import_jobs[import_id]["status"] = "validation_failed"
        import_jobs[import_id]["errors"].append(f"Preview generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


@router.post("/{import_id}/execute", response_model=schemas.ImportExecutionResponse)
async def execute_import(
    import_id: str,
    execution_request: schemas.ImportExecutionRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """
    Start the actual import process using the validated data and field mappings.
    
    Options:
    - Skip duplicates or update existing records
    - Validation level (strict, moderate, lenient)
    - Rollback strategy if errors occur
    - Notification preferences
    """
    if import_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Import job not found")
    
    job = import_jobs[import_id]
    
    if job["status"] != "validated":
        raise HTTPException(
            status_code=400,
            detail=f"Import must be validated before execution. Current status: {job['status']}"
        )
    
    # Update job status
    import_jobs[import_id]["status"] = "importing"
    import_jobs[import_id]["started_at"] = datetime.utcnow().isoformat()
    import_jobs[import_id]["execution_options"] = execution_request.dict()
    
    # Start background import process
    background_tasks.add_task(
        execute_import_job,
        import_id,
        execution_request,
        current_user.id,
        db
    )
    
    return {
        "import_id": import_id,
        "status": "importing",
        "message": "Import job started successfully. Monitor progress using the status endpoint.",
        "started_at": import_jobs[import_id]["started_at"],
        "execution_options": execution_request.dict()
    }


@router.delete("/{import_id}/rollback", response_model=schemas.ImportRollbackResponse)
async def rollback_import(
    import_id: str,
    rollback_request: schemas.ImportRollbackRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """
    Rollback a completed import by removing or reverting imported data.
    
    Options:
    - Soft delete (mark as inactive)
    - Hard delete (permanent removal)
    - Selective rollback (specific record types or date ranges)
    """
    if import_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Import job not found")
    
    job = import_jobs[import_id]
    
    if job["status"] not in ["completed", "partially_completed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Can only rollback completed imports. Current status: {job['status']}"
        )
    
    if not job.get("imported_record_ids"):
        raise HTTPException(
            status_code=400,
            detail="No import record tracking found. Cannot perform rollback."
        )
    
    # Start rollback process
    rollback_id = str(uuid.uuid4())
    import_jobs[import_id]["rollback_status"] = "rolling_back"
    import_jobs[import_id]["rollback_started_at"] = datetime.utcnow().isoformat()
    import_jobs[import_id]["rollback_id"] = rollback_id
    
    background_tasks.add_task(
        execute_rollback_job,
        import_id,
        rollback_request,
        current_user.id,
        db
    )
    
    return {
        "import_id": import_id,
        "rollback_id": rollback_id,
        "status": "rolling_back",
        "message": "Rollback process started. Monitor progress using the status endpoint.",
        "rollback_type": rollback_request.rollback_type,
        "started_at": import_jobs[import_id]["rollback_started_at"]
    }


@router.get("/history", response_model=schemas.ImportHistoryResponse)
async def get_import_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Records per page"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    import_type_filter: Optional[str] = Query(None, description="Filter by import type"),
    date_from: Optional[datetime] = Query(None, description="Filter imports from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter imports to this date"),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get paginated history of import jobs with filtering options.
    
    Returns summary information for each import including:
    - Basic job details
    - Status and progress
    - Record counts
    - Duration and timing
    """
    # Filter jobs based on user permissions
    filtered_jobs = []
    for job_id, job in import_jobs.items():
        # Admins can see all imports, users can only see their own
        if current_user.role in ["admin", "super_admin"] or job.get("uploaded_by") == current_user.id:
            # Apply filters
            if status_filter and job.get("status") != status_filter:
                continue
            if import_type_filter and job.get("import_type") != import_type_filter:
                continue
            if date_from:
                job_date = datetime.fromisoformat(job.get("uploaded_at", "1970-01-01"))
                if job_date < date_from:
                    continue
            if date_to:
                job_date = datetime.fromisoformat(job.get("uploaded_at", "1970-01-01"))
                if job_date > date_to:
                    continue
            
            filtered_jobs.append({
                "import_id": job_id,
                "filename": job.get("filename"),
                "source_type": job.get("source_type"),
                "import_type": job.get("import_type"),
                "status": job.get("status"),
                "total_records": job.get("total_records", 0),
                "successful_imports": job.get("successful_imports", 0),
                "failed_imports": job.get("failed_imports", 0),
                "uploaded_at": job.get("uploaded_at"),
                "completed_at": job.get("completed_at"),
                "uploaded_by": job.get("uploaded_by")
            })
    
    # Sort by upload date (newest first)
    filtered_jobs.sort(key=lambda x: x["uploaded_at"], reverse=True)
    
    # Paginate results
    total_jobs = len(filtered_jobs)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_jobs = filtered_jobs[start_idx:end_idx]
    
    return {
        "imports": paginated_jobs,
        "total": total_jobs,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_jobs + page_size - 1) // page_size
    }


# Background task functions

async def validate_import_file(
    import_id: str,
    content: bytes,
    source_type: str,
    import_type: str,
    file_extension: str
):
    """Background task to validate uploaded import file"""
    try:
        import_jobs[import_id]["status"] = "validating"
        
        # Decode content
        if file_extension in [".csv", ".json"]:
            file_content = content.decode('utf-8')
        else:
            # For Excel files, would need additional processing
            import_jobs[import_id]["status"] = "validation_failed"
            import_jobs[import_id]["errors"].append("Excel file processing not yet implemented")
            return
        
        # Parse and validate content
        import_service = ImportService()
        validation_result = import_service.validate_file(
            content=file_content,
            source_type=source_type,
            import_type=import_type,
            file_extension=file_extension
        )
        
        # Update job with validation results
        import_jobs[import_id].update({
            "status": "validated" if validation_result["is_valid"] else "validation_failed",
            "total_records": validation_result["total_records"],
            "errors": validation_result["errors"],
            "warnings": validation_result["warnings"],
            "validation_completed_at": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        import_jobs[import_id]["status"] = "validation_failed"
        import_jobs[import_id]["errors"].append(f"Validation error: {str(e)}")


async def execute_import_job(
    import_id: str,
    execution_request: schemas.ImportExecutionRequest,
    user_id: int,
    db: Session
):
    """Background task to execute the actual import"""
    try:
        job = import_jobs[import_id]
        import_service = ImportService()
        
        # Execute import with progress tracking
        result = import_service.execute_import(
            content=job["file_content"],
            source_type=job["source_type"],
            import_type=job["import_type"],
            field_mapping=execution_request.field_mapping,
            options=execution_request.dict(),
            progress_callback=lambda progress: update_import_progress(import_id, progress),
            db=db,
            user_id=user_id
        )
        
        # Update job with final results
        import_jobs[import_id].update({
            "status": "completed" if result["success"] else "failed",
            "processed_records": result["processed_records"],
            "successful_imports": result["successful_imports"],
            "failed_imports": result["failed_imports"],
            "imported_record_ids": result.get("imported_record_ids", []),
            "progress": 100,
            "completed_at": datetime.utcnow().isoformat(),
            "execution_summary": result["summary"]
        })
        
        if result["errors"]:
            import_jobs[import_id]["errors"].extend(result["errors"])
        if result["warnings"]:
            import_jobs[import_id]["warnings"].extend(result["warnings"])
            
    except Exception as e:
        import_jobs[import_id]["status"] = "failed"
        import_jobs[import_id]["errors"].append(f"Import execution error: {str(e)}")
        import_jobs[import_id]["completed_at"] = datetime.utcnow().isoformat()


async def execute_rollback_job(
    import_id: str,
    rollback_request: schemas.ImportRollbackRequest,
    user_id: int,
    db: Session
):
    """Background task to execute import rollback"""
    try:
        job = import_jobs[import_id]
        import_service = ImportService()
        
        result = import_service.rollback_import(
            import_id=import_id,
            imported_record_ids=job["imported_record_ids"],
            rollback_type=rollback_request.rollback_type,
            selective_criteria=rollback_request.selective_criteria,
            db=db,
            user_id=user_id
        )
        
        import_jobs[import_id].update({
            "rollback_status": "completed" if result["success"] else "failed",
            "rollback_completed_at": datetime.utcnow().isoformat(),
            "rollback_summary": result["summary"]
        })
        
    except Exception as e:
        import_jobs[import_id]["rollback_status"] = "failed"
        import_jobs[import_id]["rollback_error"] = f"Rollback error: {str(e)}"


def update_import_progress(import_id: str, progress_data: Dict[str, Any]):
    """Update import progress in real-time"""
    if import_id in import_jobs:
        import_jobs[import_id].update({
            "progress": progress_data.get("percentage", 0),
            "processed_records": progress_data.get("processed", 0),
            "successful_imports": progress_data.get("successful", 0),
            "failed_imports": progress_data.get("failed", 0),
            "current_operation": progress_data.get("operation", "Processing"),
            "estimated_completion": progress_data.get("estimated_completion")
        })