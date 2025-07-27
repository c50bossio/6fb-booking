"""
Test data factories for Six Figure Barber methodology testing.
Provides realistic mock data and test scenarios for comprehensive testing.
"""
import factory
import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional
from faker import Faker

from models import User, Service, Appointment, Payment, Commission
from models.six_figure_barber_core import (
    SixFigureGoal, 
    RevenueMetric, 
    ClientValueScore,
    ServiceExcellenceMetric
)
from models.six_figure_barber_crm import (
    ClientJourney,
    TouchPoint,
    RevenueOpportunity
)

fake = Faker()


class SixFigureBarberUserFactory(factory.Factory):
    """Factory for Six Figure Barber enrolled users."""
    class Meta:
        model = User
    
    email = factory.LazyAttribute(lambda obj: f"sixfigure.{fake.user_name()}@test.com")
    name = factory.LazyAttribute(lambda obj: f"{fake.first_name()} {fake.last_name()}")
    role = "BARBER"
    phone = factory.LazyAttribute(lambda obj: fake.phone_number())
    business_name = factory.LazyAttribute(lambda obj: f"{fake.company()} Barbershop")
    six_figure_enrolled = True
    six_figure_tier = factory.fuzzy.FuzzyChoice(["STARTER", "GROWTH", "ELITE", "MASTER"])
    stripe_connect_id = factory.LazyAttribute(lambda obj: f"acct_{fake.uuid4()[:24]}")
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-1y', end_date='now'))


class PremiumClientFactory(factory.Factory):
    """Factory for premium Six Figure clients."""
    class Meta:
        model = User
    
    email = factory.LazyAttribute(lambda obj: f"premium.client.{fake.user_name()}@test.com")
    name = factory.LazyAttribute(lambda obj: f"{fake.first_name()} {fake.last_name()}")
    role = "CLIENT"
    phone = factory.LazyAttribute(lambda obj: fake.phone_number())
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-2y', end_date='-6m'))


class SixFigureServiceFactory(factory.Factory):
    """Factory for Six Figure methodology compliant services."""
    class Meta:
        model = Service
    
    name = factory.fuzzy.FuzzyChoice([
        "Executive Premium Cut",
        "Signature Styling Experience", 
        "Luxury Grooming Package",
        "Business Professional Makeover",
        "VIP Consultation & Cut",
        "Premium Beard Sculpting",
        "Executive Shave Experience"
    ])
    
    description = factory.LazyAttribute(lambda obj: 
        f"Premium {obj.name.lower()} with personalized consultation, "
        f"luxury products, and styling education."
    )
    
    price = factory.fuzzy.FuzzyDecimal(100.00, 300.00, 2)
    duration = factory.fuzzy.FuzzyChoice([60, 75, 90, 120])  # Premium services are longer
    category = factory.fuzzy.FuzzyChoice(["HAIRCUT", "PACKAGE", "BEARD", "STYLING"])
    six_figure_compliant = True
    premium_service = True


class SixFigureGoalFactory(factory.Factory):
    """Factory for Six Figure Barber goals."""
    class Meta:
        model = SixFigureGoal
    
    target_amount = factory.fuzzy.FuzzyDecimal(100000.00, 500000.00, 2)
    target_date = factory.LazyAttribute(lambda obj: datetime.now() + timedelta(days=365))
    goal_type = factory.fuzzy.FuzzyChoice(["ANNUAL_REVENUE", "MONTHLY_REVENUE", "CLIENT_VALUE"])
    milestone_amount = factory.LazyAttribute(lambda obj: obj.target_amount / 12)
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-30d', end_date='now'))


class RevenueMetricFactory(factory.Factory):
    """Factory for revenue tracking metrics."""
    class Meta:
        model = RevenueMetric
    
    total_revenue = factory.fuzzy.FuzzyDecimal(500.00, 5000.00, 2)
    hours_worked = factory.fuzzy.FuzzyInteger(6, 12)
    client_count = factory.fuzzy.FuzzyInteger(8, 25)
    premium_service_count = factory.fuzzy.FuzzyInteger(3, 15)
    average_service_value = factory.LazyAttribute(
        lambda obj: obj.total_revenue / obj.client_count if obj.client_count > 0 else Decimal('0.00')
    )
    date_recorded = factory.LazyAttribute(lambda obj: fake.date_between(start_date='-30d', end_date='today'))


