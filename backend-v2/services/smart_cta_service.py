"""
Smart Call-to-Action Generation System for BookedBarber V2.
Provides context-aware, sentiment-based CTA generation with A/B testing,
performance tracking, and integration with existing review management system.
"""

import logging
import re
import json
import hashlib
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, Counter
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from services.business_context_service import BusinessContextService, BusinessContext
from services.keyword_generation_service import KeywordGenerationService
from utils.sanitization import sanitize_input, validate_text_content
from models.review import Review, ReviewSentiment
from models import User, Service

# Configure logging
logger = logging.getLogger(__name__)


class CTAType(Enum):
    """CTA type enumeration"""
    VISIT = "visit"
    CONTACT = "contact" 
    BOOK = "book"
    FOLLOW = "follow"
    CALL = "call"
    WEBSITE = "website"
    SPECIAL_OFFER = "special_offer"
    REFERRAL = "referral"


class CTAPlacement(Enum):
    """CTA placement enumeration"""
    BEGINNING = "beginning"
    MIDDLE = "middle"
    END = "end"
    STANDALONE = "standalone"


class CTAPersonalization(Enum):
    """CTA personalization level"""
    NONE = "none"
    BASIC = "basic"
    ADVANCED = "advanced"
    HYPER_PERSONALIZED = "hyper_personalized"


@dataclass
class CTAVariant:
    """CTA variant for A/B testing"""
    id: str
    text: str
    type: CTAType
    placement: CTAPlacement
    personalization_level: CTAPersonalization
    target_audience: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class CTAPerformanceData:
    """CTA performance tracking data"""
    variant_id: str
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    engagement_score: float = 0.0
    sentiment_impact: float = 0.0
    last_updated: datetime = field(default_factory=datetime.utcnow)
    
    @property
    def click_through_rate(self) -> float:
        return (self.clicks / self.impressions) if self.impressions > 0 else 0.0
    
    @property
    def conversion_rate(self) -> float:
        return (self.conversions / self.clicks) if self.clicks > 0 else 0.0


@dataclass
class CTARecommendation:
    """Enhanced CTA recommendation with optimization data"""
    primary_variant: CTAVariant
    alternative_variants: List[CTAVariant] = field(default_factory=list)
    effectiveness_score: float = 0.0
    local_seo_value: float = 0.0
    personalization_score: float = 0.0
    seasonal_relevance: float = 0.0
    a_b_test_ready: bool = False
    optimization_notes: List[str] = field(default_factory=list)


@dataclass
class CTAContext:
    """Context for CTA generation"""
    business_context: BusinessContext
    review: Optional[Review] = None
    service_type: Optional[str] = None
    season: Optional[str] = None
    time_of_day: Optional[str] = None
    customer_segment: Optional[str] = None
    campaign_context: Optional[str] = None
    historical_performance: Optional[Dict[str, float]] = None


