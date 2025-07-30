"""
A/B Testing API Endpoints
Advanced conversion optimization with statistical analysis
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from db import get_db
from auth import get_current_user
from models import User
from services.ab_testing_service import (
    ab_testing_service, 
    ABTestConfig, 
    VariantConfig, 
    VariantType, 
    EventType,
    ABTestStatus,
    ABTestResult
)
from utils.rate_limiter import rate_limiter

router = APIRouter(prefix="/ab-testing", tags=["A/B Testing"])


# Pydantic models for API

class CreateABTestRequest(BaseModel):
    """Request model for creating A/B test"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    target_metric: str = Field(..., pattern="^(conversion_rate|revenue|click_through_rate)$")
    traffic_split: float = Field(0.5, ge=0.1, le=0.9)
    min_sample_size: int = Field(100, ge=30, le=10000)
    max_duration_days: int = Field(30, ge=1, le=90)
    confidence_level: float = Field(0.95, ge=0.8, le=0.99)
    minimum_effect_size: float = Field(0.05, ge=0.01, le=0.5)
    six_figure_alignment: Optional[str] = Field(None, max_length=1000)
    
    # Variant configurations
    control_variant: Dict[str, Any] = Field(...)
    treatment_variant: Dict[str, Any] = Field(...)


class VariantAssignmentResponse(BaseModel):
    """Response model for variant assignment"""
    test_id: str
    variant: str
    user_identifier: str
    assigned_at: datetime


class TrackEventRequest(BaseModel):
    """Request model for tracking events"""
    test_id: str
    user_identifier: str
    event_type: str = Field(..., pattern="^(view|click|conversion|revenue)$")
    variant: str = Field(..., pattern="^(control|treatment)$")
    value: Optional[float] = Field(None, ge=0)
    metadata: Optional[Dict[str, Any]] = None


class ABTestSummaryResponse(BaseModel):
    """Summary response for A/B test"""
    id: str
    name: str
    description: Optional[str]
    status: str
    target_metric: str
    variant_count: int
    event_count: int
    created_at: str
    started_at: Optional[str]
    ends_at: Optional[str]


class ABTestResultsResponse(BaseModel):
    """Detailed results response"""
    test_id: str
    control_metrics: Dict[str, float]
    treatment_metrics: Dict[str, float]
    statistical_significance: float
    confidence_interval: Dict[str, float]
    recommendation: str
    revenue_impact: Optional[float]
    is_statistically_significant: bool
    sample_sizes: Dict[str, int]


# API Endpoints

