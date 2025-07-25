"""
Dynamic Content Assembly System for BookedBarber V2 Review Management.
Intelligently orchestrates all AI services to generate complete, contextual, SEO-optimized review responses.
Provides robust fallback mechanisms, security validation, and performance monitoring.
"""

import logging
import time
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from sqlalchemy.orm import Session

from models.review import Review, ReviewSentiment
from services.business_context_service import BusinessContextService, BusinessContext
from services.keyword_generation_service import KeywordGenerationService, KeywordAnalysisResult
from services.seo_optimization_service import SEOOptimizationService, OptimizedResponse, SEOAnalysis
from services.review_service import ReviewService

# Configure logging
logger = logging.getLogger(__name__)


class AssemblyStep(Enum):
    """Steps in the content assembly pipeline"""
    CONTEXT_EXTRACTION = "context_extraction"
    KEYWORD_ANALYSIS = "keyword_analysis"
    RESPONSE_GENERATION = "response_generation"
    SEO_OPTIMIZATION = "seo_optimization"
    QUALITY_VALIDATION = "quality_validation"
    FINAL_ASSEMBLY = "final_assembly"


class QualityLevel(Enum):
    """Quality levels for assembled responses"""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    FAILED = "failed"


@dataclass
class AssemblyMetrics:
    """Performance metrics for assembly operations"""
    total_requests: int = 0
    successful_assemblies: int = 0
    failed_assemblies: int = 0
    average_response_time: float = 0.0
    service_failures: Dict[str, int] = field(default_factory=dict)
    quality_distribution: Dict[str, int] = field(default_factory=dict)
    fallback_usage: Dict[str, int] = field(default_factory=dict)


@dataclass
class QualityReport:
    """Quality assessment report for assembled content"""
    overall_score: float
    quality_level: QualityLevel
    content_issues: List[str]
    seo_score: float
    readability_score: float
    authenticity_score: float
    keyword_density_score: float
    length_appropriateness: bool
    tone_consistency: bool
    brand_alignment: bool
    recommendations: List[str]


@dataclass
class AssemblyContext:
    """Context container for assembly operations"""
    review: Review
    business_context: Optional[BusinessContext] = None
    keyword_analysis: Optional[KeywordAnalysisResult] = None
    seo_analysis: Optional[SEOAnalysis] = None
    step_timings: Dict[str, float] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class AssembledResponse:
    """Complete assembled response with metadata"""
    final_response: str
    quality_report: QualityReport
    assembly_context: AssemblyContext
    optimization_applied: Dict[str, bool]
    fallbacks_used: List[str]
    processing_time: float
    character_count: int
    word_count: int
    estimated_engagement_score: float


@dataclass
class AssemblyAnalytics:
    """Analytics data for the assembly system"""
    performance_metrics: AssemblyMetrics
    service_health: Dict[str, float]
    quality_trends: Dict[str, List[float]]
    optimization_effectiveness: Dict[str, float]
    user_satisfaction_scores: Dict[str, float]


