"""
Reliability Monitoring API Endpoints
Comprehensive SRE monitoring, SLO tracking, incident response, and resilience management
for the 6fb-booking platform with business context awareness
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging

from db import get_db
from middleware.security import require_admin
from services.slo_monitoring_service import slo_monitor, SLOSeverity
from services.incident_response_service import incident_response, IncidentSeverity, IncidentStatus
from services.resilience_service import resilience_service, CircuitBreakerState
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity
from services.performance_monitoring_service import performance_monitor


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reliability", tags=["Reliability Monitoring"])


@router.get("/dashboard", response_model=None)
async def get_reliability_dashboard(admin_user = Depends(require_admin)):
    """Get comprehensive reliability dashboard data"""
    
    try:
        # Gather all reliability data in parallel
        slo_dashboard_task = slo_monitor.get_slo_dashboard_data()
        incident_dashboard_task = incident_response.get_incident_dashboard_data()
        resilience_dashboard_task = resilience_service.get_resilience_dashboard_data()
        performance_summary_task = performance_monitor.get_system_performance_summary(60)
        
        slo_data, incident_data, resilience_data, performance_data = await asyncio.gather(
            slo_dashboard_task,
            incident_dashboard_task,
            resilience_dashboard_task,
            performance_summary_task,
            return_exceptions=True
        )
        
        # Handle exceptions gracefully
        if isinstance(slo_data, Exception):
            slo_data = {"error": str(slo_data)}
        if isinstance(incident_data, Exception):
            incident_data = {"error": str(incident_data)}
        if isinstance(resilience_data, Exception):
            resilience_data = {"error": str(resilience_data)}
        if isinstance(performance_data, Exception):
            performance_data = {"error": str(performance_data)}
        
        # Calculate overall reliability score
        overall_score = _calculate_overall_reliability_score(slo_data, incident_data, resilience_data)
        
        # Generate executive summary
        executive_summary = _generate_executive_summary(slo_data, incident_data, resilience_data, performance_data)
        
        dashboard = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_reliability_score": overall_score,
            "status": _determine_overall_status(overall_score, incident_data, resilience_data),
            "executive_summary": executive_summary,
            "slo_monitoring": slo_data,
            "incident_response": incident_data,
            "resilience_patterns": resilience_data,
            "performance_metrics": performance_data,
            "six_figure_methodology_impact": _assess_six_figure_methodology_impact(slo_data, incident_data),
            "actionable_recommendations": _generate_actionable_recommendations(slo_data, incident_data, resilience_data)
        }
        
        return JSONResponse(content=dashboard)
        
    except Exception as e:
        logger.error(f"Failed to generate reliability dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")


@router.get("/slo", response_model=None)
async def get_slo_status(
    slo_name: Optional[str] = Query(None, description="Specific SLO name to query"),
    time_window_hours: int = Query(24, description="Time window in hours")
):
    """Get Service Level Objective status and metrics"""
    
    try:
        if slo_name:
            # Get specific SLO status
            slo_status = await slo_monitor.get_slo_status(slo_name)
            if not slo_status:
                raise HTTPException(status_code=404, detail=f"SLO '{slo_name}' not found")
            
            return JSONResponse(content={
                "slo_name": slo_name,
                "status": slo_status.__dict__,
                "timestamp": datetime.utcnow().isoformat()
            })
        else:
            # Get all SLO statuses
            dashboard_data = await slo_monitor.get_slo_dashboard_data()
            return JSONResponse(content=dashboard_data)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get SLO status: {e}")
        raise HTTPException(status_code=500, detail=f"SLO query failed: {str(e)}")


@router.get("/slo/error-budget", response_model=None)
async def get_error_budget_status(admin_user = Depends(require_admin)):
    """Get error budget status for all SLOs"""
    
    try:
        dashboard_data = await slo_monitor.get_slo_dashboard_data()
        
        error_budget_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_budgets": dashboard_data.get("error_budgets", {}),
            "critical_budget_alerts": [],
            "budget_exhaustion_projections": {},
            "business_impact_analysis": {}
        }
        
        # Analyze error budgets for critical alerts
        for slo_name, budget_data in dashboard_data.get("error_budgets", {}).items():
            remaining_budget = budget_data.get("remaining_budget", 100)
            total_budget = budget_data.get("total_budget", 1)
            
            if remaining_budget <= 0:
                error_budget_summary["critical_budget_alerts"].append({
                    "slo_name": slo_name,
                    "alert_type": "BUDGET_EXHAUSTED",
                    "message": f"Error budget for {slo_name} is completely exhausted"
                })
            elif total_budget > 0 and (remaining_budget / total_budget) <= 0.25:
                error_budget_summary["critical_budget_alerts"].append({
                    "slo_name": slo_name,
                    "alert_type": "BUDGET_CRITICAL",
                    "message": f"Error budget for {slo_name} is critically low ({remaining_budget:.2f}% remaining)"
                })
            
            # Project exhaustion time if consumption rate is available
            consumption_rate = budget_data.get("consumption_rate", 0)
            if consumption_rate > 0 and remaining_budget > 0:
                days_to_exhaustion = remaining_budget / consumption_rate
                if days_to_exhaustion <= 7:  # Within a week
                    error_budget_summary["budget_exhaustion_projections"][slo_name] = {
                        "days_to_exhaustion": days_to_exhaustion,
                        "projected_date": (datetime.utcnow() + timedelta(days=days_to_exhaustion)).isoformat()
                    }
        
        return JSONResponse(content=error_budget_summary)
        
    except Exception as e:
        logger.error(f"Failed to get error budget status: {e}")
        raise HTTPException(status_code=500, detail=f"Error budget query failed: {str(e)}")


@router.get("/incidents", response_model=None)
async def get_incident_status(
    status: Optional[str] = Query(None, description="Filter by incident status"),
    severity: Optional[str] = Query(None, description="Filter by incident severity"),
    limit: int = Query(10, description="Number of incidents to return")
):
    """Get incident response status and active incidents"""
    
    try:
        dashboard_data = await incident_response.get_incident_dashboard_data()
        
        # Filter active incidents if requested
        active_incidents = dashboard_data.get("active_incidents", [])
        
        if status:
            active_incidents = [i for i in active_incidents if i.get("status") == status]
        
        if severity:
            active_incidents = [i for i in active_incidents if i.get("severity") == severity]
        
        # Limit results
        active_incidents = active_incidents[:limit]
        
        incident_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "active_incidents": active_incidents,
            "incident_metrics": dashboard_data.get("metrics", {}),
            "recovery_automation_status": {
                "auto_recovery_enabled": dashboard_data.get("auto_recovery_enabled", False),
                "detection_rules_enabled": dashboard_data.get("detection_rules_enabled", 0),
                "circuit_breakers_active": dashboard_data.get("circuit_breakers_active", 0)
            }
        }
        
        return JSONResponse(content=incident_summary)
        
    except Exception as e:
        logger.error(f"Failed to get incident status: {e}")
        raise HTTPException(status_code=500, detail=f"Incident query failed: {str(e)}")


@router.get("/circuit-breakers", response_model=None)
async def get_circuit_breaker_status():
    """Get circuit breaker and resilience pattern status"""
    
    try:
        resilience_data = await resilience_service.get_resilience_dashboard_data()
        
        circuit_breaker_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "circuit_breakers": resilience_data.get("circuit_breakers", {}),
            "active_degradations": resilience_data.get("active_degradations", {}),
            "rate_limiters": resilience_data.get("rate_limiters", {}),
            "overall_resilience_health": resilience_data.get("overall_health", "unknown"),
            "resilience_metrics": resilience_data.get("metrics", {})
        }
        
        # Add business impact analysis
        business_impact = {
            "critical_services_affected": [],
            "revenue_impact_estimate": 0,
            "user_experience_impact": "minimal"
        }
        
        for name, breaker_status in resilience_data.get("circuit_breakers", {}).items():
            if breaker_status.get("state") == "open" and breaker_status.get("service_tier") == "critical":
                business_impact["critical_services_affected"].append({
                    "service": name,
                    "business_impact": breaker_status.get("business_impact", "unknown"),
                    "state_duration_minutes": breaker_status.get("state_duration_minutes", 0)
                })
        
        if business_impact["critical_services_affected"]:
            business_impact["revenue_impact_estimate"] = len(business_impact["critical_services_affected"]) * 1000  # $1000/service/hour estimate
            business_impact["user_experience_impact"] = "major"
        
        circuit_breaker_summary["business_impact_analysis"] = business_impact
        
        return JSONResponse(content=circuit_breaker_summary)
        
    except Exception as e:
        logger.error(f"Failed to get circuit breaker status: {e}")
        raise HTTPException(status_code=500, detail=f"Circuit breaker query failed: {str(e)}")


@router.get("/performance", response_model=None)
async def get_performance_metrics(
    time_window_minutes: int = Query(60, description="Time window in minutes")
):
    """Get performance metrics and recommendations"""
    
    try:
        # Get performance data
        system_summary = await performance_monitor.get_system_performance_summary(time_window_minutes)
        endpoint_performance = await performance_monitor.get_endpoint_performance(time_window_minutes)
        recommendations = await performance_monitor.get_performance_recommendations()
        
        performance_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "time_window_minutes": time_window_minutes,
            "system_metrics": system_summary,
            "endpoint_performance": [ep.__dict__ for ep in endpoint_performance],
            "performance_recommendations": recommendations,
            "business_impact_analysis": _analyze_performance_business_impact(endpoint_performance, system_summary)
        }
        
        return JSONResponse(content=performance_summary)
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Performance query failed: {str(e)}")


@router.post("/test-incident", response_model=None)
async def trigger_test_incident(
    severity: str = Query("P3_medium", description="Incident severity to test"),
    admin_user = Depends(require_admin)
):
    """Trigger a test incident for validation (admin only)"""
    
    try:
        # Validate severity
        valid_severities = [s.value for s in IncidentSeverity]
        if severity not in valid_severities:
            raise HTTPException(status_code=400, detail=f"Invalid severity. Must be one of: {valid_severities}")
        
        # Create test incident
        test_incident_data = {
            "incident_type": "test_incident",
            "severity": severity,
            "description": f"Test incident for reliability monitoring validation - {datetime.utcnow().isoformat()}",
            "triggered_by": "admin_api",
            "auto_resolve": True
        }
        
        # Log test incident
        await enhanced_sentry.capture_business_event(
            "test_incident_triggered",
            f"Test incident triggered with severity {severity}",
            test_incident_data
        )
        
        # Schedule auto-resolution after 2 minutes
        async def auto_resolve_test_incident():
            await asyncio.sleep(120)  # Wait 2 minutes
            await enhanced_sentry.capture_business_event(
                "test_incident_resolved",
                "Test incident automatically resolved",
                {"incident_id": test_incident_data.get("incident_id", "test")}
            )
        
        # Start background task for auto-resolution
        asyncio.create_task(auto_resolve_test_incident())
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "Test incident triggered successfully",
                "incident_data": test_incident_data,
                "auto_resolve_in_minutes": 2
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger test incident: {e}")
        raise HTTPException(status_code=500, detail=f"Test incident failed: {str(e)}")


@router.get("/alerts", response_model=None)
async def get_active_alerts(admin_user = Depends(require_admin)):
    """Get active reliability alerts and recommendations"""
    
    try:
        # Gather alert data from all systems
        slo_data = await slo_monitor.get_slo_dashboard_data()
        incident_data = await incident_response.get_incident_dashboard_data()
        resilience_data = await resilience_service.get_resilience_dashboard_data()
        
        active_alerts = []
        
        # SLO violation alerts
        for violation in slo_data.get("critical_violations", []):
            active_alerts.append({
                "type": "slo_violation",
                "severity": "critical" if violation.get("status") == "breached" else "warning",
                "message": f"SLO violation: {violation.get('slo_name')} - {violation.get('performance', 0):.2f}%",
                "source": "slo_monitor",
                "business_impact": violation.get("business_impact", "unknown"),
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Active incident alerts
        for incident in incident_data.get("active_incidents", []):
            active_alerts.append({
                "type": "active_incident",
                "severity": incident.get("severity", "unknown").lower(),
                "message": f"Active incident: {incident.get('title', 'Unknown')}",
                "source": "incident_response",
                "incident_id": incident.get("incident_id"),
                "age_minutes": incident.get("age_minutes", 0),
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Circuit breaker alerts
        for name, breaker in resilience_data.get("circuit_breakers", {}).items():
            if breaker.get("state") == "open":
                active_alerts.append({
                    "type": "circuit_breaker_open",
                    "severity": "critical" if breaker.get("service_tier") == "critical" else "warning",
                    "message": f"Circuit breaker open: {name}",
                    "source": "resilience_service",
                    "service": name,
                    "business_impact": breaker.get("business_impact", "unknown"),
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        # Sort alerts by severity and timestamp
        severity_order = {"critical": 0, "high": 1, "warning": 2, "info": 3}
        active_alerts.sort(key=lambda x: (severity_order.get(x.get("severity", "info"), 3), x.get("timestamp", "")))
        
        alert_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "total_alerts": len(active_alerts),
            "critical_alerts": len([a for a in active_alerts if a.get("severity") == "critical"]),
            "active_alerts": active_alerts,
            "alert_trends": {
                "last_24h": len(active_alerts),  # Simplified - would need historical data
                "avg_resolution_time_minutes": incident_data.get("metrics", {}).get("mean_time_to_resolution", 0)
            }
        }
        
        return JSONResponse(content=alert_summary)
        
    except Exception as e:
        logger.error(f"Failed to get active alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Alert query failed: {str(e)}")


@router.get("/business-impact", response_model=None)
async def get_business_impact_analysis(admin_user = Depends(require_admin)):
    """Get business impact analysis of reliability issues"""
    
    try:
        # Gather all reliability data
        slo_data = await slo_monitor.get_slo_dashboard_data()
        incident_data = await incident_response.get_incident_dashboard_data()
        resilience_data = await resilience_service.get_resilience_dashboard_data()
        
        # Calculate business impact metrics
        business_impact = {
            "timestamp": datetime.utcnow().isoformat(),
            "six_figure_methodology_impact": slo_data.get("business_impact_summary", {}),
            "revenue_impact": {
                "estimated_hourly_loss": 0,
                "affected_revenue_streams": [],
                "customer_impact_estimate": 0
            },
            "operational_impact": {
                "degraded_services": [],
                "manual_intervention_required": [],
                "efficiency_reduction_percentage": 0
            },
            "strategic_impact": {
                "client_satisfaction_risk": "low",
                "brand_reputation_risk": "low",
                "growth_impediment_score": 0
            }
        }
        
        # Calculate revenue impact from active incidents
        total_revenue_impact = 0
        affected_customers = 0
        
        for incident in incident_data.get("active_incidents", []):
            impact_score = incident.get("business_impact_score", 0)
            age_hours = incident.get("age_minutes", 0) / 60
            
            # Estimate hourly revenue loss based on severity and business impact
            if incident.get("severity") == "P1_critical":
                hourly_loss = impact_score * 100  # Up to $10,000/hour for critical
            elif incident.get("severity") == "P2_high":
                hourly_loss = impact_score * 50   # Up to $5,000/hour for high
            else:
                hourly_loss = impact_score * 20   # Up to $2,000/hour for medium
            
            total_revenue_impact += hourly_loss * age_hours
            affected_customers += incident.get("customer_impact_count", 0)
        
        business_impact["revenue_impact"]["estimated_hourly_loss"] = total_revenue_impact
        business_impact["revenue_impact"]["customer_impact_estimate"] = affected_customers
        
        # Identify affected revenue streams
        critical_slo_violations = [
            v for v in slo_data.get("critical_violations", [])
            if v.get("business_impact") == "critical"
        ]
        
        for violation in critical_slo_violations:
            slo_name = violation.get("slo_name", "")
            if "payment" in slo_name.lower():
                business_impact["revenue_impact"]["affected_revenue_streams"].append("payment_processing")
            elif "booking" in slo_name.lower():
                business_impact["revenue_impact"]["affected_revenue_streams"].append("appointment_bookings")
        
        # Calculate strategic impact
        if total_revenue_impact > 5000:  # More than $5k impact
            business_impact["strategic_impact"]["client_satisfaction_risk"] = "high"
            business_impact["strategic_impact"]["brand_reputation_risk"] = "medium"
            business_impact["strategic_impact"]["growth_impediment_score"] = 80
        elif total_revenue_impact > 1000:  # More than $1k impact
            business_impact["strategic_impact"]["client_satisfaction_risk"] = "medium"
            business_impact["strategic_impact"]["growth_impediment_score"] = 40
        
        return JSONResponse(content=business_impact)
        
    except Exception as e:
        logger.error(f"Failed to get business impact analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Business impact analysis failed: {str(e)}")


def _calculate_overall_reliability_score(slo_data: Dict, incident_data: Dict, resilience_data: Dict) -> float:
    """Calculate overall reliability score (0-100)"""
    
    try:
        # Start with base score
        score = 100.0
        
        # Deduct for SLO violations
        critical_violations = len(slo_data.get("critical_violations", []))
        score -= critical_violations * 15  # 15 points per critical violation
        
        # Deduct for active incidents
        active_incidents = incident_data.get("active_incidents_count", 0)
        score -= active_incidents * 10  # 10 points per active incident
        
        # Deduct for circuit breakers
        open_breakers = sum(
            1 for breaker in resilience_data.get("circuit_breakers", {}).values()
            if breaker.get("state") == "open"
        )
        score -= open_breakers * 5  # 5 points per open circuit breaker
        
        # Deduct for degradations
        active_degradations = len(resilience_data.get("active_degradations", {}))
        score -= active_degradations * 8  # 8 points per active degradation
        
        return max(0.0, min(100.0, score))
        
    except Exception:
        return 50.0  # Default to middle score if calculation fails


def _determine_overall_status(score: float, incident_data: Dict, resilience_data: Dict) -> str:
    """Determine overall system status"""
    
    # Check for critical conditions first
    critical_incidents = [
        i for i in incident_data.get("active_incidents", [])
        if i.get("severity") == "P1_critical"
    ]
    
    if critical_incidents:
        return "critical"
    
    critical_breakers = [
        name for name, breaker in resilience_data.get("circuit_breakers", {}).items()
        if breaker.get("state") == "open" and breaker.get("service_tier") == "critical"
    ]
    
    if critical_breakers:
        return "critical"
    
    # Check score-based status
    if score >= 95:
        return "healthy"
    elif score >= 80:
        return "degraded"
    elif score >= 60:
        return "unhealthy"
    else:
        return "critical"


def _generate_executive_summary(slo_data: Dict, incident_data: Dict, resilience_data: Dict, performance_data: Dict) -> Dict[str, Any]:
    """Generate executive summary of reliability status"""
    
    summary = {
        "overall_health": "healthy",
        "key_metrics": {
            "slos_meeting_targets": 0,
            "active_incidents": incident_data.get("active_incidents_count", 0),
            "error_budget_exhausted": 0,
            "services_degraded": len(resilience_data.get("active_degradations", {}))
        },
        "urgent_actions_required": [],
        "business_continuity_status": "normal"
    }
    
    # Calculate SLOs meeting targets
    total_slos = len(slo_data.get("slos", {}))
    violating_slos = len(slo_data.get("critical_violations", []))
    summary["key_metrics"]["slos_meeting_targets"] = total_slos - violating_slos
    
    # Count error budgets exhausted
    for budget_data in slo_data.get("error_budgets", {}).values():
        if budget_data.get("remaining_budget", 100) <= 0:
            summary["key_metrics"]["error_budget_exhausted"] += 1
    
    # Determine urgent actions
    if incident_data.get("active_incidents_count", 0) > 0:
        summary["urgent_actions_required"].append("Active incidents require attention")
    
    if summary["key_metrics"]["error_budget_exhausted"] > 0:
        summary["urgent_actions_required"].append("Error budgets exhausted - freeze deployments")
    
    critical_breakers = [
        name for name, breaker in resilience_data.get("circuit_breakers", {}).items()
        if breaker.get("state") == "open" and breaker.get("service_tier") == "critical"
    ]
    
    if critical_breakers:
        summary["urgent_actions_required"].append(f"Critical services failing: {', '.join(critical_breakers)}")
        summary["business_continuity_status"] = "at_risk"
    
    return summary


def _assess_six_figure_methodology_impact(slo_data: Dict, incident_data: Dict) -> Dict[str, Any]:
    """Assess impact on Six Figure Barber methodology areas"""
    
    methodology_impact = {
        "revenue_optimization": {"status": "healthy", "issues": []},
        "client_value_creation": {"status": "healthy", "issues": []},
        "business_efficiency": {"status": "healthy", "issues": []},
        "professional_growth": {"status": "healthy", "issues": []},
        "scalability": {"status": "healthy", "issues": []}
    }
    
    # Check for payment/revenue related issues
    payment_issues = [
        v for v in slo_data.get("critical_violations", [])
        if "payment" in v.get("slo_name", "").lower()
    ]
    
    if payment_issues:
        methodology_impact["revenue_optimization"]["status"] = "degraded"
        methodology_impact["revenue_optimization"]["issues"] = [
            f"Payment SLO violation: {issue.get('slo_name', 'unknown')}" for issue in payment_issues
        ]
    
    # Check for booking/client related issues
    booking_issues = [
        v for v in slo_data.get("critical_violations", [])
        if any(keyword in v.get("slo_name", "").lower() for keyword in ["booking", "appointment"])
    ]
    
    if booking_issues:
        methodology_impact["client_value_creation"]["status"] = "degraded"
        methodology_impact["client_value_creation"]["issues"] = [
            f"Booking SLO violation: {issue.get('slo_name', 'unknown')}" for issue in booking_issues
        ]
    
    return methodology_impact


def _generate_actionable_recommendations(slo_data: Dict, incident_data: Dict, resilience_data: Dict) -> List[Dict[str, Any]]:
    """Generate actionable recommendations for reliability improvements"""
    
    recommendations = []
    
    # SLO-based recommendations
    for violation in slo_data.get("critical_violations", []):
        recommendations.append({
            "priority": "high",
            "category": "slo_violation",
            "title": f"Address {violation.get('slo_name', 'unknown')} SLO violation",
            "description": f"SLO is performing at {violation.get('performance', 0):.2f}% vs target {violation.get('target', 0):.2f}%",
            "actions": [
                "Investigate root cause of performance degradation",
                "Implement performance optimizations",
                "Consider scaling resources if needed",
                "Review error patterns and fix recurring issues"
            ],
            "business_impact": violation.get("business_impact", "unknown")
        })
    
    # Incident-based recommendations
    if incident_data.get("active_incidents_count", 0) > 0:
        recommendations.append({
            "priority": "critical",
            "category": "incident_response",
            "title": "Resolve active incidents",
            "description": f"{incident_data.get('active_incidents_count', 0)} active incidents requiring attention",
            "actions": [
                "Prioritize incidents by business impact",
                "Implement immediate mitigation measures",
                "Conduct post-incident reviews for prevention",
                "Update runbooks based on lessons learned"
            ],
            "business_impact": "immediate"
        })
    
    # Circuit breaker recommendations
    open_breakers = [
        name for name, breaker in resilience_data.get("circuit_breakers", {}).items()
        if breaker.get("state") == "open"
    ]
    
    if open_breakers:
        recommendations.append({
            "priority": "high",
            "category": "circuit_breaker",
            "title": "Fix failing services with open circuit breakers",
            "description": f"Services with open circuit breakers: {', '.join(open_breakers)}",
            "actions": [
                "Investigate service failures causing circuit breaker trips",
                "Implement service health monitoring",
                "Add retry and timeout mechanisms",
                "Consider service redundancy and failover"
            ],
            "business_impact": "service_degradation"
        })
    
    # Error budget recommendations
    exhausted_budgets = [
        slo_name for slo_name, budget_data in slo_data.get("error_budgets", {}).items()
        if budget_data.get("remaining_budget", 100) <= 0
    ]
    
    if exhausted_budgets:
        recommendations.append({
            "priority": "critical",
            "category": "error_budget",
            "title": "Address exhausted error budgets",
            "description": f"Error budgets exhausted for: {', '.join(exhausted_budgets)}",
            "actions": [
                "Freeze non-critical feature deployments",
                "Focus engineering effort on reliability improvements",
                "Implement stricter change management",
                "Consider rolling back recent changes if necessary"
            ],
            "business_impact": "reliability_risk"
        })
    
    return recommendations


def _analyze_performance_business_impact(endpoint_performance: List, system_summary: Dict) -> Dict[str, Any]:
    """Analyze business impact of performance metrics"""
    
    impact_analysis = {
        "critical_slow_endpoints": [],
        "resource_constraints": [],
        "user_experience_impact": "minimal",
        "revenue_impact_estimate": 0
    }
    
    # Analyze endpoint performance
    for endpoint in endpoint_performance:
        if endpoint.avg_response_time > 2.0 and endpoint.business_impact in ["critical", "high"]:
            impact_analysis["critical_slow_endpoints"].append({
                "endpoint": endpoint.endpoint,
                "avg_response_time": endpoint.avg_response_time,
                "business_impact": endpoint.business_impact,
                "requests_per_minute": endpoint.requests_per_minute
            })
    
    # Analyze system resources
    cpu_usage = system_summary.get("cpu", {}).get("current_percent", 0)
    memory_usage = system_summary.get("memory", {}).get("current_percent", 0)
    
    if cpu_usage > 80:
        impact_analysis["resource_constraints"].append("High CPU usage")
    if memory_usage > 85:
        impact_analysis["resource_constraints"].append("High memory usage")
    
    # Determine user experience impact
    if len(impact_analysis["critical_slow_endpoints"]) > 2:
        impact_analysis["user_experience_impact"] = "major"
        impact_analysis["revenue_impact_estimate"] = len(impact_analysis["critical_slow_endpoints"]) * 500  # $500 per slow critical endpoint
    elif len(impact_analysis["critical_slow_endpoints"]) > 0:
        impact_analysis["user_experience_impact"] = "moderate"
        impact_analysis["revenue_impact_estimate"] = 200
    
    return impact_analysis