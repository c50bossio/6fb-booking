"""
Pydantic schemas for review management and Google My Business integration.
Handles validation for reviews, responses, templates, and analytics.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReviewPlatform(str, Enum):
    """Supported review platforms"""
    GOOGLE = "google"
    YELP = "yelp"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    BOOKSY = "booksy"
    FRESHA = "fresha"
    STYLESEAT = "styleseat"
    OTHER = "other"


class ReviewSentiment(str, Enum):
    """Review sentiment analysis results"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    UNKNOWN = "unknown"


class ReviewResponseStatus(str, Enum):
    """Status of review response"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    NOT_NEEDED = "not_needed"
    DRAFT = "draft"


# Review Schemas
class ReviewBase(BaseModel):
    """Base review schema"""
    platform: ReviewPlatform
    external_review_id: str = Field(..., description="Platform-specific review ID")
    business_id: Optional[str] = Field(None, description="External business ID")
    reviewer_name: Optional[str] = Field(None, max_length=255)
    rating: float = Field(..., ge=1, le=5, description="1-5 star rating")
    review_text: Optional[str] = Field(None, description="Review content")
    review_date: datetime
    review_url: Optional[str] = Field(None, description="Direct link to review")


class ReviewCreate(ReviewBase):
    """Schema for creating a new review"""
    reviewer_photo_url: Optional[str] = None
    platform_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_verified: Optional[bool] = False
    
    @field_validator('external_review_id')
    @classmethod
    def validate_external_id(cls, v):
        if not v.strip():
            raise ValueError('External review ID cannot be empty')
        return v.strip()


class ReviewUpdate(BaseModel):
    """Schema for updating a review"""
    reviewer_name: Optional[str] = Field(None, max_length=255)
    rating: Optional[float] = Field(None, ge=1, le=5)
    review_text: Optional[str] = None
    review_url: Optional[str] = None
    sentiment: Optional[ReviewSentiment] = None
    sentiment_score: Optional[float] = Field(None, ge=-1, le=1)
    sentiment_confidence: Optional[float] = Field(None, ge=0, le=1)
    is_flagged: Optional[bool] = None
    flag_reason: Optional[str] = Field(None, max_length=500)
    platform_data: Optional[Dict[str, Any]] = None


class ReviewResponse(ReviewBase):
    """Schema for review responses"""
    id: int
    user_id: int
    business_id: Optional[str] = None
    reviewer_photo_url: Optional[str] = None
    
    # Sentiment analysis
    sentiment: ReviewSentiment
    sentiment_score: Optional[float] = None
    sentiment_confidence: Optional[float] = None
    sentiment_keywords: List[str] = Field(default_factory=list)
    
    # Response tracking
    response_status: ReviewResponseStatus
    response_text: Optional[str] = None
    response_date: Optional[datetime] = None
    response_author: Optional[str] = None
    auto_response_generated: bool = False
    
    # Business intelligence
    keywords_mentioned: List[str] = Field(default_factory=list)
    services_mentioned: List[str] = Field(default_factory=list)
    competitor_mentions: List[str] = Field(default_factory=list)
    location_mentions: List[str] = Field(default_factory=list)
    
    # Quality metrics
    is_verified: bool = False
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    is_helpful: Optional[bool] = None
    helpful_count: int = 0
    
    # Metadata
    last_synced_at: Optional[datetime] = None
    is_deleted_on_platform: bool = False
    sync_errors: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    # Computed properties
    is_positive: bool = Field(default=False, description="Whether review is positive")
    is_negative: bool = Field(default=False, description="Whether review is negative")
    needs_response: bool = Field(default=False, description="Whether review needs a response")
    can_respond: bool = Field(default=False, description="Whether we can respond to this review")
    
    class Config:
        from_attributes = True


# Review Response Schemas
class ReviewResponseBase(BaseModel):
    """Base review response schema"""
    response_text: str = Field(..., min_length=1, max_length=4096)
    response_type: str = Field(default="custom", description="Type of response")
    template_id: Optional[str] = Field(None, description="Template used for response")


class ReviewResponseCreate(ReviewResponseBase):
    """Schema for creating a review response"""
    keywords_used: Optional[List[str]] = Field(default_factory=list)
    cta_included: Optional[bool] = False
    business_name_mentioned: Optional[bool] = False
    variant_id: Optional[str] = Field(None, description="A/B test variant")
    test_group: Optional[str] = Field(None, description="Test group")
    
    @field_validator('response_text')
    @classmethod
    def validate_response_text(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Response text cannot be empty')
        if len(v) > 4096:
            raise ValueError('Response text too long (max 4096 characters)')
        return v


class ReviewResponseUpdate(BaseModel):
    """Schema for updating a review response"""
    response_text: Optional[str] = Field(None, min_length=1, max_length=4096)
    is_draft: Optional[bool] = None
    keywords_used: Optional[List[str]] = None
    cta_included: Optional[bool] = None
    business_name_mentioned: Optional[bool] = None


class ReviewResponseSchema(ReviewResponseBase):
    """Schema for review response display"""
    id: int
    review_id: int
    user_id: int
    is_draft: bool = True
    is_sent: bool = False
    sent_at: Optional[datetime] = None
    platform_response_id: Optional[str] = None
    
    # SEO and optimization
    keywords_used: List[str] = Field(default_factory=list)
    cta_included: bool = False
    business_name_mentioned: bool = False
    
    # Performance tracking
    view_count: int = 0
    helpful_votes: int = 0
    character_count: int = 0
    
    # A/B testing
    variant_id: Optional[str] = None
    test_group: Optional[str] = None
    
    # Error tracking
    send_errors: List[Dict[str, Any]] = Field(default_factory=list)
    last_error: Optional[str] = None
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    
    # Computed properties
    is_ready_to_send: bool = Field(default=False, description="Whether response is ready to send")
    
    class Config:
        from_attributes = True


# Review Template Schemas
class ReviewTemplateBase(BaseModel):
    """Base review template schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., description="positive, negative, neutral")
    platform: Optional[ReviewPlatform] = None
    template_text: str = Field(..., min_length=1)


