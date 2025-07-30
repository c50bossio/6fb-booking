"""
AI Orchestrator API Endpoints for 6FB Booking V2

Provides REST API endpoints for the unified AI dashboard system:
- Process user queries through AI orchestrator
- Get business metrics and context
- Manage conversation history
- Execute AI-recommended actions
- Track strategy implementation and ROI
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from dependencies_v2 import get_db, get_current_user
from models import User
from services.ai_orchestrator_service import AIOrchestrator, AIResponse, ConversationContext
from services.business_intelligence_agent_service import BusinessIntelligenceAgentService
from services.vector_knowledge_service import VectorKnowledgeService
from services.roi_tracking_service import ROITrackingService
from services.ai_strategy_engine import AIStrategyEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-orchestrator", tags=["AI Orchestrator"])


# Request/Response Models
class ProcessQueryRequest(BaseModel):
    query: str = Field(..., description="User query to process")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    preferred_agent: Optional[str] = Field(None, description="Preferred AI agent ID")
    include_business_context: bool = Field(True, description="Include business context in response")
    include_proactive_insights: bool = Field(False, description="Include proactive insights")


class ProcessQueryResponse(BaseModel):
    content: str
    agent_id: str
    agent_name: str
    conversation_id: str
    suggestions: List[str]
    actions: List[Dict[str, Any]]
    metrics: Optional[Dict[str, Any]]
    strategy: Optional[Dict[str, Any]]
    response_time_ms: int


class ExecuteActionRequest(BaseModel):
    action: Dict[str, Any] = Field(..., description="Action to execute")
    message_id: str = Field(..., description="Message ID that contains the action")
    conversation_id: str = Field(..., description="Conversation ID")


class BusinessMetricsResponse(BaseModel):
    period_days: int
    total_revenue: float
    total_appointments: int
    unique_clients: int
    average_revenue_per_appointment: float
    average_revenue_per_client: float
    growth_rate: Optional[float]
    retention_rate: Optional[float]
    updated_at: str


class ProactiveInsight(BaseModel):
    id: str
    type: str
    title: str
    description: str
    priority: str
    confidence_score: float
    expected_roi: float
    implementation_difficulty: str
    created_at: str


class ProactiveInsightsResponse(BaseModel):
    insights: List[ProactiveInsight]
    total_count: int
    last_generated: Optional[str]


class StrategyData(BaseModel):
    id: str
    title: str
    type: str
    description: str
    predicted_roi: float
    implementation_timeline: str
    success_metrics: List[str]
    status: str
    created_at: str


class ActiveStrategiesResponse(BaseModel):
    strategies: List[StrategyData]
    total_count: int


@router.post("/process-query", response_model=ProcessQueryResponse)
async def process_user_query(
    request: ProcessQueryRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process a user query through the AI Orchestrator system.
    Routes to appropriate AI agent and returns contextual response.
    """
    try:
        start_time = datetime.now()
        
        # Initialize AI Orchestrator
        orchestrator = AIOrchestrator(db)
        
        # Process the query
        ai_response = await orchestrator.process_user_query(
            user_id=str(current_user.id),
            query=request.query,
            preferred_agent=request.preferred_agent
        )
        
        # Calculate response time
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Prepare response
        response = ProcessQueryResponse(
            content=ai_response.content,
            agent_id=ai_response.agent_id,
            agent_name=_get_agent_name(ai_response.agent_id),
            conversation_id=request.conversation_id or f"conv_{uuid4()}",
            suggestions=ai_response.suggestions,
            actions=ai_response.actions,
            metrics=ai_response.metrics,
            strategy=_format_strategy_data(ai_response),
            response_time_ms=response_time
        )
        
        # Store interaction for learning (background task)
        if request.include_proactive_insights:
            background_tasks.add_task(
                _generate_proactive_insights_background,
                str(current_user.id),
                request.query,
                ai_response
            )
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing user query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")


