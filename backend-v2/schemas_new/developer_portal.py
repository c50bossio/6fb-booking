"""
Pydantic schemas for Developer Portal endpoints.

These schemas define the request/response models for the developer portal,
providing comprehensive documentation and integration resources.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# Base Models

class DifficultyLevel(str, Enum):
    """Difficulty level for integration guides."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ProgrammingLanguage(str, Enum):
    """Supported programming languages."""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    PHP = "php"
    RUBY = "ruby"
    JAVA = "java"
    CSHARP = "csharp"
    GO = "go"
    CURL = "curl"
    POSTMAN = "postman"
    OPENAPI = "openapi"


# Developer Portal Models

class DeveloperPortalResponse(BaseModel):
    """Schema for developer portal overview response."""
    welcome_message: str = Field(..., description="Welcome message for developers")
    api_version: str = Field(..., description="Current API version")
    total_endpoints: int = Field(..., description="Total number of API endpoints")
    supported_languages: List[str] = Field(..., description="List of supported programming languages")
    latest_updates: List[Dict[str, str]] = Field(..., description="Latest API updates and announcements")
    quick_links: List[Dict[str, str]] = Field(..., description="Quick navigation links")
    getting_started_checklist: List[Dict[str, Any]] = Field(..., description="Getting started checklist")
    support_resources: List[Dict[str, str]] = Field(..., description="Support and community resources")


# API Documentation Models

class EndpointParameter(BaseModel):
    """API endpoint parameter information."""
    name: str = Field(..., description="Parameter name")
    type: str = Field(..., description="Parameter type")
    required: bool = Field(..., description="Whether parameter is required")
    description: str = Field(..., description="Parameter description")
    example: Optional[Any] = Field(None, description="Example value")


class EndpointDocumentation(BaseModel):
    """Documentation for a single API endpoint."""
    path: str = Field(..., description="Endpoint path")
    methods: List[str] = Field(..., description="Supported HTTP methods")
    description: str = Field(..., description="Endpoint description")
    parameters: Dict[str, List[str]] = Field(..., description="Parameters by HTTP method")
    scopes: List[str] = Field(..., description="Required API scopes")
    example_request: Optional[Dict[str, Any]] = Field(None, description="Example request")
    example_response: Optional[Dict[str, Any]] = Field(None, description="Example response")


class AuthenticationInfo(BaseModel):
    """API authentication information."""
    type: str = Field(..., description="Authentication type")
    header: str = Field(..., description="Authentication header name")
    format: str = Field(..., description="Authentication format")
    scopes: List[str] = Field(..., description="Available permission scopes")


class RateLimitInfo(BaseModel):
    """Rate limiting information."""
    requests_per_hour: int = Field(..., description="Requests per hour limit")
    burst_limit: int = Field(..., description="Burst request limit")
    concurrent_requests: int = Field(..., description="Concurrent request limit")


class APIDocumentationResponse(BaseModel):
    """Schema for API documentation response."""
    version: str = Field(..., description="API version")
    base_url: str = Field(..., description="API base URL")
    authentication: AuthenticationInfo = Field(..., description="Authentication information")
    endpoints: List[EndpointDocumentation] = Field(..., description="API endpoint documentation")
    rate_limits: RateLimitInfo = Field(..., description="Rate limiting information")
    error_codes: Dict[str, str] = Field(..., description="Error code descriptions")


# Code Examples Models

class CodeExampleResponse(BaseModel):
    """Schema for code example response."""
    id: str = Field(..., description="Unique example ID")
    title: str = Field(..., description="Example title")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    category: str = Field(..., description="Example category")
    description: str = Field(..., description="Detailed description")
    code: str = Field(..., description="Complete code example")
    dependencies: List[str] = Field(..., description="Required dependencies")
    tags: List[str] = Field(..., description="Example tags for filtering")


# Integration Guides Models

class IntegrationStep(BaseModel):
    """A single step in an integration guide."""
    title: str = Field(..., description="Step title")
    description: str = Field(..., description="Step description")
    code_example: Optional[str] = Field(None, description="Code example for this step")
    notes: Optional[str] = Field(None, description="Additional notes or warnings")


