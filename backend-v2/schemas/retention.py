"""
Client Retention Response Schemas - V2 API
==========================================

Pydantic schemas for the AI-Powered Client Retention System V2 API responses.
These schemas define the structure of churn prediction and retention data
returned to the frontend for the Six Figure Barber retention features.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from services.churn_prediction_service import (
    ChurnPrediction, 
    ChurnAnalysis, 
    ChurnRiskLevel
)
from services.client_retention_service import (
    RetentionMetrics,
    RetentionCampaign,
    RetentionCampaignType,
    RetentionCampaignStatus
)


class ChurnRiskLevelResponse(str, Enum):
    """Churn risk levels for API responses"""
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"


class RetentionCampaignTypeResponse(str, Enum):
    """Retention campaign types for API responses"""
    IMMEDIATE_INTERVENTION = "immediate_intervention"
    PROACTIVE_OUTREACH = "proactive_outreach"
    WELLNESS_CHECK = "wellness_check"
    WIN_BACK = "win_back"
    LOYALTY_REWARD = "loyalty_reward"


class RetentionCampaignStatusResponse(str, Enum):
    """Retention campaign status for API responses"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ChurnPredictionResponse(BaseModel):
    """Churn prediction response for individual clients"""
    
    client_id: int = Field(..., description="Client identifier")
    client_name: str = Field(..., description="Client name")
    churn_risk_score: float = Field(..., description="Churn risk score (0-100)")
    risk_level: ChurnRiskLevelResponse = Field(..., description="Risk level classification")
    churn_probability: float = Field(..., description="Churn probability (0-1)")
    predicted_churn_date: Optional[datetime] = Field(None, description="Predicted churn date")
    
    # Behavioral indicators
    booking_frequency_trend: str = Field(..., description="Booking frequency trend")
    last_booking_days_ago: int = Field(..., description="Days since last booking")
    avg_days_between_bookings: float = Field(..., description="Average days between bookings")
    recent_no_show_rate: float = Field(..., description="Recent no-show rate")
    recent_cancellation_rate: float = Field(..., description="Recent cancellation rate")
    
    # Financial indicators
    spending_trend: str = Field(..., description="Spending trend")
    average_ticket_trend: float = Field(..., description="Average ticket change percentage")
    payment_delay_trend: float = Field(..., description="Payment delay trend")
    lifetime_value: float = Field(..., description="Client lifetime value")
    
    # Engagement indicators
    response_rate_to_communications: float = Field(..., description="Communication response rate")
    service_variety_score: float = Field(..., description="Service variety engagement")
    loyalty_program_engagement: float = Field(..., description="Loyalty program engagement")
    
    # Risk assessment
    primary_risk_factors: List[str] = Field(default_factory=list, description="Primary risk factors")
    intervention_recommendations: List[str] = Field(default_factory=list, description="Intervention recommendations")
    estimated_revenue_at_risk: float = Field(..., description="Revenue at risk from churn")
    
    # Confidence metrics
    prediction_confidence: float = Field(..., description="Prediction confidence (0-1)")
    data_quality_score: float = Field(..., description="Data quality score (0-1)")
    
    created_at: datetime = Field(..., description="Prediction creation date")
    expires_at: datetime = Field(..., description="Prediction expiry date")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_prediction(cls, prediction: ChurnPrediction) -> "ChurnPredictionResponse":
        """Convert ChurnPrediction service object to API response"""
        return cls(
            client_id=prediction.client_id,
            client_name=prediction.client_name,
            churn_risk_score=prediction.churn_risk_score,
            risk_level=ChurnRiskLevelResponse(prediction.risk_level.value),
            churn_probability=prediction.churn_probability,
            predicted_churn_date=prediction.predicted_churn_date,
            
            booking_frequency_trend=prediction.booking_frequency_trend,
            last_booking_days_ago=prediction.last_booking_days_ago,
            avg_days_between_bookings=prediction.avg_days_between_bookings,
            recent_no_show_rate=prediction.recent_no_show_rate,
            recent_cancellation_rate=prediction.recent_cancellation_rate,
            
            spending_trend=prediction.spending_trend,
            average_ticket_trend=prediction.average_ticket_trend,
            payment_delay_trend=prediction.payment_delay_trend,
            lifetime_value=prediction.lifetime_value,
            
            response_rate_to_communications=prediction.response_rate_to_communications,
            service_variety_score=prediction.service_variety_score,
            loyalty_program_engagement=prediction.loyalty_program_engagement,
            
            primary_risk_factors=prediction.primary_risk_factors,
            intervention_recommendations=prediction.intervention_recommendations,
            estimated_revenue_at_risk=prediction.estimated_revenue_at_risk,
            
            prediction_confidence=prediction.prediction_confidence,
            data_quality_score=prediction.data_quality_score,
            
            created_at=prediction.created_at,
            expires_at=prediction.expires_at
        )


