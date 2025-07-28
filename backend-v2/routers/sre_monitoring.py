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
from services.business_impact_monitoring_service import business_impact_monitor
from services.performance_monitoring import performance_tracker
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

@router.get("/business-impact", response_model=Dict[str, Any])
async def get_business_impact_dashboard():
    """Get business impact monitoring dashboard with revenue correlation"""
    try:
        return await business_impact_monitor.get_business_impact_dashboard()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get business impact dashboard: {str(e)}")

@router.post("/business-impact/analyze")
async def analyze_business_impact(
    incident_type: str,
    technical_metrics: Dict[str, Any],
    affected_systems: List[str],
    duration_minutes: Optional[int] = None
):
    """Analyze business impact of a technical incident"""
    try:
        impact_calculation = await business_impact_monitor.analyze_business_impact(
            incident_type=incident_type,
            technical_metrics=technical_metrics,
            affected_systems=affected_systems,
            duration_minutes=duration_minutes
        )
        
        # Convert to serializable format
        return {
            "timestamp": impact_calculation.timestamp.isoformat(),
            "incident_type": impact_calculation.incident_type,
            "technical_severity": impact_calculation.technical_severity,
            "business_severity": impact_calculation.business_severity.value,
            "estimated_revenue_loss": float(impact_calculation.estimated_revenue_loss),
            "affected_bookings": impact_calculation.affected_bookings,
            "affected_clients": impact_calculation.affected_clients,
            "sixfb_principle_impact": [p.value for p in impact_calculation.sixfb_principle_impact],
            "recovery_urgency_score": impact_calculation.recovery_urgency_score,
            "stakeholder_notifications": impact_calculation.stakeholder_notifications,
            "mitigation_priorities": impact_calculation.mitigation_priorities,
            "business_context": impact_calculation.business_context
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze business impact: {str(e)}")

@router.get("/health/business-enhanced", response_model=Dict[str, Any])
async def business_enhanced_health_check(request: Request, db: Session = Depends(get_db)):
    """
    Business-enhanced health check that includes revenue impact correlation.
    Extends the comprehensive health check with Six Figure Barber methodology integration.
    """
    try:
        start_time = datetime.utcnow()
        
        # Get standard SRE health data
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
        
        # Add business impact correlation
        business_health = await business_impact_monitor.get_business_impact_dashboard()
        health_data["business_impact"] = {
            "summary": business_health.get("summary", {}),
            "peak_hours_status": business_health.get("peak_hours_status", False),
            "high_value_period_status": business_health.get("high_value_period_status", False),
            "current_active_incidents": business_health.get("summary", {}).get("current_active_incidents", 0),
            "total_revenue_impact_30d": business_health.get("summary", {}).get("total_revenue_impact_30d", 0)
        }
        
        # Enhanced overall health calculation with business factors
        overall_status = _calculate_business_enhanced_health(health_data)
        health_data["overall_status"] = overall_status
        
        # Calculate response time
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        health_data["response_time_ms"] = response_time
        
        # Record enhanced metrics
        observability_service.record_metric(
            "sre_business_health_check_duration_ms", 
            response_time,
            {
                "status": overall_status,
                "peak_hours": health_data["business_impact"]["peak_hours_status"],
                "high_value_period": health_data["business_impact"]["high_value_period_status"]
            }
        )
        
        return health_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Business-enhanced health check failed: {str(e)}")

@router.get("/metrics/business-correlated", response_model=Dict[str, Any])
async def get_business_correlated_metrics(
    metric_name: Optional[str] = None,
    time_range: str = "1h",
    include_revenue_impact: bool = True
):
    """Get system metrics correlated with business impact data"""
    try:
        # Get technical metrics
        if metric_name:
            technical_value = observability_service.get_metric_value(metric_name)
            technical_data = {
                "metric": metric_name,
                "value": technical_value,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            technical_data = observability_service.get_dashboard_data()
        
        result = {"technical_metrics": technical_data}
        
        # Add business correlation if requested
        if include_revenue_impact:
            business_dashboard = await business_impact_monitor.get_business_impact_dashboard()
            
            # Correlate technical metrics with business impact
            correlation_data = {
                "revenue_correlation": {
                    "total_impact_30d": business_dashboard.get("summary", {}).get("total_revenue_impact_30d", 0),
                    "incident_count": business_dashboard.get("summary", {}).get("total_incidents_30d", 0),
                    "average_urgency": business_dashboard.get("summary", {}).get("average_recovery_urgency", 50)
                },
                "sixfb_alignment": {
                    "principle_impacts": business_dashboard.get("sixfb_principle_impacts", {}),
                    "business_severity_distribution": business_dashboard.get("severity_distribution", {})
                },
                "operational_context": {
                    "peak_hours_active": business_dashboard.get("peak_hours_status", False),
                    "high_value_period": business_dashboard.get("high_value_period_status", False),
                    "competing_incidents": len(business_dashboard.get("recent_incidents", []))
                }
            }
            
            result["business_correlation"] = correlation_data
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get business-correlated metrics: {str(e)}")

@router.get("/alerts/business-priority", response_model=Dict[str, Any])
async def get_business_priority_alerts(
    min_severity: str = "medium",
    min_revenue_impact: float = 100.0,
    limit: int = 20
):
    """Get alerts prioritized by business impact rather than just technical severity"""
    try:
        # Get recent business impacts from cache
        from services.redis_cache import cache_service
        recent_impacts = await cache_service.get("recent_business_impacts") or []
        
        # Filter by business criteria
        filtered_impacts = []
        for impact in recent_impacts:
            business_severity = impact.get("business_severity", "minimal")
            revenue_loss = impact.get("estimated_revenue_loss", 0)
            
            # Check if meets minimum criteria
            severity_levels = ["minimal", "low", "medium", "high", "critical"]
            if (severity_levels.index(business_severity) >= severity_levels.index(min_severity) or
                revenue_loss >= min_revenue_impact):
                filtered_impacts.append(impact)
        
        # Sort by business impact priority
        def business_priority_score(impact):
            severity_weights = {"minimal": 1, "low": 2, "medium": 3, "high": 4, "critical": 5}
            base_score = severity_weights.get(impact.get("business_severity", "minimal"), 1)
            revenue_multiplier = min(5.0, impact.get("estimated_revenue_loss", 0) / 1000.0)
            urgency_multiplier = impact.get("recovery_urgency_score", 50) / 100.0
            return base_score * (1 + revenue_multiplier) * (1 + urgency_multiplier)
        
        filtered_impacts.sort(key=business_priority_score, reverse=True)
        filtered_impacts = filtered_impacts[:limit]
        
        # Generate business-aware alert summaries
        business_alerts = []
        for impact in filtered_impacts:
            alert = {
                "timestamp": impact.get("timestamp"),
                "incident_type": impact.get("incident_type"),
                "business_severity": impact.get("business_severity"),
                "technical_severity": impact.get("technical_severity"),
                "estimated_revenue_loss": impact.get("estimated_revenue_loss"),
                "recovery_urgency_score": impact.get("recovery_urgency_score"),
                "stakeholder_notifications": impact.get("stakeholder_notifications", []),
                "mitigation_priorities": impact.get("mitigation_priorities", []),
                "sixfb_principles_affected": impact.get("sixfb_principles_affected", []),
                "business_priority_score": business_priority_score(impact)
            }
            business_alerts.append(alert)
        
        return {
            "alerts": business_alerts,
            "summary": {
                "total_high_impact": len([a for a in business_alerts if a["business_severity"] in ["high", "critical"]]),
                "total_revenue_at_risk": sum(a["estimated_revenue_loss"] for a in business_alerts),
                "average_urgency": sum(a["recovery_urgency_score"] for a in business_alerts) / len(business_alerts) if business_alerts else 0,
                "most_affected_principles": _get_most_affected_sixfb_principles(business_alerts)
            },
            "filters_applied": {
                "min_severity": min_severity,
                "min_revenue_impact": min_revenue_impact,
                "limit": limit
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get business-priority alerts: {str(e)}")

@router.post("/incidents/{incident_id}/business-impact")
async def add_business_impact_to_incident(
    incident_id: str,
    background_tasks: BackgroundTasks
):
    """Add business impact analysis to an existing incident"""
    try:
        if incident_id not in sre_orchestrator.active_incidents:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        incident = sre_orchestrator.active_incidents[incident_id]
        
        # Analyze business impact in background
        background_tasks.add_task(
            _analyze_incident_business_impact,
            incident_id,
            incident.title,
            incident.severity.value,
            incident.services_affected
        )
        
        return {
            "message": "Business impact analysis started",
            "incident_id": incident_id,
            "status": "analyzing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add business impact analysis: {str(e)}")

@router.get("/dashboard/six-figure-barber", response_model=Dict[str, Any])
async def get_sixfb_monitoring_dashboard():
    """Get Six Figure Barber methodology-specific monitoring dashboard"""
    try:
        # Get business impact data
        business_dashboard = await business_impact_monitor.get_business_impact_dashboard()
        
        # Get current system performance
        system_performance = await performance_tracker.get_performance_summary()
        
        # Create Six Figure Barber focused dashboard
        sixfb_dashboard = {
            "methodology_alignment": {
                "principles_affected_30d": business_dashboard.get("sixfb_principle_impacts", {}),
                "revenue_optimization_health": _calculate_principle_health("revenue_optimization", business_dashboard),
                "client_value_creation_health": _calculate_principle_health("client_value_creation", business_dashboard),
                "service_excellence_health": _calculate_principle_health("service_excellence", business_dashboard),
                "business_efficiency_health": _calculate_principle_health("business_efficiency", business_dashboard),
                "professional_growth_health": _calculate_principle_health("professional_growth", business_dashboard)
            },
            "revenue_impact_monitoring": {
                "total_impact_30d": business_dashboard.get("summary", {}).get("total_revenue_impact_30d", 0),
                "average_incident_cost": _calculate_average_incident_cost(business_dashboard),
                "high_value_period_risks": business_dashboard.get("high_value_period_status", False),
                "peak_hours_protection": business_dashboard.get("peak_hours_status", False)
            },
            "client_experience_monitoring": {
                "booking_system_health": _get_booking_system_health(),
                "payment_system_health": _get_payment_system_health(),
                "notification_system_health": _get_notification_system_health(),
                "mobile_experience_health": _get_mobile_experience_health()
            },
            "business_continuity": {
                "mttr_by_business_severity": business_dashboard.get("mttr_by_business_severity", {}),
                "recovery_effectiveness": _calculate_recovery_effectiveness(business_dashboard),
                "incident_prevention_score": _calculate_prevention_score()
            },
            "performance_correlation": {
                "current_system_health": system_performance.get("current_health", {}),
                "business_impact_correlation": _correlate_performance_with_business(system_performance, business_dashboard),
                "optimization_opportunities": _identify_optimization_opportunities(system_performance, business_dashboard)
            },
            "stakeholder_insights": {
                "executive_summary": _generate_executive_summary(business_dashboard),
                "operational_priorities": _generate_operational_priorities(business_dashboard),
                "technical_recommendations": _generate_technical_recommendations(system_performance, business_dashboard)
            }
        }
        
        return sixfb_dashboard
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Six Figure Barber dashboard: {str(e)}")

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

# Business Impact Enhanced Helper Functions

def _calculate_business_enhanced_health(health_data: Dict[str, Any]) -> str:
    """Calculate overall system health with business impact considerations"""
    # Start with technical health
    technical_health = _calculate_overall_health(health_data)
    
    # Get business impact factors
    business_impact = health_data.get("business_impact", {})
    total_revenue_impact = business_impact.get("total_revenue_impact_30d", 0)
    peak_hours_status = business_impact.get("peak_hours_status", False)
    high_value_period = business_impact.get("high_value_period_status", False)
    active_incidents = business_impact.get("current_active_incidents", 0)
    
    # Adjust health based on business factors
    if technical_health == "critical":
        return "critical"
    
    # Revenue impact considerations
    if total_revenue_impact > 5000:  # >$5000 impact in 30 days
        if technical_health == "healthy":
            return "degraded"
        elif technical_health == "degraded":
            return "critical"
    
    # Peak hours/high-value period considerations
    if (peak_hours_status or high_value_period) and technical_health == "degraded":
        return "critical"  # Elevate severity during business-critical periods
    
    # Active incidents with business impact
    if active_incidents > 0 and total_revenue_impact > 1000:
        return "degraded" if technical_health == "healthy" else technical_health
    
    return technical_health

def _get_most_affected_sixfb_principles(business_alerts: List[Dict[str, Any]]) -> List[str]:
    """Get the most affected Six Figure Barber principles from alerts"""
    principle_counts = {}
    for alert in business_alerts:
        for principle in alert.get("sixfb_principles_affected", []):
            principle_counts[principle] = principle_counts.get(principle, 0) + 1
    
    # Sort by frequency and return top 3
    sorted_principles = sorted(principle_counts.items(), key=lambda x: x[1], reverse=True)
    return [principle for principle, count in sorted_principles[:3]]

async def _analyze_incident_business_impact(
    incident_id: str, 
    title: str, 
    severity: str, 
    services_affected: List[str]
):
    """Background task to analyze business impact of an incident"""
    try:
        # Convert severity to technical metrics format
        technical_metrics = {
            "severity": severity,
            "error_rate": 0.15 if severity == "critical" else 0.05,
            "response_time_ms": 5000 if severity == "critical" else 2000
        }
        
        # Analyze business impact
        impact_calculation = await business_impact_monitor.analyze_business_impact(
            incident_type=f"incident_{severity}",
            technical_metrics=technical_metrics,
            affected_systems=services_affected,
            duration_minutes=None  # Unknown duration for active incident
        )
        
        # Store the analysis results
        from services.redis_cache import cache_service
        await cache_service.set(
            f"incident_business_impact:{incident_id}",
            {
                "incident_id": incident_id,
                "analysis": {
                    "business_severity": impact_calculation.business_severity.value,
                    "estimated_revenue_loss": float(impact_calculation.estimated_revenue_loss),
                    "recovery_urgency_score": impact_calculation.recovery_urgency_score,
                    "stakeholder_notifications": impact_calculation.stakeholder_notifications,
                    "mitigation_priorities": impact_calculation.mitigation_priorities
                }
            },
            ttl=3600
        )
        
    except Exception as e:
        logger.error(f"Error analyzing business impact for incident {incident_id}: {e}")

def _calculate_principle_health(principle: str, business_dashboard: Dict[str, Any]) -> str:
    """Calculate health score for a specific Six Figure Barber principle"""
    principle_impacts = business_dashboard.get("sixfb_principle_impacts", {})
    impact_count = principle_impacts.get(principle, 0)
    
    if impact_count == 0:
        return "excellent"
    elif impact_count <= 2:
        return "good"
    elif impact_count <= 5:
        return "degraded"
    else:
        return "critical"

def _calculate_average_incident_cost(business_dashboard: Dict[str, Any]) -> float:
    """Calculate average cost per incident"""
    summary = business_dashboard.get("summary", {})
    total_revenue_impact = summary.get("total_revenue_impact_30d", 0)
    total_incidents = summary.get("total_incidents_30d", 1)  # Avoid division by zero
    
    return total_revenue_impact / total_incidents

def _get_booking_system_health() -> str:
    """Get booking system health status"""
    # Check circuit breaker status for booking-related services
    booking_circuits = [
        name for name in circuit_breaker_service.circuits.keys()
        if "booking" in name.lower()
    ]
    
    if any(circuit_breaker_service.circuits[name].state.value == "open" for name in booking_circuits):
        return "critical"
    
    return "healthy"

def _get_payment_system_health() -> str:
    """Get payment system health status"""
    payment_circuits = [
        name for name in circuit_breaker_service.circuits.keys()
        if "payment" in name.lower() or "stripe" in name.lower()
    ]
    
    if any(circuit_breaker_service.circuits[name].state.value == "open" for name in payment_circuits):
        return "critical"
    
    return "healthy"

def _get_notification_system_health() -> str:
    """Get notification system health status"""
    notification_circuits = [
        name for name in circuit_breaker_service.circuits.keys()
        if "notification" in name.lower() or "email" in name.lower() or "sms" in name.lower()
    ]
    
    if any(circuit_breaker_service.circuits[name].state.value == "open" for name in notification_circuits):
        return "degraded"
    
    return "healthy"

def _get_mobile_experience_health() -> str:
    """Get mobile experience health status"""
    # This would integrate with mobile-specific monitoring
    # For now, return based on overall system performance
    if len(sre_orchestrator.active_incidents) > 0:
        return "degraded"
    return "healthy"

def _calculate_recovery_effectiveness(business_dashboard: Dict[str, Any]) -> float:
    """Calculate recovery effectiveness score (0-100)"""
    mttr_by_severity = business_dashboard.get("mttr_by_business_severity", {})
    
    # Calculate weighted average based on business impact
    total_weight = 0
    weighted_score = 0
    
    severity_weights = {"critical": 5, "high": 4, "medium": 3, "low": 2, "minimal": 1}
    target_mttr = {"critical": 5, "high": 15, "medium": 30, "low": 60, "minimal": 120}  # minutes
    
    for severity, mttr in mttr_by_severity.items():
        weight = severity_weights.get(severity, 1)
        target = target_mttr.get(severity, 60)
        
        # Score based on how close to target MTTR
        if mttr <= target:
            score = 100
        else:
            score = max(0, 100 - ((mttr - target) / target * 100))
        
        weighted_score += score * weight
        total_weight += weight
    
    return weighted_score / total_weight if total_weight > 0 else 75.0

def _calculate_prevention_score() -> float:
    """Calculate incident prevention effectiveness score"""
    # This would analyze trends in incident frequency
    # For now, return a placeholder score
    return 82.5

def _correlate_performance_with_business(
    system_performance: Dict[str, Any], 
    business_dashboard: Dict[str, Any]
) -> Dict[str, Any]:
    """Correlate system performance metrics with business impact"""
    current_health = system_performance.get("current_health", {})
    business_summary = business_dashboard.get("summary", {})
    
    return {
        "performance_score": current_health.get("performance_score", 75),
        "business_impact_correlation": {
            "revenue_at_risk_per_performance_point": business_summary.get("total_revenue_impact_30d", 0) / 100,
            "incident_likelihood": min(100, (100 - current_health.get("performance_score", 75)) * 2),
            "customer_satisfaction_impact": _estimate_satisfaction_impact(current_health)
        }
    }

def _estimate_satisfaction_impact(current_health: Dict[str, Any]) -> float:
    """Estimate customer satisfaction impact from performance"""
    performance_score = current_health.get("performance_score", 75)
    
    if performance_score >= 90:
        return 0.0  # No negative impact
    elif performance_score >= 70:
        return -0.5  # Minor impact
    elif performance_score >= 50:
        return -1.5  # Moderate impact
    else:
        return -3.0  # Significant impact

def _identify_optimization_opportunities(
    system_performance: Dict[str, Any], 
    business_dashboard: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Identify optimization opportunities based on performance and business data"""
    opportunities = []
    
    current_health = system_performance.get("current_health", {})
    performance_score = current_health.get("performance_score", 75)
    
    # Performance-based opportunities
    if performance_score < 80:
        opportunities.append({
            "type": "performance_optimization",
            "priority": "high",
            "description": "System performance below optimal (80+) threshold",
            "potential_impact": "Reduce incident likelihood by 25-40%",
            "action": "Review resource allocation and optimize bottlenecks"
        })
    
    # Business impact based opportunities
    total_revenue_impact = business_dashboard.get("summary", {}).get("total_revenue_impact_30d", 0)
    if total_revenue_impact > 1000:
        opportunities.append({
            "type": "business_continuity",
            "priority": "high",
            "description": f"High revenue impact detected (${total_revenue_impact:.0f} in 30 days)",
            "potential_impact": "Reduce revenue loss by 50-70%",
            "action": "Implement proactive monitoring and faster recovery procedures"
        })
    
    # Circuit breaker optimization
    open_circuits = len([
        c for c in circuit_breaker_service.circuits.values()
        if c.state.value == "open"
    ])
    if open_circuits > 0:
        opportunities.append({
            "type": "dependency_management",
            "priority": "medium",
            "description": f"{open_circuits} circuit breaker(s) currently open",
            "potential_impact": "Improve system resilience and reduce cascading failures",
            "action": "Review and optimize circuit breaker thresholds and recovery logic"
        })
    
    return opportunities

def _generate_executive_summary(business_dashboard: Dict[str, Any]) -> Dict[str, Any]:
    """Generate executive summary of system health and business impact"""
    summary = business_dashboard.get("summary", {})
    
    return {
        "system_status": "stable" if summary.get("current_active_incidents", 0) == 0 else "at_risk",
        "revenue_impact_30d": summary.get("total_revenue_impact_30d", 0),
        "incident_frequency": "low" if summary.get("total_incidents_30d", 0) < 5 else "elevated",
        "business_continuity_score": _calculate_recovery_effectiveness(business_dashboard),
        "key_risks": _identify_key_business_risks(business_dashboard),
        "investment_priorities": _suggest_investment_priorities(business_dashboard)
    }

def _identify_key_business_risks(business_dashboard: Dict[str, Any]) -> List[str]:
    """Identify key business risks from monitoring data"""
    risks = []
    
    if business_dashboard.get("peak_hours_status", False):
        risks.append("Peak business hours vulnerability")
    
    if business_dashboard.get("high_value_period_status", False):
        risks.append("High-value period operational risk")
    
    principle_impacts = business_dashboard.get("sixfb_principle_impacts", {})
    if principle_impacts.get("revenue_optimization", 0) > 3:
        risks.append("Revenue optimization system instability")
    
    if principle_impacts.get("client_value_creation", 0) > 3:
        risks.append("Client experience degradation risk")
    
    return risks

def _suggest_investment_priorities(business_dashboard: Dict[str, Any]) -> List[str]:
    """Suggest investment priorities based on business impact analysis"""
    priorities = []
    
    total_impact = business_dashboard.get("summary", {}).get("total_revenue_impact_30d", 0)
    
    if total_impact > 2000:
        priorities.append("Incident response automation")
        priorities.append("Proactive monitoring enhancement")
    
    if total_impact > 1000:
        priorities.append("Circuit breaker optimization")
        priorities.append("Performance monitoring expansion")
    
    priorities.append("Business impact correlation tooling")
    
    return priorities

def _generate_operational_priorities(business_dashboard: Dict[str, Any]) -> List[str]:
    """Generate operational priorities for day-to-day management"""
    priorities = []
    
    active_incidents = business_dashboard.get("summary", {}).get("current_active_incidents", 0)
    if active_incidents > 0:
        priorities.append("Resolve active incidents with business impact analysis")
    
    if business_dashboard.get("peak_hours_status", False):
        priorities.append("Monitor peak hours performance closely")
    
    mttr_issues = any(
        mttr > 15 for mttr in business_dashboard.get("mttr_by_business_severity", {}).values()
    )
    if mttr_issues:
        priorities.append("Improve incident response procedures")
    
    priorities.append("Review and update business impact thresholds")
    
    return priorities

def _generate_technical_recommendations(
    system_performance: Dict[str, Any], 
    business_dashboard: Dict[str, Any]
) -> List[str]:
    """Generate technical recommendations based on performance and business data"""
    recommendations = []
    
    performance_score = system_performance.get("current_health", {}).get("performance_score", 75)
    if performance_score < 70:
        recommendations.append("Scale infrastructure resources")
        recommendations.append("Implement caching optimizations")
    
    open_circuits = len([
        c for c in circuit_breaker_service.circuits.values()
        if c.state.value == "open"
    ])
    if open_circuits > 2:
        recommendations.append("Review circuit breaker configurations")
        recommendations.append("Implement graceful degradation patterns")
    
    total_incidents = business_dashboard.get("summary", {}).get("total_incidents_30d", 0)
    if total_incidents > 10:
        recommendations.append("Enhance automated monitoring and alerting")
        recommendations.append("Implement chaos engineering practices")
    
    recommendations.append("Integrate business metrics into technical dashboards")
    
    return recommendations