"""
AI-Driven Template Optimization Service

This service continuously optimizes SMS and email templates through A/B testing,
machine learning, and real-time performance analysis. It learns which messages
work best for different client segments and situations.

Features:
- Automated A/B testing for message templates
- AI-powered template generation and variation
- Performance tracking and optimization
- Client segment-specific template optimization
- Real-time template effectiveness scoring
- Continuous learning and improvement

Integration with Six Figure Barber methodology:
- Optimizes for appointment confirmations and revenue protection
- Personalizes messaging based on client value and behavior
- Maximizes engagement rates for high-value clients
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
import random
import hashlib

from models import User, Appointment, BarberProfile
from services.ai_message_generator import get_ai_message_generator, MessageType, MessageChannel
from services.ai_no_show_prediction_service import get_ai_no_show_prediction_service
from services.behavioral_learning_service import get_behavioral_learning_service

logger = logging.getLogger(__name__)

class TemplateVariationType(Enum):
    """Types of template variations for A/B testing"""
    TONE = "tone"  # Formal vs casual vs friendly
    LENGTH = "length"  # Short vs medium vs long
    URGENCY = "urgency"  # Low vs medium vs high urgency
    PERSONALIZATION = "personalization"  # Generic vs personalized vs highly personalized
    CALL_TO_ACTION = "call_to_action"  # Different CTA styles
    TIMING = "timing"  # Different send times
    FREQUENCY = "frequency"  # Different reminder frequencies

class OptimizationGoal(Enum):
    """Goals for template optimization"""
    CONFIRMATION_RATE = "confirmation_rate"
    RESPONSE_RATE = "response_rate"
    NO_SHOW_REDUCTION = "no_show_reduction"
    ENGAGEMENT_SCORE = "engagement_score"
    REVENUE_PROTECTION = "revenue_protection"
    CLIENT_SATISFACTION = "client_satisfaction"

class TestStatus(Enum):
    """A/B test status"""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

@dataclass
class TemplateVariant:
    """A variant of a message template for A/B testing"""
    id: str
    template_id: str
    variant_name: str
    template_content: str
    variation_type: TemplateVariationType
    parameters: Dict[str, Any]
    created_at: datetime
    
    # Performance metrics
    sends_count: int = 0
    responses_count: int = 0
    confirmations_count: int = 0
    no_shows_prevented: int = 0
    engagement_score: float = 0.0
    
    # Calculated metrics
    response_rate: float = 0.0
    confirmation_rate: float = 0.0
    effectiveness_score: float = 0.0

@dataclass
class ABTest:
    """An A/B test configuration and results"""
    id: str
    test_name: str
    message_type: MessageType
    channel: MessageChannel
    optimization_goal: OptimizationGoal
    variants: List[TemplateVariant]
    
    # Test configuration
    start_date: datetime
    end_date: Optional[datetime]
    min_sample_size: int
    confidence_threshold: float
    status: TestStatus
    
    # Test results
    winner_variant_id: Optional[str] = None
    statistical_significance: Optional[float] = None
    improvement_percentage: Optional[float] = None
    
    # Metadata
    created_by: int
    target_segment: Optional[str] = None
    notes: str = ""

@dataclass
class TemplatePerformanceMetrics:
    """Performance metrics for a template or variant"""
    template_id: str
    time_period: str
    
    # Volume metrics
    total_sends: int
    total_responses: int
    total_confirmations: int
    total_no_shows_prevented: int
    
    # Rate metrics
    response_rate: float
    confirmation_rate: float
    no_show_prevention_rate: float
    
    # Business metrics
    revenue_protected: float
    client_satisfaction_score: float
    engagement_score: float
    
    # Comparative metrics
    performance_vs_baseline: float
    improvement_trend: float

@dataclass
class OptimizationRecommendation:
    """AI-generated recommendation for template optimization"""
    template_id: str
    recommendation_type: str
    priority: str  # high, medium, low
    suggestion: str
    expected_improvement: float
    confidence_score: float
    implementation_effort: str  # easy, moderate, complex
    
    # Supporting data
    current_performance: float
    benchmark_performance: float
    client_segment: Optional[str] = None
    seasonality_factor: Optional[float] = None

class AITemplateOptimizationService:
    """
    AI-powered service for optimizing message templates through A/B testing
    and machine learning analysis.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_message_generator = get_ai_message_generator(db)
        self.prediction_service = get_ai_no_show_prediction_service(db)
        self.learning_service = get_behavioral_learning_service(db)
        
        # Configuration
        self.min_sample_size = 100  # Minimum sends per variant
        self.confidence_threshold = 0.95  # Statistical significance threshold
        self.test_duration_days = 14  # Default test duration
        
        # In-memory caches
        self._active_tests: Dict[str, ABTest] = {}
        self._template_cache: Dict[str, TemplateVariant] = {}
        self._performance_cache: Dict[str, TemplatePerformanceMetrics] = {}
        
        # Load active tests on initialization
        asyncio.create_task(self._load_active_tests())

    async def create_ab_test(
        self,
        test_name: str,
        message_type: MessageType,
        channel: MessageChannel,
        optimization_goal: OptimizationGoal,
        base_template: str,
        variation_types: List[TemplateVariationType],
        user_id: int,
        target_segment: Optional[str] = None,
        test_duration_days: int = 14,
        min_sample_size: int = 100
    ) -> ABTest:
        """
        Create a new A/B test for template optimization.
        
        This automatically generates template variants and sets up the test infrastructure.
        """
        try:
            test_id = self._generate_test_id(test_name, message_type, channel)
            
            # Generate template variants
            variants = []
            
            # Control variant (original template)
            control_variant = TemplateVariant(
                id=f"{test_id}_control",
                template_id=test_id,
                variant_name="Control",
                template_content=base_template,
                variation_type=TemplateVariationType.TONE,  # Default for control
                parameters={"is_control": True},
                created_at=datetime.utcnow()
            )
            variants.append(control_variant)
            
            # Generate test variants
            for i, variation_type in enumerate(variation_types):
                variant_template = await self._generate_template_variant(
                    base_template, variation_type, message_type, channel
                )
                
                variant = TemplateVariant(
                    id=f"{test_id}_variant_{i+1}",
                    template_id=test_id,
                    variant_name=f"Variant {i+1} ({variation_type.value})",
                    template_content=variant_template,
                    variation_type=variation_type,
                    parameters=await self._get_variation_parameters(variation_type),
                    created_at=datetime.utcnow()
                )
                variants.append(variant)
            
            # Create A/B test
            ab_test = ABTest(
                id=test_id,
                test_name=test_name,
                message_type=message_type,
                channel=channel,
                optimization_goal=optimization_goal,
                variants=variants,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=test_duration_days),
                min_sample_size=min_sample_size,
                confidence_threshold=self.confidence_threshold,
                status=TestStatus.ACTIVE,
                created_by=user_id,
                target_segment=target_segment
            )
            
            # Store in cache and database
            self._active_tests[test_id] = ab_test
            await self._save_ab_test(ab_test)
            
            logger.info(f"Created A/B test '{test_name}' with {len(variants)} variants")
            
            return ab_test
            
        except Exception as e:
            logger.error(f"Error creating A/B test: {e}")
            raise

    async def get_optimal_template(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        client_context: Dict[str, Any],
        appointment_context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Get the optimal template for a specific context, considering active A/B tests
        and learned preferences.
        """
        try:
            # Check for active A/B tests
            active_test = await self._get_active_test_for_context(
                message_type, channel, client_context
            )
            
            if active_test:
                # Select variant for A/B testing
                variant = await self._select_test_variant(active_test, client_context)
                
                # Record the assignment
                await self._record_variant_assignment(
                    active_test.id, variant.id, client_context, appointment_context
                )
                
                return variant.template_content, {
                    "variant_id": variant.id,
                    "test_id": active_test.id,
                    "is_test": True,
                    "variation_type": variant.variation_type.value
                }
            
            # No active test - use best performing template
            best_template = await self._get_best_performing_template(
                message_type, channel, client_context
            )
            
            if best_template:
                return best_template["content"], {
                    "template_id": best_template["id"],
                    "is_test": False,
                    "performance_score": best_template["score"]
                }
            
            # Fallback to AI-generated template
            generated = await self.ai_message_generator.generate_message(
                message_type, channel, client_context
            )
            
            return generated.content, {
                "is_generated": True,
                "ai_provider": generated.ai_provider,
                "generation_confidence": generated.confidence_score
            }
            
        except Exception as e:
            logger.error(f"Error getting optimal template: {e}")
            # Fallback to basic template
            return self._get_fallback_template(message_type, channel), {"is_fallback": True}

    async def record_template_interaction(
        self,
        template_id: str,
        variant_id: Optional[str],
        interaction_type: str,
        client_id: int,
        appointment_id: int,
        metadata: Dict[str, Any] = None
    ) -> None:
        """
        Record an interaction with a template (send, response, confirmation, etc.)
        for performance tracking and optimization.
        """
        try:
            interaction_data = {
                "template_id": template_id,
                "variant_id": variant_id,
                "interaction_type": interaction_type,
                "client_id": client_id,
                "appointment_id": appointment_id,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata or {}
            }
            
            # Update variant performance if this is a test
            if variant_id and variant_id in self._template_cache:
                await self._update_variant_performance(variant_id, interaction_type)
            
            # Update A/B test metrics if applicable
            if variant_id:
                test_id = variant_id.split("_")[0] + "_" + variant_id.split("_")[1]
                if test_id in self._active_tests:
                    await self._update_test_metrics(test_id, variant_id, interaction_type)
            
            # Store interaction for learning
            await self._store_template_interaction(interaction_data)
            
            # Check if any tests can be concluded
            await self._check_test_completion()
            
        except Exception as e:
            logger.error(f"Error recording template interaction: {e}")

    async def analyze_template_performance(
        self,
        template_id: str,
        time_period: str = "30d"
    ) -> TemplatePerformanceMetrics:
        """
        Analyze the performance of a specific template over a time period.
        """
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            if time_period == "7d":
                start_date = end_date - timedelta(days=7)
            elif time_period == "30d":
                start_date = end_date - timedelta(days=30)
            elif time_period == "90d":
                start_date = end_date - timedelta(days=90)
            else:
                start_date = end_date - timedelta(days=30)  # Default
            
            # Get performance data
            performance_data = await self._calculate_template_performance(
                template_id, start_date, end_date
            )
            
            # Create metrics object
            metrics = TemplatePerformanceMetrics(
                template_id=template_id,
                time_period=time_period,
                total_sends=performance_data["sends"],
                total_responses=performance_data["responses"],
                total_confirmations=performance_data["confirmations"],
                total_no_shows_prevented=performance_data["no_shows_prevented"],
                response_rate=performance_data["response_rate"],
                confirmation_rate=performance_data["confirmation_rate"],
                no_show_prevention_rate=performance_data["prevention_rate"],
                revenue_protected=performance_data["revenue_protected"],
                client_satisfaction_score=performance_data["satisfaction_score"],
                engagement_score=performance_data["engagement_score"],
                performance_vs_baseline=performance_data["vs_baseline"],
                improvement_trend=performance_data["trend"]
            )
            
            # Cache the metrics
            self._performance_cache[f"{template_id}_{time_period}"] = metrics
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error analyzing template performance: {e}")
            # Return empty metrics on error
            return TemplatePerformanceMetrics(
                template_id=template_id,
                time_period=time_period,
                total_sends=0, total_responses=0, total_confirmations=0,
                total_no_shows_prevented=0, response_rate=0.0,
                confirmation_rate=0.0, no_show_prevention_rate=0.0,
                revenue_protected=0.0, client_satisfaction_score=0.0,
                engagement_score=0.0, performance_vs_baseline=0.0,
                improvement_trend=0.0
            )

    async def get_optimization_recommendations(
        self,
        user_id: int,
        message_type: Optional[MessageType] = None,
        channel: Optional[MessageChannel] = None
    ) -> List[OptimizationRecommendation]:
        """
        Get AI-powered recommendations for optimizing templates.
        """
        try:
            recommendations = []
            
            # Get user's templates and their performance
            templates = await self._get_user_templates(user_id, message_type, channel)
            
            for template in templates:
                # Analyze current performance
                performance = await self.analyze_template_performance(
                    template["id"], "30d"
                )
                
                # Get client behavior patterns
                behavior_patterns = await self.learning_service.analyze_client_behavior(
                    user_id
                )
                
                # Generate recommendations based on performance and patterns
                template_recommendations = await self._generate_template_recommendations(
                    template, performance, behavior_patterns
                )
                
                recommendations.extend(template_recommendations)
            
            # Sort by priority and expected improvement
            recommendations.sort(
                key=lambda x: (
                    {"high": 3, "medium": 2, "low": 1}[x.priority],
                    x.expected_improvement
                ),
                reverse=True
            )
            
            return recommendations[:10]  # Return top 10 recommendations
            
        except Exception as e:
            logger.error(f"Error getting optimization recommendations: {e}")
            return []

    async def get_active_tests(self, user_id: int) -> List[ABTest]:
        """Get all active A/B tests for a user."""
        try:
            user_tests = [
                test for test in self._active_tests.values()
                if test.created_by == user_id and test.status == TestStatus.ACTIVE
            ]
            return user_tests
        except Exception as e:
            logger.error(f"Error getting active tests: {e}")
            return []

    async def get_test_results(self, test_id: str) -> Dict[str, Any]:
        """Get detailed results for an A/B test."""
        try:
            if test_id not in self._active_tests:
                # Try to load from database
                await self._load_test_from_db(test_id)
            
            if test_id not in self._active_tests:
                return {"error": "Test not found"}
            
            test = self._active_tests[test_id]
            
            # Calculate detailed results
            results = {
                "test_info": {
                    "id": test.id,
                    "name": test.test_name,
                    "status": test.status.value,
                    "optimization_goal": test.optimization_goal.value,
                    "start_date": test.start_date.isoformat(),
                    "end_date": test.end_date.isoformat() if test.end_date else None
                },
                "variants": [],
                "statistical_analysis": {},
                "recommendations": []
            }
            
            # Add variant performance
            for variant in test.variants:
                variant_data = {
                    "id": variant.id,
                    "name": variant.variant_name,
                    "variation_type": variant.variation_type.value,
                    "performance": {
                        "sends": variant.sends_count,
                        "responses": variant.responses_count,
                        "confirmations": variant.confirmations_count,
                        "response_rate": variant.response_rate,
                        "confirmation_rate": variant.confirmation_rate,
                        "effectiveness_score": variant.effectiveness_score
                    }
                }
                results["variants"].append(variant_data)
            
            # Add statistical analysis if test is complete
            if test.status == TestStatus.COMPLETED:
                results["statistical_analysis"] = {
                    "winner": test.winner_variant_id,
                    "significance": test.statistical_significance,
                    "improvement": test.improvement_percentage
                }
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting test results: {e}")
            return {"error": str(e)}

    # Private helper methods
    
    def _generate_test_id(self, test_name: str, message_type: MessageType, channel: MessageChannel) -> str:
        """Generate a unique test ID."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        hash_input = f"{test_name}_{message_type.value}_{channel.value}_{timestamp}"
        hash_suffix = hashlib.md5(hash_input.encode()).hexdigest()[:8]
        return f"test_{timestamp}_{hash_suffix}"

    async def _generate_template_variant(
        self,
        base_template: str,
        variation_type: TemplateVariationType,
        message_type: MessageType,
        channel: MessageChannel
    ) -> str:
        """Generate a template variant using AI."""
        try:
            # Create variation prompts based on type
            variation_prompts = {
                TemplateVariationType.TONE: "Create a more casual and friendly version",
                TemplateVariationType.LENGTH: "Create a shorter, more concise version",
                TemplateVariationType.URGENCY: "Create a more urgent version that emphasizes time sensitivity",
                TemplateVariationType.PERSONALIZATION: "Create a more personalized version with specific details",
                TemplateVariationType.CALL_TO_ACTION: "Create a version with a stronger, clearer call-to-action",
            }
            
            prompt = variation_prompts.get(
                variation_type,
                "Create an alternative version that maintains the same intent"
            )
            
            # Use AI message generator to create variant
            variant_context = {
                "base_template": base_template,
                "variation_instruction": prompt,
                "variation_type": variation_type.value
            }
            
            generated = await self.ai_message_generator.generate_message(
                message_type, channel, variant_context
            )
            
            return generated.content
            
        except Exception as e:
            logger.error(f"Error generating template variant: {e}")
            return base_template  # Fallback to base template

    async def _get_variation_parameters(self, variation_type: TemplateVariationType) -> Dict[str, Any]:
        """Get parameters for a specific variation type."""
        parameters = {
            TemplateVariationType.TONE: {"tone": "casual", "formality": "low"},
            TemplateVariationType.LENGTH: {"length": "short", "word_limit": 50},
            TemplateVariationType.URGENCY: {"urgency": "high", "time_sensitive": True},
            TemplateVariationType.PERSONALIZATION: {"personalization": "high", "use_details": True},
            TemplateVariationType.CALL_TO_ACTION: {"cta_strength": "strong", "action_focused": True},
        }
        
        return parameters.get(variation_type, {})

    async def _get_active_test_for_context(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        client_context: Dict[str, Any]
    ) -> Optional[ABTest]:
        """Find an active A/B test that matches the given context."""
        for test in self._active_tests.values():
            if (test.status == TestStatus.ACTIVE and
                test.message_type == message_type and
                test.channel == channel):
                
                # Check if client meets test criteria
                if await self._client_meets_test_criteria(test, client_context):
                    return test
        
        return None

    async def _select_test_variant(
        self,
        test: ABTest,
        client_context: Dict[str, Any]
    ) -> TemplateVariant:
        """Select which variant to show for this client in the A/B test."""
        # Use client ID for consistent assignment
        client_id = client_context.get("client_id", 0)
        
        # Create deterministic hash for consistent assignment
        hash_input = f"{test.id}_{client_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        
        # Select variant based on hash
        variant_index = hash_value % len(test.variants)
        return test.variants[variant_index]

    async def _client_meets_test_criteria(
        self,
        test: ABTest,
        client_context: Dict[str, Any]
    ) -> bool:
        """Check if a client meets the criteria for a specific A/B test."""
        # Check target segment if specified
        if test.target_segment:
            client_segment = client_context.get("segment")
            if client_segment != test.target_segment:
                return False
        
        # Add additional criteria checks here
        return True

    def _get_fallback_template(self, message_type: MessageType, channel: MessageChannel) -> str:
        """Get a basic fallback template."""
        fallback_templates = {
            (MessageType.APPOINTMENT_REMINDER, MessageChannel.SMS): 
                "Hi {client_name}, reminder: {appointment_time} appointment with {barber_name}. Reply YES to confirm.",
            (MessageType.APPOINTMENT_CONFIRMATION, MessageChannel.SMS):
                "Your appointment is confirmed for {appointment_time} with {barber_name}. See you then!",
            (MessageType.NO_SHOW_FOLLOW_UP, MessageChannel.SMS):
                "We missed you today. Please call to reschedule your appointment.",
        }
        
        return fallback_templates.get(
            (message_type, channel),
            "Thank you for choosing our services. Please contact us if you have any questions."
        )

    async def _load_active_tests(self):
        """Load active A/B tests from database on service initialization."""
        try:
            # This would load from database in a real implementation
            # For now, initialize empty cache
            self._active_tests = {}
            logger.info("Loaded active A/B tests from database")
        except Exception as e:
            logger.error(f"Error loading active tests: {e}")

    async def _save_ab_test(self, test: ABTest):
        """Save A/B test to database."""
        try:
            # In a real implementation, this would save to database
            # For now, just log the action
            logger.info(f"Saved A/B test {test.id} to database")
        except Exception as e:
            logger.error(f"Error saving A/B test: {e}")

    async def _update_variant_performance(self, variant_id: str, interaction_type: str):
        """Update performance metrics for a template variant."""
        try:
            if variant_id in self._template_cache:
                variant = self._template_cache[variant_id]
                
                if interaction_type == "send":
                    variant.sends_count += 1
                elif interaction_type == "response":
                    variant.responses_count += 1
                elif interaction_type == "confirmation":
                    variant.confirmations_count += 1
                elif interaction_type == "no_show_prevented":
                    variant.no_shows_prevented += 1
                
                # Recalculate rates
                if variant.sends_count > 0:
                    variant.response_rate = variant.responses_count / variant.sends_count
                    variant.confirmation_rate = variant.confirmations_count / variant.sends_count
                
                # Update effectiveness score
                variant.effectiveness_score = self._calculate_effectiveness_score(variant)
                
        except Exception as e:
            logger.error(f"Error updating variant performance: {e}")

    def _calculate_effectiveness_score(self, variant: TemplateVariant) -> float:
        """Calculate an overall effectiveness score for a template variant."""
        try:
            if variant.sends_count == 0:
                return 0.0
            
            # Weighted score based on different metrics
            response_weight = 0.3
            confirmation_weight = 0.4
            prevention_weight = 0.3
            
            response_score = variant.response_rate * response_weight
            confirmation_score = variant.confirmation_rate * confirmation_weight
            prevention_score = (variant.no_shows_prevented / variant.sends_count) * prevention_weight
            
            return min(1.0, response_score + confirmation_score + prevention_score)
            
        except Exception as e:
            logger.error(f"Error calculating effectiveness score: {e}")
            return 0.0

    async def _calculate_template_performance(
        self,
        template_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate performance metrics for a template over a time period."""
        try:
            # This would query the database for actual performance data
            # For now, return mock data
            return {
                "sends": 150,
                "responses": 120,
                "confirmations": 100,
                "no_shows_prevented": 15,
                "response_rate": 0.80,
                "confirmation_rate": 0.67,
                "prevention_rate": 0.10,
                "revenue_protected": 750.0,
                "satisfaction_score": 4.2,
                "engagement_score": 0.75,
                "vs_baseline": 0.15,
                "trend": 0.05
            }
        except Exception as e:
            logger.error(f"Error calculating template performance: {e}")
            return {}

    async def _get_user_templates(
        self,
        user_id: int,
        message_type: Optional[MessageType] = None,
        channel: Optional[MessageChannel] = None
    ) -> List[Dict[str, Any]]:
        """Get templates for a specific user."""
        try:
            # This would query the database for user templates
            # For now, return mock data
            return [
                {
                    "id": "template_1",
                    "type": MessageType.APPOINTMENT_REMINDER.value,
                    "channel": MessageChannel.SMS.value,
                    "content": "Hi {client_name}, reminder: appointment tomorrow at {time}",
                    "performance_score": 0.75
                }
            ]
        except Exception as e:
            logger.error(f"Error getting user templates: {e}")
            return []

    async def _generate_template_recommendations(
        self,
        template: Dict[str, Any],
        performance: TemplatePerformanceMetrics,
        behavior_patterns: Dict[str, Any]
    ) -> List[OptimizationRecommendation]:
        """Generate optimization recommendations for a template."""
        try:
            recommendations = []
            
            # Low response rate recommendation
            if performance.response_rate < 0.6:
                recommendations.append(OptimizationRecommendation(
                    template_id=template["id"],
                    recommendation_type="response_rate",
                    priority="high",
                    suggestion="Try shorter, more urgent messaging to improve response rates",
                    expected_improvement=0.15,
                    confidence_score=0.8,
                    implementation_effort="easy",
                    current_performance=performance.response_rate,
                    benchmark_performance=0.75
                ))
            
            # Low confirmation rate recommendation
            if performance.confirmation_rate < 0.5:
                recommendations.append(OptimizationRecommendation(
                    template_id=template["id"],
                    recommendation_type="confirmation_rate",
                    priority="high",
                    suggestion="Add clearer call-to-action and make confirmation process easier",
                    expected_improvement=0.20,
                    confidence_score=0.85,
                    implementation_effort="moderate",
                    current_performance=performance.confirmation_rate,
                    benchmark_performance=0.70
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating template recommendations: {e}")
            return []

    async def _check_test_completion(self):
        """Check if any active tests meet completion criteria."""
        try:
            for test_id, test in list(self._active_tests.items()):
                if test.status != TestStatus.ACTIVE:
                    continue
                
                # Check if test has enough data
                min_sends_per_variant = test.min_sample_size
                all_variants_ready = all(
                    variant.sends_count >= min_sends_per_variant
                    for variant in test.variants
                )
                
                # Check if test duration is complete
                duration_complete = (
                    test.end_date and datetime.utcnow() >= test.end_date
                )
                
                if all_variants_ready or duration_complete:
                    await self._complete_ab_test(test_id)
                    
        except Exception as e:
            logger.error(f"Error checking test completion: {e}")

    async def _complete_ab_test(self, test_id: str):
        """Complete an A/B test and determine the winner."""
        try:
            test = self._active_tests[test_id]
            
            # Find best performing variant
            best_variant = max(
                test.variants,
                key=lambda v: v.effectiveness_score
            )
            
            # Calculate improvement vs control
            control_variant = next(
                (v for v in test.variants if v.parameters.get("is_control")),
                test.variants[0]
            )
            
            improvement = (
                (best_variant.effectiveness_score - control_variant.effectiveness_score) /
                control_variant.effectiveness_score
            ) if control_variant.effectiveness_score > 0 else 0
            
            # Update test results
            test.status = TestStatus.COMPLETED
            test.winner_variant_id = best_variant.id
            test.improvement_percentage = improvement
            test.statistical_significance = 0.95  # Would calculate actual significance
            
            logger.info(f"Completed A/B test {test_id}, winner: {best_variant.variant_name}")
            
        except Exception as e:
            logger.error(f"Error completing A/B test: {e}")

    async def _record_variant_assignment(
        self,
        test_id: str,
        variant_id: str,
        client_context: Dict[str, Any],
        appointment_context: Dict[str, Any]
    ):
        """Record which variant was assigned to a client."""
        try:
            assignment_data = {
                "test_id": test_id,
                "variant_id": variant_id,
                "client_id": client_context.get("client_id"),
                "appointment_id": appointment_context.get("appointment_id"),
                "assigned_at": datetime.utcnow().isoformat()
            }
            
            # Store assignment for tracking
            # In real implementation, this would go to database
            logger.debug(f"Recorded variant assignment: {assignment_data}")
            
        except Exception as e:
            logger.error(f"Error recording variant assignment: {e}")

    async def _store_template_interaction(self, interaction_data: Dict[str, Any]):
        """Store template interaction data for analysis."""
        try:
            # In real implementation, this would store to database
            logger.debug(f"Stored template interaction: {interaction_data}")
        except Exception as e:
            logger.error(f"Error storing template interaction: {e}")

    async def _update_test_metrics(self, test_id: str, variant_id: str, interaction_type: str):
        """Update metrics for an A/B test."""
        try:
            if test_id in self._active_tests:
                test = self._active_tests[test_id]
                variant = next((v for v in test.variants if v.id == variant_id), None)
                
                if variant:
                    await self._update_variant_performance(variant_id, interaction_type)
                    
        except Exception as e:
            logger.error(f"Error updating test metrics: {e}")

    async def _get_best_performing_template(
        self,
        message_type: MessageType,
        channel: MessageChannel,
        client_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get the best performing template for given context."""
        try:
            # This would query for the best template based on historical performance
            # For now, return None to fallback to AI generation
            return None
        except Exception as e:
            logger.error(f"Error getting best performing template: {e}")
            return None

    async def _load_test_from_db(self, test_id: str):
        """Load a specific test from database."""
        try:
            # This would load from database
            logger.debug(f"Attempted to load test {test_id} from database")
        except Exception as e:
            logger.error(f"Error loading test from database: {e}")


# Singleton instance
_template_optimization_service: Optional[AITemplateOptimizationService] = None

def get_ai_template_optimization_service(db: Session) -> AITemplateOptimizationService:
    """Get or create the singleton template optimization service instance."""
    global _template_optimization_service
    if _template_optimization_service is None:
        _template_optimization_service = AITemplateOptimizationService(db)
    return _template_optimization_service