"""
Unified Payment Analytics API
Provides comprehensive analytics endpoints across all payment flows
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from utils.auth import get_current_user
from models import User
from services.unified_payment_analytics_service import (
    UnifiedPaymentAnalyticsService, AnalyticsPeriod, PaymentAnalyticsMetric
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/unified-payment-analytics", tags=["Unified Payment Analytics"])


# Pydantic Models for API

class AnalyticsRequest(BaseModel):
    """Request model for analytics queries"""
    period: AnalyticsPeriod = Field(default=AnalyticsPeriod.LAST_30_DAYS, description="Time period for analytics")
    include_projections: bool = Field(default=True, description="Include Six Figure Barber projections")
    barber_id: Optional[int] = Field(default=None, description="Specific barber ID (admin only)")


class RealTimeDashboardResponse(BaseModel):
    """Response model for real-time dashboard data"""
    today: Dict[str, Any]
    month_to_date: Dict[str, Any]
    outstanding_commission: Dict[str, Any]
    next_collection: Optional[Dict[str, Any]]
    recent_transactions: list
    last_updated: str


class UnifiedAnalyticsResponse(BaseModel):
    """Response model for unified analytics"""
    period: str
    date_range: Dict[str, str]
    centralized_payments: Dict[str, Any]
    decentralized_payments: Dict[str, Any]
    commission_data: Dict[str, Any]
    combined_metrics: Dict[str, Any]
    trend_analysis: Dict[str, Any]
    mode_comparison: Dict[str, Any]
    six_figure_insights: Optional[Dict[str, Any]]
    recommendations: list
    generated_at: str


class RevenueOptimizationResponse(BaseModel):
    """Response model for revenue optimization insights"""
    current_mode: str
    optimal_mode: str
    potential_monthly_increase: float
    switching_roi: Dict[str, Any]
    recommendations: list
    analysis_period: str
    confidence_score: float
    generated_at: str


# API Endpoints

@router.get("/dashboard", response_model=RealTimeDashboardResponse)
async def get_real_time_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time dashboard data for the current user.
    
    Provides immediate insights for today and month-to-date metrics,
    outstanding commissions, and recent transaction activity.
    """
    
    try:
        # Only allow barbers to view their own data or admins to view any data
        if current_user.role not in ['barber', 'admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only barbers can access payment analytics"
            )
        
        analytics_service = UnifiedPaymentAnalyticsService(db)
        dashboard_data = analytics_service.get_real_time_dashboard_data(current_user.id)
        
        return RealTimeDashboardResponse(**dashboard_data)
        
    except Exception as e:
        logger.error(f"Failed to get real-time dashboard for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/comprehensive", response_model=UnifiedAnalyticsResponse)