class IntegrationGuideResponse(BaseModel):
    """Schema for integration guide response."""
    id: str = Field(..., description="Unique guide ID")
    title: str = Field(..., description="Guide title")
    category: str = Field(..., description="Guide category")
    difficulty: DifficultyLevel = Field(..., description="Difficulty level")
    estimated_time: str = Field(..., description="Estimated completion time")
    description: str = Field(..., description="Guide description")
    steps: List[IntegrationStep] = Field(..., description="Integration steps")
    prerequisites: List[str] = Field(..., description="Prerequisites for this guide")
    related_endpoints: List[str] = Field(..., description="Related API endpoints")
    tags: List[str] = Field(..., description="Guide tags")


# SDK and Tools Models

class SDKDownloadResponse(BaseModel):
    """Schema for SDK download information."""
    name: str = Field(..., description="SDK name")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    version: str = Field(..., description="SDK version")
    description: str = Field(..., description="SDK description")
    download_url: str = Field(..., description="Download URL")
    documentation_url: str = Field(..., description="Documentation URL")
    features: List[str] = Field(..., description="SDK features")
    installation: str = Field(..., description="Installation instructions")
    example_usage: str = Field(..., description="Basic usage example")
    requirements: List[str] = Field(..., description="System requirements")
    tags: List[str] = Field(..., description="SDK tags")


# API Testing Models

class APITestingResponse(BaseModel):
    """Schema for API testing interface response."""
    interface_url: str = Field(..., description="Testing interface URL")
    available_endpoints: List[str] = Field(..., description="Available endpoints for testing")
    authentication_required: bool = Field(..., description="Whether authentication is required")
    supported_methods: List[str] = Field(..., description="Supported HTTP methods")
    example_requests: Dict[str, Any] = Field(..., description="Example requests by endpoint")


# Developer Metrics Models

class UsageStatistics(BaseModel):
    """API usage statistics."""
    requests_today: int = Field(..., description="Requests made today")
    requests_this_week: int = Field(..., description="Requests made this week")
    requests_this_month: int = Field(..., description="Requests made this month")
    total_requests: int = Field(..., description="Total requests ever made")


class PerformanceMetrics(BaseModel):
    """API performance metrics."""
    average_response_time: float = Field(..., description="Average response time in milliseconds")
    success_rate: float = Field(..., description="Success rate percentage")
    error_rate: float = Field(..., description="Error rate percentage")
    p95_response_time: float = Field(..., description="95th percentile response time")
    p99_response_time: float = Field(..., description="99th percentile response time")


class RateLimitStatus(BaseModel):
    """Current rate limit status."""
    requests_per_hour_limit: int = Field(..., description="Hourly request limit")
    requests_used_this_hour: int = Field(..., description="Requests used this hour")
    requests_remaining: int = Field(..., description="Remaining requests this hour")
    reset_time: str = Field(..., description="When the rate limit resets")
    burst_limit: int = Field(..., description="Burst request limit")
    concurrent_limit: int = Field(..., description="Concurrent request limit")


class EndpointUsage(BaseModel):
    """Usage statistics for a specific endpoint."""
    endpoint: str = Field(..., description="Endpoint path")
    method: str = Field(..., description="HTTP method")
    requests: int = Field(..., description="Number of requests made")
    avg_response_time: float = Field(..., description="Average response time in milliseconds")
    success_rate: float = Field(..., description="Success rate percentage")


class ErrorBreakdown(BaseModel):
    """Error statistics breakdown."""
    error_4xx: int = Field(..., description="4xx client errors", alias="4xx_errors")
    error_5xx: int = Field(..., description="5xx server errors", alias="5xx_errors")
    timeout_errors: int = Field(..., description="Timeout errors")
    common_errors: List[Dict[str, Any]] = Field(..., description="Most common error types")


class IntegrationHealth(BaseModel):
    """Integration health assessment."""
    overall_score: float = Field(..., description="Overall health score (0-100)")
    recommendations: List[str] = Field(..., description="Recommendations for improvement")
    best_practices: List[str] = Field(..., description="Best practices compliance")


