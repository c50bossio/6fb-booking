"""
Calendar Revenue Optimization API Endpoints
Provides Six Figure Barber methodology-based calendar revenue optimization.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field

from db import get_db
from dependencies import get_current_user
from services.calendar_revenue_optimizer import CalendarRevenueOptimizer
from models import User, Appointment, Service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar-revenue", tags=["Calendar Revenue Optimization"])

# Pydantic models for API requests/responses
class RevenueTargetsRequest(BaseModel):
    daily_target: Optional[float] = Field(274, description="Daily revenue target")
    weekly_target: Optional[float] = Field(1923, description="Weekly revenue target")
    monthly_target: Optional[float] = Field(8333, description="Monthly revenue target")
    annual_target: Optional[float] = Field(100000, description="Annual revenue target")

class TimeBlockOptimizationRequest(BaseModel):
    target_date: date = Field(description="Date to optimize time blocks for")
    barber_id: Optional[int] = Field(None, description="Specific barber ID, or None for current user")

class UpsellOpportunityResponse(BaseModel):
    appointment_id: int
    client_name: str
    current_service: str
    current_price: float
    suggested_service: str
    suggested_price: float
    revenue_increase: float
    probability: float
    reasoning: str
    six_fb_principle: str

class RevenueTimeBlockResponse(BaseModel):
    start_hour: int
    end_hour: int
    optimal_service_price: float
    expected_revenue: float
    confidence_score: float
    reasoning: str
    suggested_services: List[str]

class PeakHourAnalysisResponse(BaseModel):
    hour: int
    average_revenue: float
    appointment_count: int
    average_ticket: float
    utilization_rate: float
    optimization_potential: float

class OptimizationSuggestionResponse(BaseModel):
    type: str
    title: str
    description: str
    expected_impact: float
    confidence: float
    implementation_difficulty: str
    six_fb_methodology: str
    action_items: List[str]

class RevenueMetricsResponse(BaseModel):
    daily_revenue: float
    daily_target: float
    daily_progress: float
    weekly_revenue: float
    weekly_target: float
    weekly_progress: float
    monthly_revenue: float
    monthly_target: float
    monthly_progress: float
    annual_projection: float
    annual_target: float
    annual_progress: float
    average_ticket: float
    appointment_count: int
    high_value_service_count: int
    commission_earned: float

# Initialize the revenue optimizer
revenue_optimizer = CalendarRevenueOptimizer()

@router.get("/metrics", response_model=RevenueMetricsResponse)
async def get_revenue_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None, description="Start date for metrics calculation"),
    date_to: Optional[date] = Query(None, description="End date for metrics calculation")
):
    """
    Get comprehensive revenue metrics for Six Figure Barber progress tracking.
    """
    try:
        # Default to current month if no date range provided
        if not date_from:
            today = datetime.now().date()
            date_from = today.replace(day=1)
        if not date_to:
            date_to = datetime.now().date()

        # Query appointments for the user
        appointments_query = db.query(Appointment).filter(
            Appointment.barber_id == current_user.id,
            Appointment.start_time >= date_from,
            Appointment.start_time <= date_to,
            Appointment.status.in_(['confirmed', 'completed'])
        )
        
        appointments = appointments_query.all()
        
        # Calculate metrics
        total_revenue = sum(apt.service_price or 0 for apt in appointments)
        appointment_count = len(appointments)
        average_ticket = total_revenue / appointment_count if appointment_count > 0 else 0
        high_value_count = sum(1 for apt in appointments if (apt.service_price or 0) >= 85)
        
        # Calculate commission (assuming average 55% commission rate)
        commission_earned = total_revenue * 0.55
        
        # Calculate period-specific metrics
        today = datetime.now().date()
        
        # Daily metrics (today)
        daily_appointments = [apt for apt in appointments if apt.start_time.date() == today]
        daily_revenue = sum(apt.service_price or 0 for apt in daily_appointments)
        
        # Weekly metrics (current week)
        week_start = today - timedelta(days=today.weekday())
        weekly_appointments = [apt for apt in appointments if apt.start_time.date() >= week_start]
        weekly_revenue = sum(apt.service_price or 0 for apt in weekly_appointments)
        
        # Monthly metrics (current month)
        month_start = today.replace(day=1)
        monthly_appointments = [apt for apt in appointments if apt.start_time.date() >= month_start]
        monthly_revenue = sum(apt.service_price or 0 for apt in monthly_appointments)
        
        # Targets (from Six Figure Barber methodology)
        daily_target = 274  # $100k / 365 days
        weekly_target = 1923  # $100k / 52 weeks
        monthly_target = 8333  # $100k / 12 months
        annual_target = 100000
        
        # Annual projection based on monthly performance
        days_in_month = (today.replace(month=today.month+1, day=1) - today.replace(day=1)).days
        daily_average = monthly_revenue / today.day if today.day > 0 else 0
        annual_projection = daily_average * 365
        
        return RevenueMetricsResponse(
            daily_revenue=daily_revenue,
            daily_target=daily_target,
            daily_progress=(daily_revenue / daily_target) * 100,
            weekly_revenue=weekly_revenue,
            weekly_target=weekly_target,
            weekly_progress=(weekly_revenue / weekly_target) * 100,
            monthly_revenue=monthly_revenue,
            monthly_target=monthly_target,
            monthly_progress=(monthly_revenue / monthly_target) * 100,
            annual_projection=annual_projection,
            annual_target=annual_target,
            annual_progress=(annual_projection / annual_target) * 100,
            average_ticket=average_ticket,
            appointment_count=appointment_count,
            high_value_service_count=high_value_count,
            commission_earned=commission_earned
        )
        
    except Exception as e:
        logger.error(f"Error calculating revenue metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate revenue metrics")

@router.post("/optimize-time-blocks", response_model=List[RevenueTimeBlockResponse])
async def optimize_time_blocks(
    request: TimeBlockOptimizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get optimized time blocks for maximum revenue potential based on Six Figure Barber methodology.
    """
    try:
        barber_id = request.barber_id or current_user.id
        
        # Get historical appointments for analysis (last 90 days)
        historical_start = request.target_date - timedelta(days=90)
        historical_appointments = db.query(Appointment).filter(
            Appointment.barber_id == barber_id,
            Appointment.start_time >= historical_start,
            Appointment.start_time < request.target_date,
            Appointment.status.in_(['confirmed', 'completed'])
        ).all()
        
        # Convert to dictionary format for the optimizer
        appointment_data = []
        for apt in historical_appointments:
            appointment_data.append({
                'id': apt.id,
                'start_time': apt.start_time.isoformat(),
                'service_name': apt.service_name,
                'service_price': apt.service_price or 0,
                'client_name': apt.client_name,
                'status': apt.status
            })
        
        # Get available services
        services = db.query(Service).filter(Service.active == True).all()
        service_data = []
        for service in services:
            service_data.append({
                'id': service.id,
                'name': service.name,
                'price': service.price,
                'duration': service.duration_minutes
            })
        
        # Generate optimized time blocks
        optimized_blocks = revenue_optimizer.optimize_time_blocks(
            barber_id=barber_id,
            target_date=request.target_date,
            historical_appointments=appointment_data,
            available_services=service_data
        )
        
        # Convert to response format
        response_blocks = []
        for block in optimized_blocks:
            response_blocks.append(RevenueTimeBlockResponse(
                start_hour=block.start_hour,
                end_hour=block.end_hour,
                optimal_service_price=block.optimal_service_price,
                expected_revenue=block.expected_revenue,
                confidence_score=block.confidence_score,
                reasoning=block.reasoning,
                suggested_services=block.suggested_services
            ))
        
        logger.info(f"Generated {len(response_blocks)} optimized time blocks for barber {barber_id}")
        return response_blocks
        
    except Exception as e:
        logger.error(f"Error optimizing time blocks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to optimize time blocks")

