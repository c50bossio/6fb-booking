"""
Real-time Business Intelligence Schemas - Executive Dashboard API
================================================================

Pydantic response schemas for the Real-time Business Intelligence API endpoints.
Provides comprehensive data models for executive dashboards, real-time KPI monitoring,
cross-system insights, and strategic decision support for Six Figure Barber practitioners.
"""

from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple, Union
from pydantic import BaseModel, Field
from enum import Enum

from services.realtime_business_intelligence_service import (
    DashboardScope,
    AlertSeverity,
    MetricTrend,
    RealTimeMetric,
    BusinessIntelligenceAlert,
    ExecutiveSummary,
    CrossSystemInsight,
    RealTimeBusinessIntelligence
)

class DashboardScopeEnum(str, Enum):
    """Dashboard scope enumeration"""
    EXECUTIVE_OVERVIEW = "executive_overview"
    REVENUE_PERFORMANCE = "revenue_performance"
    CLIENT_ANALYTICS = "client_analytics"
    OPERATIONAL_METRICS = "operational_metrics"
    STRATEGIC_PLANNING = "strategic_planning"
    GOAL_TRACKING = "goal_tracking"

class AlertSeverityEnum(str, Enum):
    """Alert severity enumeration"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class MetricTrendEnum(str, Enum):
    """Metric trend enumeration"""
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"
    VOLATILE = "volatile"

# Request Models

class DashboardRequest(BaseModel):
    """Request model for dashboard generation"""
    scope: Optional[DashboardScopeEnum] = Field(DashboardScopeEnum.EXECUTIVE_OVERVIEW, description="Dashboard focus area")
    refresh_data: Optional[bool] = Field(False, description="Force refresh of cached data")
    include_predictions: Optional[bool] = Field(True, description="Include predictive analytics")
    time_range: Optional[str] = Field("current_month", description="Time range for analysis")

class AlertFilterRequest(BaseModel):
    """Request model for filtering business intelligence alerts"""
    severity_levels: Optional[List[AlertSeverityEnum]] = Field(None, description="Filter by severity levels")
    source_systems: Optional[List[str]] = Field(None, description="Filter by source systems")
    max_alerts: Optional[int] = Field(50, ge=1, le=100, description="Maximum alerts to return")
    include_resolved: Optional[bool] = Field(False, description="Include resolved alerts")

# Response Models

class RealTimeMetricResponse(BaseModel):
    """Response model for individual real-time metrics"""
    metric_id: str
    metric_name: str
    current_value: float
    previous_value: float
    target_value: float
    
    # Trend analysis
    trend_direction: MetricTrendEnum
    trend_percentage: float
    trend_confidence: float
    
    # Context and metadata
    unit: str
    category: str
    update_frequency: str
    last_updated: datetime
    
    # Performance indicators
    performance_score: float
    is_on_track: bool
    days_to_target: Optional[int]
    
    # Six Figure methodology alignment
    methodology_impact: float
    strategic_importance: float
    
    # Alert status
    current_alert_level: Optional[AlertSeverityEnum]
    
    @classmethod
    def from_metric(cls, metric: RealTimeMetric) -> "RealTimeMetricResponse":
        """Convert service metric to response model"""
        return cls(
            metric_id=metric.metric_id,
            metric_name=metric.metric_name,
            current_value=metric.current_value,
            previous_value=metric.previous_value,
            target_value=metric.target_value,
            trend_direction=metric.trend_direction.value,
            trend_percentage=metric.trend_percentage,
            trend_confidence=metric.trend_confidence,
            unit=metric.unit,
            category=metric.category,
            update_frequency=metric.update_frequency,
            last_updated=metric.last_updated,
            performance_score=metric.performance_score,
            is_on_track=metric.is_on_track,
            days_to_target=metric.days_to_target,
            methodology_impact=metric.methodology_impact,
            strategic_importance=metric.strategic_importance,
            current_alert_level=metric.current_alert_level.value if metric.current_alert_level else None
        )

class BusinessIntelligenceAlertResponse(BaseModel):
    """Response model for business intelligence alerts"""
    alert_id: str
    alert_type: str
    severity: AlertSeverityEnum
    title: str
    description: str
    
    # Alert context
    affected_metrics: List[str]
    source_system: str
    trigger_conditions: Dict[str, Any]
    
    # Timeline
    triggered_at: datetime
    estimated_resolution_time: Optional[datetime]
    auto_resolve: bool
    
    # Actions
    recommended_actions: List[str]
    immediate_actions: List[str]
    assigned_priority: int
    
    # Business impact
    revenue_impact: Optional[float]
    client_impact: Optional[int]
    goal_impact: str
    
    @classmethod
    def from_alert(cls, alert: BusinessIntelligenceAlert) -> "BusinessIntelligenceAlertResponse":
        """Convert service alert to response model"""
        return cls(
            alert_id=alert.alert_id,
            alert_type=alert.alert_type,
            severity=alert.severity.value,
            title=alert.title,
            description=alert.description,
            affected_metrics=alert.affected_metrics,
            source_system=alert.source_system,
            trigger_conditions=alert.trigger_conditions,
            triggered_at=alert.triggered_at,
            estimated_resolution_time=alert.estimated_resolution_time,
            auto_resolve=alert.auto_resolve,
            recommended_actions=alert.recommended_actions,
            immediate_actions=alert.immediate_actions,
            assigned_priority=alert.assigned_priority,
            revenue_impact=alert.revenue_impact,
            client_impact=alert.client_impact,
            goal_impact=alert.goal_impact
        )

class ExecutiveSummaryResponse(BaseModel):
    """Response model for executive summary"""
    summary_period: str
    generated_at: datetime
    
    # Overall performance
    overall_health_score: float
    six_figure_progress: float
    monthly_revenue_status: str
    
    # Key achievements
    major_wins: List[str]
    key_milestones_reached: List[str]
    
    # Critical issues
    urgent_attention_items: List[str]
    strategic_risks: List[str]
    
    # Performance highlights
    top_performing_metrics: List[str]
    improvement_opportunities: List[str]
    
    # Forward-looking insights
    next_30_day_priorities: List[str]
    strategic_recommendations: List[str]
    
    # Six Figure methodology assessment
    methodology_compliance: float
    value_creation_score: float
    brand_positioning_strength: float
    
    @classmethod
    def from_summary(cls, summary: ExecutiveSummary) -> "ExecutiveSummaryResponse":
        """Convert service summary to response model"""
        return cls(
            summary_period=summary.summary_period,
            generated_at=summary.generated_at,
            overall_health_score=summary.overall_health_score,
            six_figure_progress=summary.six_figure_progress,
            monthly_revenue_status=summary.monthly_revenue_status,
            major_wins=summary.major_wins,
            key_milestones_reached=summary.key_milestones_reached,
            urgent_attention_items=summary.urgent_attention_items,
            strategic_risks=summary.strategic_risks,
            top_performing_metrics=summary.top_performing_metrics,
            improvement_opportunities=summary.improvement_opportunities,
            next_30_day_priorities=summary.next_30_day_priorities,
            strategic_recommendations=summary.strategic_recommendations,
            methodology_compliance=summary.methodology_compliance,
            value_creation_score=summary.value_creation_score,
            brand_positioning_strength=summary.brand_positioning_strength
        )

class CrossSystemInsightResponse(BaseModel):
    """Response model for cross-system insights"""
    insight_id: str
    insight_type: str
    confidence_score: float
    
    # Insight content
    title: str
    description: str
    supporting_data: Dict[str, Any]
    
    # Data sources
    contributing_systems: List[str]
    data_correlation_strength: float
    
    # Business implications
    potential_impact: float
    implementation_complexity: str
    estimated_roi: Optional[float]
    
    # Action recommendations
    recommended_actions: List[str]
    success_metrics: List[str]
    timeline_to_implement: str
    
    # Strategic alignment
    six_figure_alignment: float
    methodology_support: float
    
    @classmethod
    def from_insight(cls, insight: CrossSystemInsight) -> "CrossSystemInsightResponse":
        """Convert service insight to response model"""
        return cls(
            insight_id=insight.insight_id,
            insight_type=insight.insight_type,
            confidence_score=insight.confidence_score,
            title=insight.title,
            description=insight.description,
            supporting_data=insight.supporting_data,
            contributing_systems=insight.contributing_systems,
            data_correlation_strength=insight.data_correlation_strength,
            potential_impact=insight.potential_impact,
            implementation_complexity=insight.implementation_complexity,
            estimated_roi=insight.estimated_roi,
            recommended_actions=insight.recommended_actions,
            success_metrics=insight.success_metrics,
            timeline_to_implement=insight.timeline_to_implement,
            six_figure_alignment=insight.six_figure_alignment,
            methodology_support=insight.methodology_support
        )

class RealTimeBusinessIntelligenceResponse(BaseModel):
    """Response model for comprehensive real-time business intelligence dashboard"""
    dashboard_scope: DashboardScopeEnum
    generated_at: datetime
    data_freshness: str
    
    # Core metrics
    key_metrics: List[RealTimeMetricResponse]
    performance_indicators: Dict[str, float]
    trend_analysis: Dict[str, Any]
    
    # Alerts and notifications
    active_alerts: List[BusinessIntelligenceAlertResponse]
    alert_summary: Dict[str, int]
    
    # Executive insights
    executive_summary: ExecutiveSummaryResponse
    cross_system_insights: List[CrossSystemInsightResponse]
    
    # System integration status
    connected_systems: List[str]
    system_health: Dict[str, str]
    data_quality_scores: Dict[str, float]
    
    # Strategic tracking
    goal_progress_tracking: Dict[str, Any]
    milestone_achievements: List[str]
    strategic_initiatives_status: Dict[str, str]
    
    # Performance benchmarking
    industry_benchmarks: Dict[str, float]
    competitive_positioning: Dict[str, Any]
    market_performance_relative: Dict[str, float]
    
    @classmethod
    def from_intelligence(cls, intelligence: RealTimeBusinessIntelligence) -> "RealTimeBusinessIntelligenceResponse":
        """Convert service intelligence to response model"""
        return cls(
            dashboard_scope=intelligence.dashboard_scope.value,
            generated_at=intelligence.generated_at,
            data_freshness=intelligence.data_freshness,
            key_metrics=[RealTimeMetricResponse.from_metric(m) for m in intelligence.key_metrics],
            performance_indicators=intelligence.performance_indicators,
            trend_analysis=intelligence.trend_analysis,
            active_alerts=[BusinessIntelligenceAlertResponse.from_alert(a) for a in intelligence.active_alerts],
            alert_summary=intelligence.alert_summary,
            executive_summary=ExecutiveSummaryResponse.from_summary(intelligence.executive_summary),
            cross_system_insights=[CrossSystemInsightResponse.from_insight(i) for i in intelligence.cross_system_insights],
            connected_systems=intelligence.connected_systems,
            system_health=intelligence.system_health,
            data_quality_scores=intelligence.data_quality_scores,
            goal_progress_tracking=intelligence.goal_progress_tracking,
            milestone_achievements=intelligence.milestone_achievements,
            strategic_initiatives_status=intelligence.strategic_initiatives_status,
            industry_benchmarks=intelligence.industry_benchmarks,
            competitive_positioning=intelligence.competitive_positioning,
            market_performance_relative=intelligence.market_performance_relative
        )

class BusinessIntelligenceHealthResponse(BaseModel):
    """Response model for business intelligence system health"""
    status: str
    service: str
    version: str
    features: List[str]
    connected_systems: List[str]
    data_quality_overall: float
    real_time_capabilities: List[str]
    dashboard_scopes: List[str]
    methodology_alignment: str

class KPITrackingResponse(BaseModel):
    """Response model for KPI tracking and monitoring"""
    tracking_period: str
    kpi_summary: Dict[str, Any]
    goal_achievement_status: Dict[str, bool]
    performance_trends: Dict[str, str]
    benchmark_comparisons: Dict[str, float]
    improvement_recommendations: List[str]

class AlertManagementResponse(BaseModel):
    """Response model for alert management operations"""
    operation: str
    alert_id: str
    success: bool
    message: str
    updated_status: Optional[str]
    follow_up_actions: List[str]

class SystemIntegrationResponse(BaseModel):
    """Response model for system integration status"""
    integration_health: Dict[str, str]
    data_sync_status: Dict[str, datetime]
    service_dependencies: Dict[str, List[str]]
    performance_metrics: Dict[str, float]
    integration_recommendations: List[str]

class StrategicInsightsResponse(BaseModel):
    """Response model for strategic insights and recommendations"""
    insights_generated: int
    high_confidence_insights: List[CrossSystemInsightResponse]
    strategic_opportunities: List[str]
    risk_assessments: List[str]
    implementation_priorities: List[str]
    roi_projections: Dict[str, float]