from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from pydantic import BaseModel

from database import get_db
from models import Service, Client, Appointment, User
from utils.auth import get_current_user
from services.revenue_optimized_scheduling_service import RevenueOptimizedSchedulingService

router = APIRouter(prefix="/revenue-scheduling", tags=["revenue-scheduling"])

# Request/Response Models
class OptimizedSlotRequest(BaseModel):
    date: str  # ISO date format
    service_id: int
    client_id: Optional[int] = None
    duration_minutes: int = 60
    preferred_times: Optional[List[str]] = None

class RescheduleRequest(BaseModel):
    appointment_id: int
    new_date_start: str  # ISO date format
    new_date_end: str    # ISO date format
    client_preferences: Optional[Dict[str, Any]] = None

class ScheduleAnalysisRequest(BaseModel):
    start_date: str  # ISO date format
    end_date: str    # ISO date format
    barber_id: Optional[int] = None

@router.post("/optimized-slots")
async def get_optimized_time_slots(
    request: OptimizedSlotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get revenue-optimized time slots for appointment booking
    
    Returns available time slots ranked by revenue potential,
    considering client tier, peak pricing, and service profitability.
    """
    try:
        # Parse date
        booking_date = datetime.fromisoformat(request.date).date()
        
        # Get service
        service = db.query(Service).filter(Service.id == request.service_id).first()
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )
        
        # Get client if specified
        client = None
        if request.client_id:
            client = db.query(Client).filter(Client.id == request.client_id).first()
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Client not found"
                )
        
        # Initialize scheduling service
        scheduling_service = RevenueOptimizedSchedulingService(db)
        
        # Get optimized slots
        optimized_slots = scheduling_service.get_revenue_optimized_slots(
            booking_date,
            service,
            client,
            request.duration_minutes,
            request.preferred_times
        )
        
        return {
            "date": request.date,
            "service_name": service.name,
            "service_base_price": service.base_price,
            "client_id": request.client_id,
            "total_slots": len(optimized_slots),
            "slots": optimized_slots,
            "optimization_summary": {
                "peak_slots": len([s for s in optimized_slots if s['pricing_strategy'] == 'peak']),
                "premium_slots": len([s for s in optimized_slots if s['pricing_strategy'] == 'premium']),
                "high_revenue_slots": len([s for s in optimized_slots if s['revenue_score'] > service.base_price * 1.2])
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get optimized slots: {str(e)}"
        )

@router.post("/optimal-reschedule")
async def get_optimal_reschedule_slots(
    request: RescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Find optimal rescheduling slots that maintain or improve revenue
    """
    try:
        # Get original appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == request.appointment_id
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Parse date range
        start_date = datetime.fromisoformat(request.new_date_start).date()
        end_date = datetime.fromisoformat(request.new_date_end).date()
        
        # Initialize scheduling service
        scheduling_service = RevenueOptimizedSchedulingService(db)
        
        # Get optimal reschedule slots
        optimal_slots = scheduling_service.get_optimal_reschedule_slots(
            appointment,
            (start_date, end_date),
            request.client_preferences
        )
        
        return {
            "original_appointment": {
                "id": appointment.id,
                "original_time": appointment.start_time.isoformat(),
                "service_name": appointment.service_name,
                "original_price": appointment.price
            },
            "search_period": {
                "start_date": request.new_date_start,
                "end_date": request.new_date_end,
                "days_searched": (end_date - start_date).days + 1
            },
            "optimal_slots": optimal_slots,
            "reschedule_summary": {
                "total_options": len(optimal_slots),
                "revenue_improving_slots": len([s for s in optimal_slots if s.get('reschedule_benefit', {}).get('revenue_improvement', 0) > 0]),
                "best_improvement": max([s.get('reschedule_benefit', {}).get('revenue_improvement', 0) for s in optimal_slots]) if optimal_slots else 0
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get reschedule options: {str(e)}"
        )

@router.post("/schedule-analysis")
async def analyze_schedule_optimization(
    request: ScheduleAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Analyze schedule for revenue optimization opportunities
    
    Provides comprehensive analysis of appointment scheduling patterns,
    revenue optimization opportunities, and strategic recommendations.
    """
    try:
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date).date()
        end_date = datetime.fromisoformat(request.end_date).date()
        
        # Validate date range
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
        
        # Limit analysis to reasonable time periods
        max_days = 90
        if (end_date - start_date).days > max_days:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Analysis period cannot exceed {max_days} days"
            )
        
        # Initialize scheduling service
        scheduling_service = RevenueOptimizedSchedulingService(db)
        
        # Perform analysis
        analysis = scheduling_service.analyze_schedule_optimization(
            (start_date, end_date),
            request.barber_id
        )
        
        return {
            "analysis": analysis,
            "generated_at": datetime.utcnow().isoformat(),
            "user_id": current_user.id,
            "scope": {
                "barber_specific": request.barber_id is not None,
                "barber_id": request.barber_id
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze schedule: {str(e)}"
        )

@router.get("/pricing-strategies")
async def get_pricing_strategies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get information about revenue optimization pricing strategies
    """
    return {
        "pricing_strategies": {
            "peak": {
                "name": "Peak Hours",
                "description": "High-demand time slots with premium pricing",
                "multiplier": 1.3,
                "time_periods": [
                    {"name": "Morning", "hours": "9:00 AM - 12:00 PM"},
                    {"name": "Afternoon", "hours": "1:00 PM - 5:00 PM"},
                    {"name": "Evening", "hours": "6:00 PM - 8:00 PM"}
                ]
            },
            "premium": {
                "name": "Premium Slots",
                "description": "Exclusive time slots with highest pricing",
                "multiplier": 1.5,
                "time_periods": [
                    {"name": "Prime Evening", "hours": "5:00 PM - 7:00 PM"}
                ]
            },
            "standard": {
                "name": "Standard Hours",
                "description": "Regular pricing for standard time slots",
                "multiplier": 1.0,
                "time_periods": [
                    {"name": "Mid-day", "hours": "12:00 PM - 1:00 PM"},
                    {"name": "Late Afternoon", "hours": "5:00 PM - 6:00 PM"}
                ]
            },
            "off_peak": {
                "name": "Off-Peak Hours",
                "description": "Lower demand slots with promotional pricing",
                "multiplier": 0.9,
                "time_periods": [
                    {"name": "Early Morning", "hours": "8:00 AM - 9:00 AM"},
                    {"name": "Late Evening", "hours": "8:00 PM - 9:00 PM"}
                ]
            }
        },
        "client_tier_bonuses": {
            "platinum": {"priority_weight": 1.0, "bonus_percentage": 20},
            "gold": {"priority_weight": 0.8, "bonus_percentage": 15},
            "silver": {"priority_weight": 0.6, "bonus_percentage": 10},
            "bronze": {"priority_weight": 0.4, "bonus_percentage": 5},
            "new": {"priority_weight": 0.2, "bonus_percentage": 0}
        },
        "optimization_factors": [
            "Time-based pricing strategy",
            "Client tier priority weighting",
            "Service profitability factor",
            "Historical demand patterns",
            "Preferred time bonuses",
            "Peak demand multipliers"
        ]
    }

@router.get("/revenue-insights")
async def get_revenue_insights(
    days_back: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get revenue insights and optimization suggestions for recent period
    """
    try:
        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)
        
        # Initialize scheduling service
        scheduling_service = RevenueOptimizedSchedulingService(db)
        
        # Get analysis
        analysis = scheduling_service.analyze_schedule_optimization(
            (start_date, end_date),
            None  # All barbers
        )
        
        # Calculate additional insights
        insights = {
            "revenue_optimization_score": _calculate_optimization_score(analysis),
            "peak_efficiency": _calculate_peak_efficiency(analysis),
            "tier_revenue_distribution": _analyze_tier_revenue(analysis),
            "improvement_potential": _calculate_improvement_potential(analysis)
        }
        
        return {
            "period_days": days_back,
            "analysis_summary": analysis['summary'],
            "insights": insights,
            "top_recommendations": analysis['recommendations'][:5],
            "optimization_opportunities": analysis['optimization_opportunities']
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate revenue insights: {str(e)}"
        )

# Helper functions for insights
def _calculate_optimization_score(analysis: Dict[str, Any]) -> float:
    """Calculate overall optimization score (0-100)"""
    peak_util = analysis['peak_analysis']['rate']
    revenue_per_slot = analysis['summary']['average_revenue_per_slot']
    
    # Simple scoring based on utilization and revenue
    utilization_score = min(100, peak_util * 1.2)  # Peak utilization weighted
    revenue_score = min(100, revenue_per_slot / 75 * 100)  # $75 as benchmark
    
    return (utilization_score + revenue_score) / 2

def _calculate_peak_efficiency(analysis: Dict[str, Any]) -> Dict[str, float]:
    """Calculate peak hour efficiency metrics"""
    return {
        "peak_utilization": analysis['peak_analysis']['rate'],
        "off_peak_utilization": analysis['peak_analysis']['off_peak_rate'],
        "efficiency_ratio": analysis['peak_analysis']['rate'] / max(analysis['peak_analysis']['off_peak_rate'], 1)
    }

def _analyze_tier_revenue(analysis: Dict[str, Any]) -> Dict[str, float]:
    """Analyze revenue distribution by client tier"""
    tier_dist = analysis['client_tier_distribution']['percentages']
    
    # Estimate revenue contribution by tier (based on typical patterns)
    tier_revenue_weights = {
        'platinum': 2.5, 'gold': 2.0, 'silver': 1.5, 'bronze': 1.0, 'new': 0.8
    }
    
    total_weighted = sum(tier_dist.get(tier, 0) * weight for tier, weight in tier_revenue_weights.items())
    
    return {
        tier: (tier_dist.get(tier, 0) * weight / total_weighted * 100) if total_weighted > 0 else 0
        for tier, weight in tier_revenue_weights.items()
    }

def _calculate_improvement_potential(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate potential revenue improvement"""
    opportunities = analysis['optimization_opportunities']
    total_potential = sum(opp.get('potential_revenue', 0) for opp in opportunities)
    
    return {
        "total_potential_revenue": total_potential,
        "opportunity_count": len(opportunities),
        "high_priority_opportunities": len([opp for opp in opportunities if opp.get('priority') == 'high']),
        "quick_wins": [opp for opp in opportunities if opp.get('priority') == 'high'][:3]
    }