"""
Six Figure Barber Pricing Validation API

This module provides API endpoints for validating pricing against 6FB methodology,
generating recommendations, and managing pricing optimization strategies.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum

from db import get_db
from models import Service, User
from services.service_template_service import ServiceTemplateService
from routers.auth import get_current_user

# Initialize router
router = APIRouter(prefix="/api/v1/pricing", tags=["pricing"])

# Enums
class SixFBTier(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    PREMIUM = "premium"
    LUXURY = "luxury"

class MarketType(str, Enum):
    URBAN = "urban"
    SUBURBAN = "suburban"
    LUXURY = "luxury"
    ECONOMY = "economy"

class ValidationLevel(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    INFO = "info"

class PricingStrategy(str, Enum):
    VALUE_BASED = "value_based"
    VALUE_BASED_PREMIUM = "value_based_premium"
    PACKAGE_VALUE = "package_value"
    LUXURY_VALUE = "luxury_value"
    EXPERIENTIAL_LUXURY = "experiential_luxury"
    ULTIMATE_LUXURY = "ultimate_luxury"
    CONSULTATION_VALUE = "consultation_value"

# Request/Response Models
class PricingValidationRequest(BaseModel):
    """Request model for pricing validation"""
    service_name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., description="Service category")
    base_price: float = Field(..., ge=0, description="Base service price")
    duration: int = Field(..., ge=5, le=480, description="Duration in minutes")
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    is_package: bool = Field(False, description="Whether this is a package service")
    package_discount: Optional[float] = Field(None, ge=0, le=100)
    market_type: MarketType = Field(MarketType.URBAN, description="Target market type")
    target_tier: SixFBTier = Field(SixFBTier.PROFESSIONAL, description="Target 6FB tier")
    include_recommendations: bool = Field(True, description="Include pricing recommendations")
    include_market_analysis: bool = Field(False, description="Include market analysis")

    @field_validator('max_price')
    def validate_max_price(cls, v, values):
        if v is not None and 'min_price' in values and values['min_price'] is not None:
            if v < values['min_price']:
                raise ValueError('Maximum price cannot be less than minimum price')
        return v

class PricingValidationDetails(BaseModel):
    """Detailed validation information"""
    pricing_strategy: PricingStrategy
    profit_margin: float
    market_position: str
    value_proposition: str
    upsell_opportunities: List[str]
    competitive_analysis: str

class PricingValidationResult(BaseModel):
    """Result of pricing validation"""
    is_valid: bool
    level: ValidationLevel
    message: str
    suggestion: Optional[str] = None
    recommended_price: Optional[float] = None
    methodology_alignment: float = Field(..., ge=0, le=100)
    revenue_optimization: float = Field(..., ge=0, le=100)
    details: Optional[PricingValidationDetails] = None

class PricingRecommendation(BaseModel):
    """Pricing recommendation with implementation details"""
    type: str = Field(..., description="Type: increase, decrease, maintain, restructure")
    current_price: float
    recommended_price: float
    reasoning: str
    expected_impact: Dict[str, float]
    implementation_strategy: str
    timeline: str
    risk_level: str = Field(..., description="low, medium, high")
    confidence: float = Field(..., ge=0, le=100)

class OptimizationOpportunity(BaseModel):
    """Optimization opportunity details"""
    type: str = Field(..., description="pricing, packaging, positioning, upsell, duration")
    priority: str = Field(..., description="high, medium, low")
    description: str
    implementation: str
    expected_revenue: float
    effort_level: str = Field(..., description="low, medium, high")
    timeframe: str

class BenchmarkComparison(BaseModel):
    """Benchmark comparison data"""
    tier: SixFBTier
    benchmark_min: float
    benchmark_max: float
    benchmark_suggested: float
    price_difference: float
    price_difference_percentage: float
    position_relative_to_benchmark: str
    methodology_alignment_score: float
    suggestions: List[str]

class PricingAnalysis(BaseModel):
    """Comprehensive pricing analysis"""
    service_name: str
    category: str
    current_price: float
    duration: int
    validation: PricingValidationResult
    recommendations: List[PricingRecommendation]
    benchmark_comparison: BenchmarkComparison
    optimization_opportunities: List[OptimizationOpportunity]
    six_fb_alignment_score: float
    revenue_optimization_score: float

class PricingValidationResponse(BaseModel):
    """Complete response for pricing validation"""
    analysis: PricingAnalysis
    quick_validation: PricingValidationResult
    educational_content: Dict[str, Any]
    action_items: List[Dict[str, Any]]
    timestamp: datetime

class ServicePricingUpdate(BaseModel):
    """Request to update service pricing based on recommendations"""
    service_id: int
    new_price: float = Field(..., ge=0)
    recommendation_id: Optional[str] = None
    reasoning: Optional[str] = None
    implementation_date: Optional[datetime] = None

class PricingDashboardData(BaseModel):
    """Dashboard data for pricing optimization"""
    overview: Dict[str, Any]
    price_distribution: List[Dict[str, Any]]
    validation_summary: Dict[str, int]
    top_opportunities: List[OptimizationOpportunity]
    performance_metrics: Dict[str, float]

# Business Logic Classes
class PricingValidationService:
    """Service for validating pricing against 6FB methodology"""
    
    def __init__(self, db: Session):
        self.db = db
        self.service_template_service = ServiceTemplateService(db)
        
    def validate_pricing(self, request: PricingValidationRequest) -> PricingValidationResponse:
        """Validate pricing against 6FB methodology"""
        
        # Get 6FB benchmarks
        benchmarks = self._get_6fb_benchmarks()
        benchmark = self._find_benchmark(request.category, request.target_tier, benchmarks)
        
        if not benchmark:
            raise HTTPException(
                status_code=400,
                detail=f"No 6FB benchmark found for {request.category} in {request.target_tier} tier"
            )
        
        # Perform validation
        validation_result = self._perform_validation(request, benchmark)
        
        # Generate recommendations if requested
        recommendations = []
        if request.include_recommendations:
            recommendations = self._generate_recommendations(request, benchmark, validation_result)
        
        # Create benchmark comparison
        benchmark_comparison = self._create_benchmark_comparison(request, benchmark)
        
        # Generate optimization opportunities
        optimization_opportunities = self._generate_optimization_opportunities(request, benchmark, validation_result)
        
        # Create comprehensive analysis
        analysis = PricingAnalysis(
            service_name=request.service_name,
            category=request.category,
            current_price=request.base_price,
            duration=request.duration,
            validation=validation_result,
            recommendations=recommendations,
            benchmark_comparison=benchmark_comparison,
            optimization_opportunities=optimization_opportunities,
            six_fb_alignment_score=validation_result.methodology_alignment,
            revenue_optimization_score=validation_result.revenue_optimization
        )
        
        # Generate educational content
        educational_content = self._generate_educational_content(request, benchmark)
        
        # Generate action items
        action_items = self._generate_action_items(recommendations, optimization_opportunities)
        
        return PricingValidationResponse(
            analysis=analysis,
            quick_validation=validation_result,
            educational_content=educational_content,
            action_items=action_items,
            timestamp=datetime.utcnow()
        )
    
    def _get_6fb_benchmarks(self) -> List[Dict[str, Any]]:
        """Get 6FB pricing benchmarks"""
        return self.service_template_service.get_six_fb_preset_templates()
    
    def _find_benchmark(self, category: str, tier: SixFBTier, benchmarks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find appropriate benchmark for category and tier"""
        for benchmark in benchmarks:
            if (benchmark.get('category', '').lower() == category.lower() and 
                benchmark.get('six_fb_tier') == tier.value):
                return benchmark
        return None
    
    def _perform_validation(self, request: PricingValidationRequest, benchmark: Dict[str, Any]) -> PricingValidationResult:
        """Perform core pricing validation"""
        
        min_price = benchmark.get('suggested_min_price', 0)
        max_price = benchmark.get('suggested_max_price', 999999)
        suggested_price = benchmark.get('suggested_base_price', 0)
        target_margin = benchmark.get('profit_margin_target', 70)
        
        # Price range validation
        if request.base_price < min_price:
            return PricingValidationResult(
                is_valid=False,
                level=ValidationLevel.ERROR,
                message=f"Price ${request.base_price} is below minimum viable price for {request.target_tier} tier",
                suggestion=f"Consider increasing to at least ${min_price} for sustainable business growth",
                recommended_price=min_price,
                methodology_alignment=25,
                revenue_optimization=15,
                details=PricingValidationDetails(
                    pricing_strategy=PricingStrategy(benchmark.get('pricing_strategy', 'value_based')),
                    profit_margin=self._calculate_profit_margin(request.base_price),
                    market_position="Below market minimum",
                    value_proposition="Price may signal lower quality",
                    upsell_opportunities=["Premium add-ons", "Package deals"],
                    competitive_analysis="Significantly underpriced compared to 6FB standards"
                )
            )
        
        if request.base_price > max_price:
            return PricingValidationResult(
                is_valid=False,
                level=ValidationLevel.WARNING,
                message=f"Price ${request.base_price} exceeds recommended maximum for {request.target_tier} tier",
                suggestion=f"Ensure premium positioning justifies pricing above ${max_price}",
                recommended_price=max_price,
                methodology_alignment=60,
                revenue_optimization=40,
                details=PricingValidationDetails(
                    pricing_strategy=PricingStrategy(benchmark.get('pricing_strategy', 'value_based')),
                    profit_margin=self._calculate_profit_margin(request.base_price),
                    market_position="Premium positioning",
                    value_proposition="Ensure value justifies premium pricing",
                    upsell_opportunities=["Luxury services", "VIP experiences"],
                    competitive_analysis="Premium pricing requires exceptional service delivery"
                )
            )
        
        # Duration validation
        benchmark_duration = benchmark.get('duration_minutes', 60)
        duration_difference = abs(request.duration - benchmark_duration)
        
        if duration_difference > 15:
            return PricingValidationResult(
                is_valid=False,
                level=ValidationLevel.WARNING,
                message=f"Duration {request.duration} minutes differs significantly from benchmark {benchmark_duration} minutes",
                suggestion=f"Consider adjusting duration to align with {benchmark_duration} minutes for optimal pricing",
                methodology_alignment=70,
                revenue_optimization=60,
                details=PricingValidationDetails(
                    pricing_strategy=PricingStrategy(benchmark.get('pricing_strategy', 'value_based')),
                    profit_margin=self._calculate_profit_margin(request.base_price),
                    market_position="Duration misalignment",
                    value_proposition="Optimize time-to-value ratio",
                    upsell_opportunities=["Time-based add-ons", "Express services"],
                    competitive_analysis="Duration optimization can improve profitability"
                )
            )
        
        # Optimal pricing validation
        price_optimality = 100 - (abs(request.base_price - suggested_price) / suggested_price) * 100
        methodology_alignment = max(60, min(100, price_optimality))
        
        return PricingValidationResult(
            is_valid=True,
            level=ValidationLevel.SUCCESS,
            message="Pricing aligns well with 6FB methodology and market standards",
            methodology_alignment=methodology_alignment,
            revenue_optimization=max(70, methodology_alignment),
            details=PricingValidationDetails(
                pricing_strategy=PricingStrategy(benchmark.get('pricing_strategy', 'value_based')),
                profit_margin=self._calculate_profit_margin(request.base_price),
                market_position="Well-positioned",
                value_proposition="Aligned with 6FB methodology",
                upsell_opportunities=benchmark.get('factors', []),
                competitive_analysis="Competitive and value-driven pricing"
            )
        )
    
    def _calculate_profit_margin(self, price: float) -> float:
        """Calculate profit margin (simplified - assumes 30% cost)"""
        cost = price * 0.3
        return ((price - cost) / price) * 100
    
    def _generate_recommendations(self, request: PricingValidationRequest, benchmark: Dict[str, Any], validation: PricingValidationResult) -> List[PricingRecommendation]:
        """Generate pricing recommendations"""
        recommendations = []
        
        suggested_price = benchmark.get('suggested_base_price', 0)
        min_price = benchmark.get('suggested_min_price', 0)
        max_price = benchmark.get('suggested_max_price', 999999)
        
        # Price adjustment recommendations
        if request.base_price < min_price:
            recommendations.append(PricingRecommendation(
                type="increase",
                current_price=request.base_price,
                recommended_price=min_price,
                reasoning="Align with 6FB minimum viable pricing for sustainable business growth",
                expected_impact={
                    "revenue_change": ((min_price - request.base_price) / request.base_price) * 100,
                    "demand_change": -10,
                    "profit_margin_change": 15
                },
                implementation_strategy="Gradual increase over 2-3 months with improved service communication",
                timeline="6-8 weeks",
                risk_level="low",
                confidence=85
            ))
        
        elif request.base_price > max_price:
            recommendations.append(PricingRecommendation(
                type="restructure",
                current_price=request.base_price,
                recommended_price=max_price,
                reasoning="Ensure premium positioning justifies pricing above 6FB recommendations",
                expected_impact={
                    "revenue_change": 0,
                    "demand_change": 20,
                    "profit_margin_change": 5
                },
                implementation_strategy="Enhance service quality and experience to justify premium pricing",
                timeline="8-12 weeks",
                risk_level="medium",
                confidence=70
            ))
        
        return recommendations
    
    def _create_benchmark_comparison(self, request: PricingValidationRequest, benchmark: Dict[str, Any]) -> BenchmarkComparison:
        """Create benchmark comparison"""
        min_price = benchmark.get('suggested_min_price', 0)
        max_price = benchmark.get('suggested_max_price', 999999)
        suggested_price = benchmark.get('suggested_base_price', 0)
        
        price_difference = request.base_price - suggested_price
        price_difference_percentage = (price_difference / suggested_price) * 100 if suggested_price > 0 else 0
        
        if request.base_price < min_price:
            position = "below"
        elif request.base_price > max_price:
            position = "above"
        else:
            position = "within"
        
        return BenchmarkComparison(
            tier=request.target_tier,
            benchmark_min=min_price,
            benchmark_max=max_price,
            benchmark_suggested=suggested_price,
            price_difference=price_difference,
            price_difference_percentage=price_difference_percentage,
            position_relative_to_benchmark=position,
            methodology_alignment_score=benchmark.get('methodology_score', 0),
            suggestions=[
                f"Consider {benchmark.get('pricing_strategy', 'value_based')} approach",
                f"Target {benchmark.get('profit_margin_target', 70)}% profit margin",
                f"Position for {benchmark.get('client_value_tier', 'standard')} client segment"
            ]
        )
    
    def _generate_optimization_opportunities(self, request: PricingValidationRequest, benchmark: Dict[str, Any], validation: PricingValidationResult) -> List[OptimizationOpportunity]:
        """Generate optimization opportunities"""
        opportunities = []
        
        # Always suggest packaging
        opportunities.append(OptimizationOpportunity(
            type="packaging",
            priority="high",
            description="Bundle with complementary services to increase average transaction value",
            implementation="Create service packages with 10-15% discount to individual service total",
            expected_revenue=request.base_price * 0.3,
            effort_level="medium",
            timeframe="4-6 weeks"
        ))
        
        # Suggest upselling if validation shows opportunity
        if validation.methodology_alignment > 70:
            opportunities.append(OptimizationOpportunity(
                type="upsell",
                priority="medium",
                description="Implement systematic upselling to increase revenue per client",
                implementation="Train staff on consultative selling and create upsell menus",
                expected_revenue=request.base_price * 0.25,
                effort_level="low",
                timeframe="2-4 weeks"
            ))
        
        return opportunities
    
    def _generate_educational_content(self, request: PricingValidationRequest, benchmark: Dict[str, Any]) -> Dict[str, Any]:
        """Generate educational content"""
        return {
            "title": "6FB Pricing Strategy",
            "methodology": "Six Figure Barber methodology emphasizes value-based pricing over cost-plus or competitor-based approaches",
            "principles": [
                "Price reflects value and experience delivered",
                "Higher prices can increase perceived value",
                "Focus on quality and service differentiation",
                "Build relationships that justify premium pricing"
            ],
            "best_practices": [
                "Communicate value clearly to clients",
                "Invest in skills and service quality",
                "Create memorable experiences",
                "Build strong client relationships"
            ],
            "resources": [
                {
                    "title": "6FB Pricing Guide",
                    "url": "/pricing-guide",
                    "type": "guide"
                }
            ]
        }
    
    def _generate_action_items(self, recommendations: List[PricingRecommendation], opportunities: List[OptimizationOpportunity]) -> List[Dict[str, Any]]:
        """Generate actionable items"""
        action_items = []
        
        for rec in recommendations:
            action_items.append({
                "id": f"rec_{len(action_items)}",
                "title": f"Implement {rec.type} pricing recommendation",
                "description": rec.reasoning,
                "priority": "high" if rec.type in ["increase", "decrease"] else "medium",
                "category": "pricing",
                "estimated_impact": rec.expected_impact.get("revenue_change", 0),
                "time_to_implement": rec.timeline,
                "completed": False
            })
        
        for opp in opportunities:
            action_items.append({
                "id": f"opp_{len(action_items)}",
                "title": f"Implement {opp.type} optimization",
                "description": opp.description,
                "priority": opp.priority,
                "category": opp.type,
                "estimated_impact": opp.expected_revenue,
                "time_to_implement": opp.timeframe,
                "completed": False
            })
        
        return action_items

