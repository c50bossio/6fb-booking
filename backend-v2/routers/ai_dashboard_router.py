"""
AI Dashboard Router for 6FB Booking V2
API endpoints for the unified AI-powered business intelligence system.

This router provides:
- Chat interface endpoints for multi-agent conversations
- Business metrics and analytics endpoints
- AI strategy management endpoints
- ROI tracking and reporting endpoints
- Knowledge base management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import logging
from datetime import datetime

from database import get_db
from auth.dependencies import get_current_user
from models import User
from services.ai_orchestrator_service import AIOrchestrator, ConversationContext
from services.ai_memory_service import AIMemoryService
from services.vector_knowledge_service import VectorKnowledgeService
from services.ai_strategy_engine import AIStrategyEngine
from services.roi_tracking_service import ROITrackingService, ROITimeframe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/ai", tags=["AI Dashboard"])


# Request/Response Models
class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="User query")
    preferred_agent: Optional[str] = Field(None, description="Preferred AI agent ID")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")


class ChatResponse(BaseModel):
    content: str
    agent_id: str
    agent_name: str
    suggestions: List[str] = []
    actions: List[Dict[str, Any]] = []
    metrics: Dict[str, Any] = {}
    conversation_id: str
    timestamp: datetime


class BusinessMetricsResponse(BaseModel):
    period_days: int
    total_revenue: float
    total_appointments: int
    unique_clients: int
    average_revenue_per_appointment: float
    average_revenue_per_client: float
    client_retention_rate: float
    appointment_completion_rate: float
    utilization_rate: float


class StrategyRequest(BaseModel):
    strategy_type: Optional[str] = None
    priority_areas: List[str] = []
    max_strategies: int = Field(default=3, ge=1, le=10)


class ROITrackingRequest(BaseModel):
    strategy_id: str
    investment_cost: Optional[float] = 0
    timeframe: Optional[str] = "weekly"


class KnowledgeRefreshRequest(BaseModel):
    force_refresh: bool = False


# AI Chat Endpoints

@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process user query through AI orchestrator and return agent response
    """
    try:
        # Initialize AI orchestrator
        orchestrator = AIOrchestrator(db)
        
        # Process the query
        response = await orchestrator.process_user_query(
            user_id=str(current_user.id),
            query=request.query,
            preferred_agent=request.preferred_agent
        )
        
        return ChatResponse(
            content=response.content,
            agent_id=response.agent_id,
            agent_name=response.agent_name,
            suggestions=response.suggestions,
            actions=response.actions,
            metrics=response.metrics,
            conversation_id=response.conversation_id,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error in AI chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process AI chat request"
        )


@router.get("/conversation/{conversation_id}")
async def get_conversation_context(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get conversation context and history
    """
    try:
        orchestrator = AIOrchestrator(db)
        context = await orchestrator.get_conversation_context(
            user_id=str(current_user.id),
            conversation_id=conversation_id
        )
        
        if not context:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return {
            "conversation_id": context.conversation_id,
            "active_agents": context.active_agents,
            "business_context": context.business_context,
            "strategy_tracking": context.strategy_tracking,
            "recent_messages": context.recent_messages[-10:],  # Last 10 messages
            "session_start": context.session_start,
            "last_activity": context.last_activity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation context: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation context"
        )


# Business Metrics Endpoints

@router.get("/dashboard/metrics", response_model=BusinessMetricsResponse)
async def get_business_metrics(
    period_days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current business metrics for dashboard display
    """
    try:
        roi_service = ROITrackingService(db)
        metrics = roi_service.metrics_collector.collect_current_metrics(
            str(current_user.id), period_days
        )
        
        return BusinessMetricsResponse(
            period_days=period_days,
            total_revenue=metrics.revenue,
            total_appointments=metrics.appointments,
            unique_clients=metrics.clients,
            average_revenue_per_appointment=metrics.avg_transaction_value,
            average_revenue_per_client=metrics.revenue / max(metrics.clients, 1),
            client_retention_rate=metrics.client_retention_rate,
            appointment_completion_rate=metrics.appointment_completion_rate,
            utilization_rate=metrics.utilization_rate
        )
        
    except Exception as e:
        logger.error(f"Error getting business metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve business metrics"
        )


@router.get("/insights/business")
async def get_business_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-generated business insights based on current situation
    """
    try:
        vector_service = VectorKnowledgeService(db)
        
        # Get current business situation
        roi_service = ROITrackingService(db)
        current_metrics = roi_service.metrics_collector.collect_current_metrics(str(current_user.id))
        
        # Determine current situation flags
        situation = {
            'low_revenue': current_metrics.revenue < 1000,  # Configurable threshold
            'low_client_retention': current_metrics.client_retention_rate < 60,
            'scheduling_issues': current_metrics.utilization_rate < 50,
            'service_quality_concerns': current_metrics.appointment_completion_rate < 80
        }
        
        # Generate contextual insights
        insights = await vector_service.generate_contextual_insights(
            str(current_user.id), situation
        )
        
        return {
            "current_situation": situation,
            "insights": insights,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting business insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate business insights"
        )


# AI Strategy Endpoints

@router.post("/strategies/generate")
async def generate_strategies(
    request: StrategyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI-recommended business strategies
    """
    try:
        strategy_engine = AIStrategyEngine(db)
        
        strategies = await strategy_engine.analyze_business_and_generate_strategies(
            user_id=str(current_user.id),
            max_strategies=request.max_strategies
        )
        
        return {
            "strategies": [strategy.to_dict() for strategy in strategies],
            "generated_at": datetime.now().isoformat(),
            "total_strategies": len(strategies)
        }
        
    except Exception as e:
        logger.error(f"Error generating strategies: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate business strategies"
        )


@router.get("/strategies/{strategy_id}/similar")
async def find_similar_strategies(
    strategy_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find similar strategies from knowledge base
    """
    try:
        vector_service = VectorKnowledgeService(db)
        
        # Get the strategy details (this would need to be implemented)
        proposed_strategy = {
            "id": strategy_id,
            "title": "Strategy Title",  # This would come from database
            "type": "revenue_optimization",  # This would come from database
            "description": "Strategy description"  # This would come from database
        }
        
        similar_strategies = await vector_service.find_similar_strategies(
            str(current_user.id), proposed_strategy
        )
        
        return {
            "strategy_id": strategy_id,
            "similar_strategies": similar_strategies,
            "found_count": len(similar_strategies)
        }
        
    except Exception as e:
        logger.error(f"Error finding similar strategies: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find similar strategies"
        )


# ROI Tracking Endpoints

@router.post("/roi/capture-baseline")
async def capture_baseline_metrics(
    request: ROITrackingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Capture baseline metrics before strategy implementation
    """
    try:
        roi_service = ROITrackingService(db)
        
        success = await roi_service.capture_baseline_metrics(
            str(current_user.id), request.strategy_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to capture baseline metrics"
            )
        
        return {
            "success": True,
            "strategy_id": request.strategy_id,
            "captured_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error capturing baseline metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to capture baseline metrics"
        )


@router.get("/roi/{strategy_id}/current")
async def get_current_roi(
    strategy_id: str,
    investment_cost: float = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current ROI for a strategy
    """
    try:
        roi_service = ROITrackingService(db)
        
        roi_result = await roi_service.calculate_current_roi(
            str(current_user.id), strategy_id, investment_cost
        )
        
        if 'error' in roi_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=roi_result['error']
            )
        
        return roi_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating current ROI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate current ROI"
        )


@router.get("/roi/{strategy_id}/tracking")
async def track_roi_over_time(
    strategy_id: str,
    timeframe: str = "weekly",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track ROI changes over time
    """
    try:
        roi_service = ROITrackingService(db)
        
        # Validate timeframe
        try:
            timeframe_enum = ROITimeframe(timeframe)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid timeframe. Must be one of: {[t.value for t in ROITimeframe]}"
            )
        
        tracking_result = await roi_service.track_roi_over_time(
            str(current_user.id), strategy_id, timeframe_enum
        )
        
        if 'error' in tracking_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=tracking_result['error']
            )
        
        return tracking_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking ROI over time: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track ROI over time"
        )


