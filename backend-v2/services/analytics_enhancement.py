"""
Analytics Enhancement Module for BookedBarber V2

This module enhances the existing analytics service with intelligent features
without modifying the original service. It provides a wrapper that adds
business health scoring and intelligent insights to existing analytics data.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
import logging

from services.analytics_service import AnalyticsService
from services.intelligent_analytics_service import IntelligentAnalyticsService
from services.smart_alert_service import SmartAlertService
from utils.cache_decorators import cache_result

logger = logging.getLogger(__name__)

class EnhancedAnalyticsService:
    """Enhanced analytics service that adds intelligent features to existing analytics"""
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
        self.intelligent_service = IntelligentAnalyticsService(db)
        self.alert_service = SmartAlertService(db)
    
    @cache_result(ttl=900)  # Cache for 15 minutes
    def get_enhanced_dashboard_data(self, user_id: int, user_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """Get enhanced dashboard data with intelligent insights"""
        try:
            # Get base analytics data
            base_data = {
                "revenue": self.analytics_service.get_revenue_analytics(user_ids=user_ids or [user_id]),
                "appointments": self.analytics_service.get_appointment_analytics(user_ids=user_ids or [user_id]),
                "clients": self.analytics_service.get_client_retention_analytics(user_ids=user_ids or [user_id]),
                "performance": self.analytics_service.get_barber_performance_analytics(user_ids=user_ids or [user_id]),
                "six_figure_barber": self.analytics_service.get_six_figure_barber_analytics(user_id)
            }
            
            # Add intelligent enhancements
            health_score = self.intelligent_service.calculate_business_health_score(user_id)
            insights = self.intelligent_service.generate_predictive_insights(user_id)
            alerts = self.intelligent_service.generate_smart_alerts(user_id)
            
            # Enhance base data with intelligence
            enhanced_data = {
                **base_data,
                "intelligence": {
                    "health_score": {
                        "overall_score": health_score.overall_score,
                        "level": health_score.level.value,
                        "components": health_score.components,
                        "trends": health_score.trends,
                        "risk_factors": health_score.risk_factors[:3],  # Top 3 risks
                        "opportunities": health_score.opportunities[:3]  # Top 3 opportunities
                    },
                    "top_insights": [
                        {
                            "title": insight.title,
                            "description": insight.description,
                            "impact_score": insight.impact_score,
                            "category": insight.category,
                            "confidence": insight.confidence,
                            "recommended_actions": insight.recommended_actions[:2]  # Top 2 actions
                        }
                        for insight in insights[:5]  # Top 5 insights
                    ],
                    "priority_alerts": [
                        {
                            "title": alert.title,
                            "message": alert.message,
                            "priority": alert.priority.value,
                            "category": alert.category,
                            "metric_name": alert.metric_name,
                            "suggested_actions": alert.suggested_actions[:2]  # Top 2 actions
                        }
                        for alert in alerts[:3]  # Top 3 alerts
                    ]
                },
                "enhancements": {
                    "revenue_intelligence": self._enhance_revenue_data(base_data.get("revenue", {}), insights),
                    "appointment_intelligence": self._enhance_appointment_data(base_data.get("appointments", {}), insights),
                    "client_intelligence": self._enhance_client_data(base_data.get("clients", {}), insights),
                    "performance_intelligence": self._enhance_performance_data(base_data.get("performance", {}), insights)
                }
            }
            
            return enhanced_data
            
        except Exception as e:
            logger.error(f"Error getting enhanced dashboard data: {e}")
            # Return base data without enhancements if intelligence fails
            return {
                "revenue": self.analytics_service.get_revenue_analytics(user_ids=user_ids or [user_id]),
                "appointments": self.analytics_service.get_appointment_analytics(user_ids=user_ids or [user_id]),
                "clients": self.analytics_service.get_client_retention_analytics(user_ids=user_ids or [user_id]),
                "performance": self.analytics_service.get_barber_performance_analytics(user_ids=user_ids or [user_id]),
                "six_figure_barber": self.analytics_service.get_six_figure_barber_analytics(user_id),
                "intelligence": {
                    "health_score": {"overall_score": 70, "level": "warning"},
                    "top_insights": [],
                    "priority_alerts": []
                },
                "error": "Intelligence features temporarily unavailable"
            }
    
    def _enhance_revenue_data(self, revenue_data: Dict[str, Any], insights: List) -> Dict[str, Any]:
        """Enhance revenue data with intelligent insights"""
        try:
            revenue_insights = [i for i in insights if i.category == "revenue"]
            
            enhancements = {
                "prediction_confidence": 0.0,
                "trend_strength": "unknown",
                "revenue_forecast": None,
                "optimization_opportunities": [],
                "risk_indicators": []
            }
            
            if revenue_insights:
                top_insight = revenue_insights[0]
                enhancements.update({
                    "prediction_confidence": top_insight.confidence,
                    "trend_strength": "strong" if top_insight.impact_score > 8 else "moderate",
                    "optimization_opportunities": top_insight.recommended_actions[:3]
                })
            
            # Add simple trend prediction if we have historical data
            if revenue_data.get("revenue_data"):
                recent_revenues = revenue_data["revenue_data"][-7:]  # Last 7 data points
                if len(recent_revenues) >= 3:
                    avg_recent = sum(r.get("revenue", 0) for r in recent_revenues) / len(recent_revenues)
                    prev_revenues = revenue_data["revenue_data"][-14:-7] if len(revenue_data["revenue_data"]) >= 14 else []
                    
                    if prev_revenues:
                        avg_prev = sum(r.get("revenue", 0) for r in prev_revenues) / len(prev_revenues)
                        if avg_prev > 0:
                            growth_rate = ((avg_recent - avg_prev) / avg_prev) * 100
                            
                            # Simple 7-day forecast
                            next_week_forecast = avg_recent * (1 + (growth_rate / 100))
                            enhancements["revenue_forecast"] = {
                                "next_7_days": round(next_week_forecast, 2),
                                "confidence": min(0.8, max(0.3, 0.8 - abs(growth_rate) / 100)),
                                "growth_rate": round(growth_rate, 1)
                            }
            
            return enhancements
            
        except Exception as e:
            logger.error(f"Error enhancing revenue data: {e}")
            return {"error": "Revenue enhancement unavailable"}
    
    def _enhance_appointment_data(self, appointment_data: Dict[str, Any], insights: List) -> Dict[str, Any]:
        """Enhance appointment data with intelligent insights"""
        try:
            booking_insights = [i for i in insights if i.category in ["booking", "capacity"]]
            
            enhancements = {
                "efficiency_score": 0.0,
                "capacity_optimization": None,
                "no_show_prediction": None,
                "booking_patterns": []
            }
            
            if booking_insights:
                top_insight = booking_insights[0]
                enhancements.update({
                    "efficiency_score": min(100, top_insight.impact_score * 10),
                    "capacity_optimization": {
                        "current_utilization": "unknown",
                        "optimal_utilization": "85%",
                        "improvement_potential": top_insight.recommended_actions[:2]
                    }
                })
            
            # Add booking pattern analysis
            if appointment_data.get("appointment_data"):
                recent_appointments = appointment_data["appointment_data"][-30:]  # Last 30 data points
                if recent_appointments:
                    total_appointments = sum(a.get("appointments", 0) for a in recent_appointments)
                    completed_appointments = sum(a.get("completed", 0) for a in recent_appointments)
                    
                    if total_appointments > 0:
                        completion_rate = (completed_appointments / total_appointments) * 100
                        no_show_rate = 100 - completion_rate
                        
                        enhancements["no_show_prediction"] = {
                            "current_rate": round(no_show_rate, 1),
                            "predicted_rate": round(no_show_rate * 1.1, 1),  # Simple prediction
                            "confidence": 0.7
                        }
            
            return enhancements
            
        except Exception as e:
            logger.error(f"Error enhancing appointment data: {e}")
            return {"error": "Appointment enhancement unavailable"}
    
    def _enhance_client_data(self, client_data: Dict[str, Any], insights: List) -> Dict[str, Any]:
        """Enhance client data with intelligent insights"""
        try:
            client_insights = [i for i in insights if i.category in ["retention", "client"]]
            
            enhancements = {
                "retention_prediction": None,
                "churn_risk_score": 0.0,
                "value_optimization": [],
                "relationship_health": "unknown"
            }
            
            if client_insights:
                top_insight = client_insights[0]
                enhancements.update({
                    "churn_risk_score": max(0, 100 - top_insight.impact_score * 10),
                    "value_optimization": top_insight.recommended_actions[:3],
                    "relationship_health": "good" if top_insight.impact_score > 7 else "needs_attention"
                })
            
            # Add retention prediction based on current data
            if client_data.get("retention_rate"):
                current_retention = client_data["retention_rate"]
                enhancements["retention_prediction"] = {
                    "current_rate": current_retention,
                    "predicted_6_month": max(0, min(100, current_retention * 0.95)),  # Slight decline prediction
                    "confidence": 0.6
                }
            
            return enhancements
            
        except Exception as e:
            logger.error(f"Error enhancing client data: {e}")
            return {"error": "Client enhancement unavailable"}
    
    def _enhance_performance_data(self, performance_data: Dict[str, Any], insights: List) -> Dict[str, Any]:
        """Enhance performance data with intelligent insights"""
        try:
            performance_insights = [i for i in insights if i.category in ["efficiency", "performance"]]
            
            enhancements = {
                "six_figure_trajectory": None,
                "performance_optimization": [],
                "goal_achievement": None
            }
            
            if performance_insights:
                top_insight = performance_insights[0]
                enhancements.update({
                    "performance_optimization": top_insight.recommended_actions[:3],
                    "six_figure_trajectory": {
                        "on_track": top_insight.impact_score > 7,
                        "confidence": top_insight.confidence,
                        "key_improvements": top_insight.recommended_actions[:2]
                    }
                })
            
            # Add goal achievement prediction
            if performance_data.get("revenue_per_hour"):
                current_rph = performance_data["revenue_per_hour"]
                six_figure_target_rph = 120  # ~$100k annually assuming 20 hours/week
                
                enhancements["goal_achievement"] = {
                    "current_revenue_per_hour": current_rph,
                    "six_figure_target": six_figure_target_rph,
                    "progress_percentage": min(100, (current_rph / six_figure_target_rph) * 100),
                    "estimated_months_to_goal": max(1, (six_figure_target_rph - current_rph) / max(1, current_rph * 0.1))
                }
            
            return enhancements
            
        except Exception as e:
            logger.error(f"Error enhancing performance data: {e}")
            return {"error": "Performance enhancement unavailable"}
    
    async def get_intelligent_recommendations(self, user_id: int) -> Dict[str, Any]:
        """Get personalized intelligent recommendations for business improvement"""
        try:
            # Get health score and insights
            health_score = self.intelligent_service.calculate_business_health_score(user_id)
            insights = self.intelligent_service.generate_predictive_insights(user_id)
            
            # Process alerts
            alert_summary = await self.alert_service.get_alert_summary(user_id)
            
            # Generate recommendations based on current state
            recommendations = self._generate_contextual_recommendations(health_score, insights, alert_summary)
            
            return {
                "health_assessment": {
                    "overall_score": health_score.overall_score,
                    "level": health_score.level.value,
                    "primary_strengths": health_score.opportunities[:2],
                    "primary_concerns": health_score.risk_factors[:2]
                },
                "immediate_actions": recommendations["immediate"],
                "weekly_goals": recommendations["weekly"],
                "monthly_objectives": recommendations["monthly"],
                "six_figure_pathway": recommendations["pathway"],
                "alert_summary": alert_summary
            }
            
        except Exception as e:
            logger.error(f"Error getting intelligent recommendations: {e}")
            return {
                "error": "Recommendations temporarily unavailable",
                "fallback_advice": [
                    "Focus on client retention and premium service delivery",
                    "Monitor your key metrics daily",
                    "Implement the Six Figure Barber methodology consistently"
                ]
            }
    
    def _generate_contextual_recommendations(self, health_score, insights, alert_summary) -> Dict[str, List[str]]:
        """Generate contextual recommendations based on current business state"""
        try:
            recommendations = {
                "immediate": [],
                "weekly": [],
                "monthly": [],
                "pathway": []
            }
            
            # Immediate actions based on health score
            if health_score.overall_score < 60:
                recommendations["immediate"].extend([
                    "🚨 Review critical performance metrics immediately",
                    "📞 Contact your highest-value clients to ensure satisfaction",
                    "💰 Analyze recent revenue drops and their causes"
                ])
            elif health_score.overall_score < 80:
                recommendations["immediate"].extend([
                    "📊 Identify the lowest-performing component for quick wins",
                    "🎯 Focus on your next highest-impact improvement",
                    "📈 Review trends for early warning signs"
                ])
            else:
                recommendations["immediate"].extend([
                    "🚀 Leverage your strong performance for premium positioning",
                    "📈 Consider scaling operations or services",
                    "🌟 Share success stories to attract premium clients"
                ])
            
            # Weekly goals based on insights
            high_impact_insights = [i for i in insights if i.impact_score > 7]
            for insight in high_impact_insights[:3]:
                if insight.recommended_actions:
                    recommendations["weekly"].append(f"🎯 {insight.recommended_actions[0]}")
            
            # Monthly objectives based on health components
            weak_components = [k for k, v in health_score.components.items() if v < 70]
            for component in weak_components[:2]:
                component_name = component.replace("_", " ").title()
                recommendations["monthly"].append(f"📈 Improve {component_name} by 10 points")
            
            # Six Figure pathway recommendations
            if health_score.overall_score >= 80:
                recommendations["pathway"] = [
                    "🎯 You're on track for Six Figure success - maintain momentum",
                    "💎 Focus on premium service positioning and pricing",
                    "🔄 Implement systems for consistent high-quality delivery",
                    "📊 Monitor and maintain your strong performance metrics"
                ]
            else:
                recommendations["pathway"] = [
                    "🚧 Build foundational strength before scaling",
                    "📈 Focus on improving your weakest performance areas",
                    "🎯 Set incremental targets toward Six Figure methodology",
                    "💪 Consistency in basics will compound over time"
                ]
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return {
                "immediate": ["Review your key performance metrics"],
                "weekly": ["Focus on client satisfaction"],
                "monthly": ["Implement Six Figure Barber methodology"],
                "pathway": ["Consistency and quality lead to success"]
            }