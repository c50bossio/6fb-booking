"""
Dynamic Offer Generation Response Schemas - V2 API
==================================================

Pydantic schemas for the Dynamic Offer Generation V2 API responses.
These schemas define the structure of personalized offers, templates,
and analytics data returned to the frontend for Six Figure Barber intelligence.
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from services.dynamic_offer_service import (
    PersonalizedOffer,
    OfferTemplate,
    OfferPerformance,
    OfferType,
    OfferCategory,
    OfferUrgency
)
from services.client_tier_service import ClientTier


class OfferTypeResponse(str, Enum):
    """Offer types for API responses"""
    DISCOUNT_PERCENTAGE = "discount_percentage"
    DISCOUNT_FIXED = "discount_fixed"
    SERVICE_UPGRADE = "service_upgrade"
    EXPERIENCE_ENHANCEMENT = "experience_enhancement"
    PACKAGE_DEAL = "package_deal"
    MEMBERSHIP_OFFER = "membership_offer"
    LOYALTY_BONUS = "loyalty_bonus"
    EXCLUSIVE_ACCESS = "exclusive_access"
    REFERRAL_INCENTIVE = "referral_incentive"
    COMEBACK_SPECIAL = "comeback_special"


class OfferCategoryResponse(str, Enum):
    """Offer categories for API responses"""
    VALUE_ENHANCEMENT = "value_enhancement"
    RELATIONSHIP_BUILDING = "relationship_building"
    REVENUE_OPTIMIZATION = "revenue_optimization"
    RETENTION_RESCUE = "retention_rescue"
    GROWTH_ACCELERATION = "growth_acceleration"


class OfferUrgencyResponse(str, Enum):
    """Offer urgency levels for API responses"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ClientTierResponse(str, Enum):
    """Client tiers for API responses"""
    NEW = "new"
    REGULAR = "regular"
    PREMIUM = "premium"
    VIP = "vip"


class PersonalizedOfferResponse(BaseModel):
    """Personalized offer response for individual clients"""
    
    offer_id: str = Field(..., description="Unique offer identifier")
    client_id: int = Field(..., description="Client identifier")
    client_name: str = Field(..., description="Client name")
    template_id: str = Field(..., description="Template used for this offer")
    
    # Offer classification
    offer_type: OfferTypeResponse = Field(..., description="Type of offer")
    offer_category: OfferCategoryResponse = Field(..., description="Offer category")
    urgency_level: OfferUrgencyResponse = Field(..., description="Urgency level")
    
    # Offer content
    offer_title: str = Field(..., description="Offer title")
    offer_description: str = Field(..., description="Detailed offer description")
    personalized_message: str = Field(..., description="Personalized message for client")
    call_to_action: str = Field(..., description="Call to action text")
    
    # Value proposition
    value_amount: float = Field(..., description="Offer value amount")
    savings_amount: float = Field(..., description="Amount client saves")
    revenue_impact: float = Field(..., description="Expected revenue impact")
    
    # Client context
    churn_risk_score: float = Field(..., description="Client churn risk score")
    client_clv: float = Field(..., description="Client lifetime value")
    client_tier: ClientTierResponse = Field(..., description="Client tier")
    days_since_last_booking: int = Field(..., description="Days since last booking")
    
    # Offer mechanics
    offer_code: str = Field(..., description="Unique offer redemption code")
    expires_at: datetime = Field(..., description="Offer expiration date")
    max_uses: int = Field(..., description="Maximum number of uses")
    
    # Tracking timestamps
    generated_at: datetime = Field(..., description="Offer generation timestamp")
    sent_at: Optional[datetime] = Field(None, description="Offer sent timestamp")
    opened_at: Optional[datetime] = Field(None, description="Offer opened timestamp")
    redeemed_at: Optional[datetime] = Field(None, description="Offer redeemed timestamp")
    
    # Quality metrics
    personalization_score: float = Field(..., description="Personalization quality score (0-1)")
    confidence_score: float = Field(..., description="Success confidence score (0-1)")
    
    # Six Figure methodology alignment
    six_figure_aligned: bool = Field(default=True, description="Aligns with Six Figure principles")
    methodology_score: int = Field(default=85, description="Six Figure methodology score (0-100)")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_offer(cls, offer: PersonalizedOffer) -> "PersonalizedOfferResponse":
        """Convert PersonalizedOffer service object to API response"""
        return cls(
            offer_id=offer.offer_id,
            client_id=offer.client_id,
            client_name=offer.client_name,
            template_id=offer.template_id,
            
            offer_type=OfferTypeResponse(offer.offer_type.value),
            offer_category=OfferCategoryResponse(offer.offer_category.value),
            urgency_level=OfferUrgencyResponse(offer.urgency_level.value),
            
            offer_title=offer.offer_title,
            offer_description=offer.offer_description,
            personalized_message=offer.personalized_message,
            call_to_action=offer.call_to_action,
            
            value_amount=offer.value_amount,
            savings_amount=offer.savings_amount,
            revenue_impact=offer.revenue_impact,
            
            churn_risk_score=offer.churn_risk_score,
            client_clv=offer.client_clv,
            client_tier=ClientTierResponse(offer.client_tier.value),
            days_since_last_booking=offer.days_since_last_booking,
            
            offer_code=offer.offer_code,
            expires_at=offer.expires_at,
            max_uses=offer.max_uses,
            
            generated_at=offer.generated_at,
            sent_at=offer.sent_at,
            opened_at=offer.opened_at,
            redeemed_at=offer.redeemed_at,
            
            personalization_score=offer.personalization_score,
            confidence_score=offer.confidence_score,
            
            six_figure_aligned=offer.offer_category != OfferCategory.RETENTION_RESCUE,
            methodology_score=int(offer.personalization_score * 100)
        )