@router.get("/roi/report")
async def generate_roi_report(
    strategy_ids: Optional[List[str]] = None,
    period_days: int = 90,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate comprehensive ROI report
    """
    try:
        roi_service = ROITrackingService(db)
        
        report = await roi_service.generate_roi_report(
            str(current_user.id), strategy_ids, period_days
        )
        
        if 'error' in report:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=report['error']
            )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating ROI report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate ROI report"
        )


@router.get("/roi/{strategy_id}/prediction")
async def predict_future_roi(
    strategy_id: str,
    projection_weeks: int = 12,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Predict future ROI based on trends
    """
    try:
        roi_service = ROITrackingService(db)
        
        prediction = await roi_service.predict_future_roi(
            str(current_user.id), strategy_id, projection_weeks
        )
        
        if 'error' in prediction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=prediction['error']
            )
        
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting future ROI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to predict future ROI"
        )


# Knowledge Base Endpoints

@router.post("/knowledge/refresh")
async def refresh_knowledge_base(
    request: KnowledgeRefreshRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh user knowledge base with latest business data
    """
    try:
        vector_service = VectorKnowledgeService(db)
        
        success = await vector_service.refresh_knowledge_base(str(current_user.id))
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to refresh knowledge base"
            )
        
        return {
            "success": True,
            "refreshed_at": datetime.now().isoformat(),
            "force_refresh": request.force_refresh
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing knowledge base: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh knowledge base"
        )


@router.get("/knowledge/summary")
async def get_knowledge_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary of user knowledge base
    """
    try:
        vector_service = VectorKnowledgeService(db)
        
        summary = await vector_service.get_knowledge_summary(str(current_user.id))
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting knowledge summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get knowledge summary"
        )


# AI Memory Endpoints

@router.get("/memory/learning-profile")
async def get_learning_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's AI learning profile
    """
    try:
        memory_service = AIMemoryService(db)
        
        profile = await memory_service.get_user_learning_profile(str(current_user.id))
        
        return {
            "user_id": str(current_user.id),
            "profile": profile.to_dict() if profile else None,
            "retrieved_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting learning profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get learning profile"
        )


@router.get("/memory/patterns")
async def get_business_patterns(
    pattern_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get learned business patterns for user
    """
    try:
        memory_service = AIMemoryService(db)
        
        patterns = await memory_service.get_business_patterns(
            str(current_user.id), pattern_type
        )
        
        return {
            "patterns": [pattern.to_dict() for pattern in patterns],
            "pattern_type": pattern_type,
            "total_patterns": len(patterns),
            "retrieved_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting business patterns: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get business patterns"
        )


# Health Check Endpoint

@router.get("/health")
async def health_check():
    """
    Health check for AI dashboard services
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ai_orchestrator": "available",
            "ai_memory": "available",
            "vector_knowledge": "available",
            "ai_strategy_engine": "available",
            "roi_tracking": "available"
        }
    }