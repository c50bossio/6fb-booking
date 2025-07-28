"""
Error Monitoring Router
Provides API endpoints for error monitoring dashboard and management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from db import get_db
from services.error_monitoring_service import (
    error_monitoring_service,
    ErrorSeverity,
    ErrorCategory,
    BusinessImpact
)
from utils.auth import get_current_admin_user

router = APIRouter(
    prefix="/error-monitoring",
    tags=["Error Monitoring"],
    dependencies=[]  # Add admin auth when needed: [Depends(get_current_admin_user)]
)

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_error_monitoring_dashboard():
    """Get comprehensive error monitoring dashboard data"""
    try:
        dashboard_data = await error_monitoring_service.get_dashboard_data()
        return dashboard_data
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get dashboard data: {str(e)}"
        )

@router.get("/errors", response_model=Dict[str, Any])
async def get_errors(
    status: Optional[str] = Query(None, description="Filter by status: active, resolved"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    category: Optional[str] = Query(None, description="Filter by category"),
    business_impact: Optional[str] = Query(None, description="Filter by business impact"),
    limit: int = Query(50, description="Number of errors to return"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get filtered list of errors"""
    try:
        all_errors = list(error_monitoring_service.active_errors.values())
        
        # Apply filters
        filtered_errors = all_errors
        
        if status == "active":
            filtered_errors = [e for e in filtered_errors if not e.resolved]
        elif status == "resolved":
            filtered_errors = [e for e in filtered_errors if e.resolved]
        
        if severity:
            try:
                severity_enum = ErrorSeverity(severity)
                filtered_errors = [e for e in filtered_errors if e.severity == severity_enum]
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid severity: {severity}")
        
        if category:
            try:
                category_enum = ErrorCategory(category)
                filtered_errors = [e for e in filtered_errors if e.category == category_enum]
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        if business_impact:
            try:
                impact_enum = BusinessImpact(business_impact)
                filtered_errors = [e for e in filtered_errors if e.business_impact == impact_enum]
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid business impact: {business_impact}")
        
        # Sort by timestamp (newest first)
        filtered_errors.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        paginated_errors = filtered_errors[offset:offset + limit]
        
        # Convert to serializable format
        errors_data = []
        for error in paginated_errors:
            error_dict = {
                "id": error.id,
                "timestamp": error.timestamp.isoformat(),
                "severity": error.severity.value,
                "category": error.category.value,
                "business_impact": error.business_impact.value,
                "message": error.message,
                "endpoint": error.endpoint,
                "http_method": error.http_method,
                "http_status": error.http_status,
                "user_id": error.user_id,
                "ip_address": error.ip_address,
                "resolved": error.resolved,
                "auto_resolved": error.auto_resolved,
                "resolution_method": error.resolution_method,
                "retry_count": error.retry_count,
                "similar_errors_count": error.similar_errors_count
            }
            
            if error.resolution_time:
                error_dict["resolution_time"] = error.resolution_time.isoformat()
                error_dict["resolution_duration_seconds"] = (
                    error.resolution_time - error.timestamp
                ).total_seconds()
            
            errors_data.append(error_dict)
        
        return {
            "errors": errors_data,
            "total_count": len(filtered_errors),
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < len(filtered_errors)
            },
            "filters_applied": {
                "status": status,
                "severity": severity,
                "category": category,
                "business_impact": business_impact
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get errors: {str(e)}"
        )

@router.get("/errors/{error_id}", response_model=Dict[str, Any])
async def get_error_details(error_id: str):
    """Get detailed information about a specific error"""
    try:
        if error_id not in error_monitoring_service.active_errors:
            raise HTTPException(status_code=404, detail="Error not found")
        
        error = error_monitoring_service.active_errors[error_id]
        
        return {
            "id": error.id,
            "timestamp": error.timestamp.isoformat(),
            "severity": error.severity.value,
            "category": error.category.value,
            "business_impact": error.business_impact.value,
            "message": error.message,
            "stack_trace": error.stack_trace,
            "endpoint": error.endpoint,
            "http_method": error.http_method,
            "http_status": error.http_status,
            "user_id": error.user_id,
            "session_id": error.session_id,
            "request_id": error.request_id,
            "user_agent": error.user_agent,
            "ip_address": error.ip_address,
            "error_code": error.error_code,
            "context": error.context,
            "resolved": error.resolved,
            "resolution_time": error.resolution_time.isoformat() if error.resolution_time else None,
            "auto_resolved": error.auto_resolved,
            "resolution_method": error.resolution_method,
            "retry_count": error.retry_count,
            "similar_errors_count": error.similar_errors_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get error details: {str(e)}"
        )

