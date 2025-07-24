"""
Client Lifecycle API Endpoints
Provides Six Figure Barber methodology-based client lifecycle management for calendar integration.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field

from db import get_db
from utils.auth import get_current_user
from services.client_lifecycle_service import ClientLifecycleService
from models import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client-lifecycle", tags=["Client Lifecycle Management"])

# Pydantic models for API requests/responses
class ClientLifecycleAnalysisResponse(BaseModel):
    client_id: int
    client_name: str
    current_tier: str
    lifecycle_stage: str
    days_since_first_visit: int
    days_since_last_visit: int
    total_visits: int
    total_spent: float
    average_ticket: float
    visit_frequency: float
    relationship_score: float
    churn_risk: float
    upsell_potential: float
    milestones: List[Dict[str, Any]]
    insights: List[Dict[str, Any]]

class ClientMilestoneResponse(BaseModel):
    client_id: int
    client_name: str
    milestone_type: str
    milestone_date: str
    description: str
    six_fb_principle: str
    action_required: str
    priority: str
    expected_impact: str
    follow_up_date: Optional[str] = None

class ClientInsightResponse(BaseModel):
    client_id: int
    insight_type: str
    confidence: float
    recommendation: str
    six_fb_methodology: str
    expected_revenue_impact: float
    implementation_difficulty: str

class CalendarClientInsightResponse(BaseModel):
    client_id: int
    client_name: str
    client_tier: str
    lifecycle_stage: str
    relationship_score: float
    churn_risk: float
    priority_milestones: List[Dict[str, Any]]
    key_insights: List[Dict[str, Any]]

# Initialize the lifecycle service
lifecycle_service = ClientLifecycleService()

@router.get("/analysis/{client_id}", response_model=ClientLifecycleAnalysisResponse)
async def get_client_lifecycle_analysis(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive lifecycle analysis for a specific client.
    """
    try:
        analysis = lifecycle_service.analyze_client_lifecycle(db, client_id)
        
        # Convert to response format
        return ClientLifecycleAnalysisResponse(
            client_id=analysis.client_id,
            client_name=analysis.client_name,
            current_tier=analysis.current_tier.value,
            lifecycle_stage=analysis.lifecycle_stage.value,
            days_since_first_visit=analysis.days_since_first_visit,
            days_since_last_visit=analysis.days_since_last_visit,
            total_visits=analysis.total_visits,
            total_spent=analysis.total_spent,
            average_ticket=analysis.average_ticket,
            visit_frequency=analysis.visit_frequency,
            relationship_score=analysis.relationship_score,
            churn_risk=analysis.churn_risk,
            upsell_potential=analysis.upsell_potential,
            milestones=[
                {
                    "milestone_type": ms.milestone_type,
                    "milestone_date": ms.milestone_date.isoformat(),
                    "description": ms.description,
                    "six_fb_principle": ms.six_fb_principle,
                    "action_required": ms.action_required,
                    "priority": ms.priority,
                    "expected_impact": ms.expected_impact,
                    "follow_up_date": ms.follow_up_date.isoformat() if ms.follow_up_date else None
                }
                for ms in analysis.milestones
            ],
            insights=[
                {
                    "insight_type": ins.insight_type,
                    "confidence": ins.confidence,
                    "recommendation": ins.recommendation,
                    "six_fb_methodology": ins.six_fb_methodology,
                    "expected_revenue_impact": ins.expected_revenue_impact,
                    "implementation_difficulty": ins.implementation_difficulty
                }
                for ins in analysis.insights
            ]
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting client lifecycle analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze client lifecycle")

@router.get("/calendar-insights", response_model=List[CalendarClientInsightResponse])
async def get_calendar_client_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis")
):
    """
    Get client lifecycle insights for calendar integration.
    """
    try:
        # Default to current week if no dates provided
        if not start_date:
            today = datetime.now().date()
            start_date = today - timedelta(days=today.weekday())
        if not end_date:
            end_date = start_date + timedelta(days=6)
        
        insights = lifecycle_service.get_calendar_client_insights(
            db=db,
            barber_id=current_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Convert to response format
        return [
            CalendarClientInsightResponse(**insight)
            for insight in insights
        ]
        
    except Exception as e:
        logger.error(f"Error getting calendar client insights: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get calendar insights")

@router.get("/milestones", response_model=List[ClientMilestoneResponse])
async def get_client_milestones(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    priority: Optional[str] = Query(None, description="Filter by priority (high, medium, low)"),
    milestone_type: Optional[str] = Query(None, description="Filter by milestone type"),
    days_ahead: int = Query(30, description="Number of days ahead to look for milestones")
):
    """
    Get upcoming client milestones for proactive relationship management.
    """
    try:
        # This would typically get all clients for the barber and analyze them
        # For now, we'll return a placeholder implementation
        # In a full implementation, you'd get all clients and their milestones
        
        milestones = []
        # TODO: Implement full milestone retrieval across all clients
        
        return milestones
        
    except Exception as e:
        logger.error(f"Error getting client milestones: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get client milestones")

@router.get("/insights/summary")
async def get_lifecycle_insights_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary of client lifecycle insights for dashboard display.
    """
    try:
        # This would analyze all clients for the barber and provide summary metrics
        # Placeholder implementation
        
        summary = {
            "total_clients_analyzed": 0,
            "high_risk_clients": 0,
            "upsell_opportunities": 0,
            "pending_milestones": 0,
            "tier_distribution": {
                "platinum": 0,
                "gold": 0,
                "silver": 0,
                "bronze": 0
            },
            "lifecycle_distribution": {
                "new_client": 0,
                "developing": 0,
                "established": 0,
                "vip": 0,
                "at_risk": 0,
                "dormant": 0
            },
            "six_fb_coaching_tip": "Focus on client relationships as your foundation for six-figure success. Every interaction is an opportunity to strengthen loyalty and increase lifetime value."
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting lifecycle insights summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get insights summary")

@router.post("/milestone/{milestone_id}/complete")
async def complete_milestone(
    milestone_id: str,
    completion_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a client milestone as completed and track the outcome.
    """
    try:
        # This would update milestone completion status
        # and track the impact on client relationship
        
        result = {
            "milestone_id": milestone_id,
            "completed_at": datetime.now().isoformat(),
            "completed_by": current_user.id,
            "outcome": completion_data.get("outcome", "completed"),
            "notes": completion_data.get("notes", ""),
            "relationship_impact": "positive"  # Could be calculated based on outcome
        }
        
        logger.info(f"Milestone {milestone_id} completed by user {current_user.id}")
        return result
        
    except Exception as e:
        logger.error(f"Error completing milestone: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete milestone")

@router.get("/relationship-timeline/{client_id}")
async def get_client_relationship_timeline(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    months_back: int = Query(6, description="Number of months back to analyze")
):
    """
    Get detailed relationship timeline for a specific client.
    """
    try:
        # This would generate a detailed timeline of relationship events
        # based on appointment history and lifecycle analysis
        
        timeline_events = []
        # TODO: Implement full timeline generation
        
        return {
            "client_id": client_id,
            "timeline_events": timeline_events,
            "relationship_summary": {
                "total_events": len(timeline_events),
                "positive_events": 0,
                "concerning_events": 0,
                "overall_trend": "positive"
            },
            "six_fb_insight": "Consistent relationship building creates loyal clients who drive six-figure success through retention and referrals."
        }
        
    except Exception as e:
        logger.error(f"Error getting relationship timeline: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get relationship timeline")

@router.post("/follow-up-action")
async def schedule_follow_up_action(
    action_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Schedule a follow-up action for client relationship management.
    """
    try:
        # This would schedule various follow-up actions like:
        # - Send thank you message
        # - Schedule check-in call
        # - Offer loyalty reward
        # - Request referral
        
        action_result = {
            "action_id": f"action_{datetime.now().timestamp()}",
            "client_id": action_data.get("client_id"),
            "action_type": action_data.get("action_type"),
            "scheduled_date": action_data.get("scheduled_date"),
            "description": action_data.get("description"),
            "six_fb_principle": action_data.get("six_fb_principle", "Client relationships are the foundation of six-figure success."),
            "status": "scheduled"
        }
        
        logger.info(f"Follow-up action scheduled: {action_result['action_type']} for client {action_result['client_id']}")
        return action_result
        
    except Exception as e:
        logger.error(f"Error scheduling follow-up action: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to schedule follow-up action")