class SmartCTAService:
    """
    Intelligent Call-to-Action Generation System.
    
    Features:
    1. Context-aware CTA generation based on business, service, and sentiment
    2. Sentiment-based CTA optimization for different review types
    3. A/B testing support with performance tracking
    4. Seasonal and promotional CTA integration
    5. Advanced personalization and audience targeting
    6. Spam detection and content quality validation
    7. Performance analytics and ROI measurement
    """
    
    def __init__(self, db: Session):
        """
        Initialize the Smart CTA Service.
        
        Args:
            db: Database session for data access
        """
        if not db:
            raise ValueError("Database session cannot be None")
        
        self.db = db
        self.business_context_service = BusinessContextService(db)
        self.keyword_service = KeywordGenerationService(db)
        
        # CTA templates organized by type and sentiment
        self.cta_templates = {
            CTAType.VISIT: {
                "positive": [
                    "Visit us again soon for another exceptional experience!",
                    "We can't wait to welcome you back to {business_name}!",
                    "Your next amazing {service} appointment awaits!",
                    "Come see us again at {business_name} - you're always welcome!",
                    "We look forward to serving you again soon!"
                ],
                "neutral": [
                    "We'd love to have you visit us again at {business_name}.",
                    "Come experience our full range of services at {business_name}.",
                    "Visit us again and let us exceed your expectations.",
                    "We invite you to experience what makes {business_name} special.",
                    "Your next visit to {business_name} awaits - book today!"
                ],
                "negative": [
                    "Please give us another chance to provide you with exceptional service.",
                    "We'd appreciate the opportunity to restore your confidence in {business_name}.",
                    "Visit us again so we can show you the service we're truly known for.",
                    "Let us make it right - your next visit is on us.",
                    "We're committed to earning back your trust - please visit us again."
                ]
            },
            CTAType.BOOK: {
                "positive": [
                    "Book your next {service} appointment today!",
                    "Reserve your spot for another amazing experience!",
                    "Schedule your next visit - book online or call us!",
                    "Don't wait - book your preferred time slot now!",
                    "Book now and secure your spot with {barber_name}!"
                ],
                "neutral": [
                    "Ready to book your next appointment? We're here when you need us.",
                    "Schedule your next {service} appointment at your convenience.",
                    "Book your appointment today and experience the difference.",
                    "Easy online booking available - schedule your visit now.",
                    "Book your next appointment and let us earn your loyalty."
                ],
                "negative": [
                    "Book another appointment and let us make things right.",
                    "Schedule a follow-up visit so we can exceed your expectations.",
                    "Give us another chance - book your next appointment today.",
                    "We're ready to provide the service you deserve - book now.",
                    "Schedule your return visit and experience our commitment to excellence."
                ]
            },
            CTAType.CONTACT: {
                "positive": [
                    "Contact us anytime - we love hearing from our valued clients!",
                    "Have questions? We're always here to help at {business_name}.",
                    "Reach out to us for personalized service recommendations.",
                    "Contact us to learn about our latest services and specials.",
                    "Get in touch - we're here to serve you better!"
                ],
                "neutral": [
                    "Contact us directly to discuss your grooming needs.",
                    "Reach out with any questions about our services.",
                    "We're here to help - contact us anytime.",
                    "Have specific requests? Contact us for personalized service.",
                    "Get in touch to learn more about what we offer."
                ],
                "negative": [
                    "Please contact us directly so we can address your concerns.",
                    "Reach out to us - we're committed to making this right.",
                    "Contact our management team to discuss your experience.",
                    "We want to hear from you - please reach out directly.",
                    "Contact us immediately so we can resolve this issue."
                ]
            },
            CTAType.CALL: {
                "positive": [
                    "Call us at {phone} to schedule your next appointment!",
                    "Give us a call - we'd love to hear from you!",
                    "Call {phone} for immediate booking assistance.",
                    "Pick up the phone and call us today!",
                    "Call now for personalized service scheduling!"
                ],
                "neutral": [
                    "Call us at {phone} with any questions or to book.",
                    "Give us a call to discuss your service needs.",
                    "Call {phone} for booking and service information.",
                    "Prefer to talk? Call us directly at {phone}.",
                    "Call us today to schedule your appointment."
                ],
                "negative": [
                    "Please call us at {phone} to discuss your experience.",
                    "Call our manager directly at {phone} - we want to help.",
                    "Give us a call so we can make this right immediately.",
                    "Call {phone} to speak with our team about your concerns.",
                    "Please call us so we can address this personally."
                ]
            },
            CTAType.FOLLOW: {
                "positive": [
                    "Follow us on social media for style inspiration and updates!",
                    "Stay connected with us for the latest trends and tips!",
                    "Follow @{social_handle} for behind-the-scenes content!",
                    "Join our community of style enthusiasts - follow us!",
                    "Follow us for exclusive offers and grooming tips!"
                ],
                "neutral": [
                    "Follow us on social media for updates and offers.",
                    "Stay in touch - follow us for the latest news.",
                    "Follow us to stay updated on our services and specials.",
                    "Connect with us on social media for more information.",
                    "Follow us for grooming tips and style inspiration."
                ],
                "negative": [
                    "Follow us to see how we're improving our services.",
                    "Stay connected - we're working hard to serve you better.",
                    "Follow our journey as we continue to improve.",
                    "See our commitment to excellence - follow us for updates.",
                    "Follow us to track our progress and improvements."
                ]
            },
            CTAType.SPECIAL_OFFER: {
                "positive": [
                    "Ask about our loyalty rewards for valued clients like you!",
                    "Enjoy 10% off your next visit - you've earned it!",
                    "Special offer: Bring a friend and both save 15%!",
                    "As a valued client, you qualify for our VIP pricing!",
                    "Exclusive offer: Free beard trim with your next haircut!"
                ],
                "neutral": [
                    "Ask about our current promotions and special offers.",
                    "Check out our seasonal specials and package deals.",
                    "New client special: 20% off your first visit!",
                    "Ask about our service packages and combination deals.",
                    "Special pricing available for regular appointments."
                ],
                "negative": [
                    "We'd like to offer you a complimentary service to make things right.",
                    "Let us make it up to you with a special discount on your next visit.",
                    "As an apology, we're offering you our premium service at no extra charge.",
                    "We want to earn back your trust - your next visit is 50% off.",
                    "Special compensation offer available - please contact us directly."
                ]
            },
            CTAType.REFERRAL: {
                "positive": [
                    "Refer a friend and you both save 20%!",
                    "Share the {business_name} experience - refer a friend today!",
                    "Know someone who needs great grooming? Send them our way!",
                    "Refer friends and earn rewards for each successful referral!",
                    "Spread the word about {business_name} and earn exclusive benefits!"
                ],
                "neutral": [
                    "Refer friends and family to experience our quality service.",
                    "Know someone looking for a great barber? Send them to us!",
                    "Referral program available - ask us for details.",
                    "Help others discover {business_name} through referrals.",
                    "Share us with friends who appreciate quality grooming."
                ],
                "negative": [
                    "We hope to earn the right to your referrals in the future.",
                    "Once we've made things right, we'd appreciate your referrals.",
                    "We're working to become the barbershop you'd refer to friends.",
                    "Help us improve by referring friends who can give us feedback.",
                    "We value your input and hope to earn your referrals soon."
                ]
            }
        }
        
        # Seasonal CTA modifiers
        self.seasonal_modifiers = {
            "spring": [
                "spring refresh", "fresh new look", "seasonal style update",
                "spring grooming special", "fresh start"
            ],
            "summer": [
                "summer ready", "vacation haircut", "beat the heat",
                "summer style", "cool and comfortable"
            ],
            "fall": [
                "back to business", "fall makeover", "professional look",
                "autumn refresh", "new season style"
            ],
            "winter": [
                "holiday ready", "winter maintenance", "new year new look",
                "holiday special", "winter grooming"
            ]
        }
        
        # Service-specific CTA context
        self.service_contexts = {
            "haircut": {
                "keywords": ["haircut", "cut", "trim", "style"],
                "urgency": "medium",
                "frequency": "monthly"
            },
            "beard_trim": {
                "keywords": ["beard", "facial hair", "trim", "grooming"],
                "urgency": "medium", 
                "frequency": "bi-weekly"
            },
            "shave": {
                "keywords": ["shave", "straight razor", "hot towel"],
                "urgency": "high",
                "frequency": "weekly"
            },
            "styling": {
                "keywords": ["style", "styling", "hair styling", "professional"],
                "urgency": "high",
                "frequency": "occasional"
            }
        }
        
        # Performance tracking storage
        self.performance_data: Dict[str, CTAPerformanceData] = {}
        self.active_tests: Dict[str, Dict[str, CTAVariant]] = {}
        
        # Quality validation thresholds
        self.quality_thresholds = {
            "min_length": 10,
            "max_length": 200,
            "spam_keyword_limit": 3,
            "caps_ratio_limit": 0.3,
            "punctuation_limit": 0.2,
            "personal_info_check": True
        }
    
    def generate_smart_cta(
        self,
        business_context: BusinessContext,
        review: Optional[Review] = None,
        service_type: str = "general",
        context: Optional[CTAContext] = None
    ) -> CTARecommendation:
        """
        Generate smart, context-aware call-to-action.
        
        Args:
            business_context: Business context for personalization
            review: Review object for sentiment-based optimization
            service_type: Type of service for contextual CTAs
            context: Additional context for CTA generation
            
        Returns:
            CTARecommendation with optimized CTA and alternatives
        """
        try:
            # Validate inputs
            if not business_context:
                raise ValueError("BusinessContext is required")
            
            # Build context if not provided
            if not context:
                context = CTAContext(
                    business_context=business_context,
                    review=review,
                    service_type=service_type,
                    season=self._get_current_season(),
                    time_of_day=self._get_time_of_day(),
                    customer_segment=self._determine_customer_segment(review),
                    historical_performance=self._get_historical_performance(service_type)
                )
            
            # Determine sentiment
            sentiment = self._determine_sentiment(review)
            
            # Generate primary CTA variant
            primary_variant = self._generate_primary_cta_variant(context, sentiment)
            
            # Generate alternative variants for A/B testing
            alternative_variants = self._generate_alternative_variants(context, sentiment, primary_variant)
            
            # Calculate effectiveness scores
            effectiveness_score = self._calculate_effectiveness_score(primary_variant, context)
            local_seo_value = self._calculate_local_seo_value(primary_variant, context)
            personalization_score = self._calculate_personalization_score(primary_variant, context)
            seasonal_relevance = self._calculate_seasonal_relevance(primary_variant, context)
            
            # Generate optimization notes
            optimization_notes = self._generate_optimization_notes(primary_variant, context)
            
            return CTARecommendation(
                primary_variant=primary_variant,
                alternative_variants=alternative_variants,
                effectiveness_score=effectiveness_score,
                local_seo_value=local_seo_value,
                personalization_score=personalization_score,
                seasonal_relevance=seasonal_relevance,
                a_b_test_ready=len(alternative_variants) > 0,
                optimization_notes=optimization_notes
            )
            
        except Exception as e:
            logger.error(f"Error generating smart CTA: {e}")
            # Return safe fallback
            fallback_variant = CTAVariant(
                id=self._generate_variant_id("fallback"),
                text="Thank you for your feedback!",
                type=CTAType.VISIT,
                placement=CTAPlacement.END,
                personalization_level=CTAPersonalization.NONE
            )
            
            return CTARecommendation(
                primary_variant=fallback_variant,
                effectiveness_score=0.3,
                local_seo_value=0.2,
                personalization_score=0.0,
                seasonal_relevance=0.0,
                optimization_notes=["Fallback CTA generated due to error"]
            )
    
    def optimize_cta_for_sentiment(
        self,
        cta: str,
        sentiment: ReviewSentiment,
        business_context: BusinessContext
    ) -> str:
        """
        Optimize existing CTA text for specific sentiment.
        
        Args:
            cta: Original CTA text
            sentiment: Review sentiment to optimize for
            business_context: Business context for personalization
            
        Returns:
            Optimized CTA text
        """
        try:
            # Validate inputs
            if not cta or not validate_text_content(cta):
                raise ValueError("Invalid CTA text provided")
            
            # Sanitize input
            cta = sanitize_input(cta)
            
            # Determine sentiment string
            sentiment_str = self._sentiment_to_string(sentiment)
            
            # Apply sentiment-specific optimizations
            optimized_cta = self._apply_sentiment_optimizations(cta, sentiment_str, business_context)
            
            # Apply personalization
            optimized_cta = self._apply_personalization(optimized_cta, business_context)
            
            # Validate quality
            if not self._validate_cta_quality(optimized_cta):
                logger.warning(f"CTA quality validation failed, returning original: {cta}")
                return cta
            
            return optimized_cta
            
        except Exception as e:
            logger.error(f"Error optimizing CTA for sentiment: {e}")
            return cta  # Return original on error
    
    def track_cta_performance(
        self,
        cta_id: str,
        event_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Track CTA performance events.
        
        Args:
            cta_id: Unique CTA identifier
            event_type: Type of event ('impression', 'click', 'conversion')
            metadata: Additional event metadata
        """
        try:
            if cta_id not in self.performance_data:
                self.performance_data[cta_id] = CTAPerformanceData(variant_id=cta_id)
            
            performance = self.performance_data[cta_id]
            
            if event_type == "impression":
                performance.impressions += 1
            elif event_type == "click":
                performance.clicks += 1
            elif event_type == "conversion":
                performance.conversions += 1
            
            # Update engagement score
            performance.engagement_score = self._calculate_engagement_score(performance)
            performance.last_updated = datetime.utcnow()
            
            # Log for analytics
            logger.info(f"CTA performance tracked: {cta_id} - {event_type}")
            
        except Exception as e:
            logger.error(f"Error tracking CTA performance: {e}")
    
    def get_seasonal_cta_variants(
        self,
        business_context: BusinessContext,
        season: Optional[str] = None
    ) -> List[str]:
        """
        Generate seasonal CTA variants.
        
        Args:
            business_context: Business context for personalization
            season: Specific season or current season if None
            
        Returns:
            List of seasonal CTA variants
        """
        try:
            if not season:
                season = self._get_current_season()
            
            seasonal_variants = []
            modifiers = self.seasonal_modifiers.get(season, [])
            
            # Generate variants for each CTA type
            for cta_type in [CTAType.BOOK, CTAType.VISIT, CTAType.SPECIAL_OFFER]:
                templates = self.cta_templates[cta_type]["positive"]
                
                for template in templates[:2]:  # Limit to 2 per type
                    for modifier in modifiers[:2]:  # Limit modifiers
                        variant = template.format(
                            business_name=business_context.business_name,
                            service=modifier,
                            phone=business_context.phone or ""
                        )
                        seasonal_variants.append(variant)
            
            return seasonal_variants[:10]  # Return top 10 variants
            
        except Exception as e:
            logger.error(f"Error generating seasonal CTA variants: {e}")
            return []
    
    def get_cta_performance_analytics(
        self,
        timeframe_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get CTA performance analytics.
        
        Args:
            timeframe_days: Number of days to analyze
            
        Returns:
            Analytics dictionary with performance metrics
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=timeframe_days)
            
            # Filter recent performance data
            recent_data = {
                cta_id: data for cta_id, data in self.performance_data.items()
                if data.last_updated >= cutoff_date
            }
            
            if not recent_data:
                return {"message": "No performance data available"}
            
            # Calculate aggregate metrics
            total_impressions = sum(data.impressions for data in recent_data.values())
            total_clicks = sum(data.clicks for data in recent_data.values())
            total_conversions = sum(data.conversions for data in recent_data.values())
            
            avg_ctr = (total_clicks / total_impressions) if total_impressions > 0 else 0
            avg_conversion_rate = (total_conversions / total_clicks) if total_clicks > 0 else 0
            
            # Top performing CTAs
            top_performers = sorted(
                recent_data.items(),
                key=lambda x: x[1].engagement_score,
                reverse=True
            )[:5]
            
            # A/B test results
            active_test_results = self._analyze_active_tests()
            
            return {
                "timeframe_days": timeframe_days,
                "total_ctas_tracked": len(recent_data),
                "total_impressions": total_impressions,
                "total_clicks": total_clicks,
                "total_conversions": total_conversions,
                "average_ctr": round(avg_ctr, 4),
                "average_conversion_rate": round(avg_conversion_rate, 4),
                "top_performers": [
                    {
                        "cta_id": cta_id,
                        "impressions": data.impressions,
                        "clicks": data.clicks,
                        "conversions": data.conversions,
                        "ctr": data.click_through_rate,
                        "conversion_rate": data.conversion_rate,
                        "engagement_score": data.engagement_score
                    }
                    for cta_id, data in top_performers
                ],
                "active_ab_tests": active_test_results,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting CTA performance analytics: {e}")
            return {"error": "Failed to generate analytics"}
    
    def create_ab_test(
        self,
        test_name: str,
        variants: List[CTAVariant],
        business_context: BusinessContext
    ) -> str:
        """
        Create A/B test for CTA variants.
        
        Args:
            test_name: Name of the A/B test
            variants: List of CTA variants to test
            business_context: Business context for the test
            
        Returns:
            Test ID for tracking
        """
        try:
            if len(variants) < 2:
                raise ValueError("A/B test requires at least 2 variants")
            
            test_id = self._generate_test_id(test_name)
            
            # Validate all variants
            for variant in variants:
                if not self._validate_cta_quality(variant.text):
                    raise ValueError(f"Variant {variant.id} failed quality validation")
            
            # Store test configuration
            self.active_tests[test_id] = {
                variant.id: variant for variant in variants
            }
            
            # Initialize performance tracking for each variant
            for variant in variants:
                self.performance_data[variant.id] = CTAPerformanceData(variant_id=variant.id)
            
            logger.info(f"A/B test created: {test_id} with {len(variants)} variants")
            return test_id
            
        except Exception as e:
            logger.error(f"Error creating A/B test: {e}")
            raise
    
    # ==================== PRIVATE HELPER METHODS ====================
    
    def _determine_sentiment(self, review: Optional[Review]) -> str:
        """Determine sentiment from review"""
        if not review:
            return "neutral"
        
        if review.sentiment == ReviewSentiment.POSITIVE or (review.rating and review.rating >= 4):
            return "positive"
        elif review.sentiment == ReviewSentiment.NEGATIVE or (review.rating and review.rating <= 2):
            return "negative"
        else:
            return "neutral"
    
    def _sentiment_to_string(self, sentiment: ReviewSentiment) -> str:
        """Convert ReviewSentiment enum to string"""
        if sentiment == ReviewSentiment.POSITIVE:
            return "positive"
        elif sentiment == ReviewSentiment.NEGATIVE:
            return "negative"
        else:
            return "neutral"
    
    def _get_current_season(self) -> str:
        """Get current season based on date"""
        month = datetime.now().month
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "fall"
        else:
            return "winter"
    
    def _get_time_of_day(self) -> str:
        """Get current time of day"""
        hour = datetime.now().hour
        if 6 <= hour < 12:
            return "morning"
        elif 12 <= hour < 17:
            return "afternoon"
        elif 17 <= hour < 21:
            return "evening"
        else:
            return "night"
    
    def _determine_customer_segment(self, review: Optional[Review]) -> str:
        """Determine customer segment from review data"""
        if not review:
            return "general"
        
        # Simple segmentation based on rating and sentiment
        if review.rating and review.rating >= 5:
            return "loyal"
        elif review.rating and review.rating <= 2:
            return "detractor"
        else:
            return "neutral"
    
    def _get_historical_performance(self, service_type: str) -> Dict[str, float]:
        """Get historical performance data for service type"""
        # This would query actual historical data
        # For now, return mock data
        return {
            "avg_effectiveness": 0.75,
            "avg_conversion": 0.15,
            "click_through_rate": 0.08
        }
    
    def _generate_primary_cta_variant(
        self,
        context: CTAContext,
        sentiment: str
    ) -> CTAVariant:
        """Generate primary CTA variant based on context"""
        # Determine optimal CTA type
        cta_type = self._determine_optimal_cta_type(context, sentiment)
        
        # Select template
        templates = self.cta_templates[cta_type][sentiment]
        template = self._select_best_template(templates, context)
        
        # Apply personalization
        cta_text = self._apply_personalization(template, context.business_context)
        
        # Apply seasonal modifications if relevant
        if context.season and self._should_apply_seasonal_modifier(context):
            cta_text = self._apply_seasonal_modifier(cta_text, context.season)
        
        # Validate and sanitize
        cta_text = sanitize_input(cta_text)
        
        return CTAVariant(
            id=self._generate_variant_id(f"{cta_type.value}_{sentiment}"),
            text=cta_text,
            type=cta_type,
            placement=self._determine_optimal_placement(cta_type, sentiment),
            personalization_level=self._determine_personalization_level(context),
            target_audience=context.customer_segment,
            metadata={
                "service_type": context.service_type,
                "season": context.season,
                "sentiment": sentiment
            }
        )
    
    def _generate_alternative_variants(
        self,
        context: CTAContext,
        sentiment: str,
        primary_variant: CTAVariant
    ) -> List[CTAVariant]:
        """Generate alternative CTA variants for A/B testing"""
        alternatives = []
        
        # Generate variants with different CTA types
        for cta_type in [CTAType.BOOK, CTAType.CONTACT, CTAType.VISIT]:
            if cta_type != primary_variant.type:
                variant = self._create_variant_for_type(cta_type, context, sentiment)
                alternatives.append(variant)
        
        # Generate variants with different personalization levels
        for person_level in [CTAPersonalization.BASIC, CTAPersonalization.ADVANCED]:
            if person_level != primary_variant.personalization_level:
                variant = self._create_personalized_variant(context, sentiment, person_level)
                alternatives.append(variant)
        
        return alternatives[:3]  # Limit to 3 alternatives
    
    def _determine_optimal_cta_type(self, context: CTAContext, sentiment: str) -> CTAType:
        """Determine optimal CTA type based on context"""
        service_type = context.service_type or "general"
        
        # Negative sentiment gets priority for contact
        if sentiment == "negative":
            return CTAType.CONTACT
        # Service-specific logic for positive/neutral
        elif service_type in ["haircut", "cut", "trim"]:
            return CTAType.BOOK
        elif context.customer_segment == "loyal":
            return CTAType.REFERRAL
        else:
            return CTAType.VISIT
    
    def _select_best_template(self, templates: List[str], context: CTAContext) -> str:
        """Select best template based on context"""
        # Simple selection - in production this would use ML
        if context.historical_performance:
            # Use historical data to influence selection
            return templates[0]  # Placeholder logic
        else:
            return templates[0]  # Default to first template
    
    def _apply_personalization(self, template: str, business_context: BusinessContext) -> str:
        """Apply personalization to CTA template"""
        personalized = template
        
        # Replace common placeholders
        if "{business_name}" in personalized:
            personalized = personalized.replace("{business_name}", business_context.business_name)
        
        if "{phone}" in personalized and business_context.phone:
            personalized = personalized.replace("{phone}", business_context.phone)
        
        if "{city}" in personalized and business_context.city:
            personalized = personalized.replace("{city}", business_context.city)
        
        # Add barber name if available
        if "{barber_name}" in personalized and business_context.barber_names:
            personalized = personalized.replace("{barber_name}", business_context.barber_names[0])
        
        # Add service context
        if "{service}" in personalized:
            personalized = personalized.replace("{service}", "service")
        
        return personalized
    
    def _apply_sentiment_optimizations(
        self,
        cta: str,
        sentiment: str,
        business_context: BusinessContext
    ) -> str:
        """Apply sentiment-specific optimizations to CTA"""
        optimized = cta
        
        if sentiment == "negative":
            # Add urgency and empathy
            if "contact" not in optimized.lower():
                optimized = f"Please contact us directly - {optimized.lower()}"
        elif sentiment == "positive":
            # Add gratitude and invitation
            if "thank" not in optimized.lower():
                optimized = f"Thank you! {optimized}"
        
        return optimized
    
    def _apply_seasonal_modifier(self, cta: str, season: str) -> str:
        """Apply seasonal modifiers to CTA"""
        modifiers = self.seasonal_modifiers.get(season, [])
        if modifiers and "{service}" in cta:
            seasonal_service = modifiers[0]  # Use first modifier
            return cta.replace("{service}", seasonal_service)
        return cta
    
    def _should_apply_seasonal_modifier(self, context: CTAContext) -> bool:
        """Determine if seasonal modifier should be applied"""
        # Apply seasonal modifiers during relevant seasons
        return context.season in ["spring", "fall", "winter"]
    
    def _determine_optimal_placement(self, cta_type: CTAType, sentiment: str) -> CTAPlacement:
        """Determine optimal CTA placement"""
        if sentiment == "negative":
            return CTAPlacement.BEGINNING  # Urgent action needed
        elif cta_type == CTAType.CONTACT:
            return CTAPlacement.END
        else:
            return CTAPlacement.END
    
    def _determine_personalization_level(self, context: CTAContext) -> CTAPersonalization:
        """Determine appropriate personalization level"""
        if context.customer_segment == "loyal":
            return CTAPersonalization.ADVANCED
        elif context.business_context.barber_names:
            return CTAPersonalization.BASIC
        else:
            return CTAPersonalization.NONE
    
    def _calculate_effectiveness_score(
        self,
        variant: CTAVariant,
        context: CTAContext
    ) -> float:
        """Calculate CTA effectiveness score"""
        score = 0.5  # Base score
        
        # Type-based scoring
        type_scores = {
            CTAType.BOOK: 0.9,
            CTAType.CONTACT: 0.8,
            CTAType.VISIT: 0.7,
            CTAType.CALL: 0.85,
            CTAType.SPECIAL_OFFER: 1.0,
            CTAType.REFERRAL: 0.6,
            CTAType.FOLLOW: 0.4
        }
        score = type_scores.get(variant.type, 0.5)
        
        # Personalization bonus
        person_bonus = {
            CTAPersonalization.NONE: 0.0,
            CTAPersonalization.BASIC: 0.1,
            CTAPersonalization.ADVANCED: 0.2,
            CTAPersonalization.HYPER_PERSONALIZED: 0.3
        }
        score += person_bonus.get(variant.personalization_level, 0.0)
        
        # Historical performance boost
        if context.historical_performance:
            score += context.historical_performance.get("avg_effectiveness", 0.0) * 0.2
        
        return min(score, 1.0)
    
    def _calculate_local_seo_value(
        self,
        variant: CTAVariant,
        context: CTAContext
    ) -> float:
        """Calculate local SEO value of CTA"""
        score = 0.0
        text_lower = variant.text.lower()
        
        # Business name mention
        if context.business_context.business_name.lower() in text_lower:
            score += 0.3
        
        # City mention
        if context.business_context.city and context.business_context.city.lower() in text_lower:
            score += 0.2
        
        # Service keywords
        service_keywords = ["barber", "haircut", "grooming", "style", "salon"]
        for keyword in service_keywords:
            if keyword in text_lower:
                score += 0.1
                break
        
        # Action words
        action_words = ["book", "visit", "contact", "call", "schedule"]
        for word in action_words:
            if word in text_lower:
                score += 0.1
                break
        
        return min(score, 1.0)
    
    def _calculate_personalization_score(
        self,
        variant: CTAVariant,
        context: CTAContext
    ) -> float:
        """Calculate personalization score"""
        score = 0.0
        text = variant.text
        
        # Check for personalization elements
        if context.business_context.business_name in text:
            score += 0.4
        if context.business_context.phone and context.business_context.phone in text:
            score += 0.2
        if context.business_context.city and context.business_context.city in text:
            score += 0.2
        if variant.target_audience:
            score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_seasonal_relevance(
        self,
        variant: CTAVariant,
        context: CTAContext
    ) -> float:
        """Calculate seasonal relevance score"""
        if not context.season:
            return 0.0
        
        seasonal_keywords = self.seasonal_modifiers.get(context.season, [])
        text_lower = variant.text.lower()
        
        for keyword in seasonal_keywords:
            if keyword.lower() in text_lower:
                return 1.0
        
        return 0.0
    
    def _extract_service_type(self, keywords: List[str]) -> str:
        """Extract service type from keywords"""
        if not keywords:
            return "general"
            
        # Convert keywords to lowercase for comparison
        keywords_lower = [k.lower() for k in keywords]
        
        # Service mapping
        service_keywords = {
            "haircut": ["haircut", "cut", "trim", "hair"],
            "beard_trim": ["beard", "facial", "mustache"],
            "shave": ["shave", "razor", "hot towel"],
            "styling": ["style", "styling", "professional"]
        }
        
        for service_type, service_keywords_list in service_keywords.items():
            for keyword in keywords_lower:
                if any(sk in keyword for sk in service_keywords_list):
                    return service_type
        
        return "general"
    
    def _generate_optimization_notes(
        self,
        variant: CTAVariant,
        context: CTAContext
    ) -> List[str]:
        """Generate optimization notes for CTA"""
        notes = []
        
        # Length optimization
        if len(variant.text) < 20:
            notes.append("Consider expanding CTA text for more impact")
        elif len(variant.text) > 150:
            notes.append("Consider shortening CTA text for better engagement")
        
        # Personalization suggestions
        if variant.personalization_level == CTAPersonalization.NONE:
            notes.append("Add business name for better personalization")
        
        # Action word analysis
        action_words = ["book", "visit", "contact", "call", "schedule"]
        if not any(word in variant.text.lower() for word in action_words):
            notes.append("Consider adding action words for stronger CTA")
        
        # Seasonal relevance
        if context.season and self._calculate_seasonal_relevance(variant, context) == 0.0:
            notes.append(f"Consider adding {context.season} seasonal elements")
        
        return notes
    
    def _validate_cta_quality(self, cta_text: str) -> bool:
        """Validate CTA quality against spam and content guidelines"""
        try:
            # Length validation
            if len(cta_text) < self.quality_thresholds["min_length"]:
                return False
            if len(cta_text) > self.quality_thresholds["max_length"]:
                return False
            
            # Spam keyword detection
            spam_keywords = ["free", "urgent", "limited time", "act now", "don't miss"]
            spam_count = sum(1 for keyword in spam_keywords if keyword.lower() in cta_text.lower())
            if spam_count > self.quality_thresholds["spam_keyword_limit"]:
                return False
            
            # Caps ratio check
            caps_ratio = sum(1 for c in cta_text if c.isupper()) / len(cta_text)
            if caps_ratio > self.quality_thresholds["caps_ratio_limit"]:
                return False
            
            # Punctuation check
            punct_ratio = sum(1 for c in cta_text if c in "!@#$%^&*") / len(cta_text)
            if punct_ratio > self.quality_thresholds["punctuation_limit"]:
                return False
            
            # Personal information check
            if self.quality_thresholds["personal_info_check"]:
                personal_patterns = [
                    r'\b\d{3}-\d{3}-\d{4}\b',  # Phone numbers
                    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'  # Email
                ]
                for pattern in personal_patterns:
                    if re.search(pattern, cta_text):
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating CTA quality: {e}")
            return False
    
    def _create_variant_for_type(
        self,
        cta_type: CTAType,
        context: CTAContext,
        sentiment: str
    ) -> CTAVariant:
        """Create CTA variant for specific type"""
        templates = self.cta_templates[cta_type][sentiment]
        template = templates[0]  # Use first template
        
        cta_text = self._apply_personalization(template, context.business_context)
        
        return CTAVariant(
            id=self._generate_variant_id(f"{cta_type.value}_{sentiment}_alt"),
            text=cta_text,
            type=cta_type,
            placement=self._determine_optimal_placement(cta_type, sentiment),
            personalization_level=CTAPersonalization.BASIC,
            target_audience=context.customer_segment
        )
    
    def _create_personalized_variant(
        self,
        context: CTAContext,
        sentiment: str,
        personalization_level: CTAPersonalization
    ) -> CTAVariant:
        """Create variant with specific personalization level"""
        cta_type = CTAType.VISIT  # Default type
        templates = self.cta_templates[cta_type][sentiment]
        template = templates[0]
        
        # Apply different levels of personalization
        if personalization_level == CTAPersonalization.ADVANCED:
            template = f"Hi there! {template}"  # Add greeting
        
        cta_text = self._apply_personalization(template, context.business_context)
        
        return CTAVariant(
            id=self._generate_variant_id(f"personalized_{personalization_level.value}"),
            text=cta_text,
            type=cta_type,
            placement=CTAPlacement.END,
            personalization_level=personalization_level,
            target_audience=context.customer_segment
        )
    
    def _calculate_engagement_score(self, performance: CTAPerformanceData) -> float:
        """Calculate engagement score from performance data"""
        if performance.impressions == 0:
            return 0.0
        
        # Weighted score based on CTR and conversion rate
        ctr_weight = 0.6
        conversion_weight = 0.4
        
        ctr_score = min(performance.click_through_rate * 10, 1.0)  # Scale CTR
        conversion_score = min(performance.conversion_rate * 5, 1.0)  # Scale conversion rate
        
        return (ctr_weight * ctr_score) + (conversion_weight * conversion_score)
    
    def _analyze_active_tests(self) -> Dict[str, Any]:
        """Analyze active A/B tests"""
        results = {}
        
        for test_id, variants in self.active_tests.items():
            test_results = {
                "test_id": test_id,
                "variants": [],
                "winner": None,
                "confidence_level": 0.0
            }
            
            for variant_id, variant in variants.items():
                if variant_id in self.performance_data:
                    perf = self.performance_data[variant_id]
                    test_results["variants"].append({
                        "variant_id": variant_id,
                        "text": variant.text,
                        "impressions": perf.impressions,
                        "clicks": perf.clicks,
                        "conversions": perf.conversions,
                        "ctr": perf.click_through_rate,
                        "conversion_rate": perf.conversion_rate,
                        "engagement_score": perf.engagement_score
                    })
            
            # Determine winner (simplified)
            if test_results["variants"]:
                winner = max(test_results["variants"], key=lambda x: x["engagement_score"])
                test_results["winner"] = winner["variant_id"]
                test_results["confidence_level"] = min(winner["engagement_score"], 1.0)
            
            results[test_id] = test_results
        
        return results
    
    def _generate_variant_id(self, base: str) -> str:
        """Generate unique variant ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        hash_str = hashlib.md5(f"{base}_{timestamp}".encode()).hexdigest()[:8]
        return f"{base}_{hash_str}"
    
    def _generate_test_id(self, test_name: str) -> str:
        """Generate unique test ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        clean_name = re.sub(r'[^\w\-_]', '_', test_name)
        return f"test_{clean_name}_{timestamp}"


# ==================== UTILITY FUNCTIONS ====================

def calculate_cta_roi_estimate(
    baseline_conversion_rate: float,
    optimized_conversion_rate: float,
    monthly_impressions: int = 1000
) -> Dict[str, Any]:
    """
    Calculate estimated ROI from CTA optimization.
    
    Args:
        baseline_conversion_rate: Original conversion rate
        optimized_conversion_rate: Improved conversion rate
        monthly_impressions: Estimated monthly impressions
        
    Returns:
        Dictionary with ROI estimates
    """
    improvement = optimized_conversion_rate - baseline_conversion_rate
    additional_conversions = monthly_impressions * improvement
    
    # Estimated value per conversion (industry average)
    avg_booking_value = 50  # $50 average booking
    
    monthly_revenue_increase = additional_conversions * avg_booking_value
    annual_revenue_increase = monthly_revenue_increase * 12
    
    return {
        "conversion_rate_improvement": round(improvement, 4),
        "additional_monthly_conversions": round(additional_conversions, 1),
        "estimated_monthly_revenue_increase": round(monthly_revenue_increase, 2),
        "estimated_annual_revenue_increase": round(annual_revenue_increase, 2),
        "roi_percentage": round((improvement / baseline_conversion_rate) * 100, 1) if baseline_conversion_rate > 0 else 0
    }


def generate_cta_performance_report(
    cta_service: SmartCTAService,
    timeframe_days: int = 30
) -> Dict[str, Any]:
    """
    Generate comprehensive CTA performance report.
    
    Args:
        cta_service: SmartCTAService instance
        timeframe_days: Reporting timeframe
        
    Returns:
        Comprehensive performance report
    """
    analytics = cta_service.get_cta_performance_analytics(timeframe_days)
    
    # Add insights and recommendations
    insights = []
    
    if analytics.get("average_ctr", 0) < 0.05:
        insights.append("CTR below industry average - consider A/B testing new variants")
    
    if analytics.get("average_conversion_rate", 0) < 0.1:
        insights.append("Conversion rate low - review CTA placement and messaging")
    
    if analytics.get("total_conversions", 0) == 0:
        insights.append("No conversions tracked - verify conversion tracking setup")
    
    analytics["insights"] = insights
    analytics["report_type"] = "CTA Performance Analysis"
    
    return analytics