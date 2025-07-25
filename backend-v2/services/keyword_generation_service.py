"""
Smart Keyword Generation Engine for BookedBarber V2.
Provides intelligent keyword generation for review response optimization and SEO.
Integrates with BusinessContextService and enhanced review_service.py.
"""

import logging
import re
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass
from sqlalchemy.orm import Session

from models.review import Review
from services.business_context_service import BusinessContextService, BusinessContext
from utils.sanitization import sanitize_input, validate_text_content

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class KeywordAnalysisResult:
    """Container for keyword analysis results"""
    extracted_keywords: List[str]
    service_keywords: List[str]
    local_keywords: List[str]
    sentiment_keywords: List[str]
    confidence_scores: Dict[str, float]
    keyword_categories: Dict[str, List[str]]


@dataclass
class SEOKeywordSet:
    """Container for SEO-optimized keyword set"""
    primary_keywords: List[str]
    secondary_keywords: List[str]
    local_seo_keywords: List[str]
    long_tail_keywords: List[str]
    branded_keywords: List[str]
    competitor_keywords: List[str]
    relevance_scores: Dict[str, float]


class KeywordGenerationService:
    """
    Smart Keyword Generation Engine for review response optimization.
    
    Features:
    1. Industry-specific keyword intelligence for barbershop services
    2. Review content analysis for contextual keyword extraction
    3. Local SEO keyword generation based on business context
    4. Sentiment-aware keyword optimization
    5. Dynamic keyword scoring and prioritization
    """
    
    def __init__(self, db: Session):
        """
        Initialize the keyword generation service.
        
        Args:
            db: Database session for data access
        """
        if not db:
            raise ValueError("Database session cannot be None")
        
        self.db = db
        self.business_context_service = BusinessContextService(db)
        
        # Core barbershop industry keywords with categories
        self.industry_keywords = {
            # Core services
            "core_services": [
                "haircut", "hair cut", "trim", "styling", "hair styling",
                "fade", "taper", "buzz cut", "scissor cut", "clipper cut",
                "shave", "hot shave", "straight razor", "beard trim",
                "mustache trim", "goatee", "sideburn trim", "lineup"
            ],
            
            # Advanced services
            "advanced_services": [
                "beard grooming", "beard styling", "beard oil treatment",
                "scalp massage", "hair wash", "conditioning treatment",
                "pompadour", "undercut", "side part", "textured cut",
                "skin fade", "temple fade", "mid fade", "high fade"
            ],
            
            # Quality descriptors
            "quality_descriptors": [
                "professional", "skilled", "experienced", "expert", "master",
                "precision", "detailed", "careful", "artistic", "creative",
                "clean", "sanitized", "modern", "traditional", "classic"
            ],
            
            # Experience descriptors
            "experience_descriptors": [
                "relaxing", "comfortable", "friendly", "welcoming", "efficient",
                "quick", "thorough", "patient", "accommodating", "professional",
                "courteous", "respectful", "attentive", "personalized"
            ],
            
            # Business terms
            "business_terms": [
                "barbershop", "barber shop", "salon", "grooming", "men's grooming",
                "appointment", "booking", "walk-in", "consultation", "service",
                "atmosphere", "environment", "facility", "location", "staff"
            ]
        }
        
        # Service-specific keyword mappings
        self.service_keyword_map = {
            "haircut": {
                "primary": ["haircut", "hair cut", "cut", "trim", "styling"],
                "techniques": ["fade", "taper", "buzz", "scissor", "clipper", "texture"],
                "styles": ["pompadour", "undercut", "side part", "slick back", "quiff"],
                "descriptors": ["precise", "clean", "sharp", "fresh", "styled"]
            },
            "shave": {
                "primary": ["shave", "shaving", "razor", "hot shave"],
                "techniques": ["straight razor", "safety razor", "hot towel", "steam"],
                "descriptors": ["smooth", "close", "comfortable", "relaxing", "traditional"],
                "products": ["shaving cream", "aftershave", "moisturizer", "balm"]
            },
            "beard": {
                "primary": ["beard", "beard trim", "beard grooming", "facial hair"],
                "techniques": ["trimming", "shaping", "styling", "maintenance"],
                "styles": ["full beard", "goatee", "mustache", "sideburns"],
                "descriptors": ["neat", "groomed", "shaped", "styled", "maintained"],
                "products": ["beard oil", "beard balm", "beard wax", "trimmer"]
            },
            "wash": {
                "primary": ["hair wash", "shampoo", "conditioning", "scalp treatment"],
                "techniques": ["deep cleansing", "scalp massage", "hot water rinse"],
                "descriptors": ["refreshing", "clean", "invigorating", "relaxing"],
                "products": ["shampoo", "conditioner", "scalp treatment", "hair mask"]
            }
        }
        
        # Local SEO keyword patterns
        self.local_seo_patterns = [
            "{service} near me",
            "{service} in {city}",
            "best {service} {city}",
            "{city} {service}",
            "professional {service} {city}",
            "{service} {neighborhood}",
            "top {service} {area}",
            "{service} shop {city}",
            "{city} barbershop",
            "men's grooming {city}"
        ]
        
        # Sentiment-specific keyword modifiers
        self.sentiment_modifiers = {
            "positive": {
                "amplifiers": ["excellent", "amazing", "outstanding", "exceptional", "fantastic"],
                "qualifiers": ["highly recommend", "definitely returning", "worth every penny"],
                "gratitude": ["grateful", "thankful", "appreciated", "pleased"]
            },
            "negative": {
                "concerns": ["disappointed", "unsatisfied", "below expectations"],
                "improvements": ["could be better", "room for improvement", "working to improve"],
                "commitment": ["committed to excellence", "taking feedback seriously"]
            },
            "neutral": {
                "acknowledgment": ["thank you", "appreciate feedback", "value your input"],
                "invitation": ["welcome back", "look forward", "next visit"]
            }
        }
        
        # Trending barbershop terminology (updated periodically)
        self.trending_keywords = [
            "skin fade", "textured crop", "modern classic", "gentleman's cut",
            "beard sculpting", "precision trimming", "artisan barber",
            "craft barbering", "male grooming", "men's wellness"
        ]
    
    def _validate_inputs(self, **kwargs) -> None:
        """
        Validate all input parameters for security and correctness.
        
        Args:
            **kwargs: Named arguments to validate
            
        Raises:
            ValueError: If any input is invalid
        """
        for key, value in kwargs.items():
            if value is None:
                continue
                
            if isinstance(value, str):
                # Validate text content for potential injection attacks
                if not validate_text_content(value):
                    raise ValueError(f"Invalid content detected in {key}")
                
                # Sanitize string inputs
                sanitized = sanitize_input(value)
                if sanitized != value:
                    logger.warning(f"Input sanitization applied to {key}")
            
            elif isinstance(value, (list, dict)):
                # Validate collection size to prevent resource exhaustion
                if len(value) > 1000:  # Reasonable limit
                    raise ValueError(f"{key} contains too many items (max 1000)")
            
            elif isinstance(value, int):
                # Validate integer bounds
                if value < 0 or value > 2147483647:  # Max int32
                    raise ValueError(f"Invalid integer value for {key}: {value}")
    
    def generate_service_keywords(self, service_types: List[str]) -> List[str]:
        """
        Generate comprehensive keywords for specified service types.
        
        Args:
            service_types: List of service type identifiers
            
        Returns:
            List of relevant service keywords
            
        Raises:
            ValueError: If service_types is invalid
        """
        try:
            # Validate inputs
            self._validate_inputs(service_types=service_types)
            
            if not service_types:
                return []
            
            # Sanitize service types
            sanitized_services = [sanitize_input(s.lower()) for s in service_types if s]
            
            keywords = set()
            
            # Add base industry keywords
            for category in self.industry_keywords.values():
                keywords.update(category[:5])  # Top 5 from each category
            
            # Add service-specific keywords
            for service in sanitized_services:
                if service in self.service_keyword_map:
                    service_data = self.service_keyword_map[service]
                    for keyword_list in service_data.values():
                        keywords.update(keyword_list)
                
                # Add variations and related terms
                keywords.update(self._generate_service_variations(service))
            
            # Add trending keywords relevant to services
            relevant_trending = [
                kw for kw in self.trending_keywords
                if any(service in kw.lower() for service in sanitized_services)
            ]
            keywords.update(relevant_trending)
            
            # Convert to list and sort by relevance
            keyword_list = list(keywords)
            return self._prioritize_keywords(keyword_list, sanitized_services)
            
        except Exception as e:
            logger.error(f"Error generating service keywords: {e}")
            # Return safe fallback
            return list(self.industry_keywords["core_services"][:10])
    
    def extract_keywords_from_review(self, review_text: str) -> Dict[str, List[str]]:
        """
        Extract and categorize keywords from review text using advanced NLP techniques.
        
        Args:
            review_text: The text content of the review
            
        Returns:
            Dictionary with categorized keyword lists:
                - service_keywords: Service-related terms found
                - quality_keywords: Quality/experience descriptors
                - local_keywords: Location/area references
                - sentiment_keywords: Sentiment-indicating phrases
                - product_keywords: Product/tool mentions
                - competitor_keywords: Competitor references
        """
        try:
            # Validate and sanitize input
            self._validate_inputs(review_text=review_text)
            
            if not review_text:
                return self._get_empty_keyword_result()
            
            # Sanitize and normalize text
            text = sanitize_input(review_text.lower())
            
            # Initialize result categories
            result = {
                "service_keywords": [],
                "quality_keywords": [],
                "local_keywords": [],
                "sentiment_keywords": [],
                "product_keywords": [],
                "competitor_keywords": []
            }
            
            # Extract service-related keywords
            result["service_keywords"] = self._extract_service_keywords(text)
            
            # Extract quality and experience keywords
            result["quality_keywords"] = self._extract_quality_keywords(text)
            
            # Extract location references
            result["local_keywords"] = self._extract_local_keywords(text)
            
            # Extract sentiment-indicating keywords
            result["sentiment_keywords"] = self._extract_sentiment_keywords(text)
            
            # Extract product/tool mentions
            result["product_keywords"] = self._extract_product_keywords(text)
            
            # Extract potential competitor mentions
            result["competitor_keywords"] = self._extract_competitor_keywords(text)
            
            # Log extraction results for monitoring
            total_keywords = sum(len(keywords) for keywords in result.values())
            logger.info(f"Extracted {total_keywords} keywords from review text")
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting keywords from review: {e}")
            return self._get_empty_keyword_result()
    
    def get_local_seo_keywords(self, business_context: BusinessContext) -> List[str]:
        """
        Generate location-specific SEO keywords based on business context.
        
        Args:
            business_context: Business context information
            
        Returns:
            List of local SEO keywords
            
        Raises:
            ValueError: If business_context is invalid
        """
        try:
            # Validate business context
            if not business_context:
                raise ValueError("BusinessContext cannot be None")
            
            if not business_context.business_name:
                raise ValueError("Business name is required for local SEO keywords")
            
            # Sanitize location data
            business_name = sanitize_input(business_context.business_name)
            city = sanitize_input(business_context.city) if business_context.city else ""
            state = sanitize_input(business_context.state) if business_context.state else ""
            
            keywords = set()
            
            # Generate location + service combinations
            services = ["barber", "barbershop", "hair salon", "men's grooming", "haircut"]
            
            if city:
                for service in services:
                    # Basic city + service combinations
                    keywords.update([
                        f"{service} {city}",
                        f"{city} {service}",
                        f"best {service} {city}",
                        f"professional {service} {city}",
                        f"{service} near {city}",
                        f"{service} in {city}"
                    ])
                    
                    # Add state combinations if available
                    if state:
                        keywords.update([
                            f"{service} {city} {state}",
                            f"{city} {state} {service}"
                        ])
            
            # Generate neighborhood-based keywords
            neighborhood_keywords = self._generate_neighborhood_keywords(business_context)
            keywords.update(neighborhood_keywords)
            
            # Generate business-specific keywords
            business_keywords = self._generate_business_branded_keywords(business_context)
            keywords.update(business_keywords)
            
            # Generate proximity keywords
            proximity_keywords = self._generate_proximity_keywords(business_context)
            keywords.update(proximity_keywords)
            
            # Convert to list and prioritize
            keyword_list = list(keywords)
            return self._prioritize_local_keywords(keyword_list, business_context)
            
        except Exception as e:
            logger.error(f"Error generating local SEO keywords: {e}")
            return ["professional barbershop", "men's grooming", "haircut service"]
    
    def optimize_keywords_for_sentiment(self, keywords: List[str], sentiment: str) -> List[str]:
        """
        Optimize keyword list based on review sentiment for response effectiveness.
        
        Args:
            keywords: Base keywords to optimize
            sentiment: Review sentiment (positive, negative, neutral)
            
        Returns:
            Sentiment-optimized keyword list
        """
        try:
            # Validate inputs
            self._validate_inputs(keywords=keywords, sentiment=sentiment)
            
            if not keywords:
                return []
            
            # Sanitize inputs
            sanitized_keywords = [sanitize_input(kw) for kw in keywords if kw]
            sentiment = sanitize_input(sentiment.lower())
            
            # Validate sentiment
            if sentiment not in ["positive", "negative", "neutral"]:
                logger.warning(f"Unknown sentiment '{sentiment}', defaulting to neutral")
                sentiment = "neutral"
            
            optimized_keywords = set(sanitized_keywords)
            
            # Add sentiment-specific modifiers
            if sentiment in self.sentiment_modifiers:
                modifiers = self.sentiment_modifiers[sentiment]
                
                # Add appropriate modifiers based on sentiment
                for modifier_category, modifier_list in modifiers.items():
                    optimized_keywords.update(modifier_list[:3])  # Top 3 from each category
            
            # Add sentiment-specific service keywords
            sentiment_service_keywords = self._get_sentiment_service_keywords(sentiment)
            optimized_keywords.update(sentiment_service_keywords)
            
            # Prioritize keywords based on sentiment context
            prioritized = self._prioritize_sentiment_keywords(
                list(optimized_keywords), sentiment
            )
            
            return prioritized[:20]  # Return top 20 optimized keywords
            
        except Exception as e:
            logger.error(f"Error optimizing keywords for sentiment: {e}")
            return keywords[:10]  # Return first 10 original keywords as fallback
    
    def analyze_review_for_keywords(
        self, 
        review: Review, 
        business_context: Optional[BusinessContext] = None
    ) -> KeywordAnalysisResult:
        """
        Perform comprehensive keyword analysis on a review with business context.
        
        Args:
            review: Review object to analyze
            business_context: Optional business context for enhanced analysis
            
        Returns:
            KeywordAnalysisResult with comprehensive analysis
        """
        try:
            # Validate review
            if not review:
                raise ValueError("Review cannot be None")
            
            # Get business context if not provided
            if not business_context and review.user_id:
                try:
                    business_context = self.business_context_service.get_business_context(
                        review.user_id
                    )
                except Exception as e:
                    logger.warning(f"Could not get business context: {e}")
                    business_context = None
            
            # Extract basic keywords from review text
            review_text = review.review_text or ""
            keyword_categories = self.extract_keywords_from_review(review_text)
            
            # Generate service-specific keywords
            mentioned_services = keyword_categories.get("service_keywords", [])
            service_keywords = self.generate_service_keywords(mentioned_services)
            
            # Generate local keywords if business context available
            local_keywords = []
            if business_context:
                local_keywords = self.get_local_seo_keywords(business_context)
            
            # Extract sentiment keywords
            sentiment_str = review.sentiment.value if review.sentiment else "neutral"
            sentiment_keywords = keyword_categories.get("sentiment_keywords", [])
            
            # Calculate confidence scores for each keyword category
            confidence_scores = self._calculate_keyword_confidence(
                keyword_categories, review_text, business_context
            )
            
            # Combine all extracted keywords
            all_keywords = []
            for category_keywords in keyword_categories.values():
                all_keywords.extend(category_keywords)
            
            return KeywordAnalysisResult(
                extracted_keywords=list(set(all_keywords)),
                service_keywords=service_keywords,
                local_keywords=local_keywords,
                sentiment_keywords=sentiment_keywords,
                confidence_scores=confidence_scores,
                keyword_categories=keyword_categories
            )
            
        except Exception as e:
            logger.error(f"Error analyzing review for keywords: {e}")
            return self._get_default_keyword_analysis()
    
    def generate_seo_keyword_set(
        self, 
        business_context: BusinessContext, 
        target_services: List[str] = None,
        competitor_analysis: bool = True
    ) -> SEOKeywordSet:
        """
        Generate a comprehensive SEO keyword set for business optimization.
        
        Args:
            business_context: Business context for keyword generation
            target_services: Specific services to target (optional)
            competitor_analysis: Whether to include competitor keyword analysis
            
        Returns:
            SEOKeywordSet with categorized keywords for SEO optimization
        """
        try:
            # Validate inputs
            if not business_context:
                raise ValueError("BusinessContext is required")
            
            self._validate_inputs(
                target_services=target_services or [],
                competitor_analysis=competitor_analysis
            )
            
            # Generate primary keywords (core business terms)
            primary_keywords = self._generate_primary_keywords(business_context)
            
            # Generate secondary keywords (supporting terms)
            secondary_keywords = self._generate_secondary_keywords(
                business_context, target_services
            )
            
            # Generate local SEO keywords
            local_seo_keywords = self.get_local_seo_keywords(business_context)
            
            # Generate long-tail keywords
            long_tail_keywords = self._generate_long_tail_keywords(
                business_context, target_services
            )
            
            # Generate branded keywords
            branded_keywords = self._generate_business_branded_keywords(business_context)
            
            # Generate competitor keywords if requested
            competitor_keywords = []
            if competitor_analysis:
                competitor_keywords = self._generate_competitor_keywords(business_context)
            
            # Calculate relevance scores for all keywords
            all_keywords = (
                primary_keywords + secondary_keywords + local_seo_keywords +
                long_tail_keywords + branded_keywords + competitor_keywords
            )
            relevance_scores = self._calculate_keyword_relevance_scores(
                all_keywords, business_context
            )
            
            return SEOKeywordSet(
                primary_keywords=primary_keywords,
                secondary_keywords=secondary_keywords,
                local_seo_keywords=local_seo_keywords,
                long_tail_keywords=long_tail_keywords,
                branded_keywords=branded_keywords,
                competitor_keywords=competitor_keywords,
                relevance_scores=relevance_scores
            )
            
        except Exception as e:
            logger.error(f"Error generating SEO keyword set: {e}")
            return self._get_default_seo_keyword_set()
    
    # ==================== PRIVATE HELPER METHODS ====================
    
    def _generate_service_variations(self, service: str) -> List[str]:
        """Generate variations and related terms for a service"""
        variations = []
        
        # Common variations
        variations.extend([
            f"{service} service",
            f"professional {service}",
            f"expert {service}",
            f"quality {service}",
            f"{service} specialist"
        ])
        
        # Technique variations for haircuts
        if "cut" in service or service == "haircut":
            variations.extend([
                "precision cutting", "scissor work", "clipper cutting",
                "styling service", "hair design"
            ])
        
        # Traditional variations for shaving
        if "shave" in service:
            variations.extend([
                "traditional shaving", "hot towel service", "razor work",
                "classic shave", "grooming service"
            ])
        
        return variations
    
    def _extract_service_keywords(self, text: str) -> List[str]:
        """Extract service-related keywords from text"""
        service_keywords = []
        
        # Check against all service categories
        for category, keywords in self.service_keyword_map.items():
            for keyword_list in keywords.values():
                for keyword in keyword_list:
                    if keyword.lower() in text:
                        service_keywords.append(keyword)
        
        # Check against industry keywords
        for keywords in self.industry_keywords.values():
            for keyword in keywords:
                if keyword.lower() in text:
                    service_keywords.append(keyword)
        
        return list(set(service_keywords))
    
    def _extract_quality_keywords(self, text: str) -> List[str]:
        """Extract quality and experience keywords from text"""
        quality_keywords = []
        
        # Quality descriptors
        for keyword in self.industry_keywords.get("quality_descriptors", []):
            if keyword.lower() in text:
                quality_keywords.append(keyword)
        
        # Experience descriptors
        for keyword in self.industry_keywords.get("experience_descriptors", []):
            if keyword.lower() in text:
                quality_keywords.append(keyword)
        
        return list(set(quality_keywords))
    
    def _extract_local_keywords(self, text: str) -> List[str]:
        """Extract location and area references from text"""
        local_keywords = []
        
        # Common location indicators
        location_patterns = [
            r'\b(downtown|uptown|midtown)\b',
            r'\b(\w+\s+area|neighborhood)\b',
            r'\b(near|close to|by|around)\s+(\w+)\b',
            r'\b(north|south|east|west)\s+(\w+)\b'
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    local_keywords.extend([m for m in match if m])
                else:
                    local_keywords.append(match)
        
        return list(set(local_keywords))
    
    def _extract_sentiment_keywords(self, text: str) -> List[str]:
        """Extract sentiment-indicating keywords from text"""
        sentiment_keywords = []
        
        # Check all sentiment categories
        for sentiment_type, categories in self.sentiment_modifiers.items():
            for keywords in categories.values():
                for keyword in keywords:
                    if keyword.lower() in text:
                        sentiment_keywords.append(keyword)
        
        return list(set(sentiment_keywords))
    
    def _extract_product_keywords(self, text: str) -> List[str]:
        """Extract product and tool mentions from text"""
        product_keywords = []
        
        # Common barbershop products and tools
        products = [
            "scissors", "clippers", "razor", "trimmer", "comb", "brush",
            "pomade", "gel", "wax", "cream", "oil", "balm", "shampoo",
            "conditioner", "aftershave", "moisturizer", "towel"
        ]
        
        for product in products:
            if product.lower() in text:
                product_keywords.append(product)
        
        return list(set(product_keywords))
    
    def _extract_competitor_keywords(self, text: str) -> List[str]:
        """Extract potential competitor mentions from text"""
        competitor_keywords = []
        
        # Patterns for competitor mentions
        competitor_patterns = [
            r'\b(went to|tried|from|at)\s+([A-Z][a-z]+\s+(?:Barber|Salon|Shop))\b',
            r'\b([A-Z][a-z]+\'s\s+(?:Barber|Salon|Shop))\b',
            r'\b(other|another)\s+(barber|salon|shop)\b'
        ]
        
        for pattern in competitor_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    competitor_keywords.extend([m for m in match if m and len(m) > 2])
                else:
                    competitor_keywords.append(match)
        
        return list(set(competitor_keywords))
    
    def _prioritize_keywords(self, keywords: List[str], context: List[str]) -> List[str]:
        """Prioritize keywords based on relevance and context"""
        if not keywords:
            return []
        
        # Calculate relevance scores
        scored_keywords = []
        for keyword in keywords:
            score = 0
            
            # Base score
            score += 1
            
            # Boost for context relevance
            for ctx in context:
                if ctx.lower() in keyword.lower() or keyword.lower() in ctx.lower():
                    score += 2
            
            # Boost for trending keywords
            if keyword in self.trending_keywords:
                score += 1
            
            # Boost for core services
            if keyword in self.industry_keywords.get("core_services", []):
                score += 1
            
            scored_keywords.append((keyword, score))
        
        # Sort by score and return
        sorted_keywords = sorted(scored_keywords, key=lambda x: x[1], reverse=True)
        return [kw for kw, _ in sorted_keywords]
    
    def _prioritize_local_keywords(
        self, 
        keywords: List[str], 
        business_context: BusinessContext
    ) -> List[str]:
        """Prioritize local keywords based on business context"""
        if not keywords:
            return []
        
        scored_keywords = []
        city = business_context.city or ""
        business_name = business_context.business_name or ""
        
        for keyword in keywords:
            score = 0
            
            # Base score
            score += 1
            
            # Boost for city inclusion
            if city.lower() in keyword.lower():
                score += 3
            
            # Boost for business name inclusion
            if business_name.lower() in keyword.lower():
                score += 2
            
            # Boost for "near me" searches
            if "near" in keyword.lower():
                score += 2
            
            # Boost for "best" searches
            if "best" in keyword.lower():
                score += 1
            
            scored_keywords.append((keyword, score))
        
        # Sort and return
        sorted_keywords = sorted(scored_keywords, key=lambda x: x[1], reverse=True)
        return [kw for kw, _ in sorted_keywords[:25]]  # Top 25 local keywords
    
    def _prioritize_sentiment_keywords(self, keywords: List[str], sentiment: str) -> List[str]:
        """Prioritize keywords based on sentiment appropriateness"""
        if not keywords:
            return []
        
        scored_keywords = []
        sentiment_modifiers = self.sentiment_modifiers.get(sentiment, {})
        
        for keyword in keywords:
            score = 0
            
            # Base score
            score += 1
            
            # Boost for sentiment-appropriate keywords
            for modifier_list in sentiment_modifiers.values():
                if keyword in modifier_list:
                    score += 3
            
            # Boost for positive keywords in positive sentiment
            if sentiment == "positive" and keyword in [
                "excellent", "amazing", "professional", "skilled", "recommend"
            ]:
                score += 2
            
            # Boost for improvement keywords in negative sentiment
            elif sentiment == "negative" and keyword in [
                "improve", "better", "commitment", "quality", "satisfaction"
            ]:
                score += 2
            
            scored_keywords.append((keyword, score))
        
        # Sort and return
        sorted_keywords = sorted(scored_keywords, key=lambda x: x[1], reverse=True)
        return [kw for kw, _ in sorted_keywords]
    
    def _get_sentiment_service_keywords(self, sentiment: str) -> List[str]:
        """Get service keywords appropriate for specific sentiment"""
        base_keywords = ["professional service", "quality work", "skilled team"]
        
        if sentiment == "positive":
            return base_keywords + [
                "exceptional service", "outstanding work", "expert craftsmanship",
                "premium experience", "top-quality results"
            ]
        elif sentiment == "negative":
            return base_keywords + [
                "improved service", "quality commitment", "professional standards",
                "service excellence", "customer satisfaction"
            ]
        else:  # neutral
            return base_keywords + [
                "reliable service", "consistent quality", "professional care",
                "attentive service", "quality commitment"
            ]
    
    def _generate_neighborhood_keywords(self, business_context: BusinessContext) -> Set[str]:
        """Generate neighborhood-based keywords"""
        keywords = set()
        
        if business_context.address:
            # Extract potential neighborhood from address
            address_parts = business_context.address.split()
            for part in address_parts:
                if len(part) > 3 and part.isalpha() and part not in ["Street", "Ave", "Road"]:
                    keywords.update([
                        f"barber near {part}",
                        f"{part} barbershop",
                        f"grooming {part}"
                    ])
        
        return keywords
    
    def _generate_business_branded_keywords(self, business_context: BusinessContext) -> List[str]:
        """Generate business-specific branded keywords"""
        branded_keywords = []
        
        if business_context.business_name:
            name = business_context.business_name
            branded_keywords.extend([
                name,
                f"{name} barber",
                f"{name} services",
                f"{name} reviews",
                f"{name} appointments"
            ])
        
        return branded_keywords
    
    def _generate_proximity_keywords(self, business_context: BusinessContext) -> Set[str]:
        """Generate proximity-based keywords"""
        keywords = set()
        
        if business_context.city:
            city = business_context.city
            keywords.update([
                f"barber near {city}",
                f"barbershop close to {city}",
                f"grooming services {city} area",
                f"men's haircut near {city}"
            ])
        
        return keywords
    
    def _calculate_keyword_confidence(
        self, 
        keyword_categories: Dict[str, List[str]], 
        review_text: str,
        business_context: Optional[BusinessContext]
    ) -> Dict[str, float]:
        """Calculate confidence scores for keyword categories"""
        confidence_scores = {}
        
        text_length = len(review_text)
        
        for category, keywords in keyword_categories.items():
            if not keywords:
                confidence_scores[category] = 0.0
                continue
            
            # Base confidence based on number of keywords found
            base_confidence = min(len(keywords) / 5.0, 1.0)  # Max confidence at 5+ keywords
            
            # Adjust based on text length (longer text = higher confidence)
            length_factor = min(text_length / 500.0, 1.0)  # Max factor at 500+ chars
            
            # Adjust based on business context availability
            context_factor = 1.1 if business_context else 1.0
            
            confidence = base_confidence * length_factor * context_factor
            confidence_scores[category] = min(confidence, 1.0)  # Cap at 1.0
        
        return confidence_scores
    
    def _generate_primary_keywords(self, business_context: BusinessContext) -> List[str]:
        """Generate primary SEO keywords"""
        primary = []
        
        # Core business terms
        primary.extend([
            "barbershop", "barber", "men's grooming", "haircut", "professional barber"
        ])
        
        # Location-specific primary keywords
        if business_context.city:
            city = business_context.city
            primary.extend([
                f"{city} barber",
                f"{city} barbershop",
                f"barber {city}"
            ])
        
        return primary
    
    def _generate_secondary_keywords(
        self, 
        business_context: BusinessContext, 
        target_services: Optional[List[str]]
    ) -> List[str]:
        """Generate secondary SEO keywords"""
        secondary = []
        
        # Service-specific keywords
        if target_services:
            for service in target_services:
                secondary.extend(self.generate_service_keywords([service])[:5])
        else:
            # Default services
            secondary.extend([
                "hair styling", "beard trim", "hot shave", "fade haircut",
                "men's hair", "grooming service", "professional styling"
            ])
        
        return secondary
    
    def _generate_long_tail_keywords(
        self, 
        business_context: BusinessContext, 
        target_services: Optional[List[str]]
    ) -> List[str]:
        """Generate long-tail SEO keywords"""
        long_tail = []
        
        city = business_context.city or ""
        
        # Service + location + qualifier combinations
        services = target_services or ["haircut", "shave", "beard trim"]
        qualifiers = ["best", "professional", "affordable", "experienced"]
        
        for service in services:
            for qualifier in qualifiers:
                if city:
                    long_tail.append(f"{qualifier} {service} {city}")
                long_tail.append(f"{qualifier} {service} service")
        
        return long_tail
    
    def _generate_competitor_keywords(self, business_context: BusinessContext) -> List[str]:
        """Generate competitor analysis keywords"""
        competitor_keywords = []
        
        if business_context.city:
            city = business_context.city
            competitor_keywords.extend([
                f"best barber {city}",
                f"top barbershop {city}",
                f"{city} barber reviews",
                f"barber comparison {city}"
            ])
        
        return competitor_keywords
    
    def _calculate_keyword_relevance_scores(
        self, 
        keywords: List[str], 
        business_context: BusinessContext
    ) -> Dict[str, float]:
        """Calculate relevance scores for keywords"""
        scores = {}
        
        for keyword in keywords:
            score = 0.5  # Base score
            
            # Business name relevance
            if business_context.business_name and business_context.business_name.lower() in keyword.lower():
                score += 0.3
            
            # Location relevance
            if business_context.city and business_context.city.lower() in keyword.lower():
                score += 0.2
            
            # Service relevance
            for service in business_context.specialty_services or []:
                if service.lower() in keyword.lower():
                    score += 0.1
            
            # Industry relevance
            for industry_keyword in self.industry_keywords.get("core_services", []):
                if industry_keyword.lower() in keyword.lower():
                    score += 0.1
            
            scores[keyword] = min(score, 1.0)  # Cap at 1.0
        
        return scores
    
    def _get_empty_keyword_result(self) -> Dict[str, List[str]]:
        """Get empty keyword extraction result"""
        return {
            "service_keywords": [],
            "quality_keywords": [],
            "local_keywords": [],
            "sentiment_keywords": [],
            "product_keywords": [],
            "competitor_keywords": []
        }
    
    def _get_default_keyword_analysis(self) -> KeywordAnalysisResult:
        """Get default keyword analysis result for error cases"""
        return KeywordAnalysisResult(
            extracted_keywords=["professional", "barber", "service"],
            service_keywords=["haircut", "grooming", "professional"],
            local_keywords=["barbershop", "local barber"],
            sentiment_keywords=["quality", "service"],
            confidence_scores={"default": 0.5},
            keyword_categories=self._get_empty_keyword_result()
        )
    
    def _get_default_seo_keyword_set(self) -> SEOKeywordSet:
        """Get default SEO keyword set for error cases"""
        return SEOKeywordSet(
            primary_keywords=["barbershop", "professional barber", "men's grooming"],
            secondary_keywords=["haircut", "beard trim", "hair styling"],
            local_seo_keywords=["local barbershop", "neighborhood barber"],
            long_tail_keywords=["professional men's haircut service"],
            branded_keywords=["barbershop services"],
            competitor_keywords=["best local barber"],
            relevance_scores={"barbershop": 1.0, "professional barber": 0.9}
        )


# ==================== UTILITY FUNCTIONS ====================

def get_trending_barbershop_keywords(timeframe_days: int = 30) -> List[str]:
    """
    Get trending barbershop keywords based on recent industry trends.
    
    Args:
        timeframe_days: Number of days to look back for trends
        
    Returns:
        List of trending keywords
    """
    # This would integrate with external APIs or trend analysis in production
    # For now, return current trending terms
    return [
        "skin fade", "textured crop", "modern classic", "gentleman's cut",
        "beard sculpting", "precision trimming", "artisan barber",
        "craft barbering", "male grooming", "men's wellness",
        "sustainable grooming", "eco-friendly barbershop", "organic products"
    ]


def validate_keyword_quality(keywords: List[str]) -> Dict[str, Any]:
    """
    Validate keyword quality and provide improvement suggestions.
    
    Args:
        keywords: List of keywords to validate
        
    Returns:
        Dictionary with validation results and suggestions
    """
    if not keywords:
        return {"valid": False, "message": "No keywords provided"}
    
    issues = []
    suggestions = []
    
    # Check for too short keywords
    short_keywords = [kw for kw in keywords if len(kw) < 3]
    if short_keywords:
        issues.append(f"Found {len(short_keywords)} keywords too short")
        suggestions.append("Remove keywords shorter than 3 characters")
    
    # Check for too long keywords
    long_keywords = [kw for kw in keywords if len(kw) > 50]
    if long_keywords:
        issues.append(f"Found {len(long_keywords)} keywords too long")
        suggestions.append("Consider shorter, more specific keywords")
    
    # Check for duplicates
    duplicates = len(keywords) - len(set(keywords))
    if duplicates > 0:
        issues.append(f"Found {duplicates} duplicate keywords")
        suggestions.append("Remove duplicate keywords")
    
    # Check for special characters
    special_char_keywords = [kw for kw in keywords if re.search(r'[^a-zA-Z\s\-]', kw)]
    if special_char_keywords:
        issues.append(f"Found {len(special_char_keywords)} keywords with special characters")
        suggestions.append("Remove or sanitize keywords with special characters")
    
    return {
        "valid": len(issues) == 0,
        "keyword_count": len(keywords),
        "unique_keywords": len(set(keywords)),
        "issues": issues,
        "suggestions": suggestions
    }