class ClientValueScoreFactory(factory.Factory):
    """Factory for client value scoring."""
    class Meta:
        model = ClientValueScore
    
    value_score = factory.fuzzy.FuzzyDecimal(50.0, 100.0, 1)
    tier = factory.fuzzy.FuzzyChoice(["BRONZE", "SILVER", "GOLD", "PLATINUM"])
    lifetime_value = factory.fuzzy.FuzzyDecimal(500.00, 5000.00, 2)
    retention_probability = factory.fuzzy.FuzzyDecimal(60.0, 95.0, 1)
    last_updated = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-7d', end_date='now'))


class ServiceExcellenceMetricFactory(factory.Factory):
    """Factory for service excellence tracking."""
    class Meta:
        model = ServiceExcellenceMetric
    
    client_satisfaction = factory.fuzzy.FuzzyDecimal(4.0, 5.0, 1)
    on_time_percentage = factory.fuzzy.FuzzyDecimal(85.0, 100.0, 1)
    rebooking_rate = factory.fuzzy.FuzzyDecimal(70.0, 95.0, 1)
    referral_rate = factory.fuzzy.FuzzyDecimal(15.0, 40.0, 1)
    excellence_score = factory.LazyAttribute(
        lambda obj: (obj.client_satisfaction * 20 + obj.on_time_percentage + 
                    obj.rebooking_rate + obj.referral_rate) / 4
    )
    date_recorded = factory.LazyAttribute(lambda obj: fake.date_between(start_date='-7d', end_date='today'))


class ClientJourneyFactory(factory.Factory):
    """Factory for client journey tracking."""
    class Meta:
        model = ClientJourney
    
    stage = factory.fuzzy.FuzzyChoice(["DISCOVERY", "TRIAL", "REGULAR", "VIP", "ADVOCATE"])
    notes = factory.LazyAttribute(lambda obj: f"Client in {obj.stage} stage - {fake.sentence()}")
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-60d', end_date='now'))


class TouchPointFactory(factory.Factory):
    """Factory for client touchpoint tracking."""
    class Meta:
        model = TouchPoint
    
    touchpoint_type = factory.fuzzy.FuzzyChoice([
        "SERVICE_COMPLETION", "FOLLOW_UP_CALL", "SATISFACTION_CHECK", 
        "BOOKING_REMINDER", "REFERRAL_REQUEST", "UPSELL_OFFER"
    ])
    interaction_quality = factory.fuzzy.FuzzyChoice(["POOR", "FAIR", "GOOD", "EXCELLENT"])
    notes = factory.LazyAttribute(lambda obj: f"{obj.touchpoint_type} - {fake.sentence()}")
    next_action = factory.fuzzy.FuzzyChoice([
        "FOLLOW_UP_24H", "FOLLOW_UP_WEEK", "SCHEDULE_APPOINTMENT", 
        "SEND_SURVEY", "NO_ACTION_NEEDED"
    ])
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-30d', end_date='now'))


class RevenueOpportunityFactory(factory.Factory):
    """Factory for revenue opportunity identification."""
    class Meta:
        model = RevenueOpportunity
    
    opportunity_type = factory.fuzzy.FuzzyChoice([
        "UPSELL_SERVICE", "INCREASE_FREQUENCY", "REFERRAL_INCENTIVE", 
        "PREMIUM_UPGRADE", "PACKAGE_OFFER"
    ])
    potential_revenue = factory.fuzzy.FuzzyDecimal(50.00, 500.00, 2)
    probability = factory.fuzzy.FuzzyDecimal(30.0, 85.0, 1)
    description = factory.LazyAttribute(lambda obj: f"{obj.opportunity_type} opportunity - {fake.sentence()}")
    status = factory.fuzzy.FuzzyChoice(["IDENTIFIED", "PRESENTED", "ACCEPTED", "DECLINED"])
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-14d', end_date='now'))


