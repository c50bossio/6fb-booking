from typing import Dict, List, Optional, Tuple, Set
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from dataclasses import dataclass
from enum import Enum
import json
import logging

from models import Appointment, Client, Barber
from utils.cache import cache_result, monitor_performance


class CustomerSegment(Enum):
    """Customer segment types"""

    NEW = "new"
    ACTIVE = "active"
    VIP = "vip"
    AT_RISK = "at_risk"
    LOYAL = "loyal"
    HIGH_VALUE = "high_value"
    SEASONAL = "seasonal"
    CHAMPION = "champion"
    DORMANT = "dormant"


class LoyaltyTier(Enum):
    """Loyalty tier classification"""

    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


@dataclass
class SegmentCriteria:
    """Criteria for customer segmentation"""

    # VIP Criteria
    vip_min_spending: float = 1000.0  # Minimum annual spending for VIP
    vip_min_visits: int = 12  # Minimum visits per year for VIP

    # At-risk Criteria
    at_risk_days: int = 45  # Days since last visit to be considered at-risk

    # High-value Criteria
    high_value_percentile: float = 0.8  # Top 20% of customers by spending

    # Loyalty Criteria
    loyal_min_visits: int = 6  # Minimum visits for loyalty consideration
    loyal_min_months: int = 6  # Minimum months as customer for loyalty

    # Champion Criteria (VIP + High engagement)
    champion_min_spending: float = 2000.0
    champion_min_visits: int = 20
    champion_min_referrals: int = 2

    # Seasonal Criteria
    seasonal_visit_variance: float = (
        0.3  # Variance in monthly visits for seasonal classification
    )


