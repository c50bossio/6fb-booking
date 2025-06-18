from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime, timedelta

from database import get_db
from services.metrics_service import MetricsService
from services.sixfb_calculator import SixFBCalculator

router = APIRouter()

# TODO: Add authentication dependency to get current barber_id
# For now using hardcoded barber_id = 1 for development

@router.get("/dashboard")
async def get_dashboard_metrics(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard metrics for 6FB interface"""
    try:
        metrics_service = MetricsService(db)
        dashboard_data = metrics_service.get_dashboard_metrics(barber_id)
        return {"success": True, "data": dashboard_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating dashboard metrics: {str(e)}")

@router.get("/6fb-score")
async def get_sixfb_score(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    period_type: str = Query("weekly", description="daily or weekly"),
    calculation_date: Optional[date] = Query(None, description="Date for calculation, defaults to today"),
    db: Session = Depends(get_db)
):
    """Calculate and return 6FB score for given period"""
    if calculation_date is None:
        calculation_date = date.today()
    
    try:
        calculator = SixFBCalculator(db)
        score_data = calculator.calculate_sixfb_score(barber_id, period_type)
        return {"success": True, "data": score_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating 6FB score: {str(e)}")

@router.get("/daily-metrics")
async def get_daily_metrics(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    target_date: Optional[date] = Query(None, description="Date for metrics, defaults to today"),
    db: Session = Depends(get_db)
):
    """Get daily metrics for a specific date"""
    if target_date is None:
        target_date = date.today()
    
    try:
        calculator = SixFBCalculator(db)
        daily_data = calculator.calculate_daily_metrics(barber_id, target_date)
        return {"success": True, "data": daily_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating daily metrics: {str(e)}")

@router.get("/weekly-metrics")
async def get_weekly_metrics(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    week_start: Optional[date] = Query(None, description="Monday of the week, defaults to current week"),
    db: Session = Depends(get_db)
):
    """Get weekly metrics for a specific week"""
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())  # Monday of current week
    
    try:
        calculator = SixFBCalculator(db)
        weekly_data = calculator.calculate_weekly_metrics(barber_id, week_start)
        return {"success": True, "data": weekly_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating weekly metrics: {str(e)}")

@router.get("/revenue-breakdown")
async def get_revenue_breakdown(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    db: Session = Depends(get_db)
):
    """Get revenue breakdown by source (service, tips, products)"""
    # Default to current week if no dates provided
    if start_date is None:
        today = date.today()
        start_date = today - timedelta(days=today.weekday())  # Monday
    if end_date is None:
        end_date = start_date + timedelta(days=6)  # Sunday
    
    try:
        calculator = SixFBCalculator(db)
        weekly_data = calculator.calculate_weekly_metrics(barber_id, start_date)
        
        breakdown = {
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "revenue_breakdown": {
                "service_revenue": weekly_data["total_service_revenue"],
                "tips": weekly_data["total_tips"], 
                "product_revenue": weekly_data["total_product_revenue"],
                "total_revenue": weekly_data["total_revenue"]
            },
            "percentages": {
                "service_percentage": round((weekly_data["total_service_revenue"] / weekly_data["total_revenue"] * 100) if weekly_data["total_revenue"] > 0 else 0, 1),
                "tips_percentage": round((weekly_data["total_tips"] / weekly_data["total_revenue"] * 100) if weekly_data["total_revenue"] > 0 else 0, 1),
                "product_percentage": round((weekly_data["total_product_revenue"] / weekly_data["total_revenue"] * 100) if weekly_data["total_revenue"] > 0 else 0, 1)
            }
        }
        
        return {"success": True, "data": breakdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating revenue breakdown: {str(e)}")

@router.get("/customer-analytics")
async def get_customer_analytics(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    period_days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db)
):
    """Get customer analytics (new vs returning, lifetime value, etc.)"""
    try:
        calculator = SixFBCalculator(db)
        analytics_data = calculator.calculate_customer_analytics(barber_id, period_days)
        return {"success": True, "data": analytics_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating customer analytics: {str(e)}")

@router.post("/refresh-metrics")
async def refresh_metrics(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    days_back: int = Query(7, description="Number of days to refresh"),
    db: Session = Depends(get_db)
):
    """Manually refresh metrics for the past N days"""
    try:
        metrics_service = MetricsService(db)
        metrics_service.refresh_all_metrics(barber_id, days_back)
        return {"success": True, "message": f"Refreshed metrics for the past {days_back} days"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing metrics: {str(e)}")