class PremiumAppointmentFactory(factory.Factory):
    """Factory for premium Six Figure appointments."""
    class Meta:
        model = Appointment
    
    appointment_date = factory.LazyAttribute(
        lambda obj: fake.date_between(start_date='today', end_date='+30d')
    )
    appointment_time = factory.fuzzy.FuzzyChoice([
        "09:00", "10:30", "12:00", "13:30", "15:00", "16:30"
    ])
    status = factory.fuzzy.FuzzyChoice(["CONFIRMED", "COMPLETED", "PENDING_PAYMENT"])
    notes = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=200))
    consultation_notes = factory.LazyAttribute(lambda obj: f"Premium consultation: {fake.sentence()}")
    client_satisfaction = factory.fuzzy.FuzzyInteger(4, 5)
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-7d', end_date='now'))


class PremiumPaymentFactory(factory.Factory):
    """Factory for premium service payments."""
    class Meta:
        model = Payment
    
    amount = factory.fuzzy.FuzzyDecimal(100.00, 300.00, 2)
    tip_amount = factory.fuzzy.FuzzyDecimal(15.00, 60.00, 2)
    payment_method = factory.fuzzy.FuzzyChoice(["stripe", "cash", "venmo"])
    status = "COMPLETED"
    stripe_payment_intent_id = factory.LazyAttribute(lambda obj: f"pi_{fake.uuid4()[:24]}")
    processed_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-30d', end_date='now'))


class SixFigureCommissionFactory(factory.Factory):
    """Factory for Six Figure Barber commission tracking."""
    class Meta:
        model = Commission
    
    commission_rate = factory.fuzzy.FuzzyDecimal(75.0, 90.0, 1)  # Premium rates for Six Figure
    commission_amount = factory.LazyAttribute(
        lambda obj: obj.payment_amount * (obj.commission_rate / 100) if hasattr(obj, 'payment_amount') else Decimal('0.00')
    )
    platform_fee = factory.LazyAttribute(
        lambda obj: obj.payment_amount * ((100 - obj.commission_rate) / 100) if hasattr(obj, 'payment_amount') else Decimal('0.00')
    )
    stripe_transfer_id = factory.LazyAttribute(lambda obj: f"tr_{fake.uuid4()[:24]}")
    status = "COMPLETED"
    processed_at = factory.LazyAttribute(lambda obj: fake.date_time_between(start_date='-30d', end_date='now'))


# Complex scenario builders
class SixFigureTestDataBuilder:
    """Builder for complex Six Figure Barber test scenarios."""
    
    def __init__(self):
        self.data = {}
    
    def with_established_barber(self, tier: str = "GROWTH") -> 'SixFigureTestDataBuilder':
        """Create an established Six Figure Barber with history."""
        self.data['barber'] = SixFigureBarberUserFactory(
            six_figure_tier=tier,
            created_at=fake.date_time_between(start_date='-2y', end_date='-1y')
        )
        
        # Add revenue goal
        self.data['goal'] = SixFigureGoalFactory(
            user_id=self.data['barber'].id,
            target_amount=Decimal('150000.00') if tier == "GROWTH" else Decimal('250000.00')
        )
        
        # Add historical revenue metrics
        self.data['revenue_history'] = [
            RevenueMetricFactory(
                user_id=self.data['barber'].id,
                date_recorded=fake.date_between(start_date='-90d', end_date=f'-{30+i}d')
            )
            for i in range(12)  # 12 months of history
        ]
        
        return self
    
    def with_premium_services(self, count: int = 5) -> 'SixFigureTestDataBuilder':
        """Add premium services to the barber."""
        if 'barber' not in self.data:
            raise ValueError("Must create barber first")
        
        self.data['services'] = [
            SixFigureServiceFactory(
                barber_id=self.data['barber'].id,
                price=Decimal(str(125 + (i * 25)))  # Varied premium pricing
            )
            for i in range(count)
        ]
        
        return self
    
    def with_client_portfolio(self, client_count: int = 20) -> 'SixFigureTestDataBuilder':
        """Add a diverse portfolio of clients."""
        if 'barber' not in self.data:
            raise ValueError("Must create barber first")
        
        self.data['clients'] = []
        self.data['client_journeys'] = []
        self.data['client_value_scores'] = []
        
        # Client tier distribution (realistic for Six Figure Barber)
        tier_distribution = {
            "BRONZE": 0.4,   # 40% bronze
            "SILVER": 0.35,  # 35% silver  
            "GOLD": 0.2,     # 20% gold
            "PLATINUM": 0.05 # 5% platinum
        }
        
        for i in range(client_count):
            # Determine tier based on distribution
            rand = random.random()
            cumulative = 0
            tier = "BRONZE"
            for t, prob in tier_distribution.items():
                cumulative += prob
                if rand <= cumulative:
                    tier = t
                    break
            
            client = PremiumClientFactory()
            self.data['clients'].append(client)
            
            # Create client journey
            journey = ClientJourneyFactory(
                client_id=client.id,
                barber_id=self.data['barber'].id,
                stage=self._get_stage_for_tier(tier)
            )
            self.data['client_journeys'].append(journey)
            
            # Create value score
            value_score = ClientValueScoreFactory(
                client_id=client.id,
                barber_id=self.data['barber'].id,
                tier=tier,
                value_score=self._get_score_for_tier(tier),
                lifetime_value=self._get_ltv_for_tier(tier)
            )
            self.data['client_value_scores'].append(value_score)
        
        return self
    
    def with_appointment_history(self, months_back: int = 6) -> 'SixFigureTestDataBuilder':
        """Add appointment history for testing analytics."""
        if 'clients' not in self.data or 'services' not in self.data:
            raise ValueError("Must have clients and services first")
        
        self.data['appointments'] = []
        self.data['payments'] = []
        self.data['commissions'] = []
        
        # Generate appointments for the past months
        for client in self.data['clients'][:15]:  # Use first 15 clients
            appointment_count = random.randint(1, 6)  # 1-6 appointments per client
            
            for _ in range(appointment_count):
                service = random.choice(self.data['services'])
                
                appointment = PremiumAppointmentFactory(
                    client_id=client.id,
                    barber_id=self.data['barber'].id,
                    service_id=service.id,
                    appointment_date=fake.date_between(
                        start_date=f'-{months_back * 30}d', 
                        end_date='-1d'
                    ),
                    status="COMPLETED"
                )
                self.data['appointments'].append(appointment)
                
                # Create payment
                payment = PremiumPaymentFactory(
                    appointment_id=appointment.id,
                    amount=service.price,
                    tip_amount=service.price * Decimal('0.18')  # 18% tip average
                )
                self.data['payments'].append(payment)
                
                # Create commission
                commission = SixFigureCommissionFactory(
                    payment_id=payment.id,
                    barber_id=self.data['barber'].id,
                    payment_amount=payment.amount + payment.tip_amount,
                    commission_rate=self._get_commission_rate_for_tier(self.data['barber'].six_figure_tier)
                )
                self.data['commissions'].append(commission)
        
        return self
    
    def with_excellence_metrics(self) -> 'SixFigureTestDataBuilder':
        """Add service excellence tracking."""
        if 'barber' not in self.data:
            raise ValueError("Must create barber first")
        
        self.data['excellence_metrics'] = [
            ServiceExcellenceMetricFactory(
                barber_id=self.data['barber'].id,
                date_recorded=fake.date_between(start_date='-30d', end_date=f'-{i}d')
            )
            for i in range(30)  # Daily metrics for last 30 days
        ]
        
        return self
    
    def with_revenue_opportunities(self) -> 'SixFigureTestDataBuilder':
        """Add identified revenue opportunities."""
        if 'clients' not in self.data:
            raise ValueError("Must have clients first")
        
        self.data['revenue_opportunities'] = []
        
        # Create opportunities for random clients
        opportunity_clients = random.sample(self.data['clients'], min(8, len(self.data['clients'])))
        
        for client in opportunity_clients:
            opportunity = RevenueOpportunityFactory(
                client_id=client.id,
                barber_id=self.data['barber'].id
            )
            self.data['revenue_opportunities'].append(opportunity)
        
        return self
    
    def build(self) -> Dict[str, Any]:
        """Return the built test data."""
        return self.data
    
    # Helper methods
    def _get_stage_for_tier(self, tier: str) -> str:
        """Get appropriate journey stage for client tier."""
        stage_mapping = {
            "BRONZE": "TRIAL",
            "SILVER": "REGULAR", 
            "GOLD": "VIP",
            "PLATINUM": "ADVOCATE"
        }
        return stage_mapping.get(tier, "TRIAL")
    
    def _get_score_for_tier(self, tier: str) -> Decimal:
        """Get appropriate value score for tier."""
        score_ranges = {
            "BRONZE": (50, 65),
            "SILVER": (65, 80),
            "GOLD": (80, 90),
            "PLATINUM": (90, 100)
        }
        min_score, max_score = score_ranges.get(tier, (50, 65))
        return Decimal(str(random.uniform(min_score, max_score)))
    
    def _get_ltv_for_tier(self, tier: str) -> Decimal:
        """Get appropriate lifetime value for tier."""
        ltv_ranges = {
            "BRONZE": (500, 1200),
            "SILVER": (1200, 2400),
            "GOLD": (2400, 4800),
            "PLATINUM": (4800, 12000)
        }
        min_ltv, max_ltv = ltv_ranges.get(tier, (500, 1200))
        return Decimal(str(random.uniform(min_ltv, max_ltv)))
    
    def _get_commission_rate_for_tier(self, tier: str) -> Decimal:
        """Get commission rate based on Six Figure tier."""
        rates = {
            "STARTER": Decimal('75.0'),
            "GROWTH": Decimal('80.0'),
            "ELITE": Decimal('85.0'),
            "MASTER": Decimal('90.0')
        }
        return rates.get(tier, Decimal('75.0'))


