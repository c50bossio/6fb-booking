"""
Client Retention API V2 - AI-Powered Retention System
=====================================================

V2 API endpoints for the AI-powered client retention system that predicts
churn and enables proactive intervention campaigns for Six Figure success.

All endpoints use /api/v2/retention/ prefix as per user requirement:
"There should be nothing V1, only V2."
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from database import get_db
from models import User
from utils.auth import get_current_user
from services.churn_prediction_service import ChurnPredictionService, ChurnPrediction, ChurnAnalysis
from services.client_retention_service import ClientRetentionService, RetentionMetrics, RetentionCampaign
from schemas.retention import (
    ChurnPredictionResponse,
    ChurnAnalysisResponse,
    RetentionMetricsResponse,
    RetentionCampaignResponse,
    RetentionDashboardResponse,
    ChurnRiskAssessmentRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/retention", tags=["retention-v2"])

@router.get("/analysis", response_model=ChurnAnalysisResponse)
async def get_churn_analysis(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analysis_period_days: int = Query(90, ge=30, le=365, description="Days of data to analyze")
):
    """
    Get comprehensive churn analysis for the barber's client base
    
    Analyzes client behavior patterns and identifies churn risks using
    advanced ML algorithms aligned with Six Figure methodology.
    """
    try:
        churn_service = ChurnPredictionService(db)
        analysis = churn_service.analyze_client_base_churn_risk(
            user_id=user.id,
            analysis_period_days=analysis_period_days
        )
        
        return ChurnAnalysisResponse.from_analysis(analysis)
        
    except Exception as e:
        logger.error(f"Error getting churn analysis for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze churn risk: {str(e)}")

@router.get("/predictions", response_model=List[ChurnPredictionResponse])
async def get_churn_predictions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    risk_threshold: float = Query(50.0, ge=0.0, le=100.0, description="Minimum risk score to include"),
    limit: int = Query(20, ge=1, le=100, description="Maximum predictions to return")
):
    """
    Get churn predictions for at-risk clients
    
    Returns detailed churn risk assessments for clients above the
    specified risk threshold, ordered by risk score.
    """
    try:
        churn_service = ChurnPredictionService(db)
        predictions = churn_service.get_high_risk_clients(
            user_id=user.id,
            risk_threshold=risk_threshold
        )
        
        # Limit results
        limited_predictions = predictions[:limit]
        
        return [ChurnPredictionResponse.from_prediction(p) for p in limited_predictions]
        
    except Exception as e:
        logger.error(f"Error getting churn predictions for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get churn predictions: {str(e)}")

@router.get("/predictions/{client_id}", response_model=ChurnPredictionResponse)
async def get_client_churn_prediction(
    client_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analysis_period_days: int = Query(90, ge=30, le=365, description="Days of data to analyze")
):
    """
    Get detailed churn prediction for a specific client
    
    Provides comprehensive churn risk assessment including behavioral
    patterns, financial indicators, and intervention recommendations.
    """
    try:
        churn_service = ChurnPredictionService(db)
        prediction = churn_service.predict_client_churn(
            user_id=user.id,
            client_id=client_id,
            analysis_period_days=analysis_period_days
        )
        
        return ChurnPredictionResponse.from_prediction(prediction)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting client churn prediction for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to predict churn: {str(e)}")

@router.get("/metrics", response_model=RetentionMetricsResponse)
async def get_retention_metrics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    analysis_period_days: int = Query(90, ge=30, le=365, description="Days of data to analyze")
):
    """
    Get retention performance metrics and ROI analysis
    
    Provides comprehensive retention analytics including campaign
    performance, revenue saved, and Six Figure impact metrics.
    """
    try:
        retention_service = ClientRetentionService(db)
        metrics = retention_service.analyze_retention_opportunities(
            user_id=user.id,
            analysis_period_days=analysis_period_days
        )
        
        return RetentionMetricsResponse.from_metrics(metrics)
        
    except Exception as e:
        logger.error(f"Error getting retention metrics for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get retention metrics: {str(e)}")

@router.get("/campaigns", response_model=List[RetentionCampaignResponse])
async def get_retention_campaigns(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recommended retention campaigns for at-risk clients
    
    Returns personalized retention campaigns with messaging, offers,
    and optimal timing for maximum intervention effectiveness.
    """
    try:
        retention_service = ClientRetentionService(db)
        campaigns = retention_service.generate_retention_campaigns(user_id=user.id)
        
        return [RetentionCampaignResponse.from_campaign(c) for c in campaigns]
        
    except Exception as e:
        logger.error(f"Error generating retention campaigns for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate campaigns: {str(e)}")

