"""
Production Error Management API Endpoints
Incident management, escalation tracking, and automated recovery
for production environment reliability and business continuity
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging

from services.production_error_management import production_error_manager, IncidentStatus, EscalationLevel
from middleware.security import require_admin, get_current_user
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/production-error-management", tags=["Production Error Management"])


class IncidentUpdateRequest(BaseModel):
    """Request model for incident updates"""
    status: Optional[str] = None
    assignee: Optional[str] = None
    resolution_reason: Optional[str] = None


class ManualRecoveryRequest(BaseModel):
    """Request model for manual recovery actions"""
    action_type: str
    parameters: Dict[str, Any]
    description: str


@router.get("/incidents/active")
async def get_active_incidents(
    admin_user: User = Depends(require_admin)
):
    """Get all active incidents"""
    
    try:
        incidents = await production_error_manager.get_active_incidents()
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "active_incidents": incidents,
            "total_count": len(incidents)
        })
        
    except Exception as e:
        logger.error(f"Error getting active incidents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get active incidents: {str(e)}")


@router.get("/incidents/history")
async def get_incident_history(
    limit: int = Query(50, description="Maximum number of incidents", ge=1, le=200),
    admin_user: User = Depends(require_admin)
):
    """Get incident history"""
    
    try:
        history = await production_error_manager.get_incident_history(limit)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "incident_history": history,
            "limit": limit,
            "returned_count": len(history)
        })
        
    except Exception as e:
        logger.error(f"Error getting incident history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get incident history: {str(e)}")


@router.get("/recovery/history")
async def get_recovery_history(
    limit: int = Query(50, description="Maximum number of recovery actions", ge=1, le=200),
    admin_user: User = Depends(require_admin)
):
    """Get recovery action history"""
    
    try:
        history = await production_error_manager.get_recovery_history(limit)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "recovery_history": history,
            "limit": limit,
            "returned_count": len(history)
        })
        
    except Exception as e:
        logger.error(f"Error getting recovery history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recovery history: {str(e)}")


@router.get("/dashboard")
async def get_production_dashboard(
    admin_user: User = Depends(require_admin)
):
    """Get comprehensive production error management dashboard"""
    
    try:
        # Get active incidents
        active_incidents = await production_error_manager.get_active_incidents()
        
        # Get recent history
        recent_incidents = await production_error_manager.get_incident_history(20)
        recent_recovery = await production_error_manager.get_recovery_history(20)
        
        # Calculate dashboard metrics
        total_active = len(active_incidents)
        critical_incidents = len([i for i in active_incidents if i['severity'] == 'critical'])
        revenue_blocking = len([i for i in active_incidents if i['business_impact'] == 'revenue_blocking'])
        
        # Calculate escalation levels
        escalation_breakdown = {}
        for incident in active_incidents:
            level = incident.get('escalation_level', 'l1_automatic')
            escalation_breakdown[level] = escalation_breakdown.get(level, 0) + 1
        
        # Calculate recovery success rate
        successful_recoveries = len([r for r in recent_recovery if r['status'] == 'success'])
        total_recoveries = len(recent_recovery)
        recovery_success_rate = (successful_recoveries / total_recoveries * 100) if total_recoveries > 0 else 0
        
        # Calculate average incident duration for resolved incidents
        resolved_incidents = [i for i in recent_incidents if i['status'] == 'resolved' and i.get('resolved_at')]
        if resolved_incidents:
            total_duration = sum([
                (datetime.fromisoformat(i['resolved_at'].replace('Z', '+00:00')) - 
                 datetime.fromisoformat(i['created_at'].replace('Z', '+00:00'))).total_seconds() / 60
                for i in resolved_incidents
            ])
            avg_resolution_time = total_duration / len(resolved_incidents)
        else:
            avg_resolution_time = 0
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_active_incidents": total_active,
                "critical_incidents": critical_incidents,
                "revenue_blocking_incidents": revenue_blocking,
                "recovery_success_rate": round(recovery_success_rate, 1),
                "avg_resolution_time_minutes": round(avg_resolution_time, 1)
            },
            "escalation_breakdown": escalation_breakdown,
            "active_incidents": active_incidents,
            "recent_incidents": recent_incidents[:10],  # Last 10
            "recent_recovery_actions": recent_recovery[:10],  # Last 10
            "system_health": {
                "status": "healthy" if total_active == 0 else "degraded" if critical_incidents == 0 else "unhealthy",
                "incident_trend": "stable",  # Would calculate from historical data
                "recovery_effectiveness": "good" if recovery_success_rate > 80 else "needs_improvement"
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting production dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get production dashboard: {str(e)}")


@router.put("/incidents/{incident_id}")
async def update_incident(
    incident_id: str,
    update_request: IncidentUpdateRequest,
    admin_user: User = Depends(require_admin)
):
    """Update an incident"""
    
    try:
        updated = False
        
        # Update assignee
        if update_request.assignee:
            success = await production_error_manager.update_incident_assignee(incident_id, update_request.assignee)
            if success:
                updated = True
            else:
                raise HTTPException(status_code=404, detail="Incident not found")
        
        # Resolve incident
        if update_request.status == "resolved" and update_request.resolution_reason:
            success = await production_error_manager.manually_resolve_incident(
                incident_id, 
                update_request.resolution_reason
            )
            if success:
                updated = True
            else:
                raise HTTPException(status_code=404, detail="Incident not found")
        
        if not updated:
            raise HTTPException(status_code=400, detail="No valid updates provided")
        
        return JSONResponse(content={
            "message": f"Incident {incident_id} updated successfully",
            "incident_id": incident_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update incident: {str(e)}")


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    resolution_reason: str = Query(..., description="Reason for resolution"),
    admin_user: User = Depends(require_admin)
):
    """Manually resolve an incident"""
    
    try:
        success = await production_error_manager.manually_resolve_incident(incident_id, resolution_reason)
        
        if not success:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return JSONResponse(content={
            "message": f"Incident {incident_id} resolved successfully",
            "incident_id": incident_id,
            "resolution_reason": resolution_reason,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve incident: {str(e)}")


@router.post("/recovery/manual")
async def trigger_manual_recovery(
    recovery_request: ManualRecoveryRequest,
    admin_user: User = Depends(require_admin)
):
    """Trigger manual recovery action"""
    
    try:
        # Create mock error data for recovery action processing
        mock_error_data = {
            "category": "manual_recovery",
            "message": recovery_request.description,
            "severity": "medium",
            "business_impact": "minor",
            "endpoint": "/admin/manual-recovery",
            "manual_trigger": True,
            "action_type": recovery_request.action_type,
            "parameters": recovery_request.parameters
        }
        
        # Process as error event to trigger recovery
        incident_id = await production_error_manager.process_error_event(mock_error_data)
        
        return JSONResponse(content={
            "message": "Manual recovery action triggered",
            "incident_id": incident_id,
            "action_type": recovery_request.action_type,
            "description": recovery_request.description,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error triggering manual recovery: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger manual recovery: {str(e)}")


@router.get("/metrics/summary")
async def get_error_management_metrics(
    time_window_hours: int = Query(24, description="Time window in hours", ge=1, le=168),
    admin_user: User = Depends(require_admin)
):
    """Get error management metrics summary"""
    
    try:
        # Get current data
        active_incidents = await production_error_manager.get_active_incidents()
        recent_incidents = await production_error_manager.get_incident_history(100)
        recent_recovery = await production_error_manager.get_recovery_history(100)
        
        # Filter by time window
        cutoff_time = datetime.utcnow().timestamp() - (time_window_hours * 3600)
        
        recent_incidents_filtered = [
            i for i in recent_incidents
            if datetime.fromisoformat(i['created_at'].replace('Z', '+00:00')).timestamp() > cutoff_time
        ]
        
        recent_recovery_filtered = [
            r for r in recent_recovery
            if datetime.fromisoformat(r['timestamp'].replace('Z', '+00:00')).timestamp() > cutoff_time
        ]
        
        # Calculate metrics
        total_incidents = len(recent_incidents_filtered)
        resolved_incidents = len([i for i in recent_incidents_filtered if i['status'] == 'resolved'])
        auto_resolved = len([i for i in recent_incidents_filtered 
                           if i['status'] == 'resolved' and 'Auto-resolved' in str(i.get('resolution_reason', ''))])
        
        successful_recoveries = len([r for r in recent_recovery_filtered if r['status'] == 'success'])
        total_recovery_attempts = len(recent_recovery_filtered)
        
        # Group by severity and business impact
        severity_breakdown = {}
        impact_breakdown = {}
        
        for incident in recent_incidents_filtered:
            severity = incident.get('severity', 'unknown')
            impact = incident.get('business_impact', 'unknown')
            
            severity_breakdown[severity] = severity_breakdown.get(severity, 0) + 1
            impact_breakdown[impact] = impact_breakdown.get(impact, 0) + 1
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "time_window_hours": time_window_hours,
            "metrics": {
                "total_incidents": total_incidents,
                "active_incidents": len(active_incidents),
                "resolved_incidents": resolved_incidents,
                "auto_resolved_incidents": auto_resolved,
                "resolution_rate": round((resolved_incidents / total_incidents * 100) if total_incidents > 0 else 0, 1),
                "auto_resolution_rate": round((auto_resolved / total_incidents * 100) if total_incidents > 0 else 0, 1),
                "recovery_attempts": total_recovery_attempts,
                "successful_recoveries": successful_recoveries,
                "recovery_success_rate": round((successful_recoveries / total_recovery_attempts * 100) if total_recovery_attempts > 0 else 0, 1)
            },
            "breakdowns": {
                "by_severity": severity_breakdown,
                "by_business_impact": impact_breakdown
            },
            "trends": {
                "incident_trend": "stable",  # Would calculate from historical data
                "recovery_trend": "improving" if (successful_recoveries / total_recovery_attempts) > 0.8 else "stable",
                "resolution_trend": "stable"
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting error management metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get error management metrics: {str(e)}")


@router.post("/test/error-event")
async def test_error_event_processing(
    error_category: str = Query("test", description="Error category"),
    severity: str = Query("medium", description="Error severity"),
    business_impact: str = Query("minor", description="Business impact"),
    admin_user: User = Depends(require_admin)
):
    """Test error event processing for validation"""
    
    try:
        # Create test error event
        test_error_data = {
            "category": error_category,
            "message": f"Test error event for category: {error_category}",
            "severity": severity,
            "business_impact": business_impact,
            "endpoint": "/test/error-processing",
            "status_code": 500,
            "test_event": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Process the error event
        incident_id = await production_error_manager.process_error_event(test_error_data)
        
        return JSONResponse(content={
            "message": "Test error event processed successfully",
            "incident_id": incident_id,
            "test_data": test_error_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing test error event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process test error event: {str(e)}")


@router.get("/configuration")
async def get_error_management_configuration(
    admin_user: User = Depends(require_admin)
):
    """Get error management configuration"""
    
    try:
        # Get configuration from production error manager
        config = {
            "recovery_actions": [
                {
                    "name": action.name,
                    "description": action.description,
                    "action_type": action.action_type,
                    "max_attempts": action.max_attempts,
                    "cooldown_minutes": action.cooldown_minutes
                }
                for action in production_error_manager.recovery_actions
            ],
            "escalation_rules": [
                {
                    "name": rule.name,
                    "escalation_level": rule.escalation_level.value,
                    "delay_minutes": rule.delay_minutes,
                    "notification_channels": rule.notification_channels,
                    "business_impact_threshold": rule.business_impact_threshold.value,
                    "enabled": rule.enabled
                }
                for rule in production_error_manager.escalation_rules
            ],
            "system_settings": {
                "incident_auto_resolve_hours": 1,
                "background_monitoring_enabled": True,
                "recovery_automation_enabled": True,
                "escalation_enabled": True
            }
        }
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "configuration": config
        })
        
    except Exception as e:
        logger.error(f"Error getting error management configuration: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")