class OfferTemplateResponse(BaseModel):
    """Offer template configuration response"""
    
    template_id: str = Field(..., description="Template identifier")
    template_name: str = Field(..., description="Template display name")
    offer_type: OfferTypeResponse = Field(..., description="Type of offer")
    offer_category: OfferCategoryResponse = Field(..., description="Offer category")
    urgency_level: OfferUrgencyResponse = Field(..., description="Default urgency level")
    
    # Template configuration
    value_amount: Optional[float] = Field(None, description="Base value amount")
    service_upgrades: List[str] = Field(default_factory=list, description="Service upgrades included")
    experience_enhancements: List[str] = Field(default_factory=list, description="Experience enhancements")
    
    # Business rules
    min_churn_risk: float = Field(..., description="Minimum churn risk to trigger")
    max_churn_risk: float = Field(..., description="Maximum churn risk to trigger")
    min_clv: Optional[float] = Field(None, description="Minimum CLV requirement")
    client_tiers: List[ClientTierResponse] = Field(..., description="Applicable client tiers")
    
    # Content templates
    offer_title: str = Field(..., description="Offer title template")
    offer_description: str = Field(..., description="Offer description template")
    call_to_action: str = Field(..., description="Call to action template")
    urgency_message: Optional[str] = Field(None, description="Urgency messaging")
    
    # Constraints
    max_uses_per_client: int = Field(..., description="Maximum uses per client")
    expiration_days: int = Field(..., description="Days until expiration")
    blackout_days: List[date] = Field(default_factory=list, description="Blackout dates")
    
    # Performance metrics
    conversion_rate: float = Field(..., description="Historical conversion rate")
    average_redemption_value: float = Field(..., description="Average redemption value")
    
    # Six Figure alignment
    six_figure_aligned: bool = Field(default=True, description="Aligns with Six Figure methodology")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_template(cls, template: OfferTemplate) -> "OfferTemplateResponse":
        """Convert OfferTemplate service object to API response"""
        return cls(
            template_id=template.template_id,
            template_name=template.template_name,
            offer_type=OfferTypeResponse(template.offer_type.value),
            offer_category=OfferCategoryResponse(template.offer_category.value),
            urgency_level=OfferUrgencyResponse(template.urgency_level.value),
            
            value_amount=template.value_amount,
            service_upgrades=template.service_upgrades,
            experience_enhancements=template.experience_enhancements,
            
            min_churn_risk=template.min_churn_risk,
            max_churn_risk=template.max_churn_risk,
            min_clv=template.min_clv,
            client_tiers=[ClientTierResponse(tier.value) for tier in template.client_tiers],
            
            offer_title=template.offer_title,
            offer_description=template.offer_description,
            call_to_action=template.call_to_action,
            urgency_message=template.urgency_message,
            
            max_uses_per_client=template.max_uses_per_client,
            expiration_days=template.expiration_days,
            blackout_days=template.blackout_days,
            
            conversion_rate=template.conversion_rate,
            average_redemption_value=template.average_redemption_value,
            
            six_figure_aligned=template.offer_category != OfferCategory.RETENTION_RESCUE
        )


