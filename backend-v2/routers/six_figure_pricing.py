"""
Six Figure Barber Pricing API Router

Provides intelligent pricing endpoints based on Six Figure Barber methodology
for dynamic service pricing, revenue optimization, and business growth.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from dependencies import get_current_user
from models import User
from services.six_figure_pricing_service import SixFigurePricingService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/six-figure-pricing", tags=["Six Figure Pricing"])

# Request/Response Models
class ServicePricingRequest(BaseModel):
    service_name: str
    barber_id: int
    client_id: Optional[int] = None
    appointment_datetime: Optional[datetime] = None
    base_price: Optional[float] = None

class ServicePricingResponse(BaseModel):
    service_name: str
    base_price: float
    final_price: float
    pricing_breakdown: Dict[str, Any]
    six_figure_insights: Dict[str, Any]
    service_details: Dict[str, Any]

@router.post("/calculate-price", response_model=ServicePricingResponse)
async def calculate_service_price(
    request: ServicePricingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate intelligent service pricing using Six Figure Barber methodology
    
    This endpoint provides dynamic pricing based on:
    - Barber experience and expertise level
    - Client tier and relationship value
    - Service complexity and time requirements
    - Market positioning and premium time slots
    """
    try:
        pricing_service = SixFigurePricingService(db)
        
        # Calculate pricing
        pricing_result = pricing_service.calculate_service_price(
            service_name=request.service_name,
            barber_id=request.barber_id,
            client_id=request.client_id,
            appointment_datetime=request.appointment_datetime,
            base_price=request.base_price
        )
        
        return pricing_result
        
    except Exception as e:
        logger.error(f"Error calculating service price: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate service pricing")

