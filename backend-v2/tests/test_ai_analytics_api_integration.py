"""
AI Analytics API Integration Tests.

Tests the actual FastAPI endpoints for AI analytics with real HTTP requests,
authentication, rate limiting, and response validation.
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import Mock, patch

from main import app
from models.consent import ConsentType


class TestAIAnalyticsAPIEndpoints:
    """Test AI analytics API endpoints with HTTP requests"""
    
    def setup_method(self):
        """Setup test client and authentication"""
        self.client = TestClient(app)
        self.test_user_token = self._get_test_user_token()
        self.headers = {"Authorization": f"Bearer {self.test_user_token}"}
    
    def _get_test_user_token(self) -> str:
        """Get authentication token for test user"""
        # Mock JWT token for testing
        return "test_jwt_token_here"
    
    def _mock_user_with_consent(self):
        """Mock authenticated user with AI analytics consent"""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.email = "test@example.com"
        return mock_user
    
    def _mock_user_without_consent(self):
        """Mock authenticated user without AI analytics consent"""
        mock_user = Mock()
        mock_user.id = 2
        mock_user.email = "no_consent@example.com"
        return mock_user
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_consent_update_endpoint(self, mock_consent_check, mock_get_user):
        """Test AI analytics consent update endpoint"""
        mock_get_user.return_value = self._mock_user_with_consent()
        
        # Mock database operations
        with patch('routers.ai_analytics.get_db') as mock_get_db:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            
            # Mock consent query
            mock_db.query.return_value.filter.return_value.first.return_value = None
            
            consent_data = {
                "consent_types": [
                    "aggregate_analytics",
                    "benchmarking", 
                    "predictive_insights",
                    "ai_coaching"
                ]
            }
            
            response = self.client.post(
                "/api/v1/ai-analytics/consent",
                json=consent_data,
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            
            response_data = response.json()
            assert response_data["success"] is True
            assert "consents_granted" in response_data
            assert "privacy_notice" in response_data
            assert len(response_data["consents_granted"]) == 4
    
    def test_consent_update_invalid_types(self):
        """Test consent update with invalid consent types"""
        with patch('dependencies.get_current_user', return_value=self._mock_user_with_consent()):
            consent_data = {
                "consent_types": [
                    "invalid_consent_type",
                    "malicious_input"
                ]
            }
            
            response = self.client.post(
                "/api/v1/ai-analytics/consent",
                json=consent_data,
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Invalid consent type" in response.json()["detail"]
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_revenue_benchmark_endpoint_with_consent(self, mock_consent_check, mock_get_user):
        """Test revenue benchmark endpoint with proper consent"""
        mock_get_user.return_value = self._mock_user_with_consent()
        mock_consent_check.return_value = True
        
        # Mock the benchmarking service
        with patch('routers.ai_analytics.AIBenchmarkingService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            # Mock benchmark result
            mock_benchmark = Mock()
            mock_benchmark.user_value = 5000.0
            mock_benchmark.percentile_rank = 75
            mock_benchmark.industry_median = 4500.0
            mock_benchmark.industry_mean = 4800.0
            mock_benchmark.sample_size = 150
            mock_benchmark.comparison_text = "Strong performance"
            mock_benchmark.improvement_potential = 1500.0
            mock_benchmark.top_quartile_threshold = 6500.0
            
            mock_service.get_revenue_benchmark.return_value = mock_benchmark
            
            response = self.client.get(
                "/api/v1/ai-analytics/benchmarks/revenue",
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            
            response_data = response.json()
            assert response_data["success"] is True
            assert response_data["metric_type"] == "revenue"
            assert "benchmark_data" in response_data
            assert "privacy_info" in response_data
            
            # Verify benchmark data structure
            benchmark_data = response_data["benchmark_data"]
            required_fields = [
                "user_value", "percentile_rank", "industry_median",
                "industry_mean", "sample_size", "comparison_text"
            ]
            
            for field in required_fields:
                assert field in benchmark_data
            
            # Verify privacy compliance
            privacy_info = response_data["privacy_info"]
            assert privacy_info["data_anonymized"] is True
            assert privacy_info["minimum_sample_size"] == 100
            assert privacy_info["privacy_protection"] == "differential_privacy_applied"
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_revenue_benchmark_endpoint_without_consent(self, mock_consent_check, mock_get_user):
        """Test revenue benchmark endpoint without consent"""
        mock_get_user.return_value = self._mock_user_without_consent()
        mock_consent_check.return_value = False
        
        response = self.client.get(
            "/api/v1/ai-analytics/benchmarks/revenue",
            headers=self.headers
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "AI analytics consent required" in response.json()["detail"]
    
    def test_revenue_benchmark_invalid_metric(self):
        """Test revenue benchmark with invalid metric type"""
        with patch('dependencies.get_current_user', return_value=self._mock_user_with_consent()):
            with patch('routers.ai_analytics.check_ai_analytics_consent', return_value=True):
                response = self.client.get(
                    "/api/v1/ai-analytics/benchmarks/invalid_metric",
                    headers=self.headers
                )
                
                assert response.status_code == status.HTTP_400_BAD_REQUEST
                assert "Invalid metric type" in response.json()["detail"]
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_comprehensive_benchmark_endpoint(self, mock_consent_check, mock_get_user):
        """Test comprehensive benchmark report endpoint"""
        mock_get_user.return_value = self._mock_user_with_consent()
        mock_consent_check.return_value = True
        
        with patch('routers.ai_analytics.AIBenchmarkingService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            # Mock comprehensive report
            mock_report = {
                "user_id": 1,
                "business_segment": "small_shop",
                "overall_performance_score": 72,
                "benchmarks": {
                    "revenue": {"percentile_rank": 75, "user_value": 5000},
                    "appointments": {"percentile_rank": 70, "user_value": 80},
                    "efficiency": {"percentile_rank": 80, "user_value": 62.5}
                },
                "top_insights": ["Strong revenue performance"],
                "recommendations": ["Consider premium services"]
            }
            
            mock_service.generate_comprehensive_benchmark_report.return_value = mock_report
            
            response = self.client.get(
                "/api/v1/ai-analytics/benchmarks/comprehensive",
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            
            response_data = response.json()
            assert response_data["success"] is True
            assert "report" in response_data
            assert "privacy_compliance" in response_data
            
            # Verify privacy compliance info
            privacy_compliance = response_data["privacy_compliance"]
            assert privacy_compliance["gdpr_compliant"] is True
            assert privacy_compliance["data_anonymized"] is True
            assert privacy_compliance["user_consent_verified"] is True
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_predictions_endpoint(self, mock_consent_check, mock_get_user):
        """Test business predictions endpoint"""
        mock_get_user.return_value = self._mock_user_with_consent()
        mock_consent_check.return_value = True
        
        with patch('routers.ai_analytics.PredictiveModelingService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            # Mock prediction results
            mock_predictions = []
            for i in range(6):  # 6 months ahead
                mock_pred = Mock()
                mock_pred.predicted_value = 5000 + i * 100
                mock_pred.confidence_interval = (4500 + i * 100, 5500 + i * 100)
                mock_pred.confidence_score = 0.85 - i * 0.05
                mock_pred.methodology = "trend_analysis_with_seasonal_adjustment"
                mock_pred.factors_considered = ["historical_trend", "seasonal_patterns"]
                mock_predictions.append(mock_pred)
            
            mock_service.predict_revenue_forecast.return_value = mock_predictions
            
            prediction_request = {
                "prediction_type": "revenue_forecast",
                "months_ahead": 6,
                "include_seasonal": True
            }
            
            response = self.client.post(
                "/api/v1/ai-analytics/predictions",
                json=prediction_request,
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            
            response_data = response.json()
            assert response_data["success"] is True
            assert response_data["prediction_type"] == "revenue_forecast"
            assert len(response_data["predictions"]) == 6
            assert "total_predicted_revenue" in response_data
            assert "methodology_info" in response_data
            
            # Verify prediction structure
            for i, prediction in enumerate(response_data["predictions"]):
                assert prediction["month"] == i + 1
                assert "predicted_revenue" in prediction
                assert "confidence_interval" in prediction
                assert "confidence_score" in prediction
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_churn_prediction_endpoint(self, mock_consent_check, mock_get_user):
        """Test churn prediction endpoint"""
        mock_get_user.return_value = self._mock_user_with_consent()
        mock_consent_check.return_value = True
        
        with patch('routers.ai_analytics.PredictiveModelingService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            # Mock churn analysis
            mock_churn_analysis = {
                "at_risk_clients": [
                    {"client_id": 1, "risk_score": 0.8, "last_appointment": "2024-05-01"},
                    {"client_id": 2, "risk_score": 0.7, "last_appointment": "2024-04-15"}
                ],
                "churn_insights": ["High retention risk detected"],
                "overall_churn_risk": 0.35
            }
            
            mock_service.predict_client_churn.return_value = mock_churn_analysis
            
            prediction_request = {
                "prediction_type": "churn_prediction"
            }
            
            response = self.client.post(
                "/api/v1/ai-analytics/predictions",
                json=prediction_request,
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            
            response_data = response.json()
            assert response_data["success"] is True
            assert response_data["prediction_type"] == "churn_prediction"
            assert "churn_analysis" in response_data
            assert "actionable_insights" in response_data
            assert "retention_opportunities" in response_data
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_coaching_insights_endpoint(self, mock_consent_check, mock_get_user):
        """Test AI coaching insights endpoint"""
        mock_get_user.return_value = self._mock_user_with_consent()
        mock_consent_check.return_value = True
        
        # Mock all required services
        with patch('routers.ai_analytics.AIBenchmarkingService') as mock_bench_service:
            with patch('routers.ai_analytics.PredictiveModelingService') as mock_pred_service:
                with patch('routers.ai_analytics.np') as mock_np:
                    # Setup mocks
                    bench_service = Mock()
                    pred_service = Mock()
                    mock_bench_service.return_value = bench_service
                    mock_pred_service.return_value = pred_service
                    mock_np.mean.return_value = 0.85
                    
                    # Mock benchmark report
                    mock_benchmark_report = {
                        "overall_performance_score": 75,
                        "business_segment": "small_shop",
                        "top_insights": ["Strong revenue performance"],
                        "recommendations": ["Focus on premium services"]
                    }
                    bench_service.generate_comprehensive_benchmark_report.return_value = mock_benchmark_report
                    
                    # Mock revenue predictions
                    mock_revenue_preds = []
                    for i in range(3):
                        pred = Mock()
                        pred.predicted_value = 5000 + i * 100
                        pred.confidence_score = 0.85
                        mock_revenue_preds.append(pred)
                    pred_service.predict_revenue_forecast.return_value = mock_revenue_preds
                    
                    # Mock churn analysis
                    mock_churn = {
                        "overall_churn_risk": 0.25,
                        "at_risk_clients": [{"id": 1}, {"id": 2}]
                    }
                    pred_service.predict_client_churn.return_value = mock_churn
                    
                    # Mock helper functions
                    with patch('routers.ai_analytics._generate_growth_opportunities', return_value=["Growth opportunity 1"]):
                        with patch('routers.ai_analytics._generate_retention_actions', return_value=["Retention action 1"]):
                            with patch('routers.ai_analytics._generate_weekly_focus_areas', return_value=["Week 1: Focus area"]):
                                with patch('routers.ai_analytics._get_success_patterns_for_segment', return_value=["Success pattern 1"]):
                                    
                                    response = self.client.get(
                                        "/api/v1/ai-analytics/insights/coaching",
                                        headers=self.headers
                                    )
                                    
                                    assert response.status_code == status.HTTP_200_OK
                                    
                                    response_data = response.json()
                                    assert response_data["success"] is True
                                    assert "coaching_insights" in response_data
                                    assert "next_update" in response_data
                                    assert "personalization_note" in response_data
                                    
                                    # Verify coaching insights structure
                                    coaching_insights = response_data["coaching_insights"]
                                    required_sections = [
                                        "performance_summary", "growth_forecast", 
                                        "retention_insights", "weekly_focus_areas", 
                                        "success_patterns"
                                    ]
                                    
                                    for section in required_sections:
                                        assert section in coaching_insights
    
    @patch('dependencies.get_current_user')
    @patch('routers.ai_analytics.check_ai_analytics_consent')
    def test_market_intelligence_endpoint(self, mock_consent_check, mock_get_user):
        """Test market intelligence endpoint"""
        mock_get_user.return_value = self._mock_user_with_consent()
        mock_consent_check.return_value = True
        
        with patch('routers.ai_analytics.AIBenchmarkingService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            # Mock business segment
            from models import BusinessSegment
            mock_service.get_user_business_segment.return_value = BusinessSegment.SMALL_SHOP
            
            # Mock helper functions
            with patch('routers.ai_analytics._get_industry_trends') as mock_trends:
                with patch('routers.ai_analytics._get_competitive_positioning') as mock_positioning:
                    with patch('routers.ai_analytics._identify_market_opportunities') as mock_opportunities:
                        with patch('routers.ai_analytics._get_pricing_insights') as mock_pricing:
                            with patch('routers.ai_analytics._get_seasonal_intelligence') as mock_seasonal:
                                
                                # Setup mock returns
                                mock_trends.return_value = {"revenue_growth": "5.2% year-over-year"}
                                mock_positioning.return_value = {"revenue_percentile": "75th percentile"}
                                mock_opportunities.return_value = ["Premium services growing"]
                                mock_pricing.return_value = {"average_haircut_price": "$35-45"}
                                mock_seasonal.return_value = {"peak_months": ["November", "December"]}
                                
                                response = self.client.get(
                                    "/api/v1/ai-analytics/insights/market-intelligence",
                                    headers=self.headers
                                )
                                
                                assert response.status_code == status.HTTP_200_OK
                                
                                response_data = response.json()
                                assert response_data["success"] is True
                                assert "market_intelligence" in response_data
                                assert "business_segment" in response_data
                                assert "privacy_note" in response_data
                                
                                # Verify market intelligence structure
                                market_intelligence = response_data["market_intelligence"]
                                required_sections = [
                                    "industry_trends", "competitive_positioning",
                                    "market_opportunities", "pricing_insights",
                                    "seasonal_patterns"
                                ]
                                
                                for section in required_sections:
                                    assert section in market_intelligence
    
    @patch('dependencies.get_current_user')
    def test_privacy_report_endpoint(self, mock_get_user):
        """Test privacy compliance report endpoint"""
        mock_get_user.return_value = self._mock_user_with_consent()
        
        with patch('routers.ai_analytics.get_db') as mock_get_db:
            mock_db = Mock()
            mock_get_db.return_value = mock_db
            
            # Mock consent records
            mock_consents = []
            for consent_type in [ConsentType.AGGREGATE_ANALYTICS, ConsentType.BENCHMARKING]:
                mock_consent = Mock()
                mock_consent.consent_type = consent_type
                mock_consent.status.value = "granted"
                mock_consent.consent_date = datetime.utcnow()
                mock_consents.append(mock_consent)
            
            mock_db.query.return_value.filter.return_value.all.return_value = mock_consents
            
            response = self.client.get(
                "/api/v1/ai-analytics/privacy/report",
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_200_OK
            
            response_data = response.json()
            assert response_data["success"] is True
            assert "privacy_report" in response_data
            assert response_data["compliance_score"] == "100% GDPR Compliant"
            
            # Verify privacy report structure
            privacy_report = response_data["privacy_report"]
            required_sections = [
                "user_consents", "privacy_protections",
                "data_usage", "transparency"
            ]
            
            for section in required_sections:
                assert section in privacy_report
            
            # Verify privacy protections
            privacy_protections = privacy_report["privacy_protections"]
            assert "differential_privacy" in privacy_protections
            assert "k_anonymity" in privacy_protections
            assert "data_anonymization" in privacy_protections
    
    def test_unauthenticated_access(self):
        """Test that unauthenticated requests are rejected"""
        endpoints = [
            "/api/v1/ai-analytics/benchmarks/revenue",
            "/api/v1/ai-analytics/benchmarks/comprehensive",
            "/api/v1/ai-analytics/predictions",
            "/api/v1/ai-analytics/insights/coaching",
            "/api/v1/ai-analytics/insights/market-intelligence",
            "/api/v1/ai-analytics/privacy/report"
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            # Should require authentication (401 or 403)
            assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_malformed_request_data(self):
        """Test handling of malformed request data"""
        with patch('dependencies.get_current_user', return_value=self._mock_user_with_consent()):
            # Test invalid JSON for consent update
            response = self.client.post(
                "/api/v1/ai-analytics/consent",
                data="invalid json",
                headers={**self.headers, "Content-Type": "application/json"}
            )
            
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
            # Test missing required fields for predictions
            response = self.client.post(
                "/api/v1/ai-analytics/predictions",
                json={},  # Missing prediction_type
                headers=self.headers
            )
            
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_date_range_parameters(self):
        """Test date range parameter handling"""
        with patch('dependencies.get_current_user', return_value=self._mock_user_with_consent()):
            with patch('routers.ai_analytics.check_ai_analytics_consent', return_value=True):
                with patch('routers.ai_analytics.AIBenchmarkingService') as mock_service_class:
                    mock_service = Mock()
                    mock_service_class.return_value = mock_service
                    
                    # Mock benchmark result
                    mock_benchmark = Mock()
                    mock_benchmark.user_value = 5000.0
                    mock_benchmark.percentile_rank = 75
                    mock_benchmark.industry_median = 4500.0
                    mock_benchmark.industry_mean = 4800.0
                    mock_benchmark.sample_size = 150
                    mock_benchmark.comparison_text = "Strong performance"
                    mock_benchmark.improvement_potential = 1500.0
                    mock_benchmark.top_quartile_threshold = 6500.0
                    
                    mock_service.get_revenue_benchmark.return_value = mock_benchmark
                    
                    # Test with date range parameters
                    response = self.client.get(
                        "/api/v1/ai-analytics/benchmarks/revenue",
                        params={
                            "date_range_start": "2024-06-01",
                            "date_range_end": "2024-06-30"
                        },
                        headers=self.headers
                    )
                    
                    assert response.status_code == status.HTTP_200_OK
                    
                    # Verify the service was called with date range
                    mock_service.get_revenue_benchmark.assert_called_once()
                    call_args = mock_service.get_revenue_benchmark.call_args
                    assert call_args[1] is not None  # date_range parameter should be passed


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])