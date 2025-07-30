"""
Comprehensive tests for Business Intelligence services

Tests cover:
- Enhanced Google Calendar service
- Business calendar metadata service
- Agent orchestration service
- Analytics service
- Integration services
- Error handling
- Performance
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from models import User, Appointment, Client, Agent, AgentInstance
from services.enhanced_google_calendar_service import EnhancedGoogleCalendarService
from services.business_calendar_metadata_service import BusinessCalendarMetadataService
from services.agent_orchestration_service import agent_orchestration_service
from services.analytics_service import AnalyticsService


class TestEnhancedGoogleCalendarService:
    """Test suite for Enhanced Google Calendar Service"""

    @pytest.fixture
    def service(self, db: Session):
        """Create service instance"""
        return EnhancedGoogleCalendarService(db)

    @pytest.fixture
    def sample_appointments(self, db: Session, test_user: User):
        """Create sample appointments for testing"""
        client = Client(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="555-1234"
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        
        appointments = []
        base_time = datetime.utcnow()
        
        for i in range(10):
            appointment = Appointment(
                client_id=client.id,
                barber_id=test_user.id,
                service_name=f"Service {i}",
                start_time=base_time - timedelta(days=i),
                end_time=base_time - timedelta(days=i) + timedelta(hours=1),
                price=50.0 + i * 10,
                status="confirmed"
            )
            appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        for apt in appointments:
            db.refresh(apt)
        
        return appointments

    def test_get_business_insights_for_period_success(
        self,
        service: EnhancedGoogleCalendarService,
        test_user: User,
        sample_appointments: list
    ):
        """Test successful business insights generation"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        insights = service.get_business_insights_for_period(
            user=test_user,
            start_date=start_date,
            end_date=end_date
        )
        
        assert insights is not None
        assert "total_appointments" in insights
        assert "total_revenue" in insights
        assert "average_service_price" in insights
        assert "service_tier_distribution" in insights
        assert "client_value_distribution" in insights
        assert "coaching_opportunities" in insights
        assert "optimization_recommendations" in insights
        assert "six_fb_compliance_average" in insights
        
        # Verify calculated values
        assert insights["total_appointments"] == len(sample_appointments)
        expected_revenue = sum(apt.price for apt in sample_appointments)
        assert insights["total_revenue"] == expected_revenue
        assert insights["average_service_price"] == expected_revenue / len(sample_appointments)

    def test_get_business_insights_no_appointments(
        self,
        service: EnhancedGoogleCalendarService,
        test_user: User
    ):
        """Test business insights when no appointments exist"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        insights = service.get_business_insights_for_period(
            user=test_user,
            start_date=start_date,
            end_date=end_date
        )
        
        assert insights is not None
        assert insights["total_appointments"] == 0
        assert insights["total_revenue"] == 0.0
        assert insights["average_service_price"] == 0.0

    def test_get_six_figure_barber_compliance_report_success(
        self,
        service: EnhancedGoogleCalendarService,
        test_user: User,
        sample_appointments: list
    ):
        """Test successful Six Figure Barber compliance report generation"""
        report = service.get_six_figure_barber_compliance_report(test_user)
        
        assert report is not None
        assert "average_compliance_score" in report
        assert "total_appointments_analyzed" in report
        assert "service_tier_distribution" in report
        assert "recommendations" in report
        assert "compliance_grade" in report
        assert "report_period" in report
        
        # Verify report structure
        assert isinstance(report["recommendations"], list)
        assert report["total_appointments_analyzed"] > 0
        assert 0 <= report["average_compliance_score"] <= 100

    def test_calculate_compliance_score(
        self,
        service: EnhancedGoogleCalendarService
    ):
        """Test compliance score calculation logic"""
        # Test high-value appointment
        high_value_score = service._calculate_six_fb_compliance_score(
            service_name="Premium Haircut",
            price=85.0,
            client_tier="premium"
        )
        
        # Test low-value appointment
        low_value_score = service._calculate_six_fb_compliance_score(
            service_name="Basic Cut",
            price=25.0,
            client_tier="basic"
        )
        
        assert high_value_score > low_value_score
        assert 0 <= high_value_score <= 100
        assert 0 <= low_value_score <= 100

    def test_generate_optimization_recommendations(
        self,
        service: EnhancedGoogleCalendarService,
        sample_appointments: list
    ):
        """Test optimization recommendations generation"""
        recommendations = service._generate_optimization_recommendations(sample_appointments)
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        
        for recommendation in recommendations:
            assert isinstance(recommendation, str)
            assert len(recommendation) > 0

    @patch('services.enhanced_google_calendar_service.google_calendar_service')
    def test_sync_appointment_to_google_with_business_intelligence_success(
        self,
        mock_google_service: Mock,
        service: EnhancedGoogleCalendarService,
        sample_appointments: list
    ):
        """Test successful appointment sync with business intelligence"""
        mock_google_service.create_event.return_value = "google_event_123"
        
        appointment = sample_appointments[0]
        google_event_id = service.sync_appointment_to_google_with_business_intelligence(
            appointment=appointment,
            include_business_metadata=True
        )
        
        assert google_event_id == "google_event_123"
        mock_google_service.create_event.assert_called_once()

    def test_generate_calendar_specific_insights(
        self,
        service: EnhancedGoogleCalendarService,
        test_user: User,
        sample_appointments: list
    ):
        """Test calendar-specific insights generation"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        insights = service._generate_calendar_specific_insights(
            user=test_user,
            start_date=start_date,
            end_date=end_date
        )
        
        assert insights is not None
        assert "calendar_utilization_rate" in insights
        assert "peak_hour" in insights
        assert "peak_day" in insights
        assert "available_slots" in insights
        
        # Verify data types
        assert isinstance(insights["calendar_utilization_rate"], (int, float))
        assert isinstance(insights["available_slots"], int)

    def test_trigger_ai_coaching_from_calendar_patterns(
        self,
        service: EnhancedGoogleCalendarService,
        test_user: User,
        sample_appointments: list
    ):
        """Test AI coaching trigger from calendar patterns"""
        triggered_sessions = service.trigger_ai_coaching_from_calendar_patterns(test_user)
        
        assert isinstance(triggered_sessions, list)
        
        for session in triggered_sessions:
            assert "type" in session
            assert "message" in session
            assert isinstance(session["type"], str)
            assert isinstance(session["message"], str)

    def test_enable_smart_calendar_coaching(
        self,
        service: EnhancedGoogleCalendarService,
        test_user: User
    ):
        """Test smart calendar coaching enablement"""
        result = service.enable_smart_calendar_coaching(test_user)
        
        # Should always return True as this is a feature flag
        assert result is True


