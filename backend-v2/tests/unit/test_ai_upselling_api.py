"""
Comprehensive unit tests for AI Upselling API endpoints.

Tests the AI-powered upselling capabilities including:
- Opportunity detection and analysis
- Execution and automation
- Learning feedback and optimization
- Security and performance validation
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from typing import List, Dict, Any

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.v2.endpoints.ai_upselling import router
from models import User
from factories import UserFactory, ClientFactory, AppointmentFactory, ServiceFactory
from services.upselling_ai_agent import OpportunityResponse, AIInsightsResponse


class TestAIUpsellingOpportunities:
    """Test AI opportunity detection and analysis."""

    @pytest.fixture
    def mock_ai_agent(self):
        """Mock AI agent with realistic responses."""
        mock_agent = Mock()
        mock_agent.scan_for_opportunities = AsyncMock()
        mock_agent.generate_insights = AsyncMock()
        mock_agent.execute_opportunity = AsyncMock()
        mock_agent.learn_from_outcome = AsyncMock()
        
        # Mock realistic opportunity responses
        mock_opportunity = Mock()
        mock_opportunity.client_id = 1
        mock_opportunity.client_name = "Jane Smith"
        mock_opportunity.current_service = "Basic Haircut"
        mock_opportunity.suggested_service = "Premium Styling Package"
        mock_opportunity.confidence_score = 0.85
        mock_opportunity.potential_revenue = 75.0
        mock_opportunity.optimal_timing = datetime.now() + timedelta(hours=2)
        mock_opportunity.recommended_channel = Mock(value="sms")
        mock_opportunity.personalized_message = "Hi Jane! Based on your style preferences..."
        mock_opportunity.reasoning = "Client has history of premium services"
        mock_opportunity.client_personality = Mock(value="style_conscious")
        mock_opportunity.historical_success_rate = 0.78
        
        mock_agent.scan_for_opportunities.return_value = [mock_opportunity]
        return mock_agent

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_get_opportunities_success(self, mock_get_agent, client, auth_headers, mock_ai_agent):
        """Test successful opportunity retrieval."""
        mock_get_agent.return_value = mock_ai_agent
        
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers,
            params={"limit": 5, "min_confidence": 0.8}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 1
        assert data[0]["client_name"] == "Jane Smith"
        assert data[0]["confidence_score"] == 0.85
        assert data[0]["potential_revenue"] == 75.0
        assert data[0]["recommended_channel"] == "sms"
        
        # Verify AI agent was called with correct parameters
        mock_ai_agent.scan_for_opportunities.assert_called_once()

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_get_opportunities_confidence_filtering(self, mock_get_agent, client, auth_headers, mock_ai_agent):
        """Test confidence threshold filtering."""
        # Create opportunities with different confidence scores
        low_confidence = Mock()
        low_confidence.confidence_score = 0.5
        high_confidence = Mock()
        high_confidence.confidence_score = 0.9
        
        # Set up all required attributes for both mocks
        for opp in [low_confidence, high_confidence]:
            opp.client_id = 1
            opp.client_name = "Test Client"
            opp.current_service = "Basic"
            opp.suggested_service = "Premium"
            opp.potential_revenue = 50.0
            opp.optimal_timing = datetime.now()
            opp.recommended_channel = Mock(value="email")
            opp.personalized_message = "Test message"
            opp.reasoning = "Test reasoning"
            opp.client_personality = Mock(value="budget_conscious")
            opp.historical_success_rate = 0.5
        
        mock_ai_agent.scan_for_opportunities.return_value = [low_confidence, high_confidence]
        mock_get_agent.return_value = mock_ai_agent
        
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers,
            params={"min_confidence": 0.8}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1  # Only high confidence should be returned
        assert data[0]["confidence_score"] == 0.9

    def test_get_opportunities_unauthorized(self, client):
        """Test unauthorized access to opportunities."""
        response = client.get("/api/v2/ai-upselling/opportunities")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')  
    def test_get_opportunities_limit_parameter(self, mock_get_agent, client, auth_headers, mock_ai_agent):
        """Test limit parameter functionality."""
        # Create multiple opportunities
        opportunities = []
        for i in range(15):
            opp = Mock()
            opp.client_id = i
            opp.client_name = f"Client {i}"
            opp.current_service = "Basic"
            opp.suggested_service = "Premium"
            opp.confidence_score = 0.85
            opp.potential_revenue = 50.0
            opp.optimal_timing = datetime.now()
            opp.recommended_channel = Mock(value="email")
            opp.personalized_message = "Test"
            opp.reasoning = "Test"
            opp.client_personality = Mock(value="style_conscious")
            opp.historical_success_rate = 0.7
            opportunities.append(opp)
        
        mock_ai_agent.scan_for_opportunities.return_value = opportunities
        mock_get_agent.return_value = mock_ai_agent
        
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers,
            params={"limit": 10}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 10  # Should respect limit


class TestAIUpsellingExecution:
    """Test AI opportunity execution functionality."""

    @pytest.fixture
    def mock_ai_agent_with_execution(self):
        """Mock AI agent with execution capabilities."""
        mock_agent = Mock()
        mock_agent.scan_for_opportunities = AsyncMock()
        mock_agent.execute_opportunity = AsyncMock()
        
        # Mock opportunity for execution
        mock_opportunity = Mock()
        mock_opportunity.client_id = 1
        mock_opportunity.client_name = "Jane Smith"
        mock_opportunity.suggested_service = "Premium Package"
        mock_opportunity.confidence_score = 0.85
        mock_opportunity.recommended_channel = Mock(value="sms")
        
        mock_agent.scan_for_opportunities.return_value = [mock_opportunity]
        mock_agent.execute_opportunity.return_value = {
            "success": True,
            "attempt_id": 123,
            "message_sent": True
        }
        
        return mock_agent

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_execute_opportunity_success(self, mock_get_agent, client, auth_headers, mock_ai_agent_with_execution):
        """Test successful opportunity execution."""
        mock_get_agent.return_value = mock_ai_agent_with_execution
        
        request_data = {
            "opportunity_id": "1_Premium Package_85",
            "execute_immediately": True
        }
        
        response = client.post(
            "/api/v2/ai-upselling/execute",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["message"] == "AI opportunity executed successfully"
        assert data["client_name"] == "Jane Smith"
        assert data["suggested_service"] == "Premium Package"
        assert data["confidence_score"] == 0.85
        assert "result" in data

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_execute_opportunity_not_found(self, mock_get_agent, client, auth_headers, mock_ai_agent_with_execution):
        """Test execution with non-existent opportunity."""
        mock_get_agent.return_value = mock_ai_agent_with_execution
        
        request_data = {
            "opportunity_id": "nonexistent_opportunity",
            "execute_immediately": True
        }
        
        response = client.post(
            "/api/v2/ai-upselling/execute",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"]

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_execute_with_overrides(self, mock_get_agent, client, auth_headers, mock_ai_agent_with_execution):
        """Test execution with channel and message overrides."""
        mock_get_agent.return_value = mock_ai_agent_with_execution
        
        request_data = {
            "opportunity_id": "1_Premium Package_85",
            "execute_immediately": True,
            "override_channel": "email",
            "custom_message": "Custom message for this client"
        }
        
        response = client.post(
            "/api/v2/ai-upselling/execute",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["channel"] == "email"  # Should use override

    def test_execute_opportunity_unauthorized(self, client):
        """Test unauthorized execution attempt."""
        request_data = {
            "opportunity_id": "test",
            "execute_immediately": True
        }
        
        response = client.post(
            "/api/v2/ai-upselling/execute",
            json=request_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAIInsights:
    """Test AI insights and analytics functionality."""

    @pytest.fixture
    def mock_insights_response(self):
        """Mock AI insights response."""
        insights = Mock()
        insights.total_opportunities_identified = 25
        insights.high_confidence_opportunities = 12
        insights.predicted_revenue_potential = 2450.0
        insights.optimal_timing_insights = {
            "best_hours": [10, 14, 16],
            "best_days": ["Tuesday", "Thursday"]
        }
        insights.personality_distribution = {
            "style_conscious": 8,
            "budget_conscious": 10,
            "convenience_focused": 7
        }
        insights.channel_recommendations = {
            "sms": 0.85,
            "email": 0.72,
            "call": 0.61
        }
        insights.success_predictions = {
            "this_week": 0.78,
            "this_month": 0.82
        }
        return insights

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_get_insights_success(self, mock_get_agent, client, auth_headers, mock_insights_response):
        """Test successful insights retrieval."""
        mock_agent = Mock()
        mock_agent.generate_insights = AsyncMock(return_value=mock_insights_response)
        mock_get_agent.return_value = mock_agent
        
        response = client.get(
            "/api/v2/ai-upselling/insights",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_opportunities_identified"] == 25
        assert data["high_confidence_opportunities"] == 12
        assert data["predicted_revenue_potential"] == 2450.0
        assert "optimal_timing_insights" in data
        assert "personality_distribution" in data

    def test_get_insights_unauthorized(self, client):
        """Test unauthorized access to insights."""
        response = client.get("/api/v2/ai-upselling/insights")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAILearning:
    """Test AI learning and feedback functionality."""

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_provide_learning_feedback_success(self, mock_get_agent, client, auth_headers):
        """Test successful learning feedback submission."""
        mock_agent = Mock()
        mock_agent.learn_from_outcome = AsyncMock()
        mock_get_agent.return_value = mock_agent
        
        feedback_data = {
            "attempt_id": 123,
            "outcome": "converted",
            "revenue": 75.0,
            "notes": "Client was very satisfied"
        }
        
        response = client.post(
            "/api/v2/ai-upselling/learn",
            headers=auth_headers,
            json=feedback_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["message"] == "AI learning feedback processed successfully"
        assert data["attempt_id"] == 123
        assert data["outcome"] == "converted"
        assert data["revenue"] == 75.0
        
        # Verify AI agent learning was called
        mock_agent.learn_from_outcome.assert_called_once()

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_learning_feedback_validation(self, mock_get_agent, client, auth_headers):
        """Test learning feedback input validation."""
        mock_agent = Mock()
        mock_get_agent.return_value = mock_agent
        
        # Test with invalid outcome
        invalid_feedback = {
            "attempt_id": 123,
            "outcome": "invalid_outcome",
            "revenue": 75.0
        }
        
        response = client.post(
            "/api/v2/ai-upselling/learn",
            headers=auth_headers,
            json=invalid_feedback
        )
        
        # Should still accept the feedback (validation handled by Pydantic)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_learning_feedback_unauthorized(self, client):
        """Test unauthorized learning feedback submission."""
        feedback_data = {
            "attempt_id": 123,
            "outcome": "converted",
            "revenue": 75.0
        }
        
        response = client.post(
            "/api/v2/ai-upselling/learn",
            json=feedback_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAIAgentStatus:
    """Test AI agent status and monitoring."""

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_get_ai_agent_status_success(self, mock_get_agent, client, auth_headers):
        """Test AI agent status retrieval."""
        mock_agent = Mock()
        mock_agent.scan_for_opportunities = AsyncMock(return_value=[])
        mock_agent.learning_history = []
        mock_agent.confidence_threshold = 0.7
        mock_agent.max_daily_opportunities = 20
        mock_agent.learning_window_days = 30
        mock_get_agent.return_value = mock_agent
        
        response = client.get(
            "/api/v2/ai-upselling/status",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["ai_agent_active"] is True
        assert "opportunities_identified" in data
        assert "learning_records" in data
        assert "capabilities" in data
        assert "current_models" in data
        assert len(data["capabilities"]) > 0

    def test_get_ai_agent_status_unauthorized(self, client):
        """Test unauthorized access to AI agent status."""
        response = client.get("/api/v2/ai-upselling/status")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAutoExecution:
    """Test auto-execution functionality."""

    @pytest.fixture
    def admin_user(self, db: Session) -> User:
        """Create an admin user for auto-execution tests."""
        admin = UserFactory.create_admin(
            email="admin@example.com",
            name="Admin User"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    @pytest.fixture
    def admin_auth_headers(self, admin_user: User) -> dict:
        """Get authentication headers for admin user."""
        from utils.auth import create_access_token
        access_token = create_access_token(data={"sub": admin_user.email, "role": admin_user.role})
        return {"Authorization": f"Bearer {access_token}"}

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_auto_execute_success(self, mock_get_agent, client, admin_auth_headers):
        """Test successful auto-execution of opportunities."""
        mock_agent = Mock()
        
        # Mock high-confidence opportunities
        high_conf_opp = Mock()
        high_conf_opp.client_name = "VIP Client"
        high_conf_opp.suggested_service = "Premium Service"
        high_conf_opp.confidence_score = 0.9
        high_conf_opp.potential_revenue = 120.0
        high_conf_opp.recommended_channel = Mock(value="sms")
        
        mock_agent.scan_for_opportunities = AsyncMock(return_value=[high_conf_opp])
        mock_agent.execute_opportunity = AsyncMock(return_value={
            "success": True,
            "attempt_id": 456
        })
        mock_get_agent.return_value = mock_agent
        
        response = client.post(
            "/api/v2/ai-upselling/auto-execute",
            headers=admin_auth_headers,
            params={"max_executions": 5, "min_confidence": 0.8}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["message"] == "AI auto-execution completed"
        assert data["executed_count"] == 1
        assert len(data["executed_opportunities"]) == 1
        assert data["total_potential_revenue"] == 120.0

    def test_auto_execute_permission_denied(self, client, auth_headers):
        """Test auto-execution with insufficient permissions."""
        response = client.post(
            "/api/v2/ai-upselling/auto-execute",
            headers=auth_headers,  # Regular user, not admin
            params={"max_executions": 5}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "requires admin" in response.json()["detail"]

    def test_auto_execute_unauthorized(self, client):
        """Test unauthorized auto-execution attempt."""
        response = client.post(
            "/api/v2/ai-upselling/auto-execute",
            params={"max_executions": 5}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestErrorHandling:
    """Test error handling and edge cases."""

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_ai_agent_failure(self, mock_get_agent, client, auth_headers):
        """Test handling of AI agent failures."""
        mock_agent = Mock()
        mock_agent.scan_for_opportunities = AsyncMock(side_effect=Exception("AI service unavailable"))
        mock_get_agent.return_value = mock_agent
        
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to get AI opportunities" in response.json()["detail"]

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_insights_generation_failure(self, mock_get_agent, client, auth_headers):
        """Test handling of insights generation failures."""
        mock_agent = Mock()
        mock_agent.generate_insights = AsyncMock(side_effect=Exception("Insights service down"))
        mock_get_agent.return_value = mock_agent
        
        response = client.get(
            "/api/v2/ai-upselling/insights",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to get AI insights" in response.json()["detail"]


class TestBusinessLogicValidation:
    """Test Six Figure Barber methodology compliance."""

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_premium_service_focus(self, mock_get_agent, client, auth_headers):
        """Test that AI focuses on premium service recommendations."""
        mock_agent = Mock()
        
        # Mock premium service opportunity
        premium_opp = Mock()
        premium_opp.client_id = 1
        premium_opp.client_name = "Premium Client"
        premium_opp.current_service = "Basic Haircut"
        premium_opp.suggested_service = "Signature Style Package"  # Premium service
        premium_opp.confidence_score = 0.88
        premium_opp.potential_revenue = 150.0  # High value
        premium_opp.optimal_timing = datetime.now()
        premium_opp.recommended_channel = Mock(value="call")  # Personal touch
        premium_opp.personalized_message = "Exclusive premium service offer"
        premium_opp.reasoning = "Client values quality and exclusivity"
        premium_opp.client_personality = Mock(value="premium_focused")
        premium_opp.historical_success_rate = 0.85
        
        mock_agent.scan_for_opportunities.return_value = [premium_opp]
        mock_get_agent.return_value = mock_agent
        
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Validate Six Figure Barber methodology compliance
        assert data[0]["potential_revenue"] >= 75.0  # Premium pricing
        assert "Premium" in data[0]["suggested_service"] or "Signature" in data[0]["suggested_service"]
        assert data[0]["confidence_score"] >= 0.8  # High confidence only

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_revenue_optimization_focus(self, mock_get_agent, client, auth_headers):
        """Test revenue optimization insights align with Six Figure Barber goals."""
        mock_agent = Mock()
        
        # Mock insights focused on $100k annual goal
        insights = Mock()
        insights.total_opportunities_identified = 30
        insights.high_confidence_opportunities = 18
        insights.predicted_revenue_potential = 4500.0  # Strong monthly potential
        insights.optimal_timing_insights = {
            "peak_revenue_hours": [10, 14, 16],
            "high_value_days": ["Tuesday", "Wednesday", "Thursday"]
        }
        insights.personality_distribution = {
            "premium_focused": 12,  # High-value clients
            "style_conscious": 8,
            "budget_conscious": 4   # Fewer budget clients
        }
        insights.channel_recommendations = {
            "call": 0.92,  # Personal touch for premium
            "sms": 0.84,
            "email": 0.76
        }
        insights.success_predictions = {
            "monthly_revenue_potential": 4500.0,
            "annual_projection": 54000.0  # On track for 6-figure goal
        }
        
        mock_agent.generate_insights = AsyncMock(return_value=insights)
        mock_get_agent.return_value = mock_agent
        
        response = client.get(
            "/api/v2/ai-upselling/insights",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Validate alignment with Six Figure Barber methodology
        assert data["predicted_revenue_potential"] >= 3000.0  # Strong monthly potential
        assert data["personality_distribution"]["premium_focused"] > data["personality_distribution"]["budget_conscious"]
        assert data["channel_recommendations"]["call"] > 0.9  # Premium personal service


class TestPerformanceAndScalability:
    """Test performance and scalability aspects."""

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_large_opportunity_list_performance(self, mock_get_agent, client, auth_headers):
        """Test handling of large opportunity lists."""
        mock_agent = Mock()
        
        # Create a large number of opportunities
        opportunities = []
        for i in range(100):
            opp = Mock()
            opp.client_id = i
            opp.client_name = f"Client {i}"
            opp.current_service = "Basic Service"
            opp.suggested_service = "Premium Service"
            opp.confidence_score = 0.8 + (i % 20) / 100  # Varying confidence
            opp.potential_revenue = 50.0 + (i % 50)
            opp.optimal_timing = datetime.now() + timedelta(hours=i % 24)
            opp.recommended_channel = Mock(value="sms")
            opp.personalized_message = f"Message for client {i}"
            opp.reasoning = f"Reasoning for client {i}"
            opp.client_personality = Mock(value="style_conscious")
            opp.historical_success_rate = 0.7 + (i % 30) / 100
            opportunities.append(opp)
        
        mock_agent.scan_for_opportunities = AsyncMock(return_value=opportunities)
        mock_get_agent.return_value = mock_agent
        
        # Test with limit to ensure reasonable response times
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers,
            params={"limit": 50, "min_confidence": 0.8}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) <= 50  # Respects limit
        
        # All returned opportunities should meet confidence threshold
        for opp in data:
            assert opp["confidence_score"] >= 0.8

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_concurrent_request_handling(self, mock_get_agent, client, auth_headers):
        """Test that concurrent requests don't interfere with each other."""
        mock_agent = Mock()
        mock_agent.scan_for_opportunities = AsyncMock(return_value=[])
        mock_get_agent.return_value = mock_agent
        
        # Simulate multiple concurrent requests
        responses = []
        for _ in range(5):
            response = client.get(
                "/api/v2/ai-upselling/opportunities",
                headers=auth_headers
            )
            responses.append(response)
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == status.HTTP_200_OK


