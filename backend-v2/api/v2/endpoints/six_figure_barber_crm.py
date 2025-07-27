"""
Six Figure Barber CRM API Endpoints

RESTful API endpoints for the comprehensive client relationship management system.
Provides access to all CRM features aligned with Six Figure Barber methodology:

- Client profile management and scoring
- Communication tracking and analytics
- Client journey progression
- Automated workflow management
- Retention campaigns and churn prediction
- CRM analytics and reporting

All endpoints require authentication and follow Six Figure Barber business rules.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import logging

from db import get_db
from routers.auth import get_current_user
from models import User
from services.six_figure_barber_crm_service import (
    SixFigureBarberCRMService,
    ClientScoreComponents,
    TierProgression,
    ChurnRiskAssessment
)
from models.six_figure_barber_crm import (
    CommunicationType,
    EngagementType,
    ClientStage,
    TouchpointType,
    WorkflowTrigger
)
from models.six_figure_barber_core import (
    ClientValueTier,
    SixFBPrinciple
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/crm", tags=["Six Figure Barber CRM"])


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ClientScoreResponse(BaseModel):
    """Client scoring response schema"""
    client_id: int
    relationship_score: float
    engagement_score: float
    value_score: float
    consistency_score: float
    growth_potential: float
    overall_score: float
    score_updated_at: datetime


class TierProgressionResponse(BaseModel):
    """Tier progression analysis response"""
    client_id: int
    current_tier: str
    recommended_tier: str
    progression_score: float
    requirements_met: List[str]
    requirements_missing: List[str]
    estimated_timeline_days: Optional[int]


class ChurnRiskResponse(BaseModel):
    """Churn risk assessment response"""
    client_id: int
    risk_score: float
    risk_level: str
    contributing_factors: List[str]
    recommended_interventions: List[str]
    intervention_priority: str


class CommunicationRequest(BaseModel):
    """Request schema for recording communication"""
    client_id: int
    communication_type: str
    subject: Optional[str] = None
    message_content: Optional[str] = None
    touchpoint_type: Optional[str] = None
    automation_triggered: bool = False


class EngagementRequest(BaseModel):
    """Request schema for recording engagement"""
    client_id: int
    engagement_type: str
    engagement_value: float = 1.0
    appointment_id: Optional[int] = None
    source_type: Optional[str] = None


class WorkflowRequest(BaseModel):
    """Request schema for creating automated workflow"""
    workflow_name: str
    workflow_description: Optional[str] = None
    workflow_type: str
    trigger_event: str
    workflow_steps: List[Dict[str, Any]]
    methodology_principle: str
    target_client_criteria: Optional[Dict[str, Any]] = None
    is_active: bool = True


class WorkflowExecutionRequest(BaseModel):
    """Request schema for executing workflow"""
    workflow_id: int
    client_id: Optional[int] = None
    trigger_data: Optional[Dict[str, Any]] = None


class RetentionCampaignRequest(BaseModel):
    """Request schema for creating retention campaign"""
    campaign_name: str
    campaign_description: Optional[str] = None
    campaign_type: str
    target_client_criteria: Dict[str, Any]
    retention_strategy: Dict[str, Any]
    start_date: date
    end_date: Optional[date] = None


class ClientJourneyUpdateRequest(BaseModel):
    """Request schema for updating client journey"""
    client_id: int
    force_recalculation: bool = False


class TouchpointPlanRequest(BaseModel):
    """Request schema for creating touchpoint plan"""
    client_id: int
    touchpoint_type: str
    touchpoint_name: str
    touchpoint_description: Optional[str] = None
    planned_date: datetime
    communication_channels: Optional[List[str]] = None
    relationship_building_objective: Optional[str] = None


# ============================================================================
# CLIENT SCORING AND ANALYSIS ENDPOINTS
# ============================================================================

@router.get("/clients/{client_id}/score", response_model=ClientScoreResponse)
async def get_client_score(
    client_id: int = Path(..., description="Client ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive client score components aligned with Six Figure Barber methodology.
    
    Returns detailed scoring across all relationship dimensions:
    - Relationship quality score
    - Engagement activity score  
    - Financial value score
    - Visit consistency score
    - Growth potential score
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        score_components = crm_service.calculate_client_score_components(
            user_id=current_user.id,
            client_id=client_id
        )
        
        return ClientScoreResponse(
            client_id=client_id,
            relationship_score=score_components.relationship_score,
            engagement_score=score_components.engagement_score,
            value_score=score_components.value_score,
            consistency_score=score_components.consistency_score,
            growth_potential=score_components.growth_potential,
            overall_score=score_components.overall_score,
            score_updated_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error calculating client score: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate client score")


@router.get("/clients/{client_id}/tier-progression", response_model=TierProgressionResponse)
async def analyze_tier_progression(
    client_id: int = Path(..., description="Client ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze client's tier progression potential and requirements.
    
    Provides recommendations for moving clients to higher value tiers
    based on Six Figure Barber methodology principles.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        tier_progression = crm_service.analyze_tier_progression(
            user_id=current_user.id,
            client_id=client_id
        )
        
        return TierProgressionResponse(
            client_id=client_id,
            current_tier=tier_progression.current_tier.value,
            recommended_tier=tier_progression.recommended_tier.value,
            progression_score=tier_progression.progression_score,
            requirements_met=tier_progression.requirements_met,
            requirements_missing=tier_progression.requirements_missing,
            estimated_timeline_days=tier_progression.estimated_timeline_days
        )
        
    except Exception as e:
        logger.error(f"Error analyzing tier progression: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze tier progression")


@router.get("/clients/{client_id}/churn-risk", response_model=ChurnRiskResponse)
async def assess_churn_risk(
    client_id: int = Path(..., description="Client ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assess client's churn risk and recommend intervention strategies.
    
    Uses predictive analytics to identify at-risk clients and provides
    actionable recommendations for retention.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        churn_assessment = crm_service.analyze_churn_risk(
            user_id=current_user.id,
            client_id=client_id
        )
        
        return ChurnRiskResponse(
            client_id=client_id,
            risk_score=churn_assessment.risk_score,
            risk_level=churn_assessment.risk_level,
            contributing_factors=churn_assessment.contributing_factors,
            recommended_interventions=churn_assessment.recommended_interventions,
            intervention_priority=churn_assessment.intervention_priority
        )
        
    except Exception as e:
        logger.error(f"Error assessing churn risk: {e}")
        raise HTTPException(status_code=500, detail="Failed to assess churn risk")


@router.get("/clients/scores/batch")
async def get_batch_client_scores(
    client_ids: List[int] = Query(..., description="List of client IDs"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get scores for multiple clients in a single request.
    Optimized for dashboard and reporting views.
    """
    
    if len(client_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 clients per batch request")
    
    crm_service = SixFigureBarberCRMService(db)
    scores = []
    
    for client_id in client_ids:
        try:
            score_components = crm_service.calculate_client_score_components(
                user_id=current_user.id,
                client_id=client_id
            )
            
            scores.append(ClientScoreResponse(
                client_id=client_id,
                relationship_score=score_components.relationship_score,
                engagement_score=score_components.engagement_score,
                value_score=score_components.value_score,
                consistency_score=score_components.consistency_score,
                growth_potential=score_components.growth_potential,
                overall_score=score_components.overall_score,
                score_updated_at=datetime.utcnow()
            ))
            
        except Exception as e:
            logger.warning(f"Failed to calculate score for client {client_id}: {e}")
            continue
    
    return {"scores": scores, "total_processed": len(scores)}


# ============================================================================
# COMMUNICATION AND ENGAGEMENT ENDPOINTS
# ============================================================================

@router.post("/communications")
async def record_communication(
    request: CommunicationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record a client communication for relationship tracking.
    
    Captures all client touchpoints to build comprehensive
    communication history and calculate engagement metrics.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        # Validate enum values
        communication_type = CommunicationType(request.communication_type)
        touchpoint_type = TouchpointType(request.touchpoint_type) if request.touchpoint_type else None
        
        communication = crm_service.record_communication(
            user_id=current_user.id,
            client_id=request.client_id,
            communication_type=communication_type,
            subject=request.subject,
            message_content=request.message_content,
            touchpoint_type=touchpoint_type,
            automation_triggered=request.automation_triggered
        )
        
        return {
            "communication_id": communication.id,
            "message": "Communication recorded successfully",
            "sent_at": communication.sent_at
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {e}")
    except Exception as e:
        logger.error(f"Error recording communication: {e}")
        raise HTTPException(status_code=500, detail="Failed to record communication")


@router.post("/engagements")
async def record_engagement(
    request: EngagementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record a client engagement activity.
    
    Tracks all client interactions that contribute to relationship
    scoring and engagement analytics.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        engagement_type = EngagementType(request.engagement_type)
        
        engagement = crm_service.record_engagement(
            user_id=current_user.id,
            client_id=request.client_id,
            engagement_type=engagement_type,
            engagement_value=request.engagement_value,
            appointment_id=request.appointment_id,
            source_type=request.source_type
        )
        
        return {
            "engagement_id": engagement.id,
            "message": "Engagement recorded successfully",
            "engagement_date": engagement.engagement_date
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {e}")
    except Exception as e:
        logger.error(f"Error recording engagement: {e}")
        raise HTTPException(status_code=500, detail="Failed to record engagement")


@router.get("/clients/{client_id}/communications")
async def get_client_communications(
    client_id: int = Path(..., description="Client ID"),
    limit: int = Query(50, le=200, description="Number of communications to return"),
    offset: int = Query(0, ge=0, description="Number of communications to skip"),
    communication_type: Optional[str] = Query(None, description="Filter by communication type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get communication history for a specific client.
    
    Returns paginated list of all communications with the client,
    including engagement metrics and response tracking.
    """
    
    from models.six_figure_barber_crm import SixFBClientCommunication
    from sqlalchemy import and_, desc
    
    query = db.query(SixFBClientCommunication).filter(
        and_(
            SixFBClientCommunication.user_id == current_user.id,
            SixFBClientCommunication.client_id == client_id
        )
    )
    
    if communication_type:
        try:
            comm_type = CommunicationType(communication_type)
            query = query.filter(SixFBClientCommunication.communication_type == comm_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid communication type")
    
    total = query.count()
    communications = query.order_by(desc(SixFBClientCommunication.sent_at)).offset(offset).limit(limit).all()
    
    return {
        "communications": [
            {
                "id": comm.id,
                "communication_type": comm.communication_type.value,
                "subject": comm.subject,
                "sent_at": comm.sent_at,
                "status": comm.communication_status.value,
                "responded_at": comm.responded_at,
                "engagement_score": comm.engagement_score,
                "touchpoint_type": comm.touchpoint_type.value if comm.touchpoint_type else None
            }
            for comm in communications
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/clients/{client_id}/engagements")
async def get_client_engagements(
    client_id: int = Path(..., description="Client ID"),
    limit: int = Query(50, le=200, description="Number of engagements to return"),
    offset: int = Query(0, ge=0, description="Number of engagements to skip"),
    engagement_type: Optional[str] = Query(None, description="Filter by engagement type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get engagement history for a specific client.
    
    Returns detailed engagement activity timeline with impact metrics.
    """
    
    from models.six_figure_barber_crm import SixFBClientEngagementHistory
    from sqlalchemy import and_, desc
    
    query = db.query(SixFBClientEngagementHistory).filter(
        and_(
            SixFBClientEngagementHistory.user_id == current_user.id,
            SixFBClientEngagementHistory.client_id == client_id
        )
    )
    
    if engagement_type:
        try:
            eng_type = EngagementType(engagement_type)
            query = query.filter(SixFBClientEngagementHistory.engagement_type == eng_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid engagement type")
    
    total = query.count()
    engagements = query.order_by(desc(SixFBClientEngagementHistory.engagement_date)).offset(offset).limit(limit).all()
    
    return {
        "engagements": [
            {
                "id": eng.id,
                "engagement_type": eng.engagement_type.value,
                "engagement_date": eng.engagement_date,
                "engagement_value": eng.engagement_value,
                "quality_score": eng.engagement_quality_score,
                "relationship_contribution": eng.relationship_building_contribution,
                "revenue_impact": float(eng.revenue_impact) if eng.revenue_impact else None
            }
            for eng in engagements
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ============================================================================
# CLIENT JOURNEY MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/clients/{client_id}/journey")
async def get_client_journey(
    client_id: int = Path(..., description="Client ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current client journey stage and progression metrics.
    
    Returns comprehensive journey information including stage history,
    progression opportunities, and recommended next steps.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        journey = crm_service.get_or_create_client_journey_stage(
            user_id=current_user.id,
            client_id=client_id
        )
        
        return {
            "client_id": client_id,
            "current_stage": journey.current_stage.value,
            "stage_entry_date": journey.stage_entry_date,
            "days_in_current_stage": journey.days_in_current_stage,
            "previous_stage": journey.previous_stage.value if journey.previous_stage else None,
            "progression_score": journey.progression_score,
            "relationship_quality_score": journey.relationship_quality_score,
            "premium_positioning_readiness": journey.premium_positioning_readiness,
            "value_tier_alignment": journey.value_tier_alignment.value if journey.value_tier_alignment else None,
            "last_calculated": journey.last_calculated
        }
        
    except Exception as e:
        logger.error(f"Error getting client journey: {e}")
        raise HTTPException(status_code=500, detail="Failed to get client journey")


@router.put("/clients/journey/update")
async def update_client_journey(
    request: ClientJourneyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update client journey stage based on current metrics.
    
    Recalculates client stage based on latest behavior and engagement data.
    Can force recalculation even if stage hasn't changed.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        journey = crm_service.update_client_journey_stage(
            user_id=current_user.id,
            client_id=request.client_id,
            force_recalculation=request.force_recalculation
        )
        
        return {
            "client_id": request.client_id,
            "updated_stage": journey.current_stage.value,
            "stage_entry_date": journey.stage_entry_date,
            "progression_score": journey.progression_score,
            "message": "Client journey updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating client journey: {e}")
        raise HTTPException(status_code=500, detail="Failed to update client journey")


# ============================================================================
# TOUCHPOINT AND WORKFLOW ENDPOINTS
# ============================================================================

@router.post("/touchpoints")
async def create_touchpoint_plan(
    request: TouchpointPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a planned touchpoint for strategic client engagement.
    
    Schedules specific touchpoints aligned with Six Figure Barber
    relationship building methodology.
    """
    
    from models.six_figure_barber_crm import SixFBClientTouchpointPlan
    
    try:
        touchpoint_type = TouchpointType(request.touchpoint_type)
        
        touchpoint = SixFBClientTouchpointPlan(
            user_id=current_user.id,
            client_id=request.client_id,
            touchpoint_type=touchpoint_type,
            touchpoint_name=request.touchpoint_name,
            touchpoint_description=request.touchpoint_description,
            planned_date=request.planned_date,
            communication_channels=request.communication_channels,
            relationship_building_objective=request.relationship_building_objective
        )
        
        db.add(touchpoint)
        db.commit()
        db.refresh(touchpoint)
        
        return {
            "touchpoint_id": touchpoint.id,
            "message": "Touchpoint plan created successfully",
            "planned_date": touchpoint.planned_date
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {e}")
    except Exception as e:
        logger.error(f"Error creating touchpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to create touchpoint plan")


@router.get("/touchpoints")
async def get_touchpoint_plans(
    status: Optional[str] = Query(None, description="Filter by status"),
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    touchpoint_type: Optional[str] = Query(None, description="Filter by touchpoint type"),
    limit: int = Query(50, le=200, description="Number of touchpoints to return"),
    offset: int = Query(0, ge=0, description="Number of touchpoints to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get planned touchpoints with optional filtering.
    
    Returns scheduled and executed touchpoints for relationship management.
    """
    
    from models.six_figure_barber_crm import SixFBClientTouchpointPlan
    from sqlalchemy import and_, desc
    
    query = db.query(SixFBClientTouchpointPlan).filter(
        SixFBClientTouchpointPlan.user_id == current_user.id
    )
    
    if status:
        query = query.filter(SixFBClientTouchpointPlan.status == status)
    
    if client_id:
        query = query.filter(SixFBClientTouchpointPlan.client_id == client_id)
    
    if touchpoint_type:
        try:
            tp_type = TouchpointType(touchpoint_type)
            query = query.filter(SixFBClientTouchpointPlan.touchpoint_type == tp_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid touchpoint type")
    
    total = query.count()
    touchpoints = query.order_by(desc(SixFBClientTouchpointPlan.planned_date)).offset(offset).limit(limit).all()
    
    return {
        "touchpoints": [
            {
                "id": tp.id,
                "client_id": tp.client_id,
                "touchpoint_type": tp.touchpoint_type.value,
                "touchpoint_name": tp.touchpoint_name,
                "planned_date": tp.planned_date,
                "executed_date": tp.executed_date,
                "status": tp.status,
                "effectiveness_score": tp.effectiveness_score,
                "relationship_building_objective": tp.relationship_building_objective
            }
            for tp in touchpoints
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.post("/workflows")
async def create_automated_workflow(
    request: WorkflowRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create an automated workflow for client relationship management.
    
    Defines sequences of actions triggered by client behavior or timeline events.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        trigger_event = WorkflowTrigger(request.trigger_event)
        methodology_principle = SixFBPrinciple(request.methodology_principle)
        
        workflow = crm_service.create_automated_workflow(
            user_id=current_user.id,
            workflow_name=request.workflow_name,
            workflow_type=request.workflow_type,
            trigger_event=trigger_event,
            workflow_steps=request.workflow_steps,
            methodology_principle=methodology_principle,
            workflow_description=request.workflow_description,
            target_client_criteria=request.target_client_criteria,
            is_active=request.is_active
        )
        
        return {
            "workflow_id": workflow.id,
            "message": "Automated workflow created successfully",
            "workflow_name": workflow.workflow_name,
            "is_active": workflow.is_active
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {e}")
    except Exception as e:
        logger.error(f"Error creating workflow: {e}")
        raise HTTPException(status_code=500, detail="Failed to create automated workflow")


@router.post("/workflows/execute")
async def execute_workflow(
    request: WorkflowExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute an automated workflow manually or for specific clients.
    
    Triggers immediate execution of workflow steps for testing or manual activation.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        if request.client_id:
            # Execute for specific client
            execution = crm_service.execute_workflow(
                workflow_id=request.workflow_id,
                client_id=request.client_id,
                trigger_data=request.trigger_data
            )
            
            return {
                "execution_id": execution.execution_id,
                "workflow_id": execution.workflow_id,
                "client_id": execution.client_id,
                "status": execution.status,
                "started_at": execution.started_at,
                "message": "Workflow execution started"
            }
        else:
            # Execute for all matching clients
            from models.six_figure_barber_crm import SixFBAutomatedWorkflow
            
            workflow = db.query(SixFBAutomatedWorkflow).filter(
                SixFBAutomatedWorkflow.id == request.workflow_id
            ).first()
            
            if not workflow:
                raise HTTPException(status_code=404, detail="Workflow not found")
            
            executions = crm_service.trigger_workflows_for_event(
                user_id=current_user.id,
                trigger_event=workflow.trigger_event,
                event_data=request.trigger_data
            )
            
            return {
                "executions_started": len(executions),
                "execution_ids": [exec.execution_id for exec in executions],
                "message": f"Started {len(executions)} workflow executions"
            }
            
    except Exception as e:
        logger.error(f"Error executing workflow: {e}")
        raise HTTPException(status_code=500, detail="Failed to execute workflow")


@router.get("/workflows")
async def get_automated_workflows(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    workflow_type: Optional[str] = Query(None, description="Filter by workflow type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all automated workflows for the current user.
    
    Returns workflow definitions with performance statistics.
    """
    
    from models.six_figure_barber_crm import SixFBAutomatedWorkflow
    from sqlalchemy import and_
    
    query = db.query(SixFBAutomatedWorkflow).filter(
        SixFBAutomatedWorkflow.user_id == current_user.id
    )
    
    if is_active is not None:
        query = query.filter(SixFBAutomatedWorkflow.is_active == is_active)
    
    if workflow_type:
        query = query.filter(SixFBAutomatedWorkflow.workflow_type == workflow_type)
    
    workflows = query.all()
    
    return {
        "workflows": [
            {
                "id": wf.id,
                "workflow_name": wf.workflow_name,
                "workflow_type": wf.workflow_type,
                "trigger_event": wf.trigger_event.value,
                "is_active": wf.is_active,
                "total_executions": wf.total_executions,
                "successful_executions": wf.successful_executions,
                "average_success_rate": wf.average_success_rate,
                "total_revenue_generated": float(wf.total_revenue_generated) if wf.total_revenue_generated else 0,
                "created_at": wf.created_at
            }
            for wf in workflows
        ],
        "total": len(workflows)
    }


# ============================================================================
# ANALYTICS AND REPORTING ENDPOINTS
# ============================================================================

@router.get("/analytics/summary")
async def get_crm_analytics_summary(
    period: str = Query("daily", description="Summary period: daily, weekly, monthly, quarterly"),
    summary_date: Optional[date] = Query(None, description="Specific date for summary"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive CRM analytics summary.
    
    Returns key metrics and insights for CRM performance across all dimensions.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        summary = crm_service.generate_crm_analytics_summary(
            user_id=current_user.id,
            summary_date=summary_date,
            period=period
        )
        
        return {
            "summary_date": summary.summary_date,
            "period": summary.summary_period,
            "client_metrics": {
                "total_clients": summary.total_clients,
                "new_clients_acquired": summary.new_clients_acquired,
                "clients_retained": summary.clients_retained,
                "clients_lost": summary.clients_lost,
                "client_growth_rate": summary.client_growth_rate
            },
            "tier_distribution": {
                "premium_vip": summary.premium_vip_clients,
                "core_regular": summary.core_regular_clients,
                "developing": summary.developing_clients,
                "occasional": summary.occasional_clients,
                "at_risk": summary.at_risk_clients
            },
            "relationship_metrics": {
                "average_relationship_score": summary.average_relationship_score,
                "average_engagement_score": summary.average_engagement_score,
                "communication_response_rate": summary.average_communication_response_rate,
                "relationship_improvement_rate": summary.relationship_improvement_rate
            },
            "financial_metrics": {
                "total_client_lifetime_value": float(summary.total_client_lifetime_value),
                "average_client_lifetime_value": float(summary.average_client_lifetime_value),
                "revenue_per_client": float(summary.revenue_per_client)
            },
            "retention_metrics": {
                "retention_rate": summary.retention_rate,
                "churn_rate": summary.churn_rate,
                "average_churn_risk_score": summary.average_churn_risk_score,
                "clients_at_high_churn_risk": summary.clients_at_high_churn_risk
            },
            "automation_metrics": {
                "automated_workflows_executed": summary.automated_workflows_executed,
                "automation_success_rate": summary.automation_success_rate,
                "time_saved_hours": summary.time_saved_through_automation_hours
            },
            "six_figure_barber_alignment": {
                "premium_positioning_score": summary.premium_positioning_score,
                "relationship_building_effectiveness": summary.relationship_building_effectiveness,
                "value_creation_success_rate": summary.value_creation_success_rate,
                "methodology_alignment_score": summary.methodology_alignment_score
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating analytics summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate analytics summary")


@router.get("/analytics/client-distribution")
async def get_client_distribution_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get client distribution analytics across various dimensions.
    
    Provides insights into client segmentation and portfolio composition.
    """
    
    from models.six_figure_barber_core import SixFBClientValueProfile
    from models.six_figure_barber_crm import SixFBClientJourneyStage
    from sqlalchemy import func, and_
    
    # Tier distribution
    tier_distribution = db.query(
        SixFBClientValueProfile.value_tier,
        func.count(SixFBClientValueProfile.id)
    ).filter(
        SixFBClientValueProfile.user_id == current_user.id
    ).group_by(SixFBClientValueProfile.value_tier).all()
    
    # Stage distribution
    stage_distribution = db.query(
        SixFBClientJourneyStage.current_stage,
        func.count(SixFBClientJourneyStage.id)
    ).filter(
        SixFBClientJourneyStage.user_id == current_user.id
    ).group_by(SixFBClientJourneyStage.current_stage).all()
    
    return {
        "tier_distribution": {
            tier.value: count for tier, count in tier_distribution
        },
        "stage_distribution": {
            stage.value: count for stage, count in stage_distribution
        },
        "total_clients_analyzed": sum(count for _, count in tier_distribution)
    }


@router.get("/analytics/communication-effectiveness")
async def get_communication_effectiveness_analytics(
    days_back: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze communication effectiveness across different channels and touchpoint types.
    
    Provides insights for optimizing client communication strategies.
    """
    
    from models.six_figure_barber_crm import SixFBClientCommunication
    from sqlalchemy import func, and_
    
    start_date = datetime.utcnow() - timedelta(days=days_back)
    
    # Communication effectiveness by type
    comm_effectiveness = db.query(
        SixFBClientCommunication.communication_type,
        func.count(SixFBClientCommunication.id).label('total_sent'),
        func.count(SixFBClientCommunication.responded_at).label('total_responded'),
        func.avg(SixFBClientCommunication.engagement_score).label('avg_engagement')
    ).filter(
        and_(
            SixFBClientCommunication.user_id == current_user.id,
            SixFBClientCommunication.sent_at >= start_date
        )
    ).group_by(SixFBClientCommunication.communication_type).all()
    
    # Touchpoint effectiveness
    touchpoint_effectiveness = db.query(
        SixFBClientCommunication.touchpoint_type,
        func.count(SixFBClientCommunication.id).label('total_sent'),
        func.count(SixFBClientCommunication.responded_at).label('total_responded'),
        func.avg(SixFBClientCommunication.engagement_score).label('avg_engagement')
    ).filter(
        and_(
            SixFBClientCommunication.user_id == current_user.id,
            SixFBClientCommunication.sent_at >= start_date,
            SixFBClientCommunication.touchpoint_type.isnot(None)
        )
    ).group_by(SixFBClientCommunication.touchpoint_type).all()
    
    return {
        "analysis_period_days": days_back,
        "communication_effectiveness": [
            {
                "communication_type": comm_type.value,
                "total_sent": total_sent,
                "total_responded": total_responded,
                "response_rate": (total_responded / total_sent * 100) if total_sent > 0 else 0,
                "average_engagement_score": float(avg_engagement) if avg_engagement else 0
            }
            for comm_type, total_sent, total_responded, avg_engagement in comm_effectiveness
        ],
        "touchpoint_effectiveness": [
            {
                "touchpoint_type": tp_type.value,
                "total_sent": total_sent,
                "total_responded": total_responded,
                "response_rate": (total_responded / total_sent * 100) if total_sent > 0 else 0,
                "average_engagement_score": float(avg_engagement) if avg_engagement else 0
            }
            for tp_type, total_sent, total_responded, avg_engagement in touchpoint_effectiveness
        ]
    }


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@router.get("/enums")
async def get_crm_enums():
    """
    Get all available enum values for CRM operations.
    
    Provides frontend applications with valid enum values for dropdowns and validation.
    """
    
    return {
        "communication_types": [e.value for e in CommunicationType],
        "engagement_types": [e.value for e in EngagementType],
        "client_stages": [e.value for e in ClientStage],
        "touchpoint_types": [e.value for e in TouchpointType],
        "workflow_triggers": [e.value for e in WorkflowTrigger],
        "client_value_tiers": [e.value for e in ClientValueTier],
        "six_fb_principles": [e.value for e in SixFBPrinciple]
    }


@router.post("/trigger-event")
async def trigger_crm_event(
    trigger_event: str = Body(..., embed=True),
    client_id: Optional[int] = Body(None, embed=True),
    event_data: Optional[Dict[str, Any]] = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger CRM event for testing or manual activation.
    
    Useful for testing automated workflows and triggering specific client actions.
    """
    
    crm_service = SixFigureBarberCRMService(db)
    
    try:
        workflow_trigger = WorkflowTrigger(trigger_event)
        
        executions = crm_service.trigger_workflows_for_event(
            user_id=current_user.id,
            trigger_event=workflow_trigger,
            client_id=client_id,
            event_data=event_data
        )
        
        return {
            "trigger_event": trigger_event,
            "executions_triggered": len(executions),
            "execution_ids": [exec.execution_id for exec in executions],
            "message": f"Triggered {len(executions)} workflow executions"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid trigger event: {e}")
    except Exception as e:
        logger.error(f"Error triggering CRM event: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger CRM event")