class OfferPerformanceResponse(BaseModel):
    """Offer performance analytics response"""
    
    offer_template_id: str = Field(..., description="Template identifier")
    template_name: str = Field(..., description="Template display name")
    
    # Volume metrics
    total_generated: int = Field(..., description="Total offers generated")
    total_sent: int = Field(..., description="Total offers sent")
    total_opened: int = Field(..., description="Total offers opened")
    total_redeemed: int = Field(..., description="Total offers redeemed")
    
    # Rate metrics
    send_rate: float = Field(..., description="Send success rate")
    open_rate: float = Field(..., description="Open rate")
    redemption_rate: float = Field(..., description="Redemption rate")
    
    # Financial metrics
    total_revenue_generated: float = Field(..., description="Total revenue generated")
    average_redemption_value: float = Field(..., description="Average redemption value")
    total_cost: float = Field(..., description="Total campaign cost")
    roi_percentage: float = Field(..., description="Return on investment percentage")
    
    # Insights
    best_performing_segments: List[str] = Field(default_factory=list, description="Best performing segments")
    optimal_timing: str = Field(..., description="Optimal timing for this offer")
    improvement_recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")
    
    # Six Figure methodology assessment
    six_figure_alignment: Dict[str, Any] = Field(default_factory=dict, description="Six Figure methodology alignment")
    
    class Config:
        from_attributes = True


class OfferAnalyticsResponse(BaseModel):
    """Comprehensive offer analytics response"""
    
    # Overview metrics
    total_offers_generated: int = Field(..., description="Total offers generated")
    overall_redemption_rate: float = Field(..., description="Overall redemption rate")
    total_revenue_impact: float = Field(..., description="Total revenue impact")
    average_roi: float = Field(..., description="Average ROI across all offers")
    
    # Performance breakdown
    performance_by_category: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Performance by category")
    performance_by_client_tier: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Performance by client tier")
    
    # Top performers
    top_performing_templates: List[Dict[str, Any]] = Field(default_factory=list, description="Top performing templates")
    most_effective_segments: List[str] = Field(default_factory=list, description="Most effective client segments")
    
    # Six Figure methodology impact
    six_figure_impact: Dict[str, Any] = Field(default_factory=dict, description="Six Figure methodology impact")
    
    # Recommendations
    optimization_recommendations: List[str] = Field(default_factory=list, description="Optimization recommendations")
    
    class Config:
        from_attributes = True


class OfferConfigurationResponse(BaseModel):
    """Offer system configuration response"""
    
    # System settings
    six_figure_principles: Dict[str, Any] = Field(default_factory=dict, description="Six Figure methodology principles")
    business_rules: Dict[str, Any] = Field(default_factory=dict, description="Business rules and constraints")
    
    # Available options
    offer_types: List[Dict[str, str]] = Field(default_factory=list, description="Available offer types")
    offer_categories: List[Dict[str, str]] = Field(default_factory=list, description="Available offer categories")
    urgency_levels: List[Dict[str, str]] = Field(default_factory=list, description="Available urgency levels")
    
    # Personalization factors
    personalization_factors: List[str] = Field(default_factory=list, description="Personalization factors")
    
    # System status
    templates_count: int = Field(..., description="Number of active templates")
    active_rules_count: int = Field(..., description="Number of active business rules")
    
    class Config:
        from_attributes = True


# Request schemas

class OfferGenerationRequest(BaseModel):
    """Request schema for generating a personalized offer"""
    
    client_id: int = Field(..., description="Client to generate offer for")
    analysis_period_days: int = Field(90, ge=30, le=365, description="Days of data to analyze")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for offer generation")
    
    class Config:
        from_attributes = True


class OfferBatchRequest(BaseModel):
    """Request schema for generating batch offers"""
    
    client_ids: Optional[List[int]] = Field(None, description="Specific clients to generate offers for")
    min_risk_threshold: float = Field(60.0, ge=0.0, le=100.0, description="Minimum risk threshold for auto-selection")
    batch_size: int = Field(25, ge=1, le=100, description="Maximum offers to generate")
    analysis_period_days: int = Field(90, ge=30, le=365, description="Days of data to analyze")
    context: Optional[Dict[str, Any]] = Field(None, description="Business context for offer generation")
    
    class Config:
        from_attributes = True


class OfferRedemptionRequest(BaseModel):
    """Request schema for offer redemption"""
    
    offer_code: str = Field(..., description="Offer redemption code")
    client_id: int = Field(..., description="Client redeeming the offer")
    appointment_id: Optional[int] = Field(None, description="Associated appointment ID")
    redemption_notes: Optional[str] = Field(None, description="Additional redemption notes")
    
    class Config:
        from_attributes = True


class OfferTestRequest(BaseModel):
    """Request schema for A/B testing offers"""
    
    template_ids: List[str] = Field(..., description="Templates to test")
    client_segment: str = Field(..., description="Client segment for testing")
    test_duration_days: int = Field(14, ge=7, le=30, description="Test duration in days")
    success_metric: str = Field("redemption_rate", description="Primary success metric")
    
    class Config:
        from_attributes = True