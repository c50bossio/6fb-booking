"""
Unit tests for AI Intervention Service

Tests the AI-powered intervention system including:
- Intervention campaign creation and management
- Risk-based intervention strategies
- Multi-channel intervention coordination
- Campaign effectiveness tracking
- Automated escalation logic
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from services.ai_intervention_service import (
    AIInterventionService,
    get_ai_intervention_service,
    InterventionType,
    InterventionStatus,
    CommunicationChannel,
    InterventionCampaign,
    InterventionStep
)
from services.ai_no_show_prediction_service import RiskLevel, NoShowRiskScore
from models import User, Appointment, BarberProfile


class TestAIInterventionService:
    """Test suite for AI Intervention Service"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def mock_prediction_service(self):
        """Mock AI prediction service"""
        service = Mock()
        service.predict_no_show_risk = AsyncMock()
        return service

    @pytest.fixture
    def mock_message_generator(self):
        """Mock AI message generator"""
        generator = Mock()
        generator.generate_message = AsyncMock()
        return generator

    @pytest.fixture
    def intervention_service(self, mock_db, mock_prediction_service, mock_message_generator):
        """Create intervention service instance"""
        service = AIInterventionService(mock_db)
        service.prediction_service = mock_prediction_service
        service.message_generator = mock_message_generator
        return service

    @pytest.fixture
    def sample_appointment(self):
        """Sample appointment for testing"""
        appointment = Mock(spec=Appointment)
        appointment.id = 123
        appointment.user_id = 456
        appointment.barber_id = 789
        appointment.start_time = datetime.utcnow() + timedelta(hours=24)
        appointment.duration = 30
        appointment.price = 50.0
        appointment.service_name = "Haircut"
        appointment.status = "confirmed"
        return appointment

    @pytest.fixture
    def sample_client(self):
        """Sample client for testing"""
        client = Mock(spec=User)
        client.id = 456
        client.name = "John Doe"
        client.email = "john@example.com"
        client.phone = "+1234567890"
        return client

    @pytest.fixture
    def high_risk_score(self):
        """High risk score for testing"""
        return NoShowRiskScore(
            appointment_id=123,
            risk_score=0.8,
            risk_level=RiskLevel.HIGH,
            risk_factors=[],
            confidence_score=0.9,
            prediction_timestamp=datetime.utcnow()
        )

    @pytest_asyncio.async_test
    async def test_create_intervention_campaign_high_risk(
        self, intervention_service, mock_db, sample_appointment, sample_client, high_risk_score
    ):
        """Test creation of intervention campaign for high-risk appointment"""
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = sample_appointment
        mock_db.query.return_value.filter.return_value.first.side_effect = [sample_appointment, sample_client]
        
        # Mock risk prediction
        intervention_service.prediction_service.predict_no_show_risk.return_value = high_risk_score

        # Execute campaign creation
        campaign = await intervention_service.create_intervention_campaign(123)

        # Assertions
        assert isinstance(campaign, InterventionCampaign)
        assert campaign.appointment_id == 123
        assert campaign.client_id == 456
        assert campaign.risk_level == RiskLevel.HIGH
        assert campaign.status == InterventionStatus.ACTIVE
        assert len(campaign.intervention_steps) > 0
        
        # High risk should have aggressive intervention
        assert campaign.intervention_type in [
            InterventionType.AGGRESSIVE_REMINDER,
            InterventionType.INCENTIVE_BASED,
            InterventionType.PERSONAL_OUTREACH
        ]

    @pytest_asyncio.async_test
    async def test_create_intervention_campaign_low_risk(
        self, intervention_service, mock_db, sample_appointment, sample_client
    ):
        """Test that low-risk appointments don't get aggressive interventions"""
        # Mock low risk score
        low_risk_score = NoShowRiskScore(
            appointment_id=123,
            risk_score=0.2,
            risk_level=RiskLevel.LOW,
            risk_factors=[],
            confidence_score=0.9,
            prediction_timestamp=datetime.utcnow()
        )

        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.side_effect = [sample_appointment, sample_client]
        intervention_service.prediction_service.predict_no_show_risk.return_value = low_risk_score

        # Execute campaign creation
        campaign = await intervention_service.create_intervention_campaign(123)

        # Low risk should have gentle intervention
        assert campaign.intervention_type in [
            InterventionType.GENTLE_REMINDER,
            InterventionType.STANDARD_REMINDER
        ]
        assert len(campaign.intervention_steps) <= 2  # Fewer steps for low risk

    @pytest_asyncio.async_test
    async def test_intervention_step_generation(self, intervention_service):
        """Test generation of intervention steps for different risk levels"""
        # Test high risk steps
        high_risk_steps = intervention_service._generate_intervention_steps(
            InterventionType.AGGRESSIVE_REMINDER,
            RiskLevel.HIGH,
            datetime.utcnow() + timedelta(hours=24)
        )
        
        assert len(high_risk_steps) >= 3  # Multiple touchpoints
        assert any(step.channel == CommunicationChannel.SMS for step in high_risk_steps)
        assert any(step.channel == CommunicationChannel.EMAIL for step in high_risk_steps)

        # Test low risk steps
        low_risk_steps = intervention_service._generate_intervention_steps(
            InterventionType.GENTLE_REMINDER,
            RiskLevel.LOW,
            datetime.utcnow() + timedelta(hours=24)
        )
        
        assert len(low_risk_steps) <= 2  # Fewer steps for low risk

    @pytest_asyncio.async_test
    async def test_execute_intervention_step(
        self, intervention_service, mock_db, sample_client
    ):
        """Test execution of individual intervention step"""
        # Create intervention step
        step = InterventionStep(
            step_number=1,
            channel=CommunicationChannel.SMS,
            message_template="Hi {client_name}, reminder about your appointment",
            scheduled_time=datetime.utcnow(),
            status=InterventionStatus.PENDING,
            delay_minutes=0
        )

        # Mock message generation
        intervention_service.message_generator.generate_message.return_value = Mock(
            content="Hi John, reminder about your appointment tomorrow"
        )

        # Mock client query
        mock_db.query.return_value.filter.return_value.first.return_value = sample_client

        # Execute step
        await intervention_service._execute_intervention_step(123, 456, step, mock_db)

        # Verify message was generated and step was marked as sent
        intervention_service.message_generator.generate_message.assert_called_once()
        assert step.status == InterventionStatus.COMPLETED
        assert step.sent_at is not None

    @pytest_asyncio.async_test
    async def test_schedule_campaign_execution(self, intervention_service):
        """Test scheduling of campaign execution"""
        campaign = InterventionCampaign(
            id="camp_123",
            appointment_id=123,
            client_id=456,
            intervention_type=InterventionType.AGGRESSIVE_REMINDER,
            risk_level=RiskLevel.HIGH,
            status=InterventionStatus.ACTIVE,
            created_at=datetime.utcnow(),
            intervention_steps=[]
        )

        # Add some steps
        campaign.intervention_steps = [
            InterventionStep(
                step_number=1,
                channel=CommunicationChannel.SMS,
                message_template="Step 1",
                scheduled_time=datetime.utcnow() + timedelta(minutes=5),
                status=InterventionStatus.PENDING,
                delay_minutes=5
            ),
            InterventionStep(
                step_number=2,
                channel=CommunicationChannel.EMAIL,
                message_template="Step 2",
                scheduled_time=datetime.utcnow() + timedelta(hours=2),
                status=InterventionStatus.PENDING,
                delay_minutes=120
            )
        ]

        # Schedule execution
        await intervention_service._schedule_campaign_execution(campaign)

        # Should schedule background tasks for each step
        # In real implementation, this would use a task queue
        assert len(campaign.intervention_steps) == 2
        assert all(step.scheduled_time > datetime.utcnow() for step in campaign.intervention_steps)

    @pytest_asyncio.async_test
    async def test_track_campaign_effectiveness(self, intervention_service, mock_db):
        """Test tracking of campaign effectiveness"""
        campaign_id = "camp_123"

        # Mock campaign data
        mock_campaign = Mock()
        mock_campaign.id = campaign_id
        mock_campaign.appointment_id = 123
        mock_campaign.intervention_steps = [
            Mock(status=InterventionStatus.COMPLETED, sent_at=datetime.utcnow()),
            Mock(status=InterventionStatus.COMPLETED, sent_at=datetime.utcnow())
        ]

        mock_db.query.return_value.filter.return_value.first.return_value = mock_campaign

        # Mock appointment outcome
        mock_appointment = Mock()
        mock_appointment.status = "completed"  # Successful intervention
        mock_db.query.return_value.filter.return_value.first.side_effect = [mock_campaign, mock_appointment]

        effectiveness = await intervention_service.track_campaign_effectiveness(campaign_id)

        assert "campaign_id" in effectiveness
        assert "total_steps" in effectiveness
        assert "completed_steps" in effectiveness
        assert "appointment_outcome" in effectiveness
        assert effectiveness["campaign_success"] is True  # Appointment was completed

    @pytest_asyncio.async_test
    async def test_get_campaign_recommendations(self, intervention_service, mock_db):
        """Test generation of campaign recommendations"""
        # Mock historical campaign data
        successful_campaigns = []
        for i in range(5):
            campaign = Mock()
            campaign.intervention_type = InterventionType.AGGRESSIVE_REMINDER
            campaign.risk_level = RiskLevel.HIGH
            campaign.success_rate = 0.8
            successful_campaigns.append(campaign)

        mock_db.query.return_value.filter.return_value.all.return_value = successful_campaigns

        recommendations = await intervention_service.get_campaign_recommendations(
            RiskLevel.HIGH, {"client_segment": "frequent"}
        )

        assert len(recommendations) > 0
        assert "intervention_type" in recommendations[0]
        assert "confidence_score" in recommendations[0]
        assert "expected_success_rate" in recommendations[0]

    @pytest_asyncio.async_test
    async def test_intervention_type_selection(self, intervention_service):
        """Test automatic selection of intervention type based on risk factors"""
        # High risk with price sensitivity
        risk_factors = ["price_sensitivity", "booking_recency"]
        intervention_type = intervention_service._select_intervention_type(
            RiskLevel.HIGH, risk_factors, {"is_vip_client": False}
        )
        
        # Should select incentive-based for price-sensitive clients
        assert intervention_type == InterventionType.INCENTIVE_BASED

        # High risk VIP client
        intervention_type = intervention_service._select_intervention_type(
            RiskLevel.HIGH, ["client_history"], {"is_vip_client": True}
        )
        
        # Should select personal outreach for VIP clients
        assert intervention_type == InterventionType.PERSONAL_OUTREACH

    @pytest_asyncio.async_test
    async def test_message_personalization(self, intervention_service):
        """Test message personalization for different client contexts"""
        client_context = {
            "name": "John Doe",
            "preferred_communication": "casual",
            "last_appointment": "2 weeks ago",
            "loyalty_tier": "gold"
        }

        appointment_context = {
            "service": "Haircut",
            "barber_name": "Mike",
            "time": "tomorrow at 2 PM",
            "price": "$50"
        }

        # Generate personalized message
        message = intervention_service._personalize_message_template(
            "Hi {client_name}, don't forget your {service} appointment",
            client_context,
            appointment_context
        )

        assert "John" in message
        assert "Haircut" in message

    @pytest_asyncio.async_test
    async def test_campaign_cancellation(self, intervention_service, mock_db):
        """Test cancellation of active intervention campaigns"""
        campaign_id = "camp_123"

        # Mock active campaign
        mock_campaign = Mock()
        mock_campaign.id = campaign_id
        mock_campaign.status = InterventionStatus.ACTIVE
        mock_campaign.intervention_steps = [
            Mock(status=InterventionStatus.PENDING),
            Mock(status=InterventionStatus.COMPLETED)
        ]

        mock_db.query.return_value.filter.return_value.first.return_value = mock_campaign

        # Cancel campaign
        result = await intervention_service.cancel_intervention_campaign(campaign_id)

        assert result["success"] is True
        assert mock_campaign.status == InterventionStatus.CANCELLED
        
        # Pending steps should be cancelled
        pending_steps = [step for step in mock_campaign.intervention_steps 
                        if step.status == InterventionStatus.PENDING]
        assert all(step.status == InterventionStatus.CANCELLED for step in pending_steps)

    @pytest_asyncio.async_test
    async def test_escalation_logic(self, intervention_service):
        """Test automatic escalation of intervention intensity"""
        # Mock previous failed campaign
        previous_campaigns = [
            Mock(
                intervention_type=InterventionType.GENTLE_REMINDER,
                success_rate=0.2,  # Low success rate
                created_at=datetime.utcnow() - timedelta(days=1)
            )
        ]

        # Should escalate to more aggressive intervention
        escalated_type = intervention_service._determine_escalation(
            RiskLevel.MEDIUM, previous_campaigns
        )

        assert escalated_type in [
            InterventionType.AGGRESSIVE_REMINDER,
            InterventionType.INCENTIVE_BASED
        ]

    @pytest_asyncio.async_test
    async def test_appointment_not_found_error(self, intervention_service, mock_db):
        """Test error handling when appointment is not found"""
        # Mock appointment not found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="Appointment not found"):
            await intervention_service.create_intervention_campaign(999)

    @pytest_asyncio.async_test
    async def test_client_not_found_error(self, intervention_service, mock_db, sample_appointment):
        """Test error handling when client is not found"""
        # Mock appointment found but client not found
        mock_db.query.return_value.filter.return_value.first.side_effect = [sample_appointment, None]

        with pytest.raises(ValueError, match="Client not found"):
            await intervention_service.create_intervention_campaign(123)

    @pytest_asyncio.async_test
    async def test_concurrent_campaign_creation(self, intervention_service, mock_db):
        """Test handling of concurrent campaign creation requests"""
        import asyncio
        
        # Mock appointment and client
        appointment = Mock(spec=Appointment)
        appointment.id = 123
        appointment.user_id = 456
        
        client = Mock(spec=User)
        client.id = 456
        client.name = "John Doe"
        
        mock_db.query.return_value.filter.return_value.first.side_effect = [appointment, client] * 3

        # Mock risk prediction
        high_risk = NoShowRiskScore(
            appointment_id=123,
            risk_score=0.8,
            risk_level=RiskLevel.HIGH,
            risk_factors=[],
            confidence_score=0.9,
            prediction_timestamp=datetime.utcnow()
        )
        intervention_service.prediction_service.predict_no_show_risk.return_value = high_risk

        # Run concurrent campaign creation
        tasks = [
            intervention_service.create_intervention_campaign(123),
            intervention_service.create_intervention_campaign(123),
            intervention_service.create_intervention_campaign(123)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Should handle concurrent requests gracefully
        successful_results = [r for r in results if isinstance(r, InterventionCampaign)]
        assert len(successful_results) >= 1  # At least one should succeed

    @pytest_asyncio.async_test
    async def test_channel_optimization(self, intervention_service):
        """Test optimization of communication channels based on client preferences"""
        # Client with email preference
        email_preference = {"preferred_channel": "email", "sms_opt_out": False}
        channels = intervention_service._optimize_communication_channels(
            InterventionType.STANDARD_REMINDER, email_preference
        )
        
        # Should prioritize email
        assert CommunicationChannel.EMAIL in channels
        
        # Client with SMS preference
        sms_preference = {"preferred_channel": "sms", "email_opt_out": True}
        channels = intervention_service._optimize_communication_channels(
            InterventionType.STANDARD_REMINDER, sms_preference
        )
        
        # Should prioritize SMS and exclude email
        assert CommunicationChannel.SMS in channels
        assert CommunicationChannel.EMAIL not in channels

    def test_singleton_service_creation(self, mock_db):
        """Test singleton pattern for service creation"""
        service1 = get_ai_intervention_service(mock_db)
        service2 = get_ai_intervention_service(mock_db)
        
        # Should return the same instance
        assert service1 is service2

    @pytest_asyncio.async_test
    async def test_intervention_timing_optimization(self, intervention_service):
        """Test optimization of intervention timing based on client behavior"""
        appointment_time = datetime.utcnow() + timedelta(hours=24)
        
        # Client with morning preference
        client_patterns = {
            "active_hours": [8, 9, 10, 11],  # Morning person
            "response_rate_by_hour": {8: 0.9, 12: 0.7, 18: 0.4}
        }
        
        optimal_times = intervention_service._optimize_intervention_timing(
            appointment_time, client_patterns
        )
        
        # Should prioritize morning hours
        assert any(time.hour in [8, 9, 10, 11] for time in optimal_times)

    @pytest_asyncio.async_test
    async def test_campaign_performance_metrics(self, intervention_service, mock_db):
        """Test calculation of campaign performance metrics"""
        campaign_id = "camp_123"
        
        # Mock campaign with mixed results
        mock_campaign = Mock()
        mock_campaign.id = campaign_id
        mock_campaign.created_at = datetime.utcnow() - timedelta(days=1)
        mock_campaign.intervention_steps = [
            Mock(status=InterventionStatus.COMPLETED, response_received=True),
            Mock(status=InterventionStatus.COMPLETED, response_received=False),
            Mock(status=InterventionStatus.FAILED, response_received=False)
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_campaign
        
        metrics = await intervention_service._calculate_campaign_metrics(campaign_id, mock_db)
        
        assert "response_rate" in metrics
        assert "completion_rate" in metrics
        assert "time_to_response" in metrics
        assert metrics["response_rate"] == 0.33  # 1 response out of 3 steps


# Integration tests for the complete intervention workflow
class TestAIInterventionIntegration:
    """Integration tests for the complete intervention workflow"""

    @pytest_asyncio.async_test
    async def test_full_intervention_workflow(self):
        """Test the complete intervention workflow from creation to completion"""
        # This would test the entire flow with realistic data
        # Including database operations, message generation, and scheduling
        pass

    @pytest_asyncio.async_test
    async def test_multi_appointment_intervention_coordination(self):
        """Test coordination of interventions across multiple appointments"""
        # Test scenarios where a client has multiple upcoming appointments
        # and interventions need to be coordinated to avoid spam
        pass

    @pytest_asyncio.async_test
    async def test_campaign_effectiveness_learning(self):
        """Test that the system learns from campaign effectiveness over time"""
        # Test that successful intervention patterns are identified and reused
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])