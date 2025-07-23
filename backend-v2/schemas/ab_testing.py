"""
A/B Testing Schemas - Six Figure Barber Campaign Optimization
============================================================

Pydantic response schemas for the A/B testing framework API endpoints.
Provides comprehensive data models for frontend integration and API responses.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
from enum import Enum

from services.ab_testing_service import ABTest, TestVariant, TestResults, TestType, TestStatus, VariantType

class TestTypeEnum(str, Enum):
    """Test types for API validation"""
    CAMPAIGN_MESSAGING = "campaign_messaging"
    OFFER_STRATEGY = "offer_strategy"
    TIMING_OPTIMIZATION = "timing_optimization"
    CHANNEL_COMPARISON = "channel_comparison"
    PERSONALIZATION_LEVEL = "personalization_level"
    WINBACK_SEQUENCE = "winback_sequence"
    SIX_FIGURE_ALIGNMENT = "six_figure_alignment"

class TestStatusEnum(str, Enum):
    """Test status for API validation"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ANALYZING = "analyzing"

class VariantTypeEnum(str, Enum):
    """Variant types for API validation"""
    CONTROL = "control"
    TREATMENT = "treatment"
    CHAMPION = "champion"

# Request Models

class CreateTestRequest(BaseModel):
    """Request model for creating a new A/B test"""
    test_name: str = Field(..., description="Descriptive name for the test")
    test_type: TestTypeEnum = Field(..., description="Type of test being conducted")
    hypothesis: str = Field(..., description="Expected outcome hypothesis")
    variants_config: List[Dict[str, Any]] = Field(..., description="Configuration for test variants")
    target_segment: Dict[str, Any] = Field(..., description="Client selection criteria")
    test_duration_days: int = Field(14, ge=1, le=60, description="Test duration in days")
    success_metrics: Optional[List[str]] = Field(None, description="Primary success metrics")

class StartTestRequest(BaseModel):
    """Request model for starting an A/B test"""
    analysis_intervals: Optional[List[int]] = Field([3, 7, 14], description="Analysis checkpoint days")

class RecordConversionRequest(BaseModel):
    """Request model for recording a test conversion"""
    variant_id: str = Field(..., description="Variant that produced the conversion")
    client_id: int = Field(..., description="Client who converted")
    conversion_value: float = Field(0.0, description="Revenue value of conversion")
    conversion_type: str = Field("primary", description="Type of conversion")

# Response Models

class TestVariantResponse(BaseModel):
    """Response model for test variant data"""
    variant_id: str
    test_id: str
    variant_name: str
    variant_type: VariantTypeEnum
    configuration: Dict[str, Any]
    
    # Traffic allocation
    traffic_percentage: float
    
    # Performance metrics
    participants: int
    conversions: int
    total_revenue: float
    total_cost: float
    
    # Statistical metrics
    conversion_rate: float
    revenue_per_participant: float
    roi_percentage: float
    confidence_interval: Tuple[float, float]
    
    # Six Figure methodology alignment
    methodology_score: int
    value_focus_rating: float
    relationship_impact: float
    
    # Status
    created_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    is_winner: bool
    
    @classmethod
    def from_variant(cls, variant: TestVariant) -> "TestVariantResponse":
        """Convert service TestVariant to response model"""
        return cls(
            variant_id=variant.variant_id,
            test_id=variant.test_id,
            variant_name=variant.variant_name,
            variant_type=variant.variant_type.value,
            configuration=variant.configuration,
            traffic_percentage=variant.traffic_percentage,
            participants=variant.participants,
            conversions=variant.conversions,
            total_revenue=variant.total_revenue,
            total_cost=variant.total_cost,
            conversion_rate=variant.conversion_rate,
            revenue_per_participant=variant.revenue_per_participant,
            roi_percentage=variant.roi_percentage,
            confidence_interval=variant.confidence_interval,
            methodology_score=variant.methodology_score,
            value_focus_rating=variant.value_focus_rating,
            relationship_impact=variant.relationship_impact,
            created_at=variant.created_at,
            started_at=variant.started_at,
            ended_at=variant.ended_at,
            is_winner=variant.is_winner
        )