async def get_comprehensive_analytics(
    period: AnalyticsPeriod = Query(default=AnalyticsPeriod.LAST_30_DAYS, description="Analytics period"),
    include_projections: bool = Query(default=True, description="Include Six Figure Barber projections"),
    barber_id: Optional[int] = Query(default=None, description="Specific barber ID (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics across all payment flows.
    
    Combines data from centralized payments, decentralized payments,
    commission collections, and Six Figure Barber methodology insights.
    """
    
    try:
        # Determine which barber's data to retrieve
        target_barber_id = barber_id if barber_id and current_user.role in ['admin', 'shop_owner'] else current_user.id
        
        # Only allow barbers to view their own data or admins to view any data
        if current_user.role not in ['barber', 'admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only barbers can access payment analytics"
            )
        
        # If non-admin user is trying to access another user's data
        if barber_id and current_user.role not in ['admin', 'shop_owner'] and barber_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own analytics"
            )
        
        analytics_service = UnifiedPaymentAnalyticsService(db)
        analytics_data = analytics_service.get_unified_analytics(
            target_barber_id, period, include_projections
        )
        
        return UnifiedAnalyticsResponse(**analytics_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get comprehensive analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/optimization", response_model=RevenueOptimizationResponse)
async def get_revenue_optimization(
    barber_id: Optional[int] = Query(default=None, description="Specific barber ID (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get revenue optimization insights and recommendations.
    
    Analyzes payment mode performance and provides actionable
    recommendations for maximizing earnings.
    """
    
    try:
        # Determine which barber's data to retrieve
        target_barber_id = barber_id if barber_id and current_user.role in ['admin', 'shop_owner'] else current_user.id
        
        # Only allow barbers to view their own data or admins to view any data
        if current_user.role not in ['barber', 'admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only barbers can access payment analytics"
            )
        
        # If non-admin user is trying to access another user's data
        if barber_id and current_user.role not in ['admin', 'shop_owner'] and barber_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own analytics"
            )
        
        analytics_service = UnifiedPaymentAnalyticsService(db)
        optimization_data = analytics_service.get_revenue_optimization_insights(target_barber_id)
        
        return RevenueOptimizationResponse(**optimization_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get revenue optimization insights: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/six-figure-progress")
async def get_six_figure_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get specific Six Figure Barber methodology progress and insights.
    
    Provides focused metrics on progress toward six-figure annual earnings
    and methodology-specific recommendations.
    """
    
    try:
        if current_user.role not in ['barber', 'admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only barbers can access Six Figure Barber progress"
            )
        
        analytics_service = UnifiedPaymentAnalyticsService(db)
        
        # Get 30-day analytics with projections
        analytics_data = analytics_service.get_unified_analytics(
            current_user.id, 
            AnalyticsPeriod.LAST_30_DAYS, 
            include_projections=True
        )
        
        # Extract Six Figure Barber specific data
        six_figure_data = analytics_data.get('six_figure_insights', {})
        combined_metrics = analytics_data.get('combined_metrics', {})
        
        # Add additional Six Figure Barber metrics
        response_data = {
            **six_figure_data,
            'current_monthly_volume': combined_metrics.get('total_volume', 0),
            'current_transaction_count': combined_metrics.get('total_transactions', 0),
            'average_service_price': combined_metrics.get('average_transaction', 0),
            'efficiency_score': (six_figure_data.get('current_monthly_revenue', 0) / 
                               max(combined_metrics.get('total_volume', 1), 1)) * 100,
            'methodology_alignment': _calculate_methodology_alignment(combined_metrics),
            'next_milestone': _get_next_six_figure_milestone(six_figure_data),
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Six Figure Barber progress for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/trends")
async def get_payment_trends(
    period: AnalyticsPeriod = Query(default=AnalyticsPeriod.LAST_90_DAYS, description="Trend analysis period"),
    metric: PaymentAnalyticsMetric = Query(default=PaymentAnalyticsMetric.REVENUE, description="Primary metric to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed trend analysis for payment metrics.
    
    Provides time-series data and trend analysis for specific metrics
    across different time periods.
    """
    
    try:
        if current_user.role not in ['barber', 'admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only barbers can access payment trends"
            )
        
        analytics_service = UnifiedPaymentAnalyticsService(db)
        
        # Get comprehensive analytics for trend calculation
        analytics_data = analytics_service.get_unified_analytics(
            current_user.id, period, include_projections=False
        )
        
        # Extract trend data
        trend_data = analytics_data.get('trend_analysis', {})
        combined_metrics = analytics_data.get('combined_metrics', {})
        
        # Generate time-series data points (simplified for now)
        time_series = _generate_time_series_data(current_user.id, period, metric, db)
        
        response_data = {
            'period': period.value,
            'primary_metric': metric.value,
            'trend_analysis': trend_data,
            'current_metrics': combined_metrics,
            'time_series': time_series,
            'insights': _generate_trend_insights(trend_data, metric),
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get payment trends for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/export")
async def export_analytics_data(
    period: AnalyticsPeriod = Query(default=AnalyticsPeriod.LAST_30_DAYS, description="Export period"),
    format: str = Query(default="json", regex="^(json|csv)$", description="Export format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export analytics data in various formats.
    
    Allows users to download their payment analytics data
    for external analysis or record keeping.
    """
    
    try:
        if current_user.role not in ['barber', 'admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only barbers can export analytics data"
            )
        
        analytics_service = UnifiedPaymentAnalyticsService(db)
        analytics_data = analytics_service.get_unified_analytics(
            current_user.id, period, include_projections=True
        )
        
        if format == "csv":
            # Convert to CSV format (simplified)
            csv_data = _convert_analytics_to_csv(analytics_data)
            return {
                'format': 'csv',
                'data': csv_data,
                'filename': f'payment_analytics_{current_user.id}_{period.value}.csv',
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
        else:
            # Return JSON format
            return {
                'format': 'json',
                'data': analytics_data,
                'filename': f'payment_analytics_{current_user.id}_{period.value}.json',
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export analytics data for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Helper functions

def _calculate_methodology_alignment(combined_metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate alignment with Six Figure Barber methodology."""
    
    average_transaction = combined_metrics.get('average_transaction', 0)
    total_transactions = combined_metrics.get('total_transactions', 0)
    
    # Six Figure Barber methodology targets
    target_avg_transaction = 75.0  # $75 average service
    target_monthly_transactions = 50  # Reasonable monthly goal
    
    transaction_score = min((average_transaction / target_avg_transaction) * 100, 100)
    volume_score = min((total_transactions / target_monthly_transactions) * 100, 100)
    overall_score = (transaction_score + volume_score) / 2
    
    return {
        'overall_score': overall_score,
        'transaction_pricing_score': transaction_score,
        'volume_consistency_score': volume_score,
        'recommendations': _get_methodology_recommendations(transaction_score, volume_score)
    }


def _get_methodology_recommendations(transaction_score: float, volume_score: float) -> list:
    """Get Six Figure Barber methodology recommendations."""
    
    recommendations = []
    
    if transaction_score < 70:
        recommendations.append("Focus on premium service pricing to increase average transaction value")
    
    if volume_score < 70:
        recommendations.append("Work on client retention and booking consistency")
    
    if transaction_score > 80 and volume_score > 80:
        recommendations.append("Great work! Consider expanding service offerings or targeting higher-end clients")
    
    return recommendations


def _get_next_six_figure_milestone(six_figure_data: Dict[str, Any]) -> Dict[str, Any]:
    """Determine the next milestone in Six Figure Barber journey."""
    
    progress = six_figure_data.get('progress_percentage', 0)
    current_monthly = six_figure_data.get('current_monthly_revenue', 0)
    
    milestones = [
        {'threshold': 25, 'target': 2083, 'title': 'Quarter Progress'},
        {'threshold': 50, 'target': 4167, 'title': 'Halfway There'},
        {'threshold': 75, 'target': 6250, 'title': 'Three-Quarters'},
        {'threshold': 90, 'target': 7500, 'title': 'Almost There'},
        {'threshold': 100, 'target': 8333, 'title': 'Six Figure Achieved!'}
    ]
    
    for milestone in milestones:
        if progress < milestone['threshold']:
            return {
                'title': milestone['title'],
                'target_monthly_revenue': milestone['target'],
                'current_monthly_revenue': current_monthly,
                'amount_needed': milestone['target'] - current_monthly,
                'progress_to_milestone': (current_monthly / milestone['target']) * 100
            }
    
    # Already at or above 100%
    return {
        'title': 'Six Figure Achieved!',
        'target_monthly_revenue': 8333,
        'current_monthly_revenue': current_monthly,
        'amount_needed': 0,
        'progress_to_milestone': 100
    }


def _generate_time_series_data(
    barber_id: int, 
    period: AnalyticsPeriod, 
    metric: PaymentAnalyticsMetric, 
    db: Session
) -> list:
    """Generate simplified time-series data for trends."""
    
    # This is a simplified implementation
    # In a real system, this would query actual historical data
    return [
        {'date': '2024-07-01', 'value': 1500},
        {'date': '2024-07-08', 'value': 1750},
        {'date': '2024-07-15', 'value': 1600},
        {'date': '2024-07-22', 'value': 1900}
    ]


def _generate_trend_insights(trend_data: Dict[str, Any], metric: PaymentAnalyticsMetric) -> list:
    """Generate insights based on trend analysis."""
    
    insights = []
    
    revenue_trend = trend_data.get('total_volume_trend', 0)
    transaction_trend = trend_data.get('total_transactions_trend', 0)
    
    if revenue_trend > 10:
        insights.append("Strong revenue growth - keep up the momentum!")
    elif revenue_trend < -10:
        insights.append("Revenue decline detected - consider reviewing pricing or marketing")
    
    if transaction_trend > 15:
        insights.append("Excellent transaction volume growth")
    elif transaction_trend < -15:
        insights.append("Transaction volume declining - focus on client retention")
    
    return insights


def _convert_analytics_to_csv(analytics_data: Dict[str, Any]) -> str:
    """Convert analytics data to CSV format."""
    
    # Simplified CSV conversion
    csv_lines = [
        "Metric,Value",
        f"Period,{analytics_data['period']}",
        f"Total Volume,{analytics_data['combined_metrics']['total_volume']}",
        f"Total Transactions,{analytics_data['combined_metrics']['total_transactions']}",
        f"Net Earnings,{analytics_data['combined_metrics']['total_net_earnings']}",
        f"Success Rate,{analytics_data['combined_metrics']['weighted_success_rate']}%"
    ]
    
    return "\n".join(csv_lines)