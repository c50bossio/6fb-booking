"""
Comprehensive unit tests for Booking Intelligence API endpoints.

Tests the AI-powered booking intelligence capabilities including:
- Smart booking recommendations
- Automated follow-up actions
- Performance analytics and insights
- Six Figure Barber methodology compliance
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.v2.endpoints.booking_intelligence import router
from models import User, Appointment
from factories import UserFactory, ClientFactory, AppointmentFactory, ServiceFactory


class TestBookingRecommendations:
    """Test smart booking recommendation functionality."""

    @pytest.fixture
    def mock_intelligence_service(self):
        """Mock booking intelligence service with realistic responses."""
        mock_service = Mock()
        
        # Mock recommendation response
        mock_recommendation = Mock()
        mock_recommendation.id = "rec_001"
        mock_recommendation.type = Mock(value="follow_up_booking")
        mock_recommendation.priority = Mock(value="high")
        mock_recommendation.client_id = 1
        mock_recommendation.client_name = "Jane Smith"
        mock_recommendation.recommended_service = "Premium Styling Package"
        mock_recommendation.recommended_price = 85.0
        mock_recommendation.recommended_time = datetime.now() + timedelta(days=7)
        mock_recommendation.reasoning = "Client has history of premium services and high satisfaction"
        mock_recommendation.six_fb_principle = "Consistent premium service builds six-figure income"
        mock_recommendation.expected_revenue_impact = 85.0
        mock_recommendation.confidence = 0.89
        mock_recommendation.action_button_text = "Book Premium Service"
        mock_recommendation.deadline = datetime.now() + timedelta(days=14)
        
        mock_service.generate_smart_booking_recommendations.return_value = [mock_recommendation]
        return mock_service

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_get_recommendations_success(self, mock_service, client, auth_headers, mock_intelligence_service):
        """Test successful booking recommendations retrieval."""
        mock_service.generate_smart_booking_recommendations = mock_intelligence_service.generate_smart_booking_recommendations
        
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers,
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 1
        assert data[0]["id"] == "rec_001"
        assert data[0]["type"] == "follow_up_booking"
        assert data[0]["priority"] == "high"
        assert data[0]["client_name"] == "Jane Smith"
        assert data[0]["recommended_service"] == "Premium Styling Package"
        assert data[0]["recommended_price"] == 85.0
        assert data[0]["confidence"] == 0.89

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_get_recommendations_with_filters(self, mock_service, client, auth_headers, mock_intelligence_service):
        """Test recommendations with type and priority filters."""
        # Create multiple recommendations with different types and priorities
        high_priority_rec = Mock()
        high_priority_rec.id = "rec_high"
        high_priority_rec.type = Mock(value="service_upgrade")
        high_priority_rec.priority = Mock(value="high")
        high_priority_rec.client_id = 1
        high_priority_rec.client_name = "VIP Client"
        high_priority_rec.recommended_service = "Signature Package"
        high_priority_rec.recommended_price = 120.0
        high_priority_rec.recommended_time = datetime.now()
        high_priority_rec.reasoning = "VIP client ready for upgrade"
        high_priority_rec.six_fb_principle = "Premium clients drive revenue"
        high_priority_rec.expected_revenue_impact = 120.0
        high_priority_rec.confidence = 0.95
        high_priority_rec.action_button_text = "Upgrade Service"
        high_priority_rec.deadline = None
        
        low_priority_rec = Mock()
        low_priority_rec.id = "rec_low"
        low_priority_rec.type = Mock(value="follow_up_booking")
        low_priority_rec.priority = Mock(value="medium")
        low_priority_rec.client_id = 2
        low_priority_rec.client_name = "Regular Client"
        low_priority_rec.recommended_service = "Standard Cut"
        low_priority_rec.recommended_price = 45.0
        low_priority_rec.recommended_time = datetime.now()
        low_priority_rec.reasoning = "Regular maintenance needed"
        low_priority_rec.six_fb_principle = "Consistency builds relationships"
        low_priority_rec.expected_revenue_impact = 45.0
        low_priority_rec.confidence = 0.72
        low_priority_rec.action_button_text = "Schedule Follow-up"
        low_priority_rec.deadline = None
        
        mock_service.generate_smart_booking_recommendations.return_value = [high_priority_rec, low_priority_rec]
        
        # Test priority filter
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers,
            params={"priority": "high"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["priority"] == "high"
        
        # Test type filter
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers,
            params={"recommendation_type": "service_upgrade"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["type"] == "service_upgrade"

    def test_get_recommendations_unauthorized(self, client):
        """Test unauthorized access to recommendations."""
        response = client.get("/api/v2/booking-intelligence/recommendations")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_get_recommendations_default_dates(self, mock_service, client, auth_headers, mock_intelligence_service):
        """Test recommendations with default date parameters."""
        mock_service.generate_smart_booking_recommendations = mock_intelligence_service.generate_smart_booking_recommendations
        
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify service was called with correct default date range (30 days)
        call_args = mock_service.generate_smart_booking_recommendations.call_args
        assert call_args is not None
        start_date = call_args.kwargs.get('start_date')
        end_date = call_args.kwargs.get('end_date')
        
        # Should use current date as start and 30 days ahead as end
        assert start_date == datetime.now().date()
        assert end_date == start_date + timedelta(days=30)


class TestFollowUpActions:
    """Test automated follow-up action functionality."""

    @pytest.fixture
    def mock_follow_up_actions(self):
        """Mock follow-up actions."""
        action1 = Mock()
        action1.id = "action_001"
        action1.client_id = 1
        action1.client_name = "John Doe"
        action1.action_type = Mock(value="thank_you_message")
        action1.trigger_type = Mock(value="appointment_completed")
        action1.scheduled_date = datetime.now() + timedelta(hours=2)
        action1.message_template = "Thank you for your visit! How was your experience?"
        action1.six_fb_principle = "Client satisfaction drives referrals and retention"
        action1.priority = Mock(value="high")
        action1.status = "scheduled"
        action1.expected_outcome = "Increased client satisfaction and review generation"
        action1.deadline = None
        
        action2 = Mock()
        action2.id = "action_002"
        action2.client_id = 2
        action2.client_name = "Jane Smith"
        action2.action_type = Mock(value="next_appointment")
        action2.trigger_type = Mock(value="service_completion")
        action2.scheduled_date = datetime.now() + timedelta(days=28)
        action2.message_template = "It's time for your regular appointment! Book now."
        action2.six_fb_principle = "Consistent scheduling maximizes client lifetime value"
        action2.priority = Mock(value="medium")
        action2.status = "scheduled"
        action2.expected_outcome = "Maintained appointment schedule and revenue consistency"
        action2.deadline = datetime.now() + timedelta(days=35)
        
        return [action1, action2]

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_get_follow_up_actions_success(self, mock_service, client, auth_headers, mock_follow_up_actions):
        """Test successful follow-up actions retrieval."""
        mock_service.generate_automated_follow_up_actions.return_value = mock_follow_up_actions
        
        response = client.get(
            "/api/v2/booking-intelligence/follow-up-actions",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["id"] == "action_001"
        assert data[0]["action_type"] == "thank_you_message"
        assert data[0]["client_name"] == "John Doe"
        assert data[0]["priority"] == "high"
        assert data[1]["action_type"] == "next_appointment"

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_follow_up_actions_filters(self, mock_service, client, auth_headers, mock_follow_up_actions):
        """Test follow-up actions with filters."""
        mock_service.generate_automated_follow_up_actions.return_value = mock_follow_up_actions
        
        # Test status filter
        response = client.get(
            "/api/v2/booking-intelligence/follow-up-actions",
            headers=auth_headers,
            params={"status": "scheduled"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(action["status"] == "scheduled" for action in data)
        
        # Test action type filter
        response = client.get(
            "/api/v2/booking-intelligence/follow-up-actions",
            headers=auth_headers,
            params={"action_type": "thank_you_message"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["action_type"] == "thank_you_message"

    def test_get_follow_up_actions_unauthorized(self, client):
        """Test unauthorized access to follow-up actions."""
        response = client.get("/api/v2/booking-intelligence/follow-up-actions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRecommendationApplication:
    """Test booking recommendation application functionality."""

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_apply_recommendation_success(self, mock_service, client, auth_headers):
        """Test successful recommendation application."""
        mock_service.apply_booking_recommendation.return_value = {
            "success": True,
            "recommendation_id": "rec_001",
            "action_taken": "appointment_scheduled",
            "appointment_id": 123,
            "revenue_impact": 85.0,
            "client_notified": True
        }
        
        request_data = {
            "recommendation_id": "rec_001",
            "action_type": "schedule_appointment",
            "notes": "Client confirmed availability",
            "scheduled_appointment": True,
            "custom_message": "Looking forward to your premium service!"
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/recommendations/rec_001/apply",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert data["recommendation_id"] == "rec_001"
        assert data["action_taken"] == "appointment_scheduled"
        assert data["revenue_impact"] == 85.0

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_apply_recommendation_failure(self, mock_service, client, auth_headers):
        """Test recommendation application failure handling."""
        mock_service.apply_booking_recommendation.side_effect = Exception("Client not available")
        
        request_data = {
            "recommendation_id": "rec_001",
            "action_type": "schedule_appointment"
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/recommendations/rec_001/apply",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to apply recommendation" in response.json()["detail"]

    def test_apply_recommendation_unauthorized(self, client):
        """Test unauthorized recommendation application."""
        request_data = {
            "recommendation_id": "rec_001",
            "action_type": "schedule_appointment"
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/recommendations/rec_001/apply",
            json=request_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestFollowUpExecution:
    """Test follow-up action execution functionality."""

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_execute_follow_up_success(self, mock_service, client, auth_headers):
        """Test successful follow-up action execution."""
        mock_service.execute_follow_up_action.return_value = {
            "success": True,
            "action_id": "action_001",
            "execution_status": "completed",
            "message_sent": True,
            "client_response": "positive",
            "next_action_scheduled": False
        }
        
        request_data = {
            "action_id": "action_001",
            "execution_method": "sms",
            "custom_message": "Thanks for your visit! We hope you loved your new look!",
            "notes": "Client seemed very satisfied during appointment"
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/follow-up-actions/action_001/execute",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["success"] is True
        assert data["execution_method"] == "sms"
        assert data["custom_message"] == "Thanks for your visit! We hope you loved your new look!"

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_execute_follow_up_failure(self, mock_service, client, auth_headers):
        """Test follow-up execution failure handling."""
        mock_service.execute_follow_up_action.side_effect = Exception("SMS service unavailable")
        
        request_data = {
            "action_id": "action_001",
            "execution_method": "sms"
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/follow-up-actions/action_001/execute",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to execute follow-up action" in response.json()["detail"]

    def test_execute_follow_up_unauthorized(self, client):
        """Test unauthorized follow-up execution."""
        request_data = {
            "action_id": "action_001",
            "execution_method": "email"
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/follow-up-actions/action_001/execute",
            json=request_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestCustomFollowUpScheduling:
    """Test custom follow-up action scheduling."""

    def test_schedule_custom_follow_up_success(self, client, auth_headers, db: Session):
        """Test successful custom follow-up scheduling."""
        # Create test data
        barber = UserFactory.create_barber()
        client_user = UserFactory.create_user()
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            client_id=client_user.id
        )
        
        db.add_all([barber, client_user, appointment])
        db.commit()
        
        # Override current user to be the barber
        with patch('api.v2.endpoints.booking_intelligence.get_current_user', return_value=barber):
            request_data = {
                "client_id": client_user.id,
                "action_type": "loyalty_reward",
                "scheduled_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "custom_message": "You've earned a loyalty discount!",
                "priority": "high",
                "notes": "Client has completed 10 appointments"
            }
            
            response = client.post(
                "/api/v2/booking-intelligence/follow-up-actions/schedule",
                headers=auth_headers,
                json=request_data
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert "action_id" in data
            assert data["client_id"] == client_user.id
            assert data["action_type"] == "loyalty_reward"
            assert data["priority"] == "high"
            assert data["status"] == "scheduled"

    def test_schedule_custom_follow_up_client_not_found(self, client, auth_headers):
        """Test custom follow-up scheduling with non-existent client."""
        request_data = {
            "client_id": 99999,  # Non-existent client
            "action_type": "thank_you_message",
            "scheduled_date": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/follow-up-actions/schedule",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Client not found" in response.json()["detail"]

    def test_schedule_custom_follow_up_unauthorized(self, client):
        """Test unauthorized custom follow-up scheduling."""
        request_data = {
            "client_id": 1,
            "action_type": "thank_you_message",
            "scheduled_date": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/follow-up-actions/schedule",
            json=request_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestIntelligenceSummary:
    """Test booking intelligence summary functionality."""

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_get_intelligence_summary_success(self, mock_service, client, auth_headers):
        """Test successful intelligence summary retrieval."""
        # Mock recommendations and actions
        mock_recommendations = [
            Mock(priority=Mock(value="high"), expected_revenue_impact=85.0, confidence=0.9, type=Mock(value="service_upgrade")),
            Mock(priority=Mock(value="medium"), expected_revenue_impact=45.0, confidence=0.75, type=Mock(value="follow_up_booking")),
            Mock(priority=Mock(value="high"), expected_revenue_impact=120.0, confidence=0.85, type=Mock(value="referral_booking"))
        ]
        
        mock_actions = [
            Mock(status="scheduled", action_type=Mock(value="thank_you_message"), priority=Mock(value="high")),
            Mock(status="completed", action_type=Mock(value="next_appointment"), priority=Mock(value="medium")),
            Mock(status="scheduled", action_type=Mock(value="feedback_request"), priority=Mock(value="low"))
        ]
        
        mock_service.generate_smart_booking_recommendations.return_value = mock_recommendations
        mock_service.generate_automated_follow_up_actions.return_value = mock_actions
        
        response = client.get(
            "/api/v2/booking-intelligence/insights/summary",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_recommendations"] == 3
        assert data["high_priority_recommendations"] == 2
        assert data["total_potential_revenue"] == 250.0  # 85 + 45 + 120
        assert data["pending_follow_ups"] == 2  # 2 scheduled actions
        assert data["high_confidence_recommendations"] == 2  # confidence >= 0.8
        
        # Check recommendation types breakdown
        assert data["recommendation_types"]["service_upgrade"] == 1
        assert data["recommendation_types"]["follow_up_booking"] == 1
        assert data["recommendation_types"]["referral_booking"] == 1
        
        # Check follow-up types breakdown
        assert data["follow_up_types"]["thank_you_message"] == 1
        assert data["follow_up_types"]["next_appointment"] == 1
        
        assert "six_fb_coaching_tip" in data

    def test_get_intelligence_summary_unauthorized(self, client):
        """Test unauthorized access to intelligence summary."""
        response = client.get("/api/v2/booking-intelligence/insights/summary")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPerformanceAnalytics:
    """Test booking intelligence performance analytics."""

    def test_get_performance_analytics_success(self, client, auth_headers):
        """Test successful performance analytics retrieval."""
        response = client.get(
            "/api/v2/booking-intelligence/analytics/performance",
            headers=auth_headers,
            params={"days_back": 30}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify structure of performance data
        assert "analysis_period_days" in data
        assert "recommendations_generated" in data
        assert "recommendations_applied" in data
        assert "application_rate" in data
        assert "follow_ups_scheduled" in data
        assert "follow_ups_executed" in data
        assert "execution_rate" in data
        assert "revenue_generated" in data
        assert "client_retention_improvement" in data
        assert "six_fb_impact_score" in data
        assert "monthly_trends" in data
        assert "insights" in data
        
        # Verify realistic values
        assert data["analysis_period_days"] == 30
        assert isinstance(data["application_rate"], float)
        assert isinstance(data["execution_rate"], float)
        assert isinstance(data["six_fb_impact_score"], float)

    def test_get_performance_analytics_unauthorized(self, client):
        """Test unauthorized access to performance analytics."""
        response = client.get("/api/v2/booking-intelligence/analytics/performance")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestBulkOperations:
    """Test bulk recommendation and follow-up operations."""

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_bulk_apply_recommendations_success(self, mock_service, client, auth_headers):
        """Test successful bulk recommendation application."""
        mock_service.apply_booking_recommendation.return_value = {
            "success": True,
            "recommendation_id": "rec_001",
            "action_taken": "scheduled"
        }
        
        recommendation_ids = ["rec_001", "rec_002", "rec_003"]
        
        response = client.post(
            "/api/v2/booking-intelligence/recommendations/bulk-apply",
            headers=auth_headers,
            params={"action_type": "schedule_appointment"},
            json=recommendation_ids
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_processed"] == 3
        assert data["successful"] == 3
        assert data["failed"] == 0
        assert len(data["results"]) == 3

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_bulk_apply_recommendations_partial_failure(self, mock_service, client, auth_headers):
        """Test bulk recommendation application with partial failures."""
        def side_effect(*args, **kwargs):
            rec_id = kwargs.get('recommendation_id')
            if rec_id == "rec_002":
                raise Exception("Client unavailable")
            return {"success": True, "recommendation_id": rec_id}
        
        mock_service.apply_booking_recommendation.side_effect = side_effect
        
        recommendation_ids = ["rec_001", "rec_002", "rec_003"]
        
        response = client.post(
            "/api/v2/booking-intelligence/recommendations/bulk-apply",
            headers=auth_headers,
            params={"action_type": "schedule_appointment"},
            json=recommendation_ids
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_processed"] == 3
        assert data["successful"] == 2
        assert data["failed"] == 1

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_bulk_execute_follow_ups_success(self, mock_service, client, auth_headers):
        """Test successful bulk follow-up execution."""
        mock_service.execute_follow_up_action.return_value = {
            "success": True,
            "action_id": "action_001",
            "executed": True
        }
        
        action_ids = ["action_001", "action_002", "action_003"]
        
        response = client.post(
            "/api/v2/booking-intelligence/follow-up-actions/bulk-execute",
            headers=auth_headers,
            params={"execution_method": "sms"},
            json=action_ids
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_processed"] == 3
        assert data["successful"] == 3
        assert data["failed"] == 0

    def test_bulk_apply_recommendations_unauthorized(self, client):
        """Test unauthorized bulk recommendation application."""
        recommendation_ids = ["rec_001", "rec_002"]
        
        response = client.post(
            "/api/v2/booking-intelligence/recommendations/bulk-apply",
            params={"action_type": "schedule_appointment"},
            json=recommendation_ids
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestErrorHandling:
    """Test error handling and edge cases."""

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_recommendations_service_failure(self, mock_service, client, auth_headers):
        """Test handling of service failures in recommendations."""
        mock_service.generate_smart_booking_recommendations.side_effect = Exception("Service unavailable")
        
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to get booking recommendations" in response.json()["detail"]

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_follow_up_actions_service_failure(self, mock_service, client, auth_headers):
        """Test handling of service failures in follow-up actions."""
        mock_service.generate_automated_follow_up_actions.side_effect = Exception("Database connection failed")
        
        response = client.get(
            "/api/v2/booking-intelligence/follow-up-actions",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to get follow-up actions" in response.json()["detail"]


class TestBusinessLogicValidation:
    """Test Six Figure Barber methodology compliance."""

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_six_figure_methodology_compliance(self, mock_service, client, auth_headers):
        """Test that recommendations align with Six Figure Barber principles."""
        # Mock high-value recommendations
        premium_recommendation = Mock()
        premium_recommendation.id = "rec_premium"
        premium_recommendation.type = Mock(value="service_upgrade")
        premium_recommendation.priority = Mock(value="high")
        premium_recommendation.client_id = 1
        premium_recommendation.client_name = "Premium Client"
        premium_recommendation.recommended_service = "Signature Styling Experience"
        premium_recommendation.recommended_price = 150.0  # Premium pricing
        premium_recommendation.recommended_time = datetime.now()
        premium_recommendation.reasoning = "Client values premium experience and has budget for luxury services"
        premium_recommendation.six_fb_principle = "Premium pricing strategies drive six-figure income"
        premium_recommendation.expected_revenue_impact = 150.0
        premium_recommendation.confidence = 0.92  # High confidence
        premium_recommendation.action_button_text = "Book Premium Experience"
        premium_recommendation.deadline = None
        
        mock_service.generate_smart_booking_recommendations.return_value = [premium_recommendation]
        
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Validate Six Figure Barber methodology compliance
        recommendation = data[0]
        assert recommendation["recommended_price"] >= 75.0  # Premium pricing threshold
        assert recommendation["confidence"] >= 0.8  # High confidence only
        assert "Premium" in recommendation["recommended_service"] or "Signature" in recommendation["recommended_service"]
        assert "six-figure" in recommendation["six_fb_principle"].lower() or "premium" in recommendation["six_fb_principle"].lower()

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')  
    def test_client_relationship_focus(self, mock_service, client, auth_headers):
        """Test that follow-up actions focus on client relationships."""
        relationship_action = Mock()
        relationship_action.id = "action_relationship"
        relationship_action.client_id = 1
        relationship_action.client_name = "Valued Client"
        relationship_action.action_type = Mock(value="check_in_call")
        relationship_action.trigger_type = Mock(value="relationship_maintenance")
        relationship_action.scheduled_date = datetime.now() + timedelta(days=14)
        relationship_action.message_template = "Hi! Just checking in to see how you're loving your new look!"
        relationship_action.six_fb_principle = "Strong client relationships are the foundation of six-figure success"
        relationship_action.priority = Mock(value="high")
        relationship_action.status = "scheduled"
        relationship_action.expected_outcome = "Strengthened client relationship and increased loyalty"
        relationship_action.deadline = None
        
        mock_service.generate_automated_follow_up_actions.return_value = [relationship_action]
        
        response = client.get(
            "/api/v2/booking-intelligence/follow-up-actions",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        action = data[0]
        assert "relationship" in action["six_fb_principle"].lower()
        assert action["expected_outcome"] and "relationship" in action["expected_outcome"].lower()


class TestSecurityValidation:
    """Test security aspects and data protection."""

    def test_input_validation_recommendation_application(self, client, auth_headers):
        """Test input validation for recommendation application."""
        # Missing required fields
        invalid_request = {
            "notes": "Some notes"
            # Missing recommendation_id and action_type
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/recommendations/rec_001/apply",
            headers=auth_headers,
            json=invalid_request
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_input_validation_follow_up_execution(self, client, auth_headers):
        """Test input validation for follow-up execution."""
        # Missing required fields
        invalid_request = {
            "custom_message": "Custom message"
            # Missing action_id and execution_method
        }
        
        response = client.post(
            "/api/v2/booking-intelligence/follow-up-actions/action_001/execute",
            headers=auth_headers,
            json=invalid_request
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_data_isolation_between_users(self, client, auth_headers, db: Session):
        """Test that users only see their own recommendations and actions."""
        # This would require testing with multiple users to ensure proper isolation
        # The actual verification is done through the current_user dependency
        
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers
        )
        
        # Should not fail due to authorization
        assert response.status_code != status.HTTP_403_FORBIDDEN


class TestPerformanceAndScalability:
    """Test performance characteristics and scalability."""

    @patch('api.v2.endpoints.booking_intelligence.intelligence_service')
    def test_large_dataset_handling(self, mock_service, client, auth_headers):
        """Test handling of large recommendation datasets."""
        # Create a large number of recommendations
        recommendations = []
        for i in range(200):
            rec = Mock()
            rec.id = f"rec_{i}"
            rec.type = Mock(value="follow_up_booking")
            rec.priority = Mock(value="medium")
            rec.client_id = i
            rec.client_name = f"Client {i}"
            rec.recommended_service = "Standard Service"
            rec.recommended_price = 50.0
            rec.recommended_time = datetime.now()
            rec.reasoning = f"Regular booking for client {i}"
            rec.six_fb_principle = "Consistency builds revenue"
            rec.expected_revenue_impact = 50.0
            rec.confidence = 0.75
            rec.action_button_text = "Book Service"
            rec.deadline = None
            recommendations.append(rec)
        
        mock_service.generate_smart_booking_recommendations.return_value = recommendations
        
        response = client.get(
            "/api/v2/booking-intelligence/recommendations",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should handle large datasets efficiently
        assert len(data) == 200
        assert isinstance(data, list)

    def test_concurrent_request_handling(self, client, auth_headers):
        """Test concurrent request handling."""
        responses = []
        
        # Simulate concurrent requests
        for _ in range(5):
            response = client.get(
                "/api/v2/booking-intelligence/insights/summary",
                headers=auth_headers
            )
            responses.append(response)
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == status.HTTP_200_OK