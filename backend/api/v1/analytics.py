"""
Analytics API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import json
import csv
import io
from collections import defaultdict

from config.database import get_db
from models.user import User
from models.barber import Barber
from models.appointment import Appointment
from models.client import Client
from models.location import Location
from services.sixfb_calculator import SixFBCalculator
from services.team_analytics import TeamAnalyticsService
from services.rbac_service import RBACService, Permission
from .auth import get_current_user
from pydantic import BaseModel
from utils.cache import cache_result, CacheKeys, invalidate_pattern
from schemas.analytics import validate_date_range, validate_location_id

router = APIRouter()

# Pydantic models
class SixFBScoreResponse(BaseModel):
    barber_id: int
    barber_name: str
    period: str
    start_date: date
    end_date: date
    overall_score: float
    components: Dict[str, float]
    improvements_needed: List[str]

class BarberAnalyticsResponse(BaseModel):
    barber_info: Dict[str, Any]
    period: Dict[str, Any]
    performance_scores: Dict[str, Any]
    revenue_analysis: Dict[str, Any]
    client_analysis: Dict[str, Any]
    efficiency_metrics: Dict[str, Any]
    comparative_rankings: Dict[str, Any]
    improvement_recommendations: List[Dict[str, Any]]

class TeamComparisonResponse(BaseModel):
    summary: Dict[str, Any]
    location_comparisons: List[Dict[str, Any]]
    top_performing_teams: List[Dict[str, Any]]
    improvement_opportunities: List[Dict[str, Any]]
    network_benchmarks: Dict[str, Any]

class NetworkInsightsResponse(BaseModel):
    network_overview: Dict[str, Any]
    performance_distribution: Dict[str, Any]
    benchmarks: Dict[str, Any]
    trends: Dict[str, Any]
    improvement_opportunities: List[Dict[str, Any]]

# API Endpoints
@router.get("/sixfb-score/{barber_id}", response_model=SixFBScoreResponse)
async def get_barber_sixfb_score(
    barber_id: int,
    period: str = Query("weekly", regex="^(weekly|monthly|quarterly|yearly)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get 6FB score for a barber"""
    rbac = RBACService(db)
    
    # Get barber
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barber not found"
        )
    
    # Check permissions
    if barber.user_id != current_user.id:  # Not viewing own score
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            if not rbac.has_permission(current_user, Permission.VIEW_LOCATION_ANALYTICS, barber.location_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this barber's analytics"
                )
    
    # Calculate score
    calculator = SixFBCalculator(db)
    score_data = calculator.calculate_sixfb_score(barber_id, period, start_date, end_date)
    
    # Determine improvements needed
    improvements = []
    components = score_data.get("components", {})
    for component, score in components.items():
        if score < 70:
            improvements.append(f"Improve {component.replace('_', ' ').title()} (current: {score})")
    
    return SixFBScoreResponse(
        barber_id=barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        period=period,
        start_date=score_data.get("start_date", date.today() - timedelta(days=7)),
        end_date=score_data.get("end_date", date.today()),
        overall_score=score_data.get("overall_score", 0),
        components=components,
        improvements_needed=improvements
    )

@router.get("/barber/{barber_id}/detailed", response_model=BarberAnalyticsResponse)
async def get_barber_detailed_analytics(
    barber_id: int,
    period_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a barber"""
    rbac = RBACService(db)
    
    # Get barber
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barber not found"
        )
    
    # Check permissions
    if barber.user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            if not rbac.has_permission(current_user, Permission.VIEW_LOCATION_ANALYTICS, barber.location_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this barber's analytics"
                )
    
    # Get detailed analytics
    service = TeamAnalyticsService(db)
    analytics = await service.get_barber_detailed_analytics(barber_id, period_days)
    
    return BarberAnalyticsResponse(**analytics)

@router.get("/team-comparison", response_model=TeamComparisonResponse)
async def get_team_comparison(
    location_ids: Optional[List[int]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get team comparison analytics across locations"""
    rbac = RBACService(db)
    
    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        # Filter to only accessible locations
        accessible_locations = rbac.get_accessible_locations(current_user)
        if location_ids:
            location_ids = [lid for lid in location_ids if lid in accessible_locations]
        else:
            location_ids = accessible_locations
        
        if not location_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No accessible locations for analytics"
            )
    
    # Get team comparison
    service = TeamAnalyticsService(db)
    comparison = await service.get_team_comparison_analytics(location_ids)
    
    return TeamComparisonResponse(**comparison)

