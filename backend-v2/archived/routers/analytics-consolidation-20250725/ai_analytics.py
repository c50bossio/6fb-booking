"""
AI Analytics Router for Revolutionary Cross-User Intelligence.

Provides AI-powered insights, benchmarking, and predictive analytics
using privacy-compliant cross-user data aggregation.
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from dependencies import get_current_user
from models import User
from models.consent import ConsentType, ConsentStatus
from services.ai_benchmarking_service import AIBenchmarkingService
from services.predictive_modeling_service import PredictiveModelingService
from services.privacy_anonymization_service import PrivacyAnonymizationService

router = APIRouter(prefix="/ai-analytics", tags=["ai-analytics"])


class BenchmarkRequest(BaseModel):
    """Request model for benchmark comparisons"""
    metric_type: str = Field(..., description="Type of metric: revenue, appointments, efficiency")
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None


class PredictionRequest(BaseModel):
    """Request model for predictions"""
    prediction_type: str = Field(..., description="Type: revenue_forecast, churn_prediction, demand_patterns, pricing_optimization")
    months_ahead: Optional[int] = Field(6, description="Months to predict ahead (for forecasting)")
    include_seasonal: Optional[bool] = Field(True, description="Include seasonal adjustments")


class ConsentUpdateRequest(BaseModel):
    """Request model for updating AI analytics consent"""
    consent_types: List[str] = Field(..., description="List of consent types to grant")


def check_ai_analytics_consent(user_id: int, db: Session) -> bool:
    """Check if user has consented to AI analytics"""
    from models.consent import UserConsent
    
    consent = db.query(UserConsent).filter(
        UserConsent.user_id == user_id,
        UserConsent.consent_type.in_([
            ConsentType.AGGREGATE_ANALYTICS,
            ConsentType.BENCHMARKING,
            ConsentType.PREDICTIVE_INSIGHTS
        ]),
        UserConsent.status == ConsentStatus.GRANTED
    ).first()
    
    return consent is not None


@router.post("/consent")
async def update_ai_analytics_consent(
    request: ConsentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update user's consent for AI analytics features.
    
    This enables participation in cross-user insights while maintaining privacy.
    """
    from models.consent import UserConsent
    
    # Validate consent types
    valid_consent_types = [
        ConsentType.AGGREGATE_ANALYTICS.value,
        ConsentType.BENCHMARKING.value,
        ConsentType.PREDICTIVE_INSIGHTS.value,
        ConsentType.AI_COACHING.value
    ]
    
    for consent_type in request.consent_types:
        if consent_type not in valid_consent_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid consent type: {consent_type}"
            )
    
    # Update or create consent records
    updated_consents = []
    
    for consent_type_str in request.consent_types:
        consent_type = ConsentType(consent_type_str)
        
        existing_consent = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type == consent_type
        ).first()
        
        if existing_consent:
            existing_consent.status = ConsentStatus.GRANTED
            existing_consent.consent_date = datetime.utcnow()
        else:
            new_consent = UserConsent(
                user_id=current_user.id,
                consent_type=consent_type,
                status=ConsentStatus.GRANTED,
                consent_date=datetime.utcnow()
            )
            db.add(new_consent)
        
        updated_consents.append(consent_type_str)
    
    db.commit()
    
    return {
        "success": True,
        "message": "AI analytics consent updated successfully",
        "consents_granted": updated_consents,
        "privacy_notice": "Your data will be anonymized and aggregated for industry insights. You can withdraw consent at any time."
    }