class ChurnAnalysisResponse(BaseModel):
    """Churn analysis response for entire client base"""
    
    total_clients_analyzed: int = Field(..., description="Total clients analyzed")
    high_risk_client_count: int = Field(..., description="Number of high-risk clients")
    critical_risk_client_count: int = Field(..., description="Number of critical-risk clients")
    total_revenue_at_risk: float = Field(..., description="Total revenue at risk")
    average_churn_risk_score: float = Field(..., description="Average churn risk score")
    
    churn_risk_trend: str = Field(..., description="Overall churn risk trend")
    predicted_monthly_churn_rate: float = Field(..., description="Predicted monthly churn rate")
    estimated_monthly_revenue_loss: float = Field(..., description="Estimated monthly revenue loss")
    
    top_risk_factors: List[Dict[str, Any]] = Field(default_factory=list, description="Top risk factors")
    retention_opportunities: List[Dict[str, Any]] = Field(default_factory=list, description="Retention opportunities")
    
    analysis_period_days: int = Field(..., description="Analysis period in days")
    analysis_date: datetime = Field(..., description="Analysis date")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_analysis(cls, analysis: ChurnAnalysis) -> "ChurnAnalysisResponse":
        """Convert ChurnAnalysis service object to API response"""
        return cls(
            total_clients_analyzed=analysis.total_clients_analyzed,
            high_risk_client_count=analysis.high_risk_client_count,
            critical_risk_client_count=analysis.critical_risk_client_count,
            total_revenue_at_risk=analysis.total_revenue_at_risk,
            average_churn_risk_score=analysis.average_churn_risk_score,
            
            churn_risk_trend=analysis.churn_risk_trend,
            predicted_monthly_churn_rate=analysis.predicted_monthly_churn_rate,
            estimated_monthly_revenue_loss=analysis.estimated_monthly_revenue_loss,
            
            top_risk_factors=analysis.top_risk_factors,
            retention_opportunities=analysis.retention_opportunities,
            
            analysis_period_days=analysis.analysis_period_days,
            analysis_date=analysis.analysis_date
        )


class RetentionMetricsResponse(BaseModel):
    """Retention performance metrics response"""
    
    total_clients_monitored: int = Field(..., description="Total clients monitored")
    clients_at_risk: int = Field(..., description="Clients at risk count")
    campaigns_sent: int = Field(..., description="Campaigns sent count")
    successful_interventions: int = Field(..., description="Successful interventions count")
    revenue_saved: float = Field(..., description="Revenue saved through retention")
    campaign_costs: float = Field(..., description="Total campaign costs")
    roi_percentage: float = Field(..., description="Return on investment percentage")
    
    critical_risk_success_rate: float = Field(..., description="Critical risk intervention success rate")
    high_risk_success_rate: float = Field(..., description="High risk intervention success rate")
    medium_risk_success_rate: float = Field(..., description="Medium risk intervention success rate")
    
    churn_rate_trend: str = Field(..., description="Churn rate trend")
    retention_rate_improvement: float = Field(..., description="Retention rate improvement")
    
    period_start: datetime = Field(..., description="Analysis period start")
    period_end: datetime = Field(..., description="Analysis period end")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_metrics(cls, metrics: RetentionMetrics) -> "RetentionMetricsResponse":
        """Convert RetentionMetrics service object to API response"""
        return cls(
            total_clients_monitored=metrics.total_clients_monitored,
            clients_at_risk=metrics.clients_at_risk,
            campaigns_sent=metrics.campaigns_sent,
            successful_interventions=metrics.successful_interventions,
            revenue_saved=metrics.revenue_saved,
            campaign_costs=metrics.campaign_costs,
            roi_percentage=metrics.roi_percentage,
            
            critical_risk_success_rate=metrics.critical_risk_success_rate,
            high_risk_success_rate=metrics.high_risk_success_rate,
            medium_risk_success_rate=metrics.medium_risk_success_rate,
            
            churn_rate_trend=metrics.churn_rate_trend,
            retention_rate_improvement=metrics.retention_rate_improvement,
            
            period_start=metrics.period_start,
            period_end=metrics.period_end
        )