@router.get("/network-insights", response_model=NetworkInsightsResponse)
async def get_network_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get network-wide performance insights"""
    rbac = RBACService(db)
    
    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view network analytics"
        )
    
    # Get network insights
    service = TeamAnalyticsService(db)
    insights = await service.get_network_performance_insights()
    
    return NetworkInsightsResponse(**insights)

@router.get("/dashboard-summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get summary data for main dashboard"""
    rbac = RBACService(db)
    
    # Determine what data user can see
    if rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        # Admin/Super Admin - show network summary
        from services.location_management import LocationManagementService
        location_service = LocationManagementService(db)
        
        # Get all locations
        locations = db.query(Location).filter(Location.is_active == True).all()
        total_barbers = db.query(Barber).count()
        
        # Calculate network metrics
        total_revenue = 0
        total_appointments = 0
        
        for location in locations:
            analytics = await location_service.get_location_analytics(
                location.id, 
                date.today() - timedelta(days=30),
                date.today()
            )
            total_revenue += analytics.get("total_revenue", 0)
            total_appointments += analytics.get("total_appointments", 0)
        
        return {
            "type": "network",
            "metrics": {
                "total_locations": len(locations),
                "total_barbers": total_barbers,
                "total_revenue": total_revenue,
                "total_appointments": total_appointments,
                "avg_revenue_per_location": total_revenue / len(locations) if locations else 0
            }
        }
    
    elif current_user.role == "barber":
        # Barber - show personal metrics
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            return {"type": "barber", "metrics": {}}
        
        calculator = SixFBCalculator(db)
        score = calculator.calculate_sixfb_score(barber.id, "monthly")
        
        return {
            "type": "barber",
            "metrics": {
                "sixfb_score": score.get("overall_score", 0),
                "appointments_this_week": 0,  # Calculate from appointments
                "revenue_this_month": 0,  # Calculate from appointments
                "client_retention": score.get("components", {}).get("customer_retention", 0)
            }
        }
    
    else:
        # Mentor/Staff - show location metrics
        accessible_locations = rbac.get_accessible_locations(current_user)
        if not accessible_locations:
            return {"type": "location", "metrics": {}}
        
        # Get first accessible location
        location_id = accessible_locations[0]
        from services.location_management import LocationManagementService
        location_service = LocationManagementService(db)
        
        analytics = await location_service.get_location_analytics(
            location_id,
            date.today() - timedelta(days=30),
            date.today()
        )
        
        return {
            "type": "location",
            "location_id": location_id,
            "metrics": {
                "total_revenue": analytics.get("total_revenue", 0),
                "total_appointments": analytics.get("total_appointments", 0),
                "avg_6fb_score": analytics.get("avg_6fb_score", 0),
                "barber_count": analytics.get("barber_count", 0)
            }
        }