class ABTestResponse(BaseModel):
    """Response model for A/B test data"""
    test_id: str
    test_name: str
    test_type: TestTypeEnum
    description: str
    hypothesis: str
    
    # Configuration
    target_segment: Dict[str, Any]
    test_duration_days: int
    minimum_sample_size: int
    significance_threshold: float
    
    # Business constraints
    max_budget: float
    success_metrics: List[str]
    six_figure_requirements: Dict[str, Any]
    
    # Status and management
    status: TestStatusEnum
    created_by: int
    variants: List[TestVariantResponse]
    
    # Results
    winner_variant_id: Optional[str]
    statistical_significance: Optional[float]
    confidence_level: float
    effect_size: Optional[float]
    
    # Business impact
    projected_annual_impact: Optional[float]
    implementation_cost: Optional[float]
    roi_estimate: Optional[float]
    
    # Timing
    created_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    next_analysis_at: Optional[datetime]
    
    # Insights
    insights: List[str]
    recommendations: List[str]
    
    @classmethod
    def from_test(cls, test: ABTest) -> "ABTestResponse":
        """Convert service ABTest to response model"""
        return cls(
            test_id=test.test_id,
            test_name=test.test_name,
            test_type=test.test_type.value,
            description=test.description,
            hypothesis=test.hypothesis,
            target_segment=test.target_segment,
            test_duration_days=test.test_duration_days,
            minimum_sample_size=test.minimum_sample_size,
            significance_threshold=test.significance_threshold,
            max_budget=test.max_budget,
            success_metrics=test.success_metrics,
            six_figure_requirements=test.six_figure_requirements,
            status=test.status.value,
            created_by=test.created_by,
            variants=[TestVariantResponse.from_variant(v) for v in test.variants],
            winner_variant_id=test.winner_variant_id,
            statistical_significance=test.statistical_significance,
            confidence_level=test.confidence_level,
            effect_size=test.effect_size,
            projected_annual_impact=test.projected_annual_impact,
            implementation_cost=test.implementation_cost,
            roi_estimate=test.roi_estimate,
            created_at=test.created_at,
            started_at=test.started_at,
            ended_at=test.ended_at,
            next_analysis_at=test.next_analysis_at,
            insights=test.insights or [],
            recommendations=test.recommendations or []
        )

class TestResultsResponse(BaseModel):
    """Response model for comprehensive test results"""
    test_id: str
    test_name: str
    
    # Winner information
    winning_variant: TestVariantResponse
    control_variant: TestVariantResponse
    improvement_percentage: float
    
    # Statistical analysis
    statistical_significance: float
    confidence_interval: Tuple[float, float]
    effect_size: float
    power_analysis: float
    
    # Business metrics
    revenue_lift: float
    cost_difference: float
    roi_improvement: float
    client_satisfaction_impact: float
    
    # Six Figure methodology analysis
    methodology_compliance: Dict[str, float]
    value_enhancement_score: float
    relationship_building_score: float
    premium_positioning_maintained: bool
    
    # Recommendations
    implementation_priority: str
    rollout_recommendation: str
    follow_up_tests: List[str]
    
    # Detailed insights
    segment_performance: Dict[str, Dict[str, float]]
    timing_insights: Dict[str, Any]
    channel_insights: Dict[str, Any]
    
    @classmethod
    def from_results(cls, results: TestResults) -> "TestResultsResponse":
        """Convert service TestResults to response model"""
        return cls(
            test_id=results.test_id,
            test_name=results.test_name,
            winning_variant=TestVariantResponse.from_variant(results.winning_variant),
            control_variant=TestVariantResponse.from_variant(results.control_variant),
            improvement_percentage=results.improvement_percentage,
            statistical_significance=results.statistical_significance,
            confidence_interval=results.confidence_interval,
            effect_size=results.effect_size,
            power_analysis=results.power_analysis,
            revenue_lift=results.revenue_lift,
            cost_difference=results.cost_difference,
            roi_improvement=results.roi_improvement,
            client_satisfaction_impact=results.client_satisfaction_impact,
            methodology_compliance=results.methodology_compliance,
            value_enhancement_score=results.value_enhancement_score,
            relationship_building_score=results.relationship_building_score,
            premium_positioning_maintained=results.premium_positioning_maintained,
            implementation_priority=results.implementation_priority,
            rollout_recommendation=results.rollout_recommendation,
            follow_up_tests=results.follow_up_tests,
            segment_performance=results.segment_performance,
            timing_insights=results.timing_insights,
            channel_insights=results.channel_insights
        )

class TestRecommendationResponse(BaseModel):
    """Response model for test recommendations"""
    test_type: TestTypeEnum
    title: str
    description: str
    potential_impact: str
    priority: str = Field(..., description="high, medium, or low")
    estimated_duration: str
    sample_size: int
    rationale: str

class TestPerformanceSummaryResponse(BaseModel):
    """Response model for testing performance summary"""
    total_tests_run: int
    tests_completed: int
    tests_active: int
    average_improvement: float
    successful_tests: int
    total_revenue_lift: float
    average_test_duration: float
    six_figure_compliance_rate: float
    top_winning_strategies: List[str]
    recommended_next_tests: List[str]

class ChampionChallengerRequest(BaseModel):
    """Request model for champion/challenger test creation"""
    current_champion: Dict[str, Any] = Field(..., description="Current best-performing configuration")
    challenger_config: Dict[str, Any] = Field(..., description="New configuration to test")
    challenger_name: str = Field(..., description="Name for the challenger strategy")

class TestHealthResponse(BaseModel):
    """Response model for A/B testing system health"""
    status: str
    service: str
    version: str
    features: List[str]
    supported_test_types: List[str]
    statistical_methods: List[str]
    methodology_alignment: str