class ReviewTemplateCreate(ReviewTemplateBase):
    """Schema for creating a review template"""
    placeholders: Optional[List[str]] = Field(default_factory=list)
    min_rating: Optional[float] = Field(None, ge=1, le=5)
    max_rating: Optional[float] = Field(None, ge=1, le=5)
    keywords_trigger: Optional[List[str]] = Field(default_factory=list)
    sentiment_trigger: Optional[ReviewSentiment] = None
    seo_keywords: Optional[List[str]] = Field(default_factory=list)
    include_business_name: Optional[bool] = True
    include_cta: Optional[bool] = True
    cta_text: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = True
    is_default: Optional[bool] = False
    priority: Optional[int] = 0
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        valid_categories = ['positive', 'negative', 'neutral']
        if v.lower() not in valid_categories:
            raise ValueError(f'Category must be one of: {", ".join(valid_categories)}')
        return v.lower()
    
    @field_validator('max_rating')
    @classmethod
    def validate_rating_range(cls, v, info):
        if v is not None and info.data and 'min_rating' in info.data and info.data['min_rating'] is not None:
            if v < info.data['min_rating']:
                raise ValueError('max_rating must be greater than or equal to min_rating')
        return v


class ReviewTemplateUpdate(BaseModel):
    """Schema for updating a review template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    platform: Optional[ReviewPlatform] = None
    template_text: Optional[str] = Field(None, min_length=1)
    placeholders: Optional[List[str]] = None
    min_rating: Optional[float] = Field(None, ge=1, le=5)
    max_rating: Optional[float] = Field(None, ge=1, le=5)
    keywords_trigger: Optional[List[str]] = None
    sentiment_trigger: Optional[ReviewSentiment] = None
    seo_keywords: Optional[List[str]] = None
    include_business_name: Optional[bool] = None
    include_cta: Optional[bool] = None
    cta_text: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    priority: Optional[int] = None


class ReviewTemplateSchema(ReviewTemplateBase):
    """Schema for review template display"""
    id: int
    user_id: int
    placeholders: List[str] = Field(default_factory=list)
    
    # Conditions
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    keywords_trigger: List[str] = Field(default_factory=list)
    sentiment_trigger: Optional[ReviewSentiment] = None
    
    # SEO
    seo_keywords: List[str] = Field(default_factory=list)
    include_business_name: bool = True
    include_cta: bool = True
    cta_text: Optional[str] = None
    
    # Usage tracking
    use_count: int = 0
    success_rate: float = 0.0
    avg_response_time: float = 0.0
    
    # Settings
    is_active: bool = True
    is_default: bool = False
    priority: int = 0
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Analytics Schemas
class ReviewAnalytics(BaseModel):
    """Review analytics summary"""
    total_reviews: int = 0
    average_rating: float = 0.0
    rating_distribution: Dict[int, int] = Field(default_factory=dict)  # {1: count, 2: count, ...}
    
    # Platform breakdown
    platform_breakdown: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    # Sentiment analysis
    sentiment_breakdown: Dict[str, int] = Field(default_factory=dict)
    positive_percentage: float = 0.0
    negative_percentage: float = 0.0
    
    # Response metrics
    response_rate: float = 0.0
    avg_response_time_hours: float = 0.0
    auto_response_percentage: float = 0.0
    
    # Time-based metrics
    reviews_this_month: int = 0
    reviews_last_month: int = 0
    month_over_month_change: float = 0.0
    
    # Quality metrics
    verified_reviews_count: int = 0
    flagged_reviews_count: int = 0
    helpful_reviews_count: int = 0
    
    # SEO insights
    top_keywords: List[Dict[str, Any]] = Field(default_factory=list)
    services_mentioned: List[Dict[str, Any]] = Field(default_factory=list)
    competitor_mentions: List[str] = Field(default_factory=list)


class ReviewFilters(BaseModel):
    """Filters for review queries"""
    platform: Optional[ReviewPlatform] = None
    sentiment: Optional[ReviewSentiment] = None
    response_status: Optional[ReviewResponseStatus] = None
    min_rating: Optional[float] = Field(None, ge=1, le=5)
    max_rating: Optional[float] = Field(None, ge=1, le=5)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_flagged: Optional[bool] = None
    is_verified: Optional[bool] = None
    has_response: Optional[bool] = None
    search_query: Optional[str] = Field(None, max_length=255)
    business_id: Optional[str] = None


class ReviewSyncRequest(BaseModel):
    """Request to sync reviews from platform"""
    platform: ReviewPlatform
    business_id: Optional[str] = None
    force_full_sync: Optional[bool] = False
    sync_responses: Optional[bool] = True
    date_range_days: Optional[int] = Field(30, ge=1, le=365, description="Number of days to sync")


class ReviewSyncResponse(BaseModel):
    """Response after review sync operation"""
    success: bool
    message: str
    synced_at: datetime
    platform: ReviewPlatform
    business_id: Optional[str] = None
    
    # Sync results
    reviews_synced: int = 0
    new_reviews: int = 0
    updated_reviews: int = 0
    errors_count: int = 0
    
    # Summary
    total_reviews_after_sync: int = 0
    average_rating_after_sync: float = 0.0
    
    errors: List[str] = Field(default_factory=list)


# GMB-specific schemas
class GMBLocation(BaseModel):
    """Google My Business location information"""
    location_id: str = Field(..., description="GMB location ID")
    name: str
    address: str
    phone: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None
    hours: Optional[Dict[str, Any]] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    is_verified: bool = False
    is_published: bool = False


class GMBAuthRequest(BaseModel):
    """Request to initiate GMB OAuth flow"""
    redirect_uri: Optional[str] = None
    scopes: Optional[List[str]] = Field(default_factory=lambda: [
        "https://www.googleapis.com/auth/business.manage"
    ])


class GMBAuthResponse(BaseModel):
    """Response after GMB OAuth completion"""
    success: bool
    message: str
    auth_url: Optional[str] = None
    integration_id: Optional[int] = None


class ReviewTemplateGenerateRequest(BaseModel):
    """Request to generate response using template"""
    template_id: int
    business_name: Optional[str] = None
    custom_placeholders: Optional[Dict[str, str]] = Field(default_factory=dict)


class ReviewTemplateGenerateResponse(BaseModel):
    """Generated response from template"""
    success: bool
    response_text: str
    template_used: str
    placeholders_replaced: Dict[str, str] = Field(default_factory=dict)
    character_count: int
    seo_keywords_included: List[str] = Field(default_factory=list)


class BulkResponseRequest(BaseModel):
    """Request to generate bulk responses"""
    review_ids: List[int] = Field(..., min_items=1, max_items=50)
    template_id: Optional[int] = None
    auto_send: Optional[bool] = False
    business_name: Optional[str] = None


class BulkResponseResult(BaseModel):
    """Result of bulk response operation"""
    review_id: int
    success: bool
    response_id: Optional[int] = None
    error: Optional[str] = None
    response_text: Optional[str] = None


class BulkResponseResponse(BaseModel):
    """Response after bulk response operation"""
    success: bool
    message: str
    total_processed: int
    successful_responses: int
    failed_responses: int
    results: List[BulkResponseResult] = Field(default_factory=list)


# Auto-response configuration
class AutoResponseConfig(BaseModel):
    """Configuration for automatic review responses"""
    enabled: bool = False
    respond_to_positive: bool = True
    respond_to_neutral: bool = True
    respond_to_negative: bool = True
    min_rating_threshold: float = Field(1.0, ge=1, le=5)
    max_rating_threshold: float = Field(5.0, ge=1, le=5)
    delay_hours: int = Field(2, ge=0, le=168, description="Hours to wait before auto-responding")
    platforms: List[ReviewPlatform] = Field(default_factory=list)
    business_hours_only: bool = False
    weekend_responses: bool = True
    template_selection_strategy: str = Field("smart", description="smart, random, or highest_priority")


class AutoResponseStats(BaseModel):
    """Statistics for auto-response system"""
    total_auto_responses: int = 0
    auto_responses_today: int = 0
    auto_responses_this_week: int = 0
    auto_responses_this_month: int = 0
    success_rate: float = 0.0
    average_response_time_hours: float = 0.0
    most_used_template: Optional[str] = None
    platform_breakdown: Dict[str, int] = Field(default_factory=dict)