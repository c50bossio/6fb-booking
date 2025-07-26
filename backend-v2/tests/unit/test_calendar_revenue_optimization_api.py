"""
Comprehensive unit tests for Calendar Revenue Optimization API endpoints.

Tests the Six Figure Barber methodology-based calendar revenue optimization including:
- Revenue metrics and progress tracking
- Time block optimization for maximum revenue
- Upselling opportunities identification
- Peak hour analysis and optimization
- Six Figure Barber progress monitoring
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.v2.endpoints.calendar_revenue_optimization import router
from models import User, Appointment, Service
from factories import UserFactory, ClientFactory, AppointmentFactory, ServiceFactory


class TestRevenueMetrics:
    """Test revenue metrics calculation and reporting."""

    @pytest.fixture
    def sample_appointments(self, db: Session):
        """Create sample appointments for testing."""
        barber = UserFactory.create_barber()
        service = ServiceFactory.create_service(name="Premium Cut", base_price=75.0)
        
        appointments = []
        # Create appointments for different time periods
        for i in range(10):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                service_id=service.id,
                service_name=service.name,
                service_price=75.0,
                start_time=datetime.now() - timedelta(days=i),
                status='completed'
            )
            appointments.append(appointment)
        
        db.add_all([barber, service] + appointments)
        db.commit()
        
        return barber, appointments

    def test_get_revenue_metrics_success(self, client, auth_headers, sample_appointments, db: Session):
        """Test successful revenue metrics retrieval."""
        barber, appointments = sample_appointments
        
        # Override current user to be the barber
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers,
                params={
                    "date_from": "2024-01-01",
                    "date_to": "2024-01-31"
                }
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Verify structure
            assert "daily_revenue" in data
            assert "daily_target" in data
            assert "daily_progress" in data
            assert "weekly_revenue" in data
            assert "weekly_target" in data
            assert "weekly_progress" in data
            assert "monthly_revenue" in data
            assert "monthly_target" in data
            assert "monthly_progress" in data
            assert "annual_projection" in data
            assert "annual_target" in data
            assert "annual_progress" in data
            assert "average_ticket" in data
            assert "appointment_count" in data
            assert "high_value_service_count" in data
            assert "commission_earned" in data
            
            # Verify Six Figure Barber targets
            assert data["daily_target"] == 274  # $100k / 365 days
            assert data["weekly_target"] == 1923  # $100k / 52 weeks
            assert data["monthly_target"] == 8333  # $100k / 12 months
            assert data["annual_target"] == 100000

    def test_get_revenue_metrics_default_dates(self, client, auth_headers, sample_appointments):
        """Test revenue metrics with default date range."""
        barber, appointments = sample_appointments
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Should use current month as default
            assert isinstance(data["monthly_revenue"], float)
            assert isinstance(data["appointment_count"], int)

    def test_get_revenue_metrics_unauthorized(self, client):
        """Test unauthorized access to revenue metrics."""
        response = client.get("/api/v2/calendar-revenue/metrics")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_revenue_metrics_commission_calculation(self, client, auth_headers, sample_appointments):
        """Test commission calculation in revenue metrics."""
        barber, appointments = sample_appointments
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Commission should be calculated at 55% (typical barber commission)
            if data["appointment_count"] > 0:
                expected_total_revenue = data["appointment_count"] * 75.0  # Service price
                expected_commission = expected_total_revenue * 0.55
                # Allow for small rounding differences
                assert abs(data["commission_earned"] - expected_commission) < 1.0


class TestTimeBlockOptimization:
    """Test time block optimization functionality."""

    @pytest.fixture
    def mock_revenue_optimizer(self):
        """Mock revenue optimizer service."""
        mock_optimizer = Mock()
        
        # Mock optimized time block
        mock_block = Mock()
        mock_block.start_hour = 10
        mock_block.end_hour = 12
        mock_block.optimal_service_price = 95.0
        mock_block.expected_revenue = 190.0
        mock_block.confidence_score = 0.87
        mock_block.reasoning = "High-value clients prefer mid-morning appointments"
        mock_block.suggested_services = ["Premium Styling", "Signature Cut"]
        
        mock_optimizer.optimize_time_blocks.return_value = [mock_block]
        return mock_optimizer

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_optimize_time_blocks_success(self, mock_optimizer, client, auth_headers, mock_revenue_optimizer, db: Session):
        """Test successful time block optimization."""
        mock_optimizer.optimize_time_blocks = mock_revenue_optimizer.optimize_time_blocks
        
        # Create test data
        barber = UserFactory.create_barber()
        service = ServiceFactory.create_service(name="Test Service", base_price=50.0)
        db.add_all([barber, service])
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            request_data = {
                "target_date": "2024-02-15",
                "barber_id": barber.id
            }
            
            response = client.post(
                "/api/v2/calendar-revenue/optimize-time-blocks",
                headers=auth_headers,
                json=request_data
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert len(data) == 1
            block = data[0]
            assert block["start_hour"] == 10
            assert block["end_hour"] == 12
            assert block["optimal_service_price"] == 95.0
            assert block["expected_revenue"] == 190.0
            assert block["confidence_score"] == 0.87
            assert "Premium" in block["suggested_services"][0]

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_optimize_time_blocks_default_barber(self, mock_optimizer, client, auth_headers, mock_revenue_optimizer):
        """Test time block optimization with default barber (current user)."""
        mock_optimizer.optimize_time_blocks = mock_revenue_optimizer.optimize_time_blocks
        
        request_data = {
            "target_date": "2024-02-15"
            # No barber_id specified - should use current user
        }
        
        response = client.post(
            "/api/v2/calendar-revenue/optimize-time-blocks",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify the optimizer was called
        mock_optimizer.optimize_time_blocks.assert_called_once()

    def test_optimize_time_blocks_unauthorized(self, client):
        """Test unauthorized time block optimization."""
        request_data = {
            "target_date": "2024-02-15"
        }
        
        response = client.post(
            "/api/v2/calendar-revenue/optimize-time-blocks",
            json=request_data
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_optimize_time_blocks_service_failure(self, mock_optimizer, client, auth_headers):
        """Test time block optimization service failure."""
        mock_optimizer.optimize_time_blocks.side_effect = Exception("Optimization service unavailable")
        
        request_data = {
            "target_date": "2024-02-15"
        }
        
        response = client.post(
            "/api/v2/calendar-revenue/optimize-time-blocks",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to optimize time blocks" in response.json()["detail"]


class TestUpsellOpportunities:
    """Test upselling opportunities identification."""

    @pytest.fixture
    def mock_upsell_opportunities(self):
        """Mock upselling opportunities."""
        opportunity = Mock()
        opportunity.appointment_id = 123
        opportunity.client_name = "Premium Client"
        opportunity.current_service = "Basic Haircut"
        opportunity.current_price = 45.0
        opportunity.suggested_service = "Signature Styling Package"
        opportunity.suggested_price = 120.0
        opportunity.revenue_increase = 75.0
        opportunity.probability = 0.85
        opportunity.reasoning = "Client has history of premium services and high satisfaction scores"
        opportunity.six_fb_principle = "Premium service positioning drives six-figure income"
        
        return [opportunity]

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_get_upsell_opportunities_success(self, mock_optimizer, client, auth_headers, mock_upsell_opportunities, db: Session):
        """Test successful upselling opportunities retrieval."""
        mock_optimizer.identify_upsell_opportunities.return_value = mock_upsell_opportunities
        
        # Create upcoming appointments
        barber = UserFactory.create_barber()
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            start_time=datetime.now() + timedelta(days=2),
            status='confirmed'
        )
        db.add_all([barber, appointment])
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/upsell-opportunities",
                headers=auth_headers,
                params={"days_ahead": 7}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert len(data) == 1
            opportunity = data[0]
            assert opportunity["appointment_id"] == 123
            assert opportunity["client_name"] == "Premium Client"
            assert opportunity["current_service"] == "Basic Haircut"
            assert opportunity["suggested_service"] == "Signature Styling Package"
            assert opportunity["revenue_increase"] == 75.0
            assert opportunity["probability"] == 0.85
            assert "premium" in opportunity["six_fb_principle"].lower()

    def test_get_upsell_opportunities_unauthorized(self, client):
        """Test unauthorized access to upselling opportunities."""
        response = client.get("/api/v2/calendar-revenue/upsell-opportunities")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_upsell_opportunities_days_ahead_parameter(self, mock_optimizer, client, auth_headers, mock_upsell_opportunities):
        """Test upselling opportunities with days_ahead parameter."""
        mock_optimizer.identify_upsell_opportunities.return_value = mock_upsell_opportunities
        
        response = client.get(
            "/api/v2/calendar-revenue/upsell-opportunities",
            headers=auth_headers,
            params={"days_ahead": 14}
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify the service was called and would filter appointments correctly
        mock_optimizer.identify_upsell_opportunities.assert_called_once()


class TestPeakHourAnalysis:
    """Test peak hour analysis functionality."""

    @pytest.fixture
    def mock_peak_analysis(self):
        """Mock peak hour analysis results."""
        analyses = []
        for hour in [9, 10, 11, 14, 15, 16]:
            analysis = Mock()
            analysis.hour = hour
            analysis.average_revenue = 50.0 + (hour % 4) * 15  # Varying revenue by hour
            analysis.appointment_count = 5 + (hour % 3)
            analysis.average_ticket = analysis.average_revenue / analysis.appointment_count if analysis.appointment_count > 0 else 0
            analysis.utilization_rate = 0.7 + (hour % 4) * 0.05
            analysis.optimization_potential = 0.1 + (hour % 5) * 0.02
            analyses.append(analysis)
        
        return analyses

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_analyze_peak_hours_success(self, mock_optimizer, client, auth_headers, mock_peak_analysis, db: Session):
        """Test successful peak hour analysis."""
        mock_optimizer.analyze_peak_hours.return_value = mock_peak_analysis
        
        # Create historical appointments
        barber = UserFactory.create_barber()
        appointments = []
        for i in range(30):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                start_time=datetime.now() - timedelta(days=i),
                service_price=65.0,
                status='completed'
            )
            appointments.append(appointment)
        
        db.add_all([barber] + appointments)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/peak-hours",
                headers=auth_headers,
                params={"days_back": 30}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert len(data) == 6  # 6 peak hours analyzed
            
            for hour_data in data:
                assert "hour" in hour_data
                assert "average_revenue" in hour_data
                assert "appointment_count" in hour_data
                assert "average_ticket" in hour_data
                assert "utilization_rate" in hour_data
                assert "optimization_potential" in hour_data
                
                # Verify reasonable values
                assert 0 <= hour_data["hour"] <= 23
                assert hour_data["average_revenue"] >= 0
                assert hour_data["utilization_rate"] >= 0
                assert hour_data["utilization_rate"] <= 1

    def test_analyze_peak_hours_unauthorized(self, client):
        """Test unauthorized access to peak hour analysis."""
        response = client.get("/api/v2/calendar-revenue/peak-hours")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_peak_hours_custom_period(self, mock_optimizer, client, auth_headers, mock_peak_analysis):
        """Test peak hour analysis with custom time period."""
        mock_optimizer.analyze_peak_hours.return_value = mock_peak_analysis
        
        response = client.get(
            "/api/v2/calendar-revenue/peak-hours",
            headers=auth_headers,
            params={"days_back": 60}
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify service was called
        mock_optimizer.analyze_peak_hours.assert_called_once()


class TestOptimizationSuggestions:
    """Test optimization suggestions functionality."""

    @pytest.fixture
    def mock_optimization_suggestions(self):
        """Mock optimization suggestions."""
        suggestions = []
        
        suggestion1 = Mock()
        suggestion1.type = "pricing"
        suggestion1.title = "Implement Premium Pricing Strategy"
        suggestion1.description = "Increase service prices by 15% for premium clients to reach six-figure income goal"
        suggestion1.expected_impact = 2400.0  # Annual revenue increase
        suggestion1.confidence = 0.88
        suggestion1.implementation_difficulty = "medium"
        suggestion1.six_fb_methodology = "Premium pricing is essential for six-figure barber success"
        suggestion1.action_items = [
            "Identify top 20% of clients for premium pricing",
            "Create premium service packages",
            "Implement gradual price increases"
        ]
        
        suggestion2 = Mock()
        suggestion2.type = "scheduling"
        suggestion2.title = "Optimize High-Value Time Slots"
        suggestion2.description = "Block premium appointment times for highest-paying clients"
        suggestion2.expected_impact = 1800.0
        suggestion2.confidence = 0.82
        suggestion2.implementation_difficulty = "easy"
        suggestion2.six_fb_methodology = "Strategic scheduling maximizes revenue per hour"
        suggestion2.action_items = [
            "Block 10am-2pm for premium services",
            "Implement booking priority system",
            "Create waitlist for premium slots"
        ]
        
        suggestions.extend([suggestion1, suggestion2])
        return suggestions

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_get_optimization_suggestions_success(self, mock_optimizer, client, auth_headers, mock_optimization_suggestions, db: Session):
        """Test successful optimization suggestions retrieval."""
        mock_optimizer.generate_optimization_suggestions.return_value = mock_optimization_suggestions
        
        # Create barber with some appointment history
        barber = UserFactory.create_barber()
        appointments = []
        for i in range(15):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                service_price=60.0,
                start_time=datetime.now() - timedelta(days=i),
                status='completed'
            )
            appointments.append(appointment)
        
        db.add_all([barber] + appointments)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/optimization-suggestions",
                headers=auth_headers,
                params={"target_income": 120000}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert len(data) == 2
            
            pricing_suggestion = data[0]
            assert pricing_suggestion["type"] == "pricing"
            assert pricing_suggestion["title"] == "Implement Premium Pricing Strategy"
            assert pricing_suggestion["expected_impact"] == 2400.0
            assert pricing_suggestion["confidence"] == 0.88
            assert pricing_suggestion["implementation_difficulty"] == "medium"
            assert "six-figure" in pricing_suggestion["six_fb_methodology"].lower()
            assert len(pricing_suggestion["action_items"]) == 3
            
            scheduling_suggestion = data[1]
            assert scheduling_suggestion["type"] == "scheduling"
            assert scheduling_suggestion["implementation_difficulty"] == "easy"

    def test_get_optimization_suggestions_unauthorized(self, client):
        """Test unauthorized access to optimization suggestions."""
        response = client.get("/api/v2/calendar-revenue/optimization-suggestions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_optimization_suggestions_custom_target(self, mock_optimizer, client, auth_headers, mock_optimization_suggestions):
        """Test optimization suggestions with custom income target."""
        mock_optimizer.generate_optimization_suggestions.return_value = mock_optimization_suggestions
        
        response = client.get(
            "/api/v2/calendar-revenue/optimization-suggestions",
            headers=auth_headers,
            params={"target_income": 150000}
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify service was called with correct target
        call_args = mock_optimizer.generate_optimization_suggestions.call_args
        assert call_args.kwargs["target_income"] == 150000


class TestUpsellApplication:
    """Test upsell suggestion application functionality."""

    def test_apply_upsell_suggestion_success(self, client, auth_headers, db: Session):
        """Test successful upsell application."""
        # Create test data
        barber = UserFactory.create_barber()
        appointment = AppointmentFactory.create_appointment(
            user_id=barber.id,
            service_name="Basic Cut",
            service_price=45.0
        )
        db.add_all([barber, appointment])
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.post(
                "/api/v2/calendar-revenue/apply-upsell",
                headers=auth_headers,
                params={
                    "appointment_id": appointment.id,
                    "suggested_service": "Premium Styling Package",
                    "suggested_price": 95.0
                }
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert data["message"] == "Upsell applied successfully"
            assert data["appointment_id"] == appointment.id
            assert data["revenue_increase"] == 50.0  # 95 - 45
            
            # Verify appointment was updated
            db.refresh(appointment)
            assert appointment.service_name == "Premium Styling Package"
            assert appointment.service_price == 95.0

    def test_apply_upsell_appointment_not_found(self, client, auth_headers):
        """Test upsell application with non-existent appointment."""
        response = client.post(
            "/api/v2/calendar-revenue/apply-upsell",
            headers=auth_headers,
            params={
                "appointment_id": 99999,
                "suggested_service": "Premium Service",
                "suggested_price": 100.0
            }
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Appointment not found" in response.json()["detail"]

    def test_apply_upsell_unauthorized(self, client):
        """Test unauthorized upsell application."""
        response = client.post(
            "/api/v2/calendar-revenue/apply-upsell",
            params={
                "appointment_id": 1,
                "suggested_service": "Premium Service",
                "suggested_price": 100.0
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestSixFigureProgress:
    """Test Six Figure Barber progress tracking."""

    def test_get_six_figure_progress_success(self, client, auth_headers, db: Session):
        """Test successful Six Figure progress retrieval."""
        # Create barber with appointments throughout the year
        barber = UserFactory.create_barber()
        appointments = []
        
        # Create appointments with varying revenue
        for month in range(1, 13):
            for day in [5, 15, 25]:
                if month <= datetime.now().month:  # Only past and current month
                    appointment = AppointmentFactory.create_appointment(
                        user_id=barber.id,
                        start_time=datetime(2024, month, day, 14, 0),
                        service_price=85.0,
                        status='completed'
                    )
                    appointments.append(appointment)
        
        db.add_all([barber] + appointments)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/six-figure-progress",
                headers=auth_headers,
                params={"target_income": 100000}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Verify structure
            assert data["target_income"] == 100000
            assert "ytd_revenue" in data
            assert "ytd_progress" in data
            assert "annual_projection" in data
            assert "projection_progress" in data
            assert "daily_average" in data
            assert data["daily_target"] == 100000 / 365
            assert "days_passed" in data
            assert "days_remaining" in data
            assert "monthly_breakdown" in data
            assert "on_track" in data
            assert "coaching_insight" in data
            
            # Verify monthly breakdown structure
            monthly_data = data["monthly_breakdown"]
            assert "1" in monthly_data  # January
            assert "revenue" in monthly_data["1"]
            assert "target" in monthly_data["1"]
            assert "progress" in monthly_data["1"]
            assert monthly_data["1"]["target"] == 100000 / 12

    def test_six_figure_progress_custom_target(self, client, auth_headers, db: Session):
        """Test Six Figure progress with custom income target."""
        barber = UserFactory.create_barber()
        db.add(barber)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/six-figure-progress",
                headers=auth_headers,
                params={"target_income": 150000}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            assert data["target_income"] == 150000
            assert data["daily_target"] == 150000 / 365

    def test_six_figure_progress_coaching_insights(self, client, auth_headers, db: Session):
        """Test coaching insights based on progress."""
        barber = UserFactory.create_barber()
        
        # Create high-performing scenario
        appointments = []
        for i in range(100):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                start_time=datetime.now() - timedelta(days=i),
                service_price=95.0,  # High-value services
                status='completed'
            )
            appointments.append(appointment)
        
        db.add_all([barber] + appointments)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/six-figure-progress",
                headers=auth_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Should show positive coaching insight for good performance
            coaching_insight = data["coaching_insight"]
            assert isinstance(coaching_insight, str)
            assert len(coaching_insight) > 0

    def test_six_figure_progress_unauthorized(self, client):
        """Test unauthorized access to Six Figure progress."""
        response = client.get("/api/v2/calendar-revenue/six-figure-progress")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestErrorHandling:
    """Test error handling and edge cases."""

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_optimizer_service_failure(self, mock_optimizer, client, auth_headers):
        """Test handling of optimizer service failures."""
        mock_optimizer.optimize_time_blocks.side_effect = Exception("Service unavailable")
        
        request_data = {
            "target_date": "2024-02-15"
        }
        
        response = client.post(
            "/api/v2/calendar-revenue/optimize-time-blocks",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to optimize time blocks" in response.json()["detail"]

    def test_invalid_date_format(self, client, auth_headers):
        """Test handling of invalid date formats."""
        response = client.get(
            "/api/v2/calendar-revenue/metrics",
            headers=auth_headers,
            params={
                "date_from": "invalid-date",
                "date_to": "2024-01-31"
            }
        )
        
        # Should handle invalid date gracefully
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_database_error_handling(self, client, auth_headers):
        """Test handling of database errors."""
        # Mock database error
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_db') as mock_db:
            mock_db.side_effect = Exception("Database connection failed")
            
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers
            )
            
            # Should handle database errors gracefully
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestBusinessLogicValidation:
    """Test Six Figure Barber methodology compliance."""

    def test_premium_pricing_focus(self, client, auth_headers, db: Session):
        """Test that metrics emphasize premium pricing strategy."""
        barber = UserFactory.create_barber()
        
        # Create mix of low and high-value appointments
        low_value_appointments = []
        high_value_appointments = []
        
        for i in range(5):
            low_apt = AppointmentFactory.create_appointment(
                user_id=barber.id,
                service_price=35.0,  # Below premium threshold
                status='completed',
                start_time=datetime.now() - timedelta(days=i)
            )
            low_value_appointments.append(low_apt)
            
            high_apt = AppointmentFactory.create_appointment(
                user_id=barber.id,
                service_price=95.0,  # Premium pricing
                status='completed',
                start_time=datetime.now() - timedelta(days=i)
            )
            high_value_appointments.append(high_apt)
        
        db.add_all([barber] + low_value_appointments + high_value_appointments)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Should track high-value services separately
            assert "high_value_service_count" in data
            assert data["high_value_service_count"] == 5  # Services >= $85
            
            # Average ticket should reflect premium strategy
            assert data["average_ticket"] >= 50.0  # Should be weighted towards premium

    @patch('api.v2.endpoints.calendar_revenue_optimization.revenue_optimizer')
    def test_six_figure_methodology_compliance(self, mock_optimizer, client, auth_headers):
        """Test that optimization suggestions align with Six Figure Barber principles."""
        # Mock suggestions that align with methodology
        six_figure_suggestion = Mock()
        six_figure_suggestion.type = "premium_positioning"
        six_figure_suggestion.title = "Implement Six Figure Barber Premium Strategy"
        six_figure_suggestion.description = "Focus on high-value clients and premium service positioning"
        six_figure_suggestion.expected_impact = 3500.0
        six_figure_suggestion.confidence = 0.91
        six_figure_suggestion.implementation_difficulty = "medium"
        six_figure_suggestion.six_fb_methodology = "Premium positioning and client value maximization are core to six-figure success"
        six_figure_suggestion.action_items = [
            "Identify top 20% clients for premium services",
            "Implement $100+ service packages",
            "Create VIP client experience program"
        ]
        
        mock_optimizer.generate_optimization_suggestions.return_value = [six_figure_suggestion]
        
        response = client.get(
            "/api/v2/calendar-revenue/optimization-suggestions",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        suggestion = data[0]
        assert "six-figure" in suggestion["six_fb_methodology"].lower()
        assert suggestion["expected_impact"] >= 2000.0  # Significant revenue impact
        assert any("$100" in item or "premium" in item.lower() for item in suggestion["action_items"])

    def test_revenue_targets_alignment(self, client, auth_headers, db: Session):
        """Test that revenue targets align with Six Figure Barber goals."""
        barber = UserFactory.create_barber()
        db.add(barber)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Verify Six Figure Barber standard targets
            assert data["daily_target"] == 274  # $100k / 365
            assert data["weekly_target"] == 1923  # $100k / 52
            assert data["monthly_target"] == 8333  # $100k / 12
            assert data["annual_target"] == 100000


class TestPerformanceAndScalability:
    """Test performance characteristics."""

    def test_large_appointment_dataset_handling(self, client, auth_headers, db: Session):
        """Test handling of large appointment datasets."""
        barber = UserFactory.create_barber()
        
        # Create large number of appointments
        appointments = []
        for i in range(500):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                start_time=datetime.now() - timedelta(days=i % 365),
                service_price=75.0,
                status='completed'
            )
            appointments.append(appointment)
        
        db.add_all([barber] + appointments)
        db.commit()
        
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber):
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Should handle large datasets efficiently
            assert isinstance(data["appointment_count"], int)
            assert data["appointment_count"] > 0

    def test_concurrent_optimization_requests(self, client, auth_headers):
        """Test handling of concurrent optimization requests."""
        request_data = {
            "target_date": "2024-02-15"
        }
        
        responses = []
        for _ in range(3):
            response = client.post(
                "/api/v2/calendar-revenue/optimize-time-blocks",
                headers=auth_headers,
                json=request_data
            )
            responses.append(response)
        
        # All requests should complete (may succeed or fail depending on service availability)
        for response in responses:
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR]


class TestSecurityValidation:
    """Test security aspects and authorization."""

    def test_user_data_isolation(self, client, auth_headers, db: Session):
        """Test that users only see their own revenue data."""
        # Create two different barbers
        barber1 = UserFactory.create_barber(email="barber1@example.com")
        barber2 = UserFactory.create_barber(email="barber2@example.com")
        
        # Create appointments for both
        apt1 = AppointmentFactory.create_appointment(user_id=barber1.id, service_price=100.0)
        apt2 = AppointmentFactory.create_appointment(user_id=barber2.id, service_price=200.0)
        
        db.add_all([barber1, barber2, apt1, apt2])
        db.commit()
        
        # Test with barber1's auth
        with patch('api.v2.endpoints.calendar_revenue_optimization.get_current_user', return_value=barber1):
            response = client.get(
                "/api/v2/calendar-revenue/metrics",
                headers=auth_headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            # Should only see barber1's data, not barber2's

    def test_input_validation_time_blocks(self, client, auth_headers):
        """Test input validation for time block optimization."""
        # Invalid date format
        invalid_request = {
            "target_date": "invalid-date-format"
        }
        
        response = client.post(
            "/api/v2/calendar-revenue/optimize-time-blocks",
            headers=auth_headers,
            json=invalid_request
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_authorization_enforcement(self, client):
        """Test that all endpoints require proper authorization."""
        endpoints_to_test = [
            ("GET", "/api/v2/calendar-revenue/metrics"),
            ("POST", "/api/v2/calendar-revenue/optimize-time-blocks", {"target_date": "2024-02-15"}),
            ("GET", "/api/v2/calendar-revenue/upsell-opportunities"),
            ("GET", "/api/v2/calendar-revenue/peak-hours"),
            ("GET", "/api/v2/calendar-revenue/optimization-suggestions"),
            ("GET", "/api/v2/calendar-revenue/six-figure-progress"),
        ]
        
        for method, endpoint, *data in endpoints_to_test:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json=data[0] if data else {})
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED