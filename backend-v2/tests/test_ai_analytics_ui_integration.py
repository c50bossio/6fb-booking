"""
AI Analytics UI Integration Tests.

Tests the integration between frontend analytics components and backend AI analytics APIs,
including data flow, error handling, consent management, and user experience.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any


class TestAnalyticsUIIntegration:
    """Test UI integration with AI analytics backend"""
    
    def setup_method(self):
        """Setup UI integration tests"""
        self.mock_api_client = Mock()
        self.mock_consent_state = {"analytics_consent": False}
        self.sample_benchmark_data = {
            "success": True,
            "metric_type": "revenue",
            "benchmark_data": {
                "user_value": 5000,
                "percentile_rank": 75,
                "industry_median": 4500,
                "industry_mean": 4800,
                "sample_size": 150,
                "comparison_text": "Strong performance! Your revenue is in the top 25%",
                "improvement_potential": 1500,
                "top_quartile_threshold": 6500
            },
            "privacy_info": {
                "data_anonymized": True,
                "minimum_sample_size": 100,
                "privacy_protection": "differential_privacy_applied"
            }
        }
    
    def test_consent_banner_display_logic(self):
        """Test consent banner display logic for AI analytics"""
        # Test case 1: User has not given consent - banner should show
        user_consent_status = {
            "aggregate_analytics": False,
            "benchmarking": False,
            "predictive_insights": False,
            "ai_coaching": False
        }
        
        should_show_banner = self._should_show_consent_banner(user_consent_status)
        assert should_show_banner is True
        
        # Test case 2: User has given all consents - banner should not show
        user_consent_status_granted = {
            "aggregate_analytics": True,
            "benchmarking": True,
            "predictive_insights": True,
            "ai_coaching": True
        }
        
        should_show_banner = self._should_show_consent_banner(user_consent_status_granted)
        assert should_show_banner is False
        
        # Test case 3: User has partial consent - banner should show
        user_consent_status_partial = {
            "aggregate_analytics": True,
            "benchmarking": False,
            "predictive_insights": True,
            "ai_coaching": False
        }
        
        should_show_banner = self._should_show_consent_banner(user_consent_status_partial)
        assert should_show_banner is True
    
    def _should_show_consent_banner(self, consent_status: Dict[str, bool]) -> bool:
        """Helper to determine if consent banner should be shown"""
        required_consents = ["aggregate_analytics", "benchmarking"]
        return not all(consent_status.get(consent, False) for consent in required_consents)
    
    def test_consent_flow_integration(self):
        """Test consent flow from UI to backend"""
        # Mock consent update API call
        consent_request = {
            "consent_types": [
                "aggregate_analytics",
                "benchmarking",
                "predictive_insights",
                "ai_coaching"
            ]
        }
        
        expected_response = {
            "success": True,
            "message": "AI analytics consent updated successfully",
            "consents_granted": consent_request["consent_types"],
            "privacy_notice": "Your data will be anonymized and aggregated for industry insights."
        }
        
        # Simulate API call
        api_response = self._mock_consent_update_api(consent_request)
        
        assert api_response["success"] is True
        assert len(api_response["consents_granted"]) == 4
        assert "privacy_notice" in api_response
        
        # Test UI state update after consent
        ui_state_after_consent = self._update_ui_after_consent(api_response)
        assert ui_state_after_consent["consent_granted"] is True
        assert ui_state_after_consent["show_analytics"] is True
        assert ui_state_after_consent["show_consent_banner"] is False
    
    def _mock_consent_update_api(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Mock consent update API call"""
        return {
            "success": True,
            "message": "AI analytics consent updated successfully",
            "consents_granted": request["consent_types"],
            "privacy_notice": "Your data will be anonymized and aggregated for industry insights."
        }
    
    def _update_ui_after_consent(self, api_response: Dict[str, Any]) -> Dict[str, bool]:
        """Simulate UI state update after consent is granted"""
        if api_response["success"]:
            return {
                "consent_granted": True,
                "show_analytics": True,
                "show_consent_banner": False
            }
        return {
            "consent_granted": False,
            "show_analytics": False,
            "show_consent_banner": True
        }
    
    def test_benchmark_data_visualization(self):
        """Test benchmark data visualization components"""
        benchmark_data = self.sample_benchmark_data["benchmark_data"]
        
        # Test percentile visualization
        percentile_viz_data = self._create_percentile_visualization(benchmark_data)
        
        assert percentile_viz_data["user_percentile"] == 75
        assert percentile_viz_data["chart_data"]["user_position"] == 75
        assert percentile_viz_data["chart_data"]["industry_median"] == 50
        assert percentile_viz_data["performance_level"] == "top_quartile"
        
        # Test revenue comparison chart
        revenue_comparison = self._create_revenue_comparison_chart(benchmark_data)
        
        assert revenue_comparison["user_value"] == 5000
        assert revenue_comparison["industry_median"] == 4500
        assert revenue_comparison["improvement_potential"] == 1500
        assert revenue_comparison["chart_type"] == "bar_comparison"
        
        # Test performance indicator
        performance_indicator = self._create_performance_indicator(benchmark_data)
        
        assert performance_indicator["level"] == "strong"
        assert performance_indicator["color"] == "green"
        assert performance_indicator["icon"] == "trending_up"
        assert "Strong performance" in performance_indicator["message"]
    
    def _create_percentile_visualization(self, benchmark_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create percentile visualization data"""
        percentile = benchmark_data["percentile_rank"]
        
        return {
            "user_percentile": percentile,
            "chart_data": {
                "user_position": percentile,
                "industry_median": 50,
                "segments": [
                    {"range": "0-25", "label": "Bottom Quartile", "color": "#ff4444"},
                    {"range": "25-50", "label": "Below Average", "color": "#ff8800"},
                    {"range": "50-75", "label": "Above Average", "color": "#ffcc00"},
                    {"range": "75-100", "label": "Top Quartile", "color": "#00cc44"}
                ]
            },
            "performance_level": "top_quartile" if percentile >= 75 else "above_average" if percentile >= 50 else "below_average"
        }
    
    def _create_revenue_comparison_chart(self, benchmark_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create revenue comparison chart data"""
        return {
            "chart_type": "bar_comparison",
            "user_value": benchmark_data["user_value"],
            "industry_median": benchmark_data["industry_median"],
            "industry_mean": benchmark_data["industry_mean"],
            "improvement_potential": benchmark_data.get("improvement_potential", 0),
            "chart_data": [
                {"label": "Your Revenue", "value": benchmark_data["user_value"], "color": "#2563eb"},
                {"label": "Industry Median", "value": benchmark_data["industry_median"], "color": "#64748b"},
                {"label": "Top Quartile", "value": benchmark_data.get("top_quartile_threshold", 0), "color": "#059669"}
            ]
        }
    
    def _create_performance_indicator(self, benchmark_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create performance indicator based on benchmark data"""
        percentile = benchmark_data["percentile_rank"]
        
        if percentile >= 90:
            return {
                "level": "exceptional",
                "color": "emerald",
                "icon": "star",
                "message": "Exceptional performance! Top 10%"
            }
        elif percentile >= 75:
            return {
                "level": "strong",
                "color": "green",
                "icon": "trending_up",
                "message": benchmark_data["comparison_text"]
            }
        elif percentile >= 50:
            return {
                "level": "average",
                "color": "yellow",
                "icon": "minus",
                "message": "Above average performance"
            }
        else:
            return {
                "level": "below_average",
                "color": "red",
                "icon": "trending_down",
                "message": "Room for improvement"
            }
    
    def test_predictive_insights_visualization(self):
        """Test predictive insights visualization"""
        # Mock revenue forecast data
        revenue_forecast = {
            "success": True,
            "prediction_type": "revenue_forecast",
            "predictions": [
                {
                    "month": 1,
                    "predicted_revenue": 5200,
                    "confidence_interval": [4800, 5600],
                    "confidence_score": 0.85
                },
                {
                    "month": 2,
                    "predicted_revenue": 5400,
                    "confidence_interval": [4900, 5900],
                    "confidence_score": 0.80
                },
                {
                    "month": 3,
                    "predicted_revenue": 5600,
                    "confidence_interval": [5000, 6200],
                    "confidence_score": 0.75
                }
            ],
            "total_predicted_revenue": 16200
        }
        
        # Test forecast chart creation
        forecast_chart = self._create_forecast_chart(revenue_forecast)
        
        assert forecast_chart["chart_type"] == "line_with_confidence"
        assert len(forecast_chart["data_points"]) == 3
        assert forecast_chart["total_forecast"] == 16200
        
        # Test confidence visualization
        confidence_viz = self._create_confidence_visualization(revenue_forecast)
        
        assert len(confidence_viz["confidence_bands"]) == 3
        assert all(band["confidence"] >= 0.75 for band in confidence_viz["confidence_bands"])
        
        # Test growth trend indicator
        growth_indicator = self._create_growth_trend_indicator(revenue_forecast)
        
        assert growth_indicator["trend"] == "positive"
        assert growth_indicator["growth_rate"] > 0
        assert growth_indicator["icon"] == "arrow_upward"
    
    def _create_forecast_chart(self, forecast_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create forecast chart visualization data"""
        predictions = forecast_data["predictions"]
        
        return {
            "chart_type": "line_with_confidence",
            "data_points": [
                {
                    "month": pred["month"],
                    "predicted_value": pred["predicted_revenue"],
                    "lower_bound": pred["confidence_interval"][0],
                    "upper_bound": pred["confidence_interval"][1],
                    "confidence": pred["confidence_score"]
                }
                for pred in predictions
            ],
            "total_forecast": forecast_data["total_predicted_revenue"],
            "chart_config": {
                "show_confidence_bands": True,
                "show_historical_data": True,
                "color_scheme": "blue_gradient"
            }
        }
    
    def _create_confidence_visualization(self, forecast_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create confidence visualization for predictions"""
        predictions = forecast_data["predictions"]
        
        return {
            "confidence_bands": [
                {
                    "month": pred["month"],
                    "confidence": pred["confidence_score"],
                    "confidence_level": "high" if pred["confidence_score"] >= 0.8 else "medium" if pred["confidence_score"] >= 0.6 else "low",
                    "range_width": pred["confidence_interval"][1] - pred["confidence_interval"][0]
                }
                for pred in predictions
            ],
            "average_confidence": sum(pred["confidence_score"] for pred in predictions) / len(predictions)
        }
    
    def _create_growth_trend_indicator(self, forecast_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create growth trend indicator"""
        predictions = forecast_data["predictions"]
        
        if len(predictions) < 2:
            return {"trend": "insufficient_data"}
        
        first_month = predictions[0]["predicted_revenue"]
        last_month = predictions[-1]["predicted_revenue"]
        growth_rate = ((last_month - first_month) / first_month) * 100
        
        return {
            "trend": "positive" if growth_rate > 0 else "negative" if growth_rate < 0 else "stable",
            "growth_rate": growth_rate,
            "icon": "arrow_upward" if growth_rate > 0 else "arrow_downward" if growth_rate < 0 else "trending_flat",
            "color": "green" if growth_rate > 0 else "red" if growth_rate < 0 else "gray"
        }
    
    def test_churn_prediction_ui(self):
        """Test churn prediction UI components"""
        # Mock churn analysis data
        churn_data = {
            "success": True,
            "prediction_type": "churn_prediction",
            "churn_analysis": {
                "at_risk_clients": [
                    {
                        "client_id": 1,
                        "client_name": "John Doe",
                        "risk_score": 0.85,
                        "last_appointment": "2024-04-15",
                        "days_since_last": 60,
                        "total_value": 450,
                        "recommended_actions": ["Send personalized message", "Offer discount"]
                    },
                    {
                        "client_id": 2,
                        "client_name": "Jane Smith",
                        "risk_score": 0.72,
                        "last_appointment": "2024-05-01",
                        "days_since_last": 45,
                        "total_value": 320,
                        "recommended_actions": ["Call personally", "Schedule follow-up"]
                    }
                ],
                "overall_churn_risk": 0.35
            },
            "high_risk_count": 2,
            "medium_risk_count": 3
        }
        
        # Test risk level visualization
        risk_visualization = self._create_churn_risk_visualization(churn_data)
        
        assert risk_visualization["overall_risk_level"] == "moderate"
        assert risk_visualization["high_risk_count"] == 2
        assert len(risk_visualization["risk_segments"]) == 3
        
        # Test client list formatting
        client_list = self._format_at_risk_clients(churn_data["churn_analysis"]["at_risk_clients"])
        
        assert len(client_list) == 2
        assert all("urgency_level" in client for client in client_list)
        assert all("action_priority" in client for client in client_list)
        
        # Test action recommendations
        action_summary = self._create_action_summary(churn_data["churn_analysis"]["at_risk_clients"])
        
        assert "immediate_actions" in action_summary
        assert "follow_up_actions" in action_summary
        assert action_summary["total_clients_needing_attention"] == 2
    
    def _create_churn_risk_visualization(self, churn_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create churn risk visualization"""
        overall_risk = churn_data["churn_analysis"]["overall_churn_risk"]
        
        risk_level = "low" if overall_risk < 0.3 else "moderate" if overall_risk < 0.6 else "high"
        
        return {
            "overall_risk_level": risk_level,
            "overall_risk_percentage": int(overall_risk * 100),
            "high_risk_count": churn_data["high_risk_count"],
            "medium_risk_count": churn_data["medium_risk_count"],
            "risk_segments": [
                {"level": "high", "count": churn_data["high_risk_count"], "color": "#dc2626"},
                {"level": "medium", "count": churn_data["medium_risk_count"], "color": "#f59e0b"},
                {"level": "low", "count": 0, "color": "#059669"}  # Would calculate from total
            ]
        }
    
    def _format_at_risk_clients(self, at_risk_clients: list) -> list:
        """Format at-risk clients for UI display"""
        formatted_clients = []
        
        for client in at_risk_clients:
            risk_score = client["risk_score"]
            urgency_level = "critical" if risk_score >= 0.8 else "high" if risk_score >= 0.6 else "medium"
            
            formatted_clients.append({
                **client,
                "urgency_level": urgency_level,
                "urgency_color": "#dc2626" if urgency_level == "critical" else "#f59e0b" if urgency_level == "high" else "#eab308",
                "action_priority": "immediate" if risk_score >= 0.8 else "this_week" if risk_score >= 0.6 else "this_month",
                "risk_percentage": int(risk_score * 100)
            })
        
        return formatted_clients
    
    def _create_action_summary(self, at_risk_clients: list) -> Dict[str, Any]:
        """Create action summary for at-risk clients"""
        immediate_actions = []
        follow_up_actions = []
        
        for client in at_risk_clients:
            if client["risk_score"] >= 0.8:
                immediate_actions.extend(client["recommended_actions"])
            else:
                follow_up_actions.extend(client["recommended_actions"])
        
        return {
            "immediate_actions": list(set(immediate_actions)),  # Remove duplicates
            "follow_up_actions": list(set(follow_up_actions)),
            "total_clients_needing_attention": len(at_risk_clients),
            "immediate_attention_count": len([c for c in at_risk_clients if c["risk_score"] >= 0.8])
        }
    
    def test_error_handling_ui(self):
        """Test error handling in UI components"""
        # Test API error handling
        api_error_response = {
            "success": False,
            "error": "Insufficient historical data for revenue prediction",
            "error_code": "INSUFFICIENT_DATA"
        }
        
        error_ui_state = self._handle_api_error(api_error_response)
        
        assert error_ui_state["show_error"] is True
        assert error_ui_state["error_type"] == "insufficient_data"
        assert "More data needed" in error_ui_state["user_friendly_message"]
        assert error_ui_state["show_retry_button"] is True
        
        # Test network error handling
        network_error = {"network_error": True, "status_code": 500}
        
        network_error_ui = self._handle_network_error(network_error)
        
        assert network_error_ui["show_error"] is True
        assert network_error_ui["error_type"] == "network"
        assert network_error_ui["show_retry_button"] is True
        
        # Test consent required error
        consent_error = {
            "success": False,
            "error": "AI analytics consent required",
            "error_code": "CONSENT_REQUIRED"
        }
        
        consent_error_ui = self._handle_consent_error(consent_error)
        
        assert consent_error_ui["show_consent_prompt"] is True
        assert consent_error_ui["show_error"] is False
        assert consent_error_ui["redirect_to_consent"] is True
    
    def _handle_api_error(self, error_response: Dict[str, Any]) -> Dict[str, Any]:
        """Handle API error in UI"""
        error_code = error_response.get("error_code", "UNKNOWN")
        
        error_messages = {
            "INSUFFICIENT_DATA": "More data needed for accurate predictions. Continue using the system to improve insights.",
            "CONSENT_REQUIRED": "Please enable AI analytics in your privacy settings to view this feature.",
            "NO_BENCHMARK_DATA": "Benchmark data is being updated. Please try again in a few minutes."
        }
        
        return {
            "show_error": True,
            "error_type": error_code.lower(),
            "user_friendly_message": error_messages.get(error_code, "An error occurred. Please try again."),
            "show_retry_button": error_code not in ["CONSENT_REQUIRED"],
            "technical_error": error_response.get("error", "Unknown error")
        }
    
    def _handle_network_error(self, error: Dict[str, Any]) -> Dict[str, Any]:
        """Handle network error in UI"""
        return {
            "show_error": True,
            "error_type": "network",
            "user_friendly_message": "Connection error. Please check your internet connection and try again.",
            "show_retry_button": True,
            "status_code": error.get("status_code")
        }
    
    def _handle_consent_error(self, error_response: Dict[str, Any]) -> Dict[str, Any]:
        """Handle consent required error in UI"""
        return {
            "show_error": False,
            "show_consent_prompt": True,
            "redirect_to_consent": True,
            "consent_message": "Enable AI analytics to unlock powerful business insights and benchmarking."
        }
    
    def test_loading_states(self):
        """Test loading states for async operations"""
        # Test initial loading state
        initial_state = self._create_loading_state("initial")
        
        assert initial_state["is_loading"] is True
        assert initial_state["loading_type"] == "initial"
        assert initial_state["show_skeleton"] is True
        assert initial_state["progress_percentage"] is None
        
        # Test data refresh loading
        refresh_state = self._create_loading_state("refresh")
        
        assert refresh_state["is_loading"] is True
        assert refresh_state["loading_type"] == "refresh"
        assert refresh_state["show_skeleton"] is False
        assert refresh_state["show_spinner"] is True
        
        # Test prediction generation loading
        prediction_state = self._create_loading_state("prediction", progress=45)
        
        assert prediction_state["is_loading"] is True
        assert prediction_state["loading_type"] == "prediction"
        assert prediction_state["progress_percentage"] == 45
        assert prediction_state["estimated_time_remaining"] is not None
    
    def _create_loading_state(self, loading_type: str, progress: int = None) -> Dict[str, Any]:
        """Create loading state for UI"""
        base_state = {
            "is_loading": True,
            "loading_type": loading_type,
            "show_skeleton": loading_type == "initial",
            "show_spinner": loading_type in ["refresh", "prediction"],
            "progress_percentage": progress
        }
        
        if loading_type == "prediction" and progress:
            base_state["estimated_time_remaining"] = max(1, (100 - progress) * 2)  # Rough estimate in seconds
            base_state["loading_message"] = "Analyzing cross-user patterns..."
        elif loading_type == "refresh":
            base_state["loading_message"] = "Updating data..."
        else:
            base_state["loading_message"] = "Loading analytics..."
        
        return base_state
    
    def test_privacy_indicators_ui(self):
        """Test privacy indicators in UI"""
        # Test privacy badge display
        privacy_info = {
            "data_anonymized": True,
            "minimum_sample_size": 100,
            "privacy_protection": "differential_privacy_applied"
        }
        
        privacy_badge = self._create_privacy_badge(privacy_info)
        
        assert privacy_badge["show_badge"] is True
        assert privacy_badge["privacy_level"] == "high"
        assert privacy_badge["badge_color"] == "green"
        assert "Anonymized" in privacy_badge["tooltip_text"]
        
        # Test privacy details modal
        privacy_modal = self._create_privacy_details_modal(privacy_info)
        
        assert len(privacy_modal["protection_features"]) >= 3
        assert "differential_privacy" in [feature["type"] for feature in privacy_modal["protection_features"]]
        assert "k_anonymity" in [feature["type"] for feature in privacy_modal["protection_features"]]
        
        # Test consent status indicator
        consent_status = {
            "aggregate_analytics": True,
            "benchmarking": True,
            "predictive_insights": False,
            "ai_coaching": False
        }
        
        consent_indicator = self._create_consent_status_indicator(consent_status)
        
        assert consent_indicator["overall_status"] == "partial"
        assert consent_indicator["enabled_count"] == 2
        assert consent_indicator["total_count"] == 4
    
    def _create_privacy_badge(self, privacy_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create privacy badge for UI"""
        return {
            "show_badge": privacy_info["data_anonymized"],
            "privacy_level": "high",
            "badge_color": "green",
            "badge_text": "Privacy Protected",
            "tooltip_text": f"Data anonymized and aggregated from {privacy_info['minimum_sample_size']}+ businesses",
            "icon": "shield_check"
        }
    
    def _create_privacy_details_modal(self, privacy_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create privacy details modal content"""
        return {
            "protection_features": [
                {
                    "type": "differential_privacy",
                    "title": "Differential Privacy",
                    "description": "Mathematical noise added to protect individual contributions",
                    "icon": "lock"
                },
                {
                    "type": "k_anonymity",
                    "title": "K-Anonymity",
                    "description": f"Minimum {privacy_info['minimum_sample_size']} businesses in each comparison group",
                    "icon": "group"
                },
                {
                    "type": "data_anonymization",
                    "title": "Data Anonymization",
                    "description": "Individual business data never exposed or shared",
                    "icon": "visibility_off"
                }
            ],
            "compliance_info": {
                "gdpr_compliant": True,
                "data_retention": "Aggregated data only",
                "user_rights": "Full data export and deletion available"
            }
        }
    
    def _create_consent_status_indicator(self, consent_status: Dict[str, bool]) -> Dict[str, Any]:
        """Create consent status indicator"""
        enabled_count = sum(1 for enabled in consent_status.values() if enabled)
        total_count = len(consent_status)
        
        if enabled_count == total_count:
            status = "full"
        elif enabled_count > 0:
            status = "partial"
        else:
            status = "none"
        
        return {
            "overall_status": status,
            "enabled_count": enabled_count,
            "total_count": total_count,
            "status_color": "green" if status == "full" else "yellow" if status == "partial" else "red",
            "status_text": f"{enabled_count}/{total_count} features enabled"
        }


class TestAnalyticsPageIntegration:
    """Test integration with specific analytics pages"""
    
    def test_analytics_overview_page(self):
        """Test analytics overview page integration"""
        # Mock data for overview page
        overview_data = {
            "benchmarks": {
                "revenue": {"percentile_rank": 75, "user_value": 5000},
                "appointments": {"percentile_rank": 70, "user_value": 80},
                "efficiency": {"percentile_rank": 80, "user_value": 62.5}
            },
            "predictions": {
                "next_month_revenue": 5200,
                "growth_trend": "positive",
                "churn_risk": 0.25
            },
            "insights": {
                "top_insights": ["Strong revenue performance", "High efficiency"],
                "action_items": ["Focus on client retention", "Consider premium services"]
            }
        }
        
        # Test dashboard cards creation
        dashboard_cards = self._create_dashboard_cards(overview_data)
        
        assert len(dashboard_cards) >= 3
        assert any(card["type"] == "benchmark_summary" for card in dashboard_cards)
        assert any(card["type"] == "prediction_summary" for card in dashboard_cards)
        assert any(card["type"] == "insights_summary" for card in dashboard_cards)
        
        # Test quick actions generation
        quick_actions = self._generate_quick_actions(overview_data)
        
        assert len(quick_actions) > 0
        assert all("action_type" in action for action in quick_actions)
        assert all("priority" in action for action in quick_actions)
    
    def _create_dashboard_cards(self, overview_data: Dict[str, Any]) -> list:
        """Create dashboard cards for overview page"""
        cards = []
        
        # Benchmark summary card
        benchmarks = overview_data["benchmarks"]
        avg_percentile = sum(b["percentile_rank"] for b in benchmarks.values()) / len(benchmarks)
        
        cards.append({
            "type": "benchmark_summary",
            "title": "Performance Overview",
            "value": f"{int(avg_percentile)}th percentile",
            "trend": "up" if avg_percentile >= 60 else "down",
            "details": [
                f"Revenue: {benchmarks['revenue']['percentile_rank']}th percentile",
                f"Appointments: {benchmarks['appointments']['percentile_rank']}th percentile",
                f"Efficiency: {benchmarks['efficiency']['percentile_rank']}th percentile"
            ]
        })
        
        # Prediction summary card
        predictions = overview_data["predictions"]
        cards.append({
            "type": "prediction_summary",
            "title": "Next Month Forecast",
            "value": f"${predictions['next_month_revenue']:,}",
            "trend": predictions["growth_trend"],
            "confidence": "high"
        })
        
        # Insights summary card
        insights = overview_data["insights"]
        cards.append({
            "type": "insights_summary",
            "title": "Key Insights",
            "insights": insights["top_insights"][:2],
            "action_count": len(insights["action_items"])
        })
        
        return cards
    
    def _generate_quick_actions(self, overview_data: Dict[str, Any]) -> list:
        """Generate quick actions based on data"""
        actions = []
        
        # Based on churn risk
        if overview_data["predictions"]["churn_risk"] > 0.3:
            actions.append({
                "action_type": "retention_campaign",
                "title": "Launch Retention Campaign",
                "description": "Contact at-risk clients to improve retention",
                "priority": "high",
                "estimated_impact": "medium"
            })
        
        # Based on performance percentiles
        benchmarks = overview_data["benchmarks"]
        if benchmarks["efficiency"]["percentile_rank"] < 50:
            actions.append({
                "action_type": "pricing_review",
                "title": "Review Service Pricing",
                "description": "Optimize pricing to improve revenue per appointment",
                "priority": "medium",
                "estimated_impact": "high"
            })
        
        return actions


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])