"""
Error reporting and monitoring endpoints
Production-grade error tracking and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, validator
import json
import logging
from collections import defaultdict, Counter
import hashlib
import uuid

from config.database import get_db
from utils.input_validation import InputValidationError, ProductionInputValidator
from middleware.error_handling import get_request_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/errors", tags=["Error Reporting"])


# Pydantic models for error reporting
class ErrorContext(BaseModel):
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    page: Optional[str] = None
    component: Optional[str] = None
    action: Optional[str] = None
    api_endpoint: Optional[str] = None
    request_id: Optional[str] = None
    timestamp: int
    user_agent: str
    url: str
    session_id: Optional[str] = None
    build_version: Optional[str] = None
    feature: Optional[str] = None

    @validator('url', 'user_agent', 'page', 'component', 'action', 'api_endpoint')
    def validate_strings(cls, v):
        if v:
            ProductionInputValidator.validate_comprehensive_input(v, "error_context")
        return v


class ErrorDetails(BaseModel):
    name: str
    message: str
    stack: Optional[str] = None
    cause: Optional[str] = None
    code: Optional[str] = None
    status: Optional[int] = None
    severity: str = Field(..., regex="^(low|medium|high|critical)$")
    category: str = Field(..., regex="^(javascript|api|network|auth|validation|business|ui|performance)$")
    context: ErrorContext
    fingerprint: str
    tags: List[str] = []
    metadata: Optional[Dict[str, Any]] = None

    @validator('name', 'message', 'stack', 'cause', 'code')
    def validate_error_fields(cls, v):
        if v:
            ProductionInputValidator.validate_comprehensive_input(str(v), "error_field")
        return v

    @validator('tags')
    def validate_tags(cls, v):
        if v:
            for tag in v:
                ProductionInputValidator.validate_comprehensive_input(tag, "error_tag")
        return v[:10]  # Limit number of tags


class ErrorEvent(BaseModel):
    id: str
    error: ErrorDetails
    occurred_at: int
    reported_at: int
    count: int = 1
    resolved: bool = False

    @validator('id')
    def validate_id(cls, v):
        ProductionInputValidator.validate_comprehensive_input(v, "error_id")
        return v


class ErrorReport(BaseModel):
    errors: List[ErrorEvent] = Field(..., max_items=100)  # Limit batch size
    session_id: str
    reported_at: int

    @validator('session_id')
    def validate_session_id(cls, v):
        ProductionInputValidator.validate_comprehensive_input(v, "session_id")
        return v


class ErrorSummaryRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    limit: Optional[int] = Field(default=100, ge=1, le=1000)


# In-memory error storage for development (use database/Redis in production)
class ErrorStorage:
    def __init__(self):
        self.errors: Dict[str, List[ErrorEvent]] = defaultdict(list)
        self.error_counts: Dict[str, int] = defaultdict(int)
        self.max_errors_per_fingerprint = 1000
        self.max_total_errors = 10000

    def store_errors(self, errors: List[ErrorEvent]) -> Dict[str, Any]:
        stored_count = 0
        skipped_count = 0
        
        for error_event in errors:
            fingerprint = error_event.error.fingerprint
            
            # Rate limiting per fingerprint
            if len(self.errors[fingerprint]) >= self.max_errors_per_fingerprint:
                # Remove oldest errors for this fingerprint
                self.errors[fingerprint] = self.errors[fingerprint][-self.max_errors_per_fingerprint//2:]
            
            # Check for duplicate (same ID)
            existing_ids = {e.id for e in self.errors[fingerprint]}
            if error_event.id in existing_ids:
                skipped_count += 1
                continue
            
            self.errors[fingerprint].append(error_event)
            self.error_counts[fingerprint] += error_event.count
            stored_count += 1
        
        # Global cleanup if too many errors
        total_errors = sum(len(errors) for errors in self.errors.values())
        if total_errors > self.max_total_errors:
            self._cleanup_old_errors()
        
        return {
            "stored": stored_count,
            "skipped": skipped_count,
            "total_unique_errors": len(self.errors),
            "total_error_events": sum(len(errors) for errors in self.errors.values())
        }

    def _cleanup_old_errors(self):
        """Remove oldest errors globally"""
        all_errors = []
        for fingerprint, errors in self.errors.items():
            for error in errors:
                all_errors.append((fingerprint, error))
        
        # Sort by occurred_at and keep newest half
        all_errors.sort(key=lambda x: x[1].occurred_at, reverse=True)
        keep_count = self.max_total_errors // 2
        
        # Clear and rebuild
        self.errors.clear()
        self.error_counts.clear()
        
        for fingerprint, error in all_errors[:keep_count]:
            self.errors[fingerprint].append(error)
            self.error_counts[fingerprint] += error.count

    def get_error_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        
        filtered_errors = []
        
        for fingerprint, errors in self.errors.items():
            for error in errors:
                # Apply filters
                error_time = datetime.fromtimestamp(error.occurred_at / 1000)
                
                if start_date and error_time < start_date:
                    continue
                if end_date and error_time > end_date:
                    continue
                if category and error.error.category != category:
                    continue
                if severity and error.error.severity != severity:
                    continue
                
                filtered_errors.append(error)
        
        # Sort by occurrence time (newest first)
        filtered_errors.sort(key=lambda x: x.occurred_at, reverse=True)
        
        # Calculate statistics
        total_errors = len(filtered_errors)
        
        category_counts = Counter(error.error.category for error in filtered_errors)
        severity_counts = Counter(error.error.severity for error in filtered_errors)
        
        # Group by fingerprint for top errors
        fingerprint_groups = defaultdict(list)
        for error in filtered_errors:
            fingerprint_groups[error.error.fingerprint].append(error)
        
        top_errors = []
        for fingerprint, group in fingerprint_groups.items():
            total_count = sum(error.count for error in group)
            latest_error = max(group, key=lambda x: x.occurred_at)
            
            top_errors.append({
                "fingerprint": fingerprint,
                "message": latest_error.error.message,
                "category": latest_error.error.category,
                "severity": latest_error.error.severity,
                "count": total_count,
                "first_seen": min(error.occurred_at for error in group),
                "last_seen": max(error.occurred_at for error in group),
                "affected_users": len(set(
                    error.error.context.user_id for error in group 
                    if error.error.context.user_id
                ))
            })
        
        top_errors.sort(key=lambda x: x["count"], reverse=True)
        
        return {
            "total_errors": total_errors,
            "unique_errors": len(fingerprint_groups),
            "category_breakdown": dict(category_counts),
            "severity_breakdown": dict(severity_counts),
            "top_errors": top_errors[:20],  # Top 20 errors
            "recent_errors": filtered_errors[:limit],
            "summary_generated_at": datetime.utcnow().isoformat()
        }

    def get_error_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Get error trends over time"""
        now = datetime.utcnow()
        start_time = now - timedelta(hours=hours)
        
        # Create hourly buckets
        buckets = []
        for i in range(hours):
            bucket_start = start_time + timedelta(hours=i)
            bucket_end = bucket_start + timedelta(hours=1)
            buckets.append({
                "hour": bucket_start.isoformat(),
                "errors": 0,
                "categories": defaultdict(int),
                "severities": defaultdict(int)
            })
        
        # Fill buckets with error data
        for errors in self.errors.values():
            for error in errors:
                error_time = datetime.fromtimestamp(error.occurred_at / 1000)
                
                if error_time >= start_time and error_time <= now:
                    hour_index = int((error_time - start_time).total_seconds() // 3600)
                    if 0 <= hour_index < len(buckets):
                        buckets[hour_index]["errors"] += error.count
                        buckets[hour_index]["categories"][error.error.category] += error.count
                        buckets[hour_index]["severities"][error.error.severity] += error.count
        
        return {
            "period_hours": hours,
            "period_start": start_time.isoformat(),
            "period_end": now.isoformat(),
            "hourly_data": buckets,
            "total_errors": sum(bucket["errors"] for bucket in buckets)
        }


# Global error storage instance
error_storage = ErrorStorage()


@router.post("/report", summary="Report client-side errors")
async def report_errors(
    error_report: ErrorReport,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receive and process client-side error reports
    """
    try:
        request_id = get_request_id(request)
        
        # Validate and sanitize error report
        if not error_report.errors:
            raise InputValidationError("No errors provided in report")
        
        if len(error_report.errors) > 100:
            raise InputValidationError("Too many errors in single report (max 100)")
        
        # Store errors
        storage_result = error_storage.store_errors(error_report.errors)
        
        # Log critical errors immediately
        critical_errors = [
            error for error in error_report.errors 
            if error.error.severity == "critical"
        ]
        
        if critical_errors:
            background_tasks.add_task(
                log_critical_errors, critical_errors, request_id
            )
        
        # Log summary for monitoring
        logger.info(f"Error report processed: {storage_result}", extra={
            "request_id": request_id,
            "session_id": error_report.session_id,
            "error_count": len(error_report.errors),
            "critical_count": len(critical_errors)
        })
        
        return {
            "message": "Error report received",
            "request_id": request_id,
            "processing_result": storage_result
        }
        
    except Exception as e:
        logger.error(f"Failed to process error report: {str(e)}", extra={
            "request_id": get_request_id(request),
            "session_id": error_report.session_id if error_report else None
        })
        raise HTTPException(
            status_code=500,
            detail="Failed to process error report"
        )


@router.get("/summary", summary="Get error summary and analytics")
async def get_error_summary(
    request: ErrorSummaryRequest = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive error summary and analytics
    """
    try:
        # Parse date filters
        start_date = None
        end_date = None
        
        if request.start_date:
            try:
                start_date = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
            except ValueError:
                raise InputValidationError("Invalid start_date format")
        
        if request.end_date:
            try:
                end_date = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
            except ValueError:
                raise InputValidationError("Invalid end_date format")
        
        # Validate filters
        if request.category:
            ProductionInputValidator.validate_comprehensive_input(request.category, "category")
        
        if request.severity:
            ProductionInputValidator.validate_comprehensive_input(request.severity, "severity")
        
        # Get error summary
        summary = error_storage.get_error_summary(
            start_date=start_date,
            end_date=end_date,
            category=request.category,
            severity=request.severity,
            limit=request.limit
        )
        
        return summary
        
    except InputValidationError:
        raise
    except Exception as e:
        logger.error(f"Failed to get error summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error summary"
        )


@router.get("/trends", summary="Get error trends over time")
async def get_error_trends(
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """
    Get error trends and patterns over specified time period
    """
    try:
        if hours < 1 or hours > 168:  # Max 1 week
            raise InputValidationError("Hours must be between 1 and 168")
        
        trends = error_storage.get_error_trends(hours)
        return trends
        
    except InputValidationError:
        raise
    except Exception as e:
        logger.error(f"Failed to get error trends: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve error trends"
        )


@router.get("/health", summary="Error monitoring system health")
async def get_monitoring_health():
    """
    Get health status of error monitoring system
    """
    try:
        total_errors = sum(len(errors) for errors in error_storage.errors.values())
        unique_fingerprints = len(error_storage.errors)
        
        # Get recent error rate (last hour)
        now = datetime.utcnow()
        one_hour_ago = now - timedelta(hours=1)
        
        recent_errors = 0
        for errors in error_storage.errors.values():
            for error in errors:
                error_time = datetime.fromtimestamp(error.occurred_at / 1000)
                if error_time >= one_hour_ago:
                    recent_errors += error.count
        
        return {
            "status": "healthy",
            "total_error_events": total_errors,
            "unique_error_types": unique_fingerprints,
            "errors_last_hour": recent_errors,
            "storage_utilization": {
                "current_errors": total_errors,
                "max_errors": error_storage.max_total_errors,
                "utilization_percent": (total_errors / error_storage.max_total_errors) * 100
            },
            "timestamp": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error monitoring health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.delete("/clear", summary="Clear error storage (development only)")
async def clear_errors(
    db: Session = Depends(get_db)
):
    """
    Clear all stored errors (development/testing only)
    """
    if not os.getenv("ENVIRONMENT", "development").lower() == "development":
        raise HTTPException(
            status_code=403,
            detail="Error clearing only available in development environment"
        )
    
    error_storage.errors.clear()
    error_storage.error_counts.clear()
    
    return {
        "message": "Error storage cleared",
        "timestamp": datetime.utcnow().isoformat()
    }


# Background task for critical error handling
async def log_critical_errors(errors: List[ErrorEvent], request_id: str):
    """
    Handle critical errors with immediate alerting
    """
    for error in errors:
        logger.critical(
            f"CRITICAL ERROR REPORTED: {error.error.message}",
            extra={
                "request_id": request_id,
                "error_id": error.id,
                "fingerprint": error.error.fingerprint,
                "user_id": error.error.context.user_id,
                "component": error.error.context.component,
                "category": error.error.category,
                "stack_trace": error.error.stack,
                "metadata": error.error.metadata
            }
        )
        
        # In production, you could send alerts here:
        # - Send to Slack/Discord webhook
        # - Send email alerts
        # - Create PagerDuty incidents
        # - Push to external monitoring services


# Export router
__all__ = ["router"]