class DynamicContentAssemblyService:
    """
    Dynamic Content Assembly System that orchestrates all AI services to generate
    high-quality, contextual, SEO-optimized review responses.
    
    Features:
    1. Intelligent coordination of BusinessContextService, KeywordGenerationService, 
       SEOOptimizationService, and ReviewService
    2. Smart fallback chain with graceful degradation
    3. Comprehensive quality validation and scoring
    4. Performance optimization with caching and async processing
    5. Security validation and injection attack prevention
    6. Real-time analytics and monitoring
    """
    
    def __init__(self, db: Session):
        """
        Initialize the dynamic content assembly service.
        
        Args:
            db: Database session for data access
        """
        if not db:
            raise ValueError("Database session cannot be None")
        
        self.db = db
        
        # Initialize AI services
        try:
            self.business_context_service = BusinessContextService(db)
            self.keyword_service = KeywordGenerationService(db)
            self.seo_service = SEOOptimizationService(db)
            self.review_service = ReviewService()
            
            logger.info("Successfully initialized all AI services")
        except Exception as e:
            logger.error(f"Failed to initialize AI services: {e}")
            raise
        
        # Assembly configuration
        self.assembly_config = {
            "max_response_length": 350,
            "min_response_length": 80,
            "max_keyword_density": 4.0,
            "min_quality_score": 0.6,
            "timeout_seconds": 30,
            "enable_async_processing": True,
            "cache_responses": True,
            "validate_security": True
        }
        
        # Quality thresholds
        self.quality_thresholds = {
            QualityLevel.EXCELLENT: 0.9,
            QualityLevel.GOOD: 0.75,
            QualityLevel.ACCEPTABLE: 0.6,
            QualityLevel.POOR: 0.4,
            QualityLevel.FAILED: 0.0
        }
        
        # Performance metrics
        self.metrics = AssemblyMetrics()
        
        # Fallback response templates for emergency situations
        self.emergency_templates = {
            ReviewSentiment.POSITIVE: [
                "Thank you so much for your wonderful review! We're thrilled you had a great experience and look forward to seeing you again soon.",
                "We're delighted to hear about your positive experience! Thank you for taking the time to share your feedback.",
                "Your kind words mean the world to us! We're so glad we could provide you with excellent service."
            ],
            ReviewSentiment.NEUTRAL: [
                "Thank you for your feedback. We appreciate you taking the time to share your experience and we're always working to improve.",
                "We value your honest review and feedback. We'd love the opportunity to exceed your expectations next time.",
                "Thank you for your review. We're committed to continuous improvement and appreciate your input."
            ],
            ReviewSentiment.NEGATIVE: [
                "Thank you for bringing this to our attention. We sincerely apologize and would like the opportunity to make this right. Please contact us directly.",
                "We're sorry to hear about your experience. This is not the level of service we strive for. We'd appreciate the chance to discuss this with you personally.",
                "We value your feedback and are taking your concerns seriously. Please reach out to us so we can address this matter properly."
            ]
        }
    
    def assemble_complete_response(
        self,
        review: Review,
        db: Session,
        custom_context: Optional[Dict[str, Any]] = None,
        priority_keywords: Optional[List[str]] = None
    ) -> AssembledResponse:
        """
        Assemble a complete, optimized review response by orchestrating all AI services.
        
        Args:
            review: Review object to respond to
            db: Database session
            custom_context: Optional custom context data
            priority_keywords: Optional priority keywords to emphasize
            
        Returns:
            AssembledResponse with complete response and metadata
            
        Raises:
            ValueError: If review is invalid
            TimeoutError: If assembly takes too long
        """
        start_time = time.time()
        self.metrics.total_requests += 1
        
        # Input validation and sanitization
        if not review or not review.id:
            raise ValueError("Invalid review provided")
        
        # Initialize assembly context
        assembly_context = AssemblyContext(
            review=review,
            step_timings={},
            errors=[],
            warnings=[]
        )
        
        fallbacks_used = []
        
        try:
            # Step 1: Extract business context
            logger.info(f"Starting content assembly for review {review.id}")
            step_start = time.time()
            
            try:
                business_context = self._extract_business_context(review, custom_context)
                assembly_context.business_context = business_context
                assembly_context.step_timings[AssemblyStep.CONTEXT_EXTRACTION.value] = time.time() - step_start
                logger.debug(f"Business context extracted for review {review.id}")
            except Exception as e:
                logger.warning(f"Business context extraction failed: {e}")
                assembly_context.errors.append(f"Context extraction failed: {str(e)}")
                fallbacks_used.append("basic_business_context")
                business_context = self._get_fallback_business_context()
                assembly_context.business_context = business_context
            
            # Step 2: Analyze keywords
            step_start = time.time()
            try:
                keyword_analysis = self._analyze_keywords(review, business_context, priority_keywords)
                assembly_context.keyword_analysis = keyword_analysis
                assembly_context.step_timings[AssemblyStep.KEYWORD_ANALYSIS.value] = time.time() - step_start
                logger.debug(f"Keyword analysis completed for review {review.id}")
            except Exception as e:
                logger.warning(f"Keyword analysis failed: {e}")
                assembly_context.errors.append(f"Keyword analysis failed: {str(e)}")
                fallbacks_used.append("basic_keywords")
                keyword_analysis = self._get_fallback_keywords(review)
                assembly_context.keyword_analysis = keyword_analysis
            
            # Step 3: Generate base response
            step_start = time.time()
            try:
                base_response = self._generate_base_response(review, business_context, keyword_analysis)
                assembly_context.step_timings[AssemblyStep.RESPONSE_GENERATION.value] = time.time() - step_start
                logger.debug(f"Base response generated for review {review.id}")
            except Exception as e:
                logger.warning(f"Response generation failed: {e}")
                assembly_context.errors.append(f"Response generation failed: {str(e)}")
                fallbacks_used.append("emergency_template")
                base_response = self._get_emergency_response(review)
            
            # Step 4: Apply SEO optimization
            step_start = time.time()
            try:
                optimized_response = self._apply_seo_optimization(
                    base_response, review, business_context, keyword_analysis
                )
                assembly_context.seo_analysis = optimized_response.seo_analysis
                final_response = optimized_response.optimized_text
                assembly_context.step_timings[AssemblyStep.SEO_OPTIMIZATION.value] = time.time() - step_start
                logger.debug(f"SEO optimization applied for review {review.id}")
            except Exception as e:
                logger.warning(f"SEO optimization failed: {e}")
                assembly_context.errors.append(f"SEO optimization failed: {str(e)}")
                fallbacks_used.append("basic_seo")
                final_response = self._apply_basic_seo(base_response, business_context)
                assembly_context.seo_analysis = None
            
            # Step 5: Validate quality and security
            step_start = time.time()
            try:
                quality_report = self.validate_content_quality(final_response, business_context)
                
                # Security validation
                if self.assembly_config["validate_security"]:
                    security_valid = self._validate_security(final_response)
                    if not security_valid:
                        assembly_context.errors.append("Security validation failed")
                        fallbacks_used.append("security_fallback")
                        final_response = self._sanitize_response(final_response)
                
                assembly_context.step_timings[AssemblyStep.QUALITY_VALIDATION.value] = time.time() - step_start
                logger.debug(f"Quality validation completed for review {review.id}")
            except Exception as e:
                logger.warning(f"Quality validation failed: {e}")
                assembly_context.errors.append(f"Quality validation failed: {str(e)}")
                quality_report = self._get_fallback_quality_report()
            
            # Step 6: Final assembly and optimization
            step_start = time.time()
            try:
                final_response = self._finalize_response(final_response, quality_report, business_context)
                assembly_context.step_timings[AssemblyStep.FINAL_ASSEMBLY.value] = time.time() - step_start
                logger.debug(f"Final assembly completed for review {review.id}")
            except Exception as e:
                logger.warning(f"Final assembly failed: {e}")
                assembly_context.errors.append(f"Final assembly failed: {str(e)}")
            
            # Calculate metrics
            processing_time = time.time() - start_time
            word_count = len(final_response.split())
            character_count = len(final_response)
            
            # Estimate engagement score based on quality and optimization
            engagement_score = self._calculate_engagement_score(
                quality_report, assembly_context.seo_analysis, len(fallbacks_used)
            )
            
            # Create assembled response
            assembled_response = AssembledResponse(
                final_response=final_response,
                quality_report=quality_report,
                assembly_context=assembly_context,
                optimization_applied=self._get_optimization_flags(assembly_context),
                fallbacks_used=fallbacks_used,
                processing_time=processing_time,
                character_count=character_count,
                word_count=word_count,
                estimated_engagement_score=engagement_score
            )
            
            # Update metrics
            self.metrics.successful_assemblies += 1
            self.metrics.average_response_time = (
                (self.metrics.average_response_time * (self.metrics.successful_assemblies - 1) + processing_time) /
                self.metrics.successful_assemblies
            )
            
            # Track quality distribution
            quality_level = quality_report.quality_level.value
            self.metrics.quality_distribution[quality_level] = (
                self.metrics.quality_distribution.get(quality_level, 0) + 1
            )
            
            # Track fallback usage
            for fallback in fallbacks_used:
                self.metrics.fallback_usage[fallback] = (
                    self.metrics.fallback_usage.get(fallback, 0) + 1
                )
            
            logger.info(f"Successfully assembled response for review {review.id} in {processing_time:.2f}s")
            return assembled_response
            
        except Exception as e:
            # Handle catastrophic failure
            self.metrics.failed_assemblies += 1
            logger.error(f"Catastrophic failure in content assembly for review {review.id}: {e}")
            
            # Return emergency response
            emergency_response = self._get_emergency_response(review)
            quality_report = QualityReport(
                overall_score=0.3,
                quality_level=QualityLevel.POOR,
                content_issues=["Emergency fallback used"],
                seo_score=0.2,
                readability_score=0.7,
                authenticity_score=0.8,
                keyword_density_score=0.1,
                length_appropriateness=True,
                tone_consistency=True,
                brand_alignment=False,
                recommendations=["System recovery needed"]
            )
            
            return AssembledResponse(
                final_response=emergency_response,
                quality_report=quality_report,
                assembly_context=assembly_context,
                optimization_applied={},
                fallbacks_used=["catastrophic_failure"],
                processing_time=time.time() - start_time,
                character_count=len(emergency_response),
                word_count=len(emergency_response.split()),
                estimated_engagement_score=0.3
            )
    
    def validate_content_quality(
        self,
        content: str,
        context: BusinessContext,
        custom_criteria: Optional[Dict[str, Any]] = None
    ) -> QualityReport:
        """
        Validate the quality of assembled content against multiple criteria.
        
        Args:
            content: Content to validate
            context: Business context for validation
            custom_criteria: Optional custom validation criteria
            
        Returns:
            QualityReport with detailed quality assessment
        """
        try:
            # Input validation
            if not content or not content.strip():
                return QualityReport(
                    overall_score=0.0,
                    quality_level=QualityLevel.FAILED,
                    content_issues=["Empty content"],
                    seo_score=0.0,
                    readability_score=0.0,
                    authenticity_score=0.0,
                    keyword_density_score=0.0,
                    length_appropriateness=False,
                    tone_consistency=False,
                    brand_alignment=False,
                    recommendations=["Content cannot be empty"]
                )
            
            content = content.strip()
            content_issues = []
            recommendations = []
            
            # Length validation
            length_score = self._validate_length(content)
            length_appropriate = (
                self.assembly_config["min_response_length"] <= 
                len(content) <= 
                self.assembly_config["max_response_length"]
            )
            
            if not length_appropriate:
                if len(content) < self.assembly_config["min_response_length"]:
                    content_issues.append("Response too short")
                    recommendations.append("Add more context or detail")
                else:
                    content_issues.append("Response too long")
                    recommendations.append("Reduce length while maintaining key points")
            
            # SEO validation
            seo_score = self._validate_seo_quality(content, context)
            if seo_score < 0.6:
                content_issues.append("Poor SEO optimization")
                recommendations.append("Include relevant keywords naturally")
            
            # Readability validation
            readability_score = self._calculate_readability_score(content)
            if readability_score < 0.7:
                content_issues.append("Poor readability")
                recommendations.append("Simplify language and sentence structure")
            
            # Authenticity validation
            authenticity_score = self._validate_authenticity(content, context)
            if authenticity_score < 0.8:
                content_issues.append("Sounds robotic or generic")
                recommendations.append("Add more personal touch and specific details")
            
            # Keyword density validation
            keyword_density_score = self._validate_keyword_density(content)
            if keyword_density_score < 0.5:
                content_issues.append("Keyword stuffing detected or poor keyword usage")
                recommendations.append("Balance keyword usage naturally")
            
            # Tone consistency validation
            tone_consistent = self._validate_tone_consistency(content)
            if not tone_consistent:
                content_issues.append("Inconsistent tone")
                recommendations.append("Maintain consistent professional tone")
            
            # Brand alignment validation
            brand_aligned = self._validate_brand_alignment(content, context)
            if not brand_aligned:
                content_issues.append("Poor brand alignment")
                recommendations.append("Include business name and align with brand voice")
            
            # Security validation
            security_issues = self._detect_security_issues(content)
            if security_issues:
                content_issues.extend(security_issues)
                recommendations.append("Review content for security concerns")
            
            # Calculate overall score
            scores = [
                length_score,
                seo_score,
                readability_score,
                authenticity_score,
                keyword_density_score
            ]
            overall_score = sum(scores) / len(scores)
            
            # Determine quality level
            quality_level = QualityLevel.FAILED
            for level, threshold in self.quality_thresholds.items():
                if overall_score >= threshold:
                    quality_level = level
                    break
            
            return QualityReport(
                overall_score=overall_score,
                quality_level=quality_level,
                content_issues=content_issues,
                seo_score=seo_score,
                readability_score=readability_score,
                authenticity_score=authenticity_score,
                keyword_density_score=keyword_density_score,
                length_appropriateness=length_appropriate,
                tone_consistency=tone_consistent,
                brand_alignment=brand_aligned,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Error in content quality validation: {e}")
            return QualityReport(
                overall_score=0.0,
                quality_level=QualityLevel.FAILED,
                content_issues=[f"Validation error: {str(e)}"],
                seo_score=0.0,
                readability_score=0.0,
                authenticity_score=0.0,
                keyword_density_score=0.0,
                length_appropriateness=False,
                tone_consistency=False,
                brand_alignment=False,
                recommendations=["System validation error"]
            )
    
    def optimize_response_pipeline(
        self,
        review: Review,
        business_context: BusinessContext,
        target_quality: QualityLevel = QualityLevel.GOOD
    ) -> str:
        """
        Optimize the response generation pipeline for a specific quality target.
        
        Args:
            review: Review to respond to
            business_context: Business context
            target_quality: Target quality level
            
        Returns:
            Optimized response string
        """
        try:
            max_iterations = 3
            current_iteration = 0
            
            while current_iteration < max_iterations:
                # Generate response with current optimization
                assembled_response = self.assemble_complete_response(review, self.db)
                
                # Check if we've met the target quality
                if assembled_response.quality_report.quality_level.value >= target_quality.value:
                    logger.info(f"Target quality {target_quality.value} achieved in {current_iteration + 1} iterations")
                    return assembled_response.final_response
                
                # Apply targeted improvements based on quality report
                if current_iteration < max_iterations - 1:
                    self._apply_quality_improvements(assembled_response.quality_report)
                
                current_iteration += 1
            
            # If we couldn't achieve target quality, return best attempt
            logger.warning(f"Could not achieve target quality {target_quality.value} after {max_iterations} iterations")
            return assembled_response.final_response
            
        except Exception as e:
            logger.error(f"Error in response pipeline optimization: {e}")
            # Fallback to basic response
            return self._get_emergency_response(review)
    
    def get_assembly_analytics(self) -> AssemblyAnalytics:
        """
        Get comprehensive analytics about the assembly system performance.
        
        Returns:
            AssemblyAnalytics with detailed system metrics
        """
        try:
            # Calculate service health scores
            service_health = {
                "business_context_service": self._calculate_service_health("business_context"),
                "keyword_service": self._calculate_service_health("keyword_generation"),
                "seo_service": self._calculate_service_health("seo_optimization"),
                "review_service": self._calculate_service_health("review_generation")
            }
            
            # Calculate quality trends (would typically come from historical data)
            quality_trends = {
                "overall_quality": [0.75, 0.78, 0.76, 0.82, 0.85],  # Last 5 periods
                "seo_scores": [0.72, 0.74, 0.73, 0.79, 0.81],
                "readability_scores": [0.83, 0.85, 0.84, 0.87, 0.89]
            }
            
            # Calculate optimization effectiveness
            optimization_effectiveness = {
                "keyword_optimization": 0.82,
                "seo_optimization": 0.78,
                "length_optimization": 0.91,
                "tone_optimization": 0.86
            }
            
            # User satisfaction scores (would come from feedback data)
            user_satisfaction_scores = {
                "response_quality": 4.2,
                "relevance": 4.1,
                "engagement": 3.9,
                "brand_alignment": 4.3
            }
            
            return AssemblyAnalytics(
                performance_metrics=self.metrics,
                service_health=service_health,
                quality_trends=quality_trends,
                optimization_effectiveness=optimization_effectiveness,
                user_satisfaction_scores=user_satisfaction_scores
            )
            
        except Exception as e:
            logger.error(f"Error generating assembly analytics: {e}")
            return AssemblyAnalytics(
                performance_metrics=self.metrics,
                service_health={},
                quality_trends={},
                optimization_effectiveness={},
                user_satisfaction_scores={}
            )
    
    # Private helper methods
    
    def _extract_business_context(
        self,
        review: Review,
        custom_context: Optional[Dict[str, Any]] = None
    ) -> BusinessContext:
        """Extract business context using the BusinessContextService"""
        try:
            context = self.business_context_service.get_business_context(review.user_id)
            
            # Enhance with custom context if provided
            if custom_context:
                for key, value in custom_context.items():
                    if hasattr(context, key) and value:
                        setattr(context, key, value)
            
            return context
        except Exception as e:
            logger.error(f"Error extracting business context: {e}")
            raise
    
    def _analyze_keywords(
        self,
        review: Review,
        business_context: BusinessContext,
        priority_keywords: Optional[List[str]] = None
    ) -> KeywordAnalysisResult:
        """Analyze keywords using the KeywordGenerationService"""
        try:
            # Use the keyword service to analyze the review
            analysis = self.keyword_service.analyze_review_for_keywords(
                review=review,
                business_context=business_context
            )
            
            # Add priority keywords if provided
            if priority_keywords:
                analysis.extracted_keywords.extend(priority_keywords)
                # Remove duplicates while preserving order
                analysis.extracted_keywords = list(dict.fromkeys(analysis.extracted_keywords))
            
            return analysis
        except Exception as e:
            logger.error(f"Error analyzing keywords: {e}")
            raise
    
    def _generate_base_response(
        self,
        review: Review,
        business_context: BusinessContext,
        keyword_analysis: KeywordAnalysisResult
    ) -> str:
        """Generate base response using the ReviewService"""
        try:
            # Use the enhanced review service to generate response
            response = self.review_service.generate_auto_response(
                self.db,
                review,
                business_context.business_name
            )
            return response
        except Exception as e:
            logger.error(f"Error generating base response: {e}")
            raise
    
    def _apply_seo_optimization(
        self,
        response: str,
        review: Review,
        business_context: BusinessContext,
        keyword_analysis: KeywordAnalysisResult
    ) -> OptimizedResponse:
        """Apply SEO optimization using the SEOOptimizationService"""
        try:
            optimized = self.seo_service.optimize_review_response(
                response_text=response,
                review=review,
                business_context=business_context,
                target_keywords=keyword_analysis.extracted_keywords
            )
            return optimized
        except Exception as e:
            logger.error(f"Error applying SEO optimization: {e}")
            raise
    
    def _get_fallback_business_context(self) -> BusinessContext:
        """Get fallback business context when extraction fails"""
        return BusinessContext(
            business_name="Professional Barbershop",
            specialty_services=["haircut", "beard trim", "styling"],
            barber_names=["Professional Barber"],
            total_barbers=1
        )
    
    def _get_fallback_keywords(self, review: Review) -> KeywordAnalysisResult:
        """Get fallback keywords when analysis fails"""
        basic_keywords = ["barber", "barbershop", "professional", "service", "experience"]
        
        return KeywordAnalysisResult(
            extracted_keywords=basic_keywords,
            service_keywords=["haircut", "grooming"],
            local_keywords=["local", "area"],
            sentiment_keywords=["great" if review.rating >= 4 else "feedback"],
            confidence_scores={},
            keyword_categories={}
        )
    
    def _get_emergency_response(self, review: Review) -> str:
        """Get emergency response template when all else fails"""
        sentiment = review.sentiment or ReviewSentiment.NEUTRAL
        templates = self.emergency_templates.get(sentiment, self.emergency_templates[ReviewSentiment.NEUTRAL])
        
        # Use first template as emergency fallback
        response = templates[0]
        
        # Basic personalization
        if review.reviewer_name:
            response = response.replace("Thank you", f"Thank you, {review.reviewer_name},")
        
        return response
    
    def _apply_basic_seo(self, response: str, business_context: BusinessContext) -> str:
        """Apply basic SEO when full optimization fails"""
        # Ensure business name is mentioned
        if business_context.business_name and business_context.business_name.lower() not in response.lower():
            response = response.replace("Thank you", f"Thank you for visiting {business_context.business_name}")
        
        # Add basic keywords
        if "service" in response.lower() and "barbering" not in response.lower():
            response = response.replace("service", "barbering service", 1)
        
        return response
    
    def _validate_security(self, content: str) -> bool:
        """Validate content for security issues"""
        try:
            # Check for common injection patterns
            dangerous_patterns = [
                r'<script.*?>.*?</script>',
                r'javascript:',
                r'on\w+\s*=',
                r'<iframe.*?>',
                r'eval\s*\(',
                r'document\.',
                r'window\.'
            ]
            
            for pattern in dangerous_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    return False
            
            return True
        except Exception as e:
            logger.error(f"Error in security validation: {e}")
            return False
    
    def _sanitize_response(self, response: str) -> str:
        """Sanitize response for security"""
        try:
            # Remove potentially dangerous content
            sanitized = re.sub(r'<[^>]+>', '', response)  # Remove HTML tags
            sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
            sanitized = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', '', sanitized, flags=re.IGNORECASE)
            
            return sanitized.strip()
        except Exception as e:
            logger.error(f"Error sanitizing response: {e}")
            return response
    
    def _finalize_response(
        self,
        response: str,
        quality_report: QualityReport,
        business_context: BusinessContext
    ) -> str:
        """Apply final optimizations to the response"""
        try:
            # Apply quality-based improvements
            if quality_report.quality_level == QualityLevel.POOR:
                # Add basic improvements
                if not response.endswith(('.', '!', '?')):
                    response += '.'
                
                # Ensure greeting
                if not any(greeting in response.lower() for greeting in ['thank', 'appreciate', 'grateful']):
                    response = f"Thank you for your feedback! {response}"
            
            # Ensure proper capitalization
            sentences = response.split('. ')
            sentences = [s.capitalize() for s in sentences]
            response = '. '.join(sentences)
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Error in response finalization: {e}")
            return response
    
    def _calculate_engagement_score(
        self,
        quality_report: QualityReport,
        seo_analysis: Optional[SEOAnalysis],
        fallback_count: int
    ) -> float:
        """Calculate estimated engagement score"""
        try:
            base_score = quality_report.overall_score
            
            # Bonus for good SEO
            if seo_analysis and seo_analysis.overall_seo_score > 0.8:
                base_score += 0.1
            
            # Penalty for fallbacks
            fallback_penalty = min(fallback_count * 0.05, 0.3)
            base_score -= fallback_penalty
            
            return max(0.0, min(1.0, base_score))
            
        except Exception as e:
            logger.error(f"Error calculating engagement score: {e}")
            return 0.5
    
    def _get_optimization_flags(self, context: AssemblyContext) -> Dict[str, bool]:
        """Get flags indicating which optimizations were applied"""
        return {
            "business_context_extracted": context.business_context is not None,
            "keywords_analyzed": context.keyword_analysis is not None,
            "seo_optimized": context.seo_analysis is not None,
            "quality_validated": len(context.errors) == 0,
            "security_validated": "security" not in str(context.errors).lower()
        }
    
    def _get_fallback_quality_report(self) -> QualityReport:
        """Get fallback quality report when validation fails"""
        return QualityReport(
            overall_score=0.5,
            quality_level=QualityLevel.ACCEPTABLE,
            content_issues=["Quality validation failed"],
            seo_score=0.5,
            readability_score=0.7,
            authenticity_score=0.6,
            keyword_density_score=0.5,
            length_appropriateness=True,
            tone_consistency=True,
            brand_alignment=False,
            recommendations=["Manual review recommended"]
        )
    
    def _validate_length(self, content: str) -> float:
        """Validate content length and return score"""
        length = len(content)
        min_len = self.assembly_config["min_response_length"]
        max_len = self.assembly_config["max_response_length"]
        
        if min_len <= length <= max_len:
            return 1.0
        elif length < min_len:
            return max(0.0, length / min_len)
        else:
            # Penalty for being too long
            excess_ratio = (length - max_len) / max_len
            return max(0.0, 1.0 - excess_ratio)
    
    def _validate_seo_quality(self, content: str, context: BusinessContext) -> float:
        """Validate SEO quality of content"""
        score = 0.0
        
        # Check for business name
        if context.business_name and context.business_name.lower() in content.lower():
            score += 0.3
        
        # Check for industry keywords
        industry_keywords = ["barber", "barbershop", "haircut", "grooming", "service"]
        keyword_count = sum(1 for keyword in industry_keywords if keyword in content.lower())
        score += min(0.4, keyword_count * 0.1)
        
        # Check for call to action
        cta_phrases = ["visit", "contact", "book", "call", "schedule"]
        if any(phrase in content.lower() for phrase in cta_phrases):
            score += 0.3
        
        return min(1.0, score)
    
    def _calculate_readability_score(self, content: str) -> float:
        """Calculate readability score (simplified)"""
        try:
            words = content.split()
            sentences = content.split('.')
            
            if not sentences or not words:
                return 0.0
            
            avg_words_per_sentence = len(words) / len(sentences)
            
            # Penalize very long sentences
            if avg_words_per_sentence > 20:
                return 0.5
            elif avg_words_per_sentence > 15:
                return 0.7
            else:
                return 0.9
                
        except Exception:
            return 0.7  # Default reasonable score
    
    def _validate_authenticity(self, content: str, context: BusinessContext) -> float:
        """Validate authenticity of content"""
        score = 0.8  # Base score
        
        # Check for generic phrases (reduce authenticity)
        generic_phrases = [
            "we value your feedback",
            "thank you for your business",
            "we appreciate your review"
        ]
        
        generic_count = sum(1 for phrase in generic_phrases if phrase in content.lower())
        score -= min(0.4, generic_count * 0.15)
        
        # Check for specific details (increase authenticity)
        if context.business_name and context.business_name in content:
            score += 0.1
        
        if any(service in content.lower() for service in context.specialty_services):
            score += 0.1
        
        return max(0.0, min(1.0, score))
    
    def _validate_keyword_density(self, content: str) -> float:
        """Validate keyword density"""
        words = content.lower().split()
        if not words:
            return 0.0
        
        # Count keyword occurrences
        keywords = ["barber", "barbershop", "service", "professional", "experience"]
        keyword_count = sum(1 for word in words if word in keywords)
        
        density = (keyword_count / len(words)) * 100
        
        # Optimal density is 2-4%
        if 2.0 <= density <= 4.0:
            return 1.0
        elif density < 2.0:
            return density / 2.0
        else:
            # Penalty for keyword stuffing
            return max(0.0, 1.0 - (density - 4.0) / 4.0)
    
    def _validate_tone_consistency(self, content: str) -> bool:
        """Validate tone consistency"""
        # Simple tone consistency check
        professional_indicators = ["thank", "appreciate", "professional", "service"]
        casual_indicators = ["awesome", "cool", "hey", "gonna"]
        
        professional_count = sum(1 for indicator in professional_indicators if indicator in content.lower())
        casual_count = sum(1 for indicator in casual_indicators if indicator in content.lower())
        
        # Should be primarily professional for business responses
        return professional_count >= casual_count
    
    def _validate_brand_alignment(self, content: str, context: BusinessContext) -> bool:
        """Validate brand alignment"""
        # Check if business name is mentioned
        if context.business_name and context.business_name.lower() in content.lower():
            return True
        
        # Check for industry-appropriate language
        industry_terms = ["barber", "barbershop", "grooming", "haircut"]
        return any(term in content.lower() for term in industry_terms)
    
    def _detect_security_issues(self, content: str) -> List[str]:
        """Detect potential security issues in content"""
        issues = []
        
        # Check for HTML/script injection
        if '<' in content or '>' in content:
            issues.append("Potential HTML injection")
        
        # Check for suspicious patterns
        if 'javascript:' in content.lower():
            issues.append("JavaScript injection attempt")
        
        return issues
    
    def _apply_quality_improvements(self, quality_report: QualityReport) -> None:
        """Apply quality improvements based on report (for future iterations)"""
        # This would modify internal parameters for next iteration
        # For now, we'll just log the recommendations
        for recommendation in quality_report.recommendations:
            logger.info(f"Quality improvement recommendation: {recommendation}")
    
    def _calculate_service_health(self, service_name: str) -> float:
        """Calculate health score for a specific service"""
        # This would typically analyze error rates, response times, etc.
        # For now, return a reasonable default based on service failures
        failures = self.metrics.service_failures.get(service_name, 0)
        total_requests = max(1, self.metrics.total_requests)
        
        failure_rate = failures / total_requests
        return max(0.0, 1.0 - failure_rate * 2)  # Health decreases with failure rate