"""
Analytics Router for 6FB Booking Platform V2

Provides comprehensive analytics endpoints including:
- Revenue analytics and reporting
- Appointment metrics and patterns
- Client retention and lifetime value
- Barber performance metrics
- Six Figure Barber methodology calculations
- Comparative analytics
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import DateRange
from services.analytics_service import AnalyticsService
from utils.role_permissions import (
    Permission,
    PermissionChecker,
    get_permission_checker
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_organization_user_ids(user: User, db: Session) -> List[int]:
    """
    Get all user IDs that belong to the same organization as the given user.
    This is used for organization-based data filtering.
    """
    # If user has no organization, return only their own ID
    if not user.primary_organization:
        return [user.id]
    
    # Get all users in the same organization
    from models.organization import UserOrganization
    user_orgs = db.query(UserOrganization).filter(
        UserOrganization.organization_id == user.primary_organization.id
    ).all()
    
    return [uo.user_id for uo in user_orgs]


@router.get("/dashboard")
async def get_dashboard_analytics(
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard analytics
    
    Returns key metrics, trends, and insights for the dashboard
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Get organization user IDs for filtering
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # If specific user_id is requested, check permissions
    if user_id and user_id != current_user.id:
        # Check if the requested user is in the same organization
        if user_id not in org_user_ids:
            # Not in same org, need admin permission
            if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
                raise HTTPException(status_code=403, detail="Insufficient permissions to view analytics outside your organization")
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    
    # If a specific user is requested and authorized, filter to that user
    # Otherwise, show organization-wide analytics
    if user_id and (user_id == current_user.id or user_id in org_user_ids or checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS)):
        return analytics_service.get_advanced_dashboard_summary(user_id=user_id, date_range=date_range)
    else:
        # Show organization-wide analytics
        return analytics_service.get_advanced_dashboard_summary(user_ids=org_user_ids, date_range=date_range)


@router.get("/dashboard/{user_id}")
async def get_dashboard_analytics_by_user(
    user_id: int,
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard analytics for a specific user
    
    Returns key metrics, trends, and insights for the dashboard
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Get organization user IDs for filtering
    org_user_ids = get_organization_user_ids(current_user, db)
    
    if user_id != current_user.id:
        # Check if the requested user is in the same organization
        if user_id not in org_user_ids:
            # Not in same org, need admin permission
            if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
                raise HTTPException(status_code=403, detail="Insufficient permissions to access analytics outside your organization")
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_advanced_dashboard_summary(user_id=user_id, date_range=date_range)


@router.get("/revenue")
async def get_revenue_analytics(
    group_by: str = Query("month", description="Group by period: day, week, month, year"),
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed revenue analytics
    
    Returns revenue trends, transaction counts, and average values
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check if user has permission to view financial analytics
    if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view revenue analytics")
    
    # Get organization user IDs for filtering
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # If trying to view another user's data, check organization membership
    if user_id and user_id != current_user.id:
        if user_id not in org_user_ids and not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view analytics outside your organization")
    
    # Validate group_by parameter
    if group_by not in ["day", "week", "month", "year"]:
        raise HTTPException(status_code=400, detail="Invalid group_by parameter")
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    
    # If specific user requested and authorized, show their data
    # Otherwise show organization-wide data
    if user_id and (user_id == current_user.id or user_id in org_user_ids or checker.has_permission(Permission.SYSTEM_ADMIN)):
        return analytics_service.get_revenue_analytics(user_id=user_id, date_range=date_range, group_by=group_by)
    else:
        # Show organization-wide analytics
        return analytics_service.get_revenue_analytics(user_ids=org_user_ids, date_range=date_range, group_by=group_by)


@router.get("/appointments")
async def get_appointment_analytics(
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get appointment analytics including completion rates, no-shows, and service breakdown
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check if user has permission to view analytics (appointment analytics are basic)
    if not checker.has_permission(Permission.VIEW_BASIC_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view appointment analytics")
    
    # Get organization user IDs for filtering
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # If trying to view another user's data, check organization membership
    if user_id and user_id != current_user.id:
        if user_id not in org_user_ids and not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view analytics outside your organization")
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    
    # If specific user requested and authorized, show their data
    # Otherwise show organization-wide data
    if user_id and (user_id == current_user.id or user_id in org_user_ids or checker.has_permission(Permission.SYSTEM_ADMIN)):
        return analytics_service.get_appointment_analytics(user_id=user_id, date_range=date_range)
    else:
        # Show organization-wide analytics
        return analytics_service.get_appointment_analytics(user_ids=org_user_ids, date_range=date_range)


@router.get("/appointment-patterns")
async def get_appointment_patterns(
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed appointment booking patterns and no-show analysis
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check base permission for this endpoint
    if not checker.has_permission(Permission.VIEW_BASIC_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view analytics")
    
    # If trying to view another user's data, need system admin permission
    if user_id and user_id != current_user.id:
        if not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view other users' analytics")
    
    # Determine target user - if no user_id specified, use current user
    target_user_id = user_id if user_id else current_user.id
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_appointment_patterns_analytics(target_user_id, date_range)


@router.get("/client-retention")
async def get_client_retention_analytics(
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get client retention metrics and segmentation
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check base permission for this endpoint
    if not checker.has_permission(Permission.VIEW_BASIC_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view analytics")
    
    # If trying to view another user's data, need system admin permission
    if user_id and user_id != current_user.id:
        if not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view other users' analytics")
    
    # Determine target user - if no user_id specified, use current user
    target_user_id = user_id if user_id else current_user.id
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_client_retention_metrics(target_user_id, date_range)


@router.get("/client-lifetime-value")
async def get_client_lifetime_value_analytics(
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive client lifetime value analytics and segmentation
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check base permission for this endpoint
    if not checker.has_permission(Permission.VIEW_BASIC_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view analytics")
    
    # If trying to view another user's data, need system admin permission
    if user_id and user_id != current_user.id:
        if not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view other users' analytics")
    
    # Determine target user - if no user_id specified, use current user
    target_user_id = user_id if user_id else current_user.id
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_client_lifetime_value_analytics(target_user_id, date_range)


@router.get("/barber-performance")
async def get_barber_performance_metrics(
    user_id: Optional[int] = Query(None, description="User ID to analyze (defaults to current user)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive user performance metrics (works for barbers and other users)
    """
    # Determine target user ID
    if user_id:
        # Check permissions - only admin or the user themselves can view their metrics
        if current_user.role != "admin" and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        target_user_id = user_id
    else:
        # Default to current user
        target_user_id = current_user.id
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_barber_performance_metrics(target_user_id, date_range)