@router.post("/errors/{error_id}/resolve")
async def resolve_error(
    error_id: str,
    resolution_method: str = "Manual resolution via dashboard"
):
    """Manually resolve an error"""
    try:
        success = await error_monitoring_service.resolve_error(
            error_id, 
            resolution_method,
            auto_resolved=False
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Error not found")
        
        return {
            "message": "Error resolved successfully",
            "error_id": error_id,
            "resolution_method": resolution_method,
            "resolved_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to resolve error: {str(e)}"
        )

@router.post("/capture")
async def capture_error_manually(
    message: str,
    severity: str = "medium",
    category: str = "business_logic",
    business_impact: str = "operational",
    context: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    endpoint: Optional[str] = None
):
    """Manually capture an error for testing or external integration"""
    try:
        error_event = await error_monitoring_service.capture_error(
            message=message,
            severity=ErrorSeverity(severity),
            category=ErrorCategory(category),
            business_impact=BusinessImpact(business_impact),
            context=context,
            user_id=user_id,
            endpoint=endpoint
        )
        
        return {
            "message": "Error captured successfully",
            "error_id": error_event.id,
            "timestamp": error_event.timestamp.isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to capture error: {str(e)}"
        )

@router.get("/metrics", response_model=Dict[str, Any])
async def get_error_metrics(
    time_window: int = Query(60, description="Time window in minutes for metrics")
):
    """Get error metrics and statistics"""
    try:
        current_time = datetime.utcnow()
        cutoff_time = current_time - timedelta(minutes=time_window)
        
        # Get recent errors
        recent_errors = [
            error for error in error_monitoring_service.active_errors.values()
            if error.timestamp > cutoff_time
        ]
        
        # Calculate metrics
        error_rate = len(recent_errors) / time_window
        
        # Group by severity
        severity_counts = {}
        for severity in ErrorSeverity:
            severity_counts[severity.value] = len([
                e for e in recent_errors if e.severity == severity
            ])
        
        # Group by category
        category_counts = {}
        for category in ErrorCategory:
            category_counts[category.value] = len([
                e for e in recent_errors if e.category == category
            ])
        
        # Group by business impact
        impact_counts = {}
        for impact in BusinessImpact:
            impact_counts[impact.value] = len([
                e for e in recent_errors if e.business_impact == impact
            ])
        
        # Resolution metrics
        resolved_errors = [e for e in recent_errors if e.resolved]
        auto_resolved_errors = [e for e in resolved_errors if e.auto_resolved]
        
        resolution_times = []
        for error in resolved_errors:
            if error.resolution_time:
                resolution_time = (error.resolution_time - error.timestamp).total_seconds()
                resolution_times.append(resolution_time)
        
        avg_resolution_time = (
            sum(resolution_times) / len(resolution_times) 
            if resolution_times else 0
        )
        
        return {
            "time_window_minutes": time_window,
            "total_errors": len(recent_errors),
            "error_rate_per_minute": round(error_rate, 4),
            "severity_breakdown": severity_counts,
            "category_breakdown": category_counts,
            "business_impact_breakdown": impact_counts,
            "resolution_metrics": {
                "total_resolved": len(resolved_errors),
                "auto_resolved": len(auto_resolved_errors),
                "manual_resolved": len(resolved_errors) - len(auto_resolved_errors),
                "resolution_rate": (
                    len(resolved_errors) / len(recent_errors) 
                    if recent_errors else 0
                ),
                "auto_resolution_rate": (
                    len(auto_resolved_errors) / len(resolved_errors) 
                    if resolved_errors else 0
                ),
                "average_resolution_time_seconds": round(avg_resolution_time, 2)
            },
            "sla_compliance": {
                "error_rate_target": 0.1,  # <0.1% target (10 errors per 10000 requests)
                "error_rate_actual": round(error_rate * 60 / 100, 4),  # Convert to percentage
                "mttr_target_seconds": 300,  # 5 minutes
                "mttr_actual_seconds": round(avg_resolution_time, 2),
                "compliant": error_rate < 0.17 and avg_resolution_time < 300  # Allow some margin
            },
            "timestamp": current_time.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get metrics: {str(e)}"
        )

@router.get("/patterns", response_model=Dict[str, Any])
async def get_error_patterns(limit: int = Query(20, description="Number of patterns to return")):
    """Get error patterns for analysis"""
    try:
        patterns = list(error_monitoring_service.error_patterns.values())
        
        # Sort by occurrence count
        patterns.sort(key=lambda p: p.occurrence_count, reverse=True)
        
        # Limit results
        patterns = patterns[:limit]
        
        patterns_data = []
        for pattern in patterns:
            patterns_data.append({
                "pattern_id": pattern.pattern_id,
                "error_signature": pattern.error_signature,
                "occurrence_count": pattern.occurrence_count,
                "first_seen": pattern.first_seen.isoformat(),
                "last_seen": pattern.last_seen.isoformat(),
                "severity": pattern.severity.value,
                "category": pattern.category.value,
                "business_impact": pattern.business_impact.value,
                "auto_resolution_strategy": pattern.auto_resolution_strategy,
                "resolution_success_rate": pattern.resolution_success_rate,
                "age_hours": (datetime.utcnow() - pattern.first_seen).total_seconds() / 3600
            })
        
        return {
            "patterns": patterns_data,
            "total_patterns": len(error_monitoring_service.error_patterns),
            "top_patterns_analysis": {
                "most_frequent": patterns_data[0] if patterns_data else None,
                "auto_resolvable_count": len([
                    p for p in patterns_data 
                    if p["auto_resolution_strategy"] is not None
                ]),
                "critical_patterns": len([
                    p for p in patterns_data 
                    if p["severity"] == "critical"
                ])
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get error patterns: {str(e)}"
        )

@router.get("/business-impact", response_model=Dict[str, Any])
async def get_business_impact_summary():
    """Get business impact summary for Six Figure Barber workflows"""
    try:
        summary = await error_monitoring_service.get_business_impact_summary()
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get business impact summary: {str(e)}"
        )

@router.get("/health", response_model=Dict[str, Any])
async def get_error_monitoring_health():
    """Get health status of the error monitoring system"""
    try:
        current_time = datetime.utcnow()
        
        # Check if monitoring is working
        last_error_time = None
        if error_monitoring_service.active_errors:
            last_error = max(
                error_monitoring_service.active_errors.values(),
                key=lambda e: e.timestamp
            )
            last_error_time = last_error.timestamp
        
        # System health indicators
        health_status = {
            "status": "healthy",
            "timestamp": current_time.isoformat(),
            "monitoring_active": True,
            "last_error_captured": last_error_time.isoformat() if last_error_time else None,
            "active_errors_count": len([
                e for e in error_monitoring_service.active_errors.values() 
                if not e.resolved
            ]),
            "total_errors_tracked": len(error_monitoring_service.active_errors),
            "error_patterns_identified": len(error_monitoring_service.error_patterns),
            "auto_resolution_strategies": len(error_monitoring_service.resolution_strategies),
            "system_metrics": {
                "error_rate_5min": await error_monitoring_service.get_error_rate(5),
                "auto_resolution_rate": error_monitoring_service.auto_resolution_success_rate,
                "mean_resolution_time": error_monitoring_service._calculate_mean_resolution_time()
            }
        }
        
        # Assess health status
        error_rate_5min = health_status["system_metrics"]["error_rate_5min"]
        if error_rate_5min > 20:  # More than 20 errors per minute
            health_status["status"] = "critical"
        elif error_rate_5min > 10:
            health_status["status"] = "degraded"
        elif health_status["active_errors_count"] > 50:
            health_status["status"] = "degraded"
        
        return health_status
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get monitoring health: {str(e)}"
        )

@router.post("/test/create-error")
async def create_test_error(
    message: str = "Test error for monitoring system validation",
    severity: str = "low",
    simulate_resolution: bool = True
):
    """Create a test error for validating the monitoring system"""
    try:
        # Create test error
        error_event = await error_monitoring_service.capture_error(
            message=f"TEST: {message}",
            severity=ErrorSeverity(severity),
            category=ErrorCategory.BUSINESS_LOGIC,
            business_impact=BusinessImpact.MONITORING,
            context={
                "test_error": True,
                "created_via_api": True,
                "timestamp": datetime.utcnow().isoformat()
            },
            endpoint="/error-monitoring/test/create-error"
        )
        
        # Optionally simulate auto-resolution
        if simulate_resolution:
            await asyncio.sleep(1)  # Brief delay
            await error_monitoring_service.resolve_error(
                error_event.id,
                "Test error auto-resolved",
                auto_resolved=True
            )
        
        return {
            "message": "Test error created successfully",
            "error_id": error_event.id,
            "will_auto_resolve": simulate_resolution,
            "monitoring_dashboard_url": "/error-monitoring/dashboard"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid severity: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create test error: {str(e)}"
        )

import asyncio