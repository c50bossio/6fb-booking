"""
Comprehensive unit tests for Six Figure Barber methodology implementation.
Covers revenue optimization, client lifecycle, and business efficiency tracking.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal
import asyncio

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from services.six_figure_barber_core_service import SixFigureBarberCoreService
from services.six_figure_barber_crm_service import SixFigureBarberCRMService
from services.revenue_optimization_service import RevenueOptimizationService
from services.client_lifecycle_service import ClientLifecycleService
from models.six_figure_barber_core import (
    SixFigureGoal, 
    RevenueMetric, 
    ClientValueScore,
    ServiceExcellenceMetric
)
from models.six_figure_barber_crm import (
    ClientJourney,
    TouchPoint,
    RevenueOpportunity
)


class TestSixFigureBarberCoreService:
    """Test core Six Figure Barber methodology service."""
    
    @pytest.fixture
    def service(self, mock_db_session):
        return SixFigureBarberCoreService(mock_db_session)
    
    @pytest.fixture
    def mock_barber_user(self):
        """Mock barber user with Six Figure Barber program enrollment."""
        return Mock(
            id=1,
            role="BARBER",
            email="barber@test.com",
            six_figure_enrolled=True,
            six_figure_tier="GROWTH",
            created_at=datetime.utcnow()
        )
    
    @pytest.fixture
    def mock_client_data(self):
        """Mock client data for testing client value calculations."""
        return {
            "id": 1,
            "name": "John Doe",
            "email": "john@test.com",
            "total_spent": Decimal("450.00"),
            "visit_frequency": 4,  # visits per month
            "average_service_value": Decimal("112.50"),
            "referrals_made": 2,
            "last_visit": datetime.utcnow() - timedelta(days=7)
        }

    def test_calculate_revenue_per_hour_success(self, service, mock_barber_user):
        """Test successful revenue per hour calculation."""
        # Arrange
        service.db.query.return_value.filter.return_value.first.return_value = mock_barber_user
        mock_metrics = [
            Mock(total_revenue=Decimal("1200.00"), hours_worked=10),
            Mock(total_revenue=Decimal("800.00"), hours_worked=8),
            Mock(total_revenue=Decimal("1500.00"), hours_worked=12)
        ]
        service.db.query.return_value.filter.return_value.all.return_value = mock_metrics
        
        # Act
        result = service.calculate_revenue_per_hour(barber_id=1, period_days=30)
        
        # Assert
        assert result["success"] is True
        assert result["revenue_per_hour"] == Decimal("116.67")  # 3500/30
        assert result["total_revenue"] == Decimal("3500.00")
        assert result["total_hours"] == 30
        assert "six_figure_progress" in result

    def test_calculate_revenue_per_hour_no_data(self, service, mock_barber_user):
        """Test revenue calculation with no data returns appropriate response."""
        # Arrange
        service.db.query.return_value.filter.return_value.first.return_value = mock_barber_user
        service.db.query.return_value.filter.return_value.all.return_value = []
        
        # Act
        result = service.calculate_revenue_per_hour(barber_id=1, period_days=30)
        
        # Assert
        assert result["success"] is True
        assert result["revenue_per_hour"] == Decimal("0.00")
        assert result["total_revenue"] == Decimal("0.00")
        assert result["message"] == "No revenue data found for period"

    def test_calculate_revenue_per_hour_invalid_barber(self, service):
        """Test revenue calculation with invalid barber ID."""
        # Arrange
        service.db.query.return_value.filter.return_value.first.return_value = None
        
        # Act
        result = service.calculate_revenue_per_hour(barber_id=999, period_days=30)
        
        # Assert
        assert result["success"] is False
        assert "not found" in result["error"].lower()

    def test_track_client_value_score_new_client(self, service, mock_client_data):
        """Test client value score calculation for new client."""
        # Arrange
        service.db.query.return_value.filter.return_value.first.return_value = None
        service.db.add = Mock()
        service.db.commit = Mock()
        
        # Act
        result = service.track_client_value_score(mock_client_data)
        
        # Assert
        assert result["success"] is True
        assert result["value_score"] > 0
        assert result["tier"] in ["BRONZE", "SILVER", "GOLD", "PLATINUM"]
        assert "retention_probability" in result
        service.db.add.assert_called_once()

    def test_track_client_value_score_existing_client(self, service, mock_client_data):
        """Test client value score update for existing client."""
        # Arrange
        existing_score = Mock(
            value_score=85.5,
            tier="GOLD",
            last_updated=datetime.utcnow() - timedelta(days=1)
        )
        service.db.query.return_value.filter.return_value.first.return_value = existing_score
        service.db.commit = Mock()
        
        # Act
        result = service.track_client_value_score(mock_client_data)
        
        # Assert
        assert result["success"] is True
        assert result["value_score"] != 85.5  # Should be recalculated
        assert result["tier"] in ["BRONZE", "SILVER", "GOLD", "PLATINUM"]
        service.db.commit.assert_called_once()

    def test_set_six_figure_goal_valid(self, service, mock_barber_user):
        """Test setting a valid Six Figure Barber goal."""
        # Arrange
        service.db.query.return_value.filter.return_value.first.return_value = mock_barber_user
        service.db.add = Mock()
        service.db.commit = Mock()
        
        goal_data = {
            "target_amount": Decimal("120000.00"),
            "target_date": datetime.utcnow() + timedelta(days=365),
            "goal_type": "ANNUAL_REVENUE",
            "milestone_amount": Decimal("10000.00")
        }
        
        # Act
        result = service.set_six_figure_goal(barber_id=1, goal_data=goal_data)
        
        # Assert
        assert result["success"] is True
        assert result["goal"]["target_amount"] == Decimal("120000.00")
        assert result["goal"]["monthly_target"] == Decimal("10000.00")
        service.db.add.assert_called_once()

    def test_set_six_figure_goal_invalid_amount(self, service, mock_barber_user):
        """Test setting goal with invalid amount."""
        # Arrange
        service.db.query.return_value.filter.return_value.first.return_value = mock_barber_user
        
        goal_data = {
            "target_amount": Decimal("50000.00"),  # Below Six Figure threshold
            "target_date": datetime.utcnow() + timedelta(days=365),
            "goal_type": "ANNUAL_REVENUE"
        }
        
        # Act
        result = service.set_six_figure_goal(barber_id=1, goal_data=goal_data)
        
        # Assert
        assert result["success"] is False
        assert "minimum six figure amount" in result["error"].lower()

    def test_calculate_service_excellence_score(self, service):
        """Test service excellence score calculation."""
        # Arrange
        metrics_data = {
            "client_satisfaction": 4.8,
            "on_time_percentage": 95.0,
            "rebooking_rate": 85.0,
            "referral_rate": 25.0,
            "revenue_per_service": Decimal("125.00")
        }
        
        # Act
        result = service.calculate_service_excellence_score(metrics_data)
        
        # Assert
        assert result["success"] is True
        assert 80 <= result["excellence_score"] <= 100
        assert result["grade"] in ["A+", "A", "B+", "B", "C+", "C", "D", "F"]
        assert "improvement_areas" in result

    def test_get_six_figure_progress_dashboard(self, service, mock_barber_user):
        """Test Six Figure Barber progress dashboard data."""
        # Arrange
        service.db.query.return_value.filter.return_value.first.return_value = mock_barber_user
        
        # Mock various metrics queries
        mock_revenue_metrics = [Mock(total_revenue=Decimal("8500.00"), month_year="2024-01")]
        mock_client_metrics = [Mock(new_clients=15, retained_clients=85)]
        mock_goals = [Mock(target_amount=Decimal("120000.00"), current_progress=Decimal("85000.00"))]
        
        service.db.query.return_value.filter.return_value.all.side_effect = [
            mock_revenue_metrics, mock_client_metrics, mock_goals
        ]
        
        # Act
        result = service.get_six_figure_progress_dashboard(barber_id=1)
        
        # Assert
        assert result["success"] is True
        assert "revenue_metrics" in result
        assert "client_metrics" in result
        assert "goals_progress" in result
        assert "recommendations" in result


class TestSixFigureBarberCRMService:
    """Test Six Figure Barber CRM service functionality."""
    
    @pytest.fixture
    def crm_service(self, mock_db_session):
        return SixFigureBarberCRMService(mock_db_session)
    
    def test_create_client_journey_success(self, crm_service):
        """Test successful client journey creation."""
        # Arrange
        crm_service.db.add = Mock()
        crm_service.db.commit = Mock()
        
        journey_data = {
            "client_id": 1,
            "barber_id": 1,
            "stage": "DISCOVERY",
            "notes": "New client interested in premium services"
        }
        
        # Act
        result = crm_service.create_client_journey(journey_data)
        
        # Assert
        assert result["success"] is True
        assert result["journey"]["stage"] == "DISCOVERY"
        crm_service.db.add.assert_called_once()

    def test_track_touchpoint_success(self, crm_service):
        """Test successful touchpoint tracking."""
        # Arrange
        crm_service.db.add = Mock()
        crm_service.db.commit = Mock()
        
        touchpoint_data = {
            "client_id": 1,
            "touchpoint_type": "SERVICE_COMPLETION",
            "interaction_quality": "EXCELLENT",
            "notes": "Client very satisfied with haircut",
            "next_action": "FOLLOW_UP_24H"
        }
        
        # Act
        result = crm_service.track_touchpoint(touchpoint_data)
        
        # Assert
        assert result["success"] is True
        assert result["touchpoint"]["interaction_quality"] == "EXCELLENT"
        crm_service.db.add.assert_called_once()

    def test_identify_revenue_opportunities(self, crm_service):
        """Test revenue opportunity identification."""
        # Arrange
        mock_clients = [
            Mock(
                id=1, 
                last_visit=datetime.utcnow() - timedelta(days=45),
                average_service_value=Decimal("80.00"),
                visit_frequency=3
            ),
            Mock(
                id=2,
                last_visit=datetime.utcnow() - timedelta(days=15),
                average_service_value=Decimal("120.00"),
                visit_frequency=6
            )
        ]
        crm_service.db.query.return_value.all.return_value = mock_clients
        
        # Act
        result = crm_service.identify_revenue_opportunities(barber_id=1)
        
        # Assert
        assert result["success"] is True
        assert len(result["opportunities"]) >= 1
        assert all("opportunity_type" in opp for opp in result["opportunities"])
        assert all("potential_revenue" in opp for opp in result["opportunities"])

    def test_calculate_client_lifetime_value(self, crm_service):
        """Test client lifetime value calculation."""
        # Arrange
        client_data = {
            "average_service_value": Decimal("110.00"),
            "visit_frequency": 5,  # visits per month
            "retention_months": 24,
            "referral_value": Decimal("220.00")
        }
        
        # Act
        result = crm_service.calculate_client_lifetime_value(client_data)
        
        # Assert
        assert result["success"] is True
        assert result["lifetime_value"] > Decimal("0.00")
        assert result["monthly_value"] == Decimal("550.00")  # 110 * 5
        assert "retention_impact" in result

    def test_generate_client_communication_plan(self, crm_service):
        """Test automated client communication plan generation."""
        # Arrange
        client_profile = {
            "id": 1,
            "tier": "GOLD",
            "last_visit": datetime.utcnow() - timedelta(days=20),
            "preferred_contact": "SMS",
            "service_frequency": "MONTHLY",
            "satisfaction_score": 4.5
        }
        
        # Act
        result = crm_service.generate_client_communication_plan(client_profile)
        
        # Assert
        assert result["success"] is True
        assert "communication_schedule" in result
        assert len(result["communication_schedule"]) > 0
        assert all("action" in comm for comm in result["communication_schedule"])
        assert all("timing" in comm for comm in result["communication_schedule"])


class TestRevenueOptimizationService:
    """Test revenue optimization algorithms and strategies."""
    
    @pytest.fixture
    def revenue_service(self, mock_db_session):
        return RevenueOptimizationService(mock_db_session)
    
    def test_optimize_service_pricing(self, revenue_service):
        """Test service pricing optimization algorithm."""
        # Arrange
        service_data = {
            "current_price": Decimal("75.00"),
            "demand_score": 85,
            "competition_price": Decimal("80.00"),
            "quality_rating": 4.7,
            "booking_frequency": 120  # bookings per month
        }
        
        # Act
        result = revenue_service.optimize_service_pricing(service_data)
        
        # Assert
        assert result["success"] is True
        assert "recommended_price" in result
        assert result["recommended_price"] > Decimal("0.00")
        assert "price_change_impact" in result
        assert "confidence_score" in result

    def test_calculate_optimal_schedule_density(self, revenue_service):
        """Test optimal schedule density calculation."""
        # Arrange
        schedule_data = {
            "available_hours": 8,
            "average_service_duration": 45,  # minutes
            "buffer_time": 15,  # minutes between appointments
            "peak_demand_hours": [10, 11, 14, 15, 16],
            "barber_efficiency_score": 92
        }
        
        # Act
        result = revenue_service.calculate_optimal_schedule_density(schedule_data)
        
        # Assert
        assert result["success"] is True
        assert result["optimal_appointments_per_day"] > 0
        assert result["revenue_potential"] > Decimal("0.00")
        assert "efficiency_recommendations" in result

    def test_identify_upselling_opportunities(self, revenue_service):
        """Test automated upselling opportunity identification."""
        # Arrange
        client_history = {
            "client_id": 1,
            "service_history": ["HAIRCUT", "HAIRCUT", "BEARD_TRIM"],
            "total_spent": Decimal("225.00"),
            "visit_frequency": 4,
            "satisfaction_scores": [4.5, 4.8, 4.6]
        }
        
        available_services = [
            {"name": "PREMIUM_HAIRCUT", "price": Decimal("95.00")},
            {"name": "STYLING", "price": Decimal("35.00")},
            {"name": "HAIR_TREATMENT", "price": Decimal("65.00")}
        ]
        
        # Act
        result = revenue_service.identify_upselling_opportunities(
            client_history, available_services
        )
        
        # Assert
        assert result["success"] is True
        assert "opportunities" in result
        assert len(result["opportunities"]) > 0
        assert all("service" in opp for opp in result["opportunities"])
        assert all("success_probability" in opp for opp in result["opportunities"])


class TestClientLifecycleService:
    """Test client lifecycle management and value tracking."""
    
    @pytest.fixture
    def lifecycle_service(self, mock_db_session):
        return ClientLifecycleService(mock_db_session)
    
    def test_track_client_stage_progression(self, lifecycle_service):
        """Test client stage progression tracking."""
        # Arrange
        lifecycle_service.db.add = Mock()
        lifecycle_service.db.commit = Mock()
        
        stage_data = {
            "client_id": 1,
            "previous_stage": "TRIAL",
            "current_stage": "REGULAR",
            "progression_trigger": "THIRD_VISIT_COMPLETION",
            "value_increase": Decimal("25.00")
        }
        
        # Act
        result = lifecycle_service.track_client_stage_progression(stage_data)
        
        # Assert
        assert result["success"] is True
        assert result["progression"]["current_stage"] == "REGULAR"
        assert "next_stage_requirements" in result
        lifecycle_service.db.add.assert_called_once()

    def test_calculate_retention_probability(self, lifecycle_service):
        """Test client retention probability calculation."""
        # Arrange
        client_metrics = {
            "visit_frequency": 5,
            "average_spend": Decimal("95.00"),
            "satisfaction_trend": [4.2, 4.5, 4.7, 4.8],
            "referrals_made": 1,
            "days_since_last_visit": 18,
            "tenure_months": 8
        }
        
        # Act
        result = lifecycle_service.calculate_retention_probability(client_metrics)
        
        # Assert
        assert result["success"] is True
        assert 0 <= result["retention_probability"] <= 100
        assert "risk_factors" in result
        assert "retention_strategies" in result

    def test_predict_client_value_trajectory(self, lifecycle_service):
        """Test client value trajectory prediction."""
        # Arrange
        client_data = {
            "historical_spend": [
                {"month": "2024-01", "amount": Decimal("80.00")},
                {"month": "2024-02", "amount": Decimal("120.00")},
                {"month": "2024-03", "amount": Decimal("95.00")}
            ],
            "engagement_score": 78,
            "satisfaction_trend": "IMPROVING"
        }
        
        # Act
        result = lifecycle_service.predict_client_value_trajectory(client_data)
        
        # Assert
        assert result["success"] is True
        assert "predicted_6_month_value" in result
        assert "predicted_12_month_value" in result
        assert "growth_trajectory" in result["prediction"]

    def test_generate_retention_action_plan(self, lifecycle_service):
        """Test retention action plan generation."""
        # Arrange
        at_risk_client = {
            "client_id": 1,
            "risk_score": 75,
            "last_visit": datetime.utcnow() - timedelta(days=35),
            "satisfaction_score": 3.8,
            "value_tier": "SILVER"
        }
        
        # Act
        result = lifecycle_service.generate_retention_action_plan(at_risk_client)
        
        # Assert
        assert result["success"] is True
        assert "action_plan" in result
        assert len(result["action_plan"]) > 0
        assert all("action" in step for step in result["action_plan"])
        assert all("priority" in step for step in result["action_plan"])


# Integration test helpers and fixtures
@pytest.fixture
def mock_db_session():
    """Mock database session for testing."""
    return Mock(spec=Session)


@pytest.fixture
def six_figure_barber_test_data():
    """Comprehensive test data for Six Figure Barber scenarios."""
    return {
        "barber": {
            "id": 1,
            "name": "Professional Barber",
            "email": "pro@sixfigurebarber.com",
            "six_figure_enrolled": True,
            "target_annual_revenue": Decimal("150000.00")
        },
        "clients": [
            {
                "id": 1,
                "name": "High Value Client",
                "tier": "PLATINUM",
                "lifetime_value": Decimal("2400.00"),
                "visit_frequency": 6
            },
            {
                "id": 2,
                "name": "Growing Client",
                "tier": "SILVER",
                "lifetime_value": Decimal("960.00"),
                "visit_frequency": 3
            }
        ],
        "revenue_metrics": {
            "monthly_revenue": Decimal("12500.00"),
            "revenue_per_hour": Decimal("125.00"),
            "client_retention_rate": 87.5,
            "average_service_value": Decimal("95.00")
        }
    }


# Performance benchmark tests
def test_six_figure_calculations_performance():
    """Test that Six Figure Barber calculations complete within acceptable time."""
    import time
    
    service = SixFigureBarberCoreService(Mock())
    
    # Mock large dataset
    large_metrics_data = {
        "client_satisfaction": 4.8,
        "on_time_percentage": 95.0,
        "rebooking_rate": 85.0,
        "referral_rate": 25.0,
        "revenue_per_service": Decimal("125.00")
    }
    
    start_time = time.time()
    result = service.calculate_service_excellence_score(large_metrics_data)
    end_time = time.time()
    
    # Should complete within 100ms
    assert (end_time - start_time) < 0.1
    assert result["success"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])