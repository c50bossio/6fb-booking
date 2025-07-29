"""
Comprehensive tests for AI Business Calendar API endpoints

Tests cover:
- Business insights retrieval
- Calendar synchronization
- Compliance reporting
- AI coaching triggers
- Pattern analysis
- Error handling
- Authentication and authorization
- Data validation
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from httpx import AsyncClient
from sqlalchemy.orm import Session

from main import app
from models import User, Appointment, Client
from routers.ai_business_calendar import BusinessInsightsResponse, ComplianceReportResponse


class TestAIBusinessCalendarAPI:
    """Test suite for AI Business Calendar API endpoints"""

    @pytest.fixture
    def mock_enhanced_calendar_service(self):
        """Mock enhanced Google Calendar service"""
        with patch('routers.ai_business_calendar.EnhancedGoogleCalendarService') as mock:
            service_instance = Mock()
            mock.return_value = service_instance
            
            # Mock default business insights
            service_instance.get_business_insights_for_period.return_value = {
                'total_appointments': 50,
                'total_revenue': 2500.0,
                'average_service_price': 50.0,
                'service_tier_distribution': {'standard': 30, 'premium': 20},
                'client_value_distribution': {'low': 10, 'medium': 25, 'high': 15},
                'coaching_opportunities': {'pricing': 5, 'scheduling': 3},
                'optimization_recommendations': [
                    'Consider raising premium service prices by 15%',
                    'Tuesday 2-4 PM shows consistent availability'
                ],
                'six_fb_compliance_average': 85.5,
                'calendar_utilization_rate': 75.0,
                'peak_hour': '10:00-11:00',
                'peak_day': 'Friday'
            }
            
            # Mock compliance report
            service_instance.get_six_figure_barber_compliance_report.return_value = {
                'average_compliance_score': 85.5,
                'total_appointments_analyzed': 50,
                'service_tier_distribution': {'standard': 30, 'premium': 20},
                'recommendations': [
                    'Increase premium service offerings',
                    'Implement dynamic pricing strategy'
                ],
                'compliance_grade': 'B+',
                'report_period': '30 days'
            }
            
            # Mock sync methods
            service_instance.sync_appointment_to_google_with_business_intelligence.return_value = 'google_event_123'
            service_instance.trigger_ai_coaching_from_calendar_patterns.return_value = [
                {'type': 'pricing', 'message': 'Consider adjusting your pricing'},
                {'type': 'scheduling', 'message': 'Optimize your schedule'}
            ]
            service_instance.enable_smart_calendar_coaching.return_value = True
            
            yield service_instance

    @pytest.fixture
    def mock_business_metadata_service(self):
        """Mock business calendar metadata service"""
        with patch('routers.ai_business_calendar.BusinessCalendarMetadataService') as mock:
            service_instance = Mock()
            mock.return_value = service_instance
            
            # Mock metadata
            mock_metadata = Mock()
            mock_metadata.user_id = 1
            mock_metadata.google_event_id = 'google_event_123'
            mock_metadata.appointment_id = 1
            mock_metadata.service_category = 'haircut'
            mock_metadata.service_tier = 'premium'
            mock_metadata.client_value_tier = 'high'
            mock_metadata.expected_revenue = 85.0
            mock_metadata.actual_revenue = 85.0
            mock_metadata.client_ltv = 1200.0
            mock_metadata.client_frequency = 'monthly'
            mock_metadata.coaching_opportunities = ['pricing_optimization']
            mock_metadata.optimization_flags = ['peak_time_booking']
            mock_metadata.six_fb_compliance_score = 92.0
            mock_metadata.created_at = datetime.utcnow()
            mock_metadata.updated_at = datetime.utcnow()
            
            service_instance.get_business_metadata.return_value = mock_metadata
            service_instance.update_business_metadata.return_value = mock_metadata
            service_instance.trigger_ai_coaching_session.return_value = True
            service_instance.get_business_insights.return_value = {
                'total_revenue': 2500.0,
                'total_appointments': 50,
                'optimization_opportunities': ['pricing', 'scheduling']
            }
            
            yield service_instance

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
        for i in range(5):
            appointment = Appointment(
                client_id=client.id,
                barber_id=test_user.id,
                service_name=f"Service {i}",
                start_time=datetime.utcnow() + timedelta(hours=i),
                end_time=datetime.utcnow() + timedelta(hours=i+1),
                price=50.0 + i * 10,
                status="confirmed"
            )
            appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        for apt in appointments:
            db.refresh(apt)
        
        return appointments

    async def test_get_business_insights_success(
        self, 
        async_client: AsyncClient, 
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test successful business insights retrieval"""
        response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=30",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_appointments" in data
        assert "total_revenue" in data
        assert "average_service_price" in data
        assert "service_tier_distribution" in data
        assert "client_value_distribution" in data
        assert "coaching_opportunities" in data
        assert "optimization_recommendations" in data
        assert "six_fb_compliance_average" in data
        
        # Verify data values
        assert data["total_appointments"] == 50
        assert data["total_revenue"] == 2500.0
        assert data["average_service_price"] == 50.0
        assert data["six_fb_compliance_average"] == 85.5
        
        # Verify service was called with correct parameters
        mock_enhanced_calendar_service.get_business_insights_for_period.assert_called_once()

    async def test_get_business_insights_custom_period(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test business insights with custom time period"""
        response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=60",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify service was called with 60-day period
        call_args = mock_enhanced_calendar_service.get_business_insights_for_period.call_args
        start_date = call_args[1]['start_date']
        end_date = call_args[1]['end_date']
        date_diff = end_date - start_date
        assert date_diff.days == 60

    async def test_get_business_insights_invalid_period(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test business insights with invalid time period"""
        response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights?days_back=400",
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error

    async def test_get_business_insights_no_data(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test business insights when no data available"""
        mock_enhanced_calendar_service.get_business_insights_for_period.return_value = None
        
        response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "No insights available" in response.json()["detail"]

    async def test_get_business_insights_service_error(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test business insights when service throws error"""
        mock_enhanced_calendar_service.get_business_insights_for_period.side_effect = Exception("Service error")
        
        response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights",
            headers=auth_headers
        )
        
        assert response.status_code == 500
        assert "Error generating business insights" in response.json()["detail"]

    async def test_sync_appointment_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_appointments: list,
        mock_enhanced_calendar_service: Mock
    ):
        """Test successful appointment sync"""
        appointment = sample_appointments[0]
        
        response = await async_client.post(
            "/api/v2/ai-business-calendar/sync-appointment",
            headers=auth_headers,
            json={
                "appointment_id": appointment.id,
                "include_business_metadata": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["google_event_id"] == "google_event_123"
        assert data["appointment_id"] == appointment.id
        assert data["business_metadata_included"] is True
        
        # Verify service was called
        mock_enhanced_calendar_service.sync_appointment_to_google_with_business_intelligence.assert_called_once()

    async def test_sync_appointment_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test sync appointment with non-existent appointment"""
        response = await async_client.post(
            "/api/v2/ai-business-calendar/sync-appointment",
            headers=auth_headers,
            json={
                "appointment_id": 99999,
                "include_business_metadata": True
            }
        )
        
        assert response.status_code == 404
        assert "Appointment not found" in response.json()["detail"]

    async def test_sync_appointment_sync_failure(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_appointments: list,
        mock_enhanced_calendar_service: Mock
    ):
        """Test sync appointment when sync fails"""
        mock_enhanced_calendar_service.sync_appointment_to_google_with_business_intelligence.return_value = None
        appointment = sample_appointments[0]
        
        response = await async_client.post(
            "/api/v2/ai-business-calendar/sync-appointment",
            headers=auth_headers,
            json={
                "appointment_id": appointment.id,
                "include_business_metadata": True
            }
        )
        
        assert response.status_code == 400
        assert "Failed to sync appointment" in response.json()["detail"]

    async def test_get_compliance_report_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test successful compliance report retrieval"""
        response = await async_client.get(
            "/api/v2/ai-business-calendar/compliance-report",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "average_compliance_score" in data
        assert "total_appointments_analyzed" in data
        assert "service_tier_distribution" in data
        assert "recommendations" in data
        assert "compliance_grade" in data
        assert "report_period" in data
        
        assert data["average_compliance_score"] == 85.5
        assert data["compliance_grade"] == "B+"
        assert len(data["recommendations"]) > 0

    async def test_get_compliance_report_no_data(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test compliance report when no data available"""
        mock_enhanced_calendar_service.get_six_figure_barber_compliance_report.return_value = None
        
        response = await async_client.get(
            "/api/v2/ai-business-calendar/compliance-report",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "No compliance data available" in response.json()["detail"]

    async def test_trigger_coaching_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_business_metadata_service: Mock
    ):
        """Test successful AI coaching trigger"""
        response = await async_client.post(
            "/api/v2/ai-business-calendar/trigger-coaching",
            headers=auth_headers,
            json={
                "coaching_type": "pricing",
                "context": {"current_avg_price": 50.0}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["coaching_type"] == "pricing"
        assert "AI coaching session for pricing has been initiated" in data["message"]
        
        # Verify service was called
        mock_business_metadata_service.trigger_ai_coaching_session.assert_called_once()

    async def test_trigger_coaching_failure(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_business_metadata_service: Mock
    ):
        """Test coaching trigger failure"""
        mock_business_metadata_service.trigger_ai_coaching_session.return_value = False
        
        response = await async_client.post(
            "/api/v2/ai-business-calendar/trigger-coaching",
            headers=auth_headers,
            json={
                "coaching_type": "pricing",
                "context": {}
            }
        )
        
        assert response.status_code == 400
        assert "Failed to trigger coaching session" in response.json()["detail"]

    async def test_analyze_calendar_patterns_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test successful calendar pattern analysis"""
        response = await async_client.post(
            "/api/v2/ai-business-calendar/analyze-calendar-patterns",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "triggered_sessions" in data
        assert "session_count" in data
        assert data["session_count"] == 2
        assert len(data["triggered_sessions"]) == 2

    async def test_enable_smart_coaching_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test successful smart coaching enablement"""
        response = await async_client.post(
            "/api/v2/ai-business-calendar/enable-smart-coaching",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["feature_enabled"] == "smart_calendar_coaching"
        assert "Smart calendar coaching has been enabled" in data["message"]

    async def test_enable_smart_coaching_failure(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test smart coaching enablement failure"""
        mock_enhanced_calendar_service.enable_smart_calendar_coaching.return_value = False
        
        response = await async_client.post(
            "/api/v2/ai-business-calendar/enable-smart-coaching",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Failed to enable smart calendar coaching" in response.json()["detail"]

    async def test_get_business_metadata_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_business_metadata_service: Mock
    ):
        """Test successful business metadata retrieval"""
        response = await async_client.get(
            "/api/v2/ai-business-calendar/metadata/google_event_123",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["google_event_id"] == "google_event_123"
        assert data["appointment_id"] == 1
        assert data["service_category"] == "haircut"
        assert data["service_tier"] == "premium"
        assert data["client_value_tier"] == "high"
        assert data["expected_revenue"] == 85.0
        assert data["six_fb_compliance_score"] == 92.0

    async def test_get_business_metadata_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_business_metadata_service: Mock
    ):
        """Test business metadata retrieval when not found"""
        mock_business_metadata_service.get_business_metadata.return_value = None
        
        response = await async_client.get(
            "/api/v2/ai-business-calendar/metadata/nonexistent_event",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Business metadata not found" in response.json()["detail"]

    async def test_get_business_metadata_unauthorized(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_business_metadata_service: Mock
    ):
        """Test business metadata retrieval for unauthorized user"""
        # Mock metadata with different user_id
        mock_metadata = Mock()
        mock_metadata.user_id = 999  # Different from test user
        mock_business_metadata_service.get_business_metadata.return_value = mock_metadata
        
        response = await async_client.get(
            "/api/v2/ai-business-calendar/metadata/google_event_123",
            headers=auth_headers
        )
        
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    async def test_update_business_metadata_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_business_metadata_service: Mock
    ):
        """Test successful business metadata update"""
        updates = {
            "actual_revenue": 90.0,
            "six_fb_compliance_score": 95.0
        }
        
        response = await async_client.put(
            "/api/v2/ai-business-calendar/metadata/google_event_123",
            headers=auth_headers,
            json=updates
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["google_event_id"] == "google_event_123"
        assert set(data["updated_fields"]) == set(updates.keys())
        
        # Verify service was called with updates
        mock_business_metadata_service.update_business_metadata.assert_called_once_with(
            "google_event_123", updates
        )

    async def test_get_dashboard_data_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_appointments: list,
        mock_enhanced_calendar_service: Mock,
        mock_business_metadata_service: Mock
    ):
        """Test successful dashboard data retrieval"""
        response = await async_client.get(
            "/api/v2/ai-business-calendar/dashboard-data",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "appointments" in data
        assert "business_insights" in data
        assert "compliance_report" in data
        assert "calendar_insights" in data
        assert "coaching_opportunities" in data
        assert "summary" in data
        
        # Verify appointments data
        assert len(data["appointments"]) > 0
        appointment = data["appointments"][0]
        assert "id" in appointment
        assert "service_name" in appointment
        assert "client_name" in appointment
        assert "start_time" in appointment
        assert "price" in appointment
        assert "status" in appointment
        
        # Verify summary data
        summary = data["summary"]
        assert "total_appointments" in summary
        assert "total_revenue" in summary
        assert "avg_compliance_score" in summary
        assert "coaching_sessions_available" in summary

    async def test_health_check(self, async_client: AsyncClient):
        """Test health check endpoint"""
        response = await async_client.get("/api/v2/ai-business-calendar/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "AI Business Calendar"
        assert data["version"] == "1.0.0"
        assert "features" in data
        assert len(data["features"]) > 0

    async def test_unauthorized_access(self, async_client: AsyncClient):
        """Test all endpoints require authentication"""
        endpoints = [
            ("/api/v2/ai-business-calendar/business-insights", "GET"),
            ("/api/v2/ai-business-calendar/sync-appointment", "POST"),
            ("/api/v2/ai-business-calendar/compliance-report", "GET"),
            ("/api/v2/ai-business-calendar/trigger-coaching", "POST"),
            ("/api/v2/ai-business-calendar/analyze-calendar-patterns", "POST"),
            ("/api/v2/ai-business-calendar/enable-smart-coaching", "POST"),
            ("/api/v2/ai-business-calendar/metadata/test", "GET"),
            ("/api/v2/ai-business-calendar/dashboard-data", "GET"),
        ]
        
        for endpoint, method in endpoints:
            if method == "GET":
                response = await async_client.get(endpoint)
            else:
                response = await async_client.post(endpoint, json={})
            
            assert response.status_code == 401, f"Endpoint {endpoint} should require auth"

    async def test_input_validation(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test input validation for various endpoints"""
        
        # Test sync-appointment with invalid data
        response = await async_client.post(
            "/api/v2/ai-business-calendar/sync-appointment",
            headers=auth_headers,
            json={"invalid_field": "value"}
        )
        assert response.status_code == 422
        
        # Test trigger-coaching with invalid coaching type
        response = await async_client.post(
            "/api/v2/ai-business-calendar/trigger-coaching",
            headers=auth_headers,
            json={"coaching_type": ""}
        )
        assert response.status_code == 422

    async def test_concurrent_requests(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test handling of concurrent requests"""
        import asyncio
        
        # Create multiple concurrent requests
        tasks = []
        for _ in range(5):
            task = async_client.get(
                "/api/v2/ai-business-calendar/business-insights",
                headers=auth_headers
            )
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks)
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200

    async def test_rate_limiting_behavior(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock
    ):
        """Test API behavior under rate limiting scenarios"""
        # This would test actual rate limiting if implemented
        # For now, just verify the endpoint responds normally
        response = await async_client.get(
            "/api/v2/ai-business-calendar/business-insights",
            headers=auth_headers
        )
        
        assert response.status_code == 200

    @pytest.mark.parametrize("days_back,expected_status", [
        (1, 200),      # Minimum valid
        (30, 200),     # Default value
        (365, 200),    # Maximum valid
        (0, 422),      # Below minimum
        (366, 422),    # Above maximum
    ])
    async def test_business_insights_parameter_validation(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_enhanced_calendar_service: Mock,
        days_back: int,
        expected_status: int
    ):
        """Test parameter validation for business insights endpoint"""
        response = await async_client.get(
            f"/api/v2/ai-business-calendar/business-insights?days_back={days_back}",
            headers=auth_headers
        )
        
        assert response.status_code == expected_status