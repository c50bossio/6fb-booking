"""
Intelligent SEO Optimization System for BookedBarber V2 Review Management.
Provides advanced SEO optimization for review responses while maintaining natural language flow.
Integrates with existing KeywordGenerationService and BusinessContextService.
"""

import logging
import re
import math
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime
from dataclasses import dataclass
from collections import Counter
from sqlalchemy.orm import Session

from services.keyword_generation_service import KeywordGenerationService, KeywordAnalysisResult
from services.business_context_service import BusinessContextService, BusinessContext
from services.smart_cta_service import SmartCTAService, CTAContext, CTARecommendation as SmartCTARecommendation
from utils.sanitization import sanitize_input, validate_text_content
from models.review import Review, ReviewSentiment

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class SEOAnalysis:
    """Container for SEO analysis results"""
    keyword_density: Dict[str, float]
    total_keywords: int
    keyword_stuffing_score: float
    readability_score: float
    local_seo_score: float
    cta_effectiveness_score: float
    overall_seo_score: float
    suggestions: List[str]
    warnings: List[str]


@dataclass
class OptimizedResponse:
    """Container for SEO-optimized response"""
    optimized_text: str
    original_text: str
    seo_analysis: SEOAnalysis
    optimization_applied: Dict[str, bool]
    character_count: int
    estimated_readability: str
    smart_cta_recommendation: Optional[SmartCTARecommendation] = None


@dataclass
class CTARecommendation:
    """Container for call-to-action recommendations"""
    cta_text: str
    cta_type: str  # 'visit', 'contact', 'book', 'follow'
    placement: str  # 'beginning', 'middle', 'end'
    effectiveness_score: float
    local_seo_value: float


