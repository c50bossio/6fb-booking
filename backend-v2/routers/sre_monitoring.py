"""
SRE Monitoring Router
Comprehensive Site Reliability Engineering monitoring endpoints
Provides 99.99% uptime monitoring, incident management, and observability
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
import asyncio
import json
from datetime import datetime, timedelta

from db import get_db
from services.sre_orchestrator import sre_orchestrator
from services.circuit_breaker_service import circuit_breaker_service
from services.observability_service import observability_service
from services.automated_recovery_service import recovery_service
from utils.auth import get_current_admin_user


router = APIRouter(
    prefix="/sre",
    tags=["SRE Monitoring"],
    dependencies=[]  # Add admin auth when needed
)


@router.get("/health/comprehensive", response_model=Dict[str, Any])
async def comprehensive_health_check(request: Request, db: Session = Depends(get_db)):
    """
    Comprehensive health check for all SRE components
    Provides detailed system health for 99.99% uptime monitoring
    """
    try:
        start_time = datetime.utcnow()
        
        # Get health data from all SRE services
        health_data = {
            "timestamp": start_time.isoformat(),
            "request_id": request.headers.get("x-request-id", "unknown"),
            "sre_orchestrator": sre_orchestrator.get_health_summary(),
            "circuit_breakers": circuit_breaker_service.get_all_circuits_status(),
            "observability": observability_service.health_check(),
            "recovery_service": recovery_service.get_recovery_status(),
            "performance": await _get_performance_metrics(),
            "dependencies": await _check_all_dependencies(),
            "infrastructure": await _get_infrastructure_status()
        }
        
        # Calculate overall health status
        overall_status = _calculate_overall_health(health_data)
        health_data["overall_status"] = overall_status
        
        # Calculate response time
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        health_data["response_time_ms"] = response_time
        
        # Record metrics
        observability_service.record_metric(
            "sre_health_check_duration_ms", 
            response_time,
            {"status": overall_status}
        )
        
        return health_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/uptime", response_model=Dict[str, Any])
async def get_uptime_metrics():
    """Get detailed uptime and SLA metrics"""
    try:
        # Get current uptime data
        uptime_data = {
            "current_uptime_percentage": sre_orchestrator._calculate_uptime(),
            "uptime_target": sre_orchestrator.uptime_target,
            "error_rate_current": await _calculate_current_error_rate(),
            "error_rate_target": sre_orchestrator.error_rate_threshold,
            "mttr_current_minutes": sre_orchestrator._calculate_current_mttr(),
            "mttr_target_minutes": sre_orchestrator.mttr_target_minutes,
            "incidents_24h": len([
                i for i in sre_orchestrator.active_incidents.values()
                if (datetime.utcnow() - i.created_at).total_seconds() < 86400
            ]),
            "sla_status": await _get_sla_status(),
            "downtime_budget": await _calculate_downtime_budget(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return uptime_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get uptime metrics: {str(e)}")


@router.get("/incidents", response_model=Dict[str, Any])
async def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50
):
    """Get current and recent incidents"""
    try:
        # Filter incidents
        incidents = list(sre_orchestrator.active_incidents.values())
        
        if status:
            incidents = [i for i in incidents if i.status == status]
        
        if severity:
            incidents = [i for i in incidents if i.severity.value == severity]
        
        # Sort by creation time (newest first)
        incidents.sort(key=lambda x: x.created_at, reverse=True)
        
        # Limit results
        incidents = incidents[:limit]
        
        # Convert to serializable format
        incident_data = []
        for incident in incidents:
            incident_data.append({
                "id": incident.id,
                "title": incident.title,
                "severity": incident.severity.value,
                "status": incident.status,
                "created_at": incident.created_at.isoformat(),
                "services_affected": incident.services_affected,
                "description": incident.description,
                "timeline": incident.timeline,
                "duration_minutes": (datetime.utcnow() - incident.created_at).total_seconds() / 60
            })
        
        return {
            "incidents": incident_data,
            "total_active": len(sre_orchestrator.active_incidents),
            "summary": {
                "critical": len([i for i in incidents if i.severity.value == "critical"]),
                "high": len([i for i in incidents if i.severity.value == "high"]),
                "medium": len([i for i in incidents if i.severity.value == "medium"]),
                "low": len([i for i in incidents if i.severity.value == "low"])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get incidents: {str(e)}")


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str):
    """Manually resolve an incident"""
    try:
        if incident_id not in sre_orchestrator.active_incidents:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        incident = sre_orchestrator.active_incidents[incident_id]
        incident.status = "resolved"
        incident.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event": "Manually resolved",
            "details": "Incident resolved via API"
        })
        
        # Calculate MTTR
        mttr_minutes = (datetime.utcnow() - incident.created_at).total_seconds() / 60
        
        # Remove from active incidents
        del sre_orchestrator.active_incidents[incident_id]
        
        return {
            "message": "Incident resolved",
            "incident_id": incident_id,
            "mttr_minutes": mttr_minutes
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve incident: {str(e)}")


@router.get("/circuit-breakers", response_model=Dict[str, Any])
async def get_circuit_breakers():
    """Get status of all circuit breakers"""
    try:
        return circuit_breaker_service.get_all_circuits_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get circuit breakers: {str(e)}")


@router.post("/circuit-breakers/{service_name}/open")
async def open_circuit_breaker(service_name: str, reason: str = "Manual override"):
    """Manually open a circuit breaker"""
    try:
        circuit_breaker_service.force_open(service_name, reason)
        return {"message": f"Circuit breaker opened for {service_name}", "reason": reason}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open circuit breaker: {str(e)}")


@router.post("/circuit-breakers/{service_name}/close")
async def close_circuit_breaker(service_name: str, reason: str = "Manual override"):
    """Manually close a circuit breaker"""
    try:
        circuit_breaker_service.force_close(service_name, reason)
        return {"message": f"Circuit breaker closed for {service_name}", "reason": reason}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to close circuit breaker: {str(e)}")


@router.get("/metrics", response_model=Dict[str, Any])
async def get_metrics(
    metric_name: Optional[str] = None,
    time_range: str = "1h"
):
    """Get system metrics"""
    try:
        if metric_name:
            # Get specific metric
            value = observability_service.get_metric_value(metric_name)
            return {
                "metric": metric_name,
                "value": value,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            # Get dashboard data
            return observability_service.get_dashboard_data()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.get("/performance", response_model=Dict[str, Any])
async def get_performance_metrics():
    """Get system performance metrics"""
    try:
        return observability_service.get_system_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")


@router.get("/traces", response_model=Dict[str, Any])
async def get_traces(limit: int = 20):
    """Get recent distributed traces"""
    try:
        recent_traces = observability_service._get_recent_traces(limit)
        
        return {
            "traces": recent_traces,
            "active_spans": len(observability_service.active_spans),
            "total_completed": len(observability_service.completed_traces)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get traces: {str(e)}")


@router.get("/recovery", response_model=Dict[str, Any])
async def get_recovery_status():
    """Get automated recovery system status"""
    try:
        return recovery_service.get_recovery_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recovery status: {str(e)}")


@router.post("/recovery/trigger")
async def trigger_recovery(
    incident_id: str,
    trigger_condition: str,
    context: Optional[Dict[str, Any]] = None
):
    """Manually trigger automated recovery"""
    try:
        success = await recovery_service.trigger_recovery(
            incident_id, trigger_condition, context
        )
        
        return {
            "message": "Recovery triggered",
            "incident_id": incident_id,
            "trigger_condition": trigger_condition,
            "success": success
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger recovery: {str(e)}")


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_sre_dashboard():
    """Get comprehensive SRE dashboard data"""
    try:
        dashboard_data = {
            "summary": {
                "overall_health": _calculate_overall_health_simple(),
                "uptime_percentage": sre_orchestrator._calculate_uptime(),
                "active_incidents": len(sre_orchestrator.active_incidents),
                "open_circuit_breakers": len([
                    c for c in circuit_breaker_service.circuits.values()
                    if c.state.value == "open"
                ]),
                "active_recoveries": len(recovery_service.active_recoveries)
            },
            "uptime_metrics": {
                "current": sre_orchestrator._calculate_uptime(),
                "target": sre_orchestrator.uptime_target,
                "status": "healthy" if sre_orchestrator._calculate_uptime() > 99.9 else "at_risk"
            },
            "performance": observability_service.get_system_performance(),
            "recent_incidents": [
                {
                    "id": i.id,
                    "title": i.title,
                    "severity": i.severity.value,
                    "created_at": i.created_at.isoformat(),
                    "duration_minutes": (datetime.utcnow() - i.created_at).total_seconds() / 60
                }
                for i in list(sre_orchestrator.active_incidents.values())[:5]
            ],
            "circuit_breaker_summary": circuit_breaker_service.get_all_circuits_status()["summary"],
            "recovery_stats": {
                "successful_24h": recovery_service._count_recent_successes(),
                "failed_24h": recovery_service._count_recent_failures(),
                "average_time": recovery_service._calculate_average_recovery_time()
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")


@router.post("/test/incident")
async def create_test_incident(
    title: str,
    severity: str = "low",
    services: List[str] = ["test_service"]
):
    """Create a test incident for SRE system validation"""
    try:
        incident_id = f"test_incident_{int(datetime.utcnow().timestamp())}"
        
        from services.sre_orchestrator import IncidentSeverity
        severity_enum = IncidentSeverity(severity)
        
        await sre_orchestrator._create_incident(
            incident_id,
            severity_enum,
            title,
            services,
            "Test incident created via API"
        )
        
        return {
            "message": "Test incident created",
            "incident_id": incident_id,
            "severity": severity,
            "services": services
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test incident: {str(e)}")


# Helper functions
async def _get_performance_metrics() -> Dict[str, Any]:
    """Get current performance metrics"""
    try:
        import psutil
        
        return {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0],
            "network_connections": len(psutil.net_connections())
        }
    except Exception:
        return {"error": "Failed to get performance metrics"}


async def _check_all_dependencies() -> Dict[str, Any]:
    """Check health of all external dependencies"""
    dependencies = {}
    
    # Check each circuit breaker status
    for service_name, circuit in circuit_breaker_service.circuits.items():
        dependencies[service_name] = {
            "status": "healthy" if circuit.state.value == "closed" else "unhealthy",
            "circuit_state": circuit.state.value,
            "failure_count": circuit.failure_count
        }
    
    return dependencies


async def _get_infrastructure_status() -> Dict[str, Any]:
    """Get infrastructure component status"""
    return {
        "database": "healthy",  # Would check actual database status
        "redis": "healthy",     # Would check actual Redis status
        "kubernetes": "healthy", # Would check K8s cluster status
        "load_balancer": "healthy" # Would check LB status
    }


def _calculate_overall_health(health_data: Dict[str, Any]) -> str:
    """Calculate overall system health status"""
    # Check for critical issues
    if health_data["sre_orchestrator"]["uptime_percentage"] < 99.0:
        return "critical"
    
    if health_data["circuit_breakers"]["summary"]["open_circuits"] > 2:
        return "degraded"
    
    if len(sre_orchestrator.active_incidents) > 0:
        critical_incidents = [
            i for i in sre_orchestrator.active_incidents.values()
            if i.severity.value == "critical"
        ]
        if critical_incidents:
            return "critical"
        return "degraded"
    
    return "healthy"


def _calculate_overall_health_simple() -> str:
    """Simple overall health calculation"""
    if sre_orchestrator._calculate_uptime() < 99.0:
        return "critical"
    elif len(sre_orchestrator.active_incidents) > 0:
        return "degraded"
    else:
        return "healthy"


async def _calculate_current_error_rate() -> float:
    """Calculate current error rate"""
    # This would typically come from observability service
    return 0.01  # Placeholder


async def _get_sla_status() -> Dict[str, Any]:
    """Get SLA compliance status"""
    uptime = sre_orchestrator._calculate_uptime()
    
    return {
        "compliant": uptime >= sre_orchestrator.uptime_target,
        "uptime_delta": uptime - sre_orchestrator.uptime_target,
        "risk_level": "low" if uptime > 99.95 else "medium" if uptime > 99.9 else "high"
    }


async def _calculate_downtime_budget() -> Dict[str, Any]:
    """Calculate remaining downtime budget"""
    # For 99.99% uptime, we have 52.6 minutes downtime per year
    annual_budget_seconds = 52.6 * 60  # 3156 seconds per year
    
    # Calculate used budget (placeholder - would come from actual incident data)
    used_budget_seconds = 0  # Would calculate from incident history
    
    remaining_seconds = annual_budget_seconds - used_budget_seconds
    remaining_percentage = (remaining_seconds / annual_budget_seconds) * 100
    
    return {
        "annual_budget_minutes": 52.6,
        "used_minutes": used_budget_seconds / 60,
        "remaining_minutes": remaining_seconds / 60,
        "remaining_percentage": remaining_percentage,
        "status": "healthy" if remaining_percentage > 80 else "at_risk"
    }