@router.post("/campaigns/{campaign_id}/track")
async def track_campaign_performance(
    campaign_id: str,
    outcome_data: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track retention campaign performance and outcomes
    
    Records campaign results including opens, clicks, responses,
    and bookings for ROI analysis and optimization.
    """
    try:
        retention_service = ClientRetentionService(db)
        updated_campaign = retention_service.track_campaign_performance(
            campaign_id=campaign_id,
            outcome=outcome_data
        )
        
        return {
            "success": True,
            "message": "Campaign performance tracked successfully",
            "campaign_id": campaign_id,
            "outcome": outcome_data
        }
        
    except Exception as e:
        logger.error(f"Error tracking campaign performance for {campaign_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track campaign: {str(e)}")

@router.get("/dashboard", response_model=RetentionDashboardResponse)
async def get_retention_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive retention dashboard data
    
    Provides complete retention analytics including risk breakdown,
    performance metrics, top opportunities, and Six Figure impact.
    """
    try:
        retention_service = ClientRetentionService(db)
        dashboard_data = retention_service.get_retention_dashboard_data(user_id=user.id)
        
        return RetentionDashboardResponse.from_dashboard_data(dashboard_data)
        
    except Exception as e:
        logger.error(f"Error getting retention dashboard for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {str(e)}")

@router.post("/assessment", response_model=ChurnPredictionResponse)
async def assess_churn_risk(
    request: ChurnRiskAssessmentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform on-demand churn risk assessment for a client
    
    Immediately analyzes a specific client's churn risk with
    custom analysis parameters and returns actionable insights.
    """
    try:
        churn_service = ChurnPredictionService(db)
        prediction = churn_service.predict_client_churn(
            user_id=user.id,
            client_id=request.client_id,
            analysis_period_days=request.analysis_period_days
        )
        
        return ChurnPredictionResponse.from_prediction(prediction)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error assessing churn risk: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assess churn risk: {str(e)}")

@router.get("/insights")
async def get_retention_insights(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get actionable retention insights and recommendations
    
    Provides strategic retention guidance based on client behavior
    patterns and Six Figure methodology best practices.
    """
    try:
        churn_service = ChurnPredictionService(db)
        retention_service = ClientRetentionService(db)
        
        # Get churn analysis
        churn_analysis = churn_service.analyze_client_base_churn_risk(user.id)
        
        # Get retention metrics
        retention_metrics = retention_service.analyze_retention_opportunities(user.id)
        
        # Generate insights
        insights = {
            "priority_actions": [
                "Focus on critical risk clients first - highest ROI",
                "Implement proactive communication schedule",
                "Create loyalty rewards for top clients",
                "Analyze service satisfaction patterns"
            ],
            "retention_strategies": [
                "Personal check-ins for high-value clients",
                "Flexible scheduling and rescheduling",
                "Exclusive services and VIP treatment",
                "Referral incentives and loyalty programs"
            ],
            "performance_benchmarks": {
                "excellent_retention_rate": "> 90%",
                "good_churn_rate": "< 5% monthly",
                "target_campaign_roi": "> 300%",
                "ideal_intervention_time": "30-45 days before predicted churn"
            },
            "six_figure_impact": {
                "retention_multiplier": "5x more cost-effective than acquisition",
                "clv_protection": f"${churn_analysis.total_revenue_at_risk:,.0f} in client value at risk",
                "goal_acceleration": "Retention can accelerate Six Figure achievement by 3-6 months"
            },
            "next_steps": [
                "Review critical risk clients weekly",
                "Launch automated retention campaigns",
                "Track intervention success rates",
                "Optimize based on performance data"
            ]
        }
        
        return insights
        
    except Exception as e:
        logger.error(f"Error getting retention insights for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")

@router.get("/health")
async def retention_health_check():
    """
    Health check endpoint for the retention system
    
    Returns status information about the AI-powered retention services.
    """
    return {
        "status": "healthy",
        "service": "AI-Powered Client Retention V2",
        "version": "2.0.0",
        "features": [
            "ML Churn Prediction Engine",
            "Behavioral Pattern Analysis", 
            "Automated Intervention Campaigns",
            "ROI Tracking and Optimization",
            "Six Figure Methodology Integration"
        ],
        "endpoints": {
            "analysis": "Comprehensive churn analysis",
            "predictions": "Individual client risk assessments",
            "metrics": "Retention performance analytics",
            "campaigns": "Automated intervention campaigns",
            "dashboard": "Complete retention dashboard",
            "insights": "Strategic retention guidance"
        }
    }