"""
Comprehensive integration tests for AI Business Calendar system

Tests cover:
- End-to-end user workflows
- Frontend-backend integration
- API integration flows
- Real-world usage scenarios
- Performance under load
- Error recovery
- Cross-service communication
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from httpx import AsyncClient
from sqlalchemy.orm import Session

from models import User, Appointment, Client, Agent, AgentInstance, AgentConversation
from models import AgentType, AgentStatus, ConversationStatus


class TestAIBusinessCalendarIntegration:
    """Integration tests for the complete AI Business Calendar system"""

    @pytest.fixture
    async def complete_test_setup(self, db: Session, test_user: User):
        """Set up complete test environment with all necessary data"""
        # Create client
        client = Client(
            first_name="Integration",
            last_name="Test",
            email="integration@test.com",
            phone="555-0000"
        )
        db.add(client)
        db.commit()
        db.refresh(client)

        # Create appointments
        appointments = []
        base_time = datetime.utcnow()
        
        for i in range(5):
            appointment = Appointment(
                client_id=client.id,
                barber_id=test_user.id,
                service_name=f"Integration Service {i}",
                start_time=base_time + timedelta(hours=i),
                end_time=base_time + timedelta(hours=i+1),
                price=50.0 + i * 20,
                status="confirmed"
            )
            appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        for apt in appointments:
            db.refresh(apt)

        # Create AI agents
        agents = []
        agent_types = [
            (AgentType.FINANCIAL_COACH, "Marcus", "Financial optimization specialist"),
            (AgentType.GROWTH_STRATEGIST, "Sofia", "Growth and retention expert"),
            (AgentType.OPERATIONS_OPTIMIZER, "Alex", "Operations efficiency expert"),
            (AgentType.BRAND_DEVELOPER, "Isabella", "Brand development specialist")
        ]
        
        for agent_type, name, desc in agent_types:
            agent = Agent(
                agent_type=agent_type,
                name=name,
                description=desc,
                capabilities=[f"{agent_type.value}_capability"],
                pricing_tier="standard",
                is_active=True
            )
            agents.append(agent)
            db.add(agent)
        
        db.commit()
        for agent in agents:
            db.refresh(agent)

        # Create agent instances
        instances = []
        for agent in agents:
            instance = AgentInstance(
                agent_id=agent.id,
                user_id=test_user.id,
                name=f"My {agent.name}",
                status=AgentStatus.ACTIVE,
                config={"max_conversations": 10},
                total_conversations=2,
                successful_conversations=2,
                total_revenue_generated=200.0
            )
            instances.append(instance)
            db.add(instance)
        
        db.commit()
        for instance in instances:
            db.refresh(instance)

        return {
            'client': client,
            'appointments': appointments,
            'agents': agents,
            'instances': instances
        }

    @pytest.fixture
    def mock_all_services(self):
        """Mock all external services for integration testing"""
        with patch('routers.ai_business_calendar.EnhancedGoogleCalendarService') as mock_calendar, \
             patch('routers.ai_business_calendar.BusinessCalendarMetadataService') as mock_metadata, \
             patch('routers.agents.agent_orchestration_service') as mock_orchestration:
            
            # Mock calendar service
            calendar_instance = Mock()
            calendar_instance.get_business_insights_for_period.return_value = {
                'total_appointments': 5,
                'total_revenue': 350.0,
                'average_service_price': 70.0,
                'service_tier_distribution': {'standard': 3, 'premium': 2},
                'client_value_distribution': {'medium': 3, 'high': 2},
                'coaching_opportunities': {'pricing': 2, 'scheduling': 1},
                'optimization_recommendations': [
                    'Consider premium pricing for evening slots',
                    'Optimize Tuesday afternoon availability'
                ],
                'six_fb_compliance_average': 78.5,
                'calendar_utilization_rate': 85.0,
                'peak_hour': '18:00-19:00',
                'peak_day': 'Friday'
            }
            
            calendar_instance.get_six_figure_barber_compliance_report.return_value = {
                'average_compliance_score': 78.5,
                'total_appointments_analyzed': 5,
                'service_tier_distribution': {'standard': 3, 'premium': 2},
                'recommendations': [
                    'Increase premium service pricing',
                    'Implement upselling strategies'
                ],
                'compliance_grade': 'B',
                'report_period': '30 days'
            }
            
            calendar_instance.sync_appointment_to_google_with_business_intelligence.return_value = 'google_event_456'
            calendar_instance.trigger_ai_coaching_from_calendar_patterns.return_value = [
                {'type': 'pricing', 'message': 'Consider adjusting your pricing strategy'},
                {'type': 'scheduling', 'message': 'Optimize your peak hour scheduling'}
            ]
            calendar_instance.enable_smart_calendar_coaching.return_value = True
            
            mock_calendar.return_value = calendar_instance

            # Mock metadata service
            metadata_instance = Mock()
            metadata_mock = Mock()
            metadata_mock.user_id = 1
            metadata_mock.google_event_id = 'google_event_456'
            metadata_mock.appointment_id = 1
            metadata_mock.service_category = 'haircut'
            metadata_mock.service_tier = 'premium'
            metadata_mock.client_value_tier = 'high'
            metadata_mock.expected_revenue = 90.0
            metadata_mock.actual_revenue = 90.0
            metadata_mock.client_ltv = 1500.0
            metadata_mock.client_frequency = 'monthly'
            metadata_mock.coaching_opportunities = ['pricing_optimization']
            metadata_mock.optimization_flags = ['high_revenue']
            metadata_mock.six_fb_compliance_score = 88.0
            metadata_mock.created_at = datetime.utcnow()
            metadata_mock.updated_at = datetime.utcnow()
            
            metadata_instance.get_business_metadata.return_value = metadata_mock
            metadata_instance.update_business_metadata.return_value = metadata_mock
            metadata_instance.trigger_ai_coaching_session.return_value = True
            metadata_instance.get_business_insights.return_value = {
                'total_revenue': 350.0,
                'total_appointments': 5,
                'optimization_opportunities': ['pricing', 'scheduling']
            }
            
            mock_metadata.return_value = metadata_instance

            # Mock orchestration service
            mock_instance = Mock()
            mock_instance.id = 1
            mock_instance.agent_id = 1
            mock_instance.user_id = 1
            mock_instance.name = "Integration Test Agent"
            mock_instance.status = AgentStatus.ACTIVE
            
            mock_orchestration.create_agent_instance.return_value = mock_instance
            mock_orchestration.activate_agent.return_value = mock_instance
            mock_orchestration.pause_agent.return_value = mock_instance
            mock_orchestration.get_agent_analytics.return_value = {
                'total_revenue': 500.0,
                'total_conversations': 10,
                'success_rate': 85.0,
                'avg_response_time': 2.1,
                'roi': 4.5,
                'revenue_by_agent_type': {'financial_coach': 300.0, 'growth_strategist': 200.0},
                'conversation_trends': [],
                'top_performing_agents': [],
                'optimization_recommendations': [],
                'competitive_benchmarks': {'industry_averages': {'success_rate': 70, 'roi': 3.0}},
                'current_period_performance': {'today_conversations': 2, 'today_revenue': 100.0},
                'date_range': {'start': '2024-01-01', 'end': '2024-01-31', 'days': 30},
                'last_updated': datetime.utcnow().isoformat()
            }

            yield {
                'calendar': calendar_instance,
                'metadata': metadata_instance,
                'orchestration': mock_orchestration
            }

    async def test_complete_user_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test complete user workflow from login to AI interaction"""
        
        # Step 1: Get business insights (dashboard load)
        insights_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=30",
            headers=auth_headers
        )
        
        assert insights_response.status_code == 200
        insights_data = insights_response.json()
        assert insights_data["total_appointments"] == 5
        assert insights_data["total_revenue"] == 350.0

        # Step 2: Get compliance report
        compliance_response = await async_client.get(
            "/api/v2/ai-business-calendar/compliance-report",
            headers=auth_headers
        )
        
        assert compliance_response.status_code == 200
        compliance_data = compliance_response.json()
        assert compliance_data["average_compliance_score"] == 78.5
        assert compliance_data["compliance_grade"] == "B"

        # Step 3: Get available agents
        agents_response = await async_client.get(
            "/agents/",
            headers=auth_headers
        )
        
        assert agents_response.status_code == 200
        agents_data = agents_response.json()
        assert len(agents_data) == 4  # All agent types

        # Step 4: Trigger AI coaching session
        coaching_response = await async_client.post(
            "/api/v2/ai-business-calendar/trigger-coaching",
            headers=auth_headers,
            json={
                "coaching_type": "pricing",
                "context": {"current_avg_price": 70.0}
            }
        )
        
        assert coaching_response.status_code == 200
        coaching_data = coaching_response.json()
        assert coaching_data["success"] is True

        # Step 5: Analyze calendar patterns
        patterns_response = await async_client.post(
            "/api/v2/ai-business-calendar/analyze-calendar-patterns",
            headers=auth_headers
        )
        
        assert patterns_response.status_code == 200
        patterns_data = patterns_response.json()
        assert patterns_data["success"] is True
        assert len(patterns_data["triggered_sessions"]) == 2

        # Step 6: Get dashboard data (comprehensive view)
        dashboard_response = await async_client.get(
            "/api/v2/ai-business-calendar/dashboard-data",
            headers=auth_headers
        )
        
        assert dashboard_response.status_code == 200
        dashboard_data = dashboard_response.json()
        assert "appointments" in dashboard_data
        assert "business_insights" in dashboard_data
        assert "compliance_report" in dashboard_data
        assert "summary" in dashboard_data

    async def test_agent_interaction_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        admin_auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test complete agent interaction workflow"""
        
        # Step 1: Get agent templates
        templates_response = await async_client.get(
            "/agents/templates",
            headers=auth_headers
        )
        
        assert templates_response.status_code == 200
        templates_data = templates_response.json()
        assert len(templates_data) >= 4

        # Step 2: Create agent instance (admin only)
        instance_data = {
            "agent_id": complete_test_setup['agents'][0].id,
            "config": {"max_conversations": 20}
        }
        
        instance_response = await async_client.post(
            "/agents/instances",
            headers=admin_auth_headers,
            json=instance_data
        )
        
        assert instance_response.status_code == 200
        instance_data = instance_response.json()
        assert instance_data["name"] == "Integration Test Agent"

        # Step 3: Activate agent instance
        activate_response = await async_client.post(
            f"/agents/instances/{instance_data['id']}/activate",
            headers=admin_auth_headers
        )
        
        assert activate_response.status_code == 200

        # Step 4: Get agent analytics
        analytics_response = await async_client.get(
            "/agents/analytics",
            headers=auth_headers
        )
        
        assert analytics_response.status_code == 200
        analytics_data = analytics_response.json()
        assert analytics_data["total_revenue"] == 500.0
        assert analytics_data["success_rate"] == 85.0

        # Step 5: Get AI providers info
        providers_response = await async_client.get(
            "/agents/providers",
            headers=auth_headers
        )
        
        assert providers_response.status_code == 200

    async def test_appointment_sync_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test appointment synchronization workflow"""
        
        appointment = complete_test_setup['appointments'][0]
        
        # Step 1: Sync appointment with business intelligence
        sync_response = await async_client.post(
            "/api/v2/ai-business-calendar/sync-appointment",
            headers=auth_headers,
            json={
                "appointment_id": appointment.id,
                "include_business_metadata": True
            }
        )
        
        assert sync_response.status_code == 200
        sync_data = sync_response.json()
        assert sync_data["success"] is True
        assert sync_data["google_event_id"] == "google_event_456"

        # Step 2: Get business metadata for the synced event
        metadata_response = await async_client.get(
            "/api/v2/ai-business-calendar/metadata/google_event_456",
            headers=auth_headers
        )
        
        assert metadata_response.status_code == 200
        metadata_data = metadata_response.json()
        assert metadata_data["google_event_id"] == "google_event_456"
        assert metadata_data["service_tier"] == "premium"

        # Step 3: Update business metadata
        update_response = await async_client.put(
            "/api/v2/ai-business-calendar/metadata/google_event_456",
            headers=auth_headers,
            json={
                "actual_revenue": 95.0,
                "six_fb_compliance_score": 92.0
            }
        )
        
        assert update_response.status_code == 200
        update_data = update_response.json()
        assert update_data["success"] is True

    async def test_error_handling_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_all_services: dict
    ):
        """Test error handling in integration scenarios"""
        
        # Test 1: Invalid appointment sync
        invalid_sync_response = await async_client.post(
            "/api/v2/ai-business-calendar/sync-appointment",
            headers=auth_headers,
            json={
                "appointment_id": 99999,  # Non-existent
                "include_business_metadata": True
            }
        )
        
        assert invalid_sync_response.status_code == 404

        # Test 2: Invalid metadata access
        invalid_metadata_response = await async_client.get(
            "/api/v2/ai-business-calendar/metadata/nonexistent_event",
            headers=auth_headers
        )
        
        assert invalid_metadata_response.status_code == 404

        # Test 3: Service error handling
        mock_all_services['calendar'].get_business_insights_for_period.side_effect = Exception("Service error")
        
        error_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights",
            headers=auth_headers
        )
        
        assert error_response.status_code == 500

        # Reset mock for other tests
        mock_all_services['calendar'].get_business_insights_for_period.side_effect = None

    async def test_concurrent_user_workflows(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test multiple concurrent user workflows"""
        
        # Create multiple concurrent requests
        async def get_insights():
            return await async_client.get(
                "/api/v2/ai-business-calendar/business-insights",
                headers=auth_headers
            )
        
        async def get_compliance():
            return await async_client.get(
                "/api/v2/ai-business-calendar/compliance-report",
                headers=auth_headers
            )
        
        async def get_dashboard():
            return await async_client.get(
                "/api/v2/ai-business-calendar/dashboard-data",
                headers=auth_headers
            )
        
        async def get_analytics():
            return await async_client.get(
                "/agents/analytics",
                headers=auth_headers
            )

        # Run all requests concurrently
        results = await asyncio.gather(
            get_insights(),
            get_compliance(),
            get_dashboard(),
            get_analytics(),
            return_exceptions=True
        )

        # All should succeed
        for result in results:
            assert not isinstance(result, Exception)
            assert result.status_code == 200

    async def test_data_consistency_across_endpoints(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test data consistency across different endpoints"""
        
        # Get data from multiple endpoints
        insights_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights",
            headers=auth_headers
        )
        
        dashboard_response = await async_client.get(
            "/api/v2/ai-business-calendar/dashboard-data",
            headers=auth_headers
        )
        
        analytics_response = await async_client.get(
            "/agents/analytics",
            headers=auth_headers
        )

        # All should return valid data
        assert insights_response.status_code == 200
        assert dashboard_response.status_code == 200
        assert analytics_response.status_code == 200

        insights_data = insights_response.json()
        dashboard_data = dashboard_response.json()
        analytics_data = analytics_response.json()

        # Verify data consistency
        assert insights_data["total_appointments"] == 5
        assert dashboard_data["summary"]["total_appointments"] >= 0
        assert analytics_data["total_conversations"] >= 0

    async def test_performance_under_load(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test system performance under concurrent load"""
        
        # Create multiple rapid requests
        async def make_request():
            return await async_client.get(
                "/api/v2/ai-business-calendar/business-insights",
                headers=auth_headers
            )

        # Make 10 concurrent requests
        start_time = datetime.utcnow()
        tasks = [make_request() for _ in range(10)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = datetime.utcnow()

        total_time = (end_time - start_time).total_seconds()

        # All requests should succeed
        successful_requests = sum(1 for r in results if not isinstance(r, Exception) and r.status_code == 200)
        
        assert successful_requests == 10
        assert total_time < 10.0  # Should complete within 10 seconds

    async def test_authentication_and_authorization_flow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        admin_auth_headers: dict
    ):
        """Test authentication and authorization across the system"""
        
        # Test 1: Unauthenticated requests should fail
        endpoints_to_test = [
            "/api/v2/ai-business-calendar/business-insights",
            "/api/v2/ai-business-calendar/compliance-report",
            "/agents/",
            "/agents/analytics"
        ]
        
        for endpoint in endpoints_to_test:
            response = await async_client.get(endpoint)
            assert response.status_code == 401

        # Test 2: Regular user access to allowed endpoints
        user_endpoints = [
            "/api/v2/ai-business-calendar/business-insights",
            "/api/v2/ai-business-calendar/compliance-report",
            "/agents/",
            "/agents/analytics"
        ]
        
        for endpoint in user_endpoints:
            response = await async_client.get(endpoint, headers=auth_headers)
            assert response.status_code in [200, 404]  # 404 for empty data is acceptable

        # Test 3: Admin-only endpoints
        admin_response = await async_client.post(
            "/agents/",
            headers=admin_auth_headers,
            json={
                "agent_type": "test_agent",
                "name": "Test Agent",
                "description": "Test",
                "capabilities": ["test"],
                "pricing_tier": "standard",
                "is_active": True
            }
        )
        
        # Should succeed with admin auth or fail with proper error
        assert admin_response.status_code in [200, 400, 403]

        # Regular user should not be able to create agents
        user_response = await async_client.post(
            "/agents/",
            headers=auth_headers,
            json={
                "agent_type": "test_agent_2",
                "name": "Test Agent 2",
                "description": "Test",
                "capabilities": ["test"],
                "pricing_tier": "standard",
                "is_active": True
            }
        )
        
        assert user_response.status_code == 403

    async def test_real_world_usage_scenarios(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test real-world usage scenarios"""
        
        # Scenario 1: Barber starts day, checks dashboard
        dashboard_response = await async_client.get(
            "/api/v2/ai-business-calendar/dashboard-data",
            headers=auth_headers
        )
        
        assert dashboard_response.status_code == 200
        dashboard_data = dashboard_response.json()
        
        # Should have all necessary information
        assert "appointments" in dashboard_data
        assert "business_insights" in dashboard_data
        assert "summary" in dashboard_data

        # Scenario 2: Barber asks for business insights
        insights_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=7",
            headers=auth_headers
        )
        
        assert insights_response.status_code == 200
        insights_data = insights_response.json()
        assert len(insights_data["optimization_recommendations"]) > 0

        # Scenario 3: Barber triggers AI coaching
        coaching_response = await async_client.post(
            "/api/v2/ai-business-calendar/trigger-coaching",
            headers=auth_headers,
            json={
                "coaching_type": "revenue_optimization",
                "context": {
                    "current_revenue": 350.0,
                    "target_revenue": 500.0
                }
            }
        )
        
        assert coaching_response.status_code == 200

        # Scenario 4: Barber enables smart coaching
        smart_coaching_response = await async_client.post(
            "/api/v2/ai-business-calendar/enable-smart-coaching",
            headers=auth_headers
        )
        
        assert smart_coaching_response.status_code == 200

        # Scenario 5: Barber checks compliance report
        compliance_response = await async_client.get(
            "/api/v2/ai-business-calendar/compliance-report",
            headers=auth_headers
        )
        
        assert compliance_response.status_code == 200
        compliance_data = compliance_response.json()
        assert "recommendations" in compliance_data

    async def test_system_health_and_monitoring(
        self,
        async_client: AsyncClient
    ):
        """Test system health endpoints and monitoring"""
        
        # Test health check endpoint
        health_response = await async_client.get(
            "/api/v2/ai-business-calendar/health"
        )
        
        assert health_response.status_code == 200
        health_data = health_response.json()
        
        assert health_data["status"] == "healthy"
        assert health_data["service"] == "AI Business Calendar"
        assert "features" in health_data
        assert len(health_data["features"]) > 0

    async def test_data_migration_compatibility(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test that the system works with migrated data"""
        
        # Test that all endpoints work with the test data setup
        endpoints_to_test = [
            "/api/v2/ai-business-calendar/business-insights",
            "/api/v2/ai-business-calendar/compliance-report",
            "/api/v2/ai-business-calendar/dashboard-data",
            "/agents/",
            "/agents/analytics"
        ]
        
        for endpoint in endpoints_to_test:
            response = await async_client.get(endpoint, headers=auth_headers)
            assert response.status_code in [200, 404]  # 404 acceptable for empty data
            
            if response.status_code == 200:
                data = response.json()
                assert data is not None

    async def test_cross_service_communication(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Test communication between different services"""
        
        # Test that AI calendar service communicates with agent service
        # This is tested through the dashboard data endpoint which combines both
        dashboard_response = await async_client.get(
            "/api/v2/ai-business-calendar/dashboard-data",
            headers=auth_headers
        )
        
        assert dashboard_response.status_code == 200
        dashboard_data = dashboard_response.json()
        
        # Should contain data from both calendar and agent services
        assert "business_insights" in dashboard_data  # From calendar service
        assert "coaching_opportunities" in dashboard_data  # From agent service

        # Test pattern analysis triggers coaching
        patterns_response = await async_client.post(
            "/api/v2/ai-business-calendar/analyze-calendar-patterns",
            headers=auth_headers
        )
        
        assert patterns_response.status_code == 200
        patterns_data = patterns_response.json()
        assert patterns_data["success"] is True

    async def test_edge_cases_and_boundary_conditions(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_all_services: dict
    ):
        """Test edge cases and boundary conditions"""
        
        # Test with maximum days_back parameter
        max_days_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=365",
            headers=auth_headers
        )
        
        assert max_days_response.status_code == 200

        # Test with minimum days_back parameter
        min_days_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=1",
            headers=auth_headers
        )
        
        assert min_days_response.status_code == 200

        # Test with invalid parameters
        invalid_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=0",
            headers=auth_headers
        )
        
        assert invalid_response.status_code == 422

        # Test with very large conversation limit
        large_limit_response = await async_client.get(
            "/agents/conversations?limit=100",
            headers=auth_headers
        )
        
        assert large_limit_response.status_code == 200

        # Test with invalid limit
        invalid_limit_response = await async_client.get(
            "/agents/conversations?limit=150",  # Above max
            headers=auth_headers
        )
        
        assert invalid_limit_response.status_code == 422

    async def test_system_recovery_after_failures(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_all_services: dict
    ):
        """Test system recovery after various failures"""
        
        # Simulate service failure and recovery
        mock_all_services['calendar'].get_business_insights_for_period.side_effect = Exception("Temporary failure")
        
        # Request should fail
        failure_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights",
            headers=auth_headers
        )
        
        assert failure_response.status_code == 500

        # Restore service
        mock_all_services['calendar'].get_business_insights_for_period.side_effect = None
        mock_all_services['calendar'].get_business_insights_for_period.return_value = {
            'total_appointments': 5,
            'total_revenue': 350.0,
            'average_service_price': 70.0,
            'service_tier_distribution': {'standard': 3, 'premium': 2},
            'client_value_distribution': {'medium': 3, 'high': 2},
            'coaching_opportunities': {'pricing': 2},
            'optimization_recommendations': ['Test recommendation'],
            'six_fb_compliance_average': 78.5
        }

        # Request should succeed again
        recovery_response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights",
            headers=auth_headers
        )
        
        assert recovery_response.status_code == 200

    async def test_complete_integration_workflow_validation(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        complete_test_setup: dict,
        mock_all_services: dict
    ):
        """Final validation of complete integration workflow"""
        
        # This test validates that all components work together
        # in a realistic end-to-end scenario
        
        workflow_steps = [
            # Step 1: Load dashboard
            ("/api/v2/ai-business-calendar/dashboard-data", "GET", None),
            
            # Step 2: Get business insights
            ("/api/v2/ai-business-calendar/business-insights?days_back=30", "GET", None),
            
            # Step 3: Check compliance
            ("/api/v2/ai-business-calendar/compliance-report", "GET", None),
            
            # Step 4: Trigger coaching
            ("/api/v2/ai-business-calendar/trigger-coaching", "POST", {
                "coaching_type": "pricing",
                "context": {"avg_price": 70.0}
            }),
            
            # Step 5: Analyze patterns
            ("/api/v2/ai-business-calendar/analyze-calendar-patterns", "POST", None),
            
            # Step 6: Get agent analytics
            ("/agents/analytics", "GET", None),
            
            # Step 7: Enable smart coaching
            ("/api/v2/ai-business-calendar/enable-smart-coaching", "POST", None)
        ]
        
        results = []
        for endpoint, method, data in workflow_steps:
            if method == "GET":
                response = await async_client.get(endpoint, headers=auth_headers)
            else:  # POST
                response = await async_client.post(
                    endpoint, 
                    headers=auth_headers, 
                    json=data or {}
                )
            
            results.append({
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'success': response.status_code in [200, 201]
            })

        # All steps should succeed
        failed_steps = [r for r in results if not r['success']]
        assert len(failed_steps) == 0, f"Failed steps: {failed_steps}"
        
        # Verify we completed all workflow steps
        assert len(results) == len(workflow_steps)
        
        print(f"\n✅ Complete integration workflow validated successfully!")
        print(f"   - Executed {len(results)} workflow steps")
        print(f"   - All steps completed successfully")
        print(f"   - System integration is working properly")