# Predefined scenarios for common test cases
def create_high_performing_barber_scenario() -> Dict[str, Any]:
    """Create a high-performing Six Figure Barber scenario."""
    return (SixFigureTestDataBuilder()
            .with_established_barber(tier="ELITE")
            .with_premium_services(count=7)
            .with_client_portfolio(client_count=25)
            .with_appointment_history(months_back=12)
            .with_excellence_metrics()
            .with_revenue_opportunities()
            .build())


def create_growing_barber_scenario() -> Dict[str, Any]:
    """Create a growing Six Figure Barber scenario."""
    return (SixFigureTestDataBuilder()
            .with_established_barber(tier="GROWTH")
            .with_premium_services(count=4)
            .with_client_portfolio(client_count=15)
            .with_appointment_history(months_back=6)
            .with_excellence_metrics()
            .build())


def create_new_barber_scenario() -> Dict[str, Any]:
    """Create a new Six Figure Barber scenario."""
    return (SixFigureTestDataBuilder()
            .with_established_barber(tier="STARTER")
            .with_premium_services(count=3)
            .with_client_portfolio(client_count=8)
            .with_appointment_history(months_back=3)
            .build())


# Mock API response builders
def build_analytics_response_mock(scenario_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build realistic analytics API response from scenario data."""
    barber = scenario_data['barber']
    revenue_history = scenario_data.get('revenue_history', [])
    clients = scenario_data.get('clients', [])
    appointments = scenario_data.get('appointments', [])
    
    total_revenue = sum(r.total_revenue for r in revenue_history)
    total_hours = sum(r.hours_worked for r in revenue_history)
    
    return {
        "revenue_metrics": {
            "total_revenue": float(total_revenue),
            "revenue_per_hour": float(total_revenue / total_hours) if total_hours > 0 else 0,
            "monthly_average": float(total_revenue / 12) if len(revenue_history) >= 12 else 0,
            "goal_progress": 65.8  # Calculated percentage
        },
        "client_metrics": {
            "total_clients": len(clients),
            "retention_rate": 87.5,
            "average_client_value": float(total_revenue / len(clients)) if clients else 0,
            "new_clients_this_month": 3
        },
        "service_excellence": {
            "satisfaction_average": 4.7,
            "on_time_percentage": 94.2,
            "rebooking_rate": 86.5,
            "referral_rate": 23.8
        },
        "six_figure_compliance": {
            "methodology_score": 92.5,
            "premium_service_ratio": 85.0,
            "client_journey_tracking": True,
            "revenue_optimization_active": True
        }
    }


if __name__ == "__main__":
    # Example usage
    print("Creating high-performing barber scenario...")
    scenario = create_high_performing_barber_scenario()
    print(f"Created scenario with {len(scenario['clients'])} clients and {len(scenario['appointments'])} appointments")
    
    analytics_mock = build_analytics_response_mock(scenario)
    print(f"Analytics mock: Revenue per hour = ${analytics_mock['revenue_metrics']['revenue_per_hour']:.2f}")