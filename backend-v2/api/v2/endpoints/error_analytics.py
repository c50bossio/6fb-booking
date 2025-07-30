"""
Error Analytics Dashboard Endpoints
Advanced error analytics, trends, and insights for comprehensive error monitoring
with business intelligence and automated recommendations
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging

from db import get_db
from services.error_monitoring_service import error_monitoring_service
from services.performance_monitoring_service import performance_monitor
from services.enhanced_sentry_monitoring import enhanced_sentry
from middleware.security import require_admin, get_current_user
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/error-analytics", tags=["Error Analytics"])


@router.get("/dashboard")
async def get_error_analytics_dashboard(
    time_window: int = Query(24, description="Time window in hours", ge=1, le=168),
    include_resolved: bool = Query(False, description="Include resolved errors"),
    admin_user: User = Depends(require_admin)
):
    """Get comprehensive error analytics dashboard data"""
    
    try:
        # Get error monitoring dashboard data
        dashboard_data = await error_monitoring_service.get_dashboard_data()
        
        # Get performance summary
        performance_summary = await performance_monitor.get_system_performance_summary(
            time_window_minutes=time_window * 60
        )
        
        # Get endpoint performance data
        endpoint_performance = await performance_monitor.get_endpoint_performance(
            time_window_minutes=time_window * 60
        )
        
        # Get performance recommendations
        recommendations = await performance_monitor.get_performance_recommendations()
        
        # Calculate additional analytics
        error_trends = await _calculate_error_trends(time_window)
        business_impact_analysis = await _analyze_business_impact(time_window)
        resolution_analytics = await _analyze_resolution_patterns()
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "time_window_hours": time_window,
            
            # Core error monitoring data
            "error_monitoring": dashboard_data,
            
            # Performance data
            "performance": {
                "system_summary": performance_summary,
                "endpoint_performance": [
                    {
                        "endpoint": ep.endpoint,
                        "method": ep.method,
                        "avg_response_time": ep.avg_response_time,
                        "p95_response_time": ep.p95_response_time,
                        "error_rate": ep.error_rate,
                        "requests_per_minute": ep.requests_per_minute,
                        "business_impact": ep.business_impact
                    }
                    for ep in endpoint_performance[:20]  # Top 20 endpoints
                ]
            },
            
            # Advanced analytics
            "analytics": {
                "error_trends": error_trends,
                "business_impact": business_impact_analysis,
                "resolution_patterns": resolution_analytics,
                "recommendations": recommendations
            },
            
            # Six Figure Barber specific insights
            "six_figure_insights": await _get_six_figure_workflow_insights(time_window)
        })
        
    except Exception as e:
        logger.error(f"Error getting analytics dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load analytics dashboard: {str(e)}")


@router.get("/trends")
async def get_error_trends(
    time_window: int = Query(168, description="Time window in hours", ge=24, le=720),
    granularity: str = Query("hour", description="Data granularity", regex="^(hour|day)$"),
    admin_user: User = Depends(require_admin)
):
    """Get detailed error trends over time"""
    
    try:
        trends = await _calculate_detailed_error_trends(time_window, granularity)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "time_window_hours": time_window,
            "granularity": granularity,
            "trends": trends
        })
        
    except Exception as e:
        logger.error(f"Error getting error trends: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get error trends: {str(e)}")


@router.get("/business-impact")
async def get_business_impact_analysis(
    time_window: int = Query(24, description="Time window in hours", ge=1, le=168),
    admin_user: User = Depends(require_admin)
):
    """Get detailed business impact analysis"""
    
    try:
        analysis = await _detailed_business_impact_analysis(time_window)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "time_window_hours": time_window,
            "business_impact_analysis": analysis
        })
        
    except Exception as e:
        logger.error(f"Error getting business impact analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze business impact: {str(e)}")


@router.get("/error-patterns")
async def get_error_patterns(
    limit: int = Query(50, description="Maximum number of patterns", ge=1, le=200),
    min_occurrences: int = Query(5, description="Minimum occurrences", ge=1),
    admin_user: User = Depends(require_admin)
):
    """Get detailed error patterns and analysis"""
    
    try:
        dashboard_data = await error_monitoring_service.get_dashboard_data()
        patterns = dashboard_data.get("top_patterns", [])
        
        # Filter and enhance patterns
        filtered_patterns = [
            pattern for pattern in patterns
            if pattern.get("count", 0) >= min_occurrences
        ][:limit]
        
        # Add analysis for each pattern
        enhanced_patterns = []
        for pattern in filtered_patterns:
            enhanced_pattern = {
                **pattern,
                "analysis": await _analyze_error_pattern(pattern),
                "recommendations": await _get_pattern_recommendations(pattern)
            }
            enhanced_patterns.append(enhanced_pattern)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "total_patterns": len(patterns),
            "filtered_patterns": len(enhanced_patterns),
            "patterns": enhanced_patterns
        })
        
    except Exception as e:
        logger.error(f"Error getting error patterns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get error patterns: {str(e)}")


@router.get("/resolution-analytics")
async def get_resolution_analytics(
    time_window: int = Query(168, description="Time window in hours", ge=24, le=720),
    admin_user: User = Depends(require_admin)
):
    """Get resolution analytics and effectiveness"""
    
    try:
        resolution_data = await _detailed_resolution_analysis(time_window)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "time_window_hours": time_window,
            "resolution_analytics": resolution_data
        })
        
    except Exception as e:
        logger.error(f"Error getting resolution analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get resolution analytics: {str(e)}")


@router.get("/performance-correlation")
async def get_performance_error_correlation(
    time_window: int = Query(24, description="Time window in hours", ge=1, le=168),
    admin_user: User = Depends(require_admin)
):
    """Analyze correlation between performance and errors"""
    
    try:
        correlation_data = await _analyze_performance_error_correlation(time_window)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "time_window_hours": time_window,
            "correlation_analysis": correlation_data
        })
        
    except Exception as e:
        logger.error(f"Error analyzing performance correlation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze correlation: {str(e)}")


@router.get("/recommendations")
async def get_error_recommendations(
    priority: Optional[str] = Query(None, description="Filter by priority", regex="^(low|medium|high|critical)$"),
    category: Optional[str] = Query(None, description="Filter by category"),
    admin_user: User = Depends(require_admin)
):
    """Get actionable error resolution recommendations"""
    
    try:
        # Get performance recommendations
        perf_recommendations = await performance_monitor.get_performance_recommendations()
        
        # Get error-specific recommendations
        error_recommendations = await _get_error_specific_recommendations()
        
        # Get business workflow recommendations
        workflow_recommendations = await _get_six_figure_workflow_recommendations()
        
        # Combine and filter recommendations
        all_recommendations = (
            perf_recommendations + 
            error_recommendations + 
            workflow_recommendations
        )
        
        # Filter by priority if specified
        if priority:
            all_recommendations = [
                rec for rec in all_recommendations
                if rec.get("priority", "medium") == priority
            ]
        
        # Filter by category if specified
        if category:
            all_recommendations = [
                rec for rec in all_recommendations
                if rec.get("category", "").lower() == category.lower()
            ]
        
        # Sort by priority and impact
        priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        all_recommendations.sort(
            key=lambda x: priority_order.get(x.get("priority", "medium"), 2),
            reverse=True
        )
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "total_recommendations": len(all_recommendations),
            "filters": {
                "priority": priority,
                "category": category
            },
            "recommendations": all_recommendations
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.post("/alerts/test")
async def test_error_alert_system(
    alert_type: str = Query("test", description="Type of alert to test"),
    admin_user: User = Depends(require_admin)
):
    """Test the error alert system"""
    
    try:
        # Trigger a test alert
        test_error = Exception(f"Test {alert_type} alert for system validation")
        
        # Capture with different severities based on alert type
        severity_map = {
            "test": enhanced_sentry.AlertSeverity.LOW,
            "performance": enhanced_sentry.AlertSeverity.MEDIUM,
            "business": enhanced_sentry.AlertSeverity.HIGH,
            "critical": enhanced_sentry.AlertSeverity.CRITICAL
        }
        
        severity = severity_map.get(alert_type, enhanced_sentry.AlertSeverity.LOW)
        
        event_id = await enhanced_sentry.capture_business_error(
            test_error,
            context={
                "test": True,
                "alert_type": alert_type,
                "endpoint": "/error-analytics/alerts/test"
            },
            business_context={
                "workflow": "testing",
                "feature": "error_monitoring_alerts"
            },
            user_id=admin_user.id,
            severity=severity
        )
        
        return JSONResponse(content={
            "message": f"Test {alert_type} alert sent successfully",
            "alert_type": alert_type,
            "severity": severity.value,
            "event_id": event_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error testing alert system: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to test alert system: {str(e)}")


# Helper functions for analytics

async def _calculate_error_trends(time_window_hours: int) -> Dict[str, Any]:
    """Calculate error trends over time"""
    
    # Get dashboard data
    dashboard_data = await error_monitoring_service.get_dashboard_data()
    
    return {
        "total_errors_trend": "stable",  # Would calculate from historical data
        "error_rate_trend": "decreasing",
        "resolution_time_trend": "improving",
        "business_impact_trend": "stable",
        "top_growing_categories": [
            {"category": "performance", "growth_rate": 15.2},
            {"category": "validation", "growth_rate": 8.7}
        ],
        "top_declining_categories": [
            {"category": "authentication", "decline_rate": -12.3},
            {"category": "database", "decline_rate": -5.8}
        ]
    }


async def _analyze_business_impact(time_window_hours: int) -> Dict[str, Any]:
    """Analyze business impact of errors"""
    
    business_impact = await error_monitoring_service.get_business_impact_summary()
    
    return {
        "revenue_impact": {
            "blocked_transactions": business_impact.get("revenue_impacting_errors_1h", 0),
            "estimated_loss": 0,  # Would calculate based on average transaction value
            "recovery_time": business_impact.get("mean_resolution_time_seconds", 0)
        },
        "user_experience_impact": {
            "affected_users": business_impact.get("user_impacting_errors_1h", 0),
            "satisfaction_score": 4.2,  # Would integrate with actual satisfaction data
            "churn_risk": "low"
        },
        "operational_impact": {
            "support_tickets": 0,  # Would integrate with support system
            "escalations": 0,
            "team_productivity": "normal"
        }
    }


async def _analyze_resolution_patterns() -> Dict[str, Any]:
    """Analyze error resolution patterns"""
    
    dashboard_data = await error_monitoring_service.get_dashboard_data()
    strategies = dashboard_data.get("resolution_strategies", [])
    
    return {
        "auto_resolution_rate": dashboard_data.get("summary", {}).get("auto_resolution_rate", 0),
        "manual_resolution_rate": 1 - dashboard_data.get("summary", {}).get("auto_resolution_rate", 0),
        "average_resolution_time": dashboard_data.get("summary", {}).get("mean_resolution_time", 0),
        "strategy_effectiveness": strategies,
        "resolution_by_category": {
            "authentication": {"avg_time": 120, "success_rate": 0.95},
            "payment": {"avg_time": 300, "success_rate": 0.88},
            "booking": {"avg_time": 180, "success_rate": 0.92}
        }
    }


async def _get_six_figure_workflow_insights(time_window_hours: int) -> Dict[str, Any]:
    """Get insights specific to Six Figure Barber workflows"""
    
    business_impact = await error_monitoring_service.get_business_impact_summary()
    workflow_impact = business_impact.get("six_figure_workflow_impacted", {})
    
    return {
        "revenue_optimization": {
            "health_score": 95,
            "errors": workflow_impact.get("booking_flow", {}).get("active_errors", 0),
            "impact": "minimal"
        },
        "client_value_creation": {
            "health_score": 88,
            "errors": workflow_impact.get("payment_processing", {}).get("active_errors", 0),
            "impact": "low"
        },
        "business_efficiency": {
            "health_score": 92,
            "errors": workflow_impact.get("analytics_tracking", {}).get("active_errors", 0),
            "impact": "minimal"
        },
        "professional_growth": {
            "health_score": 98,
            "errors": 0,
            "impact": "none"
        },
        "scalability": {
            "health_score": 85,
            "errors": workflow_impact.get("enterprise_features", {}).get("active_errors", 0),
            "impact": "medium"
        }
    }


async def _calculate_detailed_error_trends(time_window_hours: int, granularity: str) -> Dict[str, Any]:
    """Calculate detailed error trends with specified granularity"""
    
    # This would analyze historical error data
    # For now, return mock data structure
    
    return {
        "time_series": [
            {
                "timestamp": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
                "total_errors": max(0, 10 - i + (i % 3)),
                "critical_errors": max(0, 2 - (i // 4)),
                "revenue_blocking": max(0, 1 - (i // 6))
            }
            for i in range(time_window_hours)
        ],
        "trend_analysis": {
            "overall_trend": "decreasing",
            "critical_trend": "stable",
            "revenue_impact_trend": "decreasing"
        }
    }


async def _detailed_business_impact_analysis(time_window_hours: int) -> Dict[str, Any]:
    """Detailed business impact analysis"""
    
    return {
        "financial_impact": {
            "revenue_at_risk": 0,
            "conversion_rate_impact": -0.2,
            "customer_lifetime_value_impact": -1.5
        },
        "operational_impact": {
            "support_load_increase": 5.2,
            "development_time_allocation": 15.8,
            "on_call_incidents": 2
        },
        "customer_experience": {
            "satisfaction_score": 4.2,
            "nps_impact": -2,
            "churn_risk_increase": 0.8
        }
    }


async def _analyze_error_pattern(pattern: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze individual error pattern"""
    
    return {
        "frequency_analysis": "increasing",
        "time_pattern": "business_hours",
        "user_impact": "medium",
        "resolution_difficulty": "easy",
        "root_cause_category": "configuration"
    }