class TestBusinessCalendarMetadataService:
    """Test suite for Business Calendar Metadata Service"""

    @pytest.fixture
    def service(self, db: Session):
        """Create service instance"""
        return BusinessCalendarMetadataService(db)

    @pytest.fixture
    def sample_appointment(self, db: Session, test_user: User):
        """Create sample appointment"""
        client = Client(
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
            phone="555-5678"
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        
        appointment = Appointment(
            client_id=client.id,
            barber_id=test_user.id,
            service_name="Premium Haircut",
            start_time=datetime.utcnow() + timedelta(hours=2),
            end_time=datetime.utcnow() + timedelta(hours=3),
            price=85.0,
            status="confirmed"
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        
        return appointment

    def test_get_business_insights_success(
        self,
        service: BusinessCalendarMetadataService,
        test_user: User
    ):
        """Test successful business insights retrieval"""
        insights = service.get_business_insights(test_user.id, days_back=30)
        
        assert insights is not None
        assert isinstance(insights, dict)
        
        # Verify expected keys exist
        expected_keys = [
            "total_revenue", "total_appointments", "optimization_opportunities"
        ]
        for key in expected_keys:
            assert key in insights

    def test_trigger_ai_coaching_session_success(
        self,
        service: BusinessCalendarMetadataService,
        test_user: User
    ):
        """Test successful AI coaching session trigger"""
        result = service.trigger_ai_coaching_session(
            user_id=test_user.id,
            coaching_type="pricing",
            context={"current_avg_price": 50.0}
        )
        
        assert result is True

    def test_trigger_ai_coaching_session_invalid_type(
        self,
        service: BusinessCalendarMetadataService,
        test_user: User
    ):
        """Test AI coaching session trigger with invalid type"""
        result = service.trigger_ai_coaching_session(
            user_id=test_user.id,
            coaching_type="invalid_type",
            context={}
        )
        
        # Should handle gracefully
        assert result in [True, False]

    def test_calculate_client_value_tier(
        self,
        service: BusinessCalendarMetadataService
    ):
        """Test client value tier calculation"""
        # Test high-value client
        high_tier = service._calculate_client_value_tier(
            client_ltv=2000.0,
            frequency="weekly",
            avg_service_price=80.0
        )
        
        # Test low-value client
        low_tier = service._calculate_client_value_tier(
            client_ltv=200.0,
            frequency="yearly",
            avg_service_price=30.0
        )
        
        assert high_tier in ["low", "medium", "high", "premium"]
        assert low_tier in ["low", "medium", "high", "premium"]
        assert high_tier != low_tier or high_tier == "premium"

    def test_generate_coaching_opportunities(
        self,
        service: BusinessCalendarMetadataService,
        sample_appointment: Appointment
    ):
        """Test coaching opportunities generation"""
        opportunities = service._generate_coaching_opportunities(
            appointment=sample_appointment,
            service_tier="premium",
            client_value_tier="high"
        )
        
        assert isinstance(opportunities, list)
        
        for opportunity in opportunities:
            assert isinstance(opportunity, str)
            assert len(opportunity) > 0

    def test_get_service_tier(
        self,
        service: BusinessCalendarMetadataService
    ):
        """Test service tier classification"""
        # Test premium service
        premium_tier = service._get_service_tier("Premium Haircut", 85.0)
        
        # Test basic service
        basic_tier = service._get_service_tier("Basic Cut", 25.0)
        
        assert premium_tier in ["basic", "standard", "premium", "luxury"]
        assert basic_tier in ["basic", "standard", "premium", "luxury"]
        assert premium_tier != basic_tier or premium_tier == "luxury"


class TestAgentOrchestrationService:
    """Test suite for Agent Orchestration Service"""

    @pytest.fixture
    def sample_agent(self, db: Session):
        """Create sample agent"""
        agent = Agent(
            agent_type="financial_coach",
            name="Financial Coach",
            description="Revenue optimization specialist",
            capabilities=["pricing_analysis", "revenue_optimization"],
            pricing_tier="standard",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    @pytest.fixture
    def sample_agent_instance(self, db: Session, test_user: User, sample_agent: Agent):
        """Create sample agent instance"""
        instance = AgentInstance(
            agent_id=sample_agent.id,
            user_id=test_user.id,
            name="My Financial Coach",
            status="active",
            config={"max_conversations": 10},
            total_conversations=0,
            successful_conversations=0,
            total_revenue_generated=0.0
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)
        return instance

    async def test_create_agent_instance_success(
        self,
        db: Session,
        test_user: User,
        sample_agent: Agent
    ):
        """Test successful agent instance creation"""
        instance = await agent_orchestration_service.create_agent_instance(
            db=db,
            user_id=test_user.id,
            agent_id=sample_agent.id,
            config={"max_conversations": 15}
        )
        
        assert instance is not None
        assert instance.agent_id == sample_agent.id
        assert instance.user_id == test_user.id
        assert instance.config["max_conversations"] == 15
        assert instance.status == "inactive"  # Should start inactive

    async def test_activate_agent_success(
        self,
        db: Session,
        sample_agent_instance: AgentInstance
    ):
        """Test successful agent activation"""
        activated_instance = await agent_orchestration_service.activate_agent(
            db, sample_agent_instance.id
        )
        
        assert activated_instance is not None
        assert activated_instance.status == "active"
        assert activated_instance.activated_at is not None

    async def test_pause_agent_success(
        self,
        db: Session,
        sample_agent_instance: AgentInstance
    ):
        """Test successful agent pausing"""
        # First activate the agent
        await agent_orchestration_service.activate_agent(db, sample_agent_instance.id)
        
        # Then pause it
        paused_instance = await agent_orchestration_service.pause_agent(
            db, sample_agent_instance.id
        )
        
        assert paused_instance is not None
        assert paused_instance.status == "paused"

    async def test_get_agent_analytics_success(
        self,
        db: Session,
        test_user: User
    ):
        """Test successful agent analytics retrieval"""
        date_range = {
            "start": datetime.utcnow() - timedelta(days=30),
            "end": datetime.utcnow()
        }
        
        analytics = await agent_orchestration_service.get_agent_analytics(
            db, test_user.id, date_range
        )
        
        assert analytics is not None
        assert isinstance(analytics, dict)
        
        expected_keys = [
            "total_revenue", "total_conversations", "success_rate",
            "avg_response_time", "roi"
        ]
        for key in expected_keys:
            assert key in analytics

    async def test_create_agent_instance_invalid_agent(
        self,
        db: Session,
        test_user: User
    ):
        """Test agent instance creation with invalid agent ID"""
        with pytest.raises(ValueError):
            await agent_orchestration_service.create_agent_instance(
                db=db,
                user_id=test_user.id,
                agent_id=99999,  # Non-existent agent
                config={}
            )

    async def test_activate_nonexistent_agent(
        self,
        db: Session
    ):
        """Test activating non-existent agent instance"""
        with pytest.raises(ValueError):
            await agent_orchestration_service.activate_agent(db, 99999)

    async def test_pause_nonexistent_agent(
        self,
        db: Session
    ):
        """Test pausing non-existent agent instance"""
        with pytest.raises(ValueError):
            await agent_orchestration_service.pause_agent(db, 99999)


class TestAnalyticsService:
    """Test suite for Analytics Service"""

    @pytest.fixture
    def service(self, db: Session):
        """Create analytics service instance"""
        return AnalyticsService(db)

    @pytest.fixture
    def sample_data(self, db: Session, test_user: User):
        """Create sample data for analytics"""
        client = Client(
            first_name="Analytics",
            last_name="Client",
            email="analytics@example.com",
            phone="555-0000"
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        
        appointments = []
        base_time = datetime.utcnow()
        
        for i in range(20):
            appointment = Appointment(
                client_id=client.id,
                barber_id=test_user.id,
                service_name=f"Analytics Service {i}",
                start_time=base_time - timedelta(days=i),
                end_time=base_time - timedelta(days=i) + timedelta(hours=1),
                price=40.0 + i * 5,
                status="confirmed"
            )
            appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        for apt in appointments:
            db.refresh(apt)
        
        return appointments

    def test_get_agent_analytics_success(
        self,
        service: AnalyticsService,
        test_user: User,
        sample_data: list
    ):
        """Test successful agent analytics retrieval"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        analytics = service.get_agent_analytics(
            start_date=start_date,
            end_date=end_date,
            user_id=test_user.id
        )
        
        assert analytics is not None
        assert isinstance(analytics, dict)
        
        # Verify required fields
        required_fields = [
            "total_revenue", "total_conversations", "success_rate",
            "avg_response_time", "roi", "revenue_by_agent_type",
            "conversation_trends", "optimization_recommendations"
        ]
        
        for field in required_fields:
            assert field in analytics

    def test_calculate_success_rate(
        self,
        service: AnalyticsService
    ):
        """Test success rate calculation"""
        # Test with successful conversations
        success_rate = service._calculate_success_rate(
            successful_conversations=8,
            total_conversations=10
        )
        assert success_rate == 80.0
        
        # Test with no conversations
        success_rate_zero = service._calculate_success_rate(
            successful_conversations=0,
            total_conversations=0
        )
        assert success_rate_zero == 0.0

    def test_calculate_roi(
        self,
        service: AnalyticsService
    ):
        """Test ROI calculation"""
        # Test positive ROI
        roi = service._calculate_roi(
            revenue_generated=1000.0,
            cost_of_service=200.0
        )
        assert roi == 4.0  # (1000 - 200) / 200 = 4.0
        
        # Test zero cost (free service)
        roi_free = service._calculate_roi(
            revenue_generated=1000.0,
            cost_of_service=0.0
        )
        assert roi_free == float('inf') or roi_free >= 1000.0

    def test_generate_optimization_recommendations(
        self,
        service: AnalyticsService,
        sample_data: list
    ):
        """Test optimization recommendations generation"""
        recommendations = service._generate_optimization_recommendations(
            analytics_data={
                "success_rate": 60.0,
                "avg_response_time": 5.0,
                "roi": 2.5,
                "revenue_trends": "declining"
            }
        )
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        
        for recommendation in recommendations:
            assert isinstance(recommendation, str)
            assert len(recommendation) > 10  # Should be meaningful recommendations

    def test_get_conversation_trends(
        self,
        service: AnalyticsService,
        test_user: User
    ):
        """Test conversation trends analysis"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        trends = service._get_conversation_trends(
            user_id=test_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        assert isinstance(trends, list)
        
        for trend in trends:
            assert "date" in trend
            assert "conversations" in trend
            assert "revenue" in trend

    def test_get_revenue_by_agent_type(
        self,
        service: AnalyticsService,
        test_user: User
    ):
        """Test revenue breakdown by agent type"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        revenue_breakdown = service._get_revenue_by_agent_type(
            user_id=test_user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        assert isinstance(revenue_breakdown, dict)
        
        # Should contain valid agent types as keys
        valid_agent_types = ["financial_coach", "growth_strategist", "operations_optimizer", "brand_developer"]
        for agent_type in revenue_breakdown.keys():
            assert agent_type in valid_agent_types or agent_type == "other"

    def test_analytics_with_no_data(
        self,
        service: AnalyticsService
    ):
        """Test analytics when no data is available"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        analytics = service.get_agent_analytics(
            start_date=start_date,
            end_date=end_date,
            user_id=99999  # Non-existent user
        )
        
        assert analytics is not None
        assert analytics["total_revenue"] == 0
        assert analytics["total_conversations"] == 0
        assert analytics["success_rate"] == 0

    def test_analytics_date_validation(
        self,
        service: AnalyticsService,
        test_user: User
    ):
        """Test analytics with invalid date ranges"""
        # Test end date before start date
        start_date = datetime.utcnow()
        end_date = datetime.utcnow() - timedelta(days=30)
        
        analytics = service.get_agent_analytics(
            start_date=start_date,
            end_date=end_date,
            user_id=test_user.id
        )
        
        # Should handle gracefully
        assert analytics is not None


class TestIntegrationServices:
    """Test suite for service integration scenarios"""

    @pytest.fixture
    def all_services(self, db: Session):
        """Create all service instances"""
        return {
            'calendar': EnhancedGoogleCalendarService(db),
            'metadata': BusinessCalendarMetadataService(db),
            'analytics': AnalyticsService(db)
        }

    @pytest.fixture
    def comprehensive_test_data(self, db: Session, test_user: User):
        """Create comprehensive test data"""
        # Create multiple clients
        clients = []
        for i in range(3):
            client = Client(
                first_name=f"Client{i}",
                last_name=f"LastName{i}",
                email=f"client{i}@example.com",
                phone=f"555-000{i}"
            )
            clients.append(client)
            db.add(client)
        
        db.commit()
        for client in clients:
            db.refresh(client)
        
        # Create appointments across different time periods
        appointments = []
        base_time = datetime.utcnow()
        
        for i in range(30):
            appointment = Appointment(
                client_id=clients[i % len(clients)].id,
                barber_id=test_user.id,
                service_name=f"Service Type {i % 5}",
                start_time=base_time - timedelta(days=i),
                end_time=base_time - timedelta(days=i) + timedelta(hours=1),
                price=30.0 + (i % 10) * 10,  # Varied pricing
                status="confirmed"
            )
            appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        for apt in appointments:
            db.refresh(apt)
        
        return {
            'clients': clients,
            'appointments': appointments
        }

    def test_end_to_end_business_intelligence_workflow(
        self,
        all_services: dict,
        test_user: User,
        comprehensive_test_data: dict
    ):
        """Test complete end-to-end business intelligence workflow"""
        calendar_service = all_services['calendar']
        metadata_service = all_services['metadata']
        analytics_service = all_services['analytics']
        
        # Step 1: Generate business insights
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        business_insights = calendar_service.get_business_insights_for_period(
            user=test_user,
            start_date=start_date,
            end_date=end_date
        )
        
        assert business_insights is not None
        assert business_insights["total_appointments"] > 0
        
        # Step 2: Generate compliance report
        compliance_report = calendar_service.get_six_figure_barber_compliance_report(test_user)
        
        assert compliance_report is not None
        assert compliance_report["total_appointments_analyzed"] > 0
        
        # Step 3: Get metadata insights
        metadata_insights = metadata_service.get_business_insights(test_user.id, 30)
        
        assert metadata_insights is not None
        
        # Step 4: Generate analytics
        analytics = analytics_service.get_agent_analytics(
            start_date=start_date,
            end_date=end_date,
            user_id=test_user.id
        )
        
        assert analytics is not None
        
        # Step 5: Verify data consistency across services
        # All services should see the same appointment count
        appointments_count = business_insights["total_appointments"]
        assert compliance_report["total_appointments_analyzed"] == appointments_count
        
        # Revenue should be consistent
        total_revenue = business_insights["total_revenue"]
        assert total_revenue > 0

    def test_service_error_propagation(
        self,
        all_services: dict,
        test_user: User
    ):
        """Test how errors propagate through service layers"""
        calendar_service = all_services['calendar']
        
        # Test with invalid date range
        start_date = datetime.utcnow()
        end_date = datetime.utcnow() - timedelta(days=30)  # End before start
        
        # Services should handle gracefully
        insights = calendar_service.get_business_insights_for_period(
            user=test_user,
            start_date=start_date,
            end_date=end_date
        )
        
        # Should return valid response even with invalid dates
        assert insights is not None

    def test_concurrent_service_usage(
        self,
        all_services: dict,
        test_user: User,
        comprehensive_test_data: dict
    ):
        """Test concurrent usage of multiple services"""
        import asyncio
        
        async def get_insights():
            return all_services['calendar'].get_business_insights_for_period(
                user=test_user,
                start_date=datetime.utcnow() - timedelta(days=30),
                end_date=datetime.utcnow()
            )
        
        async def get_compliance():
            return all_services['calendar'].get_six_figure_barber_compliance_report(test_user)
        
        async def get_analytics():
            return all_services['analytics'].get_agent_analytics(
                start_date=datetime.utcnow() - timedelta(days=30),
                end_date=datetime.utcnow(),
                user_id=test_user.id
            )
        
        # Run services concurrently
        results = asyncio.run(asyncio.gather(
            get_insights(),
            get_compliance(),
            get_analytics(),
            return_exceptions=True
        ))
        
        # All should succeed
        for result in results:
            assert not isinstance(result, Exception)
            assert result is not None

    def test_data_consistency_across_services(
        self,
        all_services: dict,
        test_user: User,
        comprehensive_test_data: dict
    ):
        """Test data consistency across different services"""
        # Get data from multiple services
        insights = all_services['calendar'].get_business_insights_for_period(
            user=test_user,
            start_date=datetime.utcnow() - timedelta(days=30),
            end_date=datetime.utcnow()
        )
        
        metadata_insights = all_services['metadata'].get_business_insights(test_user.id, 30)
        
        # Verify consistent appointment counts
        calendar_appointments = insights["total_appointments"]
        
        # Both services should see the same data
        assert calendar_appointments == len(comprehensive_test_data['appointments'])
        
        # Revenue calculations should be consistent
        assert insights["total_revenue"] > 0
        assert metadata_insights["total_revenue"] >= 0  # May be 0 if no metadata

    def test_performance_with_large_datasets(
        self,
        all_services: dict,
        test_user: User,
        db: Session
    ):
        """Test service performance with larger datasets"""
        # Create a larger dataset
        client = Client(
            first_name="Performance",
            last_name="Test",
            email="perf@test.com",
            phone="555-9999"
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        
        # Create many appointments
        appointments = []
        base_time = datetime.utcnow()
        
        for i in range(100):  # Larger dataset
            appointment = Appointment(
                client_id=client.id,
                barber_id=test_user.id,
                service_name=f"Perf Service {i}",
                start_time=base_time - timedelta(hours=i),
                end_time=base_time - timedelta(hours=i) + timedelta(hours=1),
                price=50.0,
                status="confirmed"
            )
            appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        
        # Test that services can handle the load
        start_time = datetime.utcnow()
        
        insights = all_services['calendar'].get_business_insights_for_period(
            user=test_user,
            start_date=datetime.utcnow() - timedelta(days=5),
            end_date=datetime.utcnow()
        )
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        
        # Should complete within reasonable time (e.g., 5 seconds)
        assert processing_time < 5.0
        assert insights is not None
        assert insights["total_appointments"] == 100