@router.get("/six-figure-barber")
async def get_six_figure_barber_metrics(
    target_annual_income: float = Query(100000.0, description="Target annual income goal"),
    user_id: Optional[int] = Query(None, description="User ID to analyze (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Six Figure Barber methodology metrics and recommendations
    """
    # Determine target user ID
    if user_id:
        # Check permissions - only admin or the user themselves can view their metrics
        if current_user.role != "admin" and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        target_user_id = user_id
    else:
        # Default to current user
        target_user_id = current_user.id
    
    # Validate target income
    if target_annual_income <= 0 or target_annual_income > 1000000:
        raise HTTPException(status_code=400, detail="Target annual income must be between $1 and $1,000,000")
    
    try:
        # Add timeout protection and error handling
        analytics_service = AnalyticsService(db)
        
        # Use optimized analytics service with caching for better performance
        try:
            # Use cached analytics calculation for better performance
            cached_metrics = analytics_service.get_six_figure_metrics_cached(target_user_id, target_annual_income)
            if cached_metrics:
                return cached_metrics
        except Exception as cache_error:
            print(f"Cache miss or error, falling back to live calculation: {cache_error}")
        
        # Use real analytics calculation instead of mock data
        return analytics_service.calculate_six_figure_barber_metrics(target_user_id, target_annual_income)
        
    except Exception as e:
        # Log the error but don't crash the dashboard
        print(f"Six Figure Barber analytics error: {e}")
        return {
            "error": "Analytics temporarily unavailable",
            "status": "error",
            "target_annual_income": target_annual_income,
            "message": "Six Figure Barber analytics are temporarily disabled due to performance issues"
        }


@router.get("/comparative")
async def get_comparative_analytics(
    comparison_period: str = Query("previous_month", description="Comparison period: previous_month, previous_quarter, previous_year"),
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comparative analytics between current and previous periods
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check base permission for this endpoint
    if not checker.has_permission(Permission.VIEW_BASIC_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view analytics")
    
    # If trying to view another user's data, need system admin permission
    if user_id and user_id != current_user.id:
        if not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view other users' analytics")
    
    # Validate comparison period
    if comparison_period not in ["previous_month", "previous_quarter", "previous_year"]:
        raise HTTPException(status_code=400, detail="Invalid comparison period")
    
    # Determine target user - if no user_id specified, use current user
    target_user_id = user_id if user_id else current_user.id
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_comparative_analytics(target_user_id, comparison_period)


@router.get("/export")
async def export_analytics_data(
    export_type: str = Query("dashboard", description="Type of data to export: dashboard, revenue, appointments, clients"),
    format: str = Query("json", description="Export format: json, csv"),
    start_date: Optional[date] = Query(None, description="Start date for export range"),
    end_date: Optional[date] = Query(None, description="End date for export range"),
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Export analytics data in various formats
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check base permission for this endpoint
    if not checker.has_permission(Permission.VIEW_BASIC_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view analytics")
    
    # If trying to view another user's data, need system admin permission
    if user_id and user_id != current_user.id:
        if not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view other users' analytics")
    
    # Validate parameters
    if export_type not in ["dashboard", "revenue", "appointments", "clients", "barber_performance"]:
        raise HTTPException(status_code=400, detail="Invalid export type")
    
    if format not in ["json", "csv"]:
        raise HTTPException(status_code=400, detail="Invalid export format")
    
    # Determine target user - if no user_id specified, use current user
    target_user_id = user_id if user_id else current_user.id
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    
    # Get data based on export type
    if export_type == "dashboard":
        data = analytics_service.get_advanced_dashboard_summary(target_user_id, date_range)
    elif export_type == "revenue":
        data = analytics_service.get_revenue_analytics(target_user_id, date_range)
    elif export_type == "appointments":
        data = analytics_service.get_appointment_analytics(target_user_id, date_range)
    elif export_type == "clients":
        data = analytics_service.get_client_retention_metrics(target_user_id, date_range)
    elif export_type == "barber_performance":
        if current_user.role not in ["barber", "admin"]:
            raise HTTPException(status_code=403, detail="Only barbers can export performance data")
        data = analytics_service.get_barber_performance_metrics(target_user_id, date_range)
    
    # Format data for export
    export_data = {
        "export_type": export_type,
        "format": format,
        "generated_at": datetime.utcnow().isoformat(),
        "date_range": {
            "start": start_date.isoformat() if start_date else None,
            "end": end_date.isoformat() if end_date else None
        },
        "user_id": target_user_id,
        "data": data
    }
    
    # TODO: Implement CSV formatting if needed
    if format == "csv":
        # For now, return JSON with a note about CSV formatting
        export_data["note"] = "CSV formatting not yet implemented. Data returned in JSON format."
    
    return export_data


@router.get("/insights")
async def get_business_insights(
    user_id: Optional[int] = Query(None, description="User ID to filter analytics (admin only)"),
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get AI-powered business insights and recommendations
    """
    # Permission check using new system
    checker = PermissionChecker(current_user, db)
    
    # Check base permission for this endpoint
    if not checker.has_permission(Permission.VIEW_BASIC_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view analytics")
    
    # If trying to view another user's data, need system admin permission
    if user_id and user_id != current_user.id:
        if not checker.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(status_code=403, detail="You don't have permission to view other users' analytics")
    
    # Determine target user - if no user_id specified, use current user
    target_user_id = user_id if user_id else current_user.id
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    
    # Get comprehensive analytics
    dashboard_data = analytics_service.get_advanced_dashboard_summary(target_user_id, date_range)
    
    # Extract insights and recommendations
    insights = dashboard_data.get('business_insights', [])
    quick_actions = dashboard_data.get('quick_actions', [])
    
    # Additional performance scoring
    performance_score = _calculate_performance_score(dashboard_data)
    
    return {
        "insights": insights,
        "quick_actions": quick_actions,
        "performance_score": performance_score,
        "recommendations": _generate_detailed_recommendations(dashboard_data),
        "benchmarks": _get_industry_benchmarks(),
        "generated_at": datetime.utcnow().isoformat()
    }


def _calculate_performance_score(dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate overall performance score based on key metrics"""
    score = 0
    max_score = 100
    factors = []
    
    # Revenue growth factor (20 points)
    revenue_change = dashboard_data.get('key_metrics', {}).get('revenue', {}).get('change', 0)
    if revenue_change > 10:
        revenue_score = 20
    elif revenue_change > 0:
        revenue_score = 15
    elif revenue_change > -10:
        revenue_score = 10
    else:
        revenue_score = 5
    
    score += revenue_score
    factors.append({"factor": "Revenue Growth", "score": revenue_score, "max": 20})
    
    # Appointment completion rate factor (20 points)
    completion_rate = dashboard_data.get('key_metrics', {}).get('appointments', {}).get('completion_rate', 0)
    if completion_rate >= 90:
        completion_score = 20
    elif completion_rate >= 80:
        completion_score = 15
    elif completion_rate >= 70:
        completion_score = 10
    else:
        completion_score = 5
    
    score += completion_score
    factors.append({"factor": "Completion Rate", "score": completion_score, "max": 20})
    
    # Client retention factor (20 points)
    retention_rate = dashboard_data.get('key_metrics', {}).get('clients', {}).get('retention_rate', 0)
    if retention_rate >= 80:
        retention_score = 20
    elif retention_rate >= 60:
        retention_score = 15
    elif retention_rate >= 40:
        retention_score = 10
    else:
        retention_score = 5
    
    score += retention_score
    factors.append({"factor": "Client Retention", "score": retention_score, "max": 20})
    
    # CLV factor (20 points)
    avg_clv = dashboard_data.get('key_metrics', {}).get('clv', {}).get('average', 0)
    if avg_clv >= 500:
        clv_score = 20
    elif avg_clv >= 300:
        clv_score = 15
    elif avg_clv >= 200:
        clv_score = 10
    else:
        clv_score = 5
    
    score += clv_score
    factors.append({"factor": "Customer Lifetime Value", "score": clv_score, "max": 20})
    
    # Efficiency factor (20 points) - for barbers
    if 'barber_performance' in dashboard_data:
        utilization = dashboard_data['barber_performance']['efficiency']['utilization_rate']
        if 70 <= utilization <= 85:
            efficiency_score = 20
        elif 60 <= utilization <= 90:
            efficiency_score = 15
        elif 50 <= utilization <= 95:
            efficiency_score = 10
        else:
            efficiency_score = 5
    else:
        efficiency_score = 10  # Default for non-barber users
    
    score += efficiency_score
    factors.append({"factor": "Schedule Efficiency", "score": efficiency_score, "max": 20})
    
    # Overall grade
    percentage = (score / max_score) * 100
    if percentage >= 90:
        grade = "A"
    elif percentage >= 80:
        grade = "B"
    elif percentage >= 70:
        grade = "C"
    elif percentage >= 60:
        grade = "D"
    else:
        grade = "F"
    
    return {
        "overall_score": score,
        "max_score": max_score,
        "percentage": percentage,
        "grade": grade,
        "factors": factors
    }


def _generate_detailed_recommendations(dashboard_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate detailed business recommendations"""
    recommendations = []
    
    # Revenue optimization
    revenue_change = dashboard_data.get('key_metrics', {}).get('revenue', {}).get('change', 0)
    if revenue_change < 5:
        recommendations.append({
            "category": "Revenue Optimization",
            "priority": "high",
            "title": "Boost Revenue Growth",
            "description": "Your revenue growth is below optimal levels. Consider implementing dynamic pricing, service packages, or premium offerings.",
            "expected_impact": "15-25% revenue increase",
            "implementation_time": "2-4 weeks",
            "resources_needed": ["Pricing analysis", "Service menu review", "Staff training"]
        })
    
    # Client retention improvement
    retention_rate = dashboard_data.get('key_metrics', {}).get('clients', {}).get('retention_rate', 0)
    if retention_rate < 70:
        recommendations.append({
            "category": "Client Retention",
            "priority": "high",
            "title": "Implement Client Loyalty Program",
            "description": "Low retention rate indicates clients aren't returning. A loyalty program with rewards and personalized follow-up can significantly improve retention.",
            "expected_impact": "20-30% improvement in retention rate",
            "implementation_time": "3-6 weeks",
            "resources_needed": ["Loyalty program setup", "Client communication system", "Reward inventory"]
        })
    
    # Appointment optimization
    completion_rate = dashboard_data.get('key_metrics', {}).get('appointments', {}).get('completion_rate', 0)
    if completion_rate < 85:
        recommendations.append({
            "category": "Appointment Management",
            "priority": "medium",
            "title": "Reduce No-Shows and Cancellations",
            "description": "Implement automated reminders, require deposits, and create a clear cancellation policy to improve completion rates.",
            "expected_impact": "10-15% improvement in completion rate",
            "implementation_time": "1-2 weeks",
            "resources_needed": ["Reminder system", "Payment processing", "Policy documentation"]
        })
    
    return recommendations


def _get_industry_benchmarks() -> Dict[str, Any]:
    """Get industry benchmark data for comparison"""
    return {
        "appointment_completion_rate": {
            "excellent": 90,
            "good": 80,
            "average": 70,
            "poor": 60
        },
        "client_retention_rate": {
            "excellent": 80,
            "good": 65,
            "average": 50,
            "poor": 35
        },
        "average_clv": {
            "excellent": 500,
            "good": 350,
            "average": 250,
            "poor": 150
        },
        "utilization_rate": {
            "excellent": 80,
            "good": 70,
            "average": 60,
            "poor": 50
        },
        "revenue_growth_monthly": {
            "excellent": 15,
            "good": 10,
            "average": 5,
            "poor": 0
        }
    }