class SEOOptimizationService:
    """
    Intelligent SEO Optimization System for review responses.
    
    Features:
    1. Advanced keyword density analysis with spam prevention
    2. Natural language SEO optimization
    3. Local SEO phrase generation and integration
    4. Call-to-action optimization
    5. Quality metrics and performance tracking
    6. Anti-spam validation and content quality assurance
    """
    
    def __init__(self, db: Session):
        """
        Initialize the SEO optimization service.
        
        Args:
            db: Database session for data access
        """
        if not db:
            raise ValueError("Database session cannot be None")
        
        self.db = db
        self.keyword_service = KeywordGenerationService(db)
        self.business_context_service = BusinessContextService(db)
        self.smart_cta_service = SmartCTAService(db)
        
        # SEO optimization parameters
        self.optimal_keyword_density = {
            "primary": (2.0, 4.0),    # 2-4% for primary keywords
            "secondary": (1.0, 2.5),  # 1-2.5% for secondary keywords
            "local": (1.0, 3.0),      # 1-3% for local keywords
            "branded": (1.0, 2.0)     # 1-2% for branded keywords
        }
        
        # Character count recommendations
        self.optimal_response_length = {
            "positive": (100, 200),   # Positive responses can be shorter
            "negative": (150, 300),   # Negative responses need more explanation
            "neutral": (120, 250)     # Neutral responses moderate length
        }
        
        # Readability parameters
        self.readability_targets = {
            "avg_words_per_sentence": (10, 20),
            "avg_syllables_per_word": (1.2, 2.0),
            "complex_word_ratio": (0.0, 0.15)  # Max 15% complex words
        }
        
        # CTA effectiveness patterns
        self.cta_patterns = {
            "visit": {
                "templates": [
                    "Visit us again soon!",
                    "We look forward to your next visit!",
                    "Come see us again at {business_name}!",
                    "Your next appointment awaits!"
                ],
                "effectiveness": 0.8,
                "local_value": 0.9
            },
            "contact": {
                "templates": [
                    "Please contact us directly to discuss this further.",
                    "Reach out to us so we can make this right.",
                    "We'd love to hear from you directly.",
                    "Contact us to schedule your next service."
                ],
                "effectiveness": 0.9,
                "local_value": 0.7
            },
            "book": {
                "templates": [
                    "Book your next appointment today!",
                    "Schedule your next visit with us!",
                    "Reserve your spot for exceptional service!",
                    "Book online or call to schedule!"
                ],
                "effectiveness": 1.0,
                "local_value": 0.8
            },
            "follow": {
                "templates": [
                    "Follow us for updates and special offers!",
                    "Stay connected with us on social media!",
                    "Follow our page for the latest styles!",
                    "Join our community for grooming tips!"
                ],
                "effectiveness": 0.6,
                "local_value": 0.5
            }
        }
        
        # Local SEO phrase templates
        self.local_seo_templates = [
            "the best {service} in {city}",
            "top-rated {service} {city}",
            "professional {service} {location}",
            "{city}'s premier {service}",
            "local {service} specialists",
            "serving {city} with {service}",
            "your neighborhood {service} experts",
            "{area} {service} professionals"
        ]
        
        # Spam prevention thresholds
        self.spam_thresholds = {
            "max_keyword_density": 8.0,     # Max 8% for any single keyword
            "max_total_keyword_ratio": 25.0, # Max 25% of text as keywords
            "min_unique_words": 5,           # Minimum unique words
            "max_repetition_ratio": 0.3,    # Max 30% repeated phrases
            "min_natural_language_score": 0.6  # Minimum natural language score
        }
    
    def optimize_response_for_seo(
        self,
        response_text: str,
        keywords: List[str],
        business_context: BusinessContext,
        review: Optional[Review] = None
    ) -> OptimizedResponse:
        """
        Optimize response text for SEO while maintaining natural language flow.
        
        Args:
            response_text: Original response text to optimize
            keywords: List of target keywords for optimization
            business_context: Business context for local SEO
            review: Optional review object for contextual optimization
            
        Returns:
            OptimizedResponse with SEO-enhanced text and analysis
            
        Raises:
            ValueError: If inputs are invalid
        """
        try:
            # Validate inputs
            self._validate_optimization_inputs(response_text, keywords, business_context)
            
            # Sanitize inputs
            response_text = sanitize_input(response_text)
            keywords = [sanitize_input(kw) for kw in keywords if kw]
            
            # Analyze current SEO state
            original_analysis = self.analyze_seo_quality(response_text, keywords, business_context)
            
            # Determine optimization strategy based on review sentiment
            sentiment = self._determine_sentiment(review) if review else "neutral"
            
            # Initialize optimization tracking
            optimizations_applied = {
                "keyword_integration": False,
                "local_seo_phrases": False,
                "cta_optimization": False,
                "readability_improvement": False,
                "length_optimization": False
            }
            
            # Start with original text
            optimized_text = response_text
            
            # Apply keyword optimization
            if original_analysis.keyword_density:
                optimized_text, keyword_applied = self._optimize_keyword_integration(
                    optimized_text, keywords, business_context, sentiment
                )
                optimizations_applied["keyword_integration"] = keyword_applied
            
            # Apply local SEO phrase integration
            optimized_text, local_applied = self._integrate_local_seo_phrases(
                optimized_text, business_context, keywords
            )
            optimizations_applied["local_seo_phrases"] = local_applied
            
            # Apply CTA optimization
            optimized_text, cta_applied = self._optimize_cta_placement(
                optimized_text, business_context, sentiment
            )
            optimizations_applied["cta_optimization"] = cta_applied
            
            # Apply readability improvements
            optimized_text, readability_applied = self._improve_readability(
                optimized_text, sentiment
            )
            optimizations_applied["readability_improvement"] = readability_applied
            
            # Apply length optimization
            optimized_text, length_applied = self._optimize_response_length(
                optimized_text, sentiment
            )
            optimizations_applied["length_optimization"] = length_applied
            
            # Final SEO analysis
            final_analysis = self.analyze_seo_quality(optimized_text, keywords, business_context)
            
            # Anti-spam validation
            if not self._validate_anti_spam(optimized_text, keywords):
                logger.warning("SEO optimization resulted in spammy content, reverting to original")
                optimized_text = response_text
                final_analysis = original_analysis
                optimizations_applied = {k: False for k in optimizations_applied.keys()}
            
            # Determine estimated readability
            estimated_readability = self._estimate_readability_level(optimized_text)
            
            # Generate Smart CTA recommendation
            smart_cta_recommendation = None
            try:
                # Create CTA context
                cta_context = CTAContext(
                    business_context=business_context,
                    review=review,
                    service_type=self._extract_service_type(keywords),
                    customer_segment=self._determine_customer_segment_from_review(review)
                )
                
                # Generate smart CTA recommendation
                smart_cta_recommendation = self.smart_cta_service.generate_smart_cta(
                    business_context=business_context,
                    review=review,
                    service_type=self._extract_service_type(keywords),
                    context=cta_context
                )
                
                logger.info("Smart CTA recommendation generated successfully")
                
            except Exception as cta_error:
                logger.warning(f"Failed to generate Smart CTA recommendation: {cta_error}")
            
            return OptimizedResponse(
                optimized_text=optimized_text,
                original_text=response_text,
                seo_analysis=final_analysis,
                optimization_applied=optimizations_applied,
                character_count=len(optimized_text),
                estimated_readability=estimated_readability,
                smart_cta_recommendation=smart_cta_recommendation
            )
            
        except Exception as e:
            logger.error(f"Error optimizing response for SEO: {e}")
            # Return safe fallback
            basic_analysis = SEOAnalysis(
                keyword_density={},
                total_keywords=0,
                keyword_stuffing_score=0.0,
                readability_score=0.5,
                local_seo_score=0.0,
                cta_effectiveness_score=0.0,
                overall_seo_score=0.3,
                suggestions=["Unable to optimize due to error"],
                warnings=["Optimization failed"]
            )
            
            return OptimizedResponse(
                optimized_text=response_text,
                original_text=response_text,
                seo_analysis=basic_analysis,
                optimization_applied={k: False for k in ["keyword_integration", "local_seo_phrases", "cta_optimization", "readability_improvement", "length_optimization"]},
                character_count=len(response_text),
                estimated_readability="unknown"
            )
    
    def calculate_keyword_density(self, text: str, keywords: List[str]) -> Dict[str, float]:
        """
        Calculate keyword density for each keyword in the text.
        
        Args:
            text: Text to analyze
            keywords: List of keywords to calculate density for
            
        Returns:
            Dictionary mapping keywords to their density percentages
        """
        try:
            if not text or not keywords:
                return {}
            
            # Sanitize inputs
            text = sanitize_input(text).lower()
            keywords = [sanitize_input(kw).lower() for kw in keywords if kw]
            
            # Count total words
            words = re.findall(r'\b\w+\b', text)
            total_words = len(words)
            
            if total_words == 0:
                return {}
            
            keyword_densities = {}
            
            for keyword in keywords:
                if not keyword:
                    continue
                
                # Handle multi-word keywords
                if ' ' in keyword:
                    # Count phrase occurrences
                    phrase_count = len(re.findall(re.escape(keyword), text, re.IGNORECASE))
                    keyword_word_count = len(keyword.split())
                    density = (phrase_count * keyword_word_count / total_words) * 100
                else:
                    # Count single word occurrences
                    word_count = sum(1 for word in words if word == keyword)
                    density = (word_count / total_words) * 100
                
                keyword_densities[keyword] = round(density, 2)
            
            return keyword_densities
            
        except Exception as e:
            logger.error(f"Error calculating keyword density: {e}")
            return {}
    
    def suggest_cta_optimization(
        self,
        business_context: BusinessContext,
        service_type: str = "general"
    ) -> CTARecommendation:
        """
        Suggest optimized call-to-action based on business context and service type.
        
        Args:
            business_context: Business context for personalization
            service_type: Type of service for contextual CTA
            
        Returns:
            CTARecommendation with optimized call-to-action
        """
        try:
            # Validate inputs
            if not business_context:
                raise ValueError("BusinessContext is required")
            
            service_type = sanitize_input(service_type).lower()
            
            # Determine best CTA type based on service and business context
            cta_type = self._determine_optimal_cta_type(service_type, business_context)
            
            # Get CTA template
            cta_templates = self.cta_patterns[cta_type]["templates"]
            base_effectiveness = self.cta_patterns[cta_type]["effectiveness"]
            local_value = self.cta_patterns[cta_type]["local_value"]
            
            # Select and customize template
            selected_template = self._select_best_cta_template(
                cta_templates, business_context, service_type
            )
            
            # Customize with business context
            customized_cta = self._customize_cta_text(
                selected_template, business_context, service_type
            )
            
            # Calculate effectiveness score
            effectiveness_score = self._calculate_cta_effectiveness(
                customized_cta, business_context, base_effectiveness
            )
            
            # Determine optimal placement
            placement = self._determine_cta_placement(cta_type, service_type)
            
            return CTARecommendation(
                cta_text=customized_cta,
                cta_type=cta_type,
                placement=placement,
                effectiveness_score=effectiveness_score,
                local_seo_value=local_value
            )
            
        except Exception as e:
            logger.error(f"Error suggesting CTA optimization: {e}")
            # Return safe fallback
            return CTARecommendation(
                cta_text="Thank you for your feedback!",
                cta_type="general",
                placement="end",
                effectiveness_score=0.5,
                local_seo_value=0.3
            )
    
    def generate_local_seo_phrases(self, business_context: BusinessContext) -> List[str]:
        """
        Generate local SEO phrases based on business context.
        
        Args:
            business_context: Business context for local SEO generation
            
        Returns:
            List of local SEO phrases
        """
        try:
            if not business_context:
                return []
            
            local_phrases = []
            
            # Extract location information
            city = business_context.city or ""
            business_name = business_context.business_name or ""
            
            if not city:
                logger.warning("No city information available for local SEO phrases")
                return []
            
            # Generate service-based local phrases
            services = business_context.specialty_services or ["barbering", "grooming"]
            
            for service in services[:3]:  # Limit to top 3 services
                service = sanitize_input(service).lower()
                
                for template in self.local_seo_templates:
                    try:
                        # Fill template with business context
                        phrase = template.format(
                            service=service,
                            city=city,
                            location=business_name,
                            area=f"{city} area"
                        )
                        
                        # Validate and add phrase
                        if self._validate_local_phrase(phrase):
                            local_phrases.append(phrase)
                            
                    except KeyError:
                        # Skip templates that can't be filled with available data
                        continue
            
            # Generate neighborhood-specific phrases
            if business_context.address:
                neighborhood_phrases = self._generate_neighborhood_phrases(business_context)
                local_phrases.extend(neighborhood_phrases)
            
            # Remove duplicates and limit results
            unique_phrases = list(set(local_phrases))
            return unique_phrases[:15]  # Return top 15 phrases
            
        except Exception as e:
            logger.error(f"Error generating local SEO phrases: {e}")
            return []
    
    def analyze_seo_quality(
        self,
        text: str,
        keywords: List[str],
        business_context: BusinessContext
    ) -> SEOAnalysis:
        """
        Analyze the SEO quality of text content.
        
        Args:
            text: Text to analyze
            keywords: Target keywords
            business_context: Business context for local SEO analysis
            
        Returns:
            SEOAnalysis with comprehensive quality metrics
        """
        try:
            # Sanitize inputs
            text = sanitize_input(text)
            keywords = [sanitize_input(kw) for kw in keywords if kw]
            
            if not text:
                return self._get_empty_seo_analysis()
            
            # Calculate keyword density
            keyword_density = self.calculate_keyword_density(text, keywords)
            
            # Calculate keyword stuffing score
            keyword_stuffing_score = self._calculate_keyword_stuffing_score(
                keyword_density, text
            )
            
            # Calculate readability score
            readability_score = self._calculate_readability_score(text)
            
            # Calculate local SEO score
            local_seo_score = self._calculate_local_seo_score(text, business_context)
            
            # Calculate CTA effectiveness score
            cta_effectiveness_score = self._calculate_cta_effectiveness_score(text)
            
            # Calculate overall SEO score
            overall_seo_score = self._calculate_overall_seo_score(
                keyword_stuffing_score,
                readability_score,
                local_seo_score,
                cta_effectiveness_score
            )
            
            # Generate suggestions and warnings
            suggestions = self._generate_seo_suggestions(
                keyword_density, readability_score, local_seo_score, cta_effectiveness_score
            )
            
            warnings = self._generate_seo_warnings(
                keyword_stuffing_score, keyword_density, text
            )
            
            return SEOAnalysis(
                keyword_density=keyword_density,
                total_keywords=len([kw for kw in keywords if kw in text.lower()]),
                keyword_stuffing_score=keyword_stuffing_score,
                readability_score=readability_score,
                local_seo_score=local_seo_score,
                cta_effectiveness_score=cta_effectiveness_score,
                overall_seo_score=overall_seo_score,
                suggestions=suggestions,
                warnings=warnings
            )
            
        except Exception as e:
            logger.error(f"Error analyzing SEO quality: {e}")
            return self._get_empty_seo_analysis()
    
    # ==================== PRIVATE HELPER METHODS ====================
    
    def _validate_optimization_inputs(
        self,
        response_text: str,
        keywords: List[str],
        business_context: BusinessContext
    ) -> None:
        """Validate inputs for optimization methods"""
        if not response_text:
            raise ValueError("Response text cannot be empty")
        
        if not validate_text_content(response_text):
            raise ValueError("Response text contains invalid content")
        
        if not keywords:
            raise ValueError("Keywords list cannot be empty")
        
        if not business_context:
            raise ValueError("BusinessContext is required")
        
        if not business_context.business_name:
            raise ValueError("Business name is required in BusinessContext")
    
    def _determine_sentiment(self, review: Review) -> str:
        """Determine sentiment from review"""
        if not review:
            return "neutral"
        
        if review.sentiment == ReviewSentiment.POSITIVE or review.rating >= 4:
            return "positive"
        elif review.sentiment == ReviewSentiment.NEGATIVE or review.rating <= 2:
            return "negative"
        else:
            return "neutral"
    
    def _optimize_keyword_integration(
        self,
        text: str,
        keywords: List[str],
        business_context: BusinessContext,
        sentiment: str
    ) -> Tuple[str, bool]:
        """Optimize keyword integration while maintaining natural flow"""
        try:
            optimized_text = text
            optimization_applied = False
            
            # Calculate current keyword density
            current_density = self.calculate_keyword_density(text, keywords)
            
            # Prioritize keywords for integration
            prioritized_keywords = self._prioritize_keywords_for_integration(
                keywords, current_density, business_context
            )
            
            for keyword in prioritized_keywords[:3]:  # Limit to top 3 keywords
                current_kw_density = current_density.get(keyword, 0.0)
                target_density = self.optimal_keyword_density["primary"][0]  # Minimum target
                
                if current_kw_density < target_density:
                    # Try to integrate keyword naturally
                    new_text = self._integrate_keyword_naturally(
                        optimized_text, keyword, business_context, sentiment
                    )
                    
                    if new_text != optimized_text:
                        optimized_text = new_text
                        optimization_applied = True
            
            return optimized_text, optimization_applied
            
        except Exception as e:
            logger.error(f"Error optimizing keyword integration: {e}")
            return text, False
    
    def _integrate_local_seo_phrases(
        self,
        text: str,
        business_context: BusinessContext,
        keywords: List[str]
    ) -> Tuple[str, bool]:
        """Integrate local SEO phrases naturally"""
        try:
            if not business_context.city:
                return text, False
            
            # Generate relevant local phrases
            local_phrases = self.generate_local_seo_phrases(business_context)
            
            if not local_phrases:
                return text, False
            
            # Find the best phrase to integrate
            best_phrase = self._select_best_local_phrase(local_phrases, keywords)
            
            if not best_phrase:
                return text, False
            
            # Integrate phrase naturally
            optimized_text = self._integrate_phrase_naturally(text, best_phrase, business_context)
            
            return optimized_text, optimized_text != text
            
        except Exception as e:
            logger.error(f"Error integrating local SEO phrases: {e}")
            return text, False
    
    def _optimize_cta_placement(
        self,
        text: str,
        business_context: BusinessContext,
        sentiment: str
    ) -> Tuple[str, bool]:
        """Optimize call-to-action placement and effectiveness"""
        try:
            # Check if CTA already exists
            if self._has_effective_cta(text):
                return text, False
            
            # Get CTA recommendation
            cta_recommendation = self.suggest_cta_optimization(business_context, "general")
            
            # Integrate CTA based on placement recommendation
            optimized_text = self._integrate_cta(text, cta_recommendation, sentiment)
            
            return optimized_text, optimized_text != text
            
        except Exception as e:
            logger.error(f"Error optimizing CTA placement: {e}")
            return text, False
    
    def _improve_readability(self, text: str, sentiment: str) -> Tuple[str, bool]:
        """Improve text readability"""
        try:
            optimized_text = text
            optimization_applied = False
            
            # Check sentence length
            sentences = re.split(r'[.!?]+', text)
            long_sentences = [s for s in sentences if len(s.split()) > 25]
            
            if long_sentences:
                # Break up long sentences
                for long_sentence in long_sentences:
                    if len(long_sentence.strip()) > 0:
                        improved_sentence = self._break_up_long_sentence(long_sentence)
                        optimized_text = optimized_text.replace(long_sentence, improved_sentence)
                        optimization_applied = True
            
            # Improve word choice for readability
            optimized_text, word_improvement = self._improve_word_choice(optimized_text)
            optimization_applied = optimization_applied or word_improvement
            
            return optimized_text, optimization_applied
            
        except Exception as e:
            logger.error(f"Error improving readability: {e}")
            return text, False
    
    def _optimize_response_length(self, text: str, sentiment: str) -> Tuple[str, bool]:
        """Optimize response length based on sentiment"""
        try:
            optimal_range = self.optimal_response_length.get(sentiment, (120, 250))
            current_length = len(text)
            
            if optimal_range[0] <= current_length <= optimal_range[1]:
                return text, False  # Already optimal
            
            if current_length < optimal_range[0]:
                # Text too short, expand naturally
                expanded_text = self._expand_response_naturally(text, sentiment, optimal_range[0])
                return expanded_text, expanded_text != text
            
            elif current_length > optimal_range[1]:
                # Text too long, condense
                condensed_text = self._condense_response(text, optimal_range[1])
                return condensed_text, condensed_text != text
            
            return text, False
            
        except Exception as e:
            logger.error(f"Error optimizing response length: {e}")
            return text, False
    
    def _validate_anti_spam(self, text: str, keywords: List[str]) -> bool:
        """Validate text against spam patterns"""
        try:
            # Check keyword density thresholds
            keyword_density = self.calculate_keyword_density(text, keywords)
            
            # Check for excessive keyword density
            for keyword, density in keyword_density.items():
                if density > self.spam_thresholds["max_keyword_density"]:
                    logger.warning(f"Keyword '{keyword}' density {density}% exceeds threshold")
                    return False
            
            # Check total keyword ratio
            total_keyword_ratio = sum(keyword_density.values())
            if total_keyword_ratio > self.spam_thresholds["max_total_keyword_ratio"]:
                logger.warning(f"Total keyword ratio {total_keyword_ratio}% exceeds threshold")
                return False
            
            # Check for minimum unique words
            words = set(re.findall(r'\b\w+\b', text.lower()))
            if len(words) < self.spam_thresholds["min_unique_words"]:
                logger.warning(f"Only {len(words)} unique words, below minimum threshold")
                return False
            
            # Check for excessive repetition
            repetition_ratio = self._calculate_repetition_ratio(text)
            if repetition_ratio > self.spam_thresholds["max_repetition_ratio"]:
                logger.warning(f"Repetition ratio {repetition_ratio} exceeds threshold")
                return False
            
            # Check natural language score
            natural_score = self._calculate_natural_language_score(text)
            if natural_score < self.spam_thresholds["min_natural_language_score"]:
                logger.warning(f"Natural language score {natural_score} below threshold")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating anti-spam: {e}")
            return False
    
    def _calculate_keyword_stuffing_score(
        self,
        keyword_density: Dict[str, float],
        text: str
    ) -> float:
        """Calculate keyword stuffing score (0-1, where 1 is most stuffed)"""
        if not keyword_density:
            return 0.0
        
        # Calculate stuffing based on density thresholds
        stuffing_score = 0.0
        
        for keyword, density in keyword_density.items():
            if density > 6.0:  # Very high density
                stuffing_score += 0.3
            elif density > 4.0:  # High density
                stuffing_score += 0.2
            elif density > 2.5:  # Moderate density
                stuffing_score += 0.1
        
        # Normalize to 0-1 range
        max_possible_score = len(keyword_density) * 0.3
        if max_possible_score > 0:
            stuffing_score = min(stuffing_score / max_possible_score, 1.0)
        
        return round(stuffing_score, 3)
    
    def _calculate_readability_score(self, text: str) -> float:
        """Calculate readability score (0-1, where 1 is most readable)"""
        try:
            if not text:
                return 0.0
            
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            if not sentences:
                return 0.0
            
            words = re.findall(r'\b\w+\b', text)
            
            if not words:
                return 0.0
            
            # Calculate metrics
            avg_words_per_sentence = len(words) / len(sentences)
            avg_syllables_per_word = sum(self._count_syllables(word) for word in words) / len(words)
            
            # Count complex words (3+ syllables)
            complex_words = [word for word in words if self._count_syllables(word) >= 3]
            complex_word_ratio = len(complex_words) / len(words)
            
            # Score based on targets
            score = 0.0
            
            # Words per sentence score
            target_range = self.readability_targets["avg_words_per_sentence"]
            if target_range[0] <= avg_words_per_sentence <= target_range[1]:
                score += 0.4
            else:
                deviation = min(abs(avg_words_per_sentence - target_range[0]), 
                              abs(avg_words_per_sentence - target_range[1]))
                score += max(0, 0.4 - (deviation / 10))
            
            # Syllables per word score
            target_range = self.readability_targets["avg_syllables_per_word"]
            if target_range[0] <= avg_syllables_per_word <= target_range[1]:
                score += 0.3
            else:
                deviation = min(abs(avg_syllables_per_word - target_range[0]),
                              abs(avg_syllables_per_word - target_range[1]))
                score += max(0, 0.3 - (deviation / 2))
            
            # Complex word ratio score
            max_complex_ratio = self.readability_targets["complex_word_ratio"][1]
            if complex_word_ratio <= max_complex_ratio:
                score += 0.3
            else:
                score += max(0, 0.3 - ((complex_word_ratio - max_complex_ratio) * 2))
            
            return round(min(score, 1.0), 3)
            
        except Exception as e:
            logger.error(f"Error calculating readability score: {e}")
            return 0.5
    
    def _calculate_local_seo_score(self, text: str, business_context: BusinessContext) -> float:
        """Calculate local SEO score"""
        try:
            if not business_context.city:
                return 0.0
            
            score = 0.0
            text_lower = text.lower()
            
            # Check for city mention
            if business_context.city.lower() in text_lower:
                score += 0.3
            
            # Check for business name mention
            if business_context.business_name.lower() in text_lower:
                score += 0.2
            
            # Check for local service phrases
            local_indicators = ["local", "neighborhood", "area", "community"]
            for indicator in local_indicators:
                if indicator in text_lower:
                    score += 0.1
                    break
            
            # Check for location-specific services
            if business_context.specialty_services:
                for service in business_context.specialty_services:
                    if service.lower() in text_lower:
                        score += 0.1
                        break
            
            # Check for professional/quality indicators
            quality_indicators = ["professional", "experienced", "skilled", "quality"]
            for indicator in quality_indicators:
                if indicator in text_lower:
                    score += 0.1
                    break
            
            return round(min(score, 1.0), 3)
            
        except Exception as e:
            logger.error(f"Error calculating local SEO score: {e}")
            return 0.0
    
    def _calculate_cta_effectiveness_score(self, text: str) -> float:
        """Calculate CTA effectiveness score"""
        try:
            text_lower = text.lower()
            score = 0.0
            
            # Check for action words
            action_words = ["visit", "contact", "call", "book", "schedule", "come", "see"]
            for word in action_words:
                if word in text_lower:
                    score += 0.2
                    break
            
            # Check for urgency/invitation
            urgency_words = ["soon", "today", "next", "again", "forward"]
            for word in urgency_words:
                if word in text_lower:
                    score += 0.1
                    break
            
            # Check for personalization
            personal_words = ["you", "your", "we", "us"]
            for word in personal_words:
                if word in text_lower:
                    score += 0.1
                    break
            
            # Check for gratitude (positive for CTA)
            gratitude_words = ["thank", "appreciate", "grateful"]
            for word in gratitude_words:
                if word in text_lower:
                    score += 0.1
                    break
            
            # Check for specific business references
            business_words = ["business", "shop", "salon", "barber"]
            for word in business_words:
                if word in text_lower:
                    score += 0.1
                    break
            
            return round(min(score, 1.0), 3)
            
        except Exception as e:
            logger.error(f"Error calculating CTA effectiveness score: {e}")
            return 0.0
    
    def _calculate_overall_seo_score(
        self,
        keyword_stuffing_score: float,
        readability_score: float,
        local_seo_score: float,
        cta_effectiveness_score: float
    ) -> float:
        """Calculate overall SEO score with weighted factors"""
        try:
            # Weight factors (must sum to 1.0)
            weights = {
                "keyword_quality": 0.3,     # Lower stuffing = higher quality
                "readability": 0.3,
                "local_seo": 0.25,
                "cta_effectiveness": 0.15
            }
            
            # Calculate weighted score
            keyword_quality_score = 1.0 - keyword_stuffing_score  # Invert stuffing score
            
            overall_score = (
                weights["keyword_quality"] * keyword_quality_score +
                weights["readability"] * readability_score +
                weights["local_seo"] * local_seo_score +
                weights["cta_effectiveness"] * cta_effectiveness_score
            )
            
            return round(overall_score, 3)
            
        except Exception as e:
            logger.error(f"Error calculating overall SEO score: {e}")
            return 0.5
    
    def _generate_seo_suggestions(
        self,
        keyword_density: Dict[str, float],
        readability_score: float,
        local_seo_score: float,
        cta_effectiveness_score: float
    ) -> List[str]:
        """Generate SEO improvement suggestions"""
        suggestions = []
        
        # Keyword suggestions
        if not keyword_density:
            suggestions.append("Consider including relevant keywords naturally in your response")
        elif max(keyword_density.values()) < 1.0:
            suggestions.append("Increase keyword density slightly for better SEO impact")
        
        # Readability suggestions
        if readability_score < 0.6:
            suggestions.append("Improve readability by using shorter sentences and simpler words")
        
        # Local SEO suggestions
        if local_seo_score < 0.3:
            suggestions.append("Include location or business name for better local SEO")
        
        # CTA suggestions
        if cta_effectiveness_score < 0.4:
            suggestions.append("Add a clear call-to-action to encourage customer engagement")
        
        return suggestions
    
    def _generate_seo_warnings(
        self,
        keyword_stuffing_score: float,
        keyword_density: Dict[str, float],
        text: str
    ) -> List[str]:
        """Generate SEO warnings for potential issues"""
        warnings = []
        
        # Keyword stuffing warning
        if keyword_stuffing_score > 0.6:
            warnings.append("High keyword density detected - may appear spammy to search engines")
        
        # Individual keyword density warnings
        for keyword, density in keyword_density.items():
            if density > 5.0:
                warnings.append(f"Keyword '{keyword}' appears too frequently ({density}%)")
        
        # Length warnings
        if len(text) < 50:
            warnings.append("Response is very short - consider adding more valuable content")
        elif len(text) > 400:
            warnings.append("Response is quite long - consider condensing for better engagement")
        
        return warnings
    
    def _get_empty_seo_analysis(self) -> SEOAnalysis:
        """Get empty SEO analysis for error cases"""
        return SEOAnalysis(
            keyword_density={},
            total_keywords=0,
            keyword_stuffing_score=0.0,
            readability_score=0.0,
            local_seo_score=0.0,
            cta_effectiveness_score=0.0,
            overall_seo_score=0.0,
            suggestions=["Unable to analyze content"],
            warnings=["Analysis failed"]
        )
    
    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word (simplified algorithm)"""
        word = word.lower()
        count = 0
        vowels = "aeiouy"
        
        if word[0] in vowels:
            count += 1
        
        for index in range(1, len(word)):
            if word[index] in vowels and word[index - 1] not in vowels:
                count += 1
        
        if word.endswith("e"):
            count -= 1
        
        if count == 0:
            count += 1
        
        return count
    
    def _calculate_repetition_ratio(self, text: str) -> float:
        """Calculate repetition ratio in text"""
        words = re.findall(r'\b\w+\b', text.lower())
        if len(words) < 2:
            return 0.0
        
        word_counts = Counter(words)
        repeated_words = sum(count - 1 for count in word_counts.values() if count > 1)
        
        return repeated_words / len(words)
    
    def _calculate_natural_language_score(self, text: str) -> float:
        """Calculate natural language score (simplified)"""
        # Basic heuristics for natural language
        score = 1.0
        
        # Check for excessive capitalization
        if sum(1 for c in text if c.isupper()) / len(text) > 0.2:
            score -= 0.3
        
        # Check for excessive punctuation
        if sum(1 for c in text if c in "!@#$%^&*") / len(text) > 0.1:
            score -= 0.3
        
        # Check for reasonable sentence structure
        sentences = re.split(r'[.!?]+', text)
        valid_sentences = [s for s in sentences if s.strip() and len(s.split()) >= 2]
        
        if len(valid_sentences) / max(len(sentences), 1) < 0.7:
            score -= 0.2
        
        return max(score, 0.0)
    
    def _prioritize_keywords_for_integration(
        self,
        keywords: List[str],
        current_density: Dict[str, float],
        business_context: BusinessContext
    ) -> List[str]:
        """Prioritize keywords for integration based on various factors"""
        scored_keywords = []
        
        for keyword in keywords:
            score = 0
            
            # Base score
            score += 1
            
            # Boost for low current density
            current_kw_density = current_density.get(keyword, 0.0)
            if current_kw_density < 1.0:
                score += 2
            
            # Boost for business name inclusion
            if business_context.business_name.lower() in keyword.lower():
                score += 2
            
            # Boost for city inclusion
            if business_context.city and business_context.city.lower() in keyword.lower():
                score += 1
            
            # Boost for service keywords
            if any(service.lower() in keyword.lower() 
                   for service in business_context.specialty_services or []):
                score += 1
            
            scored_keywords.append((keyword, score))
        
        # Sort by score and return keywords
        sorted_keywords = sorted(scored_keywords, key=lambda x: x[1], reverse=True)
        return [kw for kw, _ in sorted_keywords]
    
    def _integrate_keyword_naturally(
        self,
        text: str,
        keyword: str,
        business_context: BusinessContext,
        sentiment: str
    ) -> str:
        """Integrate keyword naturally into text"""
        # This is a simplified implementation
        # In production, this would use more sophisticated NLP
        
        if keyword.lower() in text.lower():
            return text  # Already present
        
        # Simple integration strategies
        if sentiment == "positive":
            if "thank" in text.lower():
                text = text.replace("thank you", f"thank you for choosing our {keyword} service")
            elif "great" in text.lower():
                text = text.replace("great", f"great {keyword}")
        
        elif sentiment == "negative":
            if "sorry" in text.lower():
                text = text.replace("service", f"{keyword} service")
        
        return text
    
    def _select_best_local_phrase(self, local_phrases: List[str], keywords: List[str]) -> str:
        """Select the best local phrase based on keyword relevance"""
        if not local_phrases:
            return ""
        
        # Score phrases based on keyword overlap
        scored_phrases = []
        
        for phrase in local_phrases:
            score = 0
            phrase_lower = phrase.lower()
            
            for keyword in keywords:
                if keyword.lower() in phrase_lower:
                    score += 1
            
            scored_phrases.append((phrase, score))
        
        # Return highest scoring phrase
        sorted_phrases = sorted(scored_phrases, key=lambda x: x[1], reverse=True)
        return sorted_phrases[0][0] if sorted_phrases else local_phrases[0]
    
    def _integrate_phrase_naturally(
        self,
        text: str,
        phrase: str,
        business_context: BusinessContext
    ) -> str:
        """Integrate local phrase naturally into text"""
        # Simplified integration
        if phrase.lower() in text.lower():
            return text
        
        # Try to add at the end naturally
        if text.endswith(".") or text.endswith("!"):
            return f"{text[:-1]} - {phrase}."
        else:
            return f"{text} We're proud to be {phrase}."
    
    def _has_effective_cta(self, text: str) -> bool:
        """Check if text already has an effective CTA"""
        cta_indicators = ["visit", "contact", "call", "book", "schedule", "come", "see"]
        text_lower = text.lower()
        
        return any(indicator in text_lower for indicator in cta_indicators)
    
    def _integrate_cta(
        self,
        text: str,
        cta_recommendation: CTARecommendation,
        sentiment: str
    ) -> str:
        """Integrate CTA into text based on recommendation"""
        cta_text = cta_recommendation.cta_text
        placement = cta_recommendation.placement
        
        if placement == "end":
            return f"{text} {cta_text}"
        elif placement == "beginning":
            return f"{cta_text} {text}"
        else:  # middle
            sentences = text.split(".")
            if len(sentences) > 1:
                mid_point = len(sentences) // 2
                sentences.insert(mid_point, f" {cta_text}")
                return ".".join(sentences)
        
        return f"{text} {cta_text}"
    
    def _break_up_long_sentence(self, sentence: str) -> str:
        """Break up a long sentence into shorter ones"""
        # Simplified implementation
        if "and" in sentence:
            return sentence.replace(" and ", ". ")
        elif "," in sentence:
            parts = sentence.split(",", 1)
            return f"{parts[0]}. {parts[1].strip()}"
        
        return sentence
    
    def _improve_word_choice(self, text: str) -> Tuple[str, bool]:
        """Improve word choice for better readability"""
        # Simplified word replacements
        replacements = {
            "utilize": "use",
            "assistance": "help",
            "extremely": "very",
            "magnificent": "great",
            "exceptional": "excellent"
        }
        
        improved_text = text
        changes_made = False
        
        for complex_word, simple_word in replacements.items():
            if complex_word in improved_text:
                improved_text = improved_text.replace(complex_word, simple_word)
                changes_made = True
        
        return improved_text, changes_made
    
    def _expand_response_naturally(self, text: str, sentiment: str, target_length: int) -> str:
        """Expand response naturally to reach target length"""
        if len(text) >= target_length:
            return text
        
        # Add appropriate expansion based on sentiment
        if sentiment == "positive":
            additions = [
                " Your satisfaction is our top priority.",
                " We appreciate your business and loyalty.",
                " Thank you for being a valued customer."
            ]
        elif sentiment == "negative":
            additions = [
                " We are committed to making this right.",
                " Your feedback helps us improve our services.",
                " We value your patience as we work to resolve this."
            ]
        else:
            additions = [
                " We appreciate you taking the time to share your feedback.",
                " Your experience matters to us.",
                " We look forward to serving you again."
            ]
        
        expanded_text = text
        for addition in additions:
            if len(expanded_text) + len(addition) <= target_length + 20:  # Small buffer
                expanded_text += addition
                if len(expanded_text) >= target_length:
                    break
        
        return expanded_text
    
    def _condense_response(self, text: str, target_length: int) -> str:
        """Condense response to target length"""
        if len(text) <= target_length:
            return text
        
        # Remove redundant phrases and shorten
        condensed = text
        
        # Remove redundant words
        redundant_phrases = [
            "very much", "really appreciate", "truly grateful",
            "so sorry", "deeply apologize", "sincerely sorry"
        ]
        
        replacements = {
            "very much": "",
            "really appreciate": "appreciate",
            "truly grateful": "grateful",
            "so sorry": "sorry",
            "deeply apologize": "apologize",
            "sincerely sorry": "sorry"
        }
        
        for phrase, replacement in replacements.items():
            condensed = condensed.replace(phrase, replacement)
        
        # If still too long, truncate at sentence boundary
        if len(condensed) > target_length:
            sentences = condensed.split(".")
            truncated = ""
            for sentence in sentences:
                if len(truncated + sentence + ".") <= target_length:
                    truncated += sentence + "."
                else:
                    break
            condensed = truncated
        
        return condensed
    
    def _determine_optimal_cta_type(self, service_type: str, business_context: BusinessContext) -> str:
        """Determine optimal CTA type based on service and context"""
        # Simplified logic
        if "haircut" in service_type or "cut" in service_type:
            return "book"
        elif "negative" in service_type:
            return "contact"
        else:
            return "visit"
    
    def _select_best_cta_template(
        self,
        templates: List[str],
        business_context: BusinessContext,
        service_type: str
    ) -> str:
        """Select best CTA template based on context"""
        # For now, return first template
        # In production, this would use more sophisticated selection
        return templates[0] if templates else "Thank you!"
    
    def _customize_cta_text(
        self,
        template: str,
        business_context: BusinessContext,
        service_type: str
    ) -> str:
        """Customize CTA text with business context"""
        customized = template
        
        # Replace placeholders
        if "{business_name}" in customized:
            customized = customized.replace("{business_name}", business_context.business_name)
        
        return customized
    
    def _calculate_cta_effectiveness(
        self,
        cta_text: str,
        business_context: BusinessContext,
        base_effectiveness: float
    ) -> float:
        """Calculate CTA effectiveness score"""
        score = base_effectiveness
        
        # Boost for personalization
        if business_context.business_name.lower() in cta_text.lower():
            score += 0.1
        
        # Boost for action words
        action_words = ["book", "visit", "contact", "call"]
        if any(word in cta_text.lower() for word in action_words):
            score += 0.05
        
        return min(score, 1.0)
    
    def _determine_cta_placement(self, cta_type: str, service_type: str) -> str:
        """Determine optimal CTA placement"""
        if cta_type == "contact":
            return "end"
        elif cta_type == "book":
            return "end"
        else:
            return "end"
    
    def _validate_local_phrase(self, phrase: str) -> bool:
        """Validate local SEO phrase quality"""
        if not phrase or len(phrase) < 10:
            return False
        
        if len(phrase) > 100:
            return False
        
        # Check for natural language
        return validate_text_content(phrase)
    
    def _generate_neighborhood_phrases(self, business_context: BusinessContext) -> List[str]:
        """Generate neighborhood-specific phrases"""
        phrases = []
        
        if business_context.address:
            # Extract potential neighborhood from address
            address_parts = business_context.address.split()
            for part in address_parts:
                if len(part) > 3 and part.isalpha() and part not in ["Street", "Ave", "Road", "Dr", "Blvd"]:
                    phrases.extend([
                        f"professional barber in {part}",
                        f"{part} area grooming",
                        f"serving {part} community"
                    ])
        
        return phrases[:5]  # Limit results
    
    def _estimate_readability_level(self, text: str) -> str:
        """Estimate readability level of text"""
        readability_score = self._calculate_readability_score(text)
        
        if readability_score >= 0.8:
            return "excellent"
        elif readability_score >= 0.6:
            return "good"
        elif readability_score >= 0.4:
            return "fair"
        else:
            return "needs improvement"
    
    def _extract_service_type(self, keywords: List[str]) -> str:
        """Extract service type from keywords"""
        service_keywords = {
            "haircut": ["haircut", "cut", "trim", "hair"],
            "beard_trim": ["beard", "facial", "mustache"],
            "shave": ["shave", "razor", "hot towel"],
            "styling": ["style", "styling", "professional"]
        }
        
        for service_type, service_keywords_list in service_keywords.items():
            for keyword in keywords:
                if any(sk in keyword.lower() for sk in service_keywords_list):
                    return service_type
        
        return "general"
    
    def _determine_customer_segment_from_review(self, review: Optional[Review]) -> str:
        """Determine customer segment from review"""
        if not review:
            return "general"
        
        if review.rating and review.rating >= 5:
            return "loyal"
        elif review.rating and review.rating <= 2:
            return "detractor"
        else:
            return "neutral"


# ==================== UTILITY FUNCTIONS ====================

def calculate_seo_roi_estimate(
    original_score: float,
    optimized_score: float,
    monthly_reviews: int = 50
) -> Dict[str, Any]:
    """
    Calculate estimated SEO ROI from optimization improvements.
    
    Args:
        original_score: Original SEO score before optimization
        optimized_score: SEO score after optimization
        monthly_reviews: Estimated monthly review volume
        
    Returns:
        Dictionary with ROI estimates and projections
    """
    improvement = optimized_score - original_score
    
    # Estimated impact metrics (simplified model)
    estimated_visibility_increase = improvement * 10  # % increase in local search visibility
    estimated_click_increase = improvement * 15       # % increase in click-through rate
    estimated_conversion_increase = improvement * 5   # % increase in conversions
    
    return {
        "improvement_score": round(improvement, 3),
        "estimated_visibility_increase_pct": round(estimated_visibility_increase, 1),
        "estimated_click_increase_pct": round(estimated_click_increase, 1),
        "estimated_conversion_increase_pct": round(estimated_conversion_increase, 1),
        "monthly_review_volume": monthly_reviews,
        "projected_monthly_benefit": f"${round(monthly_reviews * improvement * 2, 2)}"
    }


def generate_seo_performance_report(
    optimizations: List[OptimizedResponse],
    timeframe_days: int = 30
) -> Dict[str, Any]:
    """
    Generate comprehensive SEO performance report.
    
    Args:
        optimizations: List of optimization results
        timeframe_days: Reporting timeframe in days
        
    Returns:
        Dictionary with performance metrics and insights
    """
    if not optimizations:
        return {"error": "No optimization data provided"}
    
    # Calculate aggregate metrics
    total_optimizations = len(optimizations)
    successful_optimizations = sum(
        1 for opt in optimizations 
        if any(opt.optimization_applied.values())
    )
    
    avg_seo_improvement = sum(
        opt.seo_analysis.overall_seo_score for opt in optimizations
    ) / total_optimizations
    
    # Most common optimization types
    optimization_types = {
        "keyword_integration": 0,
        "local_seo_phrases": 0,
        "cta_optimization": 0,
        "readability_improvement": 0,
        "length_optimization": 0
    }
    
    for opt in optimizations:
        for opt_type, applied in opt.optimization_applied.items():
            if applied:
                optimization_types[opt_type] += 1
    
    # Top suggestions
    all_suggestions = []
    for opt in optimizations:
        all_suggestions.extend(opt.seo_analysis.suggestions)
    
    suggestion_counts = Counter(all_suggestions)
    top_suggestions = suggestion_counts.most_common(5)
    
    return {
        "timeframe_days": timeframe_days,
        "total_optimizations": total_optimizations,
        "successful_optimizations": successful_optimizations,
        "success_rate_pct": round((successful_optimizations / total_optimizations) * 100, 1),
        "average_seo_score": round(avg_seo_improvement, 3),
        "optimization_breakdown": optimization_types,
        "top_suggestions": [{"suggestion": sugg, "frequency": count} for sugg, count in top_suggestions],
        "generated_at": datetime.utcnow().isoformat()
    }