class QuotaInformation(BaseModel):
    """API quota and billing information."""
    plan_type: str = Field(..., description="Current plan type")
    monthly_request_limit: int = Field(..., description="Monthly request limit")
    requests_used_this_month: int = Field(..., description="Requests used this month")
    requests_remaining: int = Field(..., description="Remaining requests this month")
    overage_cost_per_request: float = Field(..., description="Cost per overage request")
    next_reset_date: str = Field(..., description="Next quota reset date")


class DeveloperMetricsResponse(BaseModel):
    """Schema for developer metrics response."""
    api_key_id: int = Field(..., description="API key ID")
    user_id: int = Field(..., description="User ID")
    current_period: Dict[str, str] = Field(..., description="Current reporting period")
    usage_statistics: UsageStatistics = Field(..., description="Usage statistics")
    performance_metrics: PerformanceMetrics = Field(..., description="Performance metrics")
    rate_limit_info: RateLimitStatus = Field(..., description="Rate limit status")
    endpoint_usage: List[EndpointUsage] = Field(..., description="Per-endpoint usage statistics")
    error_breakdown: ErrorBreakdown = Field(..., description="Error statistics")
    integration_health: IntegrationHealth = Field(..., description="Integration health assessment")
    quota_information: QuotaInformation = Field(..., description="Quota and billing information")


# Webhook Models

class WebhookEventType(str, Enum):
    """Supported webhook event types."""
    APPOINTMENT_CREATED = "appointment.created"
    APPOINTMENT_UPDATED = "appointment.updated"
    APPOINTMENT_CANCELLED = "appointment.cancelled"
    APPOINTMENT_COMPLETED = "appointment.completed"
    CLIENT_CREATED = "client.created"
    CLIENT_UPDATED = "client.updated"
    PAYMENT_COMPLETED = "payment.completed"
    PAYMENT_FAILED = "payment.failed"


class WebhookConfiguration(BaseModel):
    """Webhook configuration settings."""
    url: str = Field(..., description="Webhook endpoint URL")
    events: List[WebhookEventType] = Field(..., description="Subscribed event types")
    secret: str = Field(..., description="Webhook secret for signature verification")
    active: bool = Field(True, description="Whether webhook is active")


class WebhookTestResponse(BaseModel):
    """Webhook test response."""
    success: bool = Field(..., description="Whether webhook test was successful")
    response_code: Optional[int] = Field(None, description="HTTP response code from webhook endpoint")
    response_time: Optional[float] = Field(None, description="Response time in milliseconds")
    error_message: Optional[str] = Field(None, description="Error message if test failed")


# Support and Community Models

class SupportResource(BaseModel):
    """Support resource information."""
    title: str = Field(..., description="Resource title")
    type: str = Field(..., description="Resource type (documentation, support, community)")
    url: Optional[str] = Field(None, description="Resource URL")
    contact: Optional[str] = Field(None, description="Contact information")
    description: str = Field(..., description="Resource description")


class CommunityStats(BaseModel):
    """Developer community statistics."""
    total_developers: int = Field(..., description="Total registered developers")
    active_integrations: int = Field(..., description="Active integrations")
    monthly_api_calls: int = Field(..., description="Monthly API calls across all developers")
    community_forum_posts: int = Field(..., description="Community forum posts this month")


# Search and Discovery Models

class SearchResult(BaseModel):
    """Search result for developer portal content."""
    type: str = Field(..., description="Content type (endpoint, guide, example, etc.)")
    title: str = Field(..., description="Result title")
    description: str = Field(..., description="Result description")
    url: str = Field(..., description="URL to the content")
    relevance_score: float = Field(..., description="Relevance score (0-1)")
    tags: List[str] = Field(..., description="Content tags")


class SearchResponse(BaseModel):
    """Search results response."""
    query: str = Field(..., description="Search query")
    total_results: int = Field(..., description="Total number of results")
    results: List[SearchResult] = Field(..., description="Search results")
    suggested_queries: List[str] = Field(..., description="Suggested related queries")


# Analytics and Insights Models

class DeveloperInsight(BaseModel):
    """Developer usage insights."""
    insight_type: str = Field(..., description="Type of insight")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Insight description")
    impact: str = Field(..., description="Impact level (high, medium, low)")
    recommendation: str = Field(..., description="Recommended action")
    data_points: Dict[str, Any] = Field(..., description="Supporting data points")