@router.get("/upsell-opportunities", response_model=List[UpsellOpportunityResponse])
async def get_upsell_opportunities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days_ahead: int = Query(7, description="Number of days ahead to analyze for opportunities")
):
    """
    Get upselling opportunities for upcoming appointments based on Six Figure Barber methodology.
    """
    try:
        # Get upcoming appointments
        end_date = datetime.now() + timedelta(days=days_ahead)
        upcoming_appointments = db.query(Appointment).filter(
            Appointment.barber_id == current_user.id,
            Appointment.start_time >= datetime.now(),
            Appointment.start_time <= end_date,
            Appointment.status == 'confirmed'
        ).all()
        
        # Convert to dictionary format
        appointment_data = []
        for apt in upcoming_appointments:
            appointment_data.append({
                'id': apt.id,
                'start_time': apt.start_time.isoformat(),
                'service_name': apt.service_name,
                'service_price': apt.service_price or 0,
                'client_name': apt.client_name,
                'client_tier': getattr(apt, 'client_tier', 'bronze'),  # Default to bronze if not set
                'status': apt.status
            })
        
        # Generate upsell opportunities
        opportunities = revenue_optimizer.identify_upsell_opportunities(appointment_data)
        
        # Convert to response format
        response_opportunities = []
        for opp in opportunities:
            response_opportunities.append(UpsellOpportunityResponse(
                appointment_id=opp.appointment_id,
                client_name=opp.client_name,
                current_service=opp.current_service,
                current_price=opp.current_price,
                suggested_service=opp.suggested_service,
                suggested_price=opp.suggested_price,
                revenue_increase=opp.revenue_increase,
                probability=opp.probability,
                reasoning=opp.reasoning,
                six_fb_principle=opp.six_fb_principle
            ))
        
        logger.info(f"Generated {len(response_opportunities)} upsell opportunities")
        return response_opportunities
        
    except Exception as e:
        logger.error(f"Error generating upsell opportunities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate upsell opportunities")