class RetentionCampaignResponse(BaseModel):
    """Retention campaign response"""
    
    campaign_id: str = Field(..., description="Campaign identifier")
    client_id: int = Field(..., description="Client identifier")
    client_name: str = Field(..., description="Client name")
    campaign_type: RetentionCampaignTypeResponse = Field(..., description="Campaign type")
    status: RetentionCampaignStatusResponse = Field(..., description="Campaign status")
    churn_risk_score: float = Field(..., description="Client churn risk score")
    estimated_revenue_at_risk: float = Field(..., description="Revenue at risk")
    
    message_template: str = Field(..., description="Campaign message template")
    offer_details: Optional[Dict[str, Any]] = Field(None, description="Offer details")
    channel: str = Field(..., description="Communication channel")
    
    created_at: datetime = Field(..., description="Campaign creation date")
    scheduled_at: datetime = Field(..., description="Campaign scheduled date")
    sent_at: Optional[datetime] = Field(None, description="Campaign sent date")
    expires_at: datetime = Field(..., description="Campaign expiry date")
    
    opened: bool = Field(default=False, description="Campaign opened status")
    clicked: bool = Field(default=False, description="Campaign clicked status")
    responded: bool = Field(default=False, description="Campaign responded status")
    booked_appointment: bool = Field(default=False, description="Appointment booked status")
    campaign_success: bool = Field(default=False, description="Campaign success status")
    
    campaign_cost: float = Field(default=0.0, description="Campaign cost")
    revenue_recovered: float = Field(default=0.0, description="Revenue recovered")
    roi_percentage: float = Field(default=0.0, description="Campaign ROI percentage")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_campaign(cls, campaign: RetentionCampaign) -> "RetentionCampaignResponse":
        """Convert RetentionCampaign service object to API response"""
        return cls(
            campaign_id=campaign.campaign_id,
            client_id=campaign.client_id,
            client_name=campaign.client_name,
            campaign_type=RetentionCampaignTypeResponse(campaign.campaign_type.value),
            status=RetentionCampaignStatusResponse(campaign.status.value),
            churn_risk_score=campaign.churn_risk_score,
            estimated_revenue_at_risk=campaign.estimated_revenue_at_risk,
            
            message_template=campaign.message_template,
            offer_details=campaign.offer_details,
            channel=campaign.channel,
            
            created_at=campaign.created_at,
            scheduled_at=campaign.scheduled_at,
            sent_at=campaign.sent_at,
            expires_at=campaign.expires_at,
            
            opened=campaign.opened,
            clicked=campaign.clicked,
            responded=campaign.responded,
            booked_appointment=campaign.booked_appointment,
            campaign_success=campaign.campaign_success,
            
            campaign_cost=campaign.campaign_cost,
            revenue_recovered=campaign.revenue_recovered,
            roi_percentage=campaign.roi_percentage
        )


class RetentionDashboardResponse(BaseModel):
    """Retention dashboard response with comprehensive analytics"""
    
    overview: Dict[str, Any] = Field(..., description="Dashboard overview metrics")
    risk_breakdown: Dict[str, Any] = Field(..., description="Risk level breakdown")
    performance_metrics: Dict[str, Any] = Field(..., description="Performance metrics")
    top_risk_clients: List[Dict[str, Any]] = Field(default_factory=list, description="Top risk clients")
    retention_opportunities: List[Dict[str, Any]] = Field(default_factory=list, description="Retention opportunities")
    six_figure_impact: Dict[str, Any] = Field(..., description="Six Figure methodology impact")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_dashboard_data(cls, data: Dict[str, Any]) -> "RetentionDashboardResponse":
        """Convert dashboard data dictionary to API response"""
        return cls(
            overview=data.get("overview", {}),
            risk_breakdown=data.get("risk_breakdown", {}),
            performance_metrics=data.get("performance_metrics", {}),
            top_risk_clients=data.get("top_risk_clients", []),
            retention_opportunities=data.get("retention_opportunities", []),
            six_figure_impact=data.get("six_figure_impact", {})
        )


class ChurnRiskAssessmentRequest(BaseModel):
    """Request schema for on-demand churn risk assessment"""
    
    client_id: int = Field(..., description="Client to assess")
    analysis_period_days: int = Field(90, ge=30, le=365, description="Days of data to analyze")
    
    class Config:
        from_attributes = True


class RetentionCampaignRequest(BaseModel):
    """Request schema for creating retention campaigns"""
    
    client_ids: List[int] = Field(..., description="Clients to target")
    campaign_type: RetentionCampaignTypeResponse = Field(..., description="Campaign type")
    custom_message: Optional[str] = Field(None, description="Custom campaign message")
    offer_override: Optional[Dict[str, Any]] = Field(None, description="Custom offer details")
    
    class Config:
        from_attributes = True


class RetentionInsightsResponse(BaseModel):
    """Retention insights and recommendations response"""
    
    priority_actions: List[str] = Field(..., description="Priority action items")
    retention_strategies: List[str] = Field(..., description="Recommended retention strategies")
    performance_benchmarks: Dict[str, str] = Field(..., description="Performance benchmarks")
    six_figure_impact: Dict[str, str] = Field(..., description="Six Figure methodology impact")
    next_steps: List[str] = Field(..., description="Recommended next steps")
    
    class Config:
        from_attributes = True