class TrendAnalysis(BaseModel):
    """Trend analysis for API usage."""
    period: str = Field(..., description="Analysis period")
    trend_direction: str = Field(..., description="Trend direction (up, down, stable)")
    percentage_change: float = Field(..., description="Percentage change")
    key_drivers: List[str] = Field(..., description="Key factors driving the trend")


class DeveloperInsightsResponse(BaseModel):
    """Developer insights and analytics response."""
    user_id: int = Field(..., description="User ID")
    generated_at: datetime = Field(..., description="Report generation timestamp")
    insights: List[DeveloperInsight] = Field(..., description="Generated insights")
    trend_analysis: List[TrendAnalysis] = Field(..., description="Trend analysis")
    recommendations: List[str] = Field(..., description="Overall recommendations")
    next_review_date: datetime = Field(..., description="Next review date")


# Configuration Models

class DeveloperPortalConfig(BaseModel):
    """Developer portal configuration."""
    portal_enabled: bool = Field(True, description="Whether developer portal is enabled")
    registration_enabled: bool = Field(True, description="Whether new developer registration is enabled")
    api_key_auto_approval: bool = Field(False, description="Whether API keys are auto-approved")
    rate_limit_notifications: bool = Field(True, description="Send rate limit notifications")
    usage_reports_enabled: bool = Field(True, description="Enable usage reports")
    community_features_enabled: bool = Field(True, description="Enable community features")
    beta_features_enabled: bool = Field(False, description="Enable beta features")


# Notification Models

class NotificationPreference(BaseModel):
    """Developer notification preferences."""
    email_notifications: bool = Field(True, description="Enable email notifications")
    webhook_failures: bool = Field(True, description="Notify on webhook failures")
    rate_limit_warnings: bool = Field(True, description="Notify on rate limit warnings")
    api_updates: bool = Field(True, description="Notify on API updates")
    security_alerts: bool = Field(True, description="Notify on security alerts")
    usage_reports: bool = Field(False, description="Send usage reports")


class DeveloperNotification(BaseModel):
    """Developer notification."""
    id: str = Field(..., description="Notification ID")
    type: str = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    priority: str = Field(..., description="Priority level (high, medium, low)")
    created_at: datetime = Field(..., description="Creation timestamp")
    read_at: Optional[datetime] = Field(None, description="Read timestamp")
    action_url: Optional[str] = Field(None, description="Action URL")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


# Export Models

class ExportFormat(str, Enum):
    """Supported export formats."""
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"


class ExportRequest(BaseModel):
    """Export request configuration."""
    format: ExportFormat = Field(..., description="Export format")
    date_range: Dict[str, str] = Field(..., description="Date range for export")
    include_details: bool = Field(True, description="Include detailed information")
    filter_criteria: Dict[str, Any] = Field(default_factory=dict, description="Filter criteria")


class ExportResponse(BaseModel):
    """Export response."""
    export_id: str = Field(..., description="Export job ID")
    status: str = Field(..., description="Export status")
    download_url: Optional[str] = Field(None, description="Download URL when ready")
    expires_at: Optional[datetime] = Field(None, description="Download expiration time")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    created_at: datetime = Field(..., description="Export creation time")


# Feedback Models

class FeedbackType(str, Enum):
    """Types of feedback."""
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"
    DOCUMENTATION = "documentation"
    SDK_FEEDBACK = "sdk_feedback"
    GENERAL = "general"


class DeveloperFeedback(BaseModel):
    """Developer feedback submission."""
    type: FeedbackType = Field(..., description="Feedback type")
    title: str = Field(..., description="Feedback title")
    description: str = Field(..., description="Detailed feedback description")
    priority: str = Field("medium", description="Priority level")
    contact_email: Optional[str] = Field(None, description="Contact email for follow-up")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context")


class FeedbackResponse(BaseModel):
    """Feedback submission response."""
    feedback_id: str = Field(..., description="Feedback ID")
    status: str = Field(..., description="Feedback status")
    estimated_response_time: str = Field(..., description="Estimated response time")
    tracking_url: str = Field(..., description="URL to track feedback status")
    submitted_at: datetime = Field(..., description="Submission timestamp")