"""
Dynamic Pricing Intelligence Service for BookedBarber V2

Creates KPI-based pricing recommendations aligned with Six Figure Barber methodology.
This system TRACKS and PRESENTS data to barbers for manual decision-making.
It does NOT automate pricing changes.

Key Features:
- KPI-based pricing increase triggers and recommendations
- Before/after hours premium pricing analysis
- Celebratory price increase campaign management
- Inflation-based global price adjustment tracking
- Barber performance metrics for pricing decisions
- Data presentation dashboard for manual pricing decisions
"""

import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import uuid
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, extract
from fastapi import HTTPException

from models import User, Appointment, Service, Payment
from services.analytics_service import AnalyticsService
from utils.rate_limiter import rate_limiter
from config import settings

logger = logging.getLogger(__name__)


class PricingTriggerType(str, Enum):
    """Types of pricing increase triggers"""
    BOOKING_RATE = "booking_rate"          # High booking rate trigger
    CAPACITY_UTILIZATION = "capacity"       # High capacity trigger
    RETENTION_RATE = "retention"           # High retention trigger
    ADVANCE_BOOKING = "advance_booking"    # Far-out bookings trigger
    CLIENT_SATISFACTION = "satisfaction"   # High satisfaction trigger
    SEASONAL_DEMAND = "seasonal"           # Seasonal demand trigger
    INFLATION_ADJUSTMENT = "inflation"     # Annual inflation adjustment


class PricingRecommendationType(str, Enum):
    """Types of pricing recommendations"""
    INCREASE_SERVICES = "increase_services"         # Increase service prices
    BEFORE_AFTER_HOURS = "before_after_premium"   # Add before/after hours premium
    CELEBRATORY_CAMPAIGN = "celebratory_campaign"  # Announce price increases positively
    INFLATION_ADJUSTMENT = "inflation_adjustment"  # Annual inflation-based increase
    TIER_OPTIMIZATION = "tier_optimization"       # Optimize service tiers


class TimeOfDayCategory(str, Enum):
    """Time of day categories for pricing analysis"""
    BEFORE_HOURS = "before_hours"     # Before 9 AM
    REGULAR_HOURS = "regular_hours"   # 9 AM - 6 PM
    AFTER_HOURS = "after_hours"       # After 6 PM
    WEEKEND = "weekend"               # Saturday/Sunday


@dataclass
class PricingKPIs:
    """Key Performance Indicators for pricing decisions"""
    barber_id: int
    booking_rate: float              # Bookings per week
    capacity_utilization: float      # % of available slots booked
    retention_rate: float           # % of clients returning
    advance_booking_days: float     # Average days clients book ahead
    client_satisfaction: float      # Average satisfaction score
    revenue_per_hour: float        # Revenue per working hour
    premium_time_demand: float     # Demand for before/after hours
    no_show_rate: float           # % of appointments no-shows


@dataclass
class PricingRecommendation:
    """Pricing increase recommendation with rationale"""
    recommendation_id: str
    barber_id: int
    trigger_type: PricingTriggerType
    recommendation_type: PricingRecommendationType
    current_metrics: PricingKPIs
    recommended_increase: Decimal    # Percentage increase (e.g., 0.15 for 15%)
    rationale: str                  # Why this increase is recommended
    impact_estimate: Dict[str, Any] # Estimated impact on bookings/revenue
    celebration_message: str        # Positive message for client communication
    implementation_notes: str       # How to implement the increase
    priority_score: float          # 0-1, higher = more urgent
    created_at: datetime
    valid_until: datetime


@dataclass
class TimeBasedPricingAnalysis:
    """Analysis of time-based pricing opportunities"""
    barber_id: int
    before_hours_demand: float      # 6-9 AM demand level
    regular_hours_demand: float     # 9 AM-6 PM demand level
    after_hours_demand: float       # 6-10 PM demand level
    weekend_demand: float           # Weekend demand level
    recommended_premiums: Dict[TimeOfDayCategory, float]
    revenue_opportunity: float      # Estimated additional revenue