@router.get("/peak-hours", response_model=List[PeakHourAnalysisResponse])
async def analyze_peak_hours(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days_back: int = Query(30, description="Number of days back to analyze")
):
    """
    Analyze peak performance hours for revenue optimization.
    """
    try:
        # Get historical appointments
        start_date = datetime.now() - timedelta(days=days_back)
        appointments = db.query(Appointment).filter(
            Appointment.barber_id == current_user.id,
            Appointment.start_time >= start_date,
            Appointment.status.in_(['confirmed', 'completed'])
        ).all()
        
        # Convert to dictionary format
        appointment_data = []
        for apt in appointments:
            appointment_data.append({
                'start_time': apt.start_time.isoformat(),
                'service_price': apt.service_price or 0
            })
        
        # Analyze peak hours
        peak_analysis = revenue_optimizer.analyze_peak_hours(appointment_data)
        
        # Convert to response format
        response_analysis = []
        for analysis in peak_analysis:
            response_analysis.append(PeakHourAnalysisResponse(
                hour=analysis.hour,
                average_revenue=analysis.average_revenue,
                appointment_count=analysis.appointment_count,
                average_ticket=analysis.average_ticket,
                utilization_rate=analysis.utilization_rate,
                optimization_potential=analysis.optimization_potential
            ))
        
        logger.info(f"Analyzed {len(response_analysis)} peak hours")
        return response_analysis
        
    except Exception as e:
        logger.error(f"Error analyzing peak hours: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze peak hours")

@router.get("/optimization-suggestions", response_model=List[OptimizationSuggestionResponse])
async def get_optimization_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    target_income: float = Query(100000, description="Annual income target")
):
    """
    Get AI-powered optimization suggestions based on Six Figure Barber methodology.
    """
    try:
        # Calculate current performance metrics
        today = datetime.now().date()
        month_start = today.replace(day=1)
        
        # Get current month appointments
        monthly_appointments = db.query(Appointment).filter(
            Appointment.barber_id == current_user.id,
            Appointment.start_time >= month_start,
            Appointment.status.in_(['confirmed', 'completed'])
        ).all()
        
        # Calculate performance metrics
        monthly_revenue = sum(apt.service_price or 0 for apt in monthly_appointments)
        total_clients = len(set(apt.client_name for apt in monthly_appointments))
        avg_ticket = monthly_revenue / len(monthly_appointments) if monthly_appointments else 0
        
        # Estimate utilization rate (appointments per working day)
        working_days = today.day  # Approximate working days this month
        appointments_per_day = len(monthly_appointments) / working_days if working_days > 0 else 0
        utilization_rate = min(appointments_per_day / 8, 1.0)  # Assuming 8 appointments per day max
        
        current_performance = {
            'monthly_revenue': monthly_revenue,
            'average_ticket': avg_ticket,
            'utilization_rate': utilization_rate,
            'total_clients': total_clients
        }
        
        # Generate optimization suggestions
        suggestions = revenue_optimizer.generate_optimization_suggestions(
            barber_id=current_user.id,
            current_performance=current_performance,
            target_income=target_income
        )
        
        # Convert to response format
        response_suggestions = []
        for suggestion in suggestions:
            response_suggestions.append(OptimizationSuggestionResponse(
                type=suggestion.type,
                title=suggestion.title,
                description=suggestion.description,
                expected_impact=suggestion.expected_impact,
                confidence=suggestion.confidence,
                implementation_difficulty=suggestion.implementation_difficulty,
                six_fb_methodology=suggestion.six_fb_methodology,
                action_items=suggestion.action_items
            ))
        
        logger.info(f"Generated {len(response_suggestions)} optimization suggestions")
        return response_suggestions
        
    except Exception as e:
        logger.error(f"Error generating optimization suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate optimization suggestions")