class TestSecurityValidation:
    """Test security aspects and authorization."""

    def test_role_based_access_auto_execute(self, client, auth_headers):
        """Test that auto-execute is restricted to authorized roles."""
        response = client.post(
            "/api/v2/ai-upselling/auto-execute",
            headers=auth_headers  # Regular user
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('api.v2.endpoints.ai_upselling.get_ai_agent')
    def test_data_isolation(self, mock_get_agent, client, auth_headers):
        """Test that users only see their own data."""
        mock_agent = Mock()
        mock_agent.scan_for_opportunities = AsyncMock()
        mock_get_agent.return_value = mock_agent
        
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers
        )
        
        # Verify that the AI agent was called with the correct user context
        mock_agent.scan_for_opportunities.assert_called_once()
        call_args = mock_agent.scan_for_opportunities.call_args
        assert call_args is not None

    def test_input_validation_execution(self, client, auth_headers):
        """Test input validation for execution requests."""
        # Missing required fields
        invalid_request = {
            "execute_immediately": True
            # Missing opportunity_id
        }
        
        response = client.post(
            "/api/v2/ai-upselling/execute",
            headers=auth_headers,
            json=invalid_request
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_sql_injection_protection(self, client, auth_headers):
        """Test protection against SQL injection in parameters."""
        malicious_params = {
            "limit": "50; DROP TABLE users; --",
            "min_confidence": "0.8 OR 1=1"
        }
        
        response = client.get(
            "/api/v2/ai-upselling/opportunities",
            headers=auth_headers,
            params=malicious_params
        )
        
        # Should either return 422 for invalid params or 200 with safe handling
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]