@router.get("/trends/{metric}")
async def get_metric_trends(
    metric: str,
    period_days: int = Query(90, ge=7, le=365),
    location_id: Optional[int] = None,
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trend data for specific metrics"""
    valid_metrics = ["revenue", "appointments", "sixfb_score", "retention", "efficiency"]
    if metric not in valid_metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metric. Must be one of: {', '.join(valid_metrics)}"
        )
    
    rbac = RBACService(db)
    
    # Check permissions based on scope
    if barber_id:
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")
        
        if barber.user_id != current_user.id:
            if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
                if not rbac.has_permission(current_user, Permission.VIEW_LOCATION_ANALYTICS, barber.location_id):
                    raise HTTPException(status_code=403, detail="No permission")
    
    elif location_id:
        if not rbac.has_permission(current_user, Permission.VIEW_LOCATION_ANALYTICS, location_id):
            raise HTTPException(status_code=403, detail="No permission")
    
    else:
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            raise HTTPException(status_code=403, detail="No permission")
    
    # Calculate trends (simplified)
    end_date = date.today()
    start_date = end_date - timedelta(days=period_days)
    
    # Generate mock trend data
    trend_data = []
    current_date = start_date
    while current_date <= end_date:
        trend_data.append({
            "date": current_date.isoformat(),
            "value": 80 + (current_date.toordinal() % 20)  # Mock fluctuation
        })
        current_date += timedelta(days=7)  # Weekly data points
    
    return {
        "metric": metric,
        "period_days": period_days,
        "location_id": location_id,
        "barber_id": barber_id,
        "data": trend_data
    }

# New analytics endpoints for the advanced dashboard
@router.get("/revenue")
@cache_result(ttl_seconds=300, key_prefix="analytics")
def get_revenue_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get revenue analytics data"""
    # Validate inputs
    validate_date_range(start_date, end_date)
    location_id = validate_location_id(location_id)
    # Build query
    query = db.query(
        func.date(Appointment.appointment_time).label('date'),
        func.sum(Appointment.price).label('revenue'),
        func.sum(Appointment.service_price).label('services'),
        func.sum(Appointment.product_price).label('products'),
        func.sum(Appointment.tip_amount).label('tips')
    ).filter(
        and_(
            Appointment.status == 'completed',
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    )
    
    if location_id:
        query = query.filter(Appointment.location_id == location_id)
    
    # Group by date
    results = query.group_by(func.date(Appointment.appointment_time)).all()
    
    # Fill in missing dates with zero values
    date_range = []
    current = start_date
    while current <= end_date:
        date_range.append(current)
        current += timedelta(days=1)
    
    # Create a map of existing data
    data_map = {str(r.date): r for r in results}
    
    # Build complete dataset
    return [
        {
            'date': str(d),
            'revenue': float(data_map.get(str(d), type('', (), {'revenue': 0})).revenue or 0),
            'services': float(data_map.get(str(d), type('', (), {'services': 0})).services or 0),
            'products': float(data_map.get(str(d), type('', (), {'products': 0})).products or 0),
            'tips': float(data_map.get(str(d), type('', (), {'tips': 0})).tips or 0)
        }
        for d in date_range
    ]

@router.get("/bookings")
def get_booking_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get booking analytics data"""
    # Build query
    query = db.query(
        func.date(Appointment.appointment_time).label('date'),
        func.count(Appointment.id).label('total'),
        func.sum(func.cast(Appointment.status == 'completed', int)).label('completed'),
        func.sum(func.cast(Appointment.status == 'cancelled', int)).label('cancelled'),
        func.sum(func.cast(Appointment.status == 'no_show', int)).label('no_show'),
        func.sum(func.cast(Appointment.status == 'scheduled', int)).label('pending')
    ).filter(
        and_(
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    )
    
    if location_id:
        query = query.filter(Appointment.location_id == location_id)
    
    # Group by date
    results = query.group_by(func.date(Appointment.appointment_time)).all()
    
    return [
        {
            'date': str(result.date),
            'total': result.total,
            'completed': result.completed or 0,
            'cancelled': result.cancelled or 0,
            'no_show': result.no_show or 0,
            'pending': result.pending or 0
        }
        for result in results
    ]

@router.get("/metrics")
def get_performance_metrics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get performance metrics"""
    # Calculate key metrics
    appointment_query = db.query(Appointment).filter(
        and_(
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    )
    
    if location_id:
        appointment_query = appointment_query.filter(Appointment.location_id == location_id)
    
    total_appointments = appointment_query.count()
    completed_appointments = appointment_query.filter(Appointment.status == 'completed').count()
    
    # Revenue metrics
    revenue_data = db.query(
        func.sum(Appointment.price).label('total'),
        func.avg(Appointment.price).label('average')
    ).filter(
        and_(
            Appointment.status == 'completed',
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    ).first()
    
    # Client metrics
    active_clients = db.query(func.count(func.distinct(Appointment.client_id))).filter(
        and_(
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    ).scalar()
    
    # Calculate previous period for comparison
    period_days = (end_date - start_date).days
    prev_start = start_date - timedelta(days=period_days)
    prev_end = start_date - timedelta(days=1)
    
    prev_revenue = db.query(func.sum(Appointment.price)).filter(
        and_(
            Appointment.status == 'completed',
            func.date(Appointment.appointment_time) >= prev_start,
            func.date(Appointment.appointment_time) <= prev_end
        )
    ).scalar() or 0
    
    current_revenue = revenue_data.total or 0
    revenue_growth = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    
    # Utilization rate (assuming 8 hours per day, 30 min per appointment)
    total_hours = period_days * 8 * (db.query(Barber).count() or 1)
    booked_hours = completed_appointments * 0.5  # 30 minutes per appointment
    utilization_rate = (booked_hours / total_hours * 100) if total_hours > 0 else 0
    
    return {
        'totalRevenue': float(current_revenue),
        'revenueGrowth': round(revenue_growth, 1),
        'totalBookings': total_appointments,
        'bookingGrowth': 0,  # TODO: Calculate actual growth
        'activeClients': active_clients,
        'retention': 85.2,  # TODO: Calculate actual retention
        'avgBookingValue': float(revenue_data.average or 0),
        'utilizationRate': round(utilization_rate, 1),
        'revenueTarget': 50000,  # TODO: Get from settings
        'currentRevenue': float(current_revenue),
        'bookingRate': round((completed_appointments / total_appointments * 100) if total_appointments > 0 else 0, 1),
        'satisfaction': 4.8,  # TODO: Calculate from ratings
        'insights': [
            {
                'type': 'positive',
                'message': f'Revenue increased by {round(revenue_growth, 1)}% compared to previous period'
            },
            {
                'type': 'warning',
                'message': 'Utilization rate below 70% - consider promotional campaigns'
            }
        ]
    }

@router.get("/services")
def get_service_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get service analytics data"""
    # Query appointments with service details
    query = db.query(
        Appointment.service_name,
        func.count(Appointment.id).label('bookings'),
        func.sum(Appointment.price).label('revenue'),
        func.avg(Appointment.duration).label('avg_duration')
    ).filter(
        and_(
            Appointment.status == 'completed',
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    )
    
    if location_id:
        query = query.filter(Appointment.location_id == location_id)
    
    results = query.group_by(Appointment.service_name).all()
    
    return [
        {
            'name': result.service_name or 'Unknown',
            'bookings': result.bookings,
            'revenue': float(result.revenue or 0),
            'avg_duration': int(result.avg_duration or 30)
        }
        for result in results
    ]

@router.get("/retention")
def get_retention_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client retention analytics"""
    # Monthly retention trend
    monthly_retention = []
    
    # Calculate retention for each month
    current_date = start_date
    while current_date <= end_date:
        month_start = current_date.replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        # Clients who visited this month
        current_clients = db.query(func.count(func.distinct(Appointment.client_id))).filter(
            and_(
                Appointment.status == 'completed',
                func.date(Appointment.appointment_time) >= month_start,
                func.date(Appointment.appointment_time) <= month_end
            )
        ).scalar()
        
        # Clients who also visited previous month
        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
        prev_month_end = month_start - timedelta(days=1)
        
        returning_clients = db.query(func.count(func.distinct(Appointment.client_id))).filter(
            and_(
                Appointment.status == 'completed',
                func.date(Appointment.appointment_time) >= month_start,
                func.date(Appointment.appointment_time) <= month_end,
                Appointment.client_id.in_(
                    db.query(Appointment.client_id).filter(
                        and_(
                            Appointment.status == 'completed',
                            func.date(Appointment.appointment_time) >= prev_month_start,
                            func.date(Appointment.appointment_time) <= prev_month_end
                        )
                    )
                )
            )
        ).scalar()
        
        retention_rate = (returning_clients / current_clients * 100) if current_clients > 0 else 0
        
        monthly_retention.append({
            'month': month_start.strftime('%B %Y'),
            'retention': round(retention_rate, 1),
            'target': 80  # Target retention rate
        })
        
        # Move to next month
        current_date = month_end + timedelta(days=1)
    
    # Visit frequency distribution
    visit_frequency = [
        {'frequency': 'Weekly', 'clients': 45},
        {'frequency': 'Bi-weekly', 'clients': 120},
        {'frequency': 'Monthly', 'clients': 85},
        {'frequency': 'Quarterly', 'clients': 30}
    ]
    
    # Mock cohort data
    cohort_analysis = [
        {
            'name': 'Jan 2024',
            'retention': [100, 85, 78, 72, 68, 65]
        },
        {
            'name': 'Feb 2024',
            'retention': [100, 88, 82, 75, 70, None]
        },
        {
            'name': 'Mar 2024',
            'retention': [100, 90, 85, 78, None, None]
        }
    ]
    
    return {
        'overallRetention': 85.2,
        'newClients': 45,
        'returningClients': 234,
        'lostClients': 12,
        'avgVisitsPerClient': 3.2,
        'avgLifetimeValue': 450,
        'monthlyRetention': monthly_retention,
        'visitFrequency': visit_frequency,
        'cohortAnalysis': cohort_analysis,
        'segmentAnalysis': [
            {'segment': 'VIP', 'retention': 95, 'avgSpend': 85},
            {'segment': 'Regular', 'retention': 82, 'avgSpend': 65},
            {'segment': 'Occasional', 'retention': 65, 'avgSpend': 45},
            {'segment': 'New', 'retention': 70, 'avgSpend': 55}
        ]
    }

@router.get("/peak-hours")
def get_peak_hours_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get peak hours heatmap data"""
    # Query appointments grouped by day and hour
    query = db.query(
        extract('dow', Appointment.appointment_time).label('day_of_week'),
        extract('hour', Appointment.appointment_time).label('hour'),
        func.count(Appointment.id).label('bookings')
    ).filter(
        and_(
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    )
    
    if location_id:
        query = query.filter(Appointment.location_id == location_id)
    
    results = query.group_by(
        extract('dow', Appointment.appointment_time),
        extract('hour', Appointment.appointment_time)
    ).all()
    
    # Convert to heatmap format
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    heatmap_data = []
    
    for result in results:
        heatmap_data.append({
            'day': days[int(result.day_of_week)],
            'hour': int(result.hour),
            'bookings': result.bookings
        })
    
    return heatmap_data

@router.get("/barber-comparison")
def get_barber_comparison(
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get barber performance comparison"""
    # Query barber stats
    query = db.query(
        Barber.id,
        (User.first_name + ' ' + User.last_name).label('name'),
        func.count(Appointment.id).label('bookings'),
        func.sum(Appointment.price).label('revenue'),
        func.avg(Appointment.rating).label('rating')
    ).join(
        User, Barber.user_id == User.id
    ).join(
        Appointment, Appointment.barber_id == Barber.id
    ).filter(
        and_(
            Appointment.status == 'completed',
            func.date(Appointment.appointment_time) >= start_date,
            func.date(Appointment.appointment_time) <= end_date
        )
    )
    
    if location_id:
        query = query.filter(Appointment.location_id == location_id)
    
    results = query.group_by(Barber.id, User.first_name, User.last_name).all()
    
    # Mock additional data for demo
    barber_stats = []
    for i, result in enumerate(results):
        barber_stats.append({
            'id': result[0],
            'name': result[1],
            'bookings': result[2],
            'revenue': float(result[3] or 0),
            'rating': float(result[4] or 4.5),
            'efficiency': 85 + (i * 3),  # Mock data
            'retention': 80 + (i * 2),   # Mock data
            'productivity': 75 + (i * 4),  # Mock data
            'satisfaction': 85 + (i * 2),  # Mock data
            'skills': 90 - (i * 3),       # Mock data
            'trend': 5 - i               # Mock data
        })
    
    # Add mock data if no real data
    if not barber_stats:
        barber_stats = [
            {
                'id': 1,
                'name': 'John Smith',
                'bookings': 145,
                'revenue': 8750.00,
                'rating': 4.8,
                'efficiency': 92,
                'retention': 88,
                'productivity': 85,
                'satisfaction': 90,
                'skills': 88,
                'trend': 8
            },
            {
                'id': 2,
                'name': 'Mike Johnson',
                'bookings': 132,
                'revenue': 7920.00,
                'rating': 4.7,
                'efficiency': 88,
                'retention': 85,
                'productivity': 82,
                'satisfaction': 88,
                'skills': 85,
                'trend': 5
            },
            {
                'id': 3,
                'name': 'Chris Davis',
                'bookings': 118,
                'revenue': 6845.00,
                'rating': 4.6,
                'efficiency': 85,
                'retention': 82,
                'productivity': 78,
                'satisfaction': 85,
                'skills': 82,
                'trend': -2
            }
        ]
    
    return barber_stats

@router.get("/export")
def export_analytics(
    format: str = Query(..., regex="^(csv|pdf|excel)$"),
    start_date: date = Query(...),
    end_date: date = Query(...),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export analytics data in various formats"""
    # Get all analytics data
    revenue_data = get_revenue_analytics(start_date, end_date, location_id, db, current_user)
    booking_data = get_booking_analytics(start_date, end_date, location_id, db, current_user)
    
    if format == 'csv':
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Revenue section
        writer.writerow(['Revenue Analytics'])
        writer.writerow(['Date', 'Total Revenue', 'Services', 'Products', 'Tips'])
        for row in revenue_data:
            writer.writerow([row['date'], row['revenue'], row['services'], row['products'], row['tips']])
        
        writer.writerow([])  # Empty row
        
        # Booking section
        writer.writerow(['Booking Analytics'])
        writer.writerow(['Date', 'Total', 'Completed', 'Cancelled', 'No-Show', 'Pending'])
        for row in booking_data:
            writer.writerow([row['date'], row['total'], row['completed'], row['cancelled'], row['no_show'], row['pending']])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type='text/csv',
            headers={'Content-Disposition': f'attachment; filename=analytics_{start_date}_{end_date}.csv'}
        )
    
    elif format == 'pdf':
        # TODO: Implement PDF export with charts
        raise HTTPException(status_code=501, detail="PDF export not yet implemented")
    
    elif format == 'excel':
        # TODO: Implement Excel export with multiple sheets
        raise HTTPException(status_code=501, detail="Excel export not yet implemented")