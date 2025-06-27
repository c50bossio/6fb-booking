"""
Local SEO Management Models
Database models for local SEO optimization, Google Business Profile integration,
and search engine optimization tracking
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    Enum,
    Float,
    Date,
)
import enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base
from models.base import BaseModel


class OptimizationStatus(enum.Enum):
    """Status of SEO optimization items"""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NEEDS_ATTENTION = "needs_attention"


class KeywordDifficulty(enum.Enum):
    """Keyword ranking difficulty levels"""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    VERY_HARD = "very_hard"


class CitationStatus(enum.Enum):
    """Status of business citations"""

    VERIFIED = "verified"
    UNVERIFIED = "unverified"
    INCONSISTENT = "inconsistent"
    MISSING = "missing"


class ReviewPlatform(enum.Enum):
    """Supported review platforms"""

    GOOGLE = "google"
    YELP = "yelp"
    FACEBOOK = "facebook"
    FOURSQUARE = "foursquare"
    YELLOW_PAGES = "yellow_pages"


class GoogleBusinessProfile(BaseModel):
    """Google Business Profile management"""

    __tablename__ = "google_business_profiles"

    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=True)

    # Google Business Info
    google_place_id = Column(String(255), unique=True, index=True)
    business_name = Column(String(255), nullable=False)
    business_description = Column(Text)
    business_phone = Column(String(50))
    business_website = Column(String(255))
    business_address = Column(Text)
    business_city = Column(String(100))
    business_state = Column(String(50))
    business_zip = Column(String(20))
    business_country = Column(String(50), default="US")

    # Business Categories
    primary_category = Column(String(100))
    secondary_categories = Column(JSON)  # List of additional categories

    # Business Hours
    business_hours = Column(JSON)  # Weekly schedule
    special_hours = Column(JSON)  # Holiday/special hours

    # Verification and Status
    is_verified = Column(Boolean, default=False)
    verification_method = Column(String(50))
    verification_date = Column(DateTime)
    is_published = Column(Boolean, default=False)

    # Performance Metrics
    total_reviews = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    monthly_views = Column(Integer, default=0)
    monthly_searches = Column(Integer, default=0)
    monthly_calls = Column(Integer, default=0)
    monthly_directions = Column(Integer, default=0)

    # Photos and Media
    profile_photo_url = Column(String(500))
    cover_photo_url = Column(String(500))
    additional_photos = Column(JSON)  # List of photo URLs

    # Google API Integration
    google_access_token = Column(Text)  # Encrypted
    google_refresh_token = Column(Text)  # Encrypted
    api_last_sync = Column(DateTime)
    api_sync_errors = Column(JSON)

    # Relationships
    user = relationship("User", back_populates="google_business_profiles")
    seo_optimizations = relationship("SEOOptimization", back_populates="google_profile")
    keyword_rankings = relationship("KeywordRanking", back_populates="google_profile")


class SEOOptimization(BaseModel):
    """SEO optimization checklist and scoring"""

    __tablename__ = "seo_optimizations"

    google_profile_id = Column(
        Integer, ForeignKey("google_business_profiles.id"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    # Optimization Item Details
    optimization_category = Column(
        String(100), nullable=False
    )  # profile, content, reviews, etc.
    optimization_item = Column(String(255), nullable=False)
    optimization_description = Column(Text)
    optimization_priority = Column(Integer, default=1)  # 1-5 priority

    # Status and Progress
    status = Column(Enum(OptimizationStatus), default=OptimizationStatus.PENDING)
    completion_percentage = Column(Integer, default=0)

    # Impact and Scoring
    impact_score = Column(Integer, default=0)  # 1-100
    difficulty_score = Column(Integer, default=1)  # 1-5
    estimated_time_hours = Column(Float, default=0.5)

    # Implementation Details
    implementation_steps = Column(JSON)  # Step-by-step instructions
    helpful_resources = Column(JSON)  # Links and resources

    # Progress Tracking
    started_date = Column(DateTime)
    completed_date = Column(DateTime)
    last_checked_date = Column(DateTime)
    notes = Column(Text)

    # Relationships
    google_profile = relationship(
        "GoogleBusinessProfile", back_populates="seo_optimizations"
    )
    user = relationship("User", back_populates="seo_optimizations")


class KeywordRanking(BaseModel):
    """Local keyword ranking tracking"""

    __tablename__ = "keyword_rankings"

    google_profile_id = Column(
        Integer, ForeignKey("google_business_profiles.id"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    # Keyword Details
    keyword = Column(String(255), nullable=False, index=True)
    keyword_difficulty = Column(
        Enum(KeywordDifficulty), default=KeywordDifficulty.MEDIUM
    )
    monthly_search_volume = Column(Integer, default=0)
    competition_level = Column(Float, default=0.0)  # 0-1

    # Ranking Data
    current_rank = Column(Integer)  # 1-100+ or null if not ranking
    previous_rank = Column(Integer)
    best_rank = Column(Integer)
    worst_rank = Column(Integer)

    # Tracking Settings
    is_target_keyword = Column(Boolean, default=True)
    tracking_start_date = Column(Date)
    last_checked_date = Column(Date)
    check_frequency_days = Column(Integer, default=7)

    # Device and Location
    device_type = Column(String(20), default="desktop")  # desktop, mobile
    location_city = Column(String(100))
    location_state = Column(String(50))

    # Performance Metrics
    average_rank_30days = Column(Float)
    rank_change_30days = Column(Integer)
    visibility_score = Column(Float, default=0.0)  # 0-100

    # Relationships
    google_profile = relationship(
        "GoogleBusinessProfile", back_populates="keyword_rankings"
    )
    user = relationship("User", back_populates="keyword_rankings")
    ranking_history = relationship(
        "KeywordRankingHistory", back_populates="keyword_ranking"
    )


class KeywordRankingHistory(BaseModel):
    """Historical keyword ranking data"""

    __tablename__ = "keyword_ranking_history"

    keyword_ranking_id = Column(
        Integer, ForeignKey("keyword_rankings.id"), nullable=False
    )

    # Historical Data
    check_date = Column(Date, nullable=False, index=True)
    rank_position = Column(Integer)  # null if not found
    search_volume = Column(Integer, default=0)
    competition_score = Column(Float, default=0.0)

    # Context Data
    search_engine = Column(String(20), default="google")
    device_type = Column(String(20), default="desktop")
    location_identifier = Column(String(100))

    # Relationships
    keyword_ranking = relationship("KeywordRanking", back_populates="ranking_history")


class BusinessCitation(BaseModel):
    """Business directory citations and listings"""

    __tablename__ = "business_citations"

    google_profile_id = Column(
        Integer, ForeignKey("google_business_profiles.id"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    # Directory Information
    directory_name = Column(String(100), nullable=False)
    directory_url = Column(String(500))
    directory_authority_score = Column(Integer, default=0)  # 1-100
    directory_category = Column(String(100))  # local, industry, general

    # Citation Details
    listing_url = Column(String(500))
    business_name_listed = Column(String(255))
    phone_listed = Column(String(50))
    address_listed = Column(Text)
    website_listed = Column(String(255))

    # Status and Accuracy
    citation_status = Column(Enum(CitationStatus), default=CitationStatus.UNVERIFIED)
    accuracy_score = Column(Float, default=0.0)  # 0-100

    # Issues and Notes
    inconsistencies_found = Column(JSON)  # List of issues
    last_verified_date = Column(Date)
    verification_notes = Column(Text)

    # Opportunity Tracking
    is_claimed = Column(Boolean, default=False)
    claim_url = Column(String(500))
    submission_priority = Column(Integer, default=1)  # 1-5

    # Relationships
    google_profile = relationship(
        "GoogleBusinessProfile", back_populates="business_citations"
    )
    user = relationship("User", back_populates="business_citations")


class ReviewManagement(BaseModel):
    """Review monitoring and management"""

    __tablename__ = "review_management"

    google_profile_id = Column(
        Integer, ForeignKey("google_business_profiles.id"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    # Review Details
    platform = Column(Enum(ReviewPlatform), nullable=False)
    review_id = Column(String(255), nullable=False)  # Platform-specific ID
    reviewer_name = Column(String(255))
    reviewer_profile_url = Column(String(500))

    # Review Content
    review_text = Column(Text)
    review_rating = Column(Float)  # 1-5 stars
    review_date = Column(DateTime)

    # Response Management
    business_response = Column(Text)
    response_date = Column(DateTime)
    response_author = Column(String(255))
    needs_response = Column(Boolean, default=False)
    response_priority = Column(Integer, default=1)  # 1-5

    # Sentiment Analysis
    sentiment_score = Column(Float)  # -1 to 1 (negative to positive)
    sentiment_keywords = Column(JSON)  # Extracted keywords
    review_categories = Column(JSON)  # service, cleanliness, staff, etc.

    # Internal Tracking
    is_flagged = Column(Boolean, default=False)
    flagged_reason = Column(String(255))
    internal_notes = Column(Text)
    follow_up_required = Column(Boolean, default=False)

    # Relationships
    google_profile = relationship("GoogleBusinessProfile", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


class SEOAnalytics(BaseModel):
    """SEO performance analytics and tracking"""

    __tablename__ = "seo_analytics"

    google_profile_id = Column(
        Integer, ForeignKey("google_business_profiles.id"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    # Time Period
    analytics_date = Column(Date, nullable=False, index=True)
    period_type = Column(String(20), default="daily")  # daily, weekly, monthly

    # Search Performance
    total_impressions = Column(Integer, default=0)
    total_clicks = Column(Integer, default=0)
    average_ctr = Column(Float, default=0.0)
    average_position = Column(Float, default=0.0)

    # Local Pack Performance
    local_pack_impressions = Column(Integer, default=0)
    local_pack_clicks = Column(Integer, default=0)
    local_pack_position = Column(Float, default=0.0)

    # Google Business Profile
    profile_views = Column(Integer, default=0)
    profile_searches = Column(Integer, default=0)
    profile_calls = Column(Integer, default=0)
    profile_directions = Column(Integer, default=0)
    profile_website_clicks = Column(Integer, default=0)

    # Review Metrics
    new_reviews_count = Column(Integer, default=0)
    total_reviews = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    review_response_rate = Column(Float, default=0.0)

    # Competitor Analysis
    competitor_visibility_score = Column(Float, default=0.0)
    market_share_percentage = Column(Float, default=0.0)

    # Relationships
    google_profile = relationship("GoogleBusinessProfile", back_populates="analytics")
    user = relationship("User", back_populates="seo_analytics")


class SchemaMarkup(BaseModel):
    """Schema markup management and validation"""

    __tablename__ = "schema_markup"

    google_profile_id = Column(
        Integer, ForeignKey("google_business_profiles.id"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    # Schema Details
    schema_type = Column(
        String(100), nullable=False
    )  # LocalBusiness, Organization, etc.
    page_url = Column(String(500), nullable=False)
    schema_json = Column(JSON, nullable=False)  # The actual schema markup

    # Validation and Status
    is_valid = Column(Boolean, default=False)
    validation_errors = Column(JSON)  # List of validation issues
    last_validated = Column(DateTime)

    # Implementation
    is_implemented = Column(Boolean, default=False)
    implementation_method = Column(String(50))  # json-ld, microdata, rdfa
    implementation_date = Column(DateTime)

    # Performance Tracking
    rich_results_eligible = Column(Boolean, default=False)
    rich_results_types = Column(JSON)  # Types of rich results possible
    search_console_impressions = Column(Integer, default=0)
    search_console_clicks = Column(Integer, default=0)

    # Relationships
    google_profile = relationship(
        "GoogleBusinessProfile", back_populates="schema_markups"
    )
    user = relationship("User", back_populates="schema_markups")


# Add relationship back-references to User model (these would be added to user.py)
"""
Additional relationships to add to User model:

google_business_profiles = relationship("GoogleBusinessProfile", back_populates="user")
seo_optimizations = relationship("SEOOptimization", back_populates="user")
keyword_rankings = relationship("KeywordRanking", back_populates="user")
business_citations = relationship("BusinessCitation", back_populates="user")
reviews = relationship("ReviewManagement", back_populates="user")
seo_analytics = relationship("SEOAnalytics", back_populates="user")
schema_markups = relationship("SchemaMarkup", back_populates="user")
"""