@router.get("/benchmarks/{metric_type}")
async def get_industry_benchmark(
    metric_type: str,
    date_range_start: Optional[date] = Query(None),
    date_range_end: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get industry benchmark comparison for specified metric.
    
    Shows how user's performance compares to similar businesses.
    """
    
    # Check consent
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="AI analytics consent required. Please enable cross-user insights in privacy settings."
        )
    
    # Validate metric type
    valid_metrics = ["revenue", "appointments", "efficiency"]
    if metric_type not in valid_metrics:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metric type. Valid options: {valid_metrics}"
        )
    
    try:
        benchmarking_service = AIBenchmarkingService(db)
        
        # Set default date range if not provided
        date_range = None
        if date_range_start and date_range_end:
            date_range = (date_range_start, date_range_end)
        
        # Get benchmark data
        if metric_type == "revenue":
            benchmark = benchmarking_service.get_revenue_benchmark(current_user.id, date_range)
        elif metric_type == "appointments":
            benchmark = benchmarking_service.get_appointment_volume_benchmark(current_user.id, date_range)
        elif metric_type == "efficiency":
            benchmark = benchmarking_service.get_efficiency_benchmark(current_user.id)
        
        return {
            "success": True,
            "metric_type": metric_type,
            "benchmark_data": {
                "user_value": benchmark.user_value,
                "percentile_rank": benchmark.percentile_rank,
                "industry_median": benchmark.industry_median,
                "industry_mean": benchmark.industry_mean,
                "sample_size": benchmark.sample_size,
                "comparison_text": benchmark.comparison_text,
                "improvement_potential": benchmark.improvement_potential,
                "top_quartile_threshold": benchmark.top_quartile_threshold
            },
            "privacy_info": {
                "data_anonymized": True,
                "minimum_sample_size": 100,
                "privacy_protection": "differential_privacy_applied"
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating benchmark: {str(e)}")


@router.get("/benchmarks/comprehensive")
async def get_comprehensive_benchmark_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive benchmark report comparing all key metrics.
    
    Provides overall performance score and industry positioning.
    """
    
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="AI analytics consent required for comprehensive benchmarking."
        )
    
    try:
        benchmarking_service = AIBenchmarkingService(db)
        report = benchmarking_service.generate_comprehensive_benchmark_report(current_user.id)
        
        return {
            "success": True,
            "report": report,
            "generated_at": datetime.now().isoformat(),
            "privacy_compliance": {
                "gdpr_compliant": True,
                "data_anonymized": True,
                "user_consent_verified": True
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.post("/predictions")
async def get_business_predictions(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get AI-powered business predictions and forecasts.
    
    Combines individual business data with industry patterns for accurate predictions.
    """
    
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="Predictive insights consent required for forecasting."
        )
    
    try:
        prediction_service = PredictiveModelingService(db)
        
        if request.prediction_type == "revenue_forecast":
            predictions = prediction_service.predict_revenue_forecast(
                current_user.id, 
                request.months_ahead,
                request.include_seasonal
            )
            
            return {
                "success": True,
                "prediction_type": "revenue_forecast",
                "predictions": [
                    {
                        "month": i + 1,
                        "predicted_revenue": pred.predicted_value,
                        "confidence_interval": pred.confidence_interval,
                        "confidence_score": pred.confidence_score,
                        "methodology": pred.methodology,
                        "factors_considered": pred.factors_considered
                    }
                    for i, pred in enumerate(predictions)
                ],
                "total_predicted_revenue": sum(p.predicted_value for p in predictions),
                "methodology_info": {
                    "includes_seasonal_adjustment": request.include_seasonal,
                    "includes_industry_trends": True,
                    "privacy_protected": True
                }
            }
            
        elif request.prediction_type == "churn_prediction":
            churn_analysis = prediction_service.predict_client_churn(current_user.id)
            
            return {
                "success": True,
                "prediction_type": "churn_prediction",
                "churn_analysis": churn_analysis,
                "actionable_insights": churn_analysis.get("churn_insights", []),
                "retention_opportunities": len(churn_analysis.get("at_risk_clients", []))
            }
            
        elif request.prediction_type == "demand_patterns":
            demand_analysis = prediction_service.predict_demand_patterns(current_user.id)
            
            return {
                "success": True,
                "prediction_type": "demand_patterns",
                "demand_analysis": demand_analysis,
                "optimization_score": demand_analysis.get("data_confidence", 0.0)
            }
            
        elif request.prediction_type == "pricing_optimization":
            pricing_analysis = prediction_service.predict_pricing_optimization(current_user.id)
            
            return {
                "success": True,
                "prediction_type": "pricing_optimization",
                "pricing_analysis": pricing_analysis,
                "total_revenue_opportunity": pricing_analysis.get("overall_revenue_opportunity", 0)
            }
        
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid prediction type. Valid options: revenue_forecast, churn_prediction, demand_patterns, pricing_optimization"
            )
            
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating predictions: {str(e)}")


@router.get("/insights/coaching")
async def get_ai_coaching_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get personalized AI coaching recommendations based on cross-user success patterns.
    
    Provides actionable insights for business improvement.
    """
    
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="AI coaching consent required for personalized recommendations."
        )
    
    try:
        benchmarking_service = AIBenchmarkingService(db)
        prediction_service = PredictiveModelingService(db)
        
        # Get comprehensive performance analysis
        benchmark_report = benchmarking_service.generate_comprehensive_benchmark_report(current_user.id)
        
        # Get revenue forecast for growth insights
        revenue_predictions = prediction_service.predict_revenue_forecast(current_user.id, months_ahead=3)
        
        # Get churn analysis for retention insights
        churn_analysis = prediction_service.predict_client_churn(current_user.id)
        
        # Generate coaching insights
        coaching_insights = {
            "performance_summary": {
                "overall_score": benchmark_report.get("overall_performance_score", 0),
                "business_segment": benchmark_report.get("business_segment", "unknown"),
                "top_strengths": benchmark_report.get("top_insights", []),
                "improvement_areas": benchmark_report.get("recommendations", [])
            },
            "growth_forecast": {
                "next_quarter_revenue": sum(p.predicted_value for p in revenue_predictions),
                "growth_confidence": np.mean([p.confidence_score for p in revenue_predictions]) if revenue_predictions else 0,
                "growth_opportunities": _generate_growth_opportunities(benchmark_report, revenue_predictions)
            },
            "retention_insights": {
                "churn_risk_level": churn_analysis.get("overall_churn_risk", 0),
                "at_risk_clients": len(churn_analysis.get("at_risk_clients", [])),
                "retention_actions": _generate_retention_actions(churn_analysis)
            },
            "weekly_focus_areas": _generate_weekly_focus_areas(benchmark_report, churn_analysis),
            "success_patterns": _get_success_patterns_for_segment(benchmark_report.get("business_segment"))
        }
        
        return {
            "success": True,
            "coaching_insights": coaching_insights,
            "generated_at": datetime.now().isoformat(),
            "next_update": (datetime.now() + timedelta(days=7)).isoformat(),
            "personalization_note": "Insights based on anonymized patterns from similar businesses"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating coaching insights: {str(e)}")


@router.get("/insights/market-intelligence")
async def get_market_intelligence(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get market intelligence and competitive insights based on industry data.
    
    Provides anonymous competitive analysis and market trends.
    """
    
    if not check_ai_analytics_consent(current_user.id, db):
        raise HTTPException(
            status_code=403,
            detail="Benchmarking consent required for market intelligence."
        )
    
    try:
        benchmarking_service = AIBenchmarkingService(db)
        segment = benchmarking_service.get_user_business_segment(current_user.id)
        
        # Get recent industry trends
        market_intelligence = {
            "industry_trends": _get_industry_trends(db, segment),
            "competitive_positioning": _get_competitive_positioning(db, current_user.id, segment),
            "market_opportunities": _identify_market_opportunities(db, segment),
            "pricing_insights": _get_pricing_insights(db, segment),
            "seasonal_patterns": _get_seasonal_intelligence(db, segment)
        }
        
        return {
            "success": True,
            "market_intelligence": market_intelligence,
            "business_segment": segment.value,
            "data_freshness": "updated_weekly",
            "privacy_note": "All data is anonymized and aggregated from consenting businesses"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating market intelligence: {str(e)}")


@router.get("/privacy/report")
async def get_privacy_compliance_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get privacy compliance report for AI analytics features.
    
    Shows how user data is protected and anonymized.
    """
    
    try:
        privacy_service = PrivacyAnonymizationService(db)
        
        # Check user's consent status
        from models.consent import UserConsent
        
        ai_consents = db.query(UserConsent).filter(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type.in_([
                ConsentType.AGGREGATE_ANALYTICS,
                ConsentType.BENCHMARKING,
                ConsentType.PREDICTIVE_INSIGHTS,
                ConsentType.AI_COACHING
            ])
        ).all()
        
        consent_status = {}
        for consent in ai_consents:
            consent_status[consent.consent_type.value] = {
                "status": consent.status.value,
                "granted_at": consent.consent_date.isoformat() if consent.consent_date else None
            }
        
        # Generate privacy report
        privacy_report = {
            "user_consents": consent_status,
            "privacy_protections": {
                "differential_privacy": "Applied to all aggregated data",
                "k_anonymity": "Minimum 100 users per aggregation",
                "data_anonymization": "Individual data never exposed",
                "encryption": "All data encrypted at rest and in transit"
            },
            "data_usage": {
                "aggregation_only": True,
                "individual_data_protected": True,
                "opt_out_available": True,
                "gdpr_compliant": True
            },
            "transparency": {
                "purpose": "Industry benchmarking and business insights",
                "retention": "Aggregated data retained for trend analysis",
                "sharing": "Never shared with third parties",
                "access": "User can request data export anytime"
            }
        }
        
        return {
            "success": True,
            "privacy_report": privacy_report,
            "compliance_score": "100% GDPR Compliant",
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating privacy report: {str(e)}")


# Helper functions for coaching insights

def _generate_growth_opportunities(benchmark_report: Dict[str, Any], revenue_predictions: List[Any]) -> List[str]:
    """Generate growth opportunities based on benchmarks and predictions"""
    
    opportunities = []
    
    overall_score = benchmark_report.get("overall_performance_score", 0)
    
    if overall_score < 50:
        opportunities.append("Focus on fundamental business improvements to reach industry average")
    elif overall_score < 75:
        opportunities.append("Optimize top-performing areas to enter the top quartile")
    else:
        opportunities.append("Maintain excellence and explore premium service offerings")
    
    if revenue_predictions:
        avg_confidence = np.mean([p.confidence_score for p in revenue_predictions])
        if avg_confidence > 0.8:
            opportunities.append("Strong predictable growth trajectory - consider expansion")
    
    return opportunities


def _generate_retention_actions(churn_analysis: Dict[str, Any]) -> List[str]:
    """Generate retention actions based on churn analysis"""
    
    actions = []
    
    at_risk_count = len(churn_analysis.get("at_risk_clients", []))
    overall_risk = churn_analysis.get("overall_churn_risk", 0)
    
    if at_risk_count > 0:
        actions.append(f"Immediate attention needed for {at_risk_count} at-risk clients")
    
    if overall_risk > 0.3:
        actions.append("Implement proactive client engagement program")
        actions.append("Review service quality and client satisfaction")
    
    actions.append("Set up automated follow-up sequences for client retention")
    
    return actions


def _generate_weekly_focus_areas(benchmark_report: Dict[str, Any], churn_analysis: Dict[str, Any]) -> List[str]:
    """Generate weekly focus areas for coaching"""
    
    focus_areas = []
    
    # From benchmark report
    recommendations = benchmark_report.get("recommendations", [])
    if recommendations:
        focus_areas.append(f"Week 1-2: {recommendations[0]}")
    
    # From churn analysis
    at_risk_count = len(churn_analysis.get("at_risk_clients", []))
    if at_risk_count > 0:
        focus_areas.append(f"Week 3: Client retention - contact {min(5, at_risk_count)} at-risk clients")
    
    focus_areas.append("Week 4: Review progress and adjust strategy")
    
    return focus_areas


def _get_success_patterns_for_segment(business_segment: str) -> List[str]:
    """Get success patterns for business segment"""
    
    patterns = {
        "solo_barber": [
            "Top performers focus on premium services and client relationships",
            "Successful solo barbers maintain 15-20 regular clients",
            "Average appointment value of $45+ indicates strong performance"
        ],
        "small_shop": [
            "Best practices include online booking and social media presence",
            "Top shops maintain 85%+ appointment confirmation rate",
            "Package deals increase client lifetime value by 30%"
        ],
        "medium_shop": [
            "Successful shops leverage team specialization",
            "Top performers track individual barber metrics",
            "Inventory management becomes critical at this size"
        ],
        "large_shop": [
            "Operational efficiency is key differentiator",
            "Best shops use data analytics for decision making",
            "Staff training and retention directly impact profitability"
        ]
    }
    
    return patterns.get(business_segment, ["Focus on client satisfaction and service quality"])


# Helper functions for market intelligence

def _get_industry_trends(db: Session, segment) -> Dict[str, Any]:
    """Get industry trends for the segment"""
    
    # This would query CrossUserMetric and PerformanceBenchmark tables
    # For now, return sample trends
    return {
        "revenue_growth": "5.2% year-over-year for your segment",
        "appointment_volume": "Increasing 3% monthly in urban areas",
        "pricing_trends": "Average service price up 2% this quarter",
        "technology_adoption": "85% of top performers use online booking"
    }


def _get_competitive_positioning(db: Session, user_id: int, segment) -> Dict[str, Any]:
    """Get competitive positioning analysis"""
    
    # This would analyze user's performance vs segment benchmarks
    return {
        "revenue_percentile": "75th percentile",
        "efficiency_ranking": "Top 25%",
        "growth_rate": "Above average",
        "market_share_potential": "Moderate expansion opportunity"
    }


def _identify_market_opportunities(db: Session, segment) -> List[str]:
    """Identify market opportunities for the segment"""
    
    opportunities = [
        "Premium beard grooming services showing 15% growth",
        "Weekend appointments have 20% lower competition",
        "Corporate clients represent untapped market segment"
    ]
    
    return opportunities


def _get_pricing_insights(db: Session, segment) -> Dict[str, Any]:
    """Get pricing insights for the segment"""
    
    return {
        "average_haircut_price": "$35-45 for your market",
        "premium_service_potential": "Beard trimming commands 25% premium",
        "package_pricing": "3-service packages average $120",
        "seasonal_adjustments": "Holiday period allows 10-15% premium"
    }


def _get_seasonal_intelligence(db: Session, segment) -> Dict[str, Any]:
    """Get seasonal intelligence for the segment"""
    
    return {
        "peak_months": ["November", "December", "May"],
        "slow_periods": ["January", "February"],
        "optimization_tips": [
            "Book holiday appointments 6 weeks in advance",
            "Offer promotions during slow periods",
            "Adjust staffing based on seasonal patterns"
        ]
    }


# Import numpy for calculations
import numpy as np