@router.post("/tests", response_model=Dict[str, str])
async def create_ab_test(
    request: CreateABTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new A/B test for conversion optimization
    
    Six Figure Barber Methodology Focus:
    - Revenue optimization testing
    - Client experience improvements  
    - Professional positioning tests
    - Conversion funnel optimization
    """
    
    # Rate limiting
    rate_key = f"create_ab_test:{current_user.id}"
    if not await rate_limiter.allow_request(rate_key, max_requests=5, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for test creation")
    
    try:
        # Convert request to service models
        test_config = ABTestConfig(
            name=request.name,
            description=request.description,
            target_metric=request.target_metric,
            traffic_split=request.traffic_split,
            min_sample_size=request.min_sample_size,
            max_duration_days=request.max_duration_days,
            confidence_level=request.confidence_level,
            minimum_effect_size=request.minimum_effect_size,
            six_figure_alignment=request.six_figure_alignment or ""
        )
        
        control_variant = VariantConfig(
            name=request.control_variant.get("name", "Control"),
            description=request.control_variant.get("description", ""),
            type=VariantType.CONTROL,
            config=request.control_variant.get("config", {}),
            weight=0.5
        )
        
        treatment_variant = VariantConfig(
            name=request.treatment_variant.get("name", "Treatment"),
            description=request.treatment_variant.get("description", ""),
            type=VariantType.TREATMENT,
            config=request.treatment_variant.get("config", {}),
            weight=0.5
        )
        
        # Create test
        test_id = await ab_testing_service.create_test(
            db=db,
            user_id=current_user.id,
            test_config=test_config,
            control_variant=control_variant,
            treatment_variant=treatment_variant
        )
        
        return {"test_id": test_id, "status": "created"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test: {str(e)}")


@router.post("/tests/{test_id}/start")
async def start_ab_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start an A/B test"""
    
    try:
        success = await ab_testing_service.start_test(
            db=db,
            test_id=test_id,
            user_id=current_user.id
        )
        
        return {"success": success, "status": "started"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start test: {str(e)}")


@router.get("/tests/{test_id}/assign/{user_identifier}")
async def assign_variant(
    test_id: str,
    user_identifier: str,
    context: Optional[Dict[str, Any]] = Body(None)
):
    """
    Assign user to test variant using consistent hashing
    
    This endpoint is public (no auth) for client-side usage
    """
    
    try:
        variant = await ab_testing_service.assign_variant(
            test_id=test_id,
            user_identifier=user_identifier,
            context=context
        )
        
        return VariantAssignmentResponse(
            test_id=test_id,
            variant=variant,
            user_identifier=user_identifier,
            assigned_at=datetime.utcnow()
        )
        
    except Exception as e:
        # Fail safely to control variant
        return VariantAssignmentResponse(
            test_id=test_id,
            variant="control",
            user_identifier=user_identifier,
            assigned_at=datetime.utcnow()
        )


@router.post("/events/track")
async def track_ab_test_event(
    request: TrackEventRequest,
    db: Session = Depends(get_db)
):
    """
    Track A/B test events for conversion analysis
    
    Events include:
    - view: Page/component viewed
    - click: CTA or element clicked  
    - conversion: Goal completed (booking, signup, etc.)
    - revenue: Revenue generated
    """
    
    try:
        # Convert string to EventType enum
        event_type = EventType(request.event_type)
        
        success = await ab_testing_service.track_event(
            db=db,
            test_id=request.test_id,
            user_identifier=request.user_identifier,
            event_type=event_type,
            variant=request.variant,
            value=request.value,
            metadata=request.metadata
        )
        
        return {"success": success, "status": "tracked"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid event type: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track event: {str(e)}")


@router.get("/tests/{test_id}/results", response_model=ABTestResultsResponse)
async def get_test_results(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive A/B test results with statistical analysis
    
    Returns:
    - Conversion metrics for each variant
    - Statistical significance analysis
    - Confidence intervals  
    - Revenue impact estimation
    - Actionable recommendations
    """
    
    try:
        results = await ab_testing_service.get_test_results(
            db=db,
            test_id=test_id,
            user_id=current_user.id
        )
        
        return ABTestResultsResponse(
            test_id=results.test_id,
            control_metrics=results.control_metrics,
            treatment_metrics=results.treatment_metrics,
            statistical_significance=results.statistical_significance,
            confidence_interval=results.confidence_interval,
            recommendation=results.recommendation,
            revenue_impact=results.revenue_impact,
            is_statistically_significant=results.is_statistically_significant,
            sample_sizes=results.sample_sizes
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get results: {str(e)}")


@router.get("/tests", response_model=List[ABTestSummaryResponse])
async def list_ab_tests(
    status: Optional[str] = Query(None, pattern="^(draft|active|paused|completed|archived)$"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List A/B tests for the current user"""
    
    try:
        # Convert string to enum if provided
        status_enum = ABTestStatus(status) if status else None
        
        tests = await ab_testing_service.list_tests(
            db=db,
            user_id=current_user.id,
            status=status_enum,
            limit=limit,
            offset=offset
        )
        
        return [
            ABTestSummaryResponse(
                id=test["id"],
                name=test["name"],
                description=test["description"],
                status=test["status"],
                target_metric=test["target_metric"],
                variant_count=test["variant_count"],
                event_count=test["event_count"],
                created_at=test["created_at"],
                started_at=test["started_at"],
                ends_at=test["ends_at"]
            )
            for test in tests
        ]
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid status: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tests: {str(e)}")


@router.delete("/tests/{test_id}")
async def delete_ab_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an A/B test (only if in draft status)"""
    
    try:
        # Get test to verify ownership and status
        from models import ABTest
        test = db.query(ABTest).filter(
            ABTest.id == test_id,
            ABTest.user_id == current_user.id
        ).first()
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        if test.status != ABTestStatus.DRAFT.value:
            raise HTTPException(status_code=400, detail="Can only delete draft tests")
        
        # Delete test (cascades to variants and events)
        db.delete(test)
        db.commit()
        
        return {"success": True, "status": "deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete test: {str(e)}")


@router.post("/tests/{test_id}/pause")
async def pause_ab_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause an active A/B test"""
    
    try:
        from models import ABTest
        test = db.query(ABTest).filter(
            ABTest.id == test_id,
            ABTest.user_id == current_user.id
        ).first()
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        if test.status != ABTestStatus.ACTIVE.value:
            raise HTTPException(status_code=400, detail="Can only pause active tests")
        
        test.status = ABTestStatus.PAUSED.value
        db.commit()
        
        return {"success": True, "status": "paused"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to pause test: {str(e)}")


@router.post("/tests/{test_id}/resume")
async def resume_ab_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume a paused A/B test"""
    
    try:
        from models import ABTest
        test = db.query(ABTest).filter(
            ABTest.id == test_id,
            ABTest.user_id == current_user.id
        ).first()
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        if test.status != ABTestStatus.PAUSED.value:
            raise HTTPException(status_code=400, detail="Can only resume paused tests")
        
        test.status = ABTestStatus.ACTIVE.value
        db.commit()
        
        return {"success": True, "status": "resumed"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to resume test: {str(e)}")


# A/B Testing Templates for Six Figure Barber Methodology

@router.get("/templates/six-figure-barber")
async def get_six_figure_barber_templates():
    """
    Get pre-configured A/B test templates aligned with Six Figure Barber methodology
    
    Templates include:
    - Revenue optimization tests
    - Client experience improvements
    - Professional positioning tests
    - Conversion funnel optimization
    """
    
    templates = [
        {
            "id": "premium_pricing_cta",
            "name": "Premium Pricing CTA Test",
            "description": "Test premium vs value-focused pricing presentation",
            "target_metric": "conversion_rate",
            "six_figure_alignment": "Tests premium positioning vs commodity pricing approach",
            "control_variant": {
                "name": "Value Pricing",
                "config": {
                    "cta_text": "Book Now - $30",
                    "messaging": "Great value for quality service",
                    "price_emphasis": "value"
                }
            },
            "treatment_variant": {
                "name": "Premium Positioning",
                "config": {
                    "cta_text": "Reserve Your Premium Experience - $50",
                    "messaging": "Exclusive barbering experience for discerning clients",
                    "price_emphasis": "premium"
                }
            }
        },
        {
            "id": "expertise_messaging",
            "name": "Expertise vs Availability Messaging",
            "description": "Test expertise-focused vs availability-focused messaging",
            "target_metric": "click_through_rate",
            "six_figure_alignment": "Emphasizes professional expertise over commodity availability",
            "control_variant": {
                "name": "Availability Focus",
                "config": {
                    "headline": "Available Today",
                    "subtext": "Quick appointments available",
                    "focus": "convenience"
                }
            },
            "treatment_variant": {
                "name": "Expertise Focus", 
                "config": {
                    "headline": "Master Barber",
                    "subtext": "15+ years of professional expertise",
                    "focus": "expertise"
                }
            }
        },
        {
            "id": "consultation_upsell",
            "name": "Consultation Upsell Test",
            "description": "Test consultation upsell positioning in booking flow",
            "target_metric": "revenue",
            "six_figure_alignment": "Increases client value through consultative approach",
            "control_variant": {
                "name": "Standard Booking",
                "config": {
                    "consultation_offer": false,
                    "service_only": true
                }
            },
            "treatment_variant": {
                "name": "Consultation Upsell",
                "config": {
                    "consultation_offer": true,
                    "consultation_price": 15,
                    "messaging": "Personalized consultation for best results"
                }
            }
        },
        {
            "id": "social_proof_positioning",
            "name": "Social Proof Positioning Test",
            "description": "Test different social proof elements for credibility",
            "target_metric": "conversion_rate",
            "six_figure_alignment": "Builds professional credibility and premium positioning",
            "control_variant": {
                "name": "Review Count",
                "config": {
                    "social_proof_type": "reviews",
                    "display": "★★★★★ (127 reviews)"
                }
            },
            "treatment_variant": {
                "name": "Professional Credentials",
                "config": {
                    "social_proof_type": "credentials",
                    "display": "Licensed Professional • Industry Award Winner"
                }
            }
        }
    ]
    
    return {"templates": templates}


@router.post("/templates/{template_id}/create")
async def create_test_from_template(
    template_id: str,
    name: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create A/B test from Six Figure Barber template"""
    
    # Get template
    templates_response = await get_six_figure_barber_templates()
    template = next((t for t in templates_response["templates"] if t["id"] == template_id), None)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        # Create test from template
        test_config = ABTestConfig(
            name=name,
            description=template["description"],
            target_metric=template["target_metric"],
            six_figure_alignment=template["six_figure_alignment"]
        )
        
        control_variant = VariantConfig(
            name=template["control_variant"]["name"],
            description=f"Control variant: {template['control_variant']['name']}",
            type=VariantType.CONTROL,
            config=template["control_variant"]["config"]
        )
        
        treatment_variant = VariantConfig(
            name=template["treatment_variant"]["name"], 
            description=f"Treatment variant: {template['treatment_variant']['name']}",
            type=VariantType.TREATMENT,
            config=template["treatment_variant"]["config"]
        )
        
        test_id = await ab_testing_service.create_test(
            db=db,
            user_id=current_user.id,
            test_config=test_config,
            control_variant=control_variant,
            treatment_variant=treatment_variant
        )
        
        return {"test_id": test_id, "template_id": template_id, "status": "created"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test from template: {str(e)}")