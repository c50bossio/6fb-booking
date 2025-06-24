from typing import Dict, List, Optional, Set
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from dataclasses import dataclass
from enum import Enum
import json
import logging

from models import Appointment, Client, Barber
from services.customer_segmentation_service import (
    CustomerSegment,
    CustomerSegmentationService,
)
from services.email_campaign_service import EmailCampaignService
from utils.cache import cache_result, monitor_performance


class CampaignType(Enum):
    """Types of marketing campaigns"""

    RETENTION = "retention"
    ACQUISITION = "acquisition"
    UPSELL = "upsell"
    WIN_BACK = "win_back"
    LOYALTY_REWARD = "loyalty_reward"
    SEASONAL_PROMOTION = "seasonal_promotion"
    REFERRAL_INCENTIVE = "referral_incentive"
    VIP_EXCLUSIVE = "vip_exclusive"


class PromotionType(Enum):
    """Types of promotions"""

    PERCENTAGE_DISCOUNT = "percentage_discount"
    FIXED_AMOUNT_DISCOUNT = "fixed_amount_discount"
    FREE_SERVICE = "free_service"
    BOGO = "buy_one_get_one"
    LOYALTY_POINTS = "loyalty_points"
    REFERRAL_CREDIT = "referral_credit"
    BIRTHDAY_SPECIAL = "birthday_special"
    VIP_UPGRADE = "vip_upgrade"


@dataclass
class CampaignTemplate:
    """Template for marketing campaigns"""

    name: str
    subject: str
    content: str
    call_to_action: str
    target_segments: List[CustomerSegment]
    promotion_type: Optional[PromotionType] = None
    discount_value: Optional[float] = None
    expiry_days: int = 30
    max_redemptions: Optional[int] = None


@dataclass
class PricingStrategy:
    """Segment-specific pricing strategy"""

    segment: CustomerSegment
    base_discount: float = 0.0
    loyalty_multiplier: float = 1.0
    frequency_bonus: float = 0.0
    spend_threshold_bonus: float = 0.0
    max_discount: float = 30.0