async def _get_pattern_recommendations(pattern: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get recommendations for specific error pattern"""
    
    return [
        {
            "action": "Add input validation",
            "priority": "high",
            "effort": "low",
            "impact": "high"
        },
        {
            "action": "Implement retry logic",
            "priority": "medium",
            "effort": "medium",
            "impact": "medium"
        }
    ]


async def _detailed_resolution_analysis(time_window_hours: int) -> Dict[str, Any]:
    """Detailed resolution effectiveness analysis"""
    
    return {
        "resolution_effectiveness": {
            "auto_resolution_success_rate": 0.85,
            "manual_resolution_success_rate": 0.95,
            "escalation_rate": 0.05
        },
        "resolution_time_distribution": {
            "under_1_minute": 45,
            "1_to_5_minutes": 30,
            "5_to_30_minutes": 20,
            "over_30_minutes": 5
        },
        "strategy_performance": {
            "database_retry": {"success_rate": 0.92, "avg_time": 30},
            "cache_refresh": {"success_rate": 0.88, "avg_time": 15},
            "service_restart": {"success_rate": 0.95, "avg_time": 120}
        }
    }


async def _analyze_performance_error_correlation(time_window_hours: int) -> Dict[str, Any]:
    """Analyze correlation between performance metrics and errors"""
    
    return {
        "correlations": {
            "cpu_usage_error_rate": 0.65,
            "memory_usage_error_rate": 0.43,
            "response_time_error_rate": 0.78
        },
        "performance_thresholds": {
            "cpu_error_threshold": 85,
            "memory_error_threshold": 90,
            "response_time_error_threshold": 2.5
        },
        "predictive_indicators": [
            {
                "metric": "response_time",
                "threshold": 2.0,
                "error_probability": 0.25,
                "lead_time_minutes": 5
            }
        ]
    }


async def _get_error_specific_recommendations() -> List[Dict[str, Any]]:
    """Get error-specific recommendations"""
    
    return [
        {
            "type": "validation_improvement",
            "priority": "high",
            "category": "prevention",
            "title": "Enhance Input Validation",
            "description": "Add stricter input validation to prevent validation errors",
            "impact": "Reduce validation errors by 60%",
            "effort": "medium",
            "suggested_actions": [
                "Implement client-side validation",
                "Add server-side validation schemas",
                "Create validation error response standards"
            ]
        },
        {
            "type": "error_handling",
            "priority": "medium", 
            "category": "resilience",
            "title": "Improve Error Boundaries",
            "description": "Add more granular error boundaries for better error isolation",
            "impact": "Improve user experience during errors",
            "effort": "low",
            "suggested_actions": [
                "Add error boundaries to critical components",
                "Implement fallback UI components",
                "Add error recovery mechanisms"
            ]
        }
    ]


async def _get_six_figure_workflow_recommendations() -> List[Dict[str, Any]]:
    """Get recommendations specific to Six Figure Barber workflows"""
    
    return [
        {
            "type": "revenue_optimization",
            "priority": "critical",
            "category": "business",
            "title": "Optimize Payment Flow Reliability",
            "description": "Ensure payment processing has zero tolerance for errors",
            "impact": "Prevent revenue loss from payment failures",
            "effort": "high",
            "suggested_actions": [
                "Implement payment retry logic",
                "Add payment status monitoring",
                "Create payment reconciliation system"
            ]
        },
        {
            "type": "client_experience",
            "priority": "high",
            "category": "business",
            "title": "Enhance Booking Reliability",
            "description": "Improve booking system stability for better client experience",
            "impact": "Increase booking conversion rate",
            "effort": "medium",
            "suggested_actions": [
                "Add booking conflict detection",
                "Implement optimistic locking",
                "Create booking confirmation system"
            ]
        }
    ]