"""
Template Optimization API Endpoints

This module provides FastAPI endpoints for AI-driven template optimization,
A/B testing, and performance analytics. It enables continuous improvement
of SMS and email templates through data-driven optimization.

Endpoints:
- POST /template-optimization/ab-tests - Create new A/B tests
- GET /template-optimization/ab-tests - Get active A/B tests
- GET /template-optimization/ab-tests/{test_id}/results - Get test results
- POST /template-optimization/ab-tests/{test_id}/complete - Manually complete test
- GET /template-optimization/templates/optimal - Get optimal template for context
- POST /template-optimization/interactions - Record template interaction
- GET /template-optimization/performance/{template_id} - Get template performance
- GET /template-optimization/recommendations - Get optimization recommendations
- GET /template-optimization/variants/{variant_id}/performance - Get variant performance
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
import logging

from database import get_db
from utils.auth import get_current_user
from models import User
from services.ai_template_optimization_service import (
    get_ai_template_optimization_service,
    TemplateVariationType,
    OptimizationGoal,
    MessageType,
    MessageChannel,
    ABTest,
    TemplatePerformanceMetrics,
    OptimizationRecommendation
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/template-optimization", tags=["Template Optimization"])


# Request/Response Models

class CreateABTestRequest(BaseModel):
    test_name: str = Field(..., description="Name for the A/B test")
    message_type: str = Field(..., description="Type of message (appointment_reminder, confirmation, etc.)")
    channel: str = Field(..., description="Communication channel (sms, email)")
    optimization_goal: str = Field(..., description="Primary optimization goal")
    base_template: str = Field(..., description="Base template content")
    variation_types: List[str] = Field(..., description="List of variation types to test")
    target_segment: Optional[str] = Field(None, description="Target client segment")
    test_duration_days: int = Field(14, description="Test duration in days", ge=1, le=90)
    min_sample_size: int = Field(100, description="Minimum sample size per variant", ge=50, le=1000)

class ABTestResponse(BaseModel):
    id: str
    test_name: str
    message_type: str
    channel: str
    optimization_goal: str
    status: str
    start_date: datetime
    end_date: Optional[datetime]
    variants_count: int
    current_sample_size: int
    winner_variant_id: Optional[str] = None
    improvement_percentage: Optional[float] = None

class GetOptimalTemplateRequest(BaseModel):
    message_type: str = Field(..., description="Type of message")
    channel: str = Field(..., description="Communication channel")
    client_context: Dict[str, Any] = Field(..., description="Client context information")
    appointment_context: Dict[str, Any] = Field(..., description="Appointment context information")

class OptimalTemplateResponse(BaseModel):
    template_content: str
    metadata: Dict[str, Any]
    is_test_variant: bool
    test_id: Optional[str] = None
    variant_id: Optional[str] = None

class RecordInteractionRequest(BaseModel):
    template_id: str = Field(..., description="Template or variant ID")
    variant_id: Optional[str] = Field(None, description="Variant ID if this is an A/B test")
    interaction_type: str = Field(..., description="Type of interaction (send, response, confirmation, etc.)")
    client_id: int = Field(..., description="Client ID")
    appointment_id: int = Field(..., description="Appointment ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class PerformanceResponse(BaseModel):
    template_id: str
    time_period: str
    total_sends: int
    total_responses: int
    total_confirmations: int
    response_rate: float
    confirmation_rate: float
    effectiveness_score: float
    revenue_protected: float
    improvement_vs_baseline: float

class RecommendationResponse(BaseModel):
    template_id: str
    recommendation_type: str
    priority: str
    suggestion: str
    expected_improvement: float
    confidence_score: float
    implementation_effort: str
    current_performance: float
    benchmark_performance: float


# API Endpoints

@router.post("/ab-tests", response_model=ABTestResponse)
async def create_ab_test(
    request: CreateABTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new A/B test for template optimization.
    
    This endpoint sets up automated testing of different message variations
    to optimize for specific goals like confirmation rates or no-show reduction.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        # Validate enum values
        try:
            message_type = MessageType(request.message_type)
            channel = MessageChannel(request.channel)
            optimization_goal = OptimizationGoal(request.optimization_goal)
            variation_types = [TemplateVariationType(vt) for vt in request.variation_types]
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid enum value: {e}"
            )
        
        # Create the A/B test
        ab_test = await optimization_service.create_ab_test(
            test_name=request.test_name,
            message_type=message_type,
            channel=channel,
            optimization_goal=optimization_goal,
            base_template=request.base_template,
            variation_types=variation_types,
            user_id=current_user.id,
            target_segment=request.target_segment,
            test_duration_days=request.test_duration_days,
            min_sample_size=request.min_sample_size
        )
        
        # Calculate current sample size
        current_sample_size = sum(variant.sends_count for variant in ab_test.variants)
        
        return ABTestResponse(
            id=ab_test.id,
            test_name=ab_test.test_name,
            message_type=ab_test.message_type.value,
            channel=ab_test.channel.value,
            optimization_goal=ab_test.optimization_goal.value,
            status=ab_test.status.value,
            start_date=ab_test.start_date,
            end_date=ab_test.end_date,
            variants_count=len(ab_test.variants),
            current_sample_size=current_sample_size,
            winner_variant_id=ab_test.winner_variant_id,
            improvement_percentage=ab_test.improvement_percentage
        )
        
    except Exception as e:
        logger.error(f"Error creating A/B test for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create A/B test: {str(e)}"
        )


@router.get("/ab-tests", response_model=List[ABTestResponse])
async def get_active_ab_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active A/B tests for the current user.
    
    Returns tests that are currently running and collecting data.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        active_tests = await optimization_service.get_active_tests(current_user.id)
        
        response_tests = []
        for test in active_tests:
            current_sample_size = sum(variant.sends_count for variant in test.variants)
            
            response_tests.append(ABTestResponse(
                id=test.id,
                test_name=test.test_name,
                message_type=test.message_type.value,
                channel=test.channel.value,
                optimization_goal=test.optimization_goal.value,
                status=test.status.value,
                start_date=test.start_date,
                end_date=test.end_date,
                variants_count=len(test.variants),
                current_sample_size=current_sample_size,
                winner_variant_id=test.winner_variant_id,
                improvement_percentage=test.improvement_percentage
            ))
        
        return response_tests
        
    except Exception as e:
        logger.error(f"Error getting active tests for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get active tests: {str(e)}"
        )


@router.get("/ab-tests/{test_id}/results")
async def get_ab_test_results(
    test_id: str = Path(..., description="A/B test ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed results for a specific A/B test.
    
    Includes variant performance, statistical analysis, and recommendations.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        results = await optimization_service.get_test_results(test_id)
        
        if "error" in results:
            raise HTTPException(
                status_code=404,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting test results for {test_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get test results: {str(e)}"
        )


@router.post("/ab-tests/{test_id}/complete")
async def complete_ab_test(
    test_id: str = Path(..., description="A/B test ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually complete an A/B test before its scheduled end date.
    
    This is useful when you have enough data to make a decision
    or need to implement changes quickly.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        # Complete the test
        await optimization_service._complete_ab_test(test_id)
        
        # Get updated results
        results = await optimization_service.get_test_results(test_id)
        
        return {
            "success": True,
            "message": "A/B test completed successfully",
            "test_results": results
        }
        
    except Exception as e:
        logger.error(f"Error completing test {test_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete test: {str(e)}"
        )


@router.post("/templates/optimal", response_model=OptimalTemplateResponse)
async def get_optimal_template(
    request: GetOptimalTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the optimal template for a specific context.
    
    This considers active A/B tests, learned preferences, and historical performance
    to return the best template for the given situation.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        # Validate enum values
        try:
            message_type = MessageType(request.message_type)
            channel = MessageChannel(request.channel)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid enum value: {e}"
            )
        
        # Add user context
        client_context = request.client_context.copy()
        client_context["user_id"] = current_user.id
        
        # Get optimal template
        template_content, metadata = await optimization_service.get_optimal_template(
            message_type=message_type,
            channel=channel,
            client_context=client_context,
            appointment_context=request.appointment_context
        )
        
        return OptimalTemplateResponse(
            template_content=template_content,
            metadata=metadata,
            is_test_variant=metadata.get("is_test", False),
            test_id=metadata.get("test_id"),
            variant_id=metadata.get("variant_id")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting optimal template for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get optimal template: {str(e)}"
        )


@router.post("/interactions")
async def record_template_interaction(
    request: RecordInteractionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record an interaction with a template for performance tracking.
    
    This is crucial for measuring template effectiveness and optimizing A/B tests.
    Valid interaction types: send, response, confirmation, no_show_prevented, etc.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        await optimization_service.record_template_interaction(
            template_id=request.template_id,
            variant_id=request.variant_id,
            interaction_type=request.interaction_type,
            client_id=request.client_id,
            appointment_id=request.appointment_id,
            metadata=request.metadata or {}
        )
        
        return {
            "success": True,
            "message": "Template interaction recorded successfully"
        }
        
    except Exception as e:
        logger.error(f"Error recording template interaction: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to record interaction: {str(e)}"
        )


@router.get("/performance/{template_id}", response_model=PerformanceResponse)
async def get_template_performance(
    template_id: str = Path(..., description="Template ID"),
    time_period: str = Query("30d", description="Time period for analysis (7d, 30d, 90d)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed performance metrics for a specific template.
    
    Analyzes effectiveness over the specified time period with comprehensive metrics.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        # Validate time period
        if time_period not in ["7d", "30d", "90d"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid time period. Must be 7d, 30d, or 90d"
            )
        
        performance = await optimization_service.analyze_template_performance(
            template_id=template_id,
            time_period=time_period
        )
        
        return PerformanceResponse(
            template_id=performance.template_id,
            time_period=performance.time_period,
            total_sends=performance.total_sends,
            total_responses=performance.total_responses,
            total_confirmations=performance.total_confirmations,
            response_rate=performance.response_rate,
            confirmation_rate=performance.confirmation_rate,
            effectiveness_score=performance.engagement_score,
            revenue_protected=performance.revenue_protected,
            improvement_vs_baseline=performance.performance_vs_baseline
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template performance for {template_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get template performance: {str(e)}"
        )


@router.get("/recommendations", response_model=List[RecommendationResponse])
async def get_optimization_recommendations(
    message_type: Optional[str] = Query(None, description="Filter by message type"),
    channel: Optional[str] = Query(None, description="Filter by channel"),
    limit: int = Query(10, description="Maximum number of recommendations", ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-powered optimization recommendations for templates.
    
    Provides actionable insights for improving template performance
    based on data analysis and machine learning.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        # Validate enum values if provided
        message_type_enum = None
        channel_enum = None
        
        if message_type:
            try:
                message_type_enum = MessageType(message_type)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid message type: {message_type}"
                )
        
        if channel:
            try:
                channel_enum = MessageChannel(channel)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid channel: {channel}"
                )
        
        recommendations = await optimization_service.get_optimization_recommendations(
            user_id=current_user.id,
            message_type=message_type_enum,
            channel=channel_enum
        )
        
        # Limit results
        recommendations = recommendations[:limit]
        
        response_recommendations = []
        for rec in recommendations:
            response_recommendations.append(RecommendationResponse(
                template_id=rec.template_id,
                recommendation_type=rec.recommendation_type,
                priority=rec.priority,
                suggestion=rec.suggestion,
                expected_improvement=rec.expected_improvement,
                confidence_score=rec.confidence_score,
                implementation_effort=rec.implementation_effort,
                current_performance=rec.current_performance,
                benchmark_performance=rec.benchmark_performance
            ))
        
        return response_recommendations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting optimization recommendations for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recommendations: {str(e)}"
        )


@router.get("/variants/{variant_id}/performance")
async def get_variant_performance(
    variant_id: str = Path(..., description="Template variant ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time performance metrics for a specific template variant.
    
    This is useful for monitoring A/B test progress and making
    data-driven decisions about template effectiveness.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        # Get variant from cache
        if variant_id in optimization_service._template_cache:
            variant = optimization_service._template_cache[variant_id]
            
            return {
                "variant_id": variant.id,
                "template_id": variant.template_id,
                "variant_name": variant.variant_name,
                "variation_type": variant.variation_type.value,
                "performance": {
                    "sends_count": variant.sends_count,
                    "responses_count": variant.responses_count,
                    "confirmations_count": variant.confirmations_count,
                    "no_shows_prevented": variant.no_shows_prevented,
                    "response_rate": variant.response_rate,
                    "confirmation_rate": variant.confirmation_rate,
                    "effectiveness_score": variant.effectiveness_score
                },
                "created_at": variant.created_at.isoformat()
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Variant not found or not active"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting variant performance for {variant_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get variant performance: {str(e)}"
        )


@router.get("/health")
async def check_optimization_service_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check the health status of the template optimization service.
    
    Returns service status, active tests count, and system performance metrics.
    """
    try:
        optimization_service = get_ai_template_optimization_service(db)
        
        # Get service health metrics
        active_tests_count = len(optimization_service._active_tests)
        cached_templates_count = len(optimization_service._template_cache)
        cached_performance_count = len(optimization_service._performance_cache)
        
        return {
            "service_status": "healthy",
            "active_tests_count": active_tests_count,
            "cached_templates_count": cached_templates_count,
            "cached_performance_count": cached_performance_count,
            "min_sample_size": optimization_service.min_sample_size,
            "confidence_threshold": optimization_service.confidence_threshold,
            "test_duration_days": optimization_service.test_duration_days,
            "last_checked": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error checking optimization service health: {e}")
        return {
            "service_status": "error",
            "error": str(e),
            "last_checked": datetime.utcnow().isoformat()
        }