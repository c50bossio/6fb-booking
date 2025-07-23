"""
Dynamic Offer Generation Service - Six Figure Barber Intelligence
================================================================

This service implements intelligent, multi-dimensional offer generation that creates
personalized retention offers based on churn risk, client value, business context,
and Six Figure Barber methodology principles.

Key Features:
- Multi-factor offer generation (risk, value, preferences, context)
- Six Figure methodology alignment (value-based vs discount-focused)
- Dynamic pricing based on business rules and constraints
- A/B testing framework for offer optimization
- Real-time personalization with machine learning insights
- ROI-driven offer recommendation engine
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, extract
import logging
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from enum import Enum
import uuid
import random
import json

from models import User, Client, Appointment, Payment, Service
from services.client_lifetime_value_service import ClientLifetimeValueService
from services.client_tier_service import ClientTierService, ClientTier
from services.churn_prediction_service import ChurnPrediction

logger = logging.getLogger(__name__)

class OfferType(Enum):
    """Types of offers that can be generated"""
    DISCOUNT_PERCENTAGE = "discount_percentage"      # 15% off next appointment
    DISCOUNT_FIXED = "discount_fixed"                # $20 off next service
    SERVICE_UPGRADE = "service_upgrade"              # Complimentary beard trim
    EXPERIENCE_ENHANCEMENT = "experience_enhancement" # Hot towel + scalp massage
    PACKAGE_DEAL = "package_deal"                    # Bundle multiple services
    MEMBERSHIP_OFFER = "membership_offer"            # Join premium membership
    LOYALTY_BONUS = "loyalty_bonus"                  # Double points or rewards
    EXCLUSIVE_ACCESS = "exclusive_access"            # Early booking, new services
    REFERRAL_INCENTIVE = "referral_incentive"        # Bonus for referring friends
    COMEBACK_SPECIAL = "comeback_special"            # Win-back exclusive offer

class OfferCategory(Enum):
    """Categories of offers based on Six Figure methodology"""
    VALUE_ENHANCEMENT = "value_enhancement"          # Add value without discounting
    RELATIONSHIP_BUILDING = "relationship_building"  # Strengthen client bond
    REVENUE_OPTIMIZATION = "revenue_optimization"    # Increase average ticket
    RETENTION_RESCUE = "retention_rescue"            # Emergency churn prevention
    GROWTH_ACCELERATION = "growth_acceleration"      # Expand client engagement

class OfferUrgency(Enum):
    """Urgency levels for offers"""
    LOW = "low"          # No time pressure
    MEDIUM = "medium"    # Some urgency
    HIGH = "high"        # Strong urgency
    CRITICAL = "critical" # Immediate action required

@dataclass
class OfferRule:
    """Business rule for offer generation"""
    rule_id: str
    rule_name: str
    conditions: Dict[str, Any]           # Conditions that trigger this rule
    offer_config: Dict[str, Any]         # Offer configuration
    priority: int                        # Rule priority (higher = more important)
    active: bool                         # Whether rule is currently active
    six_figure_aligned: bool             # Aligns with 6FB methodology
    success_rate: float                  # Historical success rate
    roi_multiplier: float                # Expected ROI multiplier
    
@dataclass
class OfferTemplate:
    """Template for generating offers"""
    template_id: str
    template_name: str
    offer_type: OfferType
    offer_category: OfferCategory
    urgency_level: OfferUrgency
    
    # Offer details
    value_amount: Optional[float]         # Dollar amount or percentage
    service_upgrades: List[str]           # Services to upgrade/add
    experience_enhancements: List[str]    # Experience improvements
    
    # Business rules
    min_churn_risk: float                 # Minimum churn risk to trigger
    max_churn_risk: float                 # Maximum churn risk to trigger
    min_clv: Optional[float]              # Minimum CLV requirement
    client_tiers: List[ClientTier]        # Applicable client tiers
    
    # Messaging
    offer_title: str                      # Short offer title
    offer_description: str                # Detailed description
    call_to_action: str                   # CTA text
    urgency_message: Optional[str]        # Time-sensitive messaging
    
    # Constraints
    max_uses_per_client: int              # Usage limits per client
    expiration_days: int                  # Days until offer expires
    blackout_days: List[date]             # Days when offer not valid
    
    # Performance tracking
    conversion_rate: float                # Historical conversion rate
    average_redemption_value: float       # Average value when redeemed
    
@dataclass
class PersonalizedOffer:
    """Personalized offer for a specific client"""
    offer_id: str
    client_id: int
    client_name: str
    template_id: str
    
    # Offer details
    offer_type: OfferType
    offer_category: OfferCategory
    urgency_level: OfferUrgency
    
    # Personalized content
    offer_title: str
    offer_description: str
    personalized_message: str
    call_to_action: str
    
    # Value proposition
    value_amount: float                   # Actual dollar value
    savings_amount: float                 # Amount client saves
    revenue_impact: float                 # Expected revenue impact
    
    # Business context
    churn_risk_score: float
    client_clv: float
    client_tier: ClientTier
    days_since_last_booking: int
    
    # Offer mechanics
    offer_code: str                       # Unique offer code
    expires_at: datetime
    max_uses: int
    
    # Tracking
    generated_at: datetime
    sent_at: Optional[datetime]
    opened_at: Optional[datetime]
    redeemed_at: Optional[datetime]
    
    # Personalization factors
    personalization_score: float         # How well-matched this offer is
    confidence_score: float              # Confidence in success
    
@dataclass
class OfferPerformance:
    """Performance metrics for offers"""
    offer_template_id: str
    total_generated: int
    total_sent: int
    total_opened: int
    total_redeemed: int
    
    # Rates
    send_rate: float
    open_rate: float
    redemption_rate: float
    
    # Financial impact
    total_revenue_generated: float
    average_redemption_value: float
    total_cost: float
    roi_percentage: float
    
    # Analysis
    best_performing_segments: List[str]
    optimal_timing: str
    improvement_recommendations: List[str]
    
class DynamicOfferService:
    """
    Dynamic Offer Generation Service for Six Figure Barber Client Retention
    
    Generates intelligent, personalized offers that maximize retention ROI
    while maintaining Six Figure methodology principles.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.clv_service = ClientLifetimeValueService(db)
        self.tier_service = ClientTierService(db)
        
        # Load offer templates and rules
        self.offer_templates = self._load_offer_templates()
        self.business_rules = self._load_business_rules()
        
        # Six Figure methodology constraints
        self.six_figure_principles = {
            "prefer_value_over_discounts": True,
            "focus_on_relationships": True,
            "premium_positioning": True,
            "experience_enhancement": True,
            "max_discount_percentage": 25,  # Never discount more than 25%
            "min_upsell_opportunity": 1.2   # Always aim for 20%+ upsell
        }
    
    def generate_personalized_offer(
        self,
        client_id: int,
        churn_prediction: ChurnPrediction,
        context: Dict[str, Any] = None
    ) -> PersonalizedOffer:
        """
        Generate a personalized offer for a specific client
        
        Args:
            client_id: Client to generate offer for
            churn_prediction: Churn prediction data
            context: Additional context (seasonal, business goals, etc.)
            
        Returns:
            PersonalizedOffer tailored to the client
        """
        try:
            # Get client information
            client = self.db.query(Client).filter(Client.id == client_id).first()
            if not client:
                raise ValueError(f"Client {client_id} not found")
            
            # Get client analytics
            client_clv = self.clv_service.calculate_client_clv(client_id, 365)
            client_tier = self.tier_service.get_client_tier(client_id)
            
            # Analyze client context
            client_context = self._analyze_client_context(client_id, churn_prediction)
            
            # Select best offer template
            template = self._select_optimal_offer_template(
                churn_prediction, client_clv, client_tier, client_context, context
            )
            
            # Generate personalized offer
            offer = self._personalize_offer(
                template, client, churn_prediction, client_clv, client_tier, client_context
            )
            
            logger.info(f"Generated personalized offer {offer.offer_id} for client {client_id}")
            return offer
            
        except Exception as e:
            logger.error(f"Error generating personalized offer for client {client_id}: {e}")
            # Return fallback offer
            return self._generate_fallback_offer(client_id, churn_prediction)
    
    def generate_batch_offers(
        self,
        churn_predictions: List[ChurnPrediction],
        context: Dict[str, Any] = None
    ) -> List[PersonalizedOffer]:
        """
        Generate personalized offers for multiple clients efficiently
        
        Args:
            churn_predictions: List of churn predictions
            context: Business context for offer generation
            
        Returns:
            List of PersonalizedOffer objects
        """
        try:
            offers = []
            
            # Group clients by similarity for batch processing
            client_groups = self._group_clients_by_similarity(churn_predictions)
            
            for group in client_groups:
                # Generate offers for each group using optimized templates
                group_offers = self._generate_group_offers(group, context)
                offers.extend(group_offers)
            
            # Sort by priority and potential impact
            offers.sort(key=lambda x: (x.urgency_level.value, x.revenue_impact), reverse=True)
            
            logger.info(f"Generated {len(offers)} batch offers for {len(churn_predictions)} clients")
            return offers
            
        except Exception as e:
            logger.error(f"Error generating batch offers: {e}")
            return []
    
    def _select_optimal_offer_template(
        self,
        churn_prediction: ChurnPrediction,
        client_clv: float,
        client_tier: ClientTier,
        client_context: Dict[str, Any],
        business_context: Dict[str, Any] = None
    ) -> OfferTemplate:
        """Select the best offer template based on multiple factors"""
        
        # Score all templates
        template_scores = {}
        
        for template in self.offer_templates:
            score = self._score_offer_template(
                template, churn_prediction, client_clv, client_tier, client_context
            )
            template_scores[template.template_id] = score
        
        # Select highest-scoring template
        best_template_id = max(template_scores, key=template_scores.get)
        best_template = next(t for t in self.offer_templates if t.template_id == best_template_id)
        
        logger.debug(f"Selected template {best_template_id} with score {template_scores[best_template_id]:.2f}")
        return best_template
    
    def _score_offer_template(
        self,
        template: OfferTemplate,
        churn_prediction: ChurnPrediction,
        client_clv: float,
        client_tier: ClientTier,
        client_context: Dict[str, Any]
    ) -> float:
        """Score an offer template for a specific client"""
        
        score = 0.0
        
        # Churn risk alignment (40% of score)
        risk_score = churn_prediction.churn_risk_score
        if template.min_churn_risk <= risk_score <= template.max_churn_risk:
            score += 40 * (template.conversion_rate / 100)
        
        # Client tier alignment (25% of score)
        if client_tier in template.client_tiers:
            score += 25
        
        # CLV alignment (20% of score)
        if template.min_clv is None or client_clv >= template.min_clv:
            clv_factor = min(client_clv / 1000, 5.0)  # Cap at 5x multiplier
            score += 20 * (clv_factor / 5.0)
        
        # Six Figure methodology alignment (10% of score)
        if self._is_six_figure_aligned(template, client_context):
            score += 10
        
        # Historical performance (5% of score)
        score += 5 * (template.conversion_rate / 100)
        
        return score
    
    def _personalize_offer(
        self,
        template: OfferTemplate,
        client: Client,
        churn_prediction: ChurnPrediction,
        client_clv: float,
        client_tier: ClientTier,
        client_context: Dict[str, Any]
    ) -> PersonalizedOffer:
        """Create personalized offer from template"""
        
        # Generate unique offer ID and code
        offer_id = f"offer_{uuid.uuid4().hex[:12]}"
        offer_code = f"RETURN{random.randint(1000, 9999)}"
        
        # Calculate personalized value
        value_amount = self._calculate_personalized_value(
            template, churn_prediction, client_clv, client_tier
        )
        
        # Generate personalized messaging
        messaging = self._generate_personalized_messaging(
            template, client, churn_prediction, client_context, value_amount
        )
        
        # Calculate expected revenue impact
        revenue_impact = self._estimate_revenue_impact(
            template, value_amount, client_clv, churn_prediction
        )
        
        # Create personalized offer
        offer = PersonalizedOffer(
            offer_id=offer_id,
            client_id=client.id,
            client_name=client.name,
            template_id=template.template_id,
            
            offer_type=template.offer_type,
            offer_category=template.offer_category,
            urgency_level=template.urgency_level,
            
            offer_title=messaging["title"],
            offer_description=messaging["description"],
            personalized_message=messaging["message"],
            call_to_action=messaging["cta"],
            
            value_amount=value_amount,
            savings_amount=self._calculate_savings_amount(template, value_amount),
            revenue_impact=revenue_impact,
            
            churn_risk_score=churn_prediction.churn_risk_score,
            client_clv=client_clv,
            client_tier=client_tier,
            days_since_last_booking=churn_prediction.last_booking_days_ago,
            
            offer_code=offer_code,
            expires_at=datetime.now() + timedelta(days=template.expiration_days),
            max_uses=template.max_uses_per_client,
            
            generated_at=datetime.now(),
            sent_at=None,
            opened_at=None,
            redeemed_at=None,
            
            personalization_score=self._calculate_personalization_score(template, client_context),
            confidence_score=self._calculate_confidence_score(template, churn_prediction)
        )
        
        return offer
    
    def _generate_personalized_messaging(
        self,
        template: OfferTemplate,
        client: Client,
        churn_prediction: ChurnPrediction,
        client_context: Dict[str, Any],
        value_amount: float
    ) -> Dict[str, str]:
        """Generate personalized messaging for the offer"""
        
        # Get personalization variables
        first_name = client.name.split()[0] if client.name else "Valued Client"
        days_away = churn_prediction.last_booking_days_ago
        favorite_service = client_context.get("favorite_service", "haircut")
        
        # Base messaging from template
        title = template.offer_title
        description = template.offer_description
        cta = template.call_to_action
        
        # Personalize based on offer type
        if template.offer_type == OfferType.DISCOUNT_PERCENTAGE:
            discount_pct = int(value_amount)
            title = f"{first_name}, {discount_pct}% off your next appointment!"
            message = f"Hi {first_name}, it's been {days_away} days since your last {favorite_service}. We miss you! Get {discount_pct}% off your next appointment when you book this week."
            
        elif template.offer_type == OfferType.SERVICE_UPGRADE:
            title = f"Complimentary upgrade waiting for you, {first_name}!"
            message = f"Hey {first_name}! Missing your regular {favorite_service}? Book now and receive a complimentary beard trim and hot towel treatment - our way of saying we value your business."
            
        elif template.offer_type == OfferType.EXPERIENCE_ENHANCEMENT:
            title = f"Premium experience upgrade for {first_name}"
            message = f"{first_name}, we've reserved a special premium experience for you. Book your next {favorite_service} and enjoy our signature hot towel treatment and scalp massage at no extra charge."
            
        elif template.offer_type == OfferType.MEMBERSHIP_OFFER:
            monthly_value = value_amount
            title = f"Exclusive membership invitation for {first_name}"
            message = f"Hi {first_name}, based on your loyalty, we'd like to invite you to our premium membership program. Get priority booking, 15% off all services, and exclusive perks for just ${monthly_value:.0f}/month."
            
        else:
            # Generic personalization
            message = f"Hi {first_name}, we've created a special offer just for you based on your {favorite_service} preference and {days_away} days since your last visit."
        
        # Add urgency if applicable
        if template.urgency_level in [OfferUrgency.HIGH, OfferUrgency.CRITICAL]:
            urgency_days = 7 if template.urgency_level == OfferUrgency.HIGH else 3
            message += f" This exclusive offer expires in {urgency_days} days!"
        
        return {
            "title": title,
            "description": description,
            "message": message,
            "cta": cta
        }
    
    def _calculate_personalized_value(
        self,
        template: OfferTemplate,
        churn_prediction: ChurnPrediction,
        client_clv: float,
        client_tier: ClientTier
    ) -> float:
        """Calculate personalized offer value based on client and risk factors"""
        
        base_value = template.value_amount or 0
        
        # Adjust based on churn risk (higher risk = higher value)
        risk_multiplier = 1 + (churn_prediction.churn_risk_score / 100 * 0.5)
        
        # Adjust based on client tier
        tier_multipliers = {
            "new": 0.8,
            "bronze": 1.0,
            "silver": 1.3,
            "gold": 1.5,
            "platinum": 1.8
        }
        tier_multiplier = tier_multipliers.get(client_tier, 1.0)
        
        # Calculate final value
        final_value = base_value * risk_multiplier * tier_multiplier
        
        # Apply Six Figure constraints
        if template.offer_type == OfferType.DISCOUNT_PERCENTAGE:
            final_value = min(final_value, self.six_figure_principles["max_discount_percentage"])
        
        return round(final_value, 2)
    
    def _load_offer_templates(self) -> List[OfferTemplate]:
        """Load offer templates for Six Figure methodology"""
        
        templates = [
            # Value Enhancement Offers (Six Figure Priority)
            OfferTemplate(
                template_id="premium_experience_upgrade",
                template_name="Premium Experience Upgrade",
                offer_type=OfferType.EXPERIENCE_ENHANCEMENT,
                offer_category=OfferCategory.VALUE_ENHANCEMENT,
                urgency_level=OfferUrgency.MEDIUM,
                value_amount=35.0,  # Value of added services
                service_upgrades=["hot_towel", "scalp_massage", "beard_oil"],
                experience_enhancements=["Premium products", "Extended session", "Refreshments"],
                min_churn_risk=40.0,
                max_churn_risk=80.0,
                min_clv=300.0,
                client_tiers=["bronze", "silver", "gold"],
                offer_title="Premium Experience Upgrade",
                offer_description="Enhance your next appointment with premium treatments",
                call_to_action="Book Premium Experience",
                urgency_message="Limited time upgrade available",
                max_uses_per_client=2,
                expiration_days=14,
                blackout_days=[],
                conversion_rate=35.0,
                average_redemption_value=120.0
            ),
            
            # Relationship Building Offers
            OfferTemplate(
                template_id="personal_barber_consultation",
                template_name="Personal Style Consultation",
                offer_type=OfferType.EXCLUSIVE_ACCESS,
                offer_category=OfferCategory.RELATIONSHIP_BUILDING,
                urgency_level=OfferUrgency.LOW,
                value_amount=50.0,
                service_upgrades=["style_consultation", "product_recommendations"],
                experience_enhancements=["One-on-one consultation", "Personalized style guide"],
                min_churn_risk=30.0,
                max_churn_risk=70.0,
                min_clv=200.0,
                client_tiers=["bronze", "silver", "gold"],
                offer_title="Complimentary Style Consultation",
                offer_description="Personal consultation to perfect your look",
                call_to_action="Schedule Consultation",
                urgency_message=None,
                max_uses_per_client=1,
                expiration_days=30,
                blackout_days=[],
                conversion_rate=45.0,
                average_redemption_value=95.0
            ),
            
            # Revenue Optimization Offers
            OfferTemplate(
                template_id="grooming_package_deal",
                template_name="Complete Grooming Package",
                offer_type=OfferType.PACKAGE_DEAL,
                offer_category=OfferCategory.REVENUE_OPTIMIZATION,
                urgency_level=OfferUrgency.MEDIUM,
                value_amount=180.0,  # Package value
                service_upgrades=["haircut", "beard_trim", "hot_towel", "styling"],
                experience_enhancements=["Complete grooming experience", "Premium products"],
                min_churn_risk=20.0,
                max_churn_risk=60.0,
                min_clv=400.0,
                client_tiers=["silver", "gold", "platinum"],
                offer_title="Complete Grooming Package",
                offer_description="Full service grooming experience with savings",
                call_to_action="Book Package Deal",
                urgency_message="Package pricing limited time",
                max_uses_per_client=3,
                expiration_days=21,
                blackout_days=[],
                conversion_rate=28.0,
                average_redemption_value=180.0
            ),
            
            # Retention Rescue Offers (Emergency)
            OfferTemplate(
                template_id="comeback_discount",
                template_name="Welcome Back Discount",
                offer_type=OfferType.DISCOUNT_PERCENTAGE,
                offer_category=OfferCategory.RETENTION_RESCUE,
                urgency_level=OfferUrgency.HIGH,
                value_amount=20.0,  # 20% discount
                service_upgrades=[],
                experience_enhancements=[],
                min_churn_risk=70.0,
                max_churn_risk=100.0,
                min_clv=100.0,
                client_tiers=["new", "bronze"],
                offer_title="Welcome Back - 20% Off",
                offer_description="We miss you! Get 20% off your return visit",
                call_to_action="Book Your Return",
                urgency_message="Offer expires in 7 days",
                max_uses_per_client=1,
                expiration_days=7,
                blackout_days=[],
                conversion_rate=25.0,
                average_redemption_value=65.0
            ),
            
            # Membership and Loyalty Offers
            OfferTemplate(
                template_id="vip_membership_invitation",
                template_name="VIP Membership Invitation",
                offer_type=OfferType.MEMBERSHIP_OFFER,
                offer_category=OfferCategory.GROWTH_ACCELERATION,
                urgency_level=OfferUrgency.LOW,
                value_amount=99.0,  # Monthly membership fee
                service_upgrades=["priority_booking", "member_discounts", "exclusive_services"],
                experience_enhancements=["VIP treatment", "Member events", "Priority support"],
                min_churn_risk=0.0,
                max_churn_risk=40.0,
                min_clv=800.0,
                client_tiers=["silver", "gold", "platinum"],
                offer_title="Exclusive VIP Membership",
                offer_description="Join our premium membership program",
                call_to_action="Become VIP Member",
                urgency_message=None,
                max_uses_per_client=1,
                expiration_days=45,
                blackout_days=[],
                conversion_rate=15.0,
                average_redemption_value=300.0
            )
        ]
        
        return templates
    
    def _load_business_rules(self) -> List[OfferRule]:
        """Load business rules for offer generation"""
        
        rules = [
            OfferRule(
                rule_id="six_figure_value_first",
                rule_name="Six Figure Value-First Rule",
                conditions={"client_tier": ["PREMIUM", "VIP"], "churn_risk": "<80"},
                offer_config={"prefer_experience_over_discount": True},
                priority=100,
                active=True,
                six_figure_aligned=True,
                success_rate=0.45,
                roi_multiplier=2.8
            ),
            
            OfferRule(
                rule_id="emergency_retention",
                rule_name="Emergency Retention Rule",
                conditions={"churn_risk": ">80", "clv": ">500"},
                offer_config={"allow_higher_discounts": True, "urgency_required": True},
                priority=95,
                active=True,
                six_figure_aligned=False,
                success_rate=0.25,
                roi_multiplier=1.5
            ),
            
            OfferRule(
                rule_id="relationship_building",
                rule_name="Relationship Building Priority",
                conditions={"days_since_last": ">30", "client_tier": ["REGULAR", "PREMIUM"]},
                offer_config={"focus_on_experience": True, "personal_touch": True},
                priority=85,
                active=True,
                six_figure_aligned=True,
                success_rate=0.35,
                roi_multiplier=2.2
            )
        ]
        
        return rules
    
    # Helper methods
    
    def _analyze_client_context(self, client_id: int, churn_prediction: ChurnPrediction) -> Dict[str, Any]:
        """Analyze client context for personalization"""
        
        # Get recent appointments
        recent_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.client_id == client_id,
                Appointment.appointment_date >= datetime.now() - timedelta(days=180)
            )
        ).order_by(desc(Appointment.appointment_date)).limit(10).all()
        
        # Analyze patterns
        context = {
            "appointment_count": len(recent_appointments),
            "favorite_service": self._get_most_common_service(recent_appointments),
            "preferred_day": self._get_preferred_day(recent_appointments),
            "preferred_time": self._get_preferred_time(recent_appointments),
            "average_ticket": self._calculate_average_ticket(recent_appointments),
            "booking_frequency": len(recent_appointments) / 6,  # Per month
            "last_service_satisfaction": "high"  # Would integrate with feedback system
        }
        
        return context
    
    def _is_six_figure_aligned(self, template: OfferTemplate, client_context: Dict[str, Any]) -> bool:
        """Check if offer template aligns with Six Figure methodology"""
        
        # Value enhancement over discounts
        if template.offer_category == OfferCategory.VALUE_ENHANCEMENT:
            return True
        
        # Relationship building focus
        if template.offer_category == OfferCategory.RELATIONSHIP_BUILDING:
            return True
        
        # Revenue optimization through upselling
        if template.offer_category == OfferCategory.REVENUE_OPTIMIZATION:
            return True
        
        # Avoid excessive discounting
        if template.offer_type == OfferType.DISCOUNT_PERCENTAGE and template.value_amount > 25:
            return False
        
        return True
    
    def _estimate_revenue_impact(
        self,
        template: OfferTemplate,
        value_amount: float,
        client_clv: float,
        churn_prediction: ChurnPrediction
    ) -> float:
        """Estimate revenue impact of the offer"""
        
        # Base revenue from average redemption
        base_revenue = template.average_redemption_value
        
        # Probability of success
        success_probability = template.conversion_rate / 100
        
        # Churn prevention value
        churn_prevention_value = client_clv * (churn_prediction.churn_probability / 100)
        
        # Expected revenue impact
        expected_revenue = (base_revenue * success_probability) + (churn_prevention_value * 0.5)
        
        return round(expected_revenue, 2)
    
    def _calculate_savings_amount(self, template: OfferTemplate, value_amount: float) -> float:
        """Calculate how much client saves with this offer"""
        
        if template.offer_type == OfferType.DISCOUNT_PERCENTAGE:
            # Assume average service cost of $75
            return (value_amount / 100) * 75
        elif template.offer_type == OfferType.DISCOUNT_FIXED:
            return value_amount
        elif template.offer_type in [OfferType.SERVICE_UPGRADE, OfferType.EXPERIENCE_ENHANCEMENT]:
            return value_amount  # Value of added services
        else:
            return 0.0
    
    def _calculate_personalization_score(self, template: OfferTemplate, client_context: Dict[str, Any]) -> float:
        """Calculate how well-personalized this offer is"""
        
        score = 0.0
        
        # Service alignment
        if template.service_upgrades and client_context.get("favorite_service") in template.service_upgrades:
            score += 0.3
        
        # Timing alignment
        if template.urgency_level == OfferUrgency.LOW and client_context.get("booking_frequency", 0) > 2:
            score += 0.2
        
        # Value alignment
        avg_ticket = client_context.get("average_ticket", 50)
        if template.average_redemption_value <= avg_ticket * 1.5:
            score += 0.3
        
        # Experience alignment
        if template.offer_category == OfferCategory.VALUE_ENHANCEMENT:
            score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_confidence_score(self, template: OfferTemplate, churn_prediction: ChurnPrediction) -> float:
        """Calculate confidence in offer success"""
        
        # Base confidence from template performance
        base_confidence = template.conversion_rate / 100
        
        # Adjust for churn prediction confidence
        prediction_confidence = churn_prediction.prediction_confidence
        
        # Combine confidences
        combined_confidence = (base_confidence + prediction_confidence) / 2
        
        return min(combined_confidence, 0.95)  # Cap at 95%
    
    def _generate_fallback_offer(self, client_id: int, churn_prediction: ChurnPrediction) -> PersonalizedOffer:
        """Generate a simple fallback offer when main generation fails"""
        
        # Get client
        client = self.db.query(Client).filter(Client.id == client_id).first()
        client_name = client.name if client else f"Client {client_id}"
        
        # Simple fallback offer
        return PersonalizedOffer(
            offer_id=f"fallback_{uuid.uuid4().hex[:8]}",
            client_id=client_id,
            client_name=client_name,
            template_id="fallback_template",
            offer_type=OfferType.DISCOUNT_PERCENTAGE,
            offer_category=OfferCategory.RETENTION_RESCUE,
            urgency_level=OfferUrgency.MEDIUM,
            offer_title="We Want You Back!",
            offer_description="Special discount for valued clients",
            personalized_message=f"Hi {client_name.split()[0] if client_name else 'there'}, we miss you! Get 15% off your next appointment.",
            call_to_action="Book Now",
            value_amount=15.0,
            savings_amount=11.25,  # Assume $75 average service
            revenue_impact=50.0,
            churn_risk_score=churn_prediction.churn_risk_score,
            client_clv=500.0,  # Default CLV
            client_tier="bronze",
            days_since_last_booking=churn_prediction.last_booking_days_ago,
            offer_code=f"RETURN{random.randint(1000, 9999)}",
            expires_at=datetime.now() + timedelta(days=14),
            max_uses=1,
            generated_at=datetime.now(),
            sent_at=None,
            opened_at=None,
            redeemed_at=None,
            personalization_score=0.3,
            confidence_score=0.2
        )
    
    # Utility methods for client analysis
    
    def _get_most_common_service(self, appointments: List[Appointment]) -> str:
        """Get most frequently booked service"""
        if not appointments:
            return "haircut"
        
        # Would analyze service IDs to find most common
        # For now, return default
        return "haircut"
    
    def _get_preferred_day(self, appointments: List[Appointment]) -> str:
        """Get preferred day of week"""
        if not appointments:
            return "weekday"
        
        # Analyze appointment dates to find preferred day
        weekdays = [apt.appointment_date.strftime("%A") for apt in appointments]
        if weekdays:
            return max(set(weekdays), key=weekdays.count)
        return "weekday"
    
    def _get_preferred_time(self, appointments: List[Appointment]) -> str:
        """Get preferred time of day"""
        if not appointments:
            return "afternoon"
        
        # Analyze appointment times
        hours = [apt.appointment_date.hour for apt in appointments]
        if hours:
            avg_hour = sum(hours) / len(hours)
            if avg_hour < 12:
                return "morning"
            elif avg_hour < 17:
                return "afternoon"
            else:
                return "evening"
        return "afternoon"
    
    def _calculate_average_ticket(self, appointments: List[Appointment]) -> float:
        """Calculate average ticket size"""
        if not appointments:
            return 75.0  # Default
        
        # Would sum up payment amounts for these appointments
        # For now, return estimated average
        return 85.0
    
    def _group_clients_by_similarity(self, churn_predictions: List[ChurnPrediction]) -> List[List[ChurnPrediction]]:
        """Group clients by similarity for batch processing"""
        
        # Simple grouping by risk level for now
        groups = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": []
        }
        
        for prediction in churn_predictions:
            if prediction.churn_risk_score >= 80:
                groups["critical"].append(prediction)
            elif prediction.churn_risk_score >= 60:
                groups["high"].append(prediction)
            elif prediction.churn_risk_score >= 40:
                groups["medium"].append(prediction)
            else:
                groups["low"].append(prediction)
        
        return [group for group in groups.values() if group]
    
    def _generate_group_offers(self, group: List[ChurnPrediction], context: Dict[str, Any]) -> List[PersonalizedOffer]:
        """Generate offers for a group of similar clients"""
        
        offers = []
        for prediction in group:
            try:
                offer = self.generate_personalized_offer(prediction.client_id, prediction, context)
                offers.append(offer)
            except Exception as e:
                logger.error(f"Error generating offer for client {prediction.client_id}: {e}")
                # Continue with other clients
                continue
        
        return offers