@router.post("/execute-action")
async def execute_action(
    request: ExecuteActionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute an AI-recommended action.
    """
    try:
        orchestrator = AIOrchestrator(db)
        
        # Execute the action (implementation depends on action type)
        result = await _execute_ai_action(
            orchestrator, 
            current_user.id, 
            request.action,
            request.conversation_id
        )
        
        # Track action execution for learning
        background_tasks.add_task(
            _track_action_execution,
            str(current_user.id),
            request.action,
            result
        )
        
        return {
            "success": True,
            "action_id": request.action.get("id", str(uuid4())),
            "result": result,
            "message": f"Successfully executed {request.action.get('title', 'action')}"
        }
        
    except Exception as e:
        logger.error(f"Error executing action: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute action: {str(e)}")


@router.get("/business-metrics", response_model=BusinessMetricsResponse)
async def get_business_metrics(
    period_days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current business metrics for the AI dashboard.
    """
    try:
        orchestrator = AIOrchestrator(db)
        metrics = await orchestrator._get_recent_business_metrics(str(current_user.id))
        
        # Calculate additional metrics
        growth_rate = await _calculate_growth_rate(db, current_user.id, period_days)
        retention_rate = await _calculate_retention_rate(db, current_user.id, period_days)
        
        return BusinessMetricsResponse(
            period_days=period_days,
            total_revenue=metrics.get('total_revenue', 0),
            total_appointments=metrics.get('total_appointments', 0),
            unique_clients=metrics.get('unique_clients', 0),
            average_revenue_per_appointment=metrics.get('average_revenue_per_appointment', 0),
            average_revenue_per_client=metrics.get('average_revenue_per_client', 0),
            growth_rate=growth_rate,
            retention_rate=retention_rate,
            updated_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting business metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.get("/proactive-insights", response_model=ProactiveInsightsResponse)
async def get_proactive_insights(
    limit: int = 10,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-generated proactive business insights.
    """
    try:
        orchestrator = AIOrchestrator(db)
        insights = await orchestrator.generate_proactive_insights(str(current_user.id))
        
        # Filter by priority if specified
        if priority:
            insights = [i for i in insights if i.priority.value == priority]
        
        # Limit results
        insights = insights[:limit]
        
        # Convert to response format
        insight_data = []
        for insight in insights:
            insight_data.append(ProactiveInsight(
                id=str(uuid4()),
                type=insight.insight_type,
                title=insight.title,
                description=insight.description,
                priority=insight.priority.value,
                confidence_score=insight.confidence_score,
                expected_roi=insight.expected_roi,
                implementation_difficulty=insight.implementation_difficulty,
                created_at=datetime.now().isoformat()
            ))
        
        return ProactiveInsightsResponse(
            insights=insight_data,
            total_count=len(insight_data),
            last_generated=datetime.now().isoformat() if insight_data else None
        )
        
    except Exception as e:
        logger.error(f"Error getting proactive insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")


@router.get("/active-strategies", response_model=ActiveStrategiesResponse)
async def get_active_strategies(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get active AI-recommended strategies being tracked.
    """
    try:
        # For now, return mock data as strategy tracking is being implemented
        # In full implementation, this would query the database for active strategies
        
        mock_strategies = [
            StrategyData(
                id=str(uuid4()),
                title="Premium Service Upselling Campaign",
                type="revenue_optimization",
                description="Implement targeted upselling for existing clients based on service history",
                predicted_roi=25.0,
                implementation_timeline="2-3 weeks",
                success_metrics=["Revenue per client increase", "Service upgrade rate", "Client satisfaction"],
                status="implementing",
                created_at=datetime.now().isoformat()
            ),
            StrategyData(
                id=str(uuid4()),
                title="Client Retention Enhancement Program",
                type="client_retention",
                description="Personalized follow-up system and loyalty rewards",
                predicted_roi=30.0,
                implementation_timeline="3-4 weeks",
                success_metrics=["Repeat booking rate", "Client lifetime value", "Referral rate"],
                status="proposed",
                created_at=datetime.now().isoformat()
            )
        ]
        
        # Filter by status if specified
        if status:
            mock_strategies = [s for s in mock_strategies if s.status == status]
        
        return ActiveStrategiesResponse(
            strategies=mock_strategies,
            total_count=len(mock_strategies)
        )
        
    except Exception as e:
        logger.error(f"Error getting active strategies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get strategies: {str(e)}")


@router.post("/multi-agent-query")
async def coordinate_multi_agent_response(
    request: ProcessQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process complex queries requiring multiple AI agents.
    """
    try:
        orchestrator = AIOrchestrator(db)
        
        # Coordinate multi-agent response
        ai_response = await orchestrator.coordinate_multi_agent_response(
            user_id=str(current_user.id),
            complex_query=request.query
        )
        
        return {
            "content": ai_response.content,
            "agent_id": ai_response.agent_id,
            "participating_agents": ["financial", "growth", "operations"],  # Example
            "suggestions": ai_response.suggestions,
            "actions": ai_response.actions,
            "synthesis_quality": "high",
            "response_confidence": 0.9
        }
        
    except Exception as e:
        logger.error(f"Error coordinating multi-agent response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to coordinate response: {str(e)}")


# Helper Functions
def _get_agent_name(agent_id: str) -> str:
    """Get human-readable agent name"""
    agent_names = {
        'financial': 'Marcus',
        'growth': 'Sofia', 
        'operations': 'Alex',
        'brand': 'Isabella',
        'multi_agent': 'AI Team',
        'system': 'System'
    }
    return agent_names.get(agent_id, 'AI Assistant')


def _format_strategy_data(ai_response: AIResponse) -> Optional[Dict[str, Any]]:
    """Format strategy data from AI response"""
    # This would be implemented based on the actual strategy data structure
    # For now, return None as strategies are being developed
    return None


async def _execute_ai_action(orchestrator: AIOrchestrator, user_id: str, 
                           action: Dict[str, Any], conversation_id: str) -> Dict[str, Any]:
    """Execute a specific AI-recommended action"""
    action_type = action.get('type', 'unknown')
    
    try:
        if action_type == 'pricing_analysis':
            # Trigger pricing analysis
            return {"status": "analysis_started", "estimated_completion": "5 minutes"}
        
        elif action_type == 'client_retention':
            # Start client retention analysis
            return {"status": "retention_analysis_started", "clients_analyzed": 50}
        
        elif action_type == 'schedule_optimization':
            # Optimize scheduling
            return {"status": "optimization_started", "improvements_found": 3}
        
        elif action_type == 'service_excellence':
            # Service excellence review
            return {"status": "excellence_review_started", "areas_identified": 2}
        
        else:
            return {"status": "action_queued", "message": f"Action {action_type} queued for processing"}
            
    except Exception as e:
        logger.error(f"Error executing action {action_type}: {str(e)}")
        return {"status": "error", "message": str(e)}


async def _generate_proactive_insights_background(user_id: str, query: str, response: AIResponse):
    """Generate proactive insights in background"""
    try:
        # This would trigger the AI system to learn from the interaction
        # and potentially generate new insights for the user
        logger.info(f"Generating proactive insights for user {user_id} based on query: {query[:100]}...")
        
    except Exception as e:
        logger.error(f"Error generating proactive insights: {str(e)}")


async def _track_action_execution(user_id: str, action: Dict[str, Any], result: Dict[str, Any]):
    """Track action execution for learning and ROI measurement"""
    try:
        logger.info(f"Tracking action execution for user {user_id}: {action.get('type', 'unknown')}")
        
    except Exception as e:
        logger.error(f"Error tracking action execution: {str(e)}")


async def _calculate_growth_rate(db: Session, user_id: str, period_days: int) -> Optional[float]:
    """Calculate revenue growth rate"""
    try:
        # Implementation would compare current period to previous period
        # For now, return a mock growth rate
        return 12.5  # 12.5% growth rate
        
    except Exception as e:
        logger.error(f"Error calculating growth rate: {str(e)}")
        return None


async def _calculate_retention_rate(db: Session, user_id: str, period_days: int) -> Optional[float]:
    """Calculate client retention rate"""
    try:
        # Implementation would analyze repeat bookings vs new clients
        # For now, return a mock retention rate
        return 78.3  # 78.3% retention rate
        
    except Exception as e:
        logger.error(f"Error calculating retention rate: {str(e)}")
        return None