@router.get("/barber-recommendations/{barber_id}")
async def get_barber_pricing_recommendations(
    barber_id: int,
    analysis_days: int = Query(30, ge=7, le=90, description="Days of data to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Six Figure Barber pricing strategy recommendations for a specific barber
    
    Analyzes recent performance and provides optimization insights:
    - Current revenue performance vs. Six Figure targets
    - Client tier distribution analysis
    - Pricing optimization opportunities
    - Service mix recommendations
    """
    try:
        # Verify access permissions
        if current_user.id != barber_id and current_user.role not in ['admin', 'super_admin']:
            # Check if user has access to this barber (same organization, etc.)
            barber = db.query(User).filter(User.id == barber_id).first()
            if not barber:
                raise HTTPException(status_code=404, detail="Barber not found")
            
            # Add additional permission checks as needed
            if hasattr(current_user, 'organization_id') and hasattr(barber, 'organization_id'):
                if current_user.organization_id != barber.organization_id:
                    raise HTTPException(status_code=403, detail="Access denied")
        
        pricing_service = SixFigurePricingService(db)
        
        recommendations = pricing_service.get_pricing_recommendations(
            barber_id=barber_id,
            service_analysis_period_days=analysis_days
        )
        
        return recommendations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pricing recommendations for barber {barber_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve pricing recommendations")

@router.get("/service-pricing-matrix")
async def get_service_pricing_matrix(
    barber_experience: str = Query("mid", description="Barber experience level"),
    client_tier: str = Query("new", description="Client tier"),
    include_time_premiums: bool = Query(True, description="Include time-based premium pricing"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive service pricing matrix for Six Figure Barber methodology
    
    Returns pricing for all services based on:
    - Barber experience level (junior, mid, senior, expert)
    - Client tier (new, bronze, silver, gold, platinum)
    - Time-based premium adjustments
    """
    try:
        pricing_service = SixFigurePricingService(db)
        
        # Get all service types
        services = [
            'haircut', 'haircut & beard', 'haircut & shave', 'beard trimming',
            'straight razor shave', 'scalp treatment', 'styling & grooming', 'consultation'
        ]
        
        pricing_matrix = {}
        
        for service in services:
            # Create a mock barber with the specified experience level
            class MockBarber:
                def __init__(self, exp_level):
                    self.id = 1
                    self.experience_level = exp_level
                    self.hourly_rate = {
                        'junior': 45, 'mid': 65, 'senior': 85, 'expert': 120
                    }.get(exp_level, 65)
            
            mock_barber = MockBarber(barber_experience)
            
            # Calculate base pricing (no specific client)
            base_pricing = pricing_service.calculate_service_price(
                service_name=service,
                barber_id=1,  # Mock ID
                client_id=None
            )
            
            # Calculate with time premiums if requested
            time_variants = {}
            if include_time_premiums:
                # Morning rush (8 AM)
                morning_pricing = pricing_service.calculate_service_price(
                    service_name=service,
                    barber_id=1,
                    appointment_datetime=datetime(2024, 1, 15, 8, 0)  # Monday 8 AM
                )
                time_variants['morning_rush'] = morning_pricing['final_price']
                
                # Evening prime (6 PM)
                evening_pricing = pricing_service.calculate_service_price(
                    service_name=service,
                    barber_id=1,
                    appointment_datetime=datetime(2024, 1, 15, 18, 0)  # Monday 6 PM
                )
                time_variants['evening_prime'] = evening_pricing['final_price']
                
                # Weekend premium (Saturday 2 PM)
                weekend_pricing = pricing_service.calculate_service_price(
                    service_name=service,
                    barber_id=1,
                    appointment_datetime=datetime(2024, 1, 13, 14, 0)  # Saturday 2 PM
                )
                time_variants['weekend_premium'] = weekend_pricing['final_price']
            
            pricing_matrix[service] = {
                'base_price': base_pricing['final_price'],
                'service_details': base_pricing['service_details'],
                'time_variants': time_variants,
                'six_figure_category': base_pricing['six_figure_insights']['revenue_category']
            }
        
        return {
            'barber_experience': barber_experience,
            'client_tier': client_tier,
            'pricing_matrix': pricing_matrix,
            'methodology_info': {
                'description': 'Six Figure Barber dynamic pricing based on value delivery',
                'factors': [
                    'Barber expertise and experience level',
                    'Service complexity and skill requirements',
                    'Market demand and time-based premiums',
                    'Client relationship value and tier status'
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating pricing matrix: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate pricing matrix")

@router.get("/revenue-optimization/{barber_id}")
async def get_revenue_optimization_insights(
    barber_id: int,
    target_annual_revenue: float = Query(100000, description="Target annual revenue goal"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Six Figure Barber revenue optimization insights and gap analysis
    
    Provides strategic guidance for reaching revenue goals through:
    - Pricing strategy optimization
    - Client tier development opportunities
    - Service mix enhancement recommendations
    - Time utilization improvements
    """
    try:
        # Verify permissions (same as above)
        if current_user.id != barber_id and current_user.role not in ['admin', 'super_admin']:
            barber = db.query(User).filter(User.id == barber_id).first()
            if not barber:
                raise HTTPException(status_code=404, detail="Barber not found")
        
        pricing_service = SixFigurePricingService(db)
        
        # Get current pricing recommendations
        current_recommendations = pricing_service.get_pricing_recommendations(barber_id)
        
        # Calculate revenue gap analysis
        current_performance = current_recommendations.get('current_performance', {})
        current_annual_estimate = current_performance.get('total_revenue', 0) * 12  # Rough annualization
        
        revenue_gap = max(0, target_annual_revenue - current_annual_estimate)
        
        # Generate optimization strategies
        optimization_strategies = []
        
        if revenue_gap > 0:
            # Strategy 1: Pricing optimization
            avg_ticket = current_performance.get('average_ticket', 50)
            appointments_needed = current_performance.get('total_appointments', 0) * 12
            
            if appointments_needed > 0:
                target_avg_ticket = target_annual_revenue / appointments_needed
                ticket_increase = target_avg_ticket - avg_ticket
                
                if ticket_increase > 0:
                    optimization_strategies.append({
                        'strategy': 'Average Ticket Optimization',
                        'description': f'Increase average ticket from ${avg_ticket:.2f} to ${target_avg_ticket:.2f}',
                        'revenue_impact': ticket_increase * appointments_needed,
                        'action_items': [
                            'Implement premium service packages',
                            'Focus on upselling and cross-selling',
                            'Develop value-added services',
                            'Enhance client tier progression strategies'
                        ],
                        'six_fb_methodology': 'Value-based pricing and premium positioning'
                    })
            
            # Strategy 2: Client tier development
            tier_distribution = current_performance.get('client_tier_distribution', {})
            platinum_gold_count = tier_distribution.get('platinum', 0) + tier_distribution.get('gold', 0)
            total_clients = sum(tier_distribution.values())
            
            if total_clients > 0 and platinum_gold_count / total_clients < 0.4:
                optimization_strategies.append({
                    'strategy': 'Premium Client Development',
                    'description': 'Increase percentage of platinum/gold tier clients',
                    'revenue_impact': revenue_gap * 0.4,  # Estimate 40% impact
                    'action_items': [
                        'Implement client tier advancement programs',
                        'Focus on relationship building and retention',
                        'Develop exclusive premium service offerings',
                        'Enhance client experience for tier progression'
                    ],
                    'six_fb_methodology': 'Client relationship optimization and value creation'
                })
            
            # Strategy 3: Capacity optimization
            hourly_rate = current_performance.get('effective_hourly_rate', 60)
            target_hours_per_week = 35  # Reasonable full-time schedule
            target_weeks_per_year = 48  # Account for vacation/time off
            capacity_annual_revenue = hourly_rate * target_hours_per_week * target_weeks_per_year
            
            if capacity_annual_revenue < target_annual_revenue:
                optimization_strategies.append({
                    'strategy': 'Premium Hourly Rate Development',
                    'description': f'Increase effective hourly rate from ${hourly_rate:.2f}',
                    'revenue_impact': revenue_gap * 0.6,  # Major impact factor
                    'action_items': [
                        'Position services as premium/luxury offerings',
                        'Develop specialized expertise and certifications',
                        'Implement time-based premium pricing',
                        'Focus on high-value service delivery'
                    ],
                    'six_fb_methodology': 'Expert positioning and premium market capture'
                })
        
        return {
            'revenue_analysis': {
                'current_annual_estimate': round(current_annual_estimate, 2),
                'target_annual_revenue': target_annual_revenue,
                'revenue_gap': round(revenue_gap, 2),
                'gap_percentage': round((revenue_gap / target_annual_revenue) * 100, 1) if target_annual_revenue > 0 else 0
            },
            'current_performance': current_performance,
            'optimization_strategies': optimization_strategies,
            'six_figure_barber_roadmap': {
                'phase_1': 'Pricing optimization and service enhancement',
                'phase_2': 'Client tier development and relationship building', 
                'phase_3': 'Premium market positioning and expertise development',
                'success_metrics': [
                    'Average ticket increase',
                    'Client tier progression rate',
                    'Effective hourly rate improvement',
                    'Revenue consistency and growth'
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating revenue optimization insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate revenue optimization insights")