# API Endpoints
@router.post("/validate", response_model=PricingValidationResponse)
async def validate_pricing(
    request: PricingValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validate pricing against 6FB methodology and generate recommendations.
    
    This endpoint provides comprehensive pricing validation including:
    - 6FB methodology alignment scoring
    - Pricing recommendations based on tier and market
    - Optimization opportunities
    - Educational content and action items
    """
    service = PricingValidationService(db)
    return service.validate_pricing(request)

@router.get("/benchmarks", response_model=List[Dict[str, Any]])
async def get_pricing_benchmarks(
    category: Optional[str] = Query(None, description="Filter by service category"),
    tier: Optional[SixFBTier] = Query(None, description="Filter by 6FB tier"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get 6FB pricing benchmarks for reference.
    
    Returns benchmark data for different service categories and tiers
    to help with pricing decisions.
    """
    service = PricingValidationService(db)
    benchmarks = service._get_6fb_benchmarks()
    
    # Apply filters
    if category:
        benchmarks = [b for b in benchmarks if b.get('category', '').lower() == category.lower()]
    
    if tier:
        benchmarks = [b for b in benchmarks if b.get('six_fb_tier') == tier.value]
    
    return benchmarks

@router.post("/apply-recommendation")
async def apply_pricing_recommendation(
    update: ServicePricingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Apply a pricing recommendation to a service.
    
    Updates service pricing based on validation recommendations
    and tracks implementation.
    """
    # Get the service
    service = db.query(Service).filter(
        Service.id == update.service_id,
        Service.created_by_id == current_user.id
    ).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Update pricing
    old_price = service.base_price
    service.base_price = update.new_price
    service.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Pricing updated successfully",
        "service_id": service.id,
        "old_price": old_price,
        "new_price": update.new_price,
        "recommendation_id": update.recommendation_id,
        "updated_at": service.updated_at
    }

@router.get("/dashboard", response_model=PricingDashboardData)
async def get_pricing_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get pricing dashboard data for the current user.
    
    Returns comprehensive pricing analytics including:
    - Service pricing distribution
    - Validation summaries
    - Optimization opportunities
    - Performance metrics
    """
    # Get user's services
    services = db.query(Service).filter(
        Service.created_by_id == current_user.id,
        Service.is_active == True
    ).all()
    
    if not services:
        return PricingDashboardData(
            overview={
                "total_services": 0,
                "average_price": 0,
                "average_margin": 0,
                "six_fb_alignment_score": 0,
                "revenue_optimization_score": 0
            },
            price_distribution=[],
            validation_summary={"valid": 0, "warnings": 0, "errors": 0, "needs_optimization": 0},
            top_opportunities=[],
            performance_metrics={"revenue_per_service": 0, "booking_conversion_rate": 0, "client_retention_rate": 0, "average_client_value": 0}
        )
    
    # Calculate metrics
    total_services = len(services)
    average_price = sum(s.base_price for s in services) / total_services
    
    # Mock data for demonstration
    return PricingDashboardData(
        overview={
            "total_services": total_services,
            "average_price": average_price,
            "average_margin": 72.5,
            "six_fb_alignment_score": 84,
            "revenue_optimization_score": 78
        },
        price_distribution=[
            {"tier": "starter", "count": 3, "average_price": 32.50, "revenue": 1950},
            {"tier": "professional", "count": 4, "average_price": 65.00, "revenue": 5200},
            {"tier": "premium", "count": 2, "average_price": 95.00, "revenue": 1900}
        ],
        validation_summary={"valid": 6, "warnings": 2, "errors": 1, "needs_optimization": 3},
        top_opportunities=[
            OptimizationOpportunity(
                type="pricing",
                priority="high",
                description="Optimize pricing alignment with 6FB methodology",
                implementation="Review and adjust pricing based on validation results",
                expected_revenue=200,
                effort_level="medium",
                timeframe="4-6 weeks"
            )
        ],
        performance_metrics={
            "revenue_per_service": average_price,
            "booking_conversion_rate": 78.5,
            "client_retention_rate": 85.2,
            "average_client_value": 145.30
        }
    )

@router.post("/bulk-validate")
async def bulk_validate_pricing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validate pricing for all user's services in bulk.
    
    Useful for getting an overview of pricing validation status
    across all services.
    """
    # Get user's services
    services = db.query(Service).filter(
        Service.created_by_id == current_user.id,
        Service.is_active == True
    ).all()
    
    if not services:
        return {"message": "No services found", "validations": []}
    
    validation_service = PricingValidationService(db)
    results = []
    
    for service in services:
        try:
            request = PricingValidationRequest(
                service_name=service.name,
                category=service.category.value,
                base_price=service.base_price,
                duration=service.duration_minutes,
                min_price=service.min_price,
                max_price=service.max_price,
                is_package=service.is_package,
                include_recommendations=False,
                include_market_analysis=False
            )
            
            validation = validation_service.validate_pricing(request)
            results.append({
                "service_id": service.id,
                "service_name": service.name,
                "validation": validation.quick_validation
            })
            
        except Exception as e:
            results.append({
                "service_id": service.id,
                "service_name": service.name,
                "error": str(e)
            })
    
    return {"validations": results}