"""
Business Intelligence Agents API Router for 6FB Booking V2

This router provides API endpoints for AI-powered business coaching agents
that work with calendar data and business metrics to provide intelligent insights.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from db import get_db
from models import User
from models.business_intelligence_agents import (
    BusinessIntelligenceAgent, BusinessCoachingSession, BusinessInsight,
    SixFigureBarberPrincipleTracking, CoachingActionItem,
    BusinessIntelligenceAgentType, CoachingSessionType, InsightPriority,
    CoachingStatus
)
from services.business_intelligence_agent_service import BusinessIntelligenceAgentService
from dependencies import get_current_user

# Create router
router = APIRouter(prefix="/api/v2/business-intelligence-agents", tags=["Business Intelligence Agents"])

# Pydantic models for request/response
class CoachingSessionRequest(BaseModel):
    agent_id: int
    session_type: str
    business_context: Dict[str, Any] = {}

class BusinessInsightRequest(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    data_source: str
    analysis_period_days: int = 30
    recommended_actions: List[str] = []

class CoachingDashboardResponse(BaseModel):
    active_sessions: List[Dict[str, Any]]
    recent_insights: List[Dict[str, Any]]
    compliance_tracking: Optional[Dict[str, Any]]
    pending_actions: List[Dict[str, Any]]
    statistics: Dict[str, Any]
    available_agents: List[Dict[str, Any]]

@router.get("/agents", response_model=List[Dict[str, Any]])
async def get_available_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all available business intelligence agents.
    
    Returns a list of AI agents specialized in different aspects of 
    barbershop business optimization and coaching.
    """
    try:
        agents = db.query(BusinessIntelligenceAgent).filter(
            BusinessIntelligenceAgent.is_active == True
        ).all()
        
        return [
            {
                "id": agent.id,
                "name": agent.display_name,
                "type": agent.agent_type.value,
                "description": agent.description,
                "coaching_style": agent.coaching_style,
                "personality_traits": agent.personality_traits,
                "expertise_areas": agent.expertise_areas,
                "six_fb_focus_areas": agent.six_fb_focus_areas,
                "is_premium": agent.is_premium_feature,
                "tier_requirement": agent.tier_requirement
            }
            for agent in agents
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving agents: {str(e)}")

@router.post("/initialize-default-agents")
async def initialize_default_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initialize the default set of business intelligence agents.
    
    This endpoint sets up the core AI coaching agents for financial coaching,
    growth strategy, operations optimization, and brand development.
    """
    try:
        # Check if user has admin permissions (implement based on your auth system)
        # For now, allow any authenticated user to initialize agents
        
        bi_service = BusinessIntelligenceAgentService(db)
        created_agents = bi_service.initialize_default_agents()
        
        return {
            "success": True,
            "created_agents_count": len(created_agents),
            "agents": [
                {
                    "id": agent.id,
                    "name": agent.display_name,
                    "type": agent.agent_type.value
                }
                for agent in created_agents
            ],
            "message": f"Successfully initialized {len(created_agents)} business intelligence agents"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initializing agents: {str(e)}")

@router.get("/coaching-dashboard", response_model=CoachingDashboardResponse)
async def get_coaching_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive coaching dashboard data.
    
    Returns active coaching sessions, recent insights, compliance tracking,
    pending action items, and statistics for the user's coaching journey.
    """
    try:
        bi_service = BusinessIntelligenceAgentService(db)
        dashboard_data = bi_service.get_coaching_dashboard_data(current_user.id)
        
        if not dashboard_data:
            raise HTTPException(status_code=404, detail="No coaching data available")
        
        return CoachingDashboardResponse(**dashboard_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving coaching dashboard: {str(e)}")

@router.post("/start-coaching-session")
async def start_coaching_session(
    request: CoachingSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new coaching session with a specific agent.
    
    Initiates a personalized coaching conversation focused on the specified
    business area and coached by the selected AI agent.
    """
    try:
        # Validate session type
        try:
            session_type = CoachingSessionType(request.session_type)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid session type: {request.session_type}"
            )
        
        bi_service = BusinessIntelligenceAgentService(db)
        session = bi_service.start_coaching_session_with_agent(
            user_id=current_user.id,
            agent_id=request.agent_id,
            session_type=session_type,
            business_context=request.business_context
        )
        
        if not session:
            raise HTTPException(status_code=400, detail="Failed to start coaching session")
        
        return {
            "success": True,
            "session_id": session.id,
            "agent_name": session.agent.display_name,
            "session_type": session.session_type.value,
            "title": session.title,
            "status": session.status.value,
            "started_at": session.started_at.isoformat(),
            "message": f"Coaching session started with {session.agent.display_name}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting coaching session: {str(e)}")

@router.post("/analyze-and-trigger-coaching")
async def analyze_business_metrics_and_trigger_coaching(
    days_back: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze business metrics and automatically trigger appropriate coaching sessions.
    
    Reviews recent business performance and identifies coaching opportunities
    such as pricing optimization, client retention, or operational efficiency.
    """
    try:
        bi_service = BusinessIntelligenceAgentService(db)
        triggered_sessions = bi_service.analyze_business_metrics_and_trigger_coaching(
            user=current_user,
            days_back=days_back
        )
        
        return {
            "success": True,
            "analysis_period_days": days_back,
            "triggered_sessions_count": len(triggered_sessions),
            "triggered_sessions": [
                {
                    "session_id": session.id,
                    "agent_name": session.agent.display_name,
                    "agent_type": session.agent.agent_type.value,
                    "session_type": session.session_type.value,
                    "title": session.title,
                    "trigger_reason": session.business_context.get('trigger_reason'),
                    "started_at": session.started_at.isoformat()
                }
                for session in triggered_sessions
            ],
            "message": f"Analyzed business metrics and triggered {len(triggered_sessions)} coaching sessions"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing metrics: {str(e)}")

@router.post("/create-insight")
async def create_business_insight(
    request: BusinessInsightRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new business insight.
    
    Manually creates a business insight that can be used for coaching
    and business optimization recommendations.
    """
    try:
        # Validate priority
        try:
            priority = InsightPriority(request.priority)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid priority: {request.priority}"
            )
        
        bi_service = BusinessIntelligenceAgentService(db)
        insight = bi_service.create_business_insight(
            user_id=current_user.id,
            title=request.title,
            description=request.description,
            category=request.category,
            priority=priority,
            data_source=request.data_source,
            analysis_period_days=request.analysis_period_days,
            recommended_actions=request.recommended_actions
        )
        
        if not insight:
            raise HTTPException(status_code=400, detail="Failed to create business insight")
        
        return {
            "success": True,
            "insight_id": insight.id,
            "title": insight.title,
            "category": insight.insight_category,
            "priority": insight.priority.value,
            "created_at": insight.created_at.isoformat(),
            "message": "Business insight created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating insight: {str(e)}")

@router.get("/insights")
async def get_business_insights(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get business insights for the current user.
    
    Retrieves business insights with optional filtering by category and priority.
    """
    try:
        query = db.query(BusinessInsight).filter(
            BusinessInsight.user_id == current_user.id
        )
        
        if category:
            query = query.filter(BusinessInsight.insight_category == category)
        
        if priority:
            try:
                priority_enum = InsightPriority(priority)
                query = query.filter(BusinessInsight.priority == priority_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid priority: {priority}")
        
        insights = query.order_by(BusinessInsight.created_at.desc()).limit(limit).all()
        
        return [
            {
                "id": insight.id,
                "title": insight.title,
                "description": insight.description,
                "category": insight.insight_category,
                "priority": insight.priority.value,
                "data_source": insight.data_source,
                "analysis_period": {
                    "start": insight.analysis_period_start.isoformat(),
                    "end": insight.analysis_period_end.isoformat()
                },
                "recommended_actions": insight.recommended_actions,
                "six_fb_compliance_impact": insight.six_fb_compliance_impact,
                "expected_revenue_impact": insight.expected_revenue_impact,
                "is_actionable": insight.is_actionable,
                "has_been_acted_on": insight.has_been_acted_on,
                "confidence_score": insight.confidence_score,
                "created_at": insight.created_at.isoformat()
            }
            for insight in insights
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving insights: {str(e)}")

@router.get("/six-figure-barber-compliance")
async def get_six_figure_barber_compliance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Six Figure Barber methodology compliance tracking.
    
    Returns detailed compliance scores for different aspects of the 
    Six Figure Barber methodology including pricing, service excellence, 
    client experience, and business efficiency.
    """
    try:
        bi_service = BusinessIntelligenceAgentService(db)
        compliance = bi_service.update_six_figure_barber_compliance(current_user.id)
        
        if not compliance:
            # Try to get the latest existing compliance record
            compliance = db.query(SixFigureBarberPrincipleTracking).filter(
                SixFigureBarberPrincipleTracking.user_id == current_user.id
            ).order_by(SixFigureBarberPrincipleTracking.created_at.desc()).first()
        
        if not compliance:
            raise HTTPException(status_code=404, detail="No compliance data available")
        
        return {
            "overall_compliance_score": compliance.overall_compliance_score,
            "compliance_grade": compliance.compliance_grade,
            "principle_scores": {
                "pricing_excellence": compliance.pricing_excellence_score,
                "service_excellence": compliance.service_excellence_score,
                "client_experience": compliance.client_experience_score,
                "business_efficiency": compliance.business_efficiency_score,
                "professional_growth": compliance.professional_growth_score
            },
            "metrics": {
                "average_service_price": compliance.average_service_price,
                "client_retention_rate": compliance.client_retention_rate,
                "premium_service_ratio": compliance.premium_service_ratio,
                "booking_efficiency_score": compliance.booking_efficiency_score
            },
            "improvement_tracking": {
                "improvement_from_previous": compliance.improvement_from_previous_period,
                "areas_for_improvement": compliance.areas_for_improvement,
                "strengths_identified": compliance.strengths_identified
            },
            "coaching_recommendations": compliance.coaching_recommendations,
            "tracking_period": {
                "start": compliance.tracking_period_start.isoformat(),
                "end": compliance.tracking_period_end.isoformat()
            },
            "last_updated": compliance.updated_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving compliance data: {str(e)}")

@router.post("/update-compliance")
async def update_six_figure_barber_compliance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update Six Figure Barber methodology compliance scores.
    
    Recalculates compliance scores based on recent business performance
    and updates the tracking record with new insights.
    """
    try:
        bi_service = BusinessIntelligenceAgentService(db)
        compliance = bi_service.update_six_figure_barber_compliance(current_user.id)
        
        if not compliance:
            raise HTTPException(status_code=400, detail="Failed to update compliance tracking")
        
        return {
            "success": True,
            "overall_score": compliance.overall_compliance_score,
            "grade": compliance.compliance_grade,
            "improvement": compliance.improvement_from_previous_period,
            "updated_at": compliance.updated_at.isoformat(),
            "message": f"Compliance updated: {compliance.overall_compliance_score:.1f}% ({compliance.compliance_grade})"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating compliance: {str(e)}")

@router.get("/coaching-sessions")
async def get_coaching_sessions(
    status: Optional[str] = None,
    agent_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get coaching sessions for the current user.
    
    Retrieves coaching sessions with optional filtering by status and agent type.
    """
    try:
        query = db.query(BusinessCoachingSession).filter(
            BusinessCoachingSession.user_id == current_user.id
        )
        
        if status:
            try:
                status_enum = CoachingStatus(status)
                query = query.filter(BusinessCoachingSession.status == status_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        if agent_type:
            try:
                agent_type_enum = BusinessIntelligenceAgentType(agent_type)
                query = query.join(BusinessIntelligenceAgent).filter(
                    BusinessIntelligenceAgent.agent_type == agent_type_enum
                )
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type}")
        
        sessions = query.order_by(BusinessCoachingSession.started_at.desc()).limit(limit).all()
        
        return [
            {
                "id": session.id,
                "agent": {
                    "id": session.agent.id,
                    "name": session.agent.display_name,
                    "type": session.agent.agent_type.value
                },
                "session_type": session.session_type.value,
                "title": session.title,
                "description": session.description,
                "status": session.status.value,
                "completion_percentage": session.completion_percentage,
                "business_context": session.business_context,
                "coaching_goals": session.coaching_goals,
                "recommended_actions": session.recommended_actions,
                "user_satisfaction_score": session.user_satisfaction_score,
                "follow_up_required": session.follow_up_required,
                "next_session_date": session.next_session_date.isoformat() if session.next_session_date else None,
                "started_at": session.started_at.isoformat(),
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
                "last_interaction_at": session.last_interaction_at.isoformat() if session.last_interaction_at else None
            }
            for session in sessions
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving coaching sessions: {str(e)}")

@router.get("/action-items")
async def get_coaching_action_items(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get coaching action items for the current user.
    
    Retrieves action items generated from coaching sessions with optional
    filtering by status and priority.
    """
    try:
        query = db.query(CoachingActionItem).filter(
            CoachingActionItem.user_id == current_user.id
        )
        
        if status:
            query = query.filter(CoachingActionItem.status == status)
        
        if priority:
            try:
                priority_enum = InsightPriority(priority)
                query = query.filter(CoachingActionItem.priority == priority_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid priority: {priority}")
        
        action_items = query.order_by(CoachingActionItem.created_at.desc()).limit(limit).all()
        
        return [
            {
                "id": item.id,
                "coaching_session_id": item.coaching_session_id,
                "title": item.title,
                "description": item.description,
                "category": item.category,
                "priority": item.priority.value,
                "status": item.status,
                "progress_percentage": item.progress_percentage,
                "estimated_effort_hours": item.estimated_effort_hours,
                "estimated_cost": item.estimated_cost,
                "expected_roi": item.expected_roi,
                "implementation_deadline": item.implementation_deadline.isoformat() if item.implementation_deadline else None,
                "success_metrics": item.success_metrics,
                "baseline_metrics": item.baseline_metrics,
                "current_metrics": item.current_metrics,
                "target_metrics": item.target_metrics,
                "started_at": item.started_at.isoformat() if item.started_at else None,
                "completed_at": item.completed_at.isoformat() if item.completed_at else None,
                "created_at": item.created_at.isoformat()
            }
            for item in action_items
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving action items: {str(e)}")

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint for the Business Intelligence Agents service."""
    return {
        "status": "healthy",
        "service": "Business Intelligence Agents",
        "version": "1.0.0",
        "features": [
            "AI Business Coaching",
            "Six Figure Barber Compliance Tracking",
            "Business Intelligence Insights",
            "Automated Coaching Triggers",
            "Performance Analytics"
        ],
        "available_agents": [
            "Financial Coach",
            "Growth Strategist", 
            "Operations Optimizer",
            "Brand Developer"
        ]
    }