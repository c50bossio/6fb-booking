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
import logging

from db import get_db
from dependencies import get_current_user
from utils.error_handling import safe_endpoint
from models import User
from schemas import DateRange
from services.analytics_service import AnalyticsService
from services.upselling_conversion_detector import UpsellConversionDetector
from utils.role_permissions import (
    Permission,
    PermissionChecker
)

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

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

@router.get("/dashboard/simple/{user_id}")
async def get_simple_dashboard_analytics(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get simple dashboard analytics for a specific user (fallback endpoint)
    """
    try:
        # Get basic data from database directly
        from sqlalchemy import func
        from models import Appointment, Client, Payment
        from datetime import datetime, timedelta
        
        # Get current month data
        current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Revenue data
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.created_at >= current_month_start,
            Payment.status == "completed"
        ).scalar() or 0
        
        # Appointment data  
        total_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.start_time >= current_month_start
        ).scalar() or 0
        
        completed_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.start_time >= current_month_start,
            Appointment.status == "completed"
        ).scalar() or 0
        
        # Client data
        total_clients = db.query(func.count(Client.id)).scalar() or 0
        
        completion_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
        
        return {
            "revenue_summary": {
                "total_revenue": float(total_revenue),
                "revenue_growth": 0,
                "average_ticket": float(total_revenue / completed_appointments) if completed_appointments > 0 else 0,
                "ticket_growth": 0
            },
            "appointment_summary": {
                "total_appointments": total_appointments,
                "appointment_growth": 0,
                "cancellation_rate": 0,
                "no_show_rate": 0
            },
            "client_summary": {
                "total_clients": total_clients,
                "new_clients": 0,
                "returning_clients": 0,
                "retention_rate": 95
            },
            "trends": {
                "revenue_trend": [],
                "appointment_trend": []
            }
        }
    except Exception as e:
        logger.error(f"Error in get_simple_dashboard_analytics: {str(e)}")
        # Return minimal data structure
        return {
            "revenue_summary": {"total_revenue": 0, "revenue_growth": 0, "average_ticket": 0, "ticket_growth": 0},
            "appointment_summary": {"total_appointments": 0, "appointment_growth": 0, "cancellation_rate": 0, "no_show_rate": 0},  
            "client_summary": {"total_clients": 0, "new_clients": 0, "returning_clients": 0, "retention_rate": 0},
            "trends": {"revenue_trend": [], "appointment_trend": []}
        }

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
    try:
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
        
    except HTTPException:
        # Re-raise permission errors
        raise
    except Exception as e:
        logger.error(f"Error in get_dashboard_analytics_by_user: {str(e)}", exc_info=True)
        # Return a minimal fallback structure to prevent dashboard crash
        return {
            'key_metrics': {
                'revenue': {'current': 0, 'change': 0, 'trend': 'stable'},
                'appointments': {'current': 0, 'change': 0, 'completion_rate': 0},
                'clients': {'active': 0, 'change': 0, 'retention_rate': 0},
                'clv': {'average': 0, 'total': 0}
            },
            'revenue_analytics': {'summary': {'total_revenue': 0, 'average_transaction': 0}, 'by_period': []},
            'appointment_analytics': {'summary': {'total': 0, 'completion_rate': 0}, 'by_service': {}},
            'retention_metrics': {'summary': {'active_clients': 0, 'retention_rate': 0}},
            'clv_analytics': {'summary': {'average_clv': 0, 'total_clv': 0}},
            'pattern_analytics': {},
            'comparative_data': {'comparisons': {'revenue': {'change': 0}, 'appointments': {'change': 0}, 'active_clients': {'change': 0}}},
            'business_insights': [],
            'quick_actions': []
        }

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
        # Use the optimized analytics service with proper error handling
        analytics_service = AnalyticsService(db)
        
        # Enable real Six Figure Barber analytics with timeout protection
        logger.info(f"Calculating Six Figure Barber metrics for user {target_user_id} with target ${target_annual_income}")
        
        # Calculate the real metrics using the optimized implementation
        analytics_data = analytics_service.calculate_six_figure_barber_metrics(target_user_id, target_annual_income)
        
        # Enhance with 6FB AI coaching insights
        from services.six_figure_barber_coach import SixFBCoach
        coach = SixFBCoach(analytics_data)
        
        # Add coaching insights to the response
        analytics_data['coaching_insights'] = [
            {
                'category': insight.category.value,
                'priority': insight.priority.value,
                'title': insight.title,
                'message': insight.message,
                'impact_description': insight.impact_description,
                'potential_revenue_increase': insight.potential_revenue_increase,
                'action_steps': insight.action_steps,
                'timeline': insight.timeline,
                'success_metrics': insight.success_metrics,
                'resources': insight.resources or [],
                # Educational components
                'why_this_matters': insight.why_this_matters,
                'business_principle': insight.business_principle,
                'market_context': insight.market_context,
                'six_fb_methodology': insight.six_fb_methodology
            }
            for insight in coach.generate_comprehensive_coaching()[:5]  # Top 5 insights
        ]
        
        # Add daily focus areas
        analytics_data['daily_focus'] = coach.generate_daily_focus_areas()
        
        return analytics_data
        
    except Exception as e:
        # Log the error but don't crash the dashboard
        print(f"Six Figure Barber analytics error: {e}")
        return {
            "error": "Analytics temporarily unavailable",
            "status": "error",
            "target_annual_income": target_annual_income,
            "message": "Six Figure Barber analytics are temporarily disabled due to performance issues"
        }

@router.get("/six-figure-barber/progress")
async def get_six_fb_progress_tracking(
    target_annual_income: float = Query(100000.0, description="Target annual income goal"),
    user_id: Optional[int] = Query(None, description="User ID to analyze (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive 6FB progress tracking with milestones and achievements
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
        # Import the existing progress tracker
        from services.six_fb_progress_tracker import SixFBProgressTracker
        
        # Create progress tracker instance
        progress_tracker = SixFBProgressTracker(db, target_user_id, target_annual_income)
        
        # Get comprehensive progress data
        progress_overview = progress_tracker.get_progress_overview()
        milestones = progress_tracker.get_milestone_progress()
        achievement_summary = progress_tracker.get_achievement_summary()
        
        return {
            "user_id": target_user_id,
            "target_annual_income": target_annual_income,
            "progress_overview": {
                "current_annual_pace": progress_overview.current_annual_pace,
                "target_annual_income": progress_overview.target_annual_income,
                "progress_percentage": progress_overview.progress_percentage,
                "months_to_goal": progress_overview.months_to_goal,
                "daily_target": progress_overview.daily_target,
                "weekly_target": progress_overview.weekly_target,
                "monthly_target": progress_overview.monthly_target,
                "days_ahead_behind": progress_overview.days_ahead_behind,
                "trend_direction": progress_overview.trend_direction
            },
            "milestones": [
                {
                    "id": milestone.id,
                    "type": milestone.type.value,
                    "level": milestone.level.value,
                    "title": milestone.title,
                    "description": milestone.description,
                    "target_value": milestone.target_value,
                    "current_value": milestone.current_value,
                    "progress_percentage": milestone.progress_percentage,
                    "achieved": milestone.achieved,
                    "achieved_date": milestone.achieved_date.isoformat() if milestone.achieved_date else None,
                    "reward_message": milestone.reward_message,
                    "next_milestone_hint": milestone.next_milestone_hint
                }
                for milestone in milestones
            ],
            "achievement_summary": achievement_summary,
            "generated_at": datetime.utcnow().isoformat(),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"6FB progress tracking error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate progress tracking: {str(e)}")

@router.get("/six-figure-barber/milestones/{milestone_type}")
async def get_six_fb_milestones_by_type(
    milestone_type: str,
    target_annual_income: float = Query(100000.0, description="Target annual income goal"),
    user_id: Optional[int] = Query(None, description="User ID to analyze (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get 6FB milestones filtered by type (revenue, clients, retention, efficiency, pricing)
    """
    # Determine target user ID
    if user_id:
        if current_user.role != "admin" and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        target_user_id = user_id
    else:
        target_user_id = current_user.id
    
    # Validate milestone type
    valid_types = ["revenue", "clients", "retention", "efficiency", "pricing"]
    if milestone_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid milestone type. Must be one of: {', '.join(valid_types)}")
    
    try:
        from services.six_fb_progress_tracker import SixFBProgressTracker
        
        progress_tracker = SixFBProgressTracker(db, target_user_id, target_annual_income)
        all_milestones = progress_tracker.get_milestone_progress()
        
        # Filter by milestone type
        filtered_milestones = [
            milestone for milestone in all_milestones 
            if milestone.type.value == milestone_type
        ]
        
        return {
            "milestone_type": milestone_type,
            "user_id": target_user_id,
            "milestones": [
                {
                    "id": milestone.id,
                    "level": milestone.level.value,
                    "title": milestone.title,
                    "description": milestone.description,
                    "target_value": milestone.target_value,
                    "current_value": milestone.current_value,
                    "progress_percentage": milestone.progress_percentage,
                    "achieved": milestone.achieved,
                    "reward_message": milestone.reward_message,
                    "next_milestone_hint": milestone.next_milestone_hint
                }
                for milestone in filtered_milestones
            ],
            "total_milestones": len(filtered_milestones),
            "achieved_count": len([m for m in filtered_milestones if m.achieved]),
            "next_milestone": next((m for m in filtered_milestones if not m.achieved), None),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"6FB milestone filtering error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get milestones: {str(e)}")

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

@router.get("/revenue-breakdown")
async def get_revenue_breakdown(
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    breakdown_by: str = Query("all", description="Breakdown type: all, service, time, client_type, premium"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed revenue breakdown aligned with Six Figure Barber methodology
    
    Returns:
    - Revenue by service category
    - Revenue by time of day/week
    - Revenue by client type (new vs returning)
    - Premium service adoption rates
    - Average ticket analysis
    - Upsell/cross-sell performance
    """
    # Permission check
    checker = PermissionChecker(current_user, db)
    if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
        raise HTTPException(status_code=403, detail="You don't have permission to view revenue analytics")
    
    # Get organization user IDs for filtering
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # Create date range if provided
    date_range = None
    if start_date and end_date:
        date_range = DateRange(
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.max.time())
        )
    
    analytics_service = AnalyticsService(db)
    return analytics_service.get_detailed_revenue_breakdown(user_ids=org_user_ids, date_range=date_range, breakdown_by=breakdown_by)

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

@router.get("/commissions")
@safe_endpoint
async def get_commission_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analytics"),
    end_date: Optional[date] = Query(None, description="End date for analytics"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive commission analytics for barbers"""
    # Check permissions inline
    permission_checker = PermissionChecker(current_user, db)
    permission_checker.check_permission(Permission.VIEW_OWN_ANALYTICS)
    
    # Set default date range if not provided
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Check authorization
    if current_user.role == "barber":
        barber_id = current_user.id
    elif permission_checker.has_permission(Permission.VIEW_ALL_ANALYTICS):
        barber_id = None  # Show all barbers
    else:
        raise HTTPException(status_code=403, detail="Not authorized to view commission analytics")
    
    analytics_service = AnalyticsService(db)
    
    try:
        # Get commission breakdown by type
        commission_by_type = {}
        total_commissions = 0
        
        # Service commissions
        from models import Payment
        service_query = db.query(Payment).filter(
            Payment.status == "completed",
            Payment.created_at >= datetime.combine(start_date, datetime.min.time()),
            Payment.created_at <= datetime.combine(end_date, datetime.max.time())
        )
        if barber_id:
            service_query = service_query.filter(Payment.barber_id == barber_id)
        
        service_payments = service_query.all()
        service_commission = sum(p.barber_amount or 0 for p in service_payments)
        service_count = len(service_payments)
        
        commission_by_type["service"] = {
            "amount": float(service_commission),
            "count": service_count,
            "average": float(service_commission / service_count) if service_count > 0 else 0
        }
        total_commissions += service_commission
        
        # Retail commissions (if available)
        retail_commission = 0
        retail_count = 0
        try:
            from services.commission_service import CommissionService
            commission_service = CommissionService(db)
            
            if barber_id:
                retail_data = commission_service.get_barber_retail_commissions(
                    barber_id, 
                    start_date=datetime.combine(start_date, datetime.min.time()),
                    end_date=datetime.combine(end_date, datetime.max.time())
                )
                retail_commission = float(retail_data["total_retail_commission"])
                retail_count = retail_data["order_items_count"] + retail_data["pos_transactions_count"]
            else:
                # For all barbers, aggregate retail commissions
                from models.product import OrderItem, POSTransaction
                order_items = db.query(OrderItem).join(OrderItem.order).filter(
                    OrderItem.order.has(financial_status="paid"),
                    OrderItem.order.has(processed_at >= datetime.combine(start_date, datetime.min.time())),
                    OrderItem.order.has(processed_at <= datetime.combine(end_date, datetime.max.time()))
                ).all()
                
                pos_transactions = db.query(POSTransaction).filter(
                    POSTransaction.transacted_at >= datetime.combine(start_date, datetime.min.time()),
                    POSTransaction.transacted_at <= datetime.combine(end_date, datetime.max.time())
                ).all()
                
                retail_commission = sum(item.commission_amount for item in order_items) + sum(trans.commission_amount for trans in pos_transactions)
                retail_count = len(order_items) + len(pos_transactions)
                
        except ImportError:
            pass  # Commission service not available
        
        commission_by_type["retail"] = {
            "amount": float(retail_commission),
            "count": retail_count,
            "average": float(retail_commission / retail_count) if retail_count > 0 else 0
        }
        total_commissions += retail_commission
        
        # Commission trends over time
        trends = []
        current = start_date
        while current <= end_date:
            period_end = min(current + timedelta(days=6), end_date)  # Weekly periods
            
            # Get service commissions for period
            period_service = db.query(Payment).filter(
                Payment.status == "completed",
                Payment.created_at >= datetime.combine(current, datetime.min.time()),
                Payment.created_at <= datetime.combine(period_end, datetime.max.time())
            )
            if barber_id:
                period_service = period_service.filter(Payment.barber_id == barber_id)
            
            period_service_amount = sum(p.barber_amount or 0 for p in period_service.all())
            
            trends.append({
                "period_start": current.isoformat(),
                "period_end": period_end.isoformat(),
                "service_commission": float(period_service_amount),
                "retail_commission": 0,  # Would need period calculation for retail
                "total": float(period_service_amount)
            })
            
            current = period_end + timedelta(days=1)
        
        # Calculate growth metrics
        if len(trends) >= 2:
            first_period = trends[0]["total"]
            last_period = trends[-1]["total"]
            growth_amount = last_period - first_period
            growth_rate = (growth_amount / first_period * 100) if first_period > 0 else 0
        else:
            growth_amount = 0
            growth_rate = 0
        
        # Get top services by commission
        top_services = []
        if barber_id:
            from models import Appointment
            service_stats = db.query(
                Appointment.service_name,
                db.func.count(Payment.id).label('count'),
                db.func.sum(Payment.barber_amount).label('total_commission')
            ).join(
                Payment, Payment.appointment_id == Appointment.id
            ).filter(
                Payment.barber_id == barber_id,
                Payment.status == "completed",
                Payment.created_at >= datetime.combine(start_date, datetime.min.time()),
                Payment.created_at <= datetime.combine(end_date, datetime.max.time())
            ).group_by(Appointment.service_name).order_by(db.desc('total_commission')).limit(5).all()
            
            for service in service_stats:
                top_services.append({
                    "service_name": service.service_name,
                    "count": service.count,
                    "total_commission": float(service.total_commission or 0),
                    "average_commission": float(service.total_commission / service.count) if service.count > 0 else 0
                })
        
        return {
            "summary": {
                "total_commissions": float(total_commissions),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "barber_id": barber_id
            },
            "commission_by_type": commission_by_type,
            "trends": trends,
            "growth": {
                "amount": float(growth_amount),
                "rate": float(growth_rate)
            },
            "top_services": top_services,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating commission analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating commission analytics")

@router.get("/commissions/trends")
@safe_endpoint
async def get_commission_trends(
    period: str = Query("week", description="Period grouping: day, week, month"),
    start_date: Optional[date] = Query(None, description="Start date for trends"),
    end_date: Optional[date] = Query(None, description="End date for trends"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get commission trends over time with configurable period grouping"""
    # Check permissions inline
    permission_checker = PermissionChecker(current_user, db)
    permission_checker.check_permission(Permission.VIEW_OWN_ANALYTICS)
    
    # Set default date range
    if not end_date:
        end_date = date.today()
    if not start_date:
        if period == "day":
            start_date = end_date - timedelta(days=30)
        elif period == "week":
            start_date = end_date - timedelta(days=90)
        else:  # month
            start_date = end_date - timedelta(days=365)
    
    # Check authorization
    if current_user.role == "barber":
        barber_id = current_user.id
    elif permission_checker.has_permission(Permission.VIEW_ALL_ANALYTICS):
        barber_id = None
    else:
        raise HTTPException(status_code=403, detail="Not authorized to view commission trends")
    
    try:
        trends = []
        
        # Generate period ranges
        current = start_date
        while current <= end_date:
            if period == "day":
                period_end = current
            elif period == "week":
                period_end = min(current + timedelta(days=6), end_date)
            else:  # month
                # Get last day of month
                if current.month == 12:
                    period_end = date(current.year + 1, 1, 1) - timedelta(days=1)
                else:
                    period_end = date(current.year, current.month + 1, 1) - timedelta(days=1)
                period_end = min(period_end, end_date)
            
            # Get commissions for period
            from models import Payment
            period_query = db.query(Payment).filter(
                Payment.status == "completed",
                Payment.created_at >= datetime.combine(current, datetime.min.time()),
                Payment.created_at <= datetime.combine(period_end, datetime.max.time())
            )
            if barber_id:
                period_query = period_query.filter(Payment.barber_id == barber_id)
            
            payments = period_query.all()
            
            trends.append({
                "period_start": current.isoformat(),
                "period_end": period_end.isoformat(),
                "service_commission": float(sum(p.barber_amount or 0 for p in payments)),
                "payment_count": len(payments),
                "average_commission": float(sum(p.barber_amount or 0 for p in payments) / len(payments)) if len(payments) > 0 else 0
            })
            
            # Move to next period
            if period == "day":
                current = current + timedelta(days=1)
            elif period == "week":
                current = period_end + timedelta(days=1)
            else:  # month
                current = period_end + timedelta(days=1)
        
        return {
            "period_type": period,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "trends": trends,
            "barber_id": barber_id,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating commission trends: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating commission trends")

# =============================================================================
# UPSELLING ANALYTICS ENDPOINTS
# =============================================================================

@router.get("/upselling/overview")
async def get_upselling_overview(
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get comprehensive upselling overview metrics"""
    
    # Permission check
    checker = PermissionChecker(current_user, db)
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # If specific barber requested, check permissions
    if barber_id and barber_id != current_user.id:
        if barber_id not in org_user_ids and not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Set default date range if not provided
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    
    try:
        from models.upselling import UpsellAttempt, UpsellConversion, UpsellStatus
        from sqlalchemy import func, and_
        
        # Base query filters
        base_filters = [
            UpsellAttempt.created_at >= datetime.combine(start_date, datetime.min.time()),
            UpsellAttempt.created_at <= datetime.combine(end_date, datetime.max.time())
        ]
        
        if barber_id:
            base_filters.append(UpsellAttempt.barber_id == barber_id)
        else:
            # Filter to organization users
            base_filters.append(UpsellAttempt.barber_id.in_(org_user_ids))
        
        # Total attempts
        total_attempts = db.query(UpsellAttempt).filter(and_(*base_filters)).count()
        
        # Implemented attempts (status = IMPLEMENTED or CONVERTED)
        implemented_attempts = db.query(UpsellAttempt).filter(
            and_(*base_filters),
            UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED])
        ).count()
        
        # Successful conversions
        conversion_query = db.query(UpsellConversion).join(UpsellAttempt).filter(and_(*base_filters))
        total_conversions = conversion_query.count()
        
        # Revenue metrics
        potential_revenue = db.query(func.sum(UpsellAttempt.potential_revenue)).filter(
            and_(*base_filters),
            UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED])
        ).scalar() or 0
        
        actual_revenue = db.query(func.sum(UpsellConversion.actual_revenue)).join(UpsellAttempt).filter(
            and_(*base_filters)
        ).scalar() or 0
        
        # Success rates
        implementation_rate = (implemented_attempts / total_attempts * 100) if total_attempts > 0 else 0
        conversion_rate = (total_conversions / implemented_attempts * 100) if implemented_attempts > 0 else 0
        overall_success_rate = (total_conversions / total_attempts * 100) if total_attempts > 0 else 0
        
        # Average metrics
        avg_potential_revenue = potential_revenue / implemented_attempts if implemented_attempts > 0 else 0
        avg_actual_revenue = actual_revenue / total_conversions if total_conversions > 0 else 0
        
        # Time to conversion analysis
        time_to_conversion_data = db.query(UpsellConversion.time_to_conversion_hours).join(UpsellAttempt).filter(
            and_(*base_filters),
            UpsellConversion.time_to_conversion_hours.isnot(None)
        ).all()
        
        avg_time_to_conversion = sum(t[0] for t in time_to_conversion_data) / len(time_to_conversion_data) if time_to_conversion_data else 0
        
        # Top performing services
        top_services = db.query(
            UpsellAttempt.suggested_service,
            func.count(UpsellConversion.id).label('conversions'),
            func.sum(UpsellConversion.actual_revenue).label('revenue')
        ).join(UpsellConversion, isouter=True).filter(
            and_(*base_filters)
        ).group_by(UpsellAttempt.suggested_service).order_by(
            func.count(UpsellConversion.id).desc()
        ).limit(5).all()
        
        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_attempts": total_attempts,
                "implemented_attempts": implemented_attempts,
                "total_conversions": total_conversions,
                "implementation_rate": round(implementation_rate, 1),
                "conversion_rate": round(conversion_rate, 1),
                "overall_success_rate": round(overall_success_rate, 1)
            },
            "revenue": {
                "potential_revenue": float(potential_revenue),
                "actual_revenue": float(actual_revenue),
                "revenue_realization_rate": (actual_revenue / potential_revenue * 100) if potential_revenue > 0 else 0,
                "avg_potential_revenue": float(avg_potential_revenue),
                "avg_actual_revenue": float(avg_actual_revenue)
            },
            "performance": {
                "avg_time_to_conversion_hours": round(avg_time_to_conversion, 1),
                "top_services": [
                    {
                        "service": service,
                        "conversions": conversions or 0,
                        "revenue": float(revenue or 0)
                    }
                    for service, conversions, revenue in top_services
                ]
            },
            "barber_id": barber_id,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating upselling overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating upselling overview")

@router.get("/upselling/performance")
async def get_upselling_performance(
    start_date: Optional[date] = Query(None, description="Start date for analytics range"),
    end_date: Optional[date] = Query(None, description="End date for analytics range"),
    group_by: str = Query("barber", description="Group performance by: barber, service, channel"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get upselling performance metrics grouped by different dimensions"""
    
    # Permission check
    checker = PermissionChecker(current_user, db)
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # Set default date range
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    
    try:
        from models.upselling import UpsellAttempt, UpsellConversion, UpsellStatus
        from sqlalchemy import func, and_
        
        # Use the conversion detector for statistics
        conversion_detector = UpsellConversionDetector()
        statistics = conversion_detector.get_conversion_statistics(
            db, 
            days=(end_date - start_date).days,
            barber_id=None if group_by != "barber" else None
        )
        
        # Base filters
        base_filters = [
            UpsellAttempt.created_at >= datetime.combine(start_date, datetime.min.time()),
            UpsellAttempt.created_at <= datetime.combine(end_date, datetime.max.time()),
            UpsellAttempt.barber_id.in_(org_user_ids)
        ]
        
        if group_by == "barber":
            # Performance by barber
            results = db.query(
                User.name.label('group_name'),
                UpsellAttempt.barber_id.label('group_id'),
                func.count(UpsellAttempt.id).label('total_attempts'),
                func.count(
                    func.case(
                        [(UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED]), 1)]
                    )
                ).label('implemented_attempts'),
                func.count(UpsellConversion.id).label('conversions'),
                func.sum(UpsellAttempt.potential_revenue).label('potential_revenue'),
                func.sum(UpsellConversion.actual_revenue).label('actual_revenue')
            ).join(User, UpsellAttempt.barber_id == User.id).outerjoin(UpsellConversion).filter(
                and_(*base_filters)
            ).group_by(User.name, UpsellAttempt.barber_id).all()
            
        elif group_by == "service":
            # Performance by suggested service
            results = db.query(
                UpsellAttempt.suggested_service.label('group_name'),
                UpsellAttempt.suggested_service.label('group_id'),
                func.count(UpsellAttempt.id).label('total_attempts'),
                func.count(
                    func.case(
                        [(UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED]), 1)]
                    )
                ).label('implemented_attempts'),
                func.count(UpsellConversion.id).label('conversions'),
                func.sum(UpsellAttempt.potential_revenue).label('potential_revenue'),
                func.sum(UpsellConversion.actual_revenue).label('actual_revenue')
            ).outerjoin(UpsellConversion).filter(
                and_(*base_filters)
            ).group_by(UpsellAttempt.suggested_service).all()
            
        elif group_by == "channel":
            # Performance by channel
            results = db.query(
                UpsellAttempt.channel.label('group_name'),
                UpsellAttempt.channel.label('group_id'),
                func.count(UpsellAttempt.id).label('total_attempts'),
                func.count(
                    func.case(
                        [(UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED]), 1)]
                    )
                ).label('implemented_attempts'),
                func.count(UpsellConversion.id).label('conversions'),
                func.sum(UpsellAttempt.potential_revenue).label('potential_revenue'),
                func.sum(UpsellConversion.actual_revenue).label('actual_revenue')
            ).outerjoin(UpsellConversion).filter(
                and_(*base_filters)
            ).group_by(UpsellAttempt.channel).all()
        else:
            raise HTTPException(status_code=400, detail="Invalid group_by parameter. Use: barber, service, or channel")
        
        # Format performance data
        performance_data = []
        for result in results:
            group_name = result.group_name
            if group_by == "channel" and hasattr(result.group_name, 'value'):
                group_name = result.group_name.value
                
            total_attempts = result.total_attempts or 0
            implemented_attempts = result.implemented_attempts or 0
            conversions = result.conversions or 0
            potential_revenue = float(result.potential_revenue or 0)
            actual_revenue = float(result.actual_revenue or 0)
            
            # Calculate rates
            implementation_rate = (implemented_attempts / total_attempts * 100) if total_attempts > 0 else 0
            conversion_rate = (conversions / implemented_attempts * 100) if implemented_attempts > 0 else 0
            overall_success_rate = (conversions / total_attempts * 100) if total_attempts > 0 else 0
            revenue_realization = (actual_revenue / potential_revenue * 100) if potential_revenue > 0 else 0
            
            performance_data.append({
                "group_name": group_name,
                "group_id": str(result.group_id),
                "metrics": {
                    "total_attempts": total_attempts,
                    "implemented_attempts": implemented_attempts,
                    "conversions": conversions,
                    "implementation_rate": round(implementation_rate, 1),
                    "conversion_rate": round(conversion_rate, 1),
                    "overall_success_rate": round(overall_success_rate, 1)
                },
                "revenue": {
                    "potential_revenue": potential_revenue,
                    "actual_revenue": actual_revenue,
                    "revenue_realization_rate": round(revenue_realization, 1),
                    "avg_potential": potential_revenue / implemented_attempts if implemented_attempts > 0 else 0,
                    "avg_actual": actual_revenue / conversions if conversions > 0 else 0
                }
            })
        
        # Sort by overall success rate
        performance_data.sort(key=lambda x: x["metrics"]["overall_success_rate"], reverse=True)
        
        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "group_by": group_by,
            "performance_data": performance_data,
            "overall_statistics": statistics,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting upselling performance: {str(e)}")
        raise HTTPException(status_code=500, detail="Error getting upselling performance")

@router.get("/upselling/trends")
async def get_upselling_trends(
    period: str = Query("week", description="Period grouping: day, week, month"),
    start_date: Optional[date] = Query(None, description="Start date for trends"),
    end_date: Optional[date] = Query(None, description="End date for trends"),
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get upselling performance trends over time"""
    
    # Permission check
    checker = PermissionChecker(current_user, db)
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # Check barber access permissions
    if barber_id and barber_id != current_user.id:
        if barber_id not in org_user_ids and not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Set default date range
    if not end_date:
        end_date = date.today()
    if not start_date:
        if period == "day":
            start_date = end_date - timedelta(days=30)
        elif period == "week":
            start_date = end_date - timedelta(days=90)
        else:  # month
            start_date = end_date - timedelta(days=365)
    
    try:
        from models.upselling import UpsellAttempt, UpsellConversion, UpsellStatus
        from sqlalchemy import func, and_
        
        trends = []
        current = start_date
        
        while current <= end_date:
            # Calculate period end
            if period == "day":
                period_end = current
            elif period == "week":
                period_end = min(current + timedelta(days=6), end_date)
            else:  # month
                if current.month == 12:
                    period_end = date(current.year + 1, 1, 1) - timedelta(days=1)
                else:
                    period_end = date(current.year, current.month + 1, 1) - timedelta(days=1)
                period_end = min(period_end, end_date)
            
            # Base filters for period
            period_filters = [
                UpsellAttempt.created_at >= datetime.combine(current, datetime.min.time()),
                UpsellAttempt.created_at <= datetime.combine(period_end, datetime.max.time())
            ]
            
            if barber_id:
                period_filters.append(UpsellAttempt.barber_id == barber_id)
            else:
                period_filters.append(UpsellAttempt.barber_id.in_(org_user_ids))
            
            # Get period statistics
            total_attempts = db.query(UpsellAttempt).filter(and_(*period_filters)).count()
            
            implemented_attempts = db.query(UpsellAttempt).filter(
                and_(*period_filters),
                UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED])
            ).count()
            
            conversions = db.query(UpsellConversion).join(UpsellAttempt).filter(
                and_(*period_filters)
            ).count()
            
            potential_revenue = db.query(func.sum(UpsellAttempt.potential_revenue)).filter(
                and_(*period_filters),
                UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED])
            ).scalar() or 0
            
            actual_revenue = db.query(func.sum(UpsellConversion.actual_revenue)).join(UpsellAttempt).filter(
                and_(*period_filters)
            ).scalar() or 0
            
            # Calculate rates
            implementation_rate = (implemented_attempts / total_attempts * 100) if total_attempts > 0 else 0
            conversion_rate = (conversions / implemented_attempts * 100) if implemented_attempts > 0 else 0
            overall_success_rate = (conversions / total_attempts * 100) if total_attempts > 0 else 0
            
            trends.append({
                "period_start": current.isoformat(),
                "period_end": period_end.isoformat(),
                "metrics": {
                    "total_attempts": total_attempts,
                    "implemented_attempts": implemented_attempts,
                    "conversions": conversions,
                    "implementation_rate": round(implementation_rate, 1),
                    "conversion_rate": round(conversion_rate, 1),
                    "overall_success_rate": round(overall_success_rate, 1)
                },
                "revenue": {
                    "potential_revenue": float(potential_revenue),
                    "actual_revenue": float(actual_revenue),
                    "avg_potential": float(potential_revenue / implemented_attempts) if implemented_attempts > 0 else 0,
                    "avg_actual": float(actual_revenue / conversions) if conversions > 0 else 0
                }
            })
            
            # Move to next period
            if period == "day":
                current = current + timedelta(days=1)
            elif period == "week":
                current = period_end + timedelta(days=1)
            else:  # month
                current = period_end + timedelta(days=1)
        
        # Calculate growth metrics
        growth_metrics = {}
        if len(trends) >= 2:
            latest = trends[-1]["metrics"]
            previous = trends[-2]["metrics"]
            
            growth_metrics = {
                "attempts_growth": calculate_growth(previous["total_attempts"], latest["total_attempts"]),
                "conversions_growth": calculate_growth(previous["conversions"], latest["conversions"]),
                "success_rate_growth": calculate_growth(previous["overall_success_rate"], latest["overall_success_rate"]),
                "revenue_growth": calculate_growth(trends[-2]["revenue"]["actual_revenue"], trends[-1]["revenue"]["actual_revenue"])
            }
        
        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "period_type": period,
            "trends": trends,
            "growth_metrics": growth_metrics,
            "barber_id": barber_id,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating upselling trends: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating upselling trends")