class SegmentationMarketingService:
    """
    Segmentation-based marketing and promotion service
    Provides targeted campaigns, personalized promotions, and retention strategies
    """

    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.segmentation_service = CustomerSegmentationService(db)
        self.email_service = EmailCampaignService(db)
        self.pricing_strategies = self._initialize_pricing_strategies()
        self.campaign_templates = self._initialize_campaign_templates()

    def _initialize_pricing_strategies(self) -> Dict[CustomerSegment, PricingStrategy]:
        """Initialize segment-specific pricing strategies"""
        return {
            CustomerSegment.VIP: PricingStrategy(
                segment=CustomerSegment.VIP,
                base_discount=15.0,
                loyalty_multiplier=1.3,
                frequency_bonus=5.0,
                spend_threshold_bonus=5.0,
                max_discount=25.0,
            ),
            CustomerSegment.CHAMPION: PricingStrategy(
                segment=CustomerSegment.CHAMPION,
                base_discount=20.0,
                loyalty_multiplier=1.5,
                frequency_bonus=5.0,
                spend_threshold_bonus=10.0,
                max_discount=30.0,
            ),
            CustomerSegment.LOYAL: PricingStrategy(
                segment=CustomerSegment.LOYAL,
                base_discount=10.0,
                loyalty_multiplier=1.2,
                frequency_bonus=3.0,
                spend_threshold_bonus=2.0,
                max_discount=20.0,
            ),
            CustomerSegment.AT_RISK: PricingStrategy(
                segment=CustomerSegment.AT_RISK,
                base_discount=25.0,
                loyalty_multiplier=1.4,
                frequency_bonus=0.0,
                spend_threshold_bonus=5.0,
                max_discount=35.0,
            ),
            CustomerSegment.HIGH_VALUE: PricingStrategy(
                segment=CustomerSegment.HIGH_VALUE,
                base_discount=12.0,
                loyalty_multiplier=1.25,
                frequency_bonus=3.0,
                spend_threshold_bonus=3.0,
                max_discount=22.0,
            ),
            CustomerSegment.NEW: PricingStrategy(
                segment=CustomerSegment.NEW,
                base_discount=20.0,
                loyalty_multiplier=1.0,
                frequency_bonus=0.0,
                spend_threshold_bonus=0.0,
                max_discount=20.0,
            ),
            CustomerSegment.ACTIVE: PricingStrategy(
                segment=CustomerSegment.ACTIVE,
                base_discount=5.0,
                loyalty_multiplier=1.1,
                frequency_bonus=2.0,
                spend_threshold_bonus=1.0,
                max_discount=15.0,
            ),
            CustomerSegment.SEASONAL: PricingStrategy(
                segment=CustomerSegment.SEASONAL,
                base_discount=15.0,
                loyalty_multiplier=1.2,
                frequency_bonus=0.0,
                spend_threshold_bonus=2.0,
                max_discount=25.0,
            ),
            CustomerSegment.DORMANT: PricingStrategy(
                segment=CustomerSegment.DORMANT,
                base_discount=30.0,
                loyalty_multiplier=1.3,
                frequency_bonus=0.0,
                spend_threshold_bonus=0.0,
                max_discount=40.0,
            ),
        }

    def _initialize_campaign_templates(self) -> Dict[CampaignType, CampaignTemplate]:
        """Initialize campaign templates"""
        return {
            CampaignType.RETENTION: CampaignTemplate(
                name="VIP Retention Campaign",
                subject="We Miss You! Special Offer Just for You",
                content="It's been a while since your last visit. As one of our valued clients, we'd love to welcome you back with a special offer.",
                call_to_action="Book Your Appointment Now",
                target_segments=[CustomerSegment.AT_RISK, CustomerSegment.VIP],
                promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
                discount_value=25.0,
                expiry_days=14,
            ),
            CampaignType.WIN_BACK: CampaignTemplate(
                name="Win Back Dormant Customers",
                subject="We Want You Back! Exclusive Comeback Offer",
                content="We've missed you! Come back and see what's new with our exclusive comeback offer.",
                call_to_action="Claim Your Offer",
                target_segments=[CustomerSegment.DORMANT],
                promotion_type=PromotionType.FIXED_AMOUNT_DISCOUNT,
                discount_value=30.0,
                expiry_days=21,
            ),
            CampaignType.LOYALTY_REWARD: CampaignTemplate(
                name="Loyalty Appreciation",
                subject="Thank You for Your Loyalty! Here's Your Reward",
                content="Your continued support means everything to us. Enjoy this special reward as our way of saying thank you.",
                call_to_action="Redeem Your Reward",
                target_segments=[CustomerSegment.LOYAL, CustomerSegment.CHAMPION],
                promotion_type=PromotionType.FREE_SERVICE,
                expiry_days=30,
            ),
            CampaignType.VIP_EXCLUSIVE: CampaignTemplate(
                name="VIP Exclusive Offer",
                subject="VIP Exclusive: Early Access to New Services",
                content="As our VIP client, you get first access to our latest services and exclusive pricing.",
                call_to_action="Book VIP Appointment",
                target_segments=[CustomerSegment.VIP, CustomerSegment.CHAMPION],
                promotion_type=PromotionType.VIP_UPGRADE,
                expiry_days=7,
            ),
            CampaignType.UPSELL: CampaignTemplate(
                name="Service Upgrade Offer",
                subject="Enhance Your Experience with Premium Services",
                content="Based on your preferences, we think you'd love our premium services. Try them at a special rate.",
                call_to_action="Upgrade Your Service",
                target_segments=[CustomerSegment.HIGH_VALUE, CustomerSegment.ACTIVE],
                promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
                discount_value=15.0,
                expiry_days=14,
            ),
            CampaignType.REFERRAL_INCENTIVE: CampaignTemplate(
                name="Referral Rewards Program",
                subject="Share the Love - Get Rewarded for Referrals",
                content="Know someone who'd love our services? Refer them and both of you get rewarded!",
                call_to_action="Refer a Friend",
                target_segments=[
                    CustomerSegment.CHAMPION,
                    CustomerSegment.VIP,
                    CustomerSegment.LOYAL,
                ],
                promotion_type=PromotionType.REFERRAL_CREDIT,
                discount_value=25.0,
                expiry_days=60,
            ),
            CampaignType.SEASONAL_PROMOTION: CampaignTemplate(
                name="Seasonal Special Offers",
                subject="Season's Greetings with Special Offers",
                content="Celebrate the season with our special promotional pricing on select services.",
                call_to_action="Book Seasonal Special",
                target_segments=[CustomerSegment.SEASONAL, CustomerSegment.ACTIVE],
                promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
                discount_value=20.0,
                expiry_days=30,
            ),
        }

    @cache_result(ttl_seconds=1800, key_prefix="targeted_campaigns")
    @monitor_performance
    def create_targeted_campaigns(
        self, barber_id: int, campaign_types: List[CampaignType] = None
    ) -> Dict:
        """
        Create targeted marketing campaigns based on customer segments
        """
        if campaign_types is None:
            campaign_types = list(CampaignType)

        # Get customer segments
        segments = self.segmentation_service.segment_customers(barber_id)

        campaigns = {}

        for campaign_type in campaign_types:
            template = self.campaign_templates.get(campaign_type)
            if not template:
                continue

            campaign_data = {
                "campaign_id": f"{campaign_type.value}_{barber_id}_{datetime.now().strftime('%Y%m%d')}",
                "name": template.name,
                "type": campaign_type.value,
                "template": {
                    "subject": template.subject,
                    "content": template.content,
                    "call_to_action": template.call_to_action,
                    "promotion_type": (
                        template.promotion_type.value
                        if template.promotion_type
                        else None
                    ),
                    "discount_value": template.discount_value,
                    "expiry_days": template.expiry_days,
                },
                "target_segments": [seg.value for seg in template.target_segments],
                "eligible_customers": [],
                "estimated_reach": 0,
                "personalized_offers": {},
            }

            # Find eligible customers
            eligible_customers = []
            for segment in template.target_segments:
                segment_customers = segments.get(segment.value, [])
                for customer in segment_customers:
                    # Create personalized offer
                    personalized_offer = self._create_personalized_offer(
                        customer, segment, template
                    )

                    customer_data = {
                        **customer,
                        "personalized_offer": personalized_offer,
                    }
                    eligible_customers.append(customer_data)

            campaign_data["eligible_customers"] = eligible_customers
            campaign_data["estimated_reach"] = len(eligible_customers)

            campaigns[campaign_type.value] = campaign_data

        return {
            "campaigns": campaigns,
            "total_campaigns": len(campaigns),
            "total_potential_reach": sum(
                c["estimated_reach"] for c in campaigns.values()
            ),
            "created_at": datetime.utcnow().isoformat(),
        }

    @cache_result(ttl_seconds=3600, key_prefix="personalized_promotions")
    @monitor_performance
    def generate_personalized_promotions(
        self, barber_id: int, client_id: int = None
    ) -> Dict:
        """
        Generate personalized promotions for specific customers or all customers
        """
        if client_id:
            clients = [self.db.query(Client).filter(Client.id == client_id).first()]
            if not clients[0]:
                return {"error": "Client not found"}
        else:
            clients = self.db.query(Client).filter(Client.barber_id == barber_id).all()

        promotions = {}

        for client in clients:
            if not client:
                continue

            # Get customer analytics
            analytics = self.segmentation_service._build_client_analytics(client)
            segment = self.segmentation_service._classify_customer(analytics)

            # Generate multiple promotion options
            client_promotions = []

            # 1. Segment-based promotion
            segment_promotion = self._generate_segment_promotion(
                client, segment, analytics
            )
            if segment_promotion:
                client_promotions.append(segment_promotion)

            # 2. Behavior-based promotion
            behavior_promotion = self._generate_behavior_promotion(client, analytics)
            if behavior_promotion:
                client_promotions.append(behavior_promotion)

            # 3. Time-sensitive promotion
            time_promotion = self._generate_time_sensitive_promotion(client, analytics)
            if time_promotion:
                client_promotions.append(time_promotion)

            promotions[str(client.id)] = {
                "client_id": client.id,
                "name": client.full_name,
                "email": client.email,
                "segment": segment.value,
                "promotions": client_promotions,
                "recommended_promotion": (
                    client_promotions[0] if client_promotions else None
                ),
                "generated_at": datetime.utcnow().isoformat(),
            }

        return {
            "personalized_promotions": promotions,
            "total_customers": len(promotions),
            "average_promotions_per_customer": (
                sum(len(p["promotions"]) for p in promotions.values()) / len(promotions)
                if promotions
                else 0
            ),
        }

    @cache_result(ttl_seconds=3600, key_prefix="pricing_strategies")
    @monitor_performance
    def get_segment_pricing_strategies(self, barber_id: int) -> Dict:
        """
        Get pricing strategies for each customer segment
        """
        segments = self.segmentation_service.segment_customers(barber_id)

        pricing_strategies = {}

        for segment_name, customers in segments.items():
            if not customers:
                continue

            segment_enum = CustomerSegment(segment_name)
            strategy = self.pricing_strategies.get(segment_enum)

            if strategy:
                # Calculate average discount for this segment
                total_discount = 0
                for customer in customers:
                    analytics = customer.get("analytics", {})
                    discount = self._calculate_dynamic_discount(analytics, strategy)
                    total_discount += discount

                avg_discount = total_discount / len(customers) if customers else 0

                pricing_strategies[segment_name] = {
                    "segment": segment_name,
                    "customer_count": len(customers),
                    "base_discount": strategy.base_discount,
                    "average_discount": round(avg_discount, 2),
                    "max_discount": strategy.max_discount,
                    "strategy_details": {
                        "loyalty_multiplier": strategy.loyalty_multiplier,
                        "frequency_bonus": strategy.frequency_bonus,
                        "spend_threshold_bonus": strategy.spend_threshold_bonus,
                    },
                    "example_offers": self._generate_example_offers(
                        segment_enum, strategy
                    ),
                }

        return {
            "pricing_strategies": pricing_strategies,
            "updated_at": datetime.utcnow().isoformat(),
        }

    @cache_result(ttl_seconds=1800, key_prefix="retention_campaigns")
    @monitor_performance
    def create_retention_campaigns(self, barber_id: int) -> Dict:
        """
        Create specific retention campaigns for at-risk customers
        """
        at_risk_customers = self.segmentation_service.identify_at_risk_customers(
            barber_id
        )

        retention_campaigns = {
            "immediate_intervention": [],  # Risk score >= 80
            "urgent_outreach": [],  # Risk score 60-79
            "gentle_reminder": [],  # Risk score 40-59
            "monitoring": [],  # Risk score < 40
        }

        for customer in at_risk_customers:
            risk_score = customer.get("risk_score", 0)
            analytics = customer.get("analytics", {})

            # Determine campaign type based on risk score
            if risk_score >= 80:
                campaign_type = "immediate_intervention"
                offer = self._create_retention_offer(customer, "aggressive")
            elif risk_score >= 60:
                campaign_type = "urgent_outreach"
                offer = self._create_retention_offer(customer, "moderate")
            elif risk_score >= 40:
                campaign_type = "gentle_reminder"
                offer = self._create_retention_offer(customer, "gentle")
            else:
                campaign_type = "monitoring"
                offer = self._create_retention_offer(customer, "minimal")

            campaign_data = {
                **customer,
                "retention_offer": offer,
                "recommended_contact_method": self._get_preferred_contact_method(
                    customer
                ),
                "campaign_priority": self._calculate_campaign_priority(
                    risk_score, analytics
                ),
                "estimated_retention_probability": self._estimate_retention_probability(
                    customer
                ),
            }

            retention_campaigns[campaign_type].append(campaign_data)

        # Calculate campaign statistics
        total_at_risk = len(at_risk_customers)
        campaign_stats = {
            campaign_type: {
                "count": len(customers),
                "percentage": (
                    round(len(customers) / total_at_risk * 100, 1)
                    if total_at_risk > 0
                    else 0
                ),
                "estimated_value_at_risk": sum(
                    c.get("total_spent", 0) for c in customers
                ),
            }
            for campaign_type, customers in retention_campaigns.items()
        }

        return {
            "retention_campaigns": retention_campaigns,
            "campaign_statistics": campaign_stats,
            "total_at_risk_customers": total_at_risk,
            "estimated_total_value_at_risk": sum(
                c.get("total_spent", 0) for c in at_risk_customers
            ),
            "created_at": datetime.utcnow().isoformat(),
        }

    def _create_personalized_offer(
        self, customer: Dict, segment: CustomerSegment, template: CampaignTemplate
    ) -> Dict:
        """
        Create personalized offer for a customer
        """
        analytics = customer.get("analytics", {})
        strategy = self.pricing_strategies.get(segment)

        if not strategy:
            return {}

        discount = self._calculate_dynamic_discount(analytics, strategy)

        return {
            "discount_percentage": round(discount, 1),
            "promotion_type": (
                template.promotion_type.value if template.promotion_type else "general"
            ),
            "discount_value": template.discount_value,
            "expiry_date": (
                datetime.now() + timedelta(days=template.expiry_days)
            ).isoformat(),
            "personalization": {
                "segment": segment.value,
                "lifetime_value": analytics.get("lifetime_value", 0),
                "visit_frequency": analytics.get("average_days_between_visits", 0),
                "preferred_services": analytics.get("service_preferences", [])[
                    :3
                ],  # Top 3
            },
        }

    def _calculate_dynamic_discount(
        self, analytics: Dict, strategy: PricingStrategy
    ) -> float:
        """
        Calculate dynamic discount based on customer analytics and strategy
        """
        base_discount = strategy.base_discount

        # Loyalty bonus
        months_as_customer = analytics.get("months_as_customer", 0)
        loyalty_bonus = min(10, months_as_customer * 0.2) * (
            strategy.loyalty_multiplier - 1
        )

        # Frequency bonus
        avg_days_between_visits = analytics.get("average_days_between_visits", 60)
        if avg_days_between_visits <= 30:
            frequency_bonus = strategy.frequency_bonus
        else:
            frequency_bonus = 0

        # Spending threshold bonus
        total_spent = analytics.get("total_spent", 0)
        if total_spent >= 500:
            spend_bonus = strategy.spend_threshold_bonus
        else:
            spend_bonus = 0

        total_discount = base_discount + loyalty_bonus + frequency_bonus + spend_bonus
        return min(total_discount, strategy.max_discount)

    def _generate_segment_promotion(
        self, client: Client, segment: CustomerSegment, analytics: Dict
    ) -> Dict:
        """
        Generate segment-specific promotion
        """
        strategy = self.pricing_strategies.get(segment)
        if not strategy:
            return {}

        discount = self._calculate_dynamic_discount(analytics, strategy)

        return {
            "type": "segment_based",
            "title": f"{segment.value.title()} Customer Special",
            "description": f"Exclusive offer for our {segment.value} customers",
            "discount_percentage": round(discount, 1),
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
            "conditions": f"Valid for {segment.value} tier customers only",
        }

    def _generate_behavior_promotion(self, client: Client, analytics: Dict) -> Dict:
        """
        Generate behavior-based promotion
        """
        total_visits = analytics.get("total_visits", 0)
        avg_days_between_visits = analytics.get("average_days_between_visits", 60)

        if total_visits >= 10 and avg_days_between_visits <= 30:
            return {
                "type": "loyalty_reward",
                "title": "Frequent Visitor Reward",
                "description": "Thank you for being a regular! Enjoy this special discount.",
                "discount_percentage": 15.0,
                "valid_until": (datetime.now() + timedelta(days=45)).isoformat(),
                "conditions": "For customers with 10+ visits and regular frequency",
            }
        elif analytics.get("days_since_visit", 0) > 60:
            return {
                "type": "welcome_back",
                "title": "Welcome Back Offer",
                "description": "We've missed you! Come back with this special offer.",
                "discount_percentage": 20.0,
                "valid_until": (datetime.now() + timedelta(days=21)).isoformat(),
                "conditions": "For returning customers",
            }

        return {}

    def _generate_time_sensitive_promotion(
        self, client: Client, analytics: Dict
    ) -> Dict:
        """
        Generate time-sensitive promotion
        """
        # Check if it's near their birthday
        if client.date_of_birth:
            today = date.today()
            birthday_this_year = client.date_of_birth.replace(year=today.year)
            days_to_birthday = (birthday_this_year - today).days

            if -7 <= days_to_birthday <= 30:  # Within 7 days past or 30 days before
                return {
                    "type": "birthday_special",
                    "title": "Birthday Special Offer",
                    "description": "Celebrate your special day with us!",
                    "discount_percentage": 25.0,
                    "valid_until": (datetime.now() + timedelta(days=14)).isoformat(),
                    "conditions": "Birthday month special offer",
                }

        # Check for seasonal promotions
        month = date.today().month
        if month in [11, 12]:  # Holiday season
            return {
                "type": "holiday_special",
                "title": "Holiday Season Special",
                "description": "Celebrate the holidays with a fresh new look!",
                "discount_percentage": 15.0,
                "valid_until": (datetime.now() + timedelta(days=60)).isoformat(),
                "conditions": "Limited time holiday offer",
            }

        return {}

    def _generate_example_offers(
        self, segment: CustomerSegment, strategy: PricingStrategy
    ) -> List[Dict]:
        """
        Generate example offers for a segment
        """
        examples = []

        # Low-tier customer example
        examples.append(
            {
                "customer_profile": "New customer, 1 visit, $50 spent",
                "discount": round(strategy.base_discount, 1),
                "offer": f"{strategy.base_discount}% off next service",
            }
        )

        # Mid-tier customer example
        mid_discount = min(
            strategy.base_discount + strategy.frequency_bonus + 2, strategy.max_discount
        )
        examples.append(
            {
                "customer_profile": "Regular customer, 5 visits, $200 spent",
                "discount": round(mid_discount, 1),
                "offer": f"{mid_discount}% off next service",
            }
        )

        # High-tier customer example
        examples.append(
            {
                "customer_profile": "Loyal customer, 15 visits, $800 spent",
                "discount": round(strategy.max_discount, 1),
                "offer": f"{strategy.max_discount}% off next service + VIP perks",
            }
        )

        return examples

    def _create_retention_offer(self, customer: Dict, intensity: str) -> Dict:
        """
        Create retention offer based on intensity level
        """
        base_offers = {
            "aggressive": {
                "discount": 35,
                "additional_perks": [
                    "Free consultation",
                    "Complimentary product",
                    "Priority booking",
                ],
                "urgency": "Limited time - expires in 7 days",
            },
            "moderate": {
                "discount": 25,
                "additional_perks": ["Free consultation", "Priority booking"],
                "urgency": "Special offer expires in 14 days",
            },
            "gentle": {
                "discount": 15,
                "additional_perks": ["Loyalty points bonus"],
                "urgency": "Valid for 21 days",
            },
            "minimal": {
                "discount": 10,
                "additional_perks": ["Newsletter with tips"],
                "urgency": "No expiration",
            },
        }

        offer = base_offers.get(intensity, base_offers["minimal"])
        analytics = customer.get("analytics", {})

        # Customize based on customer history
        preferred_services = analytics.get("service_preferences", [])
        if preferred_services:
            offer["recommended_service"] = preferred_services[0].get(
                "service", "Standard Service"
            )

        return offer

    def _get_preferred_contact_method(self, customer: Dict) -> str:
        """
        Get preferred contact method for customer
        """
        # This could be enhanced with actual customer preferences
        # For now, defaulting to email for most, SMS for high-risk
        risk_score = customer.get("risk_score", 0)

        if risk_score >= 80:
            return "phone_call"  # Personal touch for highest risk
        elif risk_score >= 60:
            return "sms"  # More immediate than email
        else:
            return "email"  # Standard communication

    def _calculate_campaign_priority(self, risk_score: float, analytics: Dict) -> str:
        """
        Calculate campaign priority
        """
        total_spent = analytics.get("total_spent", 0)

        if risk_score >= 80 and total_spent >= 500:
            return "critical"
        elif risk_score >= 60:
            return "high"
        elif risk_score >= 40:
            return "medium"
        else:
            return "low"

    def _estimate_retention_probability(self, customer: Dict) -> float:
        """
        Estimate retention probability based on customer data
        """
        risk_score = customer.get("risk_score", 0)
        analytics = customer.get("analytics", {})

        # Base retention probability (inverse of risk)
        base_retention = max(0.1, (100 - risk_score) / 100)

        # Adjust based on customer value
        total_spent = analytics.get("total_spent", 0)
        value_multiplier = min(1.3, 1 + (total_spent / 1000))

        # Adjust based on loyalty
        months_as_customer = analytics.get("months_as_customer", 0)
        loyalty_multiplier = min(1.2, 1 + (months_as_customer / 24))

        retention_probability = base_retention * value_multiplier * loyalty_multiplier
        return min(0.95, retention_probability)  # Cap at 95%
