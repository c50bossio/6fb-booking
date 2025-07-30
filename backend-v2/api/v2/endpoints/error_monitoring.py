"""
Error Monitoring API Endpoints for Production Dashboard
Provides real-time error monitoring and business intelligence
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime

from services.production_error_dashboard import production_dashboard, DashboardTimeRange
from services.error_monitoring_service import error_monitoring_service
from utils.auth import get_current_user, require_admin_role
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.get("/dashboard/metrics")
async def get_error_dashboard_metrics(
    time_range: str = Query("24h", description="Time range: 1h, 4h, 24h, 7d, 30d"),
    current_user = Depends(require_admin_role)
) -> Dict[str, Any]:
    """
    Get comprehensive error monitoring dashboard metrics
    
    **Access Level**: Admin only
    **Business Value**: Real-time system health and revenue impact visibility
    """
    try:
        # Validate time range
        time_range_enum = None
        for tr in DashboardTimeRange:
            if tr.value == time_range:
                time_range_enum = tr
                break
        
        if not time_range_enum:
            raise HTTPException(status_code=400, detail="Invalid time range")
        
        # Get dashboard metrics
        metrics = await production_dashboard.get_dashboard_metrics(time_range_enum)
        
        logger.info(f"Dashboard metrics requested by admin {current_user.id} for {time_range}")
        
        return {
            "success": True,
            "data": metrics
        }
        
    except Exception as e:
        logger.error(f"Failed to get dashboard metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard metrics")

@router.get("/dashboard/health")
async def get_system_health_summary(
    current_user = Depends(require_admin_role)
) -> Dict[str, Any]:
    """
    Get high-level system health summary for quick status checks
    
    **Access Level**: Admin only
    **Business Value**: Immediate system health visibility
    """
    try:
        # Get last hour metrics for real-time health
        metrics = await production_dashboard.get_dashboard_metrics(DashboardTimeRange.LAST_HOUR)
        
        health_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_health": metrics["metrics"]["health_score"],
            "status": (
                "critical" if metrics["metrics"]["health_score"] < 80 else
                "warning" if metrics["metrics"]["health_score"] < 95 else
                "healthy"
            ),
            "active_errors": metrics["metrics"]["total_errors"],
            "critical_errors": metrics["metrics"]["critical_errors"],
            "revenue_impact": metrics["metrics"]["total_revenue_impact"],
            "users_affected": metrics["metrics"]["affected_users"]
        }
        
        return {
            "success": True,
            "data": health_summary
        }
        
    except Exception as e:
        logger.error(f"Failed to get health summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve health summary")

@router.get("/dashboard/export")
async def export_error_report(
    time_range: str = Query("24h", description="Time range for report"),
    format: str = Query("json", description="Export format: json, csv"),
    current_user = Depends(require_admin_role)
) -> Dict[str, Any]:
    """
    Export comprehensive error report for stakeholders
    
    **Access Level**: Admin only
    **Business Value**: Detailed reporting for incident analysis and business impact assessment
    """
    try:
        # Validate time range
        time_range_enum = None
        for tr in DashboardTimeRange:
            if tr.value == time_range:
                time_range_enum = tr
                break
        
        if not time_range_enum:
            raise HTTPException(status_code=400, detail="Invalid time range")
        
        # Generate report
        report = await production_dashboard.export_error_report(time_range_enum)
        
        logger.info(f"Error report exported by admin {current_user.id} for {time_range}")
        
        return {
            "success": True,
            "data": report,
            "export_format": format,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to export error report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export error report")

@router.get("/alerts/active")
async def get_active_alerts(
    current_user = Depends(require_admin_role)
) -> Dict[str, Any]:
    """
    Get currently active error alerts requiring attention
    
    **Access Level**: Admin only
    **Business Value**: Immediate visibility into critical issues
    """
    try:
        # Get current dashboard data
        dashboard_data = await production_dashboard.get_dashboard_metrics(DashboardTimeRange.LAST_HOUR)
        
        active_alerts = dashboard_data.get("alerts", [])
        recommendations = dashboard_data.get("recommendations", [])
        
        # Add system-generated alerts based on current metrics
        metrics = dashboard_data["metrics"]
        system_alerts = []
        
        if metrics["health_score"] < 80:
            system_alerts.append({
                "id": "health_critical",
                "severity": "critical",
                "title": "System Health Critical",
                "message": f"System health score has dropped to {metrics['health_score']:.1f}%",
                "timestamp": datetime.utcnow().isoformat(),
                "revenue_impact": metrics["total_revenue_impact"]
            })
        
        if metrics["critical_errors"] > 0:
            system_alerts.append({
                "id": "critical_errors_active",
                "severity": "high",
                "title": "Critical Errors Detected",
                "message": f"{metrics['critical_errors']} critical errors requiring immediate attention",
                "timestamp": datetime.utcnow().isoformat(),
                "affected_users": metrics["affected_users"]
            })
        
        return {
            "success": True,
            "data": {
                "active_alerts": active_alerts + system_alerts,
                "recommendations": recommendations,
                "alert_count": len(active_alerts) + len(system_alerts),
                "last_updated": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get active alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve active alerts")

@router.post("/errors/{error_id}/resolve")
async def mark_error_resolved(
    error_id: str,
    resolution_notes: Optional[str] = None,
    current_user = Depends(require_admin_role)
) -> Dict[str, Any]:
    """
    Mark an error as resolved with optional resolution notes
    
    **Access Level**: Admin only
    **Business Value**: Track error resolution for incident management
    """
    try:
        # Mark error as resolved in monitoring service
        success = await error_monitoring_service.resolve_error(
            error_id=error_id,
            resolved_by=current_user.id,
            resolution_notes=resolution_notes
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Error not found")
        
        logger.info(f"Error {error_id} marked as resolved by admin {current_user.id}")
        
        return {
            "success": True,
            "message": "Error marked as resolved",
            "error_id": error_id,
            "resolved_by": current_user.id,
            "resolved_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve error {error_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resolve error")

@router.get("/integration-health")
async def get_integration_health_status(
    current_user = Depends(require_admin_role)
) -> Dict[str, Any]:
    """
    Get health status of all external integrations
    
    **Access Level**: Admin only
    **Business Value**: Monitor external service dependencies
    """
    try:
        dashboard_data = await production_dashboard.get_dashboard_metrics(DashboardTimeRange.LAST_HOUR)
        integration_health = dashboard_data.get("integration_health", {})
        
        # Calculate overall integration health score
        total_integrations = len(integration_health)
        healthy_integrations = len([
            status for status in integration_health.values() 
            if status.get("status") == "healthy"
        ])
        
        overall_health = (healthy_integrations / total_integrations * 100) if total_integrations > 0 else 100
        
        return {
            "success": True,
            "data": {
                "overall_health": overall_health,
                "total_integrations": total_integrations,
                "healthy_integrations": healthy_integrations,
                "integrations": integration_health,
                "last_updated": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get integration health: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve integration health")

# Add router tags for OpenAPI documentation
router.tags = ["Error Monitoring"]