class CustomerSegmentationService:
    """
    Comprehensive customer segmentation service for 6FB booking platform
    Provides automatic segmentation, analytics, and marketing campaign support
    """

    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.criteria = SegmentCriteria()

    @cache_result(ttl_seconds=1800, key_prefix="customer_segments")
    @monitor_performance
    def segment_customers(
        self, barber_id: int, force_refresh: bool = False
    ) -> Dict[str, List[Dict]]:
        """
        Automatically segment all customers for a barber based on behavior patterns
        """
        # Get all clients for the barber
        clients = self.db.query(Client).filter(Client.barber_id == barber_id).all()

        segments = {segment.value: [] for segment in CustomerSegment}

        for client in clients:
            client_data = self._build_client_analytics(client)
            segment = self._classify_customer(client_data)

            segments[segment.value].append(
                {
                    "client_id": client.id,
                    "name": client.full_name,
                    "email": client.email,
                    "segment": segment.value,
                    "analytics": client_data,
                    "last_updated": datetime.utcnow().isoformat(),
                }
            )

        # Update client records with new segments
        self._update_client_segments(barber_id, segments)

        return segments

    @cache_result(ttl_seconds=3600, key_prefix="vip_customers")
    @monitor_performance
    def identify_vip_customers(self, barber_id: int) -> List[Dict]:
        """
        Identify VIP customers based on spending and visit frequency
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=365)  # Last 12 months

        # Get high-spending customers
        client_spending = (
            self.db.query(
                Client.id,
                Client.first_name,
                Client.last_name,
                Client.email,
                func.sum(
                    Appointment.service_revenue
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("total_spending"),
                func.count(Appointment.id).label("visit_count"),
            )
            .join(Appointment)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.status == "completed",
                )
            )
            .group_by(Client.id, Client.first_name, Client.last_name, Client.email)
            .having(
                and_(
                    func.sum(
                        Appointment.service_revenue
                        + func.coalesce(Appointment.tip_amount, 0)
                        + func.coalesce(Appointment.product_revenue, 0)
                    )
                    >= self.criteria.vip_min_spending,
                    func.count(Appointment.id) >= self.criteria.vip_min_visits,
                )
            )
            .order_by(desc("total_spending"))
            .all()
        )

        vip_customers = []
        for client_data in client_spending:
            client = self.db.query(Client).filter(Client.id == client_data.id).first()
            analytics = self._build_client_analytics(client)

            vip_customers.append(
                {
                    "client_id": client_data.id,
                    "name": f"{client_data.first_name} {client_data.last_name}",
                    "email": client_data.email,
                    "total_spending": float(client_data.total_spending),
                    "visit_count": client_data.visit_count,
                    "analytics": analytics,
                    "vip_since": analytics.get("first_visit_date"),
                    "loyalty_tier": self._calculate_loyalty_tier(analytics).value,
                }
            )

        return vip_customers

    @cache_result(ttl_seconds=1800, key_prefix="at_risk_customers")
    @monitor_performance
    def identify_at_risk_customers(self, barber_id: int) -> List[Dict]:
        """
        Identify at-risk customers who haven't booked in 45+ days
        """
        at_risk_date = date.today() - timedelta(days=self.criteria.at_risk_days)

        # Find customers with last visit before at_risk_date
        at_risk_clients = (
            self.db.query(Client)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Client.last_visit_date < at_risk_date,
                    Client.total_visits > 1,  # Exclude one-time customers
                )
            )
            .order_by(Client.last_visit_date)
            .all()
        )

        at_risk_customers = []
        for client in at_risk_clients:
            days_since_visit = (date.today() - client.last_visit_date).days
            analytics = self._build_client_analytics(client)

            # Calculate risk score (higher = more at risk)
            risk_score = min(100, (days_since_visit / self.criteria.at_risk_days) * 100)

            at_risk_customers.append(
                {
                    "client_id": client.id,
                    "name": client.full_name,
                    "email": client.email,
                    "last_visit_date": (
                        client.last_visit_date.isoformat()
                        if client.last_visit_date
                        else None
                    ),
                    "days_since_visit": days_since_visit,
                    "risk_score": round(risk_score, 1),
                    "total_spent": client.total_spent,
                    "visit_frequency": analytics.get("average_days_between_visits"),
                    "analytics": analytics,
                    "recommended_action": self._get_retention_recommendation(
                        risk_score, analytics
                    ),
                }
            )

        return at_risk_customers

    @cache_result(ttl_seconds=3600, key_prefix="new_customers")
    @monitor_performance
    def track_new_customer_onboarding(self, barber_id: int, days: int = 30) -> Dict:
        """
        Track new customer onboarding progress and conversion rates
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        # Get new customers in the period
        new_customers = (
            self.db.query(Client)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Client.first_visit_date >= start_date,
                    Client.first_visit_date <= end_date,
                )
            )
            .all()
        )

        onboarding_data = {
            "period_days": days,
            "total_new_customers": len(new_customers),
            "onboarding_stages": {
                "first_visit_only": 0,
                "second_visit_scheduled": 0,
                "second_visit_completed": 0,
                "becoming_regular": 0,  # 3+ visits
            },
            "conversion_rates": {},
            "new_customers": [],
        }

        for client in new_customers:
            analytics = self._build_client_analytics(client)
            visit_count = analytics.get("total_visits", 0)

            # Classify onboarding stage
            if visit_count == 1:
                onboarding_data["onboarding_stages"]["first_visit_only"] += 1
                stage = "first_visit_only"
            elif visit_count == 2:
                onboarding_data["onboarding_stages"]["second_visit_completed"] += 1
                stage = "second_visit_completed"
            elif visit_count >= 3:
                onboarding_data["onboarding_stages"]["becoming_regular"] += 1
                stage = "becoming_regular"
            else:
                stage = "first_visit_only"

            onboarding_data["new_customers"].append(
                {
                    "client_id": client.id,
                    "name": client.full_name,
                    "email": client.email,
                    "first_visit_date": (
                        client.first_visit_date.isoformat()
                        if client.first_visit_date
                        else None
                    ),
                    "total_visits": visit_count,
                    "total_spent": analytics.get("total_spent", 0),
                    "onboarding_stage": stage,
                    "analytics": analytics,
                }
            )

        # Calculate conversion rates
        total = onboarding_data["total_new_customers"]
        if total > 0:
            onboarding_data["conversion_rates"] = {
                "first_to_second_visit": (
                    (
                        onboarding_data["onboarding_stages"]["second_visit_completed"]
                        + onboarding_data["onboarding_stages"]["becoming_regular"]
                    )
                    / total
                    * 100
                ),
                "becoming_regular": (
                    onboarding_data["onboarding_stages"]["becoming_regular"]
                    / total
                    * 100
                ),
            }

        return onboarding_data

    @cache_result(ttl_seconds=3600, key_prefix="loyalty_tiers")
    @monitor_performance
    def classify_loyalty_tiers(self, barber_id: int) -> Dict[str, List[Dict]]:
        """
        Classify customers into loyalty tiers based on engagement and spending
        """
        clients = self.db.query(Client).filter(Client.barber_id == barber_id).all()

        tiers = {tier.value: [] for tier in LoyaltyTier}

        for client in clients:
            analytics = self._build_client_analytics(client)
            tier = self._calculate_loyalty_tier(analytics)

            tiers[tier.value].append(
                {
                    "client_id": client.id,
                    "name": client.full_name,
                    "email": client.email,
                    "loyalty_tier": tier.value,
                    "analytics": analytics,
                    "tier_benefits": self._get_tier_benefits(tier),
                }
            )

        return tiers

    def _build_client_analytics(self, client: Client) -> Dict:
        """
        Build comprehensive analytics for a client
        """
        # Get all completed appointments
        appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.client_id == client.id,
                    Appointment.status == "completed",
                )
            )
            .order_by(Appointment.appointment_date)
            .all()
        )

        if not appointments:
            return {
                "total_visits": 0,
                "total_spent": 0.0,
                "average_ticket": 0.0,
                "first_visit_date": None,
                "last_visit_date": None,
                "average_days_between_visits": 0,
                "lifetime_value": 0.0,
                "seasonal_patterns": {},
                "service_preferences": [],
                "booking_patterns": {},
            }

        # Basic metrics
        total_visits = len(appointments)
        total_spent = sum(apt.total_revenue for apt in appointments)
        average_ticket = total_spent / total_visits if total_visits > 0 else 0.0

        # Visit patterns
        first_visit = appointments[0].appointment_date
        last_visit = appointments[-1].appointment_date

        # Calculate average days between visits
        if total_visits > 1:
            total_days = (last_visit - first_visit).days
            average_days_between_visits = total_days / (total_visits - 1)
        else:
            average_days_between_visits = 0

        # Lifetime value calculation
        if average_days_between_visits > 0:
            visits_per_year = 365 / average_days_between_visits
            lifetime_value = average_ticket * visits_per_year
        else:
            lifetime_value = average_ticket

        # Seasonal patterns
        seasonal_patterns = self._analyze_seasonal_patterns(appointments)

        # Service preferences
        service_preferences = self._analyze_service_preferences(appointments)

        # Booking patterns
        booking_patterns = self._analyze_booking_patterns(appointments)

        return {
            "total_visits": total_visits,
            "total_spent": round(total_spent, 2),
            "average_ticket": round(average_ticket, 2),
            "first_visit_date": first_visit.isoformat(),
            "last_visit_date": last_visit.isoformat(),
            "average_days_between_visits": round(average_days_between_visits, 1),
            "lifetime_value": round(lifetime_value, 2),
            "seasonal_patterns": seasonal_patterns,
            "service_preferences": service_preferences,
            "booking_patterns": booking_patterns,
            "months_as_customer": self._calculate_months_as_customer(first_visit),
            "referrals_made": client.referral_count or 0,
            "no_show_rate": self._calculate_no_show_rate(client),
            "tip_percentage": self._calculate_average_tip_percentage(appointments),
        }

    def _classify_customer(self, analytics: Dict) -> CustomerSegment:
        """
        Classify customer into appropriate segment based on analytics
        """
        total_visits = analytics.get("total_visits", 0)
        total_spent = analytics.get("total_spent", 0)
        last_visit_date = analytics.get("last_visit_date")
        months_as_customer = analytics.get("months_as_customer", 0)
        referrals = analytics.get("referrals_made", 0)

        # Calculate days since last visit
        if last_visit_date:
            days_since_visit = (date.today() - date.fromisoformat(last_visit_date)).days
        else:
            days_since_visit = 999  # Very high number for new customers

        # Classification logic
        if total_visits == 0:
            return CustomerSegment.NEW
        elif days_since_visit > 90:
            return CustomerSegment.DORMANT
        elif days_since_visit > self.criteria.at_risk_days:
            return CustomerSegment.AT_RISK
        elif (
            total_spent >= self.criteria.champion_min_spending
            and total_visits >= self.criteria.champion_min_visits
            and referrals >= self.criteria.champion_min_referrals
        ):
            return CustomerSegment.CHAMPION
        elif (
            total_spent >= self.criteria.vip_min_spending
            and total_visits >= self.criteria.vip_min_visits
        ):
            return CustomerSegment.VIP
        elif total_spent >= self._get_high_value_threshold():
            return CustomerSegment.HIGH_VALUE
        elif (
            total_visits >= self.criteria.loyal_min_visits
            and months_as_customer >= self.criteria.loyal_min_months
        ):
            return CustomerSegment.LOYAL
        elif self._is_seasonal_customer(analytics):
            return CustomerSegment.SEASONAL
        else:
            return CustomerSegment.ACTIVE

    def _calculate_loyalty_tier(self, analytics: Dict) -> LoyaltyTier:
        """
        Calculate loyalty tier based on comprehensive metrics
        """
        total_spent = analytics.get("total_spent", 0)
        total_visits = analytics.get("total_visits", 0)
        months_as_customer = analytics.get("months_as_customer", 0)

        # Scoring system
        spending_score = min(40, total_spent / 50)  # $50 = 1 point, max 40 points
        visit_score = min(30, total_visits * 2)  # 1 visit = 2 points, max 30 points
        tenure_score = min(20, months_as_customer)  # 1 month = 1 point, max 20 points
        loyalty_score = min(
            10, analytics.get("referrals_made", 0) * 5
        )  # 1 referral = 5 points, max 10 points

        total_score = spending_score + visit_score + tenure_score + loyalty_score

        if total_score >= 85:
            return LoyaltyTier.DIAMOND
        elif total_score >= 70:
            return LoyaltyTier.PLATINUM
        elif total_score >= 50:
            return LoyaltyTier.GOLD
        elif total_score >= 30:
            return LoyaltyTier.SILVER
        else:
            return LoyaltyTier.BRONZE

    def _analyze_seasonal_patterns(self, appointments: List[Appointment]) -> Dict:
        """
        Analyze seasonal booking patterns
        """
        monthly_visits = {}
        for apt in appointments:
            month = apt.appointment_date.month
            monthly_visits[month] = monthly_visits.get(month, 0) + 1

        if not monthly_visits:
            return {}

        # Calculate variance to identify seasonal patterns
        visits = list(monthly_visits.values())
        mean_visits = sum(visits) / len(visits)
        variance = sum((v - mean_visits) ** 2 for v in visits) / len(visits)

        return {
            "monthly_distribution": monthly_visits,
            "variance": round(variance, 2),
            "peak_months": [
                month
                for month, count in monthly_visits.items()
                if count > mean_visits * 1.2
            ],
            "low_months": [
                month
                for month, count in monthly_visits.items()
                if count < mean_visits * 0.8
            ],
        }

    def _analyze_service_preferences(
        self, appointments: List[Appointment]
    ) -> List[Dict]:
        """
        Analyze customer's service preferences
        """
        service_count = {}
        service_revenue = {}

        for apt in appointments:
            service = apt.service_name or "Standard Service"
            service_count[service] = service_count.get(service, 0) + 1
            service_revenue[service] = service_revenue.get(service, 0) + (
                apt.service_revenue or 0
            )

        preferences = []
        for service, count in service_count.items():
            preferences.append(
                {
                    "service": service,
                    "frequency": count,
                    "percentage": round(count / len(appointments) * 100, 1),
                    "average_price": round(service_revenue[service] / count, 2),
                }
            )

        return sorted(preferences, key=lambda x: x["frequency"], reverse=True)

    def _analyze_booking_patterns(self, appointments: List[Appointment]) -> Dict:
        """
        Analyze customer booking patterns
        """
        if not appointments:
            return {}

        # Preferred days of week
        day_counts = {}
        for apt in appointments:
            day = apt.appointment_date.strftime("%A")
            day_counts[day] = day_counts.get(day, 0) + 1

        # Preferred times (if available)
        hour_counts = {}
        for apt in appointments:
            if apt.appointment_time:
                hour = apt.appointment_time.hour
                hour_counts[hour] = hour_counts.get(hour, 0) + 1

        # Booking sources
        source_counts = {}
        for apt in appointments:
            source = apt.booking_source or "unknown"
            source_counts[source] = source_counts.get(source, 0) + 1

        return {
            "preferred_days": sorted(
                day_counts.items(), key=lambda x: x[1], reverse=True
            ),
            "preferred_hours": sorted(
                hour_counts.items(), key=lambda x: x[1], reverse=True
            ),
            "booking_sources": sorted(
                source_counts.items(), key=lambda x: x[1], reverse=True
            ),
        }

    def _calculate_months_as_customer(self, first_visit_date: date) -> int:
        """
        Calculate number of months as customer
        """
        today = date.today()
        months = (today.year - first_visit_date.year) * 12 + (
            today.month - first_visit_date.month
        )
        return max(1, months)  # Minimum 1 month

    def _calculate_no_show_rate(self, client: Client) -> float:
        """
        Calculate no-show rate for client
        """
        if client.total_visits == 0:
            return 0.0

        total_scheduled = client.total_visits + (client.no_show_count or 0)
        return round((client.no_show_count or 0) / total_scheduled * 100, 1)

    def _calculate_average_tip_percentage(
        self, appointments: List[Appointment]
    ) -> float:
        """
        Calculate average tip percentage
        """
        total_service_revenue = sum(apt.service_revenue or 0 for apt in appointments)
        total_tips = sum(apt.tip_amount or 0 for apt in appointments)

        if total_service_revenue == 0:
            return 0.0

        return round(total_tips / total_service_revenue * 100, 1)

    def _get_high_value_threshold(self) -> float:
        """
        Calculate high-value customer threshold (top 20% by spending)
        """
        # This would be calculated dynamically based on all customers
        # For now, using a static threshold
        return 800.0  # $800 annual spending

    def _is_seasonal_customer(self, analytics: Dict) -> bool:
        """
        Determine if customer has seasonal booking patterns
        """
        seasonal_patterns = analytics.get("seasonal_patterns", {})
        variance = seasonal_patterns.get("variance", 0)
        return variance > self.criteria.seasonal_visit_variance

    def _get_retention_recommendation(self, risk_score: float, analytics: Dict) -> str:
        """
        Get retention recommendation based on risk score and analytics
        """
        if risk_score >= 80:
            return "Immediate intervention: Personal call + special offer"
        elif risk_score >= 60:
            return "Urgent outreach: Personalized email + discount"
        elif risk_score >= 40:
            return "Gentle reminder: Check-in message + service update"
        else:
            return "Monitor: Include in regular newsletter"

    def _get_tier_benefits(self, tier: LoyaltyTier) -> List[str]:
        """
        Get benefits for loyalty tier
        """
        benefits = {
            LoyaltyTier.BRONZE: ["Basic points earning", "Birthday discount"],
            LoyaltyTier.SILVER: [
                "Enhanced points",
                "Birthday discount",
                "Priority booking",
            ],
            LoyaltyTier.GOLD: [
                "Premium points",
                "Birthday discount",
                "Priority booking",
                "Complimentary product samples",
            ],
            LoyaltyTier.PLATINUM: [
                "Premium points",
                "Birthday discount",
                "Priority booking",
                "Complimentary services",
                "VIP events",
            ],
            LoyaltyTier.DIAMOND: [
                "Maximum points",
                "Birthday discount",
                "Priority booking",
                "Complimentary services",
                "VIP events",
                "Personal consultation",
            ],
        }
        return benefits.get(tier, [])

    def _update_client_segments(self, barber_id: int, segments: Dict[str, List[Dict]]):
        """
        Update client records with new segment classifications
        """
        try:
            for segment_name, clients in segments.items():
                for client_data in clients:
                    client = (
                        self.db.query(Client)
                        .filter(Client.id == client_data["client_id"])
                        .first()
                    )
                    if client:
                        client.customer_type = segment_name

            self.db.commit()
        except Exception as e:
            self.logger.error(f"Error updating client segments: {e}")
            self.db.rollback()

    @cache_result(ttl_seconds=3600, key_prefix="segment_analytics")
    @monitor_performance
    def get_segmentation_analytics(self, barber_id: int) -> Dict:
        """
        Get comprehensive segmentation analytics and insights
        """
        segments = self.segment_customers(barber_id)

        # Calculate segment sizes and values
        segment_analytics = {}
        total_customers = 0
        total_value = 0.0

        for segment_name, customers in segments.items():
            segment_size = len(customers)
            segment_value = sum(c["analytics"].get("total_spent", 0) for c in customers)
            segment_ltv = sum(
                c["analytics"].get("lifetime_value", 0) for c in customers
            )

            total_customers += segment_size
            total_value += segment_value

            segment_analytics[segment_name] = {
                "size": segment_size,
                "total_value": round(segment_value, 2),
                "average_value": (
                    round(segment_value / segment_size, 2) if segment_size > 0 else 0
                ),
                "lifetime_value": round(segment_ltv, 2),
                "percentage": 0,  # Will be calculated after total is known
            }

        # Calculate percentages
        for segment_name in segment_analytics:
            if total_customers > 0:
                segment_analytics[segment_name]["percentage"] = round(
                    segment_analytics[segment_name]["size"] / total_customers * 100, 1
                )

        return {
            "total_customers": total_customers,
            "total_value": round(total_value, 2),
            "segments": segment_analytics,
            "insights": self._generate_segmentation_insights(segment_analytics),
            "last_updated": datetime.utcnow().isoformat(),
        }

    def _generate_segmentation_insights(self, analytics: Dict) -> List[str]:
        """
        Generate actionable insights from segmentation analytics
        """
        insights = []

        # VIP insights
        vip_percentage = analytics.get("vip", {}).get("percentage", 0)
        if vip_percentage > 20:
            insights.append(
                f"Excellent VIP retention: {vip_percentage}% of customers are VIP status"
            )
        elif vip_percentage < 5:
            insights.append("Focus on VIP development: Low percentage of VIP customers")

        # At-risk insights
        at_risk_percentage = analytics.get("at_risk", {}).get("percentage", 0)
        if at_risk_percentage > 15:
            insights.append(
                f"High customer churn risk: {at_risk_percentage}% of customers are at-risk"
            )

        # Value distribution
        champion_value = analytics.get("champion", {}).get("total_value", 0)
        total_value = sum(
            segment.get("total_value", 0) for segment in analytics.values()
        )
        if champion_value > 0 and total_value > 0:
            champion_percentage = champion_value / total_value * 100
            if champion_percentage > 30:
                insights.append(
                    f"Champion customers drive {champion_percentage:.1f}% of total revenue"
                )

        return insights