@router.post("/apply-upsell")
async def apply_upsell_suggestion(
    appointment_id: int,
    suggested_service: str,
    suggested_price: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply an upsell suggestion to an appointment.
    """
    try:
        # Find the appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.barber_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Update the appointment with the upsell
        original_service = appointment.service_name
        original_price = appointment.service_price
        
        appointment.service_name = suggested_service
        appointment.service_price = suggested_price
        
        # Add a note about the upsell
        if hasattr(appointment, 'notes'):
            upsell_note = f"Upsold from {original_service} (${original_price}) to {suggested_service} (${suggested_price})"
            appointment.notes = f"{appointment.notes}\n{upsell_note}" if appointment.notes else upsell_note
        
        db.commit()
        
        logger.info(f"Applied upsell for appointment {appointment_id}: {original_service} -> {suggested_service}")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "Upsell applied successfully",
                "appointment_id": appointment_id,
                "revenue_increase": suggested_price - (original_price or 0)
            }
        )
        
    except Exception as e:
        logger.error(f"Error applying upsell suggestion: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to apply upsell suggestion")

@router.get("/six-figure-progress")
async def get_six_figure_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    target_income: float = Query(100000, description="Annual income target")
):
    """
    Get detailed Six Figure Barber progress tracking.
    """
    try:
        today = datetime.now().date()
        year_start = today.replace(month=1, day=1)
        
        # Get all appointments for the year
        yearly_appointments = db.query(Appointment).filter(
            Appointment.barber_id == current_user.id,
            Appointment.start_time >= year_start,
            Appointment.status.in_(['confirmed', 'completed'])
        ).all()
        
        # Calculate year-to-date metrics
        ytd_revenue = sum(apt.service_price or 0 for apt in yearly_appointments)
        days_passed = (today - year_start).days + 1
        days_remaining = 365 - days_passed
        
        # Calculate projections
        daily_average = ytd_revenue / days_passed if days_passed > 0 else 0
        annual_projection = daily_average * 365
        
        # Progress percentages
        ytd_progress = (ytd_revenue / target_income) * 100
        projection_progress = (annual_projection / target_income) * 100
        
        # Monthly breakdown
        monthly_data = {}
        for month in range(1, 13):
            month_start = today.replace(month=month, day=1)
            if month < 12:
                month_end = today.replace(month=month+1, day=1) - timedelta(days=1)
            else:
                month_end = today.replace(month=12, day=31)
            
            if month_start <= today:
                month_appointments = [apt for apt in yearly_appointments 
                                    if month_start <= apt.start_time.date() <= min(month_end, today)]
                month_revenue = sum(apt.service_price or 0 for apt in month_appointments)
            else:
                month_revenue = 0
            
            monthly_data[month] = {
                'revenue': month_revenue,
                'target': target_income / 12,
                'progress': (month_revenue / (target_income / 12)) * 100
            }
        
        return JSONResponse(content={
            "target_income": target_income,
            "ytd_revenue": ytd_revenue,
            "ytd_progress": ytd_progress,
            "annual_projection": annual_projection,
            "projection_progress": projection_progress,
            "daily_average": daily_average,
            "daily_target": target_income / 365,
            "days_passed": days_passed,
            "days_remaining": days_remaining,
            "monthly_breakdown": monthly_data,
            "on_track": projection_progress >= 90,  # Consider on track if projected to hit 90%+ of target
            "coaching_insight": (
                "🎯 Excellent progress! You're on track to exceed your six-figure goal." 
                if projection_progress >= 100 else
                "📈 Good momentum! Focus on consistency to reach your six-figure target." 
                if projection_progress >= 80 else
                "⚡ Opportunity for growth! Consider implementing premium pricing strategies."
            )
        })
        
    except Exception as e:
        logger.error(f"Error calculating six figure progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate progress")