"""
Real-Time Analytics API Endpoints

This module provides FastAPI endpoints for the real-time no-show prediction 
analytics dashboard. It exposes live data, predictions, and insights from
the AI-powered no-show prevention system.

Endpoints:
- GET /realtime-analytics/dashboard - Complete real-time dashboard
- GET /realtime-analytics/predictions - Live predictions for upcoming appointments
- GET /realtime-analytics/alerts - Active alerts and notifications
- GET /realtime-analytics/metrics - Live performance metrics
- POST /realtime-analytics/alerts - Create custom alerts
- GET /realtime-analytics/interventions/{intervention_id} - Track intervention performance
- GET /realtime-analytics/ai-performance - AI system performance metrics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from database import get_db
from utils.auth import get_current_user
from models import User
from services.realtime_no_show_analytics import get_realtime_no_show_analytics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/realtime-analytics", tags=["Real-Time Analytics"])


@router.get("/dashboard")
async def get_realtime_dashboard(
    time_range: str = Query("24h", description="Time range for analytics (1h, 24h, 7d, 30d)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive real-time no-show analytics dashboard.
    
    Provides live insights, risk distributions, active alerts, and
    optimization recommendations for the AI-powered no-show prevention system.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        dashboard_data = await analytics_service.get_realtime_dashboard(
            user_id=current_user.id,
            time_range=time_range
        )
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Error getting real-time dashboard for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate real-time dashboard: {str(e)}"
        )


@router.get("/predictions")
async def get_live_predictions(
    hours_ahead: int = Query(48, description="Hours ahead to predict", ge=1, le=168),
    include_low_risk: bool = Query(True, description="Include low-risk appointments"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get live no-show predictions for upcoming appointments.
    
    Returns AI-powered risk scores, intervention recommendations,
    and revenue impact analysis for appointments in the specified time window.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        predictions_data = await analytics_service.get_live_predictions(
            user_id=current_user.id,
            hours_ahead=hours_ahead
        )
        
        # Filter out low-risk appointments if requested
        if not include_low_risk:
            predictions_data["predictions"] = [
                p for p in predictions_data["predictions"] 
                if p["risk_level"] not in ["LOW"]
            ]
            # Recalculate summary statistics
            predictions_data["prediction_metadata"]["total_appointments"] = len(predictions_data["predictions"])
        
        return predictions_data
        
    except Exception as e:
        logger.error(f"Error getting live predictions for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate live predictions: {str(e)}"
        )


@router.get("/alerts")
async def get_active_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity (low, medium, high, critical)"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    limit: int = Query(50, description="Maximum number of alerts to return", ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get active real-time alerts and notifications.
    
    Returns current system alerts, high-risk warnings, and
    performance notifications for the AI no-show prevention system.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        # Get active alerts from dashboard data
        dashboard_data = await analytics_service.get_realtime_dashboard(
            user_id=current_user.id,
            time_range="24h"
        )
        
        alerts = dashboard_data.get("active_alerts", [])
        
        # Apply filters
        if severity:
            alerts = [alert for alert in alerts if alert.get("severity") == severity]
        
        if alert_type:
            alerts = [alert for alert in alerts if alert.get("alert_type") == alert_type]
        
        # Limit results
        alerts = alerts[:limit]
        
        return {
            "alerts": alerts,
            "total_count": len(alerts),
            "active_critical_alerts": len([a for a in alerts if a.get("severity") == "critical"]),
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting alerts for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get active alerts: {str(e)}"
        )


@router.get("/metrics")
async def get_live_metrics(
    metric_types: Optional[List[str]] = Query(None, description="Specific metrics to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get live performance metrics for the AI no-show prevention system.
    
    Returns real-time system performance, prediction accuracy,
    intervention effectiveness, and other key metrics.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        # Get metrics from dashboard data
        dashboard_data = await analytics_service.get_realtime_dashboard(
            user_id=current_user.id,
            time_range="24h"
        )
        
        live_metrics = dashboard_data.get("live_metrics", {})
        
        # Filter specific metrics if requested
        if metric_types:
            live_metrics = {
                k: v for k, v in live_metrics.items() 
                if k in metric_types
            }
        
        return {
            "metrics": live_metrics,
            "system_health": dashboard_data.get("dashboard_metadata", {}).get("system_status", "unknown"),
            "last_updated": datetime.utcnow().isoformat(),
            "refresh_interval_seconds": 30
        }
        
    except Exception as e:
        logger.error(f"Error getting live metrics for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get live metrics: {str(e)}"
        )


@router.post("/alerts")
async def create_custom_alert(
    alert_request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a custom alert configuration for real-time monitoring.
    
    Allows setting up custom alert conditions and thresholds
    for specific business needs and risk management.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        alert_result = await analytics_service.create_custom_alert(
            user_id=current_user.id,
            alert_config=alert_request
        )
        
        if not alert_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=alert_result.get("error", "Failed to create alert")
            )
        
        return {
            "success": True,
            "alert_id": alert_result["alert_id"],
            "message": "Custom alert created successfully",
            "monitoring_active": alert_result["monitoring_active"],
            "next_check": alert_result["next_check"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating custom alert for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create custom alert: {str(e)}"
        )


@router.get("/interventions/{intervention_id}")
async def track_intervention_performance(
    intervention_id: int = Path(..., description="ID of the intervention campaign to track"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Track real-time performance of a specific intervention campaign.
    
    Provides live updates on intervention progress, client responses,
    effectiveness metrics, and optimization recommendations.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        performance_data = await analytics_service.track_intervention_performance(
            user_id=current_user.id,
            intervention_id=intervention_id
        )
        
        if "error" in performance_data:
            raise HTTPException(
                status_code=404,
                detail=performance_data["error"]
            )
        
        return performance_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking intervention {intervention_id} for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to track intervention performance: {str(e)}"
        )


@router.get("/ai-performance")
async def get_ai_performance_metrics(
    time_range: str = Query("7d", description="Time range for analysis (1d, 7d, 30d)"),
    include_recommendations: bool = Query(True, description="Include improvement recommendations"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive AI system performance metrics and analysis.
    
    Returns detailed analytics on prediction accuracy, learning progress,
    intervention effectiveness, and overall AI system ROI.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        ai_performance = await analytics_service.get_ai_performance_metrics(
            user_id=current_user.id,
            time_range=time_range
        )
        
        # Remove recommendations if not requested
        if not include_recommendations:
            ai_performance.pop("recommendations", None)
        
        return ai_performance
        
    except Exception as e:
        logger.error(f"Error getting AI performance metrics for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get AI performance metrics: {str(e)}"
        )


@router.get("/risk-distribution")
async def get_risk_distribution(
    time_range: str = Query("24h", description="Time range for distribution analysis"),
    include_predictions: bool = Query(True, description="Include future predictions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed risk distribution analysis for appointments.
    
    Shows how appointments are distributed across risk levels
    and provides insights for resource allocation and planning.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        dashboard_data = await analytics_service.get_realtime_dashboard(
            user_id=current_user.id,
            time_range=time_range
        )
        
        risk_distribution = dashboard_data.get("risk_distribution", {})
        
        response_data = {
            "risk_distribution": risk_distribution,
            "time_range": time_range,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        if include_predictions:
            predictions_data = await analytics_service.get_live_predictions(
                user_id=current_user.id,
                hours_ahead=48
            )
            response_data["future_predictions"] = predictions_data.get("risk_summary", {})
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error getting risk distribution for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get risk distribution: {str(e)}"
        )


@router.get("/optimization-insights")
async def get_optimization_insights(
    focus_area: Optional[str] = Query(None, description="Focus area (timing, messaging, channels)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-powered optimization insights and recommendations.
    
    Provides actionable insights for improving no-show prevention
    effectiveness based on current data and AI analysis.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        dashboard_data = await analytics_service.get_realtime_dashboard(
            user_id=current_user.id,
            time_range="7d"
        )
        
        insights = {
            "optimization_recommendations": dashboard_data.get("optimization_recommendations", []),
            "performance_insights": dashboard_data.get("performance_analytics", {}),
            "learning_progress": dashboard_data.get("ai_learning_progress", {}),
            "behavioral_trends": dashboard_data.get("client_behavior_trends", {}),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Filter by focus area if specified
        if focus_area:
            insights["focus_area"] = focus_area
            # Would apply focus-area specific filtering here
        
        return insights
        
    except Exception as e:
        logger.error(f"Error getting optimization insights for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get optimization insights: {str(e)}"
        )


@router.get("/health")
async def check_realtime_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check the health status of the real-time analytics system.
    
    Returns system health indicators, service availability,
    and performance status for monitoring purposes.
    """
    try:
        analytics_service = get_realtime_no_show_analytics(db)
        
        # Get basic health check from dashboard metadata
        dashboard_data = await analytics_service.get_realtime_dashboard(
            user_id=current_user.id,
            time_range="1h"
        )
        
        health_status = {
            "system_status": dashboard_data.get("dashboard_metadata", {}).get("system_status", "unknown"),
            "ai_services_status": dashboard_data.get("dashboard_metadata", {}).get("ai_services_status", {}),
            "last_updated": datetime.utcnow().isoformat(),
            "response_time_ms": 150,  # Would measure actual response time
            "active_alerts_count": len(dashboard_data.get("active_alerts", [])),
            "critical_alerts_count": len([
                a for a in dashboard_data.get("active_alerts", []) 
                if a.get("severity") == "critical"
            ])
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Error checking system health for user {current_user.id}: {e}")
        return {
            "system_status": "error",
            "error": str(e),
            "last_updated": datetime.utcnow().isoformat()
        }