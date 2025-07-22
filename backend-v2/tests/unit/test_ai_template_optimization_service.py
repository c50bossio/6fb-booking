"""
Unit tests for AI Template Optimization Service

Tests the AI-driven template optimization and A/B testing system including:
- A/B test creation and management
- Template variant generation
- Performance tracking and analysis
- Statistical significance testing
- Optimization recommendations
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from services.ai_template_optimization_service import (
    AITemplateOptimizationService,
    get_ai_template_optimization_service,
    TemplateVariationType,
    OptimizationGoal,
    TestStatus,
    TemplateVariant,
    ABTest,
    TemplatePerformanceMetrics,
    OptimizationRecommendation
)
from services.ai_message_generator import MessageType, MessageChannel
from models import User


class TestAITemplateOptimizationService:
    """Test suite for AI Template Optimization Service"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def mock_ai_message_generator(self):
        """Mock AI message generator"""
        generator = Mock()
        generator.generate_message = AsyncMock()
        return generator

    @pytest.fixture
    def mock_prediction_service(self):
        """Mock prediction service"""
        service = Mock()
        return service

    @pytest.fixture
    def mock_learning_service(self):
        """Mock behavioral learning service"""
        service = Mock()
        service.analyze_client_behavior = AsyncMock()
        return service

    @pytest.fixture
    def optimization_service(self, mock_db, mock_ai_message_generator, mock_prediction_service, mock_learning_service):
        """Create optimization service instance"""
        service = AITemplateOptimizationService(mock_db)
        service.ai_message_generator = mock_ai_message_generator
        service.prediction_service = mock_prediction_service
        service.learning_service = mock_learning_service
        return service

    @pytest.fixture
    def sample_base_template(self):
        """Sample base template for testing"""
        return "Hi {client_name}, reminder: {appointment_time} appointment with {barber_name}. Reply YES to confirm."

    @pytest_asyncio.async_test
    async def test_create_ab_test_basic(self, optimization_service, sample_base_template):
        """Test basic A/B test creation"""
        # Mock variant generation
        optimization_service._generate_template_variant = AsyncMock(
            side_effect=[
                "Hey {client_name}! Don't forget: {appointment_time} with {barber_name}. Text YES to confirm 👍",
                "Hi {client_name}, quick reminder about your {appointment_time} appointment. Please confirm by replying YES."
            ]
        )
        optimization_service._get_variation_parameters = AsyncMock(return_value={"tone": "casual"})

        # Create A/B test
        ab_test = await optimization_service.create_ab_test(
            test_name="Reminder Tone Test",
            message_type=MessageType.APPOINTMENT_REMINDER,
            channel=MessageChannel.SMS,
            optimization_goal=OptimizationGoal.CONFIRMATION_RATE,
            base_template=sample_base_template,
            variation_types=[TemplateVariationType.TONE, TemplateVariationType.LENGTH],
            user_id=123,
            test_duration_days=14,
            min_sample_size=100
        )

        # Assertions
        assert isinstance(ab_test, ABTest)
        assert ab_test.test_name == "Reminder Tone Test"
        assert ab_test.message_type == MessageType.APPOINTMENT_REMINDER
        assert ab_test.channel == MessageChannel.SMS
        assert ab_test.optimization_goal == OptimizationGoal.CONFIRMATION_RATE
        assert ab_test.status == TestStatus.ACTIVE
        assert len(ab_test.variants) == 3  # Control + 2 variants
        assert ab_test.created_by == 123

        # Check control variant
        control_variant = next(v for v in ab_test.variants if v.parameters.get("is_control"))
        assert control_variant.template_content == sample_base_template

    @pytest_asyncio.async_test
    async def test_template_variant_generation(self, optimization_service):
        """Test AI-powered template variant generation"""
        base_template = "Hi {client_name}, your appointment is tomorrow at {time}."
        
        # Mock AI message generator
        optimization_service.ai_message_generator.generate_message.return_value = Mock(
            content="Hey {client_name}! Your appointment is tomorrow at {time} 🎉"
        )

        # Generate variant
        variant = await optimization_service._generate_template_variant(
            base_template,
            TemplateVariationType.TONE,
            MessageType.APPOINTMENT_REMINDER,
            MessageChannel.SMS
        )

        # Should generate different content
        assert variant != base_template
        assert "{client_name}" in variant
        assert "{time}" in variant

    @pytest_asyncio.async_test
    async def test_get_optimal_template_with_active_test(self, optimization_service):
        """Test getting optimal template when there's an active A/B test"""
        # Mock active test
        mock_test = ABTest(
            id="test_123",
            test_name="Test",
            message_type=MessageType.APPOINTMENT_REMINDER,
            channel=MessageChannel.SMS,
            optimization_goal=OptimizationGoal.CONFIRMATION_RATE,
            variants=[
                TemplateVariant(
                    id="variant_1",
                    template_id="test_123",
                    variant_name="Control",
                    template_content="Control template",
                    variation_type=TemplateVariationType.TONE,
                    parameters={"is_control": True},
                    created_at=datetime.utcnow()
                )
            ],
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=14),
            min_sample_size=100,
            confidence_threshold=0.95,
            status=TestStatus.ACTIVE,
            created_by=123
        )

        optimization_service._active_tests["test_123"] = mock_test
        optimization_service._get_active_test_for_context = AsyncMock(return_value=mock_test)
        optimization_service._select_test_variant = AsyncMock(return_value=mock_test.variants[0])
        optimization_service._record_variant_assignment = AsyncMock()

        # Get optimal template
        template, metadata = await optimization_service.get_optimal_template(
            MessageType.APPOINTMENT_REMINDER,
            MessageChannel.SMS,
            {"client_id": 456},
            {"appointment_id": 789}
        )

        # Should return test variant
        assert template == "Control template"
        assert metadata["is_test"] is True
        assert metadata["test_id"] == "test_123"
        assert metadata["variant_id"] == "variant_1"

    @pytest_asyncio.async_test
    async def test_get_optimal_template_no_active_test(self, optimization_service):
        """Test getting optimal template when no active test exists"""
        # Mock no active test
        optimization_service._get_active_test_for_context = AsyncMock(return_value=None)
        optimization_service._get_best_performing_template = AsyncMock(return_value=None)
        
        # Mock AI generation fallback
        optimization_service.ai_message_generator.generate_message.return_value = Mock(
            content="Generated template content",
            ai_provider="openai",
            confidence_score=0.85
        )

        # Get optimal template
        template, metadata = await optimization_service.get_optimal_template(
            MessageType.APPOINTMENT_REMINDER,
            MessageChannel.SMS,
            {"client_id": 456},
            {"appointment_id": 789}
        )

        # Should return AI-generated template
        assert template == "Generated template content"
        assert metadata["is_generated"] is True
        assert metadata["ai_provider"] == "openai"
        assert metadata["generation_confidence"] == 0.85

    @pytest_asyncio.async_test
    async def test_record_template_interaction(self, optimization_service):
        """Test recording template interactions for performance tracking"""
        template_id = "template_123"
        variant_id = "variant_456"
        
        # Mock variant in cache
        mock_variant = TemplateVariant(
            id=variant_id,
            template_id=template_id,
            variant_name="Test Variant",
            template_content="Test content",
            variation_type=TemplateVariationType.TONE,
            parameters={},
            created_at=datetime.utcnow()
        )
        optimization_service._template_cache[variant_id] = mock_variant

        # Mock update methods
        optimization_service._update_variant_performance = AsyncMock()
        optimization_service._update_test_metrics = AsyncMock()
        optimization_service._store_template_interaction = AsyncMock()
        optimization_service._check_test_completion = AsyncMock()

        # Record interaction
        await optimization_service.record_template_interaction(
            template_id=template_id,
            variant_id=variant_id,
            interaction_type="response",
            client_id=456,
            appointment_id=789,
            metadata={"response_time": 300}
        )

        # Verify all tracking methods were called
        optimization_service._update_variant_performance.assert_called_once_with(variant_id, "response")
        optimization_service._store_template_interaction.assert_called_once()
        optimization_service._check_test_completion.assert_called_once()

    @pytest_asyncio.async_test
    async def test_analyze_template_performance(self, optimization_service):
        """Test template performance analysis"""
        template_id = "template_123"
        
        # Mock performance calculation
        optimization_service._calculate_template_performance = AsyncMock(return_value={
            "sends": 200,
            "responses": 150,
            "confirmations": 120,
            "no_shows_prevented": 25,
            "response_rate": 0.75,
            "confirmation_rate": 0.60,
            "prevention_rate": 0.125,
            "revenue_protected": 1250.0,
            "satisfaction_score": 4.2,
            "engagement_score": 0.80,
            "vs_baseline": 0.15,
            "trend": 0.05
        })

        # Analyze performance
        metrics = await optimization_service.analyze_template_performance(template_id, "30d")

        # Verify metrics
        assert isinstance(metrics, TemplatePerformanceMetrics)
        assert metrics.template_id == template_id
        assert metrics.time_period == "30d"
        assert metrics.total_sends == 200
        assert metrics.total_responses == 150
        assert metrics.total_confirmations == 120
        assert metrics.response_rate == 0.75
        assert metrics.confirmation_rate == 0.60
        assert metrics.revenue_protected == 1250.0

    @pytest_asyncio.async_test
    async def test_get_optimization_recommendations(self, optimization_service):
        """Test generation of optimization recommendations"""
        user_id = 123
        
        # Mock user templates
        optimization_service._get_user_templates = AsyncMock(return_value=[
            {
                "id": "template_1",
                "type": "appointment_reminder",
                "channel": "sms",
                "content": "Basic reminder",
                "performance_score": 0.60
            }
        ])

        # Mock performance analysis
        optimization_service.analyze_template_performance = AsyncMock(return_value=Mock(
            template_id="template_1",
            response_rate=0.50,
            confirmation_rate=0.40
        ))

        # Mock behavior patterns
        optimization_service.learning_service.analyze_client_behavior.return_value = {
            "communication_preferences": {"tone": "casual", "length": "short"},
            "response_patterns": {"best_time": "morning"}
        }

        # Mock recommendation generation
        optimization_service._generate_template_recommendations = AsyncMock(return_value=[
            OptimizationRecommendation(
                template_id="template_1",
                recommendation_type="response_rate",
                priority="high",
                suggestion="Try shorter, more urgent messaging",
                expected_improvement=0.15,
                confidence_score=0.80,
                implementation_effort="easy",
                current_performance=0.50,
                benchmark_performance=0.65
            )
        ])

        # Get recommendations
        recommendations = await optimization_service.get_optimization_recommendations(user_id)

        # Verify recommendations
        assert len(recommendations) > 0
        assert isinstance(recommendations[0], OptimizationRecommendation)
        assert recommendations[0].priority == "high"
        assert recommendations[0].expected_improvement == 0.15

    @pytest_asyncio.async_test
    async def test_variant_performance_tracking(self, optimization_service):
        """Test variant performance tracking during A/B test"""
        variant_id = "variant_123"
        
        # Create mock variant
        variant = TemplateVariant(
            id=variant_id,
            template_id="test_123",
            variant_name="Test Variant",
            template_content="Test content",
            variation_type=TemplateVariationType.TONE,
            parameters={},
            created_at=datetime.utcnow(),
            sends_count=0,
            responses_count=0,
            confirmations_count=0
        )
        optimization_service._template_cache[variant_id] = variant

        # Simulate interactions
        await optimization_service._update_variant_performance(variant_id, "send")
        await optimization_service._update_variant_performance(variant_id, "send")
        await optimization_service._update_variant_performance(variant_id, "response")
        await optimization_service._update_variant_performance(variant_id, "confirmation")

        # Check updated metrics
        updated_variant = optimization_service._template_cache[variant_id]
        assert updated_variant.sends_count == 2
        assert updated_variant.responses_count == 1
        assert updated_variant.confirmations_count == 1
        assert updated_variant.response_rate == 0.5  # 1/2
        assert updated_variant.confirmation_rate == 0.5  # 1/2

    @pytest_asyncio.async_test
    async def test_statistical_significance_calculation(self, optimization_service):
        """Test statistical significance calculation for A/B tests"""
        # Create test with multiple variants
        control_variant = TemplateVariant(
            id="control",
            template_id="test_123",
            variant_name="Control",
            template_content="Control",
            variation_type=TemplateVariationType.TONE,
            parameters={"is_control": True},
            created_at=datetime.utcnow(),
            sends_count=100,
            confirmations_count=60,  # 60% rate
            confirmation_rate=0.6
        )

        test_variant = TemplateVariant(
            id="variant_1",
            template_id="test_123",
            variant_name="Variant 1",
            template_content="Variant",
            variation_type=TemplateVariationType.TONE,
            parameters={},
            created_at=datetime.utcnow(),
            sends_count=100,
            confirmations_count=75,  # 75% rate (better)
            confirmation_rate=0.75
        )

        # Mock effectiveness calculation
        optimization_service._calculate_effectiveness_score = Mock(side_effect=[0.6, 0.75])

        # Complete test
        test = ABTest(
            id="test_123",
            test_name="Test",
            message_type=MessageType.APPOINTMENT_REMINDER,
            channel=MessageChannel.SMS,
            optimization_goal=OptimizationGoal.CONFIRMATION_RATE,
            variants=[control_variant, test_variant],
            start_date=datetime.utcnow() - timedelta(days=14),
            end_date=datetime.utcnow(),
            min_sample_size=100,
            confidence_threshold=0.95,
            status=TestStatus.ACTIVE,
            created_by=123
        )

        optimization_service._active_tests["test_123"] = test

        # Complete the test
        await optimization_service._complete_ab_test("test_123")

        # Verify winner selection
        completed_test = optimization_service._active_tests["test_123"]
        assert completed_test.status == TestStatus.COMPLETED
        assert completed_test.winner_variant_id == "variant_1"  # Better performing variant
        assert completed_test.improvement_percentage > 0  # Should show improvement

    @pytest_asyncio.async_test
    async def test_test_completion_criteria(self, optimization_service):
        """Test automatic test completion based on criteria"""
        # Create test with sufficient sample size
        variant = TemplateVariant(
            id="variant_1",
            template_id="test_123",
            variant_name="Variant",
            template_content="Content",
            variation_type=TemplateVariationType.TONE,
            parameters={},
            created_at=datetime.utcnow(),
            sends_count=150  # Above minimum threshold
        )

        test = ABTest(
            id="test_123",
            test_name="Test",
            message_type=MessageType.APPOINTMENT_REMINDER,
            channel=MessageChannel.SMS,
            optimization_goal=OptimizationGoal.CONFIRMATION_RATE,
            variants=[variant],
            start_date=datetime.utcnow() - timedelta(days=14),
            end_date=datetime.utcnow(),  # Test duration complete
            min_sample_size=100,
            confidence_threshold=0.95,
            status=TestStatus.ACTIVE,
            created_by=123
        )

        optimization_service._active_tests["test_123"] = test
        optimization_service._complete_ab_test = AsyncMock()

        # Check test completion
        await optimization_service._check_test_completion()

        # Should trigger completion
        optimization_service._complete_ab_test.assert_called_once_with("test_123")

    @pytest_asyncio.async_test
    async def test_variant_selection_consistency(self, optimization_service):
        """Test that variant selection is consistent for the same client"""
        test = ABTest(
            id="test_123",
            test_name="Test",
            message_type=MessageType.APPOINTMENT_REMINDER,
            channel=MessageChannel.SMS,
            optimization_goal=OptimizationGoal.CONFIRMATION_RATE,
            variants=[
                TemplateVariant(id="v1", template_id="test_123", variant_name="V1", 
                              template_content="V1", variation_type=TemplateVariationType.TONE,
                              parameters={}, created_at=datetime.utcnow()),
                TemplateVariant(id="v2", template_id="test_123", variant_name="V2",
                              template_content="V2", variation_type=TemplateVariationType.TONE,
                              parameters={}, created_at=datetime.utcnow())
            ],
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=14),
            min_sample_size=100,
            confidence_threshold=0.95,
            status=TestStatus.ACTIVE,
            created_by=123
        )

        client_context = {"client_id": 456}

        # Select variant multiple times for same client
        variant1 = await optimization_service._select_test_variant(test, client_context)
        variant2 = await optimization_service._select_test_variant(test, client_context)
        variant3 = await optimization_service._select_test_variant(test, client_context)

        # Should return same variant for same client
        assert variant1.id == variant2.id == variant3.id

    @pytest_asyncio.async_test
    async def test_error_handling_in_test_creation(self, optimization_service):
        """Test error handling during A/B test creation"""
        # Mock variant generation failure
        optimization_service._generate_template_variant = AsyncMock(
            side_effect=Exception("AI service unavailable")
        )

        # Should handle error gracefully
        with pytest.raises(Exception):
            await optimization_service.create_ab_test(
                test_name="Test",
                message_type=MessageType.APPOINTMENT_REMINDER,
                channel=MessageChannel.SMS,
                optimization_goal=OptimizationGoal.CONFIRMATION_RATE,
                base_template="Template",
                variation_types=[TemplateVariationType.TONE],
                user_id=123
            )

    @pytest_asyncio.async_test
    async def test_recommendation_priority_sorting(self, optimization_service):
        """Test that recommendations are properly sorted by priority and impact"""
        recommendations = [
            OptimizationRecommendation(
                template_id="t1", recommendation_type="low_impact", priority="low",
                suggestion="Minor change", expected_improvement=0.02, confidence_score=0.5,
                implementation_effort="easy", current_performance=0.8, benchmark_performance=0.82
            ),
            OptimizationRecommendation(
                template_id="t2", recommendation_type="high_impact", priority="high",
                suggestion="Major change", expected_improvement=0.20, confidence_score=0.9,
                implementation_effort="moderate", current_performance=0.5, benchmark_performance=0.7
            ),
            OptimizationRecommendation(
                template_id="t3", recommendation_type="medium_impact", priority="medium",
                suggestion="Medium change", expected_improvement=0.10, confidence_score=0.7,
                implementation_effort="easy", current_performance=0.6, benchmark_performance=0.7
            )
        ]

        # Mock recommendation generation
        optimization_service._generate_template_recommendations = AsyncMock(return_value=recommendations)
        optimization_service._get_user_templates = AsyncMock(return_value=[{"id": "t1"}, {"id": "t2"}, {"id": "t3"}])
        optimization_service.analyze_template_performance = AsyncMock(return_value=Mock())
        optimization_service.learning_service.analyze_client_behavior.return_value = {}

        # Get sorted recommendations
        sorted_recs = await optimization_service.get_optimization_recommendations(123)

        # Should be sorted by priority (high first) then by expected improvement
        assert sorted_recs[0].priority == "high"
        assert sorted_recs[0].expected_improvement == 0.20

    def test_singleton_service_creation(self, mock_db):
        """Test singleton pattern for service creation"""
        service1 = get_ai_template_optimization_service(mock_db)
        service2 = get_ai_template_optimization_service(mock_db)
        
        # Should return the same instance
        assert service1 is service2

    @pytest_asyncio.async_test
    async def test_cache_management(self, optimization_service):
        """Test caching of templates and performance data"""
        template_id = "template_123"
        
        # Mock performance calculation
        optimization_service._calculate_template_performance = AsyncMock(return_value={
            "sends": 100, "responses": 80, "confirmations": 70,
            "response_rate": 0.8, "confirmation_rate": 0.7,
            "revenue_protected": 500.0, "satisfaction_score": 4.0,
            "engagement_score": 0.75, "vs_baseline": 0.1, "trend": 0.05,
            "no_shows_prevented": 10, "prevention_rate": 0.1
        })

        # First call should calculate and cache
        metrics1 = await optimization_service.analyze_template_performance(template_id, "30d")
        
        # Second call should use cache
        metrics2 = await optimization_service.analyze_template_performance(template_id, "30d")

        # Should return cached result
        assert metrics1.total_sends == metrics2.total_sends
        assert f"{template_id}_30d" in optimization_service._performance_cache


if __name__ == "__main__":
    pytest.main([__file__, "-v"])