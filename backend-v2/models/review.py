"""
Review model for managing customer reviews across multiple platforms.
Supports Google My Business, Yelp, Facebook, and other review platforms.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
import sys
import os

# Add parent directory to path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base
from utils.encryption import EncryptedText


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ReviewPlatform(enum.Enum):
    """Supported review platforms"""
    GOOGLE = "google"
    YELP = "yelp"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    BOOKSY = "booksy"
    FRESHA = "fresha"
    STYLESEAT = "styleseat"
    OTHER = "other"


class ReviewSentiment(enum.Enum):
    """Review sentiment analysis results"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    UNKNOWN = "unknown"


class ReviewResponseStatus(enum.Enum):
    """Status of review response"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    NOT_NEEDED = "not_needed"
    DRAFT = "draft"


class Review(Base):
    """
    Stores customer reviews from various platforms with sentiment analysis
    and response tracking capabilities.
    """
    __tablename__ = "reviews"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Barber/business owner
    business_id = Column(String(255), nullable=True, index=True)  # External business ID (GMB location ID, etc.)
    
    # Review metadata
    platform = Column(SQLEnum(ReviewPlatform), nullable=False, index=True)
    external_review_id = Column(String(255), nullable=False, index=True)  # Platform-specific review ID
    review_url = Column(String(1000), nullable=True)  # Direct link to review
    
    # Review content
    reviewer_name = Column(String(255), nullable=True)
    reviewer_photo_url = Column(String(1000), nullable=True)
    rating = Column(Float, nullable=False)  # 1-5 star rating (normalized)
    review_text = Column(Text, nullable=True)
    review_date = Column(DateTime, nullable=False, index=True)
    
    # Sentiment analysis
    sentiment = Column(SQLEnum(ReviewSentiment), default=ReviewSentiment.UNKNOWN, index=True)
    sentiment_score = Column(Float, nullable=True)  # -1 to 1, where -1 is most negative
    sentiment_confidence = Column(Float, nullable=True)  # 0 to 1, confidence in sentiment
    sentiment_keywords = Column(JSON, default=list)  # Key phrases that influenced sentiment
    
    # Response tracking
    response_status = Column(SQLEnum(ReviewResponseStatus), default=ReviewResponseStatus.PENDING, index=True)
    response_text = Column(Text, nullable=True)
    response_date = Column(DateTime, nullable=True)
    response_author = Column(String(255), nullable=True)  # Who responded (business name)
    auto_response_generated = Column(Boolean, default=False)  # Whether response was AI-generated
    
    # Platform-specific data
    platform_data = Column(JSON, default=dict)  # Store platform-specific fields
    
    # SEO and business intelligence
    keywords_mentioned = Column(JSON, default=list)  # Service keywords mentioned
    services_mentioned = Column(JSON, default=list)  # Specific services identified
    competitor_mentions = Column(JSON, default=list)  # Competitor mentions
    location_mentions = Column(JSON, default=list)  # Location/area mentions
    
    # Moderation and quality
    is_verified = Column(Boolean, default=False)  # Platform verification status
    is_flagged = Column(Boolean, default=False)  # Flagged for review
    flag_reason = Column(String(500), nullable=True)  # Reason for flagging
    is_helpful = Column(Boolean, nullable=True)  # Whether review was marked helpful
    helpful_count = Column(Integer, default=0)  # Number of helpful votes
    
    # Sync and metadata
    last_synced_at = Column(DateTime, nullable=True)
    is_deleted_on_platform = Column(Boolean, default=False)  # Soft delete tracking
    sync_errors = Column(JSON, default=list)  # Any sync error messages
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    user = relationship("User", backref="reviews")
    review_responses = relationship("ReviewResponse", back_populates="review", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Review(id={self.id}, platform={self.platform.value}, rating={self.rating}, reviewer={self.reviewer_name})>"
    
    @property
    def is_positive(self) -> bool:
        """Check if review is positive (4+ stars or positive sentiment)"""
        return self.rating >= 4.0 or self.sentiment == ReviewSentiment.POSITIVE
    
    @property
    def is_negative(self) -> bool:
        """Check if review is negative (2 or fewer stars or negative sentiment)"""
        return self.rating <= 2.0 or self.sentiment == ReviewSentiment.NEGATIVE
    
    @property
    def needs_response(self) -> bool:
        """Check if review needs a response"""
        return (
            self.response_status == ReviewResponseStatus.PENDING and
            not self.is_deleted_on_platform and
            self.rating <= 4.0  # Respond to neutral and negative reviews
        )
    
    @property
    def can_respond(self) -> bool:
        """Check if we can still respond to this review"""
        return (
            not self.is_deleted_on_platform and
            self.response_status in [ReviewResponseStatus.PENDING, ReviewResponseStatus.FAILED, ReviewResponseStatus.DRAFT] and
            self.platform in [ReviewPlatform.GOOGLE, ReviewPlatform.FACEBOOK]  # Platforms that support responses
        )
    
    def update_sentiment(self, sentiment: ReviewSentiment, score: float = None, confidence: float = None, keywords: list = None):
        """Update sentiment analysis results"""
        self.sentiment = sentiment
        if score is not None:
            self.sentiment_score = score
        if confidence is not None:
            self.sentiment_confidence = confidence
        if keywords is not None:
            self.sentiment_keywords = keywords
        self.updated_at = utcnow()
    
    def mark_response_sent(self, response_text: str, author: str, auto_generated: bool = False):
        """Mark review as responded to"""
        self.response_status = ReviewResponseStatus.SENT
        self.response_text = response_text
        self.response_date = utcnow()
        self.response_author = author
        self.auto_response_generated = auto_generated
        self.updated_at = utcnow()
    
    def mark_response_failed(self, error: str):
        """Mark response attempt as failed"""
        self.response_status = ReviewResponseStatus.FAILED
        if not self.sync_errors:
            self.sync_errors = []
        self.sync_errors.append({
            "error": error,
            "timestamp": utcnow().isoformat(),
            "type": "response_failed"
        })
        self.updated_at = utcnow()


class ReviewResponse(Base):
    """
    Stores response drafts and templates for reviews.
    Supports A/B testing of response templates.
    """
    __tablename__ = "review_responses"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who created the response
    
    # Response content
    response_text = Column(Text, nullable=False)
    response_type = Column(String(50), default="custom")  # custom, template, auto_generated
    template_id = Column(String(100), nullable=True, index=True)  # Reference to template used
    
    # Response metadata
    is_draft = Column(Boolean, default=True)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    platform_response_id = Column(String(255), nullable=True)  # Platform's response ID
    
    # SEO optimization
    keywords_used = Column(JSON, default=list)  # SEO keywords included
    cta_included = Column(Boolean, default=False)  # Call-to-action included
    business_name_mentioned = Column(Boolean, default=False)  # Business name mentioned
    
    # Performance tracking
    view_count = Column(Integer, default=0)  # How many times response was viewed
    helpful_votes = Column(Integer, default=0)  # Platform helpful votes
    character_count = Column(Integer, default=0)  # Response length
    
    # A/B testing
    variant_id = Column(String(50), nullable=True)  # A/B test variant
    test_group = Column(String(50), nullable=True)  # Control/test group
    
    # Error tracking
    send_errors = Column(JSON, default=list)  # Any errors when sending
    last_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    review = relationship("Review", back_populates="review_responses")
    user = relationship("User")
    
    def __repr__(self):
        return f"<ReviewResponse(id={self.id}, review_id={self.review_id}, is_sent={self.is_sent})>"
    
    @property
    def is_ready_to_send(self) -> bool:
        """Check if response is ready to be sent"""
        return (
            self.is_draft and
            not self.is_sent and
            len(self.response_text.strip()) > 0 and
            self.character_count <= 4096  # Most platforms have character limits
        )
    
    def update_character_count(self):
        """Update character count based on response text"""
        self.character_count = len(self.response_text)
        self.updated_at = utcnow()
    
    def mark_sent(self, platform_response_id: str = None):
        """Mark response as sent"""
        self.is_sent = True
        self.sent_at = utcnow()
        self.is_draft = False
        if platform_response_id:
            self.platform_response_id = platform_response_id
        self.updated_at = utcnow()
    
    def add_send_error(self, error: str):
        """Add an error when sending response"""
        if not self.send_errors:
            self.send_errors = []
        self.send_errors.append({
            "error": error,
            "timestamp": utcnow().isoformat()
        })
        self.last_error = error
        self.updated_at = utcnow()


class ReviewTemplate(Base):
    """
    Pre-defined response templates for different review scenarios.
    Supports personalization and SEO optimization.
    """
    __tablename__ = "review_templates"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Template metadata
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)  # positive, negative, neutral
    platform = Column(SQLEnum(ReviewPlatform), nullable=True)  # Platform-specific template
    
    # Template content
    template_text = Column(Text, nullable=False)
    placeholders = Column(JSON, default=list)  # Available placeholders like {reviewer_name}
    
    # Conditions for auto-use
    min_rating = Column(Float, nullable=True)  # Minimum rating to use this template
    max_rating = Column(Float, nullable=True)  # Maximum rating to use this template
    keywords_trigger = Column(JSON, default=list)  # Keywords that trigger this template
    sentiment_trigger = Column(SQLEnum(ReviewSentiment), nullable=True)
    
    # SEO optimization
    seo_keywords = Column(JSON, default=list)  # Keywords to include for SEO
    include_business_name = Column(Boolean, default=True)
    include_cta = Column(Boolean, default=True)
    cta_text = Column(String(500), nullable=True)  # Custom call-to-action
    
    # Usage tracking
    use_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)  # Based on helpful votes/engagement
    avg_response_time = Column(Float, default=0.0)  # Average time to respond using this template
    
    # Template settings
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default template for category
    priority = Column(Integer, default=0)  # Higher priority templates used first
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<ReviewTemplate(id={self.id}, name={self.name}, category={self.category})>"
    
    def is_applicable_for_review(self, review: Review) -> bool:
        """Check if this template is applicable for a given review"""
        # Check rating range
        if self.min_rating is not None and review.rating < self.min_rating:
            return False
        if self.max_rating is not None and review.rating > self.max_rating:
            return False
        
        # Check sentiment
        if self.sentiment_trigger and review.sentiment != self.sentiment_trigger:
            return False
        
        # Check platform
        if self.platform and review.platform != self.platform:
            return False
        
        # Check keyword triggers
        if self.keywords_trigger:
            review_text = (review.review_text or "").lower()
            if not any(keyword.lower() in review_text for keyword in self.keywords_trigger):
                return False
        
        return self.is_active
    
    def generate_response(self, review: Review, business_name: str = None) -> str:
        """Generate a personalized response using this template"""
        response = self.template_text
        
        # Replace placeholders
        placeholders = {
            "reviewer_name": review.reviewer_name or "valued customer",
            "business_name": business_name or "our business",
            "rating": str(int(review.rating)) if review.rating else "5",
            "date": review.review_date.strftime("%B %Y") if review.review_date else ""
        }
        
        for placeholder, value in placeholders.items():
            response = response.replace(f"{{{placeholder}}}", value)
        
        # Add CTA if enabled
        if self.include_cta and self.cta_text:
            response = f"{response}\n\n{self.cta_text}"
        
        return response
    
    def increment_usage(self):
        """Increment usage count and update last used date"""
        self.use_count += 1
        self.last_used_at = utcnow()
        self.updated_at = utcnow()