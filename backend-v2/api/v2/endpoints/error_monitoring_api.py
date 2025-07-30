"""
Enhanced Error Monitoring API Endpoints
Provides comprehensive error tracking, reporting, and analytics
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from services.error_monitoring_service import (
    error_monitoring_service, 
    ErrorSeverity, 
    ErrorCategory, 
    BusinessImpact,
    ErrorEvent
)
from services.alert_service import alert_service
from services.sentry_monitoring import sentry_service
from db import get_db
from utils.auth import get_current_user
from utils.rate_limiter import rate_limit
from utils.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Request/Response Models
class ErrorReportRequest(BaseModel):
    """Client error report request"""
    id: str
    sessionId: str
    timestamp: str
    error: Dict[str, Any]
    classification: Dict[str, str]
    context: Dict[str, Any]
    performanceMetrics: Optional[Dict[str, Any]] = None
    userContext: Optional[Dict[str, Any]] = None
    url: str
    userAgent: str
    viewport: Dict[str, int]
    buildVersion: str = "unknown"

    @validator('classification')
    def validate_classification(cls, v):
        required_fields = ['severity', 'category', 'businessImpact', 'isRecoverable', 'autoRetryable']
        for field in required_fields:
            if field not in v:
                raise ValueError(f'Missing required classification field: {field}')
        return v

class ErrorAnalyticsRequest(BaseModel):
    """Error analytics query request"""
    timeframe: str = Field(default="24h", regex="^(1h|6h|24h|7d|30d)$")
    severity: Optional[List[str]] = None
    category: Optional[List[str]] = None
    business_impact: Optional[List[str]] = None
    include_resolved: bool = False
    include_patterns: bool = True
    limit: int = Field(default=100, ge=1, le=1000)

class UserFeedbackRequest(BaseModel):
    """User feedback on errors"""
    errorId: str
    userEmail: Optional[str] = None
    description: str = Field(min_length=10, max_length=1000)
    reproductionSteps: Optional[str] = Field(max_length=2000)
    expectedBehavior: Optional[str] = Field(max_length=500)
    severity: str = Field(regex="^(blocking|annoying|minor)$")
    category: str

class ErrorResolutionRequest(BaseModel):
    """Manual error resolution"""
    errorId: str
    resolutionMethod: str
    notes: Optional[str] = None

class AlertConfigRequest(BaseModel):
    """Alert configuration"""
    error_rate_threshold: float = Field(ge=0.1, le=100.0)
    critical_error_threshold: int = Field(ge=1, le=100)
    notification_channels: List[str]
    alert_cooldown_minutes: int = Field(ge=5, le=120)

# Error Reporting Endpoints
@router.post("/report")
async def report_error(
    request: ErrorReportRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """
    Report a client-side error for monitoring and analysis
    """
    try:
        # Extract client IP and additional context
        client_ip = http_request.client.host if http_request.client else "unknown"
        
        # Convert request to internal error format
        error_event = await error_monitoring_service.capture_error(
            message=request.error.get('message', 'Unknown error'),
            severity=ErrorSeverity(request.classification['severity']),
            category=ErrorCategory(request.classification['category']),
            business_impact=BusinessImpact(request.classification['businessImpact']),
            context={
                **request.context,
                'frontend_error_id': request.id,
                'session_id': request.sessionId,
                'build_version': request.buildVersion,
                'viewport': request.viewport,
                'performance_metrics': request.performanceMetrics,
                'client_timestamp': request.timestamp
            },
            user_id=request.userContext.get('id') if request.userContext else None,
            session_id=request.sessionId,
            endpoint=request.url,
            user_agent=request.userAgent,
            ip_address=client_ip,
            error_code=request.error.get('type', 'client_error')
        )
        
        # Schedule background processing
        background_tasks.add_task(
            process_error_background,
            error_event,
            request.classification.get('isRecoverable', False),
            request.classification.get('autoRetryable', False)
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "errorId": error_event.id,
                "message": "Error reported successfully",
                "autoRecoveryAttempted": request.classification.get('autoRetryable', False)
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to report error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to process error report",
                "error": str(e)
            }
        )

@router.post("/feedback")
async def submit_user_feedback(
    request: UserFeedbackRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submit user feedback for a specific error
    """
    try:
        # Find the error in the monitoring service
        active_errors = error_monitoring_service.active_errors
        
        if request.errorId not in active_errors:
            raise HTTPException(
                status_code=404,
                detail="Error not found or already resolved"
            )
        
        error_event = active_errors[request.errorId]
        
        # Add feedback to error context
        if not error_event.context:
            error_event.context = {}
        
        error_event.context['user_feedback'] = {
            'description': request.description,
            'reproduction_steps': request.reproductionSteps,
            'expected_behavior': request.expectedBehavior,
            'user_severity': request.severity,
            'category': request.category,
            'user_email': request.userEmail,
            'feedback_timestamp': datetime.utcnow().isoformat()
        }
        
        # Schedule feedback processing
        background_tasks.add_task(
            process_user_feedback_background,
            error_event,
            request
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Feedback submitted successfully",
                "ticketCreated": error_event.severity in [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")

# Analytics and Reporting Endpoints
@router.get("/analytics")
async def get_error_analytics(
    timeframe: str = "24h",
    severity: Optional[str] = None,
    category: Optional[str] = None,
    include_resolved: bool = False,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive error analytics and trends
    """
    try:
        # Check permissions
        if not current_user.is_admin and not current_user.is_shop_owner:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get dashboard data from monitoring service
        dashboard_data = await error_monitoring_service.get_dashboard_data()
        
        # Get business impact summary
        business_impact = await error_monitoring_service.get_business_impact_summary()
        
        # Calculate time-based metrics
        time_metrics = await calculate_time_based_metrics(timeframe, db)
        
        # Get error trends
        error_trends = await get_error_trends(timeframe, db)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "summary": dashboard_data["summary"],
                    "breakdown": dashboard_data["breakdown"],
                    "trends": dashboard_data["trends"],
                    "business_impact": business_impact,
                    "time_metrics": time_metrics,
                    "error_trends": error_trends,
                    "top_patterns": dashboard_data["top_patterns"],
                    "resolution_strategies": dashboard_data["resolution_strategies"],
                    "generated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")

@router.get("/dashboard")
async def get_error_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time error monitoring dashboard data
    """
    try:
        # Check permissions
        if not current_user.is_admin and not current_user.is_shop_owner:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get real-time dashboard data
        dashboard_data = await error_monitoring_service.get_dashboard_data()
        
        # Add system health metrics
        system_health = await get_system_health_metrics(db)
        
        # Get recent critical errors
        critical_errors = await get_recent_critical_errors(db)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    **dashboard_data,
                    "system_health": system_health,
                    "critical_errors": critical_errors,
                    "alerts": {
                        "active_alerts": len([e for e in error_monitoring_service.active_errors.values() 
                                            if not e.resolved and e.severity == ErrorSeverity.CRITICAL]),
                        "error_rate_alert": await error_monitoring_service.get_error_rate(5) > 10,
                        "system_health_alert": system_health["status"] != "healthy"
                    }
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard")

# Error Resolution Endpoints
@router.post("/resolve")
async def resolve_error(
    request: ErrorResolutionRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually resolve an error
    """
    try:
        # Check permissions
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin permissions required")
        
        # Resolve the error
        success = await error_monitoring_service.resolve_error(
            request.errorId,
            f"Manual resolution by {current_user.email}: {request.resolutionMethod}",
            auto_resolved=False
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Error not found")
        
        # Log resolution
        logger.info(f"Error {request.errorId} resolved manually by {current_user.email}")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Error resolved successfully"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve error: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve error")

@router.get("/patterns")
async def get_error_patterns(
    limit: int = 20,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get error patterns for analysis
    """
    try:
        # Check permissions
        if not current_user.is_admin and not current_user.is_shop_owner:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        patterns = list(error_monitoring_service.error_patterns.values())
        
        # Sort by occurrence count
        patterns.sort(key=lambda p: p.occurrence_count, reverse=True)
        
        # Limit results
        patterns = patterns[:limit]
        
        # Convert to dict format
        pattern_data = []
        for pattern in patterns:
            pattern_data.append({
                "pattern_id": pattern.pattern_id,
                "error_signature": pattern.error_signature[:100],
                "occurrence_count": pattern.occurrence_count,
                "first_seen": pattern.first_seen.isoformat(),
                "last_seen": pattern.last_seen.isoformat(),
                "severity": pattern.severity.value,
                "category": pattern.category.value,
                "business_impact": pattern.business_impact.value,
                "auto_resolution_strategy": pattern.auto_resolution_strategy,
                "resolution_success_rate": pattern.resolution_success_rate
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "patterns": pattern_data,
                    "total_patterns": len(error_monitoring_service.error_patterns),
                    "generated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get patterns: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve patterns")

# Configuration Endpoints
@router.post("/alerts/configure")
async def configure_alerts(
    config: AlertConfigRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Configure error monitoring alerts
    """
    try:
        # Check permissions
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin permissions required")
        
        # Update alert configuration
        alert_config = {
            "error_rate_threshold": config.error_rate_threshold,
            "critical_error_threshold": config.critical_error_threshold,
            "notification_channels": config.notification_channels,
            "alert_cooldown_minutes": config.alert_cooldown_minutes,
            "updated_by": current_user.email,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Store configuration (implement based on your config storage)
        # For now, we'll use the alert service
        await alert_service.update_configuration(alert_config)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Alert configuration updated successfully",
                "config": alert_config
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to configure alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to configure alerts")

# Health Check Endpoint
@router.get("/health")
async def health_check():
    """
    Health check for error monitoring system
    """
    try:
        # Check monitoring service health
        monitoring_health = {
            "active_errors": len(error_monitoring_service.active_errors),
            "error_patterns": len(error_monitoring_service.error_patterns),
            "monitoring_enabled": error_monitoring_service._monitoring_enabled,
            "auto_resolution_rate": error_monitoring_service.auto_resolution_success_rate,
            "current_error_rate": await error_monitoring_service.get_error_rate(5)
        }
        
        # Determine overall health
        is_healthy = (
            monitoring_health["monitoring_enabled"] and
            monitoring_health["current_error_rate"] < 20 and  # Less than 20 errors/min
            len([e for e in error_monitoring_service.active_errors.values() 
                 if e.severity == ErrorSeverity.CRITICAL and not e.resolved]) < 5
        )
        
        return JSONResponse(
            status_code=200 if is_healthy else 503,
            content={
                "status": "healthy" if is_healthy else "degraded",
                "monitoring": monitoring_health,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

# Background Task Functions
async def process_error_background(error_event: ErrorEvent, is_recoverable: bool, auto_retryable: bool):
    """Background processing for reported errors"""
    try:
        # Send alerts for critical errors
        if error_event.severity == ErrorSeverity.CRITICAL:
            await alert_service.send_critical_error_alert(error_event)
        
        # Check for error pattern escalation
        pattern_signature = error_monitoring_service._generate_error_signature(
            error_event.message, 
            error_event.endpoint, 
            None
        )
        
        pattern = error_monitoring_service.error_patterns.get(pattern_signature)
        if pattern and pattern.occurrence_count >= 10:
            await alert_service.send_error_pattern_alert(pattern)
        
        # Auto-recovery attempt for retryable errors
        if auto_retryable and error_event.retry_count < 3:
            await asyncio.sleep(2 ** error_event.retry_count)  # Exponential backoff
            # Implement recovery logic based on error type
            
    except Exception as e:
        logger.error(f"Background error processing failed: {e}")

async def process_user_feedback_background(error_event: ErrorEvent, feedback: UserFeedbackRequest):
    """Background processing for user feedback"""
    try:
        # Create support ticket for blocking issues
        if feedback.severity == "blocking":
            await create_support_ticket(error_event, feedback)
        
        # Update error priority based on user feedback
        if feedback.severity == "blocking":
            error_event.severity = ErrorSeverity.CRITICAL
        elif feedback.severity == "annoying":
            if error_event.severity == ErrorSeverity.LOW:
                error_event.severity = ErrorSeverity.MEDIUM
        
        # Send feedback to development team
        await alert_service.send_user_feedback_notification(error_event, feedback)
        
    except Exception as e:
        logger.error(f"Background feedback processing failed: {e}")

# Helper Functions
async def calculate_time_based_metrics(timeframe: str, db: Session) -> Dict[str, Any]:
    """Calculate time-based error metrics"""
    hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
    hours = hours_map.get(timeframe, 24)
    
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    # Count errors by time period
    # This would typically query your error storage
    # For now, use the in-memory service data
    
    recent_errors = [
        err for err in error_monitoring_service.active_errors.values()
        if err.timestamp > cutoff_time
    ]
    
    return {
        "total_errors": len(recent_errors),
        "error_rate": len(recent_errors) / hours,
        "critical_errors": len([e for e in recent_errors if e.severity == ErrorSeverity.CRITICAL]),
        "resolved_errors": len([e for e in recent_errors if e.resolved]),
        "resolution_rate": len([e for e in recent_errors if e.resolved]) / len(recent_errors) if recent_errors else 0
    }

async def get_error_trends(timeframe: str, db: Session) -> List[Dict[str, Any]]:
    """Get error trends over time"""
    # This would typically involve time-series queries
    # For now, return mock trend data
    
    return [
        {
            "time_bucket": "2024-01-01T00:00:00Z",
            "error_count": 10,
            "critical_count": 2,
            "resolved_count": 8
        }
        # ... more time buckets
    ]

async def get_system_health_metrics(db: Session) -> Dict[str, Any]:
    """Get system health metrics"""
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        db_healthy = True
    except:
        db_healthy = False
    
    # Check error monitoring service health
    monitoring_healthy = error_monitoring_service._monitoring_enabled
    
    # Calculate overall health
    overall_health = "healthy" if db_healthy and monitoring_healthy else "degraded"
    
    return {
        "status": overall_health,
        "database": "healthy" if db_healthy else "unhealthy",
        "monitoring": "healthy" if monitoring_healthy else "unhealthy",
        "error_rate": await error_monitoring_service.get_error_rate(5),
        "last_check": datetime.utcnow().isoformat()
    }

async def get_recent_critical_errors(db: Session) -> List[Dict[str, Any]]:
    """Get recent critical errors"""
    critical_errors = [
        err for err in error_monitoring_service.active_errors.values()
        if err.severity == ErrorSeverity.CRITICAL and not err.resolved
    ]
    
    # Sort by timestamp, most recent first
    critical_errors.sort(key=lambda e: e.timestamp, reverse=True)
    
    # Return top 10
    return [
        {
            "id": err.id,
            "message": err.message[:100],
            "category": err.category.value,
            "timestamp": err.timestamp.isoformat(),
            "business_impact": err.business_impact.value,
            "similar_errors": err.similar_errors_count
        }
        for err in critical_errors[:10]
    ]

async def create_support_ticket(error_event: ErrorEvent, feedback: UserFeedbackRequest):
    """Create support ticket for critical user-reported issues"""
    # Implement support ticket creation logic
    # This would integrate with your support system
    pass

# Add router tags and metadata
router.tags = ["Error Monitoring"]