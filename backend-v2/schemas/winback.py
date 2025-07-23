"""
Win-Back Automation Response Schemas - V2 API
==============================================

Pydantic schemas for the Win-Back Automation V2 API responses.
These schemas define the structure of win-back sequences, performance analytics,
and configuration data returned to the frontend for Six Figure Barber intelligence.
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from services.winback_automation_service import (
    WinBackSequence,
    WinBackStageAction,
    WinBackPerformance,
    WinBackStage,
    WinBackTrigger,
    SequenceStatus
)
from services.client_tier_service import ClientTier


class WinBackStageResponse(str, Enum):
    """Win-back sequence stages for API responses"""
    GENTLE_REMINDER = "gentle_reminder"
    VALUE_PROPOSITION = "value_proposition"
    SPECIAL_OFFER = "special_offer"
    FINAL_ATTEMPT = "final_attempt"
    DORMANT_ARCHIVE = "dormant_archive"


class WinBackTriggerResponse(str, Enum):
    """Win-back triggers for API responses"""
    DAYS_INACTIVE = "days_inactive"
    MISSED_REGULAR_APPOINTMENT = "missed_regular"
    DECLINED_RECENT_OFFERS = "declined_offers"
    SEASONAL_REACTIVATION = "seasonal"
    COMPETITOR_RISK = "competitor_risk"
    LIFECYCLE_TRANSITION = "lifecycle"


class SequenceStatusResponse(str, Enum):
    """Sequence status for API responses"""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED_SUCCESS = "completed_success"
    COMPLETED_FAILURE = "completed_failure"
    CANCELLED = "cancelled"


class ClientTierResponse(str, Enum):
    """Client tiers for API responses"""
    NEW = "new"
    REGULAR = "regular"
    PREMIUM = "premium"
    VIP = "vip"


class WinBackSequenceResponse(BaseModel):
    """Win-back sequence response for monitoring and management"""
    
    sequence_id: str = Field(..., description="Unique sequence identifier")
    client_id: int = Field(..., description="Client identifier")
    client_name: str = Field(..., description="Client name")
    trigger: WinBackTriggerResponse = Field(..., description="Trigger that started sequence")
    current_stage: WinBackStageResponse = Field(..., description="Current sequence stage")
    status: SequenceStatusResponse = Field(..., description="Sequence status")
    
    # Sequence configuration
    total_stages: int = Field(..., description="Total stages in sequence")
    current_stage_number: int = Field(..., description="Current stage number")
    days_between_stages: int = Field(..., description="Days between stages")
    
    # Client context
    client_tier: ClientTierResponse = Field(..., description="Client tier")
    days_dormant: int = Field(..., description="Days since last booking")
    last_booking_date: datetime = Field(..., description="Last booking date")
    lifetime_value: float = Field(..., description="Client lifetime value")
    historical_booking_frequency: float = Field(..., description="Historical booking frequency")
    
    # Sequence tracking
    started_at: datetime = Field(..., description="Sequence start timestamp")
    next_action_at: datetime = Field(..., description="Next action timestamp")
    last_contact_at: Optional[datetime] = Field(None, description="Last contact timestamp")
    
    # Performance metrics
    stages_completed: int = Field(..., description="Stages completed")
    emails_sent: int = Field(..., description="Emails sent")
    emails_opened: int = Field(..., description="Emails opened")
    offers_generated: int = Field(..., description="Offers generated")
    offers_redeemed: int = Field(..., description="Offers redeemed")
    sequence_cost: float = Field(..., description="Total sequence cost")
    
    # Success indicators
    reactivated: bool = Field(..., description="Client reactivated")
    reactivation_date: Optional[datetime] = Field(None, description="Reactivation date")
    reactivation_revenue: float = Field(..., description="Reactivation revenue")
    sequence_roi: float = Field(..., description="Sequence ROI")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_sequence(cls, sequence: WinBackSequence) -> "WinBackSequenceResponse":
        """Convert WinBackSequence service object to API response"""
        return cls(
            sequence_id=sequence.sequence_id,
            client_id=sequence.client_id,
            client_name=sequence.client_name,
            trigger=WinBackTriggerResponse(sequence.trigger.value),
            current_stage=WinBackStageResponse(sequence.current_stage.value),
            status=SequenceStatusResponse(sequence.status.value),
            
            total_stages=sequence.total_stages,
            current_stage_number=sequence.current_stage_number,
            days_between_stages=sequence.days_between_stages,
            
            client_tier=ClientTierResponse(sequence.client_tier.value),
            days_dormant=sequence.days_dormant,
            last_booking_date=sequence.last_booking_date,
            lifetime_value=sequence.lifetime_value,
            historical_booking_frequency=sequence.historical_booking_frequency,
            
            started_at=sequence.started_at,
            next_action_at=sequence.next_action_at,
            last_contact_at=sequence.last_contact_at,
            
            stages_completed=sequence.stages_completed,
            emails_sent=sequence.emails_sent,
            emails_opened=sequence.emails_opened,
            offers_generated=sequence.offers_generated,
            offers_redeemed=sequence.offers_redeemed,
            sequence_cost=sequence.sequence_cost,
            
            reactivated=sequence.reactivated,
            reactivation_date=sequence.reactivation_date,
            reactivation_revenue=sequence.reactivation_revenue,
            sequence_roi=sequence.sequence_roi
        )


class WinBackStageActionResponse(BaseModel):
    """Win-back stage action response for detailed monitoring"""
    
    action_id: str = Field(..., description="Action identifier")
    sequence_id: str = Field(..., description="Parent sequence identifier")
    stage: WinBackStageResponse = Field(..., description="Action stage")
    stage_number: int = Field(..., description="Stage number")
    
    # Action configuration
    action_type: str = Field(..., description="Action type (email, sms, offer)")
    channel: str = Field(..., description="Communication channel")
    delay_days: int = Field(..., description="Delay from previous action")
    
    # Content
    message_template: str = Field(..., description="Message template")
    subject_template: Optional[str] = Field(None, description="Subject template")
    personalization_level: str = Field(..., description="Personalization level")
    
    # Action tracking
    scheduled_at: datetime = Field(..., description="Scheduled execution time")
    executed_at: Optional[datetime] = Field(None, description="Actual execution time")
    success: bool = Field(..., description="Execution success")
    
    # Results
    opened: bool = Field(default=False, description="Message opened")
    clicked: bool = Field(default=False, description="Links clicked")
    responded: bool = Field(default=False, description="Client responded")
    cost: float = Field(default=0.0, description="Action cost")
    
    class Config:
        from_attributes = True


class WinBackPerformanceResponse(BaseModel):
    """Win-back performance analytics response"""
    
    total_sequences_started: int = Field(..., description="Total sequences started")
    total_sequences_completed: int = Field(..., description="Total sequences completed")
    overall_success_rate: float = Field(..., description="Overall success rate")
    average_sequence_duration_days: float = Field(..., description="Average sequence duration")
    
    # Stage performance
    stage_completion_rates: Dict[str, float] = Field(default_factory=dict, description="Stage completion rates")
    stage_success_rates: Dict[str, float] = Field(default_factory=dict, description="Stage success rates")
    optimal_timing_by_stage: Dict[str, int] = Field(default_factory=dict, description="Optimal timing by stage")
    
    # Financial metrics
    total_cost: float = Field(..., description="Total campaign cost")
    total_revenue_recovered: float = Field(..., description="Total revenue recovered")
    average_recovery_value: float = Field(..., description="Average recovery value")
    roi_percentage: float = Field(..., description="ROI percentage")
    
    # Client segment analysis
    performance_by_tier: Dict[str, Dict[str, float]] = Field(default_factory=dict, description="Performance by tier")
    performance_by_dormancy_period: Dict[str, Dict[str, float]] = Field(default_factory=dict, description="Performance by dormancy")
    
    # Optimization insights
    best_performing_triggers: List[str] = Field(default_factory=list, description="Best performing triggers")
    optimal_sequence_length: int = Field(..., description="Optimal sequence length")
    improvement_recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_performance(cls, performance: WinBackPerformance) -> "WinBackPerformanceResponse":
        """Convert WinBackPerformance service object to API response"""
        return cls(
            total_sequences_started=performance.total_sequences_started,
            total_sequences_completed=performance.total_sequences_completed,
            overall_success_rate=performance.overall_success_rate,
            average_sequence_duration_days=performance.average_sequence_duration_days,
            
            stage_completion_rates={
                stage.value: rate for stage, rate in performance.stage_completion_rates.items()
            },
            stage_success_rates={
                stage.value: rate for stage, rate in performance.stage_success_rates.items()
            },
            optimal_timing_by_stage={
                stage.value: timing for stage, timing in performance.optimal_timing_by_stage.items()
            },
            
            total_cost=performance.total_cost,
            total_revenue_recovered=performance.total_revenue_recovered,
            average_recovery_value=performance.average_recovery_value,
            roi_percentage=performance.roi_percentage,
            
            performance_by_tier={
                tier.value: metrics for tier, metrics in performance.performance_by_tier.items()
            },
            performance_by_dormancy_period=performance.performance_by_dormancy_period,
            
            best_performing_triggers=performance.best_performing_triggers,
            optimal_sequence_length=performance.optimal_sequence_length,
            improvement_recommendations=performance.improvement_recommendations
        )


class WinBackAnalyticsResponse(BaseModel):
    """Comprehensive win-back analytics response"""
    
    # Overview metrics
    sequences_triggered_today: int = Field(..., description="Sequences triggered today")
    active_sequences_count: int = Field(..., description="Currently active sequences")
    clients_at_risk: int = Field(..., description="Clients at churn risk")
    projected_monthly_recovery: float = Field(..., description="Projected monthly recovery revenue")
    
    # Performance trends
    success_rate_trend: List[float] = Field(default_factory=list, description="Weekly success rate trend")
    recovery_revenue_trend: List[float] = Field(default_factory=list, description="Monthly recovery revenue trend")
    
    # Six Figure methodology impact
    six_figure_alignment_metrics: Dict[str, Any] = Field(default_factory=dict, description="Six Figure methodology metrics")
    
    # Actionable insights
    high_priority_clients: List[Dict[str, Any]] = Field(default_factory=list, description="High priority clients")
    optimization_opportunities: List[str] = Field(default_factory=list, description="Optimization opportunities")
    
    class Config:
        from_attributes = True


class WinBackSequenceConfigurationResponse(BaseModel):
    """Win-back sequence configuration response"""
    
    # Available configurations
    sequence_templates: Dict[str, Any] = Field(default_factory=dict, description="Available sequence templates")
    trigger_configurations: Dict[str, Any] = Field(default_factory=dict, description="Trigger configurations")
    
    # Business rules
    six_figure_principles: Dict[str, Any] = Field(default_factory=dict, description="Six Figure principles")
    timing_rules: Dict[str, Any] = Field(default_factory=dict, description="Timing rules")
    
    # Personalization settings
    personalization_factors: List[str] = Field(default_factory=list, description="Personalization factors")
    messaging_templates: Dict[str, List[str]] = Field(default_factory=dict, description="Messaging templates")
    
    class Config:
        from_attributes = True


# Request schemas

class WinBackTriggerDetectionRequest(BaseModel):
    """Request schema for win-back trigger detection"""
    
    client_ids: Optional[List[int]] = Field(None, description="Specific clients to check")
    force_detection: bool = Field(False, description="Force detection even if recently checked")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for detection")
    
    class Config:
        from_attributes = True


class WinBackSequenceUpdateRequest(BaseModel):
    """Request schema for updating win-back sequence"""
    
    status: Optional[SequenceStatusResponse] = Field(None, description="New sequence status")
    notes: Optional[str] = Field(None, description="Update notes")
    
    class Config:
        from_attributes = True


class WinBackConfigurationUpdateRequest(BaseModel):
    """Request schema for updating win-back configuration"""
    
    trigger_rules: Optional[Dict[str, Any]] = Field(None, description="Updated trigger rules")
    sequence_settings: Optional[Dict[str, Any]] = Field(None, description="Updated sequence settings")
    six_figure_principles: Optional[Dict[str, Any]] = Field(None, description="Updated Six Figure principles")
    
    class Config:
        from_attributes = True