"""
Integration tests for Real-Time Analytics API

Tests the complete real-time analytics API endpoints including:
- Dashboard data retrieval
- Live predictions API
- Alerts management
- Performance metrics
- Error handling and authentication
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


class TestRealTimeAnalyticsAPI:
    """Integration tests for real-time analytics API endpoints"""

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user"""
        user = Mock(spec=User)
        user.id = 123
        user.email = "test@example.com"
        user.name = "Test User"
        return user

    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        return {"Authorization": "Bearer mock-jwt-token"}

    @pytest.fixture
    def mock_dashboard_data(self):
        """Mock dashboard data response"""
        return {
            "live_metrics": {
                "current_no_show_rate": 0.15,
                "prediction_accuracy": 0.87,
                "intervention_success_rate": 0.73,
                "average_risk_score": 0.42,
                "total_appointments_today": 25,
                "high_risk_appointments": 5,
                "ai_prevented_no_shows": 8,
                "revenue_saved_today": 400.0
            },
            "risk_distribution": {
                "LOW": 15,
                "MEDIUM": 8,
                "HIGH": 5,
                "CRITICAL": 2
            },
            "active_alerts": [
                {
                    "id": "alert_1",
                    "severity": "high",
                    "alert_type": "high_risk_spike",
                    "message": "High risk appointments increasing",
                    "created_at": datetime.utcnow().isoformat(),
                    "appointment_id": 456
                }
            ],
            "optimization_recommendations": [
                {
                    "category": "messaging",
                    "recommendation": "Try more urgent reminder messages",
                    "impact": "high",
                    "implementation_effort": "easy"
                }
            ],
            "dashboard_metadata": {
                "last_updated": datetime.utcnow().isoformat(),
                "system_status": "healthy",
                "ai_services_status": {"prediction": "active", "intervention": "active"},
                "refresh_rate": 30
            }
        }

    @pytest.fixture
    def mock_predictions_data(self):
        """Mock live predictions response"""
        return {
            "predictions": [
                {
                    "appointment_id": 789,
                    "client_name": "John Doe",
                    "appointment_time": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                    "risk_score": 0.8,
                    "risk_level": "HIGH",
                    "risk_factors": ["client_history", "appointment_timing"],
                    "intervention_recommended": True,
                    "potential_revenue_loss": 75.0,
                    "barber_name": "Mike Johnson"
                }
            ],
            "prediction_metadata": {
                "total_appointments": 30,
                "high_risk_count": 5,
                "revenue_at_risk": 375.0,
                "last_updated": datetime.utcnow().isoformat()
            },
            "risk_summary": {
                "low_risk": 20,
                "medium_risk": 5,
                "high_risk": 4,
                "critical_risk": 1
            }
        }

    async def override_get_current_user():
        """Override dependency for testing"""
        user = Mock(spec=User)
        user.id = 123
        user.email = "test@example.com"
        return user

    @pytest_asyncio.async_test
    async def test_get_realtime_dashboard_success(self, mock_dashboard_data):
        """Test successful dashboard data retrieval"""
        # Override auth dependency
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            # Mock analytics service
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/dashboard?time_range=24h")

            assert response.status_code == 200
            data = response.json()
            
            # Verify dashboard structure
            assert "live_metrics" in data
            assert "risk_distribution" in data
            assert "active_alerts" in data
            assert data["live_metrics"]["current_no_show_rate"] == 0.15
            assert data["risk_distribution"]["LOW"] == 15
            assert len(data["active_alerts"]) == 1

        # Clean up
        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_realtime_dashboard_with_time_range(self, mock_dashboard_data):
        """Test dashboard with different time ranges"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                # Test different time ranges
                for time_range in ["1h", "24h", "7d", "30d"]:
                    response = await client.get(f"/api/v1/realtime-analytics/dashboard?time_range={time_range}")
                    assert response.status_code == 200

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_live_predictions_success(self, mock_predictions_data):
        """Test successful live predictions retrieval"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_live_predictions = AsyncMock(return_value=mock_predictions_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/predictions?hours_ahead=48")

            assert response.status_code == 200
            data = response.json()
            
            # Verify predictions structure
            assert "predictions" in data
            assert "prediction_metadata" in data
            assert len(data["predictions"]) == 1
            assert data["predictions"][0]["risk_level"] == "HIGH"
            assert data["predictions"][0]["intervention_recommended"] is True

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_live_predictions_filter_low_risk(self, mock_predictions_data):
        """Test filtering out low-risk predictions"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        # Add low-risk prediction to mock data
        mock_predictions_data["predictions"].append({
            "appointment_id": 790,
            "client_name": "Jane Smith",
            "appointment_time": (datetime.utcnow() + timedelta(hours=36)).isoformat(),
            "risk_score": 0.2,
            "risk_level": "LOW",
            "risk_factors": [],
            "intervention_recommended": False,
            "potential_revenue_loss": 0.0,
            "barber_name": "Sarah Wilson"
        })

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_live_predictions = AsyncMock(return_value=mock_predictions_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/predictions?include_low_risk=false")

            assert response.status_code == 200
            data = response.json()
            
            # Should filter out LOW risk predictions
            assert len(data["predictions"]) == 1
            assert data["predictions"][0]["risk_level"] == "HIGH"

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_active_alerts_success(self):
        """Test successful alerts retrieval"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_dashboard_data = {
            "active_alerts": [
                {
                    "id": "alert_1",
                    "severity": "critical",
                    "alert_type": "system_error",
                    "message": "AI service degraded",
                    "created_at": datetime.utcnow().isoformat()
                },
                {
                    "id": "alert_2",
                    "severity": "medium",
                    "alert_type": "performance",
                    "message": "Prediction accuracy below threshold",
                    "created_at": datetime.utcnow().isoformat()
                }
            ]
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/alerts")

            assert response.status_code == 200
            data = response.json()
            
            # Verify alerts structure
            assert "alerts" in data
            assert "total_count" in data
            assert "active_critical_alerts" in data
            assert len(data["alerts"]) == 2
            assert data["active_critical_alerts"] == 1

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_alerts_with_filters(self):
        """Test alerts retrieval with severity and type filters"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_dashboard_data = {
            "active_alerts": [
                {
                    "id": "alert_1",
                    "severity": "critical",
                    "alert_type": "system_error",
                    "message": "Critical error",
                    "created_at": datetime.utcnow().isoformat()
                },
                {
                    "id": "alert_2",
                    "severity": "medium",
                    "alert_type": "performance",
                    "message": "Medium warning",
                    "created_at": datetime.utcnow().isoformat()
                }
            ]
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                # Filter by severity
                response = await client.get("/api/v1/realtime-analytics/alerts?severity=critical")
                assert response.status_code == 200
                data = response.json()
                assert len(data["alerts"]) == 1
                assert data["alerts"][0]["severity"] == "critical"

                # Filter by type
                response = await client.get("/api/v1/realtime-analytics/alerts?alert_type=performance")
                assert response.status_code == 200
                data = response.json()
                assert len(data["alerts"]) == 1
                assert data["alerts"][0]["alert_type"] == "performance"

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_live_metrics_success(self):
        """Test successful live metrics retrieval"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_dashboard_data = {
            "live_metrics": {
                "prediction_accuracy": 0.89,
                "intervention_success_rate": 0.76,
                "system_response_time": 150,
                "active_predictions": 25
            },
            "dashboard_metadata": {
                "system_status": "healthy",
                "ai_services_status": {"prediction": "active", "intervention": "active"}
            }
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/metrics")

            assert response.status_code == 200
            data = response.json()
            
            # Verify metrics structure
            assert "metrics" in data
            assert "system_health" in data
            assert "last_updated" in data
            assert data["metrics"]["prediction_accuracy"] == 0.89
            assert data["system_health"] == "healthy"

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_metrics_with_filter(self):
        """Test metrics retrieval with specific metric types"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_dashboard_data = {
            "live_metrics": {
                "prediction_accuracy": 0.89,
                "intervention_success_rate": 0.76,
                "system_response_time": 150,
                "active_predictions": 25
            },
            "dashboard_metadata": {
                "system_status": "healthy"
            }
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/metrics?metric_types=prediction_accuracy&metric_types=intervention_success_rate")

            assert response.status_code == 200
            data = response.json()
            
            # Should only include requested metrics
            assert "prediction_accuracy" in data["metrics"]
            assert "intervention_success_rate" in data["metrics"]
            assert "system_response_time" not in data["metrics"]

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_create_custom_alert_success(self):
        """Test successful custom alert creation"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        alert_request = {
            "alert_type": "custom_threshold",
            "condition": "no_show_rate > 0.20",
            "severity": "high",
            "notification_channels": ["email", "dashboard"]
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.create_custom_alert = AsyncMock(return_value={
                "success": True,
                "alert_id": "custom_alert_123",
                "monitoring_active": True,
                "next_check": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
            })
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/realtime-analytics/alerts",
                    json=alert_request
                )

            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert "alert_id" in data
            assert data["monitoring_active"] is True

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_track_intervention_performance_success(self):
        """Test successful intervention performance tracking"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        intervention_id = 456
        mock_performance_data = {
            "intervention_id": intervention_id,
            "campaign_status": "active",
            "steps_completed": 2,
            "steps_total": 3,
            "client_responses": 1,
            "effectiveness_score": 0.75,
            "estimated_completion": (datetime.utcnow() + timedelta(hours=6)).isoformat()
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.track_intervention_performance = AsyncMock(return_value=mock_performance_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get(f"/api/v1/realtime-analytics/interventions/{intervention_id}")

            assert response.status_code == 200
            data = response.json()
            
            assert data["intervention_id"] == intervention_id
            assert data["campaign_status"] == "active"
            assert data["effectiveness_score"] == 0.75

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_track_intervention_not_found(self):
        """Test intervention tracking with non-existent intervention"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.track_intervention_performance = AsyncMock(return_value={
                "error": "Intervention not found"
            })
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/interventions/999")

            assert response.status_code == 404

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_ai_performance_metrics(self):
        """Test AI performance metrics retrieval"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_ai_performance = {
            "prediction_accuracy": {
                "current": 0.87,
                "trend": 0.02,
                "target": 0.90
            },
            "learning_progress": {
                "model_version": "v2.1",
                "training_iterations": 1250,
                "confidence_improvement": 0.15
            },
            "intervention_effectiveness": {
                "success_rate": 0.73,
                "average_response_time": 45,
                "roi_improvement": 0.22
            },
            "recommendations": [
                {
                    "category": "model_tuning",
                    "suggestion": "Increase training frequency",
                    "impact": "medium"
                }
            ]
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_ai_performance_metrics = AsyncMock(return_value=mock_ai_performance)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/ai-performance?time_range=7d")

            assert response.status_code == 200
            data = response.json()
            
            assert "prediction_accuracy" in data
            assert "learning_progress" in data
            assert "intervention_effectiveness" in data
            assert data["prediction_accuracy"]["current"] == 0.87

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_risk_distribution(self):
        """Test risk distribution analysis"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_dashboard_data = {
            "risk_distribution": {
                "LOW": 20,
                "MEDIUM": 8,
                "HIGH": 5,
                "CRITICAL": 2
            }
        }

        mock_predictions_data = {
            "risk_summary": {
                "low_risk": 18,
                "medium_risk": 7,
                "high_risk": 4,
                "critical_risk": 1
            }
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_analytics.get_live_predictions = AsyncMock(return_value=mock_predictions_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/risk-distribution?include_predictions=true")

            assert response.status_code == 200
            data = response.json()
            
            assert "risk_distribution" in data
            assert "future_predictions" in data
            assert data["risk_distribution"]["LOW"] == 20
            assert data["future_predictions"]["low_risk"] == 18

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_get_optimization_insights(self):
        """Test optimization insights retrieval"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_dashboard_data = {
            "optimization_recommendations": [
                {
                    "category": "timing",
                    "recommendation": "Send reminders 2 hours earlier",
                    "impact": "high",
                    "implementation_effort": "easy"
                }
            ],
            "performance_analytics": {
                "intervention_response_rate": 0.68,
                "message_engagement_rate": 0.72
            },
            "ai_learning_progress": {
                "model_accuracy_trend": 0.02,
                "learning_rate": 0.001
            },
            "client_behavior_trends": {
                "communication_preferences": {"sms": 0.8, "email": 0.2},
                "booking_patterns": {"morning": 0.4, "afternoon": 0.6}
            }
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/optimization-insights")

            assert response.status_code == 200
            data = response.json()
            
            assert "optimization_recommendations" in data
            assert "performance_insights" in data
            assert "learning_progress" in data
            assert "behavioral_trends" in data

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_check_system_health(self):
        """Test system health check"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        mock_dashboard_data = {
            "dashboard_metadata": {
                "system_status": "healthy",
                "ai_services_status": {
                    "prediction": "active",
                    "intervention": "active",
                    "optimization": "active"
                }
            },
            "active_alerts": [
                {
                    "id": "alert_1",
                    "severity": "medium",
                    "alert_type": "performance",
                    "message": "Minor performance issue"
                }
            ]
        }

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value=mock_dashboard_data)
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/health")

            assert response.status_code == 200
            data = response.json()
            
            assert data["system_status"] == "healthy"
            assert "ai_services_status" in data
            assert data["active_alerts_count"] == 1
            assert data["critical_alerts_count"] == 0

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_unauthorized_access(self):
        """Test API endpoints without authentication"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Test all protected endpoints without auth
            endpoints = [
                "/api/v1/realtime-analytics/dashboard",
                "/api/v1/realtime-analytics/predictions",
                "/api/v1/realtime-analytics/alerts",
                "/api/v1/realtime-analytics/metrics"
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint)
                assert response.status_code == 401  # Unauthorized

    @pytest_asyncio.async_test
    async def test_service_error_handling(self):
        """Test API error handling when service fails"""
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(side_effect=Exception("Service unavailable"))
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/api/v1/realtime-analytics/dashboard")

            assert response.status_code == 500
            data = response.json()
            assert "Failed to generate real-time dashboard" in data["detail"]

        app.dependency_overrides.clear()

    @pytest_asyncio.async_test
    async def test_rate_limiting(self):
        """Test API rate limiting (if implemented)"""
        # This would test rate limiting if implemented
        # For now, just verify the endpoint is accessible
        app.dependency_overrides[get_current_user] = override_get_current_user

        with patch('services.realtime_no_show_analytics.get_realtime_no_show_analytics') as mock_service:
            mock_analytics = Mock()
            mock_analytics.get_realtime_dashboard = AsyncMock(return_value={})
            mock_service.return_value = mock_analytics

            async with AsyncClient(app=app, base_url="http://test") as client:
                # Make multiple rapid requests
                responses = []
                for _ in range(5):
                    response = await client.get("/api/v1/realtime-analytics/dashboard")
                    responses.append(response.status_code)

            # All should succeed (rate limiting not yet implemented)
            assert all(status == 200 for status in responses)

        app.dependency_overrides.clear()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])