@router.get("/upselling/insights")
async def get_upselling_insights(
    start_date: Optional[date] = Query(None, description="Start date for insights"),
    end_date: Optional[date] = Query(None, description="End date for insights"),
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get AI-powered upselling insights and recommendations"""
    
    # Permission check
    checker = PermissionChecker(current_user, db)
    org_user_ids = get_organization_user_ids(current_user, db)
    
    # Check barber access permissions
    if barber_id and barber_id != current_user.id:
        if barber_id not in org_user_ids and not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Set default date range
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    try:
        from models.upselling import UpsellAttempt, UpsellConversion, UpsellStatus
        from sqlalchemy import func, and_
        
        # Base filters
        base_filters = [
            UpsellAttempt.created_at >= datetime.combine(start_date, datetime.min.time()),
            UpsellAttempt.created_at <= datetime.combine(end_date, datetime.max.time())
        ]
        
        if barber_id:
            base_filters.append(UpsellAttempt.barber_id == barber_id)
        else:
            base_filters.append(UpsellAttempt.barber_id.in_(org_user_ids))
        
        # Get overall metrics
        total_attempts = db.query(UpsellAttempt).filter(and_(*base_filters)).count()
        implemented_attempts = db.query(UpsellAttempt).filter(
            and_(*base_filters),
            UpsellAttempt.status.in_([UpsellStatus.IMPLEMENTED, UpsellStatus.CONVERTED])
        ).count()
        conversions = db.query(UpsellConversion).join(UpsellAttempt).filter(and_(*base_filters)).count()
        
        # Calculate success rates
        implementation_rate = (implemented_attempts / total_attempts * 100) if total_attempts > 0 else 0
        conversion_rate = (conversions / implemented_attempts * 100) if implemented_attempts > 0 else 0
        overall_success_rate = (conversions / total_attempts * 100) if total_attempts > 0 else 0
        
        # Generate insights based on performance
        insights = []
        recommendations = []
        
        # Implementation rate insights
        if implementation_rate < 50:
            insights.append({
                "type": "warning",
                "category": "Implementation",
                "title": "Low Implementation Rate",
                "message": f"Only {implementation_rate:.1f}% of upselling opportunities are being acted upon.",
                "impact": "Missing significant revenue opportunities"
            })
            recommendations.append({
                "priority": "high",
                "category": "Process Improvement",
                "title": "Improve Upselling Implementation",
                "description": "Focus on training staff to better identify and act on upselling opportunities",
                "expected_impact": "20-30% increase in revenue",
                "action_steps": [
                    "Review upselling training materials",
                    "Set implementation targets for staff",
                    "Create upselling reminder systems"
                ]
            })
        elif implementation_rate > 80:
            insights.append({
                "type": "success",
                "category": "Implementation",
                "title": "Excellent Implementation Rate",
                "message": f"Strong performance with {implementation_rate:.1f}% implementation rate.",
                "impact": "Maximizing opportunity capture"
            })
        
        # Conversion rate insights
        if conversion_rate < 30:
            insights.append({
                "type": "warning",
                "category": "Conversion",
                "title": "Low Conversion Rate",
                "message": f"Only {conversion_rate:.1f}% of upselling attempts result in conversions.",
                "impact": "Poor client acceptance of upselling offers"
            })
            recommendations.append({
                "priority": "high",
                "category": "Sales Technique",
                "title": "Improve Upselling Approach",
                "description": "Refine upselling techniques to better match client needs and preferences",
                "expected_impact": "15-25% improvement in conversion rate",
                "action_steps": [
                    "Analyze successful upselling patterns",
                    "Personalize upselling offers",
                    "Improve timing of upselling attempts"
                ]
            })
        elif conversion_rate > 60:
            insights.append({
                "type": "success",
                "category": "Conversion",
                "title": "High Conversion Rate",
                "message": f"Excellent conversion performance at {conversion_rate:.1f}%.",
                "impact": "Strong client acceptance of offers"
            })
        
        # Channel performance analysis
        channel_performance = db.query(
            UpsellAttempt.channel,
            func.count(UpsellAttempt.id).label('attempts'),
            func.count(UpsellConversion.id).label('conversions')
        ).outerjoin(UpsellConversion).filter(
            and_(*base_filters)
        ).group_by(UpsellAttempt.channel).all()
        
        best_channel = None
        worst_channel = None
        best_rate = 0
        worst_rate = 100
        
        for channel, attempts, conversions in channel_performance:
            if attempts > 0:
                rate = (conversions / attempts * 100)
                if rate > best_rate:
                    best_rate = rate
                    best_channel = channel.value if channel else 'unknown'
                if rate < worst_rate:
                    worst_rate = rate
                    worst_channel = channel.value if channel else 'unknown'
        
        if best_channel and worst_channel and best_channel != worst_channel:
            insights.append({
                "type": "info",
                "category": "Channel Performance",
                "title": "Channel Performance Variation",
                "message": f"{best_channel} performs best ({best_rate:.1f}% conversion) vs {worst_channel} ({worst_rate:.1f}%)",
                "impact": "Opportunity to optimize channel strategy"
            })
            
            recommendations.append({
                "priority": "medium",
                "category": "Channel Optimization",
                "title": "Focus on High-Performing Channels",
                "description": f"Increase focus on {best_channel} channel while improving {worst_channel} approach",
                "expected_impact": "10-15% overall improvement",
                "action_steps": [
                    f"Analyze what makes {best_channel} successful",
                    f"Apply best practices to {worst_channel}",
                    "Consider reallocating resources to better channels"
                ]
            })
        
        # Revenue opportunity analysis
        potential_revenue = db.query(func.sum(UpsellAttempt.potential_revenue)).filter(
            and_(*base_filters),
            UpsellAttempt.status == UpsellStatus.PENDING
        ).scalar() or 0
        
        if potential_revenue > 0:
            insights.append({
                "type": "opportunity",
                "category": "Revenue",
                "title": "Untapped Revenue Potential",
                "message": f"${potential_revenue:.0f} in pending upselling opportunities",
                "impact": "Immediate revenue opportunity available"
            })
            
            recommendations.append({
                "priority": "high",
                "category": "Revenue Recovery",
                "title": "Follow Up on Pending Opportunities",
                "description": "Implement systematic follow-up on pending upselling attempts",
                "expected_impact": f"Up to ${potential_revenue * 0.3:.0f} additional revenue",
                "action_steps": [
                    "Review all pending upselling attempts",
                    "Create follow-up schedule",
                    "Personalize follow-up approaches"
                ]
            })
        
        # Success score calculation
        success_score = (implementation_rate * 0.3 + conversion_rate * 0.4 + overall_success_rate * 0.3)
        
        if success_score >= 70:
            grade = "A"
            performance_level = "Excellent"
        elif success_score >= 60:
            grade = "B"
            performance_level = "Good"
        elif success_score >= 50:
            grade = "C"
            performance_level = "Average"
        elif success_score >= 40:
            grade = "D"
            performance_level = "Below Average"
        else:
            grade = "F"
            performance_level = "Poor"
        
        return {
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "performance_summary": {
                "success_score": round(success_score, 1),
                "grade": grade,
                "performance_level": performance_level,
                "implementation_rate": round(implementation_rate, 1),
                "conversion_rate": round(conversion_rate, 1),
                "overall_success_rate": round(overall_success_rate, 1)
            },
            "insights": insights,
            "recommendations": recommendations,
            "barber_id": barber_id,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating upselling insights: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating upselling insights")

def calculate_growth(previous_value: float, current_value: float) -> Dict[str, float]:
    """Calculate growth metrics between two values"""
    if previous_value == 0:
        if current_value > 0:
            return {"percentage": 100.0, "absolute": current_value}
        else:
            return {"percentage": 0.0, "absolute": 0.0}
    
    absolute_change = current_value - previous_value
    percentage_change = (absolute_change / previous_value) * 100
    
    return {
        "percentage": round(percentage_change, 2),
        "absolute": round(absolute_change, 2)
    }