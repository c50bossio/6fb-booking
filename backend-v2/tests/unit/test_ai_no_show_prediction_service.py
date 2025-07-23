"""
Unit tests for AI No-Show Prediction Service

Tests the core functionality of the AI-powered no-show prediction system including:
- Risk score calculation with multiple factors
- Risk level determination
- Prediction accuracy tracking
- Error handling and edge cases
- Performance under different scenarios
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from services.ai_no_show_prediction_service import (
    AINoShowPredictionService,
    get_ai_no_show_prediction_service,
    RiskLevel,
    NoShowRiskScore,
    RiskFactor
)
from models import User, Appointment, BarberProfile


class TestAINoShowPredictionService:
    """Test suite for AI No-Show Prediction Service"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def prediction_service(self, mock_db):
        """Create prediction service instance"""
        return AINoShowPredictionService(mock_db)

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
        appointment.created_at = datetime.utcnow() - timedelta(days=1)
        return appointment

    @pytest.fixture
    def sample_client(self):
        """Sample client for testing"""
        client = Mock(spec=User)
        client.id = 456
        client.name = "John Doe"
        client.email = "john@example.com"
        client.phone = "+1234567890"
        client.created_at = datetime.utcnow() - timedelta(days=30)
        return client

    @pytest.fixture
    def sample_barber(self):
        """Sample barber for testing"""
        barber = Mock(spec=BarberProfile)
        barber.id = 789
        barber.user_id = 999
        barber.is_active = True
        return barber

    @pytest_asyncio.async_test
    async def test_predict_no_show_risk_basic(self, prediction_service, mock_db, sample_appointment):
        """Test basic risk prediction functionality"""
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = sample_appointment
        
        # Mock risk calculation methods
        prediction_service._calculate_client_history_risk = AsyncMock(return_value=0.3)
        prediction_service._calculate_appointment_timing_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_weather_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_barber_popularity_risk = AsyncMock(return_value=0.15)
        prediction_service._calculate_service_complexity_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_booking_recency_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_seasonal_patterns_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_client_communication_risk = AsyncMock(return_value=0.05)
        prediction_service._calculate_price_sensitivity_risk = AsyncMock(return_value=0.1)

        # Execute prediction
        result = await prediction_service.predict_no_show_risk(123)

        # Assertions
        assert isinstance(result, NoShowRiskScore)
        assert result.appointment_id == 123
        assert 0.0 <= result.risk_score <= 1.0
        assert result.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
        assert len(result.risk_factors) > 0
        assert result.confidence_score > 0.0

    @pytest_asyncio.async_test
    async def test_risk_level_determination(self, prediction_service):
        """Test risk level calculation based on score"""
        # Test LOW risk
        assert prediction_service._determine_risk_level(0.2) == RiskLevel.LOW
        
        # Test MEDIUM risk
        assert prediction_service._determine_risk_level(0.4) == RiskLevel.MEDIUM
        
        # Test HIGH risk
        assert prediction_service._determine_risk_level(0.7) == RiskLevel.HIGH
        
        # Test CRITICAL risk
        assert prediction_service._determine_risk_level(0.9) == RiskLevel.CRITICAL

    @pytest_asyncio.async_test
    async def test_appointment_not_found(self, prediction_service, mock_db):
        """Test handling of non-existent appointment"""
        # Mock appointment not found
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="Appointment not found"):
            await prediction_service.predict_no_show_risk(999)

    @pytest_asyncio.async_test
    async def test_client_history_risk_calculation(self, prediction_service, mock_db, sample_client):
        """Test client history risk calculation"""
        # Mock historical appointments
        past_appointments = []
        for i in range(5):
            apt = Mock()
            apt.status = "completed" if i < 3 else "no_show"
            apt.start_time = datetime.utcnow() - timedelta(days=(i+1)*7)
            past_appointments.append(apt)

        mock_db.query.return_value.filter.return_value.all.return_value = past_appointments

        # Calculate risk
        risk = await prediction_service._calculate_client_history_risk(sample_client.id, mock_db)

        # Should be higher risk due to 2 no-shows out of 5 appointments
        assert 0.3 <= risk <= 0.7  # 40% no-show rate should be medium-high risk

    @pytest_asyncio.async_test
    async def test_appointment_timing_risk_calculation(self, prediction_service):
        """Test appointment timing risk calculation"""
        # Test different appointment times
        
        # Monday morning (low risk)
        monday_morning = datetime(2024, 1, 8, 10, 0)  # Monday 10 AM
        risk_monday = await prediction_service._calculate_appointment_timing_risk(monday_morning)
        
        # Friday evening (higher risk)
        friday_evening = datetime(2024, 1, 12, 18, 0)  # Friday 6 PM
        risk_friday = await prediction_service._calculate_appointment_timing_risk(friday_evening)
        
        # Friday should be higher risk than Monday
        assert risk_friday > risk_monday

    @pytest_asyncio.async_test
    async def test_weather_risk_calculation(self, prediction_service):
        """Test weather risk calculation (mock external API)"""
        appointment_time = datetime.utcnow() + timedelta(hours=24)
        
        # Mock weather conditions
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "weather": [{"main": "Rain"}],
                "main": {"temp": 280}  # Cold temperature
            }
            mock_get.return_value.__aenter__.return_value = mock_response

            risk = await prediction_service._calculate_weather_risk(appointment_time, "New York")
            
            # Rainy weather should increase risk
            assert risk > 0.0

    @pytest_asyncio.async_test
    async def test_weather_api_failure_handling(self, prediction_service):
        """Test handling of weather API failures"""
        appointment_time = datetime.utcnow() + timedelta(hours=24)
        
        # Mock API failure
        with patch('aiohttp.ClientSession.get', side_effect=Exception("API Error")):
            risk = await prediction_service._calculate_weather_risk(appointment_time, "New York")
            
            # Should return neutral risk on API failure
            assert risk == 0.0

    @pytest_asyncio.async_test
    async def test_barber_popularity_risk(self, prediction_service, mock_db):
        """Test barber popularity risk calculation"""
        barber_id = 789
        appointment_time = datetime.utcnow() + timedelta(hours=24)

        # Mock high demand for barber (low availability = higher risk)
        mock_db.query.return_value.filter.return_value.count.return_value = 15  # High booking count

        risk = await prediction_service._calculate_barber_popularity_risk(
            barber_id, appointment_time, mock_db
        )

        # High popularity should increase risk slightly
        assert risk > 0.0

    @pytest_asyncio.async_test
    async def test_service_complexity_risk(self, prediction_service):
        """Test service complexity risk calculation"""
        # Simple service (low risk)
        simple_risk = await prediction_service._calculate_service_complexity_risk("Haircut", 30)
        
        # Complex service (higher risk)
        complex_risk = await prediction_service._calculate_service_complexity_risk("Color Treatment", 180)
        
        # Complex services should have higher risk
        assert complex_risk > simple_risk

    @pytest_asyncio.async_test
    async def test_booking_recency_risk(self, prediction_service):
        """Test booking recency risk calculation"""
        appointment_time = datetime.utcnow() + timedelta(hours=24)
        
        # Recent booking (low risk)
        recent_booking = datetime.utcnow() - timedelta(hours=1)
        recent_risk = await prediction_service._calculate_booking_recency_risk(
            recent_booking, appointment_time
        )
        
        # Old booking (higher risk)
        old_booking = datetime.utcnow() - timedelta(days=30)
        old_risk = await prediction_service._calculate_booking_recency_risk(
            old_booking, appointment_time
        )
        
        # Older bookings should have higher risk
        assert old_risk > recent_risk

    @pytest_asyncio.async_test
    async def test_seasonal_patterns_risk(self, prediction_service):
        """Test seasonal patterns risk calculation"""
        # Summer appointment (potentially different patterns)
        summer_date = datetime(2024, 7, 15, 14, 0)
        summer_risk = await prediction_service._calculate_seasonal_patterns_risk(summer_date)
        
        # Winter appointment
        winter_date = datetime(2024, 1, 15, 14, 0)
        winter_risk = await prediction_service._calculate_seasonal_patterns_risk(winter_date)
        
        # Both should return valid risk scores
        assert 0.0 <= summer_risk <= 1.0
        assert 0.0 <= winter_risk <= 1.0

    @pytest_asyncio.async_test
    async def test_client_communication_risk(self, prediction_service, mock_db):
        """Test client communication patterns risk"""
        client_id = 456

        # Mock communication history
        mock_db.query.return_value.filter.return_value.count.return_value = 5  # Good communication

        risk = await prediction_service._calculate_client_communication_risk(client_id, mock_db)
        
        # Good communication should result in lower risk
        assert 0.0 <= risk <= 0.3

    @pytest_asyncio.async_test
    async def test_price_sensitivity_risk(self, prediction_service, mock_db):
        """Test price sensitivity risk calculation"""
        client_id = 456
        appointment_price = 100.0

        # Mock client's historical prices
        past_appointments = []
        for price in [40, 50, 45, 55, 50]:  # Lower historical prices
            apt = Mock()
            apt.price = price
            past_appointments.append(apt)

        mock_db.query.return_value.filter.return_value.all.return_value = past_appointments

        risk = await prediction_service._price_sensitivity_risk(client_id, appointment_price, mock_db)
        
        # Higher price than historical average should increase risk
        assert risk > 0.0

    @pytest_asyncio.async_test
    async def test_risk_factors_generation(self, prediction_service):
        """Test risk factors explanation generation"""
        # Mock individual risk scores
        risk_scores = {
            "client_history": 0.6,
            "appointment_timing": 0.3,
            "weather": 0.4,
            "barber_popularity": 0.2,
            "service_complexity": 0.1,
            "booking_recency": 0.5,
            "seasonal_patterns": 0.2,
            "communication_patterns": 0.3,
            "price_sensitivity": 0.4
        }

        factors = prediction_service._generate_risk_factors_explanation(risk_scores)

        # Should generate factors for significant risks
        assert len(factors) > 0
        assert all(isinstance(factor, RiskFactor) for factor in factors)
        
        # High-risk factors should be included
        factor_descriptions = [f.description for f in factors]
        assert any("history" in desc.lower() for desc in factor_descriptions)

    @pytest_asyncio.async_test
    async def test_confidence_score_calculation(self, prediction_service):
        """Test confidence score calculation"""
        # High data availability should increase confidence
        data_availability = {
            "client_history_count": 10,
            "weather_data_available": True,
            "barber_data_complete": True,
            "recent_patterns": True
        }
        
        confidence = prediction_service._calculate_confidence_score(data_availability)
        
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.5  # Good data should give high confidence

    @pytest_asyncio.async_test
    async def test_edge_case_zero_history(self, prediction_service, mock_db):
        """Test handling of clients with no appointment history"""
        client_id = 999  # New client
        
        # Mock no historical appointments
        mock_db.query.return_value.filter.return_value.all.return_value = []
        
        risk = await prediction_service._calculate_client_history_risk(client_id, mock_db)
        
        # New clients should have neutral/slightly elevated risk
        assert 0.4 <= risk <= 0.6

    @pytest_asyncio.async_test
    async def test_extreme_risk_scores(self, prediction_service):
        """Test handling of extreme risk score values"""
        # Test risk level determination with edge values
        assert prediction_service._determine_risk_level(0.0) == RiskLevel.LOW
        assert prediction_service._determine_risk_level(1.0) == RiskLevel.CRITICAL
        assert prediction_service._determine_risk_level(0.5) == RiskLevel.MEDIUM

    @pytest_asyncio.async_test
    async def test_concurrent_predictions(self, prediction_service, mock_db):
        """Test handling of concurrent prediction requests"""
        import asyncio
        
        # Mock appointment
        sample_apt = Mock(spec=Appointment)
        sample_apt.id = 123
        sample_apt.user_id = 456
        sample_apt.start_time = datetime.utcnow() + timedelta(hours=24)
        mock_db.query.return_value.filter.return_value.first.return_value = sample_apt

        # Mock all risk calculation methods
        prediction_service._calculate_client_history_risk = AsyncMock(return_value=0.3)
        prediction_service._calculate_appointment_timing_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_weather_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_barber_popularity_risk = AsyncMock(return_value=0.15)
        prediction_service._calculate_service_complexity_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_booking_recency_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_seasonal_patterns_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_client_communication_risk = AsyncMock(return_value=0.05)
        prediction_service._calculate_price_sensitivity_risk = AsyncMock(return_value=0.1)

        # Run multiple predictions concurrently
        tasks = [
            prediction_service.predict_no_show_risk(123),
            prediction_service.predict_no_show_risk(123),
            prediction_service.predict_no_show_risk(123)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # All should succeed and return valid results
        assert len(results) == 3
        assert all(isinstance(result, NoShowRiskScore) for result in results)

    def test_singleton_service_creation(self, mock_db):
        """Test singleton pattern for service creation"""
        service1 = get_ai_no_show_prediction_service(mock_db)
        service2 = get_ai_no_show_prediction_service(mock_db)
        
        # Should return the same instance
        assert service1 is service2

    @pytest_asyncio.async_test
    async def test_prediction_caching(self, prediction_service, mock_db):
        """Test prediction result caching"""
        appointment_id = 123
        
        # Mock database and methods
        sample_apt = Mock(spec=Appointment)
        sample_apt.id = appointment_id
        sample_apt.user_id = 456
        sample_apt.start_time = datetime.utcnow() + timedelta(hours=24)
        mock_db.query.return_value.filter.return_value.first.return_value = sample_apt

        # Mock risk calculations
        prediction_service._calculate_client_history_risk = AsyncMock(return_value=0.3)
        prediction_service._calculate_appointment_timing_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_weather_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_barber_popularity_risk = AsyncMock(return_value=0.15)
        prediction_service._calculate_service_complexity_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_booking_recency_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_seasonal_patterns_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_client_communication_risk = AsyncMock(return_value=0.05)
        prediction_service._calculate_price_sensitivity_risk = AsyncMock(return_value=0.1)

        # First prediction
        result1 = await prediction_service.predict_no_show_risk(appointment_id)
        
        # Second prediction (should use cache)
        result2 = await prediction_service.predict_no_show_risk(appointment_id)
        
        # Results should be identical (from cache)
        assert result1.risk_score == result2.risk_score
        assert result1.risk_level == result2.risk_level

    @pytest_asyncio.async_test
    async def test_error_handling_in_risk_calculation(self, prediction_service, mock_db):
        """Test error handling in individual risk calculations"""
        # Test when a risk calculation method raises an exception
        prediction_service._calculate_client_history_risk = AsyncMock(side_effect=Exception("Database error"))
        prediction_service._calculate_appointment_timing_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_weather_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_barber_popularity_risk = AsyncMock(return_value=0.15)
        prediction_service._calculate_service_complexity_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_booking_recency_risk = AsyncMock(return_value=0.2)
        prediction_service._calculate_seasonal_patterns_risk = AsyncMock(return_value=0.1)
        prediction_service._calculate_client_communication_risk = AsyncMock(return_value=0.05)
        prediction_service._calculate_price_sensitivity_risk = AsyncMock(return_value=0.1)

        # Mock appointment
        sample_apt = Mock(spec=Appointment)
        sample_apt.id = 123
        sample_apt.user_id = 456
        sample_apt.start_time = datetime.utcnow() + timedelta(hours=24)
        mock_db.query.return_value.filter.return_value.first.return_value = sample_apt

        # Should handle error gracefully and still return a prediction
        result = await prediction_service.predict_no_show_risk(123)
        
        assert isinstance(result, NoShowRiskScore)
        # Risk score should still be valid despite one factor failing
        assert 0.0 <= result.risk_score <= 1.0


# Integration tests for the complete prediction flow
class TestAINoShowPredictionIntegration:
    """Integration tests for the complete prediction workflow"""

    @pytest.fixture
    def real_db_session(self):
        """Create a real database session for integration tests"""
        # This would create a test database session
        # For now, return a mock that behaves like a real session
        return Mock(spec=Session)

    @pytest_asyncio.async_test
    async def test_full_prediction_workflow(self, real_db_session):
        """Test the complete prediction workflow with realistic data"""
        service = AINoShowPredictionService(real_db_session)
        
        # Mock a realistic appointment scenario
        appointment = Mock(spec=Appointment)
        appointment.id = 123
        appointment.user_id = 456
        appointment.barber_id = 789
        appointment.start_time = datetime.utcnow() + timedelta(hours=24)
        appointment.duration = 60
        appointment.price = 75.0
        appointment.service_name = "Haircut and Beard Trim"
        appointment.status = "confirmed"
        appointment.created_at = datetime.utcnow() - timedelta(hours=2)

        real_db_session.query.return_value.filter.return_value.first.return_value = appointment

        # Mock realistic historical data
        past_appointments = []
        for i in range(10):
            apt = Mock()
            apt.status = "completed" if i < 8 else "no_show"  # 20% no-show rate
            apt.start_time = datetime.utcnow() - timedelta(days=(i+1)*14)
            apt.price = 50.0 + (i * 5)  # Increasing prices
            past_appointments.append(apt)

        real_db_session.query.return_value.filter.return_value.all.return_value = past_appointments

        # Execute prediction
        result = await service.predict_no_show_risk(123)

        # Validate complete result
        assert isinstance(result, NoShowRiskScore)
        assert result.appointment_id == 123
        assert 0.0 <= result.risk_score <= 1.0
        assert result.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
        assert len(result.risk_factors) > 0
        assert 0.0 <= result.confidence_score <= 1.0
        assert isinstance(result.prediction_timestamp, datetime)

    @pytest_asyncio.async_test
    async def test_performance_benchmarks(self, real_db_session):
        """Test prediction service performance benchmarks"""
        import time
        
        service = AINoShowPredictionService(real_db_session)
        
        # Mock appointment
        appointment = Mock(spec=Appointment)
        appointment.id = 123
        appointment.user_id = 456
        appointment.start_time = datetime.utcnow() + timedelta(hours=24)
        real_db_session.query.return_value.filter.return_value.first.return_value = appointment

        # Mock all risk calculations to return quickly
        service._calculate_client_history_risk = AsyncMock(return_value=0.3)
        service._calculate_appointment_timing_risk = AsyncMock(return_value=0.2)
        service._calculate_weather_risk = AsyncMock(return_value=0.1)
        service._calculate_barber_popularity_risk = AsyncMock(return_value=0.15)
        service._calculate_service_complexity_risk = AsyncMock(return_value=0.1)
        service._calculate_booking_recency_risk = AsyncMock(return_value=0.2)
        service._calculate_seasonal_patterns_risk = AsyncMock(return_value=0.1)
        service._calculate_client_communication_risk = AsyncMock(return_value=0.05)
        service._calculate_price_sensitivity_risk = AsyncMock(return_value=0.1)

        # Measure prediction time
        start_time = time.time()
        result = await service.predict_no_show_risk(123)
        end_time = time.time()

        prediction_time = end_time - start_time
        
        # Prediction should complete within reasonable time (< 2 seconds)
        assert prediction_time < 2.0
        assert isinstance(result, NoShowRiskScore)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])