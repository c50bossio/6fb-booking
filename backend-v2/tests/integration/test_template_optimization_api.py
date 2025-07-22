"""
Integration tests for Template Optimization API

Tests the complete template optimization API endpoints including:
- A/B test creation and management
- Optimal template retrieval
- Performance tracking
- Recommendations
- Error handling and validation
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
import json

from main import app
from utils.auth import get_current_user
from models import User
from services.ai_template_optimization_service import (
    ABTest,
    TemplateVariant,
    TemplateVariationType,
    OptimizationGoal,
    MessageType,
    MessageChannel,
    TestStatus
)


class TestTemplateOptimizationAPI:
    """Integration tests for template optimization API endpoints"""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user"""
        user = Mock(spec=User)
        user.id = 123
        user.email = "test@example.com"
        user.name = "Test User"
        return user

    @pytest.fixture
    def sample_ab_test(self):
        """Sample A/B test for testing"""
        return ABTest(
            id="test_123",
            test_name="Reminder Tone Test",
            message_type=MessageType.APPOINTMENT_REMINDER,
            channel=MessageChannel.SMS,
            optimization_goal=OptimizationGoal.CONFIRMATION_RATE,
            variants=[
                TemplateVariant(
                    id="control",
                    template_id="test_123",
                    variant_name="Control",
                    template_content="Hi {client_name}, reminder about your appointment",
                    variation_type=TemplateVariationType.TONE,
                    parameters={"is_control": True},
                    created_at=datetime.utcnow(),
                    sends_count=50,
                    responses_count=35,
                    confirmations_count=30,
                    response_rate=0.7,
                    confirmation_rate=0.6
                ),
                TemplateVariant(
                    id="variant_1",
                    template_id="test_123",
                    variant_name="Casual Tone",
                    template_content="Hey {client_name}! Don't forget your appointment",
                    variation_type=TemplateVariationType.TONE,
                    parameters={"tone": "casual"},
                    created_at=datetime.utcnow(),
                    sends_count=55,
                    responses_count=42,
                    confirmations_count=38,
                    response_rate=0.76,
                    confirmation_rate=0.69
                )
            ],
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow() + timedelta(days=7),
            min_sample_size=100,
            confidence_threshold=0.95,
            status=TestStatus.ACTIVE,
            created_by=123
        )

    @pytest.fixture
    def create_test_request(self):
        """Sample create test request"""
        return {
            "test_name": "Urgency Level Test",
            "message_type": "appointment_reminder",
            "channel": "sms",
            "optimization_goal": "confirmation_rate",
            "base_template": "Hi {client_name}, your appointment is tomorrow at {time}. Please confirm.",
            "variation_types": ["urgency", "length"],
            "test_duration_days": 14,
            "min_sample_size": 100
        }

    async def override_get_current_user():
        """Override dependency for testing"""
        user = Mock(spec=User)
        user.id = 123
        user.email = "test@example.com"
        return user

    @pytest_asyncio.async_test
    async def test_create_ab_test_success(self, sample_ab_test, create_test_request):
        """Test successful A/B test creation"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.create_ab_test = AsyncMock(return_value=sample_ab_test)
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/template-optimization/ab-tests",
                    json=create_test_request
                )

            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert data["id"] == "test_123"
            assert data["test_name"] == "Reminder Tone Test"
            assert data["message_type"] == "appointment_reminder"
            assert data["channel"] == "sms"
            assert data["optimization_goal"] == "confirmation_rate"
            assert data["status"] == "active"
            assert data["variants_count"] == 2
            assert data["current_sample_size"] == 105  # 50 + 55

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_create_ab_test_invalid_enum(self, create_test_request):
        """Test A/B test creation with invalid enum values"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        # Test invalid message type
        invalid_request = create_test_request.copy()
        invalid_request["message_type"] = "invalid_type"

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/template-optimization/ab-tests",
                json=invalid_request
            )

        assert response.status_code == 400
        assert "Invalid enum value" in response.json()["detail"]

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_active_ab_tests(self, sample_ab_test):
        """Test retrieving active A/B tests"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.get_active_tests = AsyncMock(return_value=[sample_ab_test])
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/ab-tests")

            assert response.status_code == 200
            data = response.json()
            
            assert len(data) == 1
            assert data[0]["id"] == "test_123"
            assert data[0]["status"] == "active"

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_ab_test_results(self):
        """Test retrieving A/B test results"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_results = {
            "test_info": {
                "id": "test_123",
                "name": "Tone Test",
                "status": "completed",
                "optimization_goal": "confirmation_rate"
            },
            "variants": [
                {
                    "id": "control",
                    "name": "Control",
                    "variation_type": "tone",
                    "performance": {
                        "sends": 100,
                        "responses": 70,
                        "confirmations": 60,
                        "response_rate": 0.7,
                        "confirmation_rate": 0.6,
                        "effectiveness_score": 0.65
                    }
                },
                {
                    "id": "variant_1",
                    "name": "Casual",
                    "variation_type": "tone",
                    "performance": {
                        "sends": 105,
                        "responses": 80,
                        "confirmations": 72,
                        "response_rate": 0.76,
                        "confirmation_rate": 0.69,
                        "effectiveness_score": 0.72
                    }
                }
            ],
            "statistical_analysis": {
                "winner": "variant_1",
                "significance": 0.95,
                "improvement": 0.13
            }
        }

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.get_test_results = AsyncMock(return_value=mock_results)
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/ab-tests/test_123/results")

            assert response.status_code == 200
            data = response.json()
            
            assert "test_info" in data
            assert "variants" in data
            assert "statistical_analysis" in data
            assert data["statistical_analysis"]["winner"] == "variant_1"
            assert data["statistical_analysis"]["improvement"] == 0.13

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_ab_test_results_not_found(self):
        """Test retrieving results for non-existent test"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.get_test_results = AsyncMock(return_value={"error": "Test not found"})
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/ab-tests/nonexistent/results")

            assert response.status_code == 404

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_complete_ab_test(self):
        """Test manually completing an A/B test"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_results = {
            "test_info": {
                "id": "test_123",
                "status": "completed"
            },
            "variants": [],
            "statistical_analysis": {
                "winner": "variant_1",
                "improvement": 0.15
            }
        }

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization._complete_ab_test = AsyncMock()
            mock_optimization.get_test_results = AsyncMock(return_value=mock_results)
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post("/api/v1/template-optimization/ab-tests/test_123/complete")

            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert "test_results" in data

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_optimal_template_success(self):
        """Test retrieving optimal template"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        optimal_template_request = {
            "message_type": "appointment_reminder",
            "channel": "sms",
            "client_context": {"client_id": 456, "name": "John Doe"},
            "appointment_context": {"appointment_id": 789, "time": "2024-01-15T14:00:00"}
        }

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.get_optimal_template = AsyncMock(return_value=(
                "Hi John, reminder about your appointment tomorrow at 2:00 PM",
                {
                    "variant_id": "variant_123",
                    "test_id": "test_456",
                    "is_test": True,
                    "variation_type": "tone"
                }
            ))
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/template-optimization/templates/optimal",
                    json=optimal_template_request
                )

            assert response.status_code == 200
            data = response.json()
            
            assert "template_content" in data
            assert "metadata" in data
            assert data["is_test_variant"] is True
            assert data["test_id"] == "test_456"
            assert data["variant_id"] == "variant_123"

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_optimal_template_invalid_enum(self):
        """Test optimal template with invalid enum values"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        invalid_request = {
            "message_type": "invalid_type",
            "channel": "sms",
            "client_context": {},
            "appointment_context": {}
        }

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/template-optimization/templates/optimal",
                json=invalid_request
            )

        assert response.status_code == 400
        assert "Invalid enum value" in response.json()["detail"]

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_record_template_interaction(self):
        """Test recording template interaction"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        interaction_request = {
            "template_id": "template_123",
            "variant_id": "variant_456",
            "interaction_type": "response",
            "client_id": 789,
            "appointment_id": 101112,
            "metadata": {"response_time": 300}
        }

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.record_template_interaction = AsyncMock()
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/template-optimization/interactions",
                    json=interaction_request
                )

            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert "Template interaction recorded successfully" in data["message"]

            # Verify the service method was called
            mock_optimization.record_template_interaction.assert_called_once_with(
                template_id="template_123",
                variant_id="variant_456",
                interaction_type="response",
                client_id=789,
                appointment_id=101112,
                metadata={"response_time": 300}
            )

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_template_performance(self):
        """Test retrieving template performance metrics"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_performance = Mock()
        mock_performance.template_id = "template_123"
        mock_performance.time_period = "30d"
        mock_performance.total_sends = 500
        mock_performance.total_responses = 375
        mock_performance.total_confirmations = 300
        mock_performance.response_rate = 0.75
        mock_performance.confirmation_rate = 0.60
        mock_performance.engagement_score = 0.68
        mock_performance.revenue_protected = 1500.0
        mock_performance.performance_vs_baseline = 0.12

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.analyze_template_performance = AsyncMock(return_value=mock_performance)
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/performance/template_123?time_period=30d")

            assert response.status_code == 200
            data = response.json()
            
            assert data["template_id"] == "template_123"
            assert data["time_period"] == "30d"
            assert data["total_sends"] == 500
            assert data["response_rate"] == 0.75
            assert data["confirmation_rate"] == 0.60
            assert data["revenue_protected"] == 1500.0

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_template_performance_invalid_period(self):
        """Test template performance with invalid time period"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/template-optimization/performance/template_123?time_period=invalid")

        assert response.status_code == 400
        assert "Invalid time period" in response.json()["detail"]

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_optimization_recommendations(self):
        """Test retrieving optimization recommendations"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_recommendations = [
            Mock(
                template_id="template_1",
                recommendation_type="response_rate",
                priority="high",
                suggestion="Try shorter messages for better engagement",
                expected_improvement=0.15,
                confidence_score=0.85,
                implementation_effort="easy",
                current_performance=0.60,
                benchmark_performance=0.75
            ),
            Mock(
                template_id="template_2",
                recommendation_type="confirmation_rate",
                priority="medium",
                suggestion="Add clearer call-to-action",
                expected_improvement=0.10,
                confidence_score=0.70,
                implementation_effort="moderate",
                current_performance=0.50,
                benchmark_performance=0.60
            )
        ]

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.get_optimization_recommendations = AsyncMock(return_value=mock_recommendations)
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/recommendations?limit=5")

            assert response.status_code == 200
            data = response.json()
            
            assert len(data) == 2
            assert data[0]["template_id"] == "template_1"
            assert data[0]["priority"] == "high"
            assert data[0]["expected_improvement"] == 0.15
            assert data[1]["priority"] == "medium"

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_recommendations_with_filters(self):
        """Test recommendations with message type and channel filters"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.get_optimization_recommendations = AsyncMock(return_value=[])
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get(
                    "/api/v1/template-optimization/recommendations?message_type=appointment_reminder&channel=sms"
                )

            assert response.status_code == 200
            
            # Verify service was called with correct filters
            mock_optimization.get_optimization_recommendations.assert_called_once()
            call_args = mock_optimization.get_optimization_recommendations.call_args
            assert call_args[1]["message_type"].value == "appointment_reminder"
            assert call_args[1]["channel"].value == "sms"

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_variant_performance(self):
        """Test retrieving variant performance"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_variant = Mock()
        mock_variant.id = "variant_123"
        mock_variant.template_id = "test_456"
        mock_variant.variant_name = "Casual Tone"
        mock_variant.variation_type = TemplateVariationType.TONE
        mock_variant.sends_count = 150
        mock_variant.responses_count = 120
        mock_variant.confirmations_count = 100
        mock_variant.response_rate = 0.80
        mock_variant.confirmation_rate = 0.67
        mock_variant.effectiveness_score = 0.73
        mock_variant.created_at = datetime.utcnow()

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization._template_cache = {"variant_123": mock_variant}
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/variants/variant_123/performance")

            assert response.status_code == 200
            data = response.json()
            
            assert data["variant_id"] == "variant_123"
            assert data["template_id"] == "test_456"
            assert data["variant_name"] == "Casual Tone"
            assert data["performance"]["sends_count"] == 150
            assert data["performance"]["response_rate"] == 0.80
            assert data["performance"]["effectiveness_score"] == 0.73

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_variant_performance_not_found(self):
        """Test variant performance for non-existent variant"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization._template_cache = {}  # Empty cache
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/variants/nonexistent/performance")

            assert response.status_code == 404
            assert "Variant not found" in response.json()["detail"]

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_check_optimization_service_health(self):
        """Test optimization service health check"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization._active_tests = {"test_1": Mock(), "test_2": Mock()}
            mock_optimization._template_cache = {"variant_1": Mock(), "variant_2": Mock(), "variant_3": Mock()}
            mock_optimization._performance_cache = {"perf_1": Mock()}
            mock_optimization.min_sample_size = 100
            mock_optimization.confidence_threshold = 0.95
            mock_optimization.test_duration_days = 14
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/template-optimization/health")

            assert response.status_code == 200
            data = response.json()
            
            assert data["service_status"] == "healthy"
            assert data["active_tests_count"] == 2
            assert data["cached_templates_count"] == 3
            assert data["cached_performance_count"] == 1
            assert data["min_sample_size"] == 100
            assert data["confidence_threshold"] == 0.95

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_unauthorized_access(self):
        """Test API endpoints without authentication"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Test protected endpoints without auth
            endpoints = [
                ("/api/v1/template-optimization/ab-tests", "GET"),
                ("/api/v1/template-optimization/ab-tests", "POST"),
                ("/api/v1/template-optimization/recommendations", "GET"),
                ("/api/v1/template-optimization/performance/template_123", "GET")
            ]
            
            for endpoint, method in endpoints:
                if method == "GET":
                    response = await client.get(endpoint)
                else:
                    response = await client.post(endpoint, json={})
                
                assert response.status_code == 401  # Unauthorized

    @pytest_asyncio.async_test
    async def test_service_error_handling(self, create_test_request):
        """Test API error handling when service fails"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.ai_template_optimization_service.get_ai_template_optimization_service') as mock_service:
            mock_optimization = Mock()
            mock_optimization.create_ab_test = AsyncMock(side_effect=Exception("Service unavailable"))
            mock_service.return_value = mock_optimization

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/template-optimization/ab-tests",
                    json=create_test_request
                )

            assert response.status_code == 500
            data = response.json()
            assert "Failed to create A/B test" in data["detail"]

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_input_validation(self):
        """Test input validation for API endpoints"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        # Test missing required fields
        invalid_request = {
            "test_name": "",  # Empty name
            "message_type": "appointment_reminder",
            "channel": "sms",
            "optimization_goal": "confirmation_rate",
            "base_template": "",  # Empty template
            "variation_types": [],  # Empty variations
            "test_duration_days": 0,  # Invalid duration
            "min_sample_size": 10  # Too small sample size
        }

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/template-optimization/ab-tests",
                json=invalid_request
            )

        # Should validate input and return appropriate error
        assert response.status_code in [400, 422]  # Bad request or validation error

        app.dependency_overrides.clear()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])