@dataclass
class CelebratoryPricingCampaign:
    """Celebratory campaign for price increases"""
    campaign_id: str
    barber_id: int
    price_increase: Decimal
    celebration_theme: str         # "Quality Investment", "Premium Experience", etc.
    client_message: str           # Positive message about the increase
    value_highlights: List[str]   # What clients get for the increase
    implementation_timeline: str  # When and how to implement
    expected_client_reaction: str # Anticipated client response


class DynamicPricingService:
    """
    Dynamic Pricing Intelligence Service
    
    This service analyzes barber performance KPIs and provides pricing recommendations.
    It DOES NOT automatically change prices - it provides data and recommendations
    for barbers to make informed pricing decisions manually.
    
    Six Figure Barber Methodology Integration:
    - Revenue optimization through strategic pricing
    - Value-based pricing aligned with service quality
    - Client relationship preservation through celebratory messaging
    - Data-driven business decisions
    """
    
    def __init__(self):
        # KPI thresholds for pricing triggers
        self.kpi_thresholds = {
            PricingTriggerType.BOOKING_RATE: 0.85,        # 85%+ booking rate
            PricingTriggerType.CAPACITY_UTILIZATION: 0.90, # 90%+ capacity
            PricingTriggerType.RETENTION_RATE: 0.80,       # 80%+ retention
            PricingTriggerType.ADVANCE_BOOKING: 14.0,      # 14+ days advance
            PricingTriggerType.CLIENT_SATISFACTION: 4.5    # 4.5+ stars
        }
        
        # Time-based pricing configuration
        self.time_categories = {
            TimeOfDayCategory.BEFORE_HOURS: {"start": time(6, 0), "end": time(9, 0)},
            TimeOfDayCategory.REGULAR_HOURS: {"start": time(9, 0), "end": time(18, 0)},
            TimeOfDayCategory.AFTER_HOURS: {"start": time(18, 0), "end": time(22, 0)},
        }
    
    async def analyze_barber_pricing_kpis(self, db: Session, barber_id: int) -> PricingKPIs:
        """
        Analyze barber's key performance indicators for pricing decisions
        """
        try:
            # Get barber data
            barber = db.query(User).filter(User.id == barber_id).first()
            if not barber:
                raise HTTPException(status_code=404, detail="Barber not found")
            
            # Calculate date ranges
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=90)  # 90-day analysis
            
            # Get appointments in date range
            appointments = db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status.in_(["completed", "confirmed", "no_show"])
                )
            ).all()
            
            if not appointments:
                return PricingKPIs(
                    barber_id=barber_id,
                    booking_rate=0.0,
                    capacity_utilization=0.0,
                    retention_rate=0.0,
                    advance_booking_days=0.0,
                    client_satisfaction=0.0,
                    revenue_per_hour=0.0,
                    premium_time_demand=0.0,
                    no_show_rate=0.0
                )
            
            # Calculate booking rate (appointments per week)
            weeks = max(1, (end_date - start_date).days / 7)
            booking_rate = len(appointments) / weeks
            
            # Calculate capacity utilization
            total_possible_slots = weeks * 7 * 8  # Assuming 8 slots per day
            capacity_utilization = len(appointments) / total_possible_slots
            
            # Calculate retention rate
            unique_clients = set(apt.client_id for apt in appointments)
            repeat_clients = len([client_id for client_id in unique_clients 
                                if len([apt for apt in appointments if apt.client_id == client_id]) > 1])
            retention_rate = repeat_clients / max(1, len(unique_clients))
            
            # Calculate advance booking days
            advance_days = [
                (apt.appointment_date - apt.created_at.date()).days 
                for apt in appointments if apt.created_at
            ]
            advance_booking_days = sum(advance_days) / max(1, len(advance_days))
            
            # Calculate satisfaction (placeholder - would integrate with review system)
            client_satisfaction = 4.2  # Placeholder
            
            # Calculate revenue per hour
            completed_appointments = [apt for apt in appointments if apt.status == "completed"]
            total_revenue = sum(float(apt.total_price or 0) for apt in completed_appointments)
            total_hours = len(completed_appointments) * 1.0  # Assuming 1 hour per appointment
            revenue_per_hour = total_revenue / max(1, total_hours)
            
            # Calculate premium time demand
            premium_time_appointments = [
                apt for apt in appointments 
                if self._is_premium_time(apt.appointment_date, apt.appointment_time)
            ]
            premium_time_demand = len(premium_time_appointments) / max(1, len(appointments))
            
            # Calculate no-show rate
            no_shows = len([apt for apt in appointments if apt.status == "no_show"])
            no_show_rate = no_shows / max(1, len(appointments))
            
            return PricingKPIs(
                barber_id=barber_id,
                booking_rate=booking_rate,
                capacity_utilization=capacity_utilization,
                retention_rate=retention_rate,
                advance_booking_days=advance_booking_days,
                client_satisfaction=client_satisfaction,
                revenue_per_hour=revenue_per_hour,
                premium_time_demand=premium_time_demand,
                no_show_rate=no_show_rate
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze pricing KPIs for barber {barber_id}: {e}")
            raise HTTPException(status_code=500, detail=f"KPI analysis failed: {str(e)}")
    
    async def generate_pricing_recommendations(
        self, 
        db: Session, 
        barber_id: int
    ) -> List[PricingRecommendation]:
        """
        Generate pricing increase recommendations based on KPI analysis
        """
        try:
            kpis = await self.analyze_barber_pricing_kpis(db, barber_id)
            recommendations = []
            
            # Check each trigger type
            for trigger_type, threshold in self.kpi_thresholds.items():
                trigger_met = False
                kpi_value = 0.0
                
                if trigger_type == PricingTriggerType.BOOKING_RATE:
                    kpi_value = kpis.booking_rate
                    trigger_met = kpi_value >= threshold
                elif trigger_type == PricingTriggerType.CAPACITY_UTILIZATION:
                    kpi_value = kpis.capacity_utilization
                    trigger_met = kpi_value >= threshold
                elif trigger_type == PricingTriggerType.RETENTION_RATE:
                    kpi_value = kpis.retention_rate
                    trigger_met = kpi_value >= threshold
                elif trigger_type == PricingTriggerType.ADVANCE_BOOKING:
                    kpi_value = kpis.advance_booking_days
                    trigger_met = kpi_value >= threshold
                elif trigger_type == PricingTriggerType.CLIENT_SATISFACTION:
                    kpi_value = kpis.client_satisfaction
                    trigger_met = kpi_value >= threshold
                
                if trigger_met:
                    recommendation = await self._create_pricing_recommendation(
                        db, barber_id, trigger_type, kpis, kpi_value, threshold
                    )
                    recommendations.append(recommendation)
            
            # Sort by priority score (highest first)
            recommendations.sort(key=lambda r: r.priority_score, reverse=True)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate pricing recommendations for barber {barber_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {str(e)}")
    
    async def analyze_time_based_pricing(
        self, 
        db: Session, 
        barber_id: int
    ) -> TimeBasedPricingAnalysis:
        """
        Analyze demand patterns for before/after hours premium pricing opportunities
        """
        try:
            # Get appointments for time analysis
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=90)
            
            appointments = db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status.in_(["completed", "confirmed"])
                )
            ).all()
            
            if not appointments:
                return TimeBasedPricingAnalysis(
                    barber_id=barber_id,
                    before_hours_demand=0.0,
                    regular_hours_demand=0.0,
                    after_hours_demand=0.0,
                    weekend_demand=0.0,
                    recommended_premiums={},
                    revenue_opportunity=0.0
                )
            
            # Categorize appointments by time
            before_hours = []
            regular_hours = []
            after_hours = []
            weekend = []
            
            for apt in appointments:
                apt_time = apt.appointment_time
                apt_date = apt.appointment_date
                
                # Weekend check
                if apt_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                    weekend.append(apt)
                    continue
                
                # Time-based categorization
                if self.time_categories[TimeOfDayCategory.BEFORE_HOURS]["start"] <= apt_time < self.time_categories[TimeOfDayCategory.BEFORE_HOURS]["end"]:
                    before_hours.append(apt)
                elif self.time_categories[TimeOfDayCategory.AFTER_HOURS]["start"] <= apt_time < self.time_categories[TimeOfDayCategory.AFTER_HOURS]["end"]:
                    after_hours.append(apt)
                else:
                    regular_hours.append(apt)
            
            total_appointments = len(appointments)
            
            # Calculate demand ratios
            before_hours_demand = len(before_hours) / max(1, total_appointments)
            regular_hours_demand = len(regular_hours) / max(1, total_appointments)
            after_hours_demand = len(after_hours) / max(1, total_appointments)
            weekend_demand = len(weekend) / max(1, total_appointments)
            
            # Calculate recommended premiums based on demand
            recommended_premiums = {}
            
            if before_hours_demand > 0.15:  # 15%+ demand for early hours
                recommended_premiums[TimeOfDayCategory.BEFORE_HOURS] = 0.20  # 20% premium
            
            if after_hours_demand > 0.15:  # 15%+ demand for evening hours
                recommended_premiums[TimeOfDayCategory.AFTER_HOURS] = 0.25  # 25% premium
            
            if weekend_demand > 0.25:  # 25%+ weekend demand
                recommended_premiums[TimeOfDayCategory.WEEKEND] = 0.15  # 15% premium
            
            # Calculate revenue opportunity
            base_revenue = sum(float(apt.total_price or 0) for apt in appointments)
            premium_revenue = 0.0
            
            for category, premium in recommended_premiums.items():
                if category == TimeOfDayCategory.BEFORE_HOURS:
                    category_revenue = sum(float(apt.total_price or 0) for apt in before_hours)
                elif category == TimeOfDayCategory.AFTER_HOURS:
                    category_revenue = sum(float(apt.total_price or 0) for apt in after_hours)
                elif category == TimeOfDayCategory.WEEKEND:
                    category_revenue = sum(float(apt.total_price or 0) for apt in weekend)
                else:
                    continue
                
                premium_revenue += category_revenue * premium
            
            revenue_opportunity = premium_revenue
            
            return TimeBasedPricingAnalysis(
                barber_id=barber_id,
                before_hours_demand=before_hours_demand,
                regular_hours_demand=regular_hours_demand,
                after_hours_demand=after_hours_demand,
                weekend_demand=weekend_demand,
                recommended_premiums=recommended_premiums,
                revenue_opportunity=revenue_opportunity
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze time-based pricing for barber {barber_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Time-based analysis failed: {str(e)}")
    
    async def create_celebratory_pricing_campaign(
        self, 
        db: Session, 
        barber_id: int,
        price_increase: Decimal,
        campaign_theme: Optional[str] = None
    ) -> CelebratoryPricingCampaign:
        """
        Create a celebratory campaign for announcing price increases positively
        """
        try:
            kpis = await self.analyze_barber_pricing_kpis(db, barber_id)
            
            # Generate campaign theme if not provided
            if not campaign_theme:
                if kpis.client_satisfaction >= 4.5:
                    campaign_theme = "Premium Experience Investment"
                elif kpis.retention_rate >= 0.80:
                    campaign_theme = "Quality Commitment Enhancement"
                else:
                    campaign_theme = "Service Excellence Upgrade"
            
            # Generate celebratory messaging
            increase_percent = int(price_increase * 100)
            
            campaign_messages = {
                "Premium Experience Investment": {
                    "client_message": f"🎉 EXCITING NEWS! Due to your incredible support and our growing commitment to premium service, we're investing {increase_percent}% more in advanced techniques, premium products, and enhanced comfort. This means an even better experience for you!",
                    "value_highlights": [
                        "Access to the latest cutting-edge techniques",
                        "Premium product upgrades for superior results",
                        "Enhanced comfort and luxury experience",
                        "Continued education in advanced styling methods"
                    ]
                },
                "Quality Commitment Enhancement": {
                    "client_message": f"🌟 CELEBRATING OUR GROWTH TOGETHER! Thanks to loyal clients like you, we're enhancing our quality commitment with a {increase_percent}% investment in better tools, products, and training. You deserve nothing but the best!",
                    "value_highlights": [
                        "Professional-grade tool upgrades",
                        "Exclusive access to premium product lines",
                        "Advanced certification training",
                        "Improved booking and service experience"
                    ]
                },
                "Service Excellence Upgrade": {
                    "client_message": f"🚀 LEVELING UP TOGETHER! We're excited to announce a {increase_percent}% service excellence upgrade to provide you with an even more exceptional experience. Your trust in us drives our commitment to excellence!",
                    "value_highlights": [
                        "Enhanced service delivery standards",
                        "Upgraded facility comfort and ambiance",
                        "Specialized technique mastery",
                        "Personalized client experience improvements"
                    ]
                }
            }
            
            campaign_data = campaign_messages.get(campaign_theme, campaign_messages["Service Excellence Upgrade"])
            
            # Implementation timeline
            implementation_timeline = """
            Week 1: Announce to VIP clients with personal touch
            Week 2: Email announcement to all clients with celebration theme
            Week 3: Social media celebration post highlighting improvements
            Week 4: Implement new pricing for new bookings
            """
            
            # Expected client reaction
            expected_reaction = f"Positive reception expected due to strong KPIs: {kpis.retention_rate:.1%} retention rate, {kpis.client_satisfaction:.1f}/5.0 satisfaction. Clients value quality and will appreciate investment in their experience."
            
            campaign = CelebratoryPricingCampaign(
                campaign_id=str(uuid.uuid4()),
                barber_id=barber_id,
                price_increase=price_increase,
                celebration_theme=campaign_theme,
                client_message=campaign_data["client_message"],
                value_highlights=campaign_data["value_highlights"],
                implementation_timeline=implementation_timeline,
                expected_client_reaction=expected_reaction
            )
            
            return campaign
            
        except Exception as e:
            logger.error(f"Failed to create celebratory campaign for barber {barber_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Campaign creation failed: {str(e)}")
    
    async def get_pricing_dashboard_data(self, db: Session, barber_id: int) -> Dict[str, Any]:
        """
        Get comprehensive pricing intelligence dashboard data for a barber
        """
        try:
            # Get current KPIs
            kpis = await self.analyze_barber_pricing_kpis(db, barber_id)
            
            # Get pricing recommendations
            recommendations = await self.generate_pricing_recommendations(db, barber_id)
            
            # Get time-based analysis
            time_analysis = await self.analyze_time_based_pricing(db, barber_id)
            
            # Calculate pricing history and trends
            pricing_trends = await self._calculate_pricing_trends(db, barber_id)
            
            # Generate inflation adjustment recommendation
            inflation_adjustment = await self._calculate_inflation_adjustment(db, barber_id)
            
            return {
                "barber_id": barber_id,
                "current_kpis": {
                    "booking_rate": kpis.booking_rate,
                    "capacity_utilization": kpis.capacity_utilization,
                    "retention_rate": kpis.retention_rate,
                    "advance_booking_days": kpis.advance_booking_days,
                    "client_satisfaction": kpis.client_satisfaction,
                    "revenue_per_hour": kpis.revenue_per_hour,
                    "premium_time_demand": kpis.premium_time_demand,
                    "no_show_rate": kpis.no_show_rate
                },
                "pricing_recommendations": [
                    {
                        "id": rec.recommendation_id,
                        "trigger_type": rec.trigger_type.value,
                        "recommendation_type": rec.recommendation_type.value,
                        "recommended_increase": float(rec.recommended_increase),
                        "rationale": rec.rationale,
                        "celebration_message": rec.celebration_message,
                        "priority_score": rec.priority_score,
                        "valid_until": rec.valid_until.isoformat()
                    }
                    for rec in recommendations
                ],
                "time_based_opportunities": {
                    "before_hours_demand": time_analysis.before_hours_demand,
                    "after_hours_demand": time_analysis.after_hours_demand,
                    "weekend_demand": time_analysis.weekend_demand,
                    "recommended_premiums": {
                        category.value: premium 
                        for category, premium in time_analysis.recommended_premiums.items()
                    },
                    "revenue_opportunity": time_analysis.revenue_opportunity
                },
                "pricing_trends": pricing_trends,
                "inflation_adjustment": inflation_adjustment,
                "dashboard_insights": {
                    "top_opportunity": recommendations[0].rationale if recommendations else "No immediate opportunities",
                    "revenue_growth_potential": sum(rec.priority_score for rec in recommendations) * 100,
                    "pricing_readiness_score": self._calculate_pricing_readiness_score(kpis),
                    "next_review_date": (datetime.now() + timedelta(days=30)).isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get pricing dashboard for barber {barber_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")
    
    # Private helper methods
    
    def _is_premium_time(self, appointment_date: datetime.date, appointment_time: time) -> bool:
        """Check if appointment is during premium time hours"""
        # Weekend is premium
        if appointment_date.weekday() >= 5:
            return True
        
        # Before/after hours are premium
        before_start = self.time_categories[TimeOfDayCategory.BEFORE_HOURS]["start"]
        before_end = self.time_categories[TimeOfDayCategory.BEFORE_HOURS]["end"]
        after_start = self.time_categories[TimeOfDayCategory.AFTER_HOURS]["start"]
        after_end = self.time_categories[TimeOfDayCategory.AFTER_HOURS]["end"]
        
        return (before_start <= appointment_time < before_end) or (after_start <= appointment_time < after_end)
    
    async def _create_pricing_recommendation(
        self, 
        db: Session, 
        barber_id: int,
        trigger_type: PricingTriggerType,
        kpis: PricingKPIs,
        kpi_value: float,
        threshold: float
    ) -> PricingRecommendation:
        """Create a pricing recommendation based on triggered KPI"""
        
        # Calculate recommended increase based on trigger strength
        trigger_strength = (kpi_value - threshold) / threshold
        base_increase = 0.10  # 10% base increase
        max_increase = 0.25   # 25% max increase
        
        recommended_increase = Decimal(min(base_increase + (trigger_strength * 0.10), max_increase))
        
        # Generate rationale and celebration message
        rationale_templates = {
            PricingTriggerType.BOOKING_RATE: f"High booking demand ({kpi_value:.1f} bookings/week vs {threshold:.1f} threshold) indicates strong market position. Clients are consistently choosing your services.",
            PricingTriggerType.CAPACITY_UTILIZATION: f"Excellent capacity utilization ({kpi_value:.1%} vs {threshold:.1%} threshold) shows your time is in high demand. This is an ideal time for strategic pricing optimization.",
            PricingTriggerType.RETENTION_RATE: f"Outstanding client retention ({kpi_value:.1%} vs {threshold:.1%} threshold) demonstrates exceptional value delivery. Loyal clients will support quality-based pricing.",
            PricingTriggerType.ADVANCE_BOOKING: f"Clients booking {kpi_value:.1f} days ahead (vs {threshold:.1f} threshold) indicates premium positioning and planning demand.",
            PricingTriggerType.CLIENT_SATISFACTION: f"Exceptional satisfaction ratings ({kpi_value:.1f}/5.0 vs {threshold:.1f} threshold) reflect premium service delivery worthy of premium pricing."
        }
        
        celebration_templates = {
            PricingTriggerType.BOOKING_RATE: "🎉 Your popularity is soaring! Time to celebrate this success with a quality investment.",
            PricingTriggerType.CAPACITY_UTILIZATION: "🚀 You're in high demand! Let's invest in making your experience even more exceptional.",
            PricingTriggerType.RETENTION_RATE: "🌟 Your clients love coming back! Time to enhance the experience they already value.",
            PricingTriggerType.ADVANCE_BOOKING: "📅 Clients are planning ahead for YOU! This shows incredible trust and loyalty.",
            PricingTriggerType.CLIENT_SATISFACTION: "⭐ Your reviews speak volumes! Time to invest in the excellence your clients rave about."
        }
        
        # Calculate priority score
        priority_score = min(1.0, trigger_strength * 0.5 + 0.3)
        
        # Estimate impact
        impact_estimate = {
            "potential_revenue_increase": float(recommended_increase) * kpis.revenue_per_hour * 40,  # 40 hours/month
            "estimated_client_retention": max(0.85, kpis.retention_rate - 0.05),  # Slight retention decrease
            "booking_impact": "Minimal impact expected due to strong KPIs",
            "implementation_risk": "Low" if kpis.retention_rate > 0.75 else "Medium"
        }
        
        return PricingRecommendation(
            recommendation_id=str(uuid.uuid4()),
            barber_id=barber_id,
            trigger_type=trigger_type,
            recommendation_type=PricingRecommendationType.INCREASE_SERVICES,
            current_metrics=kpis,
            recommended_increase=recommended_increase,
            rationale=rationale_templates.get(trigger_type, "Performance metrics indicate pricing optimization opportunity."),
            impact_estimate=impact_estimate,
            celebration_message=celebration_templates.get(trigger_type, "🎉 Time to celebrate your success with a strategic investment!"),
            implementation_notes=f"Implement {float(recommended_increase):.1%} increase over 2-week period. Start with new clients, then existing clients with 1-week notice.",
            priority_score=priority_score,
            created_at=datetime.utcnow(),
            valid_until=datetime.utcnow() + timedelta(days=30)
        )
    
    async def _calculate_pricing_trends(self, db: Session, barber_id: int) -> Dict[str, Any]:
        """Calculate pricing trends over time"""
        # Placeholder implementation - would track historical pricing data
        return {
            "last_price_increase": "6 months ago",
            "average_annual_increase": "8.5%",
            "market_position": "Premium",
            "competitor_analysis": "15% below premium market leaders"
        }
    
    async def _calculate_inflation_adjustment(self, db: Session, barber_id: int) -> Dict[str, Any]:
        """Calculate recommended inflation-based pricing adjustment"""
        current_year = datetime.now().year
        
        # Placeholder inflation data - would integrate with economic APIs
        inflation_rate = 0.032  # 3.2% annual inflation
        
        return {
            "current_inflation_rate": inflation_rate,
            "recommended_adjustment": inflation_rate,
            "implementation_date": f"January 1, {current_year + 1}",
            "rationale": "Annual cost-of-living adjustment to maintain service quality and business sustainability",
            "client_message": f"Starting {current_year + 1}, we're implementing a modest {inflation_rate:.1%} adjustment to maintain our exceptional service standards in line with economic conditions."
        }
    
    def _calculate_pricing_readiness_score(self, kpis: PricingKPIs) -> float:
        """Calculate overall readiness for pricing increases (0-100)"""
        factors = {
            "booking_rate": min(1.0, kpis.booking_rate / 10.0) * 0.25,
            "capacity_utilization": kpis.capacity_utilization * 0.25,
            "retention_rate": kpis.retention_rate * 0.30,
            "satisfaction": (kpis.client_satisfaction / 5.0) * 0.20
        }
        
        readiness_score = sum(factors.values()) * 100
        return min(100.0, readiness_score)


# Global service instance
